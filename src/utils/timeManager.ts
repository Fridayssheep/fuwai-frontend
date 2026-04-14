import { reactive, readonly } from 'vue';
import { setSystemCurrentTime } from '../api/system';
import type { SystemCurrentTimeRequest } from '../api/system';

interface TimeState {
  isCustomTime: boolean;
  timeOffset: number; // Offset from the natural Date.now()
  timezone: string | null;
}

const state = reactive<TimeState>({
  isCustomTime: false,
  timeOffset: 0,
  timezone: null,
});

/**
 * Get the current time string.
 * If custom time is enabled, returns the advanced fake time.
 * If disabled, returns the actual browser system time.
 */
export const getCurrentTimeString = (): string => {
  if (!state.isCustomTime) {
    return new Date().toISOString();
  }
  const fakeTimeMillis = Date.now() + state.timeOffset;
  return new Date(fakeTimeMillis).toISOString();
};

/**
 * Sets a custom time locally. The clock will tick automatically from this new time.
 * @param customTime ISO string representing the custom time (e.g. '2026-04-10T10:00:00Z')
 * @param timezone The timezone identifier, e.g. 'Asia/Shanghai'
 */
export const startCustomTime = (customTime: string, timezone: string | null = null) => {
  const targetTime = new Date(customTime).getTime();
  const now = Date.now();
  state.isCustomTime = true;
  state.timeOffset = targetTime - now;
  state.timezone = timezone;
};

/**
 * Resets the application's clock to the natural browser system clock.
 */
export const resetToNaturalTime = () => {
  state.isCustomTime = false;
  state.timeOffset = 0;
  state.timezone = null;
};

/**
 * Syncs the currently calculated time to the backend.
 * This should be called before making any critical requests or periodically,
 * to ensure the backend uses the same customized 'now' as the frontend.
 */
export const syncTimeToBackend = async () => {
  const payload: SystemCurrentTimeRequest = {
    use_current_time: !state.isCustomTime,
    current_time: state.isCustomTime ? getCurrentTimeString() : null,
    timezone: state.timezone,
  };
  
  try {
    const response = await setSystemCurrentTime(payload);
    return response;
  } catch (error) {
    console.error('Failed to sync custom time to backend:', error);
    throw error;
  }
};

export const useTimeManager = () => {
  return {
    state: readonly(state),
    getCurrentTimeString,
    startCustomTime,
    resetToNaturalTime,
    syncTimeToBackend,
  };
};
