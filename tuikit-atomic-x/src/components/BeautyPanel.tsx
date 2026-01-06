/**
 * BeautyPanel Component
 * 美颜面板组件
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Image,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBaseBeautyState } from '../atomic-x/state/BaseBeautyState';

interface BeautyPanelProps {
  visible: boolean;
  liveID: string;
  onClose?: () => void;
}

interface BeautyOption {
  name: string;
  icon: any;
  type: 'close' | 'whiteness' | 'smooth' | 'ruddy';
}

const beautyOptions: BeautyOption[] = [
  { name: 'close', icon: require('../static/images/beauty-close.png'), type: 'close' },
  { name: 'whitening', icon: require('../static/images/whiteness.png'), type: 'whiteness' },
  { name: 'smooth', icon: require('../static/images/smooth.png'), type: 'smooth' },
  { name: 'ruddy', icon: require('../static/images/live-ruddy.png'), type: 'ruddy' },
];

export function BeautyPanel({ visible, liveID, onClose }: BeautyPanelProps) {
  const { t } = useTranslation();
  const safeAreaInsets = useSafeAreaInsets();
  const {
    smoothLevel,
    whitenessLevel,
    ruddyLevel,
    setSmoothLevel,
    setWhitenessLevel,
    setRuddyLevel,
  } = useBaseBeautyState(liveID);

  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);



  // 获取当前选项名称
  const currentOptionName = beautyOptions[selectedOptionIndex]?.name || 'close';

  // 获取当前选项对应的值（直接使用底层 0-9 范围）
  const currentValue = (): number => {
    switch (currentOptionName) {
      case 'whitening':
        return whitenessLevel;
      case 'ruddy':
        return ruddyLevel;
      case 'smooth':
        return smoothLevel;
      case 'close':
      default:
        return 0;
    }
  };

  // 仅在面板打开时，根据当前激活的美颜效果自动选中对应的选项
  // 不监听美颜值的变化，避免用户操作时被强制切换选项
  useEffect(() => {
    if (!visible) {
      return;
    }

    // 根据当前激活的美颜效果，自动选中对应的选项
    // 优先级：美白 > 红润 > 磨皮 > 关闭
    if (whitenessLevel > 0) {
      const index = beautyOptions.findIndex(opt => opt.type === 'whiteness');
      if (index !== -1) {
        setSelectedOptionIndex(index);
      }
    } else if (ruddyLevel > 0) {
      const index = beautyOptions.findIndex(opt => opt.type === 'ruddy');
      if (index !== -1) {
        setSelectedOptionIndex(index);
      }
    } else if (smoothLevel > 0) {
      const index = beautyOptions.findIndex(opt => opt.type === 'smooth');
      if (index !== -1) {
        setSelectedOptionIndex(index);
      }
    } else {
      // 所有美颜效果都关闭，选中"关闭"选项
      const index = beautyOptions.findIndex(opt => opt.type === 'close');
      if (index !== -1) {
        setSelectedOptionIndex(index);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]); // 仅监听 visible，不监听美颜值变化


  // 减少数值（步长为 1，范围 0-9）
  const decreaseValue = () => {
    const newValue = Math.max(0, currentValue() - 1);
    updateBeautyValue(newValue);
  };

  // 增加数值（步长为 1，范围 0-9）
  const increaseValue = () => {
    const newValue = Math.min(9, currentValue() + 1);
    updateBeautyValue(newValue);
  };

  // 更新美颜数值（直接使用 0-9 范围，无需转换）
  const updateBeautyValue = (value: number) => {
    const currentOption = beautyOptions[selectedOptionIndex];

    if (!currentOption || currentOption.type === 'close') {
      return;
    }

    // 调用对应的设置方法，直接传入值（0-9）
    switch (currentOption.type) {
      case 'whiteness':
        setWhitenessLevel({
          whitenessLevel: value,
          onSuccess: () => { },
          onError: (error) => {
            console.error('设置美白失败:', error);
          },
        });
        break;
      case 'ruddy':
        setRuddyLevel({
          ruddyLevel: value,
          onSuccess: () => { },
          onError: (error) => {
            console.error('设置红润失败:', error);
          },
        });
        break;
      case 'smooth':
        setSmoothLevel({
          smoothLevel: value,
          onSuccess: () => { },
          onError: (error) => {
            console.error('设置磨皮失败:', error);
          },
        });
        break;
    }
  };

  // 选择选项
  const selectOption = (index: number) => {
    const currentOption = beautyOptions[index];

    // 如果选择"关闭"，重置所有美颜效果
    if (currentOption && currentOption.type === 'close') {
      // 重置所有美颜参数为 0
      setSmoothLevel({
        smoothLevel: 0,
        onSuccess: () => { },
        onError: (error) => {
          console.error('重置磨皮失败:', error);
        },
      });
      setWhitenessLevel({
        whitenessLevel: 0,
        onSuccess: () => { },
        onError: (error) => {
          console.error('重置美白失败:', error);
        },
      });
      setRuddyLevel({
        ruddyLevel: 0,
        onSuccess: () => { },
        onError: (error) => {
          console.error('重置红润失败:', error);
        },
      });
    }

    setSelectedOptionIndex(index);
  };

  if (!visible) {
    return null;
  }

  // 进度条宽度：值范围 0-9，进度条最大宽度 200px
  const progressWidth = (currentValue() / 9) * 200;

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
          {/* 滑块区域 */}
          {currentOptionName !== 'close' && (
            <View style={styles.sliderSection}>
              <View style={styles.controlContainer}>
                <View style={styles.customSlider}>
                  {/* 减号按钮 */}
                  <TouchableOpacity
                    style={styles.minusBtn}
                    onPress={decreaseValue}
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
                    {/* 当前数值显示（0-9）*/}
                    <Text style={styles.currentValue}>{currentValue()}</Text>
                  </View>

                  {/* 加号按钮 */}
                  <TouchableOpacity
                    style={styles.plusBtn}
                    onPress={increaseValue}
                    activeOpacity={0.7}>
                    <Text style={styles.btnText} allowFontScaling={false}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 详细选项区域 */}
          <View style={styles.optionsSection}>
            <View style={styles.optionsGrid}>
              {beautyOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionItem,
                    selectedOptionIndex === index && styles.optionItemSelected,
                  ]}
                  onPress={() => selectOption(index)}
                  activeOpacity={0.7}>
                  <View style={styles.optionIconContainer}>
                    <Image source={option.icon} style={styles.optionIcon} resizeMode="contain" />
                  </View>
                  <Text style={styles.optionName}>{t(`beauty.${option.name}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  },
  sliderSection: {
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(34, 38, 46, 1)',
  },
  controlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  optionsSection: {
    backgroundColor: 'rgba(34, 38, 46, 1)',
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  optionItem: {
    width: 60,
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemSelected: {
    borderColor: '#2b6ad6',
    backgroundColor: 'rgba(43, 106, 214, 0.2)',
  },
  optionIconContainer: {
    width: 30,
    height: 30,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIcon: {
    width: 30,
    height: 30,
  },
  optionName: {
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
  },
});
