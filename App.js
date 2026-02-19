/**
 * @file App.js
 * @description Командный центр мобильного приложения PROADMIN (React Native v10.0.0).
 * Отвечает за инициализацию, проверку сессии (Auth Flow) и маршрутизацию.
 * ИСПРАВЛЕНО: Устранены кольцевые зависимости (Require Cycles) путем выноса AuthContext.
 *
 * @module RootApp
 */

import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Импорт архитектуры и шлюза
import { API } from "./src/api/api";
import { COLORS, GLOBAL_STYLES } from "./src/theme/theme";
import { AuthContext } from "./src/context/AuthContext"; // 🔥 Импорт чистого контекста

// Импорт реальных экранов и навигации
import LoginScreen from "./src/screens/LoginScreen";
import MainTabs from "./src/navigation/MainTabs";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import CreateOrderScreen from "./src/screens/CreateOrderScreen";

// Инициализация навигатора
const Stack = createNativeStackNavigator();

export default function App() {
  // Состояния жизненного цикла приложения
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 1. Проверка сессии при холодном старте
  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await API.checkAuth();
        if (res.authenticated) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.log(
          "[App Boot] Сессия не найдена или истекла. Требуется логин.",
        );
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false); // Снимаем экран загрузки в любом случае
      }
    };

    verifySession();
  }, []);

  // 2. Глобальные методы управления сессией
  const authContextValue = {
    signIn: () => setIsAuthenticated(true),
    signOut: async () => {
      setIsLoading(true);
      try {
        await API.logout();
      } catch (e) {
        console.error("[App Auth] Ошибка при выходе:", e);
      } finally {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    },
  };

  // 3. Экран холодной загрузки (Splash Screen / Boot)
  if (isLoading) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, GLOBAL_STYLES.center]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // 4. Главный рендер с Conditional Routing
  return (
    <AuthContext.Provider value={authContextValue}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              // 🟢 ЗАЩИЩЕННАЯ ЗОНА (Main App)
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen
                  name="OrderDetail"
                  component={OrderDetailScreen}
                />
                <Stack.Screen
                  name="CreateOrder"
                  component={CreateOrderScreen}
                />
              </>
            ) : (
              // 🔴 ЗОНА АВТОРИЗАЦИИ (Auth Flow)
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}
