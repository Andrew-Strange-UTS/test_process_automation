"use client";
import { useState } from "react";
import TestCard from "@/components/TestCard";
import RunSequence from "@/components/RunSequence";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [tests, setTests] = useState([]);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);

  const [runSequence, setRunSequence] = useState([]);
  const [testOptions, setTestOptions] = useState({});
  const [testResults, setTestResults] = useState({});

  const [serverSideLogs, setServerSideLogs] = useState({});
  const [isServerLogExpanded, setIsServerLogExpanded] = useState(false);

  const handleServerTestResult = (testName, result) => {
    setTestResults((prev) => ({
      ...prev,
      [testName]: result,
    }));
  
    // Initialize log
    setServerSideLogs((prev) => ({
      ...prev,
      [testName]: `[${result.time}] ─ started...\n`,
    }));
  
    // 🔌 Open SSE stream for ALL tests
    const eventSource = new EventSource(`http://localhost:5000/api/stream/${testName}`);
  
    eventSource.onopen = () => {
      console.log(`📡 Connected to stream: /api/stream/${testName}`);
    };
  
    eventSource.onmessage = (event) => {
      const newLine = event.data.replace(/⏎/g, "\n");
      setServerSideLogs((prev) => ({
        ...prev,
        [testName]: (prev[testName] || "") + newLine + "\n",
      }));
    };
  
    eventSource.addEventListener("close", () => {
      setServerSideLogs((prev) => ({
        ...prev,
        [testName]: (prev[testName] || "") + "\n🟢 Stream completed.\n",
      }));
      eventSource.close();
    });
  
    eventSource.onerror = (err) => {
      console.error(`❌ Stream error for ${testName}:`, err);
      setServerSideLogs((prev) => ({
        ...prev,
        [testName]: (prev[testName] || "") + `\n❌ Stream error\n`,
      }));
      eventSource.close();
    };
  };

  // 📥 Called by TestCard when user sets options or params
  const handleOptionsChange = (testName, options) => {
    setTestOptions((prev) => ({
      ...prev,
      [testName]: {
        ...(prev[testName] || {}),
        ...options,
      },
    }));
  };

  // 📥 Called by TestCard checkbox to add/remove from run sequence
  const handleToggleSequence = (testName, shouldAdd, flags) => {
    setRunSequence((prev) => {
      if (shouldAdd) {
        if (!prev.find((t) => t.name === testName)) {
          return [...prev, { name: testName, ...flags }];
        }
        return prev;
      } else {
        return prev.filter((t) => t.name !== testName);
      }
    });
  };

  // 📥 Called by RunSequence to report test results
  const handleTestResult = (testName, result) => {
    setTestResults((prev) => ({
      ...prev,
      [testName]: result,
    }));
  };

  const handleOpenNoVNC = () => {
    window.open("http://localhost:7900/", "_blank");
  };

  // ⏬ Clone a GitHub repo and load all tests
  const handleClone = async () => {
    setLoading(true);
    setRunSequence([]);
    setTestResults({});
    setTestOptions({});

    try {
      const res = await fetch("http://localhost:5000/api/git/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      if (!res.ok) throw new Error("Failed to clone repo");

      const listRes = await fetch("http://localhost:5000/api/git/list");
      const data = await listRes.json();
      setTests(data);

      const filesMap = {};
      for (const testName of data) {
        const possibleFiles = ["run.js", "run.py"];
        let runFile = null;
        let runContent = null;

        for (const file of possibleFiles) {
          const tryFile = await fetch(`http://localhost:5000/api/git/${testName}/${file}`);
          if (tryFile.ok) {
            const result = await tryFile.json();
            runFile = file;
            runContent = result.content;
            break;
          }
        }

        let metaContent = null;
        try {
          const metaRes = await fetch(`http://localhost:5000/api/git/${testName}/metadata.json`);
          if (metaRes.ok) {
            const meta = await metaRes.json();
            metaContent = meta.content;
          }
        } catch (err) {
          // no metadata, OK
        }

        filesMap[testName] = {
          run: runContent,
          runFile,
          metadata: metaContent,
        };
      }

      setFiles(filesMap);
    } catch (err) {
      console.error("❌ Error loading tests:", err);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  // Hide internal system tests from UI
  const hiddenTests = [
    "OKTA-Prod-Login",
    "OKTA-Prod-Login-finish",
    "OKTA-Test-Login",
    "OKTA-Test-Login-finish",
  ];

  const visibleTests = tests.filter((testName) => !hiddenTests.includes(testName));

  return (
    <div style={{ display: "flex" }}>
      {/* Main Panel */}
      <div style={{ flex: 1, padding: "20px" }}>
        <h1 style={{ textAlign: "center" }}>UTS Automation UI</h1>

        {/* GitHub Repo Input */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "30px",
          }}
        >
          <input
            type="text"
            placeholder="Enter GitHub Repo URL..."
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            style={{
              width: "500px",
              padding: "12px",
              fontSize: "16px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={handleClone}
            style={{
              padding: "12px 20px",
              fontSize: "16px",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            🔄 Refresh Tests
          </button>
          <button
            onClick={handleOpenNoVNC}
            style={{
              padding: "12px 20px",
              fontSize: "16px",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Open Selenium onVNC
          </button>
        </div>
        {/* Server-side Logs Panel */}
        <div
          style={{
            width: "1400px",
            margin: "30px auto",
            backgroundColor: "#fafafa",
            borderRadius: "10px",
            padding: "20px",
            border: "1px solid #ccc",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={() => setIsServerLogExpanded((prev) => !prev)}
            style={{
              padding: "10px 20px",
              fontWeight: "bold",
              backgroundColor: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginBottom: "10px",
            }}
          >
            {isServerLogExpanded ? "Hide Server-side Test Logs" : "Show Server-side Test Logs"}
          </button>

          {isServerLogExpanded && (
            <div style={{ marginTop: "20px" }}>
              {Object.entries(serverSideLogs).map(([name, log]) => (
                <div
                  key={name}
                  style={{
                    marginBottom: "20px",
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  <strong>{name}</strong>
                  <pre
                    style={{
                      marginTop: "10px",
                      whiteSpace: "pre-wrap",
                      fontSize: "13px",
                    }}
                  >
                    {log || "No logs yet."}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Test Cards */}
        {loading ? (
          <p style={{ textAlign: "center", fontStyle: "italic" }}>Loading tests...</p>
        ) : visibleTests.length === 0 ? (
          <div
            style={{
              width: "1400px",
              margin: "40px auto",
              backgroundColor: "#0070f3",
              color: "white",
              borderRadius: "10px",
              padding: "40px",
              textAlign: "center",
              fontSize: "24px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            }}
          >
            No Tests Loaded
          </div>
        ) : (
          visibleTests.map((name) => (
            <TestCard
              key={name}
              name={name}
              runContent={files[name]?.run}
              runFile={files[name]?.runFile}
              metaContent={files[name]?.metadata}
              isInSequence={runSequence.some((t) => t.name === name)}
              onToggleInSequence={handleToggleSequence}
              onOptionsChange={handleOptionsChange}
              results={testResults[name]}
            />
          ))
        )}
      </div>

      {/* Run Queue Sequence Sidebar */}
      <RunSequence
        sequence={runSequence.map((t) => ({
          ...t,
          ...(testOptions[t.name] || {}),
        }))}
        onTestResult={handleServerTestResult}
      />
    </div>
  );
}