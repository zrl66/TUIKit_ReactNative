/**
 * LiveAudienceState Store
 * 单例模式全局状态存储，解决状态隔离问题
 */

import type { LiveUserInfoParam } from './types';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';

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
 * 单个直播间的观众状态
 */
interface LiveAudienceState {
    audienceList: LiveUserInfoParam[];
    audienceCount: number;
}

/**
 * 状态变化监听器
 */
type StateChangeListener = (state: LiveAudienceState) => void;

/**
 * 全局状态存储
 * 按 liveID 索引，每个直播间有独立的状态
 */
class LiveAudienceStore {
    private static instance: LiveAudienceStore;
    private states: Map<string, LiveAudienceState> = new Map();
    private listeners: Map<string, Set<StateChangeListener>> = new Map();
    private nativeSubscriptions: Map<string, Array<{ remove: () => void }>> = new Map();

    private constructor() { }

    static getInstance(): LiveAudienceStore {
        if (!LiveAudienceStore.instance) {
            LiveAudienceStore.instance = new LiveAudienceStore();
        }
        return LiveAudienceStore.instance;
    }

    /**
     * 处理原生事件
     */
    private handleNativeEvent = (liveID: string, eventName: string) => (event: any) => {
        try {
            // 解析原生数据
            const data = event && typeof event === 'object' && !Array.isArray(event)
                ? event
                : typeof event === 'string'
                    ? JSON.parse(event)
                    : event;

            console.log(`[LiveAudienceStore] ${eventName} event received for room ${liveID}:`, JSON.stringify(data));

            if (data && typeof data === 'object' && !Array.isArray(data)) {
                const updates: Partial<LiveAudienceState> = {};

                // 检查数据中是否包含我们需要更新的状态字段
                // 注意：原生返回的 key 可能就是 eventName，也可能是在 data 对象中的 key
                const processKey = (key: string, value: any) => {
                    if (key === 'audienceList') {
                        let parsedData: LiveUserInfoParam[];
                        if (Array.isArray(value)) {
                            parsedData = value as LiveUserInfoParam[];
                        } else if (typeof value === 'string') {
                            parsedData = safeJsonParse<LiveUserInfoParam[]>(value, []);
                        } else {
                            parsedData = safeJsonParse<LiveUserInfoParam[]>(JSON.stringify(value), []);
                        }
                        updates.audienceList = parsedData;
                    } else if (key === 'audienceCount') {
                        updates.audienceCount = typeof value === 'number' ? value : (Number(value) || 0);
                    }
                };

                // 1. 检查 top-level keys
                Object.keys(data).forEach((key) => {
                    if (LIVE_AUDIENCE_EVENTS.includes(key)) {
                        processKey(key, data[key]);
                    }
                });

                // 2. 特殊处理：如果 eventName 本身就是 audienceList/audienceCount，但 data 中没有对应的 key
                // 有些原生实现会把数据直接放在 data 对象里，而 data 的 key 就是 eventName
                if (LIVE_AUDIENCE_EVENTS.includes(eventName) && updates[eventName as keyof LiveAudienceState] === undefined) {
                    // 如果 data 本身就是我们要的数据（例如 data 就是 audienceList 数组）
                    processKey(eventName, data);
                }

                if (Object.keys(updates).length > 0) {
                    this.setState(liveID, updates);
                }
            }
        } catch (error) {
            console.error(`[LiveAudienceStore] ${eventName} event parse error:`, error);
        }
    };

    /**
     * 注册原生监听器
     */
    private registerNativeListeners(liveID: string): void {
        if (this.nativeSubscriptions.has(liveID)) {
            return;
        }

        const subscriptions: Array<{ remove: () => void }> = [];
        LIVE_AUDIENCE_EVENTS.forEach((eventName) => {
            const keyObject: HybridListenerKey = {
                type: 'state',
                store: 'LiveAudienceStore',
                name: eventName,
                roomID: liveID ?? null,
                listenerID: null,
            };
            const key = JSON.stringify(keyObject);
            const subscription = addListener(key, this.handleNativeEvent(liveID, eventName));
            if (subscription) {
                subscriptions.push(subscription);
            }
        });
        this.nativeSubscriptions.set(liveID, subscriptions);
        console.log(`[LiveAudienceStore] Registered native listeners for liveID: ${liveID}`);
    }

    /**
     * 注销原生监听器
     */
    private unregisterNativeListeners(liveID: string): void {
        const subscriptions = this.nativeSubscriptions.get(liveID);
        if (subscriptions) {
            LIVE_AUDIENCE_EVENTS.forEach((eventName) => {
                const keyObject: HybridListenerKey = {
                    type: 'state',
                    store: 'LiveAudienceStore',
                    name: eventName,
                    roomID: liveID ?? null,
                    listenerID: null,
                };
                const key = JSON.stringify(keyObject);
                removeListener(key);
            });
            subscriptions.forEach((s) => s.remove());
            this.nativeSubscriptions.delete(liveID);
            console.log(`[LiveAudienceStore] Unregistered native listeners for liveID: ${liveID}`);
        }
    }

    /**
     * 获取指定直播间的状态
     */
    getState(liveID: string): LiveAudienceState {
        if (!this.states.has(liveID)) {
            this.states.set(liveID, {
                audienceList: [],
                audienceCount: 0,
            });
        }
        return this.states.get(liveID)!;
    }

    /**
     * 更新指定直播间的状态
     */
    setState(liveID: string, updates: Partial<LiveAudienceState>): void {
        const currentState = this.getState(liveID);
        const newState: LiveAudienceState = {
            ...currentState,
            ...updates,
        };
        this.states.set(liveID, newState);

        // 通知所有订阅者
        this.notifyListeners(liveID, newState);
    }

    /**
     * 订阅状态变化
     */
    subscribe(liveID: string, listener: StateChangeListener): () => void {
        if (!this.listeners.has(liveID)) {
            this.listeners.set(liveID, new Set());
        }
        
        const liveListeners = this.listeners.get(liveID)!;
        
        // 如果是第一个监听者，注册原生监听器
        if (liveListeners.size === 0) {
            this.registerNativeListeners(liveID);
        }
        
        liveListeners.add(listener);

        // 立即通知当前状态
        listener(this.getState(liveID));

        // 返回取消订阅函数
        return () => {
            liveListeners.delete(listener);
            // 如果没有监听器了，清理原生监听器和状态
            if (liveListeners.size === 0) {
                this.unregisterNativeListeners(liveID);
                this.listeners.delete(liveID);
                // this.states.delete(liveID); // 保持状态以便下次重新进入时有缓存，或者视情况清理
            }
        };
    }

    /**
     * 通知所有订阅者
     */
    private notifyListeners(liveID: string, state: LiveAudienceState): void {
        const liveListeners = this.listeners.get(liveID);
        if (liveListeners) {
            liveListeners.forEach((listener) => {
                try {
                    listener(state);
                } catch (error) {
                    console.error('[LiveAudienceStore] Listener error:', error);
                }
            });
        }
    }

    /**
     * 清理指定直播间的状态
     */
    clearState(liveID: string): void {
        this.states.delete(liveID);
        this.listeners.delete(liveID);
    }

    /**
     * 清理所有状态
     */
    clearAll(): void {
        this.states.clear();
        this.listeners.clear();
    }
}

export const liveAudienceStore = LiveAudienceStore.getInstance();

