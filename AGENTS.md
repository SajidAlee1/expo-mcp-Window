# Agent Guidelines for expo-mcp-monorepo

## Build, Lint, and Test Commands

### Root Level
```bash
# Build all packages
bun run build

# Lint all packages
bun run lint

# Test all packages
bun run test
```

### Per Package
```bash
# Navigate to package directory
cd packages/mcp-tunnel  # or cd packages/expo-mcp

# Build
bun run build
# Equivalent: tsc --project tsconfig.build.json

# Lint
bun run lint
# Equivalent: eslint src

# Test
bun run test
# Equivalent: bun test

# Type check
bun run typecheck
# Equivalent: tsc --noEmit
```

### Running Single Tests
```bash
# Run all tests in a specific file
bun test packages/mcp-tunnel/src/__tests__/ReverseTunnelClientTransport.test.ts

# Run a single test by line number
bun test packages/mcp-tunnel/src/__tests__/ReverseTunnelClientTransport.test.ts:72

# Run specific test in a file
bun test packages/mcp-tunnel/src/__tests__/ReverseTunnelClientTransport.test.ts:72-95
```

## Code Style Guidelines

### General
- **Runtime**: Bun runtime (ECMAScript modules)
- **Language**: TypeScript 5.9.2+
- **Type checking**: Strict mode enabled (tsconfig.base.json:strict: true)
- **Format**: Prettier 3.6.2 (uses catalog defaults)

### Imports and Modules
- Use ES modules: `"type": "module"` in package.json
- Import with .js extensions in `import` statements for files within monorepo
- Use `import.meta.url` and `createRequire` for CommonJS compatibility
- Sort imports with `sort-imports` rule (ignoreDeclarationSort, check memberSort)

```typescript
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import WebSocket from 'ws';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
```

### Formatting
- Follow Prettier defaults (no explicit config found, uses catalog version)
- Run `bun run lint` to format automatically

### TypeScript
- Target: ESNext with bundler module resolution
- Use modern TypeScript syntax
- Prefer const assertions and nullish coalescing
- Use type aliases for complex types

```typescript
// Bad
interface Options {
  projectRoot: string;
  devServerUrl: string;
}

// Good
interface CdpClientOptions {
  metroUrl: string;
  targetSelector?: CdpTargetSelector;
  createWebSocket?: (url: string) => WebSocket;
}
```

### Naming Conventions
- **Classes**: PascalCase (e.g., `ReverseTunnelClientTransport`, `CdpClient`)
- **Functions**: camelCase (e.g., `getBootedDeviceIdAsync`, `streamProcessOutput`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `JSON_RPC_VERSION`, `MAX_MESSAGE_SIZE`)
- **Private properties/Methods**: underscore prefix (e.g., `private ws?: WebSocket;`)
- **Types/Interfaces**: PascalCase (e.g., `CdpTarget`, `StreamProcessOutputOptions`)

```typescript
export class ReverseTunnelClientTransport {
  private readonly logger: Logger;
  private ws?: WebSocket;
  private isConnected = false;
  
  async start(): Promise<void> {
    await this.connect();
  }
}
```

### Error Handling
- Prefer throwing errors rather than silent failures
- Use typed error messages
- Log errors with appropriate debug levels
- Catch and rethrow with context where appropriate

```typescript
// Good
try {
  await this.connect();
} catch (error) {
  this.logger.error('[MCP] Failed to connect:', error);
  throw error; // or throw new Error(`Context: ${message}`)
}

// Bad
try {
  await this.connect();
} catch (error) {
  // Silent catch
}
```

### Async/Await
- Always use async/await for Promise operations
- Use descriptive error messages for async operations
- Handle timeouts appropriately

```typescript
// Good
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`Failed to fetch: ${response.statusText}`);
}

const data = await response.json();

// Bad
const response = fetch(url);
```

### Testing
- Use `bun:test` framework
- Use `describe`, `it`, `expect` from `bun:test`
- Mock dependencies with `mock.module` and `spyOn`
- Use `@ts-expect-error` for testing private properties with proper justification
- Mock `ws` module for WebSocket tests

```typescript
import { describe, expect, it, mock, spyOn } from 'bun:test';

describe(ReverseTunnelClientTransport, () => {
  it('should send handshake correctly', async () => {
    const mockLogger = {
      debug: mock(),
      error: mock(),
    };
    
    const transport = new ReverseTunnelClientTransport(url, { logger: mockLogger });
    
    mock.module('ws', () => ({ default: MockWebSocket }));
    spyOn(transport, 'send').mockResolvedValue(undefined);
    
    await transport.start();
    
    expect(mockLogger.debug).toHaveBeenCalledWith('[MCP] Connected');
  });
});
```

### Logging
- Use `debug` package with scoped names (e.g., `debug('expo-mcp:develop:CdpClient')`)
- Log at appropriate levels: debug, info, warn, error
- Use consistent prefixes (e.g., `[MCP]`, `[develop]`)

```typescript
import createDebug from 'debug';

const debug = createDebug('expo-mcp:develop:CdpClient');

debug('Connecting to CDP server');
debug('Connected successfully', data);
debug.error('Failed to connect', error);
```

### Documentation
- Use JSDoc comments for exported functions and classes
- Document parameters with JSDoc @param tags
- Document return types with JSDoc @returns tags
- Document exceptions with JSDoc @throws tags

```typescript
/**
 * A MCP transport that connects to a WebSocket tunnel server.
 * 
 * @param remoteUrl - The WebSocket tunnel endpoint URL
 * @param options - Configuration options for the transport
 * @returns Promise that resolves when connected
 */
export class ReverseTunnelClientTransport implements Transport {
  constructor(
    remoteUrl: string,
    options: {
      projectRoot: string;
      devServerUrl: string;
      logger?: Logger;
    }
  ) {}
}
```

### File Organization
- Source files in `src/` directory
- Test files in `src/__tests__/` or `src/**/__tests__/`
- Type definitions in separate files or using `.d.ts` extensions
- Keep related functionality in the same module
- Use barrel exports (index.ts) for clean public APIs

```
packages/mcp-tunnel/src/
├── __tests__/
│   └── ReverseTunnelClientTransport.test.ts
├── index.ts
├── constants.ts
├── ReverseTunnelClientTransport.ts
└── types.ts
```

### Code Organization
- Keep files focused and small (under 300 lines preferred)
- Use export * from other modules for re-exports
- Group related types together
- Use interface for contracts, class for implementation
- Prefer composition over inheritance

### Environment and Dependencies
- Use workspace protocol for internal packages
- Use catalog for shared dependencies
- Pin specific versions for non-catalog dependencies
- Document any platform-specific requirements

```json
{
  "dependencies": {
    "@expo/mcp-tunnel": "workspace:~",
    "ws": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/bun": "catalog:",
    "typescript": "catalog:"
  }
}
```

## Linting Rules
- **sort-imports**: Error with ignoreDeclarationSort, check memberSort
- **import/extensions**: Error with ignorePackages
- Uses eslint-config-universe base config

## Pre-commit Checks
- Run `bun run typecheck` to catch TypeScript errors
- Run `bun run lint` to catch linting issues
- Run tests before committing

## MCP Tools Documentation

### Automation Tools
The automation tools enable interaction with mobile devices and apps:

**Existing Tools:**
- `automation_tap` - Tap at coordinates or by testID
- `automation_take_screenshot` - Full device screenshots or view-specific screenshots
- `automation_find_view_by_testid` - Find and inspect view properties
- `automation_tap_by_testid` - Tap on views using testID
- `automation_take_screenshot_by_testid` - Screenshot specific views

**New Gesture Tools:**
- `automation_swipe` - Swipe from one coordinate to another (x1,y1 → x2,y2)
- `automation_scroll` - Scroll in any direction (up, down, left, right)
- `automation_type_text` - Type text on the device keyboard
- `automation_press_key` - Press device keys (enter, back, home, menu, delete, space, arrow keys)

**Dev Server Tools:**
- `open_devtools` - Open React Native DevTools
- `collect_app_logs` - Collect logs from native device or JS console
- `expo_router_sitemap` - Query expo-router sitemap (requires expo-router library)
