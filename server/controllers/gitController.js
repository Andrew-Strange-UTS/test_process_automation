//server/controllers/gitController.js

const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");

// Always clone to a fixed folder — ignore repo name
const CLONE_TARGET = path.join(__dirname, "../../tmp/repo");
const TESTS_DIR = path.join(CLONE_TARGET, "tests");

async function cloneTestRepo(req, res) {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "Repository URL is required" });
  }

  try {
    // Delete old clone if it exists
    if (fs.existsSync(CLONE_TARGET)) {
      fs.rmSync(CLONE_TARGET, { recursive: true, force: true });
    }

    const git = simpleGit();
    console.log(`Cloning ${repoUrl} into ${CLONE_TARGET}...`);
    await git.clone(repoUrl, CLONE_TARGET); // 🍽️ Clone always to tmp/repo

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