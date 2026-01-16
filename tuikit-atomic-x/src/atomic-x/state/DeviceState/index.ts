/**
 * @module DeviceState
 * @module_description
 * 设备状态管理模块
 * 核心功能：管理摄像头、麦克风等音视频设备的控制，提供设备状态监控、权限检查等基础设备服务。
 * 技术特点：支持多设备管理、设备状态实时监控、权限动态检查、设备故障自动恢复等高级功能。
 * 业务价值：为直播系统提供稳定的设备基础，确保音视频采集的可靠性和用户体验。
 * 应用场景：设备管理、权限控制、音视频采集、设备故障处理等基础技术场景。
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import {
    DeviceStatus,
    DeviceStatusCode,
    DeviceErrorEnum,
    DeviceErrorCode,
    AudioOutput,
    MirrorType,
} from './types';
import type {
    DeviceStatusType,
    DeviceStatusCodeType,
    DeviceErrorType,
    DeviceErrorCodeType,
    AudioOutputType,
    OpenLocalMicrophoneOptions,
    SetAudioRouteOptions,
    OpenLocalCameraOptions,
    SwitchCameraOptions,
    UpdateVideoQualityOptions,
    SwitchMirrorOptions,
    VolumeOptions,
    NetworkInfo,
    LocalVideoQuality,
} from './types';
import { deviceStore } from './store';

/**
 * 设备监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 设备状态事件名称常量
 */
const DEVICE_EVENTS = [
    'microphoneStatus',
    'microphoneLastError',
    'captureVolume',
    'currentMicVolume',
    'outputVolume',
    'cameraStatus',
    'cameraLastError',
    'isFrontCamera',
    'localMirrorType',
    'localVideoQuality',
    'currentAudioRoute',
    'screenStatus',
    'networkInfo',
];

/**
 * 设备状态码到设备状态的映射
 */
const DEVICE_STATUS_MAP: Record<DeviceStatusCodeType, DeviceStatusType> = {
    [DeviceStatusCode.OFF]: DeviceStatus.OFF,
    [DeviceStatusCode.ON]: DeviceStatus.ON,
} as const;

/**
 * 设备错误码到设备错误的映射
 */
const DEVICE_ERROR_MAP: Record<DeviceErrorCodeType, DeviceErrorType> = {
    [DeviceErrorCode.NO_ERROR]: DeviceErrorEnum.NO_ERROR,
    [DeviceErrorCode.NO_DEVICE_DETECTED]: DeviceErrorEnum.NO_DEVICE_DETECTED,
    [DeviceErrorCode.NO_SYSTEM_PERMISSION]: DeviceErrorEnum.NO_SYSTEM_PERMISSION,
    [DeviceErrorCode.NOT_SUPPORT_CAPTURE]: DeviceErrorEnum.NOT_SUPPORT_CAPTURE,
    [DeviceErrorCode.OCCUPIED_ERROR]: DeviceErrorEnum.OCCUPIED_ERROR,
    [DeviceErrorCode.UNKNOWN_ERROR]: DeviceErrorEnum.UNKNOWN_ERROR,
} as const;

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

const AUDIO_ROUTE_STRING_MAP: Record<string, number> = {
    'SPEAKERPHONE': 0,
    'EARPIECE': 1,
};

const VIDEO_QUALITY_STRING_MAP: Record<string, number> = {
    'VIDEOQUALITY_360P': 1,
    'VIDEOQUALITY_540P': 2,
    'VIDEOQUALITY_720P': 3,
    'VIDEOQUALITY_1080P': 4,
};

/**
 * 将状态码映射为设备状态
 */
function mapStatusCodeToDeviceStatus(
    statusCode: number
): DeviceStatusType | null {
    const mappedStatus = DEVICE_STATUS_MAP[statusCode as DeviceStatusCodeType];
    if (!mappedStatus) {
        console.warn(`Unknown device status code: ${statusCode}`);
        return null;
    }
    return mappedStatus;
}

/**
 * 将错误码映射为设备错误
 */
function mapErrorCodeToDeviceError(errorCode: number): DeviceErrorType | null {
    const mappedError = DEVICE_ERROR_MAP[errorCode as DeviceErrorCodeType];
    if (!mappedError) {
        console.warn(`Unknown device error code: ${errorCode}`);
        return null;
    }
    return mappedError;
}



/**
 * DeviceState Hook
 * 
 * @example
 * ```tsx
 * import { useDeviceState } from '@/src/atomic-x/state/DeviceState';
 * 
 * function DeviceComponent() {
 *   const { 
 *     microphoneStatus, 
 *     cameraStatus, 
 *     openLocalMicrophone, 
 *     openLocalCamera 
 *   } = useDeviceState();
 * 
 *   const handleOpenMic = async () => {
 *     await openLocalMicrophone({
 *       onSuccess: () => console.log('麦克风已打开'),
 *       onError: (error) => console.error('打开麦克风失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       <Text>麦克风状态: {microphoneStatus}</Text>
 *       <Button onPress={handleOpenMic} title="打开麦克风" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useDeviceState() {
    // 从全局 store 获取初始状态
    const initialState = deviceStore.getState();

    // 麦克风相关状态 - 使用全局 store 的初始值
    const [microphoneStatus, setMicrophoneStatus] = useState<DeviceStatusType | undefined>(initialState.microphoneStatus);
    const [microphoneLastError, setMicrophoneLastError] = useState<DeviceErrorType | undefined>(initialState.microphoneLastError);
    const [hasPublishAudioPermission, setHasPublishAudioPermission] = useState<boolean>(initialState.hasPublishAudioPermission);
    const [captureVolume, setStateCaptureVolume] = useState<number>(initialState.captureVolume);
    const [currentMicVolume, setCurrentMicVolume] = useState<number>(initialState.currentMicVolume);

    // 摄像头相关状态 - 使用全局 store 的初始值
    const [cameraStatus, setCameraStatus] = useState<DeviceStatusType | undefined>(initialState.cameraStatus);
    const [cameraLastError, setCameraLastError] = useState<DeviceErrorType | undefined>(initialState.cameraLastError);
    const [isFrontCamera, setIsFrontCamera] = useState<boolean | undefined>(initialState.isFrontCamera);
    const [localMirrorType, setLocalMirrorType] = useState<MirrorType>(initialState.localMirrorType);
    const [localVideoQuality, setLocalVideoQuality] = useState<LocalVideoQuality | undefined>(initialState.localVideoQuality);

    // 音频输出相关状态 - 使用全局 store 的初始值
    const [outputVolume, setStateOutputVolume] = useState<number>(initialState.outputVolume);
    const [currentAudioRoute, setCurrentAudioRoute] = useState<AudioOutputType | undefined>(initialState.currentAudioRoute);

    // 屏幕共享相关状态 - 使用全局 store 的初始值
    const [screenStatus, setScreenStatus] = useState<DeviceStatusType | undefined>(initialState.screenStatus);

    // 网络信息状态 - 使用全局 store 的初始值
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo | undefined>(initialState.networkInfo);

    // 订阅全局 store 的状态变化
    useEffect(() => {
        // 订阅状态变化
        const unsubscribe = deviceStore.subscribe((state) => {
            setMicrophoneStatus(state.microphoneStatus);
            setMicrophoneLastError(state.microphoneLastError);
            setHasPublishAudioPermission(state.hasPublishAudioPermission);
            setStateCaptureVolume(state.captureVolume);
            setCurrentMicVolume(state.currentMicVolume);
            setCameraStatus(state.cameraStatus);
            setCameraLastError(state.cameraLastError);
            setIsFrontCamera(state.isFrontCamera);
            setLocalMirrorType(state.localMirrorType);
            setLocalVideoQuality(state.localVideoQuality);
            setStateOutputVolume(state.outputVolume);
            setCurrentAudioRoute(state.currentAudioRoute);
            setScreenStatus(state.screenStatus);
            setNetworkInfo(state.networkInfo);
        });

        // 清理订阅
        return unsubscribe;
    }, []);

    type WritableMap = Record<string, unknown>;

    /**
     * 处理设备状态变化事件
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

            // 检查 data 的 key 是否匹配 DEVICE_EVENTS 中的某个值
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                const updates: Partial<typeof initialState> = {};

                Object.keys(data).forEach((key) => {
                    if (DEVICE_EVENTS.includes(key)) {
                        const value = data[key];

                        // 根据不同的 key 更新对应的响应式数据
                        if (key === 'microphoneStatus') {
                            const statusCode = typeof value === 'number' ? value : (Number(value) || -1);
                            const status = mapStatusCodeToDeviceStatus(statusCode);
                            if (status) {
                                updates.microphoneStatus = status;
                            }
                        } else if (key === 'microphoneLastError') {
                            const errorCode = typeof value === 'number' ? value : (Number(value) || -1);
                            const error = mapErrorCodeToDeviceError(errorCode);
                            if (error) {
                                updates.microphoneLastError = error;
                            }
                        } else if (key === 'captureVolume') {
                            const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
                            updates.captureVolume = parsedData;
                        } else if (key === 'currentMicVolume') {
                            const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
                            updates.currentMicVolume = parsedData;
                        } else if (key === 'outputVolume') {
                            const parsedData = typeof value === 'number' ? value : (Number(value) || 0);
                            updates.outputVolume = parsedData;
                        } else if (key === 'cameraStatus') {
                            const statusCode = typeof value === 'number' ? value : (Number(value) || -1);
                            const status = mapStatusCodeToDeviceStatus(statusCode);
                            if (status) {
                                updates.cameraStatus = status;
                            }
                        } else if (key === 'cameraLastError') {
                            const errorCode = typeof value === 'number' ? value : (Number(value) || -1);
                            const error = mapErrorCodeToDeviceError(errorCode);
                            if (error) {
                                updates.cameraLastError = error;
                            }
                        } else if (key === 'isFrontCamera') {
                            const parsedData = typeof value === 'boolean' ? value : Boolean(value);
                            updates.isFrontCamera = parsedData;
                        } else if (key === 'localMirrorType') {
                            const parsedData = typeof value === 'number' ? value as MirrorType : (Number(value) as MirrorType);
                            updates.localMirrorType = parsedData;
                        } else if (key === 'localVideoQuality') {
                            const payloadStr = typeof value === 'string' ? value : JSON.stringify(value);
                            const parsedData = safeJsonParse<LocalVideoQuality>(payloadStr, {} as LocalVideoQuality);
                            updates.localVideoQuality = parsedData;
                        } else if (key === 'currentAudioRoute') {
                            const payloadStr = typeof value === 'string' ? value : JSON.stringify(value);
                            const parsedData = safeJsonParse<AudioOutputType>(payloadStr, AudioOutput.SPEAKERPHONE);
                            updates.currentAudioRoute = parsedData;
                        } else if (key === 'screenStatus') {
                            const statusCode = typeof value === 'number' ? value : (Number(value) || -1);
                            const status = mapStatusCodeToDeviceStatus(statusCode);
                            if (status) {
                                updates.screenStatus = status;
                            }
                        } else if (key === 'networkInfo') {
                            const payloadStr = typeof value === 'string' ? value : JSON.stringify(value);
                            const parsedData = safeJsonParse<NetworkInfo>(payloadStr, {} as NetworkInfo);
                            updates.networkInfo = parsedData;
                        }
                    }
                });

                // 批量更新全局 store（只更新一次，避免多次通知）
                if (Object.keys(updates).length > 0) {
                    deviceStore.setState(updates);
                }
            }
        } catch (error) {
            console.error(`[DeviceState] ${eventName} event parse error:`, error);
        }
    }, []);

    /**
     * 绑定事件监听
     */
    useEffect(() => {
        const createListenerKeyObject = (eventName: string, listenerID?: string | null): HybridListenerKey => {
            return {
                type: 'state',
                store: 'DeviceStore',
                name: eventName,
                roomID: null,
                listenerID: listenerID ?? null,
            };
        };
        // 保存监听器清理函数的引用
        const cleanupFunctions: Array<{ remove: () => void }> = [];

        DEVICE_EVENTS.forEach((eventName) => {
            const keyObject = createListenerKeyObject(eventName);
            const key = JSON.stringify(keyObject);
            // addListener 会自动注册 Native 端和 JS 层的事件监听器
            const subscription = addListener(key, handleEvent(eventName));
            if (subscription) {
                cleanupFunctions.push(subscription);
            }
        });

        return () => {
            DEVICE_EVENTS.forEach((eventName) => {
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
     * 请求 Android 权限
     * 
     * @param permission - 权限字符串或权限字符串数组
     * @example
     * ```tsx
     * // 请求单个权限
     * await requestAndroidPermission('android.permission.RECORD_AUDIO');
     * 
     * // 请求多个权限
     * await requestAndroidPermission([
     *   'android.permission.RECORD_AUDIO',
     *   'android.permission.CAMERA'
     * ]);
     * ```
     */
    const requestAndroidPermission = useCallback(async (
        permission: string | string[]
    ): Promise<void> => {
        if (Platform.OS !== 'android') {
            return;
        }

        // 权限字符串到 PermissionsAndroid.PERMISSIONS 的映射
        const permissionMap: Record<string, string> = {
            'android.permission.RECORD_AUDIO': PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            'android.permission.CAMERA': PermissionsAndroid.PERMISSIONS.CAMERA,
        };

        // 统一转换为数组处理
        const permissionArray = Array.isArray(permission) ? permission : [permission];

        // 将权限字符串映射为 PermissionsAndroid.PERMISSIONS 值
        const androidPermissions = permissionArray
            .map((perm) => permissionMap[perm])
            .filter((perm): perm is string => perm !== undefined);

        if (androidPermissions.length === 0) {
            console.warn('No valid Android permissions found');
            return;
        }

        try {
            // 单个权限使用 request，多个权限使用 requestMultiple
            if (androidPermissions.length === 1) {
                await PermissionsAndroid.request(androidPermissions[0] as any);
            } else {
                await PermissionsAndroid.requestMultiple(androidPermissions as any);
            }
        } catch (error) {
            console.error('Failed to request Android permissions:', error);
        }
    }, []);

    /**
     * 打开本地麦克风
     * 
     * @param params - 麦克风参数（可选）
     * @example
     * ```tsx
     * await openLocalMicrophone({
     *   onSuccess: () => console.log('麦克风已打开'),
     *   onError: (error) => console.error('打开麦克风失败:', error)
     * });
     * ```
     */
    const openLocalMicrophone = useCallback(async (params?: OpenLocalMicrophoneOptions): Promise<void> => {
        // Android 平台请求录音权限
        if (Platform.OS === 'android') {
            await requestAndroidPermission('android.permission.RECORD_AUDIO');
        }

        const { onSuccess, onError, ...microphoneParams } = params || {};

        try {
            const result = await callNativeAPI<void>('openLocalMicrophone', microphoneParams);

            if (result.success) {
                // 成功时只触发回调，状态更新由事件监听器处理
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Open local microphone failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, [requestAndroidPermission]);

    /**
     * 关闭本地麦克风
     * 
     * @example
     * ```tsx
     * closeLocalMicrophone();
     * ```
     */
    const closeLocalMicrophone = useCallback(async (): Promise<void> => {
        try {
            await callNativeAPI<void>('closeLocalMicrophone');
        } catch (error) {
            console.error('closeLocalMicrophone error:', error);
        }
    }, []);

    /**
     * 设置采集音量
     * 
     * @param params - 音量参数
     * @example
     * ```tsx
     * setCaptureVolume({
     *   volume: 80,
     *   onSuccess: () => console.log('音量设置成功'),
     *   onError: (error) => console.error('音量设置失败:', error)
     * });
     * ```
     */
    const setCaptureVolume = useCallback(async (params: VolumeOptions): Promise<void> => {
        const { onSuccess, onError, ...volumeParams } = params;

        try {
            const result = await callNativeAPI<void>('setCaptureVolume', volumeParams);

            if (result.success) {
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Set capture volume failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 设置输出音量
     * 
     * @param params - 音量参数
     * @example
     * ```tsx
     * setOutputVolume({
     *   volume: 90,
     *   onSuccess: () => console.log('输出音量设置成功'),
     *   onError: (error) => console.error('输出音量设置失败:', error)
     * });
     * ```
     */
    const setOutputVolume = useCallback(async (params: VolumeOptions): Promise<void> => {
        const { onSuccess, onError, ...volumeParams } = params;

        try {
            const result = await callNativeAPI<void>('setOutputVolume', volumeParams);

            if (result.success) {
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Set output volume failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 设置音频路由
     * 
     * @param params - 音频路由参数
     * @example
     * ```tsx
     * setAudioRoute({
     *   route: 'SPEAKERPHONE',
     *   onSuccess: () => console.log('音频路由设置成功'),
     *   onError: (error) => console.error('音频路由设置失败:', error)
     * });
     * ```
     */
    const setAudioRoute = useCallback(async (params: SetAudioRouteOptions): Promise<void> => {
        const routeValue = AUDIO_ROUTE_STRING_MAP[params.route] ?? 0;
        
        const { onSuccess, onError, route, ...otherParams } = params;
        const routeParams = {
            ...otherParams,
            audioRoute: routeValue,
        };

        try {
            const result = await callNativeAPI<void>('setAudioRoute', routeParams);

            if (result.success) {
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Set audio route failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 打开本地摄像头
     * 
     * @param params - 摄像头参数（可选）
     * @example
     * ```tsx
     * await openLocalCamera({
     *   isFront: true,
     *   onSuccess: () => console.log('摄像头已打开'),
     *   onError: (error) => console.error('打开摄像头失败:', error)
     * });
     * ```
     */
    const openLocalCamera = useCallback(async (params?: OpenLocalCameraOptions): Promise<void> => {
        // Android 平台请求摄像头权限
        if (Platform.OS === 'android') {
            await requestAndroidPermission('android.permission.CAMERA');
        }

        const { onSuccess, onError, ...cameraParams } = params || {};

        try {
            const result = await callNativeAPI<void>('openLocalCamera', cameraParams);

            if (result.success) {
                // 成功时只触发回调，状态更新由事件监听器处理
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Open local camera failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, [requestAndroidPermission]);

    /**
     * 关闭本地摄像头
     * 
     * @example
     * ```tsx
     * closeLocalCamera();
     * ```
     */
    const closeLocalCamera = useCallback(async (): Promise<void> => {
        try {
            await callNativeAPI<void>('closeLocalCamera');
        } catch (error) {
            console.error('closeLocalCamera error:', error);
        }
    }, []);

    /**
     * 切换摄像头前后置
     * 
     * @param params - 切换参数
     * @example
     * ```tsx
     * switchCamera({
     *   isFront: true,
     *   onSuccess: () => console.log('摄像头切换成功'),
     *   onError: (error) => console.error('摄像头切换失败:', error)
     * });
     * ```
     */
    const switchCamera = useCallback(async (params: SwitchCameraOptions): Promise<void> => {
        const { onSuccess, onError, ...switchParams } = params;

        try {
            const result = await callNativeAPI<void>('switchCamera', switchParams);

            if (result.success) {
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Switch camera failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 切换镜像
     * 
     * @param params - 镜像参数
     * @example
     * ```tsx
     * switchMirror({
     *   mirrorType: MirrorType.AUTO,
     *   onSuccess: () => console.log('镜像切换成功'),
     *   onError: (error) => console.error('镜像切换失败:', error)
     * });
     * ```
     */
    const switchMirror = useCallback(async (params: SwitchMirrorOptions): Promise<void> => {
        const { onSuccess, onError, mirrorType, ...otherParams } = params;
        const mirrorParams = {
            ...otherParams,
            mirrorType: mirrorType, // 直接使用枚举值（数字）
        };

        try {
            const result = await callNativeAPI<void>('switchMirror', mirrorParams);

            if (result.success) {
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Switch mirror failed');
                onError?.(error);
            }
        } catch (error: any) {
            console.error('[DeviceState] switchMirror error:', error);
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, [localMirrorType]);

    /**
     * 更新视频质量
     
     * 
     * @param params - 视频质量参数
     * @example
     * ```tsx
     * updateVideoQuality({
     *   quality: 'VIDEOQUALITY_1080P',
     *   onSuccess: () => console.log('视频质量更新成功'),
     *   onError: (error) => console.error('视频质量更新失败:', error)
     * });
     * ```
     */
    const updateVideoQuality = useCallback(async (params: UpdateVideoQualityOptions): Promise<void> => {
        const qualityValue = VIDEO_QUALITY_STRING_MAP[params.quality] ?? 1;
        
        const { onSuccess, onError, quality, ...otherParams } = params;
        const qualityParams = {
            ...otherParams,
            quality: qualityValue,
        };

        try {
            const result = await callNativeAPI<void>('updateVideoQuality', qualityParams);

            if (result.success) {
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Update video quality failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);

    /**
     * 开始屏幕共享
     * 
     * @example
     * ```tsx
     * startScreenShare();
     * ```
     */
    const startScreenShare = useCallback(async (): Promise<void> => {
        try {
            await callNativeAPI<void>('startScreenShare');
        } catch (error) {
            console.error('startScreenShare error:', error);
        }
    }, []);

    /**
     * 停止屏幕共享
     * 
     * @example
     * ```tsx
     * stopScreenShare();
     * ```
     */
    const stopScreenShare = useCallback(async (): Promise<void> => {
        try {
            await callNativeAPI<void>('stopScreenShare');
        } catch (error) {
            console.error('stopScreenShare error:', error);
        }
    }, []);

    /**
     * 添加设备事件监听
     *
     * @param eventName - 事件名称
     * @param listener - 事件回调函数
     * @param listenerID - 监听器ID（可选）
     * @example
     * ```tsx
     * addDeviceListener('onDeviceStatusChanged', (params) => {
     *   console.log('设备状态变化:', params);
     * });
     * ```
     */
    const addDeviceListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
        const createListenerKeyObject: HybridListenerKey = {
            type: 'state',
            store: 'DeviceStore',
            name: eventName,
            roomID: null,
            listenerID: listenerID ?? null,
        };
        addListener(JSON.stringify(createListenerKeyObject), listener);
    }, []);

    /**
     * 移除设备事件监听
     *
     * @param eventName - 事件名称
     * @param listenerID - 监听器ID（可选）
     * @example
     * ```tsx
     * removeDeviceListener('onDeviceStatusChanged');
     * ```
     */
    const removeDeviceListener = useCallback((eventName: string, listenerID?: string): void => {
        const createListenerKeyObject: HybridListenerKey = {
            type: 'state',
            store: 'DeviceStore',
            name: eventName,
            roomID: null,
            listenerID: listenerID ?? null,
        };
        removeListener(JSON.stringify(createListenerKeyObject));
    }, []);

    return {
        // 麦克风相关状态 - 从全局 store 读取
        microphoneStatus,
        microphoneLastError,
        hasPublishAudioPermission,
        captureVolume,
        currentMicVolume,

        // 摄像头相关状态 - 从全局 store 读取
        cameraStatus,
        cameraLastError,
        isFrontCamera,
        localMirrorType,  // 关键：从 store 读取
        localVideoQuality,

        // 音频输出相关状态 - 从全局 store 读取
        outputVolume,
        currentAudioRoute,

        // 屏幕共享相关状态 - 从全局 store 读取
        screenStatus,

        // 网络信息状态 - 从全局 store 读取
        networkInfo,

        // 方法
        openLocalMicrophone,         // 打开本地麦克风
        closeLocalMicrophone,        // 关闭本地麦克风
        setCaptureVolume,            // 设置采集音量
        setOutputVolume,             // 设置输出音量
        setAudioRoute,               // 设置音频路由
        openLocalCamera,             // 打开本地摄像头
        closeLocalCamera,            // 关闭本地摄像头
        switchCamera,                // 切换摄像头
        switchMirror,                // 切换镜像
        updateVideoQuality,          // 更新视频质量
        startScreenShare,            // 开始屏幕共享
        stopScreenShare,             // 停止屏幕共享
        addDeviceListener,           // 添加设备事件监听
        removeDeviceListener,        // 移除设备事件监听
    };
}

export default useDeviceState;

