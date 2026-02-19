/**
 * @file src/screens/LoginScreen.js
 * @description Экран авторизации (PROADMIN Mobile v11.0.3).
 * ИСПРАВЛЕНО: Убит баг прыгающей клавиатуры на Android.
 * Убрано выравнивание justifyContent: center из ScrollView (которое сбивало фокус),
 * JSX встроен напрямую в рендер для стабильности дерева компонентов React.
 *
 * @module LoginScreen
 */

import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from "react-native";
import { User, Lock, Zap } from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeButton, PeInput, PeCard } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

// Строгий импорт контекста
import { AuthContext } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useContext(AuthContext);

  // Состояния формы
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  // Состояния интерфейса
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Обработчик нажатия кнопки "Войти"
   */
  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      setError("Пожалуйста, введите логин и пароль");
      return;
    }

    Keyboard.dismiss();
    setError(null);
    setLoading(true);

    try {
      await API.login(login, password);
      signIn();
    } catch (err) {
      setError(err.message || "Ошибка авторизации. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР
  // =============================================================================
  return (
    <KeyboardAvoidingView
      style={GLOBAL_STYLES.safeArea}
      // Для iOS нужен padding, для Android отключаем (система сдвинет сама)
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollGrow}
        keyboardShouldPersistTaps="handled" // Идеально для инпутов и кнопок
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          {/* Декоративный фон (Glow Effect) */}
          <View style={styles.glowBackground} />

          {/* Карточка входа */}
          <PeCard elevated={true} style={styles.authCard}>
            {/* Логотип и Заголовок */}
            <View style={styles.headerContainer}>
              <View style={styles.logoIcon}>
                <Zap color="#fff" size={28} />
              </View>
              <Text style={GLOBAL_STYLES.h1}>ProElectric</Text>
              <Text style={GLOBAL_STYLES.textMuted}>
                Enterprise Mobile ERP v11.0
              </Text>
            </View>

            {/* Блок вывода ошибок */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Форма */}
            <View style={styles.formContainer}>
              <PeInput
                label="Логин системы"
                placeholder="Введите логин"
                value={login}
                onChangeText={setLogin}
                autoCapitalize="none"
                autoCorrect={false}
                icon={<User color={COLORS.textMuted} size={20} />}
              />

              <PeInput
                label="Ключ доступа"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                icon={<Lock color={COLORS.textMuted} size={20} />}
              />
            </View>

            {/* Кнопка входа */}
            <PeButton
              title="Авторизация"
              onPress={handleLogin}
              loading={loading}
              variant="primary"
              style={styles.submitBtn}
            />
          </PeCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  scrollGrow: {
    flexGrow: 1,
    // ВАЖНО: Никакого justifyContent: 'center' здесь! Это убивает фокус на Android.
  },
  container: {
    flex: 1,
    alignItems: "center",
    padding: SIZES.large,
    // Вместо центрирования задаем отступы, чтобы карточка визуально была по центру
    paddingTop: Platform.OS === "android" ? "25%" : "30%",
    paddingBottom: 60,
  },
  glowBackground: {
    position: "absolute",
    width: 300,
    height: 300,
    backgroundColor: COLORS.primary,
    borderRadius: 150,
    opacity: 0.1,
    top: "40%",
    left: "50%",
    transform: [{ translateX: -150 }, { translateY: -150 }],
  },
  authCard: {
    width: "100%",
    maxWidth: 400,
    padding: SIZES.xlarge,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: SIZES.xlarge,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.medium,
    ...SHADOWS.glow,
  },
  formContainer: {
    width: "100%",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: SIZES.small,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.medium,
    alignItems: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
    textAlign: "center",
  },
  submitBtn: {
    marginTop: SIZES.large,
  },
});
