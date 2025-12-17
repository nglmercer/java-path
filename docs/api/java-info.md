# Java Information & Management

Utilities for retrieving information about Java versions and finding installed JDKs on the local system.

## Overview

This module provides functions to scan directories for Java installations, get metadata about specific Java versions, and find particular Java versions with various validation options.

## `getJavaInfo(version)`

Retrieves metadata for a specific Java version (e.g., download URLs, expected paths).

```typescript
import { getJavaInfo } from "java-path";

const info = await getJavaInfo(17);
console.log(info.downloadUrl);
console.log(info.expectedFilename);
```

**Parameters:**
- `version` (number): Java version number (e.g., 8, 11, 17, 21)

**Returns:** `Promise<JavaInfoStandard | JavaInfoTermux>`

### Return Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `downloadUrl` | `string` | Direct download URL for the Java version |
| `expectedFilename` | `string` | Expected filename for the download |
| `version` | `number` | Java version number |
| `platform` | `object` | Platform-specific information |

### Platform-Specific Information

The return type varies based on the current platform:

**Standard Platforms (Windows, Linux, macOS):**
```typescript
interface JavaInfoStandard {
  downloadUrl: string;
  expectedFilename: string;
  version: number;
  platform: {
    os: "windows" | "linux" | "mac";
    arch: "x64" | "arm64" | "x86";
    extension: "zip" | "tar.gz";
  };
}
```

**Termux (Android):**
```typescript
interface JavaInfoTermux {
  downloadUrl: string;
  expectedFilename: string;
  version: number;
  platform: {
    os: "android";
    arch: "arm64" | "arm";
    extension: "tar.gz";
    termuxPrefix: string;
  };
}
```

### Examples

```typescript
import { getJavaInfo, env } from "java-path";

async function showJavaInfo() {
  const info = await getJavaInfo(17);
  
  console.log(`Java 17 download URL: ${info.downloadUrl}`);
  console.log(`Expected filename: ${info.expectedFilename}`);
  console.log(`Platform: ${info.platform.os}`);
  console.log(`Architecture: ${info.platform.arch}`);
  
  if (env.isTermux()) {
    console.log(`Termux prefix: ${info.platform.termuxPrefix}`);
  }
}
```

## `scanJavaInstallations(directory)`

Scans a given directory for JDK installations.

```typescript
import { scanJavaInstallations } from "java-path";

const installs = await scanJavaInstallations("C:\\Program Files\\Java");
console.log(`Found ${installs.length} Java installations`);
```

**Parameters:**
- `directory` (string): The path to scan for Java installations

**Returns:** `Promise<InstalledJavaVersion[]>`

### InstalledJavaVersion Interface

```typescript
interface InstalledJavaVersion {
  installPath: string;
  version: number;
  isValid: boolean;
  architecture?: string;
  type: "jdk" | "jre";
  executablePath: string;
  metadata?: {
    releaseName?: string;
    vendor?: string;
    implementation?: string;
  };
}
```

### Examples

```typescript
import { scanJavaInstallations } from "java-path";

async function listJavaInstallations() {
  // Scan common Java installation directories
  const searchPaths = [
    "/usr/lib/jvm",                    // Linux
    "/Library/Java/JavaVirtualMachines", // macOS
    "C:\\Program Files\\Java",         // Windows
    "C:\\Program Files (x86)\\Java"    // Windows 32-bit
  ];
  
  for (const path of searchPaths) {
    try {
      const installations = await scanJavaInstallations(path);
      
      if (installations.length > 0) {
        console.log(`\nFound in ${path}:`);
        
        installations.forEach(install => {
          console.log(`  - Java ${install.version} (${install.type})`);
          console.log(`    Path: ${install.installPath}`);
          console.log(`    Valid: ${install.isValid}`);
          console.log(`    Arch: ${install.architecture || "unknown"}`);
        });
      }
    } catch (error) {
      console.log(`Could not scan ${path}: ${error.message}`);
    }
  }
}
```

## `findJavaVersion(directory, version, options)`

Finds a specific Java version within a directory.

```typescript
import { findJavaVersion } from "java-path";

const jdk17 = await findJavaVersion("/usr/lib/jvm", 17, {
  requireValid: true,
  requireSameArch: true,
});

if (jdk17) {
  console.log(`Found Java 17 at: ${jdk17.installPath}`);
}
```

**Parameters:**
- `directory` (string): Directory to search
- `version` (number): Java version to find (e.g., 8, 11, 17, 21)
- `options` (object, optional): Search and validation options

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requireSameArch` | `boolean` | `false` | Enforce architecture match with current system |
| `requireSameOS` | `boolean` | `false` | Enforce OS match (mainly for cross-platform scenarios) |
| `requireValid` | `boolean` | `false` | Check if the java binary is executable |

**Returns:** `Promise<InstalledJavaVersion | null>`

### Examples

```typescript
import { findJavaVersion, env } from "java-path";

async function findSpecificJava() {
  // Search for Java 17 with strict validation
  const java17 = await findJavaVersion("/usr/lib/jvm", 17, {
    requireValid: true,
    requireSameArch: true,
    requireSameOS: true
  });
  
  if (java17) {
    console.log("Found valid Java 17 installation:");
    console.log(`Path: ${java17.installPath}`);
    console.log(`Type: ${java17.type}`);
    console.log(`Architecture: ${java17.architecture}`);
    console.log(`Executable: ${java17.executablePath}`);
  } else {
    console.log("No valid Java 17 installation found");
  }
}

// Search with different validation levels
async function findJavaWithOptions() {
  const searchDir = env.isWindows() 
    ? "C:\\Program Files\\Java" 
    : "/usr/lib/jvm";
  
  // Just find any Java 11
  const anyJava11 = await findJavaVersion(searchDir, 11);
  
  // Find valid Java 11
  const validJava11 = await findJavaVersion(searchDir, 11, {
    requireValid: true
  });
  
  // Find valid Java 11 with same architecture
  const matchingJava11 = await findJavaVersion(searchDir, 11, {
    requireValid: true,
    requireSameArch: true
  });
  
  console.log("Any Java 11:", anyJava11?.installPath);
  console.log("Valid Java 11:", validJava11?.installPath);
  console.log("Matching Java 11:", matchingJava11?.installPath);
}
```

## Advanced Usage

### Combining with Platform Detection

```typescript
import { getJavaInfo, scanJavaInstallations, findJavaVersion, env } from "java-path";

async function comprehensiveJavaSearch() {
  // Get platform-appropriate search paths
  const searchPaths = env.isWindows()
    ? ["C:\\Program Files\\Java", "C:\\Program Files (x86)\\Java"]
    : env.isMac()
    ? ["/Library/Java/JavaVirtualMachines"]
    : ["/usr/lib/jvm"];
  
  const results = {
    found: [],
    missing: []
  };
  
  // Search for multiple versions
  const desiredVersions = [8, 11, 17, 21];
  
  for (const version of desiredVersions) {
    let found = false;
    
    for (const path of searchPaths) {
      const java = await findJavaVersion(path, version, {
        requireValid: true,
        requireSameArch: true
      });
      
      if (java) {
        results.found.push({
          version,
          path: java.installPath,
          type: java.type,
          architecture: java.architecture
        });
        found = true;
        break;
      }
    }
    
    if (!found) {
      results.missing.push(version);
      
      // Get download info for missing version
      try {
        const info = await getJavaInfo(version);
        console.log(`Java ${version} not found. Download from: ${info.downloadUrl}`);
      } catch (error) {
        console.log(`Could not get info for Java ${version}: ${error.message}`);
      }
    }
  }
  
  return results;
}
```

### Error Handling

```typescript
import { getJavaInfo, scanJavaInstallations, findJavaVersion } from "java-path";

async function safeJavaOperations() {
  try {
    // Handle invalid version
    const info = await getJavaInfo(99); // Non-existent version
  } catch (error) {
    console.log(`getJavaInfo error: ${error.message}`);
  }
  
  try {
    // Handle non-existent directory
    const installations = await scanJavaInstallations("/non/existent/path");
    console.log(`Found ${installations.length} installations`);
  } catch (error) {
    console.log(`scanJavaInstallations error: ${error.message}`);
  }
  
  try {
    // Handle permission issues
    const java = await findJavaVersion("/root", 17, {
      requireValid: true
    });
    console.log(java ? "Found Java" : "No Java found");
  } catch (error) {
    console.log(`findJavaVersion error: ${error.message}`);
  }
}
```

## Performance Considerations

- `getJavaInfo()` makes API calls to fetch Java metadata - cache results when possible
- `scanJavaInstallations()` performs file system operations - use specific directories when possible
- `findJavaVersion()` stops at first match - specify precise directories for better performance
- Consider using `requireValid: false` for initial scans, then validate specific installations

## Integration with Other Modules

```typescript
import { 
  getJavaInfo, 
  scanJavaInstallations, 
  findJavaVersion,
  JavaInfoService,
  taskManager 
} from "java-path";

async function downloadMissingJava(version: number) {
  // First try to find locally
  const searchPaths = ["/usr/lib/jvm", "/Library/Java/JavaVirtualMachines"];
  let foundJava = null;
  
  for (const path of searchPaths) {
    const java = await findJavaVersion(path, version, {
      requireValid: true,
      requireSameArch: true
    });
    
    if (java) {
      foundJava = java;
      break;
    }
  }
  
  if (foundJava) {
    console.log(`Found Java ${version} locally at: ${foundJava.installPath}`);
    return foundJava;
  }
  
  // Not found locally, download from remote
  console.log(`Java ${version} not found locally, downloading...`);
  
  const versions = await JavaInfoService.getInstallableVersions();
  const release = await JavaInfoService.filter(versions.releases, version);
  
  if (!release) {
    throw new Error(`Java ${version} not available for download`);
  }
  
  const downloadTask = await JavaInfoService.downloadJavaRelease(
    release,
    `jdk-${version}.zip`
  );
  
  // Track progress
  taskManager.on("task:progress", (task) => {
    if (task.id === downloadTask.taskId) {
      console.log(`Download progress: ${task.progress}%`);
    }
  });
  
  await downloadTask.data.promise;
  
  // Decompress
  const installPath = `java-${version}`;
  await JavaInfoService.decompressJavaRelease(
    `downloads/jdk-${version}.zip`,
    installPath
  );
  
  console.log(`Java ${version} downloaded and extracted to: ${installPath}`);
  
  return {
    installPath,
    version,
    type: "jdk",
    isValid: true
  };
}
