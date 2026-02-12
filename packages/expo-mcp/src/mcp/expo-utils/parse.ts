export function parseJsonOutput<T = unknown>(output: string): T {
  try {
    return JSON.parse(output) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON output: ${error}`);
  }
}

export function extractBuildId(output: string): string | null {
  const match =
    output.match(/Build ID:\s+([a-f0-9-]+)/i) ||
    output.match(/https:\/\/expo\.dev\/.*\/builds\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

export function extractUpdateId(output: string): string | null {
  const match =
    output.match(/Update ID:\s+([a-f0-9-]+)/i) ||
    output.match(/https:\/\/expo\.dev\/.*\/updates\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}
