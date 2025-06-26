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
      // Clone repo
      await fetch("http://localhost:5000/api/git/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      // Fetch available tests
      const res = await fetch("http://localhost:5000/api/git/list");
      const data = await res.json();
      setTests(data);

      const filesMap = {};

      for (const testName of data) {
        // Try to get run.py or run.js (in order)
        const possibleFiles = ["run.js", "run.py"];
        let runFile = null;
        let runContent = null;

        for (const file of possibleFiles) {
          const res = await fetch(`http://localhost:5000/api/git/${testName}/${file}`);
          if (res.ok) {
            const result = await res.json();
            runFile = file;
            runContent = result.content;
            break;
          }
        }

        // Get metadata.json if available
        let metaContent = null;
        try {
          const metaRes = await fetch(`http://localhost:5000/api/git/${testName}/metadata.json`);
          if (metaRes.ok) {
            const meta = await metaRes.json();
            metaContent = meta.content;
          }
        } catch (err) {
          console.warn(`No metadata for ${testName}`);
        }

        filesMap[testName] = {
          run: runContent,
          runFile, // js or py
          metadata: metaContent,
        };
      }

      setFiles(filesMap);
    } catch (err) {
      console.error("Error loading tests:", err);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>UTS Automation</h1>

      {/* Repo input */}
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

      {/* Display tests */}
      {loading ? (
        <p style={{ textAlign: "center", fontStyle: "italic" }}>Loading tests...</p>
      ) : tests.length === 0 ? (
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
        tests.map((testName) => (
          <TestCard
            key={testName}
            name={testName}
            runContent={files[testName]?.run}
            runFile={files[testName]?.runFile}
            metaContent={files[testName]?.metadata}
          />
        ))
      )}
    </div>
  );
}