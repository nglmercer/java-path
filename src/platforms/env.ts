import { existsSync } from "fs";
import {
  NODE_PLATFORMS,
  SYSTEM_ARCH_MAP,
  EXTENSIONS,
  ADOPTIUM_OS_NAMES,
  TERMUX_CONSTANTS,
  ADOPTIUM_OS_MAP,
} from "../constants.js";

export const isTermux = (): boolean =>
  process.platform === NODE_PLATFORMS.ANDROID ||
  existsSync(TERMUX_CONSTANTS.TERMUX_PATH_CHECK);

export const isAndroid = (): boolean =>
  process.platform === NODE_PLATFORMS.ANDROID || isTermux();

export const isWindows = (): boolean =>
  process.platform === NODE_PLATFORMS.WIN32;
export const isLinux = (): boolean => process.platform === NODE_PLATFORMS.LINUX;
export const isMacOS = (): boolean =>
  process.platform === NODE_PLATFORMS.DARWIN;

export interface PlatformInfo {
  name: string;
  ext: string;
}

const PLATFORM_MAP: Partial<Record<NodeJS.Platform, PlatformInfo>> = {
  [NODE_PLATFORMS.WIN32]: {
    name: ADOPTIUM_OS_MAP[NODE_PLATFORMS.WIN32],
    ext: EXTENSIONS.ZIP,
  },
  [NODE_PLATFORMS.LINUX]: {
    name: ADOPTIUM_OS_MAP[NODE_PLATFORMS.LINUX],
    ext: EXTENSIONS.TAR_GZ,
  },
  [NODE_PLATFORMS.DARWIN]: {
    name: ADOPTIUM_OS_MAP[NODE_PLATFORMS.DARWIN],
    ext: EXTENSIONS.TAR_GZ,
  },
  [NODE_PLATFORMS.ANDROID]: {
    name: ADOPTIUM_OS_MAP[NODE_PLATFORMS.ANDROID],
    ext: EXTENSIONS.TAR_GZ,
  },
};

export const getPlatform = (): PlatformInfo => {
  const info = PLATFORM_MAP[process.platform];
  if (!info) throw new Error(`Unsupported platform: ${process.platform}`);
  return info;
};

export const getArchitecture = (): string => {
  const arch = SYSTEM_ARCH_MAP[process.arch];
  if (!arch) throw new Error(`Unsupported architecture: ${process.arch}`);
  return arch;
};

export const env = {
  isWindows,
  isLinux,
  isMacOS,
  isAndroid,
  isTermux,
  get platform() {
    return getPlatform();
  },
  get arch() {
    return getArchitecture();
  },
};

