"use client";

import { useEffect, useState } from "react";
import TestCard from "@/components/TestCard";

export default function HomePage() {
  const [testFolders, setTestFolders] = useState([]);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/tests");
        const data = await res.json();
        setTestFolders(data);
      } catch (error) {
        console.error("Error fetching test folders:", error);
      }
    };

    fetchTests();
  }, []);

  return (
    <main>
      <h1 style={{ textAlign: "center", marginTop: "30px" }}>Available Tests</h1>
      {testFolders.length === 0 ? (
        <p style={{ textAlign: "center" }}>Loading tests or none found...</p>
      ) : (
        testFolders.map((folder) => (
          <TestCard key={folder} name={folder} />
        ))
      )}
    </main>
  );
}