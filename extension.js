// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// eslint-disable-next-line no-unused-vars
const vscode = require("vscode");
const { init } = require("./src/init");
const registerCommands = require("./src/registerCommands");
const registerProviders = require("./src/registerProviders");
const { dataObject } = require("./src/utils");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log("Checking for data.json");
    dataObject(); // To initialize the data.json file
    console.log("Registering commands");
    registerCommands(context); // Pass context here
    console.log("Initializing other dependencies");
    init(context);
    console.log("Registering providers");
    registerProviders(context);
    console.log('"avr-utils" is now active!');
}

// This method is called when your extension is deactivated
function deactivate() {
    vscode.commands.executeCommand('setContext', 'avr-utils.isAvrC', false);
}

module.exports = {
    activate,
    deactivate,
};
