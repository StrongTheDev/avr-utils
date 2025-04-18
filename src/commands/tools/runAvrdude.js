const { spawn } = require("child_process");
const vscode = require("vscode");

/**
 * @param {string} avrdudePath
 * @param {readonly string[] | any[]} args
 * @param {boolean} useSystemAvrdude
 */
function runAvrdude(avrdudePath, args, useSystemAvrdude) {
  return new Promise((resolve, reject) => {
    const process = spawn(avrdudePath, args, {
      shell: useSystemAvrdude,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      output += data.toString();
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      const isSuccess =
        code === 0 ||
        output.includes("avrdude done.  Thank you.") ||
        output.includes("bytes of flash verified");

      if (isSuccess) {
        resolve({
          output: output,
          errorOutput: errorOutput,
          exitCode: code,
        });
      } else {
        const errorMsg =
          errorOutput ||
          `avrdude failed with exit code ${code}. No specific error message available.`;
        reject(new Error(errorMsg));
      }
    });

    process.on("error", (error) => {
      if (useSystemAvrdude && error.name === "ENOENT") {
        reject(new Error("avrdude not found in system PATH"));
      } else {
        reject(new Error(`avrdude execution error: ${error.message}`));
      }
    });
  });
}

module.exports = runAvrdude