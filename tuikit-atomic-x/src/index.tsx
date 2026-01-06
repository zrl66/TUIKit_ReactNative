/**
 * TUIRoom Atomic X UI Kit
 * 
 * 统一导出入口，包含：
 * - State 管理模块 (atomic-x)
 * - UI 组件 (components)
 * - 静态资源 (static)
 */

// 导出 State 模块
export * from './atomic-x';

import './locales/index'; // Import i18n config side-effect
export { default as i18n } from './locales/index'; // Export i18n instance
export { useTranslation, I18nextProvider } from 'react-i18next'; // Re-export for consumers

// 导出组件
export * from './components';

// 导出常量
export * from './components/constants';

// 导出静态资源映射
export { StaticImages } from './static';

// 版本信息
export const VERSION = '1.0.0';
