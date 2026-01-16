/**
 * CoHostPanel Component
 * 主播连线面板组件
 * 
 * 功能：
 * 1. 显示已连线的主播列表
 * 2. 显示推荐主播列表并支持邀请连线
 * 3. 支持断开连线操作
 * 4. 支持刷新和加载更多
 *
 * @format
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    Modal,
    RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { showToast, CustomToastContainer } from './CustomToast';
import { useCoHostState } from '../atomic-x/state/CoHostState';
import { useLiveListState } from '../atomic-x/state/LiveListState';
import type { FetchLiveListOptions } from '../atomic-x/state/LiveListState/types';
import { useLoginState } from '../atomic-x/state/LoginState';
import { useCoGuestState } from '../atomic-x/state/CoGuestState';
import { ConfirmDialog } from './ConfirmDialog';
import { ConnectionCode } from '../atomic-x/state/CoHostState/types';

const { width: screenWidth } = Dimensions.get('window');
const DEFAULT_AVATAR_URL = 'https://web.sdk.qcloud.com/component/TUIKit/assets/avatar_01.png';

interface CoHostPanelProps {
    visible: boolean;
    liveID: string;
    onClose: () => void;
}

interface HostInfo {
    liveID: string;
    liveOwner: {
        userID: string;
        userName?: string;
        avatarURL?: string;
    };
}

export function CoHostPanel({
    visible,
    liveID,
    onClose,
}: CoHostPanelProps) {
    const { t } = useTranslation();
    // 状态管理
    const { loginUserInfo } = useLoginState();
    const { applicants, rejectApplication } = useCoGuestState(liveID);
    const {
        candidates,
        connected,
        requestHostConnection,
        invitees,
        exitHostConnection,
    } = useCoHostState(liveID);
    const {
        liveListCursor,
        currentLive,
        fetchLiveList,
        liveList,
    } = useLiveListState();

    // 本地状态
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // 计算过滤后的已连线列表（排除自己）
    const filteredConnected = useMemo(() => {
        const list = connected || [];
        const selfId = loginUserInfo?.userID;
        return list.filter(item => item?.userID !== selfId);
    }, [connected, loginUserInfo?.userID]);

    // 过滤推荐主播列表
    const filterInviteHosts = useCallback((list: any[]) => {
        const hosts = Array.isArray(list) ? list : [];
        const connectedLiveIds = new Set((connected || []).map(item => item?.liveID));
        return hosts.filter(item =>
            item?.liveOwner?.userID !== currentLive?.liveOwner?.userID &&
            !connectedLiveIds.has(item?.liveID)
        );
    }, [connected, currentLive?.liveOwner?.userID]);

    // 当前可邀请的主播列表
    const currentInviteHosts = useMemo(() => {
        return filterInviteHosts(liveList || []);
    }, [liveList, filterInviteHosts]);

    // 判断主播是否处于邀请中
    const isHostInviting = useCallback((host: HostInfo) => {
        const inviteesList = invitees || [];
        const targetLiveID = host?.liveID;
        if (!targetLiveID) return false;
        return inviteesList.some((item) => item?.liveID === targetLiveID);
    }, [invitees]);

    // 监听申请者变化，自动拒绝（因为正在连线中）
    useEffect(() => {
        if (applicants && applicants.length > 0 && invitees && invitees.length > 0) {
            applicants.forEach(applicant => {
                rejectApplication({
                    liveID,
                    userID: applicant.userID,
                });
            });
        }
    }, [applicants, invitees, liveID, rejectApplication]);

    // 刷新列表
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        const params = {
            cursor: '',
            count: 20,
            onSuccess: () => {
                setIsRefreshing(false);
                showToast(t('toast.refreshSuccess'), 2000);
            },
            onError: () => {
                setIsRefreshing(false);
                showToast(t('toast.refreshFailed'), 3000);
            }
        };
        fetchLiveList(params);
    }, [fetchLiveList, t]);

    // 递归获取列表数据
    const fetchLiveListRecursively = useCallback((cursor: string) => {
        if (!cursor) {
            return;
        }

        const params: FetchLiveListOptions = {
            cursor: cursor,
            count: 20,
            onSuccess: () => {
                // 获取最新的 cursor 来判断是否还有下一页
                // 注意：onSuccess 不会接收 res 参数，需要通过其他方式获取最新数据
                // 这里暂时移除递归逻辑，因为无法在回调中获取 cursor
            },
            onError: (err: Error | string) => {
                console.error(`fetchLiveListRecursively failed, err: ${JSON.stringify(err)}`);
            }
        };
        fetchLiveList(params);
    }, [fetchLiveList]);

    // 加载更多
    const loadMore = useCallback(() => {
        if (!liveListCursor || isLoadingMore) {
            return;
        }

        setIsLoadingMore(true);
        const params = {
            cursor: liveListCursor,
            count: 20,
            onSuccess: () => {
                setIsLoadingMore(false);
            },
            onError: () => {
                setIsLoadingMore(false);
            }
        };
        fetchLiveList(params);
    }, [liveListCursor, isLoadingMore, fetchLiveList]);

    // 发起连线
    const startLink = useCallback((host: HostInfo) => {
        if (applicants && applicants.length > 0) {
            showToast(t('coHost.hostBusy'), 3000);
            return;
        }

        requestHostConnection({
            liveID,
            targetHostLiveID: host.liveID,
            layoutTemplate: 600,
            timeout: 30,
            extensionInfo: "",
            onSuccess: () => {
                console.log('连线成功');
            },
            onError: (error: any) => {
                if (error?.code === ConnectionCode.CONNECTING_OTHER_ROOM) {
                    showToast(t('coHost.hostBusy'), 3000);
                }
                else {
                    showToast(t('toast.operationFailed'), 3000);
                }
            }
        });
    }, [applicants, requestHostConnection, liveID, t]);

    // 点击邀请连线
    const onStartLinkTap = useCallback((host: HostInfo) => {
        if (isHostInviting(host)) {
            return;
        }
        startLink(host);
    }, [isHostInviting, startLink]);

    // 退出连线
    const handleExitCoHost = useCallback(() => {
        setShowExitConfirmModal(true);
    }, []);

    const handleConfirmExit = useCallback(() => {
        setShowExitConfirmModal(false);
        exitHostConnection({
            liveID,
            onSuccess: () => {
                onClose();
            },
            onError: (error: Error | string) => {
                console.log('退出连线失败:', error);
                setShowExitConfirmModal(false);
            }
        });
    }, [exitHostConnection, liveID, onClose]);

    const handleCancelExit = useCallback(() => {
        setShowExitConfirmModal(false);
    }, []);

    // 渲染已连线主播项
    const renderConnectedItem = useCallback(({ item }: { item: any }) => (
        <View style={styles.audienceItem}>
            <View style={styles.audienceInfo}>
                <View style={styles.audienceAvatarContainer}>
                    <Image
                        source={{ uri: item.avatarURL || DEFAULT_AVATAR_URL }}
                        style={styles.audienceAvatar}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.audienceItemRight}>
                    <View style={styles.audienceDetail}>
                        <Text style={styles.audienceName} numberOfLines={1}>
                            {item.userName || item.userID}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.audienceItemBottomLine} />
        </View>
    ), []);

    // 渲染推荐主播项
    const renderInviteHostItem = useCallback(({ item }: { item: HostInfo }) => {
        const isInviting = isHostInviting(item);

        return (
            <View style={styles.audienceItem}>
                <View style={styles.audienceInfo}>
                    <View style={styles.audienceAvatarContainer}>
                        <Image
                            source={{ uri: item?.liveOwner?.avatarURL || DEFAULT_AVATAR_URL }}
                            style={styles.audienceAvatar}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.audienceItemRight}>
                        <View style={styles.audienceDetail}>
                            <Text style={styles.audienceName} numberOfLines={1}>
                                {item?.liveOwner?.userName || item?.liveOwner?.userID}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.startLink, isInviting && styles.startLinkWaiting]}
                            onPress={() => onStartLinkTap(item)}
                            disabled={isInviting}
                        >
                            <Text style={styles.startLinkText}>
                                {isInviting ? t('coHost.inviting') : t('coHost.inviteHost')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.audienceItemBottomLine} />
            </View>
        );
    }, [isHostInviting, onStartLinkTap]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.bottomDrawerContainer}>
                <TouchableOpacity
                    style={styles.drawerOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.bottomDrawer}>
                    {/* 头部 */}
                    <View style={styles.audienceHeader}>
                        <View style={styles.tabContainer}>
                            <View style={styles.tabItem}>
                                <Text style={styles.activeText}>{t('coHost.invite')}</Text>
                                {filteredConnected.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.endRight}
                                        onPress={handleExitCoHost}
                                    >
                                        <Image
                                            source={require('../static/images/logout.png')}
                                            style={styles.endConnect}
                                        />
                                        <Text style={styles.endConnectText}>{t('coHost.disconnect')}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* 连线中列表 */}
                    {filteredConnected.length > 0 && (
                        <View style={styles.connectedSection}>
                            <Text style={styles.titleText}>{t('coHost.connected')}</Text>
                            <FlatList
                                data={filteredConnected}
                                renderItem={renderConnectedItem}
                                keyExtractor={(item, index) => `connected-${item?.userID || item?.liveID || index}`}
                                scrollEnabled={false}
                                style={styles.connectedList}
                            />
                        </View>
                    )}

                    {/* 推荐列表标题 */}
                    <View style={styles.recommendHeader}>
                        <Text style={styles.titleText}>{t('coHost.onlineAnchors')}</Text>
                    </View>

                    {/* 推荐主播列表 */}
                    <FlatList
                        ref={flatListRef}
                        data={currentInviteHosts}
                        renderItem={renderInviteHostItem}
                        keyExtractor={(item, index) => `invite-${item?.liveID || item?.liveOwner?.userID || index}`}
                        style={styles.audienceContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={handleRefresh}
                                tintColor="#ffffff"
                            />
                        }
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.1}
                        ListFooterComponent={
                            isLoadingMore ? (
                                <View style={styles.loadingFooter}>
                                    <Text style={styles.loadingText}>{t('liveList.loading')}</Text>
                                </View>
                            ) : undefined
                        }
                    />
                </View>
            </View>

            {/* 确认弹窗 */}
            <ConfirmDialog
                visible={showExitConfirmModal}
                message={t('coHost.disconnectConfirm')}
                confirmText={t('coHost.disconnect')}
                cancelText={t('common.cancel')}
                onConfirm={handleConfirmExit}
                onCancel={handleCancelExit}
            />

            {/* Toast 容器 - 在 Modal 内部渲染，确保显示在面板之上 */}
            <CustomToastContainer />
        </Modal>
    );
}

const styles = StyleSheet.create({
    bottomDrawerContainer: {
        flex: 1,
        justifyContent: 'flex-end',
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
        backgroundColor: 'rgba(34, 38, 46, 1)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: 500,
        paddingBottom: 20,
    },
    audienceHeader: {
        paddingVertical: 10,
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
        flexDirection: 'row',
        width: screenWidth * 0.9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    endRight: {
        position: 'absolute',
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    endConnect: {
        width: 20,
        height: 20,
    },
    endConnectText: {
        color: '#E6594C',
        paddingLeft: 5,
        fontSize: 14,
    },
    activeText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 16,
    },
    titleText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    connectedSection: {
        paddingHorizontal: 24, // 与推荐列表的 paddingHorizontal 保持一致
        marginBottom: 20,
    },
    connectedList: {
        marginTop: 10,
    },
    recommendHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24, // 与推荐列表的 paddingHorizontal 保持一致
        marginBottom: 20,
    },
    audienceContent: {
        flex: 1,
        paddingHorizontal: 24,
    },
    audienceItem: {
        borderRadius: 8,
        minHeight: 50,
        position: 'relative',
        marginBottom: 8,
        paddingTop: 5,
    },
    audienceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    audienceAvatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        overflow: 'hidden',
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
        flexDirection: 'row',
    },
    audienceName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ffffff',
        maxWidth: 150,
    },
    startLink: {
        width: 60,
        height: 20,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(28, 102, 229, 1)',
    },
    startLinkWaiting: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(28, 102, 229, 1)',
    },
    startLinkText: {
        fontSize: 12,
        color: '#ffffff',
    },
    audienceItemBottomLine: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 275,
        height: 1,
        backgroundColor: 'rgba(79, 88, 107, 0.3)',
    },
    loadingFooter: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
    },
});