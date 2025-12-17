import * as path from "path";
import { existsSync, readdirSync } from "fs";
import { env } from "./env.js"; // Importamos el objeto env que contiene todo
import { isPackageInstalled } from "../utils/commands.js";
import { defaultPaths } from "../config.js";
import {
  ADOPTIUM_ARCH_MAP,
  ADOPTIUM_API_BASE_URL,
  TERMUX_CONSTANTS,
  FOLDER_NAMES,
} from "../constants.js";

// ─────────────────────────────────────────────────────────────
// Interfaces de Salida
// ─────────────────────────────────────────────────────────────

/**
 * Información de Java específica para un entorno Termux.
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
 * Información de Java para descarga y gestión en sistemas estándar (Windows, macOS, Linux).
 */
export interface JavaInfoStandard {
  isTermux: false;
  url: string;
  filename: string;
  version: string;
  downloadPath: string; // Ruta relativa para el archivo descargado
  unpackPath: string; // Ruta relativa para la carpeta descomprimida
  absoluteDownloadPath: string;
  absoluteUnpackPath: string;
  javaBinPath: string; // Ruta absoluta a la carpeta 'bin' de Java
}

// El tipo de retorno combinado
export type JavaInfo = JavaInfoTermux | JavaInfoStandard;

// ─────────────────────────────────────────────────────────────
// Función Principal
// ─────────────────────────────────────────────────────────────

/**
 * Obtiene la información necesaria para descargar o verificar una versión de Java.
 * Devuelve un objeto con detalles para Termux o para sistemas estándar.
 *
 * @param javaVersion La versión de Java a buscar (ej. 8, 11, 17).
 * @returns Un objeto `JavaInfo` con los detalles, o `null` si la plataforma/arquitectura no es compatible.
 */
export const getJavaInfoByVersion = (
  javaVersion: string | number,
) => {
  const versionStr = String(javaVersion ?? "");

  // --- Caso Especial: Termux ---
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

  // --- Caso Estándar: Windows, Linux, macOS ---
  let platform;
  try {
    // Usamos el helper de env.ts para obtener la plataforma
    platform = env.platform;
  } catch (error) {
    console.error(error);
    return null; // Plataforma no soportada
  }

  const arch = ADOPTIUM_ARCH_MAP[process.arch];

  if (!arch) {
    console.error(`Unsupported architecture for Adoptium API: ${process.arch}`);
    return null;
  }

  // Construir la información para la descarga
  const resultURL = `${ADOPTIUM_API_BASE_URL}/binary/latest/${versionStr}/ga/${platform.name}/${arch}/jdk/hotspot/normal/eclipse?project=jdk`;
  const filename = `Java-${versionStr}-${arch}${platform.ext}`;

  const relativeDownloadPath = path.join(defaultPaths.backupPath, filename);
  const relativeUnpackPath = path.join(defaultPaths.unpackPath, `jdk-${versionStr}`); // Nombre de carpeta más genérico

  const absoluteDownloadPath = path.resolve(relativeDownloadPath);
  const absoluteUnpackPath = path.resolve(relativeUnpackPath);

  // Lógica para encontrar la carpeta 'bin' dentro del JDK descomprimido
  // (a menudo viene dentro de otra carpeta como 'jdk-17.0.2+8')
  let javaBinPath = path.join(absoluteUnpackPath, FOLDER_NAMES.BIN);
  if (!existsSync(javaBinPath) && existsSync(absoluteUnpackPath)) {
    try {
      const files = readdirSync(absoluteUnpackPath);
      // En macOS, la estructura es diferente, el bin está en Contents/Home/bin
      const macOsHomePath = path.join(
        absoluteUnpackPath,
        files[0]!,
        FOLDER_NAMES.CONTENTS,
        FOLDER_NAMES.HOME,
      );
      if (env.isMacOS() && existsSync(macOsHomePath)) {
        javaBinPath = path.join(macOsHomePath, FOLDER_NAMES.BIN);
      } else {
        // Para Linux/Windows, buscar una carpeta que empiece con 'jdk-'
        const jdkFolder = files.find((file) => file.startsWith(FOLDER_NAMES.JDK_PREFIX));
        if (jdkFolder) {
          javaBinPath = path.join(absoluteUnpackPath, jdkFolder, FOLDER_NAMES.BIN);
        }
      }
    } catch (e) {
      // Ignorar si no se puede leer el directorio, javaBinPath mantendrá su valor por defecto
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
