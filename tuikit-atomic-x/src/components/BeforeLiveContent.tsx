/**
 * BeforeLiveContent Component
 * 开播前内容组件
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    Modal,
    TouchableWithoutFeedback,
    FlatList,
    Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { showToast } from './CustomToast';
import { useLoginState } from '../atomic-x/state/LoginState';
import { useDeviceState } from '../atomic-x/state/DeviceState';
import { BeautyPanel } from './BeautyPanel';
import { AudioEffectPanel } from './AudioEffectPanel';
import { ActionSheet } from './ActionSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BeforeLiveContentProps {
    coverURL?: string;
    liveCategory?: string;
    liveMode?: string;
    liveTitle?: string;
    liveID: string;
    onEditCover?: (coverURL: string) => void;
    onEditTitle?: (title: string) => void;
    onChooseMode?: (mode: string) => void;
    onStartLive?: () => void;
}

// 封面列表
const AVATAR_LIST = [
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover1.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover2.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover3.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover4.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover5.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover6.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover7.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover8.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover9.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover10.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover11.png',
    'https://liteav-test-1252463788.cos.ap-guangzhou.myqcloud.com/voice_room/voice_room_cover12.png',
];

const DEFAULT_COVER_URL = AVATAR_LIST[0];

/**
 * 计算字节长度
 */
const getByteLength = (str: string): number => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode <= 0x7f) {
            len += 1;
        } else if (charCode <= 0x7ff) {
            len += 2;
        } else if (charCode <= 0xffff) {
            len += 3;
        } else {
            len += 4;
        }
    }
    return len;
};


export function BeforeLiveContent({
    coverURL = '',
    liveCategory: _liveCategory,
    liveMode,
    liveTitle = '',
    liveID,
    onEditCover,
    onEditTitle,
    onChooseMode,
    onStartLive,
}: BeforeLiveContentProps) {
    const { t } = useTranslation();
    const { loginUserInfo } = useLoginState();
    const { switchCamera, isFrontCamera, openLocalMicrophone, openLocalCamera } = useDeviceState();

    // 内部状态
    const [localCoverURL, setLocalCoverURL] = useState(coverURL || DEFAULT_COVER_URL);
    const [localLiveTitle, setLocalLiveTitle] = useState('');
    const [localLiveMode, setLocalLiveMode] = useState('');
    const [isShowOverDialog, setIsShowOverDialog] = useState(false);
    const [_isInputFocused, setIsInputFocused] = useState(false);
    const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [lastValidTitle, setLastValidTitle] = useState('');
    const [isShowBeautyPanel, setIsShowBeautyPanel] = useState(false);
    const [isShowAudioEffect, setIsShowAudioEffect] = useState(false);
    const [isShowModeSheet, setIsShowModeSheet] = useState(false);

    // 初始化 liveMode
    useEffect(() => {
        if (!localLiveMode) {
            setLocalLiveMode(liveMode || t('beforeLive.public'));
        }
    }, [liveMode, t, localLiveMode]);

    // 计算默认标题
    const defaultLiveTitle = useMemo(() => {
        return loginUserInfo?.nickname || loginUserInfo?.userID || '';
    }, [loginUserInfo]);

    // 初始化标题
    useEffect(() => {
        if (!localLiveTitle && !hasUserInteracted && defaultLiveTitle) {
            setLocalLiveTitle(defaultLiveTitle);
        }
    }, [defaultLiveTitle, hasUserInteracted, localLiveTitle]);

    // 同步 props 变化
    useEffect(() => {
        if (coverURL) {
            setLocalCoverURL(coverURL);
        }
    }, [coverURL]);

    useEffect(() => {
        if (liveMode) {
            setLocalLiveMode(liveMode);
        }
    }, [liveMode]);

    useEffect(() => {
        if (liveTitle && !hasUserInteracted) {
            setLocalLiveTitle(liveTitle);
        }
    }, [liveTitle, hasUserInteracted]);

    // 监听标题变化，通知父组件
    useEffect(() => {
        if (localLiveTitle) {
            onEditTitle?.(localLiveTitle);
        }
    }, [localLiveTitle, onEditTitle]);

    // 组件加载时开启麦克风和摄像头
    useEffect(() => {
        const initDevices = async () => {
            try {
                // 先开启摄像头（默认前置），等待权限请求完成
                await openLocalCamera({
                    isFront: true,
                    onSuccess: () => {
                        console.log('[BeforeLiveContent] 摄像头已开启');
                    },
                    onError: (error: Error | string) => {
                        console.error('[BeforeLiveContent] 开启摄像头失败:', error);
                    },
                });

                // 等待一小段时间，确保第一个权限对话框已显示或完成
                await new Promise<void>(resolve => setTimeout(() => resolve(), 300));

                // 再开启麦克风
                await openLocalMicrophone({
                    onSuccess: () => {
                        console.log('[BeforeLiveContent] 麦克风已开启');
                    },
                    onError: (error: Error | string) => {
                        console.error('[BeforeLiveContent] 开启麦克风失败:', error);
                    },
                });
            } catch (error) {
                console.error('[BeforeLiveContent] 初始化设备失败:', error);
            }
        };

        initDevices();
    }, [openLocalMicrophone, openLocalCamera]);

    // 输入标题处理
    const handleInputTitle = (text: string) => {
        setHasUserInteracted(true);
        const byteLength = getByteLength(text);

        if (byteLength <= 100) {
            setLocalLiveTitle(text);
            setLastValidTitle(text);
        } else {
            setLocalLiveTitle(lastValidTitle || defaultLiveTitle);
            showToast(t('barrage.tooLong'), 2000);
        }
    };

    // 编辑标题
    const handleEditTitle = () => {
        setIsInputFocused(true);
    };

    // 编辑封面
    const handleEditCover = () => {
        setIsShowOverDialog(true);
        if (localCoverURL) {
            onEditCover?.(localCoverURL);
        }
    };

    // 选择模式
    const handleChooseMode = () => {
        setIsShowModeSheet(true);
    };

    // 模式选择
    const handleModeSheetSelect = (tapIndex: number) => {
        const newMode = tapIndex === 0 ? t('beforeLive.public') : t('beforeLive.private');
        setLocalLiveMode(newMode);
        onChooseMode?.(newMode);
        setIsShowModeSheet(false);
    };

    // 关闭封面弹窗
    const handleCloseCoverDialog = () => {
        setIsShowOverDialog(false);
    };

    // 选择封面
    const handleSelectAvatar = (index: number) => {
        setSelectedAvatarIndex(index);
    };

    // 设置封面
    const handleSetCover = () => {
        const newCoverURL = AVATAR_LIST[selectedAvatarIndex];
        if (newCoverURL) {
            setLocalCoverURL(newCoverURL);
            onEditCover?.(newCoverURL);
        }
        setIsShowOverDialog(false);
    };

    // 美颜
    const handleBeauty = () => {
        setIsShowBeautyPanel(true);
    };

    // 音效
    const handleAudioEffect = () => {
        setIsShowAudioEffect(true);
    };

    // 翻转摄像头
    const handleCamera = async () => {
        await switchCamera({
            isFront: isFrontCamera === undefined ? true : !isFrontCamera, // 切换到相反方向
        });
    };

    // 开始直播
    const handleStartLive = () => {
        onStartLive?.();
    };

    return (
        <View style={styles.container}>
            {/* 直播设置卡片 */}
            <View style={styles.liveInfoCard}>
                {/* 封面区域 */}
                <TouchableOpacity style={styles.coverSection} onPress={handleEditCover} activeOpacity={0.8}>
                    <Image source={{ uri: localCoverURL }} style={styles.coverImage} resizeMode="cover" />
                    <View style={styles.coverOverlay}>
                        <Text style={styles.coverOverlayText}>{t('beforeLive.cover')}</Text>
                    </View>
                </TouchableOpacity>

                {/* 信息区域 */}
                <View style={styles.infoSection}>
                    {/* 标题行 */}
                    <View style={styles.titleRow}>
                        <TextInput
                            style={styles.liveTitle}
                            value={localLiveTitle}
                            onChangeText={handleInputTitle}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            placeholder={t('beforeLive.roomNamePlaceholder')}
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            maxLength={50}
                        />
                        <TouchableOpacity style={styles.editIconContainer} onPress={handleEditTitle}>
                            <Image
                                source={require('../static/images/edit.png')}
                                style={styles.editIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.underline} />

                    {/* 模式行 */}
                    <TouchableOpacity style={styles.infoRow} onPress={handleChooseMode} activeOpacity={0.7}>
                        <Image
                            source={require('../static/images/mode.png')}
                            style={styles.infoIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.liveDetail}>{t('beforeLive.category')}：</Text>
                        <Text style={styles.liveDetail}>{localLiveMode}</Text>
                        <Image
                            source={require('../static/images/right-arrow.png')}
                            style={styles.arrowIcon}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 封面选择弹窗 */}
            <Modal
                transparent
                visible={isShowOverDialog}
                animationType="slide"
                onRequestClose={handleCloseCoverDialog}>
                <TouchableWithoutFeedback onPress={handleCloseCoverDialog}>
                    <View style={styles.bottomDrawerContainer}>
                        <TouchableWithoutFeedback>
                            <View style={styles.bottomDrawer}>
                                <View style={styles.listTitleContainer}>
                                    <Text style={styles.listTitle}>{t('beforeLive.cover')}</Text>
                                </View>
                                <FlatList
                                    data={AVATAR_LIST}
                                    numColumns={3}
                                    keyExtractor={(item, index) => `cover-${index}`}
                                    contentContainerStyle={styles.coverListContent}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            style={styles.coverDialogItem}
                                            onPress={() => handleSelectAvatar(index)}
                                            activeOpacity={0.8}>
                                            <Image
                                                source={{ uri: item }}
                                                style={[
                                                    styles.coverDialogImg,
                                                    selectedAvatarIndex === index && styles.coverDialogImgSelected,
                                                ]}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    )}
                                />
                                <View style={styles.coverDialogFooter}>
                                    <TouchableOpacity style={styles.setCoverButton} onPress={handleSetCover}>
                                        <Text style={styles.setCoverButtonText}>{t('beforeLive.cover')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* 底部操作按钮 */}
            <View style={styles.bottomActions}>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleBeauty} activeOpacity={0.7}>
                        <Image
                            source={require('../static/images/beauty.png')}
                            style={styles.actionIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.actionText}>{t('liveStreamAction.beauty')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleAudioEffect}
                        activeOpacity={0.7}>
                        <Image
                            source={require('../static/images/sound-effect.png')}
                            style={styles.actionIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.actionText}>{t('liveStreamAction.audioEffect')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={handleCamera} activeOpacity={0.7}>
                        <Image
                            source={require('../static/images/flip-b.png')}
                            style={styles.actionIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.actionText}>{t('liveStreamAction.flipCamera')}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.startLiveButton} onPress={handleStartLive} activeOpacity={0.8}>
                    <Text style={styles.startLiveText}>{t('beforeLive.startLive')}</Text>
                </TouchableOpacity>
            </View>

            {/* 美颜面板 */}
            <BeautyPanel visible={isShowBeautyPanel} liveID={liveID} onClose={() => setIsShowBeautyPanel(false)} />

            {/* 音效面板 */}
            <AudioEffectPanel
                visible={isShowAudioEffect}
                liveID={liveID}
                onClose={() => setIsShowAudioEffect(false)}
            />

            {/* 模式选择弹窗 */}
            <ActionSheet
                visible={isShowModeSheet}
                itemList={[t('beforeLive.public'), t('beforeLive.private')]}
                showCancel={false}
                onSelect={handleModeSheetSelect}
                onCancel={() => setIsShowModeSheet(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    liveInfoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 12,
        margin: 24,
        marginTop: 140,
        padding: 8,
    },
    coverSection: {
        position: 'relative',
    },
    coverImage: {
        width: 70,
        height: 94,
        borderRadius: 12,
    },
    coverOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        paddingVertical: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverOverlayText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '400',
    },
    infoSection: {
        flex: 1,
        marginLeft: 12,
        paddingTop: 10,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
    },
    liveTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 0,
    },
    editIconContainer: {
        width: 40,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIcon: {
        width: 16,
        height: 16,
        marginLeft: 4,
    },
    underline: {
        height: StyleSheet.hairlineWidth || 1,
        backgroundColor: '#fff',
        opacity: 0.2,
        marginTop: 5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
    },
    infoIcon: {
        width: 16,
        height: 16,
    },
    arrowIcon: {
        width: 14,
        height: 14,
        marginLeft: 'auto',
    },
    liveDetail: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '400',
        marginLeft: 5,
    },
    bottomDrawerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    bottomDrawer: {
        backgroundColor: 'rgba(34, 38, 46, 1)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 20,
        maxHeight: '70%',
    },
    listTitleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    listTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    coverListContent: {
        paddingHorizontal: 7.5,
        paddingBottom: 100,
        alignItems: 'center',
    },
    coverDialogItem: {
        width: (SCREEN_WIDTH - 60) / 3 - 10,
        height: ((SCREEN_WIDTH - 60) / 3 - 10) * 1.15,
        borderRadius: 12,
        marginBottom: 16,
        marginRight: 10,
        overflow: 'hidden',
        backgroundColor: '#23242a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverDialogImg: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    coverDialogImgSelected: {
        borderWidth: 3,
        borderColor: '#238CFE',
    },
    coverDialogFooter: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
    },
    setCoverButton: {
        backgroundColor: '#0468FC',
        borderRadius: 25,
        paddingVertical: 12.5,
        paddingHorizontal: 40,
    },
    setCoverButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    bottomActions: {
        position: 'absolute',
        bottom: 25,
        left: 0,
        right: 0,
        paddingHorizontal: 50,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 32,
    },
    actionButton: {
        alignItems: 'center',
    },
    actionIcon: {
        width: 40,
        height: 40,
        marginBottom: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#FFFFFF',
    },
    startLiveButton: {
        height: 50,
        backgroundColor: '#2B65FB',
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startLiveText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

