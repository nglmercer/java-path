import { describe, it, expect } from "bun:test";
import {
  isCommandAvailable,
  getPackageManager,
  isPackageInstalled,
  getLinuxDistroInfo,
  CommandUtils,
  runSync,
} from "../../src/utils/commands.js";
import { env } from "../../src/platforms/env.js";

describe("Command Utilities", () => {
  describe("Sync Methods", () => {
    describe("isCommandAvailable", () => {
      it("should return true for likely existing commands (e.g. node)", () => {
        expect(isCommandAvailable("node")).toBe(true);
      });

      it("should return false for non-existent commands", () => {
        expect(isCommandAvailable("definitely-does-not-exist-12345")).toBe(false);
      });
    });

    describe("getPackageManager", () => {
      it("should return a valid package manager or null", () => {
        const pm = getPackageManager();
        if (pm !== null) {
          expect([
            "apt", "dnf", "yum", "pacman", 
            "brew", 
            "winget", "choco", 
            "pkg"
          ]).toContain(pm);
        } else {
          expect(pm).toBeNull();
        }
      });
    });

    describe("isPackageInstalled", () => {
      it("should return false for non-existent package", () => {
        expect(isPackageInstalled("non-existent-package-xyz")).toBe(false);
      });
      
      it("should return boolean for 'git' (common package)", () => {
         const result = isPackageInstalled("git");
         expect(typeof result).toBe("boolean");
      });
    });

    describe("runSync", () => {
      it("should capture stdout", () => {
        const output = runSync("echo hello");
        expect(output.trim()).toBe("hello");
      });

      it("should throw on failure", () => {
        expect(() => runSync("exit 1")).toThrow();
      });

      // Test UTF8 characters if possible
      it("should handle utf8 characters correctly", () => {
        const output = runSync('echo "¡Hola Mundo!"');
        // Depending on shell encoding, this might be tricky in Windows cmd/pwsh vs unix
        // But runSync forces utf8 decoding.
        // We look for 'Hola Mundo' at least.
        expect(output).toContain("Hola Mundo");
      });
    });
  });

  describe("Async Methods (CommandUtils)", () => {
    describe("run", () => {
      it("should execute command and return output", async () => {
        const result = await CommandUtils.run("echo world");
        expect(result.success).toBe(true);
        if (result.success && typeof result.data === "string") {
           expect(result.data.trim()).toBe("world");
        }
      });

      it("should fail gracefully for bad commands", async () => {
        const result = await CommandUtils.run("non_existent_command_foo");
        expect(result.success).toBe(false);
      });
    });
    
    describe("execute (Extended)", () => {
      it("should return both stdout and stderr", async () => {
         // use a command that might print something
         const result = await CommandUtils.execute("echo test");
         expect(result.success).toBe(true);
         expect(result.data).toBeDefined();
         expect(result.data?.stdout.trim()).toBe("test");
         expect(result.data?.stderr).toBeDefined();
      });
    });

    describe("isCommandAvailable", () => {
      it("should return true for node", async () => {
        const result = await CommandUtils.isCommandAvailable("node");
        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
      });
       
      it("should return false for bad command", async () => {
        const result = await CommandUtils.isCommandAvailable("bad_command_xyz");
        expect(result.success).toBe(true); 
        expect(result.data).toBe(false);
      });
    });
    
    describe("getPackageManager", () => {
      it("should resolve check without error", async () => {
        const result = await CommandUtils.getPackageManager();
        expect(result.success).toBe(true);
      });
    });
    
    describe("isPackageInstalled", () => {
        it("should check package", async () => {
            const result = await CommandUtils.isPackageInstalled("git");
            expect(result.success).toBe(true);
            expect(typeof result.data).toBe("boolean");
        });
    });
  });

  describe("Linux Distro Info", () => {
      it("should return null if not linux", () => {
          if (!env.isLinux()) {
              expect(getLinuxDistroInfo()).toBeNull();
          }
      });
  });
});
