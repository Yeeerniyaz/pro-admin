/**
 * @file App.js
 * @description Командный центр мобильного приложения PROADMIN (React Native v13.0.1 Enterprise).
 * ИСПРАВЛЕНО: Архитектура разделена на Root (Провайдеры) и Navigator (Логика) для устранения TypeError.
 * ДОБАВЛЕНО: Глобальная интеграция Socket.IO для мгновенных уведомлений о заказах.
 * 🔥 ИСПРАВЛЕНО (v13.0.1): Жесткая защита платформенного кода (Platform.OS). 
 * Добавлена передача projectId (Constants) в getExpoPushTokenAsync, чтобы избежать крашей в Expo Go.
 * НИКАКИХ УДАЛЕНИЙ: Весь навигационный стек сохранен на 100%.
 *
 * @module RootApp
 */

import React, { useEffect, useContext, useRef } from "react";
import { View, ActivityIndicator, StatusBar, Alert, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { io } from "socket.io-client";

// 🔥 Импорты для Push-уведомлений (Expo API)
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants'; // 🔥 ВАЖНО: Нужен для получения projectId
import API from "./src/api/api";

// Импорт архитектуры и шлюза
import { COLORS, GLOBAL_STYLES } from "./src/theme/theme";
import AuthContext, { AuthProvider } from "./src/context/AuthContext";

// Импорт реальных экранов и навигации
import LoginScreen from "./src/screens/LoginScreen";
import MainTabs from "./src/navigation/MainTabs";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import CreateOrderScreen from "./src/screens/CreateOrderScreen";
import BroadcastScreen from "./src/screens/BroadcastScreen";

// Конфигурация сервера
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
        lightColor: COLORS.primary, // Оранжевое свечение
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
        console.warn('❌ [Push] Не удалось получить разрешение на уведомления!');
        return null;
      }

      // 🔥 ИСПРАВЛЕНИЕ ПЛАТФОРМЕННОГО КРАША: Получаем projectId
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.warn('⚠️ [Push] Project ID не найден в конфигурации EAS/Expo. Токен может не сгенерироваться.');
      }

      // Передаем projectId в запрос (Обязательно для Expo 50+)
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;

      console.log("📲 [Push] Получен токен устройства:", token);
    } else {
      console.warn('⚠️ [Push] Для Push-уведомлений требуется физическое устройство (не эмулятор)');
    }
  } catch (error) {
    // Бронебойный catch: если пуши упадут, приложение все равно запустится!
    console.warn("❌ [Push] Ошибка платформы при инициализации уведомлений:", error.message);
  }

  return token;
}

/**
 * 🛰 ROOT NAVIGATOR: Логика навигации и WebSockets
 * Вынесен в отдельный компонент, чтобы useContext работал корректно внутри AuthProvider.
 */
function RootNavigator() {
  const { user, isLoading } = useContext(AuthContext);
  const notificationListener = useRef();
  const responseListener = useRef();

  // =============================================================================
  // 🚀 REAL-TIME СИНХРОНИЗАЦИЯ (SOCKETS & PUSH)
  // =============================================================================
  useEffect(() => {
    let socketInstance = null;

    if (user) {
      // 1. 🔔 ИНИЦИАЛИЗАЦИЯ PUSH-УВЕДОМЛЕНИЙ
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          // Отправляем токен на бэкенд для привязки к аккаунту
          API.registerPushToken(token)
            .then(() => console.log("✅ [Push] Токен успешно синхронизирован с сервером"))
            .catch(err => console.warn("❌ [Push] Ошибка синхронизации токена:", err.message));
        }
      });

      // Слушатель получения пуша (когда приложение открыто)
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log("🔔 [Push] Получено уведомление:", notification);
      });

      // Слушатель клика по пушу (из шторки уведомлений)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log("👉 [Push] Клик по уведомлению:", response);
      });

      // 2. 🔌 ИНИЦИАЛИЗАЦИЯ WEBSOCKETS
      socketInstance = io(SOCKET_URL, {
        transports: ["websocket"],
        forceNew: true, // Изолируем соединение для сессии
      });

      socketInstance.on("connect", () => {
        console.log("[Socket 🔌] Connected to ProElectric Real-Time Server");
      });

      // Глобальный слушатель обновлений объектов
      socketInstance.on("order_updated", (data) => {
        console.log("[Socket 📢] Order Update Received:", data);
      });

      // Слушатель обновлений мелкого ремонта
      socketInstance.on("minor_repair_updated", (data) => {
        console.log("[Socket 📢] Minor Repair Update Received:", data);
      });

      // Расширенный слушатель (Rich Alert)
      socketInstance.on("app_notification", (data) => {
        Alert.alert(data.title || "Уведомление", data.body || "У вас новые данные в системе");
      });

      // Слушатель новых заказов с биржи (legacy)
      socketInstance.on("new_order", (data) => {
        Alert.alert(
          "🔥 Новый заказ!",
          `Поступил новый лид на биржу ${data?.orderId ? '(#' + data.orderId + ')' : ''}. Проверьте список объектов.`
        );
      });

      socketInstance.on("disconnect", () => {
        console.log("[Socket 🔌] Disconnected");
      });
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]); // Сокет переподключается при смене пользователя

  // Экран загрузки (Splash)
  if (isLoading) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, GLOBAL_STYLES.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // =============================================================================
  // 🛠 РЕНДЕР СТЕКА НАВИГАЦИИ
  // =============================================================================
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // 🟢 ЗАЩИЩЕННАЯ ЗОНА (Main Enterprise Stack)
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
            <Stack.Screen name="Broadcast" component={BroadcastScreen} />
          </>
        ) : (
          // 🔴 ЗОНА АВТОРИЗАЦИИ (Login Step)
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * 📦 MAIN APP: Глобальная обертка провайдерами
 * Здесь нет бизнес-логики, только оболочка, чтобы контекст был доступен ниже.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}