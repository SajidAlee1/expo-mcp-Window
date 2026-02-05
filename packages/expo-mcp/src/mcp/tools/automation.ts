import { type McpServerProxy } from '@expo/mcp-tunnel';
import fs, { appendFileSync } from 'node:fs';
import { z } from 'zod';
import { tmpfile } from 'zx';

import type { IAutomation } from '../../automation/Automation.types.js';
import { AutomationFactory } from '../../automation/AutomationFactory.js';
import { resizeImageToMaxSizeAsync } from '../../imageUtils.js';

// Debug logger
function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data) : ''}\n`;
  appendFileSync('D:\\expo-mcp-demo\\mcp-debug.log', logMessage);
}

type AutomationContext = {
  automation: IAutomation;
  platform: 'android' | 'ios';
  deviceId: string;
  appId: string;
};

async function getAutomationContext(
  projectRoot: string,
  platformParam?: 'android' | 'ios'
): Promise<AutomationContext> {
  debugLog('getAutomationContext called', { projectRoot, platformParam });

  const platform = platformParam ?? (await AutomationFactory.guessCurrentPlatformAsync());
  debugLog('Platform determined', platform);

  const deviceId = await AutomationFactory.getBootedDeviceIdAsync(platform);
  debugLog('Device ID obtained', deviceId);

  const appId = await AutomationFactory.getAppIdAsync({ projectRoot, platform, deviceId });
  debugLog('App ID obtained', appId);

  const automation = AutomationFactory.create(platform, { appId, deviceId });
  debugLog('Automation created', { platform, appId, deviceId });

  return { automation, platform, deviceId, appId };
}

export function addAutomationTools(server: McpServerProxy, projectRoot: string) {
  server.registerTool(
    'automation_tap',
    {
      title: 'Tap on device',
      description:
        'Tap on the device at the given coordinates (x, y) or by react-native testID. Provide either (x AND y) or testID.',
      inputSchema: {
        projectRoot: z.string(),
        platform: z.enum(['android', 'ios']).optional(),
        x: z.number().optional().describe('X coordinate for tap (required if testID not provided)'),
        y: z.number().optional().describe('Y coordinate for tap (required if testID not provided)'),
        testID: z
          .string()
          .optional()
          .describe('React Native testID of the view to tap (alternative to x,y coordinates)'),
      },
    },
    async ({ projectRoot, platform, x, y, testID }) => {
      if (testID) {
        const { automation } = await getAutomationContext(projectRoot, platform);
        const result = await automation.tapByTestIDAsync(testID);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } else if (x !== undefined && y !== undefined) {
        const { automation } = await getAutomationContext(projectRoot, platform);
        const result = await automation.tapAsync({ x, y });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Must provide either testID or both x and y coordinates',
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'automation_take_screenshot',
    {
      title: 'Take screenshot of the app',
      description:
        'Take screenshot of the full app or a specific view by react-native testID. Optionally provide testID to screenshot a specific view.',
      inputSchema: {
        projectRoot: z.string(),
        platform: z.enum(['android', 'ios']).optional(),
        testID: z
          .string()
          .optional()
          .describe(
            'React Native testID of the view to screenshot (if not provided, takes full screen)'
          ),
      },
    },
    async ({ projectRoot, platform, testID }) => {
      debugLog('automation_take_screenshot called', { projectRoot, platform, testID });

      const { automation } = await getAutomationContext(projectRoot, platform);
      debugLog('Automation context obtained');

      const outputPath = `${tmpfile()}.png`;
      debugLog('Output path', outputPath);

      try {
        debugLog('Taking screenshot...');
        if (testID) {
          await automation.taksScreenshotByTestIDAsync({ testID, outputPath });
        } else {
          await automation.takeFullScreenshotAsync({ outputPath });
        }
        debugLog('Screenshot taken successfully');

        debugLog('Resizing image...');
        const { buffer } = await resizeImageToMaxSizeAsync(outputPath);
        debugLog('Image resized, buffer size', buffer.length);

        const result = {
          content: [
            { type: 'image' as const, data: buffer.toString('base64'), mimeType: 'image/jpeg' },
          ],
        };
        debugLog('Returning result');
        return result;
      } catch (error: any) {
        debugLog('Screenshot error', { message: error.message, stack: error.stack });
        throw error;
      } finally {
        await fs.promises.rm(outputPath, { force: true });
        debugLog('Cleanup done');
      }
    }
  );

  server.registerTool(
    'automation_find_view',
    {
      title: 'Find view properties',
      description:
        'Find view and dump its properties. This is useful to verify the view is rendered correctly',
      inputSchema: {
        projectRoot: z.string(),
        platform: z.enum(['android', 'ios']).optional(),
        testID: z.string().describe('React Native testID of the view to inspect'),
      },
    },
    async ({ projectRoot, platform, testID }) => {
      const { automation } = await getAutomationContext(projectRoot, platform);
      const result = await automation.findViewByTestIDAsync(testID);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );
}
