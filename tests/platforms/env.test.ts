import { describe, it, expect } from "bun:test";
import {
  isWindows,
  isLinux,
  isMacOS,
  isAndroid,
  isTermux,
  getPlatform,
  getArchitecture,
  env,
} from "../../src/platforms/env.js";

describe("Environment detection utilities", () => {
  it("should detect the current platform correctly", () => {
    expect(typeof isWindows()).toBe("boolean");
    expect(typeof isLinux()).toBe("boolean");
    expect(typeof isMacOS()).toBe("boolean");
    expect(typeof isAndroid()).toBe("boolean");
    expect(typeof isTermux()).toBe("boolean");
  });

  it("should get platform information", () => {
    const platform = getPlatform();
    expect(platform).toHaveProperty("name");
    expect(platform).toHaveProperty("ext");
    expect(typeof platform.name).toBe("string");
    expect(typeof platform.ext).toBe("string");
  });

  it("should get architecture information", () => {
    const arch = getArchitecture();
    expect(typeof arch).toBe("string");
    expect(["arm", "aarch64", "x86_64"].includes(arch)).toBe(true);
  });

  it("should export a comprehensive env object", () => {
    expect(env).toHaveProperty("isWindows");
    expect(env).toHaveProperty("isLinux");
    expect(env).toHaveProperty("isMacOS");
    expect(env).toHaveProperty("isAndroid");
    expect(env).toHaveProperty("isTermux");
    expect(env).toHaveProperty("platform");
    expect(env).toHaveProperty("arch");
  });

  it("should provide consistent platform information", () => {
    const envPlatform = env.platform;
    const platformFn = getPlatform();
    expect(envPlatform.name).toBe(platformFn.name);
    expect(envPlatform.ext).toBe(platformFn.ext);
  });

  it("should provide consistent architecture information", () => {
    const envArch = env.arch;
    const archFn = getArchitecture();
    expect(envArch).toBe(archFn);
  });
});
