/**
 * DeviceState Store
 * 单例模式全局状态存储，解决设备状态在多个组件之间不共享的问题
 */

import type {
    DeviceStatusType,
    DeviceErrorType,
    AudioOutputType,
    MirrorType,
    NetworkInfo,
    LocalVideoQuality,
} from './types';
import { MirrorType as MirrorTypeEnum } from './types';

/**
 * 全局设备状态结构
 */
interface DeviceState {
    microphoneStatus?: DeviceStatusType;
    microphoneLastError?: DeviceErrorType;
    hasPublishAudioPermission: boolean;
    captureVolume: number;
    currentMicVolume: number;
    cameraStatus?: DeviceStatusType;
    cameraLastError?: DeviceErrorType;
    isFrontCamera?: boolean;
    localMirrorType: MirrorType;
    localVideoQuality?: LocalVideoQuality;
    outputVolume: number;
    currentAudioRoute?: AudioOutputType;
    screenStatus?: DeviceStatusType;
    networkInfo?: NetworkInfo;
}

/**
 * 状态变化监听器
 */
type StateChangeListener = (state: DeviceState) => void;

/**
 * 全局设备状态存储
 * 注意：设备状态是全局唯一的，不按 liveID 维度区分
 */
class DeviceStore {
    private static instance: DeviceStore;
    private state: DeviceState = {
        microphoneStatus: undefined,
        microphoneLastError: undefined,
        hasPublishAudioPermission: true,
        captureVolume: 0,
        currentMicVolume: 0,
        cameraStatus: undefined,
        cameraLastError: undefined,
        isFrontCamera: undefined,
        localMirrorType: MirrorTypeEnum.AUTO,
        localVideoQuality: undefined,
        outputVolume: 0,
        currentAudioRoute: undefined,
        screenStatus: undefined,
        networkInfo: undefined,
    };
    private listeners: Set<StateChangeListener> = new Set();

    private constructor() { }

    static getInstance(): DeviceStore {
        if (!DeviceStore.instance) {
            DeviceStore.instance = new DeviceStore();
        }
        return DeviceStore.instance;
    }

    /**
     * 获取当前设备状态
     */
    getState(): DeviceState {
        return this.state;
    }

    /**
     * 更新设备状态（部分字段）
     */
    setState(updates: Partial<DeviceState>): void {
        const hasChanged = Object.keys(updates).some(
            (key) => this.state[key as keyof DeviceState] !== updates[key as keyof DeviceState]
        );

        if (hasChanged) {
            this.state = {
                ...this.state,
                ...updates,
            };
            this.notifyListeners();
        }
    }

    /**
     * 订阅设备状态变化
     */
    subscribe(listener: StateChangeListener): () => void {
        this.listeners.add(listener);

        // 订阅时立即推一次当前快照，保证后挂载组件能拿到已有的设备状态
        listener(this.state);

        // 返回取消订阅函数
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * 通知所有订阅者
     */
    private notifyListeners(): void {
        this.listeners.forEach((listener) => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('[DeviceStore] Listener error:', error);
            }
        });
    }

    /**
     * 清理当前设备状态（通常用于重置场景）
     */
    clearState(): void {
        this.state = {
            microphoneStatus: undefined,
            microphoneLastError: undefined,
            hasPublishAudioPermission: true,
            captureVolume: 0,
            currentMicVolume: 0,
            cameraStatus: undefined,
            cameraLastError: undefined,
            isFrontCamera: undefined,
            localMirrorType: MirrorTypeEnum.AUTO,
            localVideoQuality: undefined,
            outputVolume: 0,
            currentAudioRoute: undefined,
            screenStatus: undefined,
            networkInfo: undefined,
        };
        this.notifyListeners();
    }
}

export const deviceStore = DeviceStore.getInstance();
