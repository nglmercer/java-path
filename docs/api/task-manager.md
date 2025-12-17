# Task Manager

The `taskManager` handles long-running, asynchronous operations such as downloading files, calculating checksums, unpacking archives, and creating backups. It allows you to track progress and wait for completion.

## Overview

The Task Manager provides a unified interface for managing asynchronous operations with progress tracking, cancellation support, and event-driven notifications. It's designed to handle file operations, downloads, and archive management efficiently.

## Core Concepts

Operations return a `TaskOperation` object containing:

- `taskId`: A unique ID for tracking
- `promise`: A Promise that resolves when the task completes
- `cancel`: A function to cancel the operation

You can listen to global task events via `taskManager.on()`.

## API

### `createBackup(source, options)`

Backs up a directory or file.

```typescript
const job = taskManager.createBackup("./data", {
  outputFilename: "backup.zip",
  useZip: true,
});
await job.promise;
```

**Parameters:**
- `source` (string): Path to file or directory to backup
- `options` (object): Backup configuration options

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputFilename` | `string` | `"backup.zip"` | Name of the backup file |
| `useZip` | `boolean` | `true` | Use ZIP compression (vs TAR) |
| `compressionLevel` | `number` | `6` | Compression level (1-9) |
| `excludePatterns` | `string[]` | `[]` | Patterns to exclude from backup |

**Returns:** `TaskOperation`

### `restoreBackup(backupPath, options)`

Restores a backup.

```typescript
const job = taskManager.restoreBackup("./backups/data.zip", {
  destination: "./restored",
});
```

**Parameters:**
- `backupPath` (string): Path to backup file
- `options` (object): Restore configuration options

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `destination` | `string` | Required | Destination directory for restoration |
| `overwrite` | `boolean` | `false` | Overwrite existing files |
| `verify` | `boolean` | `true` | Verify backup integrity before restoration |

**Returns:** `TaskOperation`

### `unpack(archivePath, options)`

Extracts an archive (zip/tar).

```typescript
const job = taskManager.unpack("./download.zip", {
  destination: "./output",
});
```

**Parameters:**
- `archivePath` (string): Path to archive file
- `options` (object): Extraction options

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `destination` | `string` | Required | Destination directory for extraction |
| `overwrite` | `boolean` | `false` | Overwrite existing files |
| `preservePermissions` | `boolean` | `true` | Preserve file permissions (Unix-like systems) |

**Returns:** `TaskOperation`

### `download(url, options)`

Downloads a file from a URL.

```typescript
const job = taskManager.download("https://example.com/file.zip", {
  fileName: "file.zip",
});
```

**Parameters:**
- `url` (string): URL to download from
- `options` (object): Download configuration options

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fileName` | `string` | Extracted from URL | Name for downloaded file |
| `headers` | `object` | `{}` | HTTP headers to send |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `retries` | `number` | `3` | Number of retry attempts |
| `retryDelay` | `number` | `1000` | Delay between retries in milliseconds |

**Returns:** `TaskOperation`

## Event Listening

```typescript
taskManager.on("task:progress", (task) => {
  console.log(`Task ${task.id}: ${task.progress}%`);
});

taskManager.on("task:completed", (task) => {
  console.log(`Task ${task.id} finished!`);
});

taskManager.on("task:failed", (task) => {
  console.log(`Task ${task.id} failed: ${task.error}`);
});
```

### Event Types

- **`task:progress`**: Fired when task progress updates
- **`task:completed`**: Fired when task completes successfully
- **`task:failed`**: Fired when task fails
- **`task:cancelled`**: Fired when task is cancelled
- **`task:started`**: Fired when task starts

### Event Data Structure

```typescript
interface TaskEvent {
  id: string;
  type: string;
  progress: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  error?: string;
  result?: any;
  timestamp: number;
}
```

## Examples

### Basic Download with Progress Tracking

```typescript
import { taskManager } from "java-path";

async function downloadWithProgress() {
  // Create download task
  const downloadJob = taskManager.download(
    "https://example.com/large-file.zip",
    {
      fileName: "large-file.zip",
      timeout: 60000, // 1 minute timeout
      retries: 5
    }
  );
  
  console.log(`Download started with task ID: ${downloadJob.taskId}`);
  
  // Set up progress tracking
  taskManager.on("task:progress", (task) => {
    if (task.id === downloadJob.taskId) {
      console.log(`Download progress: ${task.progress}%`);
    }
  });
  
  // Wait for completion
  try {
    const result = await downloadJob.data.promise;
    console.log("Download completed:", result);
    return result;
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}
```

### Backup and Restore Operations

```typescript
import { taskManager } from "java-path";

async function backupAndRestoreExample() {
  // Create backup
  console.log("Creating backup...");
  const backupJob = taskManager.createBackup("./project-data", {
    outputFilename: "project-backup.zip",
    useZip: true,
    compressionLevel: 9,
    excludePatterns: ["*.log", "*.tmp", "node_modules/**"]
  });
  
  // Track backup progress
  taskManager.on("task:progress", (task) => {
    if (task.id === backupJob.taskId) {
      process.stdout.write(`\rBackup progress: ${task.progress}%`);
    }
  });
  
  const backupPath = await backupJob.data.promise;
  console.log(`\nBackup created: ${backupPath}`);
  
  // Later, restore the backup
  console.log("Restoring backup...");
  const restoreJob = taskManager.restoreBackup(backupPath, {
    destination: "./restored-project",
    overwrite: true,
    verify: true
  });
  
  await restoreJob.data.promise;
  console.log("Restore completed!");
}
```

### Archive Extraction

```typescript
import { taskManager } from "java-path";

async function extractArchive() {
  const unpackJob = taskManager.unpack("./java-archive.tar.gz", {
    destination: "./extracted-java",
    overwrite: false,
    preservePermissions: true
  });
  
  // Handle completion and failure
  taskManager.on("task:completed", (task) => {
    if (task.id === unpackJob.taskId) {
      console.log("Extraction completed successfully!");
    }
  });
  
  taskManager.on("task:failed", (task) => {
    if (task.id === unpackJob.taskId) {
      console.error("Extraction failed:", task.error);
    }
  });
  
  try {
    await unpackJob.data.promise;
    console.log("Archive extracted successfully");
  } catch (error) {
    console.error("Extraction error:", error);
  }
}
```

### Task Cancellation

```typescript
import { taskManager } from "java-path";

async function cancellableDownload() {
  const downloadJob = taskManager.download(
    "https://example.com/huge-file.zip",
    { fileName: "huge-file.zip" }
  );
  
  // Set up cancellation after 10 seconds
  const timeout = setTimeout(() => {
    console.log("Cancelling download due to timeout");
    downloadJob.data.cancel();
  }, 10000);
  
  try {
    const result = await downloadJob.data.promise;
    clearTimeout(timeout);
    console.log("Download completed:", result);
    return result;
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

### Multiple Task Management

```typescript
import { taskManager } from "java-path";

async function manageMultipleTasks() {
  const tasks = [
    taskManager.download("https://example.com/file1.zip", { fileName: "file1.zip" }),
    taskManager.download("https://example.com/file2.zip", { fileName: "file2.zip" }),
    taskManager.createBackup("./data", { outputFilename: "data-backup.zip" })
  ];
  
  // Track all tasks
  const taskMap = new Map();
  tasks.forEach(task => {
    taskMap.set(task.taskId, task);
  });
  
  // Set up global event handling
  taskManager.on("task:progress", (task) => {
    if (taskMap.has(task.id)) {
      console.log(`Task ${task.id}: ${task.progress}% (${task.type})`);
    }
  });
  
  taskManager.on("task:completed", (task) => {
    if (taskMap.has(task.id)) {
      console.log(`✓ Task ${task.id} completed`);
      taskMap.delete(task.id);
      
      if (taskMap.size === 0) {
        console.log("All tasks completed!");
      }
    }
  });
  
  taskManager.on("task:failed", (task) => {
    if (taskMap.has(task.id)) {
      console.log(`✗ Task ${task.id} failed: ${task.error}`);
      taskMap.delete(task.id);
    }
  });
  
  // Wait for all tasks
  const results = await Promise.allSettled(
    tasks.map(task => task.data.promise)
  );
  
  // Process results
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`Task ${index + 1} succeeded:`, result.value);
    } else {
      console.log(`Task ${index + 1} failed:`, result.reason);
    }
  });
  
  return results;
}
```

## Advanced Usage

### Custom Task Wrapper

```typescript
import { taskManager } from "java-path";

class TaskWrapper {
  constructor(taskOperation) {
    this.taskOperation = taskOperation;
    this.startTime = Date.now();
  }
  
  async waitForCompletion() {
    try {
      const result = await this.taskOperation.data.promise;
      const duration = Date.now() - this.startTime;
      return {
        success: true,
        result,
        duration,
        taskId: this.taskOperation.taskId
      };
    } catch (error) {
      const duration = Date.now() - this.startTime;
      return {
        success: false,
        error: error.message,
        duration,
        taskId: this.taskOperation.taskId
      };
    }
  }
  
  cancel() {
    this.taskOperation.data.cancel();
  }
  
  getTaskId() {
    return this.taskOperation.taskId;
  }
}

// Usage
async function wrappedDownload(url, options) {
  const taskOperation = taskManager.download(url, options);
  const wrapper = new TaskWrapper(taskOperation);
  
  // Set up progress tracking
  taskManager.on("task:progress", (task) => {
    if (task.id === wrapper.getTaskId()) {
      console.log(`Progress: ${task.progress}%`);
    }
  });
  
  const result = await wrapper.waitForCompletion();
  
  if (result.success) {
    console.log(`Download completed in ${result.duration}ms`);
    console.log("Result:", result.result);
  } else {
    console.error(`Download failed after ${result.duration}ms:`, result.error);
  }
  
  return result;
}
```

### Retry Logic with Exponential Backoff

```typescript
import { taskManager } from "java-path";

async function downloadWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Download attempt ${attempt} of ${maxRetries}...`);
      
      const downloadJob = taskManager.download(url, {
        ...options,
        retries: 0 // Handle retries manually for exponential backoff
      });
      
      const result = await downloadJob.data.promise;
      console.log("Download successful!");
      return result;
      
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`All download attempts failed. Last error: ${lastError.message}`);
}
```

### Task Queue Management

```typescript
import { taskManager } from "java-path";

class TaskQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.running = [];
  }
  
  add(taskFunction, priority = 0) {
    this.queue.push({ taskFunction, priority, id: Date.now() + Math.random() });
    this.queue.sort((a, b) => b.priority - a.priority);
    this.process();
  }
  
  async process() {
    while (this.queue.length > 0 && this.running.length < this.maxConcurrent) {
      const task = this.queue.shift();
      this.running.push(task);
      
      try {
        const taskOperation = await task.taskFunction();
        const result = await taskOperation.data.promise;
        
        console.log(`Task ${task.id} completed:`, result);
      } catch (error) {
        console.error(`Task ${task.id} failed:`, error);
      } finally {
        this.running = this.running.filter(t => t.id !== task.id);
        this.process(); // Process next task
      }
    }
  }
}

// Usage
const queue = new TaskQueue(2); // Max 2 concurrent tasks

// Add tasks with different priorities
queue.add(() => taskManager.download("https://example.com/file1.zip", {}), 1);
queue.add(() => taskManager.download("https://example.com/file2.zip", {}), 3);
queue.add(() => taskManager.createBackup("./data", {}), 2);
```

## Error Handling

```typescript
import { taskManager } from "java-path";

async function robustTaskOperation() {
  const task = taskManager.download("https://example.com/file.zip", {
    fileName: "file.zip",
    timeout: 30000,
    retries: 3
  });
  
  // Comprehensive error handling
  taskManager.on("task:failed", (failedTask) => {
    if (failedTask.id === task.taskId) {
      console.error(`Task failed: ${failedTask.error}`);
      
      // Handle specific error types
      if (failedTask.error.includes("timeout")) {
        console.log("Consider increasing timeout or checking network");
      } else if (failedTask.error.includes("permission")) {
        console.log("Check file permissions");
      } else if (failedTask.error.includes("disk space")) {
        console.log("Insufficient disk space");
      }
    }
  });
  
  try {
    const result = await task.data.promise;
    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      retryable: !error.message.includes("disk space") && !error.message.includes("permission")
    };
  }
}
```

## Performance Considerations

- Use appropriate timeout values for network operations
- Consider compression levels for backups (higher compression = slower but smaller)
- Use `overwrite: false` to avoid unnecessary file operations
- Batch operations when possible to reduce overhead
- Monitor memory usage with large files
- Use streaming for large downloads to avoid memory issues
- Consider disk I/O limitations when running multiple concurrent tasks
