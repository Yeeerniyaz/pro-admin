/**
 * @file src/context/AuthContext.js
 * @description Глобальный контекст авторизации и управления сессией (PROADMIN Mobile v10.0.0).
 * * ARCHITECT NOTES:
 * - Переход на Session-based Auth (Cookie).
 * - Реализована проверка валидности сессии при старте (Bootstrap).
 * - Добавлена утилита hasRole для RBAC (Role Based Access Control).
 *
 * @module AuthContext
 */

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { Alert } from "react-native";
// Импортируем наш обновленный API слой
import { API } from "../api/api";

// Создаем контекст
const AuthContext = createContext({});

/**
 * Провайдер авторизации. Оборачивает все приложение.
 */
export const AuthProvider = ({ children }) => {
  // Состояние пользователя (null = гость, object = авторизован)
  const [user, setUser] = useState(null);

  // Состояние загрузки (true = проверяем сессию, показываем Splash)
  const [loading, setLoading] = useState(true);

  // Состояние ошибок авторизации
  const [error, setError] = useState(null);

  /**
   * 1. Bootstrap: Проверка текущей сессии при запуске
   * React Native автоматически отправляет сохраненные куки (connect.sid).
   * Если кука жива, API.checkAuth вернет юзера.
   */
  const bootstrapAsync = useCallback(async () => {
    setLoading(true);
    try {
      // Пытаемся получить профиль текущего пользователя от сервера
      const userData = await API.checkAuth();
      if (userData) {
        console.log("[Auth] Session restored for:", userData.username);
        setUser(userData);
      }
    } catch (e) {
      // 401 или ошибка сети — считаем, что сессии нет
      console.log("[Auth] No active session or network error");
      setUser(null);
    } finally {
      // В любом случае убираем сплэш-скрин
      setLoading(false);
    }
  }, []);

  // Запускаем bootstrap при монтировании провайдера
  useEffect(() => {
    bootstrapAsync();
  }, [bootstrapAsync]);

  /**
   * 2. Login Action
   */
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await API.login(email, password);
      setUser(userData);
      return userData;
    } catch (e) {
      const msg = e.message || "Ошибка входа";
      setError(msg);
      console.error("[Auth] Login failed:", msg);
      throw e; // Пробрасываем ошибку, чтобы UI мог показать Alert или тряску поля
    } finally {
      setLoading(false);
    }
  };

  /**
   * 3. Logout Action
   * Важно вызвать API, чтобы сервер уничтожил сессию в Redis/Memory
   */
  const logout = async () => {
    setLoading(true);
    try {
      await API.logout();
    } catch (e) {
      console.warn("[Auth] Server logout failed, clearing local state anyway");
    } finally {
      setUser(null); // Очищаем локально в любом случае
      setLoading(false);
    }
  };

  /**
   * 4. Helper: Проверка прав доступа
   * @param {string|string[]} roles - Роль или массив ролей, которым доступ разрешен
   */
  const hasRole = (roles) => {
    if (!user) return false;

    // Владелец (owner) имеет доступ ко всему
    if (user.role === "owner") return true;

    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  /**
   * 5. Обновление профиля пользователя в стейте
   * (например, после смены роли или редактирования профиля)
   */
  const refreshUser = async () => {
    try {
      const userData = await API.checkAuth();
      setUser(userData);
    } catch (e) {
      console.log("[Auth] Failed to refresh user data");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        hasRole,
        refreshUser,
        setError, // Позволяем UI сбрасывать ошибки
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Хук для использования контекста
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
