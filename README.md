# Expo MCP Monorepo

This monorepo contains MCP local utilities for Expo development.

## Packages

### `expo-mcp`

The main Expo MCP local capabilities provider that provides MCP tools and prompts for Expo development.

### `@expo/mcp-tunnel`

Tunnel functionality for MCP servers that provides WebSocket-based transport for remote MCP connections.

## Development

### Setup

```bash
bun install
```

### Build

```bash
bun run build
```

### Lint

```bash
bun run lint
```

## Auto-Start Linking (No Manual Server Start)

Use `expo-mcp-server.mjs` as the MCP command in your client config so the client starts it automatically.

Example command:

```bash
node /absolute/path/to/expo-mcp-server.mjs --root /absolute/path/to/your-expo-project
```

Optional flags/env:

- `--dev-server-url` or `EXPO_DEV_SERVER_URL`: explicit Metro URL
- `--mcp-server-url` or `EXPO_MCP_SERVER_URL`: link to tunnel MCP server
- `--root` or `EXPO_PROJECT_ROOT`: Expo project root

Dynamic behavior:

- If `dev-server-url` is not provided, the launcher auto-detects a local Metro/Expo dev server.
- If `mcp-server-url` is provided, it uses `CompositeMcpServerProxy` (stdio + tunnel).
- Otherwise, it runs as stdio MCP server.

## Docs Resources

The MCP server also exposes docs as resources:

- `expo://docs/llms`
- `expo://docs/llms-full`
- `expo://docs/llms-eas`
- `expo://docs/llms-sdk`
- `expo://docs/llms-sdk-v53.0.0`
- `expo://docs/llms-sdk-v52.0.0`
- `expo://docs/llms-sdk-v51.0.0`
- `expo://docs/eas-build`
- `expo://docs/eas-update`
- `expo://docs/eas-submit`
- `expo://docs/cli-reference`
