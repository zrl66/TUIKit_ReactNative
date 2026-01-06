/**
 * AudioEffectPanel Component
 * 音效面板组件
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    ScrollView,
    Switch,
    Image,
    StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioEffectState } from '../atomic-x/state/AudioEffectState';
import type { AudioChangerTypeParam, AudioReverbTypeParam } from '../atomic-x/state/AudioEffectState/types';

interface AudioEffectPanelProps {
    visible: boolean;
    liveID: string;
    onClose?: () => void;
}

interface VoiceEffect {
    key: AudioChangerTypeParam;
    name: string;
    icon: any;
}

interface ReverbEffect {
    key: AudioReverbTypeParam;
    name: string;
    icon: any;
}

const VOICE_EFFECTS: VoiceEffect[] = [
    { key: 'NONE', name: 'voiceOriginal', icon: require('../static/images/no-effect.png') },
    { key: 'CHILD', name: 'voiceChild', icon: require('../static/images/voice-wild.png') },
    { key: 'LITTLE_GIRL', name: 'voiceLoli', icon: require('../static/images/voice-loli.png') },
    { key: 'MAN', name: 'voiceUncle', icon: require('../static/images/voice-uncle.png') },
    { key: 'ETHEREAL', name: 'voiceEthereal', icon: require('../static/images/voice-ghost.png') },
];

const REVERB_EFFECTS: ReverbEffect[] = [
    { key: 'NONE', name: 'reverbNone', icon: require('../static/images/no-effect.png') },
    { key: 'KTV', name: 'reverbKTV', icon: require('../static/images/reverb-ktv.png') },
    { key: 'METALLIC', name: 'reverbMetal', icon: require('../static/images/reverb-metal.png') },
    { key: 'DEEP', name: 'reverbLowDeep', icon: require('../static/images/reverb-bass.png') },
    { key: 'LOUD', name: 'reverbLoud', icon: require('../static/images/reverb-bright.png') },
];

export function AudioEffectPanel({ visible, liveID, onClose }: AudioEffectPanelProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();
    const {
        audioChangerType,
        audioReverbType,
        isEarMonitorOpened,
        earMonitorVolume,
        setAudioChangerType,
        setAudioReverbType,
        setVoiceEarMonitorEnable,
        setVoiceEarMonitorVolume,
    } = useAudioEffectState(liveID);

    // 本地状态用于 UI 显示
    // 关键修复：从全局状态初始化本地状态，确保持久化的值能正确显示
    const [localEarMonitor, setLocalEarMonitor] = useState(isEarMonitorOpened);
    const [localMusicVolume, setLocalMusicVolume] = useState(earMonitorVolume);
    const [localChangerType, setLocalChangerType] = useState<AudioChangerTypeParam>(audioChangerType);
    const [localReverbType, setLocalReverbType] = useState<AudioReverbTypeParam>(audioReverbType);

    // 同步状态数据到 UI
    // 关键修复：每次面板打开时，都应该从全局状态同步到本地 UI 状态
    // 因为本地状态是组件级别的，每次组件重新挂载都会重置，而全局状态是持久化的
    // 这样可以确保开播前设置的值在开播后能正确显示
    // 同时，面板打开期间也要监听全局状态变化，确保状态实时同步
    useEffect(() => {
        if (visible) {
            // 面板打开时，始终从全局状态同步到本地 UI 状态
            // 确保即使组件在全局状态更新之前挂载，也能正确显示最新值
            setLocalEarMonitor(isEarMonitorOpened);
            setLocalMusicVolume(earMonitorVolume);
            setLocalChangerType(audioChangerType);
            setLocalReverbType(audioReverbType);
        }
    }, [visible, isEarMonitorOpened, earMonitorVolume, audioChangerType, audioReverbType]);

    // 处理耳返开关变化
    const handleEarMonitorChange = (value: boolean) => {
        setLocalEarMonitor(value);
        setVoiceEarMonitorEnable({
            enable: value,
            onSuccess: () => {
                console.log('设置耳返开关成功');
            },
            onError: (error) => {
                console.error('设置耳返开关失败:', error);
                // 恢复原状态
                setLocalEarMonitor(!value);
            },
        });
    };

    // 处理音量变化
    const handleMusicVolumeChange = (volume: number) => {
        setLocalMusicVolume(volume);
        setVoiceEarMonitorVolume({
            volume: volume,
            onSuccess: () => {
                console.log('设置耳返音量成功');
            },
            onError: (error) => {
                console.error('设置耳返音量失败:', error);
            },
        });
    };

    // 减少音量
    const decreaseMusicVolume = () => {
        const newValue = Math.max(0, localMusicVolume - 10);
        handleMusicVolumeChange(newValue);
    };

    // 增加音量
    const increaseMusicVolume = () => {
        const newValue = Math.min(100, localMusicVolume + 10);
        handleMusicVolumeChange(newValue);
    };

    // 处理变声效果选择
    const handleEffectChange = (effect: AudioChangerTypeParam) => {
        // 先更新本地状态，提供即时 UI 反馈
        setLocalChangerType(effect);
        setAudioChangerType({
            changerType: effect,
            onSuccess: () => {
                console.log('设置变声效果成功');
            },
            onError: (error) => {
                console.error('设置变声效果失败:', error);
                // 失败时恢复原状态
                setLocalChangerType(audioChangerType);
            },
        });
    };

    // 处理混响效果选择
    const handleReverbChange = (reverb: AudioReverbTypeParam) => {
        // 先更新本地状态，提供即时 UI 反馈
        setLocalReverbType(reverb);
        setAudioReverbType({
            reverbType: reverb,
            onSuccess: () => {
                console.log('设置混响效果成功');
            },
            onError: (error) => {
                console.error('设置混响效果失败:', error);
                // 失败时恢复原状态
                setLocalReverbType(audioReverbType);
            },
        });
    };

    if (!visible) {
        return null;
    }

    const progressWidth = (localMusicVolume / 100) * 200; // 200px 对应 400rpx

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
                        },
                    ]}>
                    {/* 头部 */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('audioEffect.title')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>{t('common.complete')}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}>
                        {/* 耳返开关 */}
                        <View style={styles.settingItem}>
                            <Text style={styles.settingLabel}>{t('audioEffect.earReturn')}</Text>
                            <Switch
                                value={localEarMonitor}
                                onValueChange={handleEarMonitorChange}
                                trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: '#2B65FB' }}
                                thumbColor="#FFFFFF"
                            />
                        </View>

                        {/* 音频设置 */}
                        <View style={styles.volumeSettings}>
                            <Text style={styles.sectionTitle}>{t('settings.audio')}</Text>
                            <View style={styles.sliderItem}>
                                <Text style={styles.sliderLabel}>{t('audioEffect.earReturnVolume')}</Text>
                                <View style={styles.customSlider}>
                                    {/* 减号按钮 */}
                                    <TouchableOpacity
                                        style={styles.minusBtn}
                                        onPress={decreaseMusicVolume}
                                        activeOpacity={0.7}>
                                        <Text style={styles.btnText} allowFontScaling={false}>-</Text>
                                    </TouchableOpacity>

                                    {/* 进度条区域 */}
                                    <View style={styles.progressSection}>
                                        <View style={styles.progressBar}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    { width: progressWidth },
                                                ]}
                                            />
                                        </View>
                                        {/* 当前数值显示 */}
                                        <Text style={styles.currentValue}>{localMusicVolume}</Text>
                                    </View>

                                    {/* 加号按钮 */}
                                    <TouchableOpacity
                                        style={styles.plusBtn}
                                        onPress={increaseMusicVolume}
                                        activeOpacity={0.7}>
                                        <Text style={styles.btnText} allowFontScaling={false}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* 变声效果 */}
                        <View style={styles.voiceEffects}>
                            <Text style={styles.sectionTitle}>{t('audioEffect.voiceChange')}</Text>
                            <View style={styles.effectsGrid}>
                                {VOICE_EFFECTS.map((effect) => (
                                    <TouchableOpacity
                                        key={effect.key}
                                        style={styles.effectItem}
                                        onPress={() => handleEffectChange(effect.key)}
                                        activeOpacity={0.7}>
                                        <View
                                            style={[
                                                styles.effectIconContainer,
                                                localChangerType === effect.key && styles.effectActive,
                                            ]}>
                                            <Image source={effect.icon} style={styles.effectIcon} resizeMode="contain" />
                                        </View>
                                        <Text style={styles.effectName}>{t(`audioEffect.${effect.name}`)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* 混响效果 */}
                        <View style={styles.reverbEffects}>
                            <Text style={styles.sectionTitle}>{t('audioEffect.reverb')}</Text>
                            <View style={styles.effectsGrid}>
                                {REVERB_EFFECTS.map((effect) => (
                                    <TouchableOpacity
                                        key={effect.key}
                                        style={styles.effectItem}
                                        onPress={() => handleReverbChange(effect.key)}
                                        activeOpacity={0.7}>
                                        <View
                                            style={[
                                                styles.effectIconContainer,
                                                localReverbType === effect.key && styles.effectActive,
                                            ]}>
                                            <Image source={effect.icon} style={styles.effectIcon} resizeMode="contain" />
                                        </View>
                                        <Text style={styles.effectName}>{t(`audioEffect.${effect.name}`)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
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
        paddingHorizontal: 16,
        paddingTop: 16,
        maxHeight: '80%',
        minHeight: 400,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: 0,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    closeText: {
        fontSize: 16,
        color: '#2B65FB',
        fontWeight: '500',
    },
    content: {
        flexGrow: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 44,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 16,
    },
    settingLabel: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    volumeSettings: {
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 12,
    },
    sliderItem: {
        marginBottom: 12,
    },
    sliderLabel: {
        fontSize: 14,
        color: '#FFFFFF',
        marginBottom: 8,
    },
    customSlider: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    minusBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(43, 106, 214, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2b6ad6',
    },
    plusBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#2b6ad6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        lineHeight: 16,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    progressSection: {
        flex: 1,
        marginHorizontal: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    progressBar: {
        width: 200,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        marginRight: 8,
    },
    progressFill: {
        height: 4,
        backgroundColor: '#2b6ad6',
        borderRadius: 2,
    },
    currentValue: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '600',
        textAlign: 'center',
        minWidth: 30,
    },
    voiceEffects: {
        marginTop: 16,
    },
    reverbEffects: {
        marginTop: 16,
        marginBottom: 20,
    },
    effectsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    effectItem: {
        margin: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    effectIconContainer: {
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 6,
    },
    effectActive: {
        backgroundColor: 'rgba(43, 101, 251, 0.2)',
        borderWidth: 2,
        borderColor: '#2B65FB',
    },
    effectIcon: {
        width: 24,
        height: 24,
    },
    effectName: {
        fontSize: 12,
        color: '#FFFFFF',
        textAlign: 'center',
    },
});

