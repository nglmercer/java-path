Java-Path/
├── src/
│   ├── platforms/
│   │   ├── env.ts         # Environment detection utilities
│   │   └── java.ts        # Java-specific platform utilities
│   ├── services/
│   │   └── installations.ts # Java installation scanning and management
│   └── utils/
│       ├── commands.ts    # Command execution utilities
│       ├── file.ts        # File operation utilities
│       ├── folder.ts      # Folder operation utilities
│       └── validator.ts   # Response validation utilities
├── tests/                 # Test files
│   ├── platforms/          # Tests for platform detection
│   ├── services/           # Tests for Java installation services
│   └── utils/              # Tests for utility functions
├── examples/              # Example usage scripts
├── demo/                 # Demo project
├── docs/                 # Documentation
├── binaries/              # Directory for Java binaries
├── index.ts               # Main entry point with re-exports
├── package.json           # Package configuration
└── README.md              # Project documentation
```

## Bun Test Setup

The project is configured to use Bun's built-in test runner. Tests are organized in the `tests/` directory with the following structure:

- `tests/platforms/` - Tests for platform detection utilities
- `tests/services/` - Tests for Java installation services
- `tests/utils/` - Tests for utility functions

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test files
bun test tests/platforms/env.test.ts
bun test tests/utils/file.test.ts
```

## Module Re-exports

All modules are re-exported from the main entry point (`index.ts`) for easy consumption:

```typescript
// Import everything
import * as JavaPath from "./index.js";

// Or import specific items
import { env, getJavaInfoByVersion, FileUtils } from "./index.js";
```

## Example Usage

The project includes examples in the `examples/` directory and a demo project in the `demo/` directory.

### Basic Usage

```typescript
import {
  env,
  getJavaInfoByVersion,
  scanJavaInstallations,
  FileUtils,
  CommandUtils
} from "./index.js";

// Environment Detection
console.log(`Platform: ${env.platform.name} (${env.platform.ext})`);
console.log(`Architecture: ${env.arch}`);

// Java Information
const javaInfo = getJavaInfoByVersion("17");
if (javaInfo) {
  console.log(`Java 17 info:`, javaInfo);
}

// Scan for Java Installations
const installations = await scanJavaInstallations("./binaries/java");
console.log("Found Java installations:", installations);
```

## NPM Scripts

The project includes the following scripts:

- `bun test` - Run all tests
- `bun test --watch` - Run tests in watch mode
- `bun test --coverage` - Run tests with coverage
- `bun run dev` - Run in development mode with hot reload
- `bun run build` - Build the project
- `bun run example` - Run the basic usage example

## Key Features

1. **Platform Detection**: Detect the current operating system and architecture
2. **Java Version Management**: Locate and manage multiple Java installations
3. **Termux Support**: Special handling for Java in Termux environments
4. **File Utilities**: Read, write, and manipulate files and directories
5. **Command Utilities**: Execute system commands and detect package managers
6. **Type Safety**: Full TypeScript support with proper type exports

## Bun-Specific Implementation

The project is optimized for Bun's runtime with:

- Native Bun APIs where appropriate for file operations
- Bun's test framework for testing
- ESM module format for optimal Bun compatibility
- TypeScript configuration targeting ESNext for modern features