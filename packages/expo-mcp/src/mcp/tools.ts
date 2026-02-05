import { type McpServerProxy } from '@expo/mcp-tunnel';
import { z } from 'zod';
import { $, within } from 'zx';

import { AutomationFactory } from '../automation/AutomationFactory.js';
import { createLogCollector } from '../develop/LogCollectorFactory.js';
import { findDevServerUrlAsync, openDevtoolsAsync } from '../develop/devtools.js';
import { isExpoRouterProject } from '../project.js';
import { addAutomationTools } from './tools/automation.js';
import { AutomationContext } from '../automation/Automation.types.js';

async function getAutomationContext(
  projectRoot: string,
  platformParam?: 'android' | 'ios'
): Promise<AutomationContext> {
  const platform = platformParam ?? (await AutomationFactory.guessCurrentPlatformAsync());

  const deviceId = await AutomationFactory.getBootedDeviceIdAsync(platform);

  const appId = await AutomationFactory.getAppIdAsync({ projectRoot, platform, deviceId });

  const automation = AutomationFactory.create(platform, { appId, deviceId });

  return { automation, platform, deviceId, appId };
}

export function addMcpTools(server: McpServerProxy, projectRoot: string) {
  const isRouterProject = isExpoRouterProject(projectRoot);
  if (isRouterProject) {
    server.registerTool(
      'expo_router_sitemap',
      {
        title: 'Query the sitemap of the current expo-router project',
        description:
          'Query the all routes of the current expo-router project. This is useful if you were using expo-router and want to know all the routes of the app',
      },
      async () => {
        const sitemap = await within(async () => {
          $.cwd = projectRoot;
          const { stdout } = await $`npx -y expo-router-sitemap@latest`.nothrow();
          return stdout;
        });
        return { content: [{ type: 'text', text: sitemap }] };
      }
    );
  }

  server.registerTool(
    'open_devtools',
    {
      title: 'Open devtools',
      description: 'Open the React Native DevTools',
      inputSchema: {
        projectRoot: z.string(),
        platform: z.enum(['android', 'ios']).optional(),
      },
    },
    async ({ projectRoot, platform: platformParam }) => {
      const platform = platformParam ?? (await AutomationFactory.guessCurrentPlatformAsync());
      const deviceId = await AutomationFactory.getBootedDeviceIdAsync(platform);
      const appId = await AutomationFactory.getAppIdAsync({ projectRoot, platform, deviceId });
      try {
        const responses: { type: 'text'; text: string }[] = [];
        const devServerUrl = await findDevServerUrlAsync(projectRoot);
        if (!devServerUrl) {
          return { content: [{ type: 'text', text: 'No dev server found' }] };
        }
        responses.push({ type: 'text', text: `Found dev server URL: ${devServerUrl.toString()}` });
        await openDevtoolsAsync({ appId, devServerUrl });
        responses.push({ type: 'text', text: `Opening devtools for ${appId}...` });
        return { content: responses };
      } catch (e: unknown) {
        return { content: [{ type: 'text', text: `Failed to open devtools: ${e}` }] };
      }
    }
  );

  server.registerTool(
    'collect_app_logs',
    {
      title: 'Collect app logs',
      description: 'Collect logs from native device (logcat/syslog) or JavaScript console',
      inputSchema: {
        projectRoot: z.string(),
        sources: z
          .array(z.enum(['native_android', 'native_ios', 'js_console']))
          .min(1)
          .default(['js_console'])
          .describe('Log sources: logcat, syslog, or console.log'),
        appId: z.string().optional(),
        durationMs: z.number().min(0).max(10000).default(2000),
        filter: z
          .string()
          .optional()
          .describe(
            'Regex or string pattern to filter logs. Only logs matching this pattern will be returned'
          ),
        logLevel: z
          .string()
          .optional()
          .describe(
            'Log level filter (e.g., error, warn, info, debug). Only logs with this level will be returned'
          ),
      },
    },
    async ({ projectRoot, sources, appId: appIdParam, durationMs, filter, logLevel }) => {
      const collectAndroid = sources.includes('native_android');
      const collectIos = sources.includes('native_ios');
      const collectJsConsole = sources.includes('js_console');

      let androidDeviceId: string | undefined;
      let androidAppId: string | undefined;
      let iosDeviceId: string | undefined;
      let iosAppId: string | undefined;

      if (collectAndroid) {
        androidDeviceId = await AutomationFactory.getBootedDeviceIdAsync('android');
        androidAppId =
          appIdParam ??
          (await AutomationFactory.getAppIdAsync({
            projectRoot,
            platform: 'android',
            deviceId: androidDeviceId,
          }));
      }

      if (collectIos) {
        iosDeviceId = await AutomationFactory.getBootedDeviceIdAsync('ios');
        iosAppId =
          appIdParam ??
          (await AutomationFactory.getAppIdAsync({
            projectRoot,
            platform: 'ios',
            deviceId: iosDeviceId,
          }));
      }

      const devServerUrl = server.devServerUrl;
      let filterRegexp: RegExp | undefined = undefined;
      if (filter) {
        filterRegexp = typeof filter === 'string' ? new RegExp(filter) : filter;
      }

      const logCollector = createLogCollector({
        android: collectAndroid && androidAppId ? { appId: androidAppId, durationMs } : undefined,
        iosSimulator:
          collectIos && iosAppId ? { bundleIdentifier: iosAppId, durationMs } : undefined,
        cdp: collectJsConsole && devServerUrl ? { metroUrl: devServerUrl, durationMs } : undefined,
        filterRegexp,
        logLevel,
      });

      const logs = await logCollector.collectAsync();
      return {
        content: [{ type: 'text', text: logs }],
      };
    }
  );

  addAutomationTools(server, projectRoot);

  server.registerTool(
    'automation_swipe',
    {
      title: 'Swipe on device',
      description: 'Swipe from one coordinate to another on the device',
      inputSchema: {
        projectRoot: z.string(),
        platform: z.enum(['android', 'ios']).optional(),
        startX: z.number().describe('Start X coordinate'),
        startY: z.number().describe('Start Y coordinate'),
        endX: z.number().describe('End X coordinate'),
        endY: z.number().describe('End Y coordinate'),
      },
    },
    async ({ projectRoot, platform, startX, startY, endX, endY }) => {
      const { automation } = await getAutomationContext(projectRoot, platform);
      const result = await automation.swipeAsync({ startX, startY, endX, endY });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  server.registerTool(
    'automation_scroll',
    {
      title: 'Scroll on device',
      description: 'Scroll in a specific direction on the device',
      inputSchema: {
        projectRoot: z.string(),
        platform: z.enum(['android', 'ios']).optional(),
        direction: z.enum(['up', 'down', 'left', 'right']).describe('Scroll direction'),
        distance: z.number().optional().describe('Scroll distance in pixels (default: 1000)'),
      },
    },
    async ({ projectRoot, platform, direction, distance }) => {
      const { automation } = await getAutomationContext(projectRoot, platform);
      const result = await automation.scrollAsync({ direction, distance });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  server.registerTool(
    'automation_type_text',
    {
      title: 'Type text on device',
      description: 'Type text on the device keyboard',
      inputSchema: {
        projectRoot: z.string(),
        platform: z.enum(['android', 'ios']).optional(),
        text: z.string().describe('Text to type'),
      },
    },
    async ({ projectRoot, platform, text }) => {
      const { automation } = await getAutomationContext(projectRoot, platform);
      const result = await automation.typeTextAsync(text);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  server.registerTool(
    'automation_press_key',
    {
      title: 'Press key on device',
      description: 'Press a key on the device',
      inputSchema: {
        projectRoot: z.string(),
        platform: z.enum(['android', 'ios']).optional(),
        key: z
          .enum([
            'enter',
            'back',
            'home',
            'menu',
            'delete',
            'space',
            'arrow_left',
            'arrow_right',
            'arrow_up',
            'arrow_down',
          ])
          .describe('Key to press'),
      },
    },
    async ({ projectRoot, platform, key }) => {
      const { automation } = await getAutomationContext(projectRoot, platform);
      const result = await automation.pressKeyAsync(key);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );
}
