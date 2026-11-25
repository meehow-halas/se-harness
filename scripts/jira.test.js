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

const ACTIONS = ["create", "spec", "prompt", "log", "status"];

function flags(value, over = {}) {
  return { ...Object.fromEntries(ACTIONS.map((a) => [a, value])), ...over };
}

function tracker(over = {}) {
  return {
    write: flags(true),
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
const hit = routes[key + u.search] || routes[key] || routes[key.replace(/\\/$/, "")] || { code: 404, body: { errorMessages: ["no stub for " + key] } };
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

function createMetaRoutes(projectKey) {
  return {
    [`GET /rest/api/3/issue/createmeta/${projectKey}/issuetypes/10731`]: {
      code: 200,
      body: {
        startAt: 0,
        maxResults: 200,
        total: 3,
        fields: [
          { fieldId: "summary", key: "summary", name: "Summary" },
          { fieldId: FIX.specField, key: FIX.specField, name: FIX.specName },
          { fieldId: "customfield_48300", key: "customfield_48300", name: "QX7 Shared" },
        ],
      },
    },
    [`GET /rest/api/3/issue/createmeta/${projectKey}/issuetypes/10732`]: {
      code: 200,
      body: {
        startAt: 0,
        maxResults: 200,
        total: 2,
        fields: [
          { fieldId: "customfield_48300", key: "customfield_48300", name: "QX7 Shared" },
          { fieldId: "customfield_48301", key: "customfield_48301", name: "QX7 Defect Only" },
        ],
      },
    },
  };
}

function defaultRoutes(extra = {}) {
  return {
    [`GET /rest/api/3/project/${FIX.projectKey}/statuses`]: {
      code: 200,
      body: [
        {
          id: "10731",
          name: FIX.featureType,
          statuses: [
            { name: FIX.todoStatus },
            { name: "In Review Queue" },
            { name: "Shipped" },
          ],
        },
        {
          id: "10732",
          name: FIX.bugType,
          statuses: [{ name: FIX.todoStatus }, { name: "Shipped" }],
        },
      ],
    },
    ...createMetaRoutes(FIX.projectKey),
    // Site-wide field list: includes fields no screen in this project uses.
    "GET /rest/api/3/field": {
      code: 200,
      body: [
        { id: "summary", name: "Summary" },
        { id: FIX.specField, name: FIX.specName },
        { id: "customfield_99001", name: "Other Project Only" },
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

const TRACKER = {
  spec: "spec body qx7",
  prompt: "prompt body qx7",
  log: "log row qx7",
  status: "Queued For Build",
};

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

  test("meta lists only custom fields on the project's issue types, once each", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["meta"], stub.env);
      assertOk(result, { projectKey: FIX.projectKey });
      const fieldLines = result.stdout.split("\n").filter((l) => l.startsWith("field."));
      assert.deepEqual(fieldLines, [
        "field.1: description | Description",
        "field.2: comment | Comment",
        `field.3: ${FIX.specField} | ${FIX.specName}`,
        "field.4: customfield_48300 | QX7 Shared",
        "field.5: customfield_48301 | QX7 Defect Only",
      ]);
      const urls = fs.readFileSync(stub.logFile, "utf8");
      assert.equal(urls.includes("/rest/api/3/field"), false);
    });
  });

  test("meta follows createmeta pages until total is reached", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const base = `GET /rest/api/3/issue/createmeta/${FIX.projectKey}/issuetypes/10731`;
      const routes = defaultRoutes({
        [`${base}?startAt=0&maxResults=200`]: {
          code: 200,
          body: {
            startAt: 0,
            maxResults: 2,
            total: 3,
            fields: [
              { fieldId: "customfield_51001", name: "Page One A" },
              { fieldId: "customfield_51002", name: "Page One B" },
            ],
          },
        },
        [`${base}?startAt=2&maxResults=200`]: {
          code: 200,
          body: {
            startAt: 2,
            maxResults: 2,
            total: 3,
            fields: [{ fieldId: "customfield_51003", name: "Page Two" }],
          },
        },
      });
      const stub = writeCurlStub(cwd, routes);
      const result = runJira(cwd, ["meta"], stub.env);
      assertOk(result, { projectKey: FIX.projectKey });
      assert.match(result.stdout, /customfield_51001 \| Page One A/);
      assert.match(result.stdout, /customfield_51003 \| Page Two/);
      const hits = fs
        .readFileSync(stub.dataFile, "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l))
        .filter((h) => h.key === base);
      assert.deepEqual(
        hits.map((h) => h.search),
        ["?startAt=0&maxResults=200", "?startAt=2&maxResults=200"]
      );
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

  test("full write: get takes bodies from the issue even when repo files exist", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      writeFile(
        cwd,
        "docs/features/QX7-42.feature.md",
        "---\nid: QX7-42\ntitle: Q\nstatus: todo\ntype: feature\ndepends: []\nrelates: []\n---\n\nrepo spec body qx7 unique\n"
      );
      writeFile(cwd, "docs/prompt/QX7-42.prompt.md", "repo prompt body qx7 unique\n");
      writeFile(cwd, "docs/feature-log/QX7-42.log.md", "repo log body qx7 unique\n");
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runJira(cwd, ["get", "QX7-42"], stub.env);
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(result.stdout, /BEGIN spec\nspec body qx7\nEND spec/);
      assert.equal(result.stdout.includes("repo spec body qx7 unique"), false);
      assert.equal(result.stdout.includes("repo prompt body qx7 unique"), false);
      assert.equal(result.stdout.includes("repo log body qx7 unique"), false);
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

  test("reads credentials from the main worktree when run from a seh worktree", () => {
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
      Object.assign(routes, createMetaRoutes("ZY3"));
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
  describe("write actions", () => {
    const KEY = "QX7-42";
    const OTHER = "QX7-43";
    const BASE = "007-local-qx";
    const routes = () => defaultRoutes();

    // [action, verb argv builder]
    const VERBS = [
      ["create", () => ["create", "--type", "feature", "--title", "t"]],
      ["create", () => ["link", KEY, "depends", OTHER]],
      ["spec", (f) => ["set", KEY, "spec", "--file", f]],
      ["prompt", (f) => ["set", KEY, "prompt", "--file", f]],
      ["log", (f) => ["set", KEY, "log", "--file", f]],
      ["log", (f) => ["comment", KEY, "--file", f]],
      ["status", () => ["transition", KEY, "codeReview"]],
    ];

    function bodyFile(cwd) {
      writeFile(cwd, "w-body.md", "x\n");
      return path.join(cwd, "w-body.md");
    }

    function requested(stub) {
      return fs.existsSync(stub.logFile);
    }

    function writeLocal(cwd, base, { status = `local-status-${base}`, trackerKey = "" } = {}) {
      writeFile(
        cwd,
        `docs/features/${base}.feature.md`,
        `---\nid: ${base}\n# status: a comment line\nstatus: ${status}\ntracker: ${trackerKey}\n---\n\nfile spec ${base}\n`
      );
      writeFile(cwd, `docs/prompt/${base}.prompt.md`, `file prompt ${base}\n`);
      writeFile(cwd, `docs/feature-log/${base}.log.md`, `file log ${base}\n`);
    }

    function blocks(stdout) {
      const out = {};
      for (const k of ["spec", "prompt", "log"]) {
        const m = new RegExp(`BEGIN ${k}\\n([\\s\\S]*?)\\nEND ${k}`).exec(stdout);
        assert.ok(m, stdout);
        out[k] = m[1];
      }
      out.status = /^status: ?(.*)$/m.exec(stdout)[1];
      return out;
    }

    function get(cwd, args) {
      const stub = writeCurlStub(cwd, routes());
      const result = runJira(cwd, ["get", ...args], stub.env);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /^OK\n/);
      return { ...blocks(result.stdout), stdout: result.stdout, stub };
    }

    const fileParts = (base) => ({
      spec: `file spec ${base}`,
      prompt: `file prompt ${base}`,
      log: `file log ${base}`,
      status: `local-status-${base}`,
    });

    const parts = ({ spec, prompt, log, status }) => ({ spec, prompt, log, status });

    for (const [action, argv] of VERBS) {
      const verb = argv("f").filter((_, i) => i === 0 || (i === 2 && argv("f")[0] === "set")).join(" ");

      for (const token of [FIX.token, null]) {
        test(`${verb} with ${action} OFF is BLOCKED with zero requests (credentials ${token ? "present" : "absent"})`, () => {
          withTempDir((cwd) => {
            writeProject(cwd, { trackerOver: { write: flags(true, { [action]: false }) }, token });
            const stub = writeCurlStub(cwd, routes());
            const result = runJira(cwd, argv(bodyFile(cwd)), stub.env);
            assert.notEqual(result.status, 0);
            assertBlocked(
              result,
              new RegExp(`tracker action ${action} is disabled — write the repo file \\(agents\\.tracker\\.write\\.${action}\\)`)
            );
            assert.equal(requested(stub), false);
          });
        });
      }

      test(`${verb} with only ${action} ON reaches the tracker`, () => {
        withTempDir((cwd) => {
          writeProject(cwd, { trackerOver: { write: flags(false, { [action]: true }) } });
          const stub = writeCurlStub(cwd, routes());
          const result = runJira(cwd, argv(bodyFile(cwd)), stub.env);
          assert.equal(result.status, 0, result.stdout + result.stderr);
          assert.equal(requested(stub), true);
        });
      });

      test(`${verb} with everything OFF runs on --user-request`, () => {
        withTempDir((cwd) => {
          writeProject(cwd, { trackerOver: { write: flags(false) } });
          const stub = writeCurlStub(cwd, routes());
          const args = [...argv(bodyFile(cwd)), "--user-request", "please do it now"];
          const result = runJira(cwd, args, stub.env);
          assert.equal(result.status, 0, result.stdout + result.stderr);
          assert.equal(requested(stub), true);
          // The lift is for that call only.
          fs.rmSync(stub.logFile);
          assertBlocked(runJira(cwd, argv(bodyFile(cwd)), stub.env), /is disabled/);
          assert.equal(requested(stub), false);
        });
      });

      test(`${verb} with empty --user-request words is BLOCKED with zero requests`, () => {
        for (const value of [false, true]) {
          withTempDir((cwd) => {
            writeProject(cwd, { trackerOver: { write: flags(value) } });
            const stub = writeCurlStub(cwd, routes());
            for (const tail of [["--user-request", ""], ["--user-request", "  "], ["--user-request"]]) {
              const result = runJira(cwd, [...argv(bodyFile(cwd)), ...tail], stub.env);
              assertBlocked(result, /empty --user-request/);
            }
            assert.equal(requested(stub), false);
          });
        }
      });
    }

    test("an action missing from the write block is OFF", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: { spec: "true" } } });
        const stub = writeCurlStub(cwd, routes());
        assertBlocked(runJira(cwd, ["set", KEY, "spec", "--file", bodyFile(cwd)], stub.env), /action spec is disabled/);
        assert.equal(requested(stub), false);
      });
    });

    test("--user-request words as a title value stay a title", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: flags(false) } });
        const stub = writeCurlStub(cwd, routes());
        const result = runJira(cwd, ["create", "--type", "feature", "--title", "--user-request"], stub.env);
        assertBlocked(result, /action create is disabled/);
        assert.equal(requested(stub), false);
      });
    });

    for (const readOnly of [true, false]) {
      test(`readOnly ${readOnly} without write: get and write verbs BLOCKED run setup; meta works`, () => {
        withTempDir((cwd) => {
          writeProject(cwd, { trackerOver: { write: undefined, readOnly } });
          const stub = writeCurlStub(cwd, routes());
          const file = bodyFile(cwd);
          const calls = [
            ["get", KEY],
            ["get", KEY, "--user-request", "w"],
            ...VERBS.map(([, argv]) => argv(file)),
            ...VERBS.map(([, argv]) => [...argv(file), "--user-request", "w"]),
          ];
          for (const args of calls) {
            assertBlocked(runJira(cwd, args, stub.env), /tracker config predates 2\.0 — run \/.*setit-se/);
          }
          assert.equal(requested(stub), false);
          assert.equal(runJira(cwd, ["meta"], stub.env).status, 0);
          assert.equal(requested(stub), true);
        });
      });
    }

    test("write null: get and write verbs BLOCKED not set; meta works", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: null } });
        const stub = writeCurlStub(cwd, routes());
        const file = bodyFile(cwd);
        const calls = [
          ["get", KEY],
          ["get", KEY, "--user-request", "w"],
          ...VERBS.map(([, argv]) => argv(file)),
          ...VERBS.map(([, argv]) => [...argv(file), "--user-request", "w"]),
        ];
        for (const args of calls) {
          assertBlocked(runJira(cwd, args, stub.env), /tracker write actions are not set — run \/.*setit-se/);
        }
        assert.equal(requested(stub), false);
        assert.equal(runJira(cwd, ["meta"], stub.env).status, 0);
        assert.equal(requested(stub), true);
      });
    });

    test("readOnly is ignored when write is present", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { readOnly: true } });
        const stub = writeCurlStub(cwd, routes());
        const result = runJira(cwd, ["set", KEY, "spec", "--file", bodyFile(cwd)], stub.env);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.equal(requested(stub), true);
      });
    });

    for (const on of [["spec", "log"], ["prompt", "status"], ACTIONS, []]) {
      test(`get takes each part from its store (ON: ${on.join(",") || "none"})`, () => {
        withTempDir((cwd) => {
          const write = flags(false, Object.fromEntries(on.map((a) => [a, true])));
          writeProject(cwd, { trackerOver: { write } });
          writeLocal(cwd, KEY);
          const got = get(cwd, [KEY]);
          const file = fileParts(KEY);
          for (const part of ["spec", "prompt", "log", "status"]) {
            assert.equal(got[part], write[part] ? TRACKER[part] : file[part], part);
          }
        });
      });
    }

    test("get with everything OFF and no local files: empty bodies, tracker status and scalars", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: flags(false) } });
        const got = get(cwd, [KEY]);
        assert.deepEqual(parts(got), { spec: "", prompt: "", log: "", status: TRACKER.status });
        assert.match(got.stdout, /summary: Unique title from QX7/);
      });
    });

    test("status OFF: a key held in another spec's tracker: does not get the tracker status", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: flags(false) } });
        writeLocal(cwd, BASE, { trackerKey: `"${KEY}" # bound` });
        assert.equal(get(cwd, [KEY]).status, "");
      });
    });

    test("status OFF: specs holding other keys do not hold this one", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: flags(false) } });
        writeLocal(cwd, BASE, { trackerKey: OTHER });
        writeLocal(cwd, `${KEY}0`);
        assert.equal(get(cwd, [KEY]).status, TRACKER.status);
      });
    });

    test("status OFF: a key held as basename without a status line prints an empty status", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: flags(false) } });
        writeFile(cwd, `docs/features/${KEY}.feature.md`, "---\nid: x\n---\n\nbody\nstatus: not frontmatter\n");
        assert.equal(get(cwd, [KEY]).status, "");
      });
    });

    test("get <basename> of a bound task: tracker parts from the key, local parts from the basename", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: flags(false, { spec: true, log: true }) } });
        writeLocal(cwd, BASE, { trackerKey: KEY });
        writeLocal(cwd, KEY);
        const got = get(cwd, [BASE]);
        assert.deepEqual(parts(got), {
          spec: TRACKER.spec,
          prompt: `file prompt ${BASE}`,
          log: TRACKER.log,
          status: `local-status-${BASE}`,
        });
        assert.match(got.stdout, new RegExp(`^key: ${KEY}$`, "m"));
      });
    });

    test("get <basename> with status ON prints the tracker status", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: flags(false, { status: true }) } });
        writeLocal(cwd, BASE, { trackerKey: KEY });
        assert.equal(get(cwd, [BASE]).status, TRACKER.status);
      });
    });

    test("get --user-request reads every part from the tracker; without it, from the repo", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { write: flags(false) } });
        writeLocal(cwd, BASE, { trackerKey: KEY });
        assert.deepEqual(parts(get(cwd, [BASE])), fileParts(BASE));
        assert.deepEqual(parts(get(cwd, [BASE, "--user-request", "show the ticket"])), TRACKER);
        assert.deepEqual(parts(get(cwd, [KEY, "--user-request", "show the ticket"])), TRACKER);
      });
    });

    test("get with empty --user-request words is BLOCKED with zero requests", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, routes());
        assertBlocked(runJira(cwd, ["get", KEY, "--user-request", ""], stub.env), /empty --user-request/);
        assert.equal(requested(stub), false);
      });
    });
  });
});
