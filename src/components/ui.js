/**
 * @file src/components/ui.js
 * @description Mobile UI Kit (PROADMIN React Native v11.0.0).
 * Библиотека переиспользуемых компонентов (Кнопки, Инпуты, Карточки, Баджи).
 * ДОБАВЛЕНО: Интеграция продвинутых теней (SHADOWS), эффекты свечения (Glow) и кроссплатформенные фиксы.
 *
 * @module Components
 */

import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { COLORS, SIZES, GLOBAL_STYLES, SHADOWS } from "../theme/theme";

// =============================================================================
// 🔘 1. PE-BUTTON (УМНАЯ КНОПКА)
// =============================================================================
export const PeButton = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon = null,
  style = {},
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.surfaceHover;
    switch (variant) {
      case "success":
        return COLORS.success;
      case "danger":
        return COLORS.danger;
      case "secondary":
        return COLORS.surfaceElevated;
      case "ghost":
        return "transparent";
      case "primary":
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textMuted;
    if (variant === "secondary" || variant === "ghost") return COLORS.textMain;
    return "#ffffff";
  };

  // Эффект свечения (glow) для активных элементов
  const getShadowStyle = () => {
    if (disabled || variant === "ghost" || variant === "secondary") return {};
    return SHADOWS.glow;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === "secondary" && {
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        getShadowStyle(), // Подключаем свечение из темы
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={GLOBAL_STYLES.rowCenter}>
          {icon && <View style={{ marginRight: SIZES.base }}>{icon}</View>}
          <Text style={[styles.buttonText, { color: getTextColor() }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// =============================================================================
// ✍️ 2. PE-INPUT (ТЕКСТОВОЕ ПОЛЕ)
// =============================================================================
export const PeInput = ({ label, icon, style, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View
        style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}
      >
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <TextInput
          style={[styles.input, icon && { paddingLeft: 40 }]}
          placeholderTextColor={COLORS.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
    </View>
  );
};

// =============================================================================
// 🗂 3. PE-CARD (КАРТОЧКА-КОНТЕЙНЕР)
// =============================================================================
export const PeCard = ({ children, style, elevated = false }) => {
  return (
    <View
      style={[
        elevated ? GLOBAL_STYLES.cardElevated : GLOBAL_STYLES.card,
        elevated && SHADOWS.medium, // Глубокая тень для elevated-карточек
        style,
      ]}
    >
      {children}
    </View>
  );
};

// =============================================================================
// 🏷 4. PE-BADGE (СТАТУСНЫЙ ИНДИКАТОР)
// =============================================================================
export const PeBadge = ({ status, text, style }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case "new":
      case "processing":
        return { bg: "rgba(59, 130, 246, 0.15)", color: COLORS.primary };
      case "work":
        return { bg: "rgba(245, 158, 11, 0.15)", color: COLORS.warning };
      case "done":
      case "income":
        return { bg: "rgba(16, 185, 129, 0.15)", color: COLORS.success };
      case "cancel":
      case "expense":
        return { bg: "rgba(239, 68, 68, 0.15)", color: COLORS.danger };
      default:
        return { bg: COLORS.surfaceElevated, color: COLORS.textMuted };
    }
  };

  const config = getBadgeStyle();
  const defaultText =
    {
      new: "НОВЫЙ",
      processing: "ЗАМЕР",
      work: "В РАБОТЕ",
      done: "ГОТОВО",
      cancel: "ОТКАЗ",
      income: "ДОХОД",
      expense: "РАСХОД",
    }[status] || status.toUpperCase();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.badgeText, { color: config.color }]}>
        {text || defaultText}
      </Text>
    </View>
  );
};

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ КОМПОНЕНТОВ
// =============================================================================
const styles = StyleSheet.create({
  // Кнопка
  button: {
    paddingVertical: 14,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radiusMd,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  buttonText: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
  },

  // Инпут
  inputContainer: {
    marginBottom: SIZES.medium,
  },
  inputLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textMuted,
    marginBottom: SIZES.base,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  inputWrapperFocused: {
    ...SHADOWS.glow, // Свечение при фокусе
    shadowColor: COLORS.primary,
  },
  inputIcon: {
    position: "absolute",
    left: SIZES.small,
    zIndex: 1,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    color: COLORS.textMain,
    fontSize: SIZES.fontBase,
    paddingVertical: Platform.OS === "ios" ? 14 : 10, // Кроссплатформенный фикс высоты
    paddingHorizontal: SIZES.medium,
  },

  // Бадж
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
