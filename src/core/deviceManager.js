const { events, ExtensionEvents } = require("../util/events");
const { processWorkspaceChange } = require("./workspaceManager");

/**
 * @type {string | undefined} The selected device. This is set when the user selects a device from the list.
 */
let selectedMMCUDevice = undefined;
const getSelectedMMCUDevice = () => selectedMMCUDevice;

events.on(ExtensionEvents.DEVICE_SELECTED, (device, _isAssembly) => {
  selectedMMCUDevice = device;
});

events.on(ExtensionEvents.EXTENSION_ACTIVATED, () => {
  processWorkspaceChange();
});

module.exports = {
  getSelectedMMCUDevice,
};
