import { spawn } from 'node:child_process';
import { ExpoServerConfig } from '../types.js';
import { ExpoError, handleCliError } from './errors.js';

const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;

function getNpxCommand(): string {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function ensureExpoToken(config?: ExpoServerConfig): string {
  const token = config?.expoToken ?? process.env.EXPO_TOKEN;
  if (!token) {
    throw new ExpoError(
      [
        'Authentication required for EAS commands.',
        'Set EXPO_TOKEN in your MCP server environment.',
        'Create token at: https://expo.dev/settings/access-tokens',
      ].join('\n'),
      {
        command: 'eas-cli',
        stderr: 'EXPO_TOKEN is not set',
      },
      'expo://docs/programmatic-access'
    );
  }
  return token;
}

function createCliCommandError(
  stderr: string,
  exitCode?: number
): Error & { stderr: string; exitCode?: number } {
  const error = new Error(stderr) as Error & { stderr: string; exitCode?: number };
  error.stderr = stderr;
  error.exitCode = exitCode;
  return error;
}

async function runCliCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;

  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd ?? process.cwd(),
      env: {
        ...process.env,
        ...(options?.env ?? {}),
      },
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    const timeout = setTimeout(() => {
      if (resolved) {
        return;
      }
      child.kill();
      reject(createCliCommandError(`Command timed out after ${timeoutMs}ms`, 124));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (resolved) {
        return;
      }
      clearTimeout(timeout);
      reject(createCliCommandError(error.message));
    });

    child.on('close', (code) => {
      if (resolved) {
        return;
      }
      clearTimeout(timeout);
      resolved = true;

      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        createCliCommandError(
          stderr.trim() || `Command exited with code ${code}`,
          code ?? undefined
        )
      );
    });
  });
}

/**
 * Executes Expo CLI commands with proper environment configuration
 */
export async function executeExpoCommand(
  args: string[],
  config?: ExpoServerConfig,
  cwd?: string
): Promise<string> {
  try {
    const env = config?.expoToken ? { EXPO_TOKEN: config.expoToken } : undefined;
    return await runCliCommand(getNpxCommand(), ['expo', ...args], { cwd, env });
  } catch (error) {
    throw handleCliError(error, `npx expo ${args.join(' ')}`);
  }
}

/**
 * Executes EAS CLI commands with proper environment configuration
 */
export async function executeEasCommand(
  args: string[],
  config?: ExpoServerConfig,
  cwd?: string
): Promise<string> {
  try {
    const expoToken = ensureExpoToken(config);
    const easArgs = [...args];
    if (!easArgs.includes('--non-interactive')) {
      easArgs.push('--non-interactive');
    }

    return await runCliCommand(getNpxCommand(), ['eas-cli', ...easArgs], {
      cwd,
      env: { EXPO_TOKEN: expoToken },
    });
  } catch (error) {
    throw handleCliError(error, `npx eas-cli ${args.join(' ')}`);
  }
}

/**
 * Checks if a command is available in the system
 */
export async function checkCommandAvailable(command: string): Promise<boolean> {
  try {
    const probeCommand = process.platform === 'win32' ? 'where' : 'which';
    await runCliCommand(probeCommand, [command], { timeoutMs: 10_000 });
    return true;
  } catch {
    return false;
  }
}
