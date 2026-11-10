(function () {
  "use strict";

  const layout = window.MonitorLayout;
  const chatLib = window.MonitorChat;
  const app = document.getElementById("app");
  const leftPane = document.getElementById("left-pane");
  const divider = document.getElementById("divider");
  const taskList = document.getElementById("task-list");
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

  let doneStatus = null;
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
    snapshot(taskKey) {
      return jsonRequest(`/api/sessions/${encodeURIComponent(taskKey)}`);
    },
    refreshTasks() {
      return jsonRequest("/api/tasks").then((payload) => {
        allTasks = Array.isArray(payload.tasks) ? payload.tasks : [];
        renderTasks();
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

  controller.subscribe((view) => {
    renderChat(view);
    renderTasks();
  });

  restorePrefs();

  Promise.all([
    fetch("/api/config").then((res) =>
      res.ok ? res.json() : { statuses: {}, doneStatus: null }
    ),
    fetch("/api/tasks").then((res) => (res.ok ? res.json() : { tasks: [] })),
  ])
    .then(([config, payload]) => {
      doneStatus = config.doneStatus || null;
      if (doneStatus) {
        doneLabel.textContent = doneStatus;
      }
      fillStatusOptions(config.statuses || {});
      allTasks = Array.isArray(payload.tasks) ? payload.tasks : [];
      const filters = layout.readFilters(window.localStorage);
      filterName.value = filters.name;
      filterHideDone.checked = filters.hideDone;
      if (filters.status) {
        filterStatus.value = filters.status;
      }
      controller.setDefaultModel(config.defaultModel);
      renderTasks();
    })
    .catch(() => {
      allTasks = [];
      renderTasks();
    });
})();
