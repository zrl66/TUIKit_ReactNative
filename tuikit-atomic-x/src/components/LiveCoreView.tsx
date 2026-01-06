/**
 * LiveCoreView Component
 * React Native 原生组件封装，用于显示 LiveCoreView
 * 
 * 包含：
 * 1. LiveCoreView - 原生组件封装
 * 2. LiveStreamView - 完整的直播流视图组件（包含贴图逻辑）
 *
 * @format
 */

import { useEffect, useMemo, useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  UIManager,
  findNodeHandle,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requireNativeComponent } from 'react-native';
import { useLiveSeatState } from '../atomic-x/state/LiveSeatState';
import { useLoginState } from '../atomic-x/state/LoginState';
import { useCoHostState } from '../atomic-x/state/CoHostState';
import { useCoGuestState } from '../atomic-x/state/CoGuestState';
import { useLiveListState } from '../atomic-x/state/LiveListState';
import type { SeatInfo } from '../atomic-x/state/LiveSeatState/types';
import { DEFAULT_AVATAR_URL } from './constants';
import { LiveStreamActionPanel } from './LiveStreamActionPanel';
import { DeviceStatusCode } from '../atomic-x/state/DeviceState/types';

// ==================== 原生组件封装 ====================

interface LiveCoreViewProps {
  liveId: string;
  coreViewType: 'playView' | 'pushView';
  round?: number;
  style?: ViewStyle;
}

type ImageSource = { uri: string } | number;

export interface LiveCoreViewRef {
  setLocalVideoMuteImage?: (
    bigImageSource: ImageSource,
    smallImageSource: ImageSource
  ) => void;
}

const LiveCoreViewNative = requireNativeComponent<LiveCoreViewProps>('LiveCoreView');

function imageSourceToUri(imageSource: ImageSource): string | null {
  try {
    const resolvedSource = Image.resolveAssetSource(imageSource);
    return resolvedSource?.uri || null;
  } catch (error) {
    console.error('[LiveCoreViewTS] imageSourceToUri: Failed to convert image source to URI', error);
    return null;
  }
}

export const LiveCoreView = forwardRef<LiveCoreViewRef, LiveCoreViewProps>(
  (props, ref) => {
    const { liveId, coreViewType, round, style } = props;
    const nativeRef = useRef<any>(null);

    const getCommands = useCallback(() => {
      const config = UIManager.getViewManagerConfig('LiveCoreView');
      return (config as any)?.Commands || {};
    }, []);

    const dispatchCommand = useCallback((commandName: string, args: any[] = []) => {
      const nodeHandle = findNodeHandle(nativeRef.current);
      if (!nodeHandle) {
        console.warn('[LiveCoreViewTS] dispatchCommand: nodeHandle is null, component may not be mounted');
        return;
      }
      const commands = getCommands();
      const commandId = commands[commandName];
      if (commandId === undefined) {
        console.error(
          `[LiveCoreViewTS] dispatchCommand: Command "${commandName}" not found. Available commands:`,
          Object.keys(commands)
        );
        return;
      }
      UIManager.dispatchViewManagerCommand(nodeHandle, commandId, args);
    }, [getCommands]);

    const setLocalVideoMuteImage = useCallback((
      bigImageSource: ImageSource,
      smallImageSource: ImageSource
    ) => {
      const bigImageUri = imageSourceToUri(bigImageSource);
      const smallImageUri = imageSourceToUri(smallImageSource);
      console.log(`[LiveStreamViewTS] setLocalVideoMuteImage, bigImageUri=${bigImageUri} smallImageUri=${smallImageUri}`);

      dispatchCommand('setLocalVideoMuteImage', [bigImageUri, smallImageUri]);
    }, [dispatchCommand]);

    useImperativeHandle(ref, () => ({
      setLocalVideoMuteImage,
    }), [setLocalVideoMuteImage]);

    return (
      <LiveCoreViewNative
        ref={nativeRef}
        liveId={liveId}
        coreViewType={coreViewType}
        round={round}
        style={style}
      />
    );
  }
);

LiveCoreView.displayName = 'LiveCoreView';

// ==================== LiveStreamView 组件 ====================

export interface LiveStreamViewProps {
  liveID: string;
  isAnchor?: boolean;
  templateLayout?: number;
  isLiving?: boolean;
  currentLoginUserId?: string;
  enableClickPanel?: boolean;
  onStreamViewClick?: (payload: any) => void;
  onPanelAction?: (actionKey: string, payload: any) => void;
  style?: ViewStyle;
}

export interface LiveStreamViewRef {
  setLocalVideoMuteImage?: (
    bigImageSource: ImageSource,
    smallImageSource: ImageSource
  ) => void;
}

/**
 * 计算缩放比例
 */
function calculateScale(
  originalWidth: number,
  originalHeight: number,
  displayWidth: number,
  displayHeight: number
): { scaleX: number; scaleY: number } {
  const scaleX = displayWidth / originalWidth;
  const scaleY = displayHeight / originalHeight;
  return { scaleX, scaleY };
}

/**
 * LiveStreamView 组件
 * 完整的直播流视图，包含贴图逻辑
 */
export const LiveStreamView = forwardRef<LiveStreamViewRef, LiveStreamViewProps>(
  ({
    liveID,
    isAnchor = true,
    templateLayout: _templateLayout = 600,
    isLiving = false,
    currentLoginUserId,
    enableClickPanel = false,
    onStreamViewClick,
    onPanelAction: _onPanelAction,
    style,
  }, ref) => {
  const safeAreaInsets = useSafeAreaInsets();
  // 使用整屏尺寸（包含系统导航栏高度），避免高度被 window 裁剪
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

  // 状态管理
  const { loginUserInfo } = useLoginState();
  const { seatList, canvas } = useLiveSeatState(liveID);
  const { connected: coHostConnected } = useCoHostState(liveID);
  const { connected: audienceConnected } = useCoGuestState(liveID);
  const { currentLive } = useLiveListState();

  // 从 currentLive 中获取 liveOwner
  const liveOwner = useMemo(() => {
    const owner = (currentLive as any)?.liveOwner as { userID?: string; userName?: string; avatarURL?: string } | undefined;
    console.log('[LiveStreamView] liveOwner from currentLive:', owner);
    return owner;
  }, [currentLive]);

  // 本地状态
  const [safeArea, setSafeArea] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: screenWidth,
    height: screenHeight,
  });
  const [streamViewHeight, setStreamViewHeight] = useState(1);
  const [scale, setScale] = useState({ scaleX: 1, scaleY: 1 });
  const [deviceWidthRatio, setDeviceWidthRatio] = useState(1);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [_panelUserInfo, setPanelUserInfo] = useState<any | undefined>(undefined);

  // 计算 bottomPanelHeight（iOS 和 Android 不同）
  const bottomPanelHeight = useMemo(() => {
    return Platform.OS === 'ios' ? 60 : 80;
  }, []);

  // 初始化 safeArea 和 streamViewHeight
  useEffect(() => {
    const safeAreaData = {
      left: safeAreaInsets.left,
      right: safeAreaInsets.right,
      top: safeAreaInsets.top,
      bottom: safeAreaInsets.bottom,
      width: screenWidth - safeAreaInsets.left - safeAreaInsets.right,
      height: screenHeight,
    };
    setSafeArea(safeAreaData);

    const standardWidth = 750;
    setDeviceWidthRatio(standardWidth / screenWidth);

    // 计算初始 streamViewHeight
    if (isAnchor) {
      setStreamViewHeight(safeAreaData.height - bottomPanelHeight);
    } else {
      setStreamViewHeight(screenHeight);
    }
  }, [safeAreaInsets, screenWidth, screenHeight, isAnchor, bottomPanelHeight]);

  // 监听 canvas 变化，更新缩放比例
  useEffect(() => {
    if (canvas?.w && canvas?.h) {
      // 计算缩放比例
      const displayWidth = safeArea.width;
      const displayHeight = safeArea.width * (canvas.h / canvas.w);
      const newScale = calculateScale(canvas.w, canvas.h, displayWidth, displayHeight);
      setScale(newScale);

      console.log(
        `[LiveStreamView] canvas changed: scale=${JSON.stringify(newScale)}, streamViewHeight=${streamViewHeight}`
      );
    }
  }, [canvas, safeArea.width, deviceWidthRatio, streamViewHeight]);

  // 监听 seatList 变化，更新 streamViewHeight
  useEffect(() => {
    if (seatList.length > 1 && canvas?.w && canvas?.h) {
      if (isAnchor) {
        setStreamViewHeight(safeArea.height - bottomPanelHeight);
      } else {
        setStreamViewHeight(screenHeight);
      }
      console.log(`[LiveStreamView] seatList changed, streamViewHeight=${streamViewHeight}`);
    }
  }, [seatList.length, canvas, isAnchor, safeArea.height, bottomPanelHeight, screenHeight, streamViewHeight]);

  // 观众模式：监听 audienceConnected 变化
  useEffect(() => {
    if (!isAnchor && audienceConnected.length === 1) {
      setStreamViewHeight(screenHeight);
      console.log(`[LiveStreamView] audienceConnected changed, streamViewHeight=${screenHeight}`);
    }
  }, [isAnchor, audienceConnected.length, screenHeight]);

  /**
   * 计算垂直位置
   * 在服务端计算的基础上，按屏幕高度比例整体下移一段距离
   */
  const calculateTopValue = useCallback(
    (participant: SeatInfo): number => {
      if (!participant) return 1;

      // 服务端基准位置（已经按 canvas 比例缩放）
      const baseTop = participant.region.y * scale.scaleY;

      return baseTop;
    },
    [scale.scaleY]
  );

  /**
   * 处理点击事件
   */
  const handleStreamViewClick = useCallback(
    (participant: SeatInfo | null) => {
      console.log(
        `[LiveStreamView] click participant: ${JSON.stringify(participant)}, isAnchor: ${isAnchor}`
      );

      if (!isLiving) return;

      // 非主播模式且没有参与者信息（背景点击），直接忽略
      if (!isAnchor && !participant?.userInfo) {
        return;
      }

      if (isAnchor) {
        // 主播单人模式：点击自己的画面也要弹出操作面板
        if (seatList.length === 1 && participant?.userInfo) {
          const anchorSeat = seatList[0];
          const anchorUserId = anchorSeat?.userInfo?.userID;
          const targetUserId = participant?.userInfo?.userID;

          if (
            anchorUserId != null &&
            targetUserId != null &&
            String(anchorUserId) === String(targetUserId)
          ) {
            const userInfo = { ...participant.userInfo, seatIndex: participant.index };
            if (!userInfo.userID) return;

            if (enableClickPanel) {
              setPanelUserInfo(userInfo);
              setIsPanelVisible(true);
            }
            onStreamViewClick?.(userInfo);
            return;
          }
        }

        // 主播模式：区分点击背景（loginUserInfo）和点击参与者（带 userInfo）
        if (participant?.userInfo) {
          // 点击参与者
          if (audienceConnected.length > 1 && coHostConnected.length === 0) {
            // 有观众连麦且没有连主播
            const userInfo = { ...participant.userInfo, seatIndex: participant.index };
            if (!userInfo?.userID) return;

            if (enableClickPanel) {
              setPanelUserInfo(userInfo);
              setIsPanelVisible(true);
            } else {
              onStreamViewClick?.(userInfo);
            }
          } else if (coHostConnected.length > 0) {
            // 有连主播
            if (participant?.userInfo?.userID === loginUserInfo?.userID) {
              // 点击自己
              const userInfo = { ...participant.userInfo, seatIndex: participant.index };
              if (!userInfo?.userID) return;

              if (enableClickPanel) {
                setPanelUserInfo(userInfo);
                setIsPanelVisible(true);
              } else {
                onStreamViewClick?.(userInfo);
              }
            }
          }
        } else {
          // 背景点击：直接把当前登录用户信息抛给上层
          if (enableClickPanel) {
            setPanelUserInfo({ ...(loginUserInfo || {}), userID: loginUserInfo?.userID } as any);
            setIsPanelVisible(true);
          } else {
            onStreamViewClick?.(loginUserInfo);
          }
        }
      } else {
        // 观众模式
        const participantUserId = participant?.userInfo?.userID;
        const currentUserId = currentLoginUserId || loginUserInfo?.userID;
        const isClickSelf =
          participantUserId != null &&
          currentUserId != null &&
          String(participantUserId) === String(currentUserId);

        // 房主（主播）判断：使用 liveOwner 来准确判断主播身份
        const realAnchorUserId = liveOwner?.userID;
        const isClickRealAnchor =
          participantUserId != null &&
          realAnchorUserId != null &&
          String(participantUserId) === String(realAnchorUserId) &&
          !isClickSelf; // 如果是点击自己，则不认为是点击主播

        console.log(
          '[LiveStreamView][Audience] Debug info:',
          'participantUserId=', participantUserId,
          'currentUserId=', currentUserId,
          'realAnchorUserId=', realAnchorUserId,
          'isClickSelf=', isClickSelf,
          'isClickRealAnchor=', isClickRealAnchor,
          'enableClickPanel=', enableClickPanel,
          'liveOwner=', liveOwner,
          'participant=', participant
        );

        // 麦上观众 / 普通观众点击房主画面：不弹面板、不抛事件
        if (isClickRealAnchor) {
          console.log(
            '[LiveStreamView][Audience] click real anchor stream, ignore panel & click event. participantUserId=',
            participantUserId,
            'realAnchorUserId=',
            realAnchorUserId,
          );
          return;
        }

        const payload = participant?.userInfo
          ? { ...participant.userInfo, seatIndex: participant?.index }
          : null;

        console.log(
          '[LiveStreamView][Audience] click, participantUserId=',
          participantUserId,
          'currentUserId=',
          currentUserId,
          'isClickSelf=',
          isClickSelf,
          'isClickRealAnchor=',
          isClickRealAnchor,
          'enableClickPanel=',
          enableClickPanel,
          'payload=',
          payload,
        );

        if (enableClickPanel && isClickSelf && payload) {
          setPanelUserInfo(payload);
          setIsPanelVisible(true);
          return;
        }

        if (payload) {
          onStreamViewClick?.(payload);
        }
      }
    },
    [
      isLiving,
      isAnchor,
      audienceConnected.length,
      coHostConnected.length,
      loginUserInfo,
      currentLoginUserId,
      enableClickPanel,
      onStreamViewClick,
      seatList,
      liveOwner,
    ]
  );

  // 渲染参与者信息栏
  const renderParticipantInfo = useCallback(
    (participant: SeatInfo, isAudienceMode: boolean = false) => {
      const userInfo = participant.userInfo;
      if (!userInfo) return null;

      // 主播单人模式：完全不显示参与者信息栏（包括用户名和状态图标）
      const isAnchorSingleMode = isAnchor && seatList.length === 1;
      if (isAnchorSingleMode) {
        return null;
      }

      const maxWidth = participant.region.w * scale.scaleX * 0.85;
      const microphoneStatus = (userInfo as any).microphoneStatus;

      return (
        <View style={[styles.participantInfoContainer, isAudienceMode && styles.participantInfoContainerAudience]}>
          {microphoneStatus === DeviceStatusCode.OFF && (
            <Image
              source={require('../static/images/unmute-mic.png')}
              style={styles.micIcon}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.participantName, { maxWidth }]} numberOfLines={1}>
            {String(userInfo.userName || userInfo.userID || userInfo.nickname || '')}
          </Text>
        </View>
      );
    },
    [scale.scaleX, isAnchor, seatList.length]
  );

  // 渲染参与者视频/头像
  const renderParticipantCell = useCallback(
    (participant: SeatInfo, index: number, isAudienceMode: boolean = false) => {
      const userInfo = participant.userInfo;
      const left = participant.region.x * scale.scaleX;
      const top = calculateTopValue(participant) + (isAnchor ? safeAreaInsets.top : -2); // 主播模式使用系统导航栏高度
      const width = participant.region.w * scale.scaleX;
      const height = isAnchor
        ? participant.region.h * scale.scaleY
        : participant.region.h * scale.scaleY + 2;

      // 有用户的参与者
      if (!userInfo?.userID) return null;

      const participantCameraStatus = (userInfo as any).cameraStatus;
      const backgroundColor =
        !isAnchor && participantCameraStatus === DeviceStatusCode.OFF ? '#000' : 'transparent';

      // 主播单人模式且摄像头关闭：不显示头像（头像由 renderDefaultAvatar 显示），只保留可点击区域
      const isAnchorSingleModeCameraOff = isAnchor && seatList.length === 1 && participantCameraStatus === DeviceStatusCode.OFF;

      return (
        <TouchableWithoutFeedback
          key={`participant-${userInfo.userID}-${participant.index}-${index}`}
          onPress={() => handleStreamViewClick(participant)}>
          <View
            style={[
              styles.gridContentCell,
              {
                left,
                top,
                width,
                height,
                backgroundColor,
                borderRadius: 0,
              },
            ]}>
            <View
              style={{
                width,
                height,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {/* 摄像头关闭时显示头像（主播单人模式除外，头像由 renderDefaultAvatar 显示） */}
              {participantCameraStatus === DeviceStatusCode.OFF && !isAnchorSingleModeCameraOff && (
                <View style={styles.videoContainer}>
                  <Image
                    source={{ uri: userInfo.avatarURL || DEFAULT_AVATAR_URL }}
                    style={styles.participantVideo}
                    resizeMode="cover"
                  />
                </View>
              )}
              {/* 参与者信息栏 */}
              {renderParticipantInfo(participant, isAudienceMode)}
            </View>
          </View>
        </TouchableWithoutFeedback >
      );
    },
    [scale, calculateTopValue, isAnchor, handleStreamViewClick, renderParticipantInfo, safeAreaInsets.top, seatList.length]
  );

  // 计算是否为单人模式
  const isSingleMode = useMemo(() => {
    return seatList.length === 1;
  }, [seatList.length]);

  // 主播端：从 seatList 中获取主播摄像头状态
  const anchorCameraStatus = useMemo(() => {
    const anchorSeat = seatList[0];
    return (anchorSeat?.userInfo as any)?.cameraStatus || DeviceStatusCode.OFF;
  }, [seatList]);

  // 渲染默认头像（主播模式）
  const renderDefaultAvatar = useMemo(() => {
    if (
      !isAnchor ||
      anchorCameraStatus !== DeviceStatusCode.OFF ||
      !isSingleMode ||
      !isLiving
    ) {
      return null;
    }

    // 获取主播座位信息，用于点击事件
    const anchorSeat = seatList[0];
    if (!anchorSeat) {
      return null;
    }

    return (
      <TouchableWithoutFeedback
        onPress={() => handleStreamViewClick(anchorSeat)}>
        <View
          style={[
            styles.defaultAvatar,
            {
              top: (screenHeight - safeAreaInsets.top - 100) * 0.5 + safeAreaInsets.top, // 在可用区域中心位置，底部100px
            },
          ]}>
          <Image
            source={{ uri: loginUserInfo?.avatarURL || DEFAULT_AVATAR_URL }}
            style={styles.defaultAvatarImage}
            resizeMode="cover"
          />
        </View>
      </TouchableWithoutFeedback>
    );
  }, [isAnchor, anchorCameraStatus, isSingleMode, isLiving, screenHeight, safeAreaInsets.top, loginUserInfo?.avatarURL, seatList, handleStreamViewClick]);

  // 渲染单人模式（观众视角）
  const renderSingleMode = useMemo(() => {
    if (!isSingleMode || seatList.length === 0) {
      return null;
    }

    const participant = seatList[0];
    if (!participant) {
      return null;
    }

    const left = participant.region.x * scale.scaleX;
    const top = calculateTopValue(participant) - 2; // 观众模式保持原有位置
    const width = participant.region.w * scale.scaleX;
    const height = streamViewHeight + 10;
    const participantCameraStatus = (participant.userInfo as any)?.cameraStatus;
    const backgroundColor = participantCameraStatus === DeviceStatusCode.OFF ? '#000' : 'transparent';

    return (
      <TouchableWithoutFeedback onPress={() => handleStreamViewClick(participant || null)}>
        <View
          style={[
            styles.gridContentCell,
            {
              left,
              top,
              width,
              height,
              backgroundColor,
            },
          ]}>
          <View
            style={{
              width,
              height,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            {participantCameraStatus === DeviceStatusCode.OFF && (
              <View style={styles.videoContainer}>
                <Image
                  source={{
                    uri: participant.userInfo?.avatarURL || DEFAULT_AVATAR_URL,
                  }}
                  style={styles.participantVideo}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback >
    );
  }, [
    isSingleMode,
    seatList,
    scale.scaleX,
    calculateTopValue,
    streamViewHeight,
    handleStreamViewClick,
  ]);

  // 渲染多人模式（包括主播单人模式）
  const renderMultiMode = useMemo(() => {
    // 主播模式下，即使只有一个人也要渲染（用于点击操作面板）
    // 观众模式下，只有多人时才渲染
    if (!isAnchor && seatList.length <= 1) {
      return null;
    }

    if (seatList.length === 0) {
      return null;
    }

    return seatList
      .filter((participant): participant is SeatInfo => participant !== undefined)
      .map((participant, index) => {
        return renderParticipantCell(participant, index, !isAnchor);
      });
  }, [seatList, isAnchor, renderParticipantCell]);

  const liveCoreViewRef = useRef<LiveCoreViewRef>(null);

  useImperativeHandle(ref, () => ({
    setLocalVideoMuteImage: (bigImageSource, smallImageSource) => {
      liveCoreViewRef.current?.setLocalVideoMuteImage?.(bigImageSource, smallImageSource);
    },
  }), []);

  return (
    <View style={[styles.container, style]}>
      {/* 背景层：live-core-view */}
      <LiveCoreView
        ref={liveCoreViewRef}
        liveId={liveID}
        coreViewType={isAnchor ? 'pushView' : 'playView'}
        style={{
          ...styles.liveStreamViewBackground,
          // 主播端：距顶部为系统导航栏高度，距底部100px
          // 观众端：直接铺满整个屏幕
          width: isAnchor ? safeArea.width : screenWidth,
          height: isAnchor ? screenHeight - safeAreaInsets.top - 100 : screenHeight,
          top: isAnchor ? safeAreaInsets.top : 0,
        }}
      />

      {/* 默认头像层（主播模式） */}
      {renderDefaultAvatar}

      {/* 单人模式（观众视角） */}
      {!isAnchor && renderSingleMode}

      {/* 多人模式（包括主播单人模式） */}
      {renderMultiMode}

      {/* 操作面板层：集成 LiveStreamActionPanel */}
      {enableClickPanel && (
        <LiveStreamActionPanel
          visible={isPanelVisible}
          liveID={liveID}
          userInfo={_panelUserInfo || undefined}
          isAnchorMode={isAnchor}
          isSelf={
            !!_panelUserInfo &&
            (isAnchor
              ? _panelUserInfo.userID === loginUserInfo?.userID
              : _panelUserInfo.userID === currentLoginUserId)
          }
          onClose={() => setIsPanelVisible(false)}
        />
      )}
    </View>
  );
  }
);

LiveStreamView.displayName = 'LiveStreamView';

// ==================== 样式定义 ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'black ',
  },
  liveStreamViewBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  defaultAvatar: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  defaultAvatarImage: {
    width: 48, // 96rpx / 2
    height: 48,
    borderRadius: 24,
  },
  gridContentCell: {
    position: 'absolute',
    zIndex: 1001, // 确保高于 defaultAvatar (zIndex: 1000)
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantVideo: {
    width: 40, // 80rpx / 2
    height: 40,
    borderRadius: 20,
  },
  participantInfoContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 38, 46, 0.4)',
    borderRadius: 19, // 38rpx / 2
    height: 18, // 36rpx / 2
    paddingLeft: 3, // 6rpx / 2
    paddingRight: 6, // 12rpx / 2
    left: 3, // 6rpx / 2
    bottom: 3, // 6rpx / 2
    flex: 1,
  },
  participantInfoContainerAudience: {
    // 观众模式下的特殊样式（如果需要）
  },
  micIcon: {
    width: 12, // 24rpx / 2
    height: 12,
    marginLeft: 2, // 4rpx / 2
    backgroundColor: 'rgba(34, 38, 46, 0)',
  },
  participantName: {
    fontSize: 12, // 24rpx / 2
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 1, // 2rpx / 2
    textAlign: 'center',
    minWidth: 40, // 80rpx / 2
  },
});
