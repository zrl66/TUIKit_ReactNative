import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDeviceState } from '../atomic-x/state/DeviceState';
import { useCoGuestState } from '../atomic-x/state/CoGuestState';
import { useCoHostState } from '../atomic-x/state/CoHostState';
import { useLiveSeatState } from '../atomic-x/state/LiveSeatState';
import type { SeatInfo } from '../atomic-x/state/LiveSeatState/types';
import { DEFAULT_AVATAR_URL } from './constants';
import { ConfirmDialog } from './ConfirmDialog';
import { showToast } from './CustomToast';
import { DeviceStatusCode } from '../atomic-x/state/DeviceState/types';
import { CoHostStatus } from '../atomic-x/state/CoHostState/types';

interface LiveStreamActionPanelProps {
  visible: boolean;
  liveID: string;
  // 点击对象信息：{ userID, userName, seatIndex, avatarURL, ... }
  userInfo?: {
    userID?: string;
    userName?: string;
    avatarURL?: string;
    [key: string]: any;
  } | null;
  // 展示模式：主播或观众
  isAnchorMode?: boolean;
  // 是否当前登录者本人（主播/观众自我操作用）
  isSelf?: boolean;
  // 关闭面板
  onClose?: () => void;
}

export const LiveStreamActionPanel: React.FC<LiveStreamActionPanelProps> = ({
  visible,
  liveID,
  userInfo,
  isAnchorMode = false,
  isSelf = false,
  onClose,
}) => {
  const { t } = useTranslation();
  const safeUserInfo = userInfo || {};
  const [showKickOutConfirm, setShowKickOutConfirm] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const [isCameraDisabledByAdmin, setIsCameraDisabledByAdmin] = useState(false);
  const [isMicDisabledByAdmin, setIsMicDisabledByAdmin] = useState(false);

  const {
    isFrontCamera,
    openLocalCamera,
    closeLocalCamera,
    switchCamera,
  } = useDeviceState();

  const { exitHostConnection, coHostStatus } = useCoHostState(liveID);
  const { disconnect } = useCoGuestState(liveID);
  const {
    seatList,
    muteMicrophone,
    unmuteMicrophone,
    openRemoteCamera,
    closeRemoteCamera,
    openRemoteMicrophone,
    closeRemoteMicrophone,
    kickUserOutOfSeat,
    addLiveSeatEventListener,
    removeLiveSeatEventListener
  } = useLiveSeatState(liveID);

  const handleClose = () => {
    onClose?.();
  };

  useEffect(() => {
    if (!isSelf || isAnchorMode) {
      return;
    }

    const handleCameraClosedByAdmin = () => {
      setIsCameraDisabledByAdmin(true);
    };

    const handleCameraOpenedByAdmin = () => {

      setIsCameraDisabledByAdmin(false);
    };

    const handleMicClosedByAdmin = () => {

      setIsMicDisabledByAdmin(true);
    };

    const handleMicOpenedByAdmin = () => {
      setIsMicDisabledByAdmin(false);
    };

    addLiveSeatEventListener('onLocalCameraClosedByAdmin', handleCameraClosedByAdmin, 'onLocalCameraClosedByAdmin_Listener');
    addLiveSeatEventListener('onLocalCameraOpenedByAdmin', handleCameraOpenedByAdmin, 'onLocalCameraOpenedByAdmin_Listener');
    addLiveSeatEventListener('onLocalMicrophoneClosedByAdmin', handleMicClosedByAdmin, 'onLocalMicrophoneClosedByAdmin_Listener');
    addLiveSeatEventListener('onLocalMicrophoneOpenedByAdmin', handleMicOpenedByAdmin, 'onLocalMicrophoneOpenedByAdmin_Listener');

    return () => {
      removeLiveSeatEventListener('onLocalCameraClosedByAdmin', 'onLocalCameraClosedByAdmin_Listener');
      removeLiveSeatEventListener('onLocalCameraOpenedByAdmin', 'onLocalCameraOpenedByAdmin_Listener');
      removeLiveSeatEventListener('onLocalMicrophoneClosedByAdmin', 'onLocalMicrophoneClosedByAdmin_Listener');
      removeLiveSeatEventListener('onLocalMicrophoneOpenedByAdmin', 'onLocalMicrophoneOpenedByAdmin_Listener');
    };
  }, [isSelf, isAnchorMode, addLiveSeatEventListener, removeLiveSeatEventListener]);

  // 找到目标座位
  const targetSeat: SeatInfo | null = useMemo(() => {
    const list = seatList || [];
    const targetUserID = safeUserInfo.userID;
    if (!targetUserID || !Array.isArray(list)) return null;
    return list.find((item) => item?.userInfo?.userID === targetUserID) || null;
  }, [seatList, safeUserInfo.userID]);

  const targetMicStatus = useMemo(() => {
    return (targetSeat as any)?.userInfo?.microphoneStatus || DeviceStatusCode.OFF;
  }, [targetSeat]);

  const targetCameraStatus = useMemo(() => {
    return (targetSeat as any)?.userInfo?.cameraStatus || DeviceStatusCode.OFF;
  }, [targetSeat]);

  useEffect(() => {
    if (!visible) return;
    if (!targetSeat && safeUserInfo.userID) {
      handleClose();
      return;
    }
    const userInfo = (targetSeat as any)?.userInfo;
    if (userInfo) {
      setIsCameraDisabledByAdmin(userInfo.allowOpenCamera === false);
      setIsMicDisabledByAdmin(userInfo.allowOpenMicrophone === false);
    }
  }, [visible, targetSeat, safeUserInfo.userID]);

  // 控件显隐与文案
  // 主播模式：总是显示（可以控制自己和麦上用户）
  // 观众模式：只显示自己的控制
  const showMic = useMemo(() => {
    return isAnchorMode || isSelf;
  }, [isSelf, isAnchorMode]);

  const showCamera = useMemo(() => {
    return isAnchorMode || isSelf;
  }, [isSelf, isAnchorMode]);

  const showFlip = useMemo(() => {
    return isSelf && targetCameraStatus === DeviceStatusCode.ON;
  }, [isSelf, targetCameraStatus]);

  const showHangup = useMemo(() => {
    return !isSelf || (isSelf && !isAnchorMode);
  }, [isSelf, isAnchorMode]);

  // 麦克风按钮是否被禁用（观众模式且被管理员禁用）
  const isMicButtonDisabled = useMemo(() => {
    return isSelf && !isAnchorMode && isMicDisabledByAdmin;
  }, [isSelf, isAnchorMode, isMicDisabledByAdmin]);

  // 摄像头按钮是否被禁用（观众模式且被管理员禁用）
  const isCameraButtonDisabled = useMemo(() => {
    return isSelf && !isAnchorMode && isCameraDisabledByAdmin;
  }, [isSelf, isAnchorMode, isCameraDisabledByAdmin]);

  const micOffText = useMemo(() => {
    // 主播模式：显示"静音"（无论是否是自己）
    // 观众模式：显示"关闭音频"
    return isAnchorMode ? t('liveRoom.mute') : t('settings.muteAudio');
  }, [isAnchorMode, t]);

  const micOnText = useMemo(() => {
    // 主播模式：显示"解除静音"（无论是否是自己）
    // 观众模式：显示"打开音频"
    return isAnchorMode ? t('liveRoom.unmute') : t('settings.openAudio');
  }, [isAnchorMode, t]);

  const cameraOffText = useMemo(() => {
    // 主播模式：如果是自己显示"关闭视频"，如果是别人显示"禁画"
    // 观众模式：显示"关闭视频"
    if (isAnchorMode && !isSelf) {
      return t('settings.disableVideo');
    }
    return t('settings.muteVideo');
  }, [isAnchorMode, isSelf, t]);

  const cameraOnText = useMemo(() => {
    return t('settings.openCamera');
  }, [isAnchorMode, isSelf, t]);

  const hangupText = useMemo(() => {
    return isAnchorMode ? t('coGuest.disconnectCoGuest') : t('coGuest.disconnect');
  }, [isAnchorMode, t]);

  // 操作区 - 麦克风
  const handleMicrophoneOperation = async () => {
    // 如果被管理员禁用，不允许操作
    if (isMicButtonDisabled) {
      showToast(t('toast.micDisabledByAnchor'), 2000);
      return;
    }

    const targetUserID = (targetSeat as any)?.userInfo?.userID || safeUserInfo.userID;
    // 非本人：远程控制
    if (!isSelf) {
      if (!targetSeat) {
        console.warn('[LiveStreamActionPanel] targetSeat not found, cannot control mic');
        return;
      }

      const displayName = safeUserInfo.userName || targetUserID;
      if (targetMicStatus === DeviceStatusCode.OFF) {
        await openRemoteMicrophone({
          liveID: liveID,
          userID: String(targetUserID),
          policy: 'UNLOCK_ONLY',
          onSuccess: () => {
            console.log('[LiveStreamActionPanel] 远程麦克风已解除静音');
            showToast(t('toast.userUnmuted', { name: displayName }), 2000);
          },
          onError: (error) => {
            console.error('[LiveStreamActionPanel] 远程麦克风解除静音失败:', error);
          },
        });
      } else if (targetMicStatus === DeviceStatusCode.ON) {
        await closeRemoteMicrophone({
          liveID: liveID,
          userID: String(targetUserID),
          onSuccess: () => {
            console.log('[LiveStreamActionPanel] 远程麦克风已静音');
            showToast(t('toast.userMuted', { name: displayName }), 2000);
          },
          onError: (error) => {
            console.error('[LiveStreamActionPanel] 远程麦克风静音失败:', error);
          },
        });
      }
      handleClose();
      return;
    }

    // 本人：本地控制
    if (targetMicStatus === DeviceStatusCode.OFF) {
      await unmuteMicrophone({
        liveID: liveID,
        onSuccess: () => {
          console.log('[LiveStreamActionPanel] 本地麦克风已打开');
        },
        onError: (error) => {
          console.error('[LiveStreamActionPanel] 打开本地麦克风失败:', error);
        },
      });
      handleClose();
      return;
    }

    if (targetMicStatus === DeviceStatusCode.ON) {
      await muteMicrophone({
        liveID: liveID,
      });
      handleClose();
      return;
    }
  };

  // 操作区 - 摄像头
  const handleCameraOperation = async () => {
    // 如果被管理员禁用，不允许操作
    if (isCameraButtonDisabled) {
      showToast(t('toast.cameraDisabledByAnchor'), 2000);
      return;
    }

    const targetUserID = (targetSeat as any)?.userInfo?.userID || safeUserInfo.userID;
    // 非本人：远程控制
    if (!isSelf) {
      if (!targetSeat) {
        console.warn('[LiveStreamActionPanel] targetSeat not found, cannot control camera');
        return;
      }

      const displayName = safeUserInfo.userName || targetUserID;
      if (targetCameraStatus === DeviceStatusCode.OFF) {
        await openRemoteCamera({
          liveID: liveID,
          userID: String(targetUserID),
          policy: 'UNLOCK_ONLY',
          onSuccess: () => {
            console.log('[LiveStreamActionPanel] 远程摄像头解除禁画');
            showToast(t('toast.userCameraOpened', { name: displayName }));
          },
          onError: (error) => {
            console.error('[LiveStreamActionPanel] 远程摄像头解除禁画失败:', error);
          },
        });
      } else if (targetCameraStatus === DeviceStatusCode.ON) {
        await closeRemoteCamera({
          liveID: liveID,
          userID: String(targetUserID),
          onSuccess: () => {
            console.log('[LiveStreamActionPanel] 远程摄像头已禁画');
            showToast(t('toast.userCameraClosed', { name: displayName }));
          },
          onError: (error) => {
            console.error('[LiveStreamActionPanel] 远程摄像头禁画失败:', error);
          },
        });
      }
      handleClose();
      return;
    }

    // 本人：本地控制
    if (targetCameraStatus === DeviceStatusCode.OFF) {
      await openLocalCamera({
        isFront: isFrontCamera,
      } as any);
      handleClose();
      return;
    }

    if (targetCameraStatus === DeviceStatusCode.ON) {
      await closeLocalCamera();
      handleClose();
      return;
    }
  };

  // 翻转摄像头
  const handleFlipCamera = async () => {
    await switchCamera({
      isFront: !isFrontCamera,
    } as any);
    handleClose();
  };

  // 挂断 / 移下麦
  const handleHangUp = async () => {
    if (isAnchorMode) {
      // 主播模式
      if (coHostStatus === CoHostStatus.CONNECTED) {
        // 断开与其他主播的连线
        await exitHostConnection({
          onSuccess: () => {
            console.log('[LiveStreamActionPanel] 已断开与其他主播的连线');
          },
          onError: (error) => {
            console.error('[LiveStreamActionPanel] 断开主播连线失败:', error);
          },
        });
        handleClose();
        return;
      }

      // 移除观众连麦（踢下麦）- 需要二次确认
      if (!targetSeat) {
        console.warn('[LiveStreamActionPanel] targetSeat not found, cannot kick user out of seat');
        return;
      }
      const targetUserID = (targetSeat as any)?.userInfo?.userID || safeUserInfo.userID;
      if (!targetUserID) {
        console.warn('[LiveStreamActionPanel] targetUserID not found, cannot kick user out of seat');
        return;
      }
      // 显示确认弹窗
      setShowKickOutConfirm(true);
    } else {
      // 观众模式：断开当前连麦 - 需要二次确认
      setShowDisconnectConfirm(true);
    }
  };

  // 确认断开连麦（观众）
  const handleConfirmDisconnect = async () => {
    setShowDisconnectConfirm(false);
    await disconnect({
      liveID: liveID,
      onSuccess: () => {
        console.log('[LiveStreamActionPanel] 观众已断开当前连麦');
      },
      onError: (error) => {
        console.error('[LiveStreamActionPanel] 断开连麦失败:', error);
      },
    });
    handleClose();
  };

  // 取消断开连麦
  const handleCancelDisconnect = () => {
    setShowDisconnectConfirm(false);
  };

  // 确认移下麦
  const handleConfirmKickOut = async () => {
    if (!targetSeat) {
      return;
    }
    const targetUserID = (targetSeat as any)?.userInfo?.userID || safeUserInfo.userID;
    if (!targetUserID) {
      return;
    }
    setShowKickOutConfirm(false);
    await kickUserOutOfSeat({
      liveID: liveID,
      userID: String(targetUserID),
      onSuccess: () => {
        console.log('[LiveStreamActionPanel] 已将观众移下麦');
        handleClose();
      },
      onError: (error) => {
        console.error('[LiveStreamActionPanel] 移下麦失败:', error);
      },
    });
  };

  // 取消移下麦
  const handleCancelKickOut = () => {
    setShowKickOutConfirm(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* 半透明遮罩 */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* 底部抽屉 */}
        <View style={styles.drawer}>
          {/* 头部用户信息 */}
          <View style={styles.drawerHeader}>
            <View style={styles.userInfoSection}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: (safeUserInfo as any).avatarURL || DEFAULT_AVATAR_URL }}
                  style={styles.userAvatar}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.username} numberOfLines={1}>
                  {safeUserInfo.userName || ''}
                </Text>
                <Text style={styles.userId} numberOfLines={1}>
                  ID: {safeUserInfo.userID || ''}
                </Text>
              </View>
            </View>
          </View>

          {/* 操作区域 */}
          <View style={styles.drawerContent}>
            <View style={styles.drawerActions}>
              {showMic && (
                <TouchableOpacity
                  style={[styles.actionBtn, isMicButtonDisabled && styles.actionBtnDisabled]}
                  activeOpacity={isMicButtonDisabled ? 1 : 0.8}
                  onPress={handleMicrophoneOperation}
                  disabled={isMicButtonDisabled}
                >
                  <View style={[styles.actionBtnImageContainer, isMicButtonDisabled && styles.actionBtnImageContainerDisabled]}>
                    {targetMicStatus !== DeviceStatusCode.OFF ? (
                      <Image
                        source={require('../static/images/mute-mic.png')}
                        style={[styles.actionBtnImage, isMicButtonDisabled && styles.actionBtnImageDisabled]}
                        resizeMode="contain"
                      />
                    ) : (
                      <Image
                        source={require('../static/images/unmute-mic.png')}
                        style={[styles.actionBtnImage, isMicButtonDisabled && styles.actionBtnImageDisabled]}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <Text style={[styles.actionBtnContent, isMicButtonDisabled && styles.actionBtnContentDisabled]} numberOfLines={1}>
                    {targetMicStatus !== DeviceStatusCode.OFF ? micOffText : micOnText}
                  </Text>
                </TouchableOpacity>
              )}

              {showCamera && (
                <TouchableOpacity
                  style={[styles.actionBtn, isCameraButtonDisabled && styles.actionBtnDisabled]}
                  activeOpacity={isCameraButtonDisabled ? 1 : 0.8}
                  onPress={handleCameraOperation}
                  disabled={isCameraButtonDisabled}
                >
                  <View style={[styles.actionBtnImageContainer, isCameraButtonDisabled && styles.actionBtnImageContainerDisabled]}>
                    {targetCameraStatus !== DeviceStatusCode.OFF ? (
                      <Image
                        source={require('../static/images/end-camera.png')}
                        style={[styles.actionBtnImage, isCameraButtonDisabled && styles.actionBtnImageDisabled]}
                        resizeMode="contain"
                      />
                    ) : (
                      <Image
                        source={require('../static/images/start-camera.png')}
                        style={[styles.actionBtnImage, isCameraButtonDisabled && styles.actionBtnImageDisabled]}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <Text style={[styles.actionBtnContent, isCameraButtonDisabled && styles.actionBtnContentDisabled]} numberOfLines={1}>
                    {targetCameraStatus !== DeviceStatusCode.OFF ? cameraOffText : cameraOnText}
                  </Text>
                </TouchableOpacity>
              )}

              {showFlip && (
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handleFlipCamera}>
                  <View style={styles.actionBtnImageContainer}>
                    <Image
                      source={require('../static/images/flip.png')}
                      style={styles.actionBtnImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.actionBtnContent} numberOfLines={1}>
                    {t('liveStreamAction.flipCamera')}
                  </Text>
                </TouchableOpacity>
              )}

              {showHangup && (
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handleHangUp}>
                  <View style={styles.actionBtnImageContainer}>
                    <Image
                      source={require('../static/images/hangup.png')}
                      style={styles.actionBtnImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.actionBtnContent} numberOfLines={1}>
                    {hangupText}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* 移下麦确认弹窗 */}
      <ConfirmDialog
        visible={showKickOutConfirm}
        message={t('coGuest.disconnectConfirm')}
        confirmText={t('coGuest.disconnectCoGuest')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmKickOut}
        onCancel={handleCancelKickOut}
      />

      {/* 断开连麦确认弹窗（观众） */}
      <ConfirmDialog
        visible={showDisconnectConfirm}
        message={t('coGuest.disconnectConfirm')}
        confirmText={t('coGuest.disconnect')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmDisconnect}
        onCancel={handleCancelDisconnect}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  drawer: {
    backgroundColor: 'rgba(31, 32, 36, 1)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  drawerHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
    flexDirection: 'column',
  },
  username: {
    fontSize: 16,
    color: '#C5CCDB',
    fontWeight: '500',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#7C85A6',
  },
  drawerContent: {
    paddingHorizontal: 0, // 移除 padding，让按钮和头像对齐
    paddingBottom: 16,
  },
  drawerActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 24, // 和头像的 paddingHorizontal 对齐
  },
  actionBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 60, // 固定宽度
    marginRight: 12, // 按钮之间的间距
  },
  actionBtnImageContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(43, 44, 48, 1)',
    marginBottom: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnImage: {
    width: 24,
    height: 24,
  },
  actionBtnContent: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center', // 文字居中
    lineHeight: 16,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnImageContainerDisabled: {
    backgroundColor: 'rgba(43, 44, 48, 0.5)',
  },
  actionBtnImageDisabled: {
    opacity: 0.5,
  },
  actionBtnContentDisabled: {
    color: '#7C85A6',
  },
});


