/**
 * CoGuestRequestPanel Component
 * 连麦请求面板组件
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Image,
    StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoGuestState } from '../atomic-x/state/CoGuestState';
import { CuestErrorCode } from '../atomic-x/state/CoGuestState/types';
import { showToast } from './CustomToast';

interface CoGuestRequestPanelProps {
    visible: boolean;
    liveID: string;
    userID?: string;
    seatIndex?: number;
    onClose?: () => void;
    onStatusChange?: (
        status: 'IDLE' | 'USER_APPLYING' | 'CONNECTED',
        coGuestType?: 'video' | 'mic' | '',
    ) => void;
}

export function CoGuestRequestPanel({
    visible,
    liveID,
    userID: _userID = '',
    seatIndex = -1,
    onClose,
    onStatusChange,
}: CoGuestRequestPanelProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();
    const { applyForSeat } = useCoGuestState(liveID);
    const slideAnim = useRef(new Animated.Value(0)).current;

    // 动画效果
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, slideAnim]);

    const handleClose = () => {
        onClose?.();
    };

    const handleSendCoGuest = (type: string) => {

        onStatusChange?.('USER_APPLYING', type as 'video' | 'mic');
        handleClose();
        showToast(t('coGuest.waitingForAnchor'), 2000);
        applyForSeat({
            liveID: liveID,
            seatIndex: seatIndex,
            timeout: 30,
            onSuccess: () => {
                console.log('你提交了连麦申请,请等待主播同意');
            },
            onError: (error: any) => {
                if (error?.code === CuestErrorCode.NOT_SUPPORT) {
                    showToast(t('coGuest.notSupportCoGuest'), 2000);
                }
                onStatusChange?.('IDLE', type as 'video' | 'mic');
            },
        });
    };

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [250, 0],
    });

    if (!visible) {
        return null;
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.drawer,
                        {
                            transform: [{ translateY }],
                            paddingBottom: safeAreaInsets.bottom,
                        },
                    ]}>
                    {/* 头部 */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('coGuest.title')}</Text>
                        <Text style={styles.subtitle}>{t('coGuest.waitingForAnchor')}</Text>
                    </View>

                    {/* 内容 */}
                    <View style={styles.content}>
                        <View style={styles.divider} />

                        {/* 申请视频连麦 */}
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => handleSendCoGuest('video')}
                            activeOpacity={0.7}>
                            <View style={styles.actionContent}>
                                <Image
                                    source={require('../static/images/mode.png')}
                                    style={styles.actionIcon}
                                    resizeMode="contain"
                                />
                                <Text style={styles.actionText}>{t('coGuest.applyVideo')}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* 申请语音连麦 */}
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => handleSendCoGuest('mic')}
                            activeOpacity={0.7}>
                            <View style={styles.actionContent}>
                                <Image
                                    source={require('../static/images/live-comic.png')}
                                    style={styles.actionIcon}
                                    resizeMode="contain"
                                />
                                <Text style={styles.actionText}>{t('coGuest.applyAudio')}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    drawer: {
        backgroundColor: 'rgba(34, 38, 46, 1)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: 250,
    },
    header: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(213, 224, 242, 1)',
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '400',
        color: 'rgba(124, 133, 166, 1)',
        marginTop: 10,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(79, 88, 107, 0.3)',
        opacity: 0.2,
    },
    actionItem: {
        padding: 15,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 5,
    },
    actionIcon: {
        width: 18,
        height: 18,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '400',
        color: 'rgba(213, 224, 242, 1)',
        marginLeft: 5,
    },
});

