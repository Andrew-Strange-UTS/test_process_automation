"use client";
import React, { useState } from "react";

/**
 * RunSequence component: displays the test sequence and runs them in order
 * - Skips all tests between OKTA login and finish if login fails, but always runs the finish step
 * - Disables button while running; button text is "Running..." while active
 */
export default function RunSequence({ sequence, onTestResult }) {
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

  // Main sequence runner, using onDone to ensure correct waiting
  const handleRun = async () => {
    setIsRunning(true);
    let skipUntilOktaFinish = false;

    for (const test of wrappedSequence) {
      const {
        name,
        visualBrowser = false,
        needsOktaProd = false,
        needsOktaTest = false,
        parameters = {},
      } = test;

      // Skip tests between OKTA login and finish if login failed, but never skip the finish step itself
      if (
        skipUntilOktaFinish &&
        !(name === "OKTA-Test-Login-Finish" || name === "OKTA-Prod-Login-Finish")
      ) {
        console.log(`⏭️ Skipping ${name} due to previous OKTA login failure`);
        continue;
      }

      let result = null;

      // Use a Promise and wait for the callback
      if (onTestResult) {
        await new Promise((resolve) => {
          onTestResult(
            name,
            {
              visualBrowser,
              needsOktaProd,
              needsOktaTest,
              parameters,
            },
            (res) => {
              result = res || {};
              resolve();
            }
          );
          // Fallback: just in case onDone is forgotten (should not be needed)
          setTimeout(resolve, 5 * 60 * 1000); // 5 minute fallback
        });
      }

      // If login failed, skip until finish
      if (
        (name === "OKTA-Test-Login" || name === "OKTA-Prod-Login") &&
        (!result || !result.status || !String(result.status).includes("✅"))
      ) {
        skipUntilOktaFinish = true;
        console.warn(
          `[RunSequence] ${name} failed. Skipping tests until next OKTA-Finish.`
        );
      }

      // Reset at finish steps
      if (name === "OKTA-Test-Login-Finish" || name === "OKTA-Prod-Login-Finish") {
        skipUntilOktaFinish = false;
      }
    }
    setIsRunning(false);
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