const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const compileProject = require('./commands/compileProject.js');
const { selectedDevice } = require('./init');
const { devices, toolchainDir } = require('./utils');

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

        // Load saved programmer settings
        const projectConfig = loadProjectConfig(workspacePath);
        const savedSettings = projectConfig.uploadSettings || {};

        let programmer, mcu, port;

        // Check if there are saved settings and prompt user
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

        // If no saved settings or user wants to change them, prompt for new values
        if (!programmer || !mcu || !port) {
            programmer = await getProgrammer(savedSettings.programmer);
            if (!programmer) return;

            mcu = await getMcu(savedSettings.mcu);
            if (!mcu) return;

            port = await getPort(savedSettings.port);
            if (!port) return;

            // Save the new settings
            saveProjectConfig(workspacePath, { uploadSettings: { programmer, mcu, port } });
        }

        const avrdudeExecutable = process.platform === 'win32' ? 'avrdude.exe' : 'avrdude';
        let avrdudePath = path.join(toolchainDir(), 'bin', avrdudeExecutable);
        let useSystemAvrdude = false;

        if (!fs.existsSync(avrdudePath)) {
            const action = await vscode.window.showWarningMessage(
                `avrdude not found at ${avrdudePath}. Try using system-installed avrdude?`,
                'Yes',
                'Download Toolchain',
                'Cancel'
            );
            if (action === 'Download Toolchain') {
                await vscode.commands.executeCommand('avr-utils.getToolchain');
                if (!fs.existsSync(avrdudePath)) {
                    throw new Error('Toolchain download failed or avrdude is still missing.');
                }
            } else if (action === 'Yes') {
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
                reject(new Error('avrdude not found in system PATH. Please install avrdude or download the toolchain.'));
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
        { label: 'usbasp', description: 'Common USB programmer' },
        { label: 'avrisp2', description: 'Atmel AVR ISP mkII' },
        { label: 'stk500v1', description: 'STK500 v1 protocol' },
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
