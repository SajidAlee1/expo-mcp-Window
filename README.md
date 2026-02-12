# Expo MCP Monorepo

Model Context Protocol (MCP) server capabilities for Expo and EAS workflows.

This repository contains:

- `packages/expo-mcp`: MCP tools, prompts, and docs resources for Expo projects
- `packages/mcp-tunnel`: stdio/tunnel proxy layer for local and remote MCP transport
- `expo-mcp-server.mjs`: dynamic launcher for Codex/Claude MCP config

## What It Does

The Expo MCP server enables AI assistants to execute Expo and EAS operations:

| Category | Capabilities |
| --- | --- |
| Project Setup | Initialize projects, install packages, prebuild native folders, inspect config |
| Cloud Builds | Create/list/view/cancel EAS builds |
| OTA Updates | Publish/list updates and create channels |
| App Submission | Submit iOS and Android builds |
| Diagnostics | Run `expo doctor`, check auth, inspect EAS project metadata |
| Docs Access | Search/fetch Expo docs and expose docs as MCP resources |

## Requirements

- Node.js `18+`
- Bun (for local development scripts in this monorepo)
- Expo account
- `EXPO_TOKEN` for account/EAS actions in MCP tools
  - Create token: [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)

## Quick Start

```bash
bun install
bun run build
```

## MCP Setup

Use the dynamic launcher so manual server start is not required:

```json
{
  "mcpServers": {
    "expo-mcp-demo": {
      "command": "node",
      "args": [
        "D:/expo-mcp-demo/expo-mcp-server.mjs",
        "--root",
        "D:/expo-mcp-demo"
      ],
      "env": {
        "EXPO_TOKEN": "your_token_here"
      }
    }
  }
}
```

Optional launcher flags/env:

- `--root` / `EXPO_PROJECT_ROOT`: Expo project root
- `--dev-server-url` / `EXPO_DEV_SERVER_URL`: explicit Metro URL
- `--mcp-server-url` / `EXPO_MCP_SERVER_URL`: tunnel server URL

Dynamic behavior:

- If dev server URL is omitted, launcher auto-detects local Metro/Expo server.
- If tunnel URL is present, server runs in composite mode (stdio + tunnel).
- Otherwise server runs as stdio MCP only.

## Tools

### Project Management

- `expo_init_project`
- `expo_install_packages`
- `expo_get_config`
- `expo_prebuild`

### EAS Build

- `eas_build_create`
- `eas_build_list`
- `eas_build_status`
- `eas_build_cancel`

### EAS Update (OTA)

- `eas_update_publish`
- `eas_update_list`
- `eas_channel_create`

### EAS Submit

- `eas_submit_ios`
- `eas_submit_android`

### Utilities

- `expo_doctor`
- `expo_whoami`
- `eas_project_info`

### Docs Tools

- `expo_docs_list`
- `expo_docs_search`
- `expo_docs_get`

### Dev/Automation Tools

- `open_devtools`
- `collect_app_logs`
- `expo_router_sitemap`
- `automation_tap`
- `automation_take_screenshot`
- `automation_find_view_by_testid`
- `automation_find_view`
- `automation_tap_by_testid`
- `automation_take_screenshot_by_testid`
- `automation_swipe`
- `automation_scroll`
- `automation_type_text`
- `automation_press_key`

## MCP Resources

Docs resources exposed by the server:

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

## Output Formats

Expo/EAS tools support:

- `markdown` (default)
- `json`

## Development

### Root

```bash
bun run build
bun run lint
bun run test
```

### Per package

```bash
cd packages/expo-mcp
bun run build
bun run lint
bun run test
bun run typecheck
```

## How To Add a New Tool

1. Add tool implementation in `packages/expo-mcp/src/mcp/tools/expo/*.ts` or relevant module.
2. Register tool in `packages/expo-mcp/src/mcp/tools.ts`.
3. If tool needs docs references, update `packages/expo-mcp/src/mcp/tools/expoDocs.ts`.
4. Add/update output schema and error handling through `expo-utils`.
5. Run:
   - `bun run typecheck` in `packages/expo-mcp`
   - `bun run build` in `packages/expo-mcp`
   - `bun run lint --max-warnings=0` in affected package(s)

## Dependency Notes

- Runtime CLI execution uses `npx expo` and `npx eas-cli`.
- EAS commands require `EXPO_TOKEN` and run non-interactive in MCP context.
- Transport layer supports both newline JSON and `Content-Length` framing for MCP compatibility.

## Troubleshooting

- `Authentication required for EAS commands`:
  - Set `EXPO_TOKEN` in MCP server environment.
- `No dev server found`:
  - Start Metro (`npx expo start`) or set `EXPO_DEV_SERVER_URL`.
- MCP startup/handshake issues:
  - Ensure launcher points to `expo-mcp-server.mjs`.
  - Rebuild changed packages (`bun run build`).

## License

MIT
