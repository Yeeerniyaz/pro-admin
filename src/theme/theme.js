/**
 * @file src/theme/theme.js
 * @description Design System & Theme Configuration (PROADMIN Mobile v11.0).
 * Единый источник истины для цветов, шрифтов, теней и глобальных стилей.
 * ДОБАВЛЕНО: Продвинутые тени (SHADOWS) и система слоев (Z_INDEX). Никаких удалений.
 *
 * @module Theme
 */

import { StyleSheet, Platform } from "react-native";

// =============================================================================
// 🎨 1. ЦВЕТОВАЯ ПАЛИТРА (COLOR TOKENS)
// =============================================================================
export const COLORS = Object.freeze({
  // Фоны
  background: "#09090b", // pe-bg-base
  surface: "#18181b", // pe-bg-surface
  surfaceElevated: "#27272a", // pe-bg-surface-elevated
  surfaceHover: "#3f3f46", // pe-bg-surface-hover

  // Границы
  border: "rgba(255, 255, 255, 0.1)",
  borderFocus: "rgba(255, 255, 255, 0.2)",

  // Текст
  textMain: "#f4f4f5",
  textMuted: "#a1a1aa",
  textInverse: "#09090b",

  // Акценты (Семантика)
  primary: "#3b82f6", // Синий (Кнопки, Инфо)
  primaryHover: "#2563eb",
  success: "#10b981", // Зеленый (Доходы, Выполнено)
  warning: "#f59e0b", // Оранжевый (В работе, Предупреждения)
  danger: "#ef4444", // Красный (Отказы, Расходы)
});

// =============================================================================
// 📐 2. ГЕОМЕТРИЯ И ТИПОГРАФИКА (SPACING & TYPOGRAPHY)
// =============================================================================
export const SIZES = Object.freeze({
  // Отступы (Margin/Padding)
  base: 8,
  small: 12,
  medium: 16,
  large: 24,
  xlarge: 32,

  // Шрифты
  fontSmall: 12,
  fontBase: 14,
  fontMedium: 16,
  fontTitle: 20,
  fontHeader: 24,

  // Скругления (Border Radius)
  radiusSm: 6,
  radiusMd: 10,
  radiusLg: 16,
});

// =============================================================================
// 🗂 3. СИСТЕМА СЛОЕВ И ТЕНЕЙ (НОВОЕ В v11.0)
// =============================================================================
export const Z_INDEX = Object.freeze({
  base: 1,
  dropdown: 10,
  sticky: 50,
  backdrop: 90,
  modal: 100,
  toast: 200,
});

export const SHADOWS = StyleSheet.create({
  light: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  glow: {
    // Эффект свечения для акцентных кнопок
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});

// =============================================================================
// 🌍 4. ГЛОБАЛЬНЫЕ СТИЛИ (GLOBAL STYLESHEET)
// =============================================================================
export const GLOBAL_STYLES = StyleSheet.create({
  // Основной контейнер экрана
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.medium,
  },

  // Карточки (PeCard)
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  cardElevated: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.medium,
    ...SHADOWS.medium, // Подключили новые тени
  },

  // Заголовки
  h1: {
    fontSize: SIZES.fontHeader,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: SIZES.base,
  },
  h2: {
    fontSize: SIZES.fontTitle,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: SIZES.base,
  },
  h3: {
    fontSize: SIZES.fontMedium,
    fontWeight: "600",
    color: COLORS.textMain,
  },

  // Текст
  textBody: {
    fontSize: SIZES.fontBase,
    color: COLORS.textMain,
  },
  textMuted: {
    fontSize: SIZES.fontBase,
    color: COLORS.textMuted,
  },
  textSmall: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textMuted,
  },

  // Флекс-утилиты
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Обратная совместимость для старых экранов (чтобы ничего не сломалось)
  shadow: SHADOWS.medium,
});
