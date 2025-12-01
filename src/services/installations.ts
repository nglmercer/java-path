import path from "node:path";
import fs from "node:fs/promises";
import { env } from "../platforms/env.js";
import { FileUtils } from "../utils/file.js";
import { isSuccess } from "../utils/validator.js";

export interface InstalledJavaVersion {
  featureVersion: number; // e.g. 8, 11, 17, 21
  folderName: string; // e.g. "jdk-21.0.3+9" or "8_x86_64_windows"
  installPath: string; // Full path to installation
  binPath: string; // Path to bin directory
  javaExecutable: string; // Path to java executable
  arch: string; // e.g. "x86_64", "aarch64"
  os: string; // e.g. "windows", "linux", "macos"
  isValid: boolean; // true if java executable exists
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Extracts Java version from a folder name.
 */
function extractJavaVersion(folderName: string): number | null {
  const patterns = [
    /jdk-?(\d+)(?:u\d+)?(?:\.[\d.]+)?(?:\+\d+)?/i, // jdk-8u452, jdk-21.0.3+9
    /^(\d+)_/, // 8_x86_64_windows
    /java-(\d+)-/i, // java-11-openjdk
    /openjdk-?(\d+)/i, // openjdk-17, openjdk17
    /^(\d+)$/, // just a number: 8, 11, 17
  ];

  for (const pattern of patterns) {
    const match = folderName.match(pattern);
    if (match) {
      return parseInt(match[1]!, 10);
    }
  }
  return null;
}

/**
 * Extracts architecture and OS from a folder name.
 */
function extractArchAndOS(folderName: string): { arch: string; os: string } {
  const lowerName = folderName.toLowerCase();

  // Detect architecture
  let arch = env.arch; // default current
  if (lowerName.includes("x64") || lowerName.includes("x86_64")) {
    arch = "x86_64";
  } else if (lowerName.includes("x32") || lowerName.includes("x86")) {
    arch = "x86";
  } else if (lowerName.includes("aarch64") || lowerName.includes("arm64")) {
    arch = "aarch64";
  } else if (lowerName.includes("arm")) {
    arch = "arm";
  }

  // Detect OS
  let os = env.platform.name; // default current
  if (lowerName.includes("windows") || lowerName.includes("win")) {
    os = "windows";
  } else if (lowerName.includes("linux")) {
    os = "linux";
  } else if (lowerName.includes("mac") || lowerName.includes("darwin")) {
    os = "macos";
  } else if (lowerName.includes("android")) {
    os = "android";
  }

  return { arch, os };
}

/**
 * Builds the path to the Java executable based on the platform.
 */
function getJavaExecutablePath(binPath: string): string {
  const executable = env.isWindows() ? "java.exe" : "java";
  return path.join(binPath, executable);
}

// ─────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────

/**
 * Scans a folder recursively for Java installations.
 * It looks for java executables and deduces the installation root.
 * Also detects directories that look like Java installations even without executables,
 * marking them as invalid.
 */
export async function scanJavaInstallations(
  basePath: string,
): Promise<InstalledJavaVersion[]> {
  try {
    // Ensure base path exists
    const exists = await FileUtils.pathExists(basePath);
    if (!isSuccess(exists) || !exists.data) {
      console.warn(`Base path does not exist: ${basePath}`);
      return [];
    }

    const javaExecutableName = env.isWindows() ? "java.exe" : "java";
    const homes = new Map<string, InstalledJavaVersion>();

    /**
     * Recursively find all java executables under a directory.
     */
    async function findExecutables(dir: string): Promise<string[]> {
      const results: string[] = [];
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            // Skip hidden directories
            if (entry.name.startsWith('.')) continue;
            results.push(...await findExecutables(fullPath));
          } else if (entry.isFile() && entry.name === javaExecutableName) {
            results.push(fullPath);
          }
          // Ignore symlinks etc.
        }
      } catch (err) {
        console.error(`Error reading directory ${dir}:`, err);
      }
      return results;
    }

    /**
     * Recursively find all directories under a directory.
     */
    async function findDirectories(dir: string): Promise<string[]> {
      const dirs: string[] = [];
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            // Skip hidden directories
            if (entry.name.startsWith('.')) continue;
            const fullPath = path.join(dir, entry.name);
            dirs.push(fullPath);
            dirs.push(...await findDirectories(fullPath));
          }
        }
      } catch (err) {
        console.error(`Error reading directory ${dir}:`, err);
      }
      return dirs;
    }

    // First pass: find all java executables and create valid installations
    const executables = await findExecutables(basePath);
    for (const execPath of executables) {
      // Derive bin and install paths
      const binPath = path.dirname(execPath);
      let installPath = path.dirname(binPath);
      let folderName = path.basename(installPath);
      let featureVersion = extractJavaVersion(folderName);

      // If version not found in immediate parent, try going up a few levels
      // (useful for macOS where bin is under Contents/Home)
      if (featureVersion === null) {
        let candidate = installPath;
        for (let i = 0; i < 3; i++) {
          candidate = path.dirname(candidate);
          const version = extractJavaVersion(path.basename(candidate));
          if (version !== null) {
            featureVersion = version;
            folderName = path.basename(candidate);
            installPath = candidate;
            break;
          }
        }
      }

      if (featureVersion === null) {
        // Could not determine version, skip this installation
        continue;
      }

      // Avoid duplicates (same installPath)
      if (homes.has(installPath)) continue;

      const { arch, os } = extractArchAndOS(folderName);

      homes.set(installPath, {
        featureVersion,
        folderName,
        installPath,
        binPath,
        javaExecutable: execPath,
        arch,
        os,
        isValid: true, // since we found the executable
      });
    }

    // Second pass: find directories that look like Java installations but have no executable
    const allDirs = await findDirectories(basePath);
    for (const dir of allDirs) {
      const folderName = path.basename(dir);
      const featureVersion = extractJavaVersion(folderName);
      if (featureVersion === null) {
        continue;
      }
      // Already have this installation (from executable pass)
      if (homes.has(dir)) continue;

      // Determine possible bin paths
      const standardBin = path.join(dir, "bin");
      const macBin = path.join(dir, "Contents", "Home", "bin");
      let binPath = standardBin;
      let javaExecutable = getJavaExecutablePath(standardBin);
      
      // Check if the directory structure resembles macOS layout
      let isMacLayout = false;
      try {
        const macBinStat = await fs.stat(macBin);
        if (macBinStat.isDirectory()) {
          binPath = macBin;
          javaExecutable = getJavaExecutablePath(macBin);
          isMacLayout = true;
        }
      } catch {}

      // Check if executable exists
      let isValid = false;
      try {
        await fs.access(javaExecutable);
        isValid = true;
      } catch {}

      // Only add if we haven't already added this installPath (should not happen)
      if (!homes.has(dir)) {
        const { arch, os } = extractArchAndOS(folderName);
        homes.set(dir, {
          featureVersion,
          folderName,
          installPath: dir,
          binPath,
          javaExecutable,
          arch,
          os,
          isValid,
        });
      }
    }

    // Sort by version descending
    return Array.from(homes.values())
      .sort((a, b) => b.featureVersion - a.featureVersion);
  } catch (error) {
    console.error(`Error scanning Java installations in ${basePath}:`, error);
    return [];
  }
}

/**
 * Finds a specific Java version.
 */
export async function findJavaVersion(
  basePath: string,
  targetVersion: number,
  options: {
    requireSameArch?: boolean;
    requireSameOS?: boolean;
    requireValid?: boolean;
  } = {},
): Promise<InstalledJavaVersion | null> {
  const {
    requireSameArch = true,
    requireSameOS = true,
    requireValid = true,
  } = options;

  try {
    const allVersions = await scanJavaInstallations(basePath);
    for (const java of allVersions) {
      if (java.featureVersion !== targetVersion) continue;
      if (requireValid && !java.isValid) continue;
      if (requireSameArch && java.arch !== env.arch) continue;
      if (requireSameOS && java.os !== env.platform.name) continue;
      return java;
    }
    return null;
  } catch (error) {
    console.error(`Error finding Java version ${targetVersion} in ${basePath}:`, error);
    return null;
  }
}
