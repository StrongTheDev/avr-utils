const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");

async function createProject() {
    const parentfolder = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        title: "Select a folder to create your project in.",
        canSelectMany: false,
    });
    if (!parentfolder) return;

    let folderName = await vscode.window.showInputBox({
        placeHolder: "project_name",
        title: "Enter a name for your project",
        validateInput: (value) => {
            if (value.length < 3) {
                return "Please enter a better name for your project.";
            }
        },
    });
    if (!folderName) return;
    folderName = folderName.replace(" ", "_");

    const projectPath = path.join(parentfolder[0].fsPath, folderName);
    try {
        if (fs.existsSync(projectPath)) {
            const value = await vscode.window.showErrorMessage(`Folder ${projectPath} already exists. Do you wish to overwrite it?`, "Yes", "No");
            if (value === "Yes") {
                await vscode.workspace.fs.delete(vscode.Uri.file(projectPath), { recursive: true });
            } else {
                return;
            }
        }
    } catch (e) {}

    const debugDir = path.join(projectPath, "Debug");
    const vscodeDir = path.join(projectPath, ".vscode");

    await vscode.workspace.fs.createDirectory(vscode.Uri.file(projectPath));
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(debugDir));
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(vscodeDir));

    fs.writeFileSync(path.join(vscodeDir, "avr_project.json"), JSON.stringify({ mcu: null }), "utf8");
    fs.writeFile(
        path.join(projectPath, "main.c"),
        `/**
 * main.c
 * 
 * Created: ${new Date().toISOString()}
 * Author: ${os.userInfo().username}
 */

#include <avr/io.h>

int main(void) {
    /* Replace with your application code */
    while(1){
        
    }
}
`,
        (err) => {
            if (err) throw err;
        }
    );

    if (!vscode.workspace.workspaceFolders) {
        vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectPath));
    } else {
        vscode.window.showInformationMessage("Open newly created Project?", "Yes", "No").then((value) => {
            if (value === "Yes") {
                vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectPath));
            }
        });
    }
}

module.exports = createProject;
