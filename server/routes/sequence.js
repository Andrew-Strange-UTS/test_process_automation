// server/routes/sequence.js

const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const TESTS_ROOT = path.join(__dirname, "../../tmp/repo/tests");

// --- Import secrets handling utilities ---
const secretsStore = require("../secrets");

// Utility: Inject secrets into params
function injectSecretsInParams(obj) {
  if (typeof obj === "string") {
    return obj.replace(/\$\{\{\s*secrets\.([A-Za-z0-9_]+)\s*\}\}/g, (_, n) => {
      // Only inject if the secret exists
      return secretsStore.getSecret(n) ?? "";
    });
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => injectSecretsInParams(v));
  }
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, injectSecretsInParams(v)])
    );
  }
  return obj;
}

router.post("/run", async (req, res) => {
  const { sequence, parameters = {} } = req.body;
  if (!Array.isArray(sequence) || sequence.length === 0) {
    res.status(400).json({ error: "No tests in sequence" });
    return;
  }
  try {
    // Get all secrets as a flat object { TESTWORDS: 'hunter2', ... }
    const allSecrets = {};
    secretsStore.listNames().forEach(name => {
      allSecrets[name] = secretsStore.getSecret(name);
    });

    // --- Merge secrets as the default parameters for every step/test
    // If your incoming parameters is per-test (by name), do:
    const parametersWithSecrets = {};
    for (const test of sequence) {
      parametersWithSecrets[test.name] = {
        ...(parameters?.[test.name] || {}), // user-supplied params
        ...allSecrets                      // all available secrets
      };
    }
    // If parameters is flat and not per test, just ...spread both at top level


    // --- Regular setup code ---
    // Create a unique sequence folder in TESTS_ROOT
    const seqId = "sequence-" + uuidv4().slice(0, 8);
    const seqDir = path.join(TESTS_ROOT, seqId);
    fs.mkdirSync(seqDir);

    // Compile run.js (with .js test references)
    const combinedRunJsContent = `
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const stepFns = [
${sequence.map(test => `  require(${JSON.stringify(path.join(TESTS_ROOT, test.name, "run.js"))})`).join(",\n")}
];
const stepNames = [
${sequence.map(test => `  ${JSON.stringify(test.name)}`).join(",\n")}
];
process.on('uncaughtException', function (err) {
  console.error('[FATAL uncaughtException]', err && err.stack || err);
  process.exit(2);
});
process.on('unhandledRejection', function (err) {
  console.error('[FATAL unhandledRejection]', err && err.stack || err);
  process.exit(2);
});
console.log('RUNNING IN FOLDER:', ${JSON.stringify(seqDir)});
console.log('NODE_PATH:', process.env.NODE_PATH);
// ---- Never print raw parameters with secrets ----
console.log('Parameters present for steps: ' + stepNames.join(', '));
async function main() {
  const seleniumUrl = process.env.SELENIUM_REMOTE_URL || "http://localhost:4444/wd/hub";
  const options = new chrome.Options();
  if (process.env.VISUAL_BROWSER !== "true") {
    options.addArguments("--headless=new","--disable-gpu","--no-sandbox","--window-size=1920,1080");
  }
  let driver;
  let failedCount = 0;
  let passedCount = 0;
  try {
    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).usingServer(seleniumUrl).build();
    const parameters = ${JSON.stringify(parametersWithSecrets)};
    for (let i = 0; i < stepFns.length; ++i) {
      const fn = stepFns[i];
      const testName = stepNames[i];
      const testParams = parameters[testName] || {};
      try {
        console.log("▶ Running step #" + (i + 1) + " [" + testName + "]");
        await fn(driver, testParams);
        console.log("✅ Finished step #" + (i + 1) + " [" + testName + "]");
        passedCount++;
      } catch (stepError) {
        failedCount++;
        console.error("❌ Step #" + (i + 1) + " [" + testName + "] failed:", stepError && stepError.stack || stepError);
        // Do not throw; just log and continue to next step.
      }
    }
    await driver.quit();
    console.log("✅ All steps finished.");
    console.log("Summary: " + passedCount + " passed / " + failedCount + " failed.");
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (err) {
    if (driver) await driver.quit();
    console.error("❌ Fatal error in test sequence:", err && err.stack || err);
    process.exit(1);
  }
}
main();
`;

    fs.writeFileSync(path.join(seqDir, "run.js"), combinedRunJsContent);

    // Start streaming to client
    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    // --- Announce about to run, then wait ---
    res.write(`[client log] Preparing to run ${seqId}\n`);
    console.log(`[client log] Preparing to run ${seqId}`);
    res.write(`[client log] Waiting 2000ms before running ${seqId}\n`);
    console.log(`[client log] Waiting 2000ms before running ${seqId}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    res.write(`[client log] Now running ${seqId}\n`);
    console.log(`[client log] Now running ${seqId}`);
    const child = spawn("node", ["run.js"], {
      cwd: seqDir,
      env: {
        ...process.env,
        NODE_PATH: process.env.NODE_PATH, // so it can require selenium-webdriver
        SELENIUM_REMOTE_URL:
          process.env.SELENIUM_REMOTE_URL || "http://selenium:4444/wd/hub",
        VISUAL_BROWSER: String(
          parametersWithSecrets.visualBrowser !== undefined
            ? parametersWithSecrets.visualBrowser
            : "true"
        ),
        // You can optionally inject secrets as env vars as well (for shell-based tests etc):
        // ...(Object.fromEntries(Object.entries(secretsStore.listNames().map(n=>[n,secretsStore.getSecret(n)]))))
      },
    });

    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      res.write(chunk);
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      res.write(chunk);
      process.stderr.write(chunk);
    });
    child.on("error", (err) => {
      const msg =
        "CHILD PROCESS ERROR: " +
        (err && err.message) +
        "\n[search folder] " +
        seqDir;
      res.write(msg);
      console.error(msg);
      res.end();
    });
    child.on("close", (code, signal) => {
      res.write(
        `\n=== Sequence finished with code ${code}, signal "${signal}" ===\n[search folder] ${seqDir}\n`
      );
      res.end();
    });
    req.on("close", () => {
      child.kill();
      res.write("\n[Client disconnected, killed child process]\n");
      res.end();
    });
  } catch (e) {
    const msg =
      `[FATAL error in compiling sequence test] ${e && e.stack || e}\n[search folder] ${TESTS_ROOT}\n`;
    res.write(msg);
    console.error(msg);
    res.end();
  }
});

module.exports = router;