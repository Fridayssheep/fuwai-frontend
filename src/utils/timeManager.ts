import { reactive, readonly } from 'vue';
import { setSystemCurrentTime } from '../api/system';
import type { SystemCurrentTimeRequest } from '../api/system';

interface TimeState {
  isCustomTime: boolean;
  timeOffset: number; // 与真实时间的毫秒差值
  timezone: string | null;
}

const STORAGE_KEY = 'fw_time_manager_state';

const loadState = (): TimeState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch { }
  }
  return { isCustomTime: false, timeOffset: 0, timezone: null };
};

const state = reactive<TimeState>(loadState());

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

/**
 * 获取当前时间字符串
 * 开启自定义时间时，根据差值返回算好的推演时间；未开启则返回真实系统时间。
 */
export const getCurrentTimeString = (): string => {
  if (!state.isCustomTime) {
    const d = new Date();
    // 原生返回类似 2026-04-10T10:00:00.000Z，或者基于时区返回带偏移的串
    return d.toISOString();
  }
  return new Date(Date.now() + state.timeOffset).toISOString();
};

/**
 * 设置自定义时间起点，从此刻起开始自行向后推演走动。
 * @param customTime ISO 格式的时间字符串 (例如 '2026-04-10T10:00:00Z')
 * @param timezone 时区 (例如 'Asia/Shanghai')
 */
export const startCustomTime = (customTime: string, timezone: string | null = null) => {
  const targetTime = new Date(customTime).getTime();
  const now = Date.now();
  state.isCustomTime = true;
  state.timeOffset = targetTime - now;
  state.timezone = timezone;
  saveState();
};

/**
 * 恢复为默认真实环境时间。
 */
export const resetToNaturalTime = () => {
  state.isCustomTime = false;
  state.timeOffset = 0;
  state.timezone = null;
  saveState();
};

/**
 * 同步时间给后端。
 * 在请求数据图表前可调用，告知后端最新的有效基准时间。
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
    console.error('前端虚拟时间同步至后端失败:', error);
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
