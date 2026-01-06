/**
 * Slider Component
 * 简单的滑块组件（React Native 0.82+ 兼容版本）
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';

interface SliderProps {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  onValueChange?: (value: number) => void;
  style?: any;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
}

export function Slider({
  value,
  minimumValue = 0,
  maximumValue = 1,
  onValueChange,
  style,
  minimumTrackTintColor = '#007AFF',
  maximumTrackTintColor = '#e0e0e0',
}: SliderProps) {
  const pan = useRef(new Animated.Value(0)).current;
  const sliderWidth = useRef(0);

  useEffect(() => {
    const range = maximumValue - minimumValue;
    const percentage = (value - minimumValue) / range;
    pan.setValue(percentage);
  }, [value, minimumValue, maximumValue, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        (pan as any).setOffset((pan as any)._value);
      },
      onPanResponderMove: (_, gestureState) => {
        const range = maximumValue - minimumValue;
        const newPercentage = Math.max(
          0,
          Math.min(1, (pan as any)._offset + gestureState.dx / sliderWidth.current)
        );
        pan.setValue(newPercentage);
        const newValue = minimumValue + newPercentage * range;
        onValueChange?.(Math.round(newValue));
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  const range = maximumValue - minimumValue;
  const percentage = (value - minimumValue) / range;

  return (
    <View
      style={[styles.container, style]}
      onLayout={(event) => {
        sliderWidth.current = event.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}>
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: minimumTrackTintColor,
              width: '100%',
            },
          ]}>
          <Animated.View
            style={[
              {
                backgroundColor: minimumTrackTintColor,
                height: 4,
                borderRadius: 2,
                width: pan.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <View style={styles.thumbContainer}>
          <Animated.View
            style={[
              {
                left: pan.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}>
            <View style={styles.thumb} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  thumbContainer: {
    position: 'absolute',
    top: -8,
    width: '100%',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    marginLeft: -10,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});

