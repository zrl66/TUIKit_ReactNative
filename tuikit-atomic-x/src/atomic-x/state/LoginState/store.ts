/**
 * LoginState Store
 * 单例模式全局状态存储，解决登录状态在多个组件之间不共享的问题
 */

import type { UserProfileParam, LoginStatus } from './types';

/**
 * 全局登录状态结构
 */
interface LoginState {
    loginUserInfo?: UserProfileParam;
    loginStatus: LoginStatus;
}

/**
 * 状态变化监听器
 */
type StateChangeListener = (state: LoginState) => void;

/**
 * 全局登录状态存储
 * 注意：登录是全局唯一的，不按 liveID 维度区分
 */
class LoginStore {
    private static instance: LoginStore;
    private state: LoginState = {
        loginUserInfo: undefined,
        loginStatus: 'UNLOGIN',
    };
    private listeners: Set<StateChangeListener> = new Set();

    private constructor() { }

    static getInstance(): LoginStore {
        if (!LoginStore.instance) {
            LoginStore.instance = new LoginStore();
        }
        return LoginStore.instance;
    }

    /**
     * 获取当前登录状态
     */
    getState(): LoginState {
        return this.state;
    }

    /**
     * 更新登录状态（部分字段）
     */
    setState(updates: Partial<LoginState>): void {
        this.state = {
            ...this.state,
            ...updates,
        };
        this.notifyListeners();
    }

    /**
     * 订阅登录状态变化
     */
    subscribe(listener: StateChangeListener): () => void {
        this.listeners.add(listener);

        // 订阅时立即推一次当前快照，保证后挂载组件能拿到已有的登录态
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
                console.error('[LoginStore] Listener error:', error);
            }
        });
    }

    /**
     * 清理当前登录状态（通常用于全量登出场景）
     */
    clearState(): void {
        this.state = {
            loginUserInfo: undefined,
            loginStatus: 'UNLOGIN',
        };
        this.notifyListeners();
    }
}

export const loginStore = LoginStore.getInstance();


