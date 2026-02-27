/**
 * @file src/components/ui.js
 * @description Mobile UI Kit (PROADMIN React Native v15.4.0 Enterprise).
 * 🔥 ДОБАВЛЕНО (v15.4.0): Железобетонная тактильная отдача (Haptics) для всех кнопок PeButton.
 * 🔥 ИСПРАВЛЕНО (v15.4.0): Откат экспериментальных оберток (Устранена ошибка Component is not a function).
 * ИСПРАВЛЕНО: Для Android используется Heavy/Medium Impact с асинхронным вызовом (await) для пробития системы.
 * ДОБАВЛЕНО: Black & Orange Design System (черный текст на оранжевых кнопках).
 * ДОБАВЛЕНО: Разделение цветов бейджей (new, processing, work) согласно Web CRM.
 * НИКАКИХ УДАЛЕНИЙ: Весь оригинальный код сохранен на 100%. ПОЛНЫЙ КОД.
 *
 * @module Components
 * @version 15.4.0 (Stable Haptics Edition)
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from 'expo-haptics'; // 🔥 Движок тактильной отдачи
import { COLORS, SIZES, GLOBAL_STYLES, SHADOWS } from "../theme/theme";

// =============================================================================
// 🔘 1. PE-BUTTON (УМНАЯ КНОПКА С HAPTICS)
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
    if (variant === "primary") return COLORS.textInverse; // Черный текст на оранжевом
    return "#ffffff";
  };

  const getShadowStyle = () => {
    if (disabled || variant === "ghost" || variant === "secondary") return {};
    return SHADOWS.glow; // Легкое оранжевое свечение
  };

  // 🔥 Железобетонный асинхронный обработчик нажатия с тактильной отдачей
  const handlePress = async (e) => {
    if (Platform.OS !== 'web') {
      try {
        // Для разрушительных/опасных действий (danger) даем вибрацию посильнее (Heavy)
        if (variant === 'danger') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          // Для обычных действий (primary, success) - средняя отдача (Medium)
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (err) {
        console.log("Haptics Error:", err);
      }
    }
    
    // После вибрации вызываем основную функцию
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === "secondary" && {
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        getShadowStyle(),
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
  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <TextInput
          style={[styles.input, icon && { paddingLeft: 40 }]}
          placeholderTextColor={COLORS.textMuted}
          showSoftInputOnFocus={true} // Явно разрешаем клавиатуру
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
        elevated && SHADOWS.light, // Используем легкую тень для OLED минимализма
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
        return { bg: "rgba(255, 107, 0, 0.15)", color: COLORS.primary }; // Оранжевый
      case "processing":
        return { bg: "rgba(245, 158, 11, 0.15)", color: COLORS.warning }; // Желтый
      case "work":
        return { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }; // Синий (Инфо)
      case "done":
      case "income":
        return { bg: "rgba(16, 185, 129, 0.15)", color: COLORS.success }; // Зеленый
      case "cancel":
      case "expense":
        return { bg: "rgba(239, 68, 68, 0.15)", color: COLORS.danger }; // Красный
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
  button: {
    paddingVertical: 14,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radiusSm, // Строгие углы (Minimalism)
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  buttonText: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
  },
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
  inputIcon: {
    position: "absolute",
    left: SIZES.small,
    zIndex: 1,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm, // Строгие углы (Minimalism)
    color: COLORS.textMain,
    fontSize: SIZES.fontBase,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    paddingHorizontal: SIZES.medium,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)", // Легкая рамка для OLED-экранов
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});