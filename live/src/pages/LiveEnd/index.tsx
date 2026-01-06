/**
 * LiveEnd Page
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-native-tuikit-atomic-x';

declare const global: {
    summaryData?: any;
    [key: string]: any;
};

export interface LiveEndPageProps {
    onBack?: () => void;
    liveID?: string;
    summaryData?: SummaryData;
}

interface SummaryData {
    totalDuration?: number;
    totalViewers?: number;
    totalMessageSent?: number;
    totalGiftCoins?: number;
    totalGiftUniqueSenders?: number;
    totalLikesReceived?: number;
    viewerCount?: number;
    likeCount?: number;
    giftCount?: number;
    duration?: number;
}

const formatDuration = (milliseconds?: number): string => {
    if (!milliseconds || milliseconds <= 0 || isNaN(milliseconds)) {
        return '00:00:00';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function LiveEndPage({ onBack, liveID: _liveID, summaryData: propsSummaryData }: LiveEndPageProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

    useEffect(() => {
        let sourceData = null;
        let dataSource = '';

        if (propsSummaryData && typeof propsSummaryData === 'object') {
            sourceData = propsSummaryData;
            dataSource = 'props';
        } else if (global.summaryData && typeof global.summaryData === 'object') {
            sourceData = global.summaryData;
            dataSource = 'global';
        }

        console.log(`使用${dataSource}数据:`, sourceData);

        const convertedData: SummaryData = {
            totalDuration: sourceData.totalDuration || sourceData.duration || 0,
            totalViewers: sourceData.totalViewers || sourceData.viewerCount || 0,
            totalMessageSent: sourceData.totalMessageSent || 0,
            totalGiftCoins: sourceData.totalGiftCoins || sourceData.giftCount || 0,
            totalGiftUniqueSenders: sourceData.totalGiftUniqueSenders || 0,
            totalLikesReceived: sourceData.totalLikesReceived || sourceData.likeCount || 0,
        };

        setSummaryData(convertedData);
    }, [propsSummaryData]);

    const formattedDuration = useMemo(() => {
        return formatDuration(summaryData?.totalDuration);
    }, [summaryData?.totalDuration]);

    const handleToLive = () => {
        onBack?.();
    };

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: safeAreaInsets.top,
                    paddingBottom: safeAreaInsets.bottom,
                    paddingLeft: safeAreaInsets.left,
                    paddingRight: safeAreaInsets.right,
                },
            ]}>
            <TouchableOpacity
                style={styles.backBtn}
                onPress={handleToLive}
                activeOpacity={0.7}>
                <Image
                    source={require('react-native-tuikit-atomic-x/src/static/images/close.png')}
                    style={styles.backBtnIcon}
                    resizeMode="contain"
                />
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.title}>{t('liveEnd.title')}</Text>
            </View>

            {summaryData && (
                <View style={styles.statsCard}>
                    <View style={styles.statsRow}>
                        <View style={styles.statsItem}>
                            <Text style={styles.statsValue}>{formattedDuration}</Text>
                            <Text style={styles.statsLabel}>{t('liveEnd.duration')}</Text>
                        </View>
                        <View style={styles.statsItem}>
                            <Text style={styles.statsValue}>
                                {summaryData.totalViewers || 0}
                            </Text>
                            <Text style={styles.statsLabel}>{t('liveEnd.totalViewers')}</Text>
                        </View>
                        <View style={styles.statsItem}>
                            <Text style={styles.statsValue}>
                                {summaryData.totalMessageSent || 0}
                            </Text>
                            <Text style={styles.statsLabel}>{t('liveEnd.messageCount')}</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statsItem}>
                            <Text style={styles.statsValue}>
                                {summaryData.totalGiftCoins || 0}
                            </Text>
                            <Text style={styles.statsLabel}>{t('liveEnd.giftIncome')}</Text>
                        </View>
                        <View style={styles.statsItem}>
                            <Text style={styles.statsValue}>
                                {summaryData.totalGiftUniqueSenders || 0}
                            </Text>
                            <Text style={styles.statsLabel}>{t('liveEnd.giftSenders')}</Text>
                        </View>
                        <View style={styles.statsItem}>
                            <Text style={styles.statsValue}>
                                {summaryData.totalLikesReceived || 0}
                            </Text>
                            <Text style={styles.statsLabel}>{t('liveEnd.likeCount')}</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(19, 20, 23, 1)',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
    },
    backBtn: {
        width: 24,
        height: 24,
        position: 'absolute',
        top: 50,
        right: 40,
        zIndex: 99,
    },
    backBtnIcon: {
        width: 24,
        height: 24,
        tintColor: '#ffffff',
    },
    header: {
        marginTop: 150,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsCard: {
        left: 0,
        right: 0,
        backgroundColor: 'rgba(43, 44, 48, 1)',
        borderRadius: 12,
        paddingVertical: 20,
        width: screenWidth * 0.93,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    statsRow: {
        width: screenWidth * 0.93,
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 12,
    },
    statsItem: {
        flex: 1,
        alignItems: 'center',
    },
    statsValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    statsLabel: {
        color: '#bdbdbd',
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center',
    },
});

