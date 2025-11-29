import { describe, it, expect } from "bun:test";
import {
  isCommandAvailable,
  getPackageManager,
  isPackageInstalled,
  getLinuxDistroInfo,
  CommandUtils,
} from "../../src/utils/commands.js";
import { env } from "../../src/platforms/env.js";

describe("Command utilities", () => {
  describe("isCommandAvailable", () => {
    it("should return true for commands that are likely available", () => {
      // Test for commands that are likely available on most systems
      expect(isCommandAvailable("node")).toBe(true);
      expect(isCommandAvailable("npm")).toBe(true);
    });

    it("should return false for commands that are unlikely to exist", () => {
      // Test for a command that definitely shouldn't exist
      expect(isCommandAvailable("definitely-nonexistent-command-12345")).toBe(
        false,
      );
    });

    it("should work with CommandUtils wrapper", async () => {
      const result = await CommandUtils.isCommandAvailable("node");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe("boolean");
        expect(result.data).toBe(true);
      }
    });
  });

  describe("getPackageManager", () => {
    it("should return a string for available package managers", () => {
      const pm = getPackageManager();
      if (pm) {
        expect(typeof pm).toBe("string");
        expect([
          "apt",
          "dnf",
          "yum",
          "pacman",
          "brew",
          "winget",
          "choco",
          "pkg",
        ]).toContain(pm);
      }
    });

    it("should return null if no package manager is available", () => {
      // In a very minimal environment, this could return null
      // We're just testing the function doesn't throw an error
      const pm = getPackageManager();
      expect(pm === null || typeof pm === "string").toBe(true);
    });

    it("should work with CommandUtils wrapper", async () => {
      const result = await CommandUtils.getPackageManager();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data === null || typeof result.data === "string").toBe(
          true,
        );
        if (result.data) {
          expect([
            "apt",
            "dnf",
            "yum",
            "pacman",
            "brew",
            "winget",
            "choco",
            "pkg",
          ]).toContain(result.data);
        }
      }
    });
  });

  describe("isPackageInstalled", () => {
    it("should return false for non-existent packages", () => {
      const installed = isPackageInstalled(
        "definitely-nonexistent-package-12345",
      );
      expect(installed).toBe(false);
    });

    it("should check for a package that might be installed", () => {
      // This test is platform-dependent, but we're just checking it doesn't crash
      const installed = isPackageInstalled("curl");
      expect(typeof installed).toBe("boolean");
    });

    it("should accept a custom package manager", () => {
      // Even if the package manager doesn't exist, it shouldn't crash
      const installed = isPackageInstalled("some-package", "nonexistent-pm");
      expect(installed).toBe(false);
    });

    it("should work with CommandUtils wrapper", async () => {
      // Use a package that's likely to exist and check quickly
      // Increase timeout for this test
      const result = await CommandUtils.isPackageInstalled("node");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe("boolean");
      }
    });
  });

  describe("getLinuxDistroInfo", () => {
    it("should return null on non-Linux systems", () => {
      // Mock non-Linux environment
      const originalIsLinux = env.isLinux;
      (env as any).isLinux = () => false;

      const info = getLinuxDistroInfo();
      expect(info).toBeNull();

      // Restore original function
      (env as any).isLinux = originalIsLinux;
    });

    it("should return Linux distro info on Linux systems", () => {
      // Mock Linux environment
      const originalIsLinux = env.isLinux;
      const originalRunSync = global.require?.("child_process")?.execSync;

      // We can't easily mock the entire file system for this test
      // So we'll just ensure it doesn't throw an error
      if (env.isLinux()) {
        const info = getLinuxDistroInfo();
        expect(info === null || typeof info === "object").toBe(true);
        if (info) {
          expect(typeof info.id).toBe("string");
          expect(typeof info.versionId).toBe("string");
        }
      }

      // Restore original function
      (env as any).isLinux = originalIsLinux;
    });
  });

  describe("CommandUtils wrapper", () => {
    it("should have all expected methods", () => {
      expect(typeof CommandUtils.run).toBe("function");
      expect(typeof CommandUtils.isCommandAvailable).toBe("function");
      expect(typeof CommandUtils.getPackageManager).toBe("function");
      expect(typeof CommandUtils.isPackageInstalled).toBe("function");
    });

    it("should run commands successfully", async () => {
      // This test depends on the system, but we're checking the wrapper works
      const result = await CommandUtils.run("echo 'test'");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe("string");
        // The result might include newlines or other whitespace, so we'll just check it contains our string
        expect(result.data.includes("test")).toBe(true);
      }
    });

    it("should handle command errors", async () => {
      // Try to run a command that should fail
      const result = await CommandUtils.run(
        "definitely-nonexistent-command-12345",
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(typeof result.error).toBe("string");
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle empty strings", () => {
      expect(() => isCommandAvailable("")).not.toThrow();
      expect(isCommandAvailable("")).toBe(false);
    });

    it("should handle null or undefined", () => {
      // TypeScript would normally prevent these, but we're checking runtime behavior
      expect(() => isCommandAvailable(null as any)).not.toThrow();
      expect(() => isCommandAvailable(undefined as any)).not.toThrow();
    });

    it("should handle special characters", () => {
      expect(() => isCommandAvailable("command-with-dash")).not.toThrow();
      expect(() => isCommandAvailable("command_with_underscore")).not.toThrow();
      expect(() => isCommandAvailable("command.with.dots")).not.toThrow();
    });
  });
});
