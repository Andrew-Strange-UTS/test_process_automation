//server/controllers/gitController.js
const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");
// Always clone to a fixed folder — ignore repo name
const CLONE_TARGET = path.join(__dirname, "../../tmp/repo");
const TESTS_DIR = path.join(CLONE_TARGET, "tests");

// Helper to get the PAT secret (using server/secrets.js)
const { getSecret } = require('../secrets');

function getPersonalAccessToken() {
  // 1. Try from environment variable (like the tests do)
  if (process.env.PERSONAL_ACCESS_TOKEN) {
    return process.env.PERSONAL_ACCESS_TOKEN;
  }
  // 2. Fallback to internal encrypted secrets datastore
  return getSecret("PERSONAL_ACCESS_TOKEN") || null;
}

async function cloneTestRepo(req, res) {
  const { repoUrl, privateRepo } = req.body;
  const repoUrlClean = (repoUrl || "").trim();
  // Defensive: handle booleans, strings, numbers
  const isPrivate = privateRepo === true || privateRepo === "true" || privateRepo === 1;

  console.log("cloneTestRepo: repoUrl:", repoUrl, "privateRepo:", privateRepo, "isPrivate:", isPrivate);

  if (!repoUrl) {
    return res.status(400).json({ error: "Repository URL is required" });
  }
  try {
    // Delete old clone if it exists
    if (fs.existsSync(CLONE_TARGET)) {
      fs.rmSync(CLONE_TARGET, { recursive: true, force: true });
    }
    let urlToClone = repoUrl;

    if (isPrivate) {
      const PAT = getPersonalAccessToken();
      if (!PAT) {
        console.log("PAT fail")
        return res.status(403).json({ error: "PERSONAL_ACCESS_TOKEN secret not set" });
      }
      // Try to extract username from repoUrl
      let username = "x-access-token"; // Works for GitHub PAT
      const m = repoUrl.match(/github\.com\/([^\/]+)\//);
      if (m && m[1]) username = m[1];
      let urlTail = repoUrl.replace(/^https:\/\//, "");
      urlToClone = `https://${username}:${encodeURIComponent(PAT)}@${urlTail}`;
      console.log("CLONE (private):", urlToClone, "PAT found?", !!PAT, "username:", username);
    } else {
      console.log("CLONE (public):", urlToClone);
    }

    const git = simpleGit();
    console.log(`Cloning ${urlToClone} into ${CLONE_TARGET}...`);
    await git.clone(urlToClone, CLONE_TARGET); // 🍽️ Clone always to tmp/repo
    return res.json({ message: "Repo cloned successfully" });
  } catch (error) {
    console.error("❌ Failed to clone repo:", error);
    return res.status(500).json({ error: "Failed to clone repo" });
  }
}

function listTests(req, res) {
  try {
    if (!fs.existsSync(TESTS_DIR)) {
      return res.status(404).json({ error: "No 'tests' folder found in the cloned repo" });
    }
    const testFolders = fs
      .readdirSync(TESTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    res.json(testFolders);
  } catch (error) {
    console.error("❌ Error reading test folders:", error);
    return res.status(500).json({ error: "Failed to read test folders" });
  }
}

function getTestFile(req, res) {
  const { testName, file } = req.params;
  const filePath = path.join(TESTS_DIR, testName, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ content });
  } catch (error) {
    console.error(`❌ Failed to read file: ${filePath}`, error);
    return res.status(500).json({ error: "Error reading file" });
  }
}

module.exports = {
  cloneTestRepo,
  listTests,
  getTestFile,
};