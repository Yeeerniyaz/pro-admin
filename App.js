/**
 * @file App.js
 * @description Главный входной файл мобильного приложения (PROADMIN Mobile v15.3.0 Enterprise).
 * 🔥 ИСПРАВЛЕНО (v15.3.0): Жесткий фикс краша TypeError: removeNotificationSubscription is not a function. Используется .remove().
 * 🔥 ИСПРАВЛЕНО: Восстановлена полная структура (SafeAreaProvider, StatusBar, Constants) — код больше не урезан.
 * ДОБАВЛЕНО: Интеграция Expo Push Notifications с поддержкой EAS Project ID (Expo 50+).
 * ДОБАВЛЕНО: Глобальный контроллер Socket.IO для real-time уведомлений.
 * ДОБАВЛЕНО: Умный Splash Screen и бесшовный запуск приложения (Zero Latency).
 * НИКАКИХ УДАЛЕНИЙ: Вся базовая структура и логика входа сохранена на 100%. ПОЛНЫЙ КОД.
 *
 * @module App
 * @version 15.3.0 (Enterprise Core & Push Fixed Edition)
 */

import React, { useEffect, useContext, useRef, useState } from 'react';
import { View, ActivityIndicator, StatusBar, Platform, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants'; // 🔥 ВАЖНО: Нужен для получения projectId в сборках EAS
import { io } from 'socket.io-client';

// Контекст, API и Тема
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import API from './src/api/api';
import { COLORS, GLOBAL_STYLES } from './src/theme/theme';

// Экраны
import LoginScreen from './src/screens/LoginScreen';
import MainTabs from './src/navigation/MainTabs';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import CreateOrderScreen from './src/screens/CreateOrderScreen';
import BroadcastScreen from './src/screens/BroadcastScreen';

const SOCKET_URL = "https://erp.yeee.kz";
const Stack = createNativeStackNavigator();

// =============================================================================
// 🔔 КОНФИГУРАЦИЯ EXPO PUSH NOTIFICATIONS
// =============================================================================
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: COLORS.primary, // Фирменное оранжевое мигание
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
        console.warn('⛔ [Push] Нет прав на уведомления');
        return null;
      }

      // 🔥 Надежное получение projectId (для новых версий Expo и EAS Build)
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.warn('⚠️ [Push] Project ID не найден. Убедитесь, что eas.json настроен.');
      }

      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;

      console.log("📲 [Push Token получен]:", token);
    } else {
      console.warn('⚠️ [Push] Для Push-уведомлений требуется физическое устройство (не эмулятор)');
    }
  } catch (error) {
    console.warn("❌ [Push] Ошибка инициализации уведомлений:", error.message);
  }

  return token;
}

// =============================================================================
// 🧭 КОРНЕВОЙ НАВИГАТОР (УПРАВЛЯЕТ ЛОГИКОЙ ВХОДА И СОКЕТАМИ)
// =============================================================================
const RootNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Рефы для подписок (чтобы правильно их убивать)
  const socketRef = useRef(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  // 1. Умное скрытие Splash Screen
  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        if (!isLoading) {
          setIsAppReady(true);
          await SplashScreen.hideAsync();
        }
      }
    }
    prepare();
  }, [isLoading]);

  // 2. Глобальные слушатели (Socket & Push) активируются только при успешном входе
  useEffect(() => {
    if (user) {
      // --- РЕГИСТРАЦИЯ PUSH-УВЕДОМЛЕНИЙ ---
      registerForPushNotificationsAsync().then(token => {
        if (token && typeof API.registerPushToken === 'function') {
          API.registerPushToken(token)
            .then(() => console.log("✅ [Push] Токен отправлен на сервер"))
            .catch((err) => console.log('Сбой отправки токена:', err));
        }
      });

      // Слушатель получения пуша (когда приложение открыто)
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log("🔔 [Push] Получено уведомление в фоне");
      });

      // Слушатель тапа по пушу (пользователь нажал на уведомление)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log("👉 [Push] Тап по пушу, данные:", response.notification.request.content.data);
      });

      // --- ИНИЦИАЛИЗАЦИЯ СОКЕТОВ ---
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'],
        forceNew: true,
      });

      socketRef.current.on('connect', () => {
        console.log('[Socket 🔌] Connected to ERP Real-Time Server');
      });

      socketRef.current.on('new_order', (data) => {
        Alert.alert(
          '🔥 Новый объект на бирже!', 
          'Появился новый вызов. Перейдите во вкладку "Объекты/Биржа", чтобы забрать его первым.'
        );
      });

      socketRef.current.on('app_notification', (data) => {
        Alert.alert(data.title || 'Уведомление', data.body || 'У вас новые данные в системе');
      });

      socketRef.current.on('disconnect', () => {
        console.log('[Socket 🔌] Disconnected');
      });

      // 🔥 ИСПРАВЛЕНО: Идеальная очистка подписок для Expo 50+
      return () => {
        if (notificationListener.current) {
          notificationListener.current.remove(); // Вызываем метод remove() у самого объекта подписки
        }
        if (responseListener.current) {
          responseListener.current.remove();     // Вызываем метод remove() у самого объекта подписки
        }
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user]);

  // Заглушка, пока идет расшифровка сессии (Zero Latency Loader)
  if (!isAppReady || isLoading) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, GLOBAL_STYLES.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // =============================================================================
  // 🗺 ГЛАВНАЯ СТРУКТУРА ЭКРАНОВ
  // =============================================================================
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {user ? (
        <>
          {/* Главное меню с табами (Обзор, Объекты, Касса и т.д.) */}
          <Stack.Screen name="Main" component={MainTabs} />
          
          {/* Экраны деталей лежат ПОВЕРХ табов, скрывая нижнее меню */}
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
          <Stack.Screen name="Broadcast" component={BroadcastScreen} />
        </>
      ) : (
        // Экран авторизации
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

// =============================================================================
// 📦 MAIN APP (Толстая глобальная обертка провайдерами)
// =============================================================================
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}