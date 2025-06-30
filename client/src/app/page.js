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

  // ✅ Live WebSocket test runner
  const handleRunTestViaWebSocket = (testName, options = {}) => {
    const startTime = new Date().toLocaleString();

    setServerSideLogs((prev) => ({
      ...prev,
      [testName]: `[${startTime}] ─ started...\n`,
    }));

    const socket = new WebSocket("ws://localhost:5000");

    socket.onopen = () => {
      console.log(`🛰️ WebSocket connected for ${testName}`);
      socket.send(JSON.stringify({
        type: "RUN",
        test: testName,
        ...options, // future use: parameters, visualBrowser, etc.
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "log") {
          setServerSideLogs((prev) => ({
            ...prev,
            [testName]: (prev[testName] || "") + message.message + "\n",
          }));
        }

        if (message.type === "done") {
          setServerSideLogs((prev) => ({
            ...prev,
            [testName]: (prev[testName] || "") + `\n🟢 Stream completed.\n`,
          }));

          setTestResults((prev) => ({
            ...prev,
            [testName]: {
              status: message.status,
              time: startTime,
            },
          }));

          socket.close();
        }
      } catch (err) {
        console.error("🔴 Failed to parse WS message:", event.data, err);
      }
    };

    socket.onerror = (err) => {
      console.error(`❌ WebSocket error for ${testName}:`, err);
      setServerSideLogs((prev) => ({
        ...prev,
        [testName]: (prev[testName] || "") + `\n❌ WebSocket error\n`,
      }));
      socket.close();
    };

    socket.onclose = () => {
      console.log(`🔌 WebSocket closed for ${testName}`);
    };
  };

  const handleOptionsChange = (testName, options) => {
    setTestOptions((prev) => ({
      ...prev,
      [testName]: {
        ...(prev[testName] || {}),
        ...options,
      },
    }));
  };

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

  const handleOpenNoVNC = () => {
    window.open("http://localhost:7900/", "_blank");
  };

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
        } catch (err) {}
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

  const hiddenTests = [
    "OKTA-Prod-Login",
    "OKTA-Prod-Login-Finish",
    "OKTA-Test-Login",
    "OKTA-Test-Login-Finish",
  ];
  const visibleTests = tests.filter((testName) => !hiddenTests.includes(testName));

  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1, padding: "20px" }}>
        <h1 style={{ textAlign: "center" }}>UTS Automation UI</h1>

        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "30px",
        }}>
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
          <button onClick={handleClone} style={{
            padding: "12px 20px",
            fontSize: "16px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}>
            🔄 Refresh Tests
          </button>
          <button onClick={handleOpenNoVNC} style={{
            padding: "12px 20px",
            fontSize: "16px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}>
            Open Selenium onVNC
          </button>
        </div>

        {/* Logs Viewer */}
        <div style={{
          width: "1400px",
          margin: "30px auto",
          backgroundColor: "#fafafa",
          borderRadius: "10px",
          padding: "20px",
          border: "1px solid #ccc",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        }}>
          <button onClick={() => setIsServerLogExpanded((prev) => !prev)} style={{
            padding: "10px 20px",
            fontWeight: "bold",
            backgroundColor: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginBottom: "10px",
          }}>
            {isServerLogExpanded ? "Hide Server-side Test Logs" : "Show Server-side Test Logs"}
          </button>
          {isServerLogExpanded && (
            <div style={{ marginTop: "20px" }}>
              {Object.entries(serverSideLogs).map(([name, log]) => (
                <div key={name} style={{
                  marginBottom: "20px",
                  padding: "15px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  backgroundColor: "#f5f5f5",
                }}>
                  <strong>{name}</strong>
                  <pre style={{
                    marginTop: "10px",
                    whiteSpace: "pre-wrap",
                    fontSize: "13px",
                  }}>
                    {log || "No logs yet."}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test cards */}
        {loading ? (
          <p style={{ textAlign: "center", fontStyle: "italic" }}>Loading tests...</p>
        ) : visibleTests.length === 0 ? (
          <div style={{
            width: "1400px",
            margin: "40px auto",
            backgroundColor: "#0070f3",
            color: "white",
            borderRadius: "10px",
            padding: "40px",
            textAlign: "center",
            fontSize: "24px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}>
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

      {/* Execution sidebar */}
      <RunSequence
        sequence={runSequence.map((t) => ({
          ...t,
          ...(testOptions[t.name] || {}),
        }))}
        onTestResult={(name) =>
          handleRunTestViaWebSocket(name, testOptions[name])
        }
      />
    </div>
  );
}