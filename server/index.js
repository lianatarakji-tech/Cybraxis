const express = require("express");
const cors = require("cors");
require("dotenv").config();

const healthRoutes = require("./routes/healthRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const eventRoutes = require("./routes/eventRoutes");
const stageResultRoutes = require("./routes/stageResultRoutes");
const reportRoutes = require("./routes/reportRoutes");
const profileRoutes = require("./routes/profileRoutes");
const actionRoutes = require("./routes/actionRoutes");
const stageCompletionRoutes = require("./routes/stageCompletionRoutes");
const consequenceRoutes = require("./routes/consequenceRoutes");
const runtimeStateRoutes = require("./routes/runtimeStateRoutes");
const timeoutRoutes = require("./routes/timeoutRoutes");
const scenarioRoutes = require("./routes/scenarioRoutes");
const aiTestRoutes = require("./routes/aiTestRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    service: "cybraxis-api",
    status: "running",
    message: "Welcome to the Cybraxis backend API",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api", eventRoutes);
app.use("/api", stageResultRoutes);
app.use("/api", reportRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", actionRoutes);
app.use("/api", stageCompletionRoutes);
app.use("/api", consequenceRoutes);
app.use("/api", runtimeStateRoutes);
app.use("/api", timeoutRoutes);
app.use("/api", scenarioRoutes);
app.use("/api/ai-test", aiTestRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(err.statusCode || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Cybraxis backend running on http://localhost:${PORT}`);
});