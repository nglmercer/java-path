import { describe, it, expect, beforeEach } from "bun:test";
import {
  getJavaInfoByVersion,
  type JavaInfo,
  type JavaInfoTermux,
  type JavaInfoStandard,
} from "../../src/platforms/java.js";
import { env } from "../../src/platforms/env.js";

describe("Java platform utilities", () => {
  beforeEach(() => {
    // Reset any test-specific setup if needed
  });

  it("should return Java info for empty string version", () => {
    const result = getJavaInfoByVersion("");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.version).toBe("");
    }
  });

  it("should return JavaInfoTermux when on Termux", () => {
    // Mock Termux detection
    const originalIsTermux = env.isTermux;
    (env as any).isTermux = () => true;

    const result = getJavaInfoByVersion("17");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.isTermux).toBe(true);
      const termuxInfo = result as JavaInfoTermux;
      expect(termuxInfo.packageName).toBe("openjdk-17");
      expect(termuxInfo.version).toBe("17");
      expect(termuxInfo.javaPath).toBe("/data/data/com.termux/files/usr/bin/");
      expect(termuxInfo.installCmd).toBe("pkg install openjdk-17");
      expect(typeof termuxInfo.installed).toBe("boolean");
    }

    // Restore original function
    (env as any).isTermux = originalIsTermux;
  });

  it("should return JavaInfoStandard on non-Termux platforms", () => {
    // Mock non-Termux detection
    const originalIsTermux = env.isTermux;
    (env as any).isTermux = () => false;

    const result = getJavaInfoByVersion("11");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.isTermux).toBe(false);
      const standardInfo = result as JavaInfoStandard;
      expect(standardInfo.version).toBe("11");
      expect(standardInfo.url).toContain("api.adoptium.net");
      expect(standardInfo.url).toContain("11");
      expect(standardInfo.filename).toContain("Java-11");
      expect(standardInfo.javaBinPath).toContain("bin");
      expect(typeof standardInfo.downloadPath).toBe("string");
      expect(typeof standardInfo.unpackPath).toBe("string");
    }

    // Restore original function
    (env as any).isTermux = originalIsTermux;
  });

  it("should handle different Java versions correctly", () => {
    const versions = ["8", "11", "17", "21"];

    versions.forEach((version) => {
      const result = getJavaInfoByVersion(version);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.version).toBe(version);
      }
    });
  });

  it("should return null for unsupported architectures", () => {
    // Mock unsupported architecture
    const originalArch = process.arch;
    (process as any).arch = "unsupported_arch";

    const result = getJavaInfoByVersion("17");
    expect(result).toBeNull();

    // Restore original architecture
    (process as any).arch = originalArch;
  });

  it("should construct correct URLs for Adoptium API", () => {
    // Mock non-Termux detection
    const originalIsTermux = env.isTermux;
    (env as any).isTermux = () => false;

    const result = getJavaInfoByVersion("17");
    expect(result).not.toBeNull();
    if (result && !result.isTermux) {
      const standardInfo = result as JavaInfoStandard;
      expect(standardInfo.url).toBe(
        `https://api.adoptium.net/v3/binary/latest/17/ga/${env.platform.name}/${process.arch === "arm64" ? "aarch64" : "x64"}/jdk/hotspot/normal/eclipse?project=jdk`,
      );
    }

    // Restore original function
    (env as any).isTermux = originalIsTermux;
  });
});
