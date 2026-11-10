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

  function applyStreamEvent(row, event) {
    const next = {
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
    }

    function watch(key) {
      if (!key || unsubs.has(key) || typeof client.openEvents !== "function") {
        return;
      }
      const off = client.openEvents(key, (event) => ingest(key, event));
      unsubs.set(key, typeof off === "function" ? off : () => {});
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
      if (typeof client.send === "function") {
        await client.send(taskKey, trimmed, { mode: modeName });
      }
      return { submitted: true, text: trimmed, mode: modeName, taskKey };
    }

    return {
      MODE_INTERACTIVE: modeName,
      setDefaultModel(next) {
        modelId = next;
      },
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
    createChatController,
    distanceFromBottom,
    isConsultantEvent,
    isNearBottom,
    isVisibleChatTurn,
    onMessagesAppended,
    onUserScroll,
    shouldSubmitKeydown,
    trimComposer,
    visibleChatMessages,
  };
});
