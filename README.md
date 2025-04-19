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

  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/1a-create-or-import.mp4.gif)

  - Automatically prompts for folder and project name  
  - Supports importing `.atsln` or `.cproj` projects  
  - Fully offline toolchain support (recommended)  

  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/1b-project-name.mp4.gif)

- **No Toolchain? No Problem**  
  You’ll be prompted to either locate an existing toolchain (e.g., from Microchip Studio) or download one directly.

  ![folders](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/1c-toolchain-directory.png)  
  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/1c-no-toolchain.mp4.gif)

- **Select a Device First**  
  Pick your microcontroller before building — ensures proper header files are used.

  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/1d-select-first-prompt.mp4.gif)  
  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/1e-select-and-build.mp4.gif)  
  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/1f-build-outputs.mp4.gif)

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

  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/2a-completions.mp4.gif)

- **Header Links**  
  Clickable includes to quickly navigate your project files.

  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/2b-header-links.mp4.gif)

- **Register & Symbol Definitions**  
  Works for both MCU-defined symbols like `PORTB` and user-defined functions.

  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/3a-definitions-from-device-headers.mp4.gif)  
  ![IMAGE](https://github.com/StrongTheDev/avr-utils/raw/main/assets/readme/3b-definitions-from-own-headers.mp4.gif)

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
Check the [changelog](CHANGELOG.md) for details on updates and fixes.
