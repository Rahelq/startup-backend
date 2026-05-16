const { spawn } = require("child_process");
const path = require("path");

jest.setTimeout(300000);

test("E2E platform flow smoke runner completes successfully", () => {
  return new Promise((resolve, reject) => {
    const script = path.resolve(
      __dirname,
      "../../support/scripts/test_end_to_end_platform_flow.js"
    );
    const child = spawn(process.execPath, [script], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      process.stderr.write(d);
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      try {
        if (code !== 0) {
          const err = new Error(
            `E2E script exited with code ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
          );
          return reject(err);
        }
        if (!stdout.includes("E2E_PLATFORM_FLOW_OK")) {
          const err = new Error(
            `E2E success marker missing\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
          );
          return reject(err);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
});
