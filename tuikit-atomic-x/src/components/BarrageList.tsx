/**
 * BarrageList Component
 * 弹幕列表组件
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLiveListState } from '../atomic-x/state/LiveListState';
import { useBarrageState } from '../atomic-x/state/BarrageState';
import type { BarrageParam } from '../atomic-x/state/BarrageState/types';
import { useLoginState } from '../atomic-x/state/LoginState';
import { DEFAULT_AVATAR_URL } from './constants';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

interface BarrageMessage {
    sequence?: string;
    sender?: {
        userID?: string;
        userName?: string;
        avatarURL?: string;
    };
    textContent?: string;
    gift?: {
        name?: string;
        iconURL?: string;
    };
    count?: number;
    [key: string]: unknown;
}

// 将 BarrageParam 转换为 BarrageMessage
const convertBarrageParamToMessage = (param: BarrageParam, index: number): BarrageMessage => {
    // 处理 sender，可能是字符串或对象
    const senderValue = param.sender;
    let senderObj: BarrageMessage['sender'];

    if (typeof senderValue === 'object' && senderValue !== null) {
        senderObj = {
            userID: (senderValue as any).userID || param.userID,
            userName: (senderValue as any).userName || (senderValue as any).nickname || param.nickname,
            avatarURL: (senderValue as any).avatarURL || param.avatarURL,
        };
    } else {
        senderObj = {
            userID: param.userID || (typeof senderValue === 'string' ? senderValue : undefined),
            userName: param.nickname || (typeof senderValue === 'string' ? senderValue : undefined),
            avatarURL: param.avatarURL,
        };
    }

    // 处理礼物消息的 textContent：如果是礼物消息，textContent 应该是完整格式
    // 格式：xx 送给 xx 什么礼物 x count
    // 如果是主播本人发送，则显示"送给我"，否则显示"送给主播的 userName || userID"
    let textContent: string;
    if ((param as any).gift) {
        // 礼物消息：textContent 需要包含完整信息
        // 注意：这里先设置礼物名称，完整的 textContent 会在 BarrageList 组件中根据模式动态生成
        // 但为了兼容，这里先设置礼物名称
        textContent = ((param as any).gift?.name || '') as string;
    } else {
        // 普通消息：从多个可能的字段中获取
        // 优先顺序：text > content > textContent（如果 param 中已有）> 空字符串
        textContent = param.text || param.content || (param as any).textContent || '';
    }

    // 先构建基础对象，确保 textContent 在最后设置，不会被覆盖
    const message: BarrageMessage = {
        sequence: param.messageID || `msg_${index}`,
        sender: senderObj,
        // 保留其他字段（如 gift、count 等）
        ...(param as any),
        // 最后设置 textContent，确保它不会被覆盖
        textContent: textContent,
    };

    return message;
};

interface GiftToast {
    id: string;
    avatarURL?: string;
    name?: string;
    desc?: string;
    iconURL?: string;
    position?: {
        top?: string | number;
        bottom?: string | number;
        left?: string | number;
        right?: string | number;
    };
    duration?: number;
    autoHide?: boolean;
}

interface BarrageListProps {
    mode?: 'anchor' | 'audience';
    bottomPx?: number;
    liveID?: string;
    toast?: GiftToast;
    // 点击整条消息的回调（兼容旧逻辑）
    onItemTap?: (message: BarrageMessage) => void;
    // 新增：点击消息发送者时的回调（用于主播端弹出观众操作面板）
    onSenderTap?: (sender: BarrageMessage['sender']) => void;
    onToastClosed?: (toastItem: GiftToast) => void;
}


export function BarrageList({
    mode = 'audience',
    bottomPx = 0,
    liveID,
    toast: toastProp,
    onItemTap,
    onSenderTap,
    onToastClosed,
}: BarrageListProps) {
    const { t } = useTranslation();
    const { currentLive } = useLiveListState();
    const { messageList } = useBarrageState(liveID || '');
    const { loginUserInfo } = useLoginState();

    // 计算礼物相关的前缀和接收者名称（与 Vue 版本保持一致）
    const [visibleToasts, setVisibleToasts] = useState<GiftToast[]>([]);
    const flatListRef = useRef<FlatList>(null);

    // 将 BarrageParam[] 转换为 BarrageMessage[]
    const mixMessageList: BarrageMessage[] = messageList.map((param, index) => {
        const message = convertBarrageParamToMessage(param, index);

        return message;
    });

    // 获取主播信息
    const liveOwner = currentLive?.liveOwner as { userName?: string; userID?: string } | undefined;
    const ownerUserID = liveOwner?.userID;

    // 根据模式确定接收者名称
    // 主播端：如果发送者是主播本人，显示"送给我"，否则显示"送给主播的 userName || userID"
    // 观众端：显示"送给主播的 userName || userID"
    const getGiftReceiverName = (senderUserID?: string): string => {
        if (mode === 'anchor') {
            // 主播端：判断发送者是否是主播本人
            if (senderUserID && ownerUserID && senderUserID === ownerUserID) {
                return t('common.me');
            } else {
                // 不是主播本人，显示"送给主播的 userName || userID"
                return liveOwner?.userName || liveOwner?.userID || '';
            }
        } else {
            // 观众端：显示"送给主播的 userName || userID"
            return liveOwner?.userName || liveOwner?.userID || '';
        }
    };

    // 生成唯一 ID
    const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    // 显示 Toast
    const showToast = (toastConfig: Partial<GiftToast>) => {
        console.log('[BarrageList] showToast 被调用:', toastConfig);
        const defaultPosition = {
            top: 'auto',
            bottom: screenHeight - 460,
            left: 16,
            right: 'auto',
        };
        const toastHeight = 60;

        setVisibleToasts((prev) => {
            const newToast: GiftToast = {
                id: generateId(),
                duration: 3000,
                autoHide: true,
                position: {
                    top: defaultPosition.top,
                    bottom: defaultPosition.bottom - prev.length * toastHeight,
                    left: defaultPosition.left,
                    right: defaultPosition.right,
                },
                ...toastConfig,
            };

            const toastId = newToast.id;

            if (newToast.autoHide && newToast.duration) {
                setTimeout(() => {
                    hideToast(toastId);
                }, newToast.duration);
            }

            return [...prev, newToast];
        });
    };

    // 隐藏 Toast
    const hideToast = (id: string) => {
        setVisibleToasts((prev) => {
            const toast = prev.find((t) => t.id === id);
            if (toast) {
                onToastClosed?.(toast);
            }
            return prev.filter((t) => t.id !== id);
        });
    };

    // 获取 Toast 样式
    const getToastStyle = (toastItem: GiftToast) => {
        const style: any = {
            position: 'absolute',
            zIndex: 999,
        };

        if (toastItem.position) {
            if (toastItem.position.top !== undefined && toastItem.position.top !== 'auto') {
                style.top =
                    typeof toastItem.position.top === 'number'
                        ? toastItem.position.top
                        : undefined;
            }
            if (toastItem.position.bottom !== undefined && toastItem.position.bottom !== 'auto') {
                style.bottom =
                    typeof toastItem.position.bottom === 'number'
                        ? toastItem.position.bottom
                        : undefined;
            }
            if (toastItem.position.left !== undefined && toastItem.position.left !== 'auto') {
                style.left =
                    typeof toastItem.position.left === 'number'
                        ? toastItem.position.left
                        : undefined;
            }
            if (toastItem.position.right !== undefined && toastItem.position.right !== 'auto') {
                style.right =
                    typeof toastItem.position.right === 'number'
                        ? toastItem.position.right
                        : undefined;
            }
        }

        return style;
    };

    // 处理消息项点击
    const handleItemTap = (message: BarrageMessage) => {
        // 如果消息的发送者是主播自己，则不处理
        if (message.sender?.userID && loginUserInfo?.userID && message.sender.userID === loginUserInfo.userID) {
            return;
        }

        // 保持对整条消息的回调
        onItemTap?.(message);
        // 额外暴露发送者信息（用于主播端观众管理）
        if (message.sender) {
            onSenderTap?.(message.sender);
        }
    };

    // 监听 toast prop 变化
    useEffect(() => {
        console.log('[BarrageList] toastProp 变化:', toastProp);
        if (toastProp && typeof toastProp === 'object' && Object.keys(toastProp).length > 0) {
            // 排除 _timestamp 字段，只传递实际需要的字段
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _timestamp, ...toastConfig } = toastProp as any;
            console.log('[BarrageList] 调用 showToast:', toastConfig);
            showToast(toastConfig);
        } else {
            console.log('[BarrageList] toastProp 为空或无效:', toastProp);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toastProp]);

    // 自动滚动到底部
    useEffect(() => {
        if (mixMessageList.length > 0 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [mixMessageList.length]);

    // 渲染消息项
    const renderMessageItem = ({ item }: { item: BarrageMessage }) => {
        const owner = currentLive?.liveOwner as { userID?: string } | undefined;
        const isOwner =
            item.sender?.userID === owner?.userID;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleItemTap(item)}
                activeOpacity={0.7}>
                <View style={styles.messageContentWrapper}>
                    {item.gift ? (
                        // 礼物消息：textContent 已经包含完整格式 "xx 送给 xx 什么礼物 x count"
                        <View style={styles.nicknameContentGift}>
                            <Text style={styles.giftMessageText}>
                                {item.textContent || t('barrage.gift', { name: item.sender?.userName || item.sender?.userID, gift: `${getGiftReceiverName(item.sender?.userID)} ${item.gift?.name || ''}${item.count && item.count > 1 ? ` x${item.count}` : ''}` })}
                            </Text>
                        </View>
                    ) : (
                        // 普通弹幕：
                        // 左侧为按钮感更强的「主播」标签；
                        // 右侧为一个整体 Text（昵称 + 文案），在自身可用宽度内一行展示，超出后整体从文案处换行
                        <View style={styles.messageRow}>
                            {isOwner && (
                                <View style={styles.messageRoleWrapper}>
                                    <Text style={styles.messageRoleInline}>
                                        {t('common.anchor')}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.messageTextWrapper}>
                                <Text style={styles.messageText}>
                                    <Text style={styles.chatNicknameInline}>
                                        {item.sender?.userName || item.sender?.userID}：
                                    </Text>
                                    <Text style={styles.chatContentInline}>
                                        {item.textContent || ''}
                                    </Text>
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <>
            {/* 聊天消息列表 - 直接使用绝对定位，不依赖父容器 */}
            <FlatList
                ref={flatListRef}
                data={mixMessageList}
                renderItem={renderMessageItem}
                keyExtractor={(item, index) => item.sequence || `msg_${index}`}
                style={[
                    styles.chatList,
                    {
                        bottom: bottomPx + 46 + 20, // 输入框高度(46) + 间距(20)
                    },
                ]}
                contentContainerStyle={styles.chatListContent}
                showsVerticalScrollIndicator={false}
                inverted={false}
                ListEmptyComponent={undefined}
            />
            {/* GiftToast 提示 */}
            {visibleToasts.map((toastItem) => (
                <View
                    key={toastItem.id}
                    style={[styles.toastContainer, getToastStyle(toastItem)]}>
                    <View style={styles.toastContent}>
                        {/* 左侧头像 */}
                        <Image
                            source={{
                                uri: toastItem.avatarURL || DEFAULT_AVATAR_URL,
                            }}
                            style={styles.userAvatar}
                        />
                        {/* 中间礼物名称 */}
                        <View style={styles.userDetails}>
                            <Text style={styles.username} numberOfLines={1}>
                                {toastItem.name || ''}
                            </Text>
                        </View>
                        {/* 右侧礼物图片 */}
                        {toastItem.iconURL && toastItem.iconURL.trim() !== '' && (
                            <View style={styles.iconContainer}>
                                <Image
                                    source={{ uri: toastItem.iconURL }}
                                    style={styles.icon}
                                    resizeMode="contain"
                                    onError={(error) => {
                                        console.error('[BarrageList] Toast 图片加载失败:', toastItem.iconURL, error);
                                    }}
                                    onLoad={() => {
                                        console.log('[BarrageList] Toast 图片加载成功:', toastItem.iconURL);
                                    }}
                                />
                            </View>
                        )}
                    </View>
                </View>
            ))}
        </>
    );
}

const styles = StyleSheet.create({
    barrageContainer: {
        // 已移除，不再使用容器
    },
    chatList: {
        position: 'absolute',
        left: 16,
        width: screenWidth * 0.65,
        height: 190,
        zIndex: 1000,
    },
    chatListContent: {
        paddingBottom: 25,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 16,
        padding: 3,
        marginBottom: 4,
        // 让每条气泡按内容宽度渲染，而不是默认拉满列表宽度
        alignSelf: 'flex-start',
    },
    messageContentWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        minWidth: 0,
        // 由外层 chatList 的宽度限制整体最大宽度，这里不再强行拉满，按内容自适应
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    // 普通弹幕：左侧「主播」标签 + 右侧文案的容器
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // 普通弹幕：左侧标签外层容器，用于控制与右侧文案的间距
    messageRoleWrapper: {
        marginRight: 6,
    },
    // 普通弹幕：右侧文案容器，宽度随内容增长，超过一定宽度后内部 Text 换行
    messageTextWrapper: {
        flexShrink: 1,
        minWidth: 0,
        // 气泡最大宽度限制，短文案按内容宽度展示，长文案在达到上限后开始换行
        maxWidth: screenWidth * 0.65,
    },
    // 普通弹幕：右侧整体文案（昵称 + 内容），由右侧容器控制宽度
    messageText: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 16,
        // 允许在剩余空间内换行
        flexShrink: 1,
        minWidth: 0,
        // 不设置 maxWidth，由外层容器约束；Text 在右侧容器内达到最大宽度后换行
    },
    // 礼物消息容器：展示格式为 "xxx 送给 xx 什么礼物"
    nicknameContentGift: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 0,
        maxWidth: screenWidth * 0.65,
        width: '100%',
    },
    // 礼物消息文本（整体一行显示）
    giftMessageText: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    messageRight: {
        marginRight: 5,
    },
    messageRole: {
        backgroundColor: '#0468FC',
        borderRadius: 999,
        color: '#fff',
        paddingHorizontal: 7.5,
        paddingVertical: 2.5,
        fontSize: 10,
        overflow: 'hidden',
    },
    // 内联版「主播」标签（用于合并 Text 布局）
    messageRoleInline: {
        backgroundColor: '#0468FC',
        // 圆角拉满，保证完全是一个 pill 形状
        borderRadius: 999,
        color: '#fff',
        overflow: 'hidden',
        fontSize: 10,
        fontWeight: '600',
        // 再稍微缩小一圈，继续保留按钮感
        paddingHorizontal: 10,
        paddingVertical: 3,
        // 视觉对齐优化：减少字体自身的额外上下留白
        // @ts-ignore RN specific
        includeFontPadding: false,
    },
    chatNickname: {
        color: '#80BEF6',
        fontSize: 12,
        lineHeight: 12,
        paddingVertical: 2.5,
        flexShrink: 0,
    },
    chatNicknameInline: {
        color: '#80BEF6',
        fontSize: 12,
        lineHeight: 16,
    },
    // 礼物行容器：与 Vue 版本保持一致，支持换行
    giftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: screenWidth * 0.65 - 80, // 减去昵称宽度
        flex: 1,
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        paddingTop: 2,
        minWidth: 0,
    },
    giftIcon: {
        width: 12,
        height: 12,
        flexShrink: 0,
        margin: 0,
    },
    // 礼物接收者名称：与 Vue 版本保持一致
    giftRecipient: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 12,
        fontWeight: '500',
        zIndex: 999,
        paddingVertical: 1,
        marginRight: 0,
        minWidth: 0,
    },
    // 礼物名称：与 Vue 版本保持一致，支持换行
    giftName: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 12,
        fontWeight: '500',
        zIndex: 999,
        paddingVertical: 1,
        marginRight: 0,
        minWidth: 0,
        flexShrink: 1,
    },
    // 礼物前缀："送给我" 或 "送给"
    giftPrefix: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 12,
        fontWeight: '500',
        zIndex: 999,
        marginRight: 0,
    },
    // 礼物数量：与 Vue 版本保持一致
    giftCount: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 12,
        fontWeight: '500',
        zIndex: 999,
        marginLeft: 0,
    },
    chatContent: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 12,
        fontWeight: '500',
        zIndex: 999,
        paddingVertical: 2.5,
    },
    chatContentInline: {
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    toastContainer: {
        zIndex: 999,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(34, 38, 46, 0.4)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        height: 50,
        width: 160,
        borderRadius: 25,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#8B5CF6',
        marginRight: 8,
    },
    userDetails: {
        flexDirection: 'column',
        flex: 1,
        marginLeft: 8,
        marginRight: 8,
    },
    username: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        maxWidth: 80,
    },
    actionText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontWeight: '400',
        maxWidth: 60,
    },
    iconContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 40,
        height: 40,
    },
});

