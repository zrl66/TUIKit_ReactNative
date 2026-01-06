/**
 * Like State 类型定义
 */

/**
 * 发送点赞选项
 */
export interface SendLikeOptions extends Record<string, unknown> {
  count?: number;
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

