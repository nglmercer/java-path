// ─────────────────────────────────────────────────────────────
// Re-export all platform detection utilities
// ─────────────────────────────────────────────────────────────
export * from "./src/platforms/env.js";
export * from "./src/platforms/java.js";

// ─────────────────────────────────────────────────────────────
// Re-export task management utilities
// ─────────────────────────────────────────────────────────────
export { taskManager } from "./src/services/taskInstance.js";
export { defaultPaths } from "./src/config.js";

// ─────────────────────────────────────────────────────────────
// Re-export all services
// ─────────────────────────────────────────────────────────────
export * from "./src/services/installations.js";
// Re-export Java types explicitly to avoid conflicts
export type {
  JavaRelease,
  JavaVersionsInfo,
} from "./src/services/java.service.js";
export type {
  JavaInfo,
  JavaInfoTermux,
  JavaInfoStandard,
} from "./src/platforms/java.js";

// Re-export all Java services
export { JavaInfoService, getJavaInfo } from "./src/services/java.service.js";
export * from "./src/services/installations.js";

// ─────────────────────────────────────────────────────────────
// Re-export all utilities
// ─────────────────────────────────────────────────────────────
export * from "./src/utils/commands.js";
export * from "./src/utils/file.js";
export * from "./src/utils/folder.js";
export * from "./src/utils/validator.js";

// ─────────────────────────────────────────────────────────────
// Re-export types for better TypeScript support
// ─────────────────────────────────────────────────────────────
export * from "./src/platforms/java.js";
