/**
 * @file src/screens/DashboardScreen.js
 * @description Главный экран аналитики (PROADMIN Mobile v11.0.0).
 * Отображает ключевые метрики (KPI) и воронку продаж.
 * ДОБАВЛЕНО: Интеграция с новой системой теней (elevated карточки), строгий AuthContext.
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
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";
import { AuthContext } from "../context/AuthContext"; // 🔥 Строгий импорт контекста

// Локальный форматтер валюты (KZT)
const formatKZT = (num) => {
  const value = parseFloat(num) || 0;
  return value.toLocaleString("ru-RU") + " ₸";
};

export default function DashboardScreen() {
  const { signOut } = useContext(AuthContext);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // =============================================================================
  // 📡 ЗАГРУЗКА ДАННЫХ
  // =============================================================================
  const fetchDashboardData = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      const data = await API.getStats();
      setStats(data || {});
    } catch (err) {
      setError(err.message || "Ошибка загрузки дашборда");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Первичная загрузка
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Обработчик Pull-to-Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(true);
  }, []);

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
  const funnel = stats?.funnel || {};

  return (
    <View style={GLOBAL_STYLES.safeArea}>
      {/* 🎩 ШАПКА ЭКРАНА (HEADER) */}
      <View style={styles.header}>
        <View>
          <Text style={GLOBAL_STYLES.h1}>Аналитика</Text>
          <Text style={GLOBAL_STYLES.textMuted}>ProElectric ERP v11.0</Text>
        </View>
        <TouchableOpacity
          onPress={signOut}
          style={styles.logoutButton}
          activeOpacity={0.7}
        >
          <LogOut color={COLORS.danger} size={24} />
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
          {/* Чистая прибыль (elevated для объема) */}
          <PeCard
            elevated={true}
            style={[styles.kpiCard, { borderColor: "rgba(16, 185, 129, 0.3)" }]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: "rgba(16, 185, 129, 0.15)" },
              ]}
            >
              <TrendingUp color={COLORS.success} size={24} />
            </View>
            <Text style={styles.kpiLabel}>Чистая прибыль</Text>
            <Text style={[styles.kpiValue, { color: COLORS.success }]}>
              {formatKZT(overview.totalNetProfit)}
            </Text>
          </PeCard>

          {/* Оборот */}
          <PeCard
            elevated={true}
            style={[styles.kpiCard, { borderColor: "rgba(59, 130, 246, 0.3)" }]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: "rgba(59, 130, 246, 0.15)" },
              ]}
            >
              <CreditCard color={COLORS.primary} size={24} />
            </View>
            <Text style={styles.kpiLabel}>Оборот (Revenue)</Text>
            <Text
              style={styles.kpiValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatKZT(overview.totalRevenue)}
            </Text>
          </PeCard>

          {/* Объекты в работе */}
          <PeCard
            elevated={true}
            style={[styles.kpiCard, { borderColor: "rgba(245, 158, 11, 0.3)" }]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: "rgba(245, 158, 11, 0.15)" },
              ]}
            >
              <Activity color={COLORS.warning} size={24} />
            </View>
            <Text style={styles.kpiLabel}>В работе</Text>
            <Text style={styles.kpiValue}>
              {overview.pendingOrders || 0} шт.
            </Text>
          </PeCard>

          {/* Клиентская база */}
          <PeCard
            elevated={true}
            style={[
              styles.kpiCard,
              { borderColor: "rgba(161, 161, 170, 0.3)" },
            ]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: COLORS.surfaceElevated },
              ]}
            >
              <Users color={COLORS.textMuted} size={24} />
            </View>
            <Text style={styles.kpiLabel}>Всего клиентов</Text>
            <Text style={styles.kpiValue}>{overview.totalUsers || 0} чел.</Text>
          </PeCard>
        </View>

        {/* 📉 ВОРОНКА ОБЪЕКТОВ */}
        <Text
          style={[
            GLOBAL_STYLES.h2,
            { marginTop: SIZES.large, marginBottom: SIZES.medium },
          ]}
        >
          Воронка лидов
        </Text>

        <PeCard elevated={true} style={styles.funnelCard}>
          {["new", "processing", "work", "done"].map((status, index) => {
            const stat = funnel[status] || { count: 0, sum: 0 };
            return (
              <View key={status}>
                <View style={styles.funnelRow}>
                  <View style={GLOBAL_STYLES.rowCenter}>
                    <PeBadge status={status} />
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={GLOBAL_STYLES.textBody}>{stat.count} шт.</Text>
                    <Text
                      style={[
                        GLOBAL_STYLES.textSmall,
                        { color: COLORS.success, fontWeight: "600" },
                      ]}
                    >
                      {formatKZT(stat.sum)}
                    </Text>
                  </View>
                </View>
                {/* Линия-разделитель (кроме последнего элемента) */}
                {index !== 3 && <View style={styles.divider} />}
              </View>
            );
          })}
        </PeCard>

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
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.light, // Легкая тень от шапки
  },
  logoutButton: {
    padding: SIZES.small,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: SIZES.radiusMd,
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
    width: "48%", // Половина экрана с небольшим зазором
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  iconWrapper: {
    width: 40,
    height: 40,
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
    fontSize: SIZES.fontTitle,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  funnelCard: {
    paddingHorizontal: 0, // Убираем отступы по краям, чтобы разделители были на всю ширину
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
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.medium,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.fontSmall,
    textAlign: "center",
  },
});
