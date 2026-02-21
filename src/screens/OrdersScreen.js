/**
 * @file src/screens/OrdersScreen.js
 * @description Экран реестра объектов (PROADMIN Mobile v11.0.11 Enterprise).
 * Выводит список заказов с пагинацией, фильтрацией по статусу и оптимизированным рендерингом.
 * ДОБАВЛЕНО: Строгий RBAC (Бригадиры не могут создавать заказы, динамические заголовки).
 * ДОБАВЛЕНО: Интеграция с OLED Black & Orange дизайном (замена синих оттенков на оранжевые).
 * ДОБАВЛЕНО: Отображение привязанной бригады или статуса "Биржа" прямо в карточке.
 * НИКАКИХ УДАЛЕНИЙ: Вся оригинальная логика FlatList и RefreshControl сохранена.
 *
 * @module OrdersScreen
 */

import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Briefcase,
  ChevronRight,
  Calendar,
  User,
  PlusCircle,
  HardHat, // 🔥 Добавлена иконка для бригад
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";
import { AuthContext } from "../context/AuthContext"; // 🔥 Строгий импорт контекста

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
  });
};

const STATUS_FILTERS = [
  { id: "all", label: "Все объекты" },
  { id: "new", label: "Новые лиды" },
  { id: "processing", label: "Замер / Расчет" },
  { id: "work", label: "В работе" },
  { id: "done", label: "Завершенные" },
  { id: "cancel", label: "Отказы" },
];

export default function OrdersScreen({ navigation }) {
  const { user } = useContext(AuthContext); // Подключаем сессию для RBAC
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(null);

  // =============================================================================
  // 📡 ЗАГРУЗКА ДАННЫХ
  // =============================================================================
  const fetchOrders = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      const data = await API.getOrders(statusFilter, 100, 0);
      setOrders(data || []);
    } catch (err) {
      setError(err.message || "Ошибка загрузки реестра объектов");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Перезапрос при смене фильтра
  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  // Обработчик Pull-to-Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [statusFilter]);

  // =============================================================================
  // 🧩 РЕНДЕР КАРТОЧКИ ЗАКАЗА (FLATLIST ITEM)
  // =============================================================================
  const renderOrderItem = ({ item }) => {
    // Безопасное извлечение параметров (Graceful Degradation)
    const area = item.area || item.details?.params?.area || 0;
    const financials = item.details?.financials || {};
    const netProfit =
      financials.net_profit !== undefined
        ? financials.net_profit
        : item.total_price;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate("OrderDetail", { order: item })}
      >
        {/* 🔥 OLED Design: elevated={false} для строгих рамок без грязных теней */}
        <PeCard elevated={false} style={styles.orderCard}>
          <View style={GLOBAL_STYLES.rowBetween}>
            <View style={GLOBAL_STYLES.rowCenter}>
              <Briefcase
                color={COLORS.textMuted}
                size={16}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.orderId}>#{item.id}</Text>
            </View>
            <PeBadge status={item.status} />
          </View>

          <View style={styles.divider} />

          <View style={GLOBAL_STYLES.rowBetween}>
            <View style={{ flex: 1 }}>
              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
                <User
                  color={COLORS.textMuted}
                  size={14}
                  style={{ marginRight: 6 }}
                />
                <Text style={GLOBAL_STYLES.textBody} numberOfLines={1}>
                  {item.client_name || "Оффлайн клиент"}
                </Text>
              </View>

              {/* Вывод Бригады или Биржи */}
              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
                <HardHat
                  color={item.brigade_name ? COLORS.warning : COLORS.primary}
                  size={14}
                  style={{ marginRight: 6 }}
                />
                <Text style={[GLOBAL_STYLES.textSmall, { color: item.brigade_name ? COLORS.warning : COLORS.primary, fontWeight: '600' }]} numberOfLines={1}>
                  {item.brigade_name ? item.brigade_name : "БИРЖА"}
                </Text>
              </View>

              <View style={GLOBAL_STYLES.rowCenter}>
                <Calendar
                  color={COLORS.textMuted}
                  size={14}
                  style={{ marginRight: 6 }}
                />
                <Text style={GLOBAL_STYLES.textSmall}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={GLOBAL_STYLES.textMuted}>Площадь</Text>
              <Text style={styles.areaText}>{area} м²</Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View>
              <Text style={GLOBAL_STYLES.textSmall}>Сумма/Прибыль:</Text>
              <Text style={styles.profitText}>{formatKZT(netProfit)}</Text>
            </View>
            <View style={styles.actionButton}>
              <Text style={styles.actionText}>Открыть</Text>
              <ChevronRight color={COLORS.primary} size={16} />
            </View>
          </View>
        </PeCard>
      </TouchableOpacity>
    );
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    <View style={GLOBAL_STYLES.safeArea}>
      {/* 🎩 ШАПКА ЭКРАНА С КНОПКОЙ СОЗДАНИЯ */}
      <View style={[styles.header, GLOBAL_STYLES.rowBetween]}>
        <View>
          <Text style={GLOBAL_STYLES.h1}>{isAdmin ? "Объекты" : "Мои объекты"}</Text>
          <Text style={GLOBAL_STYLES.textMuted}>{isAdmin ? "Реестр и сметы" : "Объекты и Биржа"}</Text>
        </View>
        {/* Кнопка создания заказа доступна только Администраторам */}
        {isAdmin && (
          <TouchableOpacity
            onPress={() => navigation.navigate("CreateOrder")}
            activeOpacity={0.7}
          >
            <PlusCircle color={COLORS.primary} size={32} />
          </TouchableOpacity>
        )}
      </View>

      {/* 🎛 ФИЛЬТРЫ СТАТУСОВ (Горизонтальный скролл) */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setStatusFilter(filter.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 📜 СПИСОК ОБЪЕКТОВ (FLATLIST) */}
      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity
            onPress={() => fetchOrders()}
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Briefcase color={COLORS.surfaceHover} size={48} />
              <Text
                style={[
                  GLOBAL_STYLES.textMuted,
                  { marginTop: SIZES.medium, textAlign: "center" },
                ]}
              >
                В этой категории пока нет объектов.
              </Text>
            </View>
          }
        />
      )}
    </View>
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
    backgroundColor: COLORS.background,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SIZES.small,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  filtersScrollContent: {
    paddingHorizontal: SIZES.large,
    gap: SIZES.small,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: "rgba(255, 107, 0, 0.15)", // Оранжевый OLED акцент
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  filterTextActive: {
    color: COLORS.primary, // Оранжевый текст
  },
  listContent: {
    padding: SIZES.large,
    paddingBottom: 100, // Отступ под нижний таб-бар
  },
  orderCard: {
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  orderId: {
    fontSize: SIZES.fontMedium,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.small,
  },
  areaText: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    color: COLORS.textMain,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: SIZES.medium,
    paddingTop: SIZES.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  profitText: {
    fontSize: SIZES.fontMedium,
    fontWeight: "700",
    color: COLORS.success,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 0, 0.1)", // Оранжевый фон кнопки
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm, // Строгие углы
  },
  actionText: {
    color: COLORS.primary,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
    marginRight: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.large,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: SIZES.medium,
    borderRadius: SIZES.radiusMd,
    alignItems: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.fontSmall,
    textAlign: "center",
  },
});