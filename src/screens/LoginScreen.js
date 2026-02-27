/**
 * @file src/screens/LoginScreen.js
 * @description Экран авторизации (PROADMIN Mobile v12.12.2 Enterprise).
 * 🔥 ИСПРАВЛЕНО (v12.12.2): Убран устаревший LayoutAnimation (устранена ошибка WARN в New Architecture).
 * 🔥 ИСПРАВЛЕНО (v12.12.2): Жесткое форматирование телефона (.slice(-10)) для 100% совпадения с базой данных сервера.
 * ДОБАВЛЕНО: Единый OLED-стандарт дизайна (глубокий черный фон, отсутствие теней, оранжевый акцент).
 *
 * @module LoginScreen
 * @version 12.12.2 (Fabric Ready & Smart Auth Edition)
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { PeButton, PeInput, PeCard, PeBadge } from '../components/ui';
import { COLORS, GLOBAL_STYLES, SIZES, SAFE_SPACING, SHADOWS } from '../theme/theme';

export default function LoginScreen() {
  const { login, requestOtp, verifyOtp } = useContext(AuthContext);

  // Состояния для OTP (Новый флоу)
  const [step, setStep] = useState(1); // 1 - Телефон, 2 - Код
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Состояния для Legacy (Старый флоу)
  const [isLegacyMode, setIsLegacyMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Глобальные состояния UI
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ==========================================
  // 🔐 ОБРАБОТЧИКИ НОВОГО ФЛОУ (OTP)
  // ==========================================
  const handleRequestOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Введите корректный номер телефона (мин. 10 цифр)');
      return;
    }

    // 🔥 ИСПРАВЛЕНИЕ БАГА БД: берем строго последние 10 цифр (код + номер)
    const formattedPhone = cleanPhone.slice(-10);

    setLoading(true);
    setErrorMsg('');
    try {
      await requestOtp(formattedPhone);
      setStep(2); // Переходим к вводу кода
    } catch (error) {
      setErrorMsg(error.message || 'Ошибка при запросе кода. Проверьте номер.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      setErrorMsg('Введите код из Telegram');
      return;
    }

    // Форматируем телефон точно так же, как при запросе
    const formattedPhone = phone.replace(/\D/g, '').slice(-10);

    setLoading(true);
    setErrorMsg('');
    try {
      await verifyOtp(formattedPhone, otpCode);
    } catch (error) {
      setErrorMsg(error.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🔐 ОБРАБОТЧИК СТАРОГО ФЛОУ (LEGACY)
  // ==========================================
  const handleLegacyLogin = async () => {
    if (!username || !password) {
      setErrorMsg('Введите логин и пароль');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await login(username, password);
    } catch (error) {
      setErrorMsg(error.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[GLOBAL_STYLES.safeArea, { flex: 1, backgroundColor: COLORS.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>

          {/* 🎩 ЛОГОТИП И ЗАГОЛОВОК */}
          <View style={styles.header}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>⚡</Text>
            </View>
            <Text style={styles.brandTitle}>ProElectric</Text>
            <PeBadge status="new" text="ERP MOBILE v12" style={{ alignSelf: 'center', marginTop: SIZES.base }} />
            <Text style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.base }]}>
              Enterprise Management System
            </Text>
          </View>

          {/* 💳 КАРТОЧКА АВТОРИЗАЦИИ */}
          <PeCard elevated={false} style={styles.authCard}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* РЕЖИМ 1: СТАРЫЙ ЛОГИН (LEGACY) */}
            {isLegacyMode ? (
              <View>
                <PeInput
                  label="Логин администратора"
                  placeholder="admin"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <PeInput
                  label="Пароль"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <PeButton
                  title="Войти в систему"
                  onPress={handleLegacyLogin}
                  loading={loading}
                  style={{ marginTop: SIZES.base }}
                />
              </View>
            ) : (
              /* РЕЖИМ 2: НОВЫЙ OTP (TELEGRAM) */
              <View>
                {step === 1 ? (
                  <View>
                    <PeInput
                      label="Номер телефона"
                      placeholder="+7 (777) 000-00-00"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <PeButton
                      title="Получить код в Telegram"
                      onPress={handleRequestOtp}
                      loading={loading}
                      style={{ marginTop: SIZES.base }}
                    />
                  </View>
                ) : (
                  <View>
                    <PeInput
                      label="Код из Telegram"
                      placeholder="000000"
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <PeButton
                      title="Подтвердить и войти"
                      variant="success"
                      onPress={handleVerifyOtp}
                      loading={loading}
                      style={{ marginTop: SIZES.base }}
                    />
                    <PeButton
                      title="Изменить номер"
                      variant="ghost"
                      onPress={() => {
                        setStep(1);
                        setErrorMsg('');
                        setOtpCode('');
                      }}
                      disabled={loading}
                      style={{ marginTop: SIZES.small, borderWidth: 1, borderColor: COLORS.border }}
                    />
                  </View>
                )}
              </View>
            )}
          </PeCard>

          {/* 🔄 ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ */}
          <PeButton
            title={isLegacyMode ? "Войти по номеру телефона (OTP)" : "Резервный вход (Пароль)"}
            variant="ghost"
            onPress={() => {
              setIsLegacyMode(!isLegacyMode);
              setErrorMsg('');
            }}
            disabled={loading}
            style={{ marginTop: SIZES.large }}
          />

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// 🎨 СТИЛИ
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SIZES.large,
    justifyContent: 'center',
    paddingBottom: SAFE_SPACING.bottom + 40,
    backgroundColor: COLORS.background, // Строгий черный фон
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.xlarge,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.medium,
    ...SHADOWS.glow, // Оставляем легкое свечение для логотипа
  },
  logoText: {
    fontSize: 32,
    color: COLORS.textInverse,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: -0.5,
  },
  authCard: {
    width: '100%',
    padding: SIZES.large,
    borderWidth: 1, // Строгая рамка
    borderColor: COLORS.border,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: SIZES.radiusSm,
    padding: SIZES.small,
    marginBottom: SIZES.medium,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    textAlign: 'center',
  }
});