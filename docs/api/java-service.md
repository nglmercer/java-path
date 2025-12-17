# Java Service (`JavaInfoService`)

A higher-level service for interacting with remote Java repositories (Adoptium) to list versions and download releases.

## Overview

The `JavaInfoService` provides a comprehensive interface for discovering, downloading, and managing Java releases from the Adoptium API. It handles version discovery, release filtering, download management, and archive decompression.

## `getInstallableVersions()`

Fetches the list of available Java versions from the Adoptium API.

```typescript
import { JavaInfoService } from "java-path";

const info = await JavaInfoService.getInstallableVersions();
console.log(info.available); // e.g., [8, 11, 17, 21]
console.log(info.releases); // Array of specific release objects
```

**Returns:** `Promise<{ available: number[], releases: JavaRelease[] }>`

### Return Object Structure

```typescript
interface JavaVersionInfo {
  available: number[];      // Array of available version numbers
  releases: JavaRelease[];  // Array of release objects
}

interface JavaRelease {
  version: number;
  release_name: string;
  release_link: string;
  binaries: JavaBinary[];
}

interface JavaBinary {
  architecture: string;
  download_link: string;
  name: string;
  size: number;
  checksum: string;
  os: string;
  type: string;
  version: string;
}
```

### Examples

```typescript
import { JavaInfoService } from "java-path";

async function discoverJavaVersions() {
  try {
    const versionInfo = await JavaInfoService.getInstallableVersions();
    
    console.log("Available Java versions:");
    versionInfo.available.forEach(version => {
      console.log(`  - Java ${version}`);
    });
    
    console.log(`\nTotal releases: ${versionInfo.releases.length}`);
    
    // Show detailed release information
    versionInfo.releases.forEach(release => {
      console.log(`\nJava ${release.version} - ${release.release_name}`);
      console.log(`Release link: ${release.release_link}`);
      
      release.binaries.forEach(binary => {
        console.log(`  ${binary.os}/${binary.architecture}: ${binary.name} (${binary.size} bytes)`);
      });
    });
    
    return versionInfo;
  } catch (error) {
    console.error("Failed to fetch Java versions:", error);
    throw error;
  }
}
```

## `filter(releases, version)`

Helps find a specific release object from the list returned by `getInstallableVersions`.

```typescript
const release = await JavaInfoService.filter(info.releases, 17);
```

**Parameters:**
- `releases` (JavaRelease[]): Array of releases from `getInstallableVersions()`
- `version` (number): Java version to filter for

**Returns:** `JavaRelease | undefined`

### Examples

```typescript
import { JavaInfoService } from "java-path";

async function findSpecificRelease() {
  // Get all available versions
  const versionInfo = await JavaInfoService.getInstallableVersions();
  
  // Filter for Java 17
  const java17Release = await JavaInfoService.filter(versionInfo.releases, 17);
  
  if (java17Release) {
    console.log(`Found Java 17 release: ${java17Release.release_name}`);
    
    // Find binary for current platform
    const platformBinary = java17Release.binaries.find(binary => 
      binary.os === getCurrentPlatform() && 
      binary.architecture === getCurrentArchitecture()
    );
    
    if (platformBinary) {
      console.log(`Platform binary: ${platformBinary.name}`);
      console.log(`Download URL: ${platformBinary.download_link}`);
      console.log(`Size: ${platformBinary.size} bytes`);
      console.log(`Checksum: ${platformBinary.checksum}`);
    }
  } else {
    console.log("Java 17 not found in available releases");
  }
}

// Helper function to map current platform
function getCurrentPlatform() {
  const platform = process.platform;
  switch (platform) {
    case 'win32': return 'windows';
    case 'darwin': return 'mac';
    case 'linux': return 'linux';
    default: return platform;
  }
}

function getCurrentArchitecture() {
  const arch = process.arch;
  switch (arch) {
    case 'x64': return 'x64';
    case 'arm64': return 'arm64';
    case 'ia32': return 'x86';
    default: return arch;
  }
}
```

## `downloadJavaRelease(release, filename, onComplete?)`

Downloads the specified release to the default download path.

```typescript
const downloadTask = await JavaInfoService.downloadJavaRelease(
  release,
  "jdk-17.zip"
);

// Wait for the TaskOperation promise
await downloadTask.data.promise;
```

**Parameters:**
- `release` (JavaRelease): Release object containing binary information
- `filename` (string): Filename for the downloaded file
- `onComplete` (function, optional): Callback when download completes

**Returns:** `Promise<TaskOperation>`

### TaskOperation Interface

```typescript
interface TaskOperation {
  taskId: string;
  data: {
    promise: Promise<string>;  // Resolves with download path
    cancel: () => void;
  };
}
```

### Examples

```typescript
import { JavaInfoService, taskManager } from "java-path";

async function downloadJavaVersion(version: number) {
  try {
    // Get available versions
    const versionInfo = await JavaInfoService.getInstallableVersions();
    
    // Filter for desired version
    const release = await JavaInfoService.filter(versionInfo.releases, version);
    
    if (!release) {
      throw new Error(`Java ${version} not available`);
    }
    
    // Create descriptive filename
    const filename = `jdk-${version}-${process.platform}-${process.arch}.zip`;
    
    // Start download
    console.log(`Starting download of Java ${version}...`);
    const downloadTask = await JavaInfoService.downloadJavaRelease(
      release,
      filename
    );
    
    // Set up progress tracking
    taskManager.on("task:progress", (task) => {
      if (task.id === downloadTask.taskId) {
        console.log(`Download progress: ${task.progress}%`);
        
        if (task.progress === 100) {
          console.log("Download completed, verifying file...");
        }
      }
    });
    
    // Wait for completion
    const downloadPath = await downloadTask.data.promise;
    console.log(`Java ${version} downloaded to: ${downloadPath}`);
    
    return downloadPath;
    
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}

// Download with cancellation support
async function downloadWithCancellation(version: number) {
  const versionInfo = await JavaInfoService.getInstallableVersions();
  const release = await JavaInfoService.filter(versionInfo.releases, version);
  
  if (!release) return;
  
  const downloadTask = await JavaInfoService.downloadJavaRelease(
    release,
    `jdk-${version}.zip`
  );
  
  // Set up cancellation after 30 seconds
  const timeout = setTimeout(() => {
    console.log("Cancelling download due to timeout");
    downloadTask.data.cancel();
  }, 30000);
  
  try {
    const downloadPath = await downloadTask.data.promise;
    clearTimeout(timeout);
    console.log("Download completed:", downloadPath);
    return downloadPath;
  } catch (error) {
    clearTimeout(timeout);
    if (error.message.includes("cancelled")) {
      console.log("Download was cancelled");
    } else {
      console.error("Download error:", error);
    }
    throw error;
  }
}
```

## `decompressJavaRelease(filePath, destination)`

Decompresses a downloaded archive.

```typescript
await JavaInfoService.decompressJavaRelease(
  "/downloads/jdk-17.zip",
  "/unpacked/jdk-17"
);
```

**Parameters:**
- `filePath` (string): Path to the downloaded archive
- `destination` (string): Destination directory for extraction

**Returns:** `Promise<void>`

### Examples

```typescript
import { JavaInfoService, taskManager } from "java-path";
import path from "node:path";

async function downloadAndExtractJava(version: number) {
  try {
    // Get version info
    const versionInfo = await JavaInfoService.getInstallableVersions();
    const release = await JavaInfoService.filter(versionInfo.releases, version);
    
    if (!release) {
      throw new Error(`Java ${version} not available`);
    }
    
    // Download
    const filename = `jdk-${version}.zip`;
    const downloadTask = await JavaInfoService.downloadJavaRelease(
      release,
      filename
    );
    
    console.log("Downloading Java...");
    const downloadPath = await downloadTask.data.promise;
    
    // Extract
    const extractPath = path.join("java-installations", `jdk-${version}`);
    console.log(`Extracting to: ${extractPath}`);
    
    await JavaInfoService.decompressJavaRelease(downloadPath, extractPath);
    
    console.log(`Java ${version} ready at: ${extractPath}`);
    return extractPath;
    
  } catch (error) {
    console.error("Operation failed:", error);
    throw error;
  }
}

// Complete installation workflow
async function installJavaVersion(version: number, installDir: string) {
  // Check if already installed
  const versionInfo = await JavaInfoService.getInstallableVersions();
  const release = await JavaInfoService.filter(versionInfo.releases, version);
  
  if (!release) {
    throw new Error(`Java ${version} not available`);
  }
  
  // Download
  const downloadTask = await JavaInfoService.downloadJavaRelease(
    release,
    `jdk-${version}.zip`
  );
  
  console.log(`Downloading Java ${version}...`);
  const downloadPath = await downloadTask.data.promise;
  
  // Extract to specified directory
  console.log(`Extracting to ${installDir}...`);
  await JavaInfoService.decompressJavaRelease(downloadPath, installDir);
  
  // Verify extraction
  const javaExecutable = path.join(installDir, "bin", 
    process.platform === "win32" ? "java.exe" : "java"
  );
  
  console.log(`Java ${version} installed successfully`);
  console.log(`Executable: ${javaExecutable}`);
  
  return installDir;
}
```

## Advanced Usage

### Complete Installation with Verification

```typescript
import { JavaInfoService, taskManager, CommandUtils } from "java-path";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

async function installJavaWithVerification(version: number) {
  try {
    // Get available versions
    const versionInfo = await JavaInfoService.getInstallableVersions();
    const release = await JavaInfoService.filter(versionInfo.releases, version);
    
    if (!release) {
      throw new Error(`Java ${version} not available`);
    }
    
    // Find appropriate binary for current platform
    const platformBinary = release.binaries.find(binary => 
      binary.os === getCurrentPlatform() && 
      binary.architecture === getCurrentArchitecture()
    );
    
    if (!platformBinary) {
      throw new Error(`No binary available for ${getCurrentPlatform()}/${getCurrentArchitecture()}`);
    }
    
    console.log(`Selected binary: ${platformBinary.name}`);
    console.log(`Size: ${platformBinary.size} bytes`);
    console.log(`Checksum: ${platformBinary.checksum}`);
    
    // Download
    const filename = `jdk-${version}-${platformBinary.os}-${platformBinary.architecture}.${platformBinary.type}`;
    const downloadTask = await JavaInfoService.downloadJavaRelease(
      release,
      filename
    );
    
    // Track progress
    taskManager.on("task:progress", (task) => {
      if (task.id === downloadTask.taskId) {
        process.stdout.write(`\rDownload progress: ${task.progress}%`);
      }
    });
    
    const downloadPath = await downloadTask.data.promise;
    console.log("\nDownload completed!");
    
    // Verify checksum
    console.log("Verifying checksum...");
    const fileBuffer = await readFile(downloadPath);
    const actualChecksum = createHash("sha256").update(fileBuffer).digest("hex");
    
    if (actualChecksum !== platformBinary.checksum) {
      throw new Error(`Checksum mismatch! Expected: ${platformBinary.checksum}, Got: ${actualChecksum}`);
    }
    
    console.log("Checksum verified successfully!");
    
    // Extract
    const extractPath = `java-${version}`;
    console.log(`Extracting to: ${extractPath}`);
    await JavaInfoService.decompressJavaRelease(downloadPath, extractPath);
    
    // Validate installation
    const javaPath = `${extractPath}/bin/${process.platform === "win32" ? "java.exe" : "java"}`;
    const validation = await CommandUtils.validateJavaPath(javaPath);
    
    if (validation.success && validation.data) {
      console.log(`Java ${version} installation validated successfully!`);
      
      // Get version info
      const versionResult = await CommandUtils.runCommand(javaPath, ["-version"]);
      if (versionResult.success) {
        console.log("Java version output:");
        console.log(versionResult.data.stdout);
      }
    } else {
      throw new Error("Java installation validation failed");
    }
    
    return {
      success: true,
      installPath: extractPath,
      javaPath: javaPath,
      version: version
    };
    
  } catch (error) {
    console.error("Installation failed:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Batch Java Installation

```typescript
import { JavaInfoService, taskManager } from "java-path";

async function installMultipleJavaVersions(versions: number[]) {
  const results = {
    successful: [],
    failed: []
  };
  
  // Get all available versions
  const versionInfo = await JavaInfoService.getInstallableVersions();
  
  for (const version of versions) {
    try {
      console.log(`\nProcessing Java ${version}...`);
      
      // Filter for specific version
      const release = await JavaInfoService.filter(versionInfo.releases, version);
      
      if (!release) {
        console.log(`Java ${version} not available, skipping...`);
        results.failed.push({ version, reason: "Not available" });
        continue;
      }
      
      // Download
      const filename = `jdk-${version}.zip`;
      const downloadTask = await JavaInfoService.downloadJavaRelease(
        release,
        filename
      );
      
      // Simple progress indicator
      let lastProgress = 0;
      taskManager.on("task:progress", (task) => {
        if (task.id === downloadTask.taskId && task.progress > lastProgress + 10) {
          console.log(`Download progress: ${task.progress}%`);
          lastProgress = task.progress;
        }
      });
      
      const downloadPath = await downloadTask.data.promise;
      
      // Extract
      const extractPath = `java-${version}`;
      await JavaInfoService.decompressJavaRelease(downloadPath, extractPath);
      
      results.successful.push({
        version,
        downloadPath,
        extractPath
      });
      
      console.log(`Java ${version} installed successfully!`);
      
    } catch (error) {
      console.error(`Failed to install Java ${version}:`, error.message);
      results.failed.push({
        version,
        reason: error.message
      });
    }
  }
  
  return results;
}

// Install Java 8, 11, 17, and 21
installMultipleJavaVersions([8, 11, 17, 21])
  .then(results => {
    console.log("\nInstallation Summary:");
    console.log(`Successful: ${results.successful.length}`);
    console.log(`Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log("\nFailed installations:");
      results.failed.forEach(failure => {
        console.log(`  - Java ${failure.version}: ${failure.reason}`);
      });
    }
  });
```

## Error Handling

```typescript
import { JavaInfoService } from "java-path";

async function robustJavaServiceOperation() {
  try {
    // Handle network errors
    const versionInfo = await JavaInfoService.getInstallableVersions();
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error("Network error: Cannot connect to Adoptium API");
      console.error("Please check your internet connection");
    } else {
      console.error("API error:", error.message);
    }
    throw error;
  }
  
  try {
    // Handle missing versions
    const release = await JavaInfoService.filter([], 99); // Non-existent version
    if (!release) {
      console.log("Requested Java version not available");
      return null;
    }
  } catch (error) {
    console.error("Filter error:", error.message);
    throw error;
  }
  
  try {
    // Handle download errors
    const downloadTask = await JavaInfoService.downloadJavaRelease(
      release,
      "jdk.zip"
    );
    const downloadPath = await downloadTask.data.promise;
  } catch (error) {
    if (error.message.includes("disk space")) {
      console.error("Insufficient disk space for download");
    } else if (error.message.includes("permission")) {
      console.error("Permission denied - check file permissions");
    } else {
      console.error("Download error:", error.message);
    }
    throw error;
  }
}
```

## Performance Considerations

- Cache `getInstallableVersions()` results when checking multiple versions
- Use specific platform filtering to reduce binary search time
- Consider parallel downloads for multiple versions (with rate limiting)
- Verify disk space before large downloads
- Use progress callbacks for better user experience with large files
