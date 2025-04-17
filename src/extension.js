// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// eslint-disable-next-line no-unused-vars
require("./registerCommands");

const vscode = require("vscode");
const { events, ExtensionEvents } = require("./util/events");
// const { extensionDataStorageObject } = require("./util/fileSystem");
const path = require("path");
// load these first so that their listeners are registered
const _storageService = require("./services/storageService");
_storageService.setSetting(
  _storageService.Setting.EXTENSION_ROOT_PATH,
  path.dirname(__filename),
  true
);

const _contextManager = require("./core/contextManager");
const _workspaceManager = require("./core/workspaceManager");
const _deviceManager = require("./core/deviceManager");
const _ = require("./ui/statusBar");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
  console.log(
    _storageService.getSetting(_storageService.Setting.TOOLCHAIN_DIRECTORY)
  );
  events.emit(ExtensionEvents.EXTENSION_CONTEXT, context);
  events.emit(ExtensionEvents.IS_AVRC_CONTEXT, true);

  vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    const contextActive =
      editor &&
      (editor.document.languageId === "avr-c" ||
        editor.document.languageId === "asm");
    await vscode.commands.executeCommand(
      "setContext",
      "avr-utils.contextActive",
      contextActive
    );
    events.emit(ExtensionEvents.IS_AVRC_CONTEXT, contextActive);
  });

  // Register commands
  console.log("Registering commands");

  events.emit(ExtensionEvents.EXTENSION_ACTIVATED);
  console.log('"avr-utils" is now active!');
}

// This method is called when your extension is deactivated
function deactivate() {
  events.emit(ExtensionEvents.EXTENSION_DEACTIVATED);
  vscode.commands.executeCommand(
    "setContext",
    "avr-utils.contextActive",
    false
  );
}

module.exports = {
  activate,
  deactivate,
};
