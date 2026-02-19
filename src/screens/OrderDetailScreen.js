/**
 * @file src/screens/OrderDetailScreen.js
 * @description Экран детализации и управления объектом (PROADMIN Mobile v10.0.0).
 * UPGRADES (Senior):
 * - Интеграция с навигаторами (Linking).
 * - Функция "Поделиться сметой" (Share).
 * - Сворачиваемые секции (Accordion) для BOM и Финансов.
 * - Улучшенный UX добавления расходов (Mock фото).
 * - Защита критических действий.
 *
 * @module OrderDetailScreen
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Share,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  CheckCircle,
  FileText,
  PlusCircle,
  Share2,
  ChevronDown,
  ChevronUp,
  Camera,
  Navigation,
  MoreVertical,
} from "lucide-react-native";

// Импорт архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";

// Включаем анимации для Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
    hour: "2-digit",
    minute: "2-digit",
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
  // Получаем данные заказа из параметров
  const initialOrder = route.params?.order;

  // Локальный стейт
  const [order, setOrder] = useState(initialOrder || {});
  const [statusLoading, setStatusLoading] = useState(false);

  // Стейты UI (Сворачивание секций)
  const [isFinExpanded, setIsFinExpanded] = useState(true);
  const [isBomExpanded, setIsBomExpanded] = useState(false); // BOM свернут по умолчанию, если он длинный

  // Стейты финансов
  const [finalPrice, setFinalPrice] = useState(
    String(order?.details?.financials?.final_price || order?.total_price || 0),
  );
  const [priceLoading, setPriceLoading] = useState(false);

  // Стейты расходов
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Материалы");
  const [expComment, setExpComment] = useState("");
  const [expLoading, setExpLoading] = useState(false);

  // Безопасное извлечение данных
  const details = order?.details || {};
  const financials = details?.financials || {
    final_price: order?.total_price || 0,
    total_expenses: 0,
    net_profit: order?.total_price || 0,
    expenses: [],
  };
  const bom = Array.isArray(details?.bom) ? details.bom : [];
  const area = order?.area || details?.params?.area || 0;
  const address = order?.address || "Адрес не указан";

  // Если данные потеряны
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
  // ⚡️ ACTIONS & LOGIC
  // =============================================================================

  // Переключение секций с анимацией
  const toggleSection = (setter, value) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(!value);
  };

  // Открытие карты
  const handleOpenMap = () => {
    if (!order.address) {
      Alert.alert("Нет адреса", "Адрес объекта не указан");
      return;
    }
    const query = encodeURIComponent(order.address);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
    });
    Linking.openURL(url).catch(() =>
      Alert.alert("Ошибка", "Не удалось открыть карты"),
    );
  };

  // Поделиться (Share)
  const handleShare = async () => {
    try {
      const message = `Объект #${order.id}\nКлиент: ${order.client_name}\nАдрес: ${address}\nСтатус: ${order.status}\n\nСумма: ${formatKZT(financials.final_price)}`;
      await Share.share({
        message,
        title: `Заказ #${order.id}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  // Смена статуса
  const handleStatusChange = async (newStatus) => {
    if (newStatus === order.status) return;

    // Защита от случайного завершения/отмены
    if (["done", "cancel"].includes(newStatus)) {
      Alert.alert(
        "Подтверждение",
        `Вы уверены, что хотите перевести объект в статус "${newStatus === "done" ? "Завершен" : "Отказ"}"?`,
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "Да",
            style: "destructive",
            onPress: () => processStatusChange(newStatus),
          },
        ],
      );
    } else {
      processStatusChange(newStatus);
    }
  };

  const processStatusChange = async (newStatus) => {
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

  // Обновление цены
  const handleUpdateFinalPrice = async () => {
    const numPrice = parseFloat(finalPrice.replace(/[^0-9.]/g, ""));
    if (isNaN(numPrice))
      return Alert.alert("Ошибка", "Введите корректную сумму");

    setPriceLoading(true);
    try {
      const res = await API.updateOrderFinalPrice(order.id, numPrice);
      setOrder((prev) => ({
        ...prev,
        total_price: numPrice,
        details: { ...prev.details, financials: res.financials },
      }));
      Alert.alert("Успех", "Договорная цена зафиксирована");
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Не удалось обновить цену");
    } finally {
      setPriceLoading(false);
    }
  };

  // Добавление расхода
  const handleAddExpense = async () => {
    const numAmount = parseFloat(expAmount.replace(/[^0-9.]/g, ""));
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
      setOrder((prev) => ({
        ...prev,
        details: { ...prev.details, financials: res.financials },
      }));
      setExpAmount("");
      setExpComment("");
      Alert.alert("Расход добавлен", `Списано ${formatKZT(numAmount)}`);
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Не удалось списать расход");
    } finally {
      setExpLoading(false);
    }
  };

  // =============================================================================
  // 🖥 UI RENDER
  // =============================================================================
  return (
    <KeyboardAvoidingView
      style={GLOBAL_STYLES.safeArea}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 🎩 Header */}
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
            {area} м² • {formatDate(order.created_at).split(",")[0]}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
          <Share2 color={COLORS.primary} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Карточка клиента и адреса */}
        <PeCard>
          <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 12 }]}>
            <User
              color={COLORS.primary}
              size={18}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={GLOBAL_STYLES.h3}>
                {order.client_name || "Клиент"}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${order.client_phone}`)}
              >
                <Text style={{ color: COLORS.primary, marginTop: 2 }}>
                  {order.client_phone || "Нет телефона"}
                </Text>
              </TouchableOpacity>
            </View>
            <PeBadge status={order.status} />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[GLOBAL_STYLES.rowCenter, { marginTop: 8 }]}
            onPress={handleOpenMap}
            activeOpacity={0.7}
          >
            <MapPin
              color={COLORS.danger}
              size={18}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={GLOBAL_STYLES.textBody} numberOfLines={2}>
                {address}
              </Text>
              <Text
                style={[GLOBAL_STYLES.textSmall, { color: COLORS.primary }]}
              >
                Открыть в картах
              </Text>
            </View>
            <Navigation color={COLORS.textMuted} size={16} />
          </TouchableOpacity>
        </PeCard>

        {/* 2. Статус бар */}
        <Text style={styles.sectionTitle}>Этап работ</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 24 }}
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
                      style={{ marginRight: 6 }}
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

        {/* 3. Финансы (Collapsible) */}
        <View style={styles.accordionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Финансы</Text>
          <TouchableOpacity
            onPress={() => toggleSection(setIsFinExpanded, isFinExpanded)}
          >
            {isFinExpanded ? (
              <ChevronUp color={COLORS.textMuted} />
            ) : (
              <ChevronDown color={COLORS.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        {isFinExpanded && (
          <PeCard>
            {/* Редактирование цены */}
            <View style={styles.finRowEdit}>
              <View>
                <Text style={GLOBAL_STYLES.textMuted}>Договорная цена:</Text>
                <Text style={GLOBAL_STYLES.textSmall}>Факт. бюджет</Text>
              </View>
              <View style={GLOBAL_STYLES.rowCenter}>
                <PeInput
                  value={finalPrice}
                  onChangeText={setFinalPrice}
                  keyboardType="numeric"
                  style={styles.smallInput}
                  placeholder="0"
                />
                <TouchableOpacity
                  style={styles.okBtn}
                  onPress={handleUpdateFinalPrice}
                  disabled={priceLoading}
                >
                  {priceLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <CheckCircle color="#fff" size={16} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.finRow}>
              <Text style={GLOBAL_STYLES.textMuted}>Расходы:</Text>
              <Text style={[GLOBAL_STYLES.textBody, { color: COLORS.danger }]}>
                -{formatKZT(financials.total_expenses)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.finRow}>
              <Text style={[GLOBAL_STYLES.h3, { color: COLORS.success }]}>
                ПРИБЫЛЬ:
              </Text>
              <Text style={[GLOBAL_STYLES.h2, { color: COLORS.success }]}>
                {formatKZT(financials.net_profit)}
              </Text>
            </View>

            {/* Форма расходов */}
            <View style={styles.expenseForm}>
              <Text style={styles.labelSmall}>Новый расход</Text>
              <View style={GLOBAL_STYLES.rowCenter}>
                <PeInput
                  value={expAmount}
                  onChangeText={setExpAmount}
                  keyboardType="numeric"
                  placeholder="Сумма"
                  style={{ flex: 1, marginBottom: 0, marginRight: 8 }}
                />
                <TouchableOpacity
                  style={[
                    styles.catBtn,
                    expCategory === "Материалы"
                      ? styles.catBtnPrimary
                      : styles.catBtnSecondary,
                  ]}
                  onPress={() =>
                    setExpCategory(
                      expCategory === "Материалы" ? "Транспорт" : "Материалы",
                    )
                  }
                >
                  <Text
                    style={
                      expCategory === "Материалы"
                        ? styles.catBtnTextActive
                        : styles.catBtnText
                    }
                  >
                    {expCategory}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[GLOBAL_STYLES.rowCenter, { marginTop: 8 }]}>
                <PeInput
                  value={expComment}
                  onChangeText={setExpComment}
                  placeholder="Комментарий..."
                  style={{ flex: 1, marginBottom: 0, marginRight: 8 }}
                />
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={() =>
                    Alert.alert("Функция в разработке", "Здесь будет камера")
                  }
                >
                  <Camera color={COLORS.textMuted} size={20} />
                </TouchableOpacity>
              </View>

              <PeButton
                title="Списать"
                variant="danger"
                loading={expLoading}
                onPress={handleAddExpense}
                style={{ marginTop: 12 }}
              />
            </View>
          </PeCard>
        )}

        {/* 4. История расходов */}
        {isFinExpanded && financials.expenses.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text
              style={[styles.labelSmall, { marginLeft: 4, marginBottom: 8 }]}
            >
              История операций
            </Text>
            {financials.expenses.map((exp, idx) => (
              <View key={idx} style={styles.expenseRow}>
                <View>
                  <Text style={styles.expenseCat}>{exp.category}</Text>
                  <Text style={styles.expenseDate}>{formatDate(exp.date)}</Text>
                  {exp.comment && (
                    <Text style={styles.expenseComment}>{exp.comment}</Text>
                  )}
                </View>
                <Text style={styles.expenseAmount}>
                  -{formatKZT(exp.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 5. Спецификация (BOM) */}
        <View style={[styles.accordionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitleNoMargin}>
            Материалы ({bom.length})
          </Text>
          <TouchableOpacity
            onPress={() => toggleSection(setIsBomExpanded, isBomExpanded)}
          >
            {isBomExpanded ? (
              <ChevronUp color={COLORS.textMuted} />
            ) : (
              <ChevronDown color={COLORS.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        {isBomExpanded ? (
          <PeCard style={{ padding: 0, overflow: "hidden" }}>
            {bom.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={GLOBAL_STYLES.textMuted}>Спецификация пуста</Text>
              </View>
            ) : (
              bom.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.bomItem,
                    idx === bom.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <FileText
                    color={COLORS.textMuted}
                    size={16}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[GLOBAL_STYLES.textBody, { flex: 1 }]}>
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
        ) : (
          // Preview для свернутого состояния (показываем первые 2)
          bom.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {bom.slice(0, 2).map((item, idx) => (
                <Text
                  key={idx}
                  style={[
                    GLOBAL_STYLES.textMuted,
                    { marginLeft: 16, marginBottom: 4 },
                  ]}
                >
                  • {item.name} ({item.qty})
                </Text>
              ))}
              {bom.length > 2 && (
                <Text
                  style={[
                    GLOBAL_STYLES.textSmall,
                    { marginLeft: 16, color: COLORS.primary },
                  ]}
                >
                  ...и еще {bom.length - 2} позиций
                </Text>
              )}
            </View>
          )
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// 🎨 STYLES
// =============================================================================
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerAction: {
    padding: 8,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
  },
  scrollContent: { padding: SIZES.large },
  sectionTitle: {
    fontSize: SIZES.fontTitle,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitleNoMargin: {
    fontSize: SIZES.fontTitle,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    opacity: 0.5,
  },
  // Status Pills
  statusPillsWrapper: { flexDirection: "row", gap: 8 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statusPillActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  statusPillText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  statusPillTextActive: { color: COLORS.primary },
  // Finance
  finRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  finRowEdit: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  smallInput: {
    width: 100,
    height: 36,
    marginBottom: 0,
    textAlign: "right",
    fontSize: 14,
  },
  okBtn: {
    backgroundColor: COLORS.success,
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  // Expense Form
  expenseForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderStyle: "dashed",
  },
  labelSmall: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  catBtn: {
    paddingHorizontal: 12,
    height: 48, // Match input height
    borderRadius: 12,
    justifyContent: "center",
    borderWidth: 1,
  },
  catBtnPrimary: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  catBtnSecondary: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
  },
  catBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  catBtnTextActive: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
  cameraBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Expense History
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  expenseCat: { fontWeight: "600", color: COLORS.textMain, fontSize: 14 },
  expenseDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  expenseComment: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  expenseAmount: { color: COLORS.danger, fontWeight: "700" },
  // BOM
  bomItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bomQtyBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  bomQtyText: { fontSize: 12, fontWeight: "700", color: COLORS.textMain },
});
