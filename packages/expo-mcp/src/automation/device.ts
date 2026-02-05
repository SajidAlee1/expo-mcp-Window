import { execSync } from 'node:child_process';
import { $, within } from 'zx';
import { appendFileSync } from 'node:fs';

// Debug logger to file (won't crash MCP)
function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data) : ''}\n`;
  appendFileSync('D:\\expo-mcp-demo\\mcp-debug.log', logMessage);
}

export interface AndroidDevice {
  deviceId: string;
}

type SimctlRuntime = string;
export interface SimctlDevice {
  dataPath: string;
  name: string;
  state: string;
  udid: string;
}

const EXPO_GO_ANDROID_PACKAGE_NAME = 'host.exp.exponent';
const EXPO_GO_IOS_BUNDLE_IDENTIFIER = 'host.exp.Exponent';

/**
 * Get the ADB path based on environment variables or fallback to PATH
 */
function getAdbPath(): string {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome) {
    const separator = process.platform === 'win32' ? '\\' : '/';
    const ext = process.platform === 'win32' ? '.exe' : '';
    return `${androidHome}${separator}platform-tools${separator}adb${ext}`;
  }
  return 'adb';
}

/**
 * Get the booted Android device
 *
 * @throws {Error} If no booted Android devices found
 * @throws {Error} If multiple Android devices are found
 * @returns {AndroidDevice} The booted Android device
 */
export async function getAndroidBootedDeviceAsync(): Promise<AndroidDevice> {
  const adbPath = getAdbPath();
  debugLog('ADB Path:', adbPath);
  debugLog('ANDROID_HOME env:', process.env.ANDROID_HOME);
  debugLog('Platform:', process.platform);

  let stdout = '';
  try {
    stdout = execSync(`"${adbPath}" devices`, {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 10000,
    });
    debugLog('ADB raw output length:', stdout.length);
    debugLog('ADB raw output:', stdout);
  } catch (error: any) {
    debugLog('ADB exec error:', error.message);
    throw new Error(`Failed to run ADB: ${error.message}. ADB path: "${adbPath}"`);
  }

  // Parse output
  const lines = stdout.split('\n').slice(1);
  const bootedDevices: AndroidDevice[] = [];

  for (const line of lines) {
    const [deviceId, state] = line.split('\t');
    if (state?.trim() === 'device') {
      bootedDevices.push({ deviceId: deviceId?.trim() || '' });
    }
  }

  if (bootedDevices.length === 0) {
    throw new Error(
      `No booted Android devices found. ADB output: "${stdout}". Make sure ADB is in PATH or ANDROID_HOME is setss.`
    );
  } else if (bootedDevices.length > 1) {
    throw new Error(
      `Multiple Android devices are not supported yet. Devices: ${JSON.stringify(bootedDevices)}`
    );
  }

  return bootedDevices[0];
}

/**
 * Get the Android appId from the project root
 *
 * On Android, we may have a way to get the foreground app's package name.
 * However, to align the behavior with iOS, we keep the same logic as iOS:
 * It is a best-effort to guess the package name:
 * - We first try to use the package name from the project root.
 * - If the app is not installed or `android.package` is not set, we use Expo Go's package name.
 * - If Expo Go is not installed, we throw an error.
 */
export async function getAndroidBundleIdentifierAsync({
  projectRoot,
  deviceId,
}: {
  projectRoot: string;
  deviceId: string;
}): Promise<string> {
  debugLog('getAndroidBundleIdentifierAsync called', { projectRoot, deviceId });

  const configId = await within(async () => {
    $.cwd = projectRoot;
    debugLog('Running: npx expo config --type public --json');
    const { stdout, exitCode } = await $`npx expo config --type public --json`.nothrow();
    debugLog('Expo config result', { exitCode, stdoutLength: stdout?.length || 0, stdoutPreview: stdout?.substring(0, 100) });

    if (!stdout || stdout.trim().length === 0) {
      debugLog('Expo config returned empty output');
      return null;
    }

    try {
      const config = JSON.parse(stdout);
      debugLog('Parsed config android.package', config.android?.package);
      return config.android.package ?? null;
    } catch (error: any) {
      debugLog('Failed to parse Expo config as JSON', { error: error.message, stdout: stdout.substring(0, 200) });
      return null;
    }
  });

  if (configId != null) {
    debugLog('Checking if app installed:', configId);
    const isInstalled = await isAndroidAppInstalledAsync({ appId: configId, deviceId });
    debugLog('App installed check result', isInstalled);
    if (isInstalled) return configId;
  }

  const expoGoId = EXPO_GO_ANDROID_PACKAGE_NAME;
  debugLog('Checking Expo Go installation');
  if (await isAndroidAppInstalledAsync({ appId: expoGoId, deviceId })) {
    return expoGoId;
  }

  debugLog('No Android package name found');
  throw new Error('No Android package name found');
}

export async function isAndroidAppInstalledAsync({
  appId,
  deviceId,
}: {
  appId: string;
  deviceId: string;
}): Promise<boolean> {
  const adbPath = getAdbPath();
  debugLog('isAndroidAppInstalledAsync called', { appId, deviceId, adbPath });

  try {
    const stdout = execSync(`"${adbPath}" -s ${deviceId} shell pm list packages`, {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 10000,
    });
    debugLog('pm list packages output length', stdout.length);
    const match = stdout.match(new RegExp(`^package:${appId}$`, 'm'));
    debugLog('Package match result', match != null);
    return match != null;
  } catch (error: any) {
    debugLog('isAndroidAppInstalledAsync error', error.message);
    return false;
  }
}

/**
 * Get the booted simulator device
 *
 * @throws {Error} If no booted simulator devices found
 * @throws {Error} If multiple simulator are found
 * @returns {SimctlDevice} The booted simulator device
 */
export async function getIosBootedSimulatorDeviceAsync(): Promise<SimctlDevice> {
  const { stdout } = await $`xcrun simctl list devices booted --json`;
  const result = JSON.parse(stdout) as { devices: Record<SimctlRuntime, SimctlDevice[]> };

  const bootedDevices: SimctlDevice[] = [];
  for (const [runtime, devices] of Object.entries(result.devices)) {
    if (!runtime.includes('.iOS-')) {
      continue;
    }
    bootedDevices.push(...devices);
  }

  if (bootedDevices.length === 0) {
    throw new Error('No booted simulator devices found');
  } else if (bootedDevices.length > 1) {
    throw new Error('Multiple simulator are not supported yet');
  }
  return bootedDevices[0];
}

/**
 * Get the iOS bundle identifier from the project root
 *
 * We don't have a reliable way to find the foreground app's bundle identifier.
 * It is a best-effort to guess the bundle identifier:
 * - We first try to use the bundle identifier from the project root.
 * - If the app is not installed or `ios.bundleIdentifier` is not set, we use Expo Go's bundle identifier.
 * - If Expo Go is not installed, we throw an error.
 */
export async function getIosBundleIdentifierAsync({
  projectRoot,
  deviceId,
}: {
  projectRoot: string;
  deviceId: string;
}): Promise<string> {
  const configId = await within(async () => {
    $.cwd = projectRoot;
    const { stdout } = await $`npx expo config --type public --json`.nothrow();
    const config = JSON.parse(stdout);
    return config.ios.bundleIdentifier ?? null;
  });
  if (configId != null && (await isIosAppInstalledAsync({ appId: configId, deviceId }))) {
    return configId;
  }

  const expoGoId = EXPO_GO_IOS_BUNDLE_IDENTIFIER;
  if (await isIosAppInstalledAsync({ appId: expoGoId, deviceId })) {
    return expoGoId;
  }
  throw new Error('No iOS bundle identifier found');
}

export async function isIosAppInstalledAsync({
  appId,
  deviceId,
}: {
  appId: string;
  deviceId: string;
}): Promise<boolean> {
  try {
    await $`xcrun simctl get_app_container ${deviceId} ${appId}`.quiet();
    return true;
  } catch {}
  return false;
}
