/**
 * @file src/screens/DashboardScreen.js
 * @description Главный экран аналитики (PROADMIN Mobile v13.9.0 Enterprise).
 * ДОБАВЛЕНО: Интеграция с DeepAnalytics (Средний чек, Долги, Расходы).
 * ДОБАВЛЕНО: Фильтрация по датам (За месяц / За всё время).
 * ДОБАВЛЕНО: Строгий RBAC (Бригадиры видят только свои метрики).
 * 🔥 ИСПРАВЛЕНО (v13.9.0): Фатальная ошибка импорта API (import API вместо { API }).
 * 🔥 ИСПРАВЛЕНО (v13.9.0): Метод getStats заменен на правильный getDashboardStats + Fallback.
 * ИСПРАВЛЕНО: Применен единый OLED-дизайн (Black & Orange) для шапки.
 * ИСПРАВЛЕНО: Убран двойной отступ сверху (используется строгий View).
 * НИКАКИХ УДАЛЕНИЙ: RefreshControl, formatKZT и базовая воронка сохранены на 100%. ПОЛНЫЙ КОД.
 *
 * @module DashboardScreen
 * @version 13.9.0 (Safe Methods & OLED Edition)
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
  PieChart,
  BarChart3
} from "lucide-react-native";

// 🔥 ИСПРАВЛЕНО: Правильный дефолтный импорт нашего нового API
import API from "../api/api";
import { PeCard, PeBadge, PeButton } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";
import { AuthContext } from "../context/AuthContext";

// Локальный форматтер валюты (KZT)
const formatKZT = (num) => {
  const value = parseFloat(num) || 0;
  return value.toLocaleString("ru-RU") + " ₸";
};

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext);

  const [stats, setStats] = useState(null);
  const [deepStats, setDeepStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [period, setPeriod] = useState("all"); // 'all' | 'month'

  // =============================================================================
  // 📡 ЗАГРУЗКА ДАННЫХ И ФИЛЬТРАЦИЯ (С ЗАЩИТОЙ И FALLBACK)
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

      const headers = await API.getHeaders();

      // 🔥 АРХИТЕКТУРНЫЙ ПАТЧ: Безопасный вызов методов или прямой Fallback
      let statsPromise;
      if (typeof API.getDashboardStats === 'function') {
        statsPromise = API.getDashboardStats(startDate, endDate);
      } else {
        statsPromise = fetch(`https://erp.yeee.kz/api/mobile/dashboard/stats?startDate=${startDate}&endDate=${endDate}`, { headers })
          .then(res => res.json());
      }

      let deepPromise;
      if (typeof API.getDeepAnalytics === 'function') {
        deepPromise = API.getDeepAnalytics(startDate, endDate);
      } else {
        deepPromise = fetch(`https://erp.yeee.kz/api/analytics/deep?startDate=${startDate}&endDate=${endDate}`, { headers })
          .then(res => res.json());
      }

      // Ждем оба запроса параллельно
      const [statsData, deepData] = await Promise.all([statsPromise, deepPromise]);

      setStats(statsData || {});
      setDeepStats(deepData || {});
    } catch (err) {
      setError(err.message || "Ошибка загрузки дашборда. Проверьте соединение.");
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

      {/* 🎩 ШАПКА ЭКРАНА (Единый OLED-стиль) */}
      <View style={styles.header}>
        <View style={GLOBAL_STYLES.rowCenter}>
          <View style={styles.iconWrapper}>
            <BarChart3 color={COLORS.primary} size={24} />
          </View>
          <View>
            <Text style={GLOBAL_STYLES.h1}>{isAdmin ? "Аналитика" : "Моя Статистика"}</Text>
            <Text style={GLOBAL_STYLES.textMuted}>{isAdmin ? "ProElectric ERP" : "Ваши показатели"}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={logout}
          style={styles.logoutButton}
          activeOpacity={0.7}
        >
          <LogOut color={COLORS.danger} size={20} />
        </TouchableOpacity>
      </View>

      {/* 🗓 ФИЛЬТРЫ ПЕРИОДА */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, period === 'all' && styles.filterBtnActive]}
          onPress={() => setPeriod('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, period === 'all' && styles.filterTextActive]}>За всё время</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, period === 'month' && styles.filterBtnActive]}
          onPress={() => setPeriod('month')}
          activeOpacity={0.8}
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
            <View style={[styles.kpiIconWrapper, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <TrendingUp color={COLORS.success} size={20} />
            </View>
            <Text style={styles.kpiLabel}>{isAdmin ? "Чистая прибыль" : "Мой заработок"}</Text>
            <Text style={[styles.kpiValue, { color: COLORS.success }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatKZT(overview.totalNetProfit)}
            </Text>
          </PeCard>

          {/* ОБОРОТ */}
          <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.primary }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: "rgba(255, 107, 0, 0.15)" }]}>
              <CreditCard color={COLORS.primary} size={20} />
            </View>
            <Text style={styles.kpiLabel}>Оборот (Revenue)</Text>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatKZT(overview.totalRevenue)}
            </Text>
          </PeCard>

          {/* ДОЛГИ БРИГАД (ТОЛЬКО ДЛЯ АДМИНОВ) */}
          {isAdmin && (
            <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.danger }]}>
              <View style={[styles.kpiIconWrapper, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                <AlertTriangle color={COLORS.danger} size={20} />
              </View>
              <Text style={styles.kpiLabel}>Долги Бригад</Text>
              <Text style={[styles.kpiValue, { color: COLORS.danger }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatKZT(economics.totalBrigadeDebts || 0)}
              </Text>
            </PeCard>
          )}

          {/* СРЕДНИЙ ЧЕК */}
          <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.warning }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Activity color={COLORS.warning} size={20} />
            </View>
            <Text style={styles.kpiLabel}>Средний чек (AOV)</Text>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatKZT(economics.averageCheck || 0)}
            </Text>
          </PeCard>

          {/* АКТИВНЫЕ ЗАКАЗЫ */}
          <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: COLORS.surfaceElevated }]}>
              <PieChart color={COLORS.textMuted} size={20} />
            </View>
            <Text style={styles.kpiLabel}>В работе</Text>
            <Text style={styles.kpiValue}>{overview.pendingOrders || 0} шт.</Text>
          </PeCard>

          {/* БАЗА КЛИЕНТОВ (ТОЛЬКО ДЛЯ АДМИНОВ) */}
          {isAdmin && (
            <PeCard elevated={false} style={[styles.kpiCard, { borderColor: COLORS.border }]}>
              <View style={[styles.kpiIconWrapper, { backgroundColor: COLORS.surfaceElevated }]}>
                <Users color={COLORS.textMuted} size={20} />
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
        <View style={{ height: 100 }} />
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
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "rgba(255, 107, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.medium,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    gap: SIZES.small,
    backgroundColor: COLORS.background,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
  },
  filterBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 107, 0, 0.15)",
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
  kpiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: SIZES.radiusSm,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.small,
  },
  kpiLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
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