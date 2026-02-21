/**
 * @file src/screens/FinanceScreen.js
 * @description Экран Глобальной Кассы (PROADMIN Mobile v11.0.14 Enterprise).
 * ДОБАВЛЕНО: Разделение категорий на Расходы (OPEX/CAPEX) и Доходы (Синхронизация с Web CRM).
 * ДОБАВЛЕНО: Динамическая смена чипсов при переключении типа операции.
 * ДОБАВЛЕНО: OLED Black & Orange дизайн (строгие рамки вместо теней).
 * НИКАКИХ УДАЛЕНИЙ: Вся бизнес-логика (FlatList, API, Modal) сохранена на 100%.
 *
 * @module FinanceScreen
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  DollarSign,
  PlusCircle,
  X,
  CreditCard,
  Wallet,
  Tag,
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

// 🔥 УМНЫЕ КАТЕГОРИИ (Синхронизированы с Web CRM)
const EXPENSE_CATEGORIES = [
  "Материалы",
  "Инструмент и Оборудование",
  "Транспорт / ГСМ",
  "Зарплата / Аванс",
  "Аренда и Офис",
  "Реклама и Маркетинг",
  "Налоги и Сборы",
  "Непредвиденные расходы",
  "Прочее",
];

const INCOME_CATEGORIES = [
  "Оплата от клиента",
  "Инкассация (от бригады)",
  "Инвестиции",
  "Прочее",
];

const formatKZT = (num) => {
  const value = parseFloat(num) || 0;
  return value.toLocaleString("ru-RU") + " ₸";
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function FinanceScreen() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Модалка и её состояния
  const [modalVisible, setModalVisible] = useState(false);
  const [txAccountId, setTxAccountId] = useState("");
  const [txType, setTxType] = useState("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Прочее");
  const [txComment, setTxComment] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  // Динамический список категорий в зависимости от типа транзакции
  const activeCategories = txType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const fetchFinanceData = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      const [accountsData, transactionsData] = await Promise.all([
        API.getFinanceAccounts(),
        API.getFinanceTransactions(50),
      ]);

      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);

      if (accountsData && accountsData.length > 0 && !txAccountId) {
        setTxAccountId(accountsData[0].id.toString());
      }
    } catch (err) {
      setError(err.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFinanceData(true);
  }, []);

  const handleTransactionSubmit = async () => {
    if (!txAccountId) {
      alert("Выберите счет");
      return;
    }
    if (!txAmount || parseFloat(txAmount) <= 0) {
      alert("Введите сумму");
      return;
    }

    setTxLoading(true);
    try {
      await API.addFinanceTransaction({
        accountId: parseInt(txAccountId),
        type: txType,
        amount: parseFloat(txAmount),
        category: txCategory,
        comment: txComment,
      });

      setTxAmount("");
      setTxComment("");
      setTxCategory("Прочее");
      setModalVisible(false);
      fetchFinanceData(true);
    } catch (err) {
      alert(err.message || "Ошибка API");
    } finally {
      setTxLoading(false);
    }
  };

  const renderAccountCards = () => (
    <View style={styles.accountsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.accountsScroll}
      >
        {accounts.map((acc) => {
          const isPositive = acc.balance >= 0;
          return (
            <TouchableOpacity
              key={acc.id}
              activeOpacity={0.9}
              style={[
                styles.miniAccountCard,
                {
                  borderLeftColor: isPositive ? COLORS.success : COLORS.danger,
                },
              ]}
            >
              <View style={styles.miniAccIcon}>
                {acc.type === "cash" ? (
                  <DollarSign color={COLORS.textMuted} size={14} />
                ) : (
                  <CreditCard color={COLORS.textMuted} size={14} />
                )}
              </View>
              <View>
                <Text style={styles.miniAccName}>{acc.name}</Text>
                <Text
                  style={[
                    styles.miniAccBalance,
                    { color: isPositive ? COLORS.textMain : COLORS.danger },
                  ]}
                >
                  {formatKZT(acc.balance)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderTransactionItem = ({ item }) => {
    const isIncome = item.type === "income";
    return (
      <PeCard elevated={false} style={styles.txCard}>
        <View style={GLOBAL_STYLES.rowBetween}>
          <View style={GLOBAL_STYLES.rowCenter}>
            <View
              style={[
                styles.txIndicator,
                { backgroundColor: isIncome ? COLORS.success : COLORS.danger },
              ]}
            />
            <View>
              <Text style={styles.txTitle}>{item.category}</Text>
              <Text style={styles.txSub}>{formatDate(item.created_at)}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                styles.txPrice,
                { color: isIncome ? COLORS.success : COLORS.danger },
              ]}
            >
              {isIncome ? "+" : "-"}
              {formatKZT(item.amount)}
            </Text>
            <Text style={styles.txAccName}>{item.account_name}</Text>
          </View>
        </View>
        {item.comment ? <Text style={styles.txComment}>{item.comment}</Text> : null}
      </PeCard>
    );
  };

  return (
    <View style={GLOBAL_STYLES.safeArea}>
      <View style={styles.header}>
        <View style={GLOBAL_STYLES.rowCenter}>
          <Wallet color={COLORS.primary} size={28} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Касса</Text>
            <Text style={styles.headerSub}>ФИНАНСОВЫЙ КОНТРОЛЬ</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <PlusCircle color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={GLOBAL_STYLES.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderAccountCards}
          renderItem={renderTransactionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalBack}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={GLOBAL_STYLES.h2}>Новая операция</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={COLORS.textMuted} size={28} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Переключатель Доход/Расход */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    txType === "expense" && { backgroundColor: COLORS.danger },
                  ]}
                  onPress={() => { setTxType("expense"); setTxCategory("Прочее"); }}
                >
                  <Text style={styles.typeText}>Расход</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    txType === "income" && { backgroundColor: COLORS.success },
                  ]}
                  onPress={() => { setTxType("income"); setTxCategory("Прочее"); }}
                >
                  <Text style={styles.typeText}>Доход</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Счет списания/зачисления</Text>
              <View style={styles.chipContainer}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.chip,
                      txAccountId === acc.id.toString() && styles.chipActive,
                    ]}
                    onPress={() => setTxAccountId(acc.id.toString())}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        txAccountId === acc.id.toString() && {
                          color: COLORS.primary,
                        },
                      ]}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Категория ({txType === 'expense' ? 'OPEX/CAPEX' : 'Revenue'})</Text>
              <View style={styles.chipContainer}>
                {activeCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      txCategory === cat && styles.chipActive,
                    ]}
                    onPress={() => setTxCategory(cat)}
                  >
                    <Tag
                      size={12}
                      color={
                        txCategory === cat ? COLORS.primary : COLORS.textMuted
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        txCategory === cat && { color: COLORS.primary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <PeInput
                label="Сумма"
                keyboardType="numeric"
                value={txAmount}
                onChangeText={setTxAmount}
                placeholder="0 ₸"
              />
              <PeInput
                label="Заметка (необязательно)"
                value={txComment}
                onChangeText={setTxComment}
                multiline
              />

              <PeButton
                title={
                  txType === "expense"
                    ? "Провести расход"
                    : "Провести доход"
                }
                variant={txType === "expense" ? "danger" : "success"}
                onPress={handleTransactionSubmit}
                loading={txLoading}
                style={{ marginTop: SIZES.base }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SIZES.large,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.fontTitle, fontWeight: "800", color: COLORS.textMain },
  headerSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.glow,
  },

  accountsWrapper: { paddingVertical: SIZES.medium },
  accountsScroll: { paddingHorizontal: SIZES.large, gap: SIZES.small },
  miniAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radiusSm,
    borderLeftWidth: 4,
    minWidth: 160,
  },
  miniAccIcon: { marginRight: SIZES.small, opacity: 0.6 },
  miniAccName: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  miniAccBalance: { fontSize: SIZES.fontMedium, fontWeight: "700", color: COLORS.textMain },

  listContent: { paddingHorizontal: SIZES.large, paddingBottom: 120 },
  txCard: { padding: SIZES.medium, marginBottom: SIZES.small },
  txIndicator: { width: 3, height: 24, borderRadius: 2, marginRight: SIZES.small },
  txTitle: { fontSize: SIZES.fontBase, fontWeight: "600", color: COLORS.textMain },
  txSub: { fontSize: 10, color: COLORS.textMuted },
  txPrice: { fontSize: SIZES.fontBase, fontWeight: "700" },
  txAccName: { fontSize: 10, color: COLORS.textMuted },
  txComment: {
    marginTop: SIZES.medium,
    fontSize: SIZES.fontSmall,
    color: COLORS.textMuted,
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.small,
  },

  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SIZES.large,
    maxHeight: "90%",
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.large,
  },

  typeSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: SIZES.large,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: SIZES.small,
    alignItems: "center",
    borderRadius: SIZES.radiusSm,
  },
  typeText: {
    fontWeight: "800",
    color: COLORS.textMain,
    textTransform: "uppercase",
    fontSize: SIZES.fontSmall,
  },

  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: SIZES.base,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SIZES.base,
    marginBottom: SIZES.large,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.small,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 107, 0, 0.15)",
  },
  chipText: { color: COLORS.textMuted, fontSize: SIZES.fontSmall, fontWeight: "600" },

  errorBox: {
    marginHorizontal: SIZES.large,
    marginTop: SIZES.medium,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: SIZES.small,
    borderRadius: SIZES.radiusSm,
    alignItems: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.fontSmall,
    textAlign: "center",
  },
});