import { type McpServerProxy } from '@expo/mcp-tunnel';
import { z } from 'zod';

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
    id: 'expo-llms-sdk-v53',
    source: 'expo',
    title: 'Expo SDK v53 docs (LLM optimized)',
    summary: 'Documentation for Expo SDK v53.0.0 in text format.',
    url: 'https://docs.expo.dev/llms-sdk-v53.0.0.txt',
  },
  {
    id: 'expo-llms-sdk-v52',
    source: 'expo',
    title: 'Expo SDK v52 docs (LLM optimized)',
    summary: 'Documentation for Expo SDK v52.0.0 in text format.',
    url: 'https://docs.expo.dev/llms-sdk-v52.0.0.txt',
  },
  {
    id: 'expo-llms-sdk-v51',
    source: 'expo',
    title: 'Expo SDK v51 docs (LLM optimized)',
    summary: 'Documentation for Expo SDK v51.0.0 in text format.',
    url: 'https://docs.expo.dev/llms-sdk-v51.0.0.txt',
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
    id: 'expo-config-plugins',
    source: 'expo',
    title: 'Config plugins',
    summary: 'Native config customization with config plugins.',
    url: 'https://docs.expo.dev/config-plugins/introduction/',
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

const DOCS_RESOURCES = [
  {
    name: 'expo_docs_llms',
    uri: 'expo://docs/llms',
    title: 'Expo docs (LLM optimized)',
    description: 'Complete Expo documentation index in text format.',
    sourceUrl: 'https://docs.expo.dev/llms.txt',
  },
  {
    name: 'expo_docs_llms_full',
    uri: 'expo://docs/llms-full',
    title: 'Expo full docs (LLM optimized)',
    description: 'Complete Expo documentation corpus in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-full.txt',
  },
  {
    name: 'expo_docs_llms_eas',
    uri: 'expo://docs/llms-eas',
    title: 'EAS docs (LLM optimized)',
    description: 'Complete Expo Application Services documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-eas.txt',
  },
  {
    name: 'expo_docs_llms_sdk',
    uri: 'expo://docs/llms-sdk',
    title: 'Latest Expo SDK docs (LLM optimized)',
    description: 'Complete latest Expo SDK documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-sdk.txt',
  },
  {
    name: 'expo_docs_llms_sdk_v53',
    uri: 'expo://docs/llms-sdk-v53.0.0',
    title: 'Expo SDK v53 docs (LLM optimized)',
    description: 'Expo SDK v53.0.0 documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-sdk-v53.0.0.txt',
  },
  {
    name: 'expo_docs_llms_sdk_v52',
    uri: 'expo://docs/llms-sdk-v52.0.0',
    title: 'Expo SDK v52 docs (LLM optimized)',
    description: 'Expo SDK v52.0.0 documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-sdk-v52.0.0.txt',
  },
  {
    name: 'expo_docs_llms_sdk_v51',
    uri: 'expo://docs/llms-sdk-v51.0.0',
    title: 'Expo SDK v51 docs (LLM optimized)',
    description: 'Expo SDK v51.0.0 documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-sdk-v51.0.0.txt',
  },
  {
    name: 'expo_docs_eas_build',
    uri: 'expo://docs/eas-build',
    title: 'EAS Build docs',
    description: 'Build and signing docs for iOS and Android.',
    sourceUrl: 'https://docs.expo.dev/build/introduction/',
  },
  {
    name: 'expo_docs_eas_update',
    uri: 'expo://docs/eas-update',
    title: 'EAS Update docs',
    description: 'OTA update docs and rollout workflows.',
    sourceUrl: 'https://docs.expo.dev/eas-update/introduction/',
  },
  {
    name: 'expo_docs_eas_submit',
    uri: 'expo://docs/eas-submit',
    title: 'EAS Submit docs',
    description: 'App Store and Play Store submission docs.',
    sourceUrl: 'https://docs.expo.dev/submit/introduction/',
  },
  {
    name: 'expo_docs_cli_reference',
    uri: 'expo://docs/cli-reference',
    title: 'Expo CLI reference',
    description: 'CLI commands and options reference.',
    sourceUrl: 'https://docs.expo.dev/more/expo-cli/',
  },
] as const;

async function fetchTextAsync(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain,text/html;q=0.9,*/*;q=0.8',
      'User-Agent': 'expo-mcp/0.2.3',
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

export function addExpoDocsTools(server: McpServerProxy) {
  server.registerTool(
    'expo_docs_list',
    {
      title: 'List Expo and React Native docs',
      description: 'List curated Expo and React Native documentation links.',
      inputSchema: {
        source: z.enum(['expo', 'react-native', 'all']).default('all'),
      },
    },
    async ({ source = 'all' }) => {
      const entries = filterEntries(source);
      const text = entries
        .map((entry) => `- [${entry.id}] ${entry.title}\n  ${entry.summary}\n  ${entry.url}`)
        .join('\n\n');
      return { content: [{ type: 'text', text }] };
    }
  );

  server.registerTool(
    'expo_docs_search',
    {
      title: 'Search Expo docs indexes',
      description: 'Search Expo/React Native llms indexes for matching docs lines.',
      inputSchema: {
        query: z.string().min(2).describe('Search phrase'),
        source: z.enum(['expo', 'react-native', 'all']).default('expo'),
        limit: z.number().min(1).max(50).default(10),
      },
    },
    async ({ query, source = 'expo', limit = 10 }) => {
      const selectedSources: DocsSource[] =
        source === 'all' ? ['expo', 'react-native'] : [source as DocsSource];
      const normalizedQuery = query.toLowerCase();
      const matches: string[] = [];

      for (const selectedSource of selectedSources) {
        const indexText = await fetchTextAsync(LLM_INDEX_URLS[selectedSource]);
        for (const rawLine of indexText.split(/\r?\n/g)) {
          const line = rawLine.trim();
          if (!line || !line.toLowerCase().includes(normalizedQuery)) {
            continue;
          }
          matches.push(`[${selectedSource}] ${line}`);
          if (matches.length >= limit) {
            break;
          }
        }
        if (matches.length >= limit) {
          break;
        }
      }

      if (matches.length === 0) {
        return {
          content: [{ type: 'text', text: `No matches found for "${query}".` }],
        };
      }

      return { content: [{ type: 'text', text: matches.join('\n') }] };
    }
  );

  server.registerTool(
    'expo_docs_get',
    {
      title: 'Get Expo/React Native docs content',
      description: 'Fetch docs content using curated docId or direct URL.',
      inputSchema: {
        docId: z
          .string()
          .optional()
          .describe('Doc id from expo_docs_list, for example "expo-eas-build"'),
        url: z.string().url().optional().describe('Direct docs URL'),
        maxChars: z.number().min(500).max(40000).default(12000),
      },
    },
    async ({ docId, url, maxChars = 12000 }) => {
      const resolvedUrl = docId ? DOCS_ENTRIES.find((entry) => entry.id === docId)?.url : url;
      if (!resolvedUrl) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Provide either a valid docId from expo_docs_list or a direct URL.',
            },
          ],
        };
      }

      const raw = await fetchTextAsync(resolvedUrl);
      const normalizedText = normalizeDocsContent(resolvedUrl, raw);
      const output = `Source: ${resolvedUrl}\n\n${truncateText(normalizedText, maxChars)}`;
      return { content: [{ type: 'text', text: output }] };
    }
  );
}

export function addExpoDocsResources(server: McpServerProxy) {
  for (const resource of DOCS_RESOURCES) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: 'text/plain',
      },
      async (uri: URL) => {
        const raw = await fetchTextAsync(resource.sourceUrl);
        const text = normalizeDocsContent(resource.sourceUrl, raw);
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'text/plain',
              text,
            },
          ],
        };
      }
    );
  }
}
