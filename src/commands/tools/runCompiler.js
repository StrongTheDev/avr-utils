const {
  getWorkspaceName,
  getWorkspaceFolderPath,
} = require("../../core/workspaceManager");
const vscode = require("vscode");
const { events, ExtensionEvents } = require("../../util/events");
const path = require("path");
const {
  redundantDirectory,
  currentFileExtension,
} = require("../../util/constants");
const { getToolchainDirectory } = require("../../util/toolchain");
const { getSelectedMMCUDevice } = require("../../core/deviceManager");
const { exec } = require("child_process");
const {
  generateDiagnostics,
  clearDiagnostics,
} = require("../../providers/diagnosticsProvider");

async function compile() {
  const workspaceName = getWorkspaceName();

  try {
    await vscode.workspace.fs.stat(
      vscode.Uri.file(
        path.join(getWorkspaceFolderPath(), redundantDirectory(), "Debug")
      )
    );
  } catch (_) {
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.file(
        path.join(getWorkspaceFolderPath(), redundantDirectory(), "Debug")
      )
    );
  }
  let compilerToUse = "";
  switch (currentFileExtension()) {
    case ".cpp" || ".cxx": // c++ files
      compilerToUse = "avr-g++";
      break;
    case ".s" || ".asm": // assembly files
      compilerToUse = "avr-as";
      break;
    default: // c files
      compilerToUse = "avr-gcc";
      break;
  }

  const buildCmd = `"${path.join(
    getToolchainDirectory(),
    "bin",
    compilerToUse
  )}" ${
    compilerToUse !== "avr-as"
      ? `${
          compilerToUse === "avr-gcc" ? "-x c" : `-c -B "%GCCDEV" `
        } -mmcu=${getSelectedMMCUDevice()} `
      : ""
    // @ts-ignore
  } "${vscode.window.activeTextEditor.document.uri.fsPath}"`;
  // an object file i.e main.o
  const compileObjectFile = `${buildCmd} -o "${path.join(
    getWorkspaceFolderPath(),
    redundantDirectory(),
    "Debug",
    `main.o`
  )}"`;
  const buildElf = `${buildCmd} -o "${path.join(
    getWorkspaceFolderPath(),
    redundantDirectory(),
    "Debug",
    `${workspaceName}.elf`
  )}"`;
  const buildHex = `"${path.join(
    getToolchainDirectory(),
    "bin",
    "avr-objcopy"
  )}" -O ihex -R .eeprom -R .fuse -R .lock -R .signature -R .user_signatures "${path.join(
    getWorkspaceFolderPath(),
    redundantDirectory(),
    "Debug",
    `${workspaceName}.elf`
  )}" "${path.join(
    getWorkspaceFolderPath(),
    redundantDirectory(),
    "Debug",
    `${workspaceName}.hex`
  )}"`;

  events.emit(ExtensionEvents.COMPILATION_STARTED);
  const buildBinaries = `${compileObjectFile} && ${buildElf} && ${buildHex}`;
  exec(buildBinaries, { windowsHide: true }, (err) => {
    if (err) {
      generateDiagnostics(err.message);
      vscode.window.showErrorMessage(
        "Build Failed. Check Problems tab for possible info!"
      );
      events.emit(ExtensionEvents.COMPILATION_FAILED);
    } else {
      clearDiagnostics();
      vscode.window.showInformationMessage("Build Completed");
      events.emit(ExtensionEvents.COMPILATION_FINISHED);
    }
  });
}

module.exports = compile;
