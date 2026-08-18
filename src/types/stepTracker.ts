export interface DailyStepData {
  date: string;
  steps: number;
  calories: number;
  distance: number;
  lastSensorValue: number;
}

export interface StepTrackerInitResult {
  success: boolean;
  message: string;
  hasStepCounter: boolean;
  hasAccelerometer: boolean;
  totalSensors: number;
  stepCounterSensors: number;
  accelerometerSensors: number;
  stepCounterName?: string;
  stepCounterVendor?: string;
  accelerometerName?: string;
  accelerometerVendor?: string;
}

export interface StepTrackerModule {
  initializeTracker(): Promise<StepTrackerInitResult>;
  startTracking(): Promise<string>;
  stopTracking(): Promise<string>;
  getTodayData(): Promise<DailyStepData>;
  getDataByDate(date: string): Promise<DailyStepData>;
  getDataByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<DailyStepData[]>;
  resetTodayData(): Promise<string>;
  getSensorStatus(): Promise<any>;
  getAllDatabaseData(): Promise<DailyStepData[]>;
}

export interface StepDataUpdateEvent {
  steps: number;
  calories: number;
  distance: number;
}
