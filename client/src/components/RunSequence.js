"use client";
import React, { useState } from "react";

export default function RunSequence({
  sequence,
  onTestResult,
  onSequenceLog,
  onBeforeRun, // <== NEW prop!
}) {
  const [isRunning, setIsRunning] = useState(false);

  // Construct full sequence with OKTA bookends if needed
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

  // Sequence runner
  const handleRun = async () => {
    if (onBeforeRun) onBeforeRun(); // <== Clear logs BEFORE anything starts!!
    setIsRunning(true);

    // Prepare backend payload for sequence
    const simpleSeq = wrappedSequence.map((step) => ({
      name: step.name,
      // you can add parameters/options per test if needed
    }));
    const allParameters = {};
    const response = await fetch("http://localhost:5000/api/sequence/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sequence: simpleSeq,
        parameters: allParameters,
      }),
    });
    if (!response.body) {
      setIsRunning(false);
      return;
    }
    const reader = response.body.getReader();
    let fullText = "";
    function read() {
      reader.read().then(({ done, value }) => {
        if (done) {
          setIsRunning(false);
          return;
        }
        const chunk = new TextDecoder().decode(value);
        fullText += chunk;
        if (onSequenceLog) onSequenceLog(fullText);
        read();
      });
    }
    read();
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
          disabled={isRunning}
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            background: isRunning ? "#aaa" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            width: "100%",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: isRunning ? "not-allowed" : "pointer",
            opacity: isRunning ? 0.75 : 1,
          }}
        >
          {isRunning ? "Running..." : "▶ Run Sequence"}
        </button>
      )}
    </div>
  );
}