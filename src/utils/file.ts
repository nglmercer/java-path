import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  createSuccessResponse,
  createErrorResponse,
  isSuccess,
} from "./validator.js";
// --- Constantes ---
export const ALLOWED_EXTENSIONS = [
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
  ".gz", // Aseguramos que todas tengan punto
];

// --- Tipos y Helpers Fundamentales ---

/**
 * Define la estructura de respuesta estándar para todas las operaciones.
 * Es una unión discriminada para un manejo de tipos seguro.
 */
export type ServiceResponse<T> =
  | { success: true; data: T; [key: string]: any }
  | { success: false; error: string; data: T };

/**
 * Wrapper para funciones asíncronas que estandariza el manejo de errores y la respuesta.
 * @param fn La función asíncrona a ejecutar.
 * @returns Una nueva función que devuelve un objeto ServiceResponse.
 */
export function asyncHandler<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
): (...args: A) => Promise<ServiceResponse<T>> {
  return async (...args: A): Promise<ServiceResponse<T>> => {
    try {
      const data = await fn(...args);
      return createSuccessResponse(data);
    } catch (error) {
      // Asegura que siempre se capture un mensaje de error legible.
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error en la operación '${fn.name}': ${errorMessage}`);
      return createErrorResponse(errorMessage);
    }
  };
}

// --- Lógica Interna (Implementación Real) ---

/** Valida si una extensión es permitida. */
async function _isExtensionAllowed(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    // If it's a directory, allow it
    if (stats.isDirectory()) return true;

    const ext = path.extname(filePath).toLowerCase();
    if (!ext) return false; // Files without extension are not allowed by default
    return ALLOWED_EXTENSIONS.includes(ext);
  } catch (error) {
    // If file doesn't exist, just check the extension
    const ext = path.extname(filePath).toLowerCase();
    if (!ext) return false;
    return ALLOWED_EXTENSIONS.includes(ext);
  }
}

const _createFile = async (
  basePath: string,
  folderName: string,
  fileName: string,
  content: string = "",
): Promise<string> => {
  const filePath = path.join(basePath, folderName, fileName);
  if (!_isExtensionAllowed(filePath)) {
    throw new Error(`Extensión no permitida para el archivo: '${fileName}'`);
  }
  const folderPath = path.dirname(filePath);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
};

const _readFile = async (
  basePath: string,
  folderName: string,
  fileName: string,
): Promise<string> => {
  const filePath = path.join(basePath, folderName, fileName);
  // No es necesario verificar si existe, fs.readFile lanzará un error que será capturado.
  return fs.readFile(filePath, "utf8");
};

const _writeFile = async (
  basePath: string,
  folderName: string,
  fileName: string,
  content: string,
): Promise<string> => {
  const filePath = path.join(basePath, folderName, fileName);
  if (!_isExtensionAllowed(filePath)) {
    throw new Error(`Extensión no permitida para el archivo: '${fileName}'`);
  }
  const folderPath = path.dirname(filePath);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
};

const _deletePath = async (
  basePath: string,
  relativePath: string,
): Promise<true> => {
  const fullPath = path.join(basePath, relativePath);
  // fs.rm lo manejará si no existe (lanzará error)
  await fs.rm(fullPath, { recursive: true, force: true });
  return true;
};

const _renameFile = async (
  basePath: string,
  folderName: string,
  oldName: string,
  newName: string,
): Promise<string> => {
  const oldPath = path.join(basePath, folderName, oldName);
  const newPath = path.join(basePath, folderName, newName);

  if (!_isExtensionAllowed(newPath)) {
    throw new Error(`La nueva extensión para '${newName}' no está permitida.`);
  }

  // Evitar sobreescribir por error
  try {
    await fs.access(newPath);
    // Si no lanza error, el archivo ya existe
    throw new Error(`El archivo de destino '${newName}' ya existe.`);
  } catch (error) {
    // Si el error es 'ENOENT', significa que el archivo NO existe, lo cual es bueno.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error; // Relanzar otros errores (como el de "archivo ya existe")
    }
  }

  await fs.rename(oldPath, newPath);
  return newPath;
};

const _pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

interface FileDetails {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory: boolean;
}

const _getFolderDetails = async (
  basePath: string,
  folderName: string,
): Promise<FileDetails[]> => {
  const folderPath = path.join(basePath, folderName);

  // Verificar que el directorio base existe
  try {
    await fs.access(basePath);
  } catch (error) {
    throw new Error(`El directorio base no existe: ${basePath}`);
  }

  // Verificar que el directorio objetivo existe
  try {
    const stats = await fs.stat(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(
        `La ruta especificada no es un directorio: ${folderPath}`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`El directorio no existe: ${folderPath}`);
    }
    throw error;
  }

  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  const details = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(folderPath, entry.name);
      try {
        const stats = await fs.stat(entryPath);
        return {
          name: entry.name,
          path: path.relative(basePath, entryPath),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          isDirectory: entry.isDirectory(),
        };
      } catch (error) {
        // Si hay error al obtener stats de un archivo específico, lo omitimos
        console.warn(`No se pudo obtener información de: ${entryPath}`);
        return null;
      }
    }),
  );

  // Filtrar entradas nulas
  return details.filter((detail): detail is FileDetails => detail !== null);
};

interface FileValidityReport {
  exists: boolean;
  isAllowedType: boolean;
  isWithinSize: boolean;
  details: string[];
}

const _checkFileValidity = async (
  filePath: string,
  options?: { allowedExtensions?: string[]; maxSizeInBytes?: number },
): Promise<FileValidityReport> => {
  const extensions = options?.allowedExtensions ?? ALLOWED_EXTENSIONS;
  const maxSize = options?.maxSizeInBytes ?? 1024 * 1024; // 1MB por defecto

  const report: FileValidityReport = {
    exists: false,
    isAllowedType: false,
    isWithinSize: false,
    details: [],
  };

  try {
    const stats = await fs.stat(filePath);
    report.exists = true;

    const ext = path.extname(filePath).toLowerCase();
    if (extensions.includes(ext)) {
      report.isAllowedType = true;
    } else {
      report.details.push(`Extensión '${ext}' no permitida.`);
    }

    if (stats.size <= maxSize) {
      report.isWithinSize = true;
    } else {
      report.details.push(
        `El archivo excede el tamaño máximo (${stats.size} > ${maxSize} bytes).`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      report.details.push("El archivo no existe.");
    } else {
      throw error; // Relanzar errores inesperados
    }
  }

  if (report.details.length > 0) {
    // Si hay errores, lanzamos una excepción para que el asyncHandler la capture
    // y la formatee como un error estándar.
    throw new Error(report.details.join(" "));
  }

  return report;
};

const _calculateChecksum = async (
  filePath: string,
  algorithm: string = "sha256",
): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = createHash(algorithm);
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
};

const _verifyFileIntegrity = async (
  filePath: string,
  expectedSize: number,
  expectedChecksum?: string,
  algorithm: string = "sha256",
): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size !== expectedSize) {
       console.warn(`File size mismatch: expected ${expectedSize}, got ${stats.size}`);
       return false;
    }
    if (expectedChecksum) {
        const checksum = await _calculateChecksum(filePath, algorithm);
        if (checksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
            console.warn(`Checksum mismatch: expected ${expectedChecksum}, got ${checksum}`);
            return false;
        }
    }
    return true;
  } catch (error) {
    console.error(`Error verifying file integrity: ${error}`);
    return false;
  }
};

// --- API Pública Exportada ---

/**
 * Conjunto de utilidades para la manipulación de archivos y directorios de forma segura y asíncrona.
 * Todas las operaciones devuelven un objeto { success: boolean, ... }
 */
export const FileUtils = {
  /** Crea un archivo con contenido opcional, creando directorios si es necesario. */
  createFile: asyncHandler(_createFile),

  /** Lee el contenido de un archivo de texto. */
  readFile: asyncHandler(_readFile),

  /** Escribe (o sobrescribe) contenido en un archivo. */
  writeFile: asyncHandler(_writeFile),

  /** Elimina un archivo o un directorio de forma recursiva. */
  deletePath: asyncHandler(_deletePath),

  /** Renombra un archivo. */
  renameFile: asyncHandler(_renameFile),

  /** Obtiene una lista detallada del contenido de una carpeta. */
  getFolderDetails: asyncHandler(_getFolderDetails),

  /** Verifica si una ruta existe en el sistema de archivos. */
  pathExists: asyncHandler(_pathExists),

  /** Realiza una validación completa de un archivo (existencia, tipo, tamaño). */
  checkFileValidity: asyncHandler(_checkFileValidity),

  /** Calcula el checksum de un archivo. */
  calculateChecksum: asyncHandler(_calculateChecksum),

  /** Verifica la integridad de un archivo mediante su tamaño y checksum opcional. */
  verifyFileIntegrity: asyncHandler(_verifyFileIntegrity),
};
/*
// --- Ejemplo de Uso ---
async function main() {
    const awaitUtils = (time: number) => new Promise(resolve => setTimeout(resolve, time));
  const basePath = "./temp-test";

  console.log("--- Caso de Éxito: Crear y leer archivo ---");
  const createResult = await FileUtils.createFile(
    basePath,
    "logs",
    "app.log",
    "Inicio del log."
  );

  if (isSuccess(createResult)) {
    console.log("Archivo creado en:", createResult.data);

    const readResult = await FileUtils.readFile(basePath, "logs", "app.log");
    if (isSuccess(readResult)) {
      console.log("Contenido leído:", readResult.data);
    }
  } else {
    console.error("Error al crear:", createResult.error);
  }

  console.log("\n--- Caso de Error: Leer archivo inexistente ---");
  const readFailResult = await FileUtils.readFile(
    basePath,
    "logs",
    "non-existent.log"
  );

  if (!isSuccess(readFailResult)) {
    console.error("Error esperado:", readFailResult.error);
  }
  await awaitUtils(10000);
  // Limpieza
  await FileUtils.deletePath(basePath, "");
  console.log("\nDirectorio de prueba eliminado.");
}

// Descomenta la siguiente línea para ejecutar el ejemplo
main();
*/
