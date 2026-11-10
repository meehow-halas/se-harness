"use strict";

const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");
const {
  CliAgentError,
  LOGGED_OUT_CLI,
  MISSING_CLI,
  createCliAgent,
} = require("./cli-agent");
const {
  MODE_INTERACTIVE,
  buildFirstPlanitPrompt,
  isConsultantEvent,
  shouldRefreshListFromEvent,
  visibleChatMessages,
} = require("./chat");
const { dhsWorktreeExists, listTasks } = require("./tasks");
const {
  ACTION_CLOSE,
  ACTION_DOIT,
  ACTION_REVIEW,
  buildStagePrompt,
  gateStageSend,
} = require("./stage-buttons");

const SESSIONS_REL = path.join(".dhs", "monitor", "sessions");
const PLANIT_LOCK_REL = path.join(".dhs", "monitor", "planit.lock");

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

function cursorModelForRole(cwd, role) {
  const config = readJsonIfPresent(path.join(cwd, "harness.config.json"), null);
  const roles = config && config.agents && config.agents.roles;
  const entry = roles && roles[role];
  const model = entry && entry.model && entry.model.cursor;
  return typeof model === "string" && model.trim() !== "" ? model.trim() : null;
}

function architectCursorModel(cwd) {
  return cursorModelForRole(cwd, "architect");
}

function modelForIntent(cwd, intent, fallback) {
  if (intent === "planit") {
    return architectCursorModel(cwd) || fallback;
  }
  if (intent === ACTION_DOIT) {
    return cursorModelForRole(cwd, "implementer") || fallback;
  }
  if (intent === ACTION_REVIEW || intent === ACTION_CLOSE) {
    return cursorModelForRole(cwd, "reviewer") || fallback;
  }
  return fallback;
}

function harnessBaseBranch(cwd) {
  const config = readJsonIfPresent(path.join(cwd, "harness.config.json"), null);
  const branch = config && config.agents && config.agents.baseBranch;
  return typeof branch === "string" ? branch.trim() : "";
}

function allocateDraftKey(cwd, live) {
  let n = 1;
  for (;;) {
    const key = `new-${n}`;
    if (!live.has(key) && !fs.existsSync(sessionDir(cwd, key))) {
      return key;
    }
    n += 1;
  }
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

function asSessionError(err) {
  if (err instanceof SessionError) {
    return err;
  }
  if (err instanceof CliAgentError) {
    return new SessionError(err.message, {
      code: err.code,
      httpStatus: 400,
    });
  }
  return err;
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
  const onListRefresh = options.onListRefresh;
  const events = new EventEmitter();
  events.setMaxListeners(0);
  const live = new Map();
  let selected = null;
  let planitHeld = false;

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
    if (!model || typeof model !== "string") {
      throw new SessionError("model is required", { code: "invalid_model" });
    }
    try {
      return await createCliAgent({
        cwd,
        env,
        model,
        resumeId,
        spawn: options.spawn,
      });
    } catch (err) {
      throw asSessionError(err);
    }
  }

  function rebindSession(fromKey, toKey) {
    const from = assertTaskKey(fromKey);
    const to = assertTaskKey(toKey);
    if (from === to) {
      return { taskKey: to };
    }
    if (live.has(to)) {
      return { taskKey: from };
    }
    const session = live.get(from);
    if (!session) {
      return { taskKey: from };
    }
    const fromDir = sessionDir(cwd, from);
    const toDir = sessionDir(cwd, to);
    if (fs.existsSync(toDir)) {
      return { taskKey: from };
    }
    live.delete(from);
    live.set(to, session);
    if (fs.existsSync(fromDir)) {
      fs.mkdirSync(path.dirname(toDir), { recursive: true });
      fs.renameSync(fromDir, toDir);
    }
    if (selected === from) {
      selected = to;
    }
    return { taskKey: to, reboundFrom: from };
  }

  function bindNewTrackerKey(draftKey, keysBefore) {
    const listed = listTasks(cwd, {
      sessions: { list: () => list() },
      env: env,
    });
    const before = new Set(Array.isArray(keysBefore) ? keysBefore : []);
    const added = (listed.tasks || [])
      .map((row) => row.key)
      .filter((key) => typeof key === "string" && !before.has(key) && key !== draftKey);
    if (added.length !== 1) {
      return { taskKey: draftKey };
    }
    return rebindSession(draftKey, added[0]);
  }

  async function createSession({ taskKey, model, intent } = {}) {
    const planit = intent === "planit";
    let key = taskKey;
    if (planit && (key == null || key === "")) {
      key = allocateDraftKey(cwd, live);
    }
    key = assertTaskKey(key);
    const resolvedModel = modelForIntent(cwd, intent, model);
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
      intent: planit ? "planit" : undefined,
      planitStarted: false,
    };
    live.set(key, placeholder);
    let agent;
    try {
      agent = await attachAgent(key, resolvedModel, { resumeId });
    } catch (err) {
      live.delete(key);
      throw err;
    }
    const record = {
      agent,
      model: resolvedModel,
      mode: MODE_INTERACTIVE,
      messages: placeholder.messages,
      creating: false,
      busy: false,
      intent: planit ? "planit" : undefined,
      planitStarted: false,
    };
    live.set(key, record);
    writeJson(agentPath(cwd, key), { agentId: agent.agentId });
    selected = key;
    return {
      taskKey: key,
      agentId: agent.agentId,
      resumed: Boolean(resumeId && agent.agentId === resumeId),
      selected: true,
      intent: record.intent,
      model: resolvedModel,
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
    const firstPlanit = session.intent === "planit" && !session.planitStarted;
    const effectiveIntent = intent || (firstPlanit ? "planit" : undefined);
    const visibleText = String(text);
    const agentText = firstPlanit
      ? buildFirstPlanitPrompt(visibleText)
      : visibleText;
    let release;
    if (
      (firstPlanit || isPlanitSend(agentText, effectiveIntent)) &&
      filesTrackerActive(cwd)
    ) {
      release = acquirePlanitLock();
    }
    if (firstPlanit) {
      session.planitStarted = true;
    }
    const keysBefore = firstPlanit
      ? listTasks(cwd, { sessions: { list: () => list() }, env }).tasks.map(
          (row) => row.key
        )
      : null;
    appendMessage(key, { role: "user", text: visibleText, at: nowIso() });
    session.busy = true;
    events.emit(`session:${key}`, { type: "run", status: "running" });
    try {
      const run = await session.agent.send(agentText);
      if (run && typeof run.stream === "function") {
        for await (const event of run.stream()) {
          events.emit(`session:${key}`, event);
          if (
            typeof onListRefresh === "function" &&
            shouldRefreshListFromEvent(event)
          ) {
            onListRefresh(event);
          }
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
      let result =
        run && typeof run.wait === "function"
          ? await run.wait()
          : { status: "finished" };
      if (firstPlanit) {
        const bound = bindNewTrackerKey(key, keysBefore);
        result = { ...result, ...bound };
      } else if (!result.taskKey) {
        result = { ...result, taskKey: key };
      }
      return result;
    } finally {
      session.busy = false;
      const idle = { type: "run", status: "idle" };
      events.emit(`session:${key}`, idle);
      if (typeof onListRefresh === "function") {
        onListRefresh(idle);
      }
      if (release) {
        release();
      }
    }
  }

  async function startStage(taskKey, { action, confirmed } = {}) {
    const key = assertTaskKey(taskKey);
    const gate = gateStageSend({ action, confirmed });
    if (!gate.allowed) {
      const confirm = gate.code === "confirm_required";
      throw new SessionError(
        confirm
          ? "Close requires confirm"
          : "Unknown stage action",
        {
          code: gate.code,
          httpStatus: 400,
        }
      );
    }
    const prompt = buildStagePrompt({
      action,
      taskKey: key,
      baseBranch: harnessBaseBranch(cwd),
    });
    if (!prompt) {
      throw new SessionError("Could not build stage prompt", {
        code: "invalid_stage",
      });
    }
    if (!live.get(key) || !live.get(key).agent) {
      await createSession({ taskKey: key, intent: action });
    }
    const worktreeExists = dhsWorktreeExists(cwd, key);
    const result = await send(key, prompt, { intent: action });
    return {
      ...result,
      taskKey: result.taskKey || key,
      worktreeExists,
    };
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
    startStage,
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
  LOGGED_OUT_CLI,
  MISSING_CLI,
  PLANIT_LOCK_REL,
  SESSIONS_REL,
  SessionError,
  architectCursorModel,
  cursorModelForRole,
  createSessionRegistry,
  filesTrackerActive,
};
