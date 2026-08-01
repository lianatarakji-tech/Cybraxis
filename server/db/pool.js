const path = require("path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

const dbPassword = process.env.DB_PASSWORD;

if (typeof dbPassword !== "string" || dbPassword.length === 0) {
  console.warn(
    "Cybraxis backend DB warning: DB_PASSWORD is missing or empty. Check server/.env."
  );
}

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "cybraxis",
  user: process.env.DB_USER || "postgres",
  password: typeof dbPassword === "string" ? dbPassword : "",
});

module.exports = pool;
