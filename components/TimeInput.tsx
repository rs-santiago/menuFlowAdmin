import React from 'react';
import { StyleSheet, TextInput } from 'react-native';

interface TimeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean; // Nova propriedade para feedback visual
}

export default function TimeInput({ 
  value, 
  onChangeText, 
  placeholder = "00:00", 
  disabled = false,
  hasError = false
}: TimeInputProps) {
  
  const handleTextChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length > 4) {
      cleaned = cleaned.substring(0, 4);
    }

    let formatted = cleaned;
    
    // Aplica as regras de hora válida (00 a 23) e minutos (00 a 59)
    if (cleaned.length >= 2) {
      let hours = cleaned.substring(0, 2);
      let minutes = cleaned.substring(2, 4);

      // Trava as horas no máximo em 23
      if (parseInt(hours, 10) > 23) hours = '23';
      
      // Trava os minutos no máximo em 59
      if (minutes.length === 2 && parseInt(minutes, 10) > 59) {
        minutes = '59';
      }

      formatted = minutes ? `${hours}:${minutes}` : hours;
      // Coloca os dois pontos automaticamente
      if (cleaned.length > 2) {
         formatted = `${hours}:${minutes}`;
      }
    }

    onChangeText(formatted);
  };

  return (
    <TextInput
      style={[
        styles.input, 
        disabled && styles.inputDisabled,
        hasError && styles.inputError, // Aplica estilo de erro se houver
        { color: disabled ? '#666' : (value ? '#FFF' : '#666') } 
      ]}
      value={value}
      onChangeText={handleTextChange}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor="#444"
      maxLength={5} 
      editable={!disabled}
      selectTextOnFocus={true} 
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 70,
  },
  inputDisabled: {
    backgroundColor: '#0A0A0A',
    borderColor: '#171717',
    opacity: 0.5,
  },
  inputError: {
    borderColor: '#EF4444', // Vermelho para indicar erro
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  }
});