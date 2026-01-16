/**
 * @module LiveListState
 * @module_description
 * 直播列表状态管理模块
 * 核心功能：管理直播间的完整生命周期，包括创建、加入、离开、结束等核心业务流程。
 * 技术特点：支持分页加载、实时状态同步、直播信息动态更新，采用响应式数据管理，确保UI与数据状态实时同步。
 * 业务价值：为直播平台提供核心的直播间管理能力，支持大规模并发直播场景，是直播业务的基础设施。
 * 应用场景：直播列表展示、直播间创建、直播状态管理、直播数据统计等核心业务场景。
 */

import { useState, useEffect, useCallback } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
  LiveInfoParam,
  FetchLiveListOptions,
  CreateLiveOptions,
  JoinLiveOptions,
  LeaveLiveOptions,
  EndLiveOptions,
  UpdateLiveInfoOptions,
  CallExperimentalAPIOptions,
  ILiveListener,
} from './types';
import { validateRequired } from '../../utils';
import { liveListStore } from './store';

/**
 * 直播列表事件名称常量
 */
const LIVE_LIST_EVENTS = [
  'liveList',
  'liveListCursor',
  'currentLive',
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
 * LiveListState Hook
 * 
 * @example
 * ```tsx
 * import { useLiveListState } from '@/src/atomic-x/state/LiveListState';
 * 
 * function LiveListComponent() {
 *   const { liveList, liveListCursor, currentLive, fetchLiveList, createLive } = useLiveListState();
 * 
 *   useEffect(() => {
 *     fetchLiveList({ cursor: '', count: 20 });
 *   }, []);
 * 
 *   return (
 *     <View>
 *       {liveList.map((live) => (
 *         <Text key={live.liveID}>{live.title}</Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLiveListState() {
  // 从全局 store 获取初始快照，确保后挂载组件也能拿到已有列表与 currentLive
  const initialState = liveListStore.getState();

  // 直播列表数据（由全局 store 驱动）
  const [liveList, setLiveList] = useState<LiveInfoParam[]>(initialState.liveList);

  // 直播列表游标，用于分页加载（由全局 store 驱动）
  const [liveListCursor, setLiveListCursor] = useState<string>(initialState.liveListCursor);

  // 当前直播信息（由全局 store 驱动）
  const [currentLive, setCurrentLive] = useState<LiveInfoParam | null>(initialState.currentLive);

  // 事件监听器引用

  // 直播列表事件监听器映射
  type WritableMap = Record<string, unknown>;



  /**
   * 处理直播状态变化事件
   */
  const handleEvent = useCallback((eventName: string) => (event: WritableMap) => {
    try {
      // 如果 event 已经是对象，直接使用；否则尝试解析
      const data = event && typeof event === 'object' && !Array.isArray(event)
        ? event
        : typeof event === 'string'
          ? JSON.parse(event)
          : event;

      console.log(`[LivePage] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 LIVE_LIST_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        Object.keys(data).forEach((key) => {
          if (LIVE_LIST_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'liveList') {
              // liveList 是数组类型
              let parsedData: LiveInfoParam[];
              if (Array.isArray(value)) {
                parsedData = value as LiveInfoParam[];
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<LiveInfoParam[]>(value, []);
              } else {
                parsedData = safeJsonParse<LiveInfoParam[]>(JSON.stringify(value), []);
              }
              // 更新全局 store，由 store 统一驱动所有 hook 实例
              liveListStore.setState({ liveList: parsedData });
            } else if (key === 'liveListCursor') {
              // liveListCursor 是字符串类型
              let parsedData: string;
              if (typeof value === 'string') {
                parsedData = value;
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<string>(value, '');
              } else {
                parsedData = safeJsonParse<string>(JSON.stringify(value), '');
              }
              liveListStore.setState({ liveListCursor: parsedData });
            } else if (key === 'currentLive') {
              // currentLive 可能是对象或 null
              let parsedData: LiveInfoParam | null;
              if (value === null || value === undefined) {
                parsedData = null;
              } else if (typeof value === 'object') {
                parsedData = value as LiveInfoParam;
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<LiveInfoParam | null>(value, null);
              } else {
                parsedData = safeJsonParse<LiveInfoParam | null>(JSON.stringify(value), null);
              }
              liveListStore.setState({ currentLive: parsedData });
            }
          }
        });
      }
    } catch (error) {
      console.error(`[LivePage] ${eventName} event parse error:`, error);
      console.log(`[LivePage] ${eventName} event received (raw):`, event);
    }
  }, []);


  /**
   * 绑定事件监听
   */
  useEffect(() => {
    const createListenerKeyObject = (eventName: string, listenerID?: string | null): HybridListenerKey => {
      return {
        type: 'state',
        store: 'LiveListStore',
        name: eventName,
        roomID: null,
        listenerID: listenerID ?? null,
      };
    };

    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    LIVE_LIST_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[LivePage] Added listener for: ${eventName}, eventName=${key}`);
    });

    return () => {
      LIVE_LIST_EVENTS.forEach((eventName) => {
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
   * 订阅全局 liveListStore 的变化，驱动本地 state
   * 确保多个页面之间共享同一份 liveList / currentLive / cursor
   */
  useEffect(() => {
    const unsubscribe = liveListStore.subscribe((state) => {
      setLiveList(state.liveList);
      setLiveListCursor(state.liveListCursor);
      setCurrentLive(state.currentLive);
    });
    return unsubscribe;
  }, []);

  /**
   * 获取直播列表
   *
   * @param params - 获取参数
   * @example
   * ```tsx
   * await fetchLiveList({ cursor: '', count: 20 });
   * ```
   */
  const fetchLiveList = useCallback(async (params: FetchLiveListOptions): Promise<void> => {
    // 提取回调函数
    const { onSuccess, onError, ...fetchParams } = params;

    try {
      const result = await callNativeAPI<{ list: LiveInfoParam[]; cursor?: string }>('fetchLiveList', fetchParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Fetch live list failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 创建直播间
   *
   * @param params - 创建参数
   * @example
   * ```tsx
   * await createLive({ liveID: 'your_live_id',  title: 'my live', coverUrl: 'https://example.com/cover.jpg' });
   * ```
   */
  const createLive = useCallback(async (params: CreateLiveOptions): Promise<void> => {
    // 提取回调函数
    const { onSuccess, onError, ...createParams } = params;

    try {
      const result = await callNativeAPI<LiveInfoParam>('createLive', createParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Create live failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 加入直播间
   *
   * @param params - 加入参数
   * @example
   * ```tsx
   * await joinLive({ liveID: 'host_live_id' });
   * ```
   */
  const joinLive = useCallback(async (params: JoinLiveOptions): Promise<void> => {
    // 验证必填参数
    const validation = validateRequired(params, ['liveID']);
    if (!validation.valid) {
      const error = new Error(`Missing required parameters: ${validation.missing?.join(', ')}`);
      params.onError?.(error);
      return;
    }

    // 提取回调函数
    const { onSuccess, onError, ...joinParams } = params;

    try {
      const result = await callNativeAPI<LiveInfoParam>('joinLive', joinParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Join live failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 离开直播间
   *
   * @param params - 离开参数（可选）
   * @example
   * ```tsx
   * await leaveLive();
   * ```
   */
  const leaveLive = useCallback(async (params?: LeaveLiveOptions): Promise<void> => {
    const { onSuccess, onError, ...leaveParams } = params || {};

    try {
      const result = await callNativeAPI<void>('leaveLive', leaveParams);

      if (result.success) {
        // 成功时触发回调，并清理全局 LiveListStore 状态
        liveListStore.clearState();
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Leave live failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 结束直播
   *
   * @param params - 结束参数（可选）
   * @example
   * ```tsx
   * await endLive();
   * ```
   */
  const endLive = useCallback(async (params?: EndLiveOptions): Promise<void> => {
    const { onSuccess, onError, ...endParams } = params || {};

    try {
      const result = await callNativeAPI<void>('endLive', endParams);

      if (result.success) {
        // 成功时触发回调，并清理全局 LiveListStore 状态
        liveListStore.clearState();
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'End live failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 更新直播信息
   *
   * @param params - 更新参数
   * @example
   * ```tsx
   * await updateLiveInfo({ liveID: 'your_live_id', title: 'new title' });
   * ```
   */
  const updateLiveInfo = useCallback(async (params: UpdateLiveInfoOptions): Promise<void> => {
    // 验证必填参数
    const validation = validateRequired(params, ['liveID']);
    if (!validation.valid) {
      const error = new Error(`Missing required parameters: ${validation.missing?.join(', ')}`);
      params.onError?.(error);
      return;
    }

    // 提取回调函数
    const { onSuccess, onError, ...updateParams } = params;

    try {
      const result = await callNativeAPI<LiveInfoParam>('updateLiveInfo', updateParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Update live info failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 调用实验性 API
   *
   * @param params - 实验性 API 参数
   * @example
   * ```tsx
   * callExperimentalAPI({
   *   api: 'experimentalMethod',
   *   params: { key: 'value' },
   *   onResponse: (res) => console.log('Response:', res)
   * });
   * ```
   */
  const callExperimentalAPI = useCallback(async (params: CallExperimentalAPIOptions): Promise<void> => {
    const defaultCallback = {
      onResponse: (res?: string) => {
        console.log('onExperimentalAPIResponse: ', res);
      },
    };

    const finalParams = {
      ...params,
      onResponse: params.onResponse || defaultCallback.onResponse,
    };

    console.log('callExperimentalAPI', finalParams);

    try {
      const result = await callNativeAPI<unknown>('callExperimentalAPI', finalParams);
      if (result.success && finalParams.onResponse) {
        const responseStr = result.data ? JSON.stringify(result.data) : undefined;
        finalParams.onResponse(responseStr);
      }
    } catch (error: any) {
      console.error('callExperimentalAPI error:', error);
    }
  }, []);

  /**
   * 添加直播列表事件监听
   *
   * @param eventName - 事件名称，可选值: 'onLiveEnded'(直播结束)<br>'onKickedOutOfLive'(被踢出直播间)
   * @param listener - 事件回调函数
   * @example
   * ```tsx
   * addLiveListListener('onLiveEnded', {
   *   callback: (params) => {
   *     console.log('result:', params);
   *   }
   * });
   * ```
   */
  const addLiveListListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject = {
      type: 'state',
      store: 'LiveListStore',
      name: eventName,
      roomID: null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, []);

  /**
   * 移除直播列表事件监听
   *
   * @param eventName - 事件名称，可选值: 'onLiveEnded'(直播结束)<br>'onKickedOutOfLive'(被踢出直播间)
   * @param listener - 事件回调函数
   * @example
   * ```tsx
   * removeLiveListListener('onLiveEnded', liveEndedListener);
   * ```
   */
  const removeLiveListListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject = {
      type: 'state',
      store: 'LiveListStore',
      name: eventName,
      roomID: null,
      listenerID: listenerID ?? null,
    };

    removeListener(JSON.stringify(createListenerKeyObject));

  }, []);



  return {
    liveList,               // 直播列表数据
    liveListCursor,         // 直播列表分页游标
    currentLive,            // 当前直播信息

    fetchLiveList,          // 获取直播列表
    createLive,             // 创建直播
    joinLive,               // 加入直播
    leaveLive,              // 离开直播
    endLive,                // 结束直播
    updateLiveInfo,         // 更新直播信息
    callExperimentalAPI,    // 调用实验性 API

    addLiveListListener,    // 添加事件监听
    removeLiveListListener, // 移除事件监听
  };
}

export default useLiveListState;
