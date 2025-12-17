# Validation Utilities

Standardized response types for consistent API handling.

## Overview

The Validation Utilities provide a type-safe way to handle success and error responses across the Java-Path library. All major operations return `ServiceResponse` objects that can be easily checked and handled consistently.

## `ServiceResponse<T>` Type

A discriminated union type that represents either a successful operation with data or a failed operation with an error message.

```typescript
type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; data?: T };
```

### Properties

**Success Response:**
- `success: true` - Indicates the operation succeeded
- `data: T` - The result data from the operation
- `error` - Not present in success responses

**Error Response:**
- `success: false` - Indicates the operation failed
- `error: string` - Error message describing what went wrong
- `data?: T` - Optional additional error data (when provided)

## Helper Functions

### `createSuccessResponse(data)`

Creates a success response object.

```typescript
import { createSuccessResponse } from "java-path";

const response = createSuccessResponse({ javaPath: "/usr/bin/java" });
// Returns: { success: true, data: { javaPath: "/usr/bin/java" } }
```

**Parameters:**
- `data` (T): The success data to return

**Returns:** `ServiceResponse<T>`

### `createErrorResponse(msg, data?)`

Creates an error response object.

```typescript
import { createErrorResponse } from "java-path";

const response = createErrorResponse("Java not found", { searchedPaths: ["/usr/bin", "/usr/local/bin"] });
// Returns: { success: false, error: "Java not found", data: { searchedPaths: [...] } }
```

**Parameters:**
- `msg` (string): Error message describing what went wrong
- `data` (any, optional): Additional error data

**Returns:** `ServiceResponse<never>`

### `isSuccess(response)`

Type guard to check if a response is successful.

```typescript
import { isSuccess } from "java-path";

const result = await someService();

if (isSuccess(result)) {
  console.log(result.data); // Type-safe access to data
} else {
  console.error(result.error);
}
```

**Parameters:**
- `response` (ServiceResponse<any>): Response to check

**Returns:** `response is { success: true; data: T }`

## Examples

### Basic Usage

```typescript
import { createSuccessResponse, createErrorResponse, isSuccess } from "java-path";

// Creating responses
const success = createSuccessResponse({ version: 17, path: "/usr/bin/java" });
const error = createErrorResponse("Java not found", { searchedPaths: ["/usr/bin", "/usr/local/bin"] });

// Type checking
if (isSuccess(success)) {
  console.log("Java version:", success.data.version);
  console.log("Java path:", success.data.path);
} else {
  console.error("Error:", success.error);
}

if (isSuccess(error)) {
  console.log("Success:", error.data);
} else {
  console.error("Error message:", error.error);
  if (error.data) {
    console.error("Additional info:", error.data);
  }
}
```

### Integration with Service Calls

```typescript
import { CommandUtils, isSuccess } from "java-path";

async function checkJavaAvailability() {
  const result = await CommandUtils.isCommandAvailable("java");
  
  if (isSuccess(result)) {
    if (result.data) {
      console.log("Java is available");
      return true;
    } else {
      console.log("Java is not available");
      return false;
    }
  } else {
    console.error("Failed to check Java availability:", result.error);
    return false;
  }
}

// Using with Java path detection
async function findJavaWithFallback() {
  // Try primary detection
  const primaryResult = await CommandUtils.detectJavaPaths();
  
  if (isSuccess(primaryResult) && primaryResult.data.length > 0) {
    return primaryResult.data[0];
  }
  
  // Fallback to common locations
  const fallbackPaths = ["/usr/bin/java", "/usr/local/bin/java"];
  
  for (const path of fallbackPaths) {
    const validationResult = await CommandUtils.validateJavaPath(path);
    
    if (isSuccess(validationResult) && validationResult.data) {
      return path;
    }
  }
  
  // All attempts failed
  throw new Error("No Java installation found");
}
```

### Error Handling Patterns

```typescript
import { createErrorResponse, isSuccess } from "java-path";

// Custom service function
async function findJavaVersion(minVersion: number) {
  try {
    const javaPaths = await CommandUtils.detectJavaPaths();
    
    if (!isSuccess(javaPaths)) {
      return createErrorResponse("Failed to detect Java paths", javaPaths.error);
    }
    
    if (javaPaths.data.length === 0) {
      return createErrorResponse("No Java installations found");
    }
    
    // Check each path
    for (const javaPath of javaPaths.data) {
      const versionResult = await CommandUtils.runCommand(javaPath, ["-version"]);
      
      if (isSuccess(versionResult)) {
        const version = parseJavaVersion(versionResult.data.stdout);
        
        if (version >= minVersion) {
          return createSuccessResponse({
            path: javaPath,
            version: version
          });
        }
      }
    }
    
    return createErrorResponse(`No Java version >= ${minVersion} found`);
    
  } catch (error) {
    return createErrorResponse(
      "Unexpected error during Java detection",
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Usage
const javaResult = await findJavaVersion(17);

if (isSuccess(javaResult)) {
  console.log(`Found Java ${javaResult.data.version} at: ${javaResult.data.path}`);
} else {
  console.error("Java detection failed:", javaResult.error);
}
```

### Chaining Operations

```typescript
import { CommandUtils, isSuccess, createErrorResponse } from "java-path";

async function comprehensiveJavaCheck() {
  // Step 1: Check if Java command is available
  const availableResult = await CommandUtils.isCommandAvailable("java");
  
  if (!isSuccess(availableResult)) {
    return createErrorResponse("Failed to check Java availability", availableResult.error);
  }
  
  if (!availableResult.data) {
    return createErrorResponse("Java command is not available");
  }
  
  // Step 2: Detect Java paths
  const pathsResult = await CommandUtils.detectJavaPaths();
  
  if (!isSuccess(pathsResult)) {
    return createErrorResponse("Failed to detect Java paths", pathsResult.error);
  }
  
  if (pathsResult.data.length === 0) {
    return createErrorResponse("No Java installations detected");
  }
  
  // Step 3: Validate first path
  const firstPath = pathsResult.data[0];
  const validationResult = await CommandUtils.validateJavaPath(firstPath);
  
  if (!isSuccess(validationResult)) {
    return createErrorResponse("Failed to validate Java path", validationResult.error);
  }
  
  if (!validationResult.data) {
    return createErrorResponse("Java path is not valid", firstPath);
  }
  
  // Step 4: Get version information
  const versionResult = await CommandUtils.runCommand(firstPath, ["-version"]);
  
  if (!isSuccess(versionResult)) {
    return createErrorResponse("Failed to get Java version", versionResult.error);
  }
  
  // Success!
  return createSuccessResponse({
    path: firstPath,
    versionOutput: versionResult.data.stdout,
    exitCode: versionResult.data.exitCode
  });
}
```

### Type-Safe Response Handling

```typescript
import { ServiceResponse, isSuccess, createSuccessResponse } from "java-path";

interface JavaInstallation {
  path: string;
  version: number;
  type: "jdk" | "jre";
}

interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

// Type-safe service function
async function validateJavaInstallation(path: string): Promise<ServiceResponse<JavaInstallation>> {
  try {
    // Simulate validation logic
    if (!path || path.length === 0) {
      const error: ValidationError = {
        code: "INVALID_PATH",
        message: "Java path cannot be empty",
        path
      };
      return createErrorResponse("Invalid Java path", error);
    }
    
    // Simulate successful validation
    const installation: JavaInstallation = {
      path,
      version: 17,
      type: "jdk"
    };
    
    return createSuccessResponse(installation);
    
  } catch (error) {
    const validationError: ValidationError = {
      code: "VALIDATION_FAILED",
      message: error instanceof Error ? error.message : "Unknown validation error",
      path
    };
    
    return createErrorResponse("Java validation failed", validationError);
  }
}

// Type-safe usage
const validationResult = await validateJavaInstallation("/usr/bin/java");

if (isSuccess(validationResult)) {
  // TypeScript knows validationResult.data is JavaInstallation
  const installation: JavaInstallation = validationResult.data;
  console.log(`Valid Java ${installation.type} installation found:`);
  console.log(`Path: ${installation.path}`);
  console.log(`Version: ${installation.version}`);
} else {
  // TypeScript knows validationResult.error exists and validationResult.data might exist
  console.error("Validation failed:", validationResult.error);
  
  if (validationResult.data) {
    const error: ValidationError = validationResult.data;
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    if (error.path) {
      console.error("Path:", error.path);
    }
  }
}
```

### Response Transformation

```typescript
import { ServiceResponse, isSuccess, createSuccessResponse, createErrorResponse } from "java-path";

// Transform a response
function transformResponse<T, U>(
  response: ServiceResponse<T>,
  transform: (data: T) => U
): ServiceResponse<U> {
  if (isSuccess(response)) {
    try {
      const transformedData = transform(response.data);
      return createSuccessResponse(transformedData);
    } catch (error) {
      return createErrorResponse(
        "Transform failed",
        error instanceof Error ? error.message : String(error)
      );
    }
  } else {
    // Pass through error, but with transformed type
    return createErrorResponse(response.error, response.data);
  }
}

// Usage example
const javaPathsResult = await CommandUtils.detectJavaPaths();

const pathCountResult = transformResponse(javaPathsResult, (paths) => ({
  count: paths.length,
  firstPath: paths[0] || null,
  allPaths: paths
}));

if (isSuccess(pathCountResult)) {
  console.log(`Found ${pathCountResult.data.count} Java paths`);
  if (pathCountResult.data.firstPath) {
    console.log(`First path: ${pathCountResult.data.firstPath}`);
  }
} else {
  console.error("Failed to get path count:", pathCountResult.error);
}
```

## Advanced Usage

### Response Composition

```typescript
import { ServiceResponse, isSuccess, createSuccessResponse } from "java-path";

interface SystemInfo {
  java: {
    available: boolean;
    paths: string[];
  };
  packageManager: string | null;
  tools: Record<string, boolean>;
}

async function getSystemInfo(): Promise<ServiceResponse<SystemInfo>> {
  try {
    // Parallel execution of multiple checks
    const [javaAvailable, javaPaths, packageManager] = await Promise.all([
      CommandUtils.isCommandAvailable("java"),
      CommandUtils.detectJavaPaths(),
      CommandUtils.getPackageManager()
    ]);
    
    // Check individual results
    if (!isSuccess(javaAvailable) || !isSuccess(javaPaths) || !isSuccess(packageManager)) {
      return createErrorResponse("Failed to gather system information");
    }
    
    // Additional tool checks
    const tools = ["git", "node", "python"];
    const toolResults = await Promise.all(
      tools.map(async tool => {
        const result = await CommandUtils.isCommandAvailable(tool);
        return { tool, available: isSuccess(result) && result.data };
      })
    );
    
    const toolMap: Record<string, boolean> = {};
    toolResults.forEach(({ tool, available }) => {
      toolMap[tool] = available;
    });
    
    // Compose final response
    const systemInfo: SystemInfo = {
      java: {
        available: javaAvailable.data,
        paths: javaPaths.data
      },
      packageManager: packageManager.data,
      tools: toolMap
    };
    
    return createSuccessResponse(systemInfo);
    
  } catch (error) {
    return createErrorResponse(
      "System information gathering failed",
      error instanceof Error ? error.message : String(error)
    );
  }
}
```

### Retry Logic with Response Types

```typescript
import { ServiceResponse, isSuccess, createErrorResponse } from "java-path";

async function retryOperation<T>(
  operation: () => Promise<ServiceResponse<T>>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<ServiceResponse<T>> {
  let lastError: ServiceResponse<T> | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // If successful, return immediately
      if (isSuccess(result)) {
        return result;
      }
      
      // Store error for potential return
      lastError = result;
      
      // Don't retry on certain errors
      if (result.error.includes("permission denied") || 
          result.error.includes("invalid input")) {
        return result;
      }
      
      // Wait before retry (with exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
    } catch (error) {
      // Handle unexpected exceptions
      lastError = createErrorResponse(
        "Operation threw exception",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  
  // All retries exhausted
  return lastError || createErrorResponse("All retry attempts failed");
}

// Usage
const javaPaths = await retryOperation(
  () => CommandUtils.detectJavaPaths(),
  3,
  1000
);

if (isSuccess(javaPaths)) {
  console.log("Successfully detected Java paths after retries");
} else {
  console.error("Failed to detect Java paths after all retries:", javaPaths.error);
}
```

## Best Practices

### Always Check Success Status

```typescript
// ❌ Bad - Direct access without checking
const result = await CommandUtils.detectJavaPaths();
console.log(result.data[0]); // Runtime error if result is an error response

// ✅ Good - Check success first
const result = await CommandUtils.detectJavaPaths();
if (isSuccess(result)) {
  console.log(result.data[0]); // Safe - TypeScript knows data exists
} else {
  console.error("Failed:", result.error);
}
```

### Provide Meaningful Error Messages

```typescript
// ❌ Bad - Generic error
return createErrorResponse("Operation failed");

// ✅ Good - Specific error with context
return createErrorResponse(
  `Java detection failed for directory: ${directory}`,
  { directory, attemptedPaths: searchedPaths }
);
```

### Use Type Safety

```typescript
// ❌ Bad - Any type
const result: ServiceResponse<any> = await operation();

// ✅ Good - Specific type
interface JavaDetectionResult {
  paths: string[];
  count: number;
  primaryPath: string;
}

const result: ServiceResponse<JavaDetectionResult> = await operation();
```

### Handle Both Success and Error Cases

```typescript
// ❌ Bad - Only handles success
const result = await CommandUtils.detectJavaPaths();
if (isSuccess(result)) {
  return result.data;
}
// Error case not handled - function returns undefined

// ✅ Good - Handles both cases
const result = await CommandUtils.detectJavaPaths();
if (isSuccess(result)) {
  return result.data;
} else {
  console.error("Java detection failed:", result.error);
  return []; // Return appropriate default
}
```

## Performance Considerations

- Response objects are lightweight and have minimal overhead
- Type guards like `isSuccess()` are optimized for performance
- Consider caching responses for expensive operations
- Use synchronous methods when available for better performance
- Batch operations to reduce response creation overhead
