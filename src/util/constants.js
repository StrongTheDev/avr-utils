const path = require("path");
const vscode = require("vscode");
const fs = require("fs");
const {
  getWorkspaceFolderPath,
  getWorkspaceName,
} = require("../core/workspaceManager");
const { getExtensionRootPath } = require("./fileSystem");

/** Just a utility function to handle redundancy of Microchip/Atmel Studio redundant folders */
function redundantDirectory() {
  let dir = "";
  if (fs.existsSync(path.join(getWorkspaceFolderPath(), getWorkspaceName()))) {
    dir = getWorkspaceName();
  }
  return dir;
}

const currentFileExtension = () =>
  path.extname(vscode.window.activeTextEditor.document.fileName);

/** @type {Map<string, import('vscode').Location[]>} */
let previousPINDefinitions = new Map();

function devicesAndHeaderFiles() {
  let device_and_file = JSON.parse(
    fs.readFileSync(
      path.join(getExtensionRootPath(), "storage", "device_and_file.json"),
      "utf8"
    )
  );
  return device_and_file;
}

function fullMMCUDeviceList() {
  return Object.keys(devicesAndHeaderFiles());
}

/**
 * 
 * @param {vscode.Position} pos 
 */
function sendCursorTo(pos){
    vscode.window.activeTextEditor.selection = new vscode.Selection(pos,pos);
}

module.exports = {
  // avrDudeSource,
  redundantDirectory,
  currentFileExtension,
  previousPINDefinitions,
  devicesAndHeaderFiles,
  fullMMCUDeviceList,
  sendCursorTo,
};
