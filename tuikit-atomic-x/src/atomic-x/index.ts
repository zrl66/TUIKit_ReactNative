/**
 * State 模块统一导出
 * 
 * 该模块提供了与 Native 端交互的状态管理功能
 * 支持以 npm 包的方式发布和使用
 */

// 导出 Bridge（Native 桥接层）
export * from './bridge/HybridBridge';

// 导出类型
export * from './types';

// 导出工具函数
export * from './utils';

// 导出 State 模块（包含所有 State hooks 和类型）
export * from './state';

// 版本信息
export const VERSION = '1.0.0';

