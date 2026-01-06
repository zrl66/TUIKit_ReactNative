/**
 * Static Resources Export
 * 静态资源导出文件
 * 
 * 注意：React Native 的 require 不支持从 node_modules 直接引用资源
 * 因此需要通过相对路径或配置 metro bundler
 */

// 导出静态图片资源路径映射
export const StaticImages = {
    // 通用图标
    'rtc-logo': require('./images/rtc-logo.png'),
    'close': require('./images/close.png'),
    'left-arrow': require('./images/left-arrow.png'),
    'back-black': require('./images/back-black.png'),

    // 直播相关
    'live-home': require('./images/live-home.png'),
    'live-mask': require('./images/live-mask.png'),
    'live-end': require('./images/live-end.png'),
    'live-gift': require('./images/live-gift.png'),
    'live-like': require('./images/live-like.png'),
    'live-more': require('./images/live-more.png'),
    'live-beauty': require('./images/live-beauty.png'),
    'live-effects': require('./images/live-effects.png'),
    'live-flip': require('./images/live-flip.png'),
    'live-request': require('./images/live-request.png'),
    'live-disconnect': require('./images/live-disconnect.png'),
    'live-dashboard': require('./images/live-dashboard.png'),
    'live-comic': require('./images/live-comic.png'),

    // 网络质量
    'network-good': require('./images/network-good.png'),

    // 设备控制
    'mute-mic': require('./images/mute-mic.png'),
    'unmute-mic': require('./images/unmute-mic.png'),
    'end-camera': require('./images/end-camera.png'),
    'start-camera': require('./images/start-camera.png'),
    'flip': require('./images/flip.png'),
    'hangup': require('./images/hangup.png'),
    'mirror': require('./images/mirror.png'),
    'flip-b': require('./images/flip-b.png'),

    // 连麦相关
    'link-host': require('./images/link-host.png'),
    'link-guest': require('./images/link-guest.png'),

    // 其他
    'dashboard': require('./images/dashboard.png'),
    'logout': require('./images/logout.png'),
    'mode': require('./images/mode.png'),
    'edit': require('./images/edit.png'),
    'right-arrow': require('./images/right-arrow.png'),
    'beauty': require('./images/beauty.png'),
    'sound-effect': require('./images/sound-effect.png'),
    'create-live': require('./images/create-live.png'),
    'kick-out-room': require('./images/kick-out-room.png'),

    // 美颜相关
    'beauty-close': require('./images/beauty-close.png'),
    'whiteness': require('./images/whiteness.png'),
    'smooth': require('./images/smooth.png'),
    'live-ruddy': require('./images/live-ruddy.png'),

    // 音效相关
    'no-effect': require('./images/no-effect.png'),
    'voice-wild': require('./images/voice-wild.png'),
    'voice-loli': require('./images/voice-loli.png'),
    'voice-uncle': require('./images/voice-uncle.png'),
    'voice-ghost': require('./images/voice-ghost.png'),
    'reverb-ktv': require('./images/reverb-ktv.png'),
    'reverb-metal': require('./images/reverb-metal.png'),
    'reverb-bass': require('./images/reverb-bass.png'),
    'reverb-bright': require('./images/reverb-bright.png'),

    // 点赞动画
    'gift_heart0': require('./images/gift_heart0.png'),
    'gift_heart1': require('./images/gift_heart1.png'),
    'gift_heart2': require('./images/gift_heart2.png'),
    'gift_heart3': require('./images/gift_heart3.png'),
    'gift_heart4': require('./images/gift_heart4.png'),
    'gift_heart5': require('./images/gift_heart5.png'),
    'gift_heart6': require('./images/gift_heart6.png'),
    'gift_heart7': require('./images/gift_heart7.png'),
    'gift_heart8': require('./images/gift_heart8.png'),
};

