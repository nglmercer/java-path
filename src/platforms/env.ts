import { existsSync } from "fs";

// ─────────────────────────────────────────────────────────────
// Detectores de entorno
// ─────────────────────────────────────────────────────────────
export const isTermux = (): boolean =>
  process.platform === "android" || existsSync("/data/data/com.termux");

export const isAndroid = (): boolean =>
  process.platform === "android" || isTermux();

export const isWindows = (): boolean => process.platform === "win32";
export const isLinux = (): boolean => process.platform === "linux";
export const isMacOS = (): boolean => process.platform === "darwin";

// ─────────────────────────────────────────────────────────────
// Mapeo de plataforma y arquitectura
// ─────────────────────────────────────────────────────────────
export interface PlatformInfo {
  name: string;
  ext: string;
}

const PLATFORM_MAP: Partial<Record<NodeJS.Platform, PlatformInfo>> = {
  win32: { name: "windows", ext: ".zip" },
  linux: { name: "linux", ext: ".tar.gz" },
  darwin: { name: "macos", ext: ".tar.gz" },
  android: { name: "android", ext: ".tar.gz" },
};

const ARCH_MAP: Record<string, string | undefined> = {
  arm: "arm",
  arm64: "aarch64",
  x64: "x86_64",
};

// ─────────────────────────────────────────────────────────────
// Helpers principales
// ─────────────────────────────────────────────────────────────
export const getPlatform = (): PlatformInfo => {
  const info = PLATFORM_MAP[process.platform];
  if (!info) throw new Error(`Unsupported platform: ${process.platform}`);
  return info;
};

export const getArchitecture = (): string => {
  const arch = ARCH_MAP[process.arch];
  if (!arch) throw new Error(`Unsupported architecture: ${process.arch}`);
  return arch;
};

// ─────────────────────────────────────────────────────────────
// Export combinado (si lo necesitas en un solo objeto)
// ─────────────────────────────────────────────────────────────
export const env = {
  isWindows,
  isLinux,
  isMacOS,
  isAndroid,
  isTermux,
  platform: getPlatform(),
  arch: getArchitecture(),
};
