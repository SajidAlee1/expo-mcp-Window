#!/usr/bin/env node

import { addMcpCapabilities } from './packages/expo-mcp/dist/index.js';
import { StdioMcpServerProxy } from './packages/mcp-tunnel/dist/index.js';

const server = new StdioMcpServerProxy({
  devServerUrl: 'http://localhost:8081',
  mcpServerName: 'expo-mcp',
  mcpServerVersion: '0.2.3',
});

addMcpCapabilities(server, process.cwd());

await server.start();
