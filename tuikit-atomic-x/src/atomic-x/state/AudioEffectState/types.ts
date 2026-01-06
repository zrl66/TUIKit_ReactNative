/**
 * AudioEffect State 类型定义
 */

/**
 * 变声器类型参数
 */
export type AudioChangerTypeParam =
  | 'NONE'
  | 'CHILD'
  | 'LITTLE_GIRL'
  | 'MAN'
  | 'HEAVY_METAL'
  | 'COLD'
  | 'FOREIGNER'
  | 'TRAPPED_BEAST'
  | 'FATSO'
  | 'STRONG_CURRENT'
  | 'HEAVY_MACHINERY'
  | 'ETHEREAL';

/**
 * 混响类型参数
 */
export type AudioReverbTypeParam =
  | 'NONE'
  | 'KTV'
  | 'SMALL_ROOM'
  | 'AUDITORIUM'
  | 'DEEP'
  | 'LOUD'
  | 'METALLIC'
  | 'MAGNETIC';

/**
 * 设置变声效果选项
 */
export interface SetAudioChangerTypeOptions extends Record<string, unknown> {
  changerType: AudioChangerTypeParam;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 设置混响效果选项
 */
export interface SetAudioReverbTypeOptions extends Record<string, unknown> {
  reverbType: AudioReverbTypeParam;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 设置耳返开关选项
 */
export interface SetVoiceEarMonitorEnableOptions extends Record<string, unknown> {
  enable: boolean;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

/**
 * 音量选项
 */
export interface VolumeOptions extends Record<string, unknown> {
  volume: number;
  onSuccess?: () => void;
  onError?: (error: Error | string) => void;
  [key: string]: unknown;
}

