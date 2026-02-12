export class ExpoError extends Error {
  readonly context: {
    command: string;
    stderr: string;
    exitCode?: number;
  };
  readonly docResource?: string;

  constructor(
    message: string,
    context: { command: string; stderr: string; exitCode?: number },
    docResource?: string
  ) {
    super(message);
    this.context = context;
    this.docResource = docResource;
    this.name = 'ExpoError';
  }
}

export function handleCliError(error: any, command: string): ExpoError {
  const stderr = error?.stderr || error?.message || '';
  const exitCode = error?.exitCode;

  if (
    stderr.includes('EXPO_TOKEN') ||
    stderr.includes('not logged in') ||
    stderr.includes('unauthorized')
  ) {
    return new ExpoError(
      [
        'Authentication required. Please set EXPO_TOKEN with a valid Expo access token.',
        'Create token at: https://expo.dev/settings/access-tokens',
      ].join('\n\n'),
      { command, stderr, exitCode },
      'expo://docs/programmatic-access'
    );
  }

  if (command.includes('eas build') && stderr.includes('failed')) {
    return new ExpoError(
      `Build failed.\n\n${stderr}`,
      { command, stderr, exitCode },
      'expo://docs/eas-build'
    );
  }

  if (stderr.includes('app.json') || stderr.includes('app.config')) {
    return new ExpoError(
      `Configuration error.\n\n${stderr}`,
      { command, stderr, exitCode },
      'expo://docs/config-plugins'
    );
  }

  if (stderr.includes('React Native') || stderr.includes('metro') || stderr.includes('bundler')) {
    return new ExpoError(
      `React Native bundling/build error.\n\n${stderr}`,
      { command, stderr, exitCode },
      'expo://docs/react-native/troubleshooting'
    );
  }

  if (
    stderr.includes('ECONNREFUSED') ||
    stderr.includes('ETIMEDOUT') ||
    stderr.includes('network')
  ) {
    return new ExpoError(`Network error.\n\n${stderr}`, { command, stderr, exitCode });
  }

  return new ExpoError(`Command failed: ${command}\n\n${stderr}`, { command, stderr, exitCode });
}

export function formatErrorResponse(error: ExpoError) {
  let errorMessage = error.message;
  if (error.docResource) {
    errorMessage += `\n\nRelevant documentation: ${error.docResource}`;
  }

  return {
    content: [{ type: 'text' as const, text: errorMessage }],
    isError: true,
  };
}
