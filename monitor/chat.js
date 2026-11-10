(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.MonitorChat = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MODE_INTERACTIVE = "interactive";
  const NEAR_BOTTOM_PX = 48;
  const JUMP_LABEL = "Latest";

  function asString(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
  }

  function looksConsultant(value) {
    if (asString(value) === "consultant") {
      return true;
    }
    if (!value || typeof value !== "object") {
      return false;
    }
    return ["name", "role", "id", "type", "speaker"].some(
      (key) => asString(value[key]) === "consultant"
    );
  }

  function isConsultantEvent(event) {
    if (!event || typeof event !== "object") {
      return false;
    }
    if (asString(event.role) === "consultant") {
      return true;
    }
    const keys = [
      "role",
      "speaker",
      "agent",
      "name",
      "subagent",
      "subagentType",
      "subagent_type",
    ];
    for (const key of keys) {
      if (looksConsultant(event[key])) {
        return true;
      }
    }
    if (event.message && event.message !== event) {
      return isConsultantEvent(event.message);
    }
    return false;
  }

  function isVisibleChatTurn(message) {
    if (!message || typeof message !== "object") {
      return false;
    }
    if (isConsultantEvent(message)) {
      return false;
    }
    const role = typeof message.role === "string" ? message.role : "";
    if (role === "consultant") {
      return false;
    }
    return role === "user" || role === "assistant" || role === "status";
  }

  function visibleChatMessages(messages) {
    const list = Array.isArray(messages) ? messages : [];
    return list.filter(isVisibleChatTurn);
  }

  function shouldSubmitKeydown(event) {
    if (!event || event.key !== "Enter") {
      return false;
    }
    return !event.shiftKey;
  }

  function trimComposer(text) {
    return typeof text === "string" ? text.trim() : "";
  }

  function buildFirstPlanitPrompt(userText) {
    const text = trimComposer(userText);
    if (!text) {
      return "";
    }
    if (text.startsWith("/dhs-planit")) {
      return text;
    }
    return `/dhs-planit\n\n${text}`;
  }

  function distanceFromBottom({ scrollTop, scrollHeight, clientHeight }) {
    const top = Number(scrollTop) || 0;
    const height = Number(scrollHeight) || 0;
    const view = Number(clientHeight) || 0;
    return height - view - top;
  }

  function isNearBottom(metrics, threshold) {
    const limit = Number.isFinite(threshold) ? threshold : NEAR_BOTTOM_PX;
    return distanceFromBottom(metrics) <= limit;
  }

  function onUserScroll(metrics, threshold) {
    const atBottom = isNearBottom(metrics, threshold);
    return {
      stickToBottom: atBottom,
      showJump: !atBottom,
    };
  }

  function onMessagesAppended({ stickToBottom }) {
    return {
      scrollToLatest: Boolean(stickToBottom),
    };
  }

  function eventBlob(event) {
    try {
      return JSON.stringify(event).toLowerCase();
    } catch {
      return "";
    }
  }

  function shouldRefreshListFromEvent(event) {
    if (!event || typeof event !== "object") {
      return false;
    }
    if (event.type === "run" && event.status !== "running") {
      return true;
    }
    const type = typeof event.type === "string" ? event.type : "";
    if (type !== "tool_call" && type !== "tool_result" && type !== "tool") {
      return false;
    }
    const blob = eventBlob(event);
    if (blob.includes("consultant")) {
      return false;
    }
    return (
      blob.includes(".feature.md") ||
      blob.includes(".prompt.md") ||
      blob.includes("jira") ||
      blob.includes("write") ||
      blob.includes("strreplace") ||
      blob.includes("applypatch")
    );
  }

  function applyStreamEvent(row, event) {
    const next = {
      ...(row && typeof row === "object" ? row : {}),
      messages: Array.isArray(row && row.messages) ? row.messages.slice() : [],
      busy: Boolean(row && row.busy),
    };
    if (!event || typeof event !== "object") {
      return next;
    }
    if (event.type === "snapshot") {
      next.messages = Array.isArray(event.messages) ? event.messages.slice() : [];
      if (typeof event.busy === "boolean") {
        next.busy = event.busy;
      }
      return next;
    }
    if (event.type === "message" && event.message) {
      const last = next.messages[next.messages.length - 1];
      if (
        event.upsert &&
        last &&
        last.role === event.message.role
      ) {
        next.messages[next.messages.length - 1] = event.message;
        return next;
      }
      next.messages.push(event.message);
      return next;
    }
    if (event.type === "run") {
      next.busy = event.status === "running";
      return next;
    }
    return next;
  }

  function createChatController({ api, defaultModel, mode } = {}) {
    const client = api || {};
    const modeName = mode || MODE_INTERACTIVE;
    let modelId = defaultModel;
    const transcripts = new Map();
    const unsubs = new Map();
    const listeners = new Set();
    let selected = null;

    function ensureRow(key) {
      if (!transcripts.has(key)) {
        transcripts.set(key, { messages: [], busy: false });
      }
      return transcripts.get(key);
    }

    function view() {
      const row = selected ? ensureRow(selected) : { messages: [], busy: false };
      return {
        selected,
        messages: visibleChatMessages(row.messages),
        busy: Boolean(row.busy),
        showLoader: Boolean(selected && row.busy),
      };
    }

    function notify() {
      const current = view();
      for (const fn of listeners) {
        fn(current);
      }
    }

    function ingest(key, event) {
      const updated = applyStreamEvent(ensureRow(key), event);
      transcripts.set(key, updated);
      notify();
      if (
        shouldRefreshListFromEvent(event) &&
        typeof client.refreshTasks === "function"
      ) {
        Promise.resolve(client.refreshTasks()).catch(() => {});
      }
    }

    function watch(key) {
      if (!key || unsubs.has(key) || typeof client.openEvents !== "function") {
        return;
      }
      const off = client.openEvents(key, (event) => ingest(key, event));
      unsubs.set(key, typeof off === "function" ? off : () => {});
    }

    async function startAdd() {
      if (typeof client.createSession !== "function") {
        return { started: false };
      }
      try {
        const created = await client.createSession({
          intent: "planit",
          model: modelId,
          mode: modeName,
        });
        const key = created && created.taskKey;
        if (!key) {
          return { started: false };
        }
        await selectTask(key);
        const row = ensureRow(key);
        row.intent = "planit";
        row.planitStarted = false;
        return { started: true, taskKey: key, mode: modeName };
      } catch (err) {
        const fallback = selected || "new-error";
        const row = ensureRow(fallback);
        row.messages.push({
          role: "status",
          text: err && err.message ? err.message : String(err),
        });
        selected = fallback;
        notify();
        return { started: false, error: err };
      }
    }

    async function selectTask(key) {
      selected = key;
      const alreadyWatching = unsubs.has(key);
      watch(key);
      if (typeof client.select === "function") {
        try {
          await client.select(key);
        } catch {
          // Task may have no live session yet; keep the local selection.
        }
      }
      if (!alreadyWatching && typeof client.snapshot === "function") {
        try {
          const snap = await client.snapshot(key);
          ingest(key, {
            type: "snapshot",
            messages: snap && snap.messages,
            busy: snap && snap.busy,
          });
        } catch {
          // Empty transcript until the first send.
        }
      }
      notify();
      return view();
    }

    async function startStage(action, { confirmed } = {}) {
      const taskKey = selected;
      if (!taskKey) {
        return { started: false };
      }
      if (action === "close" && confirmed !== true) {
        return { started: false, needsConfirm: true };
      }
      if (typeof client.stage !== "function") {
        return { started: false };
      }
      try {
        const result = await client.stage(taskKey, { action, confirmed });
        watch(taskKey);
        if (typeof client.refreshTasks === "function") {
          await client.refreshTasks();
        }
        notify();
        return {
          started: true,
          taskKey: result && result.taskKey ? result.taskKey : taskKey,
          action,
          worktreeExists: Boolean(result && result.worktreeExists),
        };
      } catch (err) {
        const row = ensureRow(taskKey);
        row.messages.push({
          role: "status",
          text: err && err.message ? err.message : String(err),
        });
        notify();
        return { started: false, error: err };
      }
    }

    async function submit(text) {
      const trimmed = trimComposer(text);
      const taskKey = selected;
      if (!trimmed || !taskKey) {
        return { submitted: false };
      }
      if (typeof client.createSession === "function") {
        try {
          await client.createSession({
            taskKey,
            model: modelId,
            mode: modeName,
          });
        } catch (err) {
          const row = ensureRow(taskKey);
          row.messages.push({
            role: "status",
            text: err && err.message ? err.message : String(err),
          });
          notify();
          return { submitted: false, error: err };
        }
      }
      watch(taskKey);
      const row = ensureRow(taskKey);
      const firstPlanit = row.intent === "planit" && !row.planitStarted;
      const extra = { mode: modeName };
      if (firstPlanit) {
        extra.intent = "planit";
        row.planitStarted = true;
      }
      let result;
      if (typeof client.send === "function") {
        try {
          result = await client.send(taskKey, trimmed, extra);
        } catch (err) {
          const failed = ensureRow(taskKey);
          if (firstPlanit) {
            failed.planitStarted = false;
          }
          failed.messages.push({
            role: "status",
            text: err && err.message ? err.message : String(err),
          });
          notify();
          return { submitted: false, error: err };
        }
      }
      const liveRow = ensureRow(taskKey);
      if (firstPlanit) {
        liveRow.planitStarted = true;
      }
      const boundKey =
        result && typeof result.taskKey === "string" ? result.taskKey : taskKey;
      if (boundKey !== taskKey) {
        transcripts.set(boundKey, liveRow);
        await selectTask(boundKey);
      }
      if (typeof client.refreshTasks === "function") {
        await client.refreshTasks();
      }
      return {
        submitted: true,
        text: trimmed,
        mode: modeName,
        taskKey: boundKey,
        intent: firstPlanit ? "planit" : undefined,
      };
    }

    return {
      MODE_INTERACTIVE: modeName,
      setDefaultModel(next) {
        modelId = next;
      },
      startAdd,
      startStage,
      selectTask,
      submit,
      view,
      watch,
      ingest,
      shouldSubmitKeydown,
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      watchedKeys() {
        return [...unsubs.keys()];
      },
    };
  }

  return {
    JUMP_LABEL,
    MODE_INTERACTIVE,
    NEAR_BOTTOM_PX,
    applyStreamEvent,
    buildFirstPlanitPrompt,
    createChatController,
    distanceFromBottom,
    isConsultantEvent,
    isNearBottom,
    isVisibleChatTurn,
    onMessagesAppended,
    onUserScroll,
    shouldRefreshListFromEvent,
    shouldSubmitKeydown,
    trimComposer,
    visibleChatMessages,
  };
});
