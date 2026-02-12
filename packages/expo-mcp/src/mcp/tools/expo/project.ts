import { type McpServerProxy } from '@expo/mcp-tunnel';
import { z } from 'zod';

import { executeExpoCommand } from '../../expo-utils/cli.js';
import { ExpoError, formatErrorResponse } from '../../expo-utils/errors.js';
import { createSuccessResponse } from '../../expo-utils/format.js';
import { type ExpoServerConfig, FormatSchema, PlatformSchema } from '../../expo-utils/types.js';

export function registerProjectTools(server: McpServerProxy, config?: ExpoServerConfig): void {
  server.registerTool(
    'expo_init_project',
    {
      title: 'Initialize Expo Project',
      description: 'Create a new Expo project with a selected template.',
      inputSchema: {
        projectName: z.string().min(1),
        template: z
          .enum(['blank', 'tabs', 'blank-typescript', 'navigation'])
          .default('blank-typescript'),
        directory: z.string().optional(),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        success: z.boolean(),
        projectPath: z.string(),
        message: z.string(),
      },
    },
    async ({ projectName, template, directory, format }) => {
      try {
        await executeExpoCommand(['init', projectName, '--template', template], config, directory);
        const result = {
          success: true,
          projectPath: directory ? `${directory}/${projectName}` : projectName,
          message: `Project "${projectName}" created successfully using ${template} template.`,
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
    'expo_install_packages',
    {
      title: 'Install Expo Packages',
      description: 'Install packages with Expo version compatibility checks for the current SDK.',
      inputSchema: {
        packages: z.array(z.string()).min(1),
        projectPath: z.string().optional(),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        success: z.boolean(),
        installedPackages: z.array(z.string()),
        message: z.string(),
      },
    },
    async ({ packages, projectPath, format }) => {
      try {
        await executeExpoCommand(['install', ...packages], config, projectPath);
        const result = {
          success: true,
          installedPackages: packages,
          message: `Successfully installed: ${packages.join(', ')}`,
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
    'expo_get_config',
    {
      title: 'Get Expo Configuration',
      description: 'Read and evaluate app config from app.json/app.config.*',
      inputSchema: {
        projectPath: z.string().optional(),
        full: z.boolean().default(false),
        format: FormatSchema.default('json'),
      },
      outputSchema: {
        config: z.any(),
      },
    },
    async ({ projectPath, full, format }) => {
      try {
        const args = ['config', '--type', 'public'];
        if (full) {
          args.push('--full');
        }
        const output = await executeExpoCommand(args, config, projectPath);
        const configData = JSON.parse(output);
        return createSuccessResponse(configData, format, {
          title: 'Expo Configuration',
          structuredContent: configData,
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
    'expo_prebuild',
    {
      title: 'Generate Native Project Directories',
      description: 'Generate ios/android native folders from Expo config and plugins.',
      inputSchema: {
        projectPath: z.string().optional(),
        platform: PlatformSchema.default('all'),
        clean: z.boolean().default(false),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        success: z.boolean(),
        platforms: z.array(z.string()),
        message: z.string(),
      },
    },
    async ({ projectPath, platform, clean, format }) => {
      try {
        const args = ['prebuild'];
        if (platform !== 'all') {
          args.push('--platform', platform);
        }
        if (clean) {
          args.push('--clean');
        }
        await executeExpoCommand(args, config, projectPath);
        const platforms = platform === 'all' ? ['ios', 'android'] : [platform];
        const result = {
          success: true,
          platforms,
          message: `Native project directories generated for: ${platforms.join(', ')}`,
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
