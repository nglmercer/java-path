# Java-Path

[![npm](https://img.shields.io/npm/v/java-path)](https://www.npmjs.com/package/java-path)
[![GitHub](https://img.shields.io/github/stars/nglmercer/java-path?style=social)](https://github.com/nglmercer/java-path)

**Links:**

- [GitHub Repository](https://github.com/nglmercer/java-path)
- [NPM Package](https://www.npmjs.com/package/java-path)

A comprehensive TypeScript library for detecting, managing, and working with Java installations across different platforms (Windows, macOS, Linux, and Termux).

## 🚀 Quick Start

```bash
# Install the library
npm install java-path

# Basic usage
import { env, detectJavaPathsSync } from "java-path";

console.log(`Running on ${env.platform.name} (${env.arch})`);
const javaPaths = detectJavaPathsSync();
console.log("Found Java installations:", javaPaths);
```

## 📚 Documentation

This project uses a comprehensive modular documentation structure. Please refer to the specific sections below:

### Getting Started
- **[Introduction](./docs/introduction.md)** - Overview, Features, and Project Structure
- **[Installation](./docs/installation.md)** - How to install the library
- **[Getting Started & Usage](./docs/getting-started.md)** - Building, Basic Usage, and CLI Commands
- **[Configuration](./docs/configuration.md)** - Customizing default paths (downloads, unpacking, etc.)
- **[Testing](./docs/testing.md)** - How to run the test suite

### API Reference
- **[Environment & Platform](./docs/api/env.md)** - Platform detection utilities
- **[Java Information & Management](./docs/api/java-info.md)** - Local Java installation management
- **[Java Service (Remote)](./docs/api/java-service.md)** - Remote Java repository operations
- **[Task Manager](./docs/api/task-manager.md)** - Async operation handling
- **[File & Folder Utilities](./docs/api/files.md)** - File system operations
- **[Command Utilities](./docs/api/commands.md)** - Shell command execution and Java path detection
- **[Validation helpers](./docs/api/validation.md)** - Standardized response types

### Examples
- **[Basic Usage](./examples/basic-usage.ts)** - Simple usage examples
- **[Java Path Detection](./examples/java-path-detection.ts)** - Detecting Java installations
- **[Installation Script](./examples/install.ts)** - Complete installation workflow

## 🎯 Key Features

- **🔍 Platform Detection**: Automatically detect the current operating system (Windows, Linux, macOS, Android) and architecture (x64, arm64, etc.)
- **☕ Java Version Management**: Scan directories for valid Java installations, check file integrity, and manage versions
- **📱 Termux Support**: Specialized handling for managing Java within the Termux environment on Android devices
- **🔒 File Integrity Verification**: Automatic checksum and size verification for downloaded files to ensure reliability
- **🛠️ Utility Functions**: A rich set of helpers for file operations, folder traversal, command execution, and validation
- **🔧 Type Safety**: Built with TypeScript, providing full type support and definitions
- **⚡ Async Task Management**: Progress tracking for long operations with cancellation support
- **🌍 Cross-Platform**: Works on Windows, macOS, Linux, and Termux

## 📦 Installation

To install `java-path`:

```bash
# Using npm
npm install java-path

# Using bun
bun install java-path

# Using yarn
yarn add java-path
```

### Requirements

- **Runtime**: Node.js v20.0.0 or later, Bun v1.0.0 or later
- **OS**: Windows, macOS, Linux, or Android (via Termux)

## 💡 Usage Examples

### Environment Detection

```typescript
import { env } from "java-path";

// Platform information
console.log(env.platform.name); // "windows", "linux", "mac", or "android"
console.log(env.platform.ext);  // Platform executable extension
console.log(env.arch);          // System architecture

// Platform checks
if (env.isWindows()) { /* Windows-specific code */ }
if (env.isLinux()) { /* Linux-specific code */ }
if (env.isMac()) { /* macOS-specific code */ }
if (env.isTermux()) { /* Termux-specific code */ }
```

### Java Path Detection

```typescript
import { detectJavaPathsSync, validateJavaPathSync } from "java-path";

// Synchronously detect Java paths
const javaPaths = detectJavaPathsSync();
console.log("Found Java installations:", javaPaths);

// Validate a specific Java path
const isValid = validateJavaPathSync("/usr/bin/java");
console.log("Java path is valid:", isValid);
```

### Java Installation Management

```typescript
import { scanJavaInstallations, findJavaVersion } from "java-path";

// Scan for Java installations
const installations = await scanJavaInstallations("/usr/lib/jvm");

// Find specific Java version
const java17 = await findJavaVersion("/usr/lib/jvm", 17, {
  requireValid: true,
  requireSameArch: true,
});
```

### Download and Install Java

```typescript
import { JavaInfoService, taskManager } from "java-path";

// Get available Java versions
const info = await JavaInfoService.getInstallableVersions();
console.log("Available versions:", info.available); // [8, 11, 17, 21]

// Download Java 17
const release = await JavaInfoService.filter(info.releases, 17);
const downloadTask = await JavaInfoService.downloadJavaRelease(
  release,
  "jdk-17.zip"
);

// Track download progress
taskManager.on("task:progress", (task) => {
  console.log(`Download progress: ${task.progress}%`);
});

await downloadTask.data.promise;

// Extract the downloaded archive
await JavaInfoService.decompressJavaRelease(
  "downloads/jdk-17.zip",
  "java-installations/jdk-17"
);
```

### Task Management

```typescript
import { taskManager } from "java-path";

// Create backup
const job = taskManager.createBackup("./data", {
  outputFilename: "backup.zip",
  useZip: true,
});
await job.promise;

// Download file with progress tracking
const downloadJob = taskManager.download("https://example.com/file.zip", {
  fileName: "file.zip",
});

taskManager.on("task:progress", (task) => {
  console.log(`Task ${task.id}: ${task.progress}%`);
});

await downloadJob.data.promise;
```

### File Operations

```typescript
import { FileUtils, FolderUtils } from "java-path";

// File operations
await FileUtils.writeFile(base, subDir, name, content);
const exists = await FileUtils.pathExists(path);
await FileUtils.delete(path);
await FileUtils.rename(oldPath, newPath);

// File validation
await FileUtils.checkFileValidity("config.json", {
  maxSize: 1024,
  allowedExtensions: [".json"],
});

// Folder operations
const details = await FolderUtils.getFolderDetails(path);
const summary = await FolderUtils.getDirectorySummary(path);
const javaFiles = await FolderUtils.getFiles("./src", {
  extension: ".java",
  recursive: true,
});
```

### Command Execution

```typescript
import { CommandUtils } from "java-path";

// Check command availability
if (await CommandUtils.isCommandAvailable("java")) {
  // Java is available
}

// Get package manager
const manager = await CommandUtils.getPackageManager();

// Run commands
const { stdout, stderr, exitCode } = await CommandUtils.runCommand("java", ["-version"]);

// Detect Java installation paths
const javaPaths = await CommandUtils.detectJavaPaths();
console.log("Found Java installations:", javaPaths);

// Validate Java path
const isValid = await CommandUtils.validateJavaPath("/path/to/java");
console.log("Java path is valid:", isValid);
```

## 🔧 Configuration

Customize default paths for downloads, unpacking, and backups:

```typescript
import { defaultPaths } from "java-path";
import path from "node:path";

// Update paths
defaultPaths.update({
  downloadPath: path.join(process.cwd(), "my-downloads"),
  unpackPath: path.join(process.cwd(), "my-java-installs"),
  backupPath: path.join(process.cwd(), "my-backups"),
});

// Reset to defaults
// defaultPaths.reset();
```

## 🧪 Testing

This project uses Bun's built-in test runner:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test
bun test tests/utils/file.test.ts
```

## 📝 CLI Commands

Available bun scripts:

| Command | Description |
|---------|-------------|
| `bun run index.ts` | Run main entry point |
| `bun test` | Run all tests |
| `bun test --watch` | Run tests in watch mode |
| `bun test --coverage` | Run tests with coverage |
| `bun run build` | Build for production |
| `bun run examples/install.ts` | Run installation example |

## 🏗️ Project Structure

```
java-path/
├── src/
│   ├── platforms/     # Platform detection and Java logic
│   ├── services/      # High-level services
│   ├── utils/         # General utilities
│   └── types/         # TypeScript definitions
├── tests/             # Test files
├── examples/          # Usage examples
└── docs/              # Documentation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh/) for excellent performance
- Uses [Adoptium API](https://adoptium.net/) for Java version information
- Inspired by the need for better Java installation management tools

## 📞 Support

If you encounter any issues or have questions:

1. Check the [documentation](./docs/) first
2. Search existing [GitHub issues](https://github.com/nglmercer/java-path/issues)
3. Create a new issue with detailed information about your problem

---

**Happy coding!** 🚀
