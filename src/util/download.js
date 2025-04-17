const os = require('os');
const { get, request } = require('https');
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

/**
 * Detect the current operating system.
 * @returns {string} - The name of the operating system ('windows', 'mac', 'linux').
 */
function getOperatingSystem() {
    const platform = os.platform();
    if (platform === 'win32') return 'windows';
    else if (platform === 'darwin') return 'mac';
    else return 'linux'; // default for all others like BSD, solaris, etc.
}

/**
 * Represents a tool download with its URL and platform-specific filenames.
 */
class DownloadSource {
    /**
     * The URL of the tool to be downloaded.
     * @type {string}
     */
    url;

    /**
     * The filenames for different operating systems.
     * @type {{ windows: string, mac: string, linux: string }}
     */
    filenames;

    /**
     * The constructor initializes the URL and filenames.
     * @param {string} url - The URL of the tool to be downloaded.
     */
    constructor(url) {
        if (!url.endsWith('/')) {
            url += '/';
        }
        this.url = url;
    }

    /**
     * Sets the filenames for different operating systems. These names are used to determine the file to download based on the user's OS.
     * For example, if the OS is Windows, a filename for Windows may be .
     * @param {{ windows: string; mac: string; linux: string; }} filenames
     */
    setFileNames(filenames) {
        this.filenames = filenames;
    }

    getFileName() {
        if (!this.filenames) {
            throw new Error('Filenames not set. Please call setFilenames() first.');
        }
        return this.filenames[getOperatingSystem()];
    }

    getDownloadUrl() {
        return this.url + this.getFileName();
    }

    getFileType() {
        return this.filenames[getOperatingSystem()].endsWith(".zip") ? 'zip' : 'tar';
    }
    
    getFileExtension() {
        return this.filenames[getOperatingSystem()].endsWith(".zip") ? '.zip' : '.tar.gz';
    }
}


/**
 * @param {string | import("url").URL} url
 */
function followRedirects(url, redirectCount = 0, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        request(url, { method: 'HEAD' }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                if (redirectCount >= maxRedirects) {
                    reject(new Error(`Too many redirects (max ${maxRedirects})`));
                    return;
                }
                console.log(`Redirecting from ${url} to ${response.headers.location}`);
                resolve(followRedirects(response.headers.location, redirectCount + 1));
            } else if (response.statusCode === 200) {
                resolve(url);
            } else {
                reject(new Error(`Unexpected status code: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            reject(new Error(`Redirect check failed: ${err.message}`));
        }).end();
    });
}

/**
 * A function to download a file from a given URL and save it to a specified location.
 * @param {DownloadSource} downloadSource
 * @param {(downloadedFileLocation: string, progress: vscode.Progress?) => void?} onDownloadSuccess
 * @param {(error: Error) => void?} onDownloadError
 * @param {string?} [errorMessage="Error downloading the file"] 
 * @param {string?} [notificationTitle="Downloading the file"] 
 * @param {string?} [fileName="filename"] File name to save the downloaded file as
 * @param {string?} [successMessage="File downloaded!"]
 */
function downloadFile(downloadSource, onDownloadSuccess, onDownloadError, notificationTitle, fileName, successMessage, errorMessage) {
    fileName += downloadSource.getFileExtension();
    vscode.window.withProgress(
        { cancellable: true, location: vscode.ProgressLocation.Notification, title: notificationTitle },
        (progress) => {
            return new Promise(async (resolvePromise, rejectPromise) => {
                get(await followRedirects(downloadSource.getDownloadUrl()), (response) => {
                    response.pipe(fs.createWriteStream(path.join(os.homedir(), "Documents", fileName)));

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
                        progress.report({ message: successMessage });
                        if (onDownloadSuccess) onDownloadSuccess(path.join(os.homedir(), "Documents", fileName), progress);
                        setTimeout(() => resolvePromise(), 2250);
                    });

                    response.on("error", (err) => {
                        vscode.window.showErrorMessage(`${errorMessage}: ${err.message}`);
                        if (onDownloadError) onDownloadError(err);
                        rejectPromise(err);
                    });
                });
            })
        }
    )
}

module.exports = {
    DownloadSource,
    getOperatingSystem,
    downloadFile,
    followRedirects,
}
