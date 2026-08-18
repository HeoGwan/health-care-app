type SensorObserver = {
  next?: (_value: { x: number; y: number; z: number }) => void;
};

type SensorSubscriber =
  | SensorObserver
  | ((_value: { x: number; y: number; z: number }) => void);

const emptySubscription = {
  unsubscribe() {},
};

const webAccelerometer = {
  pipe() {
    return this;
  },
  subscribe(_subscriber?: SensorSubscriber) {
    return emptySubscription;
  },
};

export const accelerometer = webAccelerometer;

export const SensorTypes = {
  accelerometer: 'accelerometer',
} as const;

export function setUpdateIntervalForType(
  _sensorType: string,
  _interval: number,
) {}
