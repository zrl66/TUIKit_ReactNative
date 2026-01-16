/**
 * @module CoHostState
 * @module_description
 * 连线主播管理模块
 * 核心功能：实现主播间的连线功能，支持主播邀请、连线申请、连线状态管理等主播间互动功能。
 * 技术特点：支持多主播音视频同步、画中画显示、音视频质量优化等高级技术，确保连线体验的流畅性。
 * 业务价值：为直播平台提供主播间协作的核心能力，支持PK、合作直播等高级业务场景。
 * 应用场景：主播连线、合作直播、跨平台连线、主播互动等高级直播场景。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import { coHostStore } from './store';
import type {
  LiveUserInfoParam,
  RequestHostConnectionOptions,
  CancelHostConnectionOptions,
  AcceptHostConnectionOptions,
  RejectHostConnectionOptions,
  ExitHostConnectionOptions,
} from './types';
import { CoHostStatus } from './types';

/**
 * 连线监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 连线状态事件名称常量
 */
const CO_HOST_EVENTS = [
  'connected',
  'invitees',
  'applicant',
  'candidates',
  'coHostStatus',
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
 * CoHostState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useCoHostState } from '@/src/atomic-x/state/CoHostState';
 * 
 * function CoHostComponent() {
 *   const { 
 *     connected, 
 *     invitees, 
 *     applicant,
 *     requestHostConnection,
 *     acceptHostConnection 
 *   } = useCoHostState('your_live_id');
 * 
 *   const handleRequestConnection = async () => {
 *     await requestHostConnection({
 *       liveID: 'your_live_id',
 *       onSuccess: () => console.log('请求连线成功'),
 *       onError: (error) => console.error('请求连线失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       <Text>已连接主播: {connected.length}</Text>
 *       {applicant && <Text>申请主播: {applicant.nickname}</Text>}
 *       <Button onPress={handleRequestConnection} title="请求连线" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useCoHostState(liveID: string) {
  // 从全局 store 获取初始状态
  const initialState = coHostStore.getState(liveID);

  // 已连接的连线主播列表 - 使用全局 store 的初始值
  const [connected, setConnected] = useState<LiveUserInfoParam[]>(initialState.connected);

  // 被邀请连线的主播列表 - 使用全局 store 的初始值
  const [invitees, setInvitees] = useState<LiveUserInfoParam[]>(initialState.invitees);

  // 当前申请连线的主播信息 - 使用全局 store 的初始值
  const [applicant, setApplicant] = useState<LiveUserInfoParam | undefined>(initialState.applicant);

  // 可邀请连线的候选主播列表 - 使用全局 store 的初始值
  const [candidates, setCandidates] = useState<LiveUserInfoParam[]>(initialState.candidates);

  // 当前连线状态 - 使用全局 store 的初始值
  const [coHostStatus, setCoHostStatus] = useState<CoHostStatus>(initialState.coHostStatus);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = coHostStore.subscribe(liveID, (state) => {
      setConnected(state.connected);
      setInvitees(state.invitees);
      setApplicant(state.applicant);
      setCandidates(state.candidates);
      setCoHostStatus(state.coHostStatus);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理连线状态变化事件
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

      console.log(`[CoHostState] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 CO_HOST_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const updates: {
          connected?: LiveUserInfoParam[];
          invitees?: LiveUserInfoParam[];
          applicant?: LiveUserInfoParam | undefined;
          candidates?: LiveUserInfoParam[];
          coHostStatus?: CoHostStatus;
        } = {};

        Object.keys(data).forEach((key) => {
          if (CO_HOST_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'connected') {
              // connected 是数组类型
              let parsedData: LiveUserInfoParam[];
              if (Array.isArray(value)) {
                parsedData = value as LiveUserInfoParam[];
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<LiveUserInfoParam[]>(value, []);
              } else {
                parsedData = safeJsonParse<LiveUserInfoParam[]>(JSON.stringify(value), []);
              }
              updates.connected = parsedData;
            } else if (key === 'invitees') {
              // invitees 是数组类型
              let parsedData: LiveUserInfoParam[];
              if (Array.isArray(value)) {
                parsedData = value as LiveUserInfoParam[];
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<LiveUserInfoParam[]>(value, []);
              } else {
                parsedData = safeJsonParse<LiveUserInfoParam[]>(JSON.stringify(value), []);
              }
              updates.invitees = parsedData;
            } else if (key === 'applicant') {
              // applicant 可能是对象或 null
              let parsedData: LiveUserInfoParam | undefined;
              if (value === null || value === undefined) {
                parsedData = undefined;
              } else if (typeof value === 'object') {
                parsedData = value as LiveUserInfoParam;
              } else if (typeof value === 'string') {
                const parsed = safeJsonParse<LiveUserInfoParam | null>(value, null);
                parsedData = parsed || undefined;
              } else {
                const parsed = safeJsonParse<LiveUserInfoParam | null>(JSON.stringify(value), null);
                parsedData = parsed || undefined;
              }
              updates.applicant = parsedData;
            } else if (key === 'candidates') {
              // candidates 是数组类型
              let parsedData: LiveUserInfoParam[];
              if (Array.isArray(value)) {
                parsedData = value as LiveUserInfoParam[];
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<LiveUserInfoParam[]>(value, []);
              } else {
                parsedData = safeJsonParse<LiveUserInfoParam[]>(JSON.stringify(value), []);
              }
              updates.candidates = parsedData;
            } else if (key === 'coHostStatus') {
              // coHostStatus 是枚举类型
              const numValue = typeof value === 'number' ? value : (Number(value) || CoHostStatus.DISCONNECTED);
              const parsedData = isNaN(numValue) ? CoHostStatus.DISCONNECTED : (numValue as CoHostStatus);
              updates.coHostStatus = parsedData;
            }
          }
        });

        // 批量更新全局 store（只更新一次，避免多次通知）
        if (Object.keys(updates).length > 0) {
          coHostStore.setState(liveID, updates);
        }
      }
    } catch (error) {
      console.error(`[CoHostState] ${eventName} event parse error:`, error);
      console.log(`[CoHostState] ${eventName} event received (raw):`, event);
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
        store: 'CoHostStore',
        name: eventName,
        roomID: liveID ?? null,
        listenerID: listenerID ?? null,
      };
    };

    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    CO_HOST_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[CoHostState] Added listener for: ${eventName}, eventName=${key}`);
    });

    return () => {
      CO_HOST_EVENTS.forEach((eventName) => {
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
   * 请求连线
   * 
   * @param params - 请求连线参数
   * @example
   * ```tsx
   * await requestHostConnection({
   *   liveID: 'your_live_id',
   *   onSuccess: () => console.log('请求连线成功'),
   *   onError: (error) => console.error('请求连线失败:', error)
   * });
   * ```
   */
  const requestHostConnection = useCallback(async (params: RequestHostConnectionOptions): Promise<void> => {
    const { onSuccess, onError, ...requestParams } = params;

    try {
      const result = await callNativeAPI<void>('requestHostConnection', requestParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Request host connection failed');
        (error as any).code = result.code;
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 取消连线请求
   * 
   * @param params - 取消连线请求参数
   * @example
   * ```tsx
   * await cancelHostConnection({
   *   liveID: 'your_live_id',
   *   toHostLiveID: 'target_live_id',
   *   onSuccess: () => console.log('取消连线请求成功'),
   *   onError: (error) => console.error('取消连线请求失败:', error)
   * });
   * ```
   */
  const cancelHostConnection = useCallback(async (params: CancelHostConnectionOptions): Promise<void> => {
    const { onSuccess, onError, ...cancelParams } = params;

    try {
      const result = await callNativeAPI<void>('cancelHostConnection', cancelParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Cancel host connection failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 接受连线请求
   * 
   * @param params - 接受连线请求参数
   * @example
   * ```tsx
   * await acceptHostConnection({
   *   liveID: 'your_live_id',
   *   fromHostLiveID: 'from_live_id',
   *   onSuccess: () => console.log('接受连线请求成功'),
   *   onError: (error) => console.error('接受连线请求失败:', error)
   * });
   * ```
   */
  const acceptHostConnection = useCallback(async (params: AcceptHostConnectionOptions): Promise<void> => {
    // 验证必填参数
    if (!params.fromHostLiveID) {
      const error = new Error('Missing required parameter: fromHostLiveID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...acceptParams } = params;

    try {
      const result = await callNativeAPI<void>('acceptHostConnection', acceptParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Accept host connection failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 拒绝连线请求
   * 
   * @param params - 拒绝连线请求参数
   * @example
   * ```tsx
   * await rejectHostConnection({
   *   liveID: 'your_live_id',
   *   fromHostLiveID: 'from_live_id',
   *   onSuccess: () => console.log('拒绝连线请求成功'),
   *   onError: (error) => console.error('拒绝连线请求失败:', error)
   * });
   * ```
   */
  const rejectHostConnection = useCallback(async (params: RejectHostConnectionOptions): Promise<void> => {
    // 验证必填参数
    if (!params.fromHostLiveID) {
      const error = new Error('Missing required parameter: fromHostLiveID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...rejectParams } = params;

    try {
      const result = await callNativeAPI<void>('rejectHostConnection', rejectParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Reject host connection failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 退出连线
   * 
   * @param params - 退出连线参数（可选）
   * @example
   * ```tsx
   * await exitHostConnection({
   *   liveID: 'your_live_id',
   *   onSuccess: () => console.log('退出连线成功'),
   *   onError: (error) => console.error('退出连线失败:', error)
   * });
   * ```
   */
  const exitHostConnection = useCallback(async (params?: ExitHostConnectionOptions): Promise<void> => {
    const { onSuccess, onError, ...exitParams } = params || {};

    try {
      const result = await callNativeAPI<void>('exitHostConnection', exitParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Exit host connection failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 添加连线主播事件监听
   * 
   * @param eventName - 事件名称，可选值: 'onCoHostRequestReceived'(收到连线请求)<br>'onCoHostRequestCancelled'(连线请求被取消)<br>'onCoHostRequestAccepted'(连线请求被接受)<br>'onCoHostRequestRejected'(连线请求被拒绝)<br>'onCoHostRequestTimeout'(连线请求超时)<br>'onCoHostUserJoined'(连线用户加入)<br>'onCoHostUserLeft'(连线用户离开)
   * @param listener - 事件回调函数
   * @param liveID - 直播间ID（可选，如果传入则使用传入的，否则使用 hook 中的 liveID）
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addCoHostListener('onCoHostRequestReceived', (params) => {
   *   console.log('收到连线请求:', params);
   * });
   * ```
   */
  const addCoHostListener = useCallback((eventName: string, listener: ILiveListener, liveIDParam?: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'CoHostStore',
      name: eventName,
      roomID: liveIDParam ?? liveID ?? null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, [liveID]);

  /**
   * 移除连线主播事件监听
   * 
   * @param eventName - 事件名称，可选值: 'onCoHostRequestReceived'(收到连线请求)<br>'onCoHostRequestCancelled'(连线请求被取消)<br>'onCoHostRequestAccepted'(连线请求被接受)<br>'onCoHostRequestRejected'(连线请求被拒绝)<br>'onCoHostRequestTimeout'(连线请求超时)<br>'onCoHostUserJoined'(连线用户加入)<br>'onCoHostUserLeft'(连线用户离开)
   * @param liveID - 直播间ID（可选，如果传入则使用传入的，否则使用 hook 中的 liveID）
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeCoHostListener('onCoHostRequestReceived');
   * ```
   */
  const removeCoHostListener = useCallback((eventName: string, liveIDParam?: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'CoHostStore',
      name: eventName,
      roomID: liveIDParam ?? liveID ?? null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, [liveID]);

  return {
    coHostStatus,            // 当前连线状态
    connected,               // 已连接的连线主播列表
    invitees,                // 被邀请连线的主播列表
    applicant,               // 当前申请连线的主播信息
    candidates,              // 可邀请连线的候选主播列表
    requestHostConnection,   // 请求连线
    cancelHostConnection,    // 取消连线请求
    acceptHostConnection,    // 接受连线请求
    rejectHostConnection,    // 拒绝连线请求
    exitHostConnection,      // 退出连线
    addCoHostListener,       // 添加连线事件监听
    removeCoHostListener,    // 移除连线事件监听
  };
}

export default useCoHostState;


