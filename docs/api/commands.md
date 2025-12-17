# Command Utilities

Utilities for executing system commands and managing packages.

```typescript
import { CommandUtils } from "java-path";
```

## `isCommandAvailable(command)`

Checks if a command acts in the system PATH.

```typescript
if (await CommandUtils.isCommandAvailable("java")) { ... }
```

## `getPackageManager()`

Detects the active package manager (npm, yarn, pnpm, bun).

## `isPackageInstalled(name, manager?)`

Checks if a specific package is installed globally or locally.

## `runCommand(cmd, args)`

Executes a shell command and returns `stdout`, `stderr`, and `exitCode`.

```typescript
const { stdout } = await CommandUtils.runCommand("java", ["-version"]);
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

### `validateJavaPath(javaPath)`

Validates if a Java path exists and points to a valid Java executable.

```typescript
const result = await CommandUtils.validateJavaPath("/path/to/java");
if (result.success) {
  console.log("Path is valid:", result.data);
  // result.data: boolean - true if path exists and is executable
}
```

## Synchronous Methods

### `detectJavaPathsSync()`

Synchronously detects Java installation paths.

```typescript
import { detectJavaPathsSync } from "java-path";

const javaPaths = detectJavaPathsSync();
console.log("Java paths:", javaPaths);
// Returns: string[] - Array of detected Java executable paths
```

### `validateJavaPathSync(javaPath)`

Synchronously validates if a Java path exists and is executable.

```typescript
import { validateJavaPathSync } from "java-path";

const isValid = validateJavaPathSync("/path/to/java");
console.log("Path is valid:", isValid);
// Returns: boolean - true if path exists and is executable
```

### `isCommandAvailable(commandName)`

Synchronous version of command availability check.

```typescript
import { isCommandAvailable } from "java-path";

if (isCommandAvailable("java")) {
  console.log("Java is available");
}
```

### `getPackageManager()`

Synchronous version of package manager detection.

```typescript
import { getPackageManager } from "java-path";

const manager = getPackageManager();
console.log("Package manager:", manager);
```

### `isPackageInstalled(packageName, pm?)`

Synchronous version of package installation check.

```typescript
import { isPackageInstalled } from "java-path";

const installed = isPackageInstalled("git");
console.log("Git installed:", installed);
```

## Detection Methods

The Java path detection uses multiple approaches:

1. **Command Detection**: Uses `which java` (Linux/macOS) or `where java` (Windows)
2. **Environment Variables**: Checks and validates `JAVA_HOME`
3. **Common Directories**: Searches typical Java installation locations:
   - Windows: `C:\Program Files\Java`, `C:\Program Files (x86)\Java`
   - Linux: `/usr/lib/jvm`
   - macOS: `/Library/Java/JavaVirtualMachines`

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
