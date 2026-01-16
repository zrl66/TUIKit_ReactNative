/**
 * @module AudioEffectState
 * @module_description
 * 音效设置管理模块
 * 核心功能：提供变声、混响、耳返等高级音效功能，支持多种音效效果和实时音效调节。
 * 技术特点：基于音频处理算法，支持实时音效处理、低延迟音频传输、音质优化等高级技术。
 * 业务价值：为直播平台提供差异化的音效体验，增强用户参与度和直播趣味性。
 * 应用场景：变声直播、K歌直播、音效娱乐、专业音效等需要音频处理的场景。
 */

import { useState, useEffect, useCallback } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
    AudioChangerTypeParam,
    AudioReverbTypeParam,
    SetAudioChangerTypeOptions,
    SetAudioReverbTypeOptions,
    SetVoiceEarMonitorEnableOptions,
    VolumeOptions,
} from './types';
import { audioEffectStore } from './store';

/**
 * 音效监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 变声器类型映射表
 */
const CHANGER_TYPE_MAP: Record<number, AudioChangerTypeParam> = {
    0: 'NONE',
    1: 'CHILD',
    2: 'LITTLE_GIRL',
    3: 'MAN',
    4: 'HEAVY_METAL',
    5: 'COLD',
    6: 'FOREIGNER',
    7: 'TRAPPED_BEAST',
    8: 'FATSO',
    9: 'STRONG_CURRENT',
    10: 'HEAVY_MACHINERY',
    11: 'ETHEREAL',
} as const;

/**
 * 混响类型映射表
 */
const REVERB_TYPE_MAP: Record<number, AudioReverbTypeParam> = {
    0: 'NONE',
    1: 'KTV',
    2: 'SMALL_ROOM',
    3: 'AUDITORIUM',
    4: 'DEEP',
    5: 'LOUD',
    6: 'METALLIC',
    7: 'MAGNETIC',
} as const;

/**
 * 音效状态事件名称常量
 */
const AUDIO_EFFECT_EVENTS = [
    'isEarMonitorOpened',
    'earMonitorVolume',
    'audioChangerType',
    'audioReverbType',
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
 * 变声类型字符串到数字的反向映射
 */
const CHANGER_TYPE_STRING_MAP: Record<string, number> = {
    'NONE': 0,
    'CHILD': 1,
    'LITTLE_GIRL': 2,
    'MAN': 3,
    'HEAVY_METAL': 4,
    'COLD': 5,
    'FOREIGNER': 6,
    'TRAPPED_BEAST': 7,
    'FATSO': 8,
    'STRONG_CURRENT': 9,
    'HEAVY_MACHINERY': 10,
    'ETHEREAL': 11,
};

/**
 * 混响类型字符串到数字的反向映射
 */
const REVERB_TYPE_STRING_MAP: Record<string, number> = {
    'NONE': 0,
    'KTV': 1,
    'SMALL_ROOM': 2,
    'AUDITORIUM': 3,
    'DEEP': 4,
    'LOUD': 5,
    'METALLIC': 6,
    'MAGNETIC': 7,
};

/**
 * 将变声类型码映射为变声类型
 */
function mapChangerTypeCodeToChangerType(typeCode: number): AudioChangerTypeParam | null {
    const mappedType = CHANGER_TYPE_MAP[typeCode];
    if (mappedType === undefined) {
        console.warn(`Unknown changer type code: ${typeCode}`);
        return null;
    }
    return mappedType;
}

/**
 * 将混响类型码映射为混响类型
 */
function mapReverbTypeCodeToReverbType(typeCode: number): AudioReverbTypeParam | null {
    const mappedType = REVERB_TYPE_MAP[typeCode];
    if (mappedType === undefined) {
        console.warn(`Unknown reverb type code: ${typeCode}`);
        return null;
    }
    return mappedType;
}

/**
 * AudioEffectState Hook
 * 
 * @param liveID - 直播间ID
 * @example
 * ```tsx
 * import { useAudioEffectState } from '@/src/atomic-x/state/AudioEffectState';
 * 
 * function AudioEffectComponent() {
 *   const { 
 *     audioChangerType,
 *     audioReverbType,
 *     isEarMonitorOpened,
 *     setAudioChangerType,
 *     setAudioReverbType 
 *   } = useAudioEffectState('your_live_id');
 * 
 *   const handleSetChangerType = async () => {
 *     await setAudioChangerType({
 *       changerType: 'MAN',
 *       onSuccess: () => console.log('设置成功'),
 *       onError: (error) => console.error('设置失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       <Text>当前变声类型: {audioChangerType}</Text>
 *       <Text>当前混响类型: {audioReverbType}</Text>
 *       <Button onPress={handleSetChangerType} title="设置变声" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAudioEffectState(liveID: string) {
    // 从全局 store 获取初始状态
    const initialState = audioEffectStore.getState(liveID);

    // 耳返开关状态 - 使用全局 store 的初始值
    const [isEarMonitorOpened, setIsEarMonitorOpened] = useState<boolean>(initialState.isEarMonitorOpened);

    // 耳返音量大小 - 使用全局 store 的初始值
    const [earMonitorVolume, setEarMonitorVolume] = useState<number>(initialState.earMonitorVolume);

    // 变声状态 - 使用全局 store 的初始值
    const [audioChangerType, setAudioChangerTypeState] = useState<AudioChangerTypeParam>(initialState.audioChangerType);

    // 混响状态 - 使用全局 store 的初始值
    const [audioReverbType, setAudioReverbTypeState] = useState<AudioReverbTypeParam>(initialState.audioReverbType);

    // 订阅全局 store 的状态变化
    useEffect(() => {
        if (!liveID) {
            return;
        }

        // 订阅状态变化
        const unsubscribe = audioEffectStore.subscribe(liveID, (state) => {
            setIsEarMonitorOpened(state.isEarMonitorOpened);
            setEarMonitorVolume(state.earMonitorVolume);
            setAudioChangerTypeState(state.audioChangerType);
            setAudioReverbTypeState(state.audioReverbType);
        });

        // 清理订阅
        return unsubscribe;
    }, [liveID]);

    // 事件监听器引用
    type WritableMap = Record<string, unknown>;

    /**
     * 处理音效状态变化事件
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

            console.log(`[AudioEffectState] ${eventName} event received:`, JSON.stringify(data));

            // 检查 data 的 key 是否匹配 AUDIO_EFFECT_EVENTS 中的某个值
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                const updates: {
                    isEarMonitorOpened?: boolean;
                    earMonitorVolume?: number;
                    audioChangerType?: AudioChangerTypeParam;
                    audioReverbType?: AudioReverbTypeParam;
                } = {};

                Object.keys(data).forEach((key) => {
                    if (AUDIO_EFFECT_EVENTS.includes(key)) {
                        const value = data[key];

                        // 根据不同的 key 更新对应的响应式数据
                        if (key === 'isEarMonitorOpened') {
                            const parsedData = typeof value === 'boolean' ? value : Boolean(value);
                            updates.isEarMonitorOpened = parsedData;
                        } else if (key === 'earMonitorVolume') {
                            // earMonitorVolume 是数字类型
                            const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
                            updates.earMonitorVolume = parsedData;
                        } else if (key === 'audioChangerType') {
                            // audioChangerType 需要从类型码映射
                            let type: AudioChangerTypeParam | null = null;
                            
                            if (typeof value === 'number') {
                                type = mapChangerTypeCodeToChangerType(value);
                            } else if (typeof value === 'string') {
                                // 先尝试作为字符串类型直接匹配
                                if (CHANGER_TYPE_STRING_MAP[value] !== undefined) {
                                    type = value as AudioChangerTypeParam;
                                } else {
                                    // 尝试解析为数字
                                    const numValue = parseInt(value, 10);
                                    if (!isNaN(numValue)) {
                                        type = mapChangerTypeCodeToChangerType(numValue);
                                    }
                                }
                            }
                            
                            console.log('audioChangerType', type);
                            if (type) {
                                updates.audioChangerType = type;
                            } else {
                                console.error(`Invalid changer type received: ${value}`);
                            }
                        } else if (key === 'audioReverbType') {
                            // audioReverbType 需要从类型码映射
                            let type: AudioReverbTypeParam | null = null;
                            
                            if (typeof value === 'number') {
                                type = mapReverbTypeCodeToReverbType(value);
                            } else if (typeof value === 'string') {
                                // 先尝试作为字符串类型直接匹配
                                if (REVERB_TYPE_STRING_MAP[value] !== undefined) {
                                    type = value as AudioReverbTypeParam;
                                } else {
                                    // 尝试解析为数字
                                    const numValue = parseInt(value, 10);
                                    if (!isNaN(numValue)) {
                                        type = mapReverbTypeCodeToReverbType(numValue);
                                    }
                                }
                            }
                            
                            console.log('audioReverbType', type);
                            if (type) {
                                updates.audioReverbType = type;
                            } else {
                                console.error(`Invalid reverb type received: ${value}`);
                            }
                        }
                    }
                });

                // 批量更新全局 store（只更新一次，避免多次通知）
                if (Object.keys(updates).length > 0) {
                    audioEffectStore.setState(liveID, updates);
                }
            }
        } catch (error) {
            console.error(`[AudioEffectState] ${eventName} event parse error:`, error);
            console.log(`[AudioEffectState] ${eventName} event received (raw):`, event);
        }
    }, [liveID]);

    /**
     * 绑定事件监听
     */
    useEffect(() => {
        const createListenerKeyObject = (eventName: string, listenerID?: string | null): HybridListenerKey => {
            return {
                type: 'state',
                store: 'AudioEffectStore',
                name: eventName,
                roomID: null,
                listenerID: listenerID ?? null,
            };
        };

        // 保存监听器清理函数的引用
        const cleanupFunctions: Array<{ remove: () => void }> = [];

        AUDIO_EFFECT_EVENTS.forEach((eventName) => {
            const keyObject = createListenerKeyObject(eventName);
            const key = JSON.stringify(keyObject);
            console.log(key);
            // addListener 会自动注册 Native 端和 JS 层的事件监听器
            const subscription = addListener(key, handleEvent(eventName));
            if (subscription) {
                cleanupFunctions.push(subscription);
            }

            console.log(`[AudioEffectState] Added listener for: ${eventName}, eventName=${key}`);
        });

        return () => {
            AUDIO_EFFECT_EVENTS.forEach((eventName) => {
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
     * 设置变声效果
     
     * 
     * @param params - 变声效果参数
     * @example
     * ```tsx
     * await setAudioChangerType({
     *   changerType: 'MAN',
     *   onSuccess: () => console.log('设置成功'),
     *   onError: (error) => console.error('设置失败:', error)
     * });
     * ```
     */
    const setAudioChangerType = useCallback(async (params: SetAudioChangerTypeOptions): Promise<void> => {
        // 验证必填参数
        if (!params.changerType) {
            const error = new Error('Missing required parameter: changerType');
            params.onError?.(error);
            return;
        }

        const changerTypeValue = CHANGER_TYPE_STRING_MAP[params.changerType] ?? 0;

        const { onSuccess, onError, changerType, ...otherParams } = params;
        const changerParams = {
            ...otherParams,
            changerType: changerTypeValue,
        };

        try {
            const result = await callNativeAPI<void>('setAudioChangerType', changerParams);

            if (result.success) {
                // 成功时只触发回调，状态更新由事件监听器处理
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Set audio changer type failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 设置混响效果
     * 
     * @param params - 混响效果参数
     * @example
     * ```tsx
     * await setAudioReverbType({
     *   reverbType: 'KTV',
     *   onSuccess: () => console.log('设置成功'),
     *   onError: (error) => console.error('设置失败:', error)
     * });
     * ```
     */
    const setAudioReverbType = useCallback(async (params: SetAudioReverbTypeOptions): Promise<void> => {
        // 验证必填参数
        if (!params.reverbType) {
            const error = new Error('Missing required parameter: reverbType');
            params.onError?.(error);
            return;
        }

        const reverbTypeValue = REVERB_TYPE_STRING_MAP[params.reverbType] ?? 0;

        const { onSuccess, onError, reverbType, ...otherParams } = params;
        const reverbParams = {
            ...otherParams,
            reverbType: reverbTypeValue,
        };

        try {
            const result = await callNativeAPI<void>('setAudioReverbType', reverbParams);

            if (result.success) {
                // 成功时只触发回调，状态更新由事件监听器处理
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Set audio reverb type failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 设置耳返开关状态
     * 
     * @param params - 耳返开关参数
     * @example
     * ```tsx
     * await setVoiceEarMonitorEnable({
     *   enable: true,
     *   onSuccess: () => console.log('设置成功'),
     *   onError: (error) => console.error('设置失败:', error)
     * });
     * ```
     */
    const setVoiceEarMonitorEnable = useCallback(async (params: SetVoiceEarMonitorEnableOptions): Promise<void> => {
        // 验证必填参数
        if (params.enable === undefined) {
            const error = new Error('Missing required parameter: enable');
            params.onError?.(error);
            return;
        }

        const { onSuccess, onError, ...enableParams } = params;

        try {
            const result = await callNativeAPI<void>('setVoiceEarMonitorEnable', enableParams);

            if (result.success) {
                // 成功时只触发回调，状态更新由事件监听器处理
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Set voice ear monitor enable failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 设置耳返音量大小
     * 
     * @param params - 耳返音量参数
     * @example
     * ```tsx
     * await setVoiceEarMonitorVolume({
     *   volume: 50,
     *   onSuccess: () => console.log('设置成功'),
     *   onError: (error) => console.error('设置失败:', error)
     * });
     * ```
     */
    const setVoiceEarMonitorVolume = useCallback(async (params: VolumeOptions): Promise<void> => {
        // 验证必填参数
        if (params.volume === undefined) {
            const error = new Error('Missing required parameter: volume');
            params.onError?.(error);
            return;
        }

        const { onSuccess, onError, ...volumeParams } = params;

        try {
            const result = await callNativeAPI<void>('setVoiceEarMonitorVolume', volumeParams);

            if (result.success) {
                // 成功时只触发回调，状态更新由事件监听器处理
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Set voice ear monitor volume failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 添加音效事件监听
     *
     * @param eventName - 事件名称
     * @param listener - 事件回调函数
     * @param listenerID - 监听器ID（可选）
     * @example
     * ```tsx
     * addAudioEffectListener('onAudioEffectChanged', (params) => {
     *   console.log('音效变化:', params);
     * });
     * ```
     */
    const addAudioEffectListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
        const createListenerKeyObject: HybridListenerKey = {
            type: 'state',
            store: 'AudioEffectStore',
            name: eventName,
            roomID: null,
            listenerID: listenerID ?? null,
        };
        addListener(JSON.stringify(createListenerKeyObject), listener);
    }, []);

    /**
     * 移除音效事件监听
     *
     * @param eventName - 事件名称
     * @param listenerID - 监听器ID（可选）
     * @example
     * ```tsx
     * removeAudioEffectListener('onAudioEffectChanged');
     * ```
     */
    const removeAudioEffectListener = useCallback((eventName: string, listenerID?: string): void => {
        const createListenerKeyObject: HybridListenerKey = {
            type: 'state',
            store: 'AudioEffectStore',
            name: eventName,
            roomID: null,
            listenerID: listenerID ?? null,
        };
        removeListener(JSON.stringify(createListenerKeyObject));
    }, []);

    return {
        audioChangerType,          // 变声状态
        audioReverbType,           // 混响状态
        isEarMonitorOpened,        // 耳返开关状态
        earMonitorVolume,          // 耳返音量大小
        setAudioChangerType,       // 设置变声效果
        setAudioReverbType,        // 设置混响效果
        setVoiceEarMonitorEnable,  // 设置耳返开关
        setVoiceEarMonitorVolume,  // 设置耳返音量
        addAudioEffectListener,    // 添加音效事件监听
        removeAudioEffectListener, // 移除音效事件监听
    };
}

export default useAudioEffectState;

