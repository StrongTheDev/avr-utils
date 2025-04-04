const vscode = require('vscode');
const compileProject = require('./commands/compileProject');
const getToolchain = require('./commands/getToolchain');
const makeProject = require('./commands/makeProject');
const openMicrochipStudioProject = require('./commands/openMicrochipStudioProject');
const { uploadToMicrocontroller } = require('./commands/uploadToMicrocontroller');

module.exports = function (context) {
    console.log('Registering AVR Utils commands');
    context.subscriptions.push(
        vscode.commands.registerCommand('avr-utils.compileProject', compileProject),
        vscode.commands.registerCommand('avr-utils.getToolchain', getToolchain),
        vscode.commands.registerCommand('avr-utils.makeProject', makeProject),
        vscode.commands.registerCommand('avr-utils.openMicrochipStudioProject', openMicrochipStudioProject),
        vscode.commands.registerCommand('avr-utils.uploadToMicrocontroller', uploadToMicrocontroller)
    );
};