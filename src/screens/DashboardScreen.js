/**
 * @file src/screens/DashboardScreen.js
 * @description Главный экран аналитики (PROADMIN Mobile v11.0.10 Enterprise).
 * ДОБАВЛЕНО: Интеграция с DeepAnalytics (Средний чек, Долги, Расходы).
 * ДОБАВЛЕНО: Фильтрация по датам (За месяц / За всё время).
 * ДОБАВЛЕНО: Строгий RBAC (Бригадиры видят только свои метрики).
 * НИКАКИХ УДАЛЕНИЙ: RefreshControl, formatKZT и базовая воронка сохранены на 100%.
 *
 * @module DashboardScreen
 */

import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  LogOut,
  TrendingUp,
  CreditCard,
  Activity,
  Users,
  AlertTriangle,
  PieChart
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge, PeButton } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";
import { AuthContext } from "../context/AuthContext";

// Локальный форматтер валюты (KZT)
const formatKZT = (num) => {
  const value = parseFloat(num) || 0;
  return value.toLocaleString("ru-RU") + " ₸";
};

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext); // 🔥 Используем RBAC и logout

  const [stats, setStats] = useState(null);
  const [deepStats, setDeepStats] = useState(null); // 🔥 НОВОЕ: Глубокая аналитика
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [period, setPeriod] = useState("all"); // 'all' | 'month'

  // =============================================================================
  // 📡 ЗАГРУЗКА ДАННЫХ И ФИЛЬТРАЦИЯ
  // =============================================================================

  const fetchDashboardData = async (isRefresh = false, selectedPeriod = period) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      let startDate = "";
      let endDate = "";

      // Генерация дат для фильтра "Текущий месяц"
      if (selectedPeriod === "month") {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        // endDate можно оставить пустым, база обрежет по "сегодня"
      }

      const [statsData, deepData] = await Promise.all([
        API.getStats(startDate, endDate),
        API.getDeepAnalytics(startDate, endDate)
      ]);

      setStats(statsData || {});
      setDeepStats(deepData || {});
    } catch (err) {
      setError(err.message || "Ошибка загрузки дашборда");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Первичная загрузка и реакция на смену периода
  useEffect(() => {
    fetchDashboardData(false, period);
  }, [period]);

  // Обработчик Pull-to-Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(true, period);
  }, [period]);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================

  // Если данные еще грузятся и это не свайп обновления
  if (loading && !refreshing) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, GLOBAL_STYLES.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.medium }]}>
          Агрегация финансовых данных...
        </Text>
      </View>
    );
  }

  // Безопасное извлечение данных (Graceful Degradation)
  const overview = stats?.overview || {};
  const funnel = stats?.funnel || [];
  const economics = deepStats?.economics || {};
  const expenses = deepStats?.expenseBreakdown || [];

  return (
    <View style={GLOBAL_STYLES.safeArea}>
      {/* 🎩 ШАПКА ЭКРАНА (HEADER) */}
      <View style={styles.header}>
        <View>
          <Text style={GLOBAL_STYLES.h1}>{isAdmin ? "Аналитика" : "Моя Статистика"}</Text>
          <Text style={GLOBAL_STYLES.textMuted}>{isAdmin ? "ProElectric ERP v11.0" : "Ваши показатели"}</Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          style={styles.logoutButton}
          activeOpacity={0.7}
        >
          <LogOut color={COLORS.danger} size={24} />
        </TouchableOpacity>
      </View>

      {/* 🗓 ФИЛЬТРЫ ПЕРИОДА (НОВОЕ) */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, period === 'all' && styles.filterBtnActive]}
          onPress={() => setPeriod('all')}
        >
          <Text style={[styles.filterText, period === 'all' && styles.filterTextActive]}>За всё время</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, period === 'month' && styles.filterBtnActive]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[styles.filterText, period === 'month' && styles.filterTextActive]}>Этот месяц</Text>
        </TouchableOpacity>
      </View>

      {/* 📜 СКРОЛЛИРУЕМЫЙ КОНТЕНТ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 📊 СЕТКА KPI (ГЛАВНЫЕ МЕТРИКИ) */}
        <View style={styles.kpiGrid}>
          {/* ЧИСТАЯ ПРИБЫЛЬ */}
          <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.success }]}>
            <View style={[styles.iconWrapper, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <TrendingUp color={COLORS.success} size={24} />
            </View>
            <Text style={styles.kpiLabel}>{isAdmin ? "Чистая прибыль" : "Мой заработок"}</Text>
            <Text style={[styles.kpiValue, { color: COLORS.success }]}>
              {formatKZT(overview.totalNetProfit)}
            </Text>
          </PeCard>

          {/* ОБОРОТ */}
          <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.primary }]}>
            <View style={[styles.iconWrapper, { backgroundColor: "rgba(255, 107, 0, 0.15)" }]}>
              <CreditCard color={COLORS.primary} size={24} />
            </View>
            <Text style={styles.kpiLabel}>Оборот (Revenue)</Text>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatKZT(overview.totalRevenue)}
            </Text>
          </PeCard>

          {/* ДОЛГИ БРИГАД (ТОЛЬКО ДЛЯ АДМИНОВ) */}
          {isAdmin && (
            <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.danger }]}>
              <View style={[styles.iconWrapper, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                <AlertTriangle color={COLORS.danger} size={24} />
              </View>
              <Text style={styles.kpiLabel}>Долги Бригад</Text>
              <Text style={[styles.kpiValue, { color: COLORS.danger }]}>
                {formatKZT(economics.totalBrigadeDebts || 0)}
              </Text>
            </PeCard>
          )}

          {/* СРЕДНИЙ ЧЕК */}
          <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.warning }]}>
            <View style={[styles.iconWrapper, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Activity color={COLORS.warning} size={24} />
            </View>
            <Text style={styles.kpiLabel}>Средний чек (AOV)</Text>
            <Text style={styles.kpiValue}>
              {formatKZT(economics.averageCheck || 0)}
            </Text>
          </PeCard>

          {/* АКТИВНЫЕ ЗАКАЗЫ */}
          <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.border }]}>
            <View style={[styles.iconWrapper, { backgroundColor: COLORS.surfaceElevated }]}>
              <PieChart color={COLORS.textMuted} size={24} />
            </View>
            <Text style={styles.kpiLabel}>В работе</Text>
            <Text style={styles.kpiValue}>{overview.pendingOrders || 0} шт.</Text>
          </PeCard>

          {/* БАЗА КЛИЕНТОВ (ТОЛЬКО ДЛЯ АДМИНОВ) */}
          {isAdmin && (
            <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.border }]}>
              <View style={[styles.iconWrapper, { backgroundColor: COLORS.surfaceElevated }]}>
                <Users color={COLORS.textMuted} size={24} />
              </View>
              <Text style={styles.kpiLabel}>Всего клиентов</Text>
              <Text style={styles.kpiValue}>{overview.totalUsers || 0} чел.</Text>
            </PeCard>
          )}
        </View>

        {/* 📉 ВОРОНКА ОБЪЕКТОВ */}
        <Text style={[GLOBAL_STYLES.h2, { marginTop: SIZES.medium, marginBottom: SIZES.medium }]}>
          Воронка лидов
        </Text>

        <PeCard elevated={false} style={styles.funnelCard}>
          {["new", "processing", "work", "done"].map((status, index) => {
            const stat = funnel.find(f => f.status === status) || { count: 0, sum: 0 };
            return (
              <View key={status}>
                <View style={styles.funnelRow}>
                  <View style={GLOBAL_STYLES.rowCenter}>
                    <PeBadge status={status} />
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[GLOBAL_STYLES.textBody, { fontWeight: '600' }]}>{stat.count} шт.</Text>
                    <Text style={[GLOBAL_STYLES.textSmall, { color: COLORS.textMuted }]}>
                      {formatKZT(stat.sum)}
                    </Text>
                  </View>
                </View>
                {index !== 3 && <View style={styles.divider} />}
              </View>
            );
          })}
        </PeCard>

        {/* 🧾 РАСХОДЫ (КОСТ-БРЕЙКДАУН) */}
        {expenses.length > 0 && (
          <>
            <Text style={[GLOBAL_STYLES.h2, { marginTop: SIZES.medium, marginBottom: SIZES.medium }]}>
              Структура расходов
            </Text>
            <PeCard elevated={false} style={styles.funnelCard}>
              {expenses.map((exp, index) => (
                <View key={index}>
                  <View style={styles.funnelRow}>
                    <View style={GLOBAL_STYLES.rowCenter}>
                      <View style={{ width: 4, height: 16, backgroundColor: COLORS.danger, marginRight: 8, borderRadius: 2 }} />
                      <Text style={GLOBAL_STYLES.textBody}>{exp.category || "Прочее"}</Text>
                    </View>
                    <Text style={[GLOBAL_STYLES.textBody, { color: COLORS.danger, fontWeight: '600' }]}>
                      -{formatKZT(exp.total)}
                    </Text>
                  </View>
                  {index !== expenses.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </PeCard>
          </>
        )}

        {/* Отступ снизу для красоты и Bottom Tabs */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: "center",
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.small,
    backgroundColor: COLORS.background,
  },
  logoutButton: {
    padding: SIZES.small,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: SIZES.radiusSm,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.large,
    paddingBottom: SIZES.medium,
    gap: SIZES.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 107, 0, 0.1)",
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.large,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  kpiCard: {
    width: "48%",
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: SIZES.radiusSm,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  kpiLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: SIZES.base,
  },
  kpiValue: {
    fontSize: SIZES.fontMedium,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  funnelCard: {
    paddingHorizontal: 0,
    paddingVertical: SIZES.small,
  },
  funnelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: "100%",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: SIZES.small,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.medium,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.fontSmall,
    textAlign: "center",
  },
});