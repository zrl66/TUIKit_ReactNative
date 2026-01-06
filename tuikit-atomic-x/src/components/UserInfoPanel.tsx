/**
 * UserInfoPanel Component
 * 用户信息面板组件
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableWithoutFeedback,
    Image,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_AVATAR_URL } from './constants';

const screenWidth = Dimensions.get('window').width;
// rpx to px conversion: 750rpx = screenWidth
const rpxToPx = (rpx: number) => (rpx * screenWidth) / 750;

interface UserInfoPanelProps {
    visible: boolean;
    userInfo?: {
        userID?: string;
        nickname?: string;
        userName?: string;
        avatarURL?: string;
        liveID?: string;
        roomId?: string;
        [key: string]: unknown;
    };
    isShowAnchor?: boolean;
    onClose?: () => void;
}

export function UserInfoPanel({
    visible,
    userInfo,
    isShowAnchor = true,
    onClose,
}: UserInfoPanelProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();

    if (!visible || !userInfo) {
        return null;
    }

    const displayName = userInfo.userName || userInfo.userID || '';
    const avatarURL = userInfo.avatarURL || DEFAULT_AVATAR_URL;
    const roomID = userInfo.liveID || userInfo.roomId;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.bottomDrawerContainer}>
            <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.drawerOverlay} />
                </TouchableWithoutFeedback>
                        <View
                            style={[
                        styles.bottomDrawer,
                                {
                                    paddingBottom: safeAreaInsets.bottom,
                                },
                            ]}>
                    {/* 头像容器 - 绝对定位在顶部 */}
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: avatarURL }} style={styles.avatar} />
                            </View>

                    {/* 用户信息容器 */}
                    <View style={styles.userInfoContainer}>
                                    <Text style={styles.userName}>{displayName}</Text>
                        {isShowAnchor ? (
                            <Text style={styles.userRoomid}>
                                {t('userInfoPanel.liveRoomId')}：{roomID || ''}
                            </Text>
                        ) : (
                            <Text style={styles.userRoomid}>{t('userInfoPanel.userId')}：{userInfo.userID || ''}</Text>
                                    )}
                                </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    bottomDrawerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        zIndex: 1000,
    },
    drawerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 16, 20, 0.8)',
    },
    bottomDrawer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(34, 38, 46, 1)',
        borderTopLeftRadius: rpxToPx(32), // 32rpx
        borderTopRightRadius: rpxToPx(32), // 32rpx
        height: rpxToPx(400), // 400rpx
        paddingVertical: rpxToPx(20), // 20rpx
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarContainer: {
        width: rpxToPx(200), // 200rpx
        height: rpxToPx(120), // 120rpx
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
    },
    avatar: {
        width: rpxToPx(112), // 112rpx
        height: rpxToPx(112), // 112rpx
        borderRadius: rpxToPx(56), // 56rpx
    },
    userInfoContainer: {
        flex: 1,
        paddingTop: rpxToPx(120), // 120rpx
        alignItems: 'center',
    },
    userName: {
        fontSize: rpxToPx(32), // 32rpx
        color: 'rgba(255, 255, 255, 0.9)',
    },
    userRoomid: {
        fontSize: rpxToPx(24), // 24rpx
        color: 'rgba(255, 255, 255, 0.55)',
        marginTop: rpxToPx(20), // 20rpx
    },
});

