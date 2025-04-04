const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { devices, initWorkspace, thisWorkspace, previousDefinitions } = require("./utils");
const { createLinkProvider } = require("./providers/documentLinkProvider");
const { registerCompletions } = require("./providers/completionsProvider");

let _selectedDevice = null;
let _compileButtonVisible = false;

const compileButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 2);
const selectDeviceButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);

/**
 *
 * @param {vscode.ExtensionContext} context
 */
function init(context) {
    vscode.commands.registerCommand("avr-utils.selectDevice", selectDevice);

    setupWorkspaceProperties(context);
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        if (event.removed.length > 0) {
            workspaceNotYetAccessible = true;
            context.subscriptions.pop();
            context.subscriptions.pop();
            if (vscode.workspace.workspaceFolders) setupWorkspaceProperties(context);
        }
        if (event.added.length > 0) {
            setupWorkspaceProperties(context);
        }
    });

    showOrHideUI(vscode.window.activeTextEditor);
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        showOrHideUI(editor);
    });

    initButtons();
}

/**
 * @param {vscode.TextEditor} editor
 */
function showOrHideUI(editor) {
    if (editor && (editor.document.languageId === 'avr-c' || editor.document.languageId === 'asm')) {
        vscode.commands.executeCommand('setContext', 'avr-utils.isAvrC', true);
        toggleButtons();
    } else {
        vscode.commands.executeCommand('setContext', 'avr-utils.isAvrC', false);
        toggleButtons(true);
    }
}

function initButtons() {
    /*compile button*/
    compileButton.text = `$(debug-start) Build`;
    compileButton.tooltip = "Compile the code for the selected device";
    compileButton.command = "avr-utils.compileProject";

    /*select device button*/
    if (_selectedDevice) {
        selectDeviceButton.text = _selectedDevice;
        selectDeviceButton.tooltip = `Compiling for ${_selectedDevice}`;
        showCompileButton();
    } else {
        selectDeviceButton.text = "Select AVR Device";
    }
    selectDeviceButton.command = "avr-utils.selectDevice";
}

function toggleButtons(hide = false) {
    if (hide) {
        if (_compileButtonVisible) compileButton.hide();
        selectDeviceButton.hide();
    } else {
        if (_compileButtonVisible) compileButton.show();
        selectDeviceButton.show();
    }
}

async function selectDevice() {
    const _devOpt = await vscode.window.showQuickPick(devices, {
        placeHolder: "Select AVR Device",
        canPickMany: false,
        title: "List of Available AVR Devices",
    });
    if (_devOpt !== undefined) {
        previousDefinitions.clear();
        _selectedDevice = _devOpt;
        selectDeviceButton.text = _selectedDevice;
        if (_devOpt.endsWith("-asm")) {
            _selectedDevice = _devOpt.substring(0, _devOpt.length - 4);
            selectDeviceButton.text = `${_selectedDevice} (Assembly Only)`;
        }
        selectDeviceButton.tooltip = `Compiling for ${_selectedDevice}`;
        if (!_compileButtonVisible) showCompileButton();
        //write to avr_project.json
        fs.writeFileSync(path.join(thisWorkspace().uri.fsPath, ".vscode", "avr_project.json"), JSON.stringify({ avrDevice: _selectedDevice }), "utf8");
    }
}
function showCompileButton() {
    _compileButtonVisible = true;
    compileButton.show();
}

function spinCompileButton(on = true) {
    if (on) {
        compileButton.text = "$(sync~spin) Building...";
    } else {
        compileButton.text = "$(debug-start) Build";
    }
}

/**@returns {string} */
function getSelectedDevice() {
    return _selectedDevice;
}

let workspaceNotYetAccessible = true;
/**
 * @param {vscode.ExtensionContext} context
 */
async function setupWorkspaceProperties(context) {
    if (workspaceNotYetAccessible) {
        if (vscode.workspace.workspaceFolders) {
            initWorkspace(); // enables the "workspace" utils

            const pathtovscode = path.join(thisWorkspace().uri.fsPath, ".vscode");
            if (!fs.existsSync(pathtovscode)) {
                fs.mkdirSync(pathtovscode);
            }
            context.subscriptions.push(createLinkProvider(/#(\s*?)include "(.*)"/, thisWorkspace().uri.fsPath));
            context.subscriptions.push(registerCompletions({ directory: thisWorkspace().uri.fsPath, triggers: ['"'], regex: /#include\s+"([^"]*)$/, end: "" }));
            if (fs.existsSync(path.join(pathtovscode, "avr_project.json"))) {
                let thejson = JSON.parse(fs.readFileSync(path.join(pathtovscode, "avr_project.json"), "utf8"));
                if (thejson.avrDevice) {
                    _selectedDevice = thejson.avrDevice;
                }
            } else {
                fs.writeFileSync(path.join(pathtovscode, "avr_project.json"), JSON.stringify({ avrDevice: _selectedDevice }), "utf8");
            }
            workspaceNotYetAccessible = false;
        }
    }
}

module.exports = {
    init,
    spinCompileButton: spinCompileButton,
    selectedDevice: getSelectedDevice,
};
