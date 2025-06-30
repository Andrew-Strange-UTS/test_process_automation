// RunSequence.js
"use client";
import React from "react";

export default function RunSequence({ sequence, onTestResult }) {
  // 🧱 Build full test sequence (wrap with OKTA login if needed)
  const buildWrappedSequence = () => {
    const wrapped = [];
    const prodOktaTests = sequence.filter((t) => t?.needsOktaProd);
    const testOktaTests = sequence.filter((t) => t?.needsOktaTest);
    const noOktaTests = sequence.filter(
      (t) => !t?.needsOktaProd && !t?.needsOktaTest
    );

    if (prodOktaTests.length > 0) {
      wrapped.push({ name: "OKTA-Prod-Login", visualBrowser: true });
      wrapped.push(...prodOktaTests);
      wrapped.push({ name: "OKTA-Prod-Login-Finish", visualBrowser: true });
    }

    if (testOktaTests.length > 0) {
      wrapped.push({ name: "OKTA-Test-Login", visualBrowser: true });
      wrapped.push(...testOktaTests);
      wrapped.push({ name: "OKTA-Test-Login-Finish", visualBrowser: true });
    }

    wrapped.push(...noOktaTests);
    return wrapped;
  };

  const wrappedSequence = buildWrappedSequence();

  const handleRun = async () => {
    for (const test of wrappedSequence) {
      const {
        name,
        visualBrowser = false,
        needsOktaProd = false,
        needsOktaTest = false,
        parameters = {},
      } = test;

      console.log("▶ Starting test over WebSocket:", name);

      if (onTestResult) {
        // Start test via WebSocket runner (from page.js)
        await new Promise((resolve) => {
          onTestResult(name, {
            visualBrowser,
            needsOktaProd,
            needsOktaTest,
            parameters,
            onDone: resolve, // optional if page.js supports callback
          });

          // Delay between tests to avoid race conditions (can be removed if callbacks used)
          setTimeout(resolve, 500); // fallback in case onDone isn't handled
        });
      }
    }
  };

  return (
    <div
      style={{
        width: "300px",
        background: "#f7f7f7",
        borderLeft: "1px solid #ccc",
        padding: "20px",
        height: "100vh",
        overflowY: "auto",
        position: "sticky",
        top: 0,
      }}
    >
      <h3>📋 Run Sequence</h3>
      <ol style={{ paddingLeft: 20 }}>
        {wrappedSequence.map((test, i) => (
          <li key={i} style={{ marginBottom: "8px" }}>
            {test.name}
            {test.visualBrowser && (
              <span style={{ color: "#0070f3", marginLeft: "6px" }}>👁</span>
            )}
          </li>
        ))}
      </ol>
      {wrappedSequence.length > 0 && (
        <button
          onClick={handleRun}
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            width: "100%",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ▶ Run Sequence
        </button>
      )}
    </div>
  );
}