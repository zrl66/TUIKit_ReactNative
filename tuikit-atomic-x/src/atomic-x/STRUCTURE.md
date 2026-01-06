# State 模块目录结构

```
src/atomic-x/
├── bridge/                    # Native 桥接层
│   └── HybridBridge.ts       # HybridBridge 实现：callAPI, addListener, removeListener
│
├── types/                    # 通用类型定义
│   └── index.ts              # 基础类型：StateResult, StateOptions, BaseResponse 等
│
├── utils/                    # 工具函数
│   └── index.ts              # API 调用封装：callNativeAPI, validateRequired 等
│
├── login/                    # 登录相关 State
│   ├── types.ts              # 登录类型定义：LoginParams, LoginData 等
│   └── index.ts              # 登录功能：login, logout, getCurrentUser, checkLoginStatus
│
├── liveList/                 # 直播列表相关 State
│   ├── types.ts              # 直播列表类型定义：LiveRoomInfo, GetLiveListParams 等
│   └── index.ts              # 直播列表功能：getLiveList, createLiveRoom, joinLiveRoom 等
│
├── index.ts                  # 统一导出入口
│
├── package.json              # NPM 包配置文件
├── README.md                 # 使用文档
├── .npmignore                # NPM 发布忽略文件配置
├── USAGE_EXAMPLE.md          # 使用示例
├── PUBLISH_GUIDE.md          # 发布指南
└── STRUCTURE.md              # 本文件：目录结构说明
```

## 模块设计说明

### 1. Bridge 层 (bridge/)

提供与 Native 端交互的基础桥接功能：
- `callAPI()`: 调用 Native API
- `addListener()`: 添加事件监听
- `removeListener()`: 移除事件监听
- `HybridRequest`, `HybridResponse`, `HybridEvent`: 桥接相关类型定义

### 2. 类型系统 (types/)

提供统一的类型定义，包括：
- `StateResult<T>`: 所有 API 调用的统一返回类型
- `StateOptions`: 配置选项（超时、重试等）
- `BaseResponse<T>`: API 响应基础类型

### 3. 工具函数 (utils/)

封装了与 Native 端交互的核心逻辑：
- `callNativeAPI<T>()`: 统一的 Native API 调用方法
  - 支持超时控制
  - 支持自动重试
  - 统一的错误处理
- `validateRequired()`: 参数验证工具

### 4. 功能模块 (login/, liveList/)

每个功能模块包含：
- `types.ts`: 该模块的类型定义
- `index.ts`: 该模块的功能实现

#### Login 模块

提供用户认证相关功能：
- `login()`: 用户登录
- `logout()`: 用户登出
- `getCurrentUser()`: 获取当前用户信息
- `checkLoginStatus()`: 检查登录状态

#### LiveList 模块

提供直播房间相关功能：
- `getLiveList()`: 获取直播列表
- `createLiveRoom()`: 创建直播房间
- `joinLiveRoom()`: 加入直播房间
- `leaveLiveRoom()`: 离开直播房间
- `getLiveRoomInfo()`: 获取房间详情

### 5. 统一导出 (index.ts)

所有功能通过 `index.ts` 统一导出，方便使用：

```typescript
import { login, getLiveList, createLiveRoom } from './src/atomic-x';
```

## 扩展新功能模块

要添加新的功能模块（例如 `userProfile`），按以下步骤：

1. 创建模块目录和文件：
```
src/atomic-x/
└── userProfile/
    ├── types.ts
    └── index.ts
```

2. 在 `types.ts` 中定义类型：
```typescript
export interface GetUserProfileParams {
  userID: string;
}

export interface UserProfileData {
  userID: string;
  nickname?: string;
  avatar?: string;
}
```

3. 在 `index.ts` 中实现功能：
```typescript
import { callNativeAPI } from '../utils';
import { StateResult } from '../types';
import { GetUserProfileParams, UserProfileData } from './types';

export async function getUserProfile(
  params: GetUserProfileParams
): Promise<StateResult<UserProfileData>> {
  return callNativeAPI<UserProfileData>('getUserProfile', params);
}
```

4. 在 `src/atomic-x/index.ts` 中导出：
```typescript
export * from './userProfile';
export * from './userProfile/types';
```

## 依赖关系

```
index.ts (统一导出)
  ├── bridge/HybridBridge.ts (Native 桥接层)
  ├── types/index.ts (基础类型)
  ├── utils/index.ts (工具函数)
  │   └── bridge/HybridBridge.ts (Native 桥接)
  ├── login/index.ts (登录功能)
  │   ├── login/types.ts
  │   └── utils/index.ts
  └── liveList/index.ts (直播列表功能)
      ├── liveList/types.ts
      └── utils/index.ts
```

## NPM 包配置

- **包名**: `@trtc/uikit-live-state`
- **入口文件**: `index.ts`
- **类型定义**: 通过 TypeScript 自动生成
- **发布文件**: 所有 `.ts` 文件和 `README.md`

## 使用方式

### 在项目中使用（开发阶段）

```typescript
import { login, getLiveList } from './src/atomic-x';
```

### 作为 NPM 包使用（发布后）

```typescript
import { login, getLiveList } from '@trtc/uikit-live-state';
```

