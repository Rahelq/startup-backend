const fs = require("fs").promises;
const path = require("path");
const pool = require("../config/db");

async function runSqlFile(filePath) {
  const sql = await fs.readFile(filePath, "utf8");
  try {
    await pool.query(sql);
    console.log("SQL file applied:", filePath);
  } catch (err) {
    console.error("Failed applying SQL file:", err.message || err);
    throw err;
  }
}

async function main() {
  const p = process.argv[2] || path.resolve(process.cwd(), "support/other/002_add_indexes.sql");
  await runSqlFile(p);
  await pool.end();
}

main().catch((err) => {
  console.error("apply_sql_file failed", err.message || err);
  process.exit(1);
});
