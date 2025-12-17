# Java-Path

A comprehensive TypeScript library for detecting, managing, and working with Java installations across different platforms (Windows, macOS, Linux, and Termux).

## Features

- **Platform Detection**: Detect the current operating system and architecture
- **Java Version Management**: Locate and manage multiple Java installations
- **Termux Support**: Special handling for Java in Termux environments
- **File Integrity Verification**: Automatic checksum and size verification for downloaded files
- **Utility Functions**: File operations, command execution, and validation helpers

## Installation

To install dependencies:

```bash
bun install
```

## Usage

### Building the Library

To build the library for distribution:

```bash
bun run build
```

This will create a bundled version in the `dist` directory optimized for Node.js.

### Basic Usage

```typescript
import {
  env,
  getJavaInfo,
  findJavaVersion,
  FileUtils,
  taskManager,
  defaultPaths,
  CommandUtils,
} from "java-path";

// Get environment information
console.log(env.platform.name); // e.g. "windows"
console.log(env.arch); // e.g. "x64"

// Get Java information
const javaInfo = await getJavaInfo("17");

// Find installed Java versions
const javaVersions = await findJavaVersion("/path/to/java/installations");

// Use file utilities
await FileUtils.writeFile(filePath, "", "filename.txt", "content");
const exists = await FileUtils.pathExists(filePath);

// Use task manager for Java operations
const { taskId, promise } = taskManager.createBackup(sourceDir, {
  outputFilename: "backup.zip",
  useZip: true,
});

// Configure default paths
defaultPaths.update({
  downloadPath: "/custom/downloads",
  unpackPath: "/custom/unpacked",
  backupPath: "/custom/backups",
  backupPath: "/custom/backups",
});

// Check if a command is available
const hasGit = await CommandUtils.isCommandAvailable("git");
```

### Installing Java

The library provides utilities to automatically find or download and install Java versions. This is useful for applications that need to ensure a specific Java version is available.

```typescript
import {
  findJavaVersion,
  defaultPaths,
  JavaInfoService,
  taskManager,
} from "java-path";
import path from "path";

async function getOrInstallJava(version = 23) {
  // First, check if the version is already installed
  const findResult = await findJavaVersion(defaultPaths.unpackPath, version);

  if (!findResult) {
    // Get all available Java versions
    const allJavaVersions = await JavaInfoService.getInstallableVersions();

    // Find the specific version
    const findVersion = await JavaInfoService.filter(
      allJavaVersions.data.releases,
      Number(version)
    );

    if (!findVersion.data) {
      console.warn("No Java version found");
      return { allJavaVersions, version };
    }

    // Download Java
    const downloadJava = await JavaInfoService.downloadJavaRelease(
      findVersion.data,
      `java-${version}.zip`
    );

    if (!downloadJava || !downloadJava.data) {
      console.error("Failed to download Java");
      return { allJavaVersions, version };
    }

    // Wait for download to complete
    await downloadJava.data.promise;

    // Unpack the downloaded Java
    const { promise, taskId } = await taskManager.unpack(
      path.join(defaultPaths.downloadPath, `java-${version}.zip`)
    );

    await promise;

    // Verify the installation
    const newResult = await findJavaVersion(defaultPaths.unpackPath, version);
    return { findResult: newResult, downloadJava, allJavaVersions };
  }

  return { findResult, allJavaVersions };
}

// Usage
getOrInstallJava(21)
  .then((result) => {
    console.log("Installation result:", result);
  })
  .catch((error) => {
    console.error("Installation error:", error);
  });
```

You can find a complete example in `examples/install.ts`.

### CLI Commands

```bash
# Run main module
bun run index.ts

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Build project
bun run build

# Run the install example
bun run examples/install.ts
```

## API Documentation

### Environment Detection (`env`)

Utilities for detecting the current platform and environment:

```typescript
import { env } from "java-path";

// Platform information
env.platform.name; // Platform name: "windows", "linux", "mac", "android"
env.platform.ext; // Platform file extension: ".exe", "", "", ""
env.isWindows(); // Returns true on Windows
env.isLinux(); // Returns true on Linux
env.isMac(); // Returns true on macOS
env.isTermux(); // Returns true on Termux (Android)

// Architecture information
env.arch; // Architecture: "x86", "x64", "arm64", etc.
```

### Java Information (`getJavaInfo`)

Retrieve information about Java versions:

```typescript
import { getJavaInfo } from "java-path";

// Get Java information for a specific version
const javaInfo = await getJavaInfo("11");

// JavaInfoStandard structure (for non-Termux platforms)
interface JavaInfoStandard {
  version: string;
  url: string;
  filename: string;
  javaBinPath: string;
  downloadPath: string;
  unpackPath: string;
  isTermux: false;
}

// JavaInfoTermux structure (for Termux)
interface JavaInfoTermux {
  isTermux: true;
  // ... platform-specific properties
}
```

### Java Installation Management

Manage Java installations on the system:

```typescript
import { findJavaVersion, scanJavaInstallations } from "java-path";

// Scan a directory for Java installations
const installations = await scanJavaInstallations("/path/to/search");

// Find a specific Java version
const java11 = await findJavaVersion("/path/to/search", 11, {
  requireSameArch: true, // Only return matching architecture
  requireSameOS: true, // Only return matching OS
  requireValid: true, // Only return installations with valid java executable
});
```

### Java Service (`JavaInfoService`)

Advanced Java operations:

```typescript
import { JavaInfoService } from "java-path";

// Get all installable versions
const versionsInfo = await JavaInfoService.getInstallableVersions();
// Returns JavaVersionsInfo with available versions, LTS versions, releases, etc.

// Filter releases by version
const release = await JavaInfoService.filter(releases, 17);

// Download a Java release
const result = await JavaInfoService.downloadJavaRelease(release, "jdk-17.zip");

// Decompress a Java release
const unpackResult = await JavaInfoService.decompressJavaRelease(
  filePath,
  destination
);
```

### File Utilities (`FileUtils`)

File system operations:

```typescript
import { FileUtils } from "java-path";

// Write files
await FileUtils.writeFile(basePath, subDir, filename, content);

// Check if path exists
const exists = await FileUtils.pathExists(path);

// Delete files or directories
await FileUtils.delete(path);

// Rename files
await FileUtils.rename(oldPath, newPath);

// Validate files
const validation = await FileUtils.checkFileValidity(path, options);
// Returns a success/error response with validation details
```

### Folder Utilities (`FolderUtils`)

Directory operations:

```typescript
import { FolderUtils } from "java-path";

// Get folder details
const details = await FolderUtils.getFolderDetails(path, options);

// Get directory summary
const summary = await FolderUtils.getDirectorySummary(path);

// Quick directory stats
const stats = await FolderUtils.getQuickDirStats(path);

// Get files with various filters
const files = await FolderUtils.getFiles(path, {
  extension: ".java",
  minSize: 1024,
  maxSize: 10240,
  recursive: true,
  depth: 3,
});
```

### Task Manager (`taskManager`)

Manage asynchronous operations:

```typescript
import { taskManager } from "java-path";

// Create a backup task
const { taskId, promise } = taskManager.createBackup(sourceDir, {
  outputFilename: "backup.zip",
  useZip: true,
});

// Restore from backup
const restoreTask = taskManager.restoreBackup(backupPath, {
  destinationFolderName: "restored-data",
});

// Unpack archives
const unpackTask = taskManager.unpack(archivePath, {
  destination: "extracted-files",
});

// Download files
const downloadTask = taskManager.download(url, {
  fileName: "downloaded-file.zip",
});

// Wait for task completion
const result = await taskManager.waitForTask(taskId);

// Get task information
const task = taskManager.getTask(taskId);
```

### Command Utilities (`CommandUtils`)

Execute system commands:

```typescript
import { CommandUtils } from "java-path";

// Check if command is available
const hasGit = await CommandUtils.isCommandAvailable("git");

// Get package manager
const packageManager = await CommandUtils.getPackageManager();
// Returns "npm", "yarn", "pnpm", "bun", etc.

// Check if package is installed
const isInstalled = await CommandUtils.isPackageInstalled("react", "npm");

// Run commands
const result = await CommandUtils.runCommand("git", ["status"]);
// Returns an object with stdout, stderr, and exit code
```

### Validation Utilities

Create consistent response objects:

```typescript
import {
  createSuccessResponse,
  createErrorResponse,
  isSuccess,
} from "java-path";

// Create success response
const success = createSuccessResponse(data);

// Create error response
const error = createErrorResponse("Error message", { details });

// Check response type
if (isSuccess(response)) {
  // Handle success
} else {
  // Handle error
}
```

## Testing

This project uses Bun's built-in test runner. Tests are organized in the `tests/` directory with the following structure:

- `tests/platforms/` - Tests for platform detection utilities
- `tests/services/` - Tests for Java installation services
- `tests/utils/` - Tests for utility functions

To run all tests:

```bash
bun test
```

## Customizing Default Paths

Java-Path allows you to customize the default paths used for downloads, unpacking, and backups:

```typescript
import { defaultPaths, taskManager } from "java-path";

// View current default paths
console.log("Download Path:", defaultPaths.downloadPath);
console.log("Unpack Path:", defaultPaths.unpackPath);
console.log("Backup Path:", defaultPaths.backupPath);

// Update paths with custom locations
defaultPaths.update({
  downloadPath: "/path/to/custom/downloads",
  unpackPath: "/path/to/custom/unpacked",
  backupPath: "/path/to/custom/backups",
});

// The taskManager will now use the new paths for all operations
```

### Example: Custom Paths in Action

```typescript
import { defaultPaths, taskManager } from "java-path";
import path from "node:path";

// Set custom paths relative to current working directory
defaultPaths.update({
  downloadPath: path.join(process.cwd(), "my-downloads"),
  unpackPath: path.join(process.cwd(), "my-unpacked"),
  backupPath: path.join(process.cwd(), "my-backups"),
});

// Now all task operations will use these paths
const { taskId, promise } = taskManager.createBackup(sourceDir, {
  outputFilename: "backup.zip",
  useZip: true,
});

// To reset paths to defaults:
// defaultPaths.reset();
```

### Example: Installing Java

See the `examples/install.ts` file for a complete example of how to find or download and install a specific Java version:

```bash
# Run the install example
bun run examples/install.ts
```

When paths are updated using `defaultPaths.update()`, the TaskManager instance is automatically recreated with the new paths, ensuring all subsequent operations use the updated paths.

## Examples

Check out the `examples/` directory for working examples:

- `custom-paths-example.ts` - Demonstrates how to customize default paths

To run the custom paths example:

```bash
bun run examples/custom-paths-example.ts
```

To run specific test files:

```bash
bun test tests/platforms/env.test.ts
bun test tests/platforms/java.test.ts
bun test tests/utils/file.test.ts
bun test tests/utils/validator.test.ts
```

## Project Structure

```
Java-Path/
├── src/
│   ├── platforms/
│   │   ├── env.ts         # Environment detection utilities
│   │   └── java.ts        # Java-specific platform utilities (sync)
│   ├── services/
│   │   ├── installations.ts # Java installation scanning
│   │   ├── java.service.ts  # Main Java operations service (async)
│   │   └── taskInstance.ts  # Task management logic
│   ├── utils/
│   │   ├── commands.ts    # Command execution utilities
│   │   ├── file.ts        # File operation utilities
│   │   ├── folder.ts      # Folder operation utilities
│   │   └── validator.ts   # Response validation utilities
│   └── config.ts          # Configuration (default paths)
├── tests/                 # Test files
├── examples/              # Usage examples
├── index.ts               # Main entry point
└── README.md              # This file
```

## License

This project is private.

## Contributing

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
