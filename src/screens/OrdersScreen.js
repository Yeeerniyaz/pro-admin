/**
 * @file src/screens/OrdersScreen.js
 * @description Экран реестра объектов (PROADMIN Mobile v14.1.0 Enterprise).
 * Выводит список заказов с пагинацией, фильтрацией по статусу и оптимизированным рендерингом.
 * 🔥 ИСПРАВЛЕНО (v14.1.0): Разблокированы фильтры статусов (Новые, Завершенные и т.д.) для Мелкого ремонта.
 * 🔥 ИСПРАВЛЕНО (v14.1.0): Карточки Мелкого ремонта теперь кликабельны и ведут в детальный просмотр.
 * ДОБАВЛЕНО: Жесткий RBAC. Вкладка "Звонки" скрыта от Бригадиров.
 * ДОБАВЛЕНО: Механика захвата вызова. Бригадиры могут брать мелкий ремонт прямо из списка.
 * НИКАКИХ УДАЛЕНИЙ: Вся оригинальная логика FlatList и модалок сохранена на 100%. ПОЛНЫЙ КОД.
 *
 * @module OrdersScreen
 * @version 14.1.0 (Full Filters & Clickable Minor Edition)
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
  Modal,
  Alert
} from "react-native";
import {
  Briefcase,
  ChevronRight,
  Calendar,
  User,
  PlusCircle,
  HardHat,
  Cpu,
  Layers,
  Wrench,
  PhoneCall,
  Search
} from "lucide-react-native";

import API from "../api/api";
import { PeCard, PeBadge, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";
import { AuthContext } from "../context/AuthContext";

const formatKZT = (num) => {
  const value = parseFloat(num) || 0;
  return value.toLocaleString("ru-RU") + " ₸";
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
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
  const { user } = useContext(AuthContext);
  
  // 🔥 РОЛИ И ДОСТУПЫ
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const [globalTab, setGlobalTab] = useState("complex");

  const [orders, setOrders] = useState([]);
  const [minorRepairs, setMinorRepairs] = useState([]);
  const [callRequests, setCallRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [statusModal, setStatusModal] = useState({ visible: false, id: null, type: null, currentStatus: null });

  // =============================================================================
  // 📡 ЗАГРУЗКА И ФИЛЬТРАЦИЯ ДАННЫХ
  // =============================================================================
  const fetchData = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      if (globalTab === "complex" || globalTab === "minor") {
        const data = await API.getOrders(statusFilter, 100, 0);
        
        const complexData = (data || []).filter(item => item.type === 'complex' || !item.type);
        const minorData = (data || []).filter(item => item.type === 'minor');

        setOrders(complexData);
        setMinorRepairs(minorData);
      } 
      else if (globalTab === "calls" && isAdmin) {
        if (typeof API.getCallRequests === 'function') {
          const data = await API.getCallRequests();
          setCallRequests(data || []);
        } else {
          const headers = await API.getHeaders();
          const res = await fetch('https://erp.yeee.kz/api/call-requests', { headers });
          const rawText = await res.text();
          const data = rawText ? JSON.parse(rawText) : [];
          setCallRequests(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      setError(err.message || "Ошибка загрузки реестра");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && globalTab === "calls") {
      setGlobalTab("complex");
      return;
    }
    fetchData();
  }, [statusFilter, globalTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [statusFilter, globalTab]);

  const getFilteredData = () => {
    let list = globalTab === 'complex' ? orders : globalTab === 'minor' ? minorRepairs : callRequests;

    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      list = list.filter(item =>
        item.id?.toString().includes(lowerQ) ||
        item.client_name?.toLowerCase().includes(lowerQ) ||
        item.client_phone?.toLowerCase().includes(lowerQ) ||
        item.details?.address?.toLowerCase().includes(lowerQ) ||
        item.description?.toLowerCase().includes(lowerQ)
      );
    }
    return list;
  };

  // =============================================================================
  // 🔄 ОБРАБОТКА СТАТУСОВ ДЛЯ МЕЛКОГО РЕМОНТА И ЗВОНКОВ
  // =============================================================================
  const openStatusModal = (id, type, currentStatus) => {
    setStatusModal({ visible: true, id, type, currentStatus });
  };

  const handleTakeMinor = async (id) => {
    try {
      setLoading(true);
      setStatusModal({ visible: false, id: null, type: null, currentStatus: null });

      if (typeof API.takeMinorRepair === 'function') {
        await API.takeMinorRepair(id);
      } else {
        const headers = await API.getHeaders();
        const res = await fetch(`https://erp.yeee.kz/api/minor-repairs/${id}/take`, {
          method: 'POST',
          headers
        });
        if (!res.ok) throw new Error("Не удалось взять вызов");
      }

      Alert.alert("Успех", "Вызов успешно взят в работу!");
      fetchData(true);
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  const applyStatus = async (newStatus) => {
    const { id, type } = statusModal;
    try {
      setLoading(true);
      setStatusModal({ visible: false, id: null, type: null, currentStatus: null });

      if (type === 'minor') {
        if (typeof API.updateMinorRepairStatus === 'function') {
          await API.updateMinorRepairStatus(id, newStatus);
        } else {
          const headers = await API.getHeaders();
          await fetch(`https://erp.yeee.kz/api/minor-repairs/${id}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: newStatus })
          });
        }
      } 
      else if (type === 'call') {
        if (typeof API.updateCallRequestStatus === 'function') {
          await API.updateCallRequestStatus(id, newStatus);
        } else {
          const headers = await API.getHeaders();
          await fetch(`https://erp.yeee.kz/api/call-requests/${id}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: newStatus })
          });
        }
      }

      fetchData(true);
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  // =============================================================================
  // 🧩 РЕНДЕР КАРТОЧЕК
  // =============================================================================

  const renderOrderItem = ({ item }) => {
    const params = item.details?.params || {};
    const area = item.area || params.area || 0;
    const isSmartHome = params.isSmartHome === true;
    const propTypeRaw = params.propertyType || 'apartment';
    const propTypeName = propTypeRaw === 'house' ? 'Дом' : propTypeRaw === 'commercial' ? 'Коммерция' : 'Квартира';
    const financials = item.details?.financials || {};
    const netProfit = financials.net_profit !== undefined ? financials.net_profit : item.total_price;

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("OrderDetail", { order: item })}>
        <PeCard elevated={false} style={styles.orderCard}>
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
                <User color={COLORS.textMuted} size={14} style={{ marginRight: 6 }} />
                <Text style={GLOBAL_STYLES.textBody} numberOfLines={1}>{item.client_name || "Оффлайн клиент"}</Text>
              </View>

              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
                <HardHat color={item.brigade_name ? COLORS.warning : COLORS.primary} size={14} style={{ marginRight: 6 }} />
                <Text style={[GLOBAL_STYLES.textSmall, { color: item.brigade_name ? COLORS.warning : COLORS.primary, fontWeight: '600' }]} numberOfLines={1}>
                  {item.brigade_name ? item.brigade_name : "БИРЖА"}
                </Text>
              </View>

              <View style={GLOBAL_STYLES.rowCenter}>
                <Calendar color={COLORS.textMuted} size={14} style={{ marginRight: 6 }} />
                <Text style={GLOBAL_STYLES.textSmall}>{formatDate(item.created_at)}</Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={GLOBAL_STYLES.textMuted}>Площадь</Text>
              <Text style={styles.areaText}>{area} м²</Text>
            </View>
          </View>

          {(area > 0) && (
            <View style={styles.indicatorsRow}>
              <View style={styles.indicatorPill}>
                <Layers color={COLORS.textMuted} size={12} style={{ marginRight: 4 }} />
                <Text style={styles.indicatorText}>{propTypeName}</Text>
              </View>
              {isSmartHome && (
                <View style={[styles.indicatorPill, { borderColor: COLORS.primary, backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
                  <Cpu color={COLORS.primary} size={12} style={{ marginRight: 4 }} />
                  <Text style={[styles.indicatorText, { color: COLORS.primary }]}>Smart Home</Text>
                </View>
              )}
            </View>
          )}

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

  // 🔥 ОБНОВЛЕННАЯ И КЛИКАБЕЛЬНАЯ КАРТОЧКА МЕЛКОГО РЕМОНТА
  const renderMinorItem = ({ item }) => {
    const isActionable = isAdmin || (isManager && item.status !== 'done' && item.status !== 'cancel' && item.status !== 'archived');

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("OrderDetail", { order: item })}>
        <PeCard elevated={false} style={styles.orderCard}>
          <View style={GLOBAL_STYLES.rowBetween}>
            <View style={GLOBAL_STYLES.rowCenter}>
              <Wrench color={COLORS.textMuted} size={16} style={{ marginRight: 6 }} />
              <Text style={styles.orderId}>#{item.id}</Text>
            </View>
            <PeBadge status={item.status} />
          </View>
          <View style={styles.divider} />
          
          <View style={GLOBAL_STYLES.rowBetween}>
            <View style={{ flex: 1 }}>
              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
                <User color={COLORS.textMuted} size={14} style={{ marginRight: 6 }} />
                <Text style={GLOBAL_STYLES.textBody} numberOfLines={1}>{item.client_name || "Неизвестно"}</Text>
              </View>
              
              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
                <PhoneCall color={COLORS.primary} size={14} style={{ marginRight: 6 }} />
                <Text style={[GLOBAL_STYLES.textBody, { color: COLORS.primary, fontWeight: '600' }]}>{item.client_phone || "—"}</Text>
              </View>

              <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
                <HardHat color={item.brigade_name ? COLORS.warning : COLORS.primary} size={14} style={{ marginRight: 6 }} />
                <Text style={[GLOBAL_STYLES.textSmall, { color: item.brigade_name ? COLORS.warning : COLORS.primary, fontWeight: '600' }]} numberOfLines={1}>
                  {item.brigade_name ? item.brigade_name : "БИРЖА (Свободно)"}
                </Text>
              </View>

              <View style={GLOBAL_STYLES.rowCenter}>
                <Calendar color={COLORS.textMuted} size={14} style={{ marginRight: 6 }} />
                <Text style={GLOBAL_STYLES.textSmall}>{formatDate(item.created_at)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { marginVertical: 12 }]} />
          <Text style={[GLOBAL_STYLES.textBody, { fontStyle: 'italic', marginBottom: SIZES.small }]}>
            "{item.description || item.details?.client_comment || "Нет описания"}"
          </Text>

          <View style={styles.footerRow}>
            <View>
              <Text style={GLOBAL_STYLES.textSmall}>Сумма вызова:</Text>
              <Text style={styles.profitText}>{item.total_price ? formatKZT(item.total_price) : "Договорная"}</Text>
            </View>

            {isActionable ? (
              <TouchableOpacity style={styles.actionButton} onPress={(e) => { e.stopPropagation(); openStatusModal(item.id, 'minor', item.status); }}>
                <Text style={styles.actionText}>{item.status === 'new' ? 'Взять вызов' : 'Быстрый статус'}</Text>
                <ChevronRight color={COLORS.primary} size={16} />
              </TouchableOpacity>
            ) : (
              <View style={styles.actionButton}>
                <Text style={styles.actionText}>Открыть</Text>
                <ChevronRight color={COLORS.primary} size={16} />
              </View>
            )}
          </View>
        </PeCard>
      </TouchableOpacity>
    );
  };

  const renderCallItem = ({ item }) => (
    <PeCard elevated={false} style={styles.orderCard}>
      <View style={GLOBAL_STYLES.rowBetween}>
        <View style={GLOBAL_STYLES.rowCenter}>
          <PhoneCall color={COLORS.textMuted} size={16} style={{ marginRight: 6 }} />
          <Text style={styles.orderId}>#{item.id}</Text>
        </View>
        <PeBadge status={item.status} />
      </View>
      <View style={styles.divider} />
      <View style={GLOBAL_STYLES.rowBetween}>
        <View style={{ flex: 1 }}>
          <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
            <User color={COLORS.textMuted} size={14} style={{ marginRight: 6 }} />
            <Text style={GLOBAL_STYLES.textBody} numberOfLines={1}>{item.client_name || "Неизвестно"} {item.username ? `(@${item.username})` : ''}</Text>
          </View>
          <View style={[GLOBAL_STYLES.rowCenter, { marginBottom: 4 }]}>
            <PhoneCall color={COLORS.primary} size={14} style={{ marginRight: 6 }} />
            <Text style={[GLOBAL_STYLES.textBody, { color: COLORS.primary, fontWeight: '600' }]}>{item.client_phone || "—"}</Text>
          </View>
          <View style={GLOBAL_STYLES.rowCenter}>
            <Calendar color={COLORS.textMuted} size={14} style={{ marginRight: 6 }} />
            <Text style={GLOBAL_STYLES.textSmall}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
      {isAdmin && (
        <View style={styles.footerRow}>
          <View />
          <TouchableOpacity style={styles.actionButton} onPress={() => openStatusModal(item.id, 'call', item.status)}>
            <Text style={styles.actionText}>Изменить статус</Text>
            <ChevronRight color={COLORS.primary} size={16} />
          </TouchableOpacity>
        </View>
      )}
    </PeCard>
  );

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    <View style={GLOBAL_STYLES.safeArea}>

      <View style={[styles.header, GLOBAL_STYLES.rowBetween]}>
        <View style={GLOBAL_STYLES.rowCenter}>
          <View style={styles.iconWrapper}>
            <Briefcase color={COLORS.primary} size={24} />
          </View>
          <View>
            <Text style={GLOBAL_STYLES.h1}>{isAdmin ? "Объекты" : "Мои объекты"}</Text>
            <Text style={GLOBAL_STYLES.textMuted}>{isAdmin ? "Реестр и сметы" : "Объекты и Биржа"}</Text>
          </View>
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={() => navigation.navigate("CreateOrder")} activeOpacity={0.7} style={styles.addBtn}>
            <PlusCircle color={COLORS.primary} size={28} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.globalTabsContainer}>
        <TouchableOpacity style={[styles.globalTab, globalTab === 'complex' && styles.globalTabActive]} onPress={() => setGlobalTab('complex')}>
          <Briefcase color={globalTab === 'complex' ? COLORS.primary : COLORS.textMuted} size={16} />
          <Text style={[styles.globalTabText, globalTab === 'complex' && styles.globalTabTextActive]}>Комплекс</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.globalTab, globalTab === 'minor' && styles.globalTabActive]} onPress={() => setGlobalTab('minor')}>
          <Wrench color={globalTab === 'minor' ? COLORS.primary : COLORS.textMuted} size={16} />
          <Text style={[styles.globalTabText, globalTab === 'minor' && styles.globalTabTextActive]}>Мелкий</Text>
        </TouchableOpacity>
        
        {isAdmin && (
          <TouchableOpacity style={[styles.globalTab, globalTab === 'calls' && styles.globalTabActive]} onPress={() => setGlobalTab('calls')}>
            <PhoneCall color={globalTab === 'calls' ? COLORS.primary : COLORS.textMuted} size={16} />
            <Text style={[styles.globalTabText, globalTab === 'calls' && styles.globalTabTextActive]}>Звонки</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <PeInput
          placeholder="Поиск по ID, имени, телефону..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Search color={COLORS.textMuted} size={18} />}
          style={{ marginBottom: 0 }}
        />
      </View>

      {/* 🔥 ФИЛЬТРЫ ТЕПЕРЬ ДОСТУПНЫ И ДЛЯ МЕЛКОГО РЕМОНТА */}
      {(globalTab === 'complex' || globalTab === 'minor') && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScrollContent}>
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setStatusFilter(filter.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity onPress={() => fetchData()} style={{ marginTop: 10 }}>
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={getFilteredData()} 
          keyExtractor={(item) => item.id.toString()}
          renderItem={globalTab === 'complex' ? renderOrderItem : globalTab === 'minor' ? renderMinorItem : renderCallItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Briefcase color={COLORS.surfaceHover} size={48} />
              <Text style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.medium, textAlign: "center" }]}>
                {searchQuery ? "По вашему запросу ничего не найдено." : "В этой категории пока нет записей."}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={statusModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={[GLOBAL_STYLES.h2, { marginBottom: SIZES.medium, textAlign: 'center' }]}>Действия</Text>

            {statusModal.type === 'minor' && (
              <>
                {isManager && statusModal.currentStatus === 'new' && (
                  <TouchableOpacity style={styles.statusOption} onPress={() => handleTakeMinor(statusModal.id)}>
                    <Text style={[styles.statusText, {color: COLORS.primary, fontWeight: '800'}]}>🚀 Взять вызов себе</Text>
                  </TouchableOpacity>
                )}

                {isAdmin && (
                  <TouchableOpacity style={styles.statusOption} onPress={() => applyStatus('new')}><Text style={styles.statusText}>Новый (На биржу)</Text></TouchableOpacity>
                )}

                {(!isManager || statusModal.currentStatus !== 'new') && (
                  <>
                    <TouchableOpacity style={styles.statusOption} onPress={() => applyStatus('processing')}><Text style={styles.statusText}>В работе</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statusOption} onPress={() => applyStatus('done')}><Text style={styles.statusText}>Завершен</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statusOption} onPress={() => applyStatus('cancel')}><Text style={styles.statusText}>Отменен</Text></TouchableOpacity>
                  </>
                )}
              </>
            )}

            {statusModal.type === 'call' && isAdmin && (
              <>
                <TouchableOpacity style={styles.statusOption} onPress={() => applyStatus('new')}><Text style={styles.statusText}>Ожидает звонка</Text></TouchableOpacity>
                <TouchableOpacity style={styles.statusOption} onPress={() => applyStatus('processed')}><Text style={styles.statusText}>Обработан</Text></TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusModal({ visible: false, id: null, type: null, currentStatus: null })}>
              <Text style={styles.cancelBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

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
  addBtn: {
    padding: 8,
    backgroundColor: "rgba(255, 107, 0, 0.1)",
    borderRadius: 10,
  },
  searchContainer: {
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small,
    backgroundColor: COLORS.background,
  },
  globalTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  globalTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.surfaceElevated,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  globalTabActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderColor: COLORS.primary,
  },
  globalTabText: {
    marginLeft: 6,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 12
  },
  globalTabTextActive: {
    color: COLORS.primary,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SIZES.small,
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
    backgroundColor: "rgba(255, 107, 0, 0.15)",
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
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
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface, 
    borderRadius: SIZES.radiusMd,
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
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.small,
    gap: SIZES.small,
  },
  indicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.background,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
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
    backgroundColor: "rgba(255, 107, 0, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContentSmall: {
    width: "80%",
    backgroundColor: COLORS.surface,
    padding: SIZES.large,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusOption: {
    paddingVertical: SIZES.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusText: {
    color: COLORS.textMain,
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    textAlign: "center"
  },
  cancelBtn: {
    marginTop: SIZES.medium,
    padding: SIZES.medium,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: SIZES.radiusSm,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    textAlign: "center",
    fontWeight: "600"
  }
});