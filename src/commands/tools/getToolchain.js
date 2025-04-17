const vscode = require("vscode");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { get } = require("https");
const { extractTarball, extractZip } = require("../../util/decompression");
const { DownloadSource } = require("../../util/download");
const { setSetting, Setting } = require("../../services/storageService");
// const { extensionDataStorageObject } = require("../../util/fileSystem");



/**
 * @see utils.js
 */
async function getToolchain() {
    const toolchainSource = new DownloadSource("https://ww1.microchip.com/downloads/aemDocuments/documents/DEV/ProductDocuments/SoftwareTools/");
    toolchainSource.setFileNames({
        "windows": "avr8-gnu-toolchain-3.7.0.1796-win32.any.x86_64.zip",
        "mac": "avr8-gnu-toolchain-3.7.0.1796-darwin.any.x86_64.tar.gz",
        "linux": "avr8-gnu-toolchain-3.7.0.1796-linux.any.x86_64.tar.gz",
    });
    let streamName = "toolchain" + toolchainSource.getFileExtension(); // The name of the file into which we download the compressed toolchain before extraction

    vscode.window.withProgress(
        { cancellable: true, location: vscode.ProgressLocation.Notification, title: `Downloading toolchain` },
        (progress) => {
            return new Promise((resolvePromise, rejectPromise) => {
                get(toolchainSource.getDownloadUrl(), (response) => {
                    response.pipe(fs.createWriteStream(path.join(os.homedir(), "Documents", streamName)));

                    const totalBytes = parseInt(response.headers["content-length"], 10); // get the file size from the header
                    let downloadedBytes = 0; // Keep track of total downnloaded bytes, useful to display a percentage of completion to the user

                    response.on("data", (chunk) => {
                        const length = chunk.length;
                        downloadedBytes += length;
                        const percent = Math.round((downloadedBytes / totalBytes) * 100);
                        progress.report({
                            message: `${percent}%`,
                            increment: (length / totalBytes) * 100
                        });
                    });

                    response.on("end", async () => {
                        progress.report({ message: "Toolchain downloaded" });

                        let directory = null; // Will represent the directory that the user chooses to store the toolchain in
                        let chooseOwnDir = await vscode.window.showInformationMessage(
                            'Would you like to save the toolchain to the Documents folder?',
                            "Change Folder",
                            "Yes, Save to ~/Documents/AVR Utils"
                        );
                        if (chooseOwnDir === "Change Folder") {
                            directory = await vscode.window.showOpenDialog({
                                canSelectFiles: false,
                                canSelectMany: false,
                                canSelectFolders: true,
                                title: "Select a folder to save the toolchain to.",
                                defaultUri: vscode.Uri.file(path.join(os.homedir(), "Documents")),
                            });
                        }
                        if (!directory) {
                            directory = path.join(os.homedir(), "Documents", "AVR Utils", "toolchain");
                            const pathUri = vscode.Uri.file(directory);
                            try { // fs.stat is used here to check if the directory exists
                                await vscode.workspace.fs.stat(pathUri);
                            } catch (_) { // If it doesn't exist, create it
                                await vscode.workspace.fs.createDirectory(pathUri);
                            }
                        } else {
                            console.log(directory[0]);
                            directory = path.join(directory[0].fsPath, "toolchain");
                            const pathUri = vscode.Uri.file(directory)
                            try {
                                await vscode.workspace.fs.stat(pathUri);
                            } catch (error) {
                                await vscode.workspace.fs.createDirectory(pathUri);
                            }
                        }

                        progress.report({ message: "Extracting the Toolchain" });
                        const filePath = path.join(os.homedir(), "Documents", streamName);
                        const extractOptions = {
                            filePath,
                            directory,
                        };
                        toolchainSource.getFileType() === "zip"
                            ? extractZip(extractOptions)
                            : extractTarball(extractOptions);

                        // Save the selected directory as the toolchain_directory so that users don't have to download the toolchain every time. 
                        setSetting(Setting.TOOLCHAIN_DIRECTORY, directory, true);

                        progress.report({ message: "Happy coding!" });

                        setTimeout(() => resolvePromise(), 2250);
                    });

                    response.on("error", (err) => {
                        vscode.window.showErrorMessage(`Error downloading the toolchain: ${err.message}`);
                        rejectPromise(err);
                    });
                });
            })
        }
    )

}

module.exports = getToolchain;