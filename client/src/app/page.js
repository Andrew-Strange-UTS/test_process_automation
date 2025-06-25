"use client";

import { useState } from "react";
import TestCard from "@/components/TestCard";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState({});

  const handleClone = async () => {
    setLoading(true);
    try {
      await fetch("http://localhost:5000/api/git/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      const res = await fetch("http://localhost:5000/api/git/list");
      const data = await res.json();
      setTests(data);
      const filesMap = {};

      for (const testName of data) {
        const runRes = await fetch(`http://localhost:5000/api/git/${testName}/run.js`);
        const metaRes = await fetch(`http://localhost:5000/api/git/${testName}/metadata.json`);
        const run = await runRes.json();
        const meta = await metaRes.json();

        filesMap[testName] = {
          run: run.content,
          metadata: meta.content,
        };
      }

      setFiles(filesMap);
    } catch (err) {
      console.error("Error loading tests", err);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>UTS Automation</h1>

      {/* Input row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
      </div>

      {/* Show either test cards or placeholder */}
      {loading ? (
        <p style={{ textAlign: "center", fontStyle: "italic" }}>Loading tests...</p>
      ) : tests.length === 0 ? (
        // ⬛ No Tests Loaded Card
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
        // ✅ Loaded test cards
        tests.map((testName) => (
          <TestCard
            key={testName}
            name={testName}
            runContent={files[testName]?.run}
            metaContent={files[testName]?.metadata}
          />
        ))
      )}
    </div>
  );
}