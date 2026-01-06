/**
 * ConfirmDialog Component
 * 通用确认弹窗组件
 *
 * @format
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
    visible: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    visible,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const { t } = useTranslation();
    
    if (!visible) {
        return null;
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {title && (
                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText}>{title}</Text>
                        </View>
                    )}
                    <View style={styles.content}>
                        <Text style={styles.messageText}>{message}</Text>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnCancel]}
                            onPress={onCancel}
                            activeOpacity={0.7}>
                            <Text style={styles.btnCancelText}>{cancelText || t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnConfirm]}
                            onPress={onConfirm}
                            activeOpacity={0.7}>
                            <Text style={styles.btnConfirmText}>{confirmText || t('common.confirm')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    modal: {
        width: 250,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        overflow: 'hidden',
    },
    titleContainer: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 10,
        alignItems: 'center',
    },
    titleText: {
        color: '#000000',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    messageText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(213, 224, 242, 1)',
    },
    btn: {
        flex: 1,
        padding: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnCancel: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(213, 224, 242, 1)',
    },
    btnConfirm: {},
    btnCancelText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'rgba(79, 88, 107, 1)',
    },
    btnConfirmText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'rgba(43, 106, 214, 1)',
    },
});

