/**
 * @file src/screens/LoginScreen.js
 * @description Экран авторизации (PROADMIN Mobile v10.0.0).
 * UPGRADES (Senior):
 * - FIX: Клавиатура больше не скрывается при вводе (использован ScrollView + keyboardShouldPersistTaps).
 * - FIX: Убрана белая полоса навигации Android (безопасные зоны + expo-navigation-bar).
 * - FEAT: Локальная UI-валидация полей (подсветка ошибок через PeInput).
 * - FEAT: Блокировка формы во время загрузки (предотвращение двойных кликов).
 *
 * @module LoginScreen
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react-native";
import * as NavigationBar from "expo-navigation-bar";
// Используем SafeAreaView из библиотеки для лучшего контроля над insets на Android
import { SafeAreaView } from "react-native-safe-area-context"; 

// Импортируем компоненты, тему и контекст
import { COLORS, SIZES, FONTS } from "../theme/theme";
import { PeInput, PeButton } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuth();

  // Состояния формы
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Состояние ошибок валидации
  const [errors, setErrors] = useState({});

  // ===========================================================================
  // 🔧 ИНИЦИАЛИЗАЦИЯ (FIX БЕЛОЙ ПОЛОСЫ)
  // ===========================================================================
  useEffect(() => {
    const configureNavigationBar = async () => {
      if (Platform.OS === "android") {
        try {
          // Синхронизируем цвет системного бара с фоном приложения
          await NavigationBar.setBackgroundColorAsync(COLORS.background);
          await NavigationBar.setButtonStyleAsync("dark");
        } catch (error) {
          console.warn("Не удалось настроить NavigationBar:", error);
        }
      }
    };
    
    configureNavigationBar();
  }, []);

  // ===========================================================================
  // 🛡 ВАЛИДАЦИЯ И ОТПРАВКА
  // ===========================================================================
  const validateForm = () => {
    Keyboard.dismiss();
    let isValid = true;
    let newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Введите логин или email";
      isValid = false;
    }
    
    if (!password) {
      newErrors.password = "Введите пароль";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    // 1. Проверяем заполненность полей перед отправкой
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 2. Вызываем метод login из AuthContext (он свяжется с новым API erp.yeee.kz)
      await login(email.trim(), password);
      // При успешном входе AuthContext обновит стейт 'user', и App.js автоматически переключит на MainTabs
    } catch (error) {
      // 3. Обработка ошибки от сервера
      Alert.alert(
        "Ошибка авторизации",
        error.message || "Неверный логин или пароль",
      );
      // Очищаем пароль при неудачной попытке для безопасности
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================================
  // 🖥 РЕНДЕР
  // ===========================================================================
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* FIX: Заменяем TouchableWithoutFeedback на ScrollView.
          keyboardShouldPersistTaps="handled" решает проблему закрытия клавиатуры при вводе.
        */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.contentContainer}>
            
            {/* Заголовок / Лого */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>
                  Pro<Text style={styles.logoAccent}>Electric</Text>
                </Text>
              </View>
              <Text style={styles.subtitle}>
                Добро пожаловать в систему управления
              </Text>
            </View>

            {/* Форма */}
            <View style={styles.form}>
              
              {/* Поле: Логин / Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Логин или Email</Text>
                <PeInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: null }); // Убираем ошибку при вводе
                  }}
                  placeholder="admin@proelectric.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  error={errors.email} // Интеграция с UI Kit
                  icon={<User size={20} color={COLORS.textMuted} />}
                />
              </View>

              {/* Поле: Пароль */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Пароль</Text>
                <PeInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  placeholder="Введите пароль"
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  error={errors.password} // Интеграция с UI Kit
                  icon={<Lock size={20} color={COLORS.textMuted} />}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Увеличиваем зону клика
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={COLORS.textMuted} />
                      ) : (
                        <Eye size={20} color={COLORS.textMuted} />
                      )}
                    </TouchableOpacity>
                  }
                />
              </View>

              {/* Кнопка "Забыли пароль" */}
              <TouchableOpacity
                style={styles.forgotPassword}
                disabled={loading}
                onPress={() =>
                  Alert.alert("Информация", "Обратитесь к главному администратору системы для сброса пароля.")
                }
              >
                <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
              </TouchableOpacity>

              {/* Кнопка Входа */}
              <PeButton
                title="Войти в систему"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                variant="primary"
                icon={<ArrowRight size={20} color="#fff" />}
                fullWidth
              />
            </View>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ===========================================================================
// 🎨 СТИЛИ
// ===========================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // Единый фон предотвращает белые полосы
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1, // Позволяет контенту центрироваться
    justifyContent: "center",
  },
  contentContainer: {
    paddingHorizontal: SIZES.padding * 1.5,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 10,
  },
  logoText: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    color: COLORS.textMain, // Используем обновленный токен
  },
  logoAccent: {
    color: COLORS.primary,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMain,
    marginBottom: 8,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.primary,
  },
});

export default LoginScreen;