const { defaultCompletions } = require("./providers/completionsProvider");
const { includeDirProvider } = require("./providers/documentLinkProvider");
const { definitions } = require("./providers/definitionProvider");
const { diagnosticsCollection } = require("./providers/diagnosticsProvider");
const { events, ExtensionEvents } = require("./util/events");

/**@param {import("vscode").ExtensionContext} context */
function _(context) {
    context.subscriptions.push(defaultCompletions, includeDirProvider, definitions, diagnosticsCollection);
}


events.on(ExtensionEvents.EXTENSION_CONTEXT, (ctx)=>{
  console.log("Registering providers");
  _(ctx);
})