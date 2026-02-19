/**
 * @file src/screens/OrderDetailScreen.js
 * @description Экран управления объектом и спецификацией BOM (PROADMIN Mobile v11.0.6).
 * ДОБАВЛЕНО: Управление BOM (Add/Edit/Delete), SafeAreaView для исключения наложений,
 * улучшенная эргономика нижних зон.
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // 🔥 Защита от челок
import {
  ArrowLeft,
  User,
  Phone,
  CheckCircle,
  FileText,
  PlusCircle,
  Trash2,
  Edit3,
  X,
} from "lucide-react-native";

// Импорт архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

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

const STATUS_OPTIONS = [
  { id: "new", label: "Новый" },
  { id: "processing", label: "Замер" },
  { id: "work", label: "В работе" },
  { id: "done", label: "Завершен" },
  { id: "cancel", label: "Отказ" },
];

export default function OrderDetailScreen({ route, navigation }) {
  const initialOrder = route.params?.order;
  const [order, setOrder] = useState(initialOrder || {});
  const [statusLoading, setStatusLoading] = useState(false);

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

  // 🔥 Стейты BOM (Спецификации)
  const [bomModalVisible, setBomModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [bomName, setBomName] = useState("");
  const [bomQty, setBomQty] = useState("");
  const [bomUnit, setBomUnit] = useState("шт.");
  const [bomLoading, setBomLoading] = useState(false);

  const details = order?.details || {};
  const financials = details?.financials || {
    total_expenses: 0,
    net_profit: 0,
    expenses: [],
  };
  const bom = Array.isArray(details?.bom) ? details.bom : [];

  // =============================================================================
  // 🛠 ФУНКЦИИ УПРАВЛЕНИЯ BOM (НОВОЕ)
  // =============================================================================

  const handleOpenBomModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setBomName(item.name);
      setBomQty(String(item.qty));
      setBomUnit(item.unit);
    } else {
      setEditingItem(null);
      setBomName("");
      setBomQty("");
      setBomUnit("шт.");
    }
    setBomModalVisible(true);
  };

  const handleSaveBomItem = async () => {
    if (!bomName.trim() || !bomQty)
      return Alert.alert("Ошибка", "Заполните название и количество");
    setBomLoading(true);
    try {
      let updatedBom = [...bom];
      if (editingItem) {
        // Редактирование
        updatedBom = updatedBom.map((i) =>
          i.name === editingItem.name
            ? { ...i, name: bomName, qty: parseFloat(bomQty), unit: bomUnit }
            : i,
        );
      } else {
        // Добавление нового
        updatedBom.push({
          name: bomName,
          qty: parseFloat(bomQty),
          unit: bomUnit,
        });
      }

      // Отправляем весь массив BOM на сервер (Standard ERP flow)
      await API.updateOrderDetails(order.id, "bom", updatedBom);

      setOrder((prev) => ({
        ...prev,
        details: { ...prev.details, bom: updatedBom },
      }));
      setBomModalVisible(false);
    } catch (err) {
      Alert.alert("Ошибка BOM", err.message);
    } finally {
      setBomLoading(false);
    }
  };

  const handleDeleteBomItem = (index) => {
    Alert.alert("Удаление", "Удалить этот материал из спецификации?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          const updatedBom = bom.filter((_, i) => i !== index);
          try {
            await API.updateOrderDetails(order.id, "bom", updatedBom);
            setOrder((prev) => ({
              ...prev,
              details: { ...prev.details, bom: updatedBom },
            }));
          } catch (err) {
            Alert.alert("Ошибка", "Не удалось удалить позицию");
          }
        },
      },
    ]);
  };

  // =============================================================================
  // 🔄 ОСТАЛЬНАЯ ЛОГИКА (БЕЗ ИЗМЕНЕНИЙ)
  // =============================================================================

  const handleStatusChange = async (newStatus) => {
    if (newStatus === order.status) return;
    setStatusLoading(true);
    try {
      await API.updateOrderStatus(order.id, newStatus);
      setOrder((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      Alert.alert("Ошибка", err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleUpdateFinalPrice = async () => {
    setPriceLoading(true);
    try {
      const res = await API.updateOrderFinalPrice(
        order.id,
        parseFloat(finalPrice),
      );
      setOrder((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          financials: { ...prev.details?.financials, ...res.financials },
        },
      }));
      Alert.alert("Успех", "Цена зафиксирована");
    } catch (err) {
      Alert.alert("Ошибка", err.message);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleAddExpense = async () => {
    setExpLoading(true);
    try {
      const res = await API.addOrderExpense(
        order.id,
        parseFloat(expAmount),
        expCategory,
        expComment,
      );
      setOrder((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          financials: { ...prev.details?.financials, ...res.financials },
        },
      }));
      setExpAmount("");
      setExpComment("");
    } catch (err) {
      Alert.alert("Ошибка", err.message);
    } finally {
      setExpLoading(false);
    }
  };

  return (
    <SafeAreaView style={GLOBAL_STYLES.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : null}
      >
        {/* ШАПКА */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft color={COLORS.textMain} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: SIZES.small }}>
            <Text style={GLOBAL_STYLES.h2}>Объект #{order.id}</Text>
            <Text style={GLOBAL_STYLES.textMuted}>
              {formatDate(order.created_at)}
            </Text>
          </View>
          <PeBadge status={order.status} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* КАРТОЧКА КЛИЕНТА */}
          <PeCard elevated={true}>
            <View style={GLOBAL_STYLES.rowCenter}>
              <User
                color={COLORS.primary}
                size={18}
                style={{ marginRight: 8 }}
              />
              <Text style={GLOBAL_STYLES.h3}>
                {order.client_name || "Клиент"}
              </Text>
            </View>
            <View style={[GLOBAL_STYLES.rowCenter, { marginTop: 8 }]}>
              <Phone
                color={COLORS.textMuted}
                size={16}
                style={{ marginRight: 8 }}
              />
              <Text style={GLOBAL_STYLES.textBody}>
                {order.client_phone || "—"}
              </Text>
            </View>
          </PeCard>

          {/* СТАТУСЫ */}
          <Text style={styles.sectionTitle}>Статус</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: SIZES.medium }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => handleStatusChange(opt.id)}
                style={[
                  styles.statusPill,
                  order.status === opt.id && styles.statusPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    order.status === opt.id && { color: COLORS.primary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ФИНАНСЫ */}
          <Text style={styles.sectionTitle}>Финансы</Text>
          <PeCard elevated={true}>
            <View style={styles.finRow}>
              <Text style={GLOBAL_STYLES.textMuted}>Договорная цена:</Text>
              <View style={GLOBAL_STYLES.rowCenter}>
                <PeInput
                  value={finalPrice}
                  onChangeText={setFinalPrice}
                  keyboardType="numeric"
                  style={{ marginBottom: 0, width: 100, height: 40 }}
                />
                <PeButton
                  title="ОК"
                  onPress={handleUpdateFinalPrice}
                  loading={priceLoading}
                  style={{ marginLeft: 8, paddingHorizontal: 10 }}
                />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.finRow}>
              <Text style={GLOBAL_STYLES.h3}>Чистая прибыль:</Text>
              <Text style={[GLOBAL_STYLES.h2, { color: COLORS.success }]}>
                {formatKZT(financials.net_profit)}
              </Text>
            </View>
          </PeCard>

          {/* 🔥 СПЕЦИФИКАЦИЯ BOM (УПРАВЛЕНИЕ) */}
          <View style={GLOBAL_STYLES.rowBetween}>
            <Text style={styles.sectionTitle}>Спецификация (BOM)</Text>
            <TouchableOpacity onPress={() => handleOpenBomModal()}>
              <PlusCircle color={COLORS.primary} size={28} />
            </TouchableOpacity>
          </View>

          <PeCard elevated={true} style={{ padding: SIZES.small }}>
            {bom.length === 0 ? (
              <Text style={styles.emptyText}>Материалов нет</Text>
            ) : (
              bom.map((item, idx) => (
                <View key={idx} style={styles.bomItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={GLOBAL_STYLES.textBody}>{item.name}</Text>
                    <Text style={GLOBAL_STYLES.textSmall}>
                      {item.qty} {item.unit}
                    </Text>
                  </View>
                  <View style={GLOBAL_STYLES.rowCenter}>
                    <TouchableOpacity
                      onPress={() => handleOpenBomModal(item)}
                      style={styles.actionIcon}
                    >
                      <Edit3 color={COLORS.primary} size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteBomItem(idx)}
                      style={styles.actionIcon}
                    >
                      <Trash2 color={COLORS.danger} size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </PeCard>

          {/* ЧЕКИ / РАСХОДЫ */}
          <Text style={styles.sectionTitle}>Списать расходы</Text>
          <PeCard elevated={true}>
            <PeInput
              value={expAmount}
              onChangeText={setExpAmount}
              keyboardType="numeric"
              placeholder="Сумма (₸)"
            />
            <PeInput
              value={expComment}
              onChangeText={setExpComment}
              placeholder="Комментарий..."
            />
            <PeButton
              title="Добавить чек"
              variant="danger"
              onPress={handleAddExpense}
              loading={expLoading}
              icon={<PlusCircle color="#fff" size={18} />}
            />
          </PeCard>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 🔥 МОДАЛКА УПРАВЛЕНИЯ BOM */}
        <Modal visible={bomModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={GLOBAL_STYLES.rowBetween}>
                <Text style={GLOBAL_STYLES.h2}>
                  {editingItem ? "Изменить" : "Добавить"} в BOM
                </Text>
                <TouchableOpacity onPress={() => setBomModalVisible(false)}>
                  <X color={COLORS.textMuted} size={24} />
                </TouchableOpacity>
              </View>
              <PeInput
                label="Название"
                value={bomName}
                onChangeText={setBomName}
                placeholder="Кабель, Розетка..."
              />
              <View style={GLOBAL_STYLES.rowBetween}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <PeInput
                    label="Кол-во"
                    value={bomQty}
                    onChangeText={setBomQty}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PeInput
                    label="Ед. изм."
                    value={bomUnit}
                    onChangeText={setBomUnit}
                  />
                </View>
              </View>
              <PeButton
                title="Сохранить позицию"
                onPress={handleSaveBomItem}
                loading={bomLoading}
                style={{ marginTop: 10 }}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.medium,
    backgroundColor: COLORS.surface,
    ...SHADOWS.light,
  },
  scrollContent: { padding: SIZES.large },
  sectionTitle: {
    fontSize: SIZES.fontTitle,
    fontWeight: "700",
    color: COLORS.textMain,
    marginVertical: SIZES.medium,
  },
  statusPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statusPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  statusPillText: { color: COLORS.textMuted, fontWeight: "600" },
  finRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.medium,
  },
  bomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  actionIcon: { padding: 8, marginLeft: 4 },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: SIZES.large,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.large,
    ...SHADOWS.medium,
  },
});
