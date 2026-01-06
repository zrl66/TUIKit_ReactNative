/**
 * LiveAudienceList Component
 * 观众列表面板组件
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    FlatList,
    Image,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_AVATAR_URL } from './constants';
import type { LiveUserInfoParam } from '../atomic-x/state/LiveAudienceState/types';
import { useLiveAudienceState } from '../atomic-x/state/LiveAudienceState';
import { AudienceActionPanel } from './AudienceActionPanel';

const screenWidth = Dimensions.get('window').width;
// rpx to px conversion: 750rpx = screenWidth
const rpxToPx = (rpx: number) => (rpx * screenWidth) / 750;

interface LiveAudienceListProps {
    visible: boolean;
    liveID: string;
    currentLive?: any;
    loginUserInfo?: any;
    onClose?: () => void;
    onAudienceOperator?: (audience: LiveUserInfoParam) => void;
}

export function LiveAudienceList({
    visible,
    liveID,
    currentLive,
    loginUserInfo,
    onClose,
    onAudienceOperator,
}: LiveAudienceListProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();

    const { audienceList } = useLiveAudienceState(liveID);
    // 判断是否是主播
    const isOwner = currentLive?.liveOwner?.userID === loginUserInfo?.userID;

    const [selectedAudience, setSelectedAudience] = useState<LiveUserInfoParam | null>(null);
    const [isActionPanelVisible, setIsActionPanelVisible] = useState(false);

    const handleAudienceMorePress = (item: LiveUserInfoParam) => {
        setSelectedAudience(item);
        setIsActionPanelVisible(true);
        onAudienceOperator?.(item);
    };

    const renderAudienceItem = ({ item }: { item: LiveUserInfoParam }) => {
        const avatarURL = item.avatarURL || DEFAULT_AVATAR_URL;
        const displayName = (item as any).userName || item.nickname || item.userID || '';
        const tag = (item as any).tag;

        return (
            <View style={styles.audienceItem}>
                <View style={styles.audienceInfo}>
                    <View style={styles.audienceAvatarContainer}>
                        <Image source={{ uri: avatarURL }} style={styles.audienceAvatar} />
                    </View>
                    <View style={styles.audienceItemRight}>
                        <View style={styles.audienceDetail}>
                            <Text style={styles.audienceName} numberOfLines={1}>
                                {displayName}
                            </Text>
                            {tag && (
                                <View style={styles.audienceTag}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            )}
                        </View>
                        {isOwner && (
                            <TouchableOpacity
                                style={styles.audienceMore}
                                onPress={() => handleAudienceMorePress(item)}
                                activeOpacity={0.7}>
                                <Text style={styles.moreText}>···</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
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
            <View style={styles.bottomDrawerContainer}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.drawerOverlay} />
                </TouchableWithoutFeedback>
                <View
                    style={[
                        styles.bottomDrawer,
                        {
                            paddingBottom: safeAreaInsets.bottom,
                            height: rpxToPx(1000), // 1000rpx
                        },
                    ]}>
                    <View style={styles.liveAudienceList}>
                        {/* 头部 */}
                        <View style={styles.audienceHeader}>
                            <Text style={styles.audienceTitle}>{t('audienceListPanel.title')}</Text>
                        </View>

                        {/* 观众列表 - 使用 FlatList 实现可滚动 */}
                        <FlatList
                            data={audienceList}
                            keyExtractor={(item) => item.userID}
                            renderItem={renderAudienceItem}
                            contentContainerStyle={styles.audienceContent}
                            style={styles.audienceListScroll}
                            showsVerticalScrollIndicator={true}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>{t('audienceListPanel.noAudience')}</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </View>
            {/* 观众操作面板：仅主播可见 */}
            <AudienceActionPanel
                visible={isOwner && isActionPanelVisible}
                liveID={liveID}
                userInfo={selectedAudience || undefined}
                onClose={() => setIsActionPanelVisible(false)}
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
        backgroundColor: '#1F2024',
        borderTopLeftRadius: rpxToPx(32), // 32rpx
        borderTopRightRadius: rpxToPx(32), // 32rpx
    },
    liveAudienceList: {
        flex: 1,
    },
    audienceHeader: {
        paddingHorizontal: rpxToPx(32), // 32rpx
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: rpxToPx(100), // 100rpx
        position: 'relative',
    },
    audienceTitle: {
        fontSize: rpxToPx(32), // 32rpx
        color: '#ffffff',
        fontWeight: '400',
        textAlign: 'center',
    },
    audienceListScroll: {
        flex: 1,
    },
    audienceContent: {
        paddingHorizontal: rpxToPx(32), // 32rpx
        paddingBottom: rpxToPx(32), // 32rpx
    },
    audienceItem: {
        paddingVertical: rpxToPx(16), // 16rpx
    },
    audienceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    audienceAvatarContainer: {
        width: rpxToPx(80), // 80rpx
        height: rpxToPx(80), // 80rpx
        marginRight: rpxToPx(20), // 20rpx
    },
    audienceAvatar: {
        width: rpxToPx(80), // 80rpx
        height: rpxToPx(80), // 80rpx
        borderRadius: rpxToPx(40), // 40rpx
        backgroundColor: '#f0f0f0',
    },
    audienceItemRight: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    audienceDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    audienceName: {
        fontSize: rpxToPx(28), // 28rpx
        color: '#ffffff',
        marginRight: rpxToPx(12), // 12rpx
        maxWidth: rpxToPx(300), // 300rpx
    },
    audienceTag: {
        backgroundColor: '#007AFF',
        borderRadius: rpxToPx(6), // 6rpx
        paddingVertical: rpxToPx(4), // 4rpx
        paddingHorizontal: rpxToPx(12), // 12rpx
    },
    tagText: {
        color: '#ffffff',
        fontSize: rpxToPx(24), // 24rpx
    },
    audienceMore: {
        paddingHorizontal: rpxToPx(20), // 20rpx
    },
    moreText: {
        fontSize: rpxToPx(40), // 40rpx
        color: '#ffffff',
        fontWeight: 'bold',
    },
    emptyState: {
        paddingVertical: rpxToPx(64), // 64rpx
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: rpxToPx(28), // 28rpx
    },
});

