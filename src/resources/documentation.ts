import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface DocResource {
  uri: string;
  title: string;
  description: string;
  sourceUrl: string;
}

const EXPO_DOCS: DocResource[] = [
  {
    uri: 'expo://docs/llms',
    title: 'Expo docs index (LLM optimized)',
    description: 'Master index for Expo documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms.txt',
  },
  {
    uri: 'expo://docs/llms-full',
    title: 'Expo full docs (LLM optimized)',
    description: 'Complete Expo documentation corpus in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-full.txt',
  },
  {
    uri: 'expo://docs/llms-eas',
    title: 'EAS docs (LLM optimized)',
    description: 'Complete Expo Application Services documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-eas.txt',
  },
  {
    uri: 'expo://docs/llms-sdk',
    title: 'Latest Expo SDK docs (LLM optimized)',
    description: 'Complete latest Expo SDK documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-sdk.txt',
  },
  {
    uri: 'expo://docs/llms-sdk-v53.0.0',
    title: 'Expo SDK v53 docs (LLM optimized)',
    description: 'Expo SDK v53.0.0 documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-sdk-v53.0.0.txt',
  },
  {
    uri: 'expo://docs/llms-sdk-v52.0.0',
    title: 'Expo SDK v52 docs (LLM optimized)',
    description: 'Expo SDK v52.0.0 documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-sdk-v52.0.0.txt',
  },
  {
    uri: 'expo://docs/llms-sdk-v51.0.0',
    title: 'Expo SDK v51 docs (LLM optimized)',
    description: 'Expo SDK v51.0.0 documentation in text format.',
    sourceUrl: 'https://docs.expo.dev/llms-sdk-v51.0.0.txt',
  },
  {
    uri: 'expo://docs/eas-build',
    title: 'EAS Build docs',
    description: 'Build and signing docs for iOS and Android.',
    sourceUrl: 'https://docs.expo.dev/build/introduction/',
  },
  {
    uri: 'expo://docs/eas-update',
    title: 'EAS Update docs',
    description: 'OTA update docs and rollout workflows.',
    sourceUrl: 'https://docs.expo.dev/eas-update/introduction/',
  },
  {
    uri: 'expo://docs/eas-submit',
    title: 'EAS Submit docs',
    description: 'App Store and Play Store submission docs.',
    sourceUrl: 'https://docs.expo.dev/submit/introduction/',
  },
  {
    uri: 'expo://docs/cli-reference',
    title: 'Expo CLI reference',
    description: 'CLI commands and options reference.',
    sourceUrl: 'https://docs.expo.dev/more/expo-cli/',
  },
  {
    uri: 'expo://docs/programmatic-access',
    title: 'Programmatic access',
    description: 'Token and API access guidance for CI/CD usage.',
    sourceUrl: 'https://docs.expo.dev/accounts/programmatic-access/',
  },
];

const REACT_NATIVE_DOCS: DocResource[] = [
  {
    uri: 'expo://docs/react-native/llms',
    title: 'React Native docs index (LLM optimized)',
    description: 'Master index for React Native docs in text format.',
    sourceUrl: 'https://reactnative.dev/llms.txt',
  },
  {
    uri: 'expo://docs/react-native/troubleshooting',
    title: 'React Native troubleshooting',
    description: 'Common issues and fixes in React Native apps.',
    sourceUrl: 'https://reactnative.dev/docs/troubleshooting',
  },
  {
    uri: 'expo://docs/react-native/debugging',
    title: 'React Native debugging',
    description: 'Debugging workflows and tools for React Native.',
    sourceUrl: 'https://reactnative.dev/docs/debugging',
  },
];

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

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDocsContent(sourceUrl: string, raw: string): string {
  return sourceUrl.endsWith('.txt') ? raw : stripHtml(raw);
}

function extractResourceName(uri: string): string {
  return uri.replace('expo://docs/', '').replace(/\//g, '-');
}

function registerDocs(server: McpServer, docs: DocResource[]): void {
  for (const doc of docs) {
    server.registerResource(
      extractResourceName(doc.uri),
      doc.uri,
      {
        title: doc.title,
        description: doc.description,
        mimeType: 'text/plain',
      },
      async () => {
        const raw = await fetchTextAsync(doc.sourceUrl);
        const text = normalizeDocsContent(doc.sourceUrl, raw);
        return {
          contents: [
            {
              uri: doc.uri,
              mimeType: 'text/plain',
              text,
            },
          ],
        };
      }
    );
  }
}

/**
 * Registers Expo and React Native documentation resources.
 */
export function registerDocumentationResources(server: McpServer): void {
  registerDocs(server, EXPO_DOCS);
  registerDocs(server, REACT_NATIVE_DOCS);
}
