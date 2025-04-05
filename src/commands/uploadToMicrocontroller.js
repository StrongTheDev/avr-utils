const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const decompress = require('decompress');
const { get, request } = require('https');
const compileProject = require('./compileProject.js');
const { selectedDevice } = require('../init');
const { devices, toolchainDir, dataObject } = require('../utils');

async function uploadToMicrocontroller() {
    try {
        await compileProject();

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a project.');
            return;
        }
        const workspacePath = workspaceFolders[0].uri.fsPath;

        const config = vscode.workspace.getConfiguration('avr-utils');
        const hexDir = config.get('hexFilePath') || 'Debug';
        const hexFilePath = path.join(workspacePath, hexDir, `${workspaceFolders[0].name}.hex`);
        if (!fs.existsSync(hexFilePath)) {
            vscode.window.showErrorMessage(`Compiled hex file not found at ${hexFilePath}. Please compile the project first.`);
            return;
        }

        const projectConfig = loadProjectConfig(workspacePath);
        const savedSettings = projectConfig.uploadSettings || {};

        let programmer, mcu, port;

        if (savedSettings.programmer && savedSettings.mcu && savedSettings.port) {
            const useSaved = await vscode.window.showQuickPick(
                [
                    { label: 'Use Saved Settings', description: `Programmer: ${savedSettings.programmer}, MCU: ${savedSettings.mcu}, Port: ${savedSettings.port}` },
                    { label: 'Change Settings', description: 'Select new programmer, MCU, and port' }
                ],
                { placeHolder: 'Use saved upload settings or change them?', title: 'Upload Settings' }
            );

            if (!useSaved) return;

            if (useSaved.label === 'Use Saved Settings') {
                programmer = savedSettings.programmer;
                mcu = savedSettings.mcu;
                port = savedSettings.port;
            }
        }

        if (!programmer || !mcu || !port) {
            programmer = await getProgrammer(savedSettings.programmer);
            if (!programmer) return;

            mcu = await getMcu(savedSettings.mcu);
            if (!mcu) return;

            port = await getPort(savedSettings.port);
            if (!port) return;

            saveProjectConfig(workspacePath, { uploadSettings: { programmer, mcu, port } });
        }

        const avrdudeExecutable = process.platform === 'win32' ? 'avrdude.exe' : 'avrdude';
        let avrdudePath = path.join(toolchainDir(), 'bin', avrdudeExecutable);
        let useSystemAvrdude = false;

        if (!fs.existsSync(avrdudePath)) {
            const action = await vscode.window.showWarningMessage(
                `avrdude not found at ${avrdudePath}.`,
                'Download avrdude',
                'Try System avrdude',
                'Cancel'
            );

            if (action === 'Download avrdude') {
                try {
                    await downloadAvrdude();
                    if (!fs.existsSync(avrdudePath)) {
                        const binDir = path.join(toolchainDir(), 'bin');
                        const dirContents = fs.existsSync(binDir) ? fs.readdirSync(binDir) : [];
                        throw new Error(`avrdude installation failed. Expected path: ${avrdudePath}. Bin directory contents: ${dirContents.join(', ')}`);
                    }
                } catch (error) {
                    throw new Error(`Failed to download and install avrdude: ${error.message}`);
                }
            } else if (action === 'Try System avrdude') {
                useSystemAvrdude = true;
                avrdudePath = avrdudeExecutable;
            } else {
                return;
            }
        }

        const args = [
            '-c', programmer,
            '-p', mcu,
            '-P', port,
            '-U', `flash:w:${hexFilePath}:i`
        ];
        console.log(`Executing: ${avrdudePath} ${args.join(' ')}`);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Uploading to AVR Microcontroller...',
            cancellable: false
        }, async () => {
            try {
                await runAvrdude(avrdudePath, args, useSystemAvrdude);
                vscode.window.showInformationMessage('Upload successful!');
            } catch (error) {
                vscode.window.showErrorMessage(`Upload failed: ${error.message}`);
            }
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

async function downloadAvrdude() {
    const platform = process.platform;
    let avrdudeUrl, archiveType;

    if (platform === 'win32') {
        avrdudeUrl = 'https://github.com/avrdudes/avrdude/releases/download/v8.0/avrdude-v8.0-windows-x64.zip';
        archiveType = 'zip';
    } else if (platform === 'linux') {
        avrdudeUrl = 'https://github.com/avrdudes/avrdude/releases/download/v8.0/avrdude_v8.0_Linux_64bit.tar.gz';
        archiveType = 'tar';
    } else if (platform === 'darwin') {
        avrdudeUrl = 'https://github.com/avrdudes/avrdude/releases/download/v8.0/avrdude_v8.0_macOS_64bit.tar.gz';
        archiveType = 'tar';
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const fileName = path.basename(avrdudeUrl);
    const tempPath = path.join(os.homedir(), 'Documents', fileName);

    const targetDir = path.join(toolchainDir(), 'bin');
    const tar = require('tar'); // you already have it in other versions

    console.log(`Starting download from: ${avrdudeUrl}`);
    console.log(`Temporary file path: ${tempPath}`);
    console.log(`Target directory: ${targetDir}`);

    const finalUrl = await followRedirects(avrdudeUrl);
    console.log(`Final download URL after redirects: ${finalUrl}`);

    await vscode.window.withProgress(
        {
            cancellable: true,
            location: vscode.ProgressLocation.Notification,
            title: 'Downloading avrdude v8.0'
        },
        async (progress) => {
            return new Promise((resolvePromise, rejectPromise) => {
                get(finalUrl, (response) => {
                    if (response.statusCode !== 200) {
                        rejectPromise(new Error(`Download failed with status code: ${response.statusCode}`));
                        return;
                    }

                    const fileStream = fs.createWriteStream(tempPath);
                    response.pipe(fileStream);

                    const totalBytes = parseInt(response.headers['content-length'], 10);
                    let downloadedBytes = 0;

                    response.on('data', (chunk) => {
                        const length = chunk.length;
                        downloadedBytes += length;
                        const percent = Math.round((downloadedBytes / totalBytes) * 100);
                        progress.report({
                            message: `${percent}%`,
                            increment: (length / totalBytes) * 100
                        });
                    });

                    fileStream.on('finish', async () => {
                        progress.report({ message: 'Download complete, extracting...' });
                        console.log('Download completed successfully');

                        try {
                            await vscode.workspace.fs.stat(vscode.Uri.file(targetDir));
                        } catch (_) {
                            console.log(`Creating directory: ${targetDir}`);
                            await vscode.workspace.fs.createDirectory(vscode.Uri.file(targetDir));
                        }

                        try {
                            console.log(`Extracting ${tempPath} to ${targetDir}`);
                            if (archiveType === 'zip') {
                                const files = await decompress(tempPath, targetDir, { strip: 1 });
                                console.log(`Extracted files: ${files.map(f => f.path).join(', ')}`);
                            } else if (archiveType === 'tar') {
                                await tar.x({ file: tempPath, C: targetDir, strip: 1 });
                                console.log(`Extracted tar archive to ${targetDir}`);
                            }
                            console.log(`Extracted files: ${files.map(f => f.path).join(', ')}`);



                            if (process.platform !== 'win32') {
                                const avrdudeBinPath = path.join(targetDir, 'avrdude');
                                try {
                                    fs.chmodSync(avrdudeBinPath, 0o755);
                                    console.log('Set executable permissions for avrdude');
                                } catch (e) {
                                    console.warn('chmod failed:', e.message);
                                }
                            }

                        } catch (extractError) {
                            rejectPromise(new Error(`Extraction failed: ${extractError.message}`));
                            return;
                        }

                        try {
                            fs.unlinkSync(tempPath);
                            console.log(`Cleaned up temporary file: ${tempPath}`);
                        } catch (cleanupError) {
                            console.warn(`Failed to delete temp file: ${cleanupError.message}`);
                        }

                        const extension_data = dataObject();
                        if (!extension_data.toolchain_directory) {
                            extension_data.toolchain_directory = toolchainDir();
                            dataObject(extension_data);
                            console.log(`Set toolchain directory to: ${toolchainDir()}`);
                        }

                        progress.report({ message: 'avrdude installed successfully!' });
                        setTimeout(() => resolvePromise(), 1000);
                    });

                    response.on('error', (err) => {
                        vscode.window.showErrorMessage(`Error downloading avrdude: ${err.message}`);
                        rejectPromise(err);
                    });

                    fileStream.on('error', (err) => {
                        vscode.window.showErrorMessage(`Error writing avrdude file: ${err.message}`);
                        rejectPromise(err);
                    });
                }).on('error', (err) => {
                    vscode.window.showErrorMessage(`Error initiating download: ${err.message}`);
                    rejectPromise(err);
                });
            });
        }
    );
}

function followRedirects(url, redirectCount = 0) {
    const maxRedirects = 5;
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

// Rest of the original functions remain unchanged
function loadProjectConfig(workspacePath) {
    const configPath = path.join(workspacePath, '.vscode', 'avr_project.json');
    try {
        return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    } catch {
        return {};
    }
}

function saveProjectConfig(workspacePath, updates) {
    const configPath = path.join(workspacePath, '.vscode', 'avr_project.json');
    const current = loadProjectConfig(workspacePath);
    fs.writeFileSync(configPath, JSON.stringify({ ...current, ...updates }, null, 2), 'utf8');
}

function runAvrdude(avrdudePath, args, useSystemAvrdude) {
    return new Promise((resolve, reject) => {
        const process = spawn(avrdudePath, args, {
            shell: useSystemAvrdude
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0 && stderr.includes('avrdude done.  Thank you.')) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(stderr || `avrdude exited with code ${code}`));
            }
        });

        process.on('error', (error) => {
            if (useSystemAvrdude && error.code === 'ENOENT') {
                reject(new Error('avrdude not found in system PATH. Please install avrdude or download it.'));
            } else {
                reject(error);
            }
        });
    });
}

async function getProgrammer(savedProgrammer) {
    const config = vscode.workspace.getConfiguration('avr-utils');
    const defaultProgrammer = savedProgrammer || config.get('programmer') || 'usbasp';
    const programmers = [
        { label: 'usbasp', description: 'USBasp - Common USB programmer' },
        { label: 'avrisp2', description: 'AVR ISP mkII - Official Atmel programmer' },
        { label: 'stk500v1', description: 'STK500 v1 protocol' },
        { label: 'stk500v2', description: 'STK500 v2 protocol' },
        { label: 'arduino', description: 'Arduino as ISP' },
        { label: 'wiring', description: 'Wiring-based programmers' },
        { label: 'avrisp', description: 'AVR ISP (original)' },
        { label: 'usbtiny', description: 'USBtiny simple USB programmer' },
        { label: 'dragon_isp', description: 'AVR Dragon in ISP mode' },
        { label: 'dragon_dw', description: 'AVR Dragon in debugWire mode' },
        { label: 'jtag1', description: 'JTAG ICE mkI' },
        { label: 'jtag2', description: 'JTAG ICE mkII' },
        { label: 'pickit2', description: 'Microchip PICkit2 in AVR mode' },
        { label: 'ponyser', description: 'PonyProg serial programmer' },
        { label: 'Custom...', description: 'Enter a custom programmer type' }
    ];

    const selected = await vscode.window.showQuickPick(programmers, {
        placeHolder: defaultProgrammer,
        title: 'Select Programmer Type',
        matchOnDescription: true
    });

    return selected && selected.label === 'Custom...'
        ? await vscode.window.showInputBox({ prompt: 'Enter custom programmer type', placeHolder: defaultProgrammer })
        : selected ? selected.label : null;
}

async function getMcu(savedMcu) {
    const currentDevice = selectedDevice();
    const defaultMcu = savedMcu || currentDevice || vscode.workspace.getConfiguration('avr-utils').get('mcu') || 'atmega328p';

    const mcuItems = devices.map(device => {
        const isAssembly = device.endsWith('-asm');
        const baseName = isAssembly ? device.slice(0, -4) : device;
        return {
            label: baseName,
            description: isAssembly ? '(Assembly Only)' : '(C and Assembly)',
            detail: getMcuDetail(baseName),
            value: baseName
        };
    });

    const selected = await vscode.window.showQuickPick(mcuItems, {
        placeHolder: defaultMcu,
        title: 'Select Microcontroller Type (Search by name)',
        matchOnDescription: true,
        matchOnDetail: true
    });

    return selected ? selected.value : null;
}

async function getPort(savedPort) {
    const config = vscode.workspace.getConfiguration('avr-utils');
    const defaultPort = savedPort || config.get('port') || (process.platform === 'win32' ? 'COM3' : '/dev/ttyUSB0');
    const ports = [
        { label: 'COM3', description: 'Common Windows port' },
        { label: 'COM4', description: 'Common Windows port' },
        { label: '/dev/ttyUSB0', description: 'Common Linux/Mac USB port' },
        { label: '/dev/ttyACM0', description: 'Common Linux/Mac USB port' },
        { label: 'Custom...', description: 'Enter a custom port' }
    ];

    const selected = await vscode.window.showQuickPick(ports, {
        placeHolder: defaultPort,
        title: 'Select Port',
        matchOnDescription: true
    });

    return selected && selected.label === 'Custom...'
        ? await vscode.window.showInputBox({ prompt: 'Enter custom port', placeHolder: defaultPort })
        : selected ? selected.label : null;
}

function getMcuDetail(mcu) {
    const details = {
        'atmega328p': 'Popular in Arduino Uno, 32KB Flash',
        'atmega2560': 'Used in Arduino Mega, 256KB Flash',
        'attiny85': 'Low-power, 8KB Flash'
    };
    return details[mcu] || 'AVR microcontroller';
}

module.exports = { uploadToMicrocontroller };