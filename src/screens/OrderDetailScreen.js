/**
 * @file src/screens/OrderDetailScreen.js
 * @description Экран детализации и управления объектом (PROADMIN Mobile v11.0.0).
 * Позволяет управлять статусом, финансами (списание чеков) и просматривать спецификацию (BOM).
 * ДОБАВЛЕНО: Интеграция с системой глубоких теней (elevated), усиленный deep merge стейтов.
 *
 * @module OrderDetailScreen
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  ArrowLeft,
  User,
  Phone,
  CheckCircle,
  FileText,
  PlusCircle,
} from "lucide-react-native";

// Импорт архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

// Утилиты
const formatKZT = (num) =>
  (parseFloat(num) || 0).toLocaleString("ru-RU") + " ₸";
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Конфиг статусов
const STATUS_OPTIONS = [
  { id: "new", label: "Новый" },
  { id: "processing", label: "Замер" },
  { id: "work", label: "В работе" },
  { id: "done", label: "Завершен" },
  { id: "cancel", label: "Отказ" },
];

export default function OrderDetailScreen({ route, navigation }) {
  // Получаем данные заказа из параметров маршрута
  const initialOrder = route.params?.order;

  // Локальный стейт для мгновенного UI-апдейта
  const [order, setOrder] = useState(initialOrder || {});
  const [statusLoading, setStatusLoading] = useState(false);

  // Стейты для финансового блока
  const [finalPrice, setFinalPrice] = useState(
    String(order?.details?.financials?.final_price || order?.total_price || 0),
  );
  const [priceLoading, setPriceLoading] = useState(false);

  // Стейты для нового расхода (Чека)
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Материалы");
  const [expComment, setExpComment] = useState("");
  const [expLoading, setExpLoading] = useState(false);

  // Безопасное извлечение данных (Graceful Degradation)
  const details = order?.details || {};
  const financials = details?.financials || {
    final_price: order?.total_price || 0,
    total_expenses: 0,
    net_profit: order?.total_price || 0,
    expenses: [],
  };
  const bom = Array.isArray(details?.bom) ? details.bom : [];
  const area = order?.area || details?.params?.area || 0;

  // Если заказ не передан, показываем заглушку
  if (!initialOrder) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, GLOBAL_STYLES.center]}>
        <Text style={GLOBAL_STYLES.textMuted}>
          Ошибка: Данные объекта не найдены
        </Text>
        <PeButton
          title="Назад"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  // =============================================================================
  // 🔄 ОБРАБОТЧИКИ API (BUSINESS LOGIC)
  // =============================================================================

  const handleStatusChange = async (newStatus) => {
    if (newStatus === order.status) return;
    setStatusLoading(true);
    try {
      await API.updateOrderStatus(order.id, newStatus);
      setOrder((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Не удалось обновить статус");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleUpdateFinalPrice = async () => {
    const numPrice = parseFloat(finalPrice);
    if (isNaN(numPrice))
      return Alert.alert("Ошибка", "Введите корректную сумму");

    setPriceLoading(true);
    try {
      const res = await API.updateOrderFinalPrice(order.id, numPrice);
      // Бэкенд возвращает обновленный объект financials, мержим его безопасно
      setOrder((prev) => ({
        ...prev,
        total_price: numPrice,
        details: {
          ...prev.details,
          financials: { ...prev.details?.financials, ...res.financials },
        },
      }));
      Alert.alert("Успех", "Договорная цена зафиксирована");
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Не удалось обновить цену");
    } finally {
      setPriceLoading(false);
    }
  };

  const handleAddExpense = async () => {
    const numAmount = parseFloat(expAmount);
    if (isNaN(numAmount) || numAmount <= 0)
      return Alert.alert("Ошибка", "Введите сумму расхода");

    setExpLoading(true);
    try {
      const res = await API.addOrderExpense(
        order.id,
        numAmount,
        expCategory,
        expComment,
      );
      // Обновляем финансы локально
      setOrder((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          financials: { ...prev.details?.financials, ...res.financials },
        },
      }));
      // Очищаем форму
      setExpAmount("");
      setExpComment("");
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Не удалось списать расход");
    } finally {
      setExpLoading(false);
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
      {/* 🎩 ШАПКА ЭКРАНА (CUSTOM HEADER) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={COLORS.textMain} size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SIZES.small }}>
          <Text style={GLOBAL_STYLES.h2} numberOfLines={1}>
            Объект #{order.id}
          </Text>
          <Text style={GLOBAL_STYLES.textMuted}>
            {area} м² • {formatDate(order.created_at)}
          </Text>
        </View>
        <PeBadge status={order.status} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 👤 КАРТОЧКА ЗАКАЗЧИКА (elevated v11.0) */}
        <PeCard elevated={true}>
          <View
            style={[GLOBAL_STYLES.rowCenter, { marginBottom: SIZES.small }]}
          >
            <User
              color={COLORS.primary}
              size={18}
              style={{ marginRight: SIZES.base }}
            />
            <Text style={GLOBAL_STYLES.h3}>
              {order.client_name || "Оффлайн клиент"}
            </Text>
          </View>
          <View
            style={[GLOBAL_STYLES.rowCenter, { marginBottom: SIZES.small }]}
          >
            <Phone
              color={COLORS.textMuted}
              size={16}
              style={{ marginRight: SIZES.base }}
            />
            <Text style={GLOBAL_STYLES.textBody}>
              {order.client_phone || "Номер не указан"}
            </Text>
          </View>
        </PeCard>

        {/* 🚦 УПРАВЛЕНИЕ СТАТУСОМ */}
        <Text style={styles.sectionTitle}>Стадия объекта</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: SIZES.large }}
        >
          <View style={styles.statusPillsWrapper}>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = order.status === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  disabled={statusLoading}
                  onPress={() => handleStatusChange(opt.id)}
                  style={[
                    styles.statusPill,
                    isActive && styles.statusPillActive,
                  ]}
                >
                  {isActive && (
                    <CheckCircle
                      color={COLORS.primary}
                      size={14}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.statusPillText,
                      isActive && styles.statusPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* 💸 ФИНАНСЫ И ЧЕКИ (elevated v11.0) */}
        <Text style={styles.sectionTitle}>Финансы объекта</Text>
        <PeCard elevated={true}>
          <View style={styles.finRow}>
            <Text style={GLOBAL_STYLES.textMuted}>Расчетная база сметы:</Text>
            <Text style={GLOBAL_STYLES.textBody}>
              {formatKZT(details?.total?.work || order.total_price)}
            </Text>
          </View>

          <View style={styles.finRowEdit}>
            <Text style={[GLOBAL_STYLES.textMain, { flex: 1 }]}>
              Договорная цена:
            </Text>
            <View style={GLOBAL_STYLES.rowCenter}>
              <PeInput
                value={finalPrice}
                onChangeText={setFinalPrice}
                keyboardType="numeric"
                style={{ marginBottom: 0, width: 120, height: 40 }}
                placeholder="Цена"
              />
              <PeButton
                title="ОК"
                onPress={handleUpdateFinalPrice}
                loading={priceLoading}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginLeft: 8,
                }}
              />
            </View>
          </View>

          <View style={styles.finRow}>
            <Text style={GLOBAL_STYLES.textMuted}>Сумма затрат:</Text>
            <Text style={[GLOBAL_STYLES.textBody, { color: COLORS.danger }]}>
              -{formatKZT(financials.total_expenses)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.finRow}>
            <Text style={[GLOBAL_STYLES.h3, { color: COLORS.success }]}>
              ЧИСТАЯ ПРИБЫЛЬ:
            </Text>
            <Text style={[GLOBAL_STYLES.h2, { color: COLORS.success }]}>
              {formatKZT(financials.net_profit)}
            </Text>
          </View>
        </PeCard>

        {/* 🧾 СПИСОК РАСХОДОВ (elevated v11.0) */}
        <Text style={[styles.sectionTitle, { fontSize: SIZES.fontBase }]}>
          Реестр расходов (Чеки)
        </Text>
        <PeCard elevated={true} style={{ padding: SIZES.small }}>
          {financials.expenses.length === 0 ? (
            <Text
              style={[
                GLOBAL_STYLES.textMuted,
                { textAlign: "center", marginVertical: SIZES.small },
              ]}
            >
              Расходов пока нет
            </Text>
          ) : (
            financials.expenses.map((exp, idx) => (
              <View key={idx} style={styles.expenseItem}>
                <View style={{ flex: 1 }}>
                  <View style={GLOBAL_STYLES.rowCenter}>
                    <Text
                      style={[
                        GLOBAL_STYLES.textBody,
                        { fontWeight: "600", marginRight: 8 },
                      ]}
                    >
                      {exp.category}
                    </Text>
                    <Text style={GLOBAL_STYLES.textSmall}>
                      {formatDate(exp.date)}
                    </Text>
                  </View>
                  {exp.comment ? (
                    <Text style={[GLOBAL_STYLES.textSmall, { marginTop: 2 }]}>
                      {exp.comment}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    GLOBAL_STYLES.textBody,
                    { color: COLORS.danger, fontWeight: "700" },
                  ]}
                >
                  -{formatKZT(exp.amount)}
                </Text>
              </View>
            ))
          )}

          {/* Форма добавления расхода */}
          <View style={styles.expenseForm}>
            <View
              style={[GLOBAL_STYLES.rowCenter, { marginBottom: SIZES.small }]}
            >
              <PeInput
                value={expAmount}
                onChangeText={setExpAmount}
                keyboardType="numeric"
                placeholder="Сумма (₸)"
                style={{ flex: 1, marginBottom: 0, marginRight: SIZES.small }}
              />
              <TouchableOpacity
                style={[
                  styles.catBtn,
                  expCategory === "Материалы" && styles.catBtnActive,
                ]}
                onPress={() =>
                  setExpCategory(
                    expCategory === "Материалы" ? "Транспорт" : "Материалы",
                  )
                }
              >
                <Text
                  style={[
                    styles.catBtnText,
                    expCategory === "Материалы" && styles.catBtnTextActive,
                  ]}
                >
                  {expCategory}
                </Text>
              </TouchableOpacity>
            </View>
            <PeInput
              value={expComment}
              onChangeText={setExpComment}
              placeholder="Комментарий к расходу..."
            />
            <PeButton
              title="Списать расход"
              variant="danger"
              loading={expLoading}
              onPress={handleAddExpense}
              icon={<PlusCircle color="#fff" size={18} />}
            />
          </View>
        </PeCard>

        {/* 📋 СПЕЦИФИКАЦИЯ BOM (elevated v11.0) */}
        <Text style={styles.sectionTitle}>Спецификация (BOM)</Text>
        <PeCard elevated={true} style={{ padding: SIZES.small }}>
          {bom.length === 0 ? (
            <Text
              style={[
                GLOBAL_STYLES.textMuted,
                { textAlign: "center", marginVertical: SIZES.small },
              ]}
            >
              Спецификация пуста
            </Text>
          ) : (
            bom.map((item, idx) => (
              <View key={idx} style={styles.bomItem}>
                <FileText
                  color={COLORS.textMuted}
                  size={16}
                  style={{ marginRight: SIZES.small }}
                />
                <Text
                  style={[GLOBAL_STYLES.textBody, { flex: 1 }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <View style={styles.bomQtyBadge}>
                  <Text style={styles.bomQtyText}>
                    {item.qty} {item.unit}
                  </Text>
                </View>
              </View>
            ))
          )}
        </PeCard>

        {/* Безопасный отступ под системные жесты */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.medium,
    paddingTop: SIZES.medium,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.light,
    zIndex: 10,
  },
  backBtn: {
    padding: SIZES.base,
  },
  scrollContent: {
    padding: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.fontTitle,
    fontWeight: "700",
    color: COLORS.textMain,
    marginTop: SIZES.small,
    marginBottom: SIZES.medium,
  },

  // Статусы
  statusPillsWrapper: {
    flexDirection: "row",
    gap: SIZES.small,
    paddingBottom: SIZES.base, // Чтобы тени не обрезались скроллом
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    ...SHADOWS.light,
  },
  statusPillActive: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: COLORS.primary,
  },
  statusPillText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontBase,
    fontWeight: "600",
  },
  statusPillTextActive: {
    color: COLORS.primary,
  },

  // Финансы
  finRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.small,
  },
  finRowEdit: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: SIZES.small,
    paddingVertical: SIZES.small,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.medium,
  },

  // Чеки
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.small,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  expenseForm: {
    marginTop: SIZES.medium,
    paddingTop: SIZES.medium,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  catBtn: {
    paddingVertical: 12,
    paddingHorizontal: SIZES.small,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
  },
  catBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  catBtnText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  catBtnTextActive: {
    color: COLORS.primary,
  },

  // BOM
  bomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  bomQtyBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: SIZES.radiusSm,
    marginLeft: SIZES.small,
  },
  bomQtyText: {
    color: COLORS.textMain,
    fontSize: SIZES.fontSmall,
    fontWeight: "700",
  },
});
