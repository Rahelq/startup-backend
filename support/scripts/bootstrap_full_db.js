const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const nodeBin = process.execPath;
const dryRun = process.argv.includes("--dry-run");
const seedDemoData = process.argv.includes("--seed") || process.env.SEED_DEMO_DATA === "true";

const steps = [
  ["support/scripts/apply_sql_file.js", ["support/other/001_init.sql"]],
  ["support/scripts/apply_sql_file.js", ["support/other/002_add_indexes.sql"]],
  ["support/scripts/migrate_phase1_foundation.js", []],
  ["support/scripts/migrate_chat_schema.js", []],
  ["support/scripts/migrate_video_sessions.js", []],
  ["support/scripts/migrate_mentorship_scheduling.js", []],
  ["support/scripts/migrate_mentor_profile.js", []],
  ["support/scripts/migrate_payments_gateway.js", []],
  ["support/scripts/migrate_ratings_feedback.js", []],
  ["support/scripts/migrate_investment_workflow.js", []],
  ["support/scripts/migrate_phase3_business_workflow.js", []],
  ["support/scripts/migrate_phase4_collaboration.js", []],
  ["support/scripts/migrate_investor_parity.js", []],
  ["support/scripts/migrate_phase5_transactions.js", []],
  ["support/scripts/migrate_phase6_experience.js", []],
  ["support/scripts/migrate_phase7a_intelligence.js", []],
  ["support/scripts/migrate_phase8_settings_security.js", []],
  ["support/scripts/setup_interaction_system.js", []],
];

if (seedDemoData) {
  steps.push(["support/scripts/seed_db.js", []]);
}

function runStep(script, args) {
  const fullPath = path.join(root, script);
  const cmdArgs = [fullPath, ...args.map((arg) => path.join(root, arg))];

  if (dryRun) {
    console.log(`${nodeBin} ${cmdArgs.map((arg) => JSON.stringify(arg)).join(" ")}`);
    return 0;
  }

  console.log(`Running ${script}...`);
  const result = spawnSync(nodeBin, cmdArgs, { stdio: "inherit" });
  return result.status ?? 1;
}

function main() {
  console.log("Bootstrap order: base schema -> indexes -> phase migrations -> optional seed");
  console.log(seedDemoData ? "Demo seeding is enabled." : "Demo seeding is disabled.");

  for (const [script, args] of steps) {
    const status = runStep(script, args);
    if (status !== 0) {
      process.exit(status);
    }
  }

  console.log("Full database bootstrap complete.");
}

main();
