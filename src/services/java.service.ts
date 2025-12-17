// src/services/java-info.service.ts
import path from "node:path";
import { env } from "../platforms/env.js";
import { CommandUtils } from "../utils/commands.js";
import { defaultPaths } from "../config.js";
import { taskManager } from "../services/taskInstance.js";
import { FileUtils, asyncHandler } from "../utils/file.js";
import { findJavaVersion, scanJavaInstallations, type InstalledJavaVersion } from "./installations.js";
import type {
  DownloadResult,
  TaskOperation,
} from "../services/taskInstance.js";
// ------------------------------------------------------------------
// 1.  Types returned to the caller
// ------------------------------------------------------------------
export interface JavaRelease {
  featureVersion: number; // e.g. 21
  releaseName: string; // e.g. "jdk-21.0.3+9"
  downloadUrl: string; // direct link to the archive
  checksumUrl: string; // sha256 string
  size: number; // size in bytes
  arch: string; // e.g. "x64", "aarch64"
  os: string; // e.g. "windows", "linux", "mac"
  [key: string]: string | number;
}

export interface JavaVersionsInfo {
  available: number[]; // e.g. [8, 11, 17, 21, 22]
  lts: number[]; // e.g. [8, 11, 17, 21]
  releases: JavaRelease[]; // concrete binaries for current platform/arch
  installedInfo: InstalledJavaVersion[]; // installed Java versions found locally
  installed: number[];
}

import {
  ADOPTIUM_API_BASE_URL,
  ADOPTIUM_ARCH_MAP,
  TERMUX_CONSTANTS,
  FOLDER_NAMES,
} from "../constants.js";

const _getJavaInfoByVersion = async (
  javaVersion: string | number,
) => {
  const versionStr = String(javaVersion ?? "");
  if (!versionStr) {
    throw new Error("La versión de Java no puede estar vacía.");
  }

  // --- Caso Especial: Termux ---
  if (env.isTermux()) {
    const packageName = `${TERMUX_CONSTANTS.PACKAGE_PREFIX}${versionStr}`;
    const packageCheckResult =
      await CommandUtils.isPackageInstalled(packageName);
    const isInstalled = packageCheckResult.success
      ? packageCheckResult.data
      : false;

    return {
      isTermux: true,
      version: versionStr,
      packageName,
      installCmd: `${TERMUX_CONSTANTS.INSTALL_CMD_PREFIX}${packageName}`,
      javaPath: TERMUX_CONSTANTS.JAVA_PATH,
      installed: isInstalled,
    };
  }

  // --- Caso Estándar: Windows, Linux, macOS ---
  const arch = ADOPTIUM_ARCH_MAP[process.arch];
  if (!arch) {
    throw new Error(
      `Arch Unsupported: ADOPTIUM_ARCH_MAP[${process.arch}] ${arch}`,
    );
  }

  const resultURL = `${ADOPTIUM_API_BASE_URL}/binary/latest/${versionStr}/ga/${env.platform.name}/${arch}/jdk/hotspot/normal/eclipse?project=jdk`;
  const filename = `Java-${versionStr}-${arch}${env.platform.ext}`;

  const relativeDownloadPath = path.join(defaultPaths.downloadPath, filename);
  const relativeUnpackPath = path.join(defaultPaths.unpackPath, `jdk-${versionStr}`);
  const absoluteDownloadPath = path.resolve(relativeDownloadPath);
  const absoluteUnpackPath = path.resolve(relativeUnpackPath);

  // --- Lógica mejorada para encontrar el 'bin' usando FileUtils ---
  let javaBinPath = path.join(absoluteUnpackPath, FOLDER_NAMES.BIN);

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
async function _getJavaInstallableVersions(): Promise<JavaVersionsInfo> {
  const os = env.platform.name;
  const arch = ADOPTIUM_ARCH_MAP[process.arch];

  if (!arch) {
    throw new Error(
        `Arch Unsupported: ADOPTIUM_ARCH_MAP[${process.arch}] ${arch}`,
    );
  }

  // 3.1 – which feature releases exist?
  const availRes = await fetch(
    `${ADOPTIUM_API_BASE_URL}/info/available_releases`,
  );
  if (!availRes.ok) throw new Error(`Adoptium API error: ${availRes.status}`);
  const { available_releases, most_recent_lts } = (await availRes.json()) as {
    available_releases: number[];
    most_recent_lts: number;
  };

  // 3.2 – for every available release, list latest GA binary
  const releases: JavaRelease[] = [];
  for (const feature of available_releases) {
    // Only consider GA releases (not ea)
    const url =
      `${ADOPTIUM_API_BASE_URL}/assets/latest/${feature}/hotspot?` +
      `os=${os}&architecture=${arch}&image_type=jdk&project=jdk`;
    const res = await fetch(url);
    if (!res.ok) continue; // version might not exist for this platform
    const payload = (await res.json()) as Array<{
      release_name: string;
      binary: {
        package: { name: string; link: string; checksum: string; size: number };
      };
    }>;

    if (!payload.length) continue;
    if (!payload[0]) {
      continue;
    }
    const { release_name, binary } = payload[0];
    //console.log("binary", binary);
    releases.push({
      featureVersion: feature,
      releaseName: release_name,
      downloadUrl: binary.package.link,
      checksumUrl: binary.package.checksum,
      size: binary.package.size,
      arch: arch,
      os: os,
    });
  }
  // Obtener versiones únicas para verificar instalaciones
  const uniqueVersions = [
    ...new Set([
      ...available_releases,
      ...releases.map((r) => r.featureVersion),
    ]),
  ];

  // Usar Promise.all para manejar correctamente las promesas asíncronas
  const installedVersionsPromises = uniqueVersions.map(async (v) => {
    const javaInfo = await findJavaVersion(defaultPaths.unpackPath, v);
    return javaInfo || false;
  });

  const installedVersionsResults = await Promise.all(installedVersionsPromises);
  const installedVersions = installedVersionsResults.filter((v) => v !== false);

  return {
    available: available_releases,
    lts: available_releases.filter((v) => v <= most_recent_lts),
    releases,
    installedInfo: installedVersions,
    installed: installedVersions.map((v) => v.featureVersion),
  };
}
async function filterReleases(
  releases: JavaRelease[],
  version: number,
): Promise<JavaRelease | false> {
  const findVersion = releases.find((r) => r.featureVersion === version);
  if (!findVersion) {
    return false;
  }

  return findVersion;
}
async function _downloadJavaRelease(
  release: JavaRelease,
  fileName?: string,
  onComplete?: (data: DownloadResult) => void,
): Promise<TaskOperation<DownloadResult>> {
  const response = await fetch(release.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Java release: ${response.statusText}`);
  }

  //const filePath = path.join(downloadPath, path.basename(release.downloadUrl));
  const { taskId, promise } = await taskManager.download(release.downloadUrl, {
    fileName,
    onComplete,
  });

  const wrappedPromise = promise.then(async (result) => {
    // Determine the file path
    const actualFileName = fileName || path.basename(release.downloadUrl);
    const filePath = path.join(defaultPaths.downloadPath, actualFileName);

    // Verify integrity
    // Note: checksumUrl in JavaRelease currently holds the actual checksum string based on the parsing logic
    const validation = await FileUtils.verifyFileIntegrity(
      filePath,
      release.size,
      release.checksumUrl,
    );

    if (!validation.success || !validation.data) {
      console.error(
        `Verification failed for ${actualFileName}. Deleting corrupt file.`,
      );
      // Clean up failed download
      await FileUtils.deletePath(defaultPaths.downloadPath, actualFileName);
      throw new Error(
        "File verification failed: The downloaded file is incomplete or corrupted.",
      );
    }

    return result;
  });

  return { taskId, promise: wrappedPromise };
}
async function _decompressJavaRelease(
  filePath: string,
  unpackPath?: string,
) {
  const { promise } = taskManager.unpack(filePath, {
    destination: unpackPath,
  });
  const result = await promise;
  return result;
}
async function _getInstallationsByPath(): Promise<InstalledJavaVersion[]> {
  const defaultJavaPath = path.join(defaultPaths.unpackPath);
  return await scanJavaInstallations(defaultJavaPath);
}
export const JavaInfoService = {
  getInstallableVersions: asyncHandler(
    _getJavaInstallableVersions,
  ),
  getJavaInfo: asyncHandler(_getJavaInfoByVersion),
  downloadJavaRelease: asyncHandler(_downloadJavaRelease),
  filter: asyncHandler(filterReleases),
  decompressJavaRelease: asyncHandler(_decompressJavaRelease),
  getInstallationsByPath: asyncHandler(_getInstallationsByPath)
};
export const getJavaInfo = asyncHandler(_getJavaInfoByVersion);
