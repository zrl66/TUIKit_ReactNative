/**
 * AudienceActionPanel Component
 * 观众操作面板：展示单个观众信息，并支持「踢出房间」等管理操作
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    Image,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AVATAR_URL } from './constants';
import type { LiveUserInfoParam } from '../atomic-x/state/LiveAudienceState/types';
import { useLiveAudienceState } from '../atomic-x/state/LiveAudienceState';
import { ConfirmDialog } from './ConfirmDialog';

const screenWidth = Dimensions.get('window').width;
const rpxToPx = (rpx: number) => (rpx * screenWidth) / 750;

interface AudienceActionPanelProps {
    visible: boolean;
    liveID: string;
    userInfo?: LiveUserInfoParam | any;
    onClose?: () => void;
}

export function AudienceActionPanel({
    visible,
    liveID,
    userInfo,
    onClose,
}: AudienceActionPanelProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();
    const { kickUserOutOfRoom } = useLiveAudienceState(liveID);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    if (!visible || !userInfo) {
        return null;
    }

    const avatarURL = userInfo.avatarURL || DEFAULT_AVATAR_URL;
    const displayName =
        (userInfo as any).userName || userInfo.nickname || userInfo.userID || '';

    const handleClose = () => {
        setShowConfirmModal(false);
        onClose?.();
    };

    const handleKickOut = () => {
        if (!userInfo?.userID) {
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmKickOut = () => {
        if (!userInfo?.userID) {
            return;
        }
        kickUserOutOfRoom({
            liveID: liveID,
            userID: String(userInfo.userID),
            onSuccess: () => {
                handleClose();
            },
            onError: (error) => {
                console.error(
                    '[AudienceActionPanel] kickUserOutOfRoom failed:',
                    error,
                );
                setShowConfirmModal(false);
            },
        });
    };

    const handleCancelKickOut = () => {
        setShowConfirmModal(false);
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={handleClose}>
            <View style={styles.bottomDrawerContainer}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.drawerOverlay} />
                </TouchableWithoutFeedback>

                <View
                    style={[
                        styles.bottomDrawer,
                        {
                            paddingBottom: safeAreaInsets.bottom,
                        },
                    ]}>
                    {/* 头部用户信息 */}
                    <View style={styles.drawerHeader}>
                        <View style={styles.userInfo}>
                            <Image
                                source={{ uri: avatarURL }}
                                style={styles.userAvatar}
                            />
                            <View style={styles.userDetails}>
                                <View style={styles.nameBadgeRow}>
                                    <Text style={styles.userName} numberOfLines={1}>
                                        {displayName}
                                    </Text>
                                </View>
                                <Text style={styles.userId} numberOfLines={1}>
                                    ID: {String(userInfo.userID || '')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* 操作区 */}
                    <View style={styles.drawerContent}>
                        <View style={styles.drawerActions}>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                activeOpacity={0.7}
                                onPress={handleKickOut}>
                                <View style={styles.actionBtnImageContainer}>
                                    <Image
                                        source={require('../static/images/kick-out-room.png')}
                                        style={styles.actionBtnImage}
                                        resizeMode="contain"
                                    />
                                </View>
                                <Text style={styles.actionBtnContent}>{t('audienceList.RemoveOut')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* 确认弹窗 */}
            <ConfirmDialog
                visible={showConfirmModal}
                message={t('audienceList.confirmKickOut', { name: displayName })}
                confirmText={t('common.confirm')}
                cancelText={t('common.cancel')}
                onConfirm={handleConfirmKickOut}
                onCancel={handleCancelKickOut}
            />
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    bottomDrawer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(34, 38, 46, 1)',
        borderTopLeftRadius: rpxToPx(32),
        borderTopRightRadius: rpxToPx(32),
        height: rpxToPx(400),
        flexDirection: 'column',
    },
    drawerHeader: {
        paddingHorizontal: rpxToPx(48),
        paddingVertical: rpxToPx(40),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: rpxToPx(80),
        height: rpxToPx(80),
        borderRadius: rpxToPx(40),
        borderWidth: 2,
        borderColor: '#ffffff',
        marginRight: rpxToPx(20),
        backgroundColor: '#f0f0f0',
    },
    userDetails: {
        flexDirection: 'column',
    },
    nameBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: rpxToPx(8),
    },
    userName: {
        color: '#ffffff',
        fontSize: rpxToPx(32),
        fontWeight: '500',
        marginRight: rpxToPx(16),
        maxWidth: rpxToPx(260),
    },
    userId: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: rpxToPx(24),
    },
    drawerContent: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingHorizontal: rpxToPx(48),
    },
    drawerActions: {
        flexDirection: 'row',
        paddingTop: rpxToPx(16),
    },
    actionBtn: {
        flexDirection: 'column',
        alignItems: 'center',
        marginLeft: rpxToPx(10),
        height: rpxToPx(160),
        width: rpxToPx(120),
    },
    actionBtnImageContainer: {
        width: rpxToPx(100),
        height: rpxToPx(100),
        backgroundColor: 'rgba(43, 44, 48, 1)',
        marginBottom: rpxToPx(16),
        borderRadius: rpxToPx(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnImage: {
        width: rpxToPx(50),
        height: rpxToPx(50),
    },
    actionBtnContent: {
        fontSize: rpxToPx(24),
        color: 'rgba(255, 255, 255, 0.9)',
    },
});


