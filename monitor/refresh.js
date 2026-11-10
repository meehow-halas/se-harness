"use strict";

const fs = require("fs");
const { EventEmitter } = require("events");
const {
  featuresDir,
  jiraTrackerActive,
  listTasks,
  readHarness,
} = require("./tasks");

const DEFAULT_POLL_MS = 2000;
const DEFAULT_DEBOUNCE_MS = 75;

function parsePollMs(env, fallback) {
  const base = Number.isFinite(fallback) ? fallback : DEFAULT_POLL_MS;
  const raw = env && env.DHS_MONITOR_LIST_POLL_MS;
  if (raw == null || raw === "") {
    return base;
  }
  if (!/^\d+$/.test(String(raw))) {
    return base;
  }
  const n = Number.parseInt(raw, 10);
  if (n < 50 || n > 60000) {
    return base;
  }
  return n;
}

function payloadSignature(payload) {
  const tasks = payload && Array.isArray(payload.tasks) ? payload.tasks : [];
  return JSON.stringify(
    tasks.map((row) => [
      row.key,
      row.title,
      row.status,
      Boolean(row.dependsUnmet),
      row.runState || "idle",
    ])
  );
}

function createListRefresher(options = {}) {
  const cwd = options.cwd;
  const env = options.env || process.env;
  const sessions = options.sessions;
  const pollMs = Number.isFinite(options.pollMs)
    ? options.pollMs
    : parsePollMs(env, DEFAULT_POLL_MS);
  const debounceMs = Number.isFinite(options.debounceMs)
    ? options.debounceMs
    : DEFAULT_DEBOUNCE_MS;
  const events = new EventEmitter();
  events.setMaxListeners(0);
  let stopped = false;
  let lastSig = null;
  let debounceTimer = null;
  let pollTimer = null;
  let watcher = null;

  function load() {
    return listTasks(cwd, { sessions, env });
  }

  function publish(force) {
    const payload = load();
    const sig = payloadSignature(payload);
    if (!force && sig === lastSig) {
      return payload;
    }
    lastSig = sig;
    if (!stopped) {
      events.emit("tasks", payload);
    }
    return payload;
  }

  function schedule(force) {
    if (stopped) {
      return;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      publish(force);
    }, debounceMs);
    if (debounceTimer.unref) {
      debounceTimer.unref();
    }
  }

  function attachWatch() {
    if (stopped || watcher) {
      return;
    }
    const config = readHarness(cwd);
    if (!config || jiraTrackerActive(config)) {
      return;
    }
    const dir = featuresDir(cwd, config);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      return;
    }
    try {
      watcher = fs.watch(dir, () => schedule(false));
      if (watcher.unref) {
        watcher.unref();
      }
      watcher.on("error", () => {});
    } catch {
      watcher = null;
    }
  }

  function start() {
    publish(true);
    attachWatch();
    pollTimer = setInterval(() => {
      attachWatch();
      schedule(false);
    }, pollMs);
    if (pollTimer.unref) {
      pollTimer.unref();
    }
  }

  start();

  return {
    snapshot() {
      return load();
    },
    nudge() {
      schedule(true);
    },
    subscribe(fn) {
      events.on("tasks", fn);
      return () => events.off("tasks", fn);
    },
    stop() {
      stopped = true;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (watcher) {
        try {
          watcher.close();
        } catch {
          // already closed
        }
        watcher = null;
      }
      events.removeAllListeners();
    },
  };
}

module.exports = {
  DEFAULT_POLL_MS,
  createListRefresher,
  parsePollMs,
  payloadSignature,
};
