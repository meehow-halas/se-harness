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

function writeProject(cwd, { trackerOver, token = FIX.token, git = true } = {}) {
  if (git) {
    initGitRepo(cwd);
  }
  const cfg = {
    agents: {
      baseBranch: git ? "dev" : "",
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
            fields: [
              { referenceName: "System.Title", name: "Title" },
              { referenceName: FIX.specField, name: FIX.specName },
              { referenceName: "Custom.QX9Shared", name: "QX9 Shared" },
            ],
          },
          {
            name: FIX.bugType,
            states: [{ name: FIX.todoStatus }, { name: "QX9 Shipped" }],
            fields: [
              { referenceName: "Custom.QX9Shared", name: "QX9 Shared" },
              { referenceName: "Custom.QX9BugOnly", name: "QX9 Bug Only" },
            ],
          },
        ],
      },
    },
    // Organization-wide field list: includes fields no type in this project uses.
    "GET /qx9-ado-fixture-org/_apis/wit/fields": {
      code: 200,
      body: {
        value: [
          { referenceName: "System.Title", name: "Title" },
          { referenceName: FIX.specField, name: FIX.specName },
          { referenceName: "Custom.OtherProjectOnly", name: "Other Project Only" },
        ],
      },
    },
    ...extra,
  };
}

function runAdo(cwd, args, env) {
  const r = runScript("ado", args, { cwd, env });
  assert.equal((r.stdout + r.stderr).includes(FIX.token), false, "token leaked");
  if (env && env.PATH && env.PATH.includes(".ado-bin")) {
    assert.equal(argvHasToken(path.join(cwd, ".ado-bin", "curl-argv.log"), FIX.token), false, "token in argv");
  }
  return r;
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

  test("meta lists only custom fields of the project's work item types, once each", () => {
    withTempDir((cwd) => {
      writeProject(cwd);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runAdo(cwd, ["meta"], stub.env);
      assertOk(result, { project: FIX.project });
      const fieldLines = result.stdout.split("\n").filter((l) => l.startsWith("field."));
      assert.deepEqual(fieldLines, [
        "field.1: description | Description",
        "field.2: comment | Comment",
        "field.3: history | History",
        `field.4: ${FIX.specField} | ${FIX.specName}`,
        "field.5: Custom.QX9Shared | QX9 Shared",
        "field.6: Custom.QX9BugOnly | QX9 Bug Only",
      ]);
      const urls = fs.readFileSync(stub.logFile, "utf8");
      assert.equal(urls.includes("/_apis/wit/fields"), false);
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

  test("reads credentials from the main worktree when run from a seh worktree", () => {
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

  test("runs without a git repo (git disabled) and reads credentials from the project root", () => {
    withTempDir((cwd) => {
      writeProject(cwd, { git: false });
      assert.equal(fs.existsSync(path.join(cwd, ".git")), false);
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runAdo(cwd, ["meta"], stub.env);
      assertOk(result, { project: FIX.project });
      assert.equal(fs.existsSync(path.join(cwd, ".git")), false);
    });
  });

  test("without a git repo, a missing adoPat is still BLOCKED", () => {
    withTempDir((cwd) => {
      writeProject(cwd, { git: false, token: null });
      const stub = writeCurlStub(cwd, defaultRoutes());
      const result = runAdo(cwd, ["meta"], stub.env);
      assertBlocked(result, /Azure DevOps token is missing/);
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


  describe("content verbs", () => {
    const ID = "48213";
    const itemPath = (id = ID) => witPath(`/_apis/wit/workitems/${id}`);

    function dataLines(stub) {
      if (!fs.existsSync(stub.dataFile)) {
        return [];
      }
      return fs
        .readFileSync(stub.dataFile, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    }

    function argvLines(stub) {
      return fs
        .readFileSync(stub.logFile, "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));
    }

    const workItem = {
      id: Number(ID),
      fields: {
        "System.Title": "QX9 widget title",
        "System.State": "QX9 Backlog New",
        "System.WorkItemType": FIX.featureType,
        "System.Description": "<p>QX9 prompt body</p>",
        [FIX.specField]: "<p>QX9 spec body</p>",
        "Custom.QX9Extra": "extra-value-7",
      },
    };

    test("get prints scalars and spec/prompt/log blocks from the configured fields", () => {
      withTempDir((cwd) => {
        writeProject(cwd, {
          trackerOver: { fetchFields: [FIX.specField, "Custom.QX9Extra"] },
        });
        const stub = writeCurlStub(
          cwd,
          defaultRoutes({
            [`GET ${itemPath()}`]: { code: 200, body: workItem },
            [`GET ${itemPath()}/comments`]: {
              code: 200,
              body: { comments: [{ text: "<p>QX9 first note</p>" }, { text: "second note" }] },
            },
          })
        );
        const result = runAdo(cwd, ["get", ID], stub.env);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /^OK\n/);
        assert.match(result.stdout, /id: 48213\n/);
        assert.match(result.stdout, /title: QX9 widget title\n/);
        assert.match(result.stdout, /status: QX9 Backlog New\n/);
        assert.match(result.stdout, /type: Product Backlog Item\n/);
        assert.match(result.stdout, /Custom\.QX9Extra: extra-value-7\n/);
        assert.match(result.stdout, /BEGIN spec\nQX9 spec body\nEND spec/);
        assert.match(result.stdout, /BEGIN prompt\nQX9 prompt body\nEND prompt/);
        assert.match(
          result.stdout,
          /BEGIN log\nQX9 first note\n\nsecond note\nEND log/
        );
        assert.equal(result.stdout.includes(FIX.token), false);
        const first = argvLines(stub)[0].find((a) => String(a).includes("/workitems/"));
        assert.ok(first.includes("fields="));
        assert.ok(first.includes(FIX.specField));
        assert.ok(first.includes("Custom.QX9Extra"));
        assert.ok(first.includes("api-version=7.1"));
      });
    });

    test("get decodes HTML bodies: paragraphs, br, lists, entities, nbsp, nested tags", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: {
            code: 200,
            body: {
              id: Number(ID),
              fields: {
                "System.Title": "t",
                "System.State": "s",
                "System.WorkItemType": "w",
                "System.Description": "<div>one&nbsp;two<br />three</div><div>&lt;b&gt; &amp; &#65;&#x42;</div>",
                [FIX.specField]: "<p>para <b>bold</b> a</p><p>para2</p><ul><li>x1</li><li>x2</li></ul>",
              },
            },
          },
          [`GET ${itemPath()}/comments`]: { code: 200, body: { comments: [] } },
        });
        const result = runAdo(cwd, ["get", ID], stub.env);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /BEGIN spec\npara bold a\n\npara2\n\nx1\nx2\nEND spec/);
        assert.match(result.stdout, /BEGIN prompt\none two\nthree\n\n<b> & AB\nEND prompt/);
      });
    });

    test("set then get round-trips text with line breaks, blank lines and markup chars", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const text = "line <1> & more\nline 2\n\npara &amp; two\n- item";
        const put = writeCurlStub(cwd, { [`PATCH ${itemPath()}`]: { code: 200, body: {} } });
        writeFile(cwd, "body.md", text + "\n");
        runAdo(cwd, ["set", ID, "spec", "--file", path.join(cwd, "body.md")], put.env);
        const html = JSON.parse(dataLines(put)[0].data)[0].value;
        fs.rmSync(path.join(cwd, ".ado-bin"), { recursive: true, force: true });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: {
            code: 200,
            body: { id: Number(ID), fields: { [FIX.specField]: html } },
          },
          [`GET ${itemPath()}/comments`]: { code: 200, body: { comments: [] } },
        });
        const result = runAdo(cwd, ["get", ID], stub.env);
        assert.ok(result.stdout.includes(`BEGIN spec\n${text}\nEND spec`), result.stdout);
      });
    });

    test("get maps fields by configured names (swapped spec/prompt, log on a field)", () => {
      withTempDir((cwd) => {
        writeProject(cwd, {
          trackerOver: {
            fields: { spec: "description", prompt: "Custom.ZY3Prompt", log: "Custom.ZY3Log" },
            fetchFields: [],
          },
        });
        const stub = writeCurlStub(
          cwd,
          defaultRoutes({
            [`GET ${itemPath("77")}`]: {
              code: 200,
              body: {
                id: 77,
                fields: {
                  "System.Title": "t",
                  "System.Description": "desc-as-spec",
                  "Custom.ZY3Prompt": "prompt-from-custom",
                  "Custom.ZY3Log": "log-from-custom",
                },
              },
            },
            [`GET ${itemPath("77")}/comments`]: { code: 200, body: { comments: [{ text: "ignored" }] } },
          })
        );
        const result = runAdo(cwd, ["get", "77"], stub.env);
        assert.match(result.stdout, /BEGIN spec\ndesc-as-spec\nEND spec/);
        assert.match(result.stdout, /BEGIN prompt\nprompt-from-custom\nEND prompt/);
        assert.match(result.stdout, /BEGIN log\nlog-from-custom\nEND log/);
        assert.equal(result.stdout.includes("ignored"), false);
      });
    });

    test("full write: get takes bodies from the work item even when repo files exist", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        writeFile(cwd, "docs/features/48213.feature.md", "---\nx: 1\n---\nrepo spec\n");
        writeFile(cwd, "docs/prompt/48213.prompt.md", "repo prompt\n");
        writeFile(cwd, "docs/feature-log/48213.log.md", "repo log\n");
        const stub = writeCurlStub(
          cwd,
          defaultRoutes({
            [`GET ${itemPath()}`]: { code: 200, body: workItem },
            [`GET ${itemPath()}/comments`]: { code: 200, body: { comments: [] } },
          })
        );
        const result = runAdo(cwd, ["get", ID], stub.env);
        assert.equal(result.status, 0, result.stderr + result.stdout);
        assert.match(result.stdout, /QX9 spec body/);
        assert.equal(result.stdout.includes("repo spec"), false);
        assert.equal(result.stdout.includes("repo prompt"), false);
        assert.equal(result.stdout.includes("repo log"), false);
      });
    });

    test("get rejects a non-numeric id", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const result = runAdo(cwd, ["get", "QX-1"], writeCurlStub(cwd, defaultRoutes()).env);
        assertBlocked(result, /invalid task id/);
      });
    });

    test("create posts the configured type name and project, prints id", () => {
      withTempDir((cwd) => {
        const project = "Zy3 Spaced Project";
        const type = "Zy3 Work Thing";
        writeProject(cwd, {
          trackerOver: {
            project,
            workItemTypes: { feature: "Other Feature", bug: type },
          },
        });
        const route = `POST /qx9-ado-fixture-org/${encodeURIComponent(project)}/_apis/wit/workitems/%24${encodeURIComponent(type)}`;
        const stub = writeCurlStub(cwd, { [route]: { code: 200, body: { id: 5521 } } });
        const result = runAdo(cwd, ["create", "--type", "bug", "--title", "QX9 a \"quoted\" title"], stub.env);
        const parsed = assertOk(result, { id: "5521" });
        assert.equal(parsed.fields.id, "5521");
        const sent = dataLines(stub)[0];
        assert.deepEqual(JSON.parse(sent.data), [
          { op: "add", path: "/fields/System.Title", value: "QX9 a \"quoted\" title" },
        ]);
        const argv = argvLines(stub)[0];
        assert.ok(argv.includes("Content-Type: application/json-patch+json"));
        assert.equal(argvHasToken(stub.logFile, FIX.token), false);
      });
    });

    test("create BLOCKED for unmapped type or bad args", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { workItemTypes: { feature: FIX.featureType } } });
        const stub = writeCurlStub(cwd, defaultRoutes());
        assertBlocked(runAdo(cwd, ["create", "--type", "bug", "--title", "x"], stub.env), /not mapped/);
        assertBlocked(runAdo(cwd, ["create", "--type", "epic", "--title", "x"], stub.env), /invalid work item type/);
        assertBlocked(runAdo(cwd, ["create", "--type", "feature"], stub.env), /missing --title/);
      });
    });

    test("set spec patches the mapped custom field with escaped HTML", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, { [`PATCH ${itemPath()}`]: { code: 200, body: {} } });
        writeFile(cwd, "body.md", "a < b & c\nline two\n\nnext para\n");
        const result = runAdo(cwd, ["set", ID, "spec", "--file", path.join(cwd, "body.md")], stub.env);
        assertOk(result, { id: ID, field: "spec", location: FIX.specField });
        const sent = dataLines(stub)[0];
        assert.deepEqual(JSON.parse(sent.data), [
          {
            op: "add",
            path: `/fields/${FIX.specField}`,
            value: "<p>a &lt; b &amp; c<br>line two</p><p>next para</p>",
          },
        ]);
        assert.ok(argvLines(stub)[0].includes("Content-Type: application/json-patch+json"));
      });
    });

    test("set prompt on description reads stdin and uses System.Description", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, { [`PATCH ${itemPath()}`]: { code: 200, body: {} } });
        const { spawnSync } = require("child_process");
        const r = spawnSync("sh", [path.join(__dirname, "ado"), "set", ID, "prompt"], {
          cwd,
          input: "from stdin\n",
          env: { ...process.env, ...stub.env, GIT_CONFIG_GLOBAL: "/dev/null" },
          encoding: "utf8",
        });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.deepEqual(JSON.parse(dataLines(stub)[0].data), [
          { op: "add", path: "/fields/System.Description", value: "<p>from stdin</p>" },
        ]);
      });
    });

    test("set log on a field appends to the existing value", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { fields: { spec: FIX.specField, prompt: "description", log: "Custom.ZY3Log" } } });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: {
            code: 200,
            body: { id: 1, fields: { "Custom.ZY3Log": "<p>old entry</p>" } },
          },
          [`PATCH ${itemPath()}`]: { code: 200, body: {} },
        });
        writeFile(cwd, "log.md", "new entry\n");
        const result = runAdo(cwd, ["set", ID, "log", "--file", path.join(cwd, "log.md")], stub.env);
        assertOk(result, { field: "log", location: "Custom.ZY3Log" });
        const patch = dataLines(stub).find((d) => d.key.startsWith("PATCH"));
        assert.equal(JSON.parse(patch.data)[0].value, "<p>old entry</p><p>new entry</p>");
      });
    });

    test("set log appends after plain-text or mid-line old value with a blank-line gap", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { fields: { spec: FIX.specField, prompt: "description", log: "Custom.ZY3Log" } } });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: { code: 200, body: { id: 1, fields: { "Custom.ZY3Log": "legacy plain note" } } },
          [`PATCH ${itemPath()}`]: { code: 200, body: {} },
        });
        writeFile(cwd, "log.md", "new <e>\n");
        runAdo(cwd, ["set", ID, "log", "--file", path.join(cwd, "log.md")], stub.env);
        const patch = dataLines(stub).find((d) => d.key.startsWith("PATCH"));
        const html = JSON.parse(patch.data)[0].value;
        assert.equal(html, "legacy plain note<br><br><p>new &lt;e&gt;</p>");
      });
    });

    test("log appended twice then read back keeps entries separated by a blank line", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { fields: { spec: FIX.specField, prompt: "description", log: "Custom.ZY3Log" } } });
        const put = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: { code: 200, body: { id: 1, fields: { "Custom.ZY3Log": "<p>first A</p>" } } },
          [`PATCH ${itemPath()}`]: { code: 200, body: {} },
        });
        writeFile(cwd, "log.md", "second B\nline\n");
        runAdo(cwd, ["set", ID, "log", "--file", path.join(cwd, "log.md")], put.env);
        const html = JSON.parse(dataLines(put).find((d) => d.key.startsWith("PATCH")).data)[0].value;
        fs.rmSync(path.join(cwd, ".ado-bin"), { recursive: true, force: true });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: { code: 200, body: { id: 1, fields: { "Custom.ZY3Log": html } } },
        });
        const got = runAdo(cwd, ["get", ID], stub.env);
        assert.match(got.stdout, /BEGIN log\nfirst A\n\nsecond B\nline\nEND log/);
      });
    });

    test("get drops script/style and does not double-decode entities", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: {
            code: 200,
            body: { id: 1, fields: { [FIX.specField]: "<style>p{x:y}</style><p>a &amp;lt; b</p><script>evil()</script>" } },
          },
          [`GET ${itemPath()}/comments`]: { code: 200, body: { comments: [] } },
        });
        const got = runAdo(cwd, ["get", ID], stub.env);
        assert.match(got.stdout, /BEGIN spec\na &lt; b\nEND spec/);
      });
    });

    test("set with CRLF input stores <br>, not carriage returns", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, { [`PATCH ${itemPath()}`]: { code: 200, body: {} } });
        writeFile(cwd, "b.md", "a\r\nb\r\n\r\nc\r\n");
        runAdo(cwd, ["set", ID, "spec", "--file", path.join(cwd, "b.md")], stub.env);
        assert.equal(JSON.parse(dataLines(stub)[0].data)[0].value, "<p>a<br>b</p><p>c</p>");
      });
    });

    test("set log mapped to description appends to the existing description", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { fields: { spec: FIX.specField, prompt: "Custom.ZY3Prompt", log: "description" } } });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: { code: 200, body: { id: 1, fields: { "System.Description": "<p>old desc</p>" } } },
          [`PATCH ${itemPath()}`]: { code: 200, body: {} },
        });
        writeFile(cwd, "log.md", "added\n");
        const result = runAdo(cwd, ["set", ID, "log", "--file", path.join(cwd, "log.md")], stub.env);
        assertOk(result, { field: "log", location: "description" });
        const patch = dataLines(stub).find((d) => d.key.startsWith("PATCH"));
        assert.deepEqual(JSON.parse(patch.data), [
          { op: "add", path: "/fields/System.Description", value: "<p>old desc</p><p>added</p>" },
        ]);
      });
    });

    test("set log mapped to comment posts a comment, no PATCH", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, {
          [`POST ${itemPath()}/comments`]: { code: 200, body: { id: 1 } },
        });
        writeFile(cwd, "log.md", "log line\n");
        const result = runAdo(cwd, ["set", ID, "log", "--file", path.join(cwd, "log.md")], stub.env);
        assertOk(result, { field: "log", location: "comment" });
        const sent = dataLines(stub);
        assert.equal(sent.length, 1);
        assert.deepEqual(JSON.parse(sent[0].data), { text: "<p>log line</p>" });
        assert.ok(argvLines(stub)[0].some((a) => String(a).includes("api-version=7.1-preview.4")));
      });
    });

    test("set BLOCKED when field unmapped", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { fields: { spec: "", prompt: "description", log: "comment" } } });
        const stub = writeCurlStub(cwd, defaultRoutes());
        writeFile(cwd, "b.md", "x\n");
        const f = path.join(cwd, "b.md");
        assertBlocked(runAdo(cwd, ["set", ID, "spec", "--file", f], stub.env), /spec is not mapped/);
        assert.equal(fs.existsSync(stub.dataFile), false);
      });
    });

    test("set BLOCKED for missing file and bad field", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, defaultRoutes());
        assertBlocked(runAdo(cwd, ["set", ID, "spec", "--file", path.join(cwd, "nope.md")], stub.env), /does not exist/);
        assertBlocked(runAdo(cwd, ["set", ID, "title"], stub.env), /invalid field/);
      });
    });

    test("comment posts HTML text to the comments API of the configured project", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, {
          [`POST ${itemPath("9001")}/comments`]: { code: 200, body: { id: 3 } },
        });
        writeFile(cwd, "c.md", "hello <world>\n");
        const result = runAdo(cwd, ["comment", "9001", "--file", path.join(cwd, "c.md")], stub.env);
        assertOk(result, { id: "9001" });
        assert.deepEqual(JSON.parse(dataLines(stub)[0].data), { text: "<p>hello &lt;world&gt;</p>" });
        assert.equal(argvHasToken(stub.logFile, FIX.token), false);
      });
    });

    test("every CRUD verb targets the configured organization and project", () => {
      withTempDir((cwd) => {
        const org = "https://dev.azure.com/zy3-alt-org";
        const project = "Zy3 Alt Project";
        writeProject(cwd, {
          trackerOver: { organizationUrl: org, project, workItemTypes: { feature: "Zy3 Feat", bug: "Zy3 Bug" } },
        });
        const base = `/zy3-alt-org/${encodeURIComponent(project)}/_apis/wit/workitems`;
        const stub = writeCurlStub(cwd, {
          [`GET ${base}/12`]: { code: 200, body: { id: 12, fields: {} } },
          [`GET ${base}/12/comments`]: { code: 200, body: { comments: [] } },
          [`POST ${base}/%24Zy3%20Feat`]: { code: 200, body: { id: 13 } },
          [`PATCH ${base}/12`]: { code: 200, body: {} },
          [`POST ${base}/12/comments`]: { code: 200, body: {} },
        });
        writeFile(cwd, "b.md", "x\n");
        const f = path.join(cwd, "b.md");
        assert.equal(runAdo(cwd, ["get", "12"], stub.env).status, 0);
        assert.equal(runAdo(cwd, ["create", "--type", "feature", "--title", "t"], stub.env).status, 0);
        assert.equal(runAdo(cwd, ["set", "12", "spec", "--file", f], stub.env).status, 0);
        assert.equal(runAdo(cwd, ["comment", "12", "--file", f], stub.env).status, 0);
        for (const argv of argvLines(stub)) {
          const url = argv[argv.indexOf("--url") + 1];
          assert.ok(url.startsWith(`${org}/${encodeURIComponent(project)}/`), url);
        }
        assert.equal(argvHasToken(stub.logFile, FIX.token), false);
      });
    });

    test("history map: get reads System.History, set patches it without appending", () => {
      withTempDir((cwd) => {
        writeProject(cwd, {
          trackerOver: { fields: { spec: "history", prompt: "description", log: "history" }, fetchFields: [] },
        });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: {
            code: 200,
            body: { id: 48213, fields: { "System.History": "hist-text", "System.Description": "d" } },
          },
          [`PATCH ${itemPath()}`]: { code: 200, body: {} },
        });
        const got = runAdo(cwd, ["get", ID], stub.env);
        assert.match(got.stdout, /BEGIN spec\nhist-text\nEND spec/);
        assert.match(got.stdout, /BEGIN log\nhist-text\nEND log/);
        assert.ok(argvLines(stub)[0].some((a) => String(a).includes("System.History")));
        assert.equal(argvLines(stub).length, 1, "no comments fetch when nothing maps to comment");
        writeFile(cwd, "l.md", "entry <1> & two\nline\n");
        const set = runAdo(cwd, ["set", ID, "log", "--file", path.join(cwd, "l.md")], stub.env);
        assertOk(set, { location: "history" });
        const patches = dataLines(stub).filter((d) => d.key.startsWith("PATCH"));
        assert.deepEqual(JSON.parse(patches[0].data), [
          { op: "add", path: "/fields/System.History", value: "entry <1> & two\nline" },
        ]);
        assert.equal(dataLines(stub).filter((d) => d.key.startsWith("GET")).length, 1);
        assert.equal(got.stdout.includes(FIX.token) || set.stdout.includes(FIX.token), false);
      });
    });

    test("get fetches comments only when a mapping needs them", () => {
      withTempDir((cwd) => {
        writeProject(cwd, {
          trackerOver: { fields: { spec: FIX.specField, prompt: "description", log: "Custom.ZY3Log" } },
        });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: { code: 200, body: { id: 48213, fields: {} } },
        });
        const r = runAdo(cwd, ["get", ID], stub.env);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(argvLines(stub).length, 1);
        assert.equal(r.stdout.includes(FIX.token), false);
      });
    });

    test("transition with a null map is UNCHANGED and makes no HTTP call", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, {});
        const r = runAdo(cwd, ["transition", ID, "inProgress"], stub.env);
        assertUnchanged(r, { id: ID, step: "inProgress", status: "skipped" });
        assert.equal(fs.existsSync(stub.logFile), false);
      });
    });

    test("transition already at the mapped state is UNCHANGED with no PATCH", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { statuses: { done: "ZY3 Closed Out" } } });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: { code: 200, body: { id: 48213, fields: { "System.State": "ZY3 Closed Out" } } },
        });
        const r = runAdo(cwd, ["transition", ID, "done"], stub.env);
        assertUnchanged(r, { id: ID, status: "ZY3 Closed Out" });
        assert.equal(dataLines(stub).filter((d) => d.key.startsWith("PATCH")).length, 0);
      });
    });

    test("transition PATCHes System.State with the mapped string and reads fields=System.State", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { statuses: { codeReview: "ZY3 Peer Check" } } });
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: { code: 200, body: { id: 48213, fields: { "System.State": "Other" } } },
          [`PATCH ${itemPath()}`]: { code: 200, body: {} },
        });
        const r = runAdo(cwd, ["transition", ID, "codeReview"], stub.env);
        assertOk(r, { id: ID, status: "ZY3 Peer Check" });
        const rows = dataLines(stub);
        assert.ok(rows[0].search.includes("fields=System.State"));
        const patch = rows.find((d) => d.key.startsWith("PATCH"));
        assert.deepEqual(JSON.parse(patch.data), [
          { op: "add", path: "/fields/System.State", value: "ZY3 Peer Check" },
        ]);
      });
    });

    test("transition to a state the API rejects is BLOCKED with the API message", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, {
          [`GET ${itemPath()}`]: { code: 200, body: { id: 48213, fields: { "System.State": "New" } } },
          [`PATCH ${itemPath()}`]: { code: 400, body: { message: "QX9 state Shipped is invalid" } },
        });
        assertBlocked(runAdo(cwd, ["transition", ID, "done"], stub.env), /400: QX9 state Shipped is invalid/);
      });
    });

    test("transition rejects bad ids and unknown step keys", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        assertBlocked(runAdo(cwd, ["transition", "x1", "done"]), /invalid task id/);
        assertBlocked(runAdo(cwd, ["transition", ID, "nope"]), /invalid status key nope/);
      });
    });

    test("transition with an empty-string status mapping is BLOCKED, not skipped", () => {
      withTempDir((cwd) => {
        writeProject(cwd, { trackerOver: { statuses: { done: "  " } } });
        const stub = writeCurlStub(cwd, {});
        assertBlocked(runAdo(cwd, ["transition", ID, "done"], stub.env), /invalid status key done/);
        assert.equal(fs.existsSync(stub.logFile), false);
      });
    });

    test("link depends PATCHes Dependency-Reverse to the other item URL under organizationUrl", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, { [`PATCH ${itemPath()}`]: { code: 200, body: {} } });
        const r = runAdo(cwd, ["link", ID, "depends", "777"], stub.env);
        assertOk(r, { id: ID, link: "depends", other: "777" });
        const patch = dataLines(stub).find((d) => d.key.startsWith("PATCH"));
        assert.deepEqual(JSON.parse(patch.data), [
          {
            op: "add",
            path: "/relations/-",
            value: {
              rel: "System.LinkTypes.Dependency-Reverse",
              url: `${FIX.organizationUrl}/_apis/wit/workItems/777`,
            },
          },
        ]);
      });
    });

    test("link relates uses System.LinkTypes.Related", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, { [`PATCH ${itemPath()}`]: { code: 200, body: {} } });
        assertOk(runAdo(cwd, ["link", ID, "relates", "9"], stub.env), { link: "relates" });
        const patch = dataLines(stub).find((d) => d.key.startsWith("PATCH"));
        assert.equal(JSON.parse(patch.data)[0].value.rel, "System.LinkTypes.Related");
      });
    });

    test("link failure is BLOCKED with the API fact; bad ids and types rejected", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, {
          [`PATCH ${itemPath()}`]: { code: 400, body: { message: "QX9 cycle detected" } },
        });
        assertBlocked(runAdo(cwd, ["link", ID, "depends", "5"], stub.env), /400: QX9 cycle detected/);
        assertBlocked(runAdo(cwd, ["link", ID, "depends", "abc"]), /invalid task id abc/);
        assertBlocked(runAdo(cwd, ["link", ID, "blocks", "5"]), /invalid link type blocks/);
      });
    });

    test("HTTP error from ADO surfaces as BLOCKED", () => {
      withTempDir((cwd) => {
        writeProject(cwd);
        const stub = writeCurlStub(cwd, {
          [`POST ${itemPath()}/comments`]: { code: 404, body: { message: "QX9 no such item" } },
        });
        writeFile(cwd, "c.md", "x\n");
        assertBlocked(
          runAdo(cwd, ["comment", ID, "--file", path.join(cwd, "c.md")], stub.env),
          /404: QX9 no such item/
        );
      });
    });

    describe("readOnly", () => {
      const verbsFor = (cwd) => {
        const body = path.join(cwd, "ro-body.md");
        return [
          ["create", "--type", "feature", "--title", "t"],
          ["set", ID, "spec", "--file", body],
          ["set", ID, "prompt", "--file", body],
          ["set", ID, "log", "--file", body],
          ["comment", ID, "--file", body],
          ["transition", ID, "codeReview"],
          ["link", ID, "depends", "48214"],
        ];
      };

      for (const token of [FIX.token, null]) {
        test(`write verbs BLOCKED with zero requests when readOnly true (credentials ${token === null ? "absent" : "present"})`, () => {
          withTempDir((cwd) => {
            writeProject(cwd, { trackerOver: { readOnly: true }, token });
            fs.writeFileSync(path.join(cwd, "ro-body.md"), "x\n");
            for (const args of verbsFor(cwd)) {
              const stub = writeCurlStub(cwd, defaultRoutes());
              fs.rmSync(stub.logFile, { force: true });
              const result = runAdo(cwd, args, stub.env);
              assertBlocked(result, /read-only/);
              assert.equal(fs.existsSync(stub.logFile), false, `curl ran for ${args[0]}`);
            }
          });
        });
      }

      test("readOnly false explicitly still writes", () => {
        withTempDir((cwd) => {
          writeProject(cwd, { trackerOver: { readOnly: false } });
          const route = witPath(`/_apis/wit/workitems/%24${encodeURIComponent(FIX.bugType)}`);
          const stub = writeCurlStub(cwd, defaultRoutes({ [`POST ${route}`]: { code: 200, body: { id: 5521 } } }));
          const result = runAdo(cwd, ["create", "--type", "bug", "--title", "t"], stub.env);
          assertOk(result, { id: "5521" });
          assert.equal(fs.existsSync(stub.logFile), true);
        });
      });

      test("get takes bodies from files; scalars from tracker", () => {
        withTempDir((cwd) => {
          writeProject(cwd, { trackerOver: { readOnly: true } });
          writeFile(cwd, "docs/features/48213.feature.md", "---\nx: 1\n---\nro file spec 7q\n");
          writeFile(cwd, "docs/prompt/48213.prompt.md", "ro file prompt 7q\n");
          writeFile(cwd, "docs/feature-log/48213.log.md", "ro file log 7q\n");
          const stub = writeCurlStub(
            cwd,
            defaultRoutes({
              [`GET ${itemPath()}`]: { code: 200, body: workItem },
              [`GET ${itemPath()}/comments`]: { code: 200, body: { comments: [{ text: "tracker comment" }] } },
            })
          );
          const result = runAdo(cwd, ["get", ID], stub.env);
          assert.equal(result.status, 0, result.stdout + result.stderr);
          assert.match(result.stdout, /^OK\n/);
          assert.match(result.stdout, /status: QX9 Backlog New\n/);
          assert.match(result.stdout, /BEGIN spec\nro file spec 7q\nEND spec/);
          assert.match(result.stdout, /BEGIN prompt\nro file prompt 7q\nEND prompt/);
          assert.match(result.stdout, /BEGIN log\nro file log 7q\nEND log/);
          assert.doesNotMatch(result.stdout, /QX9 spec body|QX9 prompt body|tracker comment/);
        });
      });

      test("get with no local files gives empty bodies and OK", () => {
        withTempDir((cwd) => {
          writeProject(cwd, { trackerOver: { readOnly: true } });
          const stub = writeCurlStub(
            cwd,
            defaultRoutes({
              [`GET ${itemPath()}`]: { code: 200, body: workItem },
              [`GET ${itemPath()}/comments`]: { code: 200, body: { comments: [] } },
            })
          );
          const result = runAdo(cwd, ["get", ID], stub.env);
          assert.match(result.stdout, /^OK\n/);
          assert.match(result.stdout, /BEGIN spec\n\nEND spec/);
          assert.match(result.stdout, /BEGIN prompt\n\nEND prompt/);
          assert.match(result.stdout, /BEGIN log\n\nEND log/);
        });
      });
    });
  });
});
