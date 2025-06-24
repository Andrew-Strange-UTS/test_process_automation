# test_process_automation

This is a Docker container to run Salinium operation (tests but they don'y need to be "tests") from a Next.js front end to view and run all the operations. 

In the "tests" folder are all the operation.

To build new operation create another folder in the tests folder



Folder structure 

📁 your-repo/
├── 📁 client/               # React frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/       # API calls (e.g. test listing, submission)
├── 📁 server/               # Backend (Node.js or Python FastAPI)
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   └── app.js              # Express or FastAPI entry
├── 📁 tests/                # Your actual test scripts
│   ├── 📁 login-test/
│   │   ├── run.js          # The test script (Selenium or puppeteer etc.)
│   │   └── metadata.json   # Input config, description etc.
│   ├── 📁 upload-test/
│   │   ├── run.js
│   │   └── metadata.json
│   └── ...
├── 📁 utils/               # (optional) shared utilities (logging, test parser etc.)
├── 📁 docker/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   ├── Dockerfile.selenium
├── docker-compose.yml
├── README.md
└── .env (for secrets and config)
