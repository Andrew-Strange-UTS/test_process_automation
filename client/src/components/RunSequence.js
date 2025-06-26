"use client";
import React from "react";

export default function RunSequence({ sequence }) {
  // ✅ Group tests by OKTA type
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
      wrapped.push({ name: "OKTA-Prod-Login" });
      wrapped.push(...prodOktaTests);
      wrapped.push({ name: "OKTA-Prod-Login-finish" });
    }

    if (testOktaTests.length > 0) {
      wrapped.push({ name: "OKTA-Test-Login" });
      wrapped.push(...testOktaTests);
      wrapped.push({ name: "OKTA-Test-Login-finish" });
    }

    wrapped.push(...noOktaTests);

    return wrapped;
  };

  const wrappedSequence = buildWrappedSequence();

  const handleRun = async () => {
    for (const t of wrappedSequence) {
      try {
        const res = await fetch(`http://localhost:5000/api/tests/${t.name}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visualBrowser: true,
            needsOktaProd: t.needsOktaProd || false,
            needsOktaTest: t.needsOktaTest || false,
          }),
        });

        const data = await res.json();
        console.log(`${t.name} => ${data.status}`);
      } catch (err) {
        console.error(`❌ ${t.name} failed`, err);
        break;
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