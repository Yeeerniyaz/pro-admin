/**
 * @file src/screens/OrderDetailScreen.js
 * @description Экран управления объектом (PROADMIN Mobile v11.0.14 Enterprise).
 * ИСПРАВЛЕНО: Жесткий фикс клавиатуры в модальных окнах для Android (behavior="padding" + offset).
 * ДОБАВЛЕНО: Функционал назначения бригады (Assign Order) для Шефа/Админа.
 * НИКАКИХ УДАЛЕНИЙ: Весь функционал (BOM, Финансы, Метаданные) сохранен на 100%.
 *
 * @module OrderDetailScreen
 */

import React, { useState, useEffect, useContext } from "react";
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
  ActivityIndicator,
  Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  MapPin,
  AlignLeft,
  DollarSign,
  DownloadCloud,
  HardHat
} from "lucide-react-native";

// Импорт архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";
import { AuthContext } from "../context/AuthContext";

const formatKZT = (num) => (parseFloat(num) || 0).toLocaleString("ru-RU") + " ₸";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

export default function OrderDetailScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const initialOrder = route.params?.order || {};
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);

  const [brigades, setBrigades] = useState([]);
  const isDone = order.status === 'done';

  const [address, setAddress] = useState(order.details?.address || "");
  const [adminComment, setAdminComment] = useState(order.details?.admin_comment || "");
  const [bom, setBom] = useState(Array.isArray(order.details?.bom) ? order.details.bom : []);

  const financials = order.details?.financials || { final_price: order.total_price, total_expenses: 0, net_profit: order.total_price, expenses: [] };
  const calcBase = order.details?.total?.work || order.total_price;

  // Модалки
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: "", category: "", comment: "" });

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState(financials.final_price?.toString() || "");

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedBrigadeId, setSelectedBrigadeId] = useState(null);

  // =============================================================================
  // 🚀 ЗАГРУЗКА ДАННЫХ
  // =============================================================================
  useEffect(() => {
    if (isAdmin) {
      API.getBrigades()
        .then(data => setBrigades(data || []))
        .catch(err => console.log("Failed to load brigades:", err));
    }
  }, [isAdmin]);

  // =============================================================================
  // 🚀 API ОБРАБОТЧИКИ
  // =============================================================================

  const handleTakeOrder = async () => {
    try {
      setLoading(true);
      await API.takeOrderWeb(order.id);
      Alert.alert("Успех", "Заказ успешно взят в работу!");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  const handleAssignBrigade = async () => {
    if (!selectedBrigadeId) return Alert.alert("Ошибка", "Выберите бригаду из списка.");
    try {
      setLoading(true);
      await API.assignBrigade(order.id, selectedBrigadeId);
      const assignedB = brigades.find(b => b.id.toString() === selectedBrigadeId.toString());

      setOrder({
        ...order,
        brigade_id: selectedBrigadeId,
        brigade_name: assignedB?.name,
        status: 'work'
      });
      setAssignModalVisible(false);
      Alert.alert("Успех", "Заказ успешно передан бригаде!");
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeOrder = async () => {
    Alert.alert(
      "Закрытие объекта",
      "Вы уверены? Будет произведен расчет долей и начислен долг.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Завершить",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await API.finalizeOrder(order.id);
              Alert.alert("Завершено!", `Объект закрыт.\nВаша доля: ${formatKZT(res.distribution.brigadeShare)}\nДолг Шефу: ${formatKZT(res.distribution.ownerShare)}`);
              setOrder({ ...order, status: 'done' });
            } catch (e) {
              Alert.alert("Ошибка", e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSaveMetadata = async () => {
    try {
      setLoading(true);
      const res = await API.updateOrderMetadata(order.id, address, adminComment);
      setOrder({ ...order, details: res.details });
      Alert.alert("Сохранено", "Адрес и комментарий обновлены.");
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally { setLoading(false); }
  };

  const handleSaveBOM = async () => {
    try {
      setLoading(true);
      const res = await API.updateBOM(order.id, bom);
      setOrder({ ...order, details: { ...order.details, bom: res.bom } });
      Alert.alert("Сохранено", "Спецификация (BOM) успешно обновлена.");
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally { setLoading(false); }
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.category) return Alert.alert("Ошибка", "Заполните сумму и категорию.");
    try {
      setLoading(true);
      const res = await API.addOrderExpense(order.id, newExpense.amount, newExpense.category, newExpense.comment);
      setOrder({ ...order, details: { ...order.details, financials: res.financials } });
      setExpenseModalVisible(false);
      setNewExpense({ amount: "", category: "", comment: "" });
      Alert.alert("Расход добавлен", "Юнит-экономика пересчитана.");
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally { setLoading(false); }
  };

  const handleUpdatePrice = async () => {
    if (!newPrice) return Alert.alert("Ошибка", "Введите цену.");
    try {
      setLoading(true);
      const res = await API.updateOrderFinalPrice(order.id, newPrice);
      setOrder({ ...order, total_price: newPrice, details: { ...order.details, financials: res.financials } });
      setPriceModalVisible(false);
      Alert.alert("Цена обновлена", "Итоговая цена зафиксирована.");
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally { setLoading(false); }
  };

  // =============================================================================
  // 🧩 РЕНДЕР
  // =============================================================================

  return (
    <SafeAreaView style={GLOBAL_STYLES.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} disabled={loading}>
            <ArrowLeft color={COLORS.textMain} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={GLOBAL_STYLES.h2}>Объект #{order.id}</Text>
            <Text style={GLOBAL_STYLES.textSmall}>{formatDate(order.created_at)}</Text>
          </View>
          <PeBadge status={order.status} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {isDone && (
            <View style={styles.alertDanger}>
              <Text style={{ color: COLORS.danger, fontWeight: '600', fontSize: SIZES.fontSmall }}>
                🔒 Заказ ЗАВЕРШЕН. Изменения заблокированы.
              </Text>
            </View>
          )}

          {/* ИНФОРМАЦИЯ */}
          <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
            <Text style={styles.sectionTitle}>Информация</Text>
            <View style={styles.infoRow}>
              <User color={COLORS.primary} size={18} style={{ marginRight: 8 }} />
              <Text style={GLOBAL_STYLES.textBody}>{order.client_name || "Не указано"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Phone color={COLORS.textMuted} size={18} style={{ marginRight: 8 }} />
              <Text style={GLOBAL_STYLES.textBody}>{order.client_phone || "—"}</Text>
            </View>

            <View style={styles.infoRow}>
              <HardHat color={order.brigade_name ? COLORS.warning : COLORS.textMuted} size={18} style={{ marginRight: 8 }} />
              <Text style={[GLOBAL_STYLES.textBody, { color: order.brigade_name ? COLORS.warning : COLORS.textMuted, fontWeight: order.brigade_name ? '600' : '400' }]}>
                {order.brigade_name ? `Бригада: ${order.brigade_name}` : "Бригада не назначена (БИРЖА)"}
              </Text>
            </View>

            {isAdmin && !isDone && (
              <PeButton
                title={order.brigade_name ? "Сменить бригаду" : "Назначить бригаду"}
                variant="ghost"
                onPress={() => setAssignModalVisible(true)}
                style={{ marginBottom: SIZES.base, borderWidth: 1, borderColor: COLORS.border }}
              />
            )}

            <View style={styles.divider} />

            <PeInput
              label="📍 Адрес объекта"
              placeholder="Улица, дом, квартира"
              value={address}
              onChangeText={setAddress}
              editable={!isDone && !loading}
              icon={<MapPin color={COLORS.textMuted} size={16} />}
            />
            <PeInput
              label="📝 Системный комментарий"
              placeholder="Заметки по объекту..."
              value={adminComment}
              onChangeText={setAdminComment}
              editable={!isDone && !loading}
              multiline
              icon={<AlignLeft color={COLORS.textMuted} size={16} />}
            />

            {!isDone && (
              <PeButton
                title="Сохранить метаданные"
                variant="secondary"
                onPress={handleSaveMetadata}
                loading={loading}
              />
            )}
          </PeCard>

          {/* СИСТЕМНЫЕ ДЕЙСТВИЯ */}
          {!isDone && (
            <View style={{ marginBottom: SIZES.medium }}>
              {isManager && order.status === 'new' && (
                <PeButton
                  title="ВЗЯТЬ ЗАКАЗ В РАБОТУ"
                  variant="primary"
                  icon={<DownloadCloud color={COLORS.textInverse} size={20} />}
                  onPress={handleTakeOrder}
                  loading={loading}
                  style={{ marginBottom: SIZES.base }}
                />
              )}
              {isManager && order.status === 'work' && (
                <PeButton
                  title="ЗАКРЫТЬ И РАСПРЕДЕЛИТЬ ПРИБЫЛЬ"
                  variant="success"
                  icon={<CheckCircle color="#000" size={20} />}
                  onPress={handleFinalizeOrder}
                  loading={loading}
                />
              )}
            </View>
          )}

          {/* ЭКОНОМИКА */}
          <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
            <View style={GLOBAL_STYLES.rowBetween}>
              <Text style={styles.sectionTitle}>Экономика</Text>
              {!isDone && (
                <TouchableOpacity onPress={() => setPriceModalVisible(true)}>
                  <Edit3 color={COLORS.primary} size={20} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.finRow}>
              <Text style={GLOBAL_STYLES.textMuted}>Расчетная база:</Text>
              <Text style={GLOBAL_STYLES.textBody}>{formatKZT(calcBase)}</Text>
            </View>
            <View style={[styles.finRow, { marginTop: 8 }]}>
              <Text style={GLOBAL_STYLES.textMuted}>Договорная цена:</Text>
              <Text style={[GLOBAL_STYLES.textBody, { fontWeight: '700' }]}>{formatKZT(financials.final_price)}</Text>
            </View>
            <View style={[styles.finRow, { marginTop: 8 }]}>
              <Text style={GLOBAL_STYLES.textMuted}>Сумма чеков (Расход):</Text>
              <Text style={{ color: COLORS.danger, fontWeight: '700' }}>-{formatKZT(financials.total_expenses)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.finRow}>
              <Text style={[GLOBAL_STYLES.textBody, { textTransform: 'uppercase', fontWeight: '700' }]}>Чистая прибыль:</Text>
              <Text style={{ color: COLORS.success, fontSize: SIZES.fontTitle, fontWeight: '700' }}>{formatKZT(financials.net_profit)}</Text>
            </View>

            <View style={{ marginTop: SIZES.large }}>
              <Text style={[GLOBAL_STYLES.h3, { marginBottom: SIZES.base }]}>Реестр расходов</Text>
              {financials.expenses?.length > 0 ? (
                financials.expenses.map((exp, idx) => (
                  <View key={idx} style={styles.expenseItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={GLOBAL_STYLES.textBody}>{exp.category}</Text>
                      {exp.comment ? <Text style={GLOBAL_STYLES.textSmall}>{exp.comment}</Text> : null}
                    </View>
                    <Text style={{ color: COLORS.danger, fontWeight: '600' }}>-{formatKZT(exp.amount)}</Text>
                  </View>
                ))
              ) : (
                <Text style={GLOBAL_STYLES.textMuted}>Чеков пока нет</Text>
              )}

              {!isDone && (
                <PeButton
                  title="Добавить расход (Чек)"
                  variant="ghost"
                  icon={<PlusCircle color={COLORS.textMain} size={18} />}
                  onPress={() => setExpenseModalVisible(true)}
                  style={{ marginTop: SIZES.medium, borderWidth: 1, borderColor: COLORS.border }}
                />
              )}
            </View>
          </PeCard>

          {/* СПЕЦИФИКАЦИЯ (BOM) */}
          <PeCard elevated={false} style={{ marginBottom: 40 }}>
            <Text style={styles.sectionTitle}>Спецификация (BOM)</Text>
            {bom.length === 0 ? (
              <Text style={[GLOBAL_STYLES.textMuted, { marginBottom: SIZES.medium }]}>Спецификация пуста</Text>
            ) : (
              bom.map((item, index) => (
                <View key={index} style={styles.bomItem}>
                  <View style={{ flex: 1, marginRight: SIZES.small }}>
                    <PeInput
                      placeholder="Наименование"
                      value={item.name}
                      onChangeText={(val) => { const n = [...bom]; n[index].name = val; setBom(n); }}
                      editable={!isDone}
                      style={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ width: 60, marginRight: SIZES.small }}>
                    <PeInput
                      placeholder="Кол."
                      value={item.qty.toString()}
                      keyboardType="numeric"
                      onChangeText={(val) => { const n = [...bom]; n[index].qty = val; setBom(n); }}
                      editable={!isDone}
                      style={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ width: 50 }}>
                    <PeInput
                      placeholder="Ед."
                      value={item.unit}
                      onChangeText={(val) => { const n = [...bom]; n[index].unit = val; setBom(n); }}
                      editable={!isDone}
                      style={{ marginBottom: 0 }}
                    />
                  </View>
                  {!isDone && (
                    <TouchableOpacity onPress={() => { const n = [...bom]; n.splice(index, 1); setBom(n); }} style={{ marginLeft: SIZES.small }}>
                      <Trash2 color={COLORS.danger} size={20} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            {!isDone && (
              <View style={GLOBAL_STYLES.rowBetween}>
                <PeButton title="Добавить строку" variant="ghost" onPress={() => setBom([...bom, { name: "", qty: 1, unit: "шт" }])} />
                <PeButton title="Сохранить BOM" variant="primary" onPress={handleSaveBOM} loading={loading} />
              </View>
            )}
          </PeCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========================================================================= */}
      {/* 🔮 МОДАЛЬНЫЕ ОКНА (ЖЕСТКИЙ ФИКС КЛАВИАТУРЫ ДЛЯ ANDROID И IOS) */}
      {/* ========================================================================= */}

      {/* 1. Модалка: ИЗМЕНЕНИЕ ИТОГОВОЙ ЦЕНЫ */}
      <Modal visible={priceModalVisible} transparent animationType="slide">
        {/* 🔥 Принудительный padding для всех платформ. Это толкает модалку вверх. */}
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={GLOBAL_STYLES.rowBetween}>
                <Text style={GLOBAL_STYLES.h2}>Договорная цена</Text>
                <TouchableOpacity onPress={() => setPriceModalVisible(false)}><X color={COLORS.textMuted} size={24} /></TouchableOpacity>
              </View>
              <PeInput
                label="Новая цена (₸)"
                keyboardType="numeric"
                value={newPrice}
                onChangeText={setNewPrice}
                icon={<DollarSign color={COLORS.primary} size={18} />}
              />
              <PeButton title="Применить цену" variant="primary" onPress={handleUpdatePrice} loading={loading} style={{ marginTop: SIZES.medium }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 2. Модалка: ДОБАВЛЕНИЕ ЧЕКА (РАСХОДА) */}
      <Modal visible={expenseModalVisible} transparent animationType="slide">
        {/* 🔥 Принудительный padding для всех платформ. */}
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={GLOBAL_STYLES.rowBetween}>
                <Text style={GLOBAL_STYLES.h2}>Добавить расход</Text>
                <TouchableOpacity onPress={() => setExpenseModalVisible(false)}><X color={COLORS.textMuted} size={24} /></TouchableOpacity>
              </View>
              <PeInput
                label="Сумма (₸)"
                keyboardType="numeric"
                value={newExpense.amount}
                onChangeText={(v) => setNewExpense({ ...newExpense, amount: v })}
              />
              <PeInput
                label="Категория (Например: Материалы)"
                value={newExpense.category}
                onChangeText={(v) => setNewExpense({ ...newExpense, category: v })}
              />
              <PeInput
                label="Комментарий / Номер чека (Опционально)"
                value={newExpense.comment}
                onChangeText={(v) => setNewExpense({ ...newExpense, comment: v })}
              />
              <PeButton title="Сохранить чек" variant="danger" onPress={handleAddExpense} loading={loading} style={{ marginTop: SIZES.medium }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. Модалка: НАЗНАЧЕНИЕ БРИГАДЫ (ТОЛЬКО ДЛЯ АДМИНА) */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        {/* 🔥 Принудительный padding для всех платформ. */}
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={GLOBAL_STYLES.rowBetween}>
                <Text style={GLOBAL_STYLES.h2}>Назначить бригаду</Text>
                <TouchableOpacity onPress={() => setAssignModalVisible(false)}><X color={COLORS.textMuted} size={24} /></TouchableOpacity>
              </View>

              <Text style={[GLOBAL_STYLES.textMuted, { marginBottom: SIZES.small, marginTop: SIZES.base }]}>
                Выберите бригаду для передачи объекта #{order.id}:
              </Text>

              {brigades.length === 0 ? (
                <Text style={[GLOBAL_STYLES.textMain, { marginVertical: SIZES.medium }]}>Нет активных бригад в системе.</Text>
              ) : (
                <View style={{ gap: SIZES.small, marginBottom: SIZES.large }}>
                  {brigades.map(b => (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.brigadeOption, selectedBrigadeId === b.id && styles.brigadeOptionActive]}
                      onPress={() => setSelectedBrigadeId(b.id)}
                      activeOpacity={0.7}
                    >
                      <HardHat color={selectedBrigadeId === b.id ? COLORS.primary : COLORS.textMuted} size={20} />
                      <Text style={[styles.brigadeOptionText, selectedBrigadeId === b.id && { color: COLORS.primary }]}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <PeButton
                title="Назначить на объект"
                variant="primary"
                onPress={handleAssignBrigade}
                loading={loading}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// =============================================================================
// 🎨 СТИЛИ
// =============================================================================
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: SIZES.medium,
    padding: SIZES.base,
  },
  scrollContent: {
    padding: SIZES.large
  },
  sectionTitle: {
    fontSize: SIZES.fontTitle,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: SIZES.medium,
    letterSpacing: -0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
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
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  bomItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  alertDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: SIZES.medium,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.medium,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    padding: SIZES.large,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  brigadeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.medium,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brigadeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  brigadeOptionText: {
    marginLeft: SIZES.small,
    fontSize: SIZES.fontBase,
    fontWeight: '600',
    color: COLORS.textMain,
  }
});