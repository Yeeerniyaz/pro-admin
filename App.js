/**
 * @file App.js
 * @description Командный центр мобильного приложения PROADMIN (React Native v11.0.19 Enterprise).
 * Отвечает за инициализацию, проверку сессии (Auth Flow), навигацию и Real-Time сокеты.
 * ДОБАВЛЕНО: Глобальная интеграция Socket.IO для мгновенных уведомлений о заказах.
 * ДОБАВЛЕНО: Автоматическое управление жизненным циклом сокета (Connect/Disconnect).
 * ДОБАВЛЕНО: OLED-совместимый StatusBar (Pure Black).
 * НИКАКИХ УДАЛЕНИЙ И СОКРАЩЕНИЙ: Весь навигационный стек сохранен на 100%.
 *
 * @module RootApp
 */

import React, { useState, useEffect, useMemo } from "react";
import { View, ActivityIndicator, StatusBar, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { io } from "socket.io-client"; // 🔥 ДОБАВЛЕНО: Socket.IO клиент

// Импорт архитектуры и шлюза
import { API } from "./src/api/api";
import { COLORS, GLOBAL_STYLES } from "./src/theme/theme";
import { AuthContext } from "./src/context/AuthContext";

// Импорт реальных экранов и навигации
import LoginScreen from "./src/screens/LoginScreen";
import MainTabs from "./src/navigation/MainTabs";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import CreateOrderScreen from "./src/screens/CreateOrderScreen";
import BroadcastScreen from "./src/screens/BroadcastScreen";

// Конфигурация сервера
const SOCKET_URL = "https://erp.yeee.kz";
const Stack = createNativeStackNavigator();

export default function App() {
  // 1. СОСТОЯНИЯ ЖИЗНЕННОГО ЦИКЛА
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);

  // =============================================================================
  // 🚀 2. REAL-TIME СИНХРОНИЗАЦИЯ (SOCKETS)
  // =============================================================================

  useEffect(() => {
    let socketInstance = null;

    if (user) {
      // Инициализируем соединение при входе
      socketInstance = io(SOCKET_URL, {
        transports: ["websocket"],
        jsonp: false,
      });

      socketInstance.on("connect", () => {
        console.log("[Socket 🔌] Connected to ProElectric Real-Time Server");
      });

      // Глобальный слушатель обновлений объектов
      socketInstance.on("order_updated", (data) => {
        console.log("[Socket 📢] Order Update Received:", data);
        // Здесь можно добавить Toast-уведомление или системный звук
      });

      // Слушатель новых заказов с биржи
      socketInstance.on("new_order", (data) => {
        Alert.alert("🔥 Новый заказ!", `Поступил новый лид на биржу. Проверьте список объектов.`);
      });

      setSocket(socketInstance);
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        console.log("[Socket 🔌] Disconnected");
      }
    };
  }, [user]);

  // =============================================================================
  // 🔐 3. АВТОРИЗАЦИЯ И ПРОВЕРКА СЕССИИ
  // =============================================================================

  useEffect(() => {
    async function initAuth() {
      try {
        const res = await API.checkAuth();
        if (res.authenticated) {
          setUser(res.user);
        }
      } catch (e) {
        console.log("[App 🛡️] Session not found or expired");
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  // Мемоизация контекста для оптимизации рендеринга
  const authContextValue = useMemo(() => ({
    user,
    isLoading,
    login: async (login, pass) => {
      const res = await API.login(login, pass);
      if (res.success) setUser(res.user);
      return res;
    },
    requestOtp: async (phone) => await API.requestOtp(phone),
    verifyOtp: async (phone, otp) => {
      const res = await API.verifyOtp(phone, otp);
      if (res.success && res.user) setUser(res.user);
      return res;
    },
    logout: async () => {
      try { await API.logout(); } catch (e) { }
      setUser(null);
    }
  }), [user, isLoading]);

  // Экран загрузки (Splash)
  if (isLoading) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, GLOBAL_STYLES.center]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isAuthenticated = !!user;

  // =============================================================================
  // 🛠 4. ГЛАВНЫЙ РЕНДЕР (NAVIGATION STACK)
  // =============================================================================
  return (
    <AuthContext.Provider value={authContextValue}>
      <SafeAreaProvider>
        {/* OLED StatusBar для экономии батареи и стиля */}
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              // 🟢 ЗАЩИЩЕННАЯ ЗОНА (Main Enterprise Stack)
              <>
                {/* Главные табы (Dashboard, Orders, Finance, Users, Settings) */}
                <Stack.Screen name="Main" component={MainTabs} />

                {/* Глобальные экраны (Details & Actions) */}
                <Stack.Screen
                  name="OrderDetail"
                  component={OrderDetailScreen}
                />
                <Stack.Screen
                  name="CreateOrder"
                  component={CreateOrderScreen}
                />
                <Stack.Screen
                  name="Broadcast"
                  component={BroadcastScreen}
                />
              </>
            ) : (
              // 🔴 ЗОНА АВТОРИЗАЦИИ (Login Step)
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}