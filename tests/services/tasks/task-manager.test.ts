import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { setTimeout } from "node:timers/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskManager, TaskType, TaskStatus } from "node-task-manager";
import { FileUtils } from "../../../src/utils/file.js";
import type { TaskEvents } from "node-task-manager";

describe("Task Manager Integration", () => {
  // Set default timeout for all tests in this suite
  // @ts-ignore
  it.timeout = 30000; // 30 seconds
  let testDir: string;
  let taskManager: TaskManager;

  beforeEach(async () => {
    // Create a unique test directory for each test
    const timestamp = Date.now();
    testDir = join(tmpdir(), `task-manager-test-${timestamp}`);
    await Bun.$`mkdir -p ${testDir}`;

    // Initialize TaskManager with test paths
    taskManager = new TaskManager({
      downloadPath: join(testDir, "downloads"),
      unpackPath: join(testDir, "unpacked"),
      backupPath: join(testDir, "backups"),
    });
  });

  afterEach(async () => {
    // Clean up the test directory after each test
    await Bun.$`rm -rf ${testDir}`;
  });

  describe("Task Creation and Management", () => {
    it("should create a backup task", async () => {
      // Create some test files to backup
      const sourceDir = join(testDir, "source");
      await Bun.$`mkdir -p ${sourceDir}`;
      await FileUtils.writeFile(
        sourceDir,
        "",
        "test.txt",
        "This is a test file for backup",
      );

      const { taskId, promise } = taskManager.createBackup(sourceDir, {
        outputFilename: "test-backup.zip",
        useZip: true,
      });

      expect(taskId).toBeDefined();
      expect(taskId.length).toBeGreaterThan(0);
      expect(promise).toBeInstanceOf(Promise);

      // Wait for the task to complete
      const result = await promise;
      expect(result).toBeDefined();
      expect(result.backupPath).toBeDefined();
      expect(result.size).toBeGreaterThan(0);

      // Verify the backup file exists
      const backupExists = await FileUtils.pathExists(result.backupPath);
      expect(backupExists.success).toBe(true);
    });

    it("should create a restore task", async () => {
      // First, create a backup
      const sourceDir = join(testDir, "source");
      await Bun.$`mkdir -p ${sourceDir}`;
      await FileUtils.writeFile(
        sourceDir,
        "",
        "test.txt",
        "This is a test file for backup",
      );

      const { promise: backupPromise } = taskManager.createBackup(sourceDir, {
        outputFilename: "test-restore.zip",
        useZip: true,
      });

      const backupResult = await backupPromise;

      // Now restore it
      const { taskId, promise: restorePromise } = taskManager.restoreBackup(
        backupResult.backupPath,
        { destinationFolderName: "restored-data" },
      );

      expect(taskId).toBeDefined();
      expect(restorePromise).toBeInstanceOf(Promise);

      const restoreResult = await restorePromise;
      expect(restoreResult).toBeDefined();
      expect(restoreResult.destinationPath).toBeDefined();

      // Verify the restored files
      const restoredFileExists = await FileUtils.pathExists(
        join(restoreResult.destinationPath, "test.txt"),
      );
      expect(restoredFileExists.success).toBe(true);
    });

    it("should create an unpack task", async () => {
      // Create a zip file to unpack
      const sourceDir = join(testDir, "unpack-source");
      await Bun.$`mkdir -p ${sourceDir}`;
      await FileUtils.writeFile(
        sourceDir,
        "",
        "unpack-test.txt",
        "This is a test file for unpacking",
      );

      const { promise: backupPromise } = taskManager.createBackup(sourceDir, {
        outputFilename: "unpack-test.zip",
        useZip: true,
      });

      const backupResult = await backupPromise;

      // Now unpack it
      const { taskId, promise: unpackPromise } = taskManager.unpack(
        backupResult.backupPath,
        { destination: "unpacked-data" },
      );

      expect(taskId).toBeDefined();
      expect(unpackPromise).toBeInstanceOf(Promise);

      const unpackResult = await unpackPromise;
      expect(unpackResult).toBeDefined();
      expect(unpackResult.unpackDir).toBeDefined();

      // Verify the unpacked files
      const unpackedFileExists = await FileUtils.pathExists(
        join(unpackResult.unpackDir, "unpack-test.txt"),
      );
      expect(unpackedFileExists.success).toBe(true);
    });
  });

  describe("Task Events", () => {
    it("should emit task events", async () => {
      const events: string[] = [];

      // Set up event listeners
      taskManager.on("task:created", () => events.push("task:created"));
      taskManager.on("task:started", () => events.push("task:started"));
      taskManager.on("task:progress", () => events.push("task:progress"));
      taskManager.on("task:completed", () => events.push("task:completed"));

      // Create and run a task
      const sourceDir = join(testDir, "event-source");
      await Bun.$`mkdir -p ${sourceDir}`;
      await FileUtils.writeFile(
        sourceDir,
        "",
        "event-test.txt",
        "This is a test file for events",
      );

      const { promise } = taskManager.createBackup(sourceDir, {
        outputFilename: "event-test.zip",
        useZip: true,
      });

      await promise;

      // Verify all expected events were emitted
      expect(events).toContain("task:created");
      expect(events).toContain("task:started");
      expect(events).toContain("task:progress");
      expect(events).toContain("task:completed");
    });

    it("should emit task failed event on error", async () => {
      const events: string[] = [];

      // Set up event listeners
      taskManager.on("task:created", () => events.push("task:created"));
      taskManager.on("task:started", () => events.push("task:started"));
      taskManager.on("task:failed", () => events.push("task:failed"));

      try {
        // Try to create a backup from a non-existent directory
        const nonExistentDir = join(testDir, "non-existent");
        const { promise } = taskManager.createBackup(nonExistentDir, {
          outputFilename: "error-test.zip",
          useZip: true,
        });

        await promise;
        // If we get here, the test should fail
        expect(false).toBe(true);
      } catch (error) {
        // We expect an error
        expect(error).toBeDefined();
      }

      // Verify the failed event was emitted
      expect(events).toContain("task:created");
      expect(events).toContain("task:started");
      expect(events).toContain("task:failed");
    });
  });

  describe("Task Progress", () => {
    it("should report progress for long-running tasks", async () => {
      let progressReports = 0;

      // Set up a progress listener
      taskManager.on("task:progress", (task) => {
        progressReports++;
        expect(task.progress).toBeGreaterThanOrEqual(0);
        expect(task.progress).toBeLessThanOrEqual(100);
      });

      // Create a task that should generate progress
      const sourceDir = join(testDir, "progress-source");
      await Bun.$`mkdir -p ${sourceDir}`;

      // Create several files to make the task take a bit longer
      for (let i = 0; i < 10; i++) {
        await FileUtils.writeFile(
          sourceDir,
          "",
          `file-${i}.txt`,
          `This is test file number ${i}`,
        );
      }

      const { promise } = taskManager.createBackup(sourceDir, {
        outputFilename: "progress-test.zip",
        useZip: true,
      });

      await promise;

      // We should have received at least one progress report
      expect(progressReports).toBeGreaterThan(0);
    });
  });

  describe("Task Recovery", () => {
    it("should wait for task by ID", async () => {
      const sourceDir = join(testDir, "wait-source");
      await Bun.$`mkdir -p ${sourceDir}`;
      await FileUtils.writeFile(
        sourceDir,
        "",
        "wait-test.txt",
        "This is a test file for waiting",
      );

      const { taskId, promise } = taskManager.createBackup(sourceDir, {
        outputFilename: "wait-test.zip",
        useZip: true,
      });

      // Wait for the task using the taskId
      const result = await taskManager.waitForTask(taskId);

      // Verify we got the correct result
      expect(result).toBeDefined();
      expect(result.backupPath).toBeDefined();
      expect(result.size).toBeGreaterThan(0);

      // The original promise should also resolve to the same result
      const originalResult = await promise;
      expect(originalResult.backupPath).toBe(result.backupPath);
      expect(originalResult.size).toBe(result.size);
    });

    it("should get task information", async () => {
      const sourceDir = join(testDir, "info-source");
      await Bun.$`mkdir -p ${sourceDir}`;
      await FileUtils.writeFile(
        sourceDir,
        "",
        "info-test.txt",
        "This is a test file for info",
      );

      const { taskId, promise } = taskManager.createBackup(sourceDir, {
        outputFilename: "info-test.zip",
        useZip: true,
      });

      // Get the task information
      const task = taskManager.getTask(taskId);

      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
      expect(task?.type).toBe(TaskType.BACKUP_COMPRESS);
      expect(task?.status).toBe(TaskStatus.IN_PROGRESS); // Task starts immediately

      // Wait for the task to complete
      await promise;

      // Get the task information again
      const completedTask = taskManager.getTask(taskId);

      expect(completedTask).toBeDefined();
      expect(completedTask?.id).toBe(taskId);
      expect(completedTask?.type).toBe(TaskType.BACKUP_COMPRESS);
      expect(completedTask?.status).toBe(TaskStatus.COMPLETED); // Should be completed now
    });
  });

  describe("Multiple Tasks", () => {
    it("should handle multiple concurrent tasks", async () => {
      // Create source directories for multiple tasks
      const sourceDirs = [];
      for (let i = 0; i < 3; i++) {
        const sourceDir = join(testDir, `concurrent-source-${i}`);
        await Bun.$`mkdir -p ${sourceDir}`;
        await FileUtils.writeFile(
          sourceDir,
          "",
          "concurrent-test.txt",
          `This is test file for concurrent task ${i}`,
        );
        sourceDirs.push(sourceDir);
      }

      // Create multiple backup tasks
      const tasks = sourceDirs.map((sourceDir, i) =>
        taskManager.createBackup(sourceDir, {
          outputFilename: `concurrent-test-${i}.zip`,
          useZip: true,
        }),
      );

      // Wait for all tasks to complete
      const results = await Promise.all(tasks.map((task) => task.promise));

      // Verify all tasks completed successfully
      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result.backupPath).toBeDefined();
        expect(result.size).toBeGreaterThan(0);
      });
    });

    it("should handle task failures gracefully", async () => {
      // Create a mix of valid and invalid tasks
      const validSourceDir = join(testDir, "valid-source");
      await Bun.$`mkdir -p ${validSourceDir}`;
      await FileUtils.writeFile(
        validSourceDir,
        "",
        "valid-test.txt",
        "This is a valid test file",
      );

      const invalidSourceDir = join(testDir, "invalid-source");

      const tasks = [
        taskManager.createBackup(validSourceDir, {
          outputFilename: "valid-test.zip",
          useZip: true,
        }),
        taskManager.createBackup(invalidSourceDir, {
          outputFilename: "invalid-test.zip",
          useZip: true,
        }),
      ];

      // Wait for all tasks to complete (some will fail)
      const results = await Promise.allSettled(
        tasks.map((task) => task.promise),
      );

      // Verify one succeeded and one failed
      expect(results.length).toBe(2);
      expect(results[0]?.status).toBe("fulfilled");
      expect(results[1]?.status).toBe("rejected");
    });
  });
});
