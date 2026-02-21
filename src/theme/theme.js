/**
 * @file src/theme/theme.js
 * @description Design System & Theme Configuration (PROADMIN Mobile v11.0.5 Enterprise).
 * ДОБАВЛЕНО: SAFE_SPACING для предотвращения наложений на StatusBar и BottomBar.
 * ДИЗАЙН: Black & Orange Minimalism (OLED Black, Electric Orange, строгие рамки).
 * НИКАКИХ УДАЛЕНИЙ: Все ключи и стили сохранены на 100%.
 *
 * @module Theme
 */

import { StyleSheet, Platform, StatusBar } from 'react-native';

export const COLORS = Object.freeze({
  background: '#000000',         // OLED Pure Black
  surface: '#0a0a0a',            // Very Dark Gray
  surfaceElevated: '#111111',    // Slightly lighter for modals/dropdowns
  surfaceHover: '#1f1f1f',       // Hover state
  border: '#262626',             // Strict thin dark border
  borderFocus: 'rgba(255, 107, 0, 0.4)', // Orange glow for inputs
  textMain: '#ffffff',           // Pure White
  textMuted: '#a1a1aa',          // Neutral Gray
  textInverse: '#000000',        // Black text for orange buttons
  primary: '#ff6b00',            // Electric Orange
  primaryHover: '#e65c00',       // Darker Orange
  success: '#10b981',            // Emerald for money/success
  warning: '#f59e0b',            // Amber for pending
  danger: '#ef4444',             // Red for debts/errors
});

export const SIZES = Object.freeze({
  base: 8,
  small: 12,
  medium: 16,
  large: 24,
  xlarge: 32,
  fontSmall: 12,
  fontBase: 14,
  fontMedium: 16,
  fontTitle: 20,
  fontHeader: 24,
  // Строгие углы для минимализма (как в web)
  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 12,
});

// 🔥 Константы безопасных зон (сохранены без изменений)
export const SAFE_SPACING = Object.freeze({
  top: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44,
  bottom: Platform.OS === 'ios' ? 34 : 10,
});

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  }
});

export const GLOBAL_STYLES = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    // 🔥 Автоматический отступ от статус-бара
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.medium,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd, // Сделали чуть строже
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  cardElevated: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.medium,
    ...SHADOWS.light,
  },
  h1: {
    fontSize: SIZES.fontHeader,
    fontWeight: '600', // Облегчили вес для премиального вида
    color: COLORS.textMain,
    marginBottom: SIZES.base,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: SIZES.fontTitle,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: SIZES.base,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.textMain,
  },
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadow: SHADOWS.medium,
});