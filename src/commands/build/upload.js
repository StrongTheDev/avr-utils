const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const { getToolchainDirectory } = require("../../util/toolchain");
const {
  executedWithinWorkspace,
  getWorkspaceFolderPath,
  getWorkspaceName,
} = require("../../core/workspaceManager");
const {
  loadProjectConfig,
  saveOrUpdateProjectConfig,
  ProjectSettings,
} = require("../../util/fileSystem");
const getAvrdude = require("../tools/getAvrdude");
const runAvrdude = require("../tools/runAvrdude");
const { spawn } = require("child_process");

/**
 * @param {ProjectSettings} projectConfig
 * @param {string} hexFilePath
 */
async function uploadWithSavedSettings(projectConfig, hexFilePath) {
  if (!projectConfig.uploadSettings) return false;
  let programmer = projectConfig.uploadSettings.programmer;
  let port = projectConfig.uploadSettings.port;

  // If programmer is missing, cannot proceed
  if (!programmer) return false;

  // If programmer requires port and port is missing, cannot proceed
  if (programmer !== "usbasp" && !port) return false;

  await doUpload(hexFilePath, projectConfig);
  return true;
}

/**
 * @param {ProjectSettings} projectConfig
 * @param {string} hexFilePath
 */
async function promptAndSaveUploadSettings(projectConfig, hexFilePath) {
  let programmer = await getProgrammer(
    projectConfig.uploadSettings
      ? projectConfig.uploadSettings.programmer
      : null
  );
  if (!programmer) return;

  let port = undefined;
  if (programmer !== "usbasp") {
    port = await getPort(
      projectConfig.uploadSettings ? projectConfig.uploadSettings.port : null
    );
    if (!port) return;
  }

  projectConfig = saveOrUpdateProjectConfig({
    uploadSettings: {
      programmer,
      ...(port && { port }),
    },
  });

  await doUpload(hexFilePath, projectConfig);
}

async function uploadToMicrocontroller(withPrompt = false) {
  try {
    if (!executedWithinWorkspace()) return;
    await vscode.commands.executeCommand("avr-utils.compileProject");

    const workspacePath = getWorkspaceFolderPath();
    const projectName = getWorkspaceName();
    const hexFilePath = path.join(workspacePath, "Debug", `${projectName}.hex`);

    if (!fs.existsSync(hexFilePath)) {
      vscode.window.showErrorMessage(
        `Compiled hex file not found at ${hexFilePath}. Please compile the project first.`
      );
      return;
    }

    let projectConfig = loadProjectConfig();

    while (!projectConfig.mcu) {
      const option = await vscode.window.showWarningMessage(
        "No microcontroller selected. Please select a microcontroller To continue.",
        "Select",
        "Cancel"
      );
      if (option === "Cancel") return;
      await vscode.commands.executeCommand("avr-utils.selectDevice");
      projectConfig = loadProjectConfig();
    }

    if (withPrompt) {
      await promptAndSaveUploadSettings(projectConfig, hexFilePath);
      return;
    }
    // Try immediate upload with saved settings
    const didUpload = await uploadWithSavedSettings(projectConfig, hexFilePath);
    if (!didUpload) {
      // Prompt user for settings, save, and upload
      await promptAndSaveUploadSettings(projectConfig, hexFilePath);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error.message}`);
    console.error("Unexpected error:", error);
  }
}

/**
 * @param {any} hexFilePath
 * @param {ProjectSettings} savedSettings
 */
async function doUpload(hexFilePath, savedSettings) {
  let { programmer, port } = savedSettings.uploadSettings;
  try {
    let avrdudePath = path.join(getToolchainDirectory(), "bin", "avrdude");
    let useSystemAvrdude = false;

    const exists = spawn(avrdudePath, ["-v"]);
    exists.on("error", async () => {
      const action = await vscode.window.showWarningMessage(
        `avrdude not found at ${avrdudePath}.`,
        "Download avrdude",
        "Try System avrdude",
        "Cancel"
      );

      if (action === "Download avrdude") {
        await getAvrdude();
        const e = spawn(avrdudePath, ["-v"]);
        e.on("error", (err) => {
          throw new Error(`avrdude installation failed: ${err.message}`);
        });
      } else if (action === "Try System avrdude") {
        useSystemAvrdude = true;
        avrdudePath = "avrdude";
      } else {
        return;
      }
    });

    let args = ["-c", programmer, "-p", savedSettings.mcu];
    if (programmer !== "usbasp" && port) {
      args.push("-P", port);
    }

    const fuseSettings = savedSettings.uploadSettings.fuse || {};
    const defaultFuses =
      programmer === "usbasp" && savedSettings.mcu === "atmega16"
        ? {
            lfuse: "0xE4",
            hfuse: "0x99",
          }
        : {};
    const fuses = {
      ...defaultFuses,
      ...(savedSettings.uploadSettings.fuse ||
        fuseSettings[savedSettings.mcu] ||
        {}),
    };

    if (fuses.lfuse) args.push("-U", `lfuse:w:${fuses.lfuse}:m`);
    if (fuses.hfuse) args.push("-U", `hfuse:w:${fuses.hfuse}:m`);
    if (fuses.efuse) args.push("-U", `efuse:w:${fuses.efuse}:m`);
    args.push(
      "-U",
      `flash:w:${hexFilePath}:i`,
      "-U",
      `flash:v:${hexFilePath}:i`
    );

    console.log(`Executing: ${avrdudePath} ${args.join(" ")}`);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Uploading to AVR Microcontroller...",
        cancellable: false,
      },
      async () => {
        try {
          const result = await runAvrdude(avrdudePath, args, useSystemAvrdude);
          vscode.window.showInformationMessage("Upload successful!");
          console.log("Upload details:", {
            output: result.output,
            errorOutput: result.errorOutput,
            exitCode: result.exitCode,
          });
        } catch (error) {
          vscode.window.showErrorMessage(`Upload failed: ${error.message}`);
          console.error("Upload error:", error.message);
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error.message}`);
    console.error("Unexpected error:", error);
  }
}

/**
 * @param {string} savedProgrammer
 */
async function getProgrammer(savedProgrammer) {
  const defaultProgrammer = savedProgrammer || "usbasp";
  const programmers = [
    { label: "usbasp", description: "USBasp - Common USB programmer" },
    { label: "avrisp2", description: "AVR ISP mkII" },
    { label: "arduino", description: "Arduino as ISP" },
    { label: "usbtiny", description: "USBtiny programmer" },
    { label: "Custom...", description: "Enter custom programmer" },
  ];

  const selected = await vscode.window.showQuickPick(programmers, {
    placeHolder: defaultProgrammer,
    title: "Select Programmer Type",
  });

  return selected?.label === "Custom..."
    ? await vscode.window.showInputBox({
        prompt: "Enter custom programmer",
        placeHolder: defaultProgrammer,
      })
    : selected?.label;
}

/**
 * @param {string} savedPort
 */
async function getPort(savedPort) {
  const defaultPort =
    savedPort || (process.platform === "win32" ? "COM3" : "/dev/ttyUSB0");
  const ports = [
    { label: "COM3", description: "Windows port" },
    { label: "COM4", description: "Windows port" },
    { label: "/dev/ttyUSB0", description: "Linux/Mac USB port" },
    { label: "/dev/ttyACM0", description: "Linux/Mac USB port" },
    { label: "Custom...", description: "Enter custom port" },
  ];

  const selected = await vscode.window.showQuickPick(ports, {
    placeHolder: defaultPort,
    title: "Select Port",
  });

  return selected?.label === "Custom..."
    ? await vscode.window.showInputBox({
        prompt: "Enter custom port",
        placeHolder: defaultPort,
      })
    : selected?.label;
}

module.exports = { uploadToMicrocontroller };
