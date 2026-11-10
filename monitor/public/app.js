(function () {
  "use strict";

  const layout = window.MonitorLayout;
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

  let doneStatus = null;
  let allTasks = [];

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

  function renderTasks() {
    const visible = layout.filterTasks(allTasks, currentFilters(), doneStatus);
    taskList.replaceChildren();
    for (const task of visible) {
      const li = document.createElement("li");
      li.dataset.key = task.key;
      li.dataset.status = task.status;
      const title = document.createElement("span");
      title.className = "title";
      title.textContent = task.title;
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = task.status;
      li.append(title, status);
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

  function echo(text) {
    const bubble = document.createElement("p");
    bubble.className = "bubble user";
    bubble.textContent = text;
    chatLog.append(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
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
    composerInput.focus();
  });

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = composerInput.value.trim();
    if (!text) {
      return;
    }
    echo(text);
    composerInput.value = "";
  });

  composerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  restorePrefs();

  fetch("/api/config")
    .then((res) => (res.ok ? res.json() : { statuses: {}, doneStatus: null }))
    .then((config) => {
      doneStatus = config.doneStatus || null;
      if (doneStatus) {
        doneLabel.textContent = doneStatus;
      }
      fillStatusOptions(config.statuses || {});
      allTasks = layout.placeholderTasks(config.statuses || {});
      const filters = layout.readFilters(window.localStorage);
      filterName.value = filters.name;
      filterHideDone.checked = filters.hideDone;
      if (filters.status) {
        filterStatus.value = filters.status;
      }
      renderTasks();
    })
    .catch(() => {
      allTasks = layout.placeholderTasks({});
      renderTasks();
    });
})();
