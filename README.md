# UTS Automation UI v2

A Docker-based Selenium test automation platform with a Next.js frontend. Clone a GitHub test repo (public or private), view and configure tests, build run sequences with OKTA login wrapping, and report results to Zephyr Scale — all from a browser UI.

## Quick Start

```bash
docker compose up --build
```

| Service   | URL                        | Description                      |
|-----------|----------------------------|----------------------------------|
| Frontend  | http://localhost:3002       | Next.js UI                       |
| Backend   | http://localhost:5000       | Express API + WebSocket          |
| Selenium  | http://localhost:4444       | WebDriver endpoint               |
| noVNC     | http://localhost:7900       | Live browser view (password: `secret`) |

Ports are configurable in `.env`.

## What's New in v2

### Zephyr Scale Integration
Tests can report results directly to Zephyr Scale. For each test card you can set:
- **Project Key** (e.g. `EPEA`)
- **Case Key** (e.g. `EPEA-T123`)
- **Cycle Key** (e.g. `EPEA-R45`)

The sequence runner posts pass/fail results (including per-step results) to the Zephyr Scale API after each test completes. Requires a `ZEPHYR_API_TOKEN` secret — add it via the Secrets Manager before running.

### Secrets Manager
Encrypted secrets store (AES-256-GCM) accessible from the UI. Secrets are persisted across container restarts via a Docker volume.

- Add secrets like `ZEPHYR_API_TOKEN`, `PERSONAL_ACCESS_TOKEN`, `GITHUB_USERNAME`, or any test-specific credentials
- Reference secrets in test parameters using `${{ secrets.YOUR_NAME }}`
- Values are encrypted at rest and never displayed after entry

### Private GitHub Repository Support
Clone tests from private GitHub repos by:
1. Ticking the **Private repository** checkbox
2. Adding `GITHUB_USERNAME` and `PERSONAL_ACCESS_TOKEN` secrets via the Secrets Manager
3. The PAT needs `repo` scope — the UI shows a guided setup popup if secrets are missing

Generate a token at: https://github.com/settings/tokens/new?description=gitingest&scopes=repo

### OKTA Login Wrapping
Tests that need OKTA authentication can select an OKTA environment (Prod, Pre-prod, Test) on the test card. The sequence runner automatically wraps those tests with login/finish steps and reuses the browser session across all tests in the same OKTA group.

### Built-in Default Test
When no repo is loaded, a default test is shown that navigates to `coursehandbook.uts.edu.au` and verifies the UTS logo is present. Useful for verifying the setup works.

## Configuration

### `.env`

```env
FRONTEND_PORT=3002
BACKEND_PORT=5000
SELENIUM_PORT=4444
NOVNC_PORT=7900
```

### Docker Services

| Service    | Image / Dockerfile           | Purpose                              |
|------------|------------------------------|--------------------------------------|
| `frontend` | `docker/Dockerfile.frontend` | Next.js app (build + serve)          |
| `backend`  | `docker/Dockerfile.backend`  | Express API, test runner, secrets    |
| `selenium` | `selenium/standalone-chrome`  | Chrome + WebDriver + noVNC           |

Secrets data is persisted in a named Docker volume (`secrets-data`).

## Project Structure

```
UTS-automation-UI/
├── client/                          # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js
│   │   │   └── page.js             # Main dashboard
│   │   ├── components/
│   │   │   ├── TestCard.js          # Test config (params, Zephyr, OKTA env)
│   │   │   ├── RunSequence.js       # Sequence sidebar + execution
│   │   │   ├── LogGroup.js          # Collapsible log viewer
│   │   │   ├── SecretsPanel.js      # Secrets CRUD
│   │   │   ├── SecretRow.js         # Individual secret row
│   │   │   ├── PATPopup.js          # PAT setup instructions modal
│   │   │   └── PrivateRepoCheckbox.js
│   │   ├── config.js                # Backend/WS/noVNC URL config
│   │   └── styles/
│   └── public/
├── server/                          # Express backend
│   ├── app.js                       # Express app + route setup
│   ├── index.js                     # HTTP server entry point
│   ├── ws.js                        # WebSocket single test runner
│   ├── secrets.js                   # Encrypted secrets store
│   ├── controllers/
│   │   └── gitController.js         # Git clone, list tests, read files
│   ├── routes/
│   │   ├── git.js                   # /api/git/*
│   │   ├── tests.js                 # /api/tests/*
│   │   ├── sequence.js              # /api/sequence/run (sequence runner + Zephyr)
│   │   ├── secrets.js               # /api/secrets/*
│   │   └── stream.js                # /api/stream/:name (SSE)
│   ├── builtins/
│   │   ├── default-test.js          # Built-in UTS logo check
│   │   ├── okta-login.js            # OKTA login automation
│   │   └── okta-login-finish.js     # OKTA session teardown (no-op)
│   └── utils/
│       ├── encryption.js            # AES-256-GCM encrypt/decrypt
│       └── zephyr.js                # Zephyr Scale API client
├── docker/
│   ├── Dockerfile.frontend
│   └── Dockerfile.backend
├── docker-compose.yml
├── .env
└── README.md
```

## Test Repo Structure

Tests are loaded from a GitHub repo. Each test is a folder under `tests/` with a `run.js` (or `run.py`) and an optional `metadata.json`.

```
your-test-repo/
└── tests/
    ├── my-test/
    │   ├── run.js              # Test script (receives driver, parameters, zephyrLog)
    │   └── metadata.json       # Title + parameter definitions
    └── another-test/
        ├── run.py              # Python tests also supported
        └── metadata.json
```

### `run.js` API

```js
const { By } = require("selenium-webdriver");

module.exports = async function (driver, parameters = {}, zephyrLog) {
  // driver    — Selenium WebDriver instance (shared browser session)
  // parameters — merged user params + secrets
  // zephyrLog(actualResult, status) — log a Zephyr step result ("Pass" or "Fail")

  await driver.get("https://example.com");
  const title = await driver.getTitle();

  if (title.includes("Example")) {
    zephyrLog("Page title contains 'Example'", "Pass");
  } else {
    zephyrLog("Expected 'Example' in title, got: " + title, "Fail");
    throw new Error("Title mismatch");
  }
};
```

### `metadata.json`

```json
{
  "title": "My Test — Description shown in UI",
  "needed-parameters": [
    {
      "name": "TARGET_URL",
      "label": "Target URL",
      "default": "https://example.com"
    }
  ]
}
```

Parameters defined here appear as input fields on the test card. Secret references like `${{ secrets.MY_TOKEN }}` are resolved at runtime.

### OKTA Login Tests

OKTA login/finish steps are built-in and automatically injected by the sequence runner. You do **not** need to include them in your test repo. Just select an OKTA environment on the test card.

## Usage

1. **Start the stack**: `docker compose up --build`
2. **Open the UI**: http://localhost:3002
3. **Add secrets** (if needed): Click "Open Secrets" and add `ZEPHYR_API_TOKEN`, `PERSONAL_ACCESS_TOKEN`, etc.
4. **Load tests**: Paste a GitHub repo URL, tick "Private repository" if needed, click "Refresh Tests"
5. **Configure tests**: Set parameters, OKTA environment, and Zephyr Scale fields on each test card
6. **Build a sequence**: Check "Add to Run Sequence" on each test you want to run
7. **Run**: Click "Run Sequence" in the sidebar
8. **View results**: Expand "Show Server-side Test Logs" for detailed logs per test. Use noVNC at http://localhost:7900 to watch the browser live.
