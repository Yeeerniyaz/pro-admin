/**
 * @file App.js
 * @description Командный центр мобильного приложения PROADMIN (React Native v11.0.21 Enterprise).
 * ИСПРАВЛЕНО: Архитектура разделена на Root (Провайдеры) и Navigator (Логика) для устранения TypeError.
 * ДОБАВЛЕНО: Глобальная интеграция Socket.IO для мгновенных уведомлений о заказах.
 * НИКАКИХ УДАЛЕНИЙ: Весь навигационный стек сохранен на 100%.
 *
 * @module RootApp
 */

import React, { useEffect, useContext } from "react";
import { View, ActivityIndicator, StatusBar, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { io } from "socket.io-client"; // 🔥 Подключаем Socket.IO клиент

// Импорт архитектуры и шлюза
import { COLORS, GLOBAL_STYLES } from "./src/theme/theme";
import AuthContext, { AuthProvider } from "./src/context/AuthContext"; // 🔥 Правильный импорт

// Импорт реальных экранов и навигации
import LoginScreen from "./src/screens/LoginScreen";
import MainTabs from "./src/navigation/MainTabs";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import CreateOrderScreen from "./src/screens/CreateOrderScreen";
import BroadcastScreen from "./src/screens/BroadcastScreen";

// Конфигурация сервера
const SOCKET_URL = "https://erp.yeee.kz";
const Stack = createNativeStackNavigator();

/**
 * 🛰 ROOT NAVIGATOR: Логика навигации и WebSockets
 * Вынесен в отдельный компонент, чтобы useContext работал корректно внутри AuthProvider.
 */
function RootNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  // =============================================================================
  // 🚀 REAL-TIME СИНХРОНИЗАЦИЯ (SOCKETS)
  // =============================================================================
  useEffect(() => {
    let socketInstance = null;

    if (user) {
      // Инициализируем соединение при входе
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

      // Слушатель новых заказов с биржи
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