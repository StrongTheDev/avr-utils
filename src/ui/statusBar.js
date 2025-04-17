// status bar items
const vscode = require("vscode");
const { events, ExtensionEvents } = require("../util/events");
const { getSelectedMMCUDevice } = require("../core/deviceManager");

const buildButton = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  2
);
const selectDeviceButton = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  1
);

function buildUp() {
  buildButton.text = `$(debug-start) Build`;
  buildButton.tooltip = "Compile the code for the selected device";
  buildButton.command = "avr-utils.compileProject";

  selectDeviceButton.text = "Select Device";
  selectDeviceButton.tooltip = "Select a device to compile for";
  selectDeviceButton.command = "avr-utils.selectDevice";

  buildButton.show();
  selectDeviceButton.show();

  update();
}

/**
 * @param {boolean} isAvrcContext - Boolean indicating if the context is avr-c or asm
 */
function showOrHideStatusBarUI(isAvrcContext) {
  if (isAvrcContext) {
    buildButton.show();
    selectDeviceButton.show();
  } else {
    buildButton.hide();
    selectDeviceButton.hide();
  }
}

function update() {
  checkForDevice();

  function checkForDevice() {
    const device = getSelectedMMCUDevice();
    if (device) {
      selectDeviceButton.text = device;
      selectDeviceButton.tooltip = `Compiling for ${device}`;
    }
  }

  events.on(ExtensionEvents.DEVICE_SELECTED, checkForDevice);
}

function cleanup() {
  buildButton.dispose();
  selectDeviceButton.dispose();
}

events.on(ExtensionEvents.EXTENSION_ACTIVATED, buildUp);
events.on(ExtensionEvents.EXTENSION_DEACTIVATED, cleanup);
events.on(ExtensionEvents.IS_AVRC_CONTEXT, showOrHideStatusBarUI);
events.on(ExtensionEvents.COMPILATION_STARTED, () => {
  buildButton.text = `$(sync~spin) Building...`;
});
events.on(ExtensionEvents.COMPILATION_FAILED, () => {
  buildButton.text = `$(close) Build Failed`;
});
events.on(ExtensionEvents.COMPILATION_FINISHED, () => {
  buildButton.text = `$(debug-start) Build`;
});
