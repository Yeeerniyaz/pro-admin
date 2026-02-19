/**
 * @file src/screens/OrdersScreen.js
 * @description Экран реестра объектов (PROADMIN Mobile v10.0.0).
 * Выводит список заказов с пагинацией, фильтрацией по статусу и оптимизированным рендерингом.
 *
 * @module OrdersScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Briefcase, ChevronRight, Calendar, User } from 'lucide-react-native';

// Импорт нашей архитектуры
import { API } from '../api/api';
import { PeCard, PeBadge } from '../components/ui';
import { COLORS, GLOBAL_STYLES, SIZES } from '../theme/theme';

const formatKZT = (num) => {
  const value = parseFloat(num) || 0;
  return value.toLocaleString('ru-RU') + ' ₸';
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const STATUS_FILTERS = [
  { id: 'all', label: 'Все объекты' },
  { id: 'new', label: 'Новые лиды' },
  { id: 'processing', label: 'Замер / Расчет' },
  { id: 'work', label: 'В работе' },
  { id: 'done', label: 'Завершенные' },
  { id: 'cancel', label: 'Отказы' },
];

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);

  const fetchOrders = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);
      
      const data = await API.getOrders(statusFilter, 100, 0);
      setOrders(data || []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки реестра объектов');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [statusFilter]);

  const renderOrderItem = ({ item }) => {
    const area = item.area || item.details?.params?.area || 0;
    const financials = item.details?.financials || {};
    const netProfit = financials.net_profit !== undefined ? financials.net_profit : item.total_price;

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => console.log(`Переход к заказу #${item.id} в разработке`)} 
      >
        <PeCard style={styles.orderCard}>
          <View style={GLOBAL_STYLES.rowBetween}>
            <View style={GLOBAL_STYLES.rowCenter}>
              <Briefcase color={COLORS.textMuted} size={16} style={{ marginRight: 6 }} />
              <Text style={styles.orderId}>#{item.id}</Text>
            </View>
            <PeBadge status={item.status} />
          </View>

          <View style={styles.divider} />

          <View style={GLOBAL_STYLES.rowBetween}>
            <View style={{ flex: 1 }}>
              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
                <User color={COLORS.primary} size={14} style={{ marginRight: 6 }} />
                <Text style={GLOBAL_STYLES.textBody} numberOfLines={1}>
                  {item.client_name || 'Оффлайн клиент'}
                </Text>
              </View>
              <View style={GLOBAL_STYLES.rowCenter}>
                <Calendar color={COLORS.textMuted} size={14} style={{ marginRight: 6 }} />
                <Text style={GLOBAL_STYLES.textSmall}>{formatDate(item.created_at)}</Text>
              </View>
            </View>
            
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={GLOBAL_STYLES.textMuted}>Площадь</Text>
              <Text style={styles.areaText}>{area} м²</Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View>
              <Text style={GLOBAL_STYLES.textSmall}>Прибыль:</Text>
              <Text style={styles.profitText}>{formatKZT(netProfit)}</Text>
            </View>
            <View style={styles.actionButton}>
              <Text style={styles.actionText}>Управление</Text>
              <ChevronRight color={COLORS.primary} size={16} />
            </View>
          </View>
        </PeCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={GLOBAL_STYLES.safeArea}>
      <View style={styles.header}>
        <Text style={GLOBAL_STYLES.h1}>Объекты</Text>
        <Text style={GLOBAL_STYLES.textMuted}>Управление реестром и сметами</Text>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {STATUS_FILTERS.map(filter => {
            const isActive = statusFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setStatusFilter(filter.id)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity onPress={() => fetchOrders()} style={{ marginTop: 10 }}>
            <Text style={{ color: COLORS.primary }}>Повторить попытку</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Briefcase color={COLORS.surfaceHover} size={48} />
              <Text style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.medium, textAlign: 'center' }]}>
                В этой категории пока нет объектов.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

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
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    padding: SIZES.large,
    paddingBottom: 100,
  },
  orderCard: {
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  orderId: {
    fontSize: SIZES.fontMedium,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.small,
  },
  areaText: {
    fontSize: SIZES.fontBase,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SIZES.medium,
    paddingTop: SIZES.small,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  profitText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '700',
    color: COLORS.success,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    marginRight: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.large,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: SIZES.medium,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.fontSmall,
    textAlign: 'center',
  }
});