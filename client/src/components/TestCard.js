"use client";
import { useEffect, useState } from "react";

export default function TestCard({
  name,
  runContent,
  runFile = "run.js",
  metaContent,
  isInSequence = false,
  onToggleInSequence,
  onOptionsChange = () => {},
  results = {}
}) {
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isMetaExpanded, setIsMetaExpanded] = useState(false);
  const [isRunExpanded, setIsRunExpanded] = useState(false);

  const [status, setStatus] = useState("Never run");
  const [lastRun, setLastRun] = useState(null);
  const [log, setLog] = useState("No logs available yet...");

  const [visualBrowser, setVisualBrowser] = useState(false);
  const [needsOktaProd, setNeedsOktaProd] = useState(false);
  const [needsOktaTest, setNeedsOktaTest] = useState(false);

  const [manualParams, setManualParams] = useState({});

  useEffect(() => {
    if (results.status) setStatus(results.status);
    if (results.log) setLog(results.log);
    if (results.time) setLastRun(results.time);
  }, [results]);

  const parsedMetadata = (() => {
    if (!metaContent) return {};
    try {
      return JSON.parse(metaContent);
    } catch (e) {
      console.error("Invalid metadata.json:", e.message);
      return {};
    }
  })();

  const title = parsedMetadata.title || name;
  const parameterMap = parsedMetadata["needed-parameters"] || {};

  const handleAddToSequence = (e) => {
    const checked = e.target.checked;
    if (onToggleInSequence) {
      onToggleInSequence(name, checked, {
        needsOktaProd,
        needsOktaTest,
      });
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
        <h2>{title}</h2>
        <div style={{ textAlign: "right" }}>
          <div style={{ marginBottom: "10px" }}>
            <strong>Status:</strong> {status}
          </div>
          {lastRun && (
            <div>
              <strong>Last Run:</strong> {lastRun}
            </div>
          )}
        </div>
      </div>

      {/* Selections */}
      <div style={{ marginTop: "20px", display: "flex", gap: "30px", flexWrap: "wrap" }}>
        <label>
          <input
            type="checkbox"
            checked={isInSequence}
            onChange={handleAddToSequence}
          /> Add to Run Sequence
        </label>
        <label>
        <input
          type="checkbox"
          checked={visualBrowser}
          onChange={(e) => {
            const checked = e.target.checked;
            setVisualBrowser(checked);
            onOptionsChange(name, {
              visualBrowser: checked,
              needsOktaProd,
              needsOktaTest,
              parameters: manualParams
            });
          }}
        /> Enable visual browser
        </label>
        <label>
          <input
            type="checkbox"
            checked={needsOktaProd}
            onChange={(e) => {
              const checked = e.target.checked;
              setNeedsOktaProd(checked);
              if (checked) setNeedsOktaTest(false);
              onOptionsChange(name, {
                visualBrowser,
                needsOktaProd: checked,
                needsOktaTest: false,
                parameters: manualParams
              });
            }}
          /> Needs OKTA prod login
        </label>
        <label>
          <input
            type="checkbox"
            checked={needsOktaTest}
            onChange={(e) => {
              const checked = e.target.checked;
              setNeedsOktaProd(checked);
              if (checked) setNeedsOktaTest(false);
              onOptionsChange(name, {
                visualBrowser,
                needsOktaProd: checked,
                needsOktaTest: false,
                parameters: manualParams
              });
            }}
          /> Needs OKTA test login
        </label>
      </div>

      {/* Parameters */}
      {Object.entries(parameterMap).length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4 style={{ marginBottom: "10px" }}>Required Parameters:</h4>
          {Object.entries(parameterMap).map(([label, key]) => (
            <div key={key} style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", fontWeight: "bold" }}>{label}</label>
              <input
                type="text"
                value={manualParams[key] || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setManualParams((prev) => {
                    const updated = { ...prev, [key]: value };
                    onOptionsChange(name, {
                      visualBrowser,
                      needsOktaProd,
                      needsOktaTest,
                      parameters: updated
                    });
                    return updated;
                  });
                }}
                placeholder={`Enter value for ${key}`}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Metadata Viewer */}
      <div style={{ marginTop: "20px" }}>
        <button 
          onClick={() => setIsMetaExpanded((prev) => !prev)}
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            width: "200px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
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

      {/* Script Viewer */}
      <div style={{ marginTop: "20px" }}>
        <button 
          onClick={() => setIsRunExpanded((prev) => !prev)}
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            width: "200px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}         
        >
          {isRunExpanded ? `Hide ${runFile}` : `Show ${runFile}`}
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
            {runContent || `No ${runFile} found.`}
          </pre>
        )}
      </div>

      {/* Logs */}
      <div style={{ marginTop: "20px" }}>
        <button 
          onClick={() => setIsLogExpanded((prev) => !prev)}
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            width: "200px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}  
        >
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