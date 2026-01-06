# Vue 到 React Native State 模块转换规则

本文档提供了将 Vue 版本的 State 模块转换为 React Native 版本的标准化规则和最佳实践。

## ⚠️ 重要设计原则

**响应式数据更新规则**：所有状态更新必须完全由事件回调驱动，主动调用接口方法不应该直接更新状态。

- ✅ **正确**：调用 `callNativeAPI` → Native 端处理 → 触发事件 → 事件监听器更新状态
- ❌ **错误**：调用 `callNativeAPI` → 在方法内直接调用 `setState` 更新状态

这样可以确保状态的一致性，避免竞态条件，并且状态更新完全由 Native 端的状态变化驱动。

## 目录结构

```
src/atomic-x/state/
├── [StateName]State/
│   ├── index.ts          # Hook 实现
│   └── types.ts          # 类型定义
└── VUE_TO_RN_CONVERSION_RULES.md  # 本文档
```

## 核心转换规则

### 1. 状态管理转换

#### Vue 版本
```typescript
import { ref } from "vue";

const loginUserInfo = ref<UserProfileParam>();
const loginStatus = ref<string>();
```

#### React Native 版本
```typescript
import { useState } from 'react';

const [loginUserInfo, setLoginUserInfo] = useState<UserProfileParam | undefined>();
const [loginStatus, setLoginStatus] = useState<LoginStatus>('loggedOut');
```

**规则**:
- `ref<T>()` → `useState<T | undefined>()`
- 使用 `setXxx` 函数来更新状态
- 为状态提供明确的初始值

### 2. 原生方法调用转换

#### Vue 版本
```typescript
import { callUTSFunction } from "../utils/utsUtils";

function login(params: LoginOptions): void {
    callUTSFunction("login", params);
}
```

#### React Native 版本
```typescript
import { callNativeAPI } from '../../utils';

const login = useCallback(async (params: LoginOptions): Promise<void> => {
    const { onSuccess, onError, ...loginParams } = params;
    
    try {
        const result = await callNativeAPI<UserProfileParam>('login', loginParams);
        
        if (result.success && result.data) {
            setLoginUserInfo(result.data);
            onSuccess?.();
        } else {
            onError?.(new Error(result.error || 'Login failed'));
        }
    } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
    }
}, []);
```

**规则**:
- `callUTSFunction` → `callNativeAPI`
- 方法改为 `async` 并返回 `Promise<void>`
- 使用 `useCallback` 包装方法以优化性能
- 提取回调函数（`onSuccess`, `onError`）与业务参数分离
- 使用 `StateResult<T>` 处理返回结果
- 统一错误处理：将错误转换为 `Error` 对象

### 3. 事件监听转换

#### Vue 版本
```typescript
import { getRTCRoomEngineManager } from "./rtcRoomEngine";

function bindEvent(): void {
    getRTCRoomEngineManager().on("loginStoreChanged", onLoginStoreChanged, '');
}

const onLoginStoreChanged = (eventName: string, res: string): void => {
    if (eventName === "loginUserInfo") {
        const data = safeJsonParse<UserProfileParam>(res, {});
        loginUserInfo.value = data;
    }
};
```

#### React Native 版本
```typescript
import { addListener, removeListener, HybridEvent } from '../../bridge/HybridBridge';

const handleLoginStoreChanged = useCallback((event: HybridEvent) => {
    try {
        const { event: eventName, payload } = event;
        
        if (eventName === 'loginUserInfo' && payload) {
            const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const data = safeJsonParse<UserProfileParam>(payloadStr, {} as UserProfileParam);
            if (data.userID) {
                setLoginUserInfo(data);
            }
        }
    } catch (error) {
        console.error('handleLoginStoreChanged error:', error);
    }
}, []);

useEffect(() => {
    const listener = (event: HybridEvent) => {
        if (event.event === 'loginStoreChanged' || 
            event.event === 'loginUserInfo' || 
            event.event === 'loginStatus') {
            handleLoginStoreChanged(event);
        }
    };
    
    addListener(listener);
    
    return () => {
        removeListener();
    };
}, [handleLoginStoreChanged]);
```

**规则**:
- `getRTCRoomEngineManager().on()` → `addListener()` / `removeListener()`
- 在 `useEffect` 中设置和清理事件监听
- 使用 `useCallback` 优化事件处理函数
- 事件格式：`HybridEvent { event: string, payload?: unknown }`
- 在清理函数中调用 `removeListener()`

### 4. JSON 解析转换

#### Vue 版本
```typescript
import { safeJsonParse } from "../utils/utsUtils";

const data = safeJsonParse<UserProfileParam>(res, {});
```

#### React Native 版本
```typescript
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

const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
const data = safeJsonParse<UserProfileParam>(payloadStr, {} as UserProfileParam);
```

**规则**:
- 在模块内部实现 `safeJsonParse` 函数
- 处理 `payload` 可能是对象或字符串的情况
- 提供默认值以避免运行时错误

### 5. Hook 导出转换

#### Vue 版本
```typescript
export function useLoginState() {
    bindEvent();
    
    return {
        loginUserInfo,
        loginStatus,
        login,
        logout,
        setSelfInfo,
        getLoginUserInfo,
    };
}

export default useLoginState;
```

#### React Native 版本
```typescript
export function useLoginState() {
    // 状态定义
    const [loginUserInfo, setLoginUserInfo] = useState<UserProfileParam | undefined>();
    const [loginStatus, setLoginStatus] = useState<LoginStatus>('loggedOut');
    
    // 事件监听（在 useEffect 中）
    useEffect(() => {
        // ... 事件绑定逻辑
    }, []);
    
    // 方法定义（使用 useCallback）
    const login = useCallback(async (params: LoginOptions): Promise<void> => {
        // ... 实现
    }, []);
    
    return {
        loginUserInfo,
        loginStatus,
        login,
        logout,
        setSelfInfo,
        getLoginUserInfo,
    };
}

export default useLoginState;
```

**规则**:
- Hook 名称保持一致：`use[StateName]State`
- 所有状态使用 `useState`
- 所有方法使用 `useCallback` 包装
- 事件监听在 `useEffect` 中设置
- 返回接口保持一致

### 6. 类型定义转换

#### Vue 版本
```typescript
import { UserProfileParam, LoginOptions, LogoutOptions, SetSelfInfoOptions } from "@/uni_modules/tuikit-atomic-x";
```

#### React Native 版本
```typescript
// 在 types.ts 中定义
export interface UserProfileParam {
    userID: string;
    nickname?: string;
    avatarURL?: string;
    [key: string]: unknown;
}

export interface LoginOptions extends Record<string, unknown> {
    sdkAppID: number;
    userID: string;
    userSig: string;
    onSuccess?: () => void;
    onError?: (error: Error | string) => void;
}
```

**规则**:
- 所有类型定义在 `types.ts` 文件中
- 选项接口继承 `Record<string, unknown>`
- 回调函数类型：`onSuccess?: () => void`, `onError?: (error: Error | string) => void`
- 使用明确的类型而不是 `any`

### 7. 文档注释转换

#### Vue 版本
```typescript
/**
 * @module LoginState
 * @module_description
 * 用户身份认证与登录管理模块
 */
```

#### React Native 版本
```typescript
/**
 * @module LoginState
 * @module_description
 * 用户身份认证与登录管理模块
 * 核心功能：负责用户身份验证、登录状态管理、用户信息维护等基础认证服务。
 * 技术特点：支持多种认证方式、会话管理、权限验证等高级功能，确保用户身份的安全和有效。
 * 业务价值：为直播平台提供基础的用户认证能力，是所有其他业务模块的前置条件。
 * 应用场景：用户登录、身份验证、会话管理、权限控制等基础认证场景。
 */
```

**规则**:
- 保留所有 JSDoc 注释
- 更新示例代码为 React Native 语法
- 使用 `@example` 标签提供使用示例

## 完整转换模板

### 文件结构

```
src/atomic-x/state/[StateName]State/
├── index.ts    # Hook 实现
└── types.ts    # 类型定义
```

### index.ts 模板

```typescript
/**
 * @module [StateName]State
 * @module_description
 * [模块描述]
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { callNativeAPI } from '../../utils';
import { addListener, removeListener, HybridEvent } from '../../bridge/HybridBridge';
import { validateRequired } from '../../utils';
import { [相关类型] } from './types';

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
 * [StateName]State Hook
 * 
 * @example
 * ```tsx
 * import { use[StateName]State } from '@/src/atomic-x/state/[StateName]State';
 * 
 * function Component() {
 *   const { ... } = use[StateName]State();
 *   // ...
 * }
 * ```
 */
export function use[StateName]State() {
    // 1. 状态定义
    const [state1, setState1] = useState<Type1 | undefined>();
    const [state2, setState2] = useState<Type2>('default');
    
    // 2. 事件监听器引用
    const listenerRef = useRef<((event: HybridEvent) => void) | null>(null);
    
    // 3. 事件处理函数
    const handleEvent = useCallback((event: HybridEvent) => {
        try {
            const { event: eventName, payload } = event;
            // 处理事件逻辑
        } catch (error) {
            console.error('handleEvent error:', error);
        }
    }, []);
    
    // 4. 绑定事件监听
    useEffect(() => {
        const listener = (event: HybridEvent) => {
            if (event.event === 'relevantEvent') {
                handleEvent(event);
            }
        };
        
        listenerRef.current = listener;
        addListener(listener);
        
        return () => {
            if (listenerRef.current) {
                removeListener();
                listenerRef.current = null;
            }
        };
    }, [handleEvent]);
    
    // 5. 方法定义
    const method1 = useCallback(async (params: MethodParams): Promise<void> => {
        // 参数验证
        const validation = validateRequired(params, ['requiredField']);
        if (!validation.valid) {
            const error = new Error(`Missing required parameters: ${validation.missing?.join(', ')}`);
            params.onError?.(error);
            return;
        }
        
        // 提取回调
        const { onSuccess, onError, ...methodParams } = params;
        
        try {
            const result = await callNativeAPI<ReturnType>('methodName', methodParams);
            
            if (result.success) {
                // ⚠️ 重要：不要在这里更新状态！
                // 状态更新完全由事件监听器 handleEvent 处理
                // 这里只负责触发成功回调
                onSuccess?.();
            } else {
                const error = new Error(result.error || 'Method failed');
                onError?.(error);
            }
        } catch (error: any) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    }, []);
    
    // 6. 返回值
    return {
        state1,
        state2,
        method1,
        // ...
    };
}

export default use[StateName]State;
```

### types.ts 模板

```typescript
/**
 * [StateName] State 类型定义
 */

/**
 * [类型描述]
 */
export interface [TypeName] extends Record<string, unknown> {
    field1: string;
    field2?: number;
    onSuccess?: () => void;
    onError?: (error: Error | string) => void;
    [key: string]: unknown;
}
```

## 检查清单

转换完成后，请检查以下项目：

- [ ] 所有 `ref` 已转换为 `useState`
- [ ] 所有 `callUTSFunction` 已转换为 `callNativeAPI`
- [ ] 所有事件监听已使用 `addListener` / `removeListener`
- [ ] 所有方法已使用 `useCallback` 包装
- [ ] 所有事件监听在 `useEffect` 中设置和清理
- [ ] 所有类型定义在 `types.ts` 中
- [ ] 所有回调函数已正确提取和处理
- [ ] **⚠️ 重要：主动调用接口方法中不包含任何 `setState` 调用**
- [ ] **⚠️ 重要：所有状态更新都在事件监听器中处理**
- [ ] 错误处理统一使用 `Error` 对象
- [ ] JSDoc 注释已更新为 React Native 示例
- [ ] 通过 lint 检查，无错误
- [ ] 导出的 Hook 名称符合规范

## 注意事项

1. **性能优化**: 使用 `useCallback` 和 `useMemo` 避免不必要的重渲染
2. **内存泄漏**: 确保在 `useEffect` 的清理函数中移除事件监听
3. **类型安全**: 避免使用 `any`，使用明确的类型定义
4. **错误处理**: 统一错误处理格式，提供有意义的错误信息
5. **代码复用**: 公共工具函数（如 `safeJsonParse`）可以在 `utils` 中提取

## 示例：完整转换

参考 `LoginState` 模块的完整实现作为转换示例。

