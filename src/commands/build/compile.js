const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  currentFileExtension,
  redundantDirectory,
} = require("../../util/constants");
// const { extensionDataStorageObject } = require("../../util/fileSystem");
const {
  getWorkspaceName,
  getWorkspaceFolderPath,
  executedWithinWorkspace,
} = require("../../core/workspaceManager");
const {
  resetIncludeDirectory,
} = require("../../providers/documentLinkProvider");
const { getSelectedMMCUDevice } = require("../../core/deviceManager");
const {
  getToolchainDirectory,
  testToolchainExistence,
  manuallyLocateOrDownloadToolchain,
} = require("../../util/toolchain");
const {
  generateDiagnostics,
  clearDiagnostics,
} = require("../../providers/diagnosticsProvider");
const { events, ExtensionEvents } = require("../../util/events");
const runCompiler = require("../tools/runCompiler");

async function compileProject() {
  if (!executedWithinWorkspace()) return;
  if (currentFileExtension() == ".h") return;
  vscode.workspace.saveAll();

  if (!testToolchainExistence().success) {
    manuallyLocateOrDownloadToolchain();
    resetIncludeDirectory();
    return;
  }
  if (!getSelectedMMCUDevice() && currentFileExtension() === ".c") {
    vscode.window.showErrorMessage("Please select a device first");
    return;
  }

  await runCompiler();
}

// compilations


module.exports = compileProject;
