/**
 * @module LoginState
 * @module_description
 * 用户身份认证与登录管理模块
 * 核心功能：负责用户身份验证、登录状态管理、用户信息维护等基础认证服务。
 * 技术特点：支持多种认证方式、会话管理、权限验证等高级功能，确保用户身份的安全和有效。
 * 业务价值：为直播平台提供基础的用户认证能力，是所有其他业务模块的前置条件。
 * 应用场景：用户登录、身份验证、会话管理、权限控制等基础认证场景。
 */

import { useState, useEffect, useCallback } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener } from '../../bridge/HybridBridge';
import type { HybridListenerKey } from '../../bridge/HybridBridge';
import type {
  UserProfileParam,
  LoginOptions,
  LogoutOptions,
  SetSelfInfoOptions,
  LoginStatus,
} from './types';
import { validateRequired } from '../../utils';
import { loginStore } from './store';

/**
 * 登录监听器函数类型
 */
type ILiveListener = (params?: unknown) => void;

/**
 * 登录状态事件名称常量
 */
const LOGIN_EVENTS = [
  'loginUserInfo',
  'loginStatus',
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
 * LoginState Hook
 * 
 * @example
 * ```tsx
 * import { useLoginState } from '@/src/atomic-x/state/LoginState';
 * 
 * function LoginComponent() {
 *   const { loginUserInfo, loginStatus, login, logout, setSelfInfo } = useLoginState();
 * 
 *   const handleLogin = async () => {
 *     await login({
 *       sdkAppID: 1400000000,
 *       userID: 'user123',
 *       userSig: 'eJx1kF1PwzAMhv9KlG...',
 *       onSuccess: () => console.log('登录成功'),
 *       onError: (error) => console.error('登录失败:', error)
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       {loginUserInfo && <Text>当前用户: {loginUserInfo.nickname}</Text>}
 *       <Button onPress={handleLogin} title="登录" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useLoginState() {
  // 从全局 store 获取初始状态，确保后挂载组件也能拿到已有登录态
  const initialState = loginStore.getState();

  // 当前登录用户信息（由全局 store 驱动）
  const [loginUserInfo, setLoginUserInfo] = useState<UserProfileParam | undefined>(
    initialState.loginUserInfo,
  );

  // 当前登录状态（由全局 store 驱动）
  const [loginStatus, setLoginStatus] = useState<LoginStatus>(initialState.loginStatus);

  // 事件监听器引用
  type WritableMap = Record<string, unknown>;

  /**
   * 处理登录状态变化事件
   */
  const handleEvent = useCallback((eventName: string) => (event: WritableMap) => {
    try {
      // 如果 event 已经是对象，直接使用；否则尝试解析
      const data = event && typeof event === 'object' && !Array.isArray(event)
        ? event
        : typeof event === 'string'
          ? JSON.parse(event)
          : event;

      console.log(`[LoginState] ${eventName} event received:`, JSON.stringify(data));

      // 检查 data 的 key 是否匹配 LOGIN_EVENTS 中的某个值
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        Object.keys(data).forEach((key) => {
          if (LOGIN_EVENTS.includes(key)) {
            const value = data[key];

            // 根据不同的 key 更新对应的响应式数据
            if (key === 'loginUserInfo') {
              // loginUserInfo 是对象类型
              let parsedData: UserProfileParam;
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                parsedData = value as UserProfileParam;
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<UserProfileParam>(value, {} as UserProfileParam);
              } else {
                parsedData = safeJsonParse<UserProfileParam>(JSON.stringify(value), {} as UserProfileParam);
              }
              if (parsedData?.userID) {
                // 更新全局 store，由 store 统一驱动所有 hook 实例
                loginStore.setState({
                  loginUserInfo: parsedData,
                  loginStatus: 'LOGINED',
                });
              }
            } else if (key === 'loginStatus') {
              // loginStatus 是字符串类型
              let parsedData: LoginStatus;
              if (typeof value === 'string') {
                parsedData = value as LoginStatus;
              } else if (typeof value === 'string') {
                parsedData = safeJsonParse<LoginStatus>(value, 'UNLOGIN');
              } else {
                parsedData = safeJsonParse<LoginStatus>(JSON.stringify(value), 'UNLOGIN');
              }
              // 更新全局 store，由 store 统一驱动所有 hook 实例
              loginStore.setState({
                loginStatus: parsedData,
                // 如果 Native 同时下发 loginUserInfo，可在下次事件中覆盖；这里不主动清空
              });
            }
          }
        });
      }
    } catch (error) {
      console.error(`[LoginState] ${eventName} event parse error:`, error);
      console.log(`[LoginState] ${eventName} event received (raw):`, event);
    }
  }, []);

  /**
   * 订阅全局 loginStore 的变化，驱动本地 state
   * 确保多个组件之间共享同一份登录态
   */
  useEffect(() => {
    const unsubscribe = loginStore.subscribe((state) => {
      setLoginUserInfo(state.loginUserInfo);
      setLoginStatus(state.loginStatus);
    });
    return unsubscribe;
  }, []);

  /**
   * 绑定事件监听
   */
  useEffect(() => {
    const createListenerKeyObject = (eventName: string, listenerID?: string | null): HybridListenerKey => {
      return {
        type: 'state',
        store: 'LoginStore',
        name: eventName,
        roomID: null,
        listenerID: listenerID ?? null,
      };
    };

    // 保存监听器清理函数的引用
    const cleanupFunctions: Array<{ remove: () => void }> = [];

    LOGIN_EVENTS.forEach((eventName) => {
      const keyObject = createListenerKeyObject(eventName);
      const key = JSON.stringify(keyObject);
      console.log(key);
      // addListener 会自动注册 Native 端和 JS 层的事件监听器
      const subscription = addListener(key, handleEvent(eventName));
      if (subscription) {
        cleanupFunctions.push(subscription);
      }

      console.log(`[LoginState] Added listener for: ${eventName}, eventName=${key}`);
    });

    return () => {
      LOGIN_EVENTS.forEach((eventName) => {
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
   * 登录方法
   * 
   * @memberof module:LoginState
   * @param {LoginOptions} params - 登录参数
   * @example
   * ```tsx
   * await login({
   *   sdkAppID: 1400000000,
   *   userID: 'user123',
   *   userSig: 'eJx1kF1PwzAMhv9KlG...',
   *   onSuccess: () => console.log('登录成功'),
   *   onError: (error) => console.error('登录失败:', error)
   * });
   * ```
   */
  const login = useCallback(async (params: LoginOptions): Promise<void> => {
    // 验证必填参数
    const validation = validateRequired(params, ['userID', 'sdkAppID', 'userSig']);
    if (!validation.valid) {
      const error = new Error(`Missing required parameters: ${validation.missing?.join(', ')}`);
      params.onError?.(error);
      return;
    }

    // 提取回调函数
    const { onSuccess, onError, ...loginParams } = params;

    try {
      const result = await callNativeAPI<UserProfileParam>('login', loginParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Login failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 登出方法
   * 
   * @memberof module:LoginState
   * @param {LogoutOptions} params - 登出参数（可选）
   * @example
   * ```tsx
   * await logout({
   *   onSuccess: () => console.log('登出成功'),
   *   onError: (error) => console.error('登出失败:', error)
   * });
   * ```
   */
  const logout = useCallback(async (params?: LogoutOptions): Promise<void> => {
    const { onSuccess, onError, ...logoutParams } = params || {};

    try {
      const result = await callNativeAPI<void>('logout', logoutParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Logout failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 设置用户信息
   * 
   * @memberof module:LoginState
   * @param {SetSelfInfoOptions} userInfo - 用户信息
   * @example
   * ```tsx
   * await setSelfInfo({
   *   userProfile: {
   *     userID: 'user123',
   *     nickname: '张三',
   *     avatarURL: 'https://example.com/avatar.jpg',
   *   },
   *   onSuccess: () => console.log('用户信息设置成功'),
   *   onError: (error) => console.error('用户信息设置失败:', error)
   * });
   * ```
   */
  const setSelfInfo = useCallback(async (userInfo: SetSelfInfoOptions): Promise<void> => {
    // 验证必填参数
    if (!userInfo.userProfile || !userInfo.userProfile.userID) {
      const error = new Error('Missing required parameter: userProfile.userID');
      userInfo.onError?.(error);
      return;
    }

    // 提取回调函数
    const { onSuccess, onError, ...infoParams } = userInfo;

    try {
      const result = await callNativeAPI<UserProfileParam>('setSelfInfo', infoParams);

      if (result.success) {
        // 成功时只触发回调，状态更新由事件监听器处理
        onSuccess?.();
      } else {
        const error = new Error(result.error || 'Set self info failed');
        onError?.(error);
      }
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, []);

  /**
   * 获取登录用户信息
   * 
   * @memberof module:LoginState
   * @returns {UserProfileParam | undefined} 当前登录用户信息，如果未登录则返回 undefined
   * @example
   * ```tsx
   * const userInfo = getLoginUserInfo();
   * if (userInfo) {
   *   console.log('当前用户:', userInfo.nickname);
   * }
   * ```
   */
  const getLoginUserInfo = useCallback((): UserProfileParam | undefined => {
    return loginUserInfo;
  }, [loginUserInfo]);

  /**
   * 添加登录事件监听
   *
   * @memberof module:LoginState
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 事件回调函数
   * @param {string} listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * addLoginListener('onLoginStatusChanged', (params) => {
   *   console.log('登录状态变化:', params);
   * });
   * ```
   */
  const addLoginListener = useCallback((eventName: string, listener: ILiveListener, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'LoginStore',
      name: eventName,
      roomID: null,
      listenerID: listenerID ?? null,
    };
    addListener(JSON.stringify(createListenerKeyObject), listener);
  }, []);

  /**
   * 移除登录事件监听
   *
   * @memberof module:LoginState
   * @param {string} eventName - 事件名称
   * @param {string} listenerID - 监听器ID（可选）
   * @example
   * ```tsx
   * removeLoginListener('onLoginStatusChanged');
   * ```
   */
  const removeLoginListener = useCallback((eventName: string, listenerID?: string): void => {
    const createListenerKeyObject: HybridListenerKey = {
      type: 'state',
      store: 'LoginStore',
      name: eventName,
      roomID: null,
      listenerID: listenerID ?? null,
    };
    removeListener(JSON.stringify(createListenerKeyObject));
  }, []);

  return {
    loginUserInfo,      // 当前登录用户信息
    loginStatus,        // 当前登录状态
    login,              // 登录方法
    logout,             // 登出方法
    setSelfInfo,        // 设置用户信息
    getLoginUserInfo,   // 获取登录用户信息
    addLoginListener,   // 添加登录事件监听
    removeLoginListener, // 移除登录事件监听
  };
}

export default useLoginState;
