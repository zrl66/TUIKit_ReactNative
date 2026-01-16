/**
 * @module BaseBeautyState
 * @module_description
 * 基础美颜管理模块
 * 核心功能：提供磨皮、美白、红润等基础美颜效果调节，支持实时美颜参数调整。
 * 技术特点：支持实时美颜处理、参数平滑调节、性能优化等高级技术。
 * 业务价值：为直播平台提供基础的美颜能力，提升用户形象和直播质量。
 * 应用场景：美颜直播、形象优化、美颜调节、直播美化等需要美颜功能的场景。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
  SetSmoothLevelOptions,
  SetWhitenessLevelOptions,
  SetRuddyLevelOptions,
  RealUiValues,
  BeautyType,
} from './types';
import { baseBeautyStore } from './store';

/**
 * 美颜监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 美颜状态事件名称常量
 */
const BEAUTY_EVENTS = [
  'smoothLevel',
  'whitenessLevel',
  'ruddyLevel',
];

/**
 * 安全解析 JSON
 */
function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    if (!json || typeof json !== 'string') {
      return defaultValue;
    }
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('safeJsonParse error:', error);
    return defaultValue;
  }
}

/**
 * BaseBeautyState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useBaseBeautyState } from '@/src/atomic-x/state/BaseBeautyState';
 * 
 * function BeautyComponent() {
 *   const { 
 *     smoothLevel,
 *     whitenessLevel,
 *     ruddyLevel,
 *     setSmoothLevel,
 *     setWhitenessLevel 
 *   } = useBaseBeautyState('your_live_id');
 * 
 *   const handleSetSmooth = async () => {
 *     await setSmoothLevel({
 *       smoothLevel: 5,
 *       onSuccess: () => console.log('设置成功'),
 *       onError: (error) => console.error('设置失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       <Text>磨皮级别: {smoothLevel}</Text>
 *       <Text>美白级别: {whitenessLevel}</Text>
 *       <Text>红润级别: {ruddyLevel}</Text>
 *       <Button onPress={handleSetSmooth} title="设置磨皮" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useBaseBeautyState(liveID: string) {
  // 从全局 store 获取初始状态
  const initialState = baseBeautyStore.getState(liveID);

  // 磨皮级别 取值范围[0,9]: 0 表示关闭，9 表示效果最明显 - 使用全局 store 的初始值
  const [smoothLevel, setSmoothLevelState] = useState<number>(initialState.smoothLevel);

  // 美白级别 取值范围[0,9]: 0 表示关闭，9 表示效果最明显 - 使用全局 store 的初始值
  const [whitenessLevel, setWhitenessLevelState] = useState<number>(initialState.whitenessLevel);

  // 红润级别 取值范围[0,9]: 0 表示关闭，9 表示效果最明显 - 使用全局 store 的初始值
  const [ruddyLevel, setRuddyLevelState] = useState<number>(initialState.ruddyLevel);

  // 真实 UI 值（从全局 store 获取初始值，确保持久化）
  const [realUiValues, setRealUiValues] = useState<RealUiValues>(initialState.realUiValues);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = baseBeautyStore.subscribe(liveID, (state) => {
      setSmoothLevelState(state.smoothLevel);
      setWhitenessLevelState(state.whitenessLevel);
      setRuddyLevelState(state.ruddyLevel);
      // 同步 realUiValues 从全局 store
      setRealUiValues(state.realUiValues);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理美颜状态变化事件
   * 更新全局 store，store 会自动通知所有订阅者
   */
  const handleEvent = useCallback((eventName: string) => (event: WritableMap) => {
    try {
      // 如果 event 已经是对象，直接使用；否则尝试解析
      const data = event && typeof event === 'object' && !Array.isArray(event)
        ? event
        : typeof event === 'string'
          ? JSON.parse(event)
          : event;

      console.log(`[BaseBeautyState] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 BEAUTY_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const updates: {
          smoothLevel?: number;
          whitenessLevel?: number;
          ruddyLevel?: number;
        } = {};

        Object.keys(data).forEach((key) => {
          if (BEAUTY_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'smoothLevel') {
              // smoothLevel 是数字类型
              const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
              updates.smoothLevel = parsedData;
            } else if (key === 'whitenessLevel') {
              // whitenessLevel 是数字类型
              const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
              updates.whitenessLevel = parsedData;
            } else if (key === 'ruddyLevel') {
              // ruddyLevel 是数字类型
              const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
              updates.ruddyLevel = parsedData;
            }
          }
        });

        // 批量更新全局 store（只更新一次，避免多次通知）
        if (Object.keys(updates).length > 0) {
          baseBeautyStore.setState(liveID, updates);
        }
      }
    } catch (error) {
      console.error(`[BaseBeautyState] ${eventName} event parse error:`, error);
      console.log(`[BaseBeautyState] ${eventName} event received (raw):`, event);
    }
  }, [liveID]);

  /**
   * 绑定事件监听
   */
  useEffect(() => {
    const createListenerKeyObject = (eventName: string, listenerID?: string | null): HybridListenerKey => {
      return {
        type: 'state',
        store: 'BaseBeautyStore',
        name: eventName,
        roomID: null,
        listenerID: listenerID ?? null,
      };
    };

    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    BEAUTY_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[BaseBeautyState] Added listener for: ${eventName}, eventName=${key}`);
    });

    return () => {
      BEAUTY_EVENTS.forEach((eventName) => {
        const keyObject = createListenerKeyObject(eventName);
        const key = JSON.stringify(keyObject);
        removeListener(key);
      });
      // 同时清理 JS 层的订阅
      cleanupFunctions.forEach((cleanup) => {
        cleanup.remove();
      });
    };
  }, [handleEvent]);

  /**
   * 设置磨皮级别
   * 
   * @param params - 磨皮参数，取值范围[0,9]: 0 表示关闭，9 表示效果最明显
   * @example
   * ```tsx
   * await setSmoothLevel({
   *   smoothLevel: 5,
   *   onSuccess: () => console.log('设置成功'),
   *   onError: (error) => console.error('设置失败:', error)
   * });
   * ```
   */
  const setSmoothLevel = useCallback(async (params: SetSmoothLevelOptions): Promise<void> => {
    // 验证必填参数
    if (params.smoothLevel === undefined || params.smoothLevel === null) {
      const error = new Error('Missing required parameter: smoothLevel');
      params.onError?.(error);
      return;
    }

    // 验证取值范围
    if (params.smoothLevel < 0 || params.smoothLevel > 9) {
      const error = new Error('smoothLevel must be between 0 and 9');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...smoothParams } = params;

    try {
      const result = await callNativeAPI<void>('setSmoothLevel', smoothParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Set smooth level failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 设置美白级别
   * 
   * @param params - 美白参数，取值范围[0,9]: 0 表示关闭，9 表示效果最明显
   * @example
   * ```tsx
   * await setWhitenessLevel({
   *   whitenessLevel: 6,
   *   onSuccess: () => console.log('设置成功'),
   *   onError: (error) => console.error('设置失败:', error)
   * });
   * ```
   */
  const setWhitenessLevel = useCallback(async (params: SetWhitenessLevelOptions): Promise<void> => {
    // 验证必填参数
    if (params.whitenessLevel === undefined) {
      const error = new Error('Missing required parameter: whitenessLevel');
      params.onError?.(error);
      return;
    }

    // 验证取值范围
    if (params.whitenessLevel < 0 || params.whitenessLevel > 9) {
      const error = new Error('whitenessLevel must be between 0 and 9');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...whitenessParams } = params;

    try {
      const result = await callNativeAPI<void>('setWhitenessLevel', whitenessParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Set whiteness level failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 设置红润级别
   * 
   * @param params - 红润参数，取值范围[0,9]: 0 表示关闭，9 表示效果最明显
   * @example
   * ```tsx
   * await setRuddyLevel({
   *   ruddyLevel: 4,
   *   onSuccess: () => console.log('设置成功'),
   *   onError: (error) => console.error('设置失败:', error)
   * });
   * ```
   */
  const setRuddyLevel = useCallback(async (params: SetRuddyLevelOptions): Promise<void> => {
    // 验证必填参数
    if (params.ruddyLevel === undefined) {
      const error = new Error('Missing required parameter: ruddyLevel');
      params.onError?.(error);
      return;
    }

    // 验证取值范围
    if (params.ruddyLevel < 0 || params.ruddyLevel > 9) {
      const error = new Error('ruddyLevel must be between 0 and 9');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...ruddyParams } = params;

    try {
      const result = await callNativeAPI<void>('setRuddyLevel', ruddyParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Set ruddy level failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 设置真实 UI 值
   * 同时更新组件本地状态和全局 store，确保持久化
   * 
   * @param type - 美颜类型
   * @param value - 值
   * @example
   * ```tsx
   * setRealUiValue('smooth', 5);
   * ```
   */
  const setRealUiValue = useCallback((type: BeautyType, value: number): void => {
    setRealUiValues((prev) => {
      const newValues = {
        ...prev,
        [type]: value,
      };
      // 同步更新到全局 store，确保持久化
      baseBeautyStore.setState(liveID, { realUiValues: newValues });
      return newValues;
    });
  }, [liveID]);

  /**
   * 获取真实 UI 值
   * 
   * @param type - 美颜类型
   * @returns 真实 UI 值
   * @example
   * ```tsx
   * const value = getRealUiValue('smooth');
   * ```
   */
  const getRealUiValue = useCallback((type: BeautyType): number => {
    return realUiValues[type];
  }, [realUiValues]);

  /**
   * 重置真实 UI 值
   * 同时重置组件本地状态和全局 store
   * 
   * @example
   * ```tsx
   * resetRealUiValues();
   * ```
   */
  const resetRealUiValues = useCallback((): void => {
    const resetValues = {
      whiteness: 0,
      smooth: 0,
      ruddy: 0,
    };
    setRealUiValues(resetValues);
    // 同步重置到全局 store
    baseBeautyStore.setState(liveID, { realUiValues: resetValues });
  }, [liveID]);

  /**
   * 添加美颜事件监听
   *
   * @param eventName - 事件名称
   * @param listener - 事件回调函数
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addBeautyListener('onBeautyLevelChanged', (params) => {
   *   console.log('美颜级别变化:', params);
   * });
   * ```
   */
  const addBeautyListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'BaseBeautyStore',
      name: eventName,
      roomID: null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, []);

  /**
   * 移除美颜事件监听
   *
   * @param eventName - 事件名称
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeBeautyListener('onBeautyLevelChanged');
   * ```
   */
  const removeBeautyListener = useCallback((eventName: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'BaseBeautyStore',
      name: eventName,
      roomID: null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, []);

  return {
    smoothLevel,         // 磨皮级别状态
    whitenessLevel,      // 美白级别状态
    ruddyLevel,          // 红润级别状态
    setSmoothLevel,      // 设置磨皮级别方法
    setWhitenessLevel,   // 设置美白级别方法
    setRuddyLevel,       // 设置红润级别方法
    realUiValues,        // 真实 UI 值
    setRealUiValue,      // 设置真实 UI 值方法
    getRealUiValue,      // 获取真实 UI 值方法
    resetRealUiValues,   // 重置真实 UI 值方法
    addBeautyListener,   // 添加美颜事件监听
    removeBeautyListener, // 移除美颜事件监听
  };
}

export default useBaseBeautyState;

