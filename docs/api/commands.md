# Command Utilities

Utilities for executing system commands and managing packages.

## Overview

The Command Utilities provide cross-platform command execution, package management detection, and specialized Java path detection capabilities. All operations are designed to work consistently across Windows, macOS, Linux, and Termux environments.

## Basic Command Operations

### `isCommandAvailable(command)`

Checks if a command exists in the system PATH.

```typescript
import { CommandUtils } from "java-path";

if (await CommandUtils.isCommandAvailable("java")) {
  console.log("Java is available");
} else {
  console.log("Java is not in PATH");
}
```

**Parameters:**
- `command` (string): Command name to check

**Returns:** `Promise<ServiceResponse<boolean>>`

### `getPackageManager()`

Detects the active package manager (npm, yarn, pnpm, bun).

```typescript
const managerResult = await CommandUtils.getPackageManager();
if (managerResult.success) {
  console.log("Package manager:", managerResult.data);
  // Returns: "npm" | "yarn" | "pnpm" | "bun"
}
```

**Returns:** `Promise<ServiceResponse<PackageManager>>`

### `isPackageInstalled(name, manager?)`

Checks if a specific package is installed globally or locally.

```typescript
// Check with auto-detected package manager
const installed = await CommandUtils.isPackageInstalled("typescript");

// Check with specific package manager
const installedYarn = await CommandUtils.isPackageInstalled("react", "yarn");
```

**Parameters:**
- `name` (string): Package name to check
- `manager` (string, optional): Package manager to use (auto-detected if not specified)

**Returns:** `Promise<ServiceResponse<boolean>>`

### `runCommand(cmd, args)`

Executes a shell command and returns `stdout`, `stderr`, and `exitCode`.

```typescript
const result = await CommandUtils.runCommand("java", ["-version"]);

if (result.success) {
  console.log("Java version output:");
  console.log(result.data.stdout);
  
  if (result.data.stderr) {
    console.log("Warnings/Errors:");
    console.log(result.data.stderr);
  }
  
  console.log("Exit code:", result.data.exitCode);
}
```

**Parameters:**
- `cmd` (string): Command to execute
- `args` (string[]): Command arguments

**Returns:** `Promise<ServiceResponse<CommandResult>>`

#### CommandResult Interface

```typescript
interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

## Java Path Detection

### `detectJavaPaths()`

Detects Java installation paths by executing system commands. Uses multiple methods including `which`/`where` commands, JAVA_HOME environment variable, and common installation directories.

```typescript
const result = await CommandUtils.detectJavaPaths();

if (result.success) {
  console.log("Found Java paths:", result.data);
  // result.data: string[] - Array of detected Java executable paths
}
```

**Returns:** `Promise<ServiceResponse<string[]>>`

### `validateJavaPath(javaPath)`

Validates if a Java path exists and points to a valid Java executable.

```typescript
const result = await CommandUtils.validateJavaPath("/usr/bin/java");

if (result.success) {
  console.log("Path is valid:", result.data);
  // result.data: boolean - true if path exists and is executable
}
```

**Returns:** `Promise<ServiceResponse<boolean>>`

## Synchronous Methods

For performance-critical operations, synchronous versions are available:

### `detectJavaPathsSync()`

Synchronously detects Java installation paths.

```typescript
import { detectJavaPathsSync } from "java-path";

const javaPaths = detectJavaPathsSync();
console.log("Java paths:", javaPaths);
// Returns: string[] - Array of detected Java executable paths
```

**Returns:** `string[]`

### `validateJavaPathSync(javaPath)`

Synchronously validates if a Java path exists and is executable.

```typescript
import { validateJavaPathSync } from "java-path";

const isValid = validateJavaPathSync("/usr/bin/java");
console.log("Path is valid:", isValid);
// Returns: boolean - true if path exists and is executable
```

**Returns:** `boolean`

### `isCommandAvailable(commandName)`

Synchronous version of command availability check.

```typescript
import { isCommandAvailable } from "java-path";

if (isCommandAvailable("java")) {
  console.log("Java is available");
}
// Returns: boolean
```

**Returns:** `boolean`

### `getPackageManager()`

Synchronous version of package manager detection.

```typescript
import { getPackageManager } from "java-path";

const manager = getPackageManager();
console.log("Package manager:", manager);
// Returns: PackageManager
```

**Returns:** `PackageManager`

### `isPackageInstalled(packageName, pm?)`

Synchronous version of package installation check.

```typescript
import { isPackageInstalled } from "java-path";

const installed = isPackageInstalled("git");
console.log("Git installed:", installed);
// Returns: boolean
```

**Parameters:**
- `packageName` (string): Package name to check
- `pm` (string, optional): Package manager to use

**Returns:** `boolean`

## Detection Methods

The Java path detection uses multiple approaches:

1. **Command Detection**: Uses `which java` (Linux/macOS) or `where java` (Windows)
2. **Environment Variables**: Checks and validates `JAVA_HOME`
3. **Common Directories**: Searches typical Java installation locations:
   - **Windows**: `C:\Program Files\Java`, `C:\Program Files (x86)\Java`
   - **Linux**: `/usr/lib/jvm`
   - **macOS**: `/Library/Java/JavaVirtualMachines`

## Cross-Platform Support

All command utilities work across different platforms:

- **Windows**: Uses `where` command and Windows-specific paths
- **Linux/macOS**: Uses `which` command and Unix-style paths
- **Termux**: Special handling for Android environment

## Error Handling

All methods handle errors gracefully and return appropriate results:

- Async methods return `ServiceResponse<T>` with success/error states
- Sync methods return direct values or throw exceptions for critical errors
- Invalid paths and missing commands are handled without crashing

## Examples

### Basic Command Execution

```typescript
import { CommandUtils } from "java-path";

async function basicCommandExample() {
  // Check if Java is available
  const javaAvailable = await CommandUtils.isCommandAvailable("java");
  
  if (javaAvailable.success && javaAvailable.data) {
    console.log("Java is available");
    
    // Get Java version
    const versionResult = await CommandUtils.runCommand("java", ["-version"]);
    
    if (versionResult.success) {
      console.log("Java version information:");
      console.log(versionResult.data.stdout);
    }
  } else {
    console.log("Java is not available");
  }
  
  // Check package manager
  const managerResult = await CommandUtils.getPackageManager();
  if (managerResult.success) {
    console.log("Package manager:", managerResult.data);
  }
  
  // Check if a package is installed
  const gitInstalled = await CommandUtils.isPackageInstalled("git");
  if (gitInstalled.success && gitInstalled.data) {
    console.log("Git is installed");
  }
}
```

### Java Path Detection

```typescript
import { CommandUtils } from "java-path";

async function javaDetectionExample() {
  try {
    // Detect all Java installations
    const detectionResult = await CommandUtils.detectJavaPaths();
    
    if (detectionResult.success && detectionResult.data.length > 0) {
      console.log("Found Java installations:");
      
      for (const javaPath of detectionResult.data) {
        // Validate each path
        const validationResult = await CommandUtils.validateJavaPath(javaPath);
        
        if (validationResult.success && validationResult.data) {
          console.log(`✓ Valid: ${javaPath}`);
          
          // Get version info
          const versionResult = await CommandUtils.runCommand(javaPath, ["-version"]);
          if (versionResult.success) {
            console.log(`  Version output: ${versionResult.data.stdout}`);
          }
        } else {
          console.log(`✗ Invalid: ${javaPath}`);
        }
      }
    } else {
      console.log("No Java installations found");
    }
  } catch (error) {
    console.error("Java detection failed:", error);
  }
}
```

### Cross-Platform Java Detection

```typescript
import { CommandUtils, env } from "java-path";

async function crossPlatformJavaDetection() {
  console.log(`Running on: ${env.platform.name} (${env.arch})`);
  
  // Use synchronous detection for quick checks
  const javaPaths = detectJavaPathsSync();
  console.log(`Found ${javaPaths.length} Java paths (sync)`);
  
  // Validate each path synchronously
  for (const javaPath of javaPaths) {
    const isValid = validateJavaPathSync(javaPath);
    console.log(`${javaPath}: ${isValid ? "Valid" : "Invalid"}`);
  }
  
  // Get detailed information asynchronously
  const detailedResult = await CommandUtils.detectJavaPaths();
  
  if (detailedResult.success) {
    console.log("\nDetailed Java detection:");
    detailedResult.data.forEach(path => {
      console.log(`- ${path}`);
    });
  }
  
  // Check JAVA_HOME
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    console.log(`JAVA_HOME: ${javaHome}`);
    const homeValid = await CommandUtils.validateJavaPath(javaHome);
    if (homeValid.success) {
      console.log(`JAVA_HOME is ${homeValid.data ? "valid" : "invalid"}`);
    }
  }
}
```

### Package Management Operations

```typescript
import { CommandUtils } from "java-path";

async function packageManagementExample() {
  // Detect package manager
  const managerResult = await CommandUtils.getPackageManager();
  
  if (managerResult.success) {
    const manager = managerResult.data;
    console.log("Detected package manager:", manager);
    
    // Check for common development tools
    const tools = ["typescript", "eslint", "prettier", "jest"];
    const toolChecks = await Promise.all(
      tools.map(async tool => {
        const installed = await CommandUtils.isPackageInstalled(tool, manager);
        return { tool, installed: installed.success && installed.data };
      })
    );
    
    console.log("\nDevelopment tools status:");
    toolChecks.forEach(({ tool, installed }) => {
      console.log(`  ${tool}: ${installed ? "✓" : "✗"}`);
    });
  }
  
  // Check global installations
  const globalTools = ["npm", "yarn", "pnpm", "bun"];
  for (const tool of globalTools) {
    const available = await CommandUtils.isCommandAvailable(tool);
    if (available.success && available.data) {
      console.log(`${tool} is available globally`);
    }
  }
}
```

### Error Handling and Recovery

```typescript
import { CommandUtils } from "java-path";

async function robustCommandExecution() {
  try {
    // Handle command not found gracefully
    const result = await CommandUtils.runCommand("nonexistent-command", ["--help"]);
    
    if (!result.success) {
      console.log("Command not found or execution failed");
      return;
    }
    
    // Handle non-zero exit codes
    if (result.data.exitCode !== 0) {
      console.log(`Command failed with exit code ${result.data.exitCode}`);
      console.log("Error output:", result.data.stderr);
    } else {
      console.log("Command executed successfully");
      console.log("Output:", result.data.stdout);
    }
    
  } catch (error) {
    console.error("Command execution error:", error);
  }
  
  // Handle Java detection errors
  try {
    const javaPaths = await CommandUtils.detectJavaPaths();
    
    if (!javaPaths.success) {
      console.log("Java detection failed, trying fallback methods...");
      
      // Fallback: Check common locations manually
      const commonPaths = [
        "/usr/bin/java",
        "/usr/local/bin/java",
        "C:\\Program Files\\Java\\bin\\java.exe"
      ];
      
      for (const path of commonPaths) {
        const valid = await CommandUtils.validateJavaPath(path);
        if (valid.success && valid.data) {
          console.log(`Found Java at: ${path}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error("Java detection error:", error);
  }
}
```

### System Information Gathering

```typescript
import { CommandUtils, env } from "java-path";

async function systemInformation() {
  const info = {
    platform: env.platform.name,
    architecture: env.arch,
    java: {
      available: false,
      versions: [],
      paths: []
    },
    packageManagers: [],
    tools: {}
  };
  
  // Check Java availability
  const javaAvailable = await CommandUtils.isCommandAvailable("java");
  info.java.available = javaAvailable.success && javaAvailable.data;
  
  if (info.java.available) {
    // Get Java paths
    const javaPaths = await CommandUtils.detectJavaPaths();
    if (javaPaths.success) {
      info.java.paths = javaPaths.data;
    }
    
    // Get Java version for each path
    for (const javaPath of info.java.paths) {
      try {
        const versionResult = await CommandUtils.runCommand(javaPath, ["-version"]);
        if (versionResult.success) {
          info.java.versions.push({
            path: javaPath,
            version: versionResult.data.stdout
          });
        }
      } catch (error) {
        // Skip invalid Java installations
      }
    }
  }
  
  // Check package managers
  const managers = ["npm", "yarn", "pnpm", "bun"];
  for (const manager of managers) {
    const available = await CommandUtils.isCommandAvailable(manager);
    if (available.success && available.data) {
      info.packageManagers.push(manager);
    }
  }
  
  // Check common development tools
  const tools = ["git", "node", "python", "docker"];
  for (const tool of tools) {
    const available = await CommandUtils.isCommandAvailable(tool);
    info.tools[tool] = available.success && available.data;
  }
  
  return info;
}
```

## Advanced Usage

### Custom Java Detection Strategy

```typescript
import { CommandUtils, env } from "java-path";

async function customJavaDetection() {
  const strategies = [
    // Strategy 1: Environment variable
    async () => {
      const javaHome = process.env.JAVA_HOME;
      if (javaHome) {
        const javaPath = env.isWindows() 
          ? `${javaHome}\\bin\\java.exe`
          : `${javaHome}/bin/java`;
        
        const valid = await CommandUtils.validateJavaPath(javaPath);
        if (valid.success && valid.data) {
          return { source: "JAVA_HOME", path: javaPath };
        }
      }
      return null;
    },
    
    // Strategy 2: Command detection
    async () => {
      const available = await CommandUtils.isCommandAvailable("java");
      if (available.success && available.data) {
        const result = await CommandUtils.runCommand("which", ["java"]);
        if (result.success && result.data.stdout) {
          return { source: "PATH", path: result.data.stdout.trim() };
        }
      }
      return null;
    },
    
    // Strategy 3: Common directories
    async () => {
      const commonPaths = env.isWindows()
        ? [
            "C:\\Program Files\\Java\\jdk*\\bin\\java.exe",
            "C:\\Program Files (x86)\\Java\\jdk*\\bin\\java.exe"
          ]
        : [
            "/usr/lib/jvm/java*/bin/java",
            "/Library/Java/JavaVirtualMachines/*/Contents/Home/bin/java"
          ];
      
      for (const pattern of commonPaths) {
        // Note: This would need glob pattern matching in real implementation
        const javaPath = pattern; // Simplified for example
        const valid = await CommandUtils.validateJavaPath(javaPath);
        if (valid.success && valid.data) {
          return { source: "COMMON_DIRS", path: javaPath };
        }
      }
      return null;
    }
  ];
  
  // Try each strategy
  for (const strategy of strategies) {
    try {
      const result = await strategy();
      if (result) {
        console.log(`Found Java via ${result.source}: ${result.path}`);
        return result;
      }
    } catch (error) {
      console.log(`Strategy failed: ${error.message}`);
    }
  }
  
  console.log("No Java installation found");
  return null;
}
```

### Batch Command Execution

```typescript
import { CommandUtils } from "java-path";

async function batchCommandExecution() {
  const commands = [
    { cmd: "java", args: ["-version"] },
    { cmd: "javac", args: ["-version"] },
    { cmd: "node", args: ["--version"] },
    { cmd: "npm", args: ["--version"] }
  ];
  
  const results = await Promise.allSettled(
    commands.map(async ({ cmd, args }) => {
      try {
        // Check if command is available first
        const available = await CommandUtils.isCommandAvailable(cmd);
        if (!available.success || !available.data) {
          return { cmd, available: false, error: "Command not found" };
        }
        
        // Execute command
        const result = await CommandUtils.runCommand(cmd, args);
        if (result.success) {
          return {
            cmd,
            available: true,
            output: result.data.stdout,
            exitCode: result.data.exitCode
          };
        } else {
          return {
            cmd,
            available: true,
            error: result.error,
            exitCode: result.data?.exitCode
          };
        }
      } catch (error) {
        return { cmd, available: false, error: error.message };
      }
    })
  );
  
  // Process results
  const availableTools = [];
  const missingTools = [];
  
  results.forEach((result, index) => {
    const { cmd } = commands[index];
    
    if (result.status === "fulfilled") {
      if (result.value.available) {
        availableTools.push({
          command: cmd,
          output: result.value.output,
          exitCode: result.value.exitCode
        });
      } else {
        missingTools.push({
          command: cmd,
          error: result.value.error
        });
      }
    } else {
      missingTools.push({
        command: cmd,
        error: result.reason
      });
    }
  });
  
  console.log("\nAvailable tools:");
  availableTools.forEach(tool => {
    console.log(`  ✓ ${tool.command}: ${tool.output?.trim()}`);
  });
  
  console.log("\nMissing tools:");
  missingTools.forEach(tool => {
    console.log(`  ✗ ${tool.command}: ${tool.error}`);
  });
  
  return { available: availableTools, missing: missingTools };
}
```

## Performance Considerations

- Use synchronous methods for quick checks in performance-critical paths
- Cache command availability results when checking multiple times
- Batch command executions when possible
- Consider timeout values for long-running commands
- Use specific package manager detection to avoid repeated auto-detection
- Cache Java path detection results for repeated operations
- Handle command output carefully to avoid memory issues with large outputs
