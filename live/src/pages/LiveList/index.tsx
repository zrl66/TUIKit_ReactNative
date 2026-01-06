import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation, LiveList } from 'react-native-tuikit-atomic-x';

export interface LiveListPageProps {
  onBack?: () => void;
  onJoinSuccess?: (liveID: string) => void;
  onCreateLive?: () => void;
}

export function LiveListPage({ onBack, onJoinSuccess, onCreateLive }: LiveListPageProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const { t } = useTranslation();

  const handleCreateLive = () => {
    onCreateLive?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom,
        },
      ]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}>
          <Image
            source={require('react-native-tuikit-atomic-x/src/static/images/back-black.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{t('LiveListPage.title')}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <LiveList onJoinSuccess={onJoinSuccess} handleTopSafeArea={false} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateLive}
          activeOpacity={0.8}>
          <Image
            source={require('react-native-tuikit-atomic-x/src/static/images/create-live.png')}
            style={styles.createIcon}
            resizeMode="contain"
          />
          <Text style={styles.createButtonText}>{t('LiveListPage.create')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
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
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(0, 0, 0, 1)',
  },
  content: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    backgroundColor: '#0468FC',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12.5,
    paddingHorizontal: 30,
  },
  createIcon: {
    width: 18,
    height: 18,
    marginRight: 5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});