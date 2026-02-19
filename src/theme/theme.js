/**
 * @file src/theme/theme.js
 * @description Design System & Theme Configuration (PROADMIN Mobile v11.0.5).
 * ДОБАВЛЕНО: SAFE_SPACING для предотвращения наложений на StatusBar и BottomBar.
 *
 * @module Theme
 */

import { StyleSheet, Platform, StatusBar } from 'react-native';

export const COLORS = Object.freeze({
  background: '#09090b',
  surface: '#18181b',
  surfaceElevated: '#27272a',
  surfaceHover: '#3f3f46',
  border: 'rgba(255, 255, 255, 0.1)',
  borderFocus: 'rgba(255, 255, 255, 0.2)',
  textMain: '#f4f4f5',
  textMuted: '#a1a1aa',
  textInverse: '#09090b',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
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
  radiusSm: 6,
  radiusMd: 10,
  radiusLg: 16,
});

// 🔥 Новые константы безопасных зон
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
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
    ...SHADOWS.medium,
  },
  h1: {
    fontSize: SIZES.fontHeader,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: SIZES.base,
  },
  h2: {
    fontSize: SIZES.fontTitle,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: SIZES.base,
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