/**
 * CoGuestPanel Component
 * 连观众面板组件
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    ScrollView,
    Image,
    StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoGuestState } from '../atomic-x/state/CoGuestState';
import { DEFAULT_AVATAR_URL } from './constants';
import type { LiveUserInfoParam } from '../atomic-x/state/CoGuestState/types';

interface CoGuestPanelProps {
    visible: boolean;
    liveID: string;
    activeTab?: 'requests' | 'invitees';
    onClose?: () => void;
}

export function CoGuestPanel({ visible, liveID, activeTab = 'requests', onClose }: CoGuestPanelProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();
    const { applicants, acceptApplication, rejectApplication } = useCoGuestState(liveID);
    const [currentTab, setCurrentTab] = useState<'requests' | 'invitees'>(activeTab);

    // 处理申请操作
    const handleRequest = (audience: LiveUserInfoParam, action: 'accept' | 'reject') => {
        console.log(`${action} request from ${JSON.stringify(audience)}`);

        if (action === 'accept') {
            acceptApplication({
                liveID: liveID,
                userID: audience.userID,
                onSuccess: () => {
                    console.log('acceptApplication success.');
                },
                onError: (error) => {
                    console.error('acceptApplication fail:', error);
                },
            });
            return;
        }

        if (action === 'reject') {
            rejectApplication({
                liveID: liveID,
                userID: audience.userID,
                onSuccess: () => {
                    console.log('rejectApplication success.');
                },
                onError: (error) => {
                    console.error('rejectApplication fail:', error);
                },
            });
        }
    };

    if (!visible) {
        return null;
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                <View
                    style={[
                        styles.drawer,
                        {
                            paddingBottom: safeAreaInsets.bottom,
                            height: 500,
                        },
                    ]}>
                    {/* 头部标签 */}
                    <View style={styles.header}>
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.tabItem,
                                    currentTab === 'requests' && styles.tabItemActive,
                                ]}
                                onPress={() => setCurrentTab('requests')}
                                activeOpacity={0.7}>
                                <Text
                                    style={[
                                        styles.tabText,
                                        currentTab === 'requests' ? styles.activeText : styles.inactiveText,
                                    ]}>
                                    {t('coGuest.requestList')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 内容区域 */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* 连麦申请列表 */}
                        {currentTab === 'requests' && (
                            <>
                                {applicants.length > 0 ? (
                                    <View style={styles.audienceGrid}>
                                        {applicants.map((audience) => (
                                            <View key={audience.userID} style={styles.audienceItem}>
                                                <View style={styles.audienceInfo}>
                                                    <View style={styles.audienceAvatarContainer}>
                                                        <Image
                                                            source={{
                                                                uri: audience.avatarURL || DEFAULT_AVATAR_URL,
                                                            }}
                                                            style={styles.audienceAvatar}
                                                        />
                                                    </View>
                                                    <View style={styles.audienceItemRight}>
                                                        <View style={styles.audienceDetail}>
                                                            <Text style={styles.audienceName} numberOfLines={1}>
                                                                {String(audience.userName || audience.userID)}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.requestActions}>
                                                            <TouchableOpacity
                                                                style={[styles.actionBtn, styles.actionBtnAccept]}
                                                                onPress={() => handleRequest(audience, 'accept')}
                                                                activeOpacity={0.7}>
                                                                <Text style={styles.btnText}>{t('coGuest.accept')}</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={[styles.actionBtn, styles.actionBtnReject]}
                                                                onPress={() => handleRequest(audience, 'reject')}
                                                                activeOpacity={0.7}>
                                                                <Text style={styles.btnText}>{t('coGuest.reject')}</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                </View>
                                                <View style={styles.audienceItemBottomLine} />
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>{t('coGuest.noRequests')}</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>
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
        flexDirection: 'column',
    },
    header: {
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(34, 38, 46, 1)',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    tabItem: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 10,
        borderRadius: 4,
    },
    tabItemActive: {},
    tabText: {
        fontSize: 16,
    },
    activeText: {
        color: 'rgba(255, 255, 255, 0.9)',
    },
    inactiveText: {
        color: 'rgba(255, 255, 255, 0.3)',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    audienceGrid: {
        flexDirection: 'column',
    },
    audienceItem: {
        paddingVertical: 12,
        position: 'relative',
    },
    audienceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    audienceAvatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    audienceAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    audienceItemRight: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    audienceDetail: {
        flex: 1,
    },
    audienceName: {
        fontSize: 16,
        color: '#ffffff',
        maxWidth: 100,
    },
    requestActions: {
        flexDirection: 'row',
    },
    actionBtn: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 50,
        marginLeft: 8,
    },
    actionBtnAccept: {
        backgroundColor: 'rgba(43, 106, 214, 1)',
    },
    actionBtnReject: {
        backgroundColor: 'rgba(58, 60, 66, 1)',
    },
    btnText: {
        color: '#ffffff',
        fontSize: 14,
    },
    audienceItemBottomLine: {
        position: 'absolute',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(79, 88, 107, 0.3)',
        width: '100%',
        height: 1,
        bottom: 0,
        right: 0,
    },
    emptyState: {
        padding: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#999999',
        fontSize: 14,
    },
});

