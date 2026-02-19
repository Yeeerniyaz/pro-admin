/**
 * @file src/screens/LoginScreen.js
 * @description Экран авторизации (PROADMIN Mobile v11.0.4).
 * ИСПРАВЛЕНО: Убраны конфликтующие обертки, мешающие клавиатуре на Android.
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

import { API } from "../api/api";
import { PeButton, PeInput, PeCard } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";
import { AuthContext } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useContext(AuthContext);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const content = (
    <ScrollView
      contentContainerStyle={styles.scrollGrow}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.glowBackground} />

        <PeCard elevated={true} style={styles.authCard}>
          <View style={styles.headerContainer}>
            <View style={styles.logoIcon}>
              <Zap color="#fff" size={28} />
            </View>
            <Text style={GLOBAL_STYLES.h1}>ProElectric</Text>
            <Text style={GLOBAL_STYLES.textMuted}>
              Enterprise Mobile ERP v11.0
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
  );

  if (Platform.OS === "ios") {
    return (
      <KeyboardAvoidingView style={GLOBAL_STYLES.safeArea} behavior="padding">
        {content}
      </KeyboardAvoidingView>
    );
  }

  // Для Android убираем KeyboardAvoidingView полностью
  return <View style={GLOBAL_STYLES.safeArea}>{content}</View>;
}

const styles = StyleSheet.create({
  scrollGrow: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    padding: SIZES.large,
    paddingTop: Platform.OS === "android" ? 80 : 100,
  },
  glowBackground: {
    position: "absolute",
    width: 300,
    height: 300,
    backgroundColor: COLORS.primary,
    borderRadius: 150,
    opacity: 0.1,
    top: "30%",
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
