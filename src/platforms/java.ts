import * as path from "path";
import { existsSync, readdirSync } from "fs";
import { env } from "./env.js"; // Import the env object containing platform details
import { isPackageInstalled } from "../utils/commands.js";
import { defaultPaths } from "../config.js";
import {
  ADOPTIUM_ARCH_MAP,
  ADOPTIUM_API_BASE_URL,
  TERMUX_CONSTANTS,
  FOLDER_NAMES,
} from "../constants.js";

// ─────────────────────────────────────────────────────────────
// Output Interfaces
// ─────────────────────────────────────────────────────────────

/**
 * Java information specific to a Termux environment.
 */
export interface JavaInfoTermux {
  isTermux: true;
  version: string;
  packageName: string;
  installCmd: string;
  javaPath: string;
  installed: boolean;
}

/**
 * Java information for download and management on standard systems (Windows, macOS, Linux).
 */
export interface JavaInfoStandard {
  isTermux: false;
  url: string;
  filename: string;
  version: string;
  downloadPath: string; // Relative path for the downloaded file
  unpackPath: string; // Relative path for the unpacked folder
  absoluteDownloadPath: string;
  absoluteUnpackPath: string;
  javaBinPath: string; // Absolute path to the Java 'bin' folder
}

// Combined return type
export type JavaInfo = JavaInfoTermux | JavaInfoStandard;

// ─────────────────────────────────────────────────────────────
// Main Function
// ─────────────────────────────────────────────────────────────

/**
 * Retrieves the information necessary to download or verify a Java version.
 * Returns an object with details for Termux or standard systems.
 *
 * @param javaVersion The Java version to look for (e.g., 8, 11, 17).
 * @returns A `JavaInfo` object with the details, or `null` if the platform/architecture is not supported.
 */
export const getJavaInfoByVersion = (
  javaVersion: string | number,
): JavaInfo | null => {
  const versionStr = String(javaVersion ?? "");

  // --- Special Case: Termux ---
  if (env.isTermux()) {
    const packageName = `${TERMUX_CONSTANTS.PACKAGE_PREFIX}${versionStr}`;
    return {
      isTermux: true,
      version: versionStr,
      packageName,
      installCmd: `${TERMUX_CONSTANTS.INSTALL_CMD_PREFIX}${packageName}`,
      javaPath: TERMUX_CONSTANTS.JAVA_PATH,
      installed: isPackageInstalled(packageName, "pkg"),
    };
  }

  // --- Standard Case: Windows, Linux, macOS ---
  let platform;
  try {
    // Use the helper from env.ts to get the platform
    platform = env.platform;
  } catch (error) {
    console.error(error);
    return null; // Unsupported platform
  }

  const arch = ADOPTIUM_ARCH_MAP[process.arch];

  if (!arch) {
    console.error(`Unsupported architecture for Adoptium API: ${process.arch}`);
    return null;
  }

  // Construct download information
  const resultURL = `${ADOPTIUM_API_BASE_URL}/binary/latest/${versionStr}/ga/${platform.name}/${arch}/jdk/hotspot/normal/eclipse?project=jdk`;
  const filename = `Java-${versionStr}-${arch}${platform.ext}`;

  const relativeDownloadPath = path.join(defaultPaths.backupPath, filename);
  const relativeUnpackPath = path.join(defaultPaths.unpackPath, `jdk-${versionStr}`); // More generic folder name

  const absoluteDownloadPath = path.resolve(relativeDownloadPath);
  const absoluteUnpackPath = path.resolve(relativeUnpackPath);

  // Logic to find the 'bin' folder inside the unpacked JDK
  // (often it comes inside another folder like 'jdk-17.0.2+8')
  let javaBinPath = path.join(absoluteUnpackPath, FOLDER_NAMES.BIN);
  if (!existsSync(javaBinPath) && existsSync(absoluteUnpackPath)) {
    try {
      const files = readdirSync(absoluteUnpackPath);
      // On macOS, the structure is different; bin is at Contents/Home/bin
      const macOsHomePath = path.join(
        absoluteUnpackPath,
        files[0]!,
        FOLDER_NAMES.CONTENTS,
        FOLDER_NAMES.HOME,
      );
      if (env.isMacOS() && existsSync(macOsHomePath)) {
        javaBinPath = path.join(macOsHomePath, FOLDER_NAMES.BIN);
      } else {
        // For Linux/Windows, look for a folder starting with 'jdk-'
        const jdkFolder = files.find((file) => file.startsWith(FOLDER_NAMES.JDK_PREFIX));
        if (jdkFolder) {
          javaBinPath = path.join(absoluteUnpackPath, jdkFolder, FOLDER_NAMES.BIN);
        }
      }
    } catch (e) {
      // Ignore if the directory cannot be read; javaBinPath will keep its default value
      console.warn(
        `Could not dynamically find '${FOLDER_NAMES.BIN}' path in ${absoluteUnpackPath}.`,
      );
    }
  }

  return {
    isTermux: false,
    url: resultURL,
    filename,
    version: versionStr,
    downloadPath: relativeDownloadPath,
    unpackPath: relativeUnpackPath,
    absoluteDownloadPath,
    absoluteUnpackPath,
    javaBinPath,
  };
};
