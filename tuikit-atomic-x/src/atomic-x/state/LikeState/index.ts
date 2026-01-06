/**
 * @module LikeState
 * @module_description
 * 点赞互动管理模块
 * 核心功能：处理直播间的点赞功能，支持点赞发送、点赞统计、点赞事件监听等互动功能。
 * 技术特点：支持高并发点赞处理、实时点赞统计、点赞动画效果、点赞排行榜等高级功能。
 * 业务价值：为直播平台提供基础的互动能力，增强用户参与度和直播氛围。
 * 应用场景：点赞互动、人气统计、互动效果、用户参与等基础互动场景。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
    SendLikeOptions,
} from './types';
import { likeStore } from './store';

/**
 * 点赞监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 点赞状态事件名称常量
 */
const LIKE_EVENTS = [
    'totalLikeCount',
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
 * LikeState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useLikeState } from '@/src/atomic-x/state/LikeState';
 * 
 * function LikeComponent() {
 *   const { 
 *     totalLikeCount,
 *     sendLike,
 *     addLikeListener 
 *   } = useLikeState('your_live_id');
 * 
 *   const handleSendLike = async () => {
 *     await sendLike({
 *       liveID: 'your_live_id',
 *       count: 1,
 *       onSuccess: () => console.log('点赞成功'),
 *       onError: (error) => console.error('点赞失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       <Text>总点赞数: {totalLikeCount}</Text>
 *       <Button onPress={handleSendLike} title="点赞" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useLikeState(liveID: string) {
    // 从全局 store 获取初始状态
    const initialState = likeStore.getState(liveID);

    // 总点赞数量 - 使用全局 store 的初始值
    const [totalLikeCount, setTotalLikeCount] = useState<number>(initialState.totalLikeCount);

    // 订阅全局 store 的状态变化
    useEffect(() => {
        if (!liveID) {
            return;
        }

        // 订阅状态变化
        const unsubscribe = likeStore.subscribe(liveID, (state) => {
            setTotalLikeCount(state.totalLikeCount);
        });

        // 清理订阅
        return unsubscribe;
    }, [liveID]);

    // 事件监听器引用
    type WritableMap = Record<string, unknown>;

    /**
     * 处理点赞状态变化事件
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

            console.log(`[LikeState] ${eventName} event received:`, JSON.stringify(data));

            // 检查 data 的 key 是否匹配 LIKE_EVENTS 中的某个值
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                const updates: {
                    totalLikeCount?: number;
                } = {};

                Object.keys(data).forEach((key) => {
                    if (LIKE_EVENTS.includes(key)) {
                        const value = data[key];

                        // 根据不同的 key 更新对应的响应式数据
                        if (key === 'totalLikeCount') {
                            // totalLikeCount 是数字类型
                            const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
                            updates.totalLikeCount = parsedData;
                        }
                    }
                });

                // 批量更新全局 store（只更新一次，避免多次通知）
                if (Object.keys(updates).length > 0) {
                    likeStore.setState(liveID, updates);
                }
            }
        } catch (error) {
            console.error(`[LikeState] ${eventName} event parse error:`, error);
            console.log(`[LikeState] ${eventName} event received (raw):`, event);
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
                store: 'LikeStore',
                name: eventName,
                roomID: liveID ?? null,
                listenerID: listenerID ?? null,
            };
        };

        // 保存监听器清理函数的引用
        const cleanupFunctions: Array<{ remove: () => void }> = [];

        LIKE_EVENTS.forEach((eventName) => {
            const keyObject = createListenerKeyObject(eventName);
            const key = JSON.stringify(keyObject);
            console.log(key);
            // addListener 会自动注册 Native 端和 JS 层的事件监听器
            const subscription = addListener(key, handleEvent(eventName));
            if (subscription) {
                cleanupFunctions.push(subscription);
            }

            console.log(`[LikeState] Added listener for: ${eventName}, eventName=${key}`);
        });

        // 清理函数：组件卸载时移除所有监听器
        return () => {
            LIKE_EVENTS.forEach((eventName) => {
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
     * 发送点赞
     * 
     * @param params - 点赞参数
   * @example
   * ```tsx
   * await sendLike({
   *   liveID: 'your_live_id',
   *   count: 1,
   *   onSuccess: () => console.log('点赞成功'),
   *   onError: (error) => console.error('点赞失败:', error)
   * });
   * ```
     */
    const sendLike = useCallback(async (params: SendLikeOptions): Promise<void> => {
        const { onSuccess, onError, ...likeParams } = params;

        try {
            const result = await callNativeAPI<void>('sendLike', likeParams);

            if (result.success) {
                // 成功时只触发回调，状态更新由事件监听器处理
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Send like failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 添加点赞事件监听
     * 
     * @param eventName - 事件名称，可选值: 'onReceiveLikesMessage'(收到点赞消息)
     * @param listener - 事件回调函数
     * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addLikeListener('onReceiveLikesMessage', (params) => {
   *   console.log('收到点赞消息:', params);
   * });
   * ```
     */
    const addLikeListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
        const createListenerKeyObject: HybridListenerKey = {
            type: 'state',
            store: 'LikeStore',
            name: eventName,
            roomID: liveID ?? null,
            listenerID: listenerID ?? null,
        };
        addListener(JSON.stringify(createListenerKeyObject), listener);
    }, [liveID]);

    /**
     * 移除点赞事件监听
     * 
     * @param eventName - 事件名称，可选值: 'onReceiveLikesMessage'(收到点赞消息)
     * @param listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeLikeListener('onReceiveLikesMessage');
   * ```
     */
    const removeLikeListener = useCallback((eventName: string, listenerID?: string): void => {
        const createListenerKeyObject: HybridListenerKey = {
            type: 'state',
            store: 'LikeStore',
            name: eventName,
            roomID: liveID ?? null,
            listenerID: listenerID ?? null,
        };
        removeListener(JSON.stringify(createListenerKeyObject));
    }, [liveID]);

    return {
        totalLikeCount,       // 总点赞数量
        sendLike,             // 发送点赞
        addLikeListener,      // 添加点赞事件监听
        removeLikeListener,   // 移除点赞事件监听
    };
}

export default useLikeState;

