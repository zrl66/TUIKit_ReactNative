import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-native-tuikit-atomic-x';


interface LivePageProps {
    onJumpToList: () => void;
    onBack?: () => void;
}

const screenWidth = Dimensions.get('window').width;
const rpxToPx = (rpx: number) => (rpx * screenWidth) / 750;



export function LivePage({ onJumpToList, onBack }: LivePageProps) {
    const { t } = useTranslation();
    const safeAreaInsets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: safeAreaInsets.top + 50,
                    paddingBottom: safeAreaInsets.bottom,
                    paddingLeft: safeAreaInsets.left,
                    paddingRight: safeAreaInsets.right,
                },
            ]}>
            {onBack && (
                <TouchableOpacity
                    style={[styles.backButton, { top: safeAreaInsets.top }]}
                    onPress={onBack}
                    activeOpacity={0.7}>
                    <Image
                        source={require('react-native-tuikit-atomic-x/src/static/images/live-home.png')}
                        style={styles.backIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            )}
            <Text style={[styles.headerTitle, { top: safeAreaInsets.top + 13 }]}>{t('liveList.title')}</Text>

            <TouchableOpacity
                style={styles.videoCard}
                onPress={onJumpToList}
                activeOpacity={0.8}>
                <View style={styles.imageWrapper}>
                    <Image
                        source={require('react-native-tuikit-atomic-x/src/static/images/live-mask.png')}
                        style={styles.videoMask}
                        resizeMode="stretch"
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{t('liveList.title')}</Text>
                    <Text style={[styles.description, styles.descriptionFirst]}>{t('livePage.description1')}</Text>
                    <Text style={[styles.description, styles.descriptionSecond]}>{t('livePage.description2')}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: screenWidth * 0.05 - 10,
        zIndex: 10,
        padding: 10,
    },
    backIcon: {
        width: 44,
        height: 33,
    },
    headerTitle: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 400,
        color: 'rgba(0, 0, 0, 1)',
        zIndex: 5,
    },
    videoCard: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    imageWrapper: {
        paddingTop: rpxToPx(20),
    },
    videoMask: {
        width: screenWidth * 0.9,
        height: rpxToPx(360),
    },
    textContainer: {
        position: 'absolute',
        left: rpxToPx(40),
        top: rpxToPx(60),
        right: rpxToPx(40),
        flexDirection: 'column',
    },
    title: {
        color: 'rgba(255, 255, 255, 1)',
        fontSize: rpxToPx(40),
        fontWeight: '700',
    },
    description: {
        color: 'rgba(255, 255, 255, 1)',
        fontSize: rpxToPx(20),
        fontWeight: '400',
        flexWrap: 'wrap',
        maxWidth: rpxToPx(350),
    },
    descriptionFirst: {
        paddingTop: rpxToPx(20),
    },
    descriptionSecond: {
        paddingTop: rpxToPx(6),
    },
});
