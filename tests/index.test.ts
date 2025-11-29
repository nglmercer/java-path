import { describe, it, expect } from "bun:test";
import {
  env,
  getJavaInfoByVersion,
  scanJavaInstallations,
  findJavaVersion,
  FileUtils,
  CommandUtils,
  getPlatform,
  getArchitecture,
  isWindows,
  isLinux,
  isMacOS,
} from "../index.js";

describe("Java-Path main module exports", () => {
  it("should export environment detection utilities", () => {
    expect(typeof env).toBe("object");
    expect(typeof getPlatform).toBe("function");
    expect(typeof getArchitecture).toBe("function");
    expect(typeof isWindows).toBe("function");
    expect(typeof isLinux).toBe("function");
    expect(typeof isMacOS).toBe("function");
  });

  it("should export Java platform utilities", () => {
    expect(typeof getJavaInfoByVersion).toBe("function");
  });

  it("should export Java installation services", () => {
    expect(typeof scanJavaInstallations).toBe("function");
    expect(typeof findJavaVersion).toBe("function");
  });

  it("should export utility modules", () => {
    expect(typeof FileUtils).toBe("object");
    expect(typeof CommandUtils).toBe("object");
  });
});

describe("Environment detection integration", () => {
  it("should correctly identify the current environment", () => {
    // At least one platform should match
    const platforms = [isWindows(), isLinux(), isMacOS()];
    expect(platforms.some((isMatch) => isMatch === true)).toBe(true);
  });

  it("should provide consistent platform information", () => {
    const platform = getPlatform();
    expect(platform).toHaveProperty("name");
    expect(platform).toHaveProperty("ext");
    expect(typeof platform.name).toBe("string");
    expect(typeof platform.ext).toBe("string");
  });

  it("should provide consistent architecture information", () => {
    const arch = getArchitecture();
    expect(typeof arch).toBe("string");
    expect(["arm", "aarch64", "x86_64"].includes(arch)).toBe(true);
  });
});

describe("Java information integration", () => {
  it("should return Java info for common versions", () => {
    const versions = ["8", "11", "17", "21"];

    versions.forEach((version) => {
      const javaInfo = getJavaInfoByVersion(version);
      expect(javaInfo).not.toBeNull();
      if (javaInfo) {
        expect(javaInfo.version).toBe(version);
      }
    });
  });

  it("should return Java info for invalid versions (as string)", () => {
    const javaInfo = getJavaInfoByVersion("invalid");
    expect(javaInfo).not.toBeNull();
    if (javaInfo) {
      expect(javaInfo.version).toBe("invalid");
    }
  });
});

describe("File utilities integration", () => {
  it("should be able to check path existence", async () => {
    // This is a basic integration test, assuming the project structure exists
    const result = await FileUtils.pathExists("./index.ts");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data).toBe("boolean");
    }
  });

  it("should be able to read files in the project", async () => {
    // This is a basic integration test, using the actual path to package.json
    const result = await FileUtils.readFile(process.cwd(), "", "package.json");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data).toBe("string");
      expect(result.data).toContain("name");
    }
  });
});

describe("Command utilities integration", () => {
  it("should be able to check for available commands", async () => {
    // Check for a command that should be available on most systems
    const result = await CommandUtils.isCommandAvailable("node");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data).toBe("boolean");
    }
  });

  it("should be able to detect package manager", async () => {
    const result = await CommandUtils.getPackageManager();
    // pm could be null if no supported package manager is found
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data === null || typeof result.data === "string").toBe(
        true,
      );
    }
  });
});
