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

  const [audienceCount, setAudienceCount] = useState<number>(0);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = liveAudienceStore.subscribe(liveID, (state) => {
      setAudienceList(state.audienceList);
      const displayCount = state.audienceCount >= 100 
        ? state.audienceCount 
        : state.audienceList.length;
      setAudienceCount(displayCount);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

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


