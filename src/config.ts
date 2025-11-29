//import { TaskManager,type TaskEvents } from 'node-task-manager';
import path from "path";
const processDir = process.cwd();
const tempPath = (...args: string[]): string => {
  return path.join(processDir, ...args);
};

// Default paths configuration
const defaultPathsConfig = {
  downloadPath: tempPath("temp", "downloads"),
  unpackPath: tempPath("temp", "unpacked"),
  backupPath: tempPath("temp", "backups"),
};

// Current active paths (can be overridden)
let currentPaths = { ...defaultPathsConfig };

const defaultPaths = {
  get downloadPath() {
    return currentPaths.downloadPath;
  },
  get unpackPath() {
    return currentPaths.unpackPath;
  },
  get backupPath() {
    return currentPaths.backupPath;
  },

  // Method to update paths
  update(newPaths: Partial<typeof defaultPathsConfig>) {
    currentPaths = { ...currentPaths, ...newPaths };
    // Import and call recreateTaskManager to update the TaskManager instance
    const { recreateTaskManager } = require("./services/taskInstance.js");
    recreateTaskManager();
    return currentPaths;
  },

  // Reset to defaults
  reset() {
    currentPaths = { ...defaultPathsConfig };
    return currentPaths;
  },
};

export { defaultPaths, tempPath };
