/**
 * LiveSummary State 类型定义
 */

/**
 * 直播间统计信息
 */
export interface SummaryData extends Record<string, unknown> {
  viewerCount?: number;
  likeCount?: number;
  giftCount?: number;
  duration?: number;
  [key: string]: unknown;
}

