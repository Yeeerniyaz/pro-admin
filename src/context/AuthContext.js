/**
 * @file src/context/AuthContext.js
 * @description Глобальное ядро авторизации (PROADMIN Mobile v15.1.0 Enterprise).
 * 🔥 ДОБАВЛЕНО (v15.1.0): Внедрен expo-secure-store для аппаратного шифрования кэша профиля.
 * 🔥 ДОБАВЛЕНО (v15.1.0): Стратегия Offline-First (Zero Latency). Мгновенный вход в приложение по закэшированному токену с фоновой валидацией.
 * ИСПРАВЛЕНО: Улучшена обработка ошибок сети при разлогинивании.
 * ДОБАВЛЕНО: Полная поддержка OTP-авторизации (Telegram) и Legacy-входа (Пароль).
 * ИСПРАВЛЕНО: Исправлен импорт API (убраны фигурные скобки), что устранило фатальную ошибку.
 * НИКАКИХ УДАЛЕНИЙ И СОКРАЩЕНИЙ: Все функции сохранены полностью. ПОЛНЫЙ КОД.
 *
 * @module AuthContext
 * @version 15.1.0 (Secure Vault & Zero Latency Edition)
 */

import React, { createContext, useState, useEffect, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store'; // 🔥 Военное шифрование локальных данных
import API from '../api/api';

// Ключ для защищенного хранилища
const SECURE_USER_KEY = 'proadmin_secure_user_profile';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 🛡️ ПРОВЕРКА СЕССИИ (Session Guard с Offline-First подходом)
   */
  const checkAuth = async () => {
    try {
      // 1. БЫСТРЫЙ СТАРТ (Offline-first / Cache)
      // Мгновенно достаем юзера из зашифрованного кэша, чтобы убить долгий экран загрузки
      const cachedUser = await SecureStore.getItemAsync(SECURE_USER_KEY);
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
        setIsLoading(false); // Отключаем спиннер, пускаем в приложение
      }

      // 2. ФОНОВАЯ ВАЛИДАЦИЯ (Синхронизация с сервером)
      const res = await API.checkAuth();
      if (res && res.authenticated) {
        setUser(res.user);
        // Обновляем защищенный кэш свежими данными
        await SecureStore.setItemAsync(SECURE_USER_KEY, JSON.stringify(res.user));
      } else {
        // Если сервер сказал, что сессия мертва - выкидываем из системы
        setUser(null);
        await SecureStore.deleteItemAsync(SECURE_USER_KEY);
      }
    } catch (error) {
      console.error('[AuthContext 🛡️] Session verification error:', error.message);
      // Если просто нет интернета (сервер недоступен), а cachedUser есть — мы не выкидываем пользователя,
      // позволяя ему смотреть закэшированные данные (Offline mode).
    } finally {
      // Гарантированно снимаем лоадер, если кэш был пуст
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * 🔑 LEGACY LOGIN (Пароль)
   */
  const login = async (username, password) => {
    try {
      const res = await API.login(username, password);
      if (res.success) {
        await checkAuth(); // checkAuth сам положит данные в SecureStore
      }
      return res;
    } catch (error) {
      throw error;
    }
  };

  /**
   * 📲 REQUEST OTP (Telegram)
   */
  const requestOtp = async (phone) => {
    try {
      const res = await API.requestOtp(phone);
      return res;
    } catch (error) {
      throw error;
    }
  };

  /**
   * 🛡️ VERIFY OTP
   */
  const verifyOtp = async (phone, otp) => {
    try {
      const res = await API.verifyOtp(phone, otp);
      if (res.success && res.user) {
        setUser(res.user);
        // Сразу сохраняем в защищенное хранилище при успешном входе
        await SecureStore.setItemAsync(SECURE_USER_KEY, JSON.stringify(res.user));
      }
      return res;
    } catch (error) {
      throw error;
    }
  };

  /**
   * 🚪 LOGOUT
   */
  const logout = async () => {
    try {
      await API.logout();
    } catch (error) {
      console.warn('[AuthContext 🛡️] Network warning during logout, clearing local state anyway.');
    } finally {
      setUser(null); 
      // Гарантированно стираем и локальный стейт, и зашифрованный кэш
      await SecureStore.deleteItemAsync(SECURE_USER_KEY);
    }
  };

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    login,
    requestOtp,
    verifyOtp,
    logout,
    checkAuth
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;