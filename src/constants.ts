export const ADOPTIUM_API_BASE_URL = "https://api.adoptium.net/v3";

export const ADOPTIUM_ARCH_MAP: Record<string, string | undefined> = {
  x32: "x32",
  x64: "x64",
  x86_64: "x64",
  arm64: "aarch64",
};

export const SYSTEM_ARCH_MAP: Record<string, string | undefined> = {
  arm: "arm",
  arm64: "aarch64",
  x64: "x86_64",
};

export const NODE_PLATFORMS = {
  WIN32: "win32",
  LINUX: "linux",
  DARWIN: "darwin",
  ANDROID: "android",
} as const;

export const ADOPTIUM_OS_NAMES = {
  WINDOWS: "windows",
  LINUX: "linux",
  MAC: "mac",
} as const;

export const ADOPTIUM_OS_MAP: Record<string, string> = {
  win32: ADOPTIUM_OS_NAMES.WINDOWS,
  linux: ADOPTIUM_OS_NAMES.LINUX,
  darwin: ADOPTIUM_OS_NAMES.MAC,
  android: ADOPTIUM_OS_NAMES.LINUX,
};

export const EXTENSIONS = {
  ZIP: ".zip",
  TAR_GZ: ".tar.gz",
} as const;

export const TERMUX_CONSTANTS = {
  JAVA_PATH: "/data/data/com.termux/files/usr/bin/",
  PACKAGE_PREFIX: "openjdk-",
  INSTALL_CMD_PREFIX: "pkg install ",
  TERMUX_PATH_CHECK: "/data/data/com.termux",
} as const;

export const FOLDER_NAMES = {
  BIN: "bin",
  CONTENTS: "Contents",
  HOME: "Home",
  JDK_PREFIX: "jdk-",
} as const;

export const ALLOWED_FILE_EXTENSIONS = [
  ".txt",
  ".log",
  ".json",
  ".yaml",
  ".yml",
  ".ini",
  ".conf",
  ".properties",
  ".env",
  ".csv",
  ".tsv",
  ".md",
  ".xml",
  ".mcfunction",
  ".sh",
  ".bash",
  ".bat",
  ".zsh",
  ".ps1",
  ".jpg",
  ".png",
  ".jar",
  ".gz",
];
