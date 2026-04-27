import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configura como a notificação aparece com o app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permissão negada para notificações.');
      return null;
    }
    
    // Tenta pegar o ID, mas sem forçar
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    // Se não tiver conta/projeto configurado, a gente aborta a missão em paz
    if (!projectId) {
      console.log('⚠️ Sem projectId configurado. Pulando geração de Token Push para evitar crash.');
      return null;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log("Token gerado:", token);
    } catch (error) {
      console.warn('⚠️ Erro ao gerar Push Token. (Normal no Expo Go com SDK 53+)', error);
    }
    
  } else {
    console.log('Notificações Push só funcionam em dispositivos físicos.');
  }

  return token;
}