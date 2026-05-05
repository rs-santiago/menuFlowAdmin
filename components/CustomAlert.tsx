import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  iconName?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function CustomAlert({
  visible,
  title,
  message,
  iconName = 'alert-circle',
  iconColor = '#F59E0B', 
  confirmText = 'OK',
  cancelText = 'CANCELAR',
  showCancel = false,
  onConfirm,
  onCancel,
}: CustomAlertProps) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  return (
    <Modal 
      animationType="fade" 
      transparent={true} 
      visible={visible} 
      onRequestClose={onCancel || onConfirm}
    >
      <Pressable style={styles.overlay} onPress={onCancel || onConfirm}>
        {/* Adicionada largura máxima para Desktop */}
        <Pressable 
          style={[
            styles.dialog, 
            isLargeScreen && styles.dialogDesktop
          ]} 
          onPress={(e) => e.stopPropagation()}
        >
          
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15`, borderColor: `${iconColor}30` }]}>
            <Feather name={iconName} size={32} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonsRow}>
            {showCancel && (
              <TouchableOpacity style={styles.btnSecondary} onPress={onCancel}>
                <Text style={styles.btnSecondaryText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[
                styles.btnPrimary, 
                showCancel ? { width: '48%' } : { width: '100%' }, 
                { backgroundColor: iconColor }
              ]} 
              onPress={onConfirm}
            >
              <Text style={styles.btnPrimaryText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  dialog: {
    backgroundColor: '#171717',
    width: '100%',
    borderRadius: 25,
    padding: 25,
    paddingTop: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0px 15px 35px rgba(0,0,0,0.5)',
      }
    }),
  },
  // Limita a largura no Desktop para não ficar esticado
  dialogDesktop: {
    maxWidth: 400,
  },
  iconContainer: {
    padding: 15,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: '#AAA',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  btnSecondary: {
    backgroundColor: '#262626',
    paddingVertical: 14,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});