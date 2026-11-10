"use strict";

const { spawn: defaultSpawn } = require("child_process");
const readline = require("readline");

const AGENT_COMMAND = "agent";

const MISSING_CLI =
  "BLOCKED: Cursor Agent CLI (`agent`) is not on PATH — install the Cursor CLI and ensure `agent` is on PATH, then retry.";

const LOGGED_OUT_CLI =
  "BLOCKED: Cursor Agent CLI is not logged in — run `agent login` in a terminal, then retry.";

class CliAgentError extends Error {
  constructor(message, { code } = {}) {
    super(message);
    this.name = "CliAgentError";
    this.code = code || "cli_error";
  }
}

function envWithoutSecrets(env) {
  const out = { ...(env || {}) };
  delete out.CURSOR_API_KEY;
  delete out.CURSOR_AUTH_TOKEN;
  return out;
}

function looksLoggedOut(text) {
  const blob = String(text || "");
  return (
    /not authenticated/i.test(blob) ||
    /unauthenticated/i.test(blob) ||
    /logged out/i.test(blob) ||
    /please (run )?`?agent login/i.test(blob)
  );
}

function wrapSpawnError(err) {
  if (err && (err.code === "ENOENT" || /ENOENT/.test(String(err.message)))) {
    return new CliAgentError(MISSING_CLI, { code: "missing_cli" });
  }
  return err;
}

function waitForSpawn(child) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(wrapSpawnError(err));
    };
    const ok = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(child);
    };
    function cleanup() {
      child.off("error", fail);
      child.off("spawn", ok);
    }
    child.once("error", fail);
    child.once("spawn", ok);
  });
}

function runCommand(spawnFn, command, args, { cwd, env }) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnFn(command, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      reject(wrapSpawnError(err));
      return;
    }
    let stdout = "";
    let stderr = "";
    if (child.stdout) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }
    if (child.stderr) {
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }
    child.once("error", (err) => reject(wrapSpawnError(err)));
    child.once("exit", (code) => {
      resolve({ code: code == null ? 1 : code, stdout, stderr });
    });
  });
}

async function assertCliReady({ spawnFn, agentCommand, cwd, env }) {
  let result;
  try {
    result = await runCommand(spawnFn, agentCommand, ["status"], { cwd, env });
  } catch (err) {
    throw wrapSpawnError(err);
  }
  const blob = `${result.stdout}\n${result.stderr}`;
  if (result.code !== 0 || looksLoggedOut(blob)) {
    throw new CliAgentError(LOGGED_OUT_CLI, { code: "cli_logged_out" });
  }
}

function writeJsonLine(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

function textFromContent(content) {
  if (typeof content === "string") {
    return content;
  }
  if (content && typeof content.text === "string") {
    return content.text;
  }
  if (Array.isArray(content)) {
    return content
      .filter((block) => block && (block.type === "text" || typeof block.text === "string"))
      .map((block) => (typeof block.text === "string" ? block.text : ""))
      .join("");
  }
  return "";
}

function pathFromUpdate(update) {
  if (!update || typeof update !== "object") {
    return "";
  }
  if (typeof update.path === "string") {
    return update.path;
  }
  const locations = update.locations || update.content?.locations;
  if (Array.isArray(locations) && locations[0] && typeof locations[0].path === "string") {
    return locations[0].path;
  }
  const toolCall = update.toolCall || update.tool_call;
  if (toolCall && typeof toolCall === "object") {
    const write = toolCall.writeToolCall || toolCall.write;
    const read = toolCall.readToolCall || toolCall.read;
    const args = (write && write.args) || (read && read.args) || toolCall.args;
    if (args && typeof args.path === "string") {
      return args.path;
    }
  }
  return "";
}

function monitorEventsFromAcpUpdate(update) {
  if (!update || typeof update !== "object") {
    return [];
  }
  if (update.event && typeof update.event === "object") {
    return [update.event];
  }
  const kind = update.sessionUpdate || update.type;
  if (kind === "agent_message_chunk" || kind === "agent_message" || kind === "message") {
    const text = textFromContent(update.content || (update.message && update.message.content));
    if (!text) {
      return [];
    }
    const event = {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "text", text }],
      },
    };
    if (update.agent) {
      event.agent = update.agent;
    }
    return [event];
  }
  if (
    kind === "tool_call" ||
    kind === "tool_call_update" ||
    kind === "tool" ||
    update.toolCall ||
    update.tool_call
  ) {
    return [
      {
        type: "tool_call",
        name: update.name || update.title || "tool",
        path: pathFromUpdate(update),
        status: update.status || update.subtype,
      },
    ];
  }
  return [];
}

function createEventQueue() {
  const items = [];
  const waiters = [];
  let closed = false;
  return {
    push(item) {
      if (closed) {
        return;
      }
      if (waiters.length > 0) {
        waiters.shift()({ done: false, value: item });
        return;
      }
      items.push(item);
    },
    close() {
      if (closed) {
        return;
      }
      closed = true;
      while (waiters.length > 0) {
        waiters.shift()({ done: true, value: undefined });
      }
    },
    async *[Symbol.asyncIterator]() {
      for (;;) {
        if (items.length > 0) {
          yield items.shift();
          continue;
        }
        if (closed) {
          return;
        }
        const next = await new Promise((resolve) => {
          waiters.push(resolve);
        });
        if (next.done) {
          return;
        }
        yield next.value;
      }
    },
  };
}

function attachRpc(child) {
  const pending = new Map();
  let nextId = 1;
  const listeners = [];
  const rl = readline.createInterface({ input: child.stdout });

  function respond(id, result) {
    if (!child.stdin || child.stdin.destroyed) {
      return;
    }
    writeJsonLine(child.stdin, { jsonrpc: "2.0", id, result });
  }

  function handleRequest(msg) {
    const method = msg.method;
    if (method === "session/request_permission") {
      respond(msg.id, { outcome: { outcome: "selected", optionId: "allow-once" } });
      return;
    }
    if (method === "cursor/ask_question") {
      respond(msg.id, { outcome: { outcome: "skipped" } });
      return;
    }
    if (method === "cursor/create_plan") {
      respond(msg.id, { outcome: { outcome: "accepted" } });
      return;
    }
    respond(msg.id, {});
  }

  rl.on("line", (line) => {
    const trimmed = String(line || "").trim();
    if (!trimmed) {
      return;
    }
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return;
    }
    if (msg.method === "session/update") {
      for (const fn of listeners) {
        fn(msg.params && msg.params.update);
      }
      return;
    }
    if (msg.method && msg.id != null && !Object.prototype.hasOwnProperty.call(msg, "result") && !msg.error) {
      handleRequest(msg);
      return;
    }
    if (msg.id == null) {
      return;
    }
    const waiter = pending.get(msg.id);
    if (!waiter) {
      return;
    }
    pending.delete(msg.id);
    if (msg.error) {
      waiter.reject(msg.error);
      return;
    }
    waiter.resolve(msg.result);
  });

  child.once("exit", () => {
    rl.close();
    for (const waiter of pending.values()) {
      waiter.reject(new Error("Cursor Agent CLI process exited"));
    }
    pending.clear();
  });

  return {
    onUpdate(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) {
          listeners.splice(i, 1);
        }
      };
    },
    request(method, params) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        if (!child.stdin || child.stdin.destroyed) {
          pending.delete(id);
          reject(new Error("Cursor Agent CLI stdin is closed"));
          return;
        }
        writeJsonLine(child.stdin, { jsonrpc: "2.0", id, method, params });
      });
    },
  };
}

function killChild(child) {
  if (!child || child.killed || child.exitCode != null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, 1000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      child.kill("SIGTERM");
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

function makeAgentHandle({ child, rpc, sessionId, model }) {
  const handle = {
    agentId: sessionId,
    model,
    pid: child.pid,
    async send(text) {
      const queue = createEventQueue();
      const off = rpc.onUpdate((update) => {
        for (const event of monitorEventsFromAcpUpdate(update)) {
          queue.push(event);
        }
      });
      const done = rpc
        .request("session/prompt", {
          sessionId,
          prompt: [{ type: "text", text: String(text) }],
        })
        .then(() => ({ status: "finished" }))
        .finally(() => {
          off();
          queue.close();
        });
      return {
        async *stream() {
          for await (const event of queue) {
            yield event;
          }
        },
        wait: () => done,
      };
    },
    async [Symbol.asyncDispose]() {
      await killChild(child);
    },
    close: () => killChild(child),
  };
  return handle;
}

async function createCliAgent({
  cwd,
  env = process.env,
  model,
  resumeId,
  spawn: spawnFn = defaultSpawn,
  agentCommand = AGENT_COMMAND,
} = {}) {
  if (!model || typeof model !== "string") {
    throw new CliAgentError("model is required", { code: "invalid_model" });
  }
  const childEnv = envWithoutSecrets(env);
  await assertCliReady({ spawnFn, agentCommand, cwd, env: childEnv });
  const args = ["--trust", "--workspace", cwd, "--model", model, "acp"];
  let child;
  try {
    child = spawnFn(agentCommand, args, {
      cwd,
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    throw wrapSpawnError(err);
  }
  await waitForSpawn(child);
  const rpc = attachRpc(child);
  try {
    await rpc.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: { name: "dhs-monitor", version: "1" },
    });
    await rpc.request("authenticate", { methodId: "cursor_login" });
    let sessionId = null;
    if (resumeId) {
      try {
        const loaded = await rpc.request("session/load", {
          cwd,
          sessionId: resumeId,
          mcpServers: [],
        });
        sessionId = (loaded && loaded.sessionId) || resumeId;
      } catch {
        sessionId = null;
      }
    }
    if (!sessionId) {
      const created = await rpc.request("session/new", { cwd, mcpServers: [] });
      sessionId = created && created.sessionId;
    }
    if (!sessionId) {
      throw new CliAgentError("Cursor Agent CLI did not return a session id", {
        code: "cli_error",
      });
    }
    return makeAgentHandle({ child, rpc, sessionId, model });
  } catch (err) {
    await killChild(child);
    if (err && err.code === "cli_logged_out") {
      throw err;
    }
    if (looksLoggedOut(err && (err.message || err.data))) {
      throw new CliAgentError(LOGGED_OUT_CLI, { code: "cli_logged_out" });
    }
    throw err;
  }
}

module.exports = {
  AGENT_COMMAND,
  CliAgentError,
  LOGGED_OUT_CLI,
  MISSING_CLI,
  createCliAgent,
  envWithoutSecrets,
  monitorEventsFromAcpUpdate,
};
