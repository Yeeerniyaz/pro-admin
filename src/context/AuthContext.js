/**
 * @file src/context/AuthContext.js
 * @description Глобальное ядро авторизации (PROADMIN Mobile v12.13.0 Enterprise).
 * ИСПРАВЛЕНО: Улучшена обработка ошибок сети при разлогинивании.
 * ДОБАВЛЕНО: Полная поддержка OTP-авторизации (Telegram) и Legacy-входа (Пароль).
 * НИКАКИХ УДАЛЕНИЙ И СОКРАЩЕНИЙ: Все функции сохранены полностью. ПОЛНЫЙ КОД.
 *
 * @module AuthContext
 */

import React, { createContext, useState, useEffect, useMemo } from 'react';
import { API } from '../api/api';

// 🔥 Экспортируем как именованную константу
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 🛡️ ПРОВЕРКА СЕССИИ (Session Guard)
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
        await checkAuth();
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
      setUser(null); // Гарантированно стираем локальный стейт, даже если сервер недоступен
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

// 🔥 ГАРАНТИЯ СТАБИЛЬНОСТИ: Экспорт по умолчанию
export default AuthContext;