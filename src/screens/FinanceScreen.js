/**
 * @file src/screens/FinanceScreen.js
 * @description Экран Глобальной Кассы (PROADMIN Mobile v11.1.2).
 * ДИЗАЙН: Компактные неоновые виджеты (v11.1.0).
 * ФУНКЦИОНАЛ: Выбор счета + Фиксированные категории (Зарплата, Аренда и т.д.).
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

// Константы категорий
const FIXED_CATEGORIES = [
  "Зарплата",
  "Аренда",
  "Реклама",
  "Инструмент",
  "Налоги",
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
      <PeCard elevated={true} style={styles.txCard}>
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
        {item.comment && <Text style={styles.txComment}>{item.comment}</Text>}
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
              <Text style={GLOBAL_STYLES.h2}>Операция</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={COLORS.textMuted} size={28} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    txType === "expense" && { backgroundColor: COLORS.danger },
                  ]}
                  onPress={() => setTxType("expense")}
                >
                  <Text style={styles.typeText}>Расход</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    txType === "income" && { backgroundColor: COLORS.success },
                  ]}
                  onPress={() => setTxType("income")}
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

              <Text style={styles.inputLabel}>Категория</Text>
              <View style={styles.chipContainer}>
                {FIXED_CATEGORIES.map((cat) => (
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
                    ? "Подтвердить расход"
                    : "Подтвердить доход"
                }
                variant={txType === "expense" ? "danger" : "success"}
                onPress={handleTransactionSubmit}
                loading={txLoading}
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
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textMain },
  headerSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.glow,
  },

  accountsWrapper: { paddingVertical: 15 },
  accountsScroll: { paddingHorizontal: 20, gap: 12 },
  miniAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    minWidth: 160,
  },
  miniAccIcon: { marginRight: 10, opacity: 0.6 },
  miniAccName: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  miniAccBalance: { fontSize: 16, fontWeight: "700" },

  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  txCard: { padding: 15, marginBottom: 10 },
  txIndicator: { width: 3, height: 24, borderRadius: 2, marginRight: 12 },
  txTitle: { fontSize: 15, fontWeight: "600", color: COLORS.textMain },
  txSub: { fontSize: 10, color: COLORS.textMuted },
  txPrice: { fontSize: 15, fontWeight: "700" },
  txAccName: { fontSize: 10, color: COLORS.textMuted },
  txComment: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },

  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: "90%",
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  typeSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  typeText: {
    fontWeight: "800",
    color: "#fff",
    textTransform: "uppercase",
    fontSize: 12,
  },

  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
});
