/**
 * @file src/screens/BroadcastScreen.js
 * @description Центр уведомлений и рассылок (PROADMIN Mobile v11.0.0).
 * Интеграция с Telegram-ботом: позволяет админу делать массовые рассылки пользователям по ролям.
 * ДОБАВЛЕНО: Глубокие тени (elevated), плавающая шапка, неоновое свечение элементов (Glow).
 *
 * @module BroadcastScreen
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import {
  Radio,
  Send,
  Users,
  ShieldAlert,
  Image as ImageIcon,
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

// Конфиг аудиторий
const TARGET_OPTIONS = [
  {
    id: "all",
    label: "Всем (Общая)",
    icon: <Radio color={COLORS.textMuted} size={16} />,
  },
  {
    id: "user",
    label: "Только Клиентам",
    icon: <Users color={COLORS.textMuted} size={16} />,
  },
  {
    id: "manager",
    label: "Персоналу (Мастера)",
    icon: <ShieldAlert color={COLORS.textMuted} size={16} />,
  },
];

export default function BroadcastScreen() {
  // Стейты формы
  const [targetRole, setTargetRole] = useState("all");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // =============================================================================
  // 🚀 ОБРАБОТЧИК ОТПРАВКИ РАССЫЛКИ
  // =============================================================================
  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      Alert.alert("Ошибка", "Текст рассылки не может быть пустым");
      return;
    }

    // Защита от случайного нажатия (Confirm Dialog)
    Alert.alert(
      "Подтверждение",
      `Вы уверены, что хотите запустить рассылку?\nАудитория: ${TARGET_OPTIONS.find((t) => t.id === targetRole).label}`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Запустить",
          style: "destructive",
          onPress: executeBroadcast,
        },
      ],
    );
  };

  const executeBroadcast = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const res = await API.sendBroadcast(
        message,
        imageUrl || null,
        targetRole,
      );

      // Бэкенд возвращает success и message с количеством получателей
      Alert.alert(
        "Рассылка запущена",
        res.message || "Сообщения отправляются в фоновом режиме.",
      );

      // Очищаем форму после успешной отправки
      setMessage("");
      setImageUrl("");
    } catch (err) {
      Alert.alert(
        "Ошибка рассылки",
        err.message || "Проверьте соединение с сервером",
      );
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    <KeyboardAvoidingView
      style={GLOBAL_STYLES.safeArea}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* 🎩 ШАПКА ЭКРАНА (Floating Header) */}
          <View style={styles.header}>
            <View style={GLOBAL_STYLES.rowCenter}>
              <View style={styles.headerIcon}>
                <Radio color={COLORS.primary} size={24} />
              </View>
              <View>
                <Text style={GLOBAL_STYLES.h1}>Центр уведомлений</Text>
                <Text style={GLOBAL_STYLES.textMuted}>
                  Управление Telegram-рассылкой
                </Text>
              </View>
            </View>
          </View>

          {/* 📜 ОСНОВНОЙ КОНТЕНТ */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <PeCard elevated={true} style={{ padding: SIZES.large }}>
              {/* 1. Выбор аудитории */}
              <Text style={styles.sectionTitle}>1. Выберите аудиторию</Text>
              <View style={styles.targetContainer}>
                {TARGET_OPTIONS.map((opt) => {
                  const isActive = targetRole === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.7}
                      onPress={() => setTargetRole(opt.id)}
                      style={[
                        styles.targetBtn,
                        isActive && styles.targetBtnActive,
                        isActive && SHADOWS.glow, // Подсветка активной роли
                      ]}
                    >
                      {/* Клонируем иконку, чтобы покрасить ее, если она активна */}
                      {React.cloneElement(opt.icon, {
                        color: isActive ? COLORS.primary : COLORS.textMuted,
                      })}
                      <Text
                        style={[
                          styles.targetBtnText,
                          isActive && styles.targetBtnTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2. URL Картинки (Опционально) */}
              <Text style={[styles.sectionTitle, { marginTop: SIZES.medium }]}>
                2. Изображение (URL, опционально)
              </Text>
              <PeInput
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://example.com/image.jpg"
                autoCapitalize="none"
                autoCorrect={false}
                icon={<ImageIcon color={COLORS.textMuted} size={18} />}
              />

              {/* 3. Текст рассылки */}
              <Text style={styles.sectionTitle}>
                3. Текст сообщения (поддерживает HTML)
              </Text>
              <View style={styles.textAreaContainer}>
                <PeInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Введите текст рассылки. Например: <b>Внимание!</b> Скидки 20% на монтаж..."
                  multiline={true}
                  numberOfLines={8}
                  style={styles.textArea}
                  textAlignVertical="top"
                />
              </View>

              {/* Инфо-блок */}
              <View style={styles.infoBox}>
                <Text style={GLOBAL_STYLES.textSmall}>
                  Рассылка осуществляется через официального бота ProElectric.
                  Доставка занимает время в зависимости от размера базы.
                </Text>
              </View>

              {/* Кнопка запуска */}
              <PeButton
                title="Запустить рассылку"
                variant="primary"
                icon={<Send color="#fff" size={18} />}
                onPress={handleSendBroadcast}
                loading={loading}
                style={[styles.glowButton, { marginTop: SIZES.large }]}
              />
            </PeCard>

            {/* Отступ для комфортного скролла над клавиатурой */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.light,
    zIndex: 10,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.medium,
    ...SHADOWS.glow, // Свечение иконки в шапке
  },
  scrollContent: {
    padding: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.fontBase,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: SIZES.small,
    textTransform: "uppercase",
  },

  // Селектор аудитории
  targetContainer: {
    gap: SIZES.small,
    marginBottom: SIZES.small,
  },
  targetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: "transparent",
  },
  targetBtnActive: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: COLORS.primary,
  },
  targetBtnText: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginLeft: SIZES.small,
  },
  targetBtnTextActive: {
    color: COLORS.primary,
  },

  // Текстовая область
  textAreaContainer: {
    minHeight: 150,
  },
  textArea: {
    minHeight: 150,
    paddingTop: Platform.OS === "ios" ? SIZES.small : 12,
  },

  // Инфо-блок
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: SIZES.medium,
    borderRadius: SIZES.radiusSm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    marginTop: SIZES.small,
  },

  glowButton: {
    ...SHADOWS.glow,
  },
});
