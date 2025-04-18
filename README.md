[![Discord Server](https://img.shields.io/discord/1359270749642424611)](https://discord.gg/QjKKyBE873) 

# avr-utils README

Welcome to **`avr-utils`**.

This extension helps users to write and compile code for their AVR microcontrollers straight from the comfort of their favorite code editor, **VSCode**.

```yaml
New Features:
- Progress bar when downloading toolchain.
- Better error message diagnostics (Big Improvement!)
- Simplified Commenting of code.
- Added Upload functionality: Upload .hex or .elf files directly to your AVR microcontroller.
- Automatic avrdude download for Windows, Linux, and macOS — with redirect handling and platform-specific archive support.
- Programmer type dropdown expanded: supports 13+ common avrdude programmer options.
- Improved upload success detection and error handling
- Added Serial Monitor: Monitor and interact with your AVR microcontroller via a serial port directly in VSCode.
```

---

> Authors: [@Alireza-Jahanbakhshi](https://github.com/Alireza-Jahanbakhshi), [@StrongTheDev](https://github.com/StrongTheDev)

## Features

### 🔧 Projects: Creating and Importing

- **Create or Import**  
  Easily create a new AVR project or import an existing one from Microchip/Atmel Studio.

  ![IMAGE](assets/readme/1a-create-or-import.mp4.gif)

  - Automatically prompts for folder and project name  
  - Supports importing `.atsln` or `.cproj` projects  
  - Fully offline toolchain support (recommended)  

  ![IMAGE](assets/readme/1b-project-name.mp4.gif)

- **No Toolchain? No Problem**  
  You’ll be prompted to either locate an existing toolchain (e.g., from Microchip Studio) or download one directly.

  ![folders](assets/readme/1c-toolchain-directory.png)  
  ![IMAGE](assets/readme/1c-no-toolchain.mp4.gif)

- **Select a Device First**  
  Pick your microcontroller before building — ensures proper header files are used.

  ![IMAGE](assets/readme/1d-select-first-prompt.mp4.gif)  
  ![IMAGE](assets/readme/1e-select-and-build.mp4.gif)  
  ![IMAGE](assets/readme/1f-build-outputs.mp4.gif)

---

### ⚡ Uploading to Microcontroller

#### >> Upload with Saved Programmer Settings and Auto-Download

The extension supports uploading your compiled `.hex` file to an AVR microcontroller with a smooth UX:

- ✅ **Saved Upload Settings**  
  After the first upload, settings like `programmer`, `mcu`, and `port` are saved to `.vscode/avr_project.json`. You’ll be prompted to reuse or reconfigure them next time.

- ✅ **Expanded Programmer Selection**  
  Choose from a comprehensive list of programmer types:

  ```
  usbasp, avrisp2, stk500v1, stk500v2, arduino, wiring,
  avrisp, usbtiny, dragon_isp, dragon_dw, jtag1, jtag2, pickit2, ponyser
  ```

- ✅ **Automatic avrdude Download**  
  - Downloads platform-specific avrdude (Windows, Linux, macOS) if missing  
  - Handles GitHub redirects  
  - Progress reporting during download  
  - Extracts to toolchain bin folder  
  - Grants executable permission on Unix systems automatically

- ✅ **Improved Upload Handling**  
  - Robust success detection using multiple indicators (exit code, completion message, verification status)  
  - Detailed error reporting with full output  
  - USBasp support without port requirement maintained  
  - Configurable fuse settings with defaults for atmega16

- ✅ **Fallbacks & Robustness**  
  - Detailed console logging for upload results and errors
  - Will fallback to system-installed `avrdude` if download skipped  
  - Verifies `avrdude` exists post-install  
  - All errors are logged for transparency

🔁 Use "Upload to Microcontroller" from the Command Palette or press `F5`.

> 💡 Make sure the compiled `.hex` exists inside your `Debug` folder.


> 

------

### 📡 Serial Monitor

#### >> Monitor and Interact with Your AVR Microcontroller

The extension now includes a Serial Monitor to communicate with your AVR microcontroller via a serial port:

- ✅ 

  Interactive Serial Communication

  - Open the Serial Monitor to view incoming data from your microcontroller and send messages back.
  - Supports selecting a serial port and baud rate via quick pick.

- ✅ 

  Modern UI

  - Features a toolbar with:
    - Line ending selection (None, Newline, Carriage Return, Both NL & CR).
    - Start/Stop button to toggle monitoring.
    - Clear button to clear the output.
    - Autoscroll toggle to control scrolling behavior.
    - Data rate indicator (lines per second).
  - Styled with a dark theme, hover effects, and tooltips for better usability.

- ✅ 

  Performance Optimization

  - Throttles updates to the UI every 100ms to prevent freezing.
  - Limits the output to 500 lines to maintain performance.

- ✅ 

  Error Handling

  - Displays error messages for serial port operations (e.g., failed to open port, write errors).
  - Automatically closes the Serial Monitor if the port is disconnected.

🔁 Use "Open Serial Monitor" from the Command Palette to launch the Serial Monitor.

> 💡 The Serial Monitor opens as a panel beside your active editor. Ensure your microcontroller is connected and sending data.

---

### ✨ Code Completions & Definitions

- **Toolchain Headers**  
  Autocompletion works for all `avr/io.h` and other standard headers.

  ![IMAGE](assets/readme/2a-completions.mp4.gif)

- **Header Links**  
  Clickable includes to quickly navigate your project files.

  ![IMAGE](assets/readme/2b-header-links.mp4.gif)

- **Register & Symbol Definitions**  
  Works for both MCU-defined symbols like `PORTB` and user-defined functions.

  ![IMAGE](assets/readme/3a-definitions-from-device-headers.mp4.gif)  
  ![IMAGE](assets/readme/3b-definitions-from-own-headers.mp4.gif)

---

## ⚙ Command Palette Contributions

Press `Ctrl+Shift+P` or `Cmd+Shift+P` → Type **AVR Utils** to access:

- **Create Project**
- **Open Microchip Project**
- **Build/Compile** (also `F4`)
- **Upload to Microcontroller** (`F5`)
- **Open Serial Monitor** 

---

## 🧰 Settings Contributions

Search for **AVR Utils** in VSCode settings:

- **Show terminal at each build** – toggle to view/hide build logs during compilation.

---

## 🐞 Known Issues

- `ms-vscode.cpptools` may cause red squiggles for `AVR C` projects.  
  Use the built-in **AVR C** language mode (auto-assigned to `.c` files) for better compatibility.

  ![IMAGE](assets/readme/5-languages.mp4.gif)

---

## 📦 Release Notes

### 0.3.0

- ✅ Added Serial Monitor feature:
  - Displays as a Webview panel beside the active editor.
  - Supports serial port selection and baud rate configuration.
  - Includes a modern UI with line ending selection, start/stop monitoring, clear output, autoscroll, and data rate indicator.
  - Throttles updates (100ms) and limits output (500 lines) for performance.
  - Handles errors for serial port operations with user-friendly messages.
  
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

### 0.0.3

- Changed README to use GIFs  
- Video assets converted to smaller GIFs

### 0.0.2

- Assembly support improved  
- Custom grammar and syntax highlighting

### 0.0.1

- Initial release of `avr-utils`
