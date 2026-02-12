import { type McpServerProxy } from '@expo/mcp-tunnel';
import { z } from 'zod';

import { executeEasCommand } from '../../expo-utils/cli.js';
import { ExpoError, formatErrorResponse } from '../../expo-utils/errors.js';
import { createSuccessResponse } from '../../expo-utils/format.js';
import { type ExpoServerConfig, FormatSchema } from '../../expo-utils/types.js';

export function registerSubmitTools(server: McpServerProxy, config?: ExpoServerConfig): void {
  server.registerTool(
    'eas_submit_ios',
    {
      title: 'Submit iOS Build to App Store',
      description: 'Submit an iOS build to App Store Connect/TestFlight.',
      inputSchema: {
        buildId: z.string().optional(),
        ascApiKeyPath: z.string().optional(),
        ascApiKeyId: z.string().optional(),
        ascApiKeyIssuerId: z.string().optional(),
        projectPath: z.string().optional(),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        success: z.boolean(),
        buildId: z.string().optional(),
        message: z.string(),
      },
    },
    async ({ buildId, ascApiKeyPath, ascApiKeyId, ascApiKeyIssuerId, projectPath, format }) => {
      try {
        const args = ['submit', '--platform', 'ios', '--non-interactive'];
        if (buildId) {
          args.push('--id', buildId);
        }
        if (ascApiKeyPath) {
          args.push('--asc-api-key-path', ascApiKeyPath);
        }
        if (ascApiKeyId) {
          args.push('--asc-api-key-id', ascApiKeyId);
        }
        if (ascApiKeyIssuerId) {
          args.push('--asc-api-key-issuer-id', ascApiKeyIssuerId);
        }

        await executeEasCommand(args, config, projectPath);
        const result = {
          success: true,
          buildId,
          message: 'iOS build submitted to App Store Connect successfully.',
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
    'eas_submit_android',
    {
      title: 'Submit Android Build to Google Play',
      description: 'Submit an Android build to Google Play Console.',
      inputSchema: {
        track: z.enum(['internal', 'alpha', 'beta', 'production']).default('internal'),
        buildId: z.string().optional(),
        serviceAccountKeyPath: z.string().optional(),
        projectPath: z.string().optional(),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        success: z.boolean(),
        buildId: z.string().optional(),
        track: z.string(),
        message: z.string(),
      },
    },
    async ({ track, buildId, serviceAccountKeyPath, projectPath, format }) => {
      try {
        const args = ['submit', '--platform', 'android', '--track', track, '--non-interactive'];
        if (buildId) {
          args.push('--id', buildId);
        }
        if (serviceAccountKeyPath) {
          args.push('--key', serviceAccountKeyPath);
        }

        await executeEasCommand(args, config, projectPath);
        const result = {
          success: true,
          buildId,
          track,
          message: `Android build submitted to Google Play Console (${track} track).`,
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
