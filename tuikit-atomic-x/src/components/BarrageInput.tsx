/**
 * BarrageInput Component
 * 弹幕输入框组件
 */

import React, { useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Dimensions,
    Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBarrageState } from '../atomic-x/state/BarrageState';

const screenWidth = Dimensions.get('window').width;

interface BarrageInputProps {
    liveID: string;
    onSend?: () => void;
}

export function BarrageInput({ liveID, onSend }: BarrageInputProps) {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState('');
    const { sendTextMessage, allowSendMessage } = useBarrageState(liveID);

    const handleSend = () => {
        // if (!inputValue.trim() || !allowSendMessage) {
        //     return;
        // }

        sendTextMessage({
            liveID: liveID,
            text: inputValue.trim(),
            onSuccess: () => {
                setInputValue('');
                onSend?.();
            },
            onError: (error) => {
                console.error('发送消息失败:', error);
            },
        });
    };

    // 当输入框失去焦点时关闭键盘
    const handleBlur = () => {
        Keyboard.dismiss();
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder={t('barrage.placeholder')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleSend}
                onBlur={handleBlur}
                returnKeyType="send"
                returnKeyLabel={t('barrage.send')}
                // editable={allowSendMessage}
                multiline={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: screenWidth * 0.3,
        marginRight: 16,
    },
    input: {
        backgroundColor: 'rgba(34, 38, 46, 0.5)',
        borderRadius: 36,
        height: 36,
        paddingHorizontal: 20,
        paddingVertical: 8,
        color: '#ffffff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
    },
});

