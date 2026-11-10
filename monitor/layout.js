(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.MonitorLayout = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const LEFT_MIN_PX = 350;
  const LEFT_MAX_RATIO = 0.25;
  const CHAT_COLUMN_PX = 720;
  const STORAGE_LEFT_WIDTH = "dhs.monitor.leftWidth";
  const STORAGE_FILTERS = "dhs.monitor.filters";

  function clampLeftWidth(px, viewportWidth) {
    const raw = Number(px);
    const viewport = Number(viewportWidth);
    const max = Math.floor(viewport * LEFT_MAX_RATIO);
    const upper = Math.max(LEFT_MIN_PX, max);
    if (!Number.isFinite(raw)) {
      return LEFT_MIN_PX;
    }
    return Math.min(Math.max(Math.round(raw), LEFT_MIN_PX), upper);
  }

  function defaultFilters() {
    return { name: "", status: "", hideDone: true };
  }

  function parseFilters(raw) {
    const fallback = defaultFilters();
    if (raw == null || raw === "") {
      return fallback;
    }
    let parsed = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return fallback;
      }
    }
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      status: typeof parsed.status === "string" ? parsed.status : "",
      hideDone: parsed.hideDone === false ? false : true,
    };
  }

  function serializeFilters(filters) {
    const next = parseFilters(filters);
    return JSON.stringify(next);
  }

  function readLeftWidth(storage, viewportWidth) {
    const stored =
      storage && typeof storage.getItem === "function"
        ? storage.getItem(STORAGE_LEFT_WIDTH)
        : null;
    return clampLeftWidth(stored, viewportWidth);
  }

  function writeLeftWidth(storage, px, viewportWidth) {
    const width = clampLeftWidth(px, viewportWidth);
    if (storage && typeof storage.setItem === "function") {
      storage.setItem(STORAGE_LEFT_WIDTH, String(width));
    }
    return width;
  }

  function readFilters(storage) {
    const stored =
      storage && typeof storage.getItem === "function"
        ? storage.getItem(STORAGE_FILTERS)
        : null;
    return parseFilters(stored);
  }

  function writeFilters(storage, filters) {
    const next = parseFilters(filters);
    if (storage && typeof storage.setItem === "function") {
      storage.setItem(STORAGE_FILTERS, serializeFilters(next));
    }
    return next;
  }

  function filterTasks(tasks, filters, doneStatus) {
    const list = Array.isArray(tasks) ? tasks : [];
    const applied = parseFilters(filters);
    const nameQuery = applied.name.trim().toLowerCase();
    return list.filter((task) => {
      if (!task || typeof task !== "object") {
        return false;
      }
      const status = typeof task.status === "string" ? task.status : "";
      const title = typeof task.title === "string" ? task.title : "";
      if (applied.hideDone && doneStatus && status === doneStatus) {
        return false;
      }
      if (applied.status && status !== applied.status) {
        return false;
      }
      if (nameQuery && !title.toLowerCase().includes(nameQuery)) {
        return false;
      }
      return true;
    });
  }

  function pickStatusMap(config) {
    const agents = config && config.agents;
    if (!agents || typeof agents !== "object") {
      return {};
    }
    const tracker = agents.tracker;
    if (tracker && tracker.statuses && typeof tracker.statuses === "object") {
      return tracker.statuses;
    }
    if (agents.statuses && typeof agents.statuses === "object") {
      return agents.statuses;
    }
    return {};
  }

  function uiConfigFromHarness(config) {
    const statuses = pickStatusMap(config);
    const done =
      typeof statuses.done === "string" && statuses.done.trim() !== ""
        ? statuses.done
        : null;
    return { statuses, doneStatus: done };
  }

  function placeholderTasks(statuses) {
    const map = statuses && typeof statuses === "object" ? statuses : {};
    const todo = typeof map.todo === "string" ? map.todo : "todo";
    const inProgress =
      typeof map["in progress"] === "string"
        ? map["in progress"]
        : typeof map.inProgress === "string"
          ? map.inProgress
          : "in progress";
    const done = typeof map.done === "string" ? map.done : "done";
    return [
      { key: "stub-open", title: "Open sample", status: todo },
      { key: "stub-busy", title: "Busy sample", status: inProgress },
      { key: "stub-closed", title: "Closed sample", status: done },
    ];
  }

  return {
    CHAT_COLUMN_PX,
    LEFT_MAX_RATIO,
    LEFT_MIN_PX,
    STORAGE_FILTERS,
    STORAGE_LEFT_WIDTH,
    clampLeftWidth,
    defaultFilters,
    filterTasks,
    parseFilters,
    placeholderTasks,
    readFilters,
    readLeftWidth,
    serializeFilters,
    uiConfigFromHarness,
    writeFilters,
    writeLeftWidth,
  };
});
