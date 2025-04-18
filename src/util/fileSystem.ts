const fs = require("fs");
const path = require("path");
const { events, ExtensionEvents } = require("./events");
const { getWorkspaceFolderPath } = require("../core/workspaceManager");
const { getSetting } = require("../services/storageService");

/**
 * @param {Object} objectToSave - The JSON object to save or update.
 * @param {string} jsonFilePath - A JSON file name to save the JSON object to.
 */
function saveOrUpdateJSONObject(objectToSave: object, jsonFilePath: string) {
  if (!objectToSave || !jsonFilePath) return;

  try {
    try {
      fs.statSync(jsonFilePath);
    } catch {
      fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });
    }
    let oldObject = JSON.parse(jsonFilePath);
    let newObject = { ...oldObject, ...objectToSave };
    fs.writeFileSync(jsonFilePath, JSON.stringify(newObject, null, 2), "utf8");
    return newObject;
  } catch {
    fs.writeFileSync(
      jsonFilePath,
      JSON.stringify(objectToSave, null, 2),
      "utf8"
    );
    return objectToSave;
  }
}

/** The avr_project.json fields */
export class ProjectSettings {
  mcu?: string;
  isAssembly?: boolean;
  uploadSettings?: {
    port?: string;
    programmer?: string;
    fuse?: object;
  };
  serialSettings?: {
    port?: string;
    baudrate?: string;
  };
}

events.on(
  ExtensionEvents.DEVICE_SELECTED,
  (mcu: string, isAssembly: boolean) => {
    saveOrUpdateProjectConfig({ mcu, isAssembly });
  }
);

export function saveOrUpdateProjectConfig(
  config: ProjectSettings
): ProjectSettings {
  const pathToAvrUtilsFile = path.join(
    getWorkspaceFolderPath(),
    ".vscode",
    "avr_project.json"
  );
  let projectConfig = fs.existsSync(pathToAvrUtilsFile)
    ? JSON.parse(fs.readFileSync(pathToAvrUtilsFile, "utf8"))
    : {};
  config = { ...projectConfig, ...config };
  return saveOrUpdateJSONObject(config, pathToAvrUtilsFile);
}

export function loadProjectConfig(): ProjectSettings {
  const pathToAvrUtilsFile = path.join(
    getWorkspaceFolderPath(),
    ".vscode",
    "avr_project.json"
  );
  let projectConfig = fs.existsSync(pathToAvrUtilsFile)
    ? JSON.parse(fs.readFileSync(pathToAvrUtilsFile, "utf8"))
    : {};
  // handle the older api
  if (projectConfig.avrDevice) {
    projectConfig.mcu = projectConfig.avrDevice;
  }
  if (!projectConfig.isAssembly) {
    projectConfig.isAssembly = false;
  }
  return projectConfig;
}

export const getExtensionRootPath = () => getSetting("extensionRootPath");
