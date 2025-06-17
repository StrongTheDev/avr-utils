const path = require("path");
const fs = require("fs");
const vscode = require("vscode");
const {
  previousPINDefinitions,
  devicesAndHeaderFiles,
} = require("../util/constants");
const { getToolchainIncludesDirectory } = require("../util/toolchain");
const { getSelectedMMCUDevice } = require("../core/deviceManager");
const { getWorkspaceFolderPath } = require("../core/workspaceManager");
const keywords = [
  "auto",
  "break",
  "case",
  "char",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extern",
  "float",
  "for",
  "goto",
  "if",
  "int",
  "long",
  "register",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "struct",
  "switch",
  "typedef",
  "union",
  "unsigned",
  "void",
  "volatile",
  "while",
  "class",
  "namespace",
  "template",
  "constexpr",
  "decltype",
  "noexcept",
  "nullptr",
  "override",
  "final",
  "thread_local",
  "alignas",
  "alignof",
  "static_assert",
  "concept",
  "consteval",
  "constinit",
  "co_await",
  "co_yield",
  "co_return",
  "requires",
  "typename",
  "using",
];

//this code here has a lot of hard coded "variable" outcomes,
//especially at the "avrdir.forEach" loop in order to get correct filenames.
const provider = vscode.languages.registerDefinitionProvider(
  { scheme: "file", language: "avr-c", pattern: "**/*.{c,cpp,cxx,h}" },
  {
    provideDefinition: (doc, pos) => {
      const wordBeingChecked = doc.getText(doc.getWordRangeAtPosition(pos));
      vscode.window.showInformationMessage(
        `Word being checked: ${wordBeingChecked}`
      );
      if (
        Array.from(previousPINDefinitions.keys()).includes(wordBeingChecked)
      ) {
        return previousPINDefinitions.get(wordBeingChecked);
      }
      const listOfGlobalHeaders = [];
      const listOfWorkspaceHeaders = [];
      // const dmatch = selectedDevice().match(/^([a-zA-Z]+)((\d*)(.*?(\d?)))$/);
      // const avrdir = fs.readdirSync(path.join(includeDir(), "avr"));
      // avrdir.forEach((h) => {
      //     if (dmatch[0].includes("rf401") && h === "io86r401.h") {
      //         listOfGlobalHeaders.push(path.join(includeDir(), "avr", h));
      //     } else if (dmatch[4].startsWith("pwm") && h.includes("pwm")) {
      //         listOfGlobalHeaders.push(path.join(includeDir(), "avr", h));
      //     } else if (dmatch[4].startsWith("can") && h.includes(dmatch[4])) {

      //         listOfGlobalHeaders.push(path.join(includeDir(), "avr", h));
      //     } else if (dmatch[4].startsWith("usb") && h.includes(dmatch[4].replace("usb", "u").substring(0, dmatch[4].replace("usb", "u").length - 1))) {
      //         listOfGlobalHeaders.push(path.join(includeDir(), "avr", h));
      //     } else if (h.includes(`${dmatch[1].includes("atmega") ? "m" : ""}${dmatch[2]}.h`)) {
      //         listOfGlobalHeaders.push(path.join(includeDir(), "avr", h));
      //     }
      // });
      listOfGlobalHeaders.push(
        path.join(
          getToolchainIncludesDirectory(),
          "avr",
          devicesAndHeaderFiles()[getSelectedMMCUDevice()]
        )
      );

      const globre = /^#include\s<(.*)>/;
      const locre = /^#include\s"(.*)"/;
      for (let line = 0; line < doc.lineCount; line++) {
        const element = doc.lineAt(line).text;
        const match1 = element.match(globre);
        const match2 = element.match(locre);
        if (match1) {
          listOfGlobalHeaders.push(
            path.join(getToolchainIncludesDirectory(), match1[1])
          );
        } else if (match2) {
          listOfWorkspaceHeaders.push(
            path.join(getWorkspaceFolderPath(), match2[1])
          );
        }
      }

      /**@type {vscode.Location[]} This is the list of locations that will be returned to the user*/
      let listOfLocations = [];

      const hashDefineRe = new RegExp(
        `^#\\s?define\\s+\\b${wordBeingChecked}\\b`
      );
      const funcVarRe = new RegExp(
        `\b(void|int|char|short|long|float|double|signed|unsigned|const|static|extern|auto|register|volatile|inline|class|struct|enum|typename)\b(?:\s*<.*?>)?\s*?${wordBeingChecked}(?:\s*\([^)]*\))?.*?`
      );

      /**@param {string[]} headerList  */
      function definitionsFromHeaders(headerList) {
        headerList.forEach((header) => {
          const headerDocument = fs.readFileSync(header, "utf8");
          const documentLines = headerDocument.split("\n");
          for (let line = 0; line < documentLines.length; line++) {
            if (hashDefineRe.test(documentLines[line])) {
              const match = documentLines[line].match(hashDefineRe);
              listOfLocations.push(
                new vscode.Location(
                  vscode.Uri.file(header),
                  new vscode.Position(line, match.index)
                )
              );
            } else if (funcVarRe.test(documentLines[line])) {
              const match2 = documentLines[line].match(funcVarRe);
              listOfLocations.push(
                new vscode.Location(
                  vscode.Uri.file(header),
                  new vscode.Position(line, match2.index + match2[1].length + 1)
                )
              );
            }
          }
        });
      }
      if (
        !globre.test(doc.lineAt(pos.line).text) ||
        !locre.test(doc.lineAt(pos.line).text) ||
        !/^define$/.test(wordBeingChecked)
      ) {
        if (!keywords.includes(wordBeingChecked)) {
          definitionsFromHeaders(listOfGlobalHeaders);
          definitionsFromHeaders(listOfWorkspaceHeaders);
          previousPINDefinitions.set(wordBeingChecked, listOfLocations);
        }
      }
      return listOfLocations;
    },
  }
);
module.exports = {
  definitions: provider,
};
