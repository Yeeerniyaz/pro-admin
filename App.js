/**
 * @file App.js
 * @description Командный центр мобильного приложения PROADMIN (React Native v10.0.0).
 * Отвечает за инициализацию, проверку сессии (Auth Flow) и маршрутизацию (React Navigation).
 * Реализован паттерн глобального контекста авторизации (Enterprise Best Practice).
 *
 * @module RootApp
 */

import React, { useState, useEffect, createContext } from "react";
import {
  View,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Импорт архитектуры и шлюза
import { API } from "./src/api/api";
import { COLORS, GLOBAL_STYLES } from "./src/theme/theme";

// Импорт экранов
import LoginScreen from "./src/screens/LoginScreen";
// import DashboardScreen from './src/screens/DashboardScreen'; // Раскомментируем на следующем шаге

// =============================================================================
// 🚧 ВРЕМЕННАЯ ЗАГЛУШКА ДЛЯ ДАШБОРДА (Чтобы App.js не падал до создания экрана)
// =============================================================================
const DashboardStub = () => {
  const { signOut } = React.useContext(AuthContext);
  return (
    <View style={[GLOBAL_STYLES.safeArea, GLOBAL_STYLES.center]}>
      <Text style={GLOBAL_STYLES.h1}>PROADMIN v10.0</Text>
      <Text style={[GLOBAL_STYLES.textMuted, { marginBottom: 20 }]}>
        Загрузка модуля Dashboard...
      </Text>
      <Text style={{ color: COLORS.primary, padding: 10 }} onPress={signOut}>
        [ Выйти из системы ]
      </Text>
    </View>
  );
};

// Инициализация навигатора
const Stack = createNativeStackNavigator();

// Создаем глобальный контекст авторизации
export const AuthContext = createContext();

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

  // 2. Глобальные методы управления сессией (передаются через Context)
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
              // Замени DashboardStub на DashboardScreen после его создания
              <Stack.Screen name="Dashboard" component={DashboardStub} />
            ) : (
              // 🔴 ЗОНА АВТОРИЗАЦИИ (Auth Flow)
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                // Прокидываем метод signIn в параметры маршрута (как мы и написали в LoginScreen)
                initialParams={{ onLoginSuccess: authContextValue.signIn }}
              />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}
