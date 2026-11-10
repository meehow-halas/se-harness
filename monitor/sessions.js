"use strict";

const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");
const { pathToFileURL } = require("url");
const {
  MODE_INTERACTIVE,
  isConsultantEvent,
  visibleChatMessages,
} = require("./chat");

const SESSIONS_REL = path.join(".dhs", "monitor", "sessions");
const PLANIT_LOCK_REL = path.join(".dhs", "monitor", "planit.lock");
const MISSING_API_KEY =
  "CURSOR_API_KEY is missing. Set it in the environment (Cursor Dashboard → Integrations), then retry. Do not paste the key in chat.";

class SessionError extends Error {
  constructor(message, { code, httpStatus } = {}) {
    super(message);
    this.name = "SessionError";
    this.code = code || "error";
    this.httpStatus = httpStatus || 400;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function assertTaskKey(taskKey) {
  if (typeof taskKey !== "string" || taskKey.trim() === "") {
    throw new SessionError("taskKey is required", { code: "invalid_task_key" });
  }
  if (taskKey.includes("..") || taskKey.includes("/") || taskKey.includes("\\")) {
    throw new SessionError("taskKey must be a single path segment", {
      code: "invalid_task_key",
    });
  }
  return taskKey;
}

function sessionDir(cwd, taskKey) {
  return path.join(cwd, SESSIONS_REL, taskKey);
}

function agentPath(cwd, taskKey) {
  return path.join(sessionDir(cwd, taskKey), "agent.json");
}

function messagesPath(cwd, taskKey) {
  return path.join(sessionDir(cwd, taskKey), "messages.json");
}

function readJsonIfPresent(file, fallback) {
  if (!fs.existsSync(file)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function filesTrackerActive(cwd) {
  const configPath = path.join(cwd, "harness.config.json");
  const config = readJsonIfPresent(configPath, null);
  if (!config || typeof config !== "object") {
    return true;
  }
  const tracker = config.agents && config.agents.tracker;
  return tracker == null;
}

function isPlanitSend(text, intent) {
  if (intent === "planit") {
    return true;
  }
  return typeof text === "string" && text.includes("/dhs-planit");
}

function extractAssistantText(event) {
  if (isConsultantEvent(event)) {
    return "";
  }
  if (!event || event.type !== "assistant" || !event.message) {
    return "";
  }
  const content = event.message.content;
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter((block) => block && block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");
}

function apiKeyFromEnv(env) {
  const raw = env && env.CURSOR_API_KEY;
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

function resolveCursorSdkEntry() {
  const dirs = [
    path.join(__dirname, "node_modules", "@cursor", "sdk"),
    path.join(__dirname, "..", "node_modules", "@cursor", "sdk"),
  ];
  for (const dir of dirs) {
    const pkgFile = path.join(dir, "package.json");
    if (!fs.existsSync(pkgFile)) {
      continue;
    }
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    } catch {
      continue;
    }
    const exp = pkg.exports && pkg.exports["."];
    let rel = pkg.main || pkg.module || "index.js";
    if (typeof exp === "string") {
      rel = exp;
    } else if (exp && typeof exp === "object") {
      rel = exp.import || exp.require || exp.default || rel;
    }
    return path.join(dir, rel);
  }
  return "@cursor/sdk";
}

async function loadCursorSdk() {
  const spec = resolveCursorSdkEntry();
  const href = spec.startsWith("/") || spec.startsWith("file:")
    ? pathToFileURL(spec).href
    : spec;
  const mod = await import(href);
  const Agent = mod.Agent;
  if (!Agent) {
    throw new Error("Could not load Agent from @cursor/sdk");
  }
  return {
    create: (opts) => Agent.create(opts),
    resume: (id, opts) => Agent.resume(id, opts),
  };
}

async function disposeAgent(agent) {
  if (!agent) {
    return;
  }
  if (typeof agent[Symbol.asyncDispose] === "function") {
    await agent[Symbol.asyncDispose]();
    return;
  }
  if (typeof agent.close === "function") {
    await agent.close();
  }
}

function createSessionRegistry(options) {
  const cwd = options.cwd;
  const maxAgents = options.maxAgents;
  const env = options.env || {};
  const events = new EventEmitter();
  events.setMaxListeners(0);
  const live = new Map();
  let selected = null;
  let planitHeld = false;
  let sdkPromise;

  function getSdk() {
    if (options.sdk) {
      return Promise.resolve(options.sdk);
    }
    if (!sdkPromise) {
      sdkPromise = loadCursorSdk();
    }
    return sdkPromise;
  }

  function liveCount() {
    return live.size;
  }

  function persistMessages(taskKey, messages) {
    writeJson(messagesPath(cwd, taskKey), messages);
  }

  function loadMessages(taskKey) {
    const data = readJsonIfPresent(messagesPath(cwd, taskKey), []);
    return Array.isArray(data) ? data : [];
  }

  function appendMessage(taskKey, message) {
    const session = live.get(taskKey);
    const messages = session ? session.messages : loadMessages(taskKey);
    messages.push(message);
    if (session) {
      session.messages = messages;
    }
    persistMessages(taskKey, messages);
    events.emit(`session:${taskKey}`, { type: "message", message });
    return message;
  }

  function acquirePlanitLock() {
    if (planitHeld) {
      throw new SessionError(
        "BLOCKED: an Architect is already writing a spec — wait until that /dhs-planit finishes.",
        { code: "planit_locked", httpStatus: 409 }
      );
    }
    planitHeld = true;
    const file = path.join(cwd, PLANIT_LOCK_REL);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ pid: process.pid })}\n`);
    return () => {
      planitHeld = false;
      fs.rmSync(file, { force: true });
    };
  }

  async function attachAgent(taskKey, model, { resumeId } = {}) {
    const apiKey = apiKeyFromEnv(env);
    if (!apiKey) {
      throw new SessionError(MISSING_API_KEY, {
        code: "missing_api_key",
        httpStatus: 400,
      });
    }
    if (!model || typeof model !== "string") {
      throw new SessionError("model is required", { code: "invalid_model" });
    }
    const sdk = await getSdk();
    const createOpts = {
      apiKey,
      model: { id: model },
      local: { cwd },
    };
    if (resumeId) {
      try {
        return await sdk.resume(resumeId, createOpts);
      } catch {
        return sdk.create(createOpts);
      }
    }
    return sdk.create(createOpts);
  }

  async function createSession({ taskKey, model }) {
    const key = assertTaskKey(taskKey);
    const existing = live.get(key);
    if (existing) {
      selected = key;
      return {
        taskKey: key,
        agentId: existing.agent.agentId,
        resumed: true,
        selected: true,
      };
    }
    if (liveCount() >= maxAgents) {
      throw new SessionError(
        `Refused: live agent cap is ${maxAgents} (--max-agents). Close a session before starting another.`,
        { code: "cap", httpStatus: 409 }
      );
    }
    const stored = readJsonIfPresent(agentPath(cwd, key), null);
    const resumeId =
      stored && typeof stored.agentId === "string" ? stored.agentId : null;
    const placeholder = {
      creating: true,
      busy: false,
      messages: loadMessages(key),
    };
    live.set(key, placeholder);
    let agent;
    try {
      agent = await attachAgent(key, model, { resumeId });
    } catch (err) {
      live.delete(key);
      throw err;
    }
    const record = {
      agent,
      model,
      mode: MODE_INTERACTIVE,
      messages: placeholder.messages,
      creating: false,
      busy: false,
    };
    live.set(key, record);
    writeJson(agentPath(cwd, key), { agentId: agent.agentId });
    selected = key;
    return {
      taskKey: key,
      agentId: agent.agentId,
      resumed: Boolean(resumeId && agent.agentId === resumeId),
      selected: true,
    };
  }

  function select(taskKey) {
    const key = assertTaskKey(taskKey);
    if (!live.has(key) && !fs.existsSync(sessionDir(cwd, key))) {
      throw new SessionError(`Unknown session: ${key}`, {
        code: "not_found",
        httpStatus: 404,
      });
    }
    selected = key;
    return { taskKey: key, selected: true };
  }

  async function send(taskKey, text, { intent } = {}) {
    const key = assertTaskKey(taskKey);
    const session = live.get(key);
    if (!session || !session.agent) {
      throw new SessionError(`Unknown session: ${key}`, {
        code: "not_found",
        httpStatus: 404,
      });
    }
    let release;
    if (isPlanitSend(text, intent) && filesTrackerActive(cwd)) {
      release = acquirePlanitLock();
    }
    appendMessage(key, { role: "user", text: String(text), at: nowIso() });
    session.busy = true;
    events.emit(`session:${key}`, { type: "run", status: "running" });
    try {
      const run = await session.agent.send(text);
      if (run && typeof run.stream === "function") {
        for await (const event of run.stream()) {
          events.emit(`session:${key}`, event);
          const assistant = extractAssistantText(event);
          if (assistant) {
            appendMessage(key, {
              role: "assistant",
              text: assistant,
              at: nowIso(),
            });
          }
        }
      }
      if (run && typeof run.wait === "function") {
        return run.wait();
      }
      return { status: "finished" };
    } finally {
      session.busy = false;
      events.emit(`session:${key}`, { type: "run", status: "idle" });
      if (release) {
        release();
      }
    }
  }

  async function closeSession(taskKey) {
    const key = assertTaskKey(taskKey);
    const session = live.get(key);
    if (!session) {
      return { taskKey: key, disposed: false };
    }
    live.delete(key);
    if (selected === key) {
      selected = null;
    }
    await disposeAgent(session.agent);
    return { taskKey: key, disposed: true };
  }

  async function disposeAll() {
    const keys = [...live.keys()];
    for (const key of keys) {
      await closeSession(key);
    }
  }

  function subscribe(taskKey, listener) {
    const key = assertTaskKey(taskKey);
    const chan = `session:${key}`;
    events.on(chan, listener);
    return () => events.off(chan, listener);
  }

  function snapshot(taskKey) {
    const key = taskKey ? assertTaskKey(taskKey) : selected;
    if (!key) {
      return { selected, sessions: list() };
    }
    const session = live.get(key);
    return {
      taskKey: key,
      selected: selected === key,
      live: Boolean(session && session.agent),
      busy: Boolean(session && session.busy),
      mode: MODE_INTERACTIVE,
      agentId: session && session.agent ? session.agent.agentId : readJsonIfPresent(agentPath(cwd, key), {}).agentId,
      model: session ? session.model : undefined,
      messages: visibleChatMessages(session ? session.messages : loadMessages(key)),
    };
  }

  function list() {
    return [...live.keys()].map((taskKey) => ({
      taskKey,
      agentId: live.get(taskKey).agent && live.get(taskKey).agent.agentId,
      selected: selected === taskKey,
    }));
  }

  return {
    createSession,
    select,
    send,
    closeSession,
    disposeAll,
    subscribe,
    snapshot,
    list,
    liveCount: () => liveCount(),
    selected: () => selected,
  };
}

module.exports = {
  MISSING_API_KEY,
  PLANIT_LOCK_REL,
  SESSIONS_REL,
  SessionError,
  createSessionRegistry,
  filesTrackerActive,
  loadCursorSdk,
};
