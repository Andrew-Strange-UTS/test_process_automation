"use client";
import React from "react";

export default function RunSequence({ sequence, onTestResult }) {
  // 🧱 Build wrapped sequence by OKTA flags
  const buildWrappedSequence = () => {
    const prodOktaTests = [];
    const testOktaTests = [];
    const noOktaTests = [];

    for (const test of sequence) {
      if (test?.needsOktaProd) {
        prodOktaTests.push(test);
      } else if (test?.needsOktaTest) {
        testOktaTests.push(test);
      } else {
        noOktaTests.push(test);
      }
    }

    const wrapped = [];

    if (prodOktaTests.length > 0) {
      wrapped.push({ name: "OKTA-Prod-Login", visualBrowser: true });
      wrapped.push(...prodOktaTests);
      wrapped.push({ name: "OKTA-Prod-Login-finish", visualBrowser: true });
    }

    if (testOktaTests.length > 0) {
      wrapped.push({ name: "OKTA-Test-Login", visualBrowser: true });
      wrapped.push(...testOktaTests);
      wrapped.push({ name: "OKTA-Test-Login-finish", visualBrowser: true });
    }

    wrapped.push(...noOktaTests);

    return wrapped;
  };

  const wrappedSequence = buildWrappedSequence();

  const handleRun = async () => {
    for (const test of wrappedSequence) {
        console.log("▶ Sending test to backend:", test.name, {
            visualBrowser: test.visualBrowser,
            parameters: test.parameters,
        });
        
        const {
            name,
            visualBrowser = false,
            needsOktaProd = false,
            needsOktaTest = false,
            parameters = {},
        } = test;

      try {
        const res = await fetch(`http://localhost:5000/api/tests/${name}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visualBrowser,
            needsOktaProd,
            needsOktaTest,
            parameters,
          }),
        });

        const data = await res.json();
        console.log(`✅ ${name} => ${data.status}`);

        if (onTestResult) {
          onTestResult(name, {
            status: data.status || "✅ Passed",
            log: data.log || "",
            time: new Date().toLocaleString(),
          });
        }
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error);
        if (onTestResult) {
          onTestResult(name, {
            status: "❌ Failed",
            log: `❌ Error: ${error.message}`,
            time: new Date().toLocaleString(),
          });
        }
        break; // stop sequence on failure
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