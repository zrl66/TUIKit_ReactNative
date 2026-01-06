/**
 * @module GiftState
 * @module_description
 * 礼物系统管理模块
 * 核心功能：处理礼物的发送、接收、礼物列表管理等功能，支持礼物分类、礼物动画、礼物统计等完整礼物经济系统。
 * 技术特点：支持礼物动画渲染、礼物特效处理、礼物统计、礼物排行榜等高级功能。
 * 业务价值：为直播平台提供核心的变现能力，支持礼物经济、虚拟货币等商业模式。
 * 应用场景：礼物打赏、虚拟货币、礼物特效、礼物统计等商业化场景。
 */

import { useState, useEffect, useCallback } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
  GiftCategoryParam,
  RefreshUsableGiftsOptions,
  SendGiftOptions,
  SetLanguageOptions,
} from './types';
import { giftStore } from './store';

/**
 * 礼物监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 礼物状态事件名称常量
 */
const GIFT_EVENTS = [
  'usableGifts',
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
 * GiftState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useGiftState } from '@/src/atomic-x/state/GiftState';
 * 
 * function GiftComponent() {
 *   const { 
 *     usableGifts,
 *     refreshUsableGifts,
 *     sendGift,
 *     setLanguage 
 *   } = useGiftState('your_live_id');
 * 
 *   const handleSendGift = async () => {
 *     await sendGift({
 *       liveID: 'your_live_id',
 *       giftID: 'gift001',
 *       count: 1,
 *       onSuccess: () => console.log('发送成功'),
 *       onError: (error) => console.error('发送失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       {usableGifts.map((category) => (
 *         <View key={category.categoryID}>
 *           <Text>{category.name}</Text>
 *           {category.giftList?.map((gift) => (
 *             <Text key={gift.giftID}>{gift.name}</Text>
 *           ))}
 *         </View>
 *       ))}
 *       <Button onPress={handleSendGift} title="发送礼物" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useGiftState(liveID: string) {
  // 从全局 store 获取初始状态
  const initialState = giftStore.getState(liveID);

  // 可用礼物列表 - 使用全局 store 的初始值
  const [usableGifts, setUsableGifts] = useState<GiftCategoryParam[]>(initialState.usableGifts);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = giftStore.subscribe(liveID, (state) => {
      setUsableGifts(state.usableGifts);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理礼物状态变化事件
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

      console.log(`[GiftState] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 GIFT_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const updates: {
          usableGifts?: GiftCategoryParam[];
        } = {};

        Object.keys(data).forEach((key) => {
          if (GIFT_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'usableGifts') {
              // usableGifts 是数组类型
              let parsedData: GiftCategoryParam[];
              if (Array.isArray(value)) {
                parsedData = value as GiftCategoryParam[];
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<GiftCategoryParam[]>(value, []);
              } else {
                parsedData = safeJsonParse<GiftCategoryParam[]>(JSON.stringify(value), []);
              }
              updates.usableGifts = parsedData;
            }
          }
        });

        // 批量更新全局 store（只更新一次，避免多次通知）
        if (Object.keys(updates).length > 0) {
          giftStore.setState(liveID, updates);
        }
      }
    } catch (error) {
      console.error(`[GiftState] ${eventName} event parse error:`, error);
      console.log(`[GiftState] ${eventName} event received (raw):`, event);
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
        store: 'GiftStore',
        name: eventName,
        roomID: liveID ?? null,
        listenerID: listenerID ?? null,
      };
    };

    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    GIFT_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[GiftState] Added listener for: ${eventName}, eventName=${key}`);
    });

    // 清理函数：组件卸载时移除所有监听器
    return () => {
      GIFT_EVENTS.forEach((eventName) => {
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
   * 刷新可用礼物列表
   * 
   * @param params - 刷新礼物列表参数（可选）
   * @example
   * ```tsx
   * await refreshUsableGifts({
   *   liveID: 'your_live_id',
   *   onSuccess: () => console.log('刷新成功'),
   *   onError: (error) => console.error('刷新失败:', error)
   * });
   * ```
   */
  const refreshUsableGifts = useCallback(async (params?: RefreshUsableGiftsOptions): Promise<void> => {
    const { onSuccess, onError, ...refreshParams } = params || {};

    try {
      const result = await callNativeAPI<GiftCategoryParam[]>('refreshUsableGifts', refreshParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Refresh usable gifts failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 发送礼物
   * 
   * @param params - 发送礼物参数
   * @example
   * ```tsx
   * await sendGift({
   *   liveID: 'your_live_id',
   *   giftID: 'gift001',
   *   count: 1,
   *   receiverList: ['user1', 'user2'],
   *   onSuccess: () => console.log('发送成功'),
   *   onError: (error) => console.error('发送失败:', error)
   * });
   * ```
   */
  const sendGift = useCallback(async (params: SendGiftOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.giftID || params.count === undefined) {
      const error = new Error('Missing required parameters: liveID, giftID or count');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...giftParams } = params;

    try {
      const result = await callNativeAPI<void>('sendGift', giftParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Send gift failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 设置礼物语言
   * 
   * @param params - 设置礼物语言参数
   * @example
   * ```tsx
   * await setLanguage({
   *   liveID: 'your_live_id',
   *   language: 'zh-CN',
   *   onSuccess: () => console.log('设置成功'),
   *   onError: (error) => console.error('设置失败:', error)
   * });
   * ```
   */
  const setLanguage = useCallback(async (params: SetLanguageOptions): Promise<void> => {
    // 验证必填参数
    if (!params.liveID || !params.language) {
      const error = new Error('Missing required parameters: liveID or language');
      params.onError?.(error);
      return;
    }

    const { onSuccess, onError, ...languageParams } = params;

    try {
      const result = await callNativeAPI<void>('setLanguage', languageParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Set language failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 添加礼物事件监听器
   * 
   * @param eventName - 事件名称，可选值: 'onReceiveGift'(收到礼物)
   * @param listener - 事件监听器函数
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addGiftListener('onReceiveGift', (params) => {
   *   console.log('收到礼物:', params);
   * });
   * ```
   */
  const addGiftListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'GiftStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, [liveID]);

  /**
   * 移除礼物事件监听器
   * 
   * @param eventName - 事件名称，可选值: 'onReceiveGift'(收到礼物)
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeGiftListener('onReceiveGift');
   * ```
   */
  const removeGiftListener = useCallback((eventName: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'GiftStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, [liveID]);

  return {
    usableGifts,         // 可用礼物列表
    refreshUsableGifts,  // 刷新可用礼物列表
    sendGift,            // 发送礼物
    setLanguage,         // 设置礼物语言
    addGiftListener,     // 添加礼物事件监听
    removeGiftListener,  // 移除礼物事件监听
  };
}

export default useGiftState;

