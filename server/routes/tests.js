// server/routes/tests.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const router = express.Router();
const TESTS_ROOT = path.join(__dirname, "../../tmp/repo/tests");

// ✅ GET /api/tests — list all test folders
router.get("/", (req, res) => {
  if (!fs.existsSync(TESTS_ROOT)) {
    return res.status(404).json({ error: "Tests folder not found." });
  }
  const folders = fs
    .readdirSync(TESTS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  res.json(folders);
});

// ✅ POST /api/tests/:name/run — run a test
router.post("/:name/run", async (req, res) => {
  const testName = req.params.name;
  const testDir = path.join(TESTS_ROOT, testName);

  if (!fs.existsSync(testDir)) {
    return res.status(404).json({ error: "Test folder not found" });
  }

  const supportedFiles = [
    { filename: "run.js", cmd: ["node"] },
    { filename: "run.py", cmd: ["python3"] }
  ];

  let selected = null;
  for (const { filename, cmd } of supportedFiles) {
    const fullPath = path.join(testDir, filename);
    if (fs.existsSync(fullPath)) {
      selected = { filename, cmd, fullPath };
      break;
    }
  }

  if (!selected) {
    return res.status(404).json({
      error: "No supported test file found (run.js or run.py)"
    });
  }

  // ✅ Build environment variables
  const manualParams = req.body.parameters || {};

  const injectedParams = Object.fromEntries(
    Object.entries(manualParams).map(([key, val]) => [key.toUpperCase(), String(val)])
  );

  const env = {
    ...process.env,
    VISUAL_BROWSER: req.body.visualBrowser ? "true" : "false",
    OKTA_PROD: req.body.needsOktaProd ? "true" : "false",
    OKTA_TEST: req.body.needsOktaTest ? "true" : "false",
    ...injectedParams  // ✅ Inject parsed test param values
  };

  const child = spawn(
    selected.cmd[0],
    [...selected.cmd.slice(1), selected.fullPath],
    {
      cwd: testDir,
      env: env
    }
  );

  let output = "";
  child.stdout.on("data", (data) => (output += data.toString()));
  child.stderr.on("data", (data) => (output += data.toString()));

  child.on("close", (code) => {
    res.json({
      status: code === 0 ? "✅ Passed" : "❌ Failed",
      log: output
    });
  });
});

module.exports = router;