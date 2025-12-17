# Environment Detection (`env`)

Utilities for detecting the current platform (OS) and architecture.

## Usage

```typescript
import { env } from "java-path";

if (env.isWindows()) {
  console.log("Running on Windows");
}

// Get platform information
console.log(`Platform: ${env.platform.name}`);
console.log(`Architecture: ${env.arch}`);
console.log(`Executable extension: ${env.platform.ext}`);
```

## API

### `env` Object

| Property/Method | Type | Description |
| :-------------- | :-------------- | :------------------------------------------------- |
| `platform.name` | `string` | "windows", "linux", "mac", or "android" |
| `platform.ext` | `string` | Platform executable extension (e.g., ".exe" or "") |
| `arch` | `string` | System architecture ("x64", "arm64", "x86", etc.) |
| `isWindows()` | `() => boolean` | Returns `true` if OS is Windows. |
| `isLinux()` | `() => boolean` | Returns `true` if OS is Linux. |
| `isMac()` | `() => boolean` | Returns `true` if OS is macOS. |
| `isTermux()` | `() => boolean` | Returns `true` if running in Termux (Android). |

## Platform Detection Details

The library automatically detects the current platform using Node.js `process.platform` and provides additional Termux detection for Android environments.

### Platform Names
- **Windows**: `"windows"`
- **Linux**: `"linux"`
- **macOS**: `"mac"`
- **Android (Termux)**: `"android"`

### Architecture Detection
Common architectures detected:
- **x64**: 64-bit Intel/AMD processors
- **arm64**: 64-bit ARM processors (including Apple Silicon)
- **x86**: 32-bit Intel/AMD processors
- **arm**: 32-bit ARM processors

### Executable Extensions
- **Windows**: `".exe"`
- **Linux/macOS/Android**: `""` (no extension)

## Examples

### Cross-Platform Path Handling
```typescript
import { env } from "java-path";
import path from "node:path";

function getJavaPath() {
  if (env.isWindows()) {
    return "C:\\Program Files\\Java\\jdk-17\\bin\\java.exe";
  } else if (env.isMac()) {
    return "/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java";
  } else {
    return "/usr/lib/jvm/java-17-openjdk/bin/java";
  }
}

function getExecutableName(name: string) {
  return name + env.platform.ext;
}

const javaExe = getExecutableName("java");
// Windows: "java.exe"
// Others: "java"
```

### Platform-Specific Operations
```typescript
import { env } from "java-path";

async function performPlatformSpecificOperation() {
  if (env.isWindows()) {
    // Windows-specific code
    console.log("Running Windows-specific operation");
    // Use Windows paths, registry, etc.
  } else if (env.isLinux()) {
    // Linux-specific code
    console.log("Running Linux-specific operation");
    // Use Unix paths, systemd, etc.
  } else if (env.isMac()) {
    // macOS-specific code
    console.log("Running macOS-specific operation");
    // Use macOS-specific paths, launchd, etc.
  } else if (env.isTermux()) {
    // Termux-specific code
    console.log("Running Termux-specific operation");
    // Use Android/Termux-specific handling
  }
  
  // Architecture-specific code
  if (env.arch === "arm64") {
    console.log("Running on ARM64 architecture");
  } else if (env.arch === "x64") {
    console.log("Running on x64 architecture");
  }
}
```

### Termux Detection
```typescript
import { env } from "java-path";

function setupForTermux() {
  if (env.isTermux()) {
    console.log("Running in Termux environment");
    
    // Use Termux-specific paths
    const termuxHome = process.env.HOME || "/data/data/com.termux/files/home";
    const termuxPrefix = "/data/data/com.termux/files/usr";
    
    // Adjust operations for Android environment
    return {
      home: termuxHome,
      prefix: termuxPrefix,
      isAndroid: true
    };
  }
  
  return null;
}
```

## Integration with Other Modules

The `env` module is commonly used with other Java-Path utilities:

```typescript
import { env, CommandUtils, findJavaVersion } from "java-path";

async function findPlatformJava() {
  // Use platform-specific default paths
  const searchPaths = env.isWindows()
    ? ["C:\\Program Files\\Java", "C:\\Program Files (x86)\\Java"]
    : env.isMac()
    ? ["/Library/Java/JavaVirtualMachines"]
    : ["/usr/lib/jvm"];
  
  for (const path of searchPaths) {
    const java = await findJavaVersion(path, 17, {
      requireValid: true,
      requireSameArch: true
    });
    
    if (java) {
      console.log(`Found Java 17 at: ${java.installPath}`);
      return java;
    }
  }
  
  return null;
}
```

## Performance Considerations

Platform detection is performed once at module initialization and cached for subsequent calls. All platform check methods are synchronous and have minimal performance impact.
