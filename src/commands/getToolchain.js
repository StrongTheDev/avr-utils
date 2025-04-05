const vscode = require("vscode");
const tar = require("tar");
const decompress = require("decompress");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { get } = require("https");
const { dataObject } = require("../utils");

/**
 * @typedef ToolchainSource
 * @property {string[]} platforms - The platforms that the source supports
 * @property {string} endpoint - The endpoint to download the toolchain from, for the specified platforms
 * @property {string} streamName - The name of the file to stream/download the data into
 */

/**
 * @param {NodeJS.Platform} platform - The platform to get the toolchain for.
 * @param {string} downloadsUrl - The url to download the toolchain from. It is already defined in `utils.js` 
 * @param {ToolchainSource[]} toolchainSources - The list of toolchain sources
 * @see utils.js
 */
async function getToolchain(platform, downloadsUrl, toolchainSources) {
    let newUrl = "";
    let streamName = ""; // The name of the file into which we download the compressed toolchain before extraction
    toolchainSources.forEach((source) => {
        source.platforms.forEach((p) => {
            if (p === platform) {
                newUrl = downloadsUrl + source.endpoint;
                streamName = source.streamName;
            }
        });
    });
    vscode.window.withProgress(
        { cancellable: true, location: vscode.ProgressLocation.Notification, title: `Downloading toolchain for ${platform}` },
        (progress) => {
            return new Promise((resolvePromise, rejectPromise) => {
                get(newUrl, (response) => {
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

                        // Save the selected directory as the toolchain_directory so that users don't have to download the toolchain every time. 
                        fs.readFile(path.join(__dirname, "..", "storage", "data.json"), "utf8", (err, data) => {
                            if (err) throw err;
                            const extension_data = JSON.parse(data);
                            extension_data.toolchain_directory = directory;
                            dataObject(extension_data);
                        });

                        progress.report({ message: "Extracting the Toolchain" });
                        platform.toString() === "win32"
                            ? extractZip(`${path.join(os.homedir(), "Documents", streamName)}`, directory)
                            : extractTarball(`${path.join(os.homedir(), "Documents", streamName)}`, directory);
                        progress.report({ message: "Extraction complete! Happy coding!" });

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

/**
 *
 * @param {string} tarball - path to tarball
 * @param {string} directory - directory to extract to
 */
function extractTarball(tarball, directory) {
    fs.createReadStream(tarball)
        .pipe(
            tar.x({
                C: directory,
                strip: 1,
            })
        )
        .on("finish", () => {
            vscode.window.showInformationMessage(`Toolchain extracted to ${directory}`);
            fs.unlinkSync(tarball);
        });
}
/**
 *
 * @param {string} file - path to file
 * @param {string} directory - directory to extract to
 */
function extractZip(file, directory) {
    decompress(file, directory, { strip: 1 }).then(() => {
        vscode.window.showInformationMessage(`Toolchain extracted to ${directory}`);
        fs.unlinkSync(file);
    });
}

module.exports = getToolchain;