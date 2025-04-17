const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");
const {
  getSetting,
  setSetting,
  Setting,
} = require("../services/storageService");
const { execSync } = require("child_process");

function getToolchainDirectory() {
  return getSetting(
    Setting.TOOLCHAIN_DIRECTORY,
    path.join(os.homedir(), "Documents")
  );
}

function getToolchainIncludesDirectory() {
  return path.join(getToolchainDirectory(), "avr", "include");
}

/**
 * @param {string} initialDirectory This is ~\Documents by default, and it
 * represents the directory to search through to locate the
 * @returns
 */
function autoLocateToolchain(initialDirectory = null) {
  if (!initialDirectory) initialDirectory = getToolchainDirectory();
  if (fs.existsSync(path.join(initialDirectory, "AVR Utils"))) {
    initialDirectory = path.join(initialDirectory, "AVR Utils");
  }
  if (fs.existsSync(path.join(initialDirectory, "toolchain"))) {
    initialDirectory = path.join(initialDirectory, "toolchain");
  }
  return initialDirectory;
}

/**
 * @param {object} _
 * @param {boolean} [_.testExecutables] Tests if `avr-gcc` and `avr-as` work properly, to ensure the toolchain is healthy.
 * @param {string} [_.toolchainDirectory] The directory of the toolchain to test.
 * @returns {{success: boolean, message: string}} success boolean and a message
 */
function testToolchainExistence(
  { testExecutables, toolchainDirectory } = {
    testExecutables: false,
    toolchainDirectory: getToolchainDirectory(),
  }
) {
  console.log(
    "Testing toolchain existence, " +
      (testExecutables ? "together with" : "without testing") +
      " executables [avr-gcc] and [avr-as]."
  );
  //   const toolchainDirectory = getToolchainDirectory();
  let binDirectory = path.join(toolchainDirectory, "bin");
  let toolchainExists = false; // used internally in this function to check if the toolchain exists

  // Check if the toolchain directory and bin directory exist
  if (fs.existsSync(toolchainDirectory) && fs.existsSync(binDirectory)) {
    toolchainExists = true;
    if (!testExecutables)
      return {
        success: true,
        message: "Toolchain directory and toolchain/bin directory exist.",
      };
  }
  // if we reach here, first check in case there's another directory
  if (!toolchainExists) {
    const toolchainDirectory2 = autoLocateToolchain(toolchainDirectory);
    const binDirectory2 = path.join(toolchainDirectory2, "bin");
    if (fs.existsSync(toolchainDirectory2) && fs.existsSync(binDirectory2)) {
      setSetting(Setting.TOOLCHAIN_DIRECTORY, toolchainDirectory2, true);
      binDirectory = binDirectory2; // save the new bin directory in preparation for testing the executables
      if (!testExecutables) {
        return {
          success: true,
          message: "Toolchain directory and toolchain/bin directory exist.",
        };
      }
    } else {
      return {
        success: false,
        message: "Toolchain directory or toolchain/bin directory is missing.",
      };
    }
  }

  if (testExecutables) {
    // List of executables to check
    const executables = ["avr-gcc", "avr-as"];

    for (const executable of executables) {
      const executablePath = path.join(binDirectory, executable);

      // Check if the executable exists
      if (!fs.existsSync(executablePath)) {
        return {
          success: false,
          message: `Executable ${executable} is missing.`,
        };
      }

      // Test if the executable works by running a simple version command
      try {
        const output = execSync(`"${executablePath}" --version`, {
          encoding: "utf-8",
        });
        console.log(`${executable} output:\n${output}`);
      } catch (error) {
        return {
          success: false,
          message: `Executable ${executable} failed to run: ${error.message}`,
        };
      }
    }

    return {
      success: true,
      message: "Toolchain is healthy and all executables work correctly.",
    };
  }
}

async function manuallyLocateOrDownloadToolchain() {
  let checkForToolchain = await vscode.window.showErrorMessage(
    `No toolchain found at "${getToolchainDirectory()}".\nDownload a new toolchain?`,
    { modal: true },
    "Yes",
    "Locate Toolchain Directory"
  );
  if (checkForToolchain === "Yes") {
    //proceed to get toolchain
    vscode.commands.executeCommand("avr-utils.getToolchain");
    return;
  }
  if (checkForToolchain === "Locate Toolchain Directory") {
    await vscode.window.showInformationMessage(
      'Locate the avr8-gnu "toolchain" folder that contains a "bin" folder that has the avr-gcc executable.',
      {
        modal: true,
        detail:
          "If you previously downloaded it via this extension, it should still be in your Documents folder.",
      },
      "Proceed"
    );
    await locateDirectory();
  }

  async function locateDirectory() {
    let toolchain = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectMany: false,
      canSelectFolders: true,
      title: "Select a folder",
      defaultUri: vscode.Uri.file(path.join(os.homedir(), "Documents")),
      openLabel: "Select this folder",
    });
    if (toolchain) {
      const _toolchainLocation = autoLocateToolchain(toolchain[0].fsPath);
      let toolchainExists = testToolchainExistence({
        toolchainDirectory: _toolchainLocation,
      });
      if (toolchainExists) {
        setSetting(Setting.TOOLCHAIN_DIRECTORY, _toolchainLocation, true);
        vscode.window.showInformationMessage(
          `Toolchain directory set to ${_toolchainLocation}`,
          "Ok"
        );
      } else {
        let msg = await vscode.window.showErrorMessage(
          `The selected folder does not contain a valid toolchain.`,
          { modal: true },
          "Download Now",
          "Choose a different folder",
          "Cancel"
        );
        if (msg === "Download Now") {
          vscode.commands.executeCommand("avr-utils.getToolchain");
        }
        if (msg === "Choose a different folder") {
          locateDirectory();
        }
        return;
      }
    }
  }
}

module.exports = {
  getToolchainDirectory,
  getToolchainIncludesDirectory,
  testToolchainExistence,
  manuallyLocateOrDownloadToolchain,
};
