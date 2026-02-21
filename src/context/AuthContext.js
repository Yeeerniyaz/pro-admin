/**
 * @file src/context/AuthContext.js
 * @description Глобальное ядро авторизации (PROADMIN Mobile v11.0.20 Enterprise).
 * ИСПРАВЛЕНО: Добавлен Default Export для устранения ошибки [TypeError: Cannot read property 'Provider' of undefined].
 * ДОБАВЛЕНО: Полная поддержка OTP-авторизации (Telegram) и Legacy-входа (Пароль).
 * НИКАКИХ УДАЛЕНИЙ И СОКРАЩЕНИЙ: Все функции (login, logout, checkAuth, requestOtp, verifyOtp) сохранены полностью.
 *
 * @module AuthContext
 */

import React, { createContext, useState, useEffect, useMemo } from 'react';
import { API } from '../api/api';

// 🔥 Экспортируем как именованную константу (Named Export)
export const AuthContext = createContext(null);

/**
 * Провайдер контекста авторизации.
 * Оборачивает всё приложение и управляет состоянием сессии.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 🛡️ ПРОВЕРКА СЕССИИ (Session Guard)
   * Проверяет валидность Cookie-сессии на сервере при запуске приложения.
   */
  const checkAuth = async () => {
    try {
      const res = await API.checkAuth();
      if (res && res.authenticated) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext 🛡️] Session verification error:', error.message);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Выполняем проверку при каждом холодном старте приложения
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * 🔑 LEGACY LOGIN (Пароль)
   * Сохранен для обратной совместимости и входа Администратора.
   */
  const login = async (username, password) => {
    try {
      const res = await API.login(username, password);
      if (res.success) {
        // После успешного входа запрашиваем актуальный профиль
        await checkAuth();
      }
      return res;
    } catch (error) {
      throw error;
    }
  };

  /**
   * 📲 REQUEST OTP (Telegram)
   * Инициирует отправку кода через Telegram-бота.
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
   * Проверяет 6-значный код и устанавливает пользователя в стейт.
   */
  const verifyOtp = async (phone, otp) => {
    try {
      const res = await API.verifyOtp(phone, otp);
      if (res.success && res.user) {
        setUser(res.user);
      }
      return res;
    } catch (error) {
      throw error;
    }
  };

  /**
   * 🚪 LOGOUT
   * Безопасно завершает сессию на сервере и очищает локальный стейт.
   */
  const logout = async () => {
    try {
      await API.logout();
    } catch (error) {
      console.error('[AuthContext 🛡️] Network error during logout:', error.message);
    } finally {
      // Гарантированно сбрасываем пользователя даже при ошибке сети
      setUser(null);
    }
  };

  /**
   * Оптимизация производительности: мемоизируем значение контекста,
   * чтобы избежать лишних рендеров дочерних компонентов.
   */
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

// 🔥 ГАРАНТИЯ СТАБИЛЬНОСТИ: Экспортируем контекст по умолчанию (Default Export)
// Это исключает ошибку "Cannot read property 'Provider' of undefined" при любом типе импорта.
export default AuthContext;