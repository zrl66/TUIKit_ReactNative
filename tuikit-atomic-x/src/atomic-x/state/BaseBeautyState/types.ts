/**
 * BaseBeauty State 类型定义
 */

/**
 * 设置磨皮级别选项
 */
export interface SetSmoothLevelOptions extends Record<string, unknown> {
  smoothLevel: number;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 设置美白级别选项
 */
export interface SetWhitenessLevelOptions extends Record<string, unknown> {
  whitenessLevel: number;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 设置红润级别选项
 */
export interface SetRuddyLevelOptions extends Record<string, unknown> {
  ruddyLevel: number;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 真实 UI 值类型
 */
export interface RealUiValues {
  whiteness: number;
  smooth: number;
  ruddy: number;
}

/**
 * 美颜类型
 */
export type BeautyType = 'whiteness' | 'smooth' | 'ruddy';

