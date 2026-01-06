/**
 * GiftPicker Component
 * 礼物选择器组件
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Image,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGiftState } from '../atomic-x/state/GiftState';
import type { GiftParam } from '../atomic-x/state/GiftState/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GiftPickerProps {
  visible: boolean;
  liveID: string;
  onClose?: () => void;
  onGiftSelect?: (gift: GiftParam) => void;
  onRecharge?: () => void;
}

const ITEMS_PER_PAGE = 8; // 每页显示8个礼物（2行 x 4列）

export function GiftPicker({
  visible,
  liveID,
  onClose,
  onGiftSelect,
}: GiftPickerProps) {
  const { t } = useTranslation();
  const safeAreaInsets = useSafeAreaInsets();
  const { usableGifts, refreshUsableGifts } = useGiftState(liveID);

  const [selectedGiftIndex, setSelectedGiftIndex] = useState(-1);
  const [currentPage, setCurrentPage] = useState(0);

  // 扁平化礼物列表（兼容新的分类结构与旧的扁平结构）
  const flattenedGifts = useMemo(() => {
    if (!Array.isArray(usableGifts) || usableGifts.length === 0) {
      return [];
    }

    // 新结构：[{ categoryID, name, giftList: [...] }, ...]
    if (usableGifts[0] && Array.isArray(usableGifts[0].giftList)) {
      const merged: GiftParam[] = [];
      usableGifts.forEach((category) => {
        const gifts = category.giftList || [];
        merged.push(...gifts);
      });
      return merged;
    }

    // 旧结构：直接为礼物数组
    return usableGifts as unknown as GiftParam[];
  }, [usableGifts]);

  // 分页数据
  const giftPages = useMemo(() => {
    const pages: GiftParam[][] = [];
    for (let i = 0; i < flattenedGifts.length; i += ITEMS_PER_PAGE) {
      pages.push(flattenedGifts.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [flattenedGifts]);

  // 面板打开时刷新礼物列表
  useEffect(() => {
    if (visible && liveID) {
      refreshUsableGifts({
        liveID,
        onSuccess: () => {
          console.log('礼物列表刷新成功');
        },
        onError: (error) => {
          console.error('礼物列表刷新失败:', error);
        },
      });
    }
  }, [visible, liveID, refreshUsableGifts]);

  // 面板关闭时重置选择
  useEffect(() => {
    if (!visible) {
      setSelectedGiftIndex(-1);
      setCurrentPage(0);
    }
  }, [visible]);

  // 选择礼物
  const selectGift = useCallback((index: number) => {
    setSelectedGiftIndex(index);
  }, []);

  // 发送礼物
  const handleSendGift = useCallback(
    (index: number) => {
      if (selectedGiftIndex !== index) return;

      const gift = flattenedGifts[index];
      if (!gift) return;

      onGiftSelect?.(gift);
      setSelectedGiftIndex(-1);
    },
    [selectedGiftIndex, flattenedGifts, onGiftSelect]
  );

  // 处理页面变化
  const handlePageChange = useCallback((index: number) => {
    setCurrentPage(index);
  }, []);

  // 渲染单个礼物项
  const renderGiftItem = useCallback(
    (gift: GiftParam, index: number, pageIndex: number) => {
      const globalIndex = pageIndex * ITEMS_PER_PAGE + index;
      const isSelected = selectedGiftIndex === globalIndex;

      return (
        <TouchableOpacity
          key={gift.giftID || index}
          style={[styles.giftItem, isSelected && styles.giftItemSelected]}
          onPress={() => selectGift(globalIndex)}
          activeOpacity={0.7}>
          {/* 礼物图片 */}
          <View style={styles.giftImageContainer}>
            {gift.iconURL ? (
              <Image
                source={{ uri: gift.iconURL }}
                style={styles.giftImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.giftImagePlaceholder} />
            )}
          </View>

          {/* 选中时显示赠送按钮 */}
          {isSelected ? (
            <View style={styles.giftAction}>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => handleSendGift(globalIndex)}
                activeOpacity={0.7}>
                <Text style={styles.sendText}>{t('gift.send')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* 礼物名称 */}
              <Text style={styles.giftName} numberOfLines={1}>
                {gift.name || ''}
              </Text>
              {/* 礼物价格 */}
              <Text style={styles.giftPrice}>{gift.coins || 0}</Text>
            </>
          )}
        </TouchableOpacity>
      );
    },
    [selectedGiftIndex, selectGift, handleSendGift]
  );

  // 渲染单页礼物
  const renderPage = useCallback(
    ({ item: page, index: pageIndex }: { item: GiftParam[]; index: number }) => {
      const rows: GiftParam[][] = [];
      for (let i = 0; i < page.length; i += 4) {
        rows.push(page.slice(i, i + 4));
      }

      return (
        <View style={styles.giftPage}>
          <View style={styles.giftContainer}>
            {rows.map((row, rowIndex) => {
              const shouldCenter = row.length === 4;
              const startIndex = rowIndex * 4;
              return (
                <View
                  key={`row-${rowIndex}`}
                  style={[styles.giftRow, shouldCenter && styles.giftRowCenter]}>
                  {row.map((gift, colIndex) =>
                    renderGiftItem(gift, startIndex + colIndex, pageIndex)
                  )}
                </View>
              );
            })}
          </View>
        </View>
      );
    },
    [renderGiftItem]
  );

  // 渲染分页指示器
  const renderPageIndicator = useCallback(() => {
    if (giftPages.length <= 1) return null;

    return (
      <View style={styles.pageIndicatorContainer}>
        {giftPages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.pageIndicatorDot,
              currentPage === index && styles.pageIndicatorDotActive,
            ]}
          />
        ))}
      </View>
    );
  }, [giftPages, currentPage]);

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
          <View style={styles.giftHeader}>
            <View style={styles.headerContent}>
              <Text style={styles.giftTitle}>{t('gift.title')}</Text>
            </View>
          </View>

          {/* 礼物内容 */}
          {giftPages.length > 0 ? (
            <>
              <View style={styles.giftContent}>
                <FlatList
                  data={giftPages}
                  renderItem={renderPage}
                  keyExtractor={(_, index) => `page-${index}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const offsetX = event.nativeEvent.contentOffset.x;
                    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
                    handlePageChange(pageIndex);
                  }}
                  getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                  })}
                />
              </View>
              {renderPageIndicator()}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('gift.noGifts')}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  drawer: {
    backgroundColor: 'rgba(34, 38, 46, 1)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: 355, // 710rpx / 2 = 355px
  },
  giftHeader: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  giftContent: {
    flex: 1,
    paddingBottom: 0, // 分页指示器已移到外部，不需要 padding
  },
  giftPage: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  giftContainer: {
    paddingHorizontal: 10,
    flex: 1,
  },
  giftRow: {
    flexDirection: 'row',
    width: '100%',
  },
  giftRowCenter: {
    justifyContent: 'center',
  },
  giftItem: {
    width: 84, // 168rpx / 2 = 84px (4列布局)
    height: 115, // 230rpx / 2 = 115px
    marginBottom: 12,
    alignItems: 'center',
    borderRadius: 10,
    paddingTop: 5,
    paddingBottom: 3,
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  giftItemSelected: {
    borderColor: '#2B6AD6',
    backgroundColor: 'rgba(43, 106, 214, 0.12)',
  },
  giftImageContainer: {
    width: 55,
    height: 55,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftImage: {
    width: 55,
    height: 55,
  },
  giftImagePlaceholder: {
    width: 55,
    height: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 27.5,
  },
  giftAction: {
    height: 28,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 50,
    backgroundColor: '#2b6ad6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  giftName: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 75,
  },
  giftPrice: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 14,
    textAlign: 'center',
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 3,
  },
  pageIndicatorDotActive: {
    backgroundColor: '#2b6ad6',
    width: 16,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
