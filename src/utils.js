const { platform, homedir } = require("os");
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

module.exports = {
    devices: deviceList(),
    headerfile:devicesAndFiles,
    currentPlatform: platform(),
    downloadsUrl: "https://ww1.microchip.com/downloads/aemDocuments/documents/DEV/ProductDocuments/SoftwareTools/",
    toolchainSources: toolchainSources(),
    dataObject,
    thisWorkspace: getThisWorkspace,
    changeWorkspace,
    initWorkspace,
    includeDir,
    anInnerDir,
    toolchainDir,
    /** @type {Map<string, vscode.Location[]>} */
    previousDefinitions: new Map(),
    sendCursorTo,
    workspaceConfig: vscode.workspace.getConfiguration,
    currentExtension: () => path.extname(vscode.window.activeTextEditor.document.fileName),
};

function devicesAndFiles() {
    let device_and_file = JSON.parse(fs.readFileSync(path.join(__dirname, "storage", "device_and_file.json"), "utf8"));
    return device_and_file
}

let _thisWorkspace = null;
function initWorkspace() {
    _thisWorkspace = vscode.workspace.workspaceFolders[0];
}
/**@returns {vscode.WorkspaceFolder} Returns the active WorkspaceFolder */
function getThisWorkspace() {
    return _thisWorkspace;
}
async function changeWorkspace() {
    const workspace = await vscode.window.showWorkspaceFolderPick({
        placeHolder: "Select preferred workspace",
    });
    _thisWorkspace = workspace;
}
/** The `data.json` object.
 * 
 * If a `saveObject` is provided, this function saves this object as the 
 * configuration into the `data.json` file which is used to store the location of the toolchain directory.
 * 
 * If `saveObject` isn't provided, or is null, the function acts as a "getter" 
 * for an object representing the current info stored in `data.json`.
 * @param {Object} saveObject
 */
function dataObject(saveObject = null) {
    const pathToDataFile = path.join(__dirname, "storage", "data.json");
    if (saveObject) {
        let oldObject = {};
        try {
            fs.statSync(pathToDataFile);
            oldObject = dataObject();
        } catch {}
        let newObject = {...oldObject, ...saveObject};
        fs.writeFileSync(pathToDataFile, JSON.stringify(newObject), "utf-8");
        return;
    }
    try {
        return JSON.parse(fs.readFileSync(pathToDataFile, "utf8"));
    } catch {
        let temp = {toolchain_directory: `${findToolchainDirectory()}`};
        dataObject(temp);
        return temp;
    }
}

function findToolchainDirectory() {
    let documentsDirectory = path.join(homedir(), "Documents");
    if (fs.existsSync(path.join(documentsDirectory, "AVR Utils"))) {
        documentsDirectory = path.join(documentsDirectory, "AVR Utils");
    }
    if (fs.existsSync(path.join(documentsDirectory, "toolchain"))) {
        documentsDirectory = path.join(documentsDirectory, "toolchain");
    } 
    return documentsDirectory;
}

/** Toolchain Directory */
function toolchainDir() {
    return dataObject().toolchain_directory;
}
function includeDir() {
    return path.join(toolchainDir(), "avr", "include");
}

function anInnerDir() {
    let dir = "";
    if (fs.existsSync(path.join(getThisWorkspace().uri.fsPath, getThisWorkspace().name))) {
        dir = getThisWorkspace().name;
    }
    return dir;
}

/**
 * 
 * @param {vscode.Position} pos 
 */
function sendCursorTo(pos){
    vscode.window.activeTextEditor.selection = new vscode.Selection(pos,pos);
}

function toolchainSources() {
    return [
        {
            platforms: ["win32"],
            endpoint: "avr8-gnu-toolchain-3.7.0.1796-win32.any.x86_64.zip",
            streamName: "toolchain.zip",
        },
        {
            platforms: ["linux", "freebsd", "openbsd", "netbsd", "cygwin"],
            endpoint: "avr8-gnu-toolchain-3.7.0.1796-linux.any.x86_64.tar.gz",
            streamName: "toolchain.tar.gz",
        },
        {
            platforms: ["darwin"],
            endpoint: "avr8-gnu-toolchain-3.7.0.1796-darwin.any.x86_64.tar.gz",
            streamName: "toolchain.tar.gz",
        },
    ];
}

function deviceList() {
    return Object.keys(devicesAndFiles());
}
