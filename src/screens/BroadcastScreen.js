/**
 * @file src/screens/BroadcastScreen.js
 * @description Экран управления массовыми рассылками (PROADMIN Mobile v10.0.0).
 * Позволяет отправлять уведомления пользователям Telegram-бота.
 * UPGRADES (Senior):
 * - Сегментация аудитории (Targeting).
 * - Быстрые шаблоны сообщений.
 * - История отправленных рассылок.
 * - Защита от случайной отправки (Confirm Dialog).
 *
 * @module BroadcastScreen
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  FlatList,
} from "react-native";
import {
  Send,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  User,
} from "lucide-react-native";

// Импорт архитектуры
import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";

// Константы
const TARGET_AUDIENCES = [
  {
    id: "all",
    label: "Все пользователи",
    icon: <Users size={16} color={COLORS.textMuted} />,
  },
  {
    id: "users",
    label: "Только клиенты",
    icon: <User size={16} color={COLORS.textMuted} />,
  },
  {
    id: "staff",
    label: "Сотрудники",
    icon: <UserCheck size={16} color={COLORS.textMuted} />,
  },
];

const TEMPLATES = [
  {
    id: 1,
    text: "🛠 Уважаемые пользователи! Проводятся технические работы. Бот может быть временно недоступен.",
  },
  {
    id: 2,
    text: "👋 Добрый день! Напоминаем о необходимости проверить статус вашего заказа.",
  },
  { id: 3, text: "⚡️ Важная информация: обновились цены на услуги." },
  { id: 4, text: "✅ Ваш заказ успешно выполнен. Оцените качество работы." },
];

export default function BroadcastScreen() {
  // UI State
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Data State
  const [history, setHistory] = useState([]);

  // =============================================================================
  // 📡 ЗАГРУЗКА ИСТОРИИ
  // =============================================================================
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      // Mock или реальный вызов API
      const data = await API.getBroadcastHistory();
      setHistory(data || []);
    } catch (error) {
      console.log("Ошибка загрузки истории рассылок", error);
      // Не блокируем экран ошибкой, просто покажем пустую историю
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // =============================================================================
  // 🚀 ОТПРАВКА СООБЩЕНИЯ
  // =============================================================================
  const handleSendPress = () => {
    if (!message.trim()) {
      Alert.alert("Ошибка", "Введите текст сообщения");
      return;
    }

    const targetLabel = TARGET_AUDIENCES.find((t) => t.id === target)?.label;

    Alert.alert(
      "Подтверждение рассылки",
      `Вы уверены, что хотите отправить это сообщение?\n\nАудитория: ${targetLabel}\nПолучателей: ~${history.length * 10 + 50} (расчет)`, // Mock count
      [
        { text: "Отмена", style: "cancel" },
        { text: "Отправить", onPress: performSend, style: "default" },
      ],
    );
  };

  const performSend = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      await API.sendBroadcast({
        message,
        target,
        date: new Date().toISOString(),
      });

      Alert.alert("Успех", "Рассылка поставлена в очередь");
      setMessage("");
      fetchHistory(); // Обновляем список
    } catch (error) {
      Alert.alert("Ошибка", error.message || "Не удалось отправить рассылку");
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🧩 РЕНДЕР ЭЛЕМЕНТОВ
  // =============================================================================
  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <View style={GLOBAL_STYLES.rowCenter}>
          <Clock
            size={12}
            color={COLORS.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.historyDate}>
            {new Date(item.created_at).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                item.target === "staff"
                  ? COLORS.warning + "20"
                  : COLORS.primary + "10",
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color:
                  item.target === "staff" ? COLORS.warning : COLORS.primary,
              },
            ]}
          >
            {TARGET_AUDIENCES.find((t) => t.id === item.target)?.label ||
              item.target}
          </Text>
        </View>
      </View>
      <Text style={styles.historyText} numberOfLines={2}>
        {item.message}
      </Text>
      <View style={styles.historyFooter}>
        <CheckCircle
          size={14}
          color={COLORS.success}
          style={{ marginRight: 4 }}
        />
        <Text style={styles.successText}>
          Доставлено: {item.sent_count || 0}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={GLOBAL_STYLES.safeArea}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* 🎩 Header */}
      <View style={styles.header}>
        <View>
          <Text style={GLOBAL_STYLES.h1}>Рассылка</Text>
          <Text style={GLOBAL_STYLES.textMuted}>Уведомления пользователям</Text>
        </View>
        <View style={styles.headerIcon}>
          <MessageSquare color={COLORS.primary} size={24} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. Выбор аудитории */}
        <Text style={styles.sectionTitle}>Получатели</Text>
        <View style={styles.targetContainer}>
          {TARGET_AUDIENCES.map((t) => {
            const isActive = target === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTarget(t.id)}
                activeOpacity={0.7}
                style={[styles.targetCard, isActive && styles.targetCardActive]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    isActive && { backgroundColor: COLORS.primary },
                  ]}
                >
                  {React.cloneElement(t.icon, {
                    color: isActive ? "#fff" : COLORS.textMuted,
                  })}
                </View>
                <Text
                  style={[
                    styles.targetLabel,
                    isActive && styles.targetLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
                {isActive && (
                  <View style={styles.checkIcon}>
                    <CheckCircle size={16} color={COLORS.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Ввод сообщения */}
        <PeCard style={styles.inputCard}>
          <Text style={styles.labelSmall}>Текст сообщения</Text>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="Введите текст рассылки..."
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />

          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{message.length} зн.</Text>
            {message.length === 0 && (
              <View style={GLOBAL_STYLES.rowCenter}>
                <AlertTriangle
                  size={12}
                  color={COLORS.warning}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[GLOBAL_STYLES.textSmall, { color: COLORS.warning }]}
                >
                  Поле не может быть пустым
                </Text>
              </View>
            )}
          </View>
        </PeCard>

        {/* 3. Шаблоны */}
        <View style={styles.templatesContainer}>
          <Text style={styles.sectionTitle}>Шаблоны</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
          >
            {TEMPLATES.map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                style={styles.chip}
                onPress={() => setMessage(tpl.text)}
              >
                <FileText
                  size={14}
                  color={COLORS.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.chipText} numberOfLines={1}>
                  {tpl.text.substring(0, 25)}...
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 4. Кнопка отправки */}
        <PeButton
          title="Отправить рассылку"
          icon={<Send size={20} color="#fff" />}
          onPress={handleSendPress}
          loading={loading}
          disabled={!message.trim()}
          style={styles.sendButton}
        />

        {/* 5. История */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>История отправлений</Text>

          {historyLoading ? (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={{ marginTop: 20 }}
            />
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={GLOBAL_STYLES.textMuted}>История пуста</Text>
            </View>
          ) : (
            // Используем map, так как мы внутри ScrollView
            history.map((item, index) => (
              <View key={index}>{renderHistoryItem({ item })}</View>
            ))
          )}
        </View>

        {/* Extra space for safe area */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.fontBase,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 12,
    marginTop: 8,
  },

  // Target Selector
  targetContainer: {
    gap: 10,
    marginBottom: 24,
  },
  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  targetCardActive: {
    backgroundColor: COLORS.primary + "08",
    borderColor: COLORS.primary,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  targetLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "600",
    flex: 1,
  },
  targetLabelActive: {
    color: COLORS.primary,
  },
  checkIcon: {
    marginLeft: 8,
  },

  // Input
  inputCard: {
    padding: 16,
    marginBottom: 24,
  },
  labelSmall: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  textInput: {
    minHeight: 120,
    color: COLORS.textMain,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Templates
  templatesContainer: {
    marginBottom: 24,
  },
  chipsScroll: {
    marginHorizontal: -SIZES.large, // Compensate padding
    paddingHorizontal: SIZES.large,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textMain,
  },

  // Button
  sendButton: {
    marginBottom: 32,
  },

  // History
  historyContainer: {
    marginTop: 8,
  },
  historyItem: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  historyText: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
    marginBottom: 10,
  },
  historyFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  successText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "600",
  },
  emptyHistory: {
    alignItems: "center",
    padding: 20,
  },
});
