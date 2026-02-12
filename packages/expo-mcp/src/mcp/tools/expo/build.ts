import { type McpServerProxy } from '@expo/mcp-tunnel';
import { z } from 'zod';

import { executeEasCommand } from '../../expo-utils/cli.js';
import { ExpoError, formatErrorResponse } from '../../expo-utils/errors.js';
import { createSuccessResponse } from '../../expo-utils/format.js';
import { extractBuildId } from '../../expo-utils/parse.js';
import {
  BuildProfileSchema,
  type ExpoServerConfig,
  FormatSchema,
  PlatformSchema,
} from '../../expo-utils/types.js';

export function registerBuildTools(server: McpServerProxy, config?: ExpoServerConfig): void {
  server.registerTool(
    'eas_build_create',
    {
      title: 'Create EAS Build',
      description: 'Trigger a new EAS cloud build for iOS, Android, or both.',
      inputSchema: {
        platform: PlatformSchema,
        profile: BuildProfileSchema.default('production'),
        projectPath: z.string().optional(),
        nonInteractive: z.boolean().default(true),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        buildId: z.string().optional(),
        platform: z.string(),
        profile: z.string(),
        status: z.string(),
        link: z.string().optional(),
      },
    },
    async ({ platform, profile, projectPath, nonInteractive, format }) => {
      try {
        const args = ['build', '--platform', platform, '--profile', profile];
        if (nonInteractive) {
          args.push('--non-interactive');
        }

        const output = await executeEasCommand(args, config, projectPath);
        const buildId = extractBuildId(output) || undefined;
        const result = {
          buildId,
          platform,
          profile,
          status: 'in-queue',
          link: buildId ? `https://expo.dev/builds/${buildId}` : undefined,
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
    'eas_build_list',
    {
      title: 'List EAS Builds',
      description: 'List recent EAS builds with optional filters.',
      inputSchema: {
        projectPath: z.string().optional(),
        platform: PlatformSchema.optional(),
        status: z.enum(['in-queue', 'in-progress', 'finished', 'errored', 'canceled']).optional(),
        profile: BuildProfileSchema.optional(),
        limit: z.number().min(1).max(50).default(10),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        builds: z.array(z.any()),
      },
    },
    async ({ projectPath, platform, status, profile, limit, format }) => {
      try {
        const args = ['build:list', '--limit', limit.toString(), '--json'];
        if (platform && platform !== 'all') {
          args.push('--platform', platform);
        }
        if (status) {
          args.push('--status', status);
        }
        if (profile) {
          args.push('--profile', profile);
        }

        const output = await executeEasCommand(args, config, projectPath);
        const builds = JSON.parse(output);
        return createSuccessResponse({ builds }, format, {
          title: 'Recent EAS Builds',
          structuredContent: { builds },
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
    'eas_build_status',
    {
      title: 'Get EAS Build Status',
      description: 'Get detailed status for a specific EAS build ID.',
      inputSchema: {
        buildId: z.string().min(1),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        build: z.any(),
      },
    },
    async ({ buildId, format }) => {
      try {
        const output = await executeEasCommand(['build:view', buildId, '--json'], config);
        const build = JSON.parse(output);
        return createSuccessResponse({ build }, format, {
          title: `Build Status: ${buildId}`,
          structuredContent: { build },
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
    'eas_build_cancel',
    {
      title: 'Cancel EAS Build',
      description: 'Cancel a build that is in-queue or in-progress.',
      inputSchema: {
        buildId: z.string().min(1),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        success: z.boolean(),
        buildId: z.string(),
        message: z.string(),
      },
    },
    async ({ buildId, format }) => {
      try {
        await executeEasCommand(['build:cancel', buildId], config);
        const result = {
          success: true,
          buildId,
          message: `Build ${buildId} has been canceled.`,
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
