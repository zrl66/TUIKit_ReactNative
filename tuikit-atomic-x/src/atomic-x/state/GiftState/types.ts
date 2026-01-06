/**
 * Gift State 类型定义
 */

/**
 * 礼物参数类型定义
 */
export interface GiftParam {
  giftID: string;
  name: string;
  desc?: string;
  iconURL?: string;
  resourceURL?: string;
  level?: number;
  coins?: number;
  extensionInfo?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * 礼物分类参数类型定义
 */
export interface GiftCategoryParam {
  categoryID?: string;
  name?: string;
  desc?: string;
  extensionInfo?: Record<string, string>;
  giftList?: GiftParam[];
  [key: string]: unknown;
}

/**
 * 刷新可用礼物列表选项
 */
export interface RefreshUsableGiftsOptions extends Record<string, unknown> {
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 发送礼物选项
 */
export interface SendGiftOptions extends Record<string, unknown> {
  liveID: string;
  giftID: string;
  count: number;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 设置礼物语言选项
 */
export interface SetLanguageOptions extends Record<string, unknown> {
  liveID: string;
  language: string;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 直播监听器接口
 */
export interface ILiveListener {
  callback: (params?: unknown) => void;
}

