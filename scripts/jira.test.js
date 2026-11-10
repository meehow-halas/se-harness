"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  assertBlocked,
  assertOk,
  assertUnchanged,
  initGitRepo,
  pathHidingCommand,
  runScript,
  startWorktree,
  withTempDir,
  writeFile,
} = require("../test/helpers");

const FIX = {
  url: "https://jira.qx7.example.test",
  user: "ada.lovelace@qx7.example.test",
  projectKey: "QX7",
  token: "tok_qx7_never_print",
  featureType: "Change Request",
  bugType: "Defect",
  todoStatus: "Queued For Build",
  specField: "customfield_48291",
  specName: "Engineering Spec",
};

function tracker(over = {}) {
  return {
    url: FIX.url,
    user: FIX.user,
    projectKey: FIX.projectKey,
    issueTypes: { feature: FIX.featureType, bug: FIX.bugType },
    fields: { spec: FIX.specField, prompt: "description", log: "comment" },
    fetchFields: [FIX.specField],
    statuses: {
      todo: FIX.todoStatus,
      inProgress: null,
      codeReview: "In Review Queue",
      inReview: "Awaiting Merge",
      done: "Shipped",
      blocker: "Blocked",
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
      `${JSON.stringify({ jiraToken: token })}\n`
    );
  }
}

function writeCurlStub(cwd, routes) {
  const bin = path.join(cwd, ".jira-bin");
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
const hitRaw = routes[key] || routes[key.replace(/\\/$/, "")] || { code: 404, body: { errorMessages: ["no stub for " + key] } };
let hit = hitRaw;
if (Array.isArray(hitRaw)) {
  const seqFile = ${JSON.stringify(path.join(bin, "seq.json"))};
  const seq = fs.existsSync(seqFile) ? JSON.parse(fs.readFileSync(seqFile, "utf8")) : {};
  const idx = seq[key] || 0;
  hit = hitRaw[idx] || { code: 404, body: { errorMessages: ["no stub for " + key] } };
  seq[key] = idx + 1;
  fs.writeFileSync(seqFile, JSON.stringify(seq));
}
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

function defaultRoutes(extra = {}) {
  return {
    [`GET /rest/api/3/project/${FIX.projectKey}/statuses`]: {
      code: 200,
      body: [
        {
          name: FIX.featureType,
          statuses: [
            { name: FIX.todoStatus },
            { name: "In Review Queue" },
            { name: "Shipped" },
          ],
        },
        {
          name: FIX.bugType,
          statuses: [{ name: FIX.todoStatus }, { name: "Shipped" }],
        },
      ],
    },
    "GET /rest/api/3/field": {
      code: 200,
      body: [
        { id: "summary", name: "Summary" },
        { id: FIX.specField, name: FIX.specName },
      ],
    },
    "GET /rest/api/3/issue/QX7-42": {
      code: 200,
      body: {
        key: "QX7-42",
        fields: {
          summary: "Unique title from QX7",
          status: { name: FIX.todoStatus },
          issuetype: { name: FIX.featureType },
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "prompt body qx7" }],
              },
            ],
          },
          [FIX.specField]: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "spec body qx7" }],
              },
            ],
          },
        },
      },
    },
    "GET /rest/api/3/issue/QX7-42/comment": {
      code: 200,
      body: {
        comments: [
          {
            body: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "log row qx7" }],
                },
              ],
            },
          },
        ],
      },
    },
    "POST /rest/api/3/issue": {
      code: 201,
      body: { key: "QX7-99" },
    },
    "PUT /rest/api/3/issue/QX7-42": { code: 204, body: {} },
    "POST /rest/api/3/issue/QX7-42/comment": { code: 201, body: { id: "1" } },
    "POST /rest/api/3/issue/QX7-42/transitions": { code: 204, body: {} },
    "GET /rest/api/3/issue/QX7-42/transitions": {
      code: 200,
      body: {
        transitions: [
          { id: "71", to: { name: FIX.todoStatus } },
          { id: "88", to: { name: "In Review Queue" } },
        ],
      },
    },
    "POST /rest/api/3/issueLink": { code: 201, body: {} },
    "POST /rest/api/3/search/jql": {
      code: 200,
      body: {
        issues: [
          {
            key: "QX7-42",
            fields: {
              summary: "Unique title from QX7",
              status: { name: FIX.todoStatus },
              issuelinks: [
                {
                  type: { name: "Blocks", inward: "is blocked by", outward: "blocks" },
                  outwardIssue: { key: "QX7-7" },
                },
              ],
            },
          },
          {
            key: "QX7-55",
            fields: {
              summary: "QX7 already in review queue",
              status: { name: "In Review Queue" },
              issuelinks: [],
            },
          },
        ],
      },
    },
    ...extra,
  };
}

function runJira(cwd, args, env) {
  return runScript("jira", args, { cwd, env });
}

function argvHasToken(logFile, token) {
  if (!fs.existsSync(logFile)) {
    return false;
  }
  return fs.readFileSync(logFile, "utf8").includes(token);
}

function searchUrlsFromLog(logFile) {
  if (!fs.existsSync(logFile)) {
    return [];
  }
  return fs
    .readFileSync(logFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => JSON.parse(line))
    .filter((arg) => String(arg).includes("/rest/api/3/search"));
}

describe("jira", () => {
  test("BLOCKED when curl is missing", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const result = runJira(cwd, ["meta"], {
        PATH: pathHidingCommand(cwd, "curl"),
      });
      assertBlocked(result, /curl is not available/);
    });
  });

  test("BLOCKED when agents.tracker is absent", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["meta"], stub.env);
      assertBlocked(result, /Jira is not connected/);
    });
  });

  test("BLOCKED when jiraToken is missing", () => {
    withTempDir((cwd) => {
      writeProject(cwd, { token: null });
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["meta"], stub.env);
      assertBlocked(result, /Jira token is missing/);
    });
  });

  test("meta lists statuses, issue types, and custom fields from the configured project", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["meta"], stub.env);
      const parsed = assertOk(result, { projectKey: FIX.projectKey });
      assert.equal(parsed.fields["status.1"], FIX.todoStatus);
      assert.equal(parsed.fields["issueType.1"], FIX.featureType);
      assert.equal(parsed.fields["issueType.2"], FIX.bugType);
      assert.match(result.stdout, new RegExp(`${FIX.specField} \\| ${FIX.specName}`));
      assert.match(result.stdout, /field\.1: description \| Description/);
      assert.equal(result.stdout.includes(FIX.token), false);
      assert.equal(argvHasToken(stub.logFile, FIX.token), false);
      const argv = JSON.parse(fs.readFileSync(stub.logFile, "utf8").split("\n")[0]);
      assert.ok(argv.some((a) => String(a).includes(`${FIX.url}/rest/api/3/project/${FIX.projectKey}/statuses`)));
    });
  });

  test("get prints mapped spec, prompt, and log and requests fetchFields", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["get", "QX7-42"], stub.env);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(result.stdout, /^OK\n/);
      assert.match(result.stdout, /key: QX7-42/);
      assert.match(result.stdout, /status: Queued For Build/);
      assert.match(result.stdout, /BEGIN spec\nspec body qx7\nEND spec/);
      assert.match(result.stdout, /BEGIN prompt\nprompt body qx7\nEND prompt/);
      assert.match(result.stdout, /BEGIN log\nlog row qx7\nEND log/);
      assert.equal(result.stdout.includes(FIX.token), false);
      const data = fs
        .readFileSync(stub.dataFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const issueGet = data.find((row) => row.key === "GET /rest/api/3/issue/QX7-42");
      assert.ok(issueGet.search.includes(FIX.specField));
    });
  });

  test("create POSTs the mapped issue type for the configured project", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(
        cwd,
        ["create", "--type", "feature", "--title", "QX7 unique title"],
        stub.env
      );
      assertOk(result, { key: "QX7-99" });
      const rows = fs
        .readFileSync(stub.dataFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const post = rows.find((row) => row.key === "POST /rest/api/3/issue");
      const body = JSON.parse(post.data);
      assert.equal(body.fields.project.key, FIX.projectKey);
      assert.equal(body.fields.issuetype.name, FIX.featureType);
      assert.equal(body.fields.summary, "QX7 unique title");
    });
  });

  test("set PUTs spec onto the mapped custom field", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const specFile = path.join(cwd, "spec.md");
      fs.writeFileSync(specFile, "spec text qx7\n");
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(
        cwd,
        ["set", "QX7-42", "spec", "--file", specFile],
        stub.env
      );
      assertOk(result, { key: "QX7-42", field: "spec", location: FIX.specField });
      const rows = fs
        .readFileSync(stub.dataFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const put = rows.find((row) => row.key === "PUT /rest/api/3/issue/QX7-42");
      assert.match(put.data, /spec text qx7/);
      assert.match(put.data, new RegExp(FIX.specField));
    });
  });

  test("transition with a null map key is UNCHANGED and does not call Jira", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["transition", "QX7-42", "inProgress"], stub.env);
      assertUnchanged(result, { key: "QX7-42", step: "inProgress", status: "skipped" });
      assert.equal(fs.existsSync(stub.logFile), false);
    });
  });

  test("transition BLOCKs when the mapped status is missing from the workflow", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["transition", "QX7-42", "done"], stub.env);
      assertBlocked(result, /Shipped is not on this issue type's workflow/);
    });
  });

  test("transition POSTs the workflow id for the mapped status name", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["transition", "QX7-42", "codeReview"], stub.env);
      assertOk(result, { key: "QX7-42", status: "In Review Queue" });
      const rows = fs
        .readFileSync(stub.dataFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const post = rows.find(
        (row) => row.key === "POST /rest/api/3/issue/QX7-42/transitions"
      );
      assert.deepEqual(JSON.parse(post.data), { transition: { id: "88" } });
    });
  });

  test("link BLOCKs with the Jira error when the project refuses the link", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(
        cwd,
        defaultRoutes({
          "POST /rest/api/3/issueLink": {
            code: 400,
            body: { errorMessages: ["Linking is disabled on QX7"] },
          },
        })
      );
      const result = runJira(cwd, ["link", "QX7-42", "depends", "QX7-1"], stub.env);
      assertBlocked(result, /Linking is disabled on QX7/);
    });
  });

  test("reads credentials from the main worktree when run from a dhs worktree", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const wt = startWorktree(cwd, "QX7-42");
      assert.equal(
        fs.existsSync(path.join(wt, "harness.credentials.local.json")),
        false
      );
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(wt, ["meta"], stub.env);
      assertOk(result, { projectKey: FIX.projectKey });
    });
  });

  test("search prints key, status, and title using project and types from config", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["search"], stub.env);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(result.stdout, /^OK\n/);
      assert.match(result.stdout, /key: QX7-42/);
      assert.match(result.stdout, /status: Queued For Build/);
      assert.match(result.stdout, /title: Unique title from QX7/);
      assert.match(result.stdout, /depends: QX7-7/);
      assert.match(result.stdout, /key: QX7-55/);
      assert.match(result.stdout, /status: In Review Queue/);
      assert.equal(result.stdout.includes(FIX.token), false);
      const rows = fs
        .readFileSync(stub.dataFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const search = rows.find((row) => row.key === "POST /rest/api/3/search/jql");
      assert.ok(search, result.stdout);
      assert.equal(
        rows.some((row) => row.key === "POST /rest/api/3/search"),
        false
      );
      const body = JSON.parse(search.data);
      assert.match(body.jql, new RegExp(FIX.projectKey));
      assert.match(body.jql, new RegExp(FIX.featureType));
      assert.match(body.jql, new RegExp(FIX.bugType));
      assert.equal(/\bstatus\b/i.test(body.jql), false);
      assert.equal(body.jql.includes("PROJ"), false);
      assert.equal(body.jql.includes("Bug"), false);
      const urls = searchUrlsFromLog(stub.logFile);
      assert.ok(urls.length >= 1);
      assert.ok(
        urls.every((a) => String(a).includes(`${FIX.url}/rest/api/3/search/jql`))
      );
      assert.equal(
        urls.some((a) => /\/rest\/api\/3\/search$/.test(String(a))),
        false
      );
      assert.equal(argvHasToken(stub.logFile, FIX.token), false);
    });
  });

  test("search JQL and URL follow a non-default project key, types, and host", () => {
    withTempDir((cwd) => {
      writeProject(cwd, {
        trackerOver: {
          url: "https://jira.zy3.example.test",
          projectKey: "ZY3",
          issueTypes: { feature: "Work Packet", bug: "Incident Ticket" },
        },
      });
      const routes = defaultRoutes({
        "POST /rest/api/3/search/jql": {
          code: 200,
          body: {
            issues: [
              {
                key: "ZY3-18",
                fields: {
                  summary: "ZY3 packet title",
                  status: { name: FIX.todoStatus },
                  issuelinks: [],
                },
              },
            ],
          },
        },
      });
      const stub = writeCurlStub(cwd, routes);
      const result = runJira(cwd, ["search"], stub.env);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(result.stdout, /key: ZY3-18/);
      assert.match(result.stdout, /title: ZY3 packet title/);
      const rows = fs
        .readFileSync(stub.dataFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const search = rows.find((row) => row.key === "POST /rest/api/3/search/jql");
      const body = JSON.parse(search.data);
      assert.match(body.jql, /ZY3/);
      assert.match(body.jql, /Work Packet/);
      assert.match(body.jql, /Incident Ticket/);
      assert.equal(/\bstatus\b/i.test(body.jql), false);
      assert.equal(body.jql.includes(FIX.projectKey), false);
      assert.equal(body.jql.includes(FIX.featureType), false);
      const urls = searchUrlsFromLog(stub.logFile);
      assert.ok(
        urls.every((a) =>
          String(a).includes("https://jira.zy3.example.test/rest/api/3/search/jql")
        )
      );
      assert.equal(
        urls.some((a) => /\/rest\/api\/3\/search$/.test(String(a))),
        false
      );
      assert.equal(
        urls.some((a) => String(a).includes(FIX.url)),
        false
      );
    });
  });

  test("search follows nextPageToken and lists todo plus later-page statuses", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const token = "page-two-zx9-token";
      const routes = defaultRoutes({
        "POST /rest/api/3/search/jql": [
          {
            code: 200,
            body: {
              nextPageToken: token,
              issues: [
                {
                  key: "QX7-42",
                  fields: {
                    summary: "Unique title from QX7",
                    status: { name: FIX.todoStatus },
                    issuelinks: [],
                  },
                },
              ],
            },
          },
          {
            code: 200,
            body: {
              issues: [
                {
                  key: "QX7-61",
                  fields: {
                    summary: "QX7 unique moving title",
                    status: { name: "In Review Queue" },
                    issuelinks: [],
                  },
                },
              ],
            },
          },
        ],
      });
      const stub = writeCurlStub(cwd, routes);
      const result = runJira(cwd, ["search"], stub.env);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(result.stdout, /key: QX7-42/);
      assert.match(result.stdout, /status: Queued For Build/);
      assert.match(result.stdout, /key: QX7-61/);
      assert.match(result.stdout, /status: In Review Queue/);
      const rows = fs
        .readFileSync(stub.dataFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const searches = rows.filter((row) => row.key === "POST /rest/api/3/search/jql");
      assert.equal(searches.length, 2, result.stdout);
      const first = JSON.parse(searches[0].data);
      const second = JSON.parse(searches[1].data);
      assert.equal(first.nextPageToken, undefined);
      assert.equal(second.nextPageToken, token);
      assert.equal(/\bstatus\b/i.test(first.jql), false);
      const urls = searchUrlsFromLog(stub.logFile);
      assert.equal(urls.length, 2);
      assert.ok(
        urls.every((a) => String(a).includes(`${FIX.url}/rest/api/3/search/jql`))
      );
    });
  });

  test("uses url and projectKey from config, not a hardcoded Jira host", () => {
    withTempDir((cwd) => {
      writeProject(cwd, {
        trackerOver: {
          url: "https://other.zy3.example.test",
          projectKey: "ZY3",
        },
      });
      const routes = defaultRoutes();
      routes["GET /rest/api/3/project/ZY3/statuses"] =
        routes[`GET /rest/api/3/project/${FIX.projectKey}/statuses`];
      const stub = writeCurlStub(cwd, routes);
      const result = runJira(cwd, ["meta"], stub.env);
      assertOk(result, { projectKey: "ZY3" });
      const argv = JSON.parse(fs.readFileSync(stub.logFile, "utf8").split("\n")[0]);
      assert.ok(
        argv.some((a) =>
          String(a).includes("https://other.zy3.example.test/rest/api/3/project/ZY3/statuses")
        )
      );
      assert.equal(
        argv.some((a) => String(a).includes(FIX.url)),
        false
      );
    });
  });
});
