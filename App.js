/**
 * @file App.js
 * @description Корневой компонент приложения ProElectric (PROADMIN Mobile v10.0.0).
 * UPGRADES (Senior):
 * - Интеграция Stack Navigator поверх Tab Navigator.
 * - Регистрация всех модальных и детальных экранов.
 * - Глобальная обработка Safe Area и Status Bar.
 * - Плавные переходы (Animations).
 *
 * @module App
 */

import React from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// 1. Импорт контекста авторизации
import { AuthProvider, useAuth } from "./src/context/AuthContext";

// 2. Импорт навигации
import MainTabs from "./src/navigation/MainTabs";

// 3. Импорт экранов
import LoginScreen from "./src/screens/LoginScreen";
// Экраны, которые открываются ПОВЕРХ табов (Stack)
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import CreateOrderScreen from "./src/screens/CreateOrderScreen";
import BroadcastScreen from "./src/screens/BroadcastScreen";

// 4. Импорт темы
import { COLORS } from "./src/theme/theme";

const Stack = createNativeStackNavigator();

/**
 * @component AppNavigator
 * @description Управляет логикой "Вход vs Приложение" на основе токена.
 */
const AppNavigator = () => {
  const { user, loading } = useAuth();

  // Пока проверяем токен в SecureStore/AsyncStorage — показываем сплэш или лоадер
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Мы используем свои кастомные хедеры внутри экранов
        animation: "slide_from_right", // Стандартная анимация переходов iOS/Android
        // Для iOS можно включить жест "свайп назад"
        gestureEnabled: true,
      }}
    >
      {user ? (
        // === ЗОНА АВТОРИЗОВАННОГО ПОЛЬЗОВАТЕЛЯ ===
        <>
          {/* Главный экран с табами */}
          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* Детальные экраны (Push Navigation) */}
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="CreateOrder"
            component={CreateOrderScreen}
            options={{
              animation: "slide_from_bottom", // Открываем снизу как модалку (UX pattern)
              presentation: "modal", // На iOS это даст нативный вид модалки
            }}
          />
          <Stack.Screen
            name="Broadcast"
            component={BroadcastScreen}
            options={{ animation: "fade" }}
          />
        </>
      ) : (
        // === ЗОНА ГОСТЯ ===
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animationTypeForReplace: "pop" }}
        />
      )}
    </Stack.Navigator>
  );
};

/**
 * @component App
 * @description Корневая обертка с провайдерами.
 */
export default function App() {
  return (
    // GestureHandlerRootView нужен для корректной работы жестов (Swipe, Scroll)
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* Настройка статус-бара под дизайн */}
          <StatusBar
            barStyle={Platform.OS === "ios" ? "dark-content" : "dark-content"}
            backgroundColor={COLORS.background}
            translucent={false} // Чтобы не налезал на контент на Android
          />

          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// =============================================================================
// 🎨 GLOBAL STYLES
// =============================================================================
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
