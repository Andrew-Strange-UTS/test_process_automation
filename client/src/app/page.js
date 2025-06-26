"use client";
import { useState } from "react";
import TestCard from "@/components/TestCard";
import RunSequence from "@/components/RunSequence"; // 👉 new

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState({});
  const [runSequence, setRunSequence] = useState([]);

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
        const possibleFiles = ["run.js", "run.py"];
        let runFile = null,
          runContent = null;
        for (const file of possibleFiles) {
          const res = await fetch(`http://localhost:5000/api/git/${testName}/${file}`);
          if (res.ok) {
            const result = await res.json();
            runFile = file;
            runContent = result.content;
            break;
          }
        }

        let metaContent = null;
        try {
          const metaRes = await fetch(`http://localhost:5000/api/git/${testName}/metadata.json`);
          if (metaRes.ok) {
            const meta = await metaRes.json();
            metaContent = meta.content;
          }
        } catch (err) {}

        filesMap[testName] = {
          run: runContent,
          runFile,
          metadata: metaContent,
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

  const handleToggleSequence = (testName, shouldAdd, testMeta) => {
    setRunSequence((prev) => {
      if (shouldAdd) {
        // prevent duplicates
        if (prev.some((t) => t.name === testName)) return prev;
        return [...prev, { name: testName, ...testMeta }];
      } else {
        // filter safely — remove only entries with a valid name
        return prev.filter((t) => t?.name !== testName);
      }
    });
  };

  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1, padding: "20px" }}>
        <h1 style={{ textAlign: "center" }}>UTS Automation</h1>
        {/* Repo input */}
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "30px" }}>
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
            }}
          >
            🔄 Refresh Tests
          </button>
        </div>

        {!loading &&
          tests.map((testName) => (
            <TestCard
              key={testName}
              name={testName}
              runContent={files[testName]?.run}
              runFile={files[testName]?.runFile}
              metaContent={files[testName]?.metadata}
              onToggleInSequence={handleToggleSequence}
              isInSequence={runSequence.some((t) => t.name === testName)}
            />
          ))}
      </div>

      <RunSequence sequence={runSequence} />
    </div>
  );
}