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
        const projectName = workspaceFolders[0].name;

        const config = vscode.workspace.getConfiguration('avr-utils');
        const hexDir = config.get('hexFilePath') || 'Debug';
        const hexFilePath = path.join(workspacePath, hexDir, `${projectName}.hex`);

        if (!fs.existsSync(hexFilePath)) {
            vscode.window.showErrorMessage(`Compiled hex file not found at ${hexFilePath}. Please compile the project first.`);
            return;
        }

        const projectConfig = loadProjectConfig(workspacePath);
        const savedSettings = projectConfig.uploadSettings || {};

        let programmer, mcu, port;

        if (savedSettings.programmer && savedSettings.mcu) {
            const useSaved = await vscode.window.showQuickPick(
                [
                    { label: 'Use Saved Settings', description: `Programmer: ${savedSettings.programmer}, MCU: ${savedSettings.mcu}${savedSettings.port ? `, Port: ${savedSettings.port}` : ''}` },
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

        if (!programmer || !mcu) {
            programmer = await getProgrammer(savedSettings.programmer);
            if (!programmer) return;

            mcu = await getMcu(savedSettings.mcu);
            if (!mcu) return;

            if (programmer !== 'usbasp') {
                port = await getPort(savedSettings.port);
                if (!port) return;
            }

            saveProjectConfig(workspacePath, {
                uploadSettings: {
                    programmer,
                    mcu,
                    ...(port && { port })
                }
            });
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
                await downloadAvrdude();
                if (!fs.existsSync(avrdudePath)) {
                    throw new Error(`avrdude installation failed at ${avrdudePath}`);
                }
            } else if (action === 'Try System avrdude') {
                useSystemAvrdude = true;
                avrdudePath = avrdudeExecutable;
            } else {
                return;
            }
        }

        let args = ['-c', programmer, '-p', mcu];
        if (programmer !== 'usbasp' && port) {
            args.push('-P', port);
        }

        const fuseSettings = config.get('fuseSettings') || {};
        const defaultFuses = programmer === 'usbasp' && mcu === 'atmega16' ? {
            lfuse: '0xE4',
            hfuse: '0x99'
        } : {};
        const fuses = { ...defaultFuses, ...(savedSettings.fuses || fuseSettings[mcu] || {}) };

        if (fuses.lfuse) args.push('-U', `lfuse:w:${fuses.lfuse}:m`);
        if (fuses.hfuse) args.push('-U', `hfuse:w:${fuses.hfuse}:m`);
        if (fuses.efuse) args.push('-U', `efuse:w:${fuses.efuse}:m`);
        args.push(
            '-U', `flash:w:${hexFilePath}:i`,
            '-U', `flash:v:${hexFilePath}:i`
        );

        console.log(`Executing: ${avrdudePath} ${args.join(' ')}`);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Uploading to AVR Microcontroller...',
            cancellable: false
        }, async () => {
            try {
                const result = await runAvrdude(avrdudePath, args, useSystemAvrdude);
                vscode.window.showInformationMessage('Upload successful!');
                console.log('Upload details:', {
                    output: result.output,
                    errorOutput: result.errorOutput,
                    exitCode: result.exitCode
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Upload failed: ${error.message}`);
                console.error('Upload error:', error.message);
            }
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
        console.error('Unexpected error:', error);
    }
}

async function downloadAvrdude() {
    const platform = process.platform;
    const downloads = {
        win32: { url: 'https://github.com/avrdudes/avrdude/releases/download/v8.0/avrdude-v8.0-windows-x64.zip', type: 'zip' },
        linux: { url: 'https://github.com/avrdudes/avrdude/releases/download/v8.0/avrdude_v8.0_Linux_64bit.tar.gz', type: 'tar' },
        darwin: { url: 'https://github.com/avrdudes/avrdude/releases/download/v8.0/avrdude_v8.0_macOS_64bit.tar.gz', type: 'tar' }
    };

    if (!downloads[platform]) throw new Error(`Unsupported platform: ${platform}`);
    const { url, type } = downloads[platform];
    const fileName = path.basename(url);
    const tempPath = path.join(os.homedir(), 'Documents', fileName);
    const targetDir = path.join(toolchainDir(), 'bin');

    const finalUrl = await followRedirects(url);

    await vscode.window.withProgress(
        { cancellable: true, location: vscode.ProgressLocation.Notification, title: 'Downloading avrdude v8.0' },
        async (progress) => {
            await new Promise((resolve, reject) => {
                const fileStream = fs.createWriteStream(tempPath);
                get(finalUrl, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Download failed: ${response.statusCode}`));
                        return;
                    }
                    response.pipe(fileStream);
                    const totalBytes = parseInt(response.headers['content-length'], 10);
                    let downloadedBytes = 0;

                    response.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        progress.report({
                            message: `${Math.round((downloadedBytes / totalBytes) * 100)}%`,
                            increment: (chunk.length / totalBytes) * 100
                        });
                    });

                    fileStream.on('finish', () => resolve());
                }).on('error', reject);
            });

            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            if (type === 'zip') {
                await decompress(tempPath, targetDir, { strip: 1 });
            } else {
                await require('tar').x({ file: tempPath, C: targetDir, strip: 1 });
            }
            if (platform !== 'win32') {
                fs.chmodSync(path.join(targetDir, 'avrdude'), 0o755);
            }
            fs.unlinkSync(tempPath);
        }
    );
}

function followRedirects(url, redirectCount = 0, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        request(url, { method: 'HEAD' }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                if (redirectCount >= maxRedirects) {
                    reject(new Error(`Too many redirects (max ${maxRedirects})`));
                    return;
                }
                resolve(followRedirects(response.headers.location, redirectCount + 1));
            } else if (response.statusCode === 200) {
                resolve(url);
            } else {
                reject(new Error(`Unexpected status code: ${response.statusCode}`));
            }
        }).on('error', reject).end();
    });
}

function loadProjectConfig(workspacePath) {
    const configPath = path.join(workspacePath, '.vscode', 'avr_project.json');
    return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
}

function saveProjectConfig(workspacePath, updates) {
    const configPath = path.join(workspacePath, '.vscode', 'avr_project.json');
    const current = loadProjectConfig(workspacePath);
    fs.writeFileSync(configPath, JSON.stringify({ ...current, ...updates }, null, 2));
}

function runAvrdude(avrdudePath, args, useSystemAvrdude) {
    return new Promise((resolve, reject) => {
        const process = spawn(avrdudePath, args, {
            shell: useSystemAvrdude,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.stderr.on('data', (data) => {
            output += data.toString();
            errorOutput += data.toString();
        });

        process.on('close', (code) => {
            const isSuccess = (
                code === 0 ||
                output.includes('avrdude done.  Thank you.') ||
                output.includes('bytes of flash verified')
            );

            if (isSuccess) {
                resolve({
                    output: output,
                    errorOutput: errorOutput,
                    exitCode: code
                });
            } else {
                const errorMsg = errorOutput ||
                    `avrdude failed with exit code ${code}. No specific error message available.`;
                reject(new Error(errorMsg));
            }
        });

        process.on('error', (error) => {
            if (useSystemAvrdude && error.code === 'ENOENT') {
                reject(new Error('avrdude not found in system PATH'));
            } else {
                reject(new Error(`avrdude execution error: ${error.message}`));
            }
        });
    });
}

async function getProgrammer(savedProgrammer) {
    const config = vscode.workspace.getConfiguration('avr-utils');
    const defaultProgrammer = savedProgrammer || config.get('programmer') || 'usbasp';
    const programmers = [
        { label: 'usbasp', description: 'USBasp - Common USB programmer' },
        { label: 'avrisp2', description: 'AVR ISP mkII' },
        { label: 'arduino', description: 'Arduino as ISP' },
        { label: 'usbtiny', description: 'USBtiny programmer' },
        { label: 'Custom...', description: 'Enter custom programmer' }
    ];

    const selected = await vscode.window.showQuickPick(programmers, {
        placeHolder: defaultProgrammer,
        title: 'Select Programmer Type'
    });

    return selected?.label === 'Custom...'
        ? await vscode.window.showInputBox({ prompt: 'Enter custom programmer', placeHolder: defaultProgrammer })
        : selected?.label;
}

async function getMcu(savedMcu) {
    const defaultMcu = savedMcu || selectedDevice() || vscode.workspace.getConfiguration('avr-utils').get('mcu') || 'atmega328p';
    const mcuItems = devices.map(device => ({
        label: device.endsWith('-asm') ? device.slice(0, -4) : device,
        description: device.endsWith('-asm') ? '(Assembly Only)' : '(C and Assembly)',
        detail: getMcuDetail(device.replace('-asm', ''))
    }));

    const selected = await vscode.window.showQuickPick(mcuItems, {
        placeHolder: defaultMcu,
        title: 'Select Microcontroller Type'
    });
    return selected?.label;
}

async function getPort(savedPort) {
    const config = vscode.workspace.getConfiguration('avr-utils');
    const defaultPort = savedPort || config.get('port') || (process.platform === 'win32' ? 'COM3' : '/dev/ttyUSB0');
    const ports = [
        { label: 'COM3', description: 'Windows port' },
        { label: 'COM4', description: 'Windows port' },
        { label: '/dev/ttyUSB0', description: 'Linux/Mac USB port' },
        { label: '/dev/ttyACM0', description: 'Linux/Mac USB port' },
        { label: 'Custom...', description: 'Enter custom port' }
    ];

    const selected = await vscode.window.showQuickPick(ports, {
        placeHolder: defaultPort,
        title: 'Select Port'
    });

    return selected?.label === 'Custom...'
        ? await vscode.window.showInputBox({ prompt: 'Enter custom port', placeHolder: defaultPort })
        : selected?.label;
}

function getMcuDetail(mcu) {
    const details = {
        'atmega328p': 'Arduino Uno, 32KB Flash',
        'atmega2560': 'Arduino Mega, 256KB Flash',
        'atmega16': '16KB Flash, 16MHz',
        'attiny85': 'Low-power, 8KB Flash'
    };
    return details[mcu] || 'AVR microcontroller';
}

module.exports = { uploadToMicrocontroller };