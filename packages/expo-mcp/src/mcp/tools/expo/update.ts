import { type McpServerProxy } from '@expo/mcp-tunnel';
import { z } from 'zod';

import { executeEasCommand } from '../../expo-utils/cli.js';
import { ExpoError, formatErrorResponse } from '../../expo-utils/errors.js';
import { createSuccessResponse } from '../../expo-utils/format.js';
import { extractUpdateId } from '../../expo-utils/parse.js';
import { type ExpoServerConfig, FormatSchema } from '../../expo-utils/types.js';

export function registerUpdateTools(server: McpServerProxy, config?: ExpoServerConfig): void {
  server.registerTool(
    'eas_update_publish',
    {
      title: 'Publish EAS Update',
      description: 'Publish an OTA update to an EAS branch/channel.',
      inputSchema: {
        branch: z.string().min(1),
        message: z.string().min(1),
        channel: z.string().optional(),
        projectPath: z.string().optional(),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        updateId: z.string().optional(),
        branch: z.string(),
        message: z.string(),
        link: z.string().optional(),
      },
    },
    async ({ branch, message, channel, projectPath, format }) => {
      try {
        const args = ['update', '--branch', branch, '--message', message];
        if (channel) {
          args.push('--channel', channel);
        }

        const output = await executeEasCommand(args, config, projectPath);
        const updateId = extractUpdateId(output) || undefined;
        const result = {
          updateId,
          branch,
          channel,
          message,
          link: updateId ? `https://expo.dev/updates/${updateId}` : undefined,
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
    'eas_update_list',
    {
      title: 'List EAS Updates',
      description: 'List recent published updates with optional branch filtering.',
      inputSchema: {
        branch: z.string().optional(),
        projectPath: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        updates: z.array(z.any()),
      },
    },
    async ({ branch, projectPath, limit, format }) => {
      try {
        const args = ['update:list', '--limit', limit.toString(), '--json'];
        if (branch) {
          args.push('--branch', branch);
        }
        const output = await executeEasCommand(args, config, projectPath);
        const updates = JSON.parse(output);
        return createSuccessResponse({ updates }, format, {
          title: 'Recent EAS Updates',
          structuredContent: { updates },
        });
      } catch (error) {
        if (error instanceof ExpoError) {
          return formatErrorResponse(error);
        }
        throw error;
      }
    }
  );

  server.registerTool(
    'eas_channel_create',
    {
      title: 'Create EAS Update Channel',
      description: 'Create a new EAS update channel.',
      inputSchema: {
        channelName: z.string().min(1),
        branchMapping: z.string().optional(),
        projectPath: z.string().optional(),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        success: z.boolean(),
        channelName: z.string(),
        message: z.string(),
      },
    },
    async ({ channelName, branchMapping, projectPath, format }) => {
      try {
        const args = ['channel:create', channelName];
        if (branchMapping) {
          args.push('--branch', branchMapping);
        }
        await executeEasCommand(args, config, projectPath);
        const result = {
          success: true,
          channelName,
          message: `Channel "${channelName}" created successfully.`,
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
