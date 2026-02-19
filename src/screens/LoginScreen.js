import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react-native";
import * as NavigationBar from "expo-navigation-bar"; // Импорт для фикса белой полосы

// Импортируем ваши компоненты и тему
import { COLORS, SIZES, FONTS } from "../theme/theme";
import { PeInput, PeButton } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // FIX: Убираем белую полосу на Android при монтировании экрана
  useEffect(() => {
    if (Platform.OS === "android") {
      // Устанавливаем цвет навигационного бара в цвет фона приложения
      NavigationBar.setBackgroundColorAsync(COLORS.background);
      NavigationBar.setButtonStyleAsync("dark"); // Иконки бара (светлые/темные)
    }
  }, []);

  const handleLogin = async () => {
    // Валидация
    if (!email || !password) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все поля");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      await login(email, password);
      // Навигация произойдет автоматически через AuthContext,
      // но если нужно явно: navigation.replace('MainTabs');
    } catch (error) {
      Alert.alert(
        "Ошибка авторизации",
        error.message || "Неверный логин или пароль",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* FIX: TouchableWithoutFeedback закрывает клавиатуру при тапе в пустоту.
        Оборачиваем весь экран.
      */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* FIX: KeyboardAvoidingView предотвращает перекрытие полей клавиатурой.
            behavior="padding" идеально для iOS, для Android часто лучше "height" или undefined,
            но здесь оставим padding для консистентности.
          */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
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
                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email</Text>
                  <PeInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="admin@proelectric.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    icon={<User size={20} color={COLORS.textMuted} />}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Пароль</Text>
                  <PeInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Введите пароль"
                    secureTextEntry={!showPassword}
                    icon={<Lock size={20} color={COLORS.textMuted} />}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
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
                  onPress={() =>
                    Alert.alert("Info", "Обратитесь к администратору системы")
                  }
                >
                  <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
                </TouchableOpacity>

                {/* Кнопка Входа */}
                <PeButton
                  title="Войти в систему"
                  onPress={handleLogin}
                  loading={loading}
                  variant="primary"
                  icon={<ArrowRight size={20} color="#fff" />}
                  fullWidth
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // Важно: фон на уровне SafeArea
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SIZES.padding * 1.5,
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
    fontSize: 32,
    color: COLORS.text,
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
    color: COLORS.text,
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
