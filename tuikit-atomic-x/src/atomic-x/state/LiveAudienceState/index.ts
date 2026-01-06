/**
 * @module LiveAudienceState
 * @module_description
 * 直播间观众状态管理模块
 * 核心功能：管理直播间观众列表，提供观众权限控制、管理员设置等直播间秩序维护功能。
 * 技术特点：支持实时观众列表更新、权限分级管理、批量操作等高级功能，确保直播间秩序和用户体验。
 * 业务价值：为直播平台提供完整的观众管理解决方案，支持大规模观众场景下的秩序维护。
 * 应用场景：观众管理、权限控制、直播间秩序维护、观众互动管理等核心业务场景。
 */

import { useState, useEffect, useCallback } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
  LiveUserInfoParam,
  FetchAudienceListOptions,
  SetAdministratorOptions,
  RevokeAdministratorOptions,
  KickUserOutOfRoomOptions,
  DisableSendMessageOptions,
} from './types';
import { liveAudienceStore } from './store';

/**
 * 观众监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 观众状态事件名称常量
 */
const LIVE_AUDIENCE_EVENTS = [
  'audienceList',
  'audienceCount',
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
 * LiveAudienceState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useLiveAudienceState } from '@/src/atomic-x/state/LiveAudienceState';
 * 
 * function AudienceComponent() {
 *   const { 
 *     audienceList, 
 *     audienceCount, 
 *     fetchAudienceList,
 *     setAdministrator 
 *   } = useLiveAudienceState('your_live_id');
 * 
 *   useEffect(() => {
 *     fetchAudienceList();
 *   }, []);
 * 
 *   return (
 *     <View>
 *       <Text>观众数量: {audienceCount}</Text>
 *       {audienceList.map((audience) => (
 *         <Text key={audience.userID}>{audience.nickname}</Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLiveAudienceState(liveID: string) {
  // 从全局 store 获取初始状态
  const initialState = liveAudienceStore.getState(liveID);

  // 观众列表状态 - 使用全局 store 的初始值
  const [audienceList, setAudienceList] = useState<LiveUserInfoParam[]>(initialState.audienceList);

  // 观众数量状态 - 使用全局 store 的初始值
  const [audienceCount, setAudienceCount] = useState<number>(initialState.audienceCount);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = liveAudienceStore.subscribe(liveID, (state) => {
      setAudienceList(state.audienceList);
      setAudienceCount(state.audienceCount);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理观众状态变化事件
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

      console.log(`[LiveAudienceState] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 LIVE_AUDIENCE_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const updates: { audienceList?: LiveUserInfoParam[]; audienceCount?: number } = {};

        Object.keys(data).forEach((key) => {
          if (LIVE_AUDIENCE_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'audienceList') {
              // audienceList 是数组类型
              let parsedData: LiveUserInfoParam[];
              if (Array.isArray(value)) {
                // 如果已经是数组，直接使用
                parsedData = value as LiveUserInfoParam[];
              } else if (typeof value === 'string') {
                // 如果是字符串，需要解析
                parsedData = safeJsonParse<LiveUserInfoParam[]>(value, []);
              } else {
                // 其他情况，尝试 JSON 序列化后解析
                parsedData = safeJsonParse<LiveUserInfoParam[]>(JSON.stringify(value), []);
              }
              updates.audienceList = parsedData;
            } else if (key === 'audienceCount') {
              // audienceCount 是数字类型
              const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
              updates.audienceCount = parsedData;
            }
          }
        });

        // 批量更新全局 store（只更新一次，避免多次通知）
        if (Object.keys(updates).length > 0) {
          liveAudienceStore.setState(liveID, updates);
        }
      }
    } catch (error) {
      console.error(`[LiveAudienceState] ${eventName} event parse error:`, error);
      console.log(`[LiveAudienceState] ${eventName} event received (raw):`, event);
    }
  }, [liveID]);

  /**
   * 绑定事件监听
   */
  useEffect(() => {
    if (!liveID) {
      return;
    }

    const createListenerKeyObject = (eventName: string, listenerID?: string | null): HybridListenerKey => {
      return {
        type: 'state',
        store: 'LiveAudienceStore',
        name: eventName,
        roomID: liveID ?? null,
        listenerID: listenerID ?? null,
      };
    };

    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    LIVE_AUDIENCE_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[LiveAudienceState] Added listener for: ${eventName}, eventName=${key}`);
    });

    // 清理函数：组件卸载时移除所有监听器
    return () => {
      LIVE_AUDIENCE_EVENTS.forEach((eventName) => {
        const keyObject = createListenerKeyObject(eventName);
        const key = JSON.stringify(keyObject);
        removeListener(key);
      });
      // 同时清理 JS 层的订阅
      cleanupFunctions.forEach((cleanup) => {
        cleanup.remove();
      });
    };
  }, [handleEvent, liveID]);

  /**
   * 获取直播间观众列表
   * 
   * @param params - 获取观众列表参数（可选）
   * @example
   * ```tsx
   * await fetchAudienceList({
   *   liveID: 'your_live_id',
   *   onSuccess: () => console.log('获取观众列表成功'),
   *   onError: (error) => console.error('获取观众列表失败:', error)
   * });
   * ```
   */
  const fetchAudienceList = useCallback(async (params?: FetchAudienceListOptions): Promise<void> => {
    const { onSuccess, onError, ...fetchParams } = params || {};

    try {
      const result = await callNativeAPI<LiveUserInfoParam[]>('fetchAudienceList', fetchParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Fetch audience list failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 设置管理员
   * 
   * @param params - 设置管理员参数
   * @example
   * ```tsx
   * await setAdministrator({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   onSuccess: () => console.log('设置管理员成功'),
   *   onError: (error) => console.error('设置管理员失败:', error)
   * });
   * ```
   */
  const setAdministrator = useCallback(async (params: SetAdministratorOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID) {
      const error = new Error('Missing required parameter: userID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...adminParams } = params;

    try {
      const result = await callNativeAPI<void>('setAdministrator', adminParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Set administrator failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 撤销管理员权限
   * 
   * @param params - 撤销管理员参数
   * @example
   * ```tsx
   * await revokeAdministrator({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   onSuccess: () => console.log('撤销管理员成功'),
   *   onError: (error) => console.error('撤销管理员失败:', error)
   * });
   * ```
   */
  const revokeAdministrator = useCallback(async (params: RevokeAdministratorOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID) {
      const error = new Error('Missing required parameter: userID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...revokeParams } = params;

    try {
      const result = await callNativeAPI<void>('revokeAdministrator', revokeParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Revoke administrator failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 将用户踢出直播间
   * 
   * @param params - 踢出用户参数
   * @example
   * ```tsx
   * await kickUserOutOfRoom({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   onSuccess: () => console.log('踢出用户成功'),
   *   onError: (error) => console.error('踢出用户失败:', error)
   * });
   * ```
   */
  const kickUserOutOfRoom = useCallback(async (params: KickUserOutOfRoomOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID) {
      const error = new Error('Missing required parameter: userID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...kickParams } = params;

    try {
      const result = await callNativeAPI<void>('kickUserOutOfRoom', kickParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Kick user out of room failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 禁用用户发送消息
   * 
   * @param params - 禁用发送消息参数
   * @example
   * ```tsx
   * await disableSendMessage({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   isDisable: true,
   *   onSuccess: () => console.log('禁用发送消息成功'),
   *   onError: (error) => console.error('禁用发送消息失败:', error)
   * });
   * ```
   */
  const disableSendMessage = useCallback(async (params: DisableSendMessageOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID || params.isDisable === undefined) {
      const error = new Error('Missing required parameters: userID or isDisable');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...disableParams } = params;

    try {
      const result = await callNativeAPI<void>('disableSendMessage', disableParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Disable send message failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 添加观众事件监听
   * 
   * @param eventName - 事件名称，可选值: 'onAudienceJoined'(观众加入)<br>'onAudienceLeft'(观众离开)
   * @param listener - 事件回调函数
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addAudienceListener('onAudienceJoined', (params) => {
   *   console.log('观众加入:', params);
   * });
   * ```
   */
  const addAudienceListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'LiveAudienceStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, [liveID]);

  /**
   * 移除观众事件监听
   * 
   * @param eventName - 事件名称，可选值: 'onAudienceJoined'(观众加入)<br>'onAudienceLeft'(观众离开)
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeAudienceListener('onAudienceJoined');
   * ```
   */
  const removeAudienceListener = useCallback((eventName: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'LiveAudienceStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, [liveID]);

  return {
    audienceList,              // 直播间观众列表
    audienceCount,             // 直播间观众数量
    fetchAudienceList,          // 获取观众列表
    setAdministrator,          // 设置管理员
    revokeAdministrator,       // 撤销管理员权限
    kickUserOutOfRoom,         // 将用户踢出直播间
    disableSendMessage,         // 禁用用户发送消息
    addAudienceListener,       // 添加观众事件监听
    removeAudienceListener,     // 移除观众事件监听
  };
}

export default useLiveAudienceState;


