const vscode = require('vscode');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

let panel;
let port;
let parser;
let isMonitoring = false;
let dataBuffer = [];
let lastUpdateTime = 0;
let lineCount = 0;
let lastLineCountTime = 0;
let linesPerSecond = 0;
const UPDATE_INTERVAL = 100; // Update Webview every 100ms
const MAX_LINES = 500; // Maximum lines in output

async function openSerialMonitor() {
    if (panel) {
        panel.reveal(vscode.ViewColumn.Beside);
        return;
    }

    panel = vscode.window.createWebviewPanel(
        'serialMonitor',
        'Serial Monitor',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getWebviewContent();

    panel.onDidDispose(() => {
        panel = null;
        if (port && port.isOpen) {
            port.close((err) => {
                if (err) console.error('Error closing port:', err);
            });
        }
        port = null;
        parser = null;
        isMonitoring = false;
        dataBuffer = [];
        lineCount = 0;
        linesPerSecond = 0;
    });

    try {
        const portChoices = await getSerialPorts();
        portChoices.push('Custom...');

        const selectedPort = await vscode.window.showQuickPick(portChoices, {
            placeHolder: 'Select or enter a serial port'
        });

        if (!selectedPort) return;

        let finalPort = selectedPort;
        if (selectedPort === 'Custom...') {
            finalPort = await vscode.window.showInputBox({
                placeHolder: 'Enter serial port path (e.g., COM8 or /dev/ttyUSB0)',
                prompt: 'Enter port manually'
            });
        }

        if (!finalPort) return;

        const baudRates = ['300', '1200', '2400', '4800', '9600', '19200', '38400', '57600', '115200'];
        const selectedBaudRate = await vscode.window.showQuickPick(baudRates, {
            placeHolder: 'Select baud rate'
        });

        if (!selectedBaudRate) return;

        port = new SerialPort({ path: finalPort, baudRate: parseInt(selectedBaudRate) }, (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to open port ${finalPort}: ${err.message}`);
                panel.dispose();
            }
        });

        parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

        parser.on('data', (line) => {
            if (isMonitoring) {
                dataBuffer.push(line);
                lineCount++;
                const currentTime = Date.now();
                if (currentTime - lastLineCountTime >= 1000) {
                    linesPerSecond = lineCount / ((currentTime - lastLineCountTime) / 1000);
                    lineCount = 0;
                    lastLineCountTime = currentTime;
                    panel.webview.postMessage({ type: 'update-data-rate', payload: linesPerSecond.toFixed(1) });
                }
                if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
                    if (dataBuffer.length > 0) {
                        panel.webview.postMessage({ type: 'serial-data', payload: dataBuffer });
                        dataBuffer = [];
                    }
                    lastUpdateTime = currentTime;
                }
            }
        });

        parser.on('error', (err) => {
            vscode.window.showErrorMessage(`Parser error: ${err.message}`);
        });

        port.on('error', (err) => {
            vscode.window.showErrorMessage(`Serial port error: ${err.message}`);
            if (panel) panel.dispose();
        });

        port.on('close', () => {
            vscode.window.showInformationMessage(`Serial port ${finalPort} closed.`);
            if (panel) panel.dispose();
        });

        panel.webview.onDidReceiveMessage(message => {
            if (port && port.isOpen) {
                if (message.type === 'serial-write') {
                    let payload = message.payload;
                    if (message.lineEnding === 'Newline') payload += '\n';
                    else if (message.lineEnding === 'Carriage Return') payload += '\r';
                    else if (message.lineEnding === 'Both') payload += '\r\n';
                    port.write(payload, (err) => {
                        if (err) {
                            vscode.window.showErrorMessage(`Write error: ${err.message}`);
                        }
                    });
                } else if (message.type === 'toggle-monitoring') {
                    isMonitoring = message.payload;
                    if (isMonitoring) {
                        port.resume();
                    } else {
                        port.pause();
                        dataBuffer = [];
                    }
                } else if (message.type === 'clear-output') {
                    dataBuffer = [];
                }
            }
        });
    } catch (err) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
        if (panel) panel.dispose();
    }
}

async function getSerialPorts() {
    try {
        const ports = await SerialPort.list();
        return ports.map(p => p.path);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to list serial ports: ${err.message}`);
        return [];
    }
}

function getWebviewContent() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', monospace;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            background-color: #1a1a1a;
            color: #d4d4d4;
        }
        #toolbar {
            display: flex;
            align-items: center;
            padding: 8px;
            background-color: #2d2d2d;
            border-bottom: 1px solid #444;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        #toolbar label {
            margin-right: 8px;
            font-size: 12px;
            color: #a0a0a0;
        }
        #toolbar select, #toolbar button, #toolbar input[type="checkbox"] {
            margin: 0 8px;
            padding: 6px 10px;
            background-color: #3c3c3c;
            color: #d4d4d4;
            border: 1px solid #555;
            border-radius: 4px;
            font-size: 12px;
            transition: background-color 0.2s, border-color 0.2s;
        }
        #toolbar select:hover, #toolbar button:hover, #toolbar input[type="checkbox"]:hover {
            background-color: #4a4a4a;
            border-color: #777;
        }
        #toolbar button {
            background-color: #0078d4;
            border: none;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
        }
        #toolbar button:hover {
            background-color: #005a9e;
        }
        #toolbar button:active {
            transform: scale(0.95);
        }
        #toolbar button.stop {
            background-color: #d83b01;
        }
        #toolbar button.stop:hover {
            background-color: #a12d00;
        }
        #dataRate {
            margin-left: auto;
            font-size: 12px;
            color: #a0a0a0;
        }
        #output {
            flex-grow: 1;
            overflow-y: auto;
            padding: 12px;
            background-color: #1a1a1a;
            color: #d4d4d4;
            line-height: 1.5;
            font-size: 13px;
        }
        #output div {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        #inputBar {
            display: flex;
            padding: 8px;
            background-color: #2d2d2d;
            border-top: 1px solid #444;
            box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.2);
        }
        #input {
            flex-grow: 1;
            padding: 8px;
            border: 1px solid #555;
            border-radius: 4px;
            outline: none;
            font-size: 13px;
            background-color: #3c3c3c;
            color: #d4d4d4;
            transition: border-color 0.2s;
        }
        #input:focus {
            border-color: #0078d4;
        }
        #sendBtn {
            padding: 8px 16px;
            background-color: #0078d4;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            margin-left: 8px;
            font-size: 13px;
            transition: background-color 0.2s, transform 0.1s;
        }
        #sendBtn:hover {
            background-color: #005a9e;
        }
        #sendBtn:active {
            transform: scale(0.95);
        }
        .tooltip {
            position: relative;
            display: inline-block;
        }
        .tooltip .tooltiptext {
            visibility: hidden;
            width: 120px;
            background-color: #555;
            color: #fff;
            text-align: center;
            border-radius: 4px;
            padding: 5px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            margin-left: -60px;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .tooltip:hover .tooltiptext {
            visibility: visible;
            opacity: 1;
        }
    </style>
</head>
<body>
    <div id="toolbar">
        <label>Line Ending:</label>
        <select id="lineEnding">
            <option value="None">No line ending</option>
            <option value="Newline">Newline</option>
            <option value="Carriage Return">Carriage Return</option>
            <option value="Both">Both NL & CR</option>
        </select>
        <div class="tooltip">
            <button id="toggleBtn">Start</button>
            <span class="tooltiptext">Start/Stop monitoring</span>
        </div>
        <div class="tooltip">
            <button id="clearBtn">Clear</button>
            <span class="tooltiptext">Clear the output</span>
        </div>
        <label>Autoscroll:</label>
        <input type="checkbox" id="autoscroll" checked />
        <span id="dataRate">0.0 lines/s</span>
    </div>
    <div id="output"></div>
    <div id="inputBar">
        <input id="input" type="text" placeholder="Type a message to send to the serial port..." />
        <button id="sendBtn">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const output = document.getElementById('output');
        const input = document.getElementById('input');
        const sendBtn = document.getElementById('sendBtn');
        const lineEnding = document.getElementById('lineEnding');
        const toggleBtn = document.getElementById('toggleBtn');
        const clearBtn = document.getElementById('clearBtn');
        const autoscroll = document.getElementById('autoscroll');
        const dataRate = document.getElementById('dataRate');
        let isMonitoring = false;

        sendBtn.addEventListener('click', () => {
            if (input.value.trim()) {
                vscode.postMessage({ 
                    type: 'serial-write', 
                    payload: input.value, 
                    lineEnding: lineEnding.value 
                });
                input.value = '';
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendBtn.click();
        });

        toggleBtn.addEventListener('click', () => {
            isMonitoring = !isMonitoring;
            toggleBtn.textContent = isMonitoring ? 'Stop' : 'Start';
            toggleBtn.classList.toggle('stop', isMonitoring);
            vscode.postMessage({ type: 'toggle-monitoring', payload: isMonitoring });
        });

        clearBtn.addEventListener('click', () => {
            output.innerHTML = '';
            vscode.postMessage({ type: 'clear-output' });
        });

        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.type === 'serial-data') {
                const lines = msg.payload;
                for (const lineText of lines) {
                    if (lineText) {
                        const line = document.createElement('div');
                        line.textContent = lineText;
                        output.appendChild(line);
                    }
                }
                while (output.childElementCount > ${MAX_LINES}) {
                    output.removeChild(output.firstChild);
                }
                if (autoscroll.checked) {
                    output.scrollTop = output.scrollHeight;
                }
            } else if (msg.type === 'update-data-rate') {
                dataRate.textContent = msg.payload + ' lines/s';
            }
        });
    </script>
</body>
</html>`;
}

module.exports = { openSerialMonitor };