const path = require('path');
const vscode = require('vscode');

/**
 * This function opens a project that was created in Microchip Studio / Atmel Studio
 */
async function openProject() {
    vscode.window.showInformationMessage("Select a project created with Microchip/Atmel Studio")
    const projectUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        title: 'Select a folder to open',
    })
    if (!projectUri) return;
    /**
     * The Microchip Studio / Atmel Studio project usually has redundant paths.
     */
    let pathToOpen = path.join(projectUri[0].fsPath, path.basename(projectUri[0].fsPath))
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(pathToOpen));
    } catch (_) {
        pathToOpen = projectUri[0].fsPath
    }
    vscode.window.showInformationMessage(`Opening ${pathToOpen}`)
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(pathToOpen));
}

module.exports = openProject;