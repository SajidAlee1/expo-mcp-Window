import process from 'node:process';

import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { type JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

type FramingMode = 'content-length' | 'newline';

/**
 * stdio transport compatible with both Content-Length framing and newline-delimited JSON.
 * It mirrors the framing mode used by the client when possible.
 */
export class CompatStdioServerTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;
  setProtocolVersion?: (version: string) => void;

  private readonly stdin: NodeJS.ReadStream;
  private readonly stdout: NodeJS.WriteStream;
  private started = false;
  private framingMode?: FramingMode;
  private buffer = Buffer.alloc(0);

  constructor(stdin: NodeJS.ReadStream = process.stdin, stdout: NodeJS.WriteStream = process.stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('CompatStdioServerTransport already started');
    }
    this.started = true;
    this.stdin.on('data', this.handleData);
    this.stdin.on('error', this.handleError);
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const payload = JSON.stringify(message);
    const output =
      this.framingMode === 'newline'
        ? `${payload}\n`
        : `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;

    await new Promise<void>((resolve) => {
      if (this.stdout.write(output)) {
        resolve();
      } else {
        this.stdout.once('drain', resolve);
      }
    });
  }

  async close(): Promise<void> {
    this.stdin.off('data', this.handleData);
    this.stdin.off('error', this.handleError);
    if (this.stdin.listenerCount('data') === 0) {
      this.stdin.pause();
    }
    this.buffer = Buffer.alloc(0);
    this.onclose?.();
  }

  private readonly handleData = (chunk: Buffer): void => {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    if (!this.framingMode) {
      this.framingMode = this.detectFramingMode(this.buffer);
      if (!this.framingMode) {
        return;
      }
    }

    if (this.framingMode === 'content-length') {
      this.processContentLengthBuffer();
      return;
    }
    this.processNewlineBuffer();
  };

  private readonly handleError = (error: Error): void => {
    this.onerror?.(error);
  };

  private detectFramingMode(buffer: Buffer): FramingMode | undefined {
    const probe = buffer.toString('utf8');
    const trimmed = probe.replace(/^\uFEFF/, '').trimStart();
    if (trimmed.startsWith('Content-Length:')) {
      return 'content-length';
    }

    const newlineIndex = probe.indexOf('\n');
    if (newlineIndex === -1) {
      return undefined;
    }

    const firstLine = probe.slice(0, newlineIndex).replace(/\r$/, '').trim();
    if (firstLine.startsWith('{') || firstLine.startsWith('[')) {
      return 'newline';
    }

    // Fall back to content-length framing for unknown first line.
    return 'content-length';
  }

  private processNewlineBuffer(): void {
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }
      const line = this.buffer.toString('utf8', 0, newlineIndex).replace(/\r$/, '').trim();
      this.buffer = this.buffer.subarray(newlineIndex + 1);
      if (!line) {
        continue;
      }
      this.dispatchJsonLine(line);
    }
  }

  private processContentLengthBuffer(): void {
    while (true) {
      let headerEnd = this.buffer.indexOf('\r\n\r\n');
      let delimiterLength = 4;
      if (headerEnd === -1) {
        headerEnd = this.buffer.indexOf('\n\n');
        delimiterLength = 2;
      }
      if (headerEnd === -1) {
        return;
      }

      const headerText = this.buffer.toString('utf8', 0, headerEnd);
      const contentLengthMatch = /^Content-Length:\s*(\d+)$/im.exec(headerText);
      if (!contentLengthMatch) {
        this.onerror?.(new Error(`Invalid MCP header: ${headerText}`));
        this.buffer = this.buffer.subarray(headerEnd + delimiterLength);
        continue;
      }

      const contentLength = Number(contentLengthMatch[1]);
      const bodyOffset = headerEnd + delimiterLength;
      if (this.buffer.length < bodyOffset + contentLength) {
        return;
      }

      const payload = this.buffer.toString('utf8', bodyOffset, bodyOffset + contentLength);
      this.buffer = this.buffer.subarray(bodyOffset + contentLength);
      this.dispatchJsonLine(payload);
    }
  }

  private dispatchJsonLine(jsonLine: string): void {
    try {
      const parsed = JSON.parse(jsonLine) as JSONRPCMessage;
      this.onmessage?.(parsed);
    } catch (error) {
      this.onerror?.(
        error instanceof Error ? error : new Error(`Failed to parse JSON-RPC message: ${jsonLine}`)
      );
    }
  }
}
