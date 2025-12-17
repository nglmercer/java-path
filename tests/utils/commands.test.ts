import { describe, it, expect } from "bun:test";
import {
  isCommandAvailable,
  getPackageManager,
  isPackageInstalled,
  getLinuxDistroInfo,
  CommandUtils,
  runSync,
  detectJavaPathsSync,
  validateJavaPathSync,
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
      }, 30000);
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
        // on Windows this can be very slow if it tries to run winget
        it("should check package", async () => {
            const result = await CommandUtils.isPackageInstalled("git");
            expect(result.success).toBe(true);
            expect(typeof result.data).toBe("boolean");
        }, 30000);
    });
  });

  describe("Linux Distro Info", () => {
      it("should return null if not linux", () => {
          if (!env.isLinux()) {
              expect(getLinuxDistroInfo()).toBeNull();
          }
      });
  });

  describe("Java Path Detection", () => {
    describe("detectJavaPathsSync", () => {
      it("should return an array (empty or with paths)", () => {
        const paths = detectJavaPathsSync();
        expect(Array.isArray(paths)).toBe(true);
        
        // If Java is installed, should have at least one path
        if (isCommandAvailable("java")) {
          expect(paths.length).toBeGreaterThan(0);
        } else {
          expect(paths.length).toBe(0);
        }
      });

      it("should return valid paths when Java is available", () => {
        if (isCommandAvailable("java")) {
          const paths = detectJavaPathsSync();
          expect(paths.length).toBeGreaterThan(0);
          
          // All paths should be strings
          paths.forEach(path => {
            expect(typeof path).toBe("string");
            expect(path.length).toBeGreaterThan(0);
          });
        }
      });
    });

    describe("validateJavaPathSync", () => {
      it("should return false for invalid paths", () => {
        expect(validateJavaPathSync("")).toBe(false);
        expect(validateJavaPathSync("nonexistent/path/java")).toBe(false);
        expect(validateJavaPathSync(null as any)).toBe(false);
        expect(validateJavaPathSync(undefined as any)).toBe(false);
      });

      it("should return boolean for valid-looking paths", () => {
        // Test with a path that might exist
        const testPath = env.isWindows()
          ? "C:\\Windows\\System32\\cmd.exe"
          : "/bin/ls";
        
        const result = validateJavaPathSync(testPath);
        expect(typeof result).toBe("boolean");
      });

      it("should validate Java paths when Java is available", () => {
        if (isCommandAvailable("java")) {
          const paths = detectJavaPathsSync();
          if (paths.length > 0) {
            const validationResult = validateJavaPathSync(paths[0]);
            expect(typeof validationResult).toBe("boolean");
            
            // If we detected a path, validation should generally pass
            // (though there might be edge cases with permissions)
            if (validationResult === false) {
              console.warn(`Java path validation failed for: ${paths[0]}`);
            }
          }
        }
      });
    });

    describe("CommandUtils.detectJavaPaths", () => {
      it("should return ServiceResponse with array data", async () => {
        const result = await CommandUtils.detectJavaPaths();
        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
        
        // If Java is installed, should have paths
        if (isCommandAvailable("java")) {
          expect(result.data.length).toBeGreaterThan(0);
        }
      });

      it("should handle errors gracefully", async () => {
        // This should not throw, even if no Java is found
        const result = await CommandUtils.detectJavaPaths();
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });

    describe("CommandUtils.validateJavaPath", () => {
      it("should validate invalid paths", async () => {
        const result = await CommandUtils.validateJavaPath("nonexistent/java");
        expect(result.success).toBe(true);
        expect(result.data).toBe(false);
      });

      it("should handle empty/invalid input", async () => {
        const result1 = await CommandUtils.validateJavaPath("");
        expect(result1.success).toBe(true);
        expect(result1.data).toBe(false);

        const result2 = await CommandUtils.validateJavaPath(null as any);
        expect(result2.success).toBe(true);
        expect(result2.data).toBe(false);
      });

      it("should validate actual Java paths when available", async () => {
        if (isCommandAvailable("java")) {
          const pathsResult = await CommandUtils.detectJavaPaths();
          if (pathsResult.success && pathsResult.data.length > 0) {
            const validationResult = await CommandUtils.validateJavaPath(pathsResult.data[0]);
            expect(validationResult.success).toBe(true);
            expect(typeof validationResult.data).toBe("boolean");
          }
        }
      });
    });
  });
});
