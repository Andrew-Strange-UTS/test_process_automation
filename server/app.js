const express = require("express");
const cors = require("cors");
const app = express();

const gitRoutes = require("./routes/git");

app.use(cors());
app.use(express.json());

// Git-related routes
app.use("/api/git", gitRoutes);

// Run tests 
app.use("/api/tests", require("./routes/tests"));

// Start server on port 5000
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});