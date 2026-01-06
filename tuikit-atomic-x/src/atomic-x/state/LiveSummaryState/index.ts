/**
 * @module LiveSummaryState
 * @module_description
 * 统计信息状态管理模块
 * 核心功能：统计和展示直播过程中的关键数据，包括观看人数、点赞数、礼物数等实时统计。
 * 技术特点：支持实时数据采集、数据聚合、统计分析等功能，提供完整的直播数据视图。
 * 业务价值：为直播平台提供数据分析能力，支持直播效果评估和优化改进。
 * 应用场景：直播数据展示、主播分析、流量统计、商业数据报表等数据分析场景。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type { SummaryData } from './types';
import { liveSummaryStore } from './store';

/**
 * 统计监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 统计状态事件名称常量
 */
const LIVE_SUMMARY_EVENTS = [
  'summaryData',
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
 * LiveSummaryState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useLiveSummaryState } from '@/src/atomic-x/state/LiveSummaryState';
 * 
 * function SummaryComponent() {
 *   const { summaryData } = useLiveSummaryState('your_live_id');
 * 
 *   return (
 *     <View>
 *       {summaryData && (
 *         <>
 *           <Text>观看人数: {summaryData.viewerCount}</Text>
 *           <Text>点赞数: {summaryData.likeCount}</Text>
 *           <Text>礼物数: {summaryData.giftCount}</Text>
 *         </>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLiveSummaryState(liveID: string) {
  // 从全局 store 获取初始状态
  const initialState = liveSummaryStore.getState(liveID);

  // 直播间统计信息 - 使用全局 store 的初始值
  const [summaryData, setSummaryData] = useState<SummaryData | undefined>(initialState.summaryData);

  // 订阅全局 store 的状态变化
  useEffect(() => {
    if (!liveID) {
      return;
    }

    // 订阅状态变化
    const unsubscribe = liveSummaryStore.subscribe(liveID, (state) => {
      setSummaryData(state.summaryData);
    });

    // 清理订阅
    return unsubscribe;
  }, [liveID]);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理统计状态变化事件
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

      console.log(`[LiveSummaryState] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 LIVE_SUMMARY_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const updates: {
          summaryData?: SummaryData;
        } = {};

        Object.keys(data).forEach((key) => {
          if (LIVE_SUMMARY_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'summaryData') {
              // summaryData 是对象类型
              let parsedData: SummaryData;
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                parsedData = value as SummaryData;
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<SummaryData>(value, {} as SummaryData);
              } else {
                parsedData = safeJsonParse<SummaryData>(JSON.stringify(value), {} as SummaryData);
              }
              updates.summaryData = parsedData;
            }
          }
        });

        // 批量更新全局 store（只更新一次，避免多次通知）
        if (Object.keys(updates).length > 0) {
          liveSummaryStore.setState(liveID, updates);
        }
      }
    } catch (error) {
      console.error(`[LiveSummaryState] ${eventName} event parse error:`, error);
      console.log(`[LiveSummaryState] ${eventName} event received (raw):`, event);
    }
  }, [liveID]);

  /**
   * 绑定事件监听
   */
  useEffect(() => {
    const createListenerKeyObject = (eventName: string, listenerID?: string | null): HybridListenerKey => {
      return {
        type: 'state',
        store: 'LiveSummaryStore',
        name: eventName,
        roomID: liveID ?? null,
        listenerID: listenerID ?? null,
      };
    };
    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    LIVE_SUMMARY_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[LiveSummaryState] Added listener for: ${eventName}, eventName=${key}`);
    });

    // 清理函数：组件卸载时移除所有监听器
    return () => {
      LIVE_SUMMARY_EVENTS.forEach((eventName) => {
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
   * 添加统计事件监听
   *
   * @param eventName - 事件名称
   * @param listener - 事件回调函数
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addLiveSummaryListener('onSummaryDataChanged', (params) => {
   *   console.log('统计数据变化:', params);
   * });
   * ```
   */
  const addLiveSummaryListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'LiveSummaryStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, [liveID]);

  /**
   * 移除统计事件监听
   *
   * @param eventName - 事件名称
   * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeLiveSummaryListener('onSummaryDataChanged');
   * ```
   */
  const removeLiveSummaryListener = useCallback((eventName: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'LiveSummaryStore',
      name: eventName,
      roomID: liveID ?? null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, [liveID]);

  return {
    summaryData,     // 直播间统计信息
    addLiveSummaryListener,   // 添加统计事件监听
    removeLiveSummaryListener, // 移除统计事件监听
  };
}

export default useLiveSummaryState;

