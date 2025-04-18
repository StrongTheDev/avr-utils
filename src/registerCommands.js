const vscode = require("vscode");
const compileProject = require("./commands/build/compile");
const getToolchain = require("./commands/tools/getToolchain");
const createProject = require("./commands/project/create");
const openMicrochipStudioProject = require("./commands/project/open");
const {
  uploadToMicrocontroller,
} = require("./commands/build/upload");
const { openSerialMonitor } = require("./commands/device/serialMonitor");
const { selectDevice } = require("./commands/device/select");
const { events, ExtensionEvents } = require("./util/events");

function registerCommands() {
  vscode.commands.registerTextEditorCommand("avr-utils.compileProject", compileProject);
  vscode.commands.registerCommand("avr-utils.getToolchain", getToolchain);
  vscode.commands.registerCommand("avr-utils.createProject", createProject);
  vscode.commands.registerTextEditorCommand("avr-utils.selectDevice", selectDevice);
  vscode.commands.registerCommand(
    "avr-utils.openMicrochipStudioProject",
    openMicrochipStudioProject
  );
  vscode.commands.registerTextEditorCommand(
    "avr-utils.uploadToMicrocontroller",
    () => uploadToMicrocontroller() 
  );
  vscode.commands.registerTextEditorCommand(
    "avr-utils.uploadToMicrocontroller.alt",
    () => {uploadToMicrocontroller(true)} // true for prompting user input first
  );
  vscode.commands.registerTextEditorCommand(
    "avr-utils.openSerialMonitor",
    openSerialMonitor
  );
};

events.on(ExtensionEvents.EXTENSION_ACTIVATED, registerCommands);

// module.exports = registerCommands