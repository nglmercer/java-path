import {
  TaskManager,
  type TaskEvents,
} from "node-task-manager";
import { defaultPaths } from "../config.js";

// Create a typed instance of TaskManager
let taskManager = new TaskManager({
  downloadPath: defaultPaths.downloadPath,
  unpackPath: defaultPaths.unpackPath,
  backupPath: defaultPaths.backupPath,
});

// Function to recreate TaskManager with updated paths
function recreateTaskManager() {
  taskManager = new TaskManager({
    downloadPath: defaultPaths.downloadPath,
    unpackPath: defaultPaths.unpackPath,
    backupPath: defaultPaths.backupPath,
  });

  // Re-attach event listeners
  attachEventListeners();
  return {taskManager};
}

// Function to attach event listeners
function attachEventListeners(logger?: boolean) {
  const TaskEventsNames: (keyof TaskEvents)[] = [
    "task:created",
    "task:started",
    "task:progress",
    "task:completed",
    "task:failed",
  ];

  TaskEventsNames.forEach((eventName) => {
    taskManager.on(eventName, (task) => {
      const { payload, details, error, createdAt, updatedAt, ...showData } =
        task;
      if (eventName !== "task:progress") {
        console.log(`Event: ${eventName}`, task);
      }
    });
  });
  return {taskManager,TaskEventsNames};
}

// Attach initial event listeners
attachEventListeners();

// Export the typed instance and update function
export { taskManager, recreateTaskManager };

// Add TaskOperation interface since it's not exported from node-task-manager
export interface TaskOperation<T> {
  taskId: string;
  promise: Promise<T>;
}

// Export types from node-task-manager for convenience
export type {
  AssetManagerOptions,
  TaskEvents,
  TaskType,
  TaskStatus,
  ITask,
  BackupOptions,
  BackupResult,
  RestoreOptions,
  RestoreResult,
  DownloadResult,
  UnpackOptions,
  UnpackResult,
  ProgressData,
  ResultsTypes,
} from "node-task-manager";
