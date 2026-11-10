"use strict";

const { EventEmitter } = require("events");
const { PassThrough } = require("stream");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function promptText(params) {
  const prompt = params && params.prompt;
  if (typeof prompt === "string") {
    return prompt;
  }
  if (!Array.isArray(prompt)) {
    return "";
  }
  return prompt
    .filter((block) => block && typeof block.text === "string")
    .map((block) => block.text)
    .join("");
}

function modelFromArgs(args) {
  const index = args.indexOf("--model");
  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }
  return null;
}

function toAcpUpdate(event) {
  if (!event || typeof event !== "object") {
    return { sessionUpdate: "unknown", event };
  }
  if (event.type === "assistant") {
    const content = event.message && event.message.content;
    const text = Array.isArray(content)
      ? content
          .filter((block) => block && block.type === "text")
          .map((block) => block.text)
          .join("")
      : "";
    const update = {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text },
    };
    if (event.agent) {
      update.agent = event.agent;
    }
    return update;
  }
  if (event.type === "tool_call" || event.type === "tool") {
    return {
      sessionUpdate: "tool_call",
      name: event.name,
      path: event.path,
      title: event.name,
    };
  }
  return { sessionUpdate: "unknown", event };
}

function createFakeAgentCli({
  sendDelayMs = 40,
  streamFor,
  onSend,
  loggedIn = true,
  missingBinary = false,
} = {}) {
  const spawns = [];
  const creates = [];
  const resumes = [];
  const sessionNews = [];
  const sends = [];
  const disposes = [];
  const liveIds = new Set();
  let seq = 0;
  let pidSeq = 7000;
  let inFlight = 0;
  let maxInFlight = 0;

  function emitLine(stdout, value) {
    stdout.write(`${JSON.stringify(value)}\n`);
  }

  function makeStatusChild() {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.pid = ++pidSeq;
    child.killed = false;
    child.exitCode = null;
    child.kill = () => {
      child.killed = true;
      child.exitCode = 0;
      child.emit("exit", 0, "SIGTERM");
    };
    queueMicrotask(() => {
      child.emit("spawn");
      if (loggedIn) {
        child.stdout.write("Logged in as monitor-fixture@example.test\n");
        child.exitCode = 0;
        child.emit("exit", 0, null);
        return;
      }
      child.stderr.write("Not authenticated. Run `agent login`.\n");
      child.exitCode = 1;
      child.emit("exit", 1, null);
    });
    return child;
  }

  function makeAcpChild({ args, cwd, env, command }) {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.pid = ++pidSeq;
    child.killed = false;
    child.exitCode = null;
    const model = modelFromArgs(args);
    const rec = {
      command,
      args: [...args],
      cwd,
      env: { ...env },
      model: { id: model },
      local: { cwd },
      pid: child.pid,
    };
    creates.push(rec);
    let buf = "";
    let agentId = null;

    child.kill = () => {
      if (child.killed) {
        return;
      }
      child.killed = true;
      child.exitCode = 0;
      if (agentId) {
        liveIds.delete(agentId);
        disposes.push(agentId);
      } else {
        disposes.push(child.pid);
      }
      child.emit("exit", 0, "SIGTERM");
    };

    function reply(id, result) {
      emitLine(child.stdout, { jsonrpc: "2.0", id, result });
    }

    function replyError(id, message) {
      emitLine(child.stdout, {
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message },
      });
    }

    async function handlePrompt(id, params) {
      const text = promptText(params);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      sends.push({ agentId, text, pid: child.pid });
      try {
        if (typeof onSend === "function") {
          onSend(text, agentId);
        }
        await delay(sendDelayMs);
        const events =
          typeof streamFor === "function"
            ? streamFor(text)
            : [
                {
                  type: "assistant",
                  message: {
                    content: [{ type: "text", text: `echo:${text}` }],
                  },
                },
              ];
        for (const event of events) {
          emitLine(child.stdout, {
            jsonrpc: "2.0",
            method: "session/update",
            params: { update: toAcpUpdate(event) },
          });
        }
        reply(id, { stopReason: "end_turn" });
      } finally {
        inFlight -= 1;
      }
    }

    child.stdin.on("data", (chunk) => {
      buf += chunk;
      const parts = buf.split("\n");
      buf = parts.pop();
      for (const part of parts) {
        const line = part.trim();
        if (!line) {
          continue;
        }
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.method === "initialize") {
          reply(msg.id, { protocolVersion: 1 });
          continue;
        }
        if (msg.method === "authenticate") {
          reply(msg.id, {});
          continue;
        }
        if (msg.method === "session/load") {
          const id = msg.params && msg.params.sessionId;
          resumes.push({ id, cwd, model });
          if (id && liveIds.has(id)) {
            agentId = id;
            rec.agentId = id;
            reply(msg.id, { sessionId: id });
          } else {
            replyError(msg.id, "agent id is not live");
          }
          continue;
        }
        if (msg.method === "session/new") {
          agentId = `fake-cli-${++seq}`;
          liveIds.add(agentId);
          rec.agentId = agentId;
          sessionNews.push({ sessionId: agentId, cwd, model });
          reply(msg.id, { sessionId: agentId });
          continue;
        }
        if (msg.method === "session/prompt") {
          handlePrompt(msg.id, msg.params);
        }
      }
    });

    queueMicrotask(() => child.emit("spawn"));
    return child;
  }

  function spawn(command, args, options) {
    const cwd = options && options.cwd;
    const env = (options && options.env) || {};
    spawns.push({ command, args: [...args], cwd, env: { ...env } });
    if (missingBinary) {
      const err = new Error("spawn ENOENT");
      err.code = "ENOENT";
      throw err;
    }
    if (args.includes("status")) {
      return makeStatusChild();
    }
    return makeAcpChild({ args, cwd, env, command });
  }

  return {
    spawn,
    spawns,
    creates,
    resumes,
    sessionNews,
    sends,
    disposes,
    liveIds,
    maxInFlight: () => maxInFlight,
    acpSpawns: () => spawns.filter((row) => row.args.includes("acp")),
    statusSpawns: () => spawns.filter((row) => row.args.includes("status")),
  };
}

module.exports = { createFakeAgentCli };
