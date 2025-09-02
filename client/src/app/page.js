//client/src/app/page.js
"use client";
import { useState, useRef, useEffect } from "react";
import TestCard from "@/components/TestCard";
import RunSequence from "@/components/RunSequence";
import LogGroup from "@/components/LogGroup";
import SecretsPanel from "@/components/SecretsPanel";
import PrivateRepoCheckbox from "@/components/PrivateRepoCheckbox";
import PATPopup from "@/components/PATPopup";
export default function HomePage() {
  // Refs for log state
  const sequenceBufferRef = useRef("");
  const logsAccumulatorRef = useRef({});
  const currentStepRef = useRef(null);
  const [repoUrl, setRepoUrl] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("repoUrl") || "" : ""
  );
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("repoUrl", repoUrl);
    }
  }, [repoUrl]);
  const [tests, setTests] = useState([]);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [runSequence, setRunSequence] = useState([]);
  const [testOptions, setTestOptions] = useState({});
  const [testResults, setTestResults] = useState({});
  const [serverSideLogs, setServerSideLogs] = useState({});
  const [isServerLogExpanded, setIsServerLogExpanded] = useState(false);
  const [secretsOpen, setSecretsOpen] = useState(false);
  const [patPopupOpen, setPatPopupOpen] = useState(false);
  
  const [privateRepo, setPrivateRepo] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("privateRepo") === "true" : false
  );
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("privateRepo", privateRepo ? "true" : "false");
    }
  }, [privateRepo]);
  // WebSocket single test runner
  const handleRunTestViaWebSocket = (testName, options = {}, onDone) => {
    const startTime = new Date().toLocaleString();
    setServerSideLogs((prev) => ({
      ...prev,
      [testName]: `[${startTime}] ─ started...\n`,
    }));
    const socket = new WebSocket("ws://localhost:5000");
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "RUN",
          test: testName,
          ...options,
        })
      );
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
          if (typeof onDone === "function") {
            onDone({ status: message.status, log: message.log, time: startTime });
          }
          socket.close();
        }
      } catch (err) {}
    };
    socket.onerror = (err) => {
      setServerSideLogs((prev) => ({
        ...prev,
        [testName]: (prev[testName] || "") + `\n❌ WebSocket error\n`,
      }));
      if (typeof onDone === "function") {
        onDone({ status: "❌ Failed", log: "WebSocket error", time: startTime });
      }
      socket.close();
    };
  };
  const handleOptionsChange = (testName, options) => {
    setTestOptions((prev) => ({
      ...prev,
      [testName]: { ...(prev[testName] || {}), ...options },
    }));
  };
  const handleToggleSequence = (testName, shouldAdd, flags) => {
    setRunSequence((prev) => {
      if (shouldAdd) {
        if (!prev.find((t) => t.name === testName)) {
          return [...prev, { name: testName, ...flags }];
        }
        return prev;
      }
      return prev.filter((t) => t.name !== testName);
    });
  };
  const handleOpenNoVNC = () => {
    window.open("http://localhost:7900/", "_blank");
  };

  // ---------------- ADDED: check for Personal_Access_Token secret
  async function hasGithubSecrets() {
    try {
      const res = await fetch("http://localhost:5000/api/secrets", { cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      const names = data.secrets || [];
      return names.includes("PERSONAL_ACCESS_TOKEN") && names.includes("GITHUB_USERNAME");
    } catch {
      return false;
    }
  }
  // ------------------------------------------------------------

  const handleClone = async () => {
    setLoading(true);
    setRunSequence([]);
    setTestResults({});
    setTestOptions({});
    // Check for PAT secret if privateRepo is checked
    if (privateRepo) {
      const patExists = await hasGithubSecrets();
      if (!patExists) {
        setPatPopupOpen(true);
        setPrivateRepo(false)
        setLoading(false);
        return;
      }
    }

    console.log("CLONE SUBMIT: repoUrl:", repoUrl, "privateRepo:", privateRepo);

    try {
      const res = await fetch("http://localhost:5000/api/git/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, privateRepo }),
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
      setTests([]);
    } finally {
      setLoading(false);
    }
  };
  function timestamp(line) {
    return `[${new Date().toLocaleTimeString()}] ${line}`;
  }
  // --- Streaming sequence log handler with status parsing ---
  const handleSequenceLog = (fullLog) => {
    const prev = sequenceBufferRef.current;
    const newRaw = fullLog.slice(prev.length);
    if (!newRaw) return;
    sequenceBufferRef.current = fullLog;
    const lines = newRaw.split(/\r?\n/).filter(Boolean);
    const logsAccumulator = logsAccumulatorRef.current;
    let currentTest = currentStepRef.current;
    for (const rawLine of lines) {
      const line = timestamp(rawLine);
      // Step running?
      const stepStart = line.match(/▶ Running step #\d+\s?\[(.*?)\]/);
      if (stepStart) {
        currentTest = stepStart[1];
        currentStepRef.current = currentTest;
        logsAccumulator["[SEQUENCE]"] = (logsAccumulator["[SEQUENCE]"] || "") + line + "\n";
        continue;
      }
      // Step pass:
      const stepDone = line.match(/✅ Finished step #\d+\s?\[(.*?)\]/);
      if (stepDone) {
        const testName = stepDone[1];
        logsAccumulator["[SEQUENCE]"] = (logsAccumulator["[SEQUENCE]"] || "") + line + "\n";
        currentTest = null;
        currentStepRef.current = null;
        setTestResults((prev) => ({
          ...prev,
          [testName]: {
            status: "✅ Passed",
            time: new Date().toLocaleString(),
          },
        }));
        continue;
      }
      // Step fail:
      const stepFail = line.match(/❌ Step #\d+\s?\[(.*?)\] failed:/);
      if (stepFail) {
        const testName = stepFail[1];
        setTestResults((prev) => ({
          ...prev,
          [testName]: {
            status: "❌ Failed",
            time: new Date().toLocaleString(),
          },
        }));
        continue;
      }
      // Accumulate logs per test or to [SEQUENCE]
      if (currentTest) {
        if (
          !line.includes("▶ Running step") &&
          !line.includes("✅ Finished step") &&
          !line.includes("❌ Step")
        ) {
          logsAccumulator[currentTest] = (logsAccumulator[currentTest] || "") + line + "\n";
        }
      } else {
        logsAccumulator["[SEQUENCE]"] = (logsAccumulator["[SEQUENCE]"] || "") + line + "\n";
      }
    }
    setServerSideLogs({
      ...logsAccumulator,
    });
  };
  const handleClearAllLogs = () => {
    logsAccumulatorRef.current = {};
    sequenceBufferRef.current = "";
    currentStepRef.current = null;
    setServerSideLogs({});
    setTestResults({});
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
          <PATPopup open={patPopupOpen} onClose={() => setPatPopupOpen(false)} />
          <PrivateRepoCheckbox checked={privateRepo} onChange={setPrivateRepo} />
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
            Open Selenium NoVNC
          </button>
          <button
            onClick={() => setSecretsOpen(s => !s)}
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
            {secretsOpen ? "Close Secrets" : "Open Secrets"}
          </button>
        </div>
        {secretsOpen && (
          <div style={{ margin: '32px auto', width: '700px', maxWidth: '95%' }}>
            <SecretsPanel />
          </div>
        )}
        {/* Logs Viewer */}
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
            {isServerLogExpanded
              ? "Hide Server-side Test Logs"
              : "Show Server-side Test Logs"}
          </button>
          {isServerLogExpanded && (
            <div style={{ marginTop: "20px" }}>
              {Object.entries(serverSideLogs).map(([name, log]) => (
                <LogGroup
                  key={name}
                  title={name}
                  defaultCollapsed={name !== "[SEQUENCE]"}
                >
                  <pre
                    style={{
                      margin: 0,
                      padding: 15,
                      whiteSpace: "pre-wrap",
                      fontSize: "13px",
                    }}
                  >
                    {log || "No logs yet."}
                  </pre>
                </LogGroup>
              ))}
            </div>
          )}
        </div>
        {/* Test cards */}
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
      {/* Execution sidebar */}
      <RunSequence
        sequence={runSequence.map((t) => ({
          ...t,
          ...(testOptions[t.name] || {}),
        }))}
        onTestResult={(name, options, onDone) =>
          handleRunTestViaWebSocket(name, testOptions[name], onDone)
        }
        onSequenceLog={handleSequenceLog}
        onBeforeRun={handleClearAllLogs}
      />
    </div>
  );
}