const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const fs = require('fs');
const compileProject = require('./commands/compileProject.js');
const { selectedDevice } = require('./init'); // From init.js
const { devices } = require('./utils'); // From utils.js for MCU list

const execPromise = util.promisify(exec);

async function uploadToMicrocontroller() {
    try {
        // Compile the project first
        await compileProject();

        // Get the workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a project.');
            return;
        }
        const workspacePath = workspaceFolders[0].uri.fsPath;

        // Look for the hex file in the Debug directory
        const config = vscode.workspace.getConfiguration('avr-utils');
        const hexDir = config.get('hexFilePath') || 'Debug';
        const hexFilePath = path.join(workspacePath, hexDir, `${workspaceFolders[0].name}.hex`);
        if (!fs.existsSync(hexFilePath)) {
            vscode.window.showErrorMessage(`Compiled hex file not found at ${hexFilePath}. Please compile the project first.`);
            return;
        }

        // Get upload parameters with dropdowns
        const programmer = await getProgrammer();
        if (!programmer) return;

        const mcu = await getMcu();
        if (!mcu) return;

        const port = await getPort();
        if (!port) return;

        // Build and execute avrdude command
        const avrdudeCommand = `avrdude -c ${programmer} -p ${mcu} -P ${port} -U flash:w:${hexFilePath}:i`;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Uploading to AVR Microcontroller...',
            cancellable: false
        }, async () => {
            try {
                const { stdout, stderr } = await execPromise(avrdudeCommand);
                if (stderr && !stderr.includes('avrdude done.  Thank you.')) {
                    throw new Error(stderr);
                }
                vscode.window.showInformationMessage('Upload successful!');
            } catch (error) {
                vscode.window.showErrorMessage(`Upload failed: ${error.message}`);
            }
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

// Dropdown selector for programmer
async function getProgrammer() {
    const config = vscode.workspace.getConfiguration('avr-utils');
    const defaultProgrammer = config.get('programmer') || 'usbasp';
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

// Dropdown selector for MCU
async function getMcu() {
    const currentDevice = selectedDevice(); // From init.js
    const defaultMcu = currentDevice || vscode.workspace.getConfiguration('avr-utils').get('mcu') || 'atmega328p';

    // Build searchable MCU list from devices
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

// Dropdown selector for port
async function getPort() {
    const config = vscode.workspace.getConfiguration('avr-utils');
    const defaultPort = config.get('port') || (process.platform === 'win32' ? 'COM3' : '/dev/ttyUSB0');
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