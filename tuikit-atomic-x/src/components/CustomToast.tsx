/**
 * CustomToast Component
 * 自定义 Toast 组件，浅色背景、黑色文字、圆角矩形
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomToastProps {
    message: string;
    visible: boolean;
    duration?: number;
    onHide?: () => void;
}

export function CustomToast({ message, visible, duration = 2000, onHide }: CustomToastProps) {
    const [opacity] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            // 显示动画
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // 自动隐藏
            const timer = setTimeout(() => {
                hide();
            }, duration);

            return () => clearTimeout(timer);
        } else {
            // 隐藏动画
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
            return undefined;
        }
    }, [visible, duration, opacity]);

    const hide = () => {
        Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onHide?.();
        });
    };

    // 如果没有消息，不渲染
    if (!message) {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View style={[styles.toastContainer, { opacity }]}>
                <Text style={styles.toastText} numberOfLines={3}>
                    {message}
                </Text>
            </Animated.View>
        </View>
    );
}

// Toast 管理器
class ToastManager {
    private message: string = '';
    private visible: boolean = false;
    private duration: number = 2000;
    private listeners: Set<(visible: boolean, message: string) => void> = new Set();

    show(message: string, duration: number = 2000) {
        this.message = message;
        this.duration = duration;
        this.visible = true;
        this.notifyListeners();

        // 自动隐藏
        setTimeout(() => {
            this.hide();
        }, duration);
    }

    hide() {
        this.visible = false;
        this.notifyListeners();
    }

    subscribe(listener: (visible: boolean, message: string) => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach((listener) => {
            listener(this.visible, this.message);
        });
    }

    getState() {
        return {
            visible: this.visible,
            message: this.message,
            duration: this.duration,
        };
    }
}

const toastManager = new ToastManager();

// Toast 容器组件（需要在 App 根组件中使用）
export function CustomToastContainer() {
    const [state, setState] = useState(toastManager.getState());

    useEffect(() => {
        const unsubscribe = toastManager.subscribe((visible, message) => {
            setState({ visible, message, duration: toastManager.getState().duration });
        });

        return unsubscribe;
    }, []);

    return (
        <CustomToast
            message={state.message}
            visible={state.visible}
            duration={state.duration}
            onHide={() => {
                setState({ visible: false, message: '', duration: 2000 });
            }}
        />
    );
}

// 导出便捷方法
export const showToast = (message: string, duration?: number) => {
    toastManager.show(message, duration);
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000, // 提高 zIndex，确保显示在 Modal 之上
        pointerEvents: 'none',
        elevation: 10000, // Android 使用 elevation
    },
    toastContainer: {
        minWidth: 120, // 最小宽度，确保短文本也有合适的显示
        maxWidth: SCREEN_WIDTH * 0.8, // 最大宽度，防止超长文本占满屏幕
        alignSelf: 'center', // 居中显示，宽度根据内容自适应
        backgroundColor: '#F0F0F0', // 浅色背景（几乎白色，略带浅蓝灰色）
        borderRadius: 12, // 圆角（更圆润）
        paddingHorizontal: 20,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
    },
    toastText: {
        fontSize: 15,
        fontWeight: '400',
        color: '#000000', // 黑色文字
        textAlign: 'center',
        lineHeight: 20,
        flexShrink: 1, // 允许文本收缩
    },
});

