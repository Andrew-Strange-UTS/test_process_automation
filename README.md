# test_process_automation

This is a Docker container to run Salinium operation (tests but they don'y need to be "tests") from a Next.js front end to view and run all the operations. 

In the "tests" folder are all the operation.

To build new operation create another folder in the tests folder

Build the Docker container docker-compose up --build

http://localhost:7900/ for selenium visuals password is secret by default

Folder structure 

📁 your-repo/
├── 📁 client/               # React frontend
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── layout.js
│       │   └── page.js
│       ├── components/
│       │   └── RunSequence.js
│       │   └── TestCard.js
│       └── styles/
├── 📁 server/               # Backend (Node.js or Python FastAPI)
│   ├── controllers/
│   │   └── gitController.js
│   ├── routes/
│   │   ├── stream.js
│   │   ├── git.js
│   │   └── tests.js
│   └── app.js              # Express or FastAPI entry
├── 📁 utils/               # (optional) shared utilities (logging, test parser etc.)
├── 📁 tests        
│   ├── 📁 OKTA-Prod-Login
│   │   └── run.js
│   ├── 📁 OKTA-Prod-Login-Finish
│   │   └── run.js
│   ├── 📁 OKTA-Test-Login
│   │   └── run.js
│   ├── 📁 OKTA-Test-Login-Finish
│   │   └── run.js
├── 📁 docker/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   ├── Dockerfile.selenium
├── docker-compose.yml
├── README.md
└── .env (for secrets and config)


Test are loded from public GitHub repos

Python and JavaScript tests are supported.

Test GitHub repo folder structure

📁 your-repo/
├── 📁 tests        
│   ├── 📁 test1name
│   │   └── metadata.json
│   │   └── run.js
│   ├── 📁 test2name
│   │   └── metadata.json
│   │   └── run.py





