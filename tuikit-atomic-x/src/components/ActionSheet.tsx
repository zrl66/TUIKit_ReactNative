/**
 * ActionSheet Component
 * 底部操作选择器组件
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ActionSheetProps {
  visible: boolean;
  itemList: string[];
  showCancel?: boolean;
  onSelect?: (index: number) => void;
  onCancel?: () => void;
}

export function ActionSheet({
  visible,
  itemList,
  showCancel = true,
  onSelect,
  onCancel,
}: ActionSheetProps) {
  const { t } = useTranslation();
  const safeAreaInsets = useSafeAreaInsets();

  const handleSelect = (index: number) => {
    onSelect?.(index);
  };

  const handleCancel = () => {
    onCancel?.();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                {
                  paddingBottom: safeAreaInsets.bottom,
                },
              ]}>
              {itemList.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.item,
                    index === itemList.length - 1 && !showCancel && styles.lastItem,
                  ]}
                  onPress={() => handleSelect(index)}
                  activeOpacity={0.7}>
                  <Text style={styles.itemText}>{item}</Text>
                </TouchableOpacity>
              ))}
              {showCancel && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.7}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  item: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});

