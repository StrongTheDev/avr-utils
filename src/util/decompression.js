const fs = require("fs");
const decompress = require("decompress");
const decompressTargz = require("decompress-targz");
const decompressUnzip = require("decompress-unzip");
const vscode = require("vscode");

/**
 * This class represents a compressed file descriptor.
 *
 * It contains the file path, directory to extract to, and a success message.
 */

/**
 * Extraction for tarball files.
 * @param {Object} descriptor
 * @param {string} descriptor.filePath
 * @param {string} descriptor.directory
 * @param {string} [descriptor.decompressSuccessMessage="Extraction Complete!"]
 * @param {tar.ExtractOptions} [descriptor.decompressOptions={ strip: 1 }]
 */
function extractTarball(descriptor) {
  fs.createReadStream(descriptor.filePath)
    .pipe(
      tar.x({
        ...{
          C: descriptor.directory,
          strip: 1,
        },
        ...descriptor.decompressOptions,
      }) // Use spread operator to merge options
    )
    .on("finish", async () => {
      let result = await vscode.window.showInformationMessage(
        descriptor.decompressSuccessMessage +
          " Do you wish to keep or delete the downloaded file?",
        "Keep",
        "Delete"
      );
      if (result === "Keep") {
        vscode.window.showInformationMessage(
          `The file will be kept at ${descriptor.filePath}.`
        );
      } else if (result === "Delete") {
        fs.unlinkSync(descriptor.filePath);
      }
    });
}

/**
 * Extraction for zip files.
 * @param {Object} descriptor
 * @param {string} descriptor.filePath
 * @param {string} descriptor.directory
 * @param {string} [descriptor.decompressSuccessMessage="Extraction Complete!"]
 * @param {decompress.DecompressOptions} [descriptor.decompressOptions={ strip: 1 }]
 */
function extractArchive(descriptor) {
  decompress(descriptor.filePath, descriptor.directory, {
    ...{ strip: 1, plugins: [decompressUnzip(), decompressTargz()] },
    ...descriptor.decompressOptions,
  }).then(async () => {
    let result = await vscode.window.showInformationMessage(
      descriptor.decompressSuccessMessage +
        " Do you wish to keep or delete the downloaded file?",
      "Keep",
      "Delete"
    );
    if (result === "Keep") {
      vscode.window.showInformationMessage(
        `The file will be kept at ${descriptor.filePath}.`
      );
    } else if (result === "Delete") {
      vscode.window.showInformationMessage("The file will be deleted.");
      fs.unlinkSync(descriptor.filePath);
    }
  });
}

module.exports = {
  extractArchive,
};
