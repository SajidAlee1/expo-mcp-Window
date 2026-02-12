import { type McpServerProxy } from '@expo/mcp-tunnel';
import { z } from 'zod';

import { executeExpoCommand } from '../../expo-utils/cli.js';
import { ExpoError, formatErrorResponse } from '../../expo-utils/errors.js';
import { createSuccessResponse } from '../../expo-utils/format.js';
import { type ExpoServerConfig, FormatSchema } from '../../expo-utils/types.js';

export function registerDevelopmentTools(server: McpServerProxy, config?: ExpoServerConfig): void {
  server.registerTool(
    'expo_doctor',
    {
      title: 'Run Expo Project Diagnostics',
      description: 'Run expo doctor diagnostics and optionally attempt auto-fixes.',
      inputSchema: {
        projectPath: z.string().optional(),
        fixIssues: z.boolean().default(false),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        issues: z.array(z.any()),
        fixed: z.array(z.string()).optional(),
      },
    },
    async ({ projectPath, fixIssues, format }) => {
      try {
        const args = ['doctor'];
        if (fixIssues) {
          args.push('--fix-dependencies');
        }

        const output = await executeExpoCommand(args, config, projectPath);
        const result = {
          issues: [],
          fixed: fixIssues ? ['Automatically fixed dependency issues'] : undefined,
          message: output || 'No issues found. Project looks healthy.',
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
}
