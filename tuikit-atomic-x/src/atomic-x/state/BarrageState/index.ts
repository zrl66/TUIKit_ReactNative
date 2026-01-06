/**
 * @module BarrageState
 * @module_description
 * 弹幕管理管理模块
 * 核心功能：处理直播间内的文本消息、自定义消息等弹幕功能，支持弹幕发送、消息状态同步等。
 * 技术特点：支持高并发消息处理、实时消息同步、消息过滤、表情包支持等高级功能。
 * 业务价值：为直播平台提供核心的互动能力，增强用户参与度和直播氛围。
 * 应用场景：弹幕互动、消息管理、表情包、聊天室等社交互动场景。
 */

import { useState, useEffect, useCallback } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
  BarrageParam,
  SendTextMessageOptions,
  SendCustomMessageOptions,
  AppendLocalTipOptions,
} from './types';
import { barrageStore } from './store';

/**
 * 弹幕监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 弹幕状态事件名称常量
 */
const BARRAGE_EVENTS = [
  'messageList',
  'allowSendMessage',
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
 * BarrageState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useBarrageState } from '@/src/atomic-x/state/BarrageState';
 * 
 * function BarrageComponent() {
 *   const { 
 *     messageList, 
 *     allowSendMessage,
 *     sendTextMessage,
 *     appendLocalTip 
 *   } = useBarrageState('your_live_id');
 * 
 *   const handleSendMessage = async () => {
 *     await sendTextMessage({
 *       liveID: 'your_live_id',
 *       text: 'Hello World',
 *       onSuccess: () => console.log('发送成功'),
 *       onError: (error) => console.error('发送失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       {messageList.map((msg, index) => (
 *         <Text key={index}>{msg.text}</Text>
 *       ))}
 *       <Button 
 *         onPress={handleSendMessage} 
 *         title="发送消息" 
 *         disabled={!allowSendMessage}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useBarrageState(liveID: string) {
  // 从全局 store 获取初始状态
  const initialState = barrageStore.getState(liveID);

  // 当前房间的弹幕消息列表 - 使用全局 store 的初始值
  const [messageList, setMessageList] = useState<BarrageParam[]>(initialState.messageList);

  // 是否允许发送消息 - 使用全局 store 的初始值
  const [allowSendMessage, setAllowSendMessage] = useState<boolean>(initialState.allowSendMessage);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = barrageStore.subscribe(liveID, (state) => {
      setMessageList(state.messageList);
      setAllowSendMessage(state.allowSendMessage);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理弹幕状态变化事件
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

      console.log(`[BarrageState] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 BARRAGE_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const updates: {
          messageList?: BarrageParam[];
          allowSendMessage?: boolean;
        } = {};

        Object.keys(data).forEach((key) => {
          if (BARRAGE_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'messageList') {
              // messageList 是数组类型
              let parsedData: BarrageParam[];
              if (Array.isArray(value)) {
                parsedData = value as BarrageParam[];
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<BarrageParam[]>(value, []);
              } else {
                parsedData = safeJsonParse<BarrageParam[]>(JSON.stringify(value), []);
              }
              updates.messageList = parsedData;
            } else if (key === 'allowSendMessage') {
              const parsedData = typeof value === 'boolean' ? value : Boolean(value);
              updates.allowSendMessage = parsedData;
            }
          }
        });

        // 批量更新全局 store（只更新一次，避免多次通知）
        if (Object.keys(updates).length > 0) {
          barrageStore.setState(liveID, updates);
        }
      }
    } catch (error) {
      console.error(`[BarrageState] ${eventName} event parse error:`, error);
      console.log(`[BarrageState] ${eventName} event received (raw):`, event);
    }
  }, [liveID]);

  /**
   * 绑定事件监听
   */
  useEffect(() => {
    const createListenerKeyObject = (eventName: string, listenerID?: string | null): HybridListenerKey => {
      return {
        type: 'state',
        store: 'BarrageStore',
        name: eventName,
        roomID: liveID ?? null,
        listenerID: listenerID ?? null,
      };
    };
    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    BARRAGE_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[BarrageState] Added listener for: ${eventName}, eventName=${key}`);
    });

    // 清理函数：组件卸载时移除所有监听器
    return () => {
      BARRAGE_EVENTS.forEach((eventName) => {
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
   * 发送文本类型弹幕
   * 
   * @param params - 发送文本弹幕参数
   * @example
   * ```tsx
   * await sendTextMessage({
   *   liveID: 'your_live_id',
   *   text: 'Hello World',
   *   onSuccess: () => console.log('发送成功'),
   *   onError: (error) => console.error('发送失败:', error)
   * });
   * ```
   */
  const sendTextMessage = useCallback(async (params: SendTextMessageOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.text) {
      const error = new Error('Missing required parameters: liveID or text');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...messageParams } = params;

    try {
      const result = await callNativeAPI<void>('sendTextMessage', messageParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Send text message failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 发送自定义类型弹幕
   * 
   * @param params - 发送自定义类型弹幕参数
   * @example
   * ```tsx
   * await sendCustomMessage({
   *   liveID: 'your_live_id',
   *   businessID: 'livekit',
   *   data: JSON.stringify('my custom message'),
   *   onSuccess: () => console.log('发送成功'),
   *   onError: (error) => console.error('发送失败:', error)
   * });
   * ```
   */
  const sendCustomMessage = useCallback(async (params: SendCustomMessageOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.businessID || !params.data) {
      const error = new Error('Missing required parameters: liveID, businessID or data');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...customParams } = params;

    try {
      const result = await callNativeAPI<void>('sendCustomMessage', customParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Send custom message failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 添加本地提示消息
   * 
   * @param params - 添加本地提示消息参数
   * @example
   * ```tsx
   * await appendLocalTip({
   *   liveID: 'your_live_id',
   *   message: { text: 'Hello World' },
   *   onSuccess: () => console.log('添加成功'),
   *   onError: (error) => console.error('添加失败:', error)
   * });
   * ```
   */
  const appendLocalTip = useCallback(async (params: AppendLocalTipOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.message) {
      const error = new Error('Missing required parameters: liveID or message');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...tipParams } = params;

    try {
      // 通过 Native API 调用 appendLocalTip
      const result = await callNativeAPI<void>('appendLocalTip', tipParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Append local tip failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 添加弹幕事件监听
   *
   * @param eventName - 事件名称
   * @param listener - 事件回调函数
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addBarrageListener('onMessageReceived', (params) => {
   *   console.log('收到消息:', params);
   * });
   * ```
   */
  const addBarrageListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'BarrageStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, [liveID]);

  /**
   * 移除弹幕事件监听
   *
   * @param eventName - 事件名称
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeBarrageListener('onMessageReceived');
   * ```
   */
  const removeBarrageListener = useCallback((eventName: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'BarrageStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, [liveID]);

  return {
    messageList,          // 当前房间的弹幕消息列表
    allowSendMessage,     // 是否允许发送消息
    sendTextMessage,      // 发送文本消息方法
    sendCustomMessage,    // 发送自定义消息方法
    appendLocalTip,       // 添加本地提示消息方法
    addBarrageListener,   // 添加弹幕事件监听
    removeBarrageListener, // 移除弹幕事件监听
  };
}

export default useBarrageState;

