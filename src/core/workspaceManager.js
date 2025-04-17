const { registerCompletions } = require("../providers/completionsProvider");
const { createLinkProvider } = require("../providers/documentLinkProvider");
const path = require("path");
const fs = require("fs");
const { getExtensionContext } = require("../core/contextManager");
const vscode = require("vscode");
const { events, ExtensionEvents } = require("../util/events");

vscode.workspace.onDidChangeWorkspaceFolders((_changeEvent) => {
  events.emit(ExtensionEvents.WORKSPACE_CHANGED);
  processWorkspaceChange();
});

// handling active workspace
/** @type {vscode.WorkspaceFolder} */
let activeWorkspace = null;

function getWorkspace() {
  return activeWorkspace;
}

function getWorkspaceName() {
  return getWorkspace().name;
}

function getWorkspaceFolderPath() {
  return getWorkspace().uri.fsPath;
}

let check = false;
/** Helper function to ensure the caller only runs within a workspace */
function executedWithinWorkspace() {
  if (!getWorkspace()) {
    if (!check) {
      check = true;
      processWorkspaceChange();
      return executedWithinWorkspace();
    } else {
      vscode.window.showErrorMessage("Please open a workspace folder first.");
      check = false;
      return false;
    }
  }

  return true;
}
// handling switching workspaces

async function selectWorkspace() {
  activeWorkspace = await vscode.window.showWorkspaceFolderPick({
    placeHolder: "Select preferred workspace",
  });
  if (activeWorkspace) {
    events.emit(ExtensionEvents.WORKSPACE_READY, activeWorkspace);
  }
  return activeWorkspace;
}

async function processWorkspaceChange() {
  const folders = vscode.workspace.workspaceFolders;
  // Unload if no more folders
  if (!folders) {
    activeWorkspace = null;
    events.emit(ExtensionEvents.WORKSPACE_UNLOADED);
    return;
  }
  // select first folder in workspace if any is left
  if (!activeWorkspace && folders.length == 1) {
    activeWorkspace = folders[0];
    events.emit(ExtensionEvents.WORKSPACE_READY, activeWorkspace);
    return;
  } else if (!folders.includes(activeWorkspace)) {
    const wsp = await selectWorkspace();
    if (wsp) {
      activeWorkspace = wsp;
      events.emit(ExtensionEvents.WORKSPACE_READY, activeWorkspace);
      return;
    }
  }
}

////////////////////////////////////////////
// Listeners ///////////////////////////////
////////////////////////////////////////////

events.on(ExtensionEvents.WORKSPACE_READY, (_activeWorkspace) => {
  activeWorkspace = _activeWorkspace;
  if (!activeWorkspace) return;
  
  const pathtovscode = path.join(getWorkspaceFolderPath(), ".vscode");
  if (!fs.existsSync(pathtovscode)) {
    fs.mkdirSync(pathtovscode);
  }
  getExtensionContext().subscriptions.push(
    createLinkProvider(/#(\s*?)include "(.*)"/, getWorkspaceFolderPath())
  );
  getExtensionContext().subscriptions.push(
    registerCompletions({
      directory: getWorkspaceFolderPath(),
      triggers: ['"'],
      regex: /#include\s+"([^"]*)$/,
      end: "",
    })
  );
});

events.on(ExtensionEvents.WORKSPACE_CHANGED, () => {
  getExtensionContext().subscriptions.pop();
  getExtensionContext().subscriptions.pop();
  processWorkspaceChange();
});

module.exports = {
  // isInWorkspace,
  getWorkspace,
  getWorkspaceName,
  getWorkspaceFolderPath,
  executedWithinWorkspace,
  selectWorkspace,
  processWorkspaceChange,
};
