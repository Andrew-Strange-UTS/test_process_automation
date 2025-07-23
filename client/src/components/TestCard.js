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
  results = {},
}) {
  const [openViewer, setOpenViewer] = useState(null);
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

  // Parse metadata and parameter definition array
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
  const parameterArr = Array.isArray(parsedMetadata["needed-parameters"])
    ? parsedMetadata["needed-parameters"]
    : [];

  // 1. Fill manualParams with defaults on metaContent change or new param definitions
  useEffect(() => {
    if (parameterArr && parameterArr.length > 0) {
      setManualParams(prev => {
        const result = { ...prev };
        for (const param of parameterArr) {
          if (result[param.name] === undefined) {
            result[param.name] = param.default !== undefined ? param.default : "";
          }
        }
        return result;
      });
    }
    // eslint-disable-next-line
  }, [metaContent]);

  // Always keep test options in sync with parent's state
  useEffect(() => {
    onOptionsChange(name, {
      visualBrowser,
      needsOktaProd,
      needsOktaTest,
      parameters: manualParams
    })
    // eslint-disable-next-line
  }, [visualBrowser, needsOktaProd, needsOktaTest, manualParams]);

  const handleAddToSequence = (e) => {
    const checked = e.target.checked;
    if (onToggleInSequence) {
      onToggleInSequence(name, checked, {
        needsOktaProd,
        needsOktaTest,
      });
    }
  };

  // Toggle for code viewers
  const toggleRun = () => setOpenViewer(openViewer === "run" ? null : "run");
  const toggleMeta = () => setOpenViewer(openViewer === "meta" ? null : "meta");

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
            }}
          /> Needs OKTA prod login
        </label>
        <label>
          <input
            type="checkbox"
            checked={needsOktaTest}
            onChange={(e) => {
              const checked = e.target.checked;
              setNeedsOktaTest(checked);
              if (checked) setNeedsOktaProd(false);
            }}
          /> Needs OKTA test login
        </label>
      </div>
      {/* Parameter entry */}
      {parameterArr.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4 style={{ marginBottom: "10px" }}>Required Parameters:</h4>
          {parameterArr.map(field => (
            <div key={field.name} style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", fontWeight: "bold" }}>
                {field.label || field.name}
              </label>
              <input
                type="text"
                value={manualParams[field.name] ?? field.default ?? ""}
                onChange={e => {
                  const value = e.target.value;
                  setManualParams((prev) => ({
                    ...prev,
                    [field.name]: value,
                  }));
                }}
                placeholder={field.default ?? ""}
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
      {/* Code viewers: run.js & metadata.json */}
      <div style={{ marginTop: "20px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <div>
          <button
            onClick={toggleRun}
            style={{
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
            {openViewer === "run" ? `Hide ${runFile}` : `Show ${runFile}`}
          </button>
        </div>
        <div>
          <button
            onClick={toggleMeta}
            style={{
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
            {openViewer === "meta" ? "Hide metadata.json" : "Show metadata.json"}
          </button>
        </div>
      </div>
      {openViewer === "run" && (
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
      {openViewer === "meta" && (
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
      {/* Logs status only (no log button/viewer) */}
    </div>
  );
}