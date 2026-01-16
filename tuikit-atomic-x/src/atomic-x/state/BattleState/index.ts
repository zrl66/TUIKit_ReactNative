/**
 * @module BattleState
 * @module_description
 * 直播 PK 管理模块
 * 核心功能：处理主播间的PK对战流程，包括PK请求、接受、拒绝、退出等完整的PK管理功能。
 * 技术特点：支持实时PK状态同步、分数统计、PK时长控制、结果计算等高级功能。
 * 业务价值：为直播平台提供丰富的互动玩法，增加主播收益和用户粘性。
 * 应用场景：主播PK、对战直播、分数统计、互动游戏等娱乐互动场景。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
  BattleInfoParam,
  SeatUserInfoParam,
  RequestBattleOptions,
  CancelBattleRequestOptions,
  AcceptBattleOptions,
  RejectBattleOptions,
  ExitBattleOptions,
} from './types';
import { battleStore } from './store';

/**
 * PK 监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * PK 状态事件名称常量
 */
const BATTLE_EVENTS = [
  'currentBattleInfo',
  'battleUsers',
  'battleScore',
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
 * 解析 Map 类型（从 JSON 对象或数组转换为 Map）
 */
function parseMapFromJson(json: string): Map<string, number> | null {
  try {
    if (!json || typeof json !== 'string') {
      return null;
    }
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    // 如果是数组格式 [["key", value], ...]
    if (Array.isArray(parsed)) {
      const map = new Map<string, number>();
      parsed.forEach(([key, value]: [string, number]) => {
        if (typeof key === 'string' && typeof value === 'number') {
          map.set(key, value);
        }
      });
      return map;
    }
    // 如果是对象格式 { "key": value, ... }
    const map = new Map<string, number>();
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === 'number') {
        map.set(key, value);
      }
    });
    return map;
  } catch (error) {
    console.error('parseMapFromJson error:', error);
    return null;
  }
}

/**
 * BattleState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useBattleState } from '@/src/atomic-x/state/BattleState';
 * 
 * function BattleComponent() {
 *   const { 
 *     currentBattleInfo,
 *     battleUsers,
 *     battleScore,
 *     requestBattle,
 *     acceptBattle 
 *   } = useBattleState('your_live_id');
 * 
 *   const handleRequestBattle = async () => {
 *     await requestBattle({
 *       liveID: 'your_live_id',
 *       userIDList: ['target_user_id'],
 *       timeout: 10,
 *       onSuccess: (battleInfo) => console.log('PK 请求成功:', battleInfo),
 *       onError: (error) => console.error('PK 请求失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       {currentBattleInfo && <Text>PK ID: {currentBattleInfo.battleID}</Text>}
 *       <Text>PK 用户数: {battleUsers.length}</Text>
 *       <Button onPress={handleRequestBattle} title="请求 PK" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useBattleState(liveID: string) {
  // 从全局 store 获取初始状态
  const initialState = battleStore.getState(liveID);

  // 当前 PK 信息 - 使用全局 store 的初始值
  const [currentBattleInfo, setCurrentBattleInfo] = useState<BattleInfoParam | null>(initialState.currentBattleInfo);

  // PK 用户列表 - 使用全局 store 的初始值
  const [battleUsers, setBattleUsers] = useState<SeatUserInfoParam[]>(initialState.battleUsers);

  // PK 分数映射 - 使用全局 store 的初始值
  const [battleScore, setBattleScore] = useState<Map<string, number> | null>(initialState.battleScore);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = battleStore.subscribe(liveID, (state) => {
      setCurrentBattleInfo(state.currentBattleInfo);
      setBattleUsers(state.battleUsers);
      setBattleScore(state.battleScore);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理 PK 状态变化事件
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

      console.log(`[BattleState] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 BATTLE_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const updates: {
          currentBattleInfo?: BattleInfoParam | null;
          battleUsers?: SeatUserInfoParam[];
          battleScore?: Map<string, number> | null;
        } = {};

        Object.keys(data).forEach((key) => {
          if (BATTLE_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'currentBattleInfo') {
              // currentBattleInfo 可能是对象或 null
              let parsedData: BattleInfoParam | null;
              if (value === null || value === undefined) {
                parsedData = null;
              } else if (typeof value === 'object') {
                parsedData = value as BattleInfoParam;
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<BattleInfoParam | null>(value, null);
              } else {
                parsedData = safeJsonParse<BattleInfoParam | null>(JSON.stringify(value), null);
              }
              updates.currentBattleInfo = parsedData;
            } else if (key === 'battleUsers') {
              // battleUsers 是数组类型
              let parsedData: SeatUserInfoParam[];
              if (Array.isArray(value)) {
                parsedData = value as SeatUserInfoParam[];
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<SeatUserInfoParam[]>(value, []);
              } else {
                parsedData = safeJsonParse<SeatUserInfoParam[]>(JSON.stringify(value), []);
              }
              updates.battleUsers = parsedData;
            } else if (key === 'battleScore') {
              // battleScore 需要特殊解析为 Map
              let parsedData: Map<string, number> | null;
              if (value === null || value === undefined) {
                parsedData = null;
              } else if (value instanceof Map) {
                parsedData = value;
              } else if (typeof value === 'string') {
                parsedData = parseMapFromJson(value);
              } else {
                parsedData = parseMapFromJson(JSON.stringify(value));
              }
              updates.battleScore = parsedData;
            }
          }
        });

        // 批量更新全局 store（只更新一次，避免多次通知）
        if (Object.keys(updates).length > 0) {
          battleStore.setState(liveID, updates);
        }
      }
    } catch (error) {
      console.error(`[BattleState] ${eventName} event parse error:`, error);
      console.log(`[BattleState] ${eventName} event received (raw):`, event);
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
        store: 'BattleStore',
        name: eventName,
        roomID: liveID ?? null,
        listenerID: listenerID ?? null,
      };
    };

    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    BATTLE_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[BattleState] Added listener for: ${eventName}, eventName=${key}`);
    });

    return () => {
      BATTLE_EVENTS.forEach((eventName) => {
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
   * 请求 PK
   * 
   * @param params - 请求 PK 参数
   * @example
   * ```tsx
   * await requestBattle({
   *   liveID: 'your_live_id',
   *   userIDList: ['target_user_id'],
   *   timeout: 10,
   *   config: {
   *     duration: 300,
   *     needResponse: true,
   *   },
   *   onSuccess: (battleInfo) => console.log('PK 请求成功:', battleInfo),
   *   onError: (error) => console.error('PK 请求失败:', error)
   * });
   * ```
   */
  const requestBattle = useCallback(async (params: RequestBattleOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.userIDList || params.userIDList.length === 0) {
      const error = new Error('Missing required parameters: liveID or userIDList');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...battleParams } = params;

    try {
      const result = await callNativeAPI<BattleInfoParam>('requestBattle', battleParams);

      if (result.success) {
        // 成功时触发回调，状态更新由事件监听器处理
        onSuccess?.(result.data, result.data);
      } else {
        const error = new Error(result.error || 'Request battle failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 取消 PK 请求
   * 
   * @param params - 取消 PK 请求参数
   * @example
   * ```tsx
   * await cancelBattleRequest({
   *   liveID: 'your_live_id',
   *   battleID: 'battle_id',
   *   userIDList: ['target_user_id'],
   *   onSuccess: () => console.log('取消 PK 请求成功'),
   *   onError: (error) => console.error('取消 PK 请求失败:', error)
   * });
   * ```
   */
  const cancelBattleRequest = useCallback(async (params: CancelBattleRequestOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.battleID || !params.userIDList || params.userIDList.length === 0) {
      const error = new Error('Missing required parameters: liveID, battleID or userIDList');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...cancelParams } = params;

    try {
      const result = await callNativeAPI<void>('cancelBattleRequest', cancelParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Cancel battle request failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 接受 PK
   * 
   * @param params - 接受 PK 参数
   * @example
   * ```tsx
   * await acceptBattle({
   *   liveID: 'your_live_id',
   *   battleID: 'battle_id',
   *   onSuccess: () => console.log('接受 PK 成功'),
   *   onError: (error) => console.error('接受 PK 失败:', error)
   * });
   * ```
   */
  const acceptBattle = useCallback(async (params: AcceptBattleOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.battleID) {
      const error = new Error('Missing required parameters: liveID or battleID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...acceptParams } = params;

    try {
      const result = await callNativeAPI<void>('acceptBattle', acceptParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Accept battle failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 拒绝 PK
   * 
   * @param params - 拒绝 PK 参数
   * @example
   * ```tsx
   * await rejectBattle({
   *   liveID: 'your_live_id',
   *   battleID: 'battle_id',
   *   onSuccess: () => console.log('拒绝 PK 成功'),
   *   onError: (error) => console.error('拒绝 PK 失败:', error)
   * });
   * ```
   */
  const rejectBattle = useCallback(async (params: RejectBattleOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.battleID) {
      const error = new Error('Missing required parameters: liveID or battleID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...rejectParams } = params;

    try {
      const result = await callNativeAPI<void>('rejectBattle', rejectParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Reject battle failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 退出 PK
   * 
   * @param params - 退出 PK 参数
   * @example
   * ```tsx
   * await exitBattle({
   *   liveID: 'your_live_id',
   *   battleID: 'battle_id',
   *   onSuccess: () => console.log('退出 PK 成功'),
   *   onError: (error) => console.error('退出 PK 失败:', error)
   * });
   * ```
   */
  const exitBattle = useCallback(async (params: ExitBattleOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.battleID) {
      const error = new Error('Missing required parameters: liveID or battleID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...exitParams } = params;

    try {
      const result = await callNativeAPI<void>('exitBattle', exitParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Exit battle failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 添加 PK 事件监听器
   * 
   * @param eventName - 事件名称，可选值: 'onBattleStarted'(PK 开始)<br>'onBattleEnded'(PK 结束)<br>'onUserJoinBattle'(当前有用户加入 PK 对战)<br>'onUserExitBattle'(当前有用户退出 PK 对战)<br>'onBattleRequestReceived'(收到 PK 请求)<br>'onBattleRequestCancelled'(取消 PK 请求)<br>'onBattleRequestTimeout'(当前 PK 对战请求超时)<br>'onBattleRequestAccept'(当前 PK 对战请求被接受)<br>'onBattleRequestReject'(当前 PK 对战请求被拒绝)
   * @param listener - 事件处理函数
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addBattleListener('onBattleStarted', (params) => {
   *   console.log('PK 已开始:', params);
   * });
   * ```
   */
  const addBattleListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'BattleStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, [liveID]);

  /**
   * 移除 PK 事件监听器
   * 
   * @param eventName - 事件名称，可选值: 'onBattleStarted'(PK 开始)<br>'onBattleEnded'(PK 结束)<br>'onUserJoinBattle'(当前有用户加入 PK 对战)<br>'onUserExitBattle'(当前有用户退出 PK 对战)<br>'onBattleRequestReceived'(收到 PK 请求)<br>'onBattleRequestCancelled'(取消 PK 请求)<br>'onBattleRequestTimeout'(当前 PK 对战请求超时)<br>'onBattleRequestAccept'(当前 PK 对战请求被接受)<br>'onBattleRequestReject'(当前 PK 对战请求被拒绝)
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeBattleListener('onBattleStarted');
   * ```
   */
  const removeBattleListener = useCallback((eventName: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'BattleStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, [liveID]);

  return {
    currentBattleInfo,      // 当前 PK 信息
    battleUsers,            // PK 用户列表
    battleScore,            // PK 分数映射
    requestBattle,          // 请求 PK
    cancelBattleRequest,    // 取消 PK 请求
    acceptBattle,           // 接受 PK
    rejectBattle,           // 拒绝 PK
    exitBattle,             // 退出 PK
    addBattleListener,      // 添加 PK 事件监听
    removeBattleListener,   // 移除 PK 事件监听
  };
}

export default useBattleState;

