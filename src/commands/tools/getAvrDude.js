const { DownloadSource, followRedirects } = require("../../util/download");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { getToolchainDirectory } = require("../../util/toolchain");
const { get } = require("https");
const { extractZip, extractTarball } = require("../../util/decompression");

const avrDudeSource = new DownloadSource(
  "https://github.com/avrdudes/avrdude/releases/download/v8.0/"
);
avrDudeSource.setFileNames({
  windows: "avrdude-v8.0-windows-x64.zip",
  mac: "avrdude_v8.0_macOS_64bit.tar.gz",
  linux: "avrdude_v8.0_Linux_64bit.tar.gz",
});

async function getAvrdude() {
  const tempPath = path.join(
    os.homedir(),
    "Documents",
    avrDudeSource.getFileName()
  );
  const targetDir = path.join(getToolchainDirectory(), "bin");

  const finalUrl = await followRedirects(avrDudeSource.getDownloadUrl());

  await vscode.window.withProgress(
    {
      cancellable: true,
      location: vscode.ProgressLocation.Notification,
      title: "Downloading avrdude v8.0",
    },
    async (progress) => {
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(tempPath);
        get(finalUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: ${response.statusCode}`));
            return;
          }
          response.pipe(fileStream);
          const totalBytes = parseInt(response.headers["content-length"], 10);
          let downloadedBytes = 0;

          response.on("data", (chunk) => {
            downloadedBytes += chunk.length;
            progress.report({
              message: `${Math.round((downloadedBytes / totalBytes) * 100)}%`,
              increment: (chunk.length / totalBytes) * 100,
            });
          });

          fileStream.on("finish", () => resolve());
        }).on("error", reject);
      });

      if (!fs.existsSync(targetDir))
        fs.mkdirSync(targetDir, { recursive: true });
      if (avrDudeSource.getFileType() === "zip") {
        extractZip({ filePath: tempPath, directory: targetDir });
      } else {
        extractTarball({ filePath: tempPath, directory: targetDir });
        fs.chmodSync(path.join(targetDir, 'avrdude'), 0o755); // Make the avrdude binary executable
      }
    }
  );
}

module.exports = getAvrdude;