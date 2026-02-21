/**
 * @file src/screens/LoginScreen.js
 * @description Экран авторизации (PROADMIN Mobile v11.0.8 Enterprise).
 * ДОБАВЛЕНО: Двухшаговая OTP-авторизация (телефон -> код из Telegram).
 * ДОБАВЛЕНО: Black & Orange OLED-дизайн.
 * ДОБАВЛЕНО: KeyboardAvoidingView для защиты верстки при наборе текста.
 * НИКАКИХ УДАЛЕНИЙ: Старый вход по логину и паролю сохранен как "Резервный вход".
 *
 * @module LoginScreen
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
  Image
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { PeButton, PeInput, PeCard, PeBadge } from '../components/ui';
import { COLORS, GLOBAL_STYLES, SIZES, SAFE_SPACING } from '../theme/theme';

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
    if (!phone || phone.length < 10) {
      setErrorMsg('Введите корректный номер телефона');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await requestOtp(phone);
      setStep(2); // Переходим к вводу кода
    } catch (error) {
      setErrorMsg(error.message || 'Ошибка при запросе кода');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      setErrorMsg('Введите код из Telegram');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await verifyOtp(phone, otpCode);
      // При успехе Context автоматически обновит стейт user и перекинет на MainTabs
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
      style={GLOBAL_STYLES.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>

          {/* ЛОГОТИП И ЗАГОЛОВОК */}
          <View style={styles.header}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>⚡</Text>
            </View>
            <Text style={styles.brandTitle}>ProElectric</Text>
            <PeBadge status="new" text="ERP MOBILE" style={{ alignSelf: 'center', marginTop: SIZES.base }} />
            <Text style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.base }]}>
              Enterprise Management System
            </Text>
          </View>

          {/* КАРТОЧКА АВТОРИЗАЦИИ */}
          <PeCard style={styles.authCard}>
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
                  editable={!loading}
                />
                <PeInput
                  label="Пароль"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
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
                      style={{ marginTop: SIZES.small }}
                    />
                  </View>
                )}
              </View>
            )}
          </PeCard>

          {/* ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SIZES.large,
    justifyContent: 'center',
    paddingBottom: SAFE_SPACING.bottom + 40,
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
    ...SHADOWS.glow,
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