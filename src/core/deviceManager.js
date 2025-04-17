const { getSetting, Setting } = require("../services/storageService");
const { events, ExtensionEvents } = require("../util/events");


let selectedMMCUDevice = undefined;
const getSelectedMMCUDevice = () => selectedMMCUDevice;

events.on(ExtensionEvents.DEVICE_SELECTED, (device, _isAssembly) =>{
    selectedMMCUDevice = device;
})

module.exports = {
    getSelectedMMCUDevice,
};