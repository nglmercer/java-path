import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultPaths } from "../../src/config.ts";
import { taskManager } from "../../index.ts";
import { FileUtils } from "../../src/utils/file.ts";

describe("Path Configuration", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a unique test directory for each test
    const timestamp = Date.now();
    testDir = join(tmpdir(), `config-test-${timestamp}`);
    await Bun.$`mkdir -p ${testDir}`;
  });

  afterEach(async () => {
    // Reset paths to defaults after each test
    defaultPaths.reset();
    // Clean up the test directory
    await Bun.$`rm -rf ${testDir}`;
  });

  it("should have default paths initially", () => {
    expect(defaultPaths.downloadPath).toBeDefined();
    expect(defaultPaths.unpackPath).toBeDefined();
    expect(defaultPaths.backupPath).toBeDefined();
  });

  it("should update paths correctly", () => {
    const newDownloadPath = join(testDir, "custom-downloads");
    const newUnpackPath = join(testDir, "custom-unpacked");
    const newBackupPath = join(testDir, "custom-backups");

    defaultPaths.update({
      downloadPath: newDownloadPath,
      unpackPath: newUnpackPath,
      backupPath: newBackupPath,
    });

    expect(defaultPaths.downloadPath).toBe(newDownloadPath);
    expect(defaultPaths.unpackPath).toBe(newUnpackPath);
    expect(defaultPaths.backupPath).toBe(newBackupPath);
  });

  it("should update only specified paths", () => {
    const newDownloadPath = join(testDir, "custom-downloads");
    const originalUnpackPath = defaultPaths.unpackPath;
    const originalBackupPath = defaultPaths.backupPath;

    defaultPaths.update({
      downloadPath: newDownloadPath,
    });

    expect(defaultPaths.downloadPath).toBe(newDownloadPath);
    expect(defaultPaths.unpackPath).toBe(originalUnpackPath);
    expect(defaultPaths.backupPath).toBe(originalBackupPath);
  });

  it("should reset paths to defaults", () => {
    const originalDownloadPath = defaultPaths.downloadPath;
    const originalUnpackPath = defaultPaths.unpackPath;
    const originalBackupPath = defaultPaths.backupPath;

    // Update paths
    defaultPaths.update({
      downloadPath: join(testDir, "custom-downloads"),
      unpackPath: join(testDir, "custom-unpacked"),
      backupPath: join(testDir, "custom-backups"),
    });

    // Verify paths changed
    expect(defaultPaths.downloadPath).not.toBe(originalDownloadPath);
    expect(defaultPaths.unpackPath).not.toBe(originalUnpackPath);
    expect(defaultPaths.backupPath).not.toBe(originalBackupPath);

    // Reset paths
    defaultPaths.reset();

    // Verify paths reset to original values
    expect(defaultPaths.downloadPath).toBe(originalDownloadPath);
    expect(defaultPaths.unpackPath).toBe(originalUnpackPath);
    expect(defaultPaths.backupPath).toBe(originalBackupPath);
  });

  it("should use updated paths in task operations", async () => {
    const customPaths = {
      downloadPath: join(testDir, "downloads"),
      unpackPath: join(testDir, "unpacked"),
      backupPath: join(testDir, "backups"),
    };

    // Update paths
    defaultPaths.update(customPaths);

    // Create test file
    const sourceDir = join(testDir, "source");
    await Bun.$`mkdir -p ${sourceDir}`;
    await FileUtils.writeFile(sourceDir, "", "test.txt", "This is a test file");

    // Create backup using taskManager with updated paths
    const { promise: backupPromise } = taskManager.createBackup(sourceDir, {
      outputFilename: "test-backup.zip",
      useZip: true,
    });

    const backupResult = await backupPromise;

    // Verify backup is in custom backup path
    expect(backupResult.backupPath).toContain(customPaths.backupPath);

    // Restore backup using taskManager with updated paths
    const { promise: restorePromise } = taskManager.restoreBackup(
      backupResult.backupPath,
      { destinationFolderName: "restored-data" },
    );

    const restoreResult = await restorePromise;

    // Verify restore is in custom unpack path
    expect(restoreResult.destinationPath).toContain(customPaths.unpackPath);
  });
});
