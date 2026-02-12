import { CHARACTER_LIMIT, type Format } from './types.js';

export function formatOutput(
  data: any,
  format: Format,
  options?: { title?: string; truncate?: boolean }
): string {
  let output =
    format === 'json' ? JSON.stringify(data, null, 2) : formatAsMarkdown(data, options?.title);

  if (options?.truncate !== false && output.length > CHARACTER_LIMIT) {
    output =
      output.substring(0, CHARACTER_LIMIT) +
      '\n\n[... Output truncated at 25,000 characters. Use filters/pagination to reduce output size.]';
  }
  return output;
}

function formatAsMarkdown(data: any, title?: string): string {
  let md = '';
  if (title) {
    md += `# ${title}\n\n`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      md += '*No items found*\n';
    } else if (typeof data[0] === 'object') {
      md += formatArrayAsMarkdownTable(data);
    } else {
      data.forEach((item, index) => {
        md += `${index + 1}. ${item}\n`;
      });
    }
    return md;
  }

  if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        md += `**${formatKey(key)}:**\n${formatAsMarkdown(value)}\n`;
      } else {
        md += `**${formatKey(key)}:** ${value}\n`;
      }
    }
    return md;
  }

  return md + String(data);
}

function formatArrayAsMarkdownTable(data: Record<string, any>[]): string {
  if (data.length === 0) {
    return '*No items found*\n';
  }

  const keys = Array.from(new Set(data.flatMap((item) => Object.keys(item))));
  let table = `| ${keys.map(formatKey).join(' | ')} |\n`;
  table += `| ${keys.map(() => '---').join(' | ')} |\n`;

  data.forEach((item) => {
    const row = keys.map((key) => {
      const value = item[key];
      if (value === null || value === undefined) {
        return '-';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    });
    table += `| ${row.join(' | ')} |\n`;
  });

  return table;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function createSuccessResponse(
  data: any,
  format: Format = 'markdown',
  options?: { title?: string; truncate?: boolean; structuredContent?: Record<string, any> }
) {
  const formattedText = formatOutput(data, format, options);
  return {
    content: [{ type: 'text' as const, text: formattedText }],
    ...(options?.structuredContent && { structuredContent: options.structuredContent }),
  };
}
