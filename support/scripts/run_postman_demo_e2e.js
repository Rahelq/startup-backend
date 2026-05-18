const fs = require("fs");
const path = require("path");
const http = require("http");
const newman = require("newman");

const app = require("../../src/app");

const collectionPath = path.resolve(
  __dirname,
  "../other/StartupConnect End-to-End Demo.postman_collection.json"
);
const environmentPath = path.resolve(
  __dirname,
  "../other/StartupConnect End-to-End Demo.postman_environment.json"
);
const reportPath = path.resolve(__dirname, "../other/postman-demo-e2e-report.json");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function run() {
  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Collection not found: ${collectionPath}`);
  }
  if (!fs.existsSync(environmentPath)) {
    throw new Error(`Environment not found: ${environmentPath}`);
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const collection = loadJson(collectionPath);
    const environment = loadJson(environmentPath);

    const summary = await new Promise((resolve, reject) => {
      newman.run(
        {
          collection,
          environment,
          reporters: ["cli", "json"],
          reporter: {
            json: {
              export: reportPath,
            },
          },
          envVar: [{ key: "baseUrl", value: baseUrl }],
          timeoutRequest: 120000,
          timeoutScript: 120000,
        },
        (err, runSummary) => {
          if (err) return reject(err);
          resolve(runSummary);
        }
      );
    });

    const failureCount = summary.run.failures.length;
    console.log(
      JSON.stringify(
        {
          baseUrl,
          reportPath,
          totalRequests: summary.run.stats.requests.total,
          failedRequests: summary.run.stats.requests.failed,
          assertionsTotal: summary.run.stats.assertions.total,
          assertionsFailed: summary.run.stats.assertions.failed,
          failures: failureCount,
        },
        null,
        2
      )
    );

    if (failureCount > 0 || summary.run.stats.requests.failed > 0) {
      process.exitCode = 1;
      return;
    }

    console.log("POSTMAN_DEMO_E2E_OK");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error("POSTMAN_DEMO_E2E_FAILED", error?.message || error);
  process.exit(1);
});
