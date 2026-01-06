/**
 * Anchor Page
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

declare const global: {
    currentLiveID?: string;
    [key: string]: any;
};
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    Text,
    Keyboard,
    TouchableWithoutFeedback,
    Modal,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    BeforeLiveContent,
    LiveStreamView,
    LiveStreamViewRef,
    ActionSheet,
    LiveAudienceList,
    UserInfoPanel,
    CoGuestPanel,
    CoHostPanel,
    BarrageInput,
    BarrageList,
    Like,
    NetworkQualityPanel,
    BeautyPanel,
    AudioEffectPanel,
    AudienceActionPanel,
    ConfirmDialog,
    SVGAAnimationView,
    SVGAAnimationViewRef,
    DEFAULT_AVATAR_URL,
    showToast,
    useTranslation,
    i18n,
} from 'react-native-tuikit-atomic-x';
import {
    useLiveListState,
    useLiveAudienceState,
    useLoginState,
    useLiveSeatState,
    useDeviceState,
    useCoGuestState,
    useCoHostState,
    useLiveSummaryState,
    useGiftState,
    useBarrageState,
    CoHostStatus,
    MirrorType,
    startForegroundService,
    stopForegroundService,
} from 'react-native-tuikit-atomic-x';
import type { LiveUserInfoParam } from 'react-native-tuikit-atomic-x';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AnchorPageProps {
    onBack?: () => void;
    onStartLiveSuccess?: (liveID: string) => void;
    onEndLive?: (liveID?: string) => void;
}

function getMuteImageByLanguage(language: string = 'en'): {
    big: number;
    small: number;
} {
    const bigImage = language.toLowerCase() === 'en' 
        ? require('../../static/images/live_mute_image_en.png')
        : require('../../static/images/live_mute_image_zh.png');
    
    const smallImage = require('../../static/images/live_mute_image_multi.png');
    
    return {
        big: bigImage,
        small: smallImage,
    };
}

export function AnchorPage({ onBack, onStartLiveSuccess, onEndLive }: AnchorPageProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();
    const liveStreamViewRef = useRef<LiveStreamViewRef>(null);
    const { createLive, endLive, currentLive, fetchLiveList } = useLiveListState();
    const { loginUserInfo } = useLoginState();
    const {
        cameraStatus,
        switchCamera,
        isFrontCamera,
        switchMirror,
        localMirrorType,
        closeLocalCamera,
        closeLocalMicrophone,
    } = useDeviceState();

    const localMirrorTypeRef = useRef<MirrorType>(localMirrorType);

    useEffect(() => {
        localMirrorTypeRef.current = localMirrorType;
    }, [localMirrorType]);

    const [coverURL, setCoverURL] = useState('');
    const [liveTitle, setLiveTitle] = useState('');
    const [liveMode, setLiveMode] = useState('');
    const [liveID, setLiveID] = useState<string>(() => {
        const userID = loginUserInfo?.userID || '';
        const generatedLiveID = userID ? `live_${userID}` : `anchor_${Date.now()}`;
        global.currentLiveID = generatedLiveID;
        return generatedLiveID;
    });
    const [isLiveStarted, setIsLiveStarted] = useState(false);
    const [isShowExitSheet, setIsShowExitSheet] = useState(false);
    const [isShowAudienceList, setIsShowAudienceList] = useState(false);
    const [isShowUserInfoPanel, setIsShowUserInfoPanel] = useState(false);
    const [clickUserInfo, setClickUserInfo] = useState<any>(null);
    const [isShowAnchorInfo, setIsShowAnchorInfo] = useState(true);
    const [isShowCoGuestPanelAvatar, setIsShowCoGuestPanelAvatar] = useState(true);
    const [isShowCoGuestPanel, setIsShowCoGuestPanel] = useState(false);
    const [isShowCoHostPanel, setIsShowCoHostPanel] = useState(false);
    const [coGuestPanelTab, setCoGuestPanelTab] = useState<'requests' | 'invitees'>('requests');
    const [showCoHostConfirmModal, setShowCoHostConfirmModal] = useState(false);
    const [currentModalUserInfo, setCurrentModalUserInfo] = useState<any>(null);
    const [isShowNetworkQualityPanel, setIsShowNetworkQualityPanel] = useState(false);
    const [isShowBeautyPanel, setIsShowBeautyPanel] = useState(false);
    const [isShowAudioEffect, setIsShowAudioEffect] = useState(false);
    const [isAudienceActionPanelVisible, setIsAudienceActionPanelVisible] = useState(false);
    const [selectedAudienceFromBarrage, setSelectedAudienceFromBarrage] = useState<LiveUserInfoParam | null>(null);
    const [isShowLiveMoreActionsPanel, setIsShowLiveMoreActionsPanel] = useState(false);
    const [liveDurationText, setLiveDurationText] = useState('00:00:00');

    useEffect(() => {
        if (loginUserInfo?.userName && !liveTitle) {
            setLiveTitle(String(loginUserInfo.userName));
        }
        if (loginUserInfo?.userID) {
            const userID = String(loginUserInfo.userID);
            const newLiveID = `live_${userID}`;
            setLiveID(newLiveID);
            global.currentLiveID = newLiveID;
        }
    }, [loginUserInfo, liveTitle]);

    const actualLiveID = useMemo(() => {
        const finalLiveID = currentLive?.liveID || liveID;
        (global as any).currentLiveID = finalLiveID;
        return finalLiveID;
    }, [currentLive, liveID]);

    const { seatList } = useLiveSeatState(actualLiveID);

    const { audienceList, audienceCount } = useLiveAudienceState(actualLiveID);
    const { applicants, connected: coGuestConnected, rejectApplication } = useCoGuestState(actualLiveID);
    const { summaryData } = useLiveSummaryState(actualLiveID);
    const {
        invitees,
        coHostStatus,
        acceptHostConnection,
        rejectHostConnection,
        exitHostConnection,
        addCoHostListener,
        removeCoHostListener,
    } = useCoHostState(actualLiveID);
    const { addGiftListener, removeGiftListener, setLanguage } = useGiftState(actualLiveID);
    const { appendLocalTip } = useBarrageState(actualLiveID);

    useEffect(() => {
        if (!actualLiveID) return;

        // 根据 i18n 当前语言设置礼物语言
        const giftLanguage = i18n.language === 'zh' ? 'zh-Hans' : 'en';
        setLanguage({
            liveID: actualLiveID,
            language: giftLanguage,
            onSuccess: () => {
                console.log(`[AnchorPage] 礼物语言设置为 ${giftLanguage} 成功`);
            },
            onError: (error) => {
                console.error('[AnchorPage] 礼物语言设置失败:', error);
            },
        });
    }, [actualLiveID, setLanguage]);

    const svgaRef = useRef<SVGAAnimationViewRef>(null);

    const [giftToast, setGiftToast] = useState<any>(null);

    const [showSVGA, setShowSVGA] = useState(false);

    const displayAudiences = useMemo(() => {
        return audienceList.slice(0, 2);
    }, [audienceList]);

    const displayApplicants = useMemo(() => {
        return applicants.slice(0, 2);
    }, [applicants]);


    useEffect(() => {
        if (!isShowCoGuestPanelAvatar && applicants.length > 0) {
            applicants.forEach((applicant) => {
                rejectApplication({
                    liveID: actualLiveID,
                    userID: applicant.userID,
                    onSuccess: () => {
                        console.log('自动拒绝申请:', applicant.userID);
                    },
                    onError: (error) => {
                        console.error('自动拒绝申请失败:', error);
                    },
                });
            });
        }
    }, [applicants, isShowCoGuestPanelAvatar, actualLiveID, rejectApplication]);

    useEffect(() => {
        console.log('主播页面 summaryData 变化:', summaryData);
    }, [summaryData]);

    useEffect(() => {
        if (coHostStatus === CoHostStatus.DISCONNECTED) {
            setIsShowCoGuestPanelAvatar(true);
        }
    }, [coHostStatus]);

    useEffect(() => {
        if (isLiveStarted && liveStreamViewRef.current) {
            const currentLanguage = i18n.language || 'en';
            const muteImages = getMuteImageByLanguage(currentLanguage);
            liveStreamViewRef.current?.setLocalVideoMuteImage?.(
                muteImages.big,
                muteImages.small
            );
        }
    }, [isLiveStarted]);

    useEffect(() => {
        if (!invitees || invitees.length === 0) {
            if (!isShowCoGuestPanelAvatar) {
                setIsShowCoGuestPanelAvatar(true);
            }
        } else {
            applicants.forEach((applicant) => {
                rejectApplication({
                    liveID: actualLiveID,
                    userID: applicant.userID,
                    onSuccess: () => {
                        console.log('拒绝申请:', applicant.userID);
                    },
                    onError: (error) => {
                        console.error('拒绝申请失败:', error);
                    },
                });
            });
        }
    }, [invitees, applicants, actualLiveID, rejectApplication, isShowCoGuestPanelAvatar]);

    const showCoHostInviteDialog = React.useCallback((userInfo: any) => {
        setCurrentModalUserInfo(userInfo);
        setShowCoHostConfirmModal(true);
        setTimeout(() => {
            setShowCoHostConfirmModal(false);
            setCurrentModalUserInfo(null);
        }, 30000);
    }, []);

    useEffect(() => {
        if (!isLiveStarted) return;

        const handleCoHostRequestReceived = (params?: unknown) => {
            try {
                const event = typeof params === 'string' ? params : JSON.stringify(params);
                const res = JSON.parse(event);
                if (coGuestConnected.length > 1 || applicants.length > 0) {
                    rejectHostConnection({
                        liveID: actualLiveID,
                        fromHostLiveID: JSON.parse(res.inviter).liveID,
                        onSuccess: () => {
                            console.log('拒绝连主播请求');
                        },
                        onError: (error) => {
                            console.error('拒绝连主播请求失败:', error);
                        },
                    });
                    return;
                }

                if (isShowCoGuestPanelAvatar && applicants.length === 0) {
                    setIsShowCoGuestPanelAvatar(false);
                }
                showCoHostInviteDialog(JSON.parse(res.inviter));
            } catch (error) {
                console.error('解析连主播请求事件失败:', error);
            }
        };

        const handleCoHostRequestAccepted = () => {
            showToast(t('anchor.coHostAccepted'), 2000);
        };

        const handleCoHostRequestRejected = () => {
            showToast(t('anchor.coHostRejected'), 2000);
        };

        const handleCoHostRequestTimeout = (params?: unknown) => {
            try {
                setIsShowCoGuestPanelAvatar(true);
                
                const event = typeof params === 'string' ? JSON.parse(params) : params;
                const invitee = typeof event?.invitee === 'string' ? JSON.parse(event.invitee) : event?.invitee;
                
                if (invitee?.userID === liveOwner?.userID) {
                    return;
                }
                
                showToast(t('anchor.coHostTimeout'), 2000);
            } catch (error) {
                setIsShowCoGuestPanelAvatar(true);
            }
        };

        addCoHostListener('onCoHostRequestReceived', handleCoHostRequestReceived, actualLiveID);
        addCoHostListener('onCoHostRequestAccepted', handleCoHostRequestAccepted, actualLiveID);
        addCoHostListener('onCoHostRequestRejected', handleCoHostRequestRejected, actualLiveID);
        addCoHostListener('onCoHostRequestTimeout', handleCoHostRequestTimeout, actualLiveID);

        return () => {
            removeCoHostListener('onCoHostRequestReceived', actualLiveID);
            removeCoHostListener('onCoHostRequestAccepted', actualLiveID);
            removeCoHostListener('onCoHostRequestRejected', actualLiveID);
            removeCoHostListener('onCoHostRequestTimeout', actualLiveID);
        };
    }, [isLiveStarted, actualLiveID, coGuestConnected, applicants, isShowCoGuestPanelAvatar, addCoHostListener, removeCoHostListener, rejectHostConnection, showCoHostInviteDialog]);

    useEffect(() => {
        if (!isLiveStarted || !actualLiveID) return;

        const handleReceiveGift = (params?: unknown) => {
            try {
                console.log('[AnchorPage] 收到礼物事件:', params);

                let eventData: any;
                if (typeof params === 'string') {
                    eventData = JSON.parse(params);
                } else if (params && typeof params === 'object') {
                    eventData = params;
                } else {
                    console.warn('[AnchorPage] 礼物事件数据格式无效:', params);
                    return;
                }

                const giftData = eventData.gift;
                if (!giftData) {
                    console.warn('[AnchorPage] 礼物数据为空');
                    return;
                }

                let gift: any;
                if (typeof giftData === 'string') {
                    gift = JSON.parse(giftData);
                } else {
                    gift = giftData;
                }

                console.log('[AnchorPage] 解析后的礼物数据:', gift);

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
                console.log('[AnchorPage] 礼物图片 URL:', giftIconURL);
                console.log('[AnchorPage] 设置礼物 Toast:', toastData);
                setGiftToast(toastData);

                const giftLiveOwner = currentLive?.liveOwner as { userName?: string; userID?: string } | undefined;
                const ownerUserID = giftLiveOwner?.userID;
                const currentLoginUserID = loginUserInfo?.userID;

                let receiverName: string;
                if (currentLoginUserID && ownerUserID && currentLoginUserID === ownerUserID) {
                    receiverName = t('anchor.giftToMe');
                } else {
                    receiverName = giftLiveOwner?.userName || giftLiveOwner?.userID || '';
                }
                const giftName = gift.name || '';
                const giftCount = eventData.count || 1;
                const giftTextContent = t('anchor.giftTo', { receiver: receiverName, gift: giftName, count: giftCount });

                const giftMessage = {
                    sender: sender,
                    gift: gift,
                    count: giftCount,
                    textContent: giftTextContent,
                    messageID: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now(),
                };
                console.log('[AnchorPage] 添加礼物消息到弹幕列表:', giftMessage);
                appendLocalTip({
                    liveID: actualLiveID,
                    message: giftMessage as any,
                    onSuccess: () => {
                        console.log('[AnchorPage] 礼物消息已添加到弹幕列表');
                    },
                    onError: (error) => {
                        console.error('[AnchorPage] 添加礼物消息到弹幕列表失败:', error);
                    },
                });

                const resourceURL = gift.resourceURL || gift.resourceUrl || '';
                if (resourceURL) {
                    const urlLower = resourceURL.toLowerCase();
                    const isPng = urlLower.endsWith('.png') || urlLower.includes('.png?');

                    if (!isPng) {
                        console.log('[AnchorPage] 播放收到的礼物动画:', gift.name, resourceURL);
                        setShowSVGA(true);
                        setTimeout(() => {
                            if (svgaRef.current) {
                                svgaRef.current.startAnimation(resourceURL);
                            }
                        }, 100);
                    } else {
                        console.log('[AnchorPage] 跳过 PNG 格式礼物:', gift.name);
                    }
                }
            } catch (error) {
                console.error('[AnchorPage] 处理礼物接收事件失败:', error);
            }
        };

        addGiftListener('onReceiveGift', handleReceiveGift);

        return () => {
            removeGiftListener('onReceiveGift');
        };
    }, [isLiveStarted, actualLiveID, addGiftListener, removeGiftListener, appendLocalTip, currentLive?.liveOwner, loginUserInfo?.userID]);

    const liveOwner = useMemo(() => {
        if (!currentLive) return null;
        const owner = (currentLive as any).liveOwner;
        return owner || loginUserInfo || null;
    }, [currentLive, loginUserInfo]);

    const showAnchorInfoDrawer = () => {
        setIsShowAnchorInfo(true);
        if (liveOwner) {
            setClickUserInfo({ ...liveOwner, liveID: currentLive?.liveID || actualLiveID });
        } else {
            setClickUserInfo({
                userID: loginUserInfo?.userID || 'unknown',
                userName: loginUserInfo?.userName || t('anchor.defaultName'),
                avatarURL: loginUserInfo?.avatarURL || DEFAULT_AVATAR_URL,
                liveID: currentLive?.liveID || actualLiveID,
            });
        }
        setIsShowUserInfoPanel(true);
    };

    const handleEditCover = (cover: string) => {
        setCoverURL(cover);
    };

    const handleEditTitle = (title: string) => {
        setLiveTitle(title);
    };

    const handleChooseMode = (mode: string) => {
        setLiveMode(mode);
    };

    const handleStartLive = async () => {
        try {
            await createLive({
                liveInfo: {
                    liveID: global.currentLiveID as string,
                    liveName: liveTitle || (loginUserInfo?.userName as string) || loginUserInfo?.nickname || t('anchor.myLive'),
                    coverURL: coverURL || undefined,
                    isPublicVisible: liveMode === t('beforeLive.public') || liveMode === '',
                    isSeatEnabled: true,
                    seatMode: 'APPLY' as const,
                    seatLayoutTemplateID: 600,
                    keepOwnerOnSeat: true
                },
                onSuccess: () => {
                    setIsLiveStarted(true);
                    startForegroundService(t('keepAlive.title'), t('keepAlive.description'));
                    setTimeout(() => {
                        const realLiveID = currentLive?.liveID || liveID;
                        onStartLiveSuccess?.(realLiveID);
                    }, 100);
                },
                onError: (error: Error | string) => {
                    const errorMessage = error instanceof Error ? error.message : error;
                    showToast(t('anchor.createLiveFailed', { error: errorMessage || t('common.unknown') }), 3000);
                },
            });

        } catch (error) {
            console.error('创建直播失败:', error);
            showToast(t('anchor.createLiveFailedUnknown'), 3000);
        }
    };


    const handleCoHostInviteConfirm = () => {
        if (currentModalUserInfo) {
            acceptHostConnection({
                liveID: actualLiveID,
                fromHostLiveID: currentModalUserInfo.liveID,
                onSuccess: () => {
                    console.log('接受连主播请求成功');
                },
                onError: (error) => {
                    console.error('接受连主播请求失败:', error);
                },
            });
        }
        setShowCoHostConfirmModal(false);
        setCurrentModalUserInfo(null);
    };

    const handleCoHostInviteCancel = () => {
        if (currentModalUserInfo) {
            rejectHostConnection({
                liveID: actualLiveID,
                fromHostLiveID: currentModalUserInfo.liveID,
                onSuccess: () => {
                    console.log('拒绝连主播请求成功');
                },
                onError: (error) => {
                    console.error('拒绝连主播请求失败:', error);
                },
            });
        }
        setIsShowCoGuestPanelAvatar(true);
        setShowCoHostConfirmModal(false);
        setCurrentModalUserInfo(null);
    };


    const showCoGuestPanel = (tab: 'requests' | 'invitees' = 'requests') => {
        setCoGuestPanelTab(tab);
        setIsShowCoGuestPanel(true);
    };

    const showCoHostPanel = () => {
        if (coGuestConnected.length > 1) {
            showToast(t('anchor.coGuestInProgress'), 2000);
            return;
        }

        if (fetchLiveList) {
            fetchLiveList({
                cursor: '',
                count: 20,
                onSuccess: () => {
                    console.log('刷新直播列表成功');
                },
                onError: (error: any) => {
                    console.error('刷新直播列表失败:', error);
                },
            });
        }
        setIsShowCoHostPanel(true);
    };

    const handleEndLive = () => {
        setIsShowExitSheet(true);
    };

    const handleExitSheetSelect = (index: number) => {
        setIsShowExitSheet(false);

        if (coHostStatus === CoHostStatus.CONNECTED && index === 0) {
            exitHostConnection({
                liveID: actualLiveID,
                onSuccess: () => {
                    console.log('断开连线成功');
                },
                onError: (error) => {
                    console.error('断开连线失败:', error);
                },
            });
            return;
        }

        if ((coHostStatus === CoHostStatus.CONNECTED && index === 1) || (coHostStatus !== CoHostStatus.CONNECTED && index === 0)) {
            const liveDurationMs = currentLive?.createTime
                ? Math.max(0, Date.now() - currentLive.createTime)
                : 0;

            const finalSummaryData = {
                ...summaryData,
                duration: liveDurationMs,
                totalDuration: liveDurationMs,
                viewerCount: audienceCount || 0,
                totalViewers: audienceCount || 0,
                totalLikesReceived: summaryData?.totalLikesReceived || 0,
                giftCount: summaryData?.giftCount || 0,
                totalGiftCoins: summaryData?.giftCount || 0,
            };

            (global as any).summaryData = finalSummaryData;

            endLive({
                onSuccess: () => {
                    setIsLiveStarted(false);
                    stopForegroundService();
                    onEndLive?.();
                },
                onError: (error) => {
                    console.error('结束直播失败:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    showToast(t('anchor.endLiveFailed', { error: errorMessage }), 3000);
                },
            });
            onEndLive?.();
        }
    };

    const handleHideInput = () => {
        Keyboard.dismiss();
    };

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
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

    const handleBeauty = () => {
        setIsShowBeautyPanel(true);
    };

    const handleAudioEffect = () => {
        setIsShowAudioEffect(true);
    };

    const handleCamera = async () => {
        await switchCamera({
            isFront: isFrontCamera === undefined ? true : !isFrontCamera,
        });
    };

    const handleSwitchMirror = useCallback(() => {
        if (!isFrontCamera) {
            showToast(t('anchor.frontCameraOnly'), 2000);
            return;
        }
        const currentMirrorType = localMirrorTypeRef.current;

        if (currentMirrorType === MirrorType.AUTO) {
            switchMirror({ mirrorType: MirrorType.DISABLE });
        } else if (currentMirrorType === MirrorType.DISABLE) {
            switchMirror({ mirrorType: MirrorType.ENABLE });
        } else if (currentMirrorType === MirrorType.ENABLE) {
            switchMirror({ mirrorType: MirrorType.DISABLE });
        } else {
            switchMirror({ mirrorType: MirrorType.AUTO });
        }
    }, [isFrontCamera, localMirrorType, switchMirror]);

    const showNetworkQualityPanel = () => {
        setIsShowNetworkQualityPanel(true);
    };

    const handleSettings = () => {
        setIsShowLiveMoreActionsPanel(true);
    };

    const closeMoreActionsPanel = () => {
        setIsShowLiveMoreActionsPanel(false);
    };

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
        if (!isLiveStarted) {
            setLiveDurationText('00:00:00');
            return;
        }

        updateLiveDurationText();
        const timer = setInterval(() => {
            updateLiveDurationText();
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [isLiveStarted, updateLiveDurationText]);

    const useDarkStatusBar = seatList.length === 1 && cameraStatus === 'OFF';

    const barrageBottomPx = useMemo(() => {
        const hasCoGuest = coGuestConnected.length > 1;
        const hasCoHost = coHostStatus === CoHostStatus.CONNECTED;
        return (hasCoGuest || hasCoHost) ? safeAreaInsets.bottom : safeAreaInsets.bottom + 40;
    }, [coGuestConnected.length, coHostStatus, safeAreaInsets.bottom]);

    const handleBack = useCallback(async () => {
        try {
            await closeLocalCamera();
            await closeLocalMicrophone();
        } catch (error) {
            console.error('关闭摄像头/麦克风失败:', error);
        } finally {
            onBack?.();
        }
    }, [closeLocalCamera, closeLocalMicrophone, onBack]);

    return (
        <>
            <StatusBar
                barStyle="light-content"
                translucent
                backgroundColor={
                    useDarkStatusBar ? 'black' : 'transparent'
                }
            />
            {!isLiveStarted ? (
                <View style={styles.container}>
                    <LiveStreamView
                        liveID={actualLiveID}
                        isAnchor={true}
                        templateLayout={(currentLive as any)?.seatLayoutTemplateID || 600}
                        isLiving={isLiveStarted}
                        currentLoginUserId={loginUserInfo?.userID}
                        enableClickPanel={true}
                        onPanelAction={(actionKey, payload) => {
                            console.log('[AnchorPage] LiveStreamActionPanel action:', actionKey, payload);
                        }}
                        style={StyleSheet.absoluteFill}
                    />

                    <View
                        style={[
                            styles.header,
                            {
                                top: safeAreaInsets.top,
                                paddingLeft: safeAreaInsets.left + 16,
                                paddingRight: safeAreaInsets.right + 16,
                            },
                        ]}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBack}
                            activeOpacity={0.7}>
                            <Image
                                source={require('react-native-tuikit-atomic-x/src/static/images/left-arrow.png')}
                                style={styles.backIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <BeforeLiveContent
                        coverURL={coverURL}
                        liveMode={liveMode}
                        liveTitle={liveTitle}
                        liveID={liveID}
                        onEditCover={handleEditCover}
                        onEditTitle={handleEditTitle}
                        onChooseMode={handleChooseMode}
                        onStartLive={handleStartLive}
                    />
                </View>
            ) : (
                <View style={styles.container}>
                    <KeyboardAvoidingView
                        style={styles.container}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? -safeAreaInsets.bottom : 0}>
                        <TouchableWithoutFeedback onPress={handleHideInput}>
                            <View style={styles.container}>
                                <View style={styles.liveContainer}>
                                    <LiveStreamView
                                        ref={liveStreamViewRef}
                                        liveID={actualLiveID}
                                        isAnchor={true}
                                        templateLayout={(currentLive as any)?.seatLayoutTemplateID || 600}
                                        isLiving={isLiveStarted}
                                        currentLoginUserId={loginUserInfo?.userID}
                                        enableClickPanel={true}
                                        onPanelAction={(actionKey, payload) => {
                                            console.log('[AnchorPage] LiveStreamActionPanel action:', actionKey, payload);
                                        }}
                                        style={StyleSheet.absoluteFill}
                                    />

                                    <View
                                        pointerEvents="box-none"
                                        style={[
                                            styles.topHeader,
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
                                                            {liveOwner.userName || liveOwner.userID || t('anchor.defaultName')}
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
                                                            {t('anchor.defaultName')}
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
                                                onPress={handleEndLive}
                                                activeOpacity={0.7}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                <Image
                                                    source={require('react-native-tuikit-atomic-x/src/static/images/live-end.png')}
                                                    style={styles.closeIcon}
                                                    resizeMode="contain"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <BarrageList
                                        mode="anchor"
                                        bottomPx={barrageBottomPx}
                                        liveID={actualLiveID}
                                        toast={giftToast}
                                        onToastClosed={() => setGiftToast(null)}
                                        onSenderTap={(sender) => {
                                            if (!sender?.userID) {
                                                return;
                                            }

                                            const audience = audienceList.find(
                                                (item) => item.userID === sender.userID,
                                            ) as LiveUserInfoParam | undefined;

                                            const target =
                                                audience ||
                                                ({
                                                    userID: sender.userID,
                                                    userName: sender.userName,
                                                    avatarURL: sender.avatarURL,
                                                } as any as LiveUserInfoParam);

                                            setSelectedAudienceFromBarrage(target);
                                            setIsAudienceActionPanelVisible(true);
                                        }}
                                    />

                                    <TouchableOpacity
                                        style={[
                                            styles.liveNetworkContainer,
                                            {
                                                top: safeAreaInsets.top + 20 + 40, // header top + header height
                                                right: safeAreaInsets.right + 16, // 与 headerRight 的 paddingRight 对齐
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

                                    <LiveAudienceList
                                        visible={isShowAudienceList}
                                        liveID={actualLiveID}
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

                                    <CoGuestPanel
                                        visible={isShowCoGuestPanel}
                                        liveID={actualLiveID}
                                        activeTab={coGuestPanelTab}
                                        onClose={() => setIsShowCoGuestPanel(false)}
                                    />

                                    <CoHostPanel
                                        visible={isShowCoHostPanel}
                                        liveID={actualLiveID}
                                        onClose={() => setIsShowCoHostPanel(false)}
                                    />


                                    {applicants.length > 0 && isShowCoGuestPanelAvatar && (
                                        <TouchableOpacity
                                            style={[
                                                styles.goGuestRequestContainer,
                                                {
                                                    top: safeAreaInsets.top + 140,
                                                    right: safeAreaInsets.right + 15,
                                                },
                                            ]}
                                            onPress={() => showCoGuestPanel('requests')}
                                            activeOpacity={0.7}>
                                            <View style={styles.avatarOverlayContainer}>
                                                {displayApplicants.map((applicant, index) => {
                                                    const leftPosition = displayApplicants.length === 1
                                                        ? (60 - 30) / 2
                                                        : index * 20;
                                                    return (
                                                        <Image
                                                            key={applicant.userID}
                                                            source={{ uri: applicant.avatarURL || DEFAULT_AVATAR_URL }}
                                                            style={[
                                                                styles.goGuestRequestAvatar,
                                                                {
                                                                    left: leftPosition,
                                                                    zIndex: displayApplicants.length - index,
                                                                },
                                                            ]}
                                                        />
                                                    );
                                                })}
                                                {applicants.length >= 3 && (
                                                    <Image
                                                        source={require('react-native-tuikit-atomic-x/src/static/images/live-more.png')}
                                                        style={[
                                                            styles.goGuestRequestAvatar,
                                                            styles.goGuestRequestAvatarLast,
                                                        ]}
                                                    />
                                                )}
                                            </View>
                                            <Text style={styles.goGuestRequestText}>
                                                {t('anchor.applyCoGuest', { count: applicants.length })}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <View
                                        style={[
                                            styles.footer,
                                            {
                                                bottom: Platform.OS === 'ios' ? safeAreaInsets.bottom + 5 : safeAreaInsets.bottom + 25,
                                                paddingLeft: safeAreaInsets.left + 16,
                                            },
                                        ]}>
                                        <View style={styles.barrageInputWrapper}>
                                            <BarrageInput liveID={actualLiveID} />
                                        </View>

                                        <View style={[styles.actionButtons, { flex: 1, justifyContent: 'flex-end', marginLeft: 16 }]}>
                                            <TouchableOpacity
                                                style={styles.actionButtonItem}
                                                onPress={showCoHostPanel}
                                                activeOpacity={0.7}>
                                                <Image
                                                    source={require('react-native-tuikit-atomic-x/src/static/images/link-host.png')}
                                                    style={styles.actionButtonIcon}
                                                    resizeMode="contain"
                                                />
                                                <Text style={styles.actionButtonText}>{t('anchor.linkHost')}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionButtonItem}
                                                onPress={() => showCoGuestPanel('requests')}
                                                activeOpacity={0.7}>
                                                <Image
                                                    source={require('react-native-tuikit-atomic-x/src/static/images/link-guest.png')}
                                                    style={styles.actionButtonIcon}
                                                    resizeMode="contain"
                                                />
                                                <Text style={styles.actionButtonText}>{t('anchor.linkGuest')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionButtonItem}
                                                onPress={handleSettings}
                                                activeOpacity={0.7}>
                                                <Image
                                                    source={require('react-native-tuikit-atomic-x/src/static/images/live-more.png')}
                                                    style={styles.actionButtonIcon}
                                                    resizeMode="contain"
                                                />
                                                <Text style={styles.actionButtonText}>{t('anchor.more')}</Text>
                                            </TouchableOpacity>
                                            <Like liveID={actualLiveID} role="anchor" />
                                        </View>
                                    </View>

                                    <ConfirmDialog
                                        visible={showCoHostConfirmModal}
                                        message={currentModalUserInfo ? t('anchor.coHostInvite', { name: currentModalUserInfo.userName || currentModalUserInfo.userID }) : ''}
                                        confirmText={t('anchor.accept')}
                                        cancelText={t('anchor.reject')}
                                        onConfirm={handleCoHostInviteConfirm}
                                        onCancel={handleCoHostInviteCancel}
                                    />

                                    <ActionSheet
                                        visible={isShowExitSheet}
                                        itemList={
                                            coHostStatus === CoHostStatus.CONNECTED
                                                ? [t('anchor.disconnectCoHost'), t('anchor.closeLiveRoom')]
                                                : [t('anchor.closeLiveRoom')]
                                        }
                                        showCancel={true}
                                        onSelect={handleExitSheetSelect}
                                        onCancel={() => setIsShowExitSheet(false)}
                                    />

                                    <NetworkQualityPanel
                                        visible={isShowNetworkQualityPanel}
                                        onClose={() => setIsShowNetworkQualityPanel(false)}
                                    />

                                    <BeautyPanel
                                        visible={isShowBeautyPanel}
                                        liveID={actualLiveID}
                                        onClose={() => setIsShowBeautyPanel(false)}
                                    />

                                    <AudioEffectPanel
                                        visible={isShowAudioEffect}
                                        liveID={actualLiveID}
                                        onClose={() => setIsShowAudioEffect(false)}
                                    />

                                    <AudienceActionPanel
                                        visible={isAudienceActionPanelVisible}
                                        liveID={actualLiveID}
                                        userInfo={selectedAudienceFromBarrage || undefined}
                                        onClose={() => setIsAudienceActionPanelVisible(false)}
                                    />

                                    <Modal
                                        transparent
                                        visible={isShowLiveMoreActionsPanel}
                                        animationType="slide"
                                        onRequestClose={closeMoreActionsPanel}>
                                        <TouchableWithoutFeedback onPress={closeMoreActionsPanel}>
                                            <View style={styles.moreActionsOverlay}>
                                                <TouchableWithoutFeedback>
                                                    <View style={styles.moreActionsDrawer}>
                                                        <Text style={styles.moreActionsTitle}>{t('anchor.moreFeatures')}</Text>
                                                        <View style={styles.moreActionsRow}>
                                                            <TouchableOpacity
                                                                style={styles.moreActionBtn}
                                                                onPress={() => {
                                                                    closeMoreActionsPanel();
                                                                    handleBeauty();
                                                                }}
                                                                activeOpacity={0.7}>
                                                                <View style={styles.moreActionIconContainer}>
                                                                    <Image
                                                                        source={require('react-native-tuikit-atomic-x/src/static/images/live-beauty.png')}
                                                                        style={styles.moreActionIcon}
                                                                        resizeMode="contain"
                                                                    />
                                                                </View>
                                                                <Text style={styles.moreActionText}>{t('anchor.beauty')}</Text>
                                                            </TouchableOpacity>

                                                            <TouchableOpacity
                                                                style={styles.moreActionBtn}
                                                                onPress={() => {
                                                                    closeMoreActionsPanel();
                                                                    handleAudioEffect();
                                                                }}
                                                                activeOpacity={0.7}>
                                                                <View style={styles.moreActionIconContainer}>
                                                                    <Image
                                                                        source={require('react-native-tuikit-atomic-x/src/static/images/live-effects.png')}
                                                                        style={styles.moreActionIcon}
                                                                        resizeMode="contain"
                                                                    />
                                                                </View>
                                                                <Text style={styles.moreActionText}>{t('anchor.audioEffect')}</Text>
                                                            </TouchableOpacity>

                                                            <TouchableOpacity
                                                                style={styles.moreActionBtn}
                                                                onPress={() => {
                                                                    closeMoreActionsPanel();
                                                                    handleCamera();
                                                                }}
                                                                activeOpacity={0.7}>
                                                                <View style={styles.moreActionIconContainer}>
                                                                    <Image
                                                                        source={require('react-native-tuikit-atomic-x/src/static/images/live-flip.png')}
                                                                        style={styles.moreActionIcon}
                                                                        resizeMode="contain"
                                                                    />
                                                                </View>
                                                                <Text style={styles.moreActionText}>{t('anchor.flip')}</Text>
                                                            </TouchableOpacity>

                                                            <TouchableOpacity
                                                                style={styles.moreActionBtn}
                                                                onPress={() => {
                                                                    closeMoreActionsPanel();
                                                                    handleSwitchMirror();
                                                                }}
                                                                activeOpacity={0.7}>
                                                                <View style={styles.moreActionIconContainer}>
                                                                    <Image
                                                                        source={require('react-native-tuikit-atomic-x/src/static/images/mirror.png')}
                                                                        style={styles.moreActionIcon}
                                                                        resizeMode="contain"
                                                                    />
                                                                </View>
                                                                <Text style={styles.moreActionText}>{t('anchor.mirror')}</Text>
                                                            </TouchableOpacity>

                                                            <TouchableOpacity
                                                                style={styles.moreActionBtn}
                                                                onPress={() => {
                                                                    closeMoreActionsPanel();
                                                                    showNetworkQualityPanel();
                                                                }}
                                                                activeOpacity={0.7}>
                                                                <View style={styles.moreActionIconContainer}>
                                                                    <Image
                                                                        source={require('react-native-tuikit-atomic-x/src/static/images/live-dashboard.png')}
                                                                        style={styles.moreActionIcon}
                                                                        resizeMode="contain"
                                                                    />
                                                                </View>
                                                                <Text style={styles.moreActionText}>{t('anchor.dashboard')}</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                </TouchableWithoutFeedback>
                                            </View>
                                        </TouchableWithoutFeedback>
                                    </Modal>

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
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            )}

            {showSVGA && (
                <SVGAAnimationView
                    ref={svgaRef}
                    style={styles.svgaAnimationView}
                    onFinished={() => {
                        console.log('[AnchorPage] SVGA animation finished');
                        setShowSVGA(false);
                    }}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    liveContainer: {
        flex: 1,
        position: 'relative',
    },
    header: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        zIndex: 10,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        zIndex: 1,
    },
    backIcon: {
        width: 16,
        height: 16,
        opacity: 0.8,
    },
    topHeader: {
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
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        width: 20,
        height: 20,
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 1000,
    },
    barrageInputWrapper: {
        height: 46,
        justifyContent: 'center',
        width: 200,
    },
    goGuestRequestContainer: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 20,
        backgroundColor: '#4F586B',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    avatarOverlayContainer: {
        position: 'relative',
        width: 60,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    goGuestRequestAvatar: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    goGuestRequestAvatarLast: {
        left: 2 * 20,
        zIndex: 0,
    },
    goGuestRequestText: {
        marginTop: 15,
        fontSize: 12,
        color: '#fff',
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
        height: 46,
        paddingRight: 0,
    },
    actionButtonItem: {
        width: 32,
        height: 46,
        marginLeft: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
    },
    actionButtonIcon: {
        width: 28,
        height: 28,
        marginBottom: 2,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 10,
        textAlign: 'center',
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
    moreActionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    moreActionsDrawer: {
        backgroundColor: 'rgba(31, 32, 36, 1)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 24,
        paddingHorizontal: 24,
    },
    moreActionsTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        paddingVertical: 16,
    },
    moreActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
    },
    moreActionBtn: {
        flex: 1,
        alignItems: 'center',
    },
    moreActionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: 'rgba(43, 44, 48, 1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    moreActionIcon: {
        width: 30,
        height: 30,
    },
    moreActionText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
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
});
