#!/usr/bin/env node

import { addMcpCapabilities } from './packages/expo-mcp/dist/index.js';
import { findDevServerUrlAsync } from './packages/expo-mcp/dist/develop/devtools.js';
import { CompositeMcpServerProxy, StdioMcpServerProxy } from './packages/mcp-tunnel/dist/index.js';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

const projectRoot = readArg('--root') ?? process.env.EXPO_PROJECT_ROOT ?? process.cwd();
const tunnelServerUrl = readArg('--mcp-server-url') ?? process.env.EXPO_MCP_SERVER_URL;

let devServerUrl =
  readArg('--dev-server-url') ?? process.env.EXPO_DEV_SERVER_URL ?? undefined;

if (!devServerUrl) {
  try {
    const discoveredUrl = await findDevServerUrlAsync(projectRoot);
    if (discoveredUrl) {
      devServerUrl = discoveredUrl.toString();
      console.error(`[expo-mcp] Auto-detected dev server: ${devServerUrl}`);
    }
  } catch (error) {
    console.error(`[expo-mcp] Dev server auto-detect failed: ${error}`);
  }
}

const server = tunnelServerUrl
  ? new CompositeMcpServerProxy({
      tunnelServerUrl,
      projectRoot,
      devServerUrl,
      stdioMcpServerName: 'expo-mcp',
      stdioMcpServerVersion: '0.2.3',
    })
  : new StdioMcpServerProxy({
      devServerUrl,
      mcpServerName: 'expo-mcp',
      mcpServerVersion: '0.2.3',
    });

addMcpCapabilities(server, projectRoot);

await server.start();
