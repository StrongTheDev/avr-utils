/**
 * This file is for the extension's settings management.
 * It provides functions to set and get settings using the VSCode API.
 */

const vscode = require("vscode");

/**
 * @param {string} key
 * @param {any} value
 */
function setSetting(key, value, global = false) {
  // Access the configuration for your extension
  const config = vscode.workspace.getConfiguration("avr-utils");
  // Update the setting
  config.update(key, value, global ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.WorkspaceFolder).then(
    () => {
      console.log(`Setting "${key}" updated to:`, value);
    },
    (err) => {
      console.error(`Failed to update setting "${key}":`, err);
    }
  );
}

/**
 * @param {string} key
 * @param {any} defaultValue
 */
function getSetting(key, defaultValue = undefined) {
  // Access the configuration for your extension
  const config = vscode.workspace.getConfiguration("avr-utils");

  // Retrieve the setting
  return config.get(key, defaultValue);
}

///////////////////////////
// Enum Of Keys to store //
///////////////////////////

class Setting {
  static TOOLCHAIN_DIRECTORY = "toolchain.path";

  static EXTENSION_ROOT_PATH = "extensionRootPath";
}

// Exports
module.exports = {
  setSetting,
  getSetting,
  Setting
};