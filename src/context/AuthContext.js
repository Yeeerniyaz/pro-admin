/**
 * @file src/context/AuthContext.js
 * @description Глобальный контекст авторизации.
 * Вынесен в отдельный файл для предотвращения Require Cycles (кольцевых зависимостей).
 */
import { createContext } from 'react';
export const AuthContext = createContext();