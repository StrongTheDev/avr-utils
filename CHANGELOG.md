# Change Log

All notable changes to the "avr-utils" extension will be documented in this file.

### 0.3.1
- Disabled serial monitor functionality since it causes the extension to crash
- Updated vscode dependency to ^1.75.0
- Reduced extension package size by moving GIFs and images to GitHub-hosted links in README
- Updated the icon for the extension.
- Moved all recent updates to `CHANGELOG.md` (this file)
- Moved esbuild config into esbuild.js


### 0.3.0
- Full extension code refactor for a more robust developer and consumer experience.
- Refactored upload logic: separated upload with saved settings from user prompt flow for programmer/port
- Improved storage handling: switched to VSCode globalState/workspaceState for settings persistence
- Fixed circular dependency issues in storage and toolchain modules
- Improved error handling and messaging throughout the extension
- Introduced typescript into the extension
- Improved the upload settings UI:
  1. Select your preferred settings once and use the upload (↑) button in the menu to upload to microcontroller using avrdude.
  2. If you wish to change settings, you can press the upload (↑) button while pressing Alt, which changes it into a gear icon (⚙️) which will allow you to change the settings.

### 0.2.1
- ✅ Added Serial Monitor feature:
  - Displays as a Webview panel beside the active editor.
  - Supports serial port selection and baud rate configuration.
  - Includes a modern UI with line ending selection, start/stop monitoring, clear output, autoscroll, and data rate indicator.
  - Throttles updates (100ms) and limits output (500 lines) for performance.
  - Handles errors for serial port operations with user-friendly messages.
  - Improved archive extraction
  
### 0.2.0

- ✅ Fixed false "Upload failed" errors by improving success detection:
  - Checks exit code, "avrdude done" message, and "bytes of flash verified"
  - Captures full output for better diagnostics
- 📋 Enhanced error reporting with detailed messages
- 🔧 Maintained USBasp no-port support and fuse configurability
- 📜 Added detailed console logging for upload results
- 📘 Updated README with new features and improvements


### 0.1.9

- 🧩 Added cross-platform avrdude auto-download support (Windows, Linux, macOS)
- 📦 Archive format detection with platform-specific handling (zip/tar.gz)
- 📤 Extract logic using `decompress` or `tar.x` based on format
- 🔐 Applied `chmod` to Unix binaries post-extraction
- 🛠️ Fallback to system-installed `avrdude` if download skipped
- 💾 Saved upload settings (programmer, MCU, port) with "Use Saved" prompt
- 🔽 Expanded programmer dropdown: 13+ common types + "Custom..." option
- 🔁 Redirect-safe download via `followRedirects()`
- ✅ Ensures avrdude binary exists before proceeding with upload
- 🧪 Console logs added throughout for debugging and transparency
- 🧼 Refactored helper structure for readability and maintainability
- 📘 README updated with full feature documentation and checklist


### 0.1.8

- 🎯 Added automatic avrdude download feature:
  - Downloads avrdude v8.0 from GitHub (Windows/Linux/macOS)
  - Handles HTTP 302 redirects
  - Displays download and extraction progress
  - Grants executable permissions where needed
  - Confirms binary presence before upload continues

### [0.1.5]
- The previous error had persisted but i have fixed it this time for good!
- A certain function was making the extension fail to start, but it has been fixed too.

### [0.1.4]
- Fix error where commands like "Create New Project" in the command palette claim that they are missing ( Would happen especially on VSCode version < 1.75 ).
- Added a progress bar when downloading the toolchain, so that you (the user) are aware of the process.
- Better error message diagnostics, the extension was really lacking in this area as compilations were not giving useful error messages in case errors existed.
- Added necessary configurations to allow VSCode's keybinds `Ctrl+/` and `Alt+Shift+A` to quickly comment and uncomment lines and blocks of code respectively.
- There was also a (slightly annoying) visual bug where the compile button would render at ALL times. This has also been fixed.
- Changed the quick action for compiling from `F5` to `F4` because F5 is usually used for debugging.
- Moving from manual builds of minified js file to a CI based workflow (Thank you, GitHub Actions!)

### [0.1.2]

-   Refactored Code to get the proper list of devices directly from `io.h` file in the avr toolchain. [#3](https://github.com/DanielHuey/avr-utils/issues/3)
-   Find the list of devices and their files from `out/storage/device_and_file.json`. It's generated using the python script from `src/storage/getDevices.py` (you may need to check it from the `dev` branch)

### [0.1.1]

-   Added an icon

### [0.0.3]

-   Readme now uses GIFs so it's compatible with Marketplace

### [0.0.2]

-   Added a language "`avr-c`" to the `contributes.languages` section of the package.json file, so that the extension does not conflict with "`ms-vscode.cpptools`".
-   Added a language "`asm`" to the `contributes.languages` section of the package.json file, so that the language can be recognized by the extension.
-   Updated the code such that the providers in `./src/providers` handle avr-c instead of c.
-   Updated the code to work better with assembly files (`.s` and `.asm`)
-   Added `.h` files as an alias to `avr-c` as well, to prevent logging errors from `ms-vscode.cpptools`
-   Created syntax highlighting for both `asm` and `avr-c` to present code better to a user.
-   Added a setting (_user can change it from VSCode settings_) that always pops up the terminal during each build. This is especially useful to check for build errors since the terminal output is inaccessible to extensions.

### [0.0.1]

-   Initial release
