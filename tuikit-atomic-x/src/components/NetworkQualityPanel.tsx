/**
 * NetworkQualityPanel Component
 * 网络质量面板组件 - 显示网络指标信息
 * 
 * @format
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableWithoutFeedback,
    StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeviceState } from '../atomic-x/state/DeviceState';

interface NetworkQualityPanelProps {
    visible: boolean;
    onClose: () => void;
}

export function NetworkQualityPanel({ visible, onClose }: NetworkQualityPanelProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();
    const { networkInfo } = useDeviceState();

    // 获取网络指标值，提供默认值
    // Vue 版本中 downLoss 和 upLoss 直接显示为 {{ networkInfo.downLoss }}%
    // 判断条件是 > 0.1，说明可能是小数（0-1），0.1 表示 10%
    const delay = (networkInfo?.delay as number) ?? 0;
    const downLoss = (networkInfo?.downLoss as number) ?? 0;
    const upLoss = (networkInfo?.upLoss as number) ?? 0;

    // 格式化显示值 - 与 Vue 版本保持一致
    const formatDelay = () => {
        return `${Math.round(delay)}ms`;
    };

    const formatDownLoss = () => {
        // Vue 版本直接显示 {{ networkInfo.downLoss }}%
        // 为了更好的可读性，统一转换为百分比格式
        // 如果 downLoss 是小数（0-1），转换为百分比（0.05 -> 5.0%）
        // 如果 downLoss 已经是百分比（0-100），直接使用（5 -> 5.0%）
        const value = downLoss <= 1 ? downLoss * 100 : downLoss;
        return `${value.toFixed(1)}%`;
    };

    const formatUpLoss = () => {
        const value = upLoss <= 1 ? upLoss * 100 : upLoss;
        return `${value.toFixed(1)}%`;
    };

    // 判断指标状态（红色/绿色）
    const getDelayColor = () => {
        return delay > 100 ? '#E6594C' : '#38A673';
    };

    const getDownLossColor = () => {
        // Vue 版本判断条件是 > 0.1，说明 downLoss 是小数（0-1）
        // 如果 downLoss > 1，则认为是百分比，阈值应该是 10
        const threshold = downLoss <= 1 ? 0.1 : 10;
        return downLoss > threshold ? '#E6594C' : '#38A673';
    };

    const getUpLossColor = () => {
        const threshold = upLoss <= 1 ? 0.1 : 10;
        return upLoss > threshold ? '#E6594C' : '#38A673';
    };

    if (!visible) {
        return null;
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.container}>
                {/* 遮罩层 */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                {/* 底部抽屉 */}
                <View
                    style={[
                        styles.drawer,
                        {
                            paddingBottom: safeAreaInsets.bottom + 40,
                        },
                    ]}>
                    {/* 标题区域 */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('networkQualityPanel.title')}</Text>
                    </View>

                    {/* 内容区域 */}
                    <View >
                        {/* 网络指标区域 */}
                        <View >
                            <View style={styles.metricsGrid}>
                                {/* 往返延时 */}
                                <View style={styles.metricItem}>
                                    <Text
                                        style={[
                                            styles.metricValue,
                                            { color: getDelayColor() },
                                        ]}>
                                        {formatDelay()}
                                    </Text>
                                    <Text style={styles.metricLabel}>{t('networkQualityPanel.delay')}</Text>
                                </View>

                                {/* 下行丢包率 */}
                                <View style={styles.metricItem}>
                                    <Text
                                        style={[
                                            styles.metricValue,
                                            { color: getDownLossColor() },
                                        ]}>
                                        {formatDownLoss()}
                                    </Text>
                                    <Text style={styles.metricLabel}>{t('networkQualityPanel.downLoss')}</Text>
                                </View>

                                {/* 上行丢包率 */}
                                <View style={styles.metricItem}>
                                    <Text
                                        style={[
                                            styles.metricValue,
                                            { color: getUpLossColor() },
                                        ]}>
                                        {formatUpLoss()}
                                    </Text>
                                    <Text style={styles.metricLabel}>{t('networkQualityPanel.upLoss')}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    drawer: {
        backgroundColor: 'rgba(34, 38, 46, 1)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        maxHeight: '60%',
    },
    header: {
        paddingTop: 20,
        paddingBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        color: '#ffffff',
        fontWeight: '500',
        textAlign: 'center',
    },
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(43, 44, 48, 1)',
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 12,
        textAlign: 'center',
    },
    metricLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
});


