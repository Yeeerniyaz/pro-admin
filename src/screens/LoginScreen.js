/**
 * @file src/screens/LoginScreen.js
 * @description Экран авторизации (PROADMIN Mobile v10.0.0).
 * Отвечает за проверку учетных данных и создание сессии через API.
 * Интегрирован с глобальным AuthContext (исправлен антипаттерн навигации).
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
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { User, Lock, Zap } from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeButton, PeInput, PeCard } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen() {
  // 🔥 Берем функцию авторизации из контекста, а не из параметров (Fix Warning)
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
    // Валидация
    if (!login.trim() || !password.trim()) {
      setError("Пожалуйста, введите логин и пароль");
      return;
    }

    Keyboard.dismiss();
    setError(null);
    setLoading(true);

    try {
      // Отправляем запрос на сервер crm.yeee.kz
      await API.login(login, password);

      // Вызываем глобальный метод из контекста, React Navigation переключит экран сам
      signIn();
    } catch (err) {
      setError(err.message || "Ошибка авторизации. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={GLOBAL_STYLES.safeArea}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Декоративный фон (Glow Effect) */}
          <View style={styles.glowBackground} />

          <PeCard style={styles.authCard}>
            {/* Логотип и Заголовок */}
            <View style={styles.headerContainer}>
              <View style={styles.logoIcon}>
                <Zap color="#fff" size={28} />
              </View>
              <Text style={GLOBAL_STYLES.h1}>ProElectric</Text>
              <Text style={GLOBAL_STYLES.textMuted}>
                Enterprise Mobile ERP v10.0
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
              style={{ marginTop: SIZES.large }}
            />
          </PeCard>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.large,
  },
  glowBackground: {
    position: "absolute",
    width: 300,
    height: 300,
    backgroundColor: COLORS.primary,
    borderRadius: 150,
    opacity: 0.1,
    top: "50%",
    left: "50%",
    transform: [{ translateX: -150 }, { translateY: -150 }],
  },
  authCard: {
    width: "100%",
    maxWidth: 400,
    padding: SIZES.xlarge,
    ...GLOBAL_STYLES.shadow, // Тень для объема
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
  },
  formContainer: {
    width: "100%",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)", // Прозрачный красный
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
});
