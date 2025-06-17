// const vscode = require('vscode');
import { EventEmitter } from "events";
// const EventEmitter = /** @type {import('events').EventEmitter} */ (require("events").EventEmitter);

class ExtensionEvents extends EventEmitter {
  static WORKSPACE_READY = "workspace_ready";
  static WORKSPACE_CHANGED = "workspace_changed";
  static WORKSPACE_UNLOADED = "workspace_unloaded";

  static DEVICE_SELECTED = "device_selected";

  static COMPILATION_STARTED = "compilation_started";
  static COMPILATION_FINISHED = "compilation_finished";
  static COMPILATION_FAILED = "compilation_failed";

  static EXTENSION_ROOT = "extension_root";
  static EXTENSION_CONTEXT = "extension_context";
  static EXTENSION_ACTIVATED = "extension_activated";
  static EXTENSION_DEACTIVATED = "extension_deactivated";

  static IS_AVRC_CONTEXT = "is_avrc_context";

}

const events = new ExtensionEvents();

module.exports = {
  events,
  ExtensionEvents,
};
