import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    Text,
    StatusBar,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    LiveStreamView,
    ActionSheet,
    LiveAudienceList,
    UserInfoPanel,
    BarrageInput,
    BarrageList,
    CoGuestRequestPanel,
    DEFAULT_AVATAR_URL,
    showToast,
    Like,
    NetworkQualityPanel,
    GiftPicker,
    SVGAAnimationView,
    SVGAAnimationViewRef,
    useTranslation,
    i18n,
} from 'react-native-tuikit-atomic-x';
import {
    useLiveListState,
    useCoGuestState,
    useLoginState,
    useLiveAudienceState,
    useLiveSeatState,
    useCoHostState,
    useBarrageState,
    useDeviceState,
    useGiftState,
    GuestApplicationNoResponseReason,
    startForegroundService,
    stopForegroundService,
} from 'react-native-tuikit-atomic-x';
import type { LiveUserInfoParam, GiftParam } from 'react-native-tuikit-atomic-x';
import { Dimensions } from 'react-native';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


export interface LiveAudiencePageProps {
    liveID: string;
    onBack?: () => void;
}

export function LiveAudiencePage({ liveID, onBack }: LiveAudiencePageProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();
    const bottomSafeArea = Platform.OS === 'ios' ? 0 : safeAreaInsets.bottom;
    const { leaveLive, currentLive, addLiveListListener, removeLiveListListener } = useLiveListState();
    const { connected, disconnect, cancelApplication, addCoGuestGuestListener, removeCoGuestGuestListener } = useCoGuestState(liveID);
    const { loginUserInfo } = useLoginState();
    const { audienceList, audienceCount } = useLiveAudienceState(liveID);
    const { seatList, addLiveSeatEventListener, removeLiveSeatEventListener } = useLiveSeatState(liveID);
    const { connected: hostConnected } = useCoHostState(liveID);
    const { openLocalCamera, openLocalMicrophone } = useDeviceState();
    const { addGiftListener, removeGiftListener, sendGift, setLanguage } = useGiftState(liveID);
    const { appendLocalTip } = useBarrageState(liveID);

    useEffect(() => {
        if (!liveID) return;

        // 根据 i18n 当前语言设置礼物语言
        const giftLanguage = i18n.language === 'zh' ? 'zh-Hans' : 'en';
        setLanguage({
            liveID: liveID,
            language: giftLanguage,
            onSuccess: () => {
                console.log(`[LiveAudiencePage] 礼物语言设置为 ${giftLanguage} 成功`);
            },
            onError: (error) => {
                console.error('[LiveAudiencePage] 礼物语言设置失败:', error);
            },
        });
    }, [liveID, setLanguage]);

    useEffect(() => {
        startForegroundService(t('keepAlive.title'), t('keepAlive.description'));

        return () => {
            stopForegroundService();
        };
    }, [t]);

    const svgaRef = useRef<SVGAAnimationViewRef>(null);

    const [giftToast, setGiftToast] = useState<any>(null);

    const [showSVGA, setShowSVGA] = useState(false);

    const [isShowExitSheet, setIsShowExitSheet] = useState(false);
    const [exitSheetItems, setExitSheetItems] = useState<string[]>([]);
    const [isShowAudienceList, setIsShowAudienceList] = useState(false);
    const [isShowUserInfoPanel, setIsShowUserInfoPanel] = useState(false);
    const [clickUserInfo, setClickUserInfo] = useState<any>(null);
    const [isShowAnchorInfo, setIsShowAnchorInfo] = useState(true);
    const [localGuestStatus, setLocalGuestStatus] = useState<'IDLE' | 'USER_APPLYING' | 'CONNECTED'>('IDLE');
    const [localCoGuestType, setLocalCoGuestType] = useState<'video' | 'mic' | ''>('');
    const [isShowCoGuestSheet, setIsShowCoGuestSheet] = useState(false);
    const [coGuestSheetItems, setCoGuestSheetItems] = useState<string[]>([]);
    const [isShowCoGuestRequestPanel, setIsShowCoGuestRequestPanel] = useState(false);
    const [isShowNetworkQualityPanel, setIsShowNetworkQualityPanel] = useState(false);
    const [liveDurationText, setLiveDurationText] = useState('00:00:00');
    const [isShowGiftPicker, setIsShowGiftPicker] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const handleHideInput = useCallback(() => {
        Keyboard.dismiss();
    }, []);

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                setIsKeyboardVisible(true);
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setIsKeyboardVisible(false);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const templateLayout = useMemo(() => {
        console.log('applicants', currentLive);
        return (currentLive as any)?.seatLayoutTemplateID || 600;
    }, [currentLive]);

    const shouldDisableCoGuestButton = useMemo(() => {
        return hostConnected.length > 0;
    }, [hostConnected]);

    const displayAudiences = useMemo(() => {
        return audienceList.slice(0, 2);
    }, [audienceList]);

    const liveOwner = useMemo(() => {
        if (!currentLive) return null;
        const owner = (currentLive as any).liveOwner;
        return owner || null;
    }, [currentLive]);

    const showAnchorInfoDrawer = () => {
        setIsShowAnchorInfo(true);
        if (liveOwner) {
            setClickUserInfo({ ...liveOwner, liveID: currentLive?.liveID || liveID });
        } else {
            setClickUserInfo({
                userID: 'unknown',
                userName: t('audience.defaultName'),
                avatarURL: DEFAULT_AVATAR_URL,
                liveID: currentLive?.liveID || liveID,
            });
        }
        setIsShowUserInfoPanel(true);
    };

    const isConnected = useMemo(() => {
        if (!loginUserInfo?.userID) return false;
        return connected.some(item => item.userID === loginUserInfo.userID);
    }, [connected, loginUserInfo?.userID]);

    React.useEffect(() => {
        if (isConnected) {
            setLocalGuestStatus('CONNECTED');
        } else {
            setLocalGuestStatus('IDLE');
        }
    }, [isConnected]);

    const updateLiveDurationText = useCallback(() => {
        if (currentLive?.createTime) {
            const currentTime = Math.floor(Date.now() / 1000);
            const createTime = Math.floor(currentLive.createTime / 1000);
            const duration = Math.max(0, currentTime - createTime);
            const h = String(Math.floor(duration / 3600)).padStart(2, '0');
            const m = String(Math.floor((duration % 3600) / 60)).padStart(2, '0');
            const s = String(duration % 60).padStart(2, '0');
            setLiveDurationText(`${h}:${m}:${s}`);
        }
    }, [currentLive?.createTime]);

    useEffect(() => {
        updateLiveDurationText();
        const timer = setInterval(() => {
            updateLiveDurationText();
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [updateLiveDurationText]);

    useEffect(() => {
        const handleLiveEnded = () => {
            onBack?.();
            showToast(t('audience.liveEnded'), 2000);
        };

        const handleKickedOutOfLive = () => {
            onBack?.();
            showToast(t('audience.kickedOut'), 2000);
        }

        const handleGuestApplicationResponded = (params?: any) => {
            try {
                const res =
                    typeof params === 'string'
                        ? JSON.parse(params)
                        : params;
                console.log('handleGuestApplicationResponded', res, res?.isAccept);

                if (res?.isAccept === true) {
                    setLocalGuestStatus('CONNECTED');

                    if (localCoGuestType === 'video') {
                        openLocalCamera({
                            isFront: true,
                            onSuccess: () => {
                                console.log('[LiveAudiencePage] openLocalCamera success.');
                            },
                            onError: (error: any) => {
                                console.error('[LiveAudiencePage] openLocalCamera fail:', error);
                            },
                        });
                    }

                    openLocalMicrophone({
                        onSuccess: () => {
                            console.log('[LiveAudiencePage] openLocalMicrophone success.');
                        },
                        onError: (error: any) => {
                            console.error('[LiveAudiencePage] openLocalMicrophone fail:', error);
                        },
                    });
                } else {
                    setLocalGuestStatus('IDLE');
                    showToast(t('audience.applicationRejected'), 2000);
                    console.log('[LiveAudiencePage] 上麦申请被拒绝');
                }
            } catch (error) {
                console.error('[LiveAudiencePage] handleGuestApplicationResponded error:', error);
            }
        };

        const handleGuestApplicationNoResponse = (params?: unknown) => {
            try {
                const event = typeof params === 'string' ? params : JSON.stringify(params);
                const res = JSON.parse(event);
                console.log('handleGuestApplicationNoResponse', res);
                if (res.reason === GuestApplicationNoResponseReason.TIMEOUT) {
                    setLocalGuestStatus('IDLE');
                    showToast(t('audience.applicationTimeout'), 2000);
                    console.log('[LiveAudiencePage] 上麦申请超时');
                }
            } catch (error) {
                console.error('[LiveAudiencePage] handleGuestApplicationNoResponse error:', error);
            }
        };
        const handleKickedOffSeat = (_params?: any) => {
            showToast(t('audience.kickedOffSeat'), 2000);
            setLocalGuestStatus('IDLE');
        }
        const handleLocalCameraOpenedByAdmin = (params?: any) => {
            showToast(t('audience.cameraUnmuted'), 2000);
        }
        const handleLocalCameraClosedByAdmin = (params?: any) => {
            showToast(t('audience.cameraMuted'), 2000);
        }
        const handleLocalMicrophoneOpenedByAdmin = (params?: any) => {
            showToast(t('audience.micUnmuted'), 2000);
        }
        const handleLocalMicrophoneClosedByAdmin = (params?: any) => {
            showToast(t('audience.micMuted'), 2000);
        }
        addLiveListListener('onLiveEnded', handleLiveEnded);
        addLiveListListener('onKickedOutOfLive', handleKickedOutOfLive);
        addCoGuestGuestListener('onGuestApplicationResponded', handleGuestApplicationResponded, liveID);
        addCoGuestGuestListener('onGuestApplicationNoResponse', handleGuestApplicationNoResponse, liveID);
        addCoGuestGuestListener('onKickedOffSeat', handleKickedOffSeat, liveID);
        addLiveSeatEventListener('onLocalCameraOpenedByAdmin', handleLocalCameraOpenedByAdmin, liveID)
        addLiveSeatEventListener('onLocalCameraClosedByAdmin', handleLocalCameraClosedByAdmin, liveID)
        addLiveSeatEventListener('onLocalMicrophoneOpenedByAdmin', handleLocalMicrophoneOpenedByAdmin, liveID)
        addLiveSeatEventListener('onLocalMicrophoneClosedByAdmin', handleLocalMicrophoneClosedByAdmin, liveID)

        return () => {
            removeLiveListListener('onLiveEnded', handleLiveEnded);
            removeLiveListListener('onKickedOutOfLive', handleKickedOutOfLive);
            removeCoGuestGuestListener('onGuestApplicationResponded', liveID);
            removeCoGuestGuestListener('onGuestApplicationNoResponse', liveID);
            removeCoGuestGuestListener('onKickedOffSeat', liveID);
            removeLiveSeatEventListener('onLocalCameraOpenedByAdmin', liveID);
            removeLiveSeatEventListener('onLocalCameraClosedByAdmin', liveID);
            removeLiveSeatEventListener('onLocalMicrophoneOpenedByAdmin', liveID);
            removeLiveSeatEventListener('onLocalMicrophoneClosedByAdmin', liveID);
        };
    }, [
        liveID,
        onBack,
        addLiveListListener,
        removeLiveListListener,
        addCoGuestGuestListener,
        removeCoGuestGuestListener,
        openLocalCamera,
        openLocalMicrophone,
        localCoGuestType,
        addLiveSeatEventListener,
        removeLiveSeatEventListener,
    ]);

    useEffect(() => {
        const handleReceiveGift = (params?: unknown) => {
            try {
                console.log('[LiveAudiencePage] 收到礼物事件:', params);

                let eventData: any;
                if (typeof params === 'string') {
                    eventData = JSON.parse(params);
                } else if (params && typeof params === 'object') {
                    eventData = params;
                } else {
                    console.warn('[LiveAudiencePage] 礼物事件数据格式无效:', params);
                    return;
                }

                const giftData = eventData.gift;
                if (!giftData) {
                    console.warn('[LiveAudiencePage] 礼物数据为空');
                    return;
                }

                let gift: any;
                if (typeof giftData === 'string') {
                    gift = JSON.parse(giftData);
                } else {
                    gift = giftData;
                }

                console.log('[LiveAudiencePage] 解析后的礼物数据:', gift);

                const senderData = eventData.sender;
                let sender: any;
                if (typeof senderData === 'string') {
                    sender = JSON.parse(senderData);
                } else {
                    sender = senderData;
                }

                let giftIconURL = gift.iconURL || gift.iconUrl || '';
                if (!giftIconURL) {
                    const resourceURL = gift.resourceURL || gift.resourceUrl || '';
                    if (resourceURL) {
                        const urlLower = resourceURL.toLowerCase();
                        const isPng = urlLower.endsWith('.png') || urlLower.includes('.png?');
                        if (isPng) {
                            giftIconURL = resourceURL;
                        }
                    }
                }

                const toastData = {
                    avatarURL: sender?.avatarURL || sender?.avatarUrl || '',
                    name: gift.name || '',
                    desc: '',
                    iconURL: giftIconURL,
                    _timestamp: Date.now(),
                };
                console.log('[LiveAudiencePage] 礼物图片 URL:', giftIconURL);
                console.log('[LiveAudiencePage] 设置礼物 Toast:', toastData);
                setGiftToast(toastData);

                const giftLiveOwner = currentLive?.liveOwner as { userName?: string; userID?: string } | undefined;
                const ownerUserID = giftLiveOwner?.userID;
                const currentLoginUserID = loginUserInfo?.userID;

                let receiverName: string;
                if (currentLoginUserID && ownerUserID && currentLoginUserID === ownerUserID) {
                    receiverName = t('audience.giftToMe');
                } else {
                    receiverName = giftLiveOwner?.userName || giftLiveOwner?.userID || '';
                }

                const giftName = gift.name || '';
                const giftCount = eventData.count || 1;
                const giftTextContent = t('audience.giftTo', { receiver: receiverName, gift: giftName, count: giftCount });

                const giftMessage = {
                    sender: sender,
                    gift: gift,
                    count: giftCount,
                    textContent: giftTextContent,
                    messageID: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now(),
                };
                console.log('[LiveAudiencePage] 添加礼物消息到弹幕列表:', giftMessage);
                appendLocalTip({
                    liveID: liveID,
                    message: giftMessage as any,
                    onSuccess: () => {
                        console.log('[LiveAudiencePage] 礼物消息已添加到弹幕列表');
                    },
                    onError: (error) => {
                        console.error('[LiveAudiencePage] 添加礼物消息到弹幕列表失败:', error);
                    },
                });

                const resourceURL = gift.resourceURL || gift.resourceUrl || '';
                if (resourceURL) {
                    const urlLower = resourceURL.toLowerCase();
                    const isPng = urlLower.endsWith('.png') || urlLower.includes('.png?');

                    if (!isPng) {
                        console.log('[LiveAudiencePage] 播放收到的礼物动画:', gift.name, resourceURL);
                        setShowSVGA(true);
                        setTimeout(() => {
                            if (svgaRef.current) {
                                svgaRef.current.startAnimation(resourceURL);
                            }
                        }, 100);
                    } else {
                        console.log('[LiveAudiencePage] 跳过 PNG 格式礼物:', gift.name);
                    }
                }
            } catch (error) {
                console.error('[LiveAudiencePage] 处理礼物接收事件失败:', error);
            }
        };

        addGiftListener('onReceiveGift', handleReceiveGift);

        return () => {
            removeGiftListener('onReceiveGift');
        };
    }, [liveID, addGiftListener, removeGiftListener, appendLocalTip, currentLive?.liveOwner, loginUserInfo?.userID]);

    const showNetworkQualityPanel = () => {
        setIsShowNetworkQualityPanel(true);
    };

    const showGiftPicker = () => {
        setIsShowGiftPicker(true);
    };

    const handleGiftSelect = useCallback(
        (gift: GiftParam) => {
            if (!gift.giftID) {
                console.error('[LiveAudiencePage] 礼物 ID 不能为空');
                return;
            }

            sendGift({
                liveID,
                giftID: String(gift.giftID),
                count: 1,
                onSuccess: () => {
                    console.log('[LiveAudiencePage] 礼物发送成功:', gift.giftID);
                },
                onError: (error) => {
                    console.error('[LiveAudiencePage] 礼物发送失败:', error);
                    const errorMessage = typeof error === 'string' ? error : error.message;
                    showToast(t('audience.sendGiftFailed', { error: errorMessage }), 2000);
                },
            });

            setIsShowGiftPicker(false);
        },
        [liveID, sendGift]
    );

    const handleRecharge = useCallback(() => {
        showToast(t('audience.rechargeDeveloping'), 2000);
    }, [t]);

    const handleCoGuestButtonClick = () => {
        if (shouldDisableCoGuestButton) {
            return;
        }
        ShowCoGuestRequestPanel();
    };

    const ShowCoGuestRequestPanel = () => {
        if (localGuestStatus === 'CONNECTED' || localGuestStatus === 'USER_APPLYING') {
            if (localGuestStatus === 'USER_APPLYING') {
                setCoGuestSheetItems([t('audience.cancelCoGuestApply')]);
            } else if (localGuestStatus === 'CONNECTED') {
                setCoGuestSheetItems([t('audience.disconnectCoGuest')]);
            }
            setIsShowCoGuestSheet(true);
        } else {
            setIsShowCoGuestRequestPanel(true);
        }
    };

    const handleCoGuestSheetSelect = (index: number) => {
        setIsShowCoGuestSheet(false);

        if (localGuestStatus === 'CONNECTED') {
            if (index === 0) {
                disconnect({
                    liveID: liveID,
                    onSuccess: () => {
                        setLocalGuestStatus('IDLE');
                    },
                    onError: (error) => {
                        console.error('断开连麦失败:', error);
                    },
                });
            }
            return;
        }

        if (localGuestStatus === 'USER_APPLYING') {
            if (index === 0) {
                cancelApplication({
                    liveID: liveID,
                    onSuccess: () => {
                        setLocalGuestStatus('IDLE');
                    },
                    onError: (error) => {
                        console.error('取消连麦申请失败:', error);
                    },
                });
            }
        }
    };

    const handleNavigateBack = () => {
        if (localGuestStatus === 'CONNECTED') {
            setExitSheetItems([t('audience.disconnectCoGuest'), t('audience.exitLiveRoom')]);
        } else {
            setExitSheetItems([t('audience.exitLiveRoom')]);
        }
        setIsShowExitSheet(true);
    };

    const handleExitSheetSelect = (index: number) => {
        setIsShowExitSheet(false);

        if (localGuestStatus === 'CONNECTED' && index === 0) {
            disconnect({
                liveID: liveID,
                onSuccess: () => {
                    setLocalGuestStatus('IDLE');
                    setExitSheetItems([t('audience.exitLiveRoom')]);
                },
                onError: (error) => {
                    console.error('断开连麦失败:', error);
                },
            });
            return;
        }

        if ((localGuestStatus === 'CONNECTED' && index === 1) || (localGuestStatus !== 'CONNECTED' && index === 0)) {
            leaveLive({
                onSuccess: () => {
                    onBack?.();
                },
                onError: (error) => {
                    console.error('退出直播间失败:', error);
                },
            });
        }
    };

    const anchorSeat = seatList[0];
    const isSingleAnchor =
        seatList.length === 1;
    const isAnchorCameraOff =
        isSingleAnchor && anchorSeat?.userInfo?.cameraStatus === 'OFF';

    return (
        <>
            <StatusBar
                barStyle="light-content"
                translucent
                backgroundColor={
                    isAnchorCameraOff ? 'black' : 'transparent'
                }
            />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? -safeAreaInsets.bottom : 0}>
                <View style={[
                    styles.container,
                    {
                        paddingBottom: bottomSafeArea,
                        paddingLeft: safeAreaInsets.left,
                        paddingRight: safeAreaInsets.right,
                    },
                ]}>
                    <TouchableWithoutFeedback onPress={handleHideInput}>
                        <View
                            style={[
                                styles.container,
                                {
                                    paddingBottom: bottomSafeArea,
                                    paddingLeft: safeAreaInsets.left,
                                    paddingRight: safeAreaInsets.right,
                                },
                            ]}>
                            <LiveStreamView
                                liveID={liveID}
                                isAnchor={false}
                                templateLayout={templateLayout}
                                isLiving={true}
                                currentLoginUserId={loginUserInfo?.userID}
                                enableClickPanel={true}
                                onPanelAction={(actionKey, payload) => {
                                    console.log('[LiveAudiencePage] LiveStreamActionPanel action:', actionKey, payload);
                                }}
                                onStreamViewClick={(payload) => {
                                    console.log('[LiveAudiencePage] StreamView click:', payload);
                                    if (payload?.userID) {
                                        const isClickingAnchor = payload.userID === liveOwner?.userID;
                                        setIsShowAnchorInfo(isClickingAnchor);
                                        setClickUserInfo(payload);
                                        setIsShowUserInfoPanel(true);
                                    }
                                }}
                                style={styles.liveView}
                            />

                            <View
                                pointerEvents="box-none"
                                style={[
                                    styles.header,
                                    {
                                        top: safeAreaInsets.top + 20,
                                        paddingRight: safeAreaInsets.right + 16,
                                        paddingLeft: safeAreaInsets.left + 16,
                                    },
                                ]}>
                                <TouchableOpacity
                                    style={styles.headerLeft}
                                    onPress={showAnchorInfoDrawer}
                                    activeOpacity={0.7}>
                                    {liveOwner ? (
                                        <View style={styles.streamInfo}>
                                            <Image
                                                source={{ uri: liveOwner.avatarURL || DEFAULT_AVATAR_URL }}
                                                style={styles.avatar}
                                            />
                                            <View style={styles.streamDetails}>
                                                <Text style={styles.streamTitle} numberOfLines={1}>
                                                    {liveOwner.userName || liveOwner.userID || t('audience.defaultName')}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.streamInfo}>
                                            <Image
                                                source={{ uri: DEFAULT_AVATAR_URL }}
                                                style={styles.avatar}
                                            />
                                            <View style={styles.streamDetails}>
                                                <Text style={styles.streamTitle} numberOfLines={1}>
                                                    {t('audience.defaultName')}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.headerRight}>
                                    <TouchableOpacity
                                        style={styles.participantsContainer}
                                        onPress={() => setIsShowAudienceList(true)}
                                        activeOpacity={0.7}>
                                        {displayAudiences.length > 0 ? (
                                            <>
                                                {displayAudiences.map((user, index) => (
                                                    <Image
                                                        key={user.userID}
                                                        source={{ uri: user.avatarURL || DEFAULT_AVATAR_URL }}
                                                        style={[
                                                            styles.participantAvatar,
                                                            index > 0 && styles.participantAvatarOverlap,
                                                        ]}
                                                    />
                                                ))}
                                                <View style={styles.participantCount}>
                                                    <Text style={styles.countText}>{audienceCount || 0}</Text>
                                                </View>
                                            </>
                                        ) : (
                                            <View style={styles.participantCount}>
                                                <Text style={styles.countText}>{audienceCount || 0}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={handleNavigateBack}
                                        activeOpacity={0.7}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Image
                                            source={require('react-native-tuikit-atomic-x/src/static/images/close.png')}
                                            style={styles.closeIcon}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.liveNetworkContainer,
                                    {
                                        top: safeAreaInsets.top + 20 + 40,
                                        right: safeAreaInsets.right + 16,
                                    },
                                ]}
                                onPress={() => setIsShowNetworkQualityPanel(true)}
                                activeOpacity={0.7}>
                                <Image
                                    source={require('react-native-tuikit-atomic-x/src/static/images/network-good.png')}
                                    style={styles.liveNetworkIcon}
                                    resizeMode="contain"
                                />
                                <Text style={styles.liveTimer}>{liveDurationText}</Text>
                            </TouchableOpacity>

                            <BarrageList
                                mode="audience"
                                bottomPx={bottomSafeArea}
                                liveID={liveID}
                                toast={giftToast}
                                onToastClosed={() => setGiftToast(null)}
                            />

                            <LiveAudienceList
                                visible={isShowAudienceList}
                                liveID={liveID}
                                currentLive={currentLive}
                                loginUserInfo={loginUserInfo}
                                onClose={() => setIsShowAudienceList(false)}
                                onAudienceOperator={(audience: LiveUserInfoParam) => {
                                    console.log('操作观众:', audience);
                                }}
                            />

                            <UserInfoPanel
                                visible={isShowUserInfoPanel}
                                userInfo={clickUserInfo}
                                isShowAnchor={isShowAnchorInfo}
                                onClose={() => setIsShowUserInfoPanel(false)}
                            />

                            <CoGuestRequestPanel
                                visible={isShowCoGuestRequestPanel}
                                liveID={liveID}
                                userID={loginUserInfo?.userID || ''}
                                seatIndex={-1}
                                onClose={() => setIsShowCoGuestRequestPanel(false)}
                                onStatusChange={(status, coGuestType) => {
                                    setLocalGuestStatus(status);
                                    if (coGuestType) {
                                        setLocalCoGuestType(coGuestType);
                                    }
                                }}
                            />

                            <View
                                pointerEvents="box-none"
                                style={[
                                    styles.footer,
                                    {
                                        bottom: bottomSafeArea + 40,
                                        paddingLeft: safeAreaInsets.left + 16,
                                        paddingRight: safeAreaInsets.right + 16,
                                    },
                                ]}>
                                <BarrageInput liveID={liveID} />

                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={showNetworkQualityPanel}
                                        activeOpacity={0.7}>
                                        <Image
                                            source={require('react-native-tuikit-atomic-x/src/static/images/dashboard.png')}
                                            style={styles.actionBtnIcon}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={showGiftPicker}
                                        activeOpacity={0.7}>
                                        <Image
                                            source={require('react-native-tuikit-atomic-x/src/static/images/live-gift.png')}
                                            style={styles.actionBtnIcon}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>

                                    {localGuestStatus === 'IDLE' && (
                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtn,
                                                shouldDisableCoGuestButton && styles.actionBtnDisabled,
                                            ]}
                                            onPress={handleCoGuestButtonClick}
                                            disabled={shouldDisableCoGuestButton}
                                            activeOpacity={0.7}>
                                            <Image
                                                source={require('react-native-tuikit-atomic-x/src/static/images/link-guest.png')}
                                                style={styles.actionBtnIcon}
                                                resizeMode="contain"
                                            />
                                        </TouchableOpacity>
                                    )}

                                    {localGuestStatus === 'USER_APPLYING' && (
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={ShowCoGuestRequestPanel}
                                            activeOpacity={0.7}>
                                            <Image
                                                source={require('react-native-tuikit-atomic-x/src/static/images/live-request.png')}
                                                style={styles.actionBtnIcon}
                                                resizeMode="contain"
                                            />
                                        </TouchableOpacity>
                                    )}

                                    {localGuestStatus === 'CONNECTED' && (
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={ShowCoGuestRequestPanel}
                                            activeOpacity={0.7}>
                                            <Image
                                                source={require('react-native-tuikit-atomic-x/src/static/images/live-disconnect.png')}
                                                style={styles.actionBtnIcon}
                                                resizeMode="contain"
                                            />
                                        </TouchableOpacity>
                                    )}

                                    <Like liveID={liveID} />
                                </View>
                            </View>

                            <ActionSheet
                                visible={isShowCoGuestSheet}
                                itemList={coGuestSheetItems}
                                showCancel={true}
                                onSelect={handleCoGuestSheetSelect}
                                onCancel={() => setIsShowCoGuestSheet(false)}
                            />

                            <ActionSheet
                                visible={isShowExitSheet}
                                itemList={exitSheetItems}
                                showCancel={true}
                                onSelect={handleExitSheetSelect}
                                onCancel={() => setIsShowExitSheet(false)}
                            />

                            <NetworkQualityPanel
                                visible={isShowNetworkQualityPanel}
                                onClose={() => setIsShowNetworkQualityPanel(false)}
                            />

                            <GiftPicker
                                visible={isShowGiftPicker}
                                liveID={liveID}
                                onClose={() => setIsShowGiftPicker(false)}
                                onGiftSelect={handleGiftSelect}
                                onRecharge={handleRecharge}
                            />

                            {showSVGA && (
                                <SVGAAnimationView
                                    ref={svgaRef}
                                    style={styles.svgaAnimationView}
                                    onFinished={() => {
                                        console.log('[LiveAudiencePage] SVGA animation finished');
                                        setShowSVGA(false);
                                    }}
                                />
                            )}

                            {isKeyboardVisible && (
                                <TouchableWithoutFeedback
                                    onPress={handleHideInput}
                                    accessible={false}>
                                    <View
                                        style={[
                                            StyleSheet.absoluteFill,
                                            {
                                                zIndex: 500,
                                                backgroundColor: 'transparent',
                                            }
                                        ]}
                                    />
                                </TouchableWithoutFeedback>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    liveView: {
        flex: 1,
        backgroundColor: 'rgba(15, 16, 20, 1)',

    },
    header: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    streamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 5,
        paddingVertical: 3,
        borderRadius: 20,
    },
    avatar: {
        width: 29,
        height: 29,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ffffff',
        marginRight: 8,
        backgroundColor: '#f0f0f0',
    },
    streamDetails: {
        flexDirection: 'column',
    },
    streamTitle: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
        maxWidth: 60,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    participantsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 24,
        minWidth: 24,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    participantAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ffffff',
        backgroundColor: '#f0f0f0',
    },
    participantAvatarOverlap: {
        marginLeft: 4,
    },
    participantCount: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
        paddingHorizontal: 6,
    },
    countText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
    },
    closeButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        width: 24,
        height: 24,
    },
    svgaAnimationView: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        pointerEvents: 'none',
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    actionBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
    },
    actionBtnDisabled: {
        opacity: 0.5,
    },
    actionBtnIcon: {
        width: 32,
        height: 32,
    },
    liveNetworkContainer: {
        position: 'absolute',

        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 45,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        padding: 5,
    },
    liveNetworkIcon: {
        width: 16,
        height: 16,
    },
    liveTimer: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 12,
    },
});

