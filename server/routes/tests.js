const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const router = express.Router();

// GET /api/tests (list folder names)
router.get("/", (req, res) => {
  const fs = require("fs");
  const testsDir = path.join(__dirname, "../tests");

  fs.readdir(testsDir, { withFileTypes: true }, (err, files) => {
    if (err) return res.status(500).json({ error: "Could not list test folders." });

    const folders = files.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
    res.json(folders);
  });
});

// 👇 POST /api/tests/:name/run
router.post("/:name/run", (req, res) => {
  const testName = req.params.name;
  const { visualBrowser, needsOktaProd, needsOktaTest } = req.body;

  const testPath = path.join(__dirname, "../tests", testName, "run.js");
  const fs = require("fs");
  if (!fs.existsSync(testPath)) {
    return res.status(404).json({ error: "Test not found" });
  }

  const env = {
    ...process.env,
    VISUAL_BROWSER: visualBrowser ? "true" : "false",
    OKTA_PROD: needsOktaProd ? "true" : "false",
    OKTA_TEST: needsOktaTest ? "true" : "false"
  };

  const child = spawn("node", [testPath], { env });

  let output = "";

  child.stdout.on("data", (data) => {
    output += data.toString();
  });

  child.stderr.on("data", (data) => {
    output += data.toString();
  });

  child.on("close", (code) => {
    const status = code === 0 ? "Passed ✅" : "Failed ❌";
    res.json({ status, log: output });
  });
});

module.exports = router;