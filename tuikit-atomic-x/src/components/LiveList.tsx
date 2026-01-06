/**
 * LiveList Component
 * 直播列表组件，支持搜索、过滤、分页加载
 *
 * @format
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from './CustomToast';
import { useLiveListState } from '../atomic-x/state/LiveListState';
import type { LiveInfoParam } from '../atomic-x/state/LiveListState/types';
import { DEFAULT_COVER_URL, DEFAULT_AVATAR_URL } from './constants';

interface LiveListProps {
  onJoinSuccess?: (roomId: string) => void;
  /** 是否处理顶部安全区域（默认 true），如果父组件已处理顶部安全区域，可设置为 false */
  handleTopSafeArea?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = 16; // 容器左右内边距
const CARD_GAP = 8; // 卡片之间的间距
const CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - CARD_GAP) / 2; // 屏幕宽度 - 左右padding - 卡片间距
const CARD_HEIGHT = CARD_WIDTH * 1.4; // 卡片高度，保持 1:1.4 的宽高比，更协调

/**
 * 格式化观看人数
 */
const formatViewerCount = (count?: number): string => {
  if (!count) return '0';
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  return count.toString();
};

/**
 * 直播状态条组件（静态显示）
 */
const LiveStatusBar: React.FC = () => {
  return (
    <View style={styles.liveBarContainer}>
      <View style={[styles.bar, styles.bar1]} />
      <View style={[styles.bar, styles.bar2]} />
      <View style={[styles.bar, styles.bar3]} />
    </View>
  );
};

/**
 * 直播卡片组件
 */
const LiveCard: React.FC<{
  live: LiveInfoParam;
  onPress: (live: LiveInfoParam) => void;
  isJoining?: boolean;
}> = ({ live, onPress, isJoining = false }) => {
  const [coverError, setCoverError] = useState(false);

  const { t } = useTranslation();
  // 兼容多种字段名
  const coverURL = (live as any).coverURL || DEFAULT_COVER_URL;
  const liveOwner = (live as any).liveOwner;
  const avatarURL = liveOwner?.avatarURL || DEFAULT_AVATAR_URL;
  const userName = liveOwner?.userName || liveOwner?.userID || t('liveCard.unknownUser');
  const liveName = (live as any).liveName || t('liveCard.unknownRoom');
  const viewerCount = (live as any).totalViewerCount || 0;

  return (
    <TouchableOpacity
      style={[styles.liveCard, isJoining && styles.liveCardJoining]}
      onPress={() => onPress(live)}
      activeOpacity={0.8}
      disabled={isJoining}>
      {isJoining && (
        <View style={styles.joiningOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.joiningText}>{t('liveCard.joining')}</Text>
        </View>
      )}
      <View style={styles.liveCover}>
        <Image
          source={{ uri: coverError ? DEFAULT_COVER_URL : coverURL }}
          style={styles.coverImage}
          onError={() => setCoverError(true)}
          resizeMode="cover"
        />
        <View style={styles.liveStatus}>
          <LiveStatusBar />
          <Text style={styles.viewerCount}>{t('liveCard.viewerCount', { count: formatViewerCount(viewerCount) })}</Text>
        </View>
        <View style={styles.liveInfoOverlay}>
          <Text style={styles.liveTitle} numberOfLines={1}>
            {liveName}
          </Text>
          <View style={styles.liveOwner}>
            <Image
              source={{ uri: avatarURL }}
              style={styles.ownerAvatar}
              resizeMode="cover"
            />
            <Text style={styles.ownerName} numberOfLines={1}>
              {userName}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export function LiveList({ onJoinSuccess, handleTopSafeArea = true }: LiveListProps) {
  const { t } = useTranslation();
  const safeAreaInsets = useSafeAreaInsets();
  const { liveList, liveListCursor, joinLive, fetchLiveList } = useLiveListState();
  const [inputLiveId, setInputLiveId] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningLiveId, setJoiningLiveId] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  // 根据输入框的关键字过滤直播列表（前端过滤）
  const filteredLiveList = useMemo(() => {
    const keyword = inputLiveId.trim().toLowerCase();
    if (!keyword) return liveList;

    return liveList.filter((item) => {
      const id = (item?.liveID || '').toLowerCase();
      const name = ((item as any)?.liveName || '').toLowerCase();
      const liveOwner = (item as any)?.liveOwner;
      const ownerName = (liveOwner?.userName || liveOwner?.userID || '').toLowerCase();

      return id.includes(keyword) || name.includes(keyword) || ownerName.includes(keyword);
    });
  }, [inputLiveId, liveList]);

  // 将直播列表分组，每行两个元素
  const groupedLiveList = useMemo(() => {
    const groups: LiveInfoParam[][] = [];
    for (let i = 0; i < filteredLiveList.length; i += 2) {
      groups.push(filteredLiveList.slice(i, i + 2));
    }
    return groups;
  }, [filteredLiveList]);

  const hasNoResults = useMemo(() => {
    return !!inputLiveId.trim() && filteredLiveList.length === 0;
  }, [inputLiveId, filteredLiveList.length]);

  // 初始化加载列表
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchLiveList({ cursor: '', count: 20 });
    }
  }, [fetchLiveList]);

  // 统一的进入直播间处理函数
  const handleJoinLiveById = async (liveID: string) => {
    // 设置加载状态，提供即时反馈
    setJoiningLiveId(liveID);
    const startTime = Date.now();

    try {
      await joinLive({
        liveID,
        onSuccess: () => {
          const duration = Date.now() - startTime;
          console.log(`[LiveList] joinLive success, duration: ${duration}ms`);
          onJoinSuccess?.(liveID);
        },
        onError: (error: Error | string) => {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : error;
          console.error(`[LiveList] joinLive failed after ${duration}ms:`, errorMessage);
          showToast(`${t('toast.joinRoomFailed')}：${errorMessage || t('common.unknown')}`, 3000);
        },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[LiveList] joinLive exception after ${duration}ms:`, error);
      showToast(`${t('toast.joinRoomFailed')}：${error?.message || t('common.unknown')}`, 3000);
    } finally {
      // 延迟清除加载状态，确保用户能看到反馈
      setTimeout(() => {
        setJoiningLiveId(null);
      }, 300);
    }
  };

  // 点击卡片进入直播间
  const handleJoinLive = async (live: LiveInfoParam) => {
    await handleJoinLiveById(live.liveID);
  };

  // 通过输入框快速进入
  const handleInputSubmit = async () => {
    const trimmedLiveID = inputLiveId.trim();
    if (!trimmedLiveID) {
      showToast(t('liveList.enterLiveId'), 2000);
      return;
    }
    await handleJoinLiveById(trimmedLiveID);
  };

  // 下拉刷新
  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveList({
      cursor: '',
      count: 20,
      onSuccess: () => {
        setIsRefreshing(false);
        showToast(t('toast.refreshSuccess'), 2000);
      },
      onError: () => {
        setIsRefreshing(false);
        showToast(t('toast.refreshFailed'), 3000);
      },
    });
  };

  // 加载更多
  const loadMore = async () => {
    if (!liveListCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    await fetchLiveList({
      cursor: liveListCursor,
      count: 20,
      onSuccess: () => {
        setIsLoadingMore(false);
      },
      onError: () => {
        setIsLoadingMore(false);
        showToast(t('toast.noMore'), 2000);
      },
    });
  };

  const renderRow = ({ item: row }: { item: LiveInfoParam[] }) => (
    <View style={styles.liveRow}>
      {row.map((live, index) => (
        <View
          key={`${live.liveID}-${index}`}
          style={index === 0 && row.length === 2 ? styles.cardWithRightMargin : undefined}>
          <LiveCard
            live={live}
            onPress={handleJoinLive}
            isJoining={joiningLiveId === live.liveID}
          />
        </View>
      ))}
      {row.length === 1 && <View style={styles.liveCardPlaceholder} />}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: handleTopSafeArea ? safeAreaInsets.top : 0,
          paddingBottom: safeAreaInsets.bottom,
          paddingLeft: safeAreaInsets.left,
          paddingRight: safeAreaInsets.right,
        },
      ]}>
      {/* 搜索输入框 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('liveList.searchPlaceholder')}
          placeholderTextColor="#999"
          value={inputLiveId}
          onChangeText={setInputLiveId}
          onSubmitEditing={handleInputSubmit}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={64}
          {...(Platform.OS === 'android' && { textAlignVertical: 'center' as const })}
        />
      </View>

      {/* 直播列表 */}
      {!hasNoResults && (
        <FlatList
          data={groupedLiveList}
          renderItem={renderRow}
          keyExtractor={(item, index) => `row-${index}-${item[0]?.liveID || 'empty'}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          // ListEmptyComponent={
          //   liveList.length === 0 && !isRefreshing ? (
          //     <View style={styles.emptyContainer}>
          //       <Text style={styles.emptyText}>暂无直播</Text>
          //     </View>
          //   ) : undefined
          // }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.loadingMoreText}>{t('liveList.loading')}</Text>
              </View>
            ) : undefined
          }
        />
      )}

      {/* 无匹配结果提示 */}
      {hasNoResults && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('liveList.noLiveRooms')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 0 : 8,
    fontSize: 14,
    lineHeight: Platform.OS === 'ios' ? 20 : undefined,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingHorizontal: CONTAINER_PADDING,
  },
  liveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  liveCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveCardJoining: {
    opacity: 0.7,
  },
  joiningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joiningText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  liveCardPlaceholder: {
    width: CARD_WIDTH,
  },
  cardWithRightMargin: {
    marginRight: CARD_GAP,
  },
  liveCover: {
    position: 'relative',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  coverImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT * 0.75,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  liveStatus: {
    position: 'absolute',
    top: 12,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBarContainer: {
    width: 8,
    height: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: 4,
  },
  bar: {
    width: 2,
    backgroundColor: '#5AD69E',
    marginRight: 1,
  },
  bar1: {
    height: 7,
  },
  bar2: {
    height: 12,
  },
  bar3: {
    height: 5,
  },
  viewerCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  liveInfoOverlay: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    padding: 10,
    width: CARD_WIDTH,
    backgroundColor: 'rgba(240, 242, 247, 1)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  liveTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.9)',
    marginBottom: 6,
  },
  liveOwner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  ownerName: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.6)',
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
  },
  loadingMore: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
  },
});
