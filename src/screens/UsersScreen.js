/**
 * @file src/screens/UsersScreen.js
 * @description Экран управления персоналом и доступами (PROADMIN Mobile v13.4.1 Enterprise).
 * Позволяет администратору просматривать базу пользователей из Telegram-бота и менять их роли.
 * 🔥 ИСПРАВЛЕНО (v13.4.1): Жесткая блокировка роли Owner. Роль удалена из списка назначения. Карточка Создателя заблокирована.
 * 🔥 ИСПРАВЛЕНО: Фатальная ошибка импорта API (import API вместо { API }).
 * 🔥 ИСПРАВЛЕНО: Добавлен умный Fallback для загрузки рефералов (защита от краша при отсутствии метода в api.js).
 * ДОБАВЛЕНО: Умный локальный поиск по базе сотрудников и рефералов.
 * ДОБАВЛЕНО: Интеграция Реферальной системы. Появилась вкладка со списком рефералов.
 * ДОБАВЛЕНО: OLED Black & Orange дизайн (строгие рамки).
 * НИКАКИХ УДАЛЕНИЙ: Вся кастомная логика бейджей (isStaff, isOwner) и стейты сохранены на 100%.
 *
 * @module UsersScreen
 * @version 13.4.1 (Owner Protected & Safe Referrals Edition)
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from "react-native";
import {
  Users,
  Shield,
  Phone,
  User as UserIcon,
  X,
  CheckCircle,
  Radio, 
  Share2,
  Search
} from "lucide-react-native";

import API from "../api/api";
import { PeCard, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";

// 🔥 АРХИТЕКТУРНЫЙ ПАТЧ: Роль "owner" удалена отсюда навсегда. 
// Никто не сможет выдать права Создателя через приложение.
const ROLE_OPTIONS = [
  { id: "user", label: "Клиент (user)", desc: "Только создание заявок в боте" },
  { id: "manager", label: "Мастер (manager)", desc: "Доступ к объектам и сметам" },
  { id: "admin", label: "Администратор (admin)", desc: "Полный доступ к ERP" },
];

export default function UsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [referrals, setReferrals] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState("users"); // 'users' | 'referrals'
  
  const [searchQuery, setSearchQuery] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleUpdating, setRoleUpdating] = useState(false);

  // =============================================================================
  // 📡 ЗАГРУЗКА И ФИЛЬТРАЦИЯ
  // =============================================================================
  const fetchData = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      if (activeTab === "users") {
        const data = await API.getUsers("", 100, 0); 
        setUsers(data || []);
      } else {
        if (typeof API.getReferralsStats === 'function') {
          const refData = await API.getReferralsStats();
          setReferrals(refData || []);
        } else {
          const headers = await API.getHeaders();
          const res = await fetch('https://erp.yeee.kz/api/referrals/stats', { headers });
          const rawText = await res.text();
          const refData = rawText ? JSON.parse(rawText) : [];
          setReferrals(Array.isArray(refData) ? refData : []);
        }
      }
    } catch (err) {
      setError(err.message || "Ошибка загрузки базы");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [activeTab]);

  const getFilteredData = () => {
    let list = activeTab === "users" ? users : referrals;
    
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.telegram_id?.toString().includes(lowerQ) ||
        item.first_name?.toLowerCase().includes(lowerQ) ||
        item.username?.toLowerCase().includes(lowerQ) ||
        item.phone?.toLowerCase().includes(lowerQ)
      );
    }
    return list;
  };

  // =============================================================================
  // 🔄 ОБРАБОТЧИК СМЕНЫ РОЛИ
  // =============================================================================
  const openRoleModal = (user) => {
    // Вторая линия защиты: даже если как-то кликнули, не открываем модалку для Owner
    if (user.role === 'owner') {
      Alert.alert("Отказано", "Права Создателя системы не могут быть изменены.");
      return;
    }
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleRoleChange = async (newRole) => {
    if (!selectedUser) return;
    if (selectedUser.role === newRole) {
      setModalVisible(false);
      return;
    }

    setRoleUpdating(true);
    try {
      await API.updateUserRole(selectedUser.telegram_id, newRole);

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.telegram_id === selectedUser.telegram_id ? { ...u, role: newRole } : u
        ),
      );

      setModalVisible(false);
      Alert.alert("Успех", `Права доступа для ${selectedUser.first_name} обновлены.`);
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Не удалось изменить роль");
    } finally {
      setRoleUpdating(false);
    }
  };

  // =============================================================================
  // 🧩 РЕНДЕР КАРТОЧЕК
  // =============================================================================
  const renderUserItem = ({ item }) => {
    const isStaff = item.role === "admin" || item.role === "owner" || item.role === "manager";
    const isOwner = item.role === "owner";

    return (
      <PeCard elevated={false} style={styles.userCard}>
        <View style={GLOBAL_STYLES.rowBetween}>
          <View style={GLOBAL_STYLES.rowCenter}>
            <View style={[styles.avatar, isStaff && styles.avatarStaff]}>
              {isStaff ? <Shield color={COLORS.primary} size={20} /> : <UserIcon color={COLORS.textMuted} size={20} />}
            </View>
            <View>
              <Text style={GLOBAL_STYLES.h3} numberOfLines={1}>{item.first_name || "Без имени"}</Text>
              <Text style={GLOBAL_STYLES.textSmall}>@{item.username || "нет_username"} • ID: {item.telegram_id}</Text>
            </View>
          </View>

          <View style={[styles.roleBadge, isStaff && styles.roleBadgeStaff, isOwner && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Text style={[styles.roleBadgeText, isStaff && styles.roleBadgeTextStaff, isOwner && { color: COLORS.danger }]}>
              {item.role.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={GLOBAL_STYLES.rowBetween}>
          <View style={GLOBAL_STYLES.rowCenter}>
            <Phone color={COLORS.textMuted} size={14} style={{ marginRight: 6 }} />
            <Text style={GLOBAL_STYLES.textBody}>{item.phone || "Не указан"}</Text>
          </View>

          {/* 🔥 ПЕРВАЯ ЛИНИЯ ЗАЩИТЫ: Визуальная блокировка кнопки для Owner */}
          <TouchableOpacity
            style={[
              styles.editRoleBtn, 
              isOwner && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }
            ]}
            onPress={() => openRoleModal(item)}
            disabled={isOwner} 
            activeOpacity={0.7}
          >
            <Text style={[styles.editRoleText, isOwner && { color: COLORS.danger }]}>
              {isOwner ? "Создатель (Заблокировано)" : "Изменить права"}
            </Text>
          </TouchableOpacity>
        </View>
      </PeCard>
    );
  };

  const renderReferralItem = ({ item }) => {
    return (
      <PeCard elevated={false} style={styles.userCard}>
        <View style={GLOBAL_STYLES.rowBetween}>
          <View style={GLOBAL_STYLES.rowCenter}>
            <View style={[styles.avatar, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Share2 color={COLORS.success} size={20} />
            </View>
            <View>
              <Text style={GLOBAL_STYLES.h3} numberOfLines={1}>{item.first_name || "Без имени"}</Text>
              <Text style={GLOBAL_STYLES.textSmall}>ID: {item.telegram_id} • Тел: {item.phone || "—"}</Text>
            </View>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={GLOBAL_STYLES.rowBetween}>
          <View>
            <Text style={GLOBAL_STYLES.textSmall}>Пригласил:</Text>
            <Text style={[GLOBAL_STYLES.textBody, { fontWeight: '700' }]}>{item.invited_count} чел.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={GLOBAL_STYLES.textSmall}>Баланс бонусов:</Text>
            <Text style={[GLOBAL_STYLES.textBody, { color: COLORS.success, fontWeight: '700' }]}>
              {parseFloat(item.referral_balance || 0).toLocaleString("ru-RU")} ₸
            </Text>
          </View>
        </View>
      </PeCard>
    );
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    <View style={GLOBAL_STYLES.safeArea}>
      
      <View style={styles.header}>
        <View style={GLOBAL_STYLES.rowCenter}>
          <View style={styles.iconWrapper}>
            <Users color={COLORS.primary} size={24} />
          </View>
          <View>
            <Text style={GLOBAL_STYLES.h1}>Персонал</Text>
            <Text style={GLOBAL_STYLES.textMuted}>База Telegram & CRM</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("Broadcast")} style={styles.broadcastBtn} activeOpacity={0.7}>
          <Radio color={COLORS.primary} size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "users" && styles.tabBtnActive]} onPress={() => setActiveTab("users")} activeOpacity={0.8}>
          <Text style={[styles.tabText, activeTab === "users" && styles.tabTextActive]}>Пользователи</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "referrals" && styles.tabBtnActive]} onPress={() => setActiveTab("referrals")} activeOpacity={0.8}>
          <Text style={[styles.tabText, activeTab === "referrals" && styles.tabTextActive]}>Рефералы</Text>
        </TouchableOpacity>
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
          keyExtractor={(item) => item.telegram_id.toString()}
          renderItem={activeTab === "users" ? renderUserItem : renderReferralItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {activeTab === "users" ? <Users color={COLORS.surfaceHover} size={48} /> : <Share2 color={COLORS.surfaceHover} size={48} />}
              <Text style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.medium, textAlign: 'center' }]}>
                {searchQuery ? "По вашему запросу ничего не найдено." : (activeTab === "users" ? "База пользователей пуста" : "Никто еще никого не пригласил")}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="fade" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={GLOBAL_STYLES.h2}>Уровень доступа</Text>
                <Text style={GLOBAL_STYLES.textMuted}>Для: {selectedUser?.first_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X color={COLORS.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            {ROLE_OPTIONS.map((roleOpt) => {
              const isActive = selectedUser?.role === roleOpt.id;
              return (
                <TouchableOpacity
                  key={roleOpt.id}
                  disabled={roleUpdating}
                  onPress={() => handleRoleChange(roleOpt.id)}
                  style={[styles.roleOptionBtn, isActive && styles.roleOptionBtnActive]}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleOptionTitle, isActive && { color: COLORS.primary }]}>{roleOpt.label}</Text>
                    <Text style={GLOBAL_STYLES.textSmall}>{roleOpt.desc}</Text>
                  </View>
                  {isActive && <CheckCircle color={COLORS.primary} size={20} />}
                </TouchableOpacity>
              );
            })}

            {roleUpdating && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SIZES.large }} />}
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
    zIndex: 10,
  },
  broadcastBtn: {
    padding: 8,
    backgroundColor: "rgba(255, 107, 0, 0.1)", 
    borderRadius: 10,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: SIZES.small,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: COLORS.surfaceElevated,
  },
  tabBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 107, 0, 0.1)",
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  searchContainer: {
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.small,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SIZES.large,
    paddingBottom: Platform.OS === "android" ? 100 : 40, 
  },
  userCard: {
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
    borderWidth: 1, 
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface, 
    borderRadius: SIZES.radiusMd,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.small,
  },
  avatarStaff: {
    backgroundColor: "rgba(255, 107, 0, 0.1)", 
  },
  roleBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: SIZES.radiusSm,
  },
  roleBadgeStaff: {
    backgroundColor: "rgba(255, 107, 0, 0.15)", 
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  roleBadgeTextStaff: {
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.small,
  },
  editRoleBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm,
  },
  editRoleText: {
    color: COLORS.textMain,
    fontSize: SIZES.fontSmall,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)", 
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.large,
    borderWidth: 1, 
    borderColor: COLORS.border,
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
  roleOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    padding: SIZES.medium,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.small,
    borderWidth: 1,
    borderColor: "transparent",
  },
  roleOptionBtnActive: {
    backgroundColor: "rgba(255, 107, 0, 0.05)", 
    borderColor: COLORS.primary,
  },
  roleOptionTitle: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: SIZES.medium,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    color: COLORS.danger,
    textAlign: "center",
  },
});