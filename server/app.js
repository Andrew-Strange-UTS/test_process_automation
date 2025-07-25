// server/app.js

const express = require("express");
const http = require("http");
const cors = require("cors");
const { setupWebSocket } = require("./ws");

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Routes
const gitRoutes = require("./routes/git");
const streamRoutes = require("./routes/stream");
const testsRoutes = require("./routes/tests");
const sequenceRoutes = require("./routes/sequence");
const secretsRoutes = require("./routes/secrets");

app.use("/api/git", gitRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/sequence", sequenceRoutes);
app.use("/api/secrets", secretsRoutes);

// Create HTTP server
const server = http.createServer(app);

// 🔌 Attach WebSocket server
setupWebSocket(server);

// Export the ready server to be run by index.js
module.exports = server;