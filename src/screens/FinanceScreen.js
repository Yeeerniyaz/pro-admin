/**
 * @file src/screens/FinanceScreen.js
 * @description Экран Глобальной Кассы (PROADMIN Mobile v10.0.0).
 * Управление корпоративными финансами: балансы счетов, история транзакций и проведение новых операций.
 * Строгая типизация стилей (StyleSheet) и оптимизированный рендеринг.
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
  ArrowDownRight,
  ArrowUpRight,
  X,
  CreditCard,
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";

// =============================================================================
// 🛠 УТИЛИТЫ ФОРМАТИРОВАНИЯ
// =============================================================================
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

  // Состояния модального окна (Новая транзакция)
  const [modalVisible, setModalVisible] = useState(false);
  const [txAccountId, setTxAccountId] = useState("");
  const [txType, setTxType] = useState("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Прочее");
  const [txComment, setTxComment] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  // =============================================================================
  // 📡 ЗАГРУЗКА ДАННЫХ (ACCOUNTS & TRANSACTIONS)
  // =============================================================================
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
  // 💸 ОБРАБОТЧИК НОВОЙ ТРАНЗАКЦИИ
  // =============================================================================
  const handleTransactionSubmit = async () => {
    if (
      !txAccountId ||
      !txAmount ||
      isNaN(txAmount) ||
      parseFloat(txAmount) <= 0
    ) {
      alert("Пожалуйста, введите корректную сумму");
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

      // Очистка формы и закрытие модалки
      setTxAmount("");
      setTxComment("");
      setModalVisible(false);

      // Реактивное обновление данных
      fetchFinanceData(true);
    } catch (err) {
      alert(err.message || "Ошибка при проведении операции");
    } finally {
      setTxLoading(false);
    }
  };

  // =============================================================================
  // 🧩 РЕНДЕР КАРТОЧКИ СЧЕТА (ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ)
  // =============================================================================
  const renderAccountCards = () => (
    <View style={styles.accountsContainer}>
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

  // =============================================================================
  // 🧩 РЕНДЕР ИСТОРИИ (FLATLIST ITEM)
  // =============================================================================
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
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    <View style={GLOBAL_STYLES.safeArea}>
      {/* 🎩 ШАПКА ЭКРАНА */}
      <View style={styles.header}>
        <View>
          <Text style={GLOBAL_STYLES.h1}>Касса</Text>
          <Text style={GLOBAL_STYLES.textMuted}>
            Управление корпоративными финансами
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <PlusCircle
            color={COLORS.textInverse}
            size={20}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.addButtonText}>Операция</Text>
        </TouchableOpacity>
      </View>

      {/* 📜 ОСНОВНОЙ КОНТЕНТ */}
      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity
            onPress={() => fetchFinanceData()}
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: COLORS.primary }}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderAccountCards} // Счета рендерятся над списком транзакций
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
              <DollarSign color={COLORS.surfaceHover} size={48} />
              <Text
                style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.medium }]}
              >
                Операций пока нет
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

            <ScrollView showsVerticalScrollIndicator={false}>
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

              {/* Выбор счета (простая имитация селекта через маппинг кнопок) */}
              <Text
                style={[
                  GLOBAL_STYLES.textSmall,
                  {
                    marginBottom: SIZES.base,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                  },
                ]}
              >
                Счет
              </Text>
              <View style={styles.accountSelector}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accBtn,
                      txAccountId === acc.id.toString() && styles.accBtnActive,
                    ]}
                    onPress={() => setTxAccountId(acc.id.toString())}
                  >
                    <Text
                      style={[
                        styles.accBtnText,
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

              <PeInput
                label="Сумма (₸)"
                placeholder="Например: 15000"
                keyboardType="numeric"
                value={txAmount}
                onChangeText={setTxAmount}
              />

              <PeInput
                label="Категория"
                placeholder="Зарплата, Инструмент, Прочее..."
                value={txCategory}
                onChangeText={setTxCategory}
              />

              <PeInput
                label="Комментарий"
                placeholder="За что именно..."
                value={txComment}
                onChangeText={setTxComment}
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
                style={{ marginTop: SIZES.medium }}
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusMd,
  },
  addButtonText: {
    color: COLORS.textInverse,
    fontWeight: "600",
    fontSize: SIZES.fontBase,
  },

  // Счета
  accountsContainer: {
    marginBottom: SIZES.medium,
    marginTop: SIZES.medium,
  },
  accountsScroll: {
    paddingHorizontal: SIZES.large,
    gap: SIZES.medium,
  },
  accountCard: {
    width: 220,
    marginBottom: 0, // Убираем дефолтный отступ PeCard, так как скроллим горизонтально
    padding: SIZES.medium,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: SIZES.radiusSm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.small,
  },
  accountName: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontBase,
    fontWeight: "500",
    flex: 1,
  },
  accountBalance: {
    fontSize: SIZES.fontHeader,
    fontWeight: "700",
    marginTop: SIZES.small,
  },

  // Транзакции
  listContent: {
    paddingHorizontal: SIZES.large,
    paddingBottom: 100, // Отступ под нижний таб-бар
  },
  txCard: {
    padding: SIZES.medium,
    marginBottom: SIZES.small,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.small,
  },
  txCategory: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  txAmount: {
    fontSize: SIZES.fontMedium,
    fontWeight: "700",
    marginBottom: 2,
  },
  txCommentBox: {
    marginTop: SIZES.small,
    paddingTop: SIZES.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Модалка
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    padding: SIZES.large,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.large,
  },
  closeBtn: {
    padding: SIZES.base,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 20,
  },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusMd,
    padding: 4,
    marginBottom: SIZES.large,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: SIZES.radiusSm,
  },
  typeBtnExpense: { backgroundColor: COLORS.danger },
  typeBtnIncome: { backgroundColor: COLORS.success },
  typeBtnText: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  accountSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SIZES.small,
    marginBottom: SIZES.large,
  },
  accBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm,
  },
  accBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  accBtnText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontSmall,
    fontWeight: "500",
  },

  // Состояния
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: SIZES.medium,
    borderRadius: SIZES.radiusMd,
  },
  errorText: { color: COLORS.danger },
});
