/**
 * @file src/screens/FinanceScreen.js
 * @description Экран Глобальной Кассы (PROADMIN Mobile v10.0.0).
 * Управление корпоративными финансами: балансы счетов, история транзакций и проведение новых операций.
 * UPGRADES (Senior):
 * - Добавлена "Сводка за период" (Income/Expense/Total).
 * - Добавлена фильтрация транзакций (Все/Приход/Расход).
 * - Добавлены быстрые теги (Chips) для категорий.
 * - Улучшена визуализация выбора счетов.
 *
 * @module FinanceScreen
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Alert,
} from "react-native";
import {
  DollarSign,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  X,
  CreditCard,
  Filter,
  PieChart,
  Wallet,
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";

// =============================================================================
// 🛠 КОНСТАНТЫ И УТИЛИТЫ
// =============================================================================
const PRESET_CATEGORIES = [
  "Материалы",
  "Зарплата",
  "Инструмент",
  "Офис",
  "Транспорт",
  "Маркетинг",
  "Налоги",
  "Прочее",
];

const PRESET_INCOME = [
  "Оплата объекта",
  "Аванс",
  "Доп. работы",
  "Инвестиции",
  "Возврат",
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
  // Состояния данных
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Состояния UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Состояние фильтра (New)
  const [filterType, setFilterType] = useState("all"); // 'all', 'income', 'expense'

  // Состояния модального окна (Новая транзакция)
  const [modalVisible, setModalVisible] = useState(false);
  const [txAccountId, setTxAccountId] = useState("");
  const [txType, setTxType] = useState("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Прочее");
  const [txComment, setTxComment] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  // =============================================================================
  // 📡 ЗАГРУЗКА ДАННЫХ
  // =============================================================================
  const fetchFinanceData = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      const [accountsData, transactionsData] = await Promise.all([
        API.getFinanceAccounts(),
        API.getFinanceTransactions(100), // Увеличили лимит для лучшей статистики
      ]);

      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);

      // Предвыбор первого счета в модалке, если он есть
      if (accountsData && accountsData.length > 0 && !txAccountId) {
        setTxAccountId(accountsData[0].id.toString());
      }
    } catch (err) {
      setError(err.message || "Ошибка загрузки финансового модуля");
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

  // =============================================================================
  // 📊 АНАЛИТИКА И ФИЛЬТРАЦИЯ (Senior Logic)
  // =============================================================================

  // Мемоизированный список транзакций с учетом фильтра
  const filteredTransactions = useMemo(() => {
    if (filterType === "all") return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [transactions, filterType]);

  // Подсчет статистики "на лету" по отображаемым транзакциям
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    // Считаем по всем загруженным, чтобы видеть общую картину, даже если включен фильтр
    transactions.forEach((t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === "income") income += amt;
      else expense += amt;
    });

    return { income, expense, total: income - expense };
  }, [transactions]);

  // =============================================================================
  // 💸 ОБРАБОТЧИК НОВОЙ ТРАНЗАКЦИИ
  // =============================================================================
  const handleTransactionSubmit = async () => {
    // Валидация
    if (!txAccountId) {
      Alert.alert("Ошибка", "Выберите счет списания/зачисления");
      return;
    }
    const amountVal = parseFloat(txAmount);
    if (!txAmount || isNaN(amountVal) || amountVal <= 0) {
      Alert.alert("Ошибка", "Введите корректную сумму");
      return;
    }
    if (!txCategory.trim()) {
      Alert.alert("Ошибка", "Укажите категорию платежа");
      return;
    }

    setTxLoading(true);
    try {
      await API.addFinanceTransaction({
        accountId: parseInt(txAccountId),
        type: txType,
        amount: amountVal,
        category: txCategory,
        comment: txComment,
      });

      // Очистка формы
      setTxAmount("");
      setTxComment("");
      setTxCategory("Прочее"); // Сброс на дефолт
      setModalVisible(false);

      // Обновление данных
      fetchFinanceData(true);
      Alert.alert("Успех", "Операция успешно проведена");
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Ошибка при проведении операции");
    } finally {
      setTxLoading(false);
    }
  };

  // =============================================================================
  // 🧩 КОМПОНЕНТЫ РЕНДЕРИНГА
  // =============================================================================

  // Блок сводки (New)
  const renderSummaryHeader = () => (
    <View style={styles.summaryContainer}>
      <PeCard style={styles.summaryCard}>
        <View style={GLOBAL_STYLES.rowBetween}>
          <View>
            <Text style={styles.summaryLabel}>Оборот за период</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: stats.total >= 0 ? COLORS.success : COLORS.danger },
              ]}
            >
              {stats.total > 0 ? "+" : ""}
              {formatKZT(stats.total)}
            </Text>
          </View>
          <View style={styles.summaryIconBox}>
            <PieChart color={COLORS.primary} size={24} />
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ArrowUpRight
              color={COLORS.success}
              size={16}
              style={{ marginBottom: 4 }}
            />
            <Text style={styles.summarySubValue}>
              {formatKZT(stats.income)}
            </Text>
            <Text style={styles.summarySubLabel}>Приход</Text>
          </View>
          <View style={styles.summaryVerticalDivider} />
          <View style={styles.summaryItem}>
            <ArrowDownRight
              color={COLORS.danger}
              size={16}
              style={{ marginBottom: 4 }}
            />
            <Text style={styles.summarySubValue}>
              {formatKZT(stats.expense)}
            </Text>
            <Text style={styles.summarySubLabel}>Расход</Text>
          </View>
        </View>
      </PeCard>
    </View>
  );

  const renderAccountCards = () => (
    <View style={styles.accountsContainer}>
      <Text style={styles.sectionTitle}>Счета компании</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.accountsScroll}
      >
        {accounts.map((acc) => {
          const isPositive = acc.balance >= 0;
          return (
            <PeCard key={acc.id} style={styles.accountCard}>
              <View style={GLOBAL_STYLES.rowCenter}>
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor: isPositive
                        ? "rgba(59,130,246,0.1)"
                        : "rgba(245,158,11,0.1)",
                    },
                  ]}
                >
                  {acc.type === "cash" ? (
                    <DollarSign
                      color={isPositive ? COLORS.primary : COLORS.warning}
                      size={20}
                    />
                  ) : (
                    <CreditCard
                      color={isPositive ? COLORS.primary : COLORS.warning}
                      size={20}
                    />
                  )}
                </View>
                <Text style={styles.accountName} numberOfLines={1}>
                  {acc.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.accountBalance,
                  { color: isPositive ? COLORS.textMain : COLORS.danger },
                ]}
              >
                {formatKZT(acc.balance)}
              </Text>
            </PeCard>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderTransactionItem = ({ item }) => {
    const isIncome = item.type === "income";
    const amountStr = isIncome
      ? `+${formatKZT(item.amount)}`
      : `-${formatKZT(item.amount)}`;
    const amountColor = isIncome ? COLORS.success : COLORS.danger;

    return (
      <PeCard style={styles.txCard}>
        <View style={GLOBAL_STYLES.rowBetween}>
          <View style={GLOBAL_STYLES.rowCenter}>
            <View
              style={[
                styles.txIcon,
                {
                  backgroundColor: isIncome
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(239,68,68,0.1)",
                },
              ]}
            >
              {isIncome ? (
                <ArrowUpRight color={COLORS.success} size={18} />
              ) : (
                <ArrowDownRight color={COLORS.danger} size={18} />
              )}
            </View>
            <View>
              <Text style={styles.txCategory}>{item.category || "Прочее"}</Text>
              <Text style={GLOBAL_STYLES.textSmall}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.txAmount, { color: amountColor }]}>
              {amountStr}
            </Text>
            <Text style={GLOBAL_STYLES.textSmall}>{item.account_name}</Text>
          </View>
        </View>
        {item.comment ? (
          <View style={styles.txCommentBox}>
            <Text style={GLOBAL_STYLES.textSmall}>{item.comment}</Text>
          </View>
        ) : null}
      </PeCard>
    );
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР
  // =============================================================================
  return (
    <View style={GLOBAL_STYLES.safeArea}>
      {/* 🎩 ШАПКА ЭКРАНА */}
      <View style={styles.header}>
        <View>
          <Text style={GLOBAL_STYLES.h1}>Касса</Text>
          <Text style={GLOBAL_STYLES.textMuted}>Управление финансами</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <PlusCircle
            color={COLORS.textInverse}
            size={20}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.addButtonText}>Операция</Text>
        </TouchableOpacity>
      </View>

      {/* 📜 СПИСОК */}
      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity
            onPress={() => fetchFinanceData()}
            style={{ marginTop: 12, padding: 8 }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
              Обновить данные
            </Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id.toString()}
          // Композиция хедера списка
          ListHeaderComponent={
            <>
              {renderSummaryHeader()}
              {renderAccountCards()}

              {/* Фильтры списка */}
              <View style={styles.filterContainer}>
                <Text style={styles.sectionTitle}>История операций</Text>
                <View style={styles.filterTabs}>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filterType === "all" && styles.filterTabActive,
                    ]}
                    onPress={() => setFilterType("all")}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filterType === "all" && styles.filterTextActive,
                      ]}
                    >
                      Все
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filterType === "income" && styles.filterTabActive,
                    ]}
                    onPress={() => setFilterType("income")}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filterType === "income" && styles.filterTextActive,
                      ]}
                    >
                      Приход
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filterType === "expense" && styles.filterTabActive,
                    ]}
                    onPress={() => setFilterType("expense")}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filterType === "expense" && styles.filterTextActive,
                      ]}
                    >
                      Расход
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          }
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Wallet color={COLORS.textMuted} size={32} />
              </View>
              <Text
                style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.medium }]}
              >
                Операций не найдено
              </Text>
            </View>
          }
        />
      )}

      {/* 🪟 МОДАЛЬНОЕ ОКНО НОВОЙ ТРАНЗАКЦИИ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={GLOBAL_STYLES.h2}>Новая операция</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <X color={COLORS.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Тип операции */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    txType === "expense" && styles.typeBtnExpense,
                  ]}
                  onPress={() => setTxType("expense")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      txType === "expense" && { color: "#fff" },
                    ]}
                  >
                    Расход
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    txType === "income" && styles.typeBtnIncome,
                  ]}
                  onPress={() => setTxType("income")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      txType === "income" && { color: "#fff" },
                    ]}
                  >
                    Доход
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Выбор счета */}
              <Text style={styles.labelSmall}>Выберите счет</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.accountSelectorScroll}
              >
                <View style={styles.accountSelector}>
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accBtn,
                        txAccountId === acc.id.toString() &&
                          styles.accBtnActive,
                      ]}
                      onPress={() => setTxAccountId(acc.id.toString())}
                    >
                      {acc.type === "cash" ? (
                        <DollarSign
                          size={14}
                          color={
                            txAccountId === acc.id.toString()
                              ? COLORS.primary
                              : COLORS.textMuted
                          }
                        />
                      ) : (
                        <CreditCard
                          size={14}
                          color={
                            txAccountId === acc.id.toString()
                              ? COLORS.primary
                              : COLORS.textMuted
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.accBtnText,
                          txAccountId === acc.id.toString() && {
                            color: COLORS.primary,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <PeInput
                label="Сумма (₸)"
                placeholder="0"
                keyboardType="numeric"
                value={txAmount}
                onChangeText={setTxAmount}
              />

              {/* Категория с автозаполнением */}
              <View>
                <PeInput
                  label="Категория"
                  placeholder="Выберите или введите..."
                  value={txCategory}
                  onChangeText={setTxCategory}
                />
                {/* Быстрые теги */}
                <View style={styles.chipsContainer}>
                  {(txType === "expense"
                    ? PRESET_CATEGORIES
                    : PRESET_INCOME
                  ).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.chip}
                      onPress={() => setTxCategory(cat)}
                    >
                      <Text style={styles.chipText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <PeInput
                label="Комментарий"
                placeholder="Детали платежа..."
                value={txComment}
                onChangeText={setTxComment}
                multiline
                numberOfLines={2}
                style={{ minHeight: 60 }}
              />

              <PeButton
                title={
                  txType === "expense"
                    ? "Списать средства"
                    : "Зачислить средства"
                }
                variant={txType === "expense" ? "danger" : "success"}
                onPress={handleTransactionSubmit}
                loading={txLoading}
                style={{ marginTop: SIZES.medium, marginBottom: 20 }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12, // Modern radius
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: COLORS.textInverse,
    fontWeight: "700",
    fontSize: SIZES.fontBase,
  },

  // Summary Block (New)
  summaryContainer: {
    paddingTop: SIZES.medium,
    paddingHorizontal: SIZES.large,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  summaryValue: { fontSize: 28, fontWeight: "800", marginVertical: 4 },
  summaryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    opacity: 0.5,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryVerticalDivider: {
    width: 1,
    height: "100%",
    backgroundColor: COLORS.border,
  },
  summarySubValue: { fontWeight: "700", fontSize: 16, color: COLORS.textMain },
  summarySubLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Accounts
  accountsContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    paddingHorizontal: SIZES.large,
    fontSize: SIZES.fontBase,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 12,
  },
  accountsScroll: {
    paddingHorizontal: SIZES.large,
    gap: 12,
  },
  accountCard: {
    width: 200,
    marginBottom: 0,
    padding: 16,
    borderRadius: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  accountName: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  accountBalance: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
  },

  // Filters (New)
  filterContainer: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: SIZES.large,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterTabs: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    padding: 2,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  filterTextActive: { color: COLORS.textMain },

  // Transactions
  listContent: {
    paddingBottom: 100,
  },
  txCard: {
    marginHorizontal: SIZES.large,
    padding: 16,
    marginBottom: 10,
    borderRadius: 14,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  txCommentBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderStyle: "dashed",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 20,
  },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  typeBtnExpense: { backgroundColor: COLORS.danger },
  typeBtnIncome: { backgroundColor: COLORS.success },
  typeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  // Account Selector in Modal
  labelSmall: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  accountSelectorScroll: {
    marginBottom: 16,
    maxHeight: 50,
  },
  accountSelector: {
    flexDirection: "row",
    gap: 8,
  },
  accBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  accBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "15",
  },
  accBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  // Chips
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    marginTop: -8,
  },
  chip: {
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },

  // States
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    backgroundColor: COLORS.danger + "15",
    borderWidth: 1,
    borderColor: COLORS.danger + "30",
    padding: 16,
    borderRadius: 12,
  },
  errorText: { color: COLORS.danger, textAlign: "center" },
});
