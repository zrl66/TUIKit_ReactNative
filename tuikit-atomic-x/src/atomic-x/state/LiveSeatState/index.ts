/**
 * @module LiveSeatState
 * @module_description
 * 直播间麦位管理模块
 * 核心功能：实现多人连麦场景下的座位控制，支持复杂的座位状态管理和音视频设备控制。
 * 技术特点：基于音视频技术，支持多路音视频流管理，提供座位锁定、设备控制、权限管理等高级功能。
 * 业务价值：为多人互动直播提供核心技术支撑，支持PK、连麦、多人游戏等丰富的互动场景。
 * 应用场景：多人连麦、主播PK、互动游戏、在线教育、会议直播等需要多人音视频互动的场景。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
  SeatInfo,
  LiveCanvasParams,
  TakeSeatOptions,
  LeaveSeatOptions,
  MuteMicrophoneOptions,
  UnmuteMicrophoneOptions,
  KickUserOutOfSeatOptions,
  MoveUserToSeatOptions,
  LockSeatOptions,
  UnlockSeatOptions,
  OpenRemoteCameraOptions,
  CloseRemoteCameraOptions,
  OpenRemoteMicrophoneOptions,
  CloseRemoteMicrophoneOptions,
} from './types';
import { liveSeatStore } from './store';

/**
 * 座位监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 座位状态事件名称常量
 */
const LIVE_SEAT_EVENTS = [
  'seatList',
  'canvas',
  'speakingUsers',
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

const DEVICE_CONTROL_POLICY_STRING_MAP: Record<string, number> = {
    'UNLOCK_ONLY': 1,
};

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
 * LiveSeatState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useLiveSeatState } from '@/src/atomic-x/state/LiveSeatState';
 * 
 * function SeatComponent() {
 *   const { 
 *     seatList, 
 *     canvas, 
 *     speakingUsers,
 *     takeSeat,
 *     leaveSeat 
 *   } = useLiveSeatState('your_live_id');
 * 
 *   const handleTakeSeat = async () => {
 *     await takeSeat({
 *       liveID: 'your_live_id',
 *       seatIndex: 1,
 *       onSuccess: () => console.log('上麦成功'),
 *       onError: (error) => console.error('上麦失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       {seatList.map((seat) => (
 *         <View key={seat.index}>
 *           <Text>座位 {seat.index}</Text>
 *           {seat.userInfo && <Text>用户: {seat.userInfo.nickname}</Text>}
 *         </View>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLiveSeatState(liveID: string) {
  // 从全局 store 获取初始状态
  const initialState = liveSeatStore.getState(liveID);

  // 座位列表状态 - 使用全局 store 的初始值
  const [seatList, setSeatList] = useState<SeatInfo[]>(initialState.seatList);

  // 画布信息状态 - 使用全局 store 的初始值
  const [canvas, setCanvas] = useState<LiveCanvasParams | null>(initialState.canvas);

  // 正在说话的用户列表状态 - 使用全局 store 的初始值
  const [speakingUsers, setSpeakingUsers] = useState<Map<string, number> | null>(initialState.speakingUsers);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = liveSeatStore.subscribe(liveID, (state) => {
      setSeatList(state.seatList);
      setCanvas(state.canvas);
      setSpeakingUsers(state.speakingUsers);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理座位状态变化事件
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


      // 检查 data 的 key 是否匹配 LIVE_SEAT_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const updates: {
          seatList?: SeatInfo[];
          canvas?: LiveCanvasParams | null;
          speakingUsers?: Map<string, number> | null;
        } = {};

        Object.keys(data).forEach((key) => {
          if (LIVE_SEAT_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'seatList') {
              // seatList 是数组类型
              let parsedData: SeatInfo[];
              if (Array.isArray(value)) {
                parsedData = value as SeatInfo[];
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<SeatInfo[]>(value, []);
              } else {
                parsedData = safeJsonParse<SeatInfo[]>(JSON.stringify(value), []);
              }
              updates.seatList = parsedData;
            } else if (key === 'canvas') {
              // canvas 可能是对象或 null
              let parsedData: LiveCanvasParams | null;
              if (value === null || value === undefined) {
                parsedData = null;
              } else if (typeof value === 'object') {
                parsedData = value as LiveCanvasParams;
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<LiveCanvasParams | null>(value, null);
              } else {
                parsedData = safeJsonParse<LiveCanvasParams | null>(JSON.stringify(value), null);
              }
              updates.canvas = parsedData;
            } else if (key === 'speakingUsers') {
              // speakingUsers 需要特殊解析为 Map
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
              updates.speakingUsers = parsedData;
            }
          }
        });

        // 批量更新全局 store（只更新一次，避免多次通知）
        if (Object.keys(updates).length > 0) {
          liveSeatStore.setState(liveID, updates);
        }
      }
    } catch (error) {
      console.error(`[LiveSeatState] ${eventName} event parse error:`, error);
      console.log(`[LiveSeatState] ${eventName} event received (raw):`, event);
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
        store: 'LiveSeatStore',
        name: eventName,
        roomID: liveID ?? null,
        listenerID: listenerID ?? null,
      };
    };

    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    LIVE_SEAT_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[LiveSeatState] Added listener for: ${eventName}, eventName=${key}`);
    });

    return () => {
      LIVE_SEAT_EVENTS.forEach((eventName) => {
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
   * 用户上麦
   * 
   * @param params - 上麦参数
   * @example
   * ```tsx
   * await takeSeat({
   *   liveID: 'your_live_id',
   *   seatIndex: 1,
   *   onSuccess: () => console.log('上麦成功'),
   *   onError: (error) => console.error('上麦失败:', error)
   * });
   * ```
   */
  const takeSeat = useCallback(async (params: TakeSeatOptions): Promise<void> => {
    // 验证必填参数
    if (params.seatIndex === undefined) {
      const error = new Error('Missing required parameter: seatIndex');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...seatParams } = params;

    try {
      const result = await callNativeAPI<void>('takeSeat', seatParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Take seat failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 用户下麦
   * 
   * @param params - 下麦参数
   * @example
   * ```tsx
   * await leaveSeat({
   *   liveID: 'your_live_id',
   *   onSuccess: () => console.log('下麦成功'),
   *   onError: (error) => console.error('下麦失败:', error)
   * });
   * ```
   */
  const leaveSeat = useCallback(async (params: LeaveSeatOptions): Promise<void> => {
    const { onSuccess, onError, ...leaveParams } = params;

    try {
      const result = await callNativeAPI<void>('leaveSeat', leaveParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Leave seat failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 静音麦克风
   * 
   * @param params - 静音参数
   * @example
   * ```tsx
   * await muteMicrophone({
   *   liveID: 'your_live_id',
   *   onSuccess: () => console.log('麦克风静音成功'),
   *   onError: (error) => console.error('麦克风静音失败:', error)
   * });
   * ```
   */
  const muteMicrophone = useCallback(async (params: MuteMicrophoneOptions): Promise<void> => {
    const { onSuccess, onError, ...muteParams } = params;

    try {
      const result = await callNativeAPI<void>('muteMicrophone', muteParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Mute microphone failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 取消静音麦克风
   * 
   * @param params - 取消静音参数
   * @example
   * ```tsx
   * await unmuteMicrophone({
   *   liveID: 'your_live_id',
   *   onSuccess: () => console.log('麦克风取消静音成功'),
   *   onError: (error) => console.error('麦克风取消静音失败:', error)
   * });
   * ```
   */
  const unmuteMicrophone = useCallback(async (params: UnmuteMicrophoneOptions): Promise<void> => {
    const { onSuccess, onError, ...unmuteParams } = params;

    try {
      const result = await callNativeAPI<void>('unmuteMicrophone', unmuteParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Unmute microphone failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 将用户踢出座位
   * 
   * @param params - 踢出参数
   * @example
   * ```tsx
   * await kickUserOutOfSeat({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   onSuccess: () => console.log('踢出用户成功'),
   *   onError: (error) => console.error('踢出用户失败:', error)
   * });
   * ```
   */
  const kickUserOutOfSeat = useCallback(async (params: KickUserOutOfSeatOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID) {
      const error = new Error('Missing required parameter: userID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...kickParams } = params;

    try {
      const result = await callNativeAPI<void>('kickUserOutOfSeat', kickParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Kick user out of seat failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 移动用户到指定座位
   * 
   * @param params - 移动参数
   * @example
   * ```tsx
   * await moveUserToSeat({
   *   liveID: 'your_live_id',
   *   fromSeatIndex: 1,
   *   toSeatIndex: 3,
   *   onSuccess: () => console.log('用户移动成功'),
   *   onError: (error) => console.error('用户移动失败:', error)
   * });
   * ```
   */
  const moveUserToSeat = useCallback(async (params: MoveUserToSeatOptions): Promise<void> => {
    // 验证必填参数
    if (params.fromSeatIndex === undefined || params.toSeatIndex === undefined) {
      const error = new Error('Missing required parameters: fromSeatIndex or toSeatIndex');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...moveParams } = params;

    try {
      const result = await callNativeAPI<void>('moveUserToSeat', moveParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Move user to seat failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 锁定座位
   * 
   * @param params - 锁定参数
   * @example
   * ```tsx
   * await lockSeat({
   *   liveID: 'your_live_id',
   *   seatIndex: 2,
   *   onSuccess: () => console.log('座位锁定成功'),
   *   onError: (error) => console.error('座位锁定失败:', error)
   * });
   * ```
   */
  const lockSeat = useCallback(async (params: LockSeatOptions): Promise<void> => {
    // 验证必填参数
    if (params.seatIndex === undefined) {
      const error = new Error('Missing required parameter: seatIndex');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...lockParams } = params;

    try {
      const result = await callNativeAPI<void>('lockSeat', lockParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Lock seat failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 解锁座位
   * 
   * @param params - 解锁参数
   * @example
   * ```tsx
   * await unlockSeat({
   *   liveID: 'your_live_id',
   *   seatIndex: 2,
   *   onSuccess: () => console.log('座位解锁成功'),
   *   onError: (error) => console.error('座位解锁失败:', error)
   * });
   * ```
   */
  const unlockSeat = useCallback(async (params: UnlockSeatOptions): Promise<void> => {
    // 验证必填参数
    if (params.seatIndex === undefined) {
      const error = new Error('Missing required parameter: seatIndex');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...unlockParams } = params;

    try {
      const result = await callNativeAPI<void>('unlockSeat', unlockParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Unlock seat failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 开启远程摄像头
   * 
   * @param params - 开启摄像头参数
   * @example
   * ```tsx
   * await openRemoteCamera({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   onSuccess: () => console.log('远程摄像头开启成功'),
   *   onError: (error) => console.error('远程摄像头开启失败:', error)
   * });
   * ```
   */
  const openRemoteCamera = useCallback(async (params: OpenRemoteCameraOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID) {
      const error = new Error('Missing required parameter: userID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, policy, ...restParams } = params;
    const cameraParams: Record<string, unknown> = {
      ...restParams,
      ...(policy && typeof policy === 'string' && { policy: DEVICE_CONTROL_POLICY_STRING_MAP[policy] ?? 1 }),
    };

    try {
      const result = await callNativeAPI<void>('openRemoteCamera', cameraParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Open remote camera failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 关闭远程摄像头
   * 
   * @param params - 关闭摄像头参数
   * @example
   * ```tsx
   * await closeRemoteCamera({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   onSuccess: () => console.log('远程摄像头关闭成功'),
   *   onError: (error) => console.error('远程摄像头关闭失败:', error)
   * });
   * ```
   */
  const closeRemoteCamera = useCallback(async (params: CloseRemoteCameraOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID) {
      const error = new Error('Missing required parameter: userID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...cameraParams } = params;

    try {
      const result = await callNativeAPI<void>('closeRemoteCamera', cameraParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Close remote camera failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 开启远程麦克风
   * 
   * @param params - 开启麦克风参数
   * @example
   * ```tsx
   * await openRemoteMicrophone({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   policy: 'UNLOCK_ONLY',
   *   onSuccess: () => console.log('远程麦克风开启成功'),
   *   onError: (error) => console.error('远程麦克风开启失败:', error)
   * });
   * ```
   */
  const openRemoteMicrophone = useCallback(async (params: OpenRemoteMicrophoneOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID) {
      const error = new Error('Missing required parameter: userID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, policy, ...restParams } = params;
    const micParams: Record<string, unknown> = {
      ...restParams,
      ...(policy && { policy: DEVICE_CONTROL_POLICY_STRING_MAP[policy] ?? 1 }),
    };

    try {
      const result = await callNativeAPI<void>('openRemoteMicrophone', micParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Open remote microphone failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 关闭远程麦克风
   * 
   * @param params - 关闭麦克风参数
   * @example
   * ```tsx
   * await closeRemoteMicrophone({
   *   liveID: 'your_live_id',
   *   userID: 'user123',
   *   onSuccess: () => console.log('远程麦克风关闭成功'),
   *   onError: (error) => console.error('远程麦克风关闭失败:', error)
   * });
   * ```
   */
  const closeRemoteMicrophone = useCallback(async (params: CloseRemoteMicrophoneOptions): Promise<void> => {
    // 验证必填参数
    if (!params.userID) {
      const error = new Error('Missing required parameter: userID');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...micParams } = params;

    try {
      const result = await callNativeAPI<void>('closeRemoteMicrophone', micParams);

      if (result.success) {
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Close remote microphone failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 添加座位事件监听
   * 
   * @param eventName - 事件名称，可选值: 'onLocalCameraOpenedByAdmin'(本地摄像头被管理员开启)<br>'onLocalCameraClosedByAdmin'(本地摄像头被管理员关闭)<br>'onLocalMicrophoneOpenedByAdmin'(本地麦克风被管理员开启)<br>'onLocalMicrophoneClosedByAdmin'(本地麦克风被管理员关闭)
   * @param listener - 事件处理函数
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addLiveSeatEventListener('onLocalCameraOpenedByAdmin', (params) => {
   *   console.log('本地摄像头被管理员开启:', params);
   * });
   * ```
   */
  const addLiveSeatEventListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'LiveSeatStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, [liveID]);

  /**
   * 移除座位事件监听
   * 
   * @param eventName - 事件名称，可选值: 'onLocalCameraOpenedByAdmin'(本地摄像头被管理员开启)<br>'onLocalCameraClosedByAdmin'(本地摄像头被管理员关闭)<br>'onLocalMicrophoneOpenedByAdmin'(本地麦克风被管理员开启)<br>'onLocalMicrophoneClosedByAdmin'(本地麦克风被管理员关闭)
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeLiveSeatEventListener('onLocalCameraOpenedByAdmin');
   * ```
   */
  const removeLiveSeatEventListener = useCallback((eventName: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'LiveSeatStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, [liveID]);

  return {
    seatList,                    // 座位列表
    canvas,                      // 画布信息
    speakingUsers,               // 正在说话的用户列表
    takeSeat,                    // 用户上麦
    leaveSeat,                   // 用户下麦
    muteMicrophone,              // 静音麦克风
    unmuteMicrophone,            // 取消静音麦克风
    kickUserOutOfSeat,           // 将用户踢出座位
    moveUserToSeat,              // 移动用户到指定座位
    lockSeat,                    // 锁定座位
    unlockSeat,                  // 解锁座位
    openRemoteCamera,            // 开启远程摄像头
    closeRemoteCamera,           // 关闭远程摄像头
    openRemoteMicrophone,        // 开启远程麦克风
    closeRemoteMicrophone,       // 关闭远程麦克风
    addLiveSeatEventListener,    // 添加座位事件监听
    removeLiveSeatEventListener,  // 移除座位事件监听
  };
}

export default useLiveSeatState;


