/**
 * Find the URL of the Expo dev server for the given project root.
 */
export async function findDevServerUrlAsync(_projectRoot: string): Promise<URL | null> {
  // Kept for API compatibility; currently not required by probing strategy.

  const envUrl = process.env.EXPO_DEV_SERVER_URL;
  if (envUrl) {
    try {
      return new URL(envUrl);
    } catch {
      // Ignore invalid EXPO_DEV_SERVER_URL and continue probing.
    }
  }

  const envPorts = [process.env.EXPO_DEV_SERVER_PORT, process.env.RCT_METRO_PORT]
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0) as number[];

  const candidatePorts = Array.from(new Set([...envPorts, 8081, 8082, 19000, 19001, 19006]));

  for (const port of candidatePorts) {
    const candidate = new URL(`http://127.0.0.1:${port}/`);
    if (await isExpoOrMetroServerAsync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function isExpoOrMetroServerAsync(baseUrl: URL): Promise<boolean> {
  const statusText = await fetchTextAsync(new URL('status', baseUrl));
  if (statusText && statusText.toLowerCase().includes('packager-status:running')) {
    return true;
  }

  const jsonListText = await fetchTextAsync(new URL('json/list', baseUrl));
  if (jsonListText) {
    try {
      const parsed = JSON.parse(jsonListText);
      if (Array.isArray(parsed)) {
        return true;
      }
    } catch {
      // Ignore parse failures; try other probes.
    }
  }

  return false;
}

async function fetchTextAsync(url: URL, timeoutMs = 400): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Open the React Native DevTools for the given appId and project root.
 */
export async function openDevtoolsAsync({
  appId,
  devServerUrl,
}: {
  appId: string;
  devServerUrl: URL;
}): Promise<void> {
  const debuggerUrl = new URL('_expo/debugger', devServerUrl);
  debuggerUrl.searchParams.set('appId', appId);

  await fetch(debuggerUrl, {
    method: 'PUT',
  });
}
