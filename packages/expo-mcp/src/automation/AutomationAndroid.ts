import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseString } from 'xml2js';
import { tmpfile } from 'zx';

import { cropImageAsync } from '../imageUtils.js';
import {
  type AutomationConstructorParamsBase,
  type AutomationResult,
  type IAutomation,
} from './Automation.types.js';

// Get ADB path helper (same as device.ts)
function getAdbPath(): string {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome) {
    const separator = process.platform === 'win32' ? '\\' : '/';
    const ext = process.platform === 'win32' ? '.exe' : '';
    return `${androidHome}${separator}platform-tools${separator}adb${ext}`;
  }
  return 'adb';
}

interface ElementProperties {
  resource_id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  class: string;
  text: string;
  content_desc: string;
  clickable: boolean;
  enabled: boolean;
  focusable: boolean;
  focused: boolean;
  scrollable: boolean;
  selected: boolean;
  checkable: boolean;
  checked: boolean;
  package: string;
  exists: boolean;
}

const KEY_EVENT_BY_NAME: Record<string, number> = {
  arrow_down: 20,
  arrow_left: 21,
  arrow_right: 22,
  arrow_up: 19,
  back: 4,
  delete: 67,
  enter: 66,
  home: 3,
  menu: 82,
  space: 62,
};

export class AutomationAndroid implements IAutomation {
  private readonly appId: string;
  private readonly deviceId: string;
  private readonly verbose: boolean;

  constructor({ appId, deviceId, verbose }: AutomationConstructorParamsBase) {
    this.appId = appId;
    this.deviceId = deviceId;
    this.verbose = verbose ?? false;
    this.sanityCheckAsync();
  }

  async tapAsync({
    x,
    y,
  }: {
    x: number;
    y: number;
  }): Promise<AutomationResult<{ x: number; y: number }>> {
    const startTime = Date.now();
    try {
      await this.runAdbCommand(['shell', 'input', 'tap', String(x), String(y)]);
      return {
        success: true,
        duration: Date.now() - startTime,
        data: { x, y },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        data: { x, y },
      };
    }
  }

  async takeFullScreenshotAsync({ outputPath }: { outputPath: string }): Promise<string> {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    const tempPath = `/sdcard/screenshot_${Date.now()}.png`;
    await this.runAdbCommand(['shell', 'screencap', '-p', tempPath]);
    await this.runAdbCommand(['pull', tempPath, outputPath]);
    await this.runAdbCommand(['shell', 'rm', tempPath]);

    return outputPath;
  }

  async findViewByTestIDAsync(testID: string): Promise<AutomationResult<ElementProperties>> {
    const startTime = Date.now();
    try {
      const xmlViewHierarchy = await this.dumpViewHierarchy();
      const element = await this.findElementByResourceId(xmlViewHierarchy, testID);

      return {
        success: true,
        duration: Date.now() - startTime,
        data: element,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        data: {} as ElementProperties,
      };
    }
  }

  async tapByTestIDAsync(
    testID: string
  ): Promise<AutomationResult<{ resource_id: string; tapped: boolean }>> {
    const startTime = Date.now();
    try {
      const xmlViewHierarchy = await this.dumpViewHierarchy();
      const element = await this.findElementByResourceId(xmlViewHierarchy, testID);

      if (!element.clickable && !element.enabled) {
        return {
          success: false,
          error: `Element with testID "${testID}" is not clickable or enabled`,
          duration: Date.now() - startTime,
          data: { resource_id: testID, tapped: false as boolean },
        };
      }

      const centerX = element.bounds.x + element.bounds.width / 2;
      const centerY = element.bounds.y + element.bounds.height / 2;

      await this.runAdbCommand(['shell', 'input', 'tap', String(centerX), String(centerY)]);

      return {
        success: true,
        duration: Date.now() - startTime,
        data: { resource_id: testID, tapped: true as boolean },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        data: { resource_id: testID, tapped: false as boolean },
      };
    }
  }

  async taksScreenshotByTestIDAsync({
    testID,
    outputPath,
  }: {
    testID: string;
    outputPath: string;
  }): Promise<string> {
    const xmlViewHierarchy = await this.dumpViewHierarchy();
    const element = await this.findElementByResourceId(xmlViewHierarchy, testID);

    const bounds = element.bounds;
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    const tempFullScreenshot = `/sdcard/full_screenshot_${Date.now()}.png`;
    await this.runAdbCommand(['shell', 'screencap', '-p', tempFullScreenshot]);

    const tempLocalPath = tmpfile('tmp.png');
    try {
      await this.runAdbCommand(['pull', tempFullScreenshot, tempLocalPath]);
      await this.runAdbCommand(['shell', 'rm', tempFullScreenshot]);

      await cropImageAsync({
        imagePath: tempLocalPath,
        outputPath,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
      return outputPath;
    } finally {
      await fs.promises.rm(tempLocalPath, { force: true });
    }
  }

  private sanityCheckAsync(): void {
    try {
      const adbPath = getAdbPath();
      execFileSync(adbPath, ['version'], { encoding: 'utf-8', windowsHide: true });
    } catch (error: unknown) {
      throw new Error(`ADB is not installed: ${error}`);
    }
  }

  private runAdbCommand(args: string[]): string {
    const adbPath = getAdbPath();
    try {
      const stdout = execFileSync(adbPath, ['-s', this.deviceId, ...args], {
        encoding: 'utf-8',
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024, // 50MB for large outputs
      });
      return stdout;
    } catch (error: any) {
      const stderr = error?.stderr?.toString?.() ?? '';
      throw new Error(
        `ADB command failed: ${adbPath} -s ${this.deviceId} ${args.join(' ')}. Error: ${stderr || error.message}`
      );
    }
  }

  private async dumpViewHierarchy(): Promise<string> {
    const xmlViewHierarchy = await this.runAdbCommand([
      'exec-out',
      'uiautomator',
      'dump',
      '--compressed',
      '/dev/tty',
    ]);
    return xmlViewHierarchy;
  }

  private async findElementByResourceId(
    xmlViewHierarchy: string,
    resourceId: string
  ): Promise<ElementProperties> {
    return new Promise((resolve, reject) => {
      parseString(xmlViewHierarchy, (err, result) => {
        if (err) {
          reject(new Error(`Failed to parse XML dump: ${err}`));
          return;
        }

        const element = this.searchNodes(result.hierarchy.node, resourceId);
        if (!element) {
          reject(new Error(`Element with testID "${resourceId}" not found`));
          return;
        }

        resolve(element);
      });
    });
  }

  private searchNodes(nodes: any[] | any, resourceId: string): ElementProperties | null {
    if (!nodes) {
      return null;
    }

    const nodeArray = Array.isArray(nodes) ? nodes : [nodes];

    for (const node of nodeArray) {
      if (!node || !node.$) {
        continue;
      }

      const nodeResourceId = node.$['resource-id'];

      if (nodeResourceId === resourceId) {
        return this.parseElementProperties(node);
      }

      if (node.node) {
        const childResult = this.searchNodes(node.node, resourceId);
        if (childResult) return childResult;
      }
    }

    return null;
  }

  private parseElementProperties(node: any): ElementProperties {
    const attrs = node.$ || {};
    const boundsStr = attrs.bounds || '[0,0][0,0]';
    const boundsMatch = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);

    let bounds = { x: 0, y: 0, width: 0, height: 0 };
    if (boundsMatch) {
      const [, x1, y1, x2, y2] = boundsMatch.map(Number);
      bounds = {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
      };
    }

    return {
      resource_id: attrs['resource-id'] || '',
      bounds,
      class: attrs.class || '',
      text: attrs.text || '',
      content_desc: attrs['content-desc'] || '',
      clickable: attrs.clickable === 'true',
      enabled: attrs.enabled === 'true',
      focusable: attrs.focusable === 'true',
      focused: attrs.focused === 'true',
      scrollable: attrs.scrollable === 'true',
      selected: attrs.selected === 'true',
      checkable: attrs.checkable === 'true',
      checked: attrs.checked === 'true',
      package: attrs.package || '',
      exists: true,
    };
  }

  async swipeAsync({
    startX,
    startY,
    endX,
    endY,
  }: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }): Promise<AutomationResult<{ startX: number; startY: number; endX: number; endY: number }>> {
    const startTime = Date.now();
    try {
      await this.runAdbCommand([
        'shell',
        'input',
        'swipe',
        String(startX),
        String(startY),
        String(endX),
        String(endY),
        '300',
      ]);
      return {
        success: true,
        duration: Date.now() - startTime,
        data: { startX, startY, endX, endY },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        data: { startX, startY, endX, endY },
      };
    }
  }

  async scrollAsync(options: {
    direction: 'up' | 'down' | 'left' | 'right';
    distance?: number;
  }): Promise<AutomationResult<{ direction: string; distance: number }>> {
    const { direction, distance = 1000 } = options;
    const startTime = Date.now();
    try {
      const {
        startX,
        startY,
        endX,
        endY,
        distance: appliedDistance,
      } = this.getScrollSwipeCoordinates(direction, distance);
      await this.runAdbCommand([
        'shell',
        'input',
        'swipe',
        String(startX),
        String(startY),
        String(endX),
        String(endY),
        '300',
      ]);
      return {
        success: true,
        duration: Date.now() - startTime,
        data: { direction, distance: appliedDistance },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        data: { direction, distance },
      };
    }
  }

  async typeTextAsync(text: string): Promise<AutomationResult<{ text: string }>> {
    const startTime = Date.now();
    try {
      const cleanText = text.replace(/(\r\n|\n|\r)/gm, ' ');
      if (cleanText) {
        await this.runAdbCommand(['shell', 'input', 'text', this.escapeTextForAdbInput(cleanText)]);
      }
      return {
        success: true,
        duration: Date.now() - startTime,
        data: { text: cleanText },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        data: { text },
      };
    }
  }

  async pressKeyAsync(key: string): Promise<AutomationResult<{ key: string }>> {
    const startTime = Date.now();
    try {
      const keyEvent = KEY_EVENT_BY_NAME[key];
      if (!keyEvent) {
        throw new Error(`Unsupported key: ${key}`);
      }
      await this.runAdbCommand(['shell', 'input', 'keyevent', String(keyEvent)]);
      return {
        success: true,
        duration: Date.now() - startTime,
        data: { key },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        data: { key },
      };
    }
  }

  private getDisplaySize(): { width: number; height: number } {
    const wmSizeOutput = this.runAdbCommand(['shell', 'wm', 'size']);
    const sizeMatch = wmSizeOutput.match(/(\d+)x(\d+)/);
    if (!sizeMatch) {
      throw new Error(`Failed to parse display size from: ${wmSizeOutput}`);
    }

    const width = Number(sizeMatch[1]);
    const height = Number(sizeMatch[2]);
    return { width, height };
  }

  private getScrollSwipeCoordinates(
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number
  ): {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    distance: number;
  } {
    const { width, height } = this.getDisplaySize();
    const maxDistance = Math.floor(Math.min(width, height) * 0.8);
    const minDistance = 50;
    const safeDistance = Number.isFinite(distance) ? distance : 1000;
    const clampedDistance = Math.min(Math.max(Math.floor(safeDistance), minDistance), maxDistance);
    const halfDistance = Math.floor(clampedDistance / 2);
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    switch (direction) {
      case 'up':
        return {
          startX: centerX,
          startY: centerY + halfDistance,
          endX: centerX,
          endY: centerY - halfDistance,
          distance: clampedDistance,
        };
      case 'down':
        return {
          startX: centerX,
          startY: centerY - halfDistance,
          endX: centerX,
          endY: centerY + halfDistance,
          distance: clampedDistance,
        };
      case 'left':
        return {
          startX: centerX + halfDistance,
          startY: centerY,
          endX: centerX - halfDistance,
          endY: centerY,
          distance: clampedDistance,
        };
      case 'right':
        return {
          startX: centerX - halfDistance,
          startY: centerY,
          endX: centerX + halfDistance,
          endY: centerY,
          distance: clampedDistance,
        };
      default:
        return {
          startX: centerX,
          startY: centerY,
          endX: centerX,
          endY: centerY,
          distance: clampedDistance,
        };
    }
  }

  private escapeTextForAdbInput(text: string): string {
    return text
      .replace(/ /g, '%s')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'");
  }
}
