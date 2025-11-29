import path from "node:path";
import {
  getFolderDetails,
  getDirectoriesOnly,
  type FileDetails,
} from "../utils/folder.js";
import { env } from "../platforms/env.js";
import { FileUtils } from "../utils/file.js";
import {
  createSuccessResponse,
  createErrorResponse,
  isSuccess,
} from "../utils/validator.js";
// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
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
 * Extrae la versión de Java del nombre de carpeta
 */
function extractJavaVersion(folderName: string): number | null {
  // Patrones comunes:
  // "jdk-8u452+09", "jdk-21.0.3+9", "8_x86_64_windows", "java-11-openjdk"
  const patterns = [
    /jdk-?(\d+)(?:u\d+)?(?:\.[\d.]+)?(?:\+\d+)?/i, // jdk-8u452, jdk-21.0.3+9
    /^(\d+)_/, // 8_x86_64_windows
    /java-(\d+)-/i, // java-11-openjdk
    /openjdk-?(\d+)/i, // openjdk-17, openjdk17
    /^(\d+)$/, // solo números: 8, 11, 17
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
 * Detecta arquitectura y OS del nombre de carpeta
 */
function extractArchAndOS(folderName: string): { arch: string; os: string } {
  const lowerName = folderName.toLowerCase();

  // Detectar arquitectura
  let arch = env.arch; // default actual
  if (lowerName.includes("x64") || lowerName.includes("x86_64")) {
    arch = "x86_64";
  } else if (lowerName.includes("x32") || lowerName.includes("x86")) {
    arch = "x86";
  } else if (lowerName.includes("aarch64") || lowerName.includes("arm64")) {
    arch = "aarch64";
  } else if (lowerName.includes("arm")) {
    arch = "arm";
  }

  // Detectar OS
  let os = env.platform.name; // default actual
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
 * Construye la ruta al ejecutable de Java según la plataforma
 */
function getJavaExecutablePath(binPath: string): string {
  const executable = env.isWindows() ? "java.exe" : "java";
  return path.join(binPath, executable);
}

// ─────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────

/**
 * Escanea una carpeta específica y retorna todas las versiones de Java encontradas
 */
export async function scanJavaInstallations(
  basePath: string,
): Promise<InstalledJavaVersion[]> {
  try {
    // Obtener solo directorios del primer nivel
    const directories = await getDirectoriesOnly(basePath, "", {
      recursive: false,
      includeHidden: false,
      sortBy: "name",
      sortOrder: "asc",
    });

    const javaVersions: InstalledJavaVersion[] = [];

    for (const dir of directories) {
      const featureVersion = extractJavaVersion(dir.name);

      // Si no se puede extraer versión, skip
      if (featureVersion === null) continue;
      const { arch, os } = extractArchAndOS(dir.name);
      // Verificar si existe el ejecutable de Java
      const ValidVersion = await verifyJavaVersionPath(dir, featureVersion);

      javaVersions.push({
        featureVersion,
        folderName: dir.name,
        installPath: dir.absolutePath,
        arch,
        os,
        ...ValidVersion,
      });
    }

    // Ordenar por versión (más nueva primero)
    return javaVersions.sort((a, b) => b.featureVersion - a.featureVersion);
  } catch (error) {
    console.error(`Error scanning Java installations in ${basePath}:`, error);
    return [];
  }
}

/**
 * Busca una versión específica de Java en la carpeta y verifica compatibilidad
 */
export async function findJavaVersion(
  basePath: string,
  targetVersion: number,
  options: {
    requireSameArch?: boolean; // Solo versiones compatibles con arch actual
    requireSameOS?: boolean; // Solo versiones compatibles con OS actual
    requireValid?: boolean; // Solo versiones con ejecutable válido
  } = {},
): Promise<InstalledJavaVersion | null> {
  const {
    requireSameArch = true,
    requireSameOS = true,
    requireValid = true,
  } = options;

  try {
    const allVersions = await scanJavaInstallations(basePath);

    // Filtrar por versión específica
    const candidates = allVersions.filter((java) => {
      if (java.featureVersion !== targetVersion) return false;
      if (requireValid && !java.isValid) return false;
      if (requireSameArch && java.arch !== env.arch) return false;
      if (requireSameOS && java.os !== env.platform.name) return false;

      return true;
    });

    // Retornar el primer candidato válido (ya están ordenados)
    return candidates[0] || null;
  } catch (error) {
    console.error(
      `Error finding Java version ${targetVersion} in ${basePath}:`,
      error,
    );
    return null;
  }
}
// verificar en un array de objetos si existe un archivo con nombre startwith jdk${targetVersion} and join o si no existe retornal la path actual
async function verifyJavaVersionPath(
  dir: FileDetails,
  targetVersion: number,
): Promise<{
  javaExecutable: string;
  binPath: string;
  isValid: boolean;
}> {
  let binPath = path.join(dir.absolutePath, "bin");
  let javaPath = binPath;
  const validation = await FileUtils.pathExists(binPath);
  if (isSuccess(validation)) {
    const subdirectories = await getFolderDetails(dir.absolutePath, "", {
      recursive: false,
      includeHidden: false,
      includeDotFiles: true,
    });
    subdirectories.forEach((subdir) => {
      if (
        subdir.name.startsWith(`jdk`) &&
        subdir.name.includes(targetVersion.toString())
      ) {
        javaPath = path.join(subdir.absolutePath, "bin");
      }
    });
  }
  const ExecutablePath = getJavaExecutablePath(javaPath);
  const isValid = await FileUtils.pathExists(ExecutablePath);
  const result = {
    javaExecutable: ExecutablePath,
    binPath,
    isValid: isSuccess(isValid),
  };
  return result;
}
