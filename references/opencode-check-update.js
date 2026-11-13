import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// OpenCode V2 server plugin. The loader requires a default export of
// { id: string, setup: function }; a bare function fails with "Plugin failed".

function projectRoot(start) {
  let dir = start;
  while (dir && dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, ".seh", "scripts", "check-update"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return start;
}

function updateNotice(cwd) {
  const script = path.join(cwd, ".seh", "scripts", "check-update");
  if (!existsSync(script)) {
    return Promise.resolve("");
  }
  return new Promise((resolve) => {
    try {
      const child = execFile(
        "sh",
        [script, "--host", "opencode"],
        {
          cwd,
          encoding: "utf8",
          timeout: 15000,
          env: { ...process.env, SEH_CHECK_ROOT: cwd },
        },
        (_error, stdout) => resolve(String(stdout || "").trim())
      );
      // check-update drains a piped stdin (hook payload); close it so it does not wait.
      if (child.stdin) child.stdin.end();
    } catch {
      resolve("");
    }
  });
}

function startDirectory(ctx) {
  const location = ctx && ctx.location;
  return (location && (location.directory || (location.project && location.project.directory))) || process.cwd();
}

function entryApi(ctx) {
  const entry = ctx && ctx.session && ctx.session.instructions && ctx.session.instructions.entry;
  return entry && typeof entry.put === "function" ? entry : null;
}

async function watchSessions(ctx, signal) {
  const entry = entryApi(ctx);
  if (!entry || !ctx.event || typeof ctx.event.subscribe !== "function") {
    return;
  }
  const cwd = projectRoot(startDirectory(ctx));
  let notice;
  for await (const event of ctx.event.subscribe({ types: ["session.created"], signal })) {
    if (!event || event.type !== "session.created") {
      continue;
    }
    const data = event.data || {};
    const sessionID = String(data.sessionID || "").trim();
    // Subagent sessions have a parent; the notice belongs to the top-level session only.
    if (!sessionID || data.parentID) {
      continue;
    }
    try {
      if (notice === undefined) {
        notice = await updateNotice(cwd);
      }
      if (notice) {
        await entry.put({ sessionID, key: "seh-update", value: notice });
      }
    } catch {
      // fail-open
    }
  }
}

export default {
  id: "seh-check-update",
  setup(ctx) {
    const controller = new AbortController();
    watchSessions(ctx, controller.signal).catch(() => {});
    return () => controller.abort();
  },
};
