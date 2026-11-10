"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  assertBlocked,
  assertOk,
  initGitRepo,
  pathHidingCommand,
  runScript,
  startWorktree,
  withTempDir,
  writeFile,
} = require("../test/helpers");

const FIX = {
  organizationUrl: "https://dev.azure.com/qx9-ado-fixture-org",
  project: "QX9WidgetProject",
  token: "pat_qx9_never_print",
  featureType: "Product Backlog Item",
  bugType: "Bug",
  todoStatus: "QX9 Backlog New",
  specField: "Custom.QX9SpecField",
  specName: "QX9 Engineering Spec",
};

function tracker(over = {}) {
  return {
    kind: "ado",
    organizationUrl: FIX.organizationUrl,
    project: FIX.project,
    workItemTypes: { feature: FIX.featureType, bug: FIX.bugType },
    fields: { spec: FIX.specField, prompt: "description", log: "comment" },
    fetchFields: [FIX.specField],
    statuses: {
      todo: FIX.todoStatus,
      inProgress: null,
      codeReview: "QX9 In Review",
      inReview: "QX9 Awaiting Signoff",
      done: "QX9 Shipped",
      blocker: "QX9 Blocked",
    },
    ...over,
  };
}

function writeProject(cwd, { trackerOver, token = FIX.token } = {}) {
  initGitRepo(cwd);
  const cfg = {
    agents: {
      baseBranch: "dev",
      tracker: tracker(trackerOver),
    },
  };
  writeFile(cwd, "harness.config.json", `${JSON.stringify(cfg, null, 2)}\n`);
  if (token !== null) {
    writeFile(
      cwd,
      "harness.credentials.local.json",
      `${JSON.stringify({ adoPat: token })}\n`
    );
  }
}

function writeCurlStub(cwd, routes) {
  const bin = path.join(cwd, ".ado-bin");
  fs.mkdirSync(bin, { recursive: true });
  const routesFile = path.join(bin, "routes.json");
  const logFile = path.join(bin, "curl-argv.log");
  const dataFile = path.join(bin, "curl-data.log");
  fs.writeFileSync(routesFile, JSON.stringify(routes));
  const curl = path.join(bin, "curl");
  fs.writeFileSync(
    curl,
    `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
const logFile = ${JSON.stringify(logFile)};
const routesFile = ${JSON.stringify(routesFile)};
const dataLog = ${JSON.stringify(dataFile)};
fs.appendFileSync(logFile, JSON.stringify(args) + "\\n");
let method = "GET";
let url = "";
let out = "";
let data = "";
let writeFmt = "";
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-X") method = args[++i];
  else if (a === "--url") url = args[++i];
  else if (a === "-o") out = args[++i];
  else if (a === "-w") writeFmt = args[++i];
  else if (a === "--data-binary") {
    const v = args[++i];
    data = v.startsWith("@") ? fs.readFileSync(v.slice(1), "utf8") : v;
  } else if (a === "--config") i++;
}
const u = new URL(url);
const key = method + " " + u.pathname;
const routes = JSON.parse(fs.readFileSync(routesFile, "utf8"));
const hit = routes[key] || routes[key.replace(/\\/$/, "")] || { code: 404, body: { message: "no stub for " + key } };
fs.appendFileSync(dataLog, JSON.stringify({ key, data, search: u.search }) + "\\n");
const body = typeof hit.body === "string" ? hit.body : JSON.stringify(hit.body || {});
if (out) fs.writeFileSync(out, body);
if (writeFmt === "%{http_code}") process.stdout.write(String(hit.code || 200));
`
  );
  fs.chmodSync(curl, 0o755);
  return {
    logFile,
    dataFile,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  };
}

function witPath(suffix) {
  return `/qx9-ado-fixture-org/${FIX.project}${suffix}`;
}

function defaultRoutes(extra = {}) {
  return {
    [`GET ${witPath("/_apis/wit/workitemtypes")}`]: {
      code: 200,
      body: {
        count: 2,
        value: [
          {
            name: FIX.featureType,
            states: [
              { name: FIX.todoStatus },
              { name: "QX9 In Review" },
              { name: "QX9 Shipped" },
            ],
          },
          {
            name: FIX.bugType,
            states: [{ name: FIX.todoStatus }, { name: "QX9 Shipped" }],
          },
        ],
      },
    },
    "GET /qx9-ado-fixture-org/_apis/wit/fields": {
      code: 200,
      body: {
        value: [
          { referenceName: "System.Title", name: "Title" },
          { referenceName: FIX.specField, name: FIX.specName },
        ],
      },
    },
    ...extra,
  };
}

function runAdo(cwd, args, env) {
  return runScript("ado", args, { cwd, env });
}

function argvHasToken(logFile, token) {
  if (!fs.existsSync(logFile)) {
    return false;
  }
  return fs.readFileSync(logFile, "utf8").includes(token);
}

describe("ado", () => {
  test("BLOCKED when curl is missing", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const result = runAdo(cwd, ["meta"], {
        PATH: pathHidingCommand(cwd, "curl"),
      });
      assertBlocked(result, /curl is not available/);
    });
  });

  test("BLOCKED when agents.tracker is absent", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runAdo(cwd, ["meta"], stub.env);
      assertBlocked(result, /Azure DevOps is not connected/);
    });
  });

  test("BLOCKED when adoPat is missing", () => {
    withTempDir((cwd) => {
      writeProject(cwd, { token: null });
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runAdo(cwd, ["meta"], stub.env);
      assertBlocked(result, /Azure DevOps token is missing/);
    });
  });

  test("BLOCKED when tracker kind is not ado", () => {
    withTempDir((cwd) => {
      writeProject(cwd, {
        trackerOver: {
          kind: "jira",
          url: "https://jira.qx9.example.test",
          projectKey: "QX9",
          user: "ada@qx9.example.test",
        },
      });
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runAdo(cwd, ["meta"], stub.env);
      assertBlocked(result, /Azure DevOps is not connected/);
    });
  });

  test("meta lists statuses, work item types, and custom fields for the configured project", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runAdo(cwd, ["meta"], stub.env);
      const parsed = assertOk(result, { project: FIX.project });
      assert.equal(parsed.fields["status.1"], FIX.todoStatus);
      assert.equal(parsed.fields["issueType.1"], FIX.featureType);
      assert.equal(parsed.fields["issueType.2"], FIX.bugType);
      assert.match(
        result.stdout,
        new RegExp(`${FIX.specField} \\| ${FIX.specName}`)
      );
      assert.match(result.stdout, /field\.1: description \| Description/);
      assert.equal(result.stdout.includes(FIX.token), false);
      assert.equal(argvHasToken(stub.logFile, FIX.token), false);
      const argv = JSON.parse(
        fs.readFileSync(stub.logFile, "utf8").split("\n")[0]
      );
      assert.ok(
        argv.some((a) =>
          String(a).includes(
            `${FIX.organizationUrl}/${FIX.project}/_apis/wit/workitemtypes`
          )
        )
      );
    });
  });

  test("reads credentials from the main worktree when run from a dhs worktree", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const wt = startWorktree(cwd, "90042");
      assert.equal(
        fs.existsSync(path.join(wt, "harness.credentials.local.json")),
        false
      );
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runAdo(wt, ["meta"], stub.env);
      assertOk(result, { project: FIX.project });
    });
  });

  test("uses organizationUrl and project from config, not hardcoded hosts", () => {
    withTempDir((cwd) => {
      const otherOrg = "https://dev.azure.com/zy3-other-org-fixture";
      const otherProject = "ZY3OtherWidget";
      writeProject(cwd, {
        trackerOver: {
          organizationUrl: otherOrg,
          project: otherProject,
        },
      });
      const routes = defaultRoutes();
      routes[`GET /zy3-other-org-fixture/${otherProject}/_apis/wit/workitemtypes`] =
        routes[`GET ${witPath("/_apis/wit/workitemtypes")}`];
      routes["GET /zy3-other-org-fixture/_apis/wit/fields"] =
        routes["GET /qx9-ado-fixture-org/_apis/wit/fields"];
      const stub = writeCurlStub(cwd, routes);
      const result = runAdo(cwd, ["meta"], stub.env);
      assertOk(result, { project: otherProject });
      const argv = JSON.parse(
        fs.readFileSync(stub.logFile, "utf8").split("\n")[0]
      );
      assert.ok(
        argv.some((a) =>
          String(a).includes(
            `${otherOrg}/${otherProject}/_apis/wit/workitemtypes`
          )
        )
      );
      assert.equal(
        argv.some((a) => String(a).includes(FIX.organizationUrl)),
        false
      );
    });
  });

});
