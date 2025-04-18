let vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { getToolchainIncludesDirectory } = require("../util/toolchain");

function _getCompletions(directory, type, end) {
  let completions = [];
  let subdirs = []; // list of subdirectories to search for headers in

  function populator() {
    const files = fs.readdirSync(path.join(directory, ...subdirs));
    files.forEach((file) => {
      if (fs.statSync(path.join(directory, ...subdirs, file)).isDirectory()) {
        subdirs.push(file);
        populator();
      } else if (file.endsWith(type)) {
        const c = new vscode.CompletionItem(
          path.join(...subdirs, file),
          vscode.CompletionItemKind.File
        );
        c.insertText = `${path.join(...subdirs, file)}${end}`;
        completions.push(c);
      }
    });
    if (subdirs.length > 0) {
      subdirs.pop();
    }
  }
  populator();
  return completions;
}

/**
 * @param {Object} param0
 * @param {string} param0.directory
 * @param {any[]} [param0.triggers=[]]
 * @param {RegExp} [param0.regex=/#include\s+<([^>]*)$/]
 * @param {">"|""} [param0.end='>'] the ending character after an insert
 * @returns {vscode.Disposable}
 */
function _registerCompletions({
  directory,
  triggers = [],
  regex = /#include\s+<([^>]*)$/,
  end = ">",
}) {
  return vscode.languages.registerCompletionItemProvider(
    { language: "avr-c", pattern: "**/*.{c,h}" },
    {
      provideCompletionItems: (document, position) => {
        // Get the text of the document up to the completion position.
        const text = document
          .lineAt(position)
          .text.substring(0, position.character);
        const match = text.match(regex);
        if (match) {
          return {
            isIncomplete: false,
            items: _getCompletions(directory, ".h", end),
          };
        }
        return undefined;
      },
    },
    ...triggers
  );
}

module.exports = {
  defaultCompletions: _registerCompletions({
    directory: getToolchainIncludesDirectory(),
    triggers: ["<"],
  }),
  registerCompletions: _registerCompletions,
};
