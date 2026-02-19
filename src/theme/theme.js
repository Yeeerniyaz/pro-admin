/**
 * @file src/theme/theme.js
 * @description Единая дизайн-система приложения PROADMIN (v10.0.0).
 * Содержит токены цветов, размеров, шрифтов и глобальные стили.
 * * ARCHITECT NOTES:
 * - Использована палитра "Professional Blue" для доверия и строгости.
 * - Добавлены GLOBAL_STYLES для ускорения верстки.
 * - Адаптировано для Темной темы (задел на будущее).
 *
 * @module Theme
 */

import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

// =============================================================================
// 🎨 ЦВЕТОВАЯ ПАЛИТРА
// =============================================================================
export const COLORS = {
  // Основные брендовые цвета
  primary: "#2563EB", // Насыщенный синий (Royal Blue)
  primaryDark: "#1E40AF", // Темно-синий (для нажатий)
  secondary: "#64748B", // Слейт (для второстепенных действий)

  // Функциональные цвета
  success: "#10B981", // Зеленый (Успех, Приход)
  danger: "#EF4444", // Красный (Ошибка, Расход, Отказ)
  warning: "#F59E0B", // Оранжевый (В работе, Внимание)
  info: "#3B82F6", // Голубой (Инфо)

  // Фоны и Поверхности
  background: "#F8FAFC", // Очень светло-серый (Фон экранов)
  surface: "#FFFFFF", // Белый (Фон табов, хедеров)
  surfaceElevated: "#F1F5F9", // Светло-серый (Фон инпутов, вторичных кнопок)
  surfaceHover: "#E2E8F0", // При нажатии

  card: "#FFFFFF", // Цвет карточек

  // Текст
  text: "#0F172A", // Почти черный (Основной текст) - Alias for textMain
  textMain: "#0F172A", // Почти черный (Основной текст)
  textMuted: "#64748B", // Серый (Подсказки, иконки)
  textInverse: "#FFFFFF", // Белый (Текст на кнопках)

  // Границы
  border: "#E2E8F0", // Светлый бордер

  // Прозрачности (Overlay)
  overlay: "rgba(0, 0, 0, 0.5)",
};

// =============================================================================
// 📏 РАЗМЕРЫ И ОТСТУПЫ
// =============================================================================
export const SIZES = {
  // Базовые отступы
  base: 8,
  small: 12,
  medium: 16,
  large: 24,
  padding: 20, // Стандартный отступ экрана

  // Радиусы скругления
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,

  // Размеры шрифтов
  h1: 28,
  h2: 22,
  h3: 18,
  fontTitle: 16,
  fontBase: 14,
  fontSmall: 12,

  // Размеры экрана
  width,
  height,
};

// =============================================================================
// 🔡 ШРИФТЫ
// =============================================================================
export const FONTS = {
  // Используем системные шрифты для максимальной производительности и нативности.
  // Если подключите 'Inter' или 'Roboto', замените значения здесь.
  bold: Platform.select({ ios: "System", android: "Roboto" }), // Вес 700 контролируется в стилях
  medium: Platform.select({ ios: "System", android: "Roboto" }), // Вес 500
  regular: Platform.select({ ios: "System", android: "Roboto" }), // Вес 400
  light: Platform.select({ ios: "System", android: "Roboto" }), // Вес 300
};

// =============================================================================
// 🌑 ТЕНИ (SHADOWS)
// =============================================================================
export const SHADOWS = {
  light: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dark: {
    shadowColor: COLORS.textMain,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
};

// =============================================================================
// 🛠 ГЛОБАЛЬНЫЕ СТИЛИ (MIXINS)
// =============================================================================
export const GLOBAL_STYLES = {
  // Безопасная зона (для корневых View)
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Центрирование
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Flex Rows
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Типографика
  h1: {
    fontSize: SIZES.h1,
    fontWeight: "800",
    color: COLORS.textMain,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: SIZES.h2,
    fontWeight: "700",
    color: COLORS.textMain,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: SIZES.h3,
    fontWeight: "600",
    color: COLORS.textMain,
  },
  textBody: {
    fontSize: SIZES.fontBase, // 14
    color: COLORS.textMain,
    lineHeight: 20,
  },
  textSmall: {
    fontSize: SIZES.fontSmall, // 12
    color: COLORS.textMuted,
  },
  textMuted: {
    fontSize: SIZES.fontBase,
    color: COLORS.textMuted,
  },

  // Карточки
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardElevated: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
    ...SHADOWS.medium, // Применяем тень
    borderWidth: 0, // Убираем бордер если есть тень
  },
};

export default { COLORS, SIZES, FONTS, SHADOWS, GLOBAL_STYLES };
