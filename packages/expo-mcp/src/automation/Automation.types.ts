export interface AutomationResult<TData extends Record<string, any>> {
  success: boolean;
  error?: string;
  duration: number;
  data: TData;
  /** verbose output when `verbose` is `true` */
  verboseOutput?: string;
}

export interface AutomationConstructorParamsBase {
  appId: string;
  deviceId: string;
  verbose?: boolean;
}

export interface IAutomation {
  tapAsync({ x, y }: { x: number; y: number }): Promise<AutomationResult<any>>;
  takeFullScreenshotAsync({ outputPath }: { outputPath: string }): Promise<string>;

  findViewByTestIDAsync(testID: string): Promise<AutomationResult<any>>;
  tapByTestIDAsync(testID: string): Promise<AutomationResult<any>>;
  taksScreenshotByTestIDAsync({
    testID,
    outputPath,
  }: {
    testID: string;
    outputPath: string;
  }): Promise<string>;

  swipeAsync({
    startX,
    startY,
    endX,
    endY,
  }: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }): Promise<AutomationResult<any>>;

  scrollAsync(options: {
    direction: 'up' | 'down' | 'left' | 'right';
    distance?: number;
  }): Promise<AutomationResult<any>>;

  typeTextAsync(text: string): Promise<AutomationResult<any>>;

  pressKeyAsync(key: string): Promise<AutomationResult<any>>;
}

export type AutomationContext = {
  automation: IAutomation;
  platform: 'android' | 'ios';
  deviceId: string;
  appId: string;
};
