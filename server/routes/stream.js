// server/routes/stream.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const router = express.Router();

router.get("/:name", async (req, res) => {
  const testName = req.params.name;

  const repoTestDir = path.join(__dirname, "../../tmp/repo/tests", testName);
  const builtInTestDir = path.join(__dirname, "../tests", testName);

  let testDir = null;
  let jsPath = null;

  if (fs.existsSync(path.join(repoTestDir, "run.js"))) {
    testDir = repoTestDir;
    jsPath = path.join(repoTestDir, "run.js");
  } else if (fs.existsSync(path.join(builtInTestDir, "run.js"))) {
    testDir = builtInTestDir;
    jsPath = path.join(builtInTestDir, "run.js");
  }

  if (!jsPath || !fs.existsSync(jsPath)) {
    console.error(`❌ run.js not found for '${testName}'`);
    return res.status(404).send("Test script not found");
  }

  console.log(`✅ Using test directory: ${testDir}`);

  // 🟢 Set SSE response headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.flushHeaders();
  res.write("event: message\ndata: 🚀 Stream opened\n\n");

  // ✅ Build environment
  const env = {
    ...process.env,
    VISUAL_BROWSER: "true",
    CHROME_USER_PROFILE: "/tmp/okta-session",
  };

  // 🟢 Spawn Node.js test runner
  const child = spawn("node", ["run.js"], {
    cwd: testDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const sendLine = (line) => {
    const sanitized = line.toString().replace(/\n/g, "⏎");
    res.write(`data: ${sanitized}\n\n`);
  };

  child.stdout.on("data", (data) => {
    sendLine(data);
  });

  child.stderr.on("data", (data) => {
    sendLine("[stderr] " + data);
  });

  child.on("close", (code) => {
    sendLine(`✅ Test finished with code ${code}`);
    res.write("event: close\ndata: done\n\n");
    res.end();
  });

  // Client disconnects
  req.on("close", () => {
    console.warn(`🔌 Client closed stream for ${testName}`);
    child.kill(); // Clean up test process if client aborts
  });
});

module.exports = router;