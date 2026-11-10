(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.MonitorStage = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ACTION_DOIT = "doit";
  const ACTION_REVIEW = "review";
  const ACTION_CLOSE = "close";
  const STAGE_ACTIONS = [ACTION_DOIT, ACTION_REVIEW, ACTION_CLOSE];

  function isStageAction(action) {
    return STAGE_ACTIONS.includes(action);
  }

  function closeConfirmRequired(action) {
    return action === ACTION_CLOSE;
  }

  function mappedStatus(statuses, filesKey, jiraKey) {
    const map = statuses && typeof statuses === "object" ? statuses : {};
    const fromFiles = map[filesKey];
    if (typeof fromFiles === "string" && fromFiles.trim()) {
      return fromFiles.trim();
    }
    const fromJira = jiraKey ? map[jiraKey] : null;
    if (typeof fromJira === "string" && fromJira.trim()) {
      return fromJira.trim();
    }
    return null;
  }

  function visibleStageButtons(task, { statuses, baseBranch } = {}) {
    if (!task || typeof task !== "object" || typeof task.key !== "string") {
      return [];
    }
    const status = typeof task.status === "string" ? task.status : "";
    const todo = mappedStatus(statuses, "todo", "todo");
    const inProgress = mappedStatus(statuses, "in progress", "inProgress");
    const inReview = mappedStatus(statuses, "in review", "inReview");
    const branch =
      typeof baseBranch === "string" && baseBranch.trim()
        ? baseBranch.trim()
        : "";
    const buttons = [];
    if (task.hasSpecPrompt && todo && status === todo) {
      buttons.push({
        id: ACTION_DOIT,
        label: "Run implementation",
        skill: "/dhs-doit",
        confirm: false,
      });
    }
    if (inProgress && status === inProgress) {
      buttons.push({
        id: ACTION_REVIEW,
        label: "Run review",
        skill: "/dhs-checkit review",
        confirm: false,
      });
    }
    if (inReview && status === inReview) {
      buttons.push({
        id: ACTION_CLOSE,
        label: branch ? `PR merged to ${branch}` : "PR merged",
        skill: "/dhs-checkit close",
        confirm: true,
      });
    }
    return buttons;
  }

  function stageTaskKeys(taskKey) {
    if (typeof taskKey !== "string" || taskKey.trim() === "") {
      return [];
    }
    return [taskKey.trim()];
  }

  function buildStagePrompt({ action, taskKey, baseBranch } = {}) {
    const keys = stageTaskKeys(taskKey);
    if (keys.length !== 1) {
      return "";
    }
    const key = keys[0];
    if (action === ACTION_DOIT) {
      return `/dhs-doit ${key}`;
    }
    if (action === ACTION_REVIEW) {
      return `/dhs-checkit review ${key}`;
    }
    if (action === ACTION_CLOSE) {
      const branch =
        typeof baseBranch === "string" && baseBranch.trim()
          ? baseBranch.trim()
          : "";
      const merged = branch
        ? `The GitHub PR for ${key} is merged to ${branch}.`
        : `The GitHub PR for ${key} is merged.`;
      return `/dhs-checkit close ${key}\n\n${merged} Close this task only.`;
    }
    return "";
  }

  function gateStageSend({ action, confirmed } = {}) {
    if (!isStageAction(action)) {
      return { allowed: false, code: "invalid_stage" };
    }
    if (closeConfirmRequired(action) && confirmed !== true) {
      return { allowed: false, code: "confirm_required" };
    }
    return { allowed: true };
  }

  return {
    ACTION_CLOSE,
    ACTION_DOIT,
    ACTION_REVIEW,
    STAGE_ACTIONS,
    buildStagePrompt,
    closeConfirmRequired,
    gateStageSend,
    isStageAction,
    mappedStatus,
    stageTaskKeys,
    visibleStageButtons,
  };
});
