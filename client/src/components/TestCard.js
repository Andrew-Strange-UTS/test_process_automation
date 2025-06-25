"use client";

import { useState } from "react";

export default function TestCard({ name, runContent, metaContent }) {
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isMetaExpanded, setIsMetaExpanded] = useState(false);
  const [isRunExpanded, setIsRunExpanded] = useState(false);

  const [status, setStatus] = useState("Never run");
  const [lastRun, setLastRun] = useState(null);
  const [log, setLog] = useState("No logs available yet...");

  const [visualBrowser, setVisualBrowser] = useState(false);
  const [needsOktaProd, setNeedsOktaProd] = useState(false);
  const [needsOktaTest, setNeedsOktaTest] = useState(false);

  const handleRun = async () => {
    setStatus("Running...");
    setLog("🔄 Starting test...");

    try {
      const res = await fetch(`http://localhost:5000/api/tests/${name}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualBrowser,
          needsOktaProd,
          needsOktaTest,
        }),
      });

      const data = await res.json();
      setStatus(data.status || "Completed ✅");
      setLastRun(new Date().toLocaleString());
      setLog(data.log || "✅ Completed. No log returned.");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed");
      setLog(`❌ Error running test: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        width: "1400px",
        margin: "20px auto",
        border: "1px solid #ccc",
        borderRadius: "10px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        backgroundColor: "#fff",
        transition: "all 0.3s ease",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>{name}</h2>
        <div style={{ textAlign: "right" }}>
          <button onClick={handleRun} style={{ marginBottom: "10px" }}>
            ▶ Run
          </button>
          <div>
            <strong>Status:</strong> {status}
          </div>
          {lastRun && (
            <div>
              <strong>Last Run:</strong> {lastRun}
            </div>
          )}
        </div>
      </div>

      {/* Checkboxes */}
      <div style={{ marginTop: "20px", display: "flex", gap: "30px" }}>
        <label>
          <input
            type="checkbox"
            checked={visualBrowser}
            onChange={(e) => setVisualBrowser(e.target.checked)}
          />{" "}
          Run with visual browser
        </label>
        <label>
          <input
            type="checkbox"
            checked={needsOktaProd}
            onChange={(e) => setNeedsOktaProd(e.target.checked)}
          />{" "}
          Needs OKTA prod login
        </label>
        <label>
          <input
            type="checkbox"
            checked={needsOktaTest}
            onChange={(e) => setNeedsOktaTest(e.target.checked)}
          />{" "}
          Needs OKTA test login
        </label>
      </div>

      {/* Toggle metadata.json */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={() => setIsMetaExpanded((prev) => !prev)}>
          {isMetaExpanded ? "Hide metadata.json" : "Show metadata.json"}
        </button>
        {isMetaExpanded && (
          <pre
            style={{
              marginTop: "15px",
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {metaContent || "No metadata.json found."}
          </pre>
        )}
      </div>

      {/* Toggle run.js */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={() => setIsRunExpanded((prev) => !prev)}>
          {isRunExpanded ? "Hide run.js" : "Show run.js"}
        </button>
        {isRunExpanded && (
          <pre
            style={{
              marginTop: "15px",
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {runContent || "No run.js found."}
          </pre>
        )}
      </div>

      {/* Logs */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={() => setIsLogExpanded((prev) => !prev)}>
          {isLogExpanded ? "Hide Log" : "Show Log"}
        </button>
        {isLogExpanded && (
          <pre
            style={{
              marginTop: "15px",
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {log}
          </pre>
        )}
      </div>
    </div>
  );
}