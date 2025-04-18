const { events, ExtensionEvents } = require("../util/events");
const vscode = require("vscode");

let extensionContext = null;
function getExtensionContext() {
  return extensionContext;
}
events.on(ExtensionEvents.EXTENSION_CONTEXT, (ctx) => {
  console.log("Extension context set.");
  extensionContext = ctx;
});

module.exports = {
  getExtensionContext,
};
