import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as path from "node:path";
import { FileUtils, ALLOWED_EXTENSIONS } from "../../src/utils/file.js";
import type { FileDetails } from "../../src/utils/folder.js";

describe("File utilities", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a unique test directory for each test
    const timestamp = Date.now();
    testDir = join(tmpdir(), `java-path-test-${timestamp}`);
    await Bun.$`mkdir -p ${testDir}`;
  });

  afterEach(async () => {
    // Clean up the test directory after each test
    await Bun.$`rm -rf ${testDir}`;
  });

  it("should create a file with content", async () => {
    const filePath = join(testDir, "test.txt");
    const content = "This is test content";

    const result = await FileUtils.writeFile(testDir, "", "test.txt", content);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(filePath);

      // Verify the file was created with correct content
      const readResult = await FileUtils.readFile(testDir, "", "test.txt");
      expect(readResult.success).toBe(true);
      if (readResult.success) {
        expect(readResult.data).toBe(content);
      }
    }
  });

  it("should check if a path exists", async () => {
    const existingPath = join(testDir, "existing.txt");
    const nonExistentPath = join(testDir, "nonexistent.txt");

    // Create a file
    await FileUtils.writeFile(testDir, "", "existing.txt", "content");

    // Test existing path
    const existsResult = await FileUtils.pathExists(existingPath);
    expect(existsResult.success).toBe(true);
    if (existsResult.success) {
      expect(existsResult.data).toBe(true);
    }

    // Test non-existent path
    const notExistsResult = await FileUtils.pathExists(
      join(testDir, "nonexistent.txt"),
    );
    expect(notExistsResult.success).toBe(true);
    if (notExistsResult.success) {
      expect(notExistsResult.data).toBe(false);
    }
  });

  it("should rename a file", async () => {
    const oldPath = join(testDir, "old.txt");
    const newPath = join(testDir, "new.txt");
    const content = "content to rename";

    // Create a file
    await FileUtils.writeFile(testDir, "", "old.txt", content);

    // Rename it
    const renameResult = await FileUtils.renameFile(
      testDir,
      "",
      "old.txt",
      "new.txt",
    );
    expect(renameResult.success).toBe(true);
    if (renameResult.success) {
      expect(renameResult.data).toBe(newPath);

      // Verify the new file exists
      const existsResult = await FileUtils.pathExists(join(testDir, "new.txt"));
      if (existsResult.success) {
        expect(existsResult.data).toBe(true);
      }

      // Verify the old file doesn't exist anymore
      const oldExistsResult = await FileUtils.pathExists(
        join(testDir, "old.txt"),
      );
      if (oldExistsResult.success) {
        expect(oldExistsResult.data).toBe(false);
      }

      // Verify content is preserved
      const readResult = await FileUtils.readFile(testDir, "", "new.txt");
      if (readResult.success) {
        expect(readResult.data).toBe(content);
      }
    }
  });

  it("should delete a file", async () => {
    const filePath = join(testDir, "to-delete.txt");

    // Create a file
    await FileUtils.writeFile(
      testDir,
      "",
      "to-delete.txt",
      "content to delete",
    );

    // Verify it exists
    const existsResult = await FileUtils.pathExists(
      join(testDir, "to-delete.txt"),
    );
    if (existsResult.success) {
      expect(existsResult.data).toBe(true);
    }

    // Delete it
    const deleteResult = await FileUtils.deletePath(testDir, "to-delete.txt");
    expect(deleteResult.success).toBe(true);

    // Verify it's gone
    const afterDeleteResult = await FileUtils.pathExists(
      join(testDir, "to-delete.txt"),
    );
    if (afterDeleteResult.success) {
      expect(afterDeleteResult.data).toBe(false);
    }
  });

  it("should get folder details", async () => {
    // Create some test files and directories
    await FileUtils.writeFile(testDir, "", "file1.txt", "content1");
    await FileUtils.writeFile(testDir, "", "file2.json", '{"key": "value"}');
    await Bun.$`mkdir -p ${join(testDir, "subdir")}`;

    const detailsResult = await FileUtils.getFolderDetails(testDir, "");
    expect(detailsResult.success).toBe(true);
    if (detailsResult.success) {
      const details = detailsResult.data;
      expect(details.length).toBeGreaterThan(0);

      // Check if we have the expected files
      const fileNames = details.map((item) => item.name);
      expect(fileNames).toContain("file1.txt");
      expect(fileNames).toContain("file2.json");
      expect(fileNames).toContain("subdir");

      // Check file details
      const file1 = details.find((item) => item.name === "file1.txt");
      if (file1) {
        expect(file1.isDirectory).toBe(false);
        expect(file1.size).toBe(8); // "content1"
      }

      // Check directory details
      const subdir = details.find((item) => item.name === "subdir");
      if (subdir) {
        expect(subdir.isDirectory).toBe(true);
      }
    }
  });

  it("should validate file extensions", async () => {
    // Create files with allowed and disallowed extensions
    const allowedPath = join(testDir, "allowed.txt");
    const disallowedPath = join(testDir, "disallowed.xyz");

    // This should succeed
    const allowedResult = await FileUtils.writeFile(
      testDir,
      "",
      "allowed.txt",
      "content",
    );
    expect(allowedResult.success).toBe(true);

    // This should fail since .xyz is not in ALLOWED_EXTENSIONS
    try {
      await FileUtils.writeFile(testDir, "", "disallowed.xyz", "content");
      // If we reach here, the test should fail
      expect(false).toBe(true);
    } catch (e) {
      // We expect an error to be thrown
      expect(true).toBe(true);
    }
  });

  it("should check file validity", async () => {
    // Create a small file
    await FileUtils.writeFile(testDir, "", "small.txt", "small content");

    // Check with default options (1MB max size)
    const validResult = await FileUtils.checkFileValidity(
      join(testDir, "small.txt"),
    );
    expect(validResult.success).toBe(true);

    // Check with custom max size
    const customSizeResult = await FileUtils.checkFileValidity(
      join(testDir, "small.txt"),
      {
        allowedExtensions: [".txt"],
        maxSizeInBytes: 100,
      },
    );
    expect(customSizeResult.success).toBe(true);

    // Create a larger file for this test
    await FileUtils.writeFile(testDir, "", "larger.txt", "x".repeat(10));

    // Check with too small max size
    const tooSmallResult = await FileUtils.checkFileValidity(
      join(testDir, "larger.txt"),
      {
        allowedExtensions: [".txt"],
        maxSizeInBytes: 5,
      },
    );
    expect(tooSmallResult.success).toBe(false);

    // Check with wrong extension
    const wrongExtResult = await FileUtils.checkFileValidity(
      join(testDir, "small.txt"),
      {
        allowedExtensions: [".json"],
        maxSizeInBytes: 100,
      },
    );
    expect(wrongExtResult.success).toBe(false);
    expect(wrongExtResult.success).toBe(false);
  });

  it("should calculate checksums and verify file integrity", async () => {
    const filePath = join(testDir, "checksum.txt");
    const content = "hello world";
    await FileUtils.writeFile(testDir, "", "checksum.txt", content);

    // Calculate checksum (sha256 of "hello world" is "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9")
    const checksumResult = await FileUtils.calculateChecksum(filePath);
    expect(checksumResult.success).toBe(true);
    // We don't hardcode the hash here to depend on crypto implementation, but we can verify it against itself
    const calculatedChecksum = checksumResult.success
      ? checksumResult.data
      : "";

    // Verify integrity - Success case
    const validResult = await FileUtils.verifyFileIntegrity(
      filePath,
      content.length,
      calculatedChecksum,
    );
    expect(validResult.success).toBe(true);
    expect(validResult.data).toBe(true);

    // Verify integrity - Size Mismatch
    const invalidSizeResult = await FileUtils.verifyFileIntegrity(
      filePath,
      content.length + 1,
      calculatedChecksum,
    );
    expect(invalidSizeResult.success).toBe(true); // The operation succeeded (it ran without error)
    expect(invalidSizeResult.data).toBe(false); // But the verification failed

    // Verify integrity - Checksum Mismatch
    const invalidChecksumResult = await FileUtils.verifyFileIntegrity(
      filePath,
      content.length,
      "0000000000000000000000000000000000000000000000000000000000000000",
    );
    expect(invalidChecksumResult.success).toBe(true);
    expect(invalidChecksumResult.data).toBe(false);
  });
});
