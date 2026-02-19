/**
 * @file src/components/ui.js
 * @description Mobile UI Kit (PROADMIN React Native v10.0.0).
 * Библиотека переиспользуемых компонентов (Кнопки, Инпуты, Карточки, Баджи, Скелетоны).
 * Строго использует StyleSheet и токены из theme.js. Никакого дублирования кода на экранах.
 * * UPGRADES (Senior):
 * - forwardRef для PeInput (управление фокусом).
 * - State 'error' для PeInput (валидация).
 * - Опциональный onPress для PeCard (кликабельные карточки).
 * - Добавлены PeDivider и PeSkeleton.
 *
 * @module Components
 */

import React, { useState, forwardRef, useEffect, useRef } from "react";
import {
  TouchableOpacity,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { COLORS, SIZES, GLOBAL_STYLES } from "../theme/theme";

// =============================================================================
// 🔘 1. PE-BUTTON (УМНАЯ КНОПКА)
// =============================================================================
/**
 * @param {string} variant - 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
 * @param {string} title - Текст кнопки
 * @param {boolean} loading - Состояние загрузки (крутилка)
 * @param {ReactNode} icon - Иконка (Lucide)
 * @param {string} size - 'normal' | 'small'
 */
export const PeButton = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon = null,
  style = {},
  textStyle = {},
  size = "normal",
  fullWidth = false,
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
      case "outline":
        return "transparent";
      case "primary":
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textMuted;
    if (variant === "secondary" || variant === "ghost") return COLORS.textMain;
    if (variant === "outline") return COLORS.primary;
    return "#ffffff";
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        size === "small" && styles.buttonSmall,
        fullWidth && { width: "100%" },
        { backgroundColor: getBackgroundColor() },
        (variant === "secondary" || variant === "outline") && {
          borderWidth: 1,
          borderColor: variant === "outline" ? COLORS.primary : COLORS.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={getTextColor()}
          size={size === "small" ? "small" : "small"}
        />
      ) : (
        <View style={GLOBAL_STYLES.rowCenter}>
          {icon && <View style={{ marginRight: SIZES.base }}>{icon}</View>}
          <Text
            style={[
              styles.buttonText,
              size === "small" && styles.buttonTextSmall,
              { color: getTextColor() },
              textStyle,
            ]}
          >
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
/**
 * Используем forwardRef для возможности управлять фокусом снаружи
 * @param {ReactNode} icon - Иконка слева
 * @param {ReactNode} rightIcon - Иконка справа (например, глаз для пароля)
 * @param {string} label - Подпись над инпутом
 * @param {string} error - Текст ошибки (подсвечивает инпут красным)
 */
export const PeInput = forwardRef(
  ({ label, icon, rightIcon, style, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={[styles.inputContainer, style]}>
        {label && (
          <Text style={[styles.inputLabel, error && { color: COLORS.danger }]}>
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            error && styles.inputWrapperError,
          ]}
        >
          {icon && <View style={styles.inputIcon}>{icon}</View>}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              icon && { paddingLeft: 40 },
              rightIcon && { paddingRight: 40 },
            ]}
            placeholderTextColor={COLORS.textMuted}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {rightIcon && <View style={styles.inputRightIcon}>{rightIcon}</View>}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

// =============================================================================
// 🗂 3. PE-CARD (КАРТОЧКА-КОНТЕЙНЕР)
// =============================================================================
/**
 * @param {boolean} elevated - Приподнятый стиль
 * @param {function} onPress - Делает карточку кликабельной
 */
export const PeCard = ({ children, style, elevated = false, onPress }) => {
  const CardContent = (
    <View
      style={[
        elevated ? GLOBAL_STYLES.cardElevated : GLOBAL_STYLES.card,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

// =============================================================================
// 🏷 4. PE-BADGE (СТАТУСНЫЙ ИНДИКАТОР)
// =============================================================================
/**
 * @param {string} status - 'new', 'processing', 'work', 'done', 'cancel', 'income', 'expense'
 * @param {string} text - Кастомный текст (если нет, переведет status)
 */
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
    }[status] || (status ? status.toUpperCase() : "СТАТУС");

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.badgeText, { color: config.color }]}>
        {text || defaultText}
      </Text>
    </View>
  );
};

// =============================================================================
// ➖ 5. PE-DIVIDER (РАЗДЕЛИТЕЛЬ) - NEW
// =============================================================================
export const PeDivider = ({ style, dashed = false }) => (
  <View style={[styles.divider, dashed && styles.dividerDashed, style]} />
);

// =============================================================================
// 🦴 6. PE-SKELETON (ЗАГЛУШКА ЗАГРУЗКИ) - NEW
// =============================================================================
export const PeSkeleton = ({
  width,
  height,
  borderRadius = SIZES.radiusSm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: COLORS.surfaceHover,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
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
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.radiusSm,
  },
  buttonText: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
  },
  buttonTextSmall: {
    fontSize: SIZES.fontSmall,
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
    fontWeight: "600",
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  inputWrapperFocused: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperError: {
    shadowColor: COLORS.danger,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    position: "absolute",
    left: SIZES.small,
    zIndex: 1,
  },
  inputRightIcon: {
    position: "absolute",
    right: SIZES.small,
    zIndex: 1,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    color: COLORS.textMain,
    fontSize: SIZES.fontBase,
    paddingVertical: 12,
    paddingHorizontal: SIZES.medium,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },

  // Бадж
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Разделитель
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.medium,
  },
  dividerDashed: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
    height: 0,
  },
});
