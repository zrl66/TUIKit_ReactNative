/**
 * Like Component
 * 点赞组件 - 支持点赞动画和批量发送
 * 
 * @format
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    TouchableOpacity,
    Image,
    StyleSheet,
    View,
    Animated,
} from 'react-native';
import { useLikeState } from '../atomic-x/state/LikeState';
import { useLoginState } from '../atomic-x/state/LoginState';

interface LikeProps {
    liveID: string;
    role?: 'anchor' | 'audience';
    maxConcurrent?: number;
}

interface LikeAnimation {
    id: number;
    translateY: Animated.Value;
    opacity: Animated.Value;
    scale: Animated.Value;
    left: number;
    imageIndex: number;
}

// 心形图片数组
const heartImages = [
    require('../static/images/gift_heart0.png'),
    require('../static/images/gift_heart1.png'),
    require('../static/images/gift_heart2.png'),
    require('../static/images/gift_heart3.png'),
    require('../static/images/gift_heart4.png'),
    require('../static/images/gift_heart5.png'),
    require('../static/images/gift_heart6.png'),
    require('../static/images/gift_heart7.png'),
    require('../static/images/gift_heart8.png'),
];

const CLICK_INTERVAL = 100; // 点击间隔时间（毫秒）
const BATCH_DELAY = 6000; // 6秒批量发送延迟
const FIXED_ANIMATION_COUNT = 3; // 固定创建3个动画

export function Like({
    liveID,
    role = 'audience',
    maxConcurrent = 20,
}: LikeProps) {
    const { sendLike, addLikeListener, removeLikeListener } = useLikeState(liveID);
    const { loginUserInfo } = useLoginState();

    const [likeAnimations, setLikeAnimations] = useState<LikeAnimation[]>([]);
    const likeAnimationIdRef = useRef(0);
    const lastClickTimeRef = useRef(0);
    const pendingLikeCountRef = useRef(0);
    const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSendTimeRef = useRef(0);
    const isFirstClickRef = useRef(true);

    // 随机选择心形图片索引
    const getRandomHeartImageIndex = useCallback(() => {
        return Math.floor(Math.random() * heartImages.length);
    }, []);

    // 创建点赞动画
    const createLikeAnimation = useCallback((_count: number = FIXED_ANIMATION_COUNT) => {
        const actualCount = Math.min(FIXED_ANIMATION_COUNT, maxConcurrent);

        const newAnimations: LikeAnimation[] = [];

        for (let i = 0; i < actualCount; i++) {
            const id = ++likeAnimationIdRef.current;
            const translateY = new Animated.Value(0);
            const opacity = new Animated.Value(1);
            const scale = new Animated.Value(0.8);

            const newLike: LikeAnimation = {
                id,
                translateY,
                opacity,
                scale,
                left: Math.random() * 120 + 40, // 随机水平位置
                imageIndex: getRandomHeartImageIndex(),
            };

            newAnimations.push(newLike);

            // 延迟启动动画，避免同时出现
            setTimeout(() => {
                // 动画序列：向上移动并逐渐消失
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(translateY, {
                            toValue: -200,
                            duration: 1200,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 1200,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(scale, {
                            toValue: 1.2,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scale, {
                            toValue: 0.5,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                ]).start(() => {
                    // 动画结束后移除
                    setLikeAnimations((prev) => prev.filter((item) => item.id !== id));
                });
            }, i * 100);
        }

        // 控制最大并发，如果超过限制则移除最旧的
        setLikeAnimations((prev) => {
            const combined = [...prev, ...newAnimations];
            if (combined.length > maxConcurrent) {
                return combined.slice(-maxConcurrent);
            }
            return combined;
        });
    }, [maxConcurrent, getRandomHeartImageIndex]);

    // 批量发送点赞
    const sendBatchLikes = useCallback(() => {
        if (pendingLikeCountRef.current > 0) {
            console.log('=== 批量发送点赞 ===');
            console.log('发送数量:', pendingLikeCountRef.current);

            sendLike({
                liveID,
                count: pendingLikeCountRef.current,
                onSuccess: () => {
                    console.log('批量sendLike success, count:', pendingLikeCountRef.current);
                    lastSendTimeRef.current = Date.now();
                    isFirstClickRef.current = false;
                },
                onError: (error) => {
                    console.error('批量sendLike failed:', error);
                },
            });

            pendingLikeCountRef.current = 0;
        }

        if (batchTimerRef.current) {
            clearTimeout(batchTimerRef.current);
            batchTimerRef.current = null;
        }
    }, [sendLike, liveID]);

    // 处理点赞点击事件
    const handleLikeClick = useCallback(() => {
        console.log('=== 点赞点击事件开始 ===');

        // 添加点击间隔控制
        const currentTime = Date.now();
        if (currentTime - lastClickTimeRef.current < CLICK_INTERVAL) {
            console.log('点击间隔太短，跳过本次点击');
            return;
        }
        lastClickTimeRef.current = currentTime;

        // 智能发送策略
        const timeSinceLastSend = currentTime - lastSendTimeRef.current;
        const shouldSendImmediately = isFirstClickRef.current || timeSinceLastSend >= BATCH_DELAY;

        console.log('智能发送判断:', {
            isFirstClick: isFirstClickRef.current,
            timeSinceLastSend: timeSinceLastSend,
            shouldSendImmediately: shouldSendImmediately,
        });

        // 累积点赞数量
        pendingLikeCountRef.current += 1;

        if (shouldSendImmediately) {
            // 第一次点击或距离上次发送超过6秒，立即发送
            console.log('立即发送点赞');
            sendBatchLikes();
            console.log('立即发送，显示动画');
            createLikeAnimation(FIXED_ANIMATION_COUNT);
        } else {
            // 距离上次发送不足6秒，累积并设置定时器
            console.log('累积点赞，设置延迟发送');
            console.log('6秒内点击，不显示动画，只累积数量');

            // 清除之前的定时器
            if (batchTimerRef.current) {
                clearTimeout(batchTimerRef.current);
            }

            // 计算剩余等待时间
            const remainingTime = BATCH_DELAY - timeSinceLastSend;
            console.log('剩余等待时间:', remainingTime, 'ms');

            // 设置剩余时间的定时器
            batchTimerRef.current = setTimeout(() => {
                sendBatchLikes();
                console.log('批量发送，显示动画');
                createLikeAnimation(FIXED_ANIMATION_COUNT);
            }, remainingTime);
        }

        console.log('=== 点赞点击事件结束 ===');
    }, [sendBatchLikes, createLikeAnimation]);

    // 处理接收到的点赞消息
    const handleReceiveLikesMessage = useCallback((params?: unknown) => {
        try {
            // 解析参数
            let data: any;
            if (typeof params === 'string') {
                data = JSON.parse(params);
            } else if (params && typeof params === 'object') {
                data = params;
            } else {
                return;
            }

            // 解析 sender 信息（sender 可能是 JSON 字符串）
            let sender: any = null;
            if (data.sender) {
                if (typeof data.sender === 'string') {
                    try {
                        sender = JSON.parse(data.sender);
                    } catch {
                        // 如果解析失败，尝试直接使用
                        sender = data.sender;
                    }
                } else {
                    sender = data.sender;
                }
            }

            // 如果发送人是自己，不显示动画（自己的点赞已经在点击时显示了动画）
            if (sender?.userID && loginUserInfo?.userID && sender.userID === loginUserInfo.userID) {
                console.log('收到自己的点赞消息，跳过动画');
                return;
            }

            console.log('收到其他用户的点赞消息，显示动画');
            createLikeAnimation(FIXED_ANIMATION_COUNT);
        } catch (error) {
            console.error('处理点赞消息失败:', error);
        }
    }, [createLikeAnimation, loginUserInfo?.userID]);

    // 监听点赞消息
    useEffect(() => {
        if (!liveID) return;

        addLikeListener('onReceiveLikesMessage', handleReceiveLikesMessage);

        return () => {
            removeLikeListener('onReceiveLikesMessage');
            // 清理定时器
            if (batchTimerRef.current) {
                clearTimeout(batchTimerRef.current);
                batchTimerRef.current = null;
            }
            // 组件卸载时发送待发送的点赞
            if (pendingLikeCountRef.current > 0) {
                console.log('组件卸载，发送待发送的点赞（不显示动画）');
                sendBatchLikes();
            }
        };
    }, [liveID, addLikeListener, removeLikeListener, handleReceiveLikesMessage, sendBatchLikes]);

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* 点赞按钮 - 只有观众端显示 */}
            {role !== 'anchor' && (
            <TouchableOpacity
                style={styles.likeButton}
                onPress={handleLikeClick}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Image
                    source={require('../static/images/live-like.png')}
                    style={styles.likeIcon}
                    resizeMode="contain"
                />
            </TouchableOpacity>
            )}

            {/* 点赞动画容器 - 主播和观众都显示 */}
            {likeAnimations.length > 0 && (
                <View style={styles.animationsContainer} pointerEvents="none">
                    {likeAnimations.map((like) => (
                        <Animated.View
                            key={like.id}
                            style={[
                                styles.likeAnimation,
                                {
                                    left: like.left,
                                    transform: [
                                        { translateY: like.translateY },
                                        { scale: like.scale },
                                    ],
                                    opacity: like.opacity,
                                },
                            ]}>
                            <Image
                                source={heartImages[like.imageIndex]}
                                style={styles.heartIcon}
                                resizeMode="contain"
                            />
                        </Animated.View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: 32,
        height: 32,
        // 确保动画容器不被裁剪（动画容器需要更大的空间）
        overflow: 'visible',
    },
    likeButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
        zIndex: 1000,
    },
    likeIcon: {
        width: 32,
        height: 32,
    },
    animationsContainer: {
        position: 'absolute',
        bottom: 40,
        right: 40,
        width: 200,
        height: 300,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
    },
    likeAnimation: {
        position: 'absolute',
        bottom: 0,
        width: 30,
        height: 30,
        pointerEvents: 'none',
    },
    heartIcon: {
        width: 30,
        height: 30,
    },
});
