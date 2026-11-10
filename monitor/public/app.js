(function () {
  "use strict";

  const layout = window.MonitorLayout;
  const chatLib = window.MonitorChat;
  const stageLib = window.MonitorStage;
  const app = document.getElementById("app");
  const leftPane = document.getElementById("left-pane");
  const divider = document.getElementById("divider");
  const taskList = document.getElementById("task-list");
  const taskListError = document.getElementById("task-list-error");
  const filterName = document.getElementById("filter-name");
  const filterStatus = document.getElementById("filter-status");
  const filterHideDone = document.getElementById("filter-hide-done");
  const doneLabel = document.getElementById("done-label");
  const addTask = document.getElementById("add-task");
  const composer = document.getElementById("composer");
  const composerInput = document.getElementById("composer-input");
  const chatLog = document.getElementById("chat-log");
  const chatLoader = document.getElementById("chat-loader");
  const jumpLatest = document.getElementById("jump-latest");
  const stageBar = document.getElementById("stage-bar");
  const stageButtons = document.getElementById("stage-buttons");
  const worktreeWarn = document.getElementById("worktree-warn");
  const closeConfirm = document.getElementById("close-confirm");
  const closeConfirmText = document.getElementById("close-confirm-text");

  let doneStatus = null;
  let uiStatuses = {};
  let baseBranch = "";
  let allTasks = [];
  let stickToBottom = true;

  function applyLeftWidth(px) {
    const width = `${px}px`;
    app.style.setProperty("--left-width", width);
    leftPane.style.width = width;
    leftPane.style.flexBasis = width;
  }

  function currentFilters() {
    return {
      name: filterName.value,
      status: filterStatus.value,
      hideDone: filterHideDone.checked,
    };
  }

  function jsonRequest(urlPath, { method, body } = {}) {
    const opts = { method: method || "GET", headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(urlPath, opts).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || res.statusText || "request failed");
        err.status = res.status;
        throw err;
      }
      return data;
    });
  }

  const chatApi = {
    createSession(body) {
      return jsonRequest("/api/sessions", { method: "POST", body });
    },
    select(taskKey) {
      return jsonRequest(
        `/api/sessions/${encodeURIComponent(taskKey)}/select`,
        { method: "POST", body: {} }
      );
    },
    send(taskKey, text, extra) {
      return jsonRequest(`/api/sessions/${encodeURIComponent(taskKey)}/send`, {
        method: "POST",
        body: {
          text,
          mode: extra && extra.mode,
          intent: extra && extra.intent,
        },
      });
    },
    stage(taskKey, { action, confirmed } = {}) {
      return jsonRequest(`/api/sessions/${encodeURIComponent(taskKey)}/stage`, {
        method: "POST",
        body: { action, confirmed },
      });
    },
    snapshot(taskKey) {
      return jsonRequest(`/api/sessions/${encodeURIComponent(taskKey)}`);
    },
    refreshTasks() {
      return jsonRequest("/api/tasks").then((payload) => {
        applyTasksPayload(payload);
        return payload;
      });
    },
    openEvents(taskKey, onEvent) {
      const source = new EventSource(
        `/api/sessions/${encodeURIComponent(taskKey)}/events`
      );
      source.onmessage = (event) => {
        try {
          onEvent(JSON.parse(event.data));
        } catch {
          // ignore keep-alives / malformed
        }
      };
      return () => source.close();
    },
  };

  const controller = chatLib.createChatController({
    api: chatApi,
    mode: chatLib.MODE_INTERACTIVE,
  });

  function renderChat(view) {
    chatLog.replaceChildren();
    for (const message of view.messages) {
      const bubble = document.createElement("p");
      bubble.className = `bubble ${message.role}`;
      bubble.textContent = message.text || "";
      chatLog.append(bubble);
    }
    if (view.showLoader) {
      chatLoader.hidden = false;
      chatLog.setAttribute("aria-busy", "true");
    } else {
      chatLoader.hidden = true;
      chatLog.removeAttribute("aria-busy");
    }
    if (chatLib.onMessagesAppended({ stickToBottom }).scrollToLatest) {
      chatLog.scrollTop = chatLog.scrollHeight;
      jumpLatest.hidden = true;
    }
  }

  function applyTasksPayload(payload) {
    allTasks = Array.isArray(payload && payload.tasks) ? payload.tasks : [];
    const err = payload && typeof payload.error === "string" ? payload.error : "";
    if (err) {
      taskListError.hidden = false;
      taskListError.textContent = err;
    } else {
      taskListError.hidden = true;
      taskListError.textContent = "";
    }
    renderTasks();
    renderStage();
  }

  function renderTasks() {
    const visible = layout.filterTasks(allTasks, currentFilters(), doneStatus);
    const selected = controller.view().selected;
    taskList.replaceChildren();
    for (const task of visible) {
      const li = document.createElement("li");
      li.dataset.key = task.key;
      li.dataset.status = task.status;
      if (task.key === selected) {
        li.classList.add("selected");
      }
      const title = document.createElement("span");
      title.className = "title";
      title.textContent = task.title;
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = task.status;
      li.dataset.runState = task.runState || "idle";
      li.append(title, status);
      if (task.dependsUnmet) {
        const badge = document.createElement("span");
        badge.className = "depends-badge";
        badge.textContent = "depends";
        li.append(badge);
      }
      const run = document.createElement("span");
      run.className = "run-state";
      run.textContent = task.runState || "idle";
      li.append(run);
      taskList.append(li);
    }
  }

  function selectedTask() {
    const key = controller.view().selected;
    if (!key) {
      return null;
    }
    return allTasks.find((task) => task.key === key) || null;
  }

  function renderStage() {
    const task = selectedTask();
    const buttons = stageLib.visibleStageButtons(task, {
      statuses: uiStatuses,
      baseBranch,
    });
    stageButtons.replaceChildren();
    if (!task || buttons.length === 0) {
      stageBar.hidden = !task || !task.worktreeExists;
    } else {
      stageBar.hidden = false;
    }
    for (const button of buttons) {
      const el = document.createElement("button");
      el.type = "button";
      el.dataset.stage = button.id;
      el.textContent = button.label;
      stageButtons.append(el);
    }
    if (task && task.worktreeExists) {
      worktreeWarn.hidden = false;
      worktreeWarn.textContent =
        "A dhs worktree for this task already exists (IDE may be using it). Starting here reuses it.";
      stageBar.hidden = false;
    } else {
      worktreeWarn.hidden = true;
      worktreeWarn.textContent = "";
    }
  }

  function persistFilters() {
    layout.writeFilters(window.localStorage, currentFilters());
    renderTasks();
  }

  function fillStatusOptions(statuses) {
    const keep = filterStatus.value;
    filterStatus.replaceChildren();
    const any = document.createElement("option");
    any.value = "";
    any.textContent = "Any";
    filterStatus.append(any);
    const values = [];
    for (const value of Object.values(statuses || {})) {
      if (typeof value === "string" && value && !values.includes(value)) {
        values.push(value);
      }
    }
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      filterStatus.append(option);
    }
    if (keep && values.includes(keep)) {
      filterStatus.value = keep;
    }
  }

  function restorePrefs() {
    const width = layout.readLeftWidth(
      window.localStorage,
      window.innerWidth
    );
    applyLeftWidth(width);
    const filters = layout.readFilters(window.localStorage);
    filterName.value = filters.name;
    filterStatus.value = filters.status;
    filterHideDone.checked = filters.hideDone;
  }

  divider.addEventListener("mousedown", (event) => {
    event.preventDefault();
    function onMove(ev) {
      const width = layout.writeLeftWidth(
        window.localStorage,
        ev.clientX,
        window.innerWidth
      );
      applyLeftWidth(width);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  filterName.addEventListener("input", persistFilters);
  filterStatus.addEventListener("change", persistFilters);
  filterHideDone.addEventListener("change", persistFilters);

  addTask.addEventListener("click", () => {
    controller.startAdd().then(() => {
      renderTasks();
      composerInput.focus();
    });
  });

  taskList.addEventListener("click", (event) => {
    const row = event.target.closest("li[data-key]");
    if (!row) {
      return;
    }
    controller.selectTask(row.dataset.key).then(() => {
      renderTasks();
      renderStage();
      composerInput.focus();
    });
  });

  chatLog.addEventListener("scroll", () => {
    const next = chatLib.onUserScroll({
      scrollTop: chatLog.scrollTop,
      scrollHeight: chatLog.scrollHeight,
      clientHeight: chatLog.clientHeight,
    });
    stickToBottom = next.stickToBottom;
    jumpLatest.hidden = !next.showJump;
  });

  jumpLatest.addEventListener("click", () => {
    stickToBottom = true;
    chatLog.scrollTop = chatLog.scrollHeight;
    jumpLatest.hidden = true;
  });

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = composerInput.value;
    if (!chatLib.trimComposer(text)) {
      return;
    }
    composerInput.value = "";
    controller.submit(text);
  });

  composerInput.addEventListener("keydown", (event) => {
    if (chatLib.shouldSubmitKeydown(event)) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  stageButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-stage]");
    if (!button) {
      return;
    }
    const action = button.dataset.stage;
    if (action === stageLib.ACTION_CLOSE) {
      const task = selectedTask();
      const label = baseBranch
        ? `Confirm the GitHub PR for ${task && task.key} is merged to ${baseBranch}, then close this task only.`
        : "Confirm the GitHub PR is merged, then close this task only.";
      closeConfirmText.textContent = label;
      if (typeof closeConfirm.showModal === "function") {
        closeConfirm.showModal();
      }
      return;
    }
    controller.startStage(action);
  });

  closeConfirm.addEventListener("close", () => {
    if (closeConfirm.returnValue !== "confirm") {
      return;
    }
    controller.startStage(stageLib.ACTION_CLOSE, { confirmed: true });
  });

  controller.subscribe((view) => {
    renderChat(view);
    renderTasks();
    renderStage();
  });

  restorePrefs();

  const taskEvents = new EventSource("/api/tasks/events");
  taskEvents.onmessage = (event) => {
    try {
      applyTasksPayload(JSON.parse(event.data));
    } catch {
      // ignore keep-alives / malformed
    }
  };

  Promise.all([
    fetch("/api/config").then((res) =>
      res.ok ? res.json() : { statuses: {}, doneStatus: null }
    ),
    fetch("/api/tasks").then(async (res) => {
      const data = await res.json().catch(() => ({}));
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      if (!res.ok) {
        return {
          tasks,
          error: data.error || res.statusText || "request failed",
        };
      }
      return data;
    }),
  ])
    .then(([config, payload]) => {
      doneStatus = config.doneStatus || null;
      uiStatuses = config.statuses || {};
      baseBranch = config.baseBranch || "";
      if (doneStatus) {
        doneLabel.textContent = doneStatus;
      }
      fillStatusOptions(config.statuses || {});
      applyTasksPayload(payload);
      const filters = layout.readFilters(window.localStorage);
      filterName.value = filters.name;
      filterHideDone.checked = filters.hideDone;
      if (filters.status) {
        filterStatus.value = filters.status;
      }
      controller.setDefaultModel(config.defaultModel);
    })
    .catch(() => {
      applyTasksPayload({ tasks: [] });
    });
})();
