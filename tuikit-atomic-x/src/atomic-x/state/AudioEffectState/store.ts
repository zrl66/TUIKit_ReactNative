/**
 * AudioEffectState Store
 * 单例模式全局状态存储，解决状态隔离问题
 */

import type { AudioChangerTypeParam, AudioReverbTypeParam } from './types';

/**
 * 单个直播间的音效状态
 */
interface AudioEffectState {
  isEarMonitorOpened: boolean;
  earMonitorVolume: number;
  audioChangerType: AudioChangerTypeParam;
  audioReverbType: AudioReverbTypeParam;
}

/**
 * 状态变化监听器
 */
type StateChangeListener = (state: AudioEffectState) => void;

/**
 * 全局状态存储
 * 按 liveID 索引，每个直播间有独立的状态
 */
class AudioEffectStore {
  private static instance: AudioEffectStore;
  private states: Map<string, AudioEffectState> = new Map();
  private listeners: Map<string, Set<StateChangeListener>> = new Map();

  private constructor() {}

  static getInstance(): AudioEffectStore {
    if (!AudioEffectStore.instance) {
      AudioEffectStore.instance = new AudioEffectStore();
    }
    return AudioEffectStore.instance;
  }

  /**
   * 获取指定直播间的状态
   */
  getState(liveID: string): AudioEffectState {
    if (!this.states.has(liveID)) {
      this.states.set(liveID, {
        isEarMonitorOpened: false,
        earMonitorVolume: 0,
        audioChangerType: 'NONE',
        audioReverbType: 'NONE',
      });
    }
    return this.states.get(liveID)!;
  }

  /**
   * 更新指定直播间的状态
   */
  setState(liveID: string, updates: Partial<AudioEffectState>): void {
    const currentState = this.getState(liveID);
    const newState: AudioEffectState = {
      ...currentState,
      ...updates,
    };
    this.states.set(liveID, newState);

    // 通知所有订阅者
    this.notifyListeners(liveID, newState);
  }

  /**
   * 订阅状态变化
   */
  subscribe(liveID: string, listener: StateChangeListener): () => void {
    if (!this.listeners.has(liveID)) {
      this.listeners.set(liveID, new Set());
    }
    this.listeners.get(liveID)!.add(listener);

    // 立即通知当前状态
    listener(this.getState(liveID));

    // 返回取消订阅函数
    return () => {
      const liveListeners = this.listeners.get(liveID);
      if (liveListeners) {
        liveListeners.delete(listener);
        if (liveListeners.size === 0) {
          this.listeners.delete(liveID);
        }
      }
    };
  }

  /**
   * 通知所有订阅者
   */
  private notifyListeners(liveID: string, state: AudioEffectState): void {
    const liveListeners = this.listeners.get(liveID);
    if (liveListeners) {
      liveListeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error('[AudioEffectStore] Listener error:', error);
        }
      });
    }
  }

  /**
   * 清理指定直播间的状态
   */
  clearState(liveID: string): void {
    this.states.delete(liveID);
    this.listeners.delete(liveID);
  }

  /**
   * 清理所有状态
   */
  clearAll(): void {
    this.states.clear();
    this.listeners.clear();
  }
}

export const audioEffectStore = AudioEffectStore.getInstance();

