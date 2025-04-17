const vscode = require('vscode');
const { fullMMCUDeviceList, previousPINDefinitions } = require('../../util/constants');
const { events, ExtensionEvents } = require('../../util/events');
const { executedWithinWorkspace } = require('../../core/workspaceManager');
const { setSetting, Setting } = require('../../services/storageService');
const { loadProjectConfig } = require('../../util/fileSystem');

async function selectDevice() {
    if (!executedWithinWorkspace()) return;
    
    let selectedMCU = await vscode.window.showQuickPick(fullMMCUDeviceList(), {
        placeHolder: "Select AVR Device",
        canPickMany: false,
        title: "List of Available AVR Devices",
    });
    if (selectedMCU !== undefined) {
        previousPINDefinitions.clear();
        let isAssembly = false;
        // selectDeviceButton.text = _selectedDevice;
        if (selectedMCU.endsWith("-asm")) {
            selectedMCU = selectedMCU.substring(0, selectedMCU.length - 4);
            isAssembly = true;
            // selectDeviceButton.text = `${_selectedDevice} (Assembly Only)`;
        }
        // selectDeviceButton.tooltip = `Compiling for ${_selectedDevice}`;
        // if (!_compileButtonVisible) showCompileButton();
        events.emit(ExtensionEvents.DEVICE_SELECTED, selectedMCU, isAssembly);
    }
}

/**
 * @param {vscode.WorkspaceFolder} workspace
 */
function loadFromWorkspace(workspace) {
    if (!workspace) return;

    const projectConfig = loadProjectConfig();
    events.emit(ExtensionEvents.DEVICE_SELECTED, projectConfig.mcu, projectConfig.isAssembly);
}

events.on(ExtensionEvents.WORKSPACE_READY, loadFromWorkspace);

module.exports = {
    selectDevice,
}