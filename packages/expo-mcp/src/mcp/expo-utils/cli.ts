import { $, within } from 'zx';

import { handleCliError } from './errors.js';
import { type ExpoServerConfig } from './types.js';

export async function executeExpoCommand(
  args: string[],
  config?: ExpoServerConfig,
  cwd?: string
): Promise<string> {
  try {
    return await within(async () => {
      if (cwd) {
        $.cwd = cwd;
      }
      if (config?.expoToken) {
        $.env.EXPO_TOKEN = config.expoToken;
      }
      const result = await $`npx expo ${args}`;
      return result.stdout;
    });
  } catch (error) {
    throw handleCliError(error, `npx expo ${args.join(' ')}`);
  }
}

export async function executeEasCommand(
  args: string[],
  config?: ExpoServerConfig,
  cwd?: string
): Promise<string> {
  try {
    return await within(async () => {
      if (cwd) {
        $.cwd = cwd;
      }
      if (config?.expoToken) {
        $.env.EXPO_TOKEN = config.expoToken;
      }
      const result = await $`npx eas-cli ${args}`;
      return result.stdout;
    });
  } catch (error) {
    throw handleCliError(error, `npx eas-cli ${args.join(' ')}`);
  }
}

export async function checkCommandAvailable(command: string): Promise<boolean> {
  const probeCommand = process.platform === 'win32' ? 'where' : 'which';

  try {
    await $`${probeCommand} ${command}`;
    return true;
  } catch {
    return false;
  }
}
