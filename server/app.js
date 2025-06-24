const express = require("express");
const app = express();
const cors = require("cors");
const testRoutes = require("./routes/tests");

app.use(cors());
app.use(express.json()); // for parsing JSON bodies
app.use("/api/tests", testRoutes); // 👈 make all test routes available

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});