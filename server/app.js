const express = require("express");
const cors = require("cors");
const app = express();

const gitRoutes = require("./routes/git");

// ✅ Proper CORS setup
app.use(cors({
  origin: "http://localhost:3000",       // Replace with your frontend host
  methods: ["GET", "POST"],
  credentials: false,
  allowedHeaders: ["Content-Type"],      // Explicit headers if needed
}));

app.use(express.json());

// Routes
app.use("/api/git", gitRoutes);
app.use("/api/tests", require("./routes/tests"));
app.use("/api/stream", require("./routes/stream"));

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});