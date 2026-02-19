/**
 * @file src/screens/OrdersScreen.js
 * @description Экран реестра заказов (PROADMIN Mobile v10.0.0).
 * UPGRADES (Senior):
 * - FIX: SafeAreaView (react-native-safe-area-context) для фикса системной полосы на Android.
 * - FIX: Улучшено поведение клавиатуры при поиске и скролле списка.
 * - Внедрена серверная пагинация (Infinite Scroll).
 * - Оптимизирован рендеринг списка (FlatList optimization).
 * - Живой поиск по загруженным данным без потери фокуса.
 *
 * @module OrdersScreen
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
  TextInput,
  Platform,
  Keyboard,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Briefcase,
  ChevronRight,
  Calendar,
  User,
  Search,
  Plus,
  Filter,
  X,
  MapPin,
} from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge, PeSkeleton } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, FONTS } from "../theme/theme";

const { width } = Dimensions.get("window");
const PAGE_LIMIT = 20; // Размер порции данных для пагинации

// --- Утилиты форматирования ---
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

// Фильтры статусов
const STATUS_FILTERS = [
  { id: "all", label: "Все объекты" },
  { id: "new", label: "Новые" },
  { id: "processing", label: "Замер" },
  { id: "work", label: "В работе" },
  { id: "done", label: "Завершенные" },
  { id: "cancel", label: "Отказы" },
];

export default function OrdersScreen() {
  const navigation = useNavigation();

  // Data State
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // UI/Network State
  const [loading, setLoading] = useState(true); // Первичная загрузка
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh
  const [loadingMore, setLoadingMore] = useState(false); // Подгрузка снизу
  const [allLoaded, setAllLoaded] = useState(false); // Флаг: больше данных нет
  const [error, setError] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // =============================================================================
  // 📡 NETWORK LOGIC (PAGINATION)
  // =============================================================================

  /**
   * Загрузка заказов
   * @param {boolean} reset - Сбросить список (для refresh или смены фильтра)
   */
  const fetchOrders = async (reset = false) => {
    if (loadingMore || (allLoaded && !reset)) return;

    try {
      setError(null);

      if (reset) {
        setLoading(true);
        setAllLoaded(false);
      } else {
        setLoadingMore(true);
      }

      // Вычисляем offset (смещение) для API
      const currentOffset = reset ? 0 : orders.length;

      // Запрос к API
      const newOrders = await API.getOrders(
        statusFilter,
        PAGE_LIMIT,
        currentOffset,
      );

      if (reset) {
        setOrders(newOrders || []);
      } else {
        setOrders((prev) => [...prev, ...newOrders]);
      }

      // Если пришло меньше лимита, значит это конец списка
      if (newOrders.length < PAGE_LIMIT) {
        setAllLoaded(true);
      }
    } catch (err) {
      setError(err.message || "Не удалось загрузить реестр");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // 1. Смена фильтра сбрасывает список
  useEffect(() => {
    fetchOrders(true);
  }, [statusFilter]);

  // 2. Обновление при возврате на экран (чтобы увидеть новые заказы, если создали)
  useFocusEffect(
    useCallback(() => {
      // Тихий рефреш можно добавить здесь, если потребуется
    }, []),
  );

  // 3. Обработчики
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  const handleLoadMore = () => {
    // Подгружаем только если нет активного поиска (поиск пока работает по загруженным данным)
    if (!loading && !loadingMore && !allLoaded && searchQuery.length === 0) {
      fetchOrders(false);
    }
  };

  // =============================================================================
  // 🔍 SEARCH LOGIC
  // =============================================================================

  // Фильтрация "на лету" по уже загруженным данным
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;

    const lowerQuery = searchQuery.toLowerCase();
    return orders.filter((item) => {
      const idMatch = item.id.toString().includes(lowerQuery);
      const nameMatch = (item.client_name || "")
        .toLowerCase()
        .includes(lowerQuery);
      const addressMatch = (item.address || "")
        .toLowerCase()
        .includes(lowerQuery);
      return idMatch || nameMatch || addressMatch;
    });
  }, [orders, searchQuery]);

  // =============================================================================
  // 🧩 RENDER ITEMS
  // =============================================================================

  const renderOrderItem = ({ item }) => {
    // Безопасное чтение полей из API маппинга
    const area = item.area || 0;
    const profit = item.details?.financials?.net_profit ?? item.total_price;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate("OrderDetail", { id: item.id })}
        style={styles.itemContainer}
      >
        <PeCard style={styles.orderCard}>
          {/* Header карточки */}
          <View style={GLOBAL_STYLES.rowBetween}>
            <View style={GLOBAL_STYLES.rowCenter}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: COLORS.surfaceElevated },
                ]}
              >
                <Briefcase color={COLORS.textMuted} size={16} />
              </View>
              <Text style={styles.orderId}>Заказ #{item.id}</Text>
            </View>
            <PeBadge status={item.status} />
          </View>

          <View style={styles.divider} />

          {/* Info карточки */}
          <View style={GLOBAL_STYLES.rowBetween}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 6 }]}>
                <User
                  color={COLORS.primary}
                  size={14}
                  style={{ marginRight: 6 }}
                />
                <Text style={GLOBAL_STYLES.textBody} numberOfLines={1}>
                  {item.client_name || "Без имени"}
                </Text>
              </View>
              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 6 }]}>
                <MapPin
                  color={COLORS.textMuted}
                  size={14}
                  style={{ marginRight: 6 }}
                />
                <Text style={GLOBAL_STYLES.textSmall} numberOfLines={1}>
                  {item.address || "Адрес не указан"}
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

            {/* Правая часть (Площадь) */}
            <View style={{ alignItems: "flex-end" }}>
              <Text style={GLOBAL_STYLES.textMuted}>Площадь</Text>
              <Text style={styles.areaText}>{area} м²</Text>
            </View>
          </View>

          {/* Footer карточки */}
          <View style={styles.footerRow}>
            <View>
              <Text
                style={[GLOBAL_STYLES.textSmall, { color: COLORS.textMuted }]}
              >
                Бюджет / Прибыль:
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text style={styles.priceText}>
                  {formatKZT(item.total_price)}
                </Text>
                {/* Если прибыль отличается, покажем ее */}
                {profit !== item.total_price && (
                  <Text style={[styles.profitText, { marginLeft: 8 }]}>
                    ({formatKZT(profit)})
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.actionButton}>
              <Text style={styles.actionText}>Детали</Text>
              <ChevronRight color={COLORS.primary} size={16} />
            </View>
          </View>
        </PeCard>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  // =============================================================================
  // 🖥 MAIN UI
  // =============================================================================
  return (
    // FIX: Используем SafeAreaView из react-native-safe-area-context
    // edges: top, left, right (bottom не нужен, так как там Tab Bar)
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* 🎩 Header */}
      <View style={styles.header}>
        <View style={GLOBAL_STYLES.rowBetween}>
          <View>
            <Text style={GLOBAL_STYLES.h1}>Объекты</Text>
            <Text style={GLOBAL_STYLES.textMuted}>Реестр заказов</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Filter size={20} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>

        {/* 🔎 Search Bar */}
        <View style={styles.searchContainer}>
          <Search
            size={18}
            color={COLORS.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по ID, клиенту или адресу..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 🏷 Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
          keyboardShouldPersistTaps="handled" // Не скрываем клавиатуру при клике по фильтру
        >
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => {
                  Keyboard.dismiss();
                  setStatusFilter(filter.id);
                  setSearchQuery(""); // Сброс поиска при смене фильтра
                }}
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

      {/* 📜 Order List */}
      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity
            onPress={() => fetchOrders(true)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        // Skeleton Loading
        <View style={{ padding: SIZES.large }}>
          <PeSkeleton width="100%" height={180} style={{ marginBottom: 16 }} />
          <PeSkeleton width="100%" height={180} style={{ marginBottom: 16 }} />
          <PeSkeleton width="100%" height={180} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          // Pagination props
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5} // Грузим, когда осталось 50% экрана
          ListFooterComponent={renderFooter}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss} // FIX: Скрывать клавиатуру при начале скролла
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Search color={COLORS.textMuted} size={32} />
              </View>
              <Text style={[GLOBAL_STYLES.h3, { marginTop: 16 }]}>
                {searchQuery ? "Ничего не найдено" : "Список пуст"}
              </Text>
              <Text
                style={[
                  GLOBAL_STYLES.textMuted,
                  { marginTop: 8, textAlign: "center", maxWidth: 250 },
                ]}
              >
                {searchQuery
                  ? `По запросу "${searchQuery}" нет совпадений`
                  : "Заказов в этом статусе пока нет. Создайте первый!"}
              </Text>
            </View>
          }
        />
      )}

      {/* ➕ FAB (Floating Action Button) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => {
          Keyboard.dismiss();
          navigation.navigate("CreateOrder");
        }}
      >
        <Plus color="#fff" size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// =============================================================================
// 🎨 STYLES
// =============================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMain,
    height: "100%",
  },
  clearButton: { padding: 4 },

  // Filters
  filtersContainer: {
    paddingBottom: SIZES.small,
  },
  filtersScrollContent: {
    paddingHorizontal: SIZES.large,
    gap: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterPillActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: COLORS.primary,
  },

  // List Items
  listContent: {
    padding: SIZES.large,
    paddingBottom: 100, // Space for FAB
  },
  itemContainer: { marginBottom: 16 },
  orderCard: { padding: 16 },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  areaText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMain,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderStyle: "dashed",
  },
  priceText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textMain,
    marginTop: 2,
  },
  profitText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.success,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },

  // States
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
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: COLORS.danger + "15",
    borderWidth: 1,
    borderColor: COLORS.danger + "40",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
