const vscode = require("vscode");
const path = require("path");
const { getToolchainIncludesDirectory } = require("../util/toolchain");

/**
 *
 * @param {RegExp} regex - RegExp to match e.g `/#include <(.*)>/`
 * @param {string} directory - Directory where the linked files can be found, such that
 * if we have a file at **path/to/file** we can get the file from **`directory/path/to/file`**
 * @returns
 */
function newLinkProvider(regex, directory) {
  return vscode.languages.registerDocumentLinkProvider(
    { scheme: "file", language: "avr-c", pattern: "**/*.{c,cpp,cxx,h}" },
    {
      provideDocumentLinks: (document) => {
        const links = [];
        for (let line = 0; line < document.lineCount; line++) {
          const lineText = document.lineAt(line).text;
          const match = lineText.match(regex);
          if (match) {
            links.push(
              new vscode.DocumentLink(
                new vscode.Range(
                  line,
                  match.index + 10 + match[1].length,
                  line,
                  match.index + 10 + match[1].length + match[2].length
                ),
                vscode.Uri.file(path.join(directory, match[2]))
              )
            );
          }
        }
        return links;
      },
    }
  );
}

let _idirProv = newLinkProvider(
  /#(\s*?)include <(.*)>/,
  getToolchainIncludesDirectory()
);
function reset() {
  _idirProv.dispose();
  _idirProv = newLinkProvider(
    /#(\s*?)include <(.*)>/,
    getToolchainIncludesDirectory()
  );
}

module.exports = {
  includeDirProvider: _idirProv,
  createLinkProvider: newLinkProvider,
  resetIncludeDirectory: reset,
};
