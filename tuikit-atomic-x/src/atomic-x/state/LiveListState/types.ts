/**
 * LiveList State 类型定义
 */

/**
 * 上麦模式类型
 * @remarks
 * 可用值：
 * - `FREE`: 自由上麦模式
 * - `APPLY`: 申请上麦模式
 */
export type TakeSeatModeType = 'FREE' | 'APPLY';

/**
 * 直播间用户信息参数
 * @interface LiveUserInfoParam
 * @description 直播间用户信息结构
 * @param {string} userID - 用户ID（必填）
 * @param {string} userName - 用户名（可选）
 * @param {string} avatarURL - 头像URL（可选）
 */
export type LiveUserInfoParam = {
  userID?: string;
  userName?: string;
  avatarURL?: string;
};

/**
 * 直播信息参数
 */
export interface LiveInfoParam {
  liveID: string;
  liveName?: string;
  notice?: string;
  isMessageDisable?: boolean;
  isPublicVisible?: boolean;
  isSeatEnabled?: boolean;
  keepOwnerOnSeat?: boolean;
  maxSeatCount?: number;
  seatMode?: TakeSeatModeType;
  seatLayoutTemplateID?: number;
  coverURL?: string;
  backgroundURL?: string;
  categoryList?: number[];
  activityStatus?: number;
  readonly totalViewerCount?: number;
  readonly liveOwner?: LiveUserInfoParam;
  readonly createTime?: number;
  isGiftEnabled?: boolean;
  metaData?: Map<string, string>;
}

/**
 * 获取直播列表选项
 */
export interface FetchLiveListOptions extends Record<string, unknown> {
  cursor?: string;
  count?: number;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
}

/**
 * 创建直播选项
 */
export interface CreateLiveOptions extends Record<string, unknown> {
  liveInfo: LiveInfoParam;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
}

/**
 * 加入直播选项
 */
export interface JoinLiveOptions extends Record<string, unknown> {
  liveID: string;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
}

/**
 * 离开直播选项
 */
export interface LeaveLiveOptions extends Record<string, unknown> {
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
}

/**
 * 结束直播选项
 */
export interface EndLiveOptions extends Record<string, unknown> {
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
}

/**
 * 更新直播信息选项
 */
export interface UpdateLiveInfoOptions extends Record<string, unknown> {
  liveID: string;
  title?: string;
  coverUrl?: string;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
}

/**
 * 实验性 API 调用选项
 */
export interface CallExperimentalAPIOptions extends Record<string, unknown> {
  api: string;
  params?: Record<string, unknown>;
  onResponse?: (res?: string) => void;
}

/**
 * 直播监听器函数类型
 */
export type ILiveListener = (params?: unknown) => void;
