# File & Folder Utilities

Helpers for interacting with the file system.

## Overview

The File & Folder utilities provide a comprehensive set of functions for file operations, directory management, and file validation. All operations return standardized `ServiceResponse` objects for consistent error handling.

## FileUtils

File operations with built-in safety checks and error handling.

### `writeFile(base, subDir, name, content)`

Safely writes a file, creating parent directories if needed.

```typescript
import { FileUtils } from "java-path";

const result = await FileUtils.writeFile(
  "./output",
  "subdirectory/nested",
  "config.json",
  '{"key": "value"}'
);

if (result.success) {
  console.log("File written to:", result.data);
}
```

**Parameters:**
- `base` (string): Base directory path
- `subDir` (string): Subdirectory path (can be nested)
- `name` (string): File name
- `content` (string | Buffer): File content

**Returns:** `Promise<ServiceResponse<string>>`
- Success: Returns the full file path
- Error: Returns error message

### `pathExists(path)`

Checks for existence. Returns generic `ServiceResponse`.

```typescript
const exists = await FileUtils.pathExists("./config.json");

if (exists.success && exists.data) {
  console.log("File exists");
} else if (exists.success && !exists.data) {
  console.log("File does not exist");
} else {
  console.error("Error checking path:", exists.error);
}
```

**Parameters:**
- `path` (string): Path to check

**Returns:** `Promise<ServiceResponse<boolean>>`

### `delete(path)`

Recursively deletes a path.

```typescript
const result = await FileUtils.delete("./temp-directory");

if (result.success) {
  console.log("Deleted successfully");
} else {
  console.error("Delete failed:", result.error);
}
```

**Parameters:**
- `path` (string): Path to delete (file or directory)

**Returns:** `Promise<ServiceResponse<void>>`

### `rename(oldPath, newPath)`

Renames a file/directory.

```typescript
const result = await FileUtils.rename("./old-name.txt", "./new-name.txt");

if (result.success) {
  console.log("Renamed successfully");
} else {
  console.error("Rename failed:", result.error);
}
```

**Parameters:**
- `oldPath` (string): Current path
- `newPath` (string): New path

**Returns:** `Promise<ServiceResponse<void>>`

### `checkFileValidity(path, options)`

Validates file properties like size and extension.

```typescript
const result = await FileUtils.checkFileValidity("config.json", {
  maxSize: 1024 * 1024, // 1MB
  allowedExtensions: [".json"],
  minSize: 10 // At least 10 bytes
});

if (result.success && result.data) {
  console.log("File is valid");
} else {
  console.log("File validation failed:", result.error);
}
```

**Parameters:**
- `path` (string): File path to validate
- `options` (object): Validation criteria

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxSize` | `number` | `Infinity` | Maximum file size in bytes |
| `minSize` | `number` | `0` | Minimum file size in bytes |
| `allowedExtensions` | `string[]` | `[]` | Allowed file extensions (empty = all allowed) |

**Returns:** `Promise<ServiceResponse<boolean>>`

## FolderUtils

Directory operations and file discovery utilities.

### `getFolderDetails(path, options)`

Returns a detailed list of files in a directory, including stats like size and modification time.

```typescript
const result = await FolderUtils.getFolderDetails("./src", {
  recursive: true,
  includeStats: true
});

if (result.success) {
  result.data.forEach(file => {
    console.log(`${file.path} - ${file.size} bytes - ${file.modified}`);
  });
}
```

**Parameters:**
- `path` (string): Directory path to scan
- `options` (object): Scanning options

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `recursive` | `boolean` | `false` | Scan subdirectories recursively |
| `includeStats` | `boolean` | `true` | Include file statistics |

**Returns:** `Promise<ServiceResponse<FileDetails[]>>`

#### FileDetails Interface

```typescript
interface FileDetails {
  name: string;
  path: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
  extension: string;
}
```

### `getDirectorySummary(path)`

Returns a stats object (total size, file count, etc.).

```typescript
const result = await FolderUtils.getDirectorySummary("./project");

if (result.success) {
  console.log(`Total size: ${result.data.totalSize} bytes`);
  console.log(`Files: ${result.data.fileCount}`);
  console.log(`Directories: ${result.data.directoryCount}`);
}
```

**Parameters:**
- `path` (string): Directory path to analyze

**Returns:** `Promise<ServiceResponse<DirectorySummary>>`

#### DirectorySummary Interface

```typescript
interface DirectorySummary {
  totalSize: number;
  fileCount: number;
  directoryCount: number;
  largestFile: string;
  largestFileSize: number;
  oldestFile: string;
  newestFile: string;
}
```

### `getFiles(path, filters)`

Finds files matching specific criteria (extension, size, recursive depth).

```typescript
const result = await FolderUtils.getFiles("./src", {
  extension: ".java",
  recursive: true,
  minSize: 100,
  maxSize: 10000
});

if (result.success) {
  console.log(`Found ${result.data.length} Java files`);
  result.data.forEach(file => console.log(file));
}
```

**Parameters:**
- `path` (string): Directory path to search
- `filters` (object): Search filters

**Filters:**
| Filter | Type | Default | Description |
|--------|------|---------|-------------|
| `extension` | `string` | - | File extension to match (include the dot) |
| `recursive` | `boolean` | `false` | Search subdirectories |
| `minSize` | `number` | `0` | Minimum file size in bytes |
| `maxSize` | `number` | `Infinity` | Maximum file size in bytes |

**Returns:** `Promise<ServiceResponse<string[]>>`
- Array of file paths matching the criteria

## Examples

### File Operations

```typescript
import { FileUtils } from "java-path";

async function fileOperationsExample() {
  // Write configuration file
  const configContent = JSON.stringify({
    version: "1.0.0",
    settings: { debug: true }
  }, null, 2);
  
  const writeResult = await FileUtils.writeFile(
    "./config",
    "app/settings",
    "config.json",
    configContent
  );
  
  if (writeResult.success) {
    console.log("Config file created:", writeResult.data);
  }
  
  // Check if file exists
  const existsResult = await FileUtils.pathExists("./config/app/settings/config.json");
  if (existsResult.success && existsResult.data) {
    console.log("Config file exists");
  }
  
  // Validate file
  const validationResult = await FileUtils.checkFileValidity(
    "./config/app/settings/config.json",
    {
      maxSize: 10 * 1024, // 10KB max
      allowedExtensions: [".json"],
      minSize: 50 // At least 50 bytes
    }
  );
  
  if (validationResult.success && validationResult.data) {
    console.log("Config file is valid");
  }
  
  // Rename file
  const renameResult = await FileUtils.rename(
    "./config/app/settings/config.json",
    "./config/app/settings/app-config.json"
  );
  
  if (renameResult.success) {
    console.log("File renamed successfully");
  }
  
  // Clean up
  const deleteResult = await FileUtils.delete("./config");
  if (deleteResult.success) {
    console.log("Directory deleted");
  }
}
```

### Directory Analysis

```typescript
import { FolderUtils } from "java-path";

async function directoryAnalysis() {
  // Get detailed folder information
  const detailsResult = await FolderUtils.getFolderDetails("./src", {
    recursive: true,
    includeStats: true
  });
  
  if (detailsResult.success) {
    console.log(`Found ${detailsResult.data.length} items`);
    
    // Group by file type
    const byExtension = {};
    let totalSize = 0;
    
    detailsResult.data.forEach(item => {
      if (!item.isDirectory) {
        const ext = item.extension || "no-extension";
        byExtension[ext] = (byExtension[ext] || 0) + 1;
        totalSize += item.size;
      }
    });
    
    console.log("Files by extension:");
    Object.entries(byExtension).forEach(([ext, count]) => {
      console.log(`  ${ext}: ${count} files`);
    });
    
    console.log(`Total size: ${totalSize} bytes`);
  }
  
  // Get directory summary
  const summaryResult = await FolderUtils.getDirectorySummary("./src");
  
  if (summaryResult.success) {
    const summary = summaryResult.data;
    console.log("\nDirectory Summary:");
    console.log(`Total size: ${summary.totalSize} bytes`);
    console.log(`Files: ${summary.fileCount}`);
    console.log(`Directories: ${summary.directoryCount}`);
    console.log(`Largest file: ${summary.largestFile} (${summary.largestFileSize} bytes)`);
    console.log(`Oldest file: ${summary.oldestFile}`);
    console.log(`Newest file: ${summary.newestFile}`);
  }
}
```

### File Discovery

```typescript
import { FolderUtils } from "java-path";

async function fileDiscovery() {
  // Find all TypeScript files
  const tsFilesResult = await FolderUtils.getFiles("./src", {
    extension: ".ts",
    recursive: true
  });
  
  if (tsFilesResult.success) {
    console.log(`Found ${tsFilesResult.data.length} TypeScript files`);
    
    // Find large files
    const largeFilesResult = await FolderUtils.getFiles("./src", {
      recursive: true,
      minSize: 100 * 1024 // 100KB
    });
    
    if (largeFilesResult.success) {
      console.log(`Found ${largeFilesResult.data.length} large files (>100KB)`);
    }
    
    // Find specific file types within size range
    const specificFilesResult = await FolderUtils.getFiles("./src", {
      extension: ".json",
      recursive: true,
      minSize: 100,
      maxSize: 10 * 1024 // 10KB
    });
    
    if (specificFilesResult.success) {
      console.log(`Found ${specificFilesResult.data.length} JSON files (100B-10KB)`);
    }
  }
}
```

### Cross-Platform File Operations

```typescript
import { FileUtils, FolderUtils, env } from "java-path";
import path from "node:path";

async function crossPlatformOperations() {
  // Platform-specific paths
  const basePath = env.isWindows() 
    ? "C:\\temp\\project" 
    : "/tmp/project";
  
  // Create directory structure
  const structure = [
    "src/components",
    "src/utils",
    "tests/unit",
    "tests/integration",
    "docs/api"
  ];
  
  for (const dir of structure) {
    const fullPath = path.join(basePath, dir);
    
    // Create test files
    const testFile = path.join(fullPath, "test.txt");
    const writeResult = await FileUtils.writeFile(
      path.dirname(testFile),
      "",
      path.basename(testFile),
      "Test content"
    );
    
    if (writeResult.success) {
      console.log(`Created: ${testFile}`);
    }
  }
  
  // Analyze the structure
  const summaryResult = await FolderUtils.getDirectorySummary(basePath);
  
  if (summaryResult.success) {
    console.log(`Created structure with ${summaryResult.data.fileCount} files`);
    console.log(`Total size: ${summaryResult.data.totalSize} bytes`);
  }
  
  // Clean up
  await FileUtils.delete(basePath);
}
```

## Advanced Usage

### File Monitoring and Validation

```typescript
import { FileUtils, FolderUtils } from "java-path";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

async function fileIntegrityCheck(directory: string) {
  const filesResult = await FolderUtils.getFiles(directory, {
    recursive: true
  });
  
  if (!filesResult.success) {
    throw new Error(`Failed to get files: ${filesResult.error}`);
  }
  
  const integrityReport = {
    totalFiles: filesResult.data.length,
    checkedFiles: 0,
    issues: []
  };
  
  for (const filePath of filesResult.data) {
    try {
      // Check file validity
      const validityResult = await FileUtils.checkFileValidity(filePath, {
        maxSize: 100 * 1024 * 1024, // 100MB max
        minSize: 0
      });
      
      if (!validityResult.success || !validityResult.data) {
        integrityReport.issues.push({
          file: filePath,
          issue: "File validity check failed",
          details: validityResult.error
        });
        continue;
      }
      
      // Calculate file hash for integrity
      const fileBuffer = await readFile(filePath);
      const hash = createHash("sha256").update(fileBuffer).digest("hex");
      
      integrityReport.checkedFiles++;
      
      // Store hash for comparison (in real scenario, compare with known good hash)
      console.log(`${filePath}: ${hash}`);
      
    } catch (error) {
      integrityReport.issues.push({
        file: filePath,
        issue: "Error processing file",
        details: error.message
      });
    }
  }
  
  return integrityReport;
}
```

### Project Structure Analysis

```typescript
import { FolderUtils } from "java-path";

async function analyzeProjectStructure(projectPath: string) {
  const analysis = {
    languages: {},
    totalSize: 0,
    fileCount: 0,
    largestFiles: [],
    oldestFiles: []
  };
  
  // Get all files with details
  const detailsResult = await FolderUtils.getFolderDetails(projectPath, {
    recursive: true,
    includeStats: true
  });
  
  if (!detailsResult.success) {
    throw new Error(`Failed to analyze project: ${detailsResult.error}`);
  }
  
  // Analyze each file
  for (const file of detailsResult.data) {
    if (file.isDirectory) continue;
    
    analysis.totalSize += file.size;
    analysis.fileCount++;
    
    // Categorize by extension
    const ext = file.extension || "no-extension";
    analysis.languages[ext] = (analysis.languages[ext] || 0) + 1;
    
    // Track largest files
    analysis.largestFiles.push({
      path: file.path,
      size: file.size
    });
    
    // Track oldest files
    analysis.oldestFiles.push({
      path: file.path,
      modified: file.modified
    });
  }
  
  // Sort by size and date
  analysis.largestFiles.sort((a, b) => b.size - a.size);
  analysis.largestFiles = analysis.largestFiles.slice(0, 10); // Top 10
  
  analysis.oldestFiles.sort((a, b) => a.modified - b.modified);
  analysis.oldestFiles = analysis.oldestFiles.slice(0, 10); // Top 10
  
  return analysis;
}
```

### Batch File Operations

```typescript
import { FileUtils, FolderUtils } from "java-path";

async function batchFileOperations() {
  // Find files to process
  const filesResult = await FolderUtils.getFiles("./source", {
    extension: ".txt",
    recursive: true
  });
  
  if (!filesResult.success) {
    throw new Error(`Failed to find files: ${filesResult.error}`);
  }
  
  const results = {
    processed: 0,
    failed: 0,
    errors: []
  };
  
  // Process files in batches
  const batchSize = 10;
  for (let i = 0; i < filesResult.data.length; i += batchSize) {
    const batch = filesResult.data.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (filePath) => {
      try {
        // Read and validate file
        const validityResult = await FileUtils.checkFileValidity(filePath, {
          maxSize: 1024 * 1024 // 1MB
        });
        
        if (!validityResult.success || !validityResult.data) {
          throw new Error(`Invalid file: ${validityResult.error}`);
        }
        
        // Process file (example: rename)
        const newPath = filePath.replace(/\.txt$/, '.processed.txt');
        const renameResult = await FileUtils.rename(filePath, newPath);
        
        if (!renameResult.success) {
          throw new Error(`Rename failed: ${renameResult.error}`);
        }
        
        results.processed++;
        return { success: true, original: filePath, new: newPath };
        
      } catch (error) {
        results.failed++;
        results.errors.push({ file: filePath, error: error.message });
        return { success: false, file: filePath, error: error.message };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    console.log(`Batch completed: ${batchResults.filter(r => r.success).length}/${batchResults.length}`);
  }
  
  return results;
}
```

## Error Handling

```typescript
import { FileUtils, FolderUtils } from "java-path";

async function robustFileOperations() {
  try {
    // Handle non-existent paths
    const existsResult = await FileUtils.pathExists("/non/existent/path");
    if (existsResult.success && !existsResult.data) {
      console.log("Path does not exist - this is expected");
    }
    
    // Handle permission errors
    const protectedPath = "/root/protected.file";
    const readResult = await FileUtils.checkFileValidity(protectedPath);
    
    if (!readResult.success) {
      console.error("Cannot access file:", readResult.error);
      // Handle permission error appropriately
    }
    
    // Handle disk space issues
    const largeFilePath = "./huge-file.dat";
    const writeResult = await FileUtils.writeFile(
      "./output",
      "",
      "huge-file.dat",
      "x".repeat(1024 * 1024 * 100) // 100MB of data
    );
    
    if (!writeResult.success) {
      if (writeResult.error.includes("disk space")) {
        console.error("Insufficient disk space");
      } else if (writeResult.error.includes("permission")) {
        console.error("Permission denied");
      } else {
        console.error("Write failed:", writeResult.error);
      }
    }
    
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}
```

## Performance Considerations

- Use non-recursive scans when possible for better performance
- Filter files early to reduce memory usage
- Consider batch processing for large numbers of files
- Use `getDirectorySummary()` for quick overviews without detailed scanning
- Cache file system operations when appropriate
- Monitor memory usage with large directory structures
- Use streaming for large file operations when available
