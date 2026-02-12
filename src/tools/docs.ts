import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FormatSchema } from '../types.js';
import { createSuccessResponse } from '../utils/format.js';

type DocsSource = 'expo' | 'react-native';

type DocsEntry = {
  id: string;
  source: DocsSource;
  title: string;
  summary: string;
  url: string;
};

const DOCS_ENTRIES: DocsEntry[] = [
  {
    id: 'expo-llms',
    source: 'expo',
    title: 'Expo docs index (LLM optimized)',
    summary: 'Master index for Expo documentation in text format.',
    url: 'https://docs.expo.dev/llms.txt',
  },
  {
    id: 'expo-llms-full',
    source: 'expo',
    title: 'Expo full docs (LLM optimized)',
    summary: 'Complete Expo documentation corpus in text format.',
    url: 'https://docs.expo.dev/llms-full.txt',
  },
  {
    id: 'expo-llms-eas',
    source: 'expo',
    title: 'EAS docs (LLM optimized)',
    summary: 'Complete Expo Application Services documentation in text format.',
    url: 'https://docs.expo.dev/llms-eas.txt',
  },
  {
    id: 'expo-llms-sdk',
    source: 'expo',
    title: 'Latest Expo SDK docs (LLM optimized)',
    summary: 'Complete documentation for the latest Expo SDK in text format.',
    url: 'https://docs.expo.dev/llms-sdk.txt',
  },
  {
    id: 'expo-eas-build',
    source: 'expo',
    title: 'EAS Build',
    summary: 'Build and signing docs for iOS and Android.',
    url: 'https://docs.expo.dev/build/introduction/',
  },
  {
    id: 'expo-eas-update',
    source: 'expo',
    title: 'EAS Update',
    summary: 'OTA update docs and rollout workflows.',
    url: 'https://docs.expo.dev/eas-update/introduction/',
  },
  {
    id: 'expo-eas-submit',
    source: 'expo',
    title: 'EAS Submit',
    summary: 'App store submission docs for iOS and Android.',
    url: 'https://docs.expo.dev/submit/introduction/',
  },
  {
    id: 'expo-cli',
    source: 'expo',
    title: 'Expo CLI reference',
    summary: 'Expo CLI command reference and options.',
    url: 'https://docs.expo.dev/more/expo-cli/',
  },
  {
    id: 'expo-programmatic-access',
    source: 'expo',
    title: 'Programmatic access',
    summary: 'Token and API access guidance for CI/CD usage.',
    url: 'https://docs.expo.dev/accounts/programmatic-access/',
  },
  {
    id: 'rn-llms',
    source: 'react-native',
    title: 'React Native docs index (LLM optimized)',
    summary: 'Master index for React Native docs in text format.',
    url: 'https://reactnative.dev/llms.txt',
  },
  {
    id: 'rn-debugging',
    source: 'react-native',
    title: 'React Native debugging',
    summary: 'Debugging workflows and tools for React Native.',
    url: 'https://reactnative.dev/docs/debugging',
  },
  {
    id: 'rn-troubleshooting',
    source: 'react-native',
    title: 'React Native troubleshooting',
    summary: 'Common issues and fixes in React Native apps.',
    url: 'https://reactnative.dev/docs/troubleshooting',
  },
];

const LLM_INDEX_URLS: Record<DocsSource, string> = {
  expo: 'https://docs.expo.dev/llms.txt',
  'react-native': 'https://reactnative.dev/llms.txt',
};

async function fetchTextAsync(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain,text/html;q=0.9,*/*;q=0.8',
      'User-Agent': 'expo-mcp-server/1.0.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

function filterEntries(source: 'expo' | 'react-native' | 'all'): DocsEntry[] {
  if (source === 'all') {
    return DOCS_ENTRIES;
  }
  return DOCS_ENTRIES.filter((entry) => entry.source === source);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n\n[truncated: showing ${maxChars} of ${text.length} characters]`;
}

function normalizeDocsContent(sourceUrl: string, raw: string): string {
  return sourceUrl.endsWith('.txt') ? raw : stripHtml(raw);
}

/**
 * Registers docs tools for listing/searching/fetching Expo and React Native docs.
 */
export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    'expo_docs_list',
    {
      title: 'List Expo and React Native docs',
      description: 'List curated Expo and React Native documentation links.',
      inputSchema: {
        source: z.enum(['expo', 'react-native', 'all']).default('expo'),
        format: FormatSchema.default('markdown'),
      },
      outputSchema: {
        entries: z.array(
          z.object({
            id: z.string(),
            source: z.string(),
            title: z.string(),
            summary: z.string(),
            url: z.string(),
          })
        ),
      },
    },
    async ({ source, format }) => {
      const entries = filterEntries(source);
      return createSuccessResponse({ entries }, format, {
        title: 'Documentation Links',
        structuredContent: { entries },
      });
    }
  );

  server.registerTool(
    'expo_docs_search',
    {
      title: 'Search docs index lines',
      description: 'Search Expo/React Native llms indexes for matching docs lines.',
      inputSchema: {
        query: z.string().min(2),
        source: z.enum(['expo', 'react-native']).default('expo'),
        limit: z.number().min(1).max(50).default(10),
      },
      outputSchema: {
        matches: z.array(z.string()),
      },
    },
    async ({ query, source, limit }) => {
      const indexUrl = LLM_INDEX_URLS[source];
      const indexText = await fetchTextAsync(indexUrl);
      const lowered = query.toLowerCase();
      const matches = indexText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line.toLowerCase().includes(lowered))
        .slice(0, limit)
        .map((line) => `[${source}] ${line}`);

      return {
        content: [
          {
            type: 'text',
            text: matches.length === 0 ? `No matches found for "${query}".` : matches.join('\n'),
          },
        ],
        structuredContent: { matches },
      };
    }
  );

  server.registerTool(
    'expo_docs_get',
    {
      title: 'Fetch docs content',
      description: 'Fetch docs content using curated docId or direct URL.',
      inputSchema: {
        docId: z.string().optional(),
        url: z.string().url().optional(),
        maxChars: z.number().min(200).max(200_000).default(15_000),
      },
      outputSchema: {
        source: z.string(),
        content: z.string(),
      },
    },
    async ({ docId, url, maxChars }) => {
      const entry = docId ? DOCS_ENTRIES.find((item) => item.id === docId) : undefined;
      if (!entry && !url) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Provide either docId or url.' }],
        };
      }

      const resolvedUrl = entry?.url ?? url!;
      const raw = await fetchTextAsync(resolvedUrl);
      const normalized = normalizeDocsContent(resolvedUrl, raw);
      const content = truncateText(normalized, maxChars);

      return {
        content: [{ type: 'text', text: `Source: ${resolvedUrl}\n\n${content}` }],
        structuredContent: { source: resolvedUrl, content },
      };
    }
  );
}
