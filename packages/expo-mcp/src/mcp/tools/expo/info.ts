import { type McpServerProxy } from '@expo/mcp-tunnel';
import { z } from 'zod';

import { executeEasCommand, executeExpoCommand } from '../../expo-utils/cli.js';
import { ExpoError, formatErrorResponse } from '../../expo-utils/errors.js';
import { createSuccessResponse } from '../../expo-utils/format.js';
import { type ExpoServerConfig, FormatSchema } from '../../expo-utils/types.js';

export function registerInfoTools(server: McpServerProxy, config?: ExpoServerConfig): void {
  server.registerTool(
    'expo_whoami',
    {
      title: 'Check Expo Authentication Status',
      description: 'Check current Expo account authentication state.',
      inputSchema: {
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        username: z.string(),
        authenticated: z.boolean(),
      },
    },
    async ({ format }) => {
      try {
        const output = await executeExpoCommand(['whoami'], config);
        const username = output.trim();
        const result = {
          username,
          authenticated: !!username && username !== 'Not logged in',
          message: username ? `Authenticated as: ${username}` : 'Not authenticated',
        };
        return createSuccessResponse(result, format, { structuredContent: result });
      } catch (error) {
        if (error instanceof ExpoError) {
          return formatErrorResponse(error);
        }
        throw error;
      }
    }
  );

  server.registerTool(
    'eas_project_info',
    {
      title: 'Get EAS Project Information',
      description: 'Get project metadata from EAS (id, slug, owner, and config).',
      inputSchema: {
        projectPath: z.string().optional(),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        project: z.any(),
      },
    },
    async ({ projectPath, format }) => {
      try {
        const output = await executeEasCommand(['project:info', '--json'], config, projectPath);
        const project = JSON.parse(output);
        return createSuccessResponse({ project }, format, {
          title: 'EAS Project Information',
          structuredContent: { project },
        });
      } catch (error) {
        if (error instanceof ExpoError) {
          return formatErrorResponse(error);
        }
        throw error;
      }
    }
  );
}
