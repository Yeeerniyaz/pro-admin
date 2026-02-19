/**
 * @file src/screens/UsersScreen.js
 * @description Экран управления персоналом и доступами (PROADMIN Mobile v10.0.0).
 * UPGRADES (Senior):
 * - Добавлен живой поиск (Search) по всем полям.
 * - Добавлена аналитика (Stats Header) по ролям.
 * - Улучшен UI карточек и аватаров.
 * - Оптимизирована фильтрация списков.
 *
 * @module UsersScreen
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  TextInput,
  Keyboard,
} from "react-native";
import {
  Users,
  Shield,
  Phone,
  User as UserIcon,
  X,
  CheckCircle,
  Search,
  Briefcase,
  Filter,
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard } from "../components/ui"; // PeBadge убран, используем кастомный для гибкости
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";

const ROLE_OPTIONS = [
  { id: "user", label: "Клиент (user)", desc: "Только создание заявок в боте" },
  {
    id: "manager",
    label: "Мастер (manager)",
    desc: "Доступ к объектам и сметам",
  },
  { id: "admin", label: "Администратор (admin)", desc: "Полный доступ к ERP" },
];

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Стейты модалки смены роли
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleUpdating, setRoleUpdating] = useState(false);

  // =============================================================================
  // 📡 ЗАГРУЗКА ДАННЫХ
  // =============================================================================
  const fetchUsers = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      const data = await API.getUsers(200, 0); // Увеличили лимит загрузки для поиска
      setUsers(data || []);
    } catch (err) {
      setError(err.message || "Ошибка загрузки базы пользователей");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers(true);
  }, []);

  // =============================================================================
  // 🔍 ПОИСК И СТАТИСТИКА (Senior Logic)
  // =============================================================================

  // Мемоизированная фильтрация (не тормозит UI при вводе)
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;

    const lowerQuery = searchQuery.toLowerCase();
    return users.filter((u) => {
      const name = (u.first_name || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      const id = String(u.telegram_id);

      return (
        name.includes(lowerQuery) ||
        username.includes(lowerQuery) ||
        phone.includes(lowerQuery) ||
        id.includes(lowerQuery)
      );
    });
  }, [users, searchQuery]);

  // Подсчет статистики "на лету"
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin" || u.role === "owner")
        .length,
      managers: users.filter((u) => u.role === "manager").length,
    };
  }, [users]);

  // =============================================================================
  // 🔄 ОБРАБОТЧИК СМЕНЫ РОЛИ
  // =============================================================================
  const openRoleModal = (user) => {
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

      // Локально обновляем стейт (Optimistic UI update)
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.telegram_id === selectedUser.telegram_id
            ? { ...u, role: newRole }
            : u,
        ),
      );

      setModalVisible(false);
      Alert.alert(
        "Успех",
        `Права доступа для ${selectedUser.first_name} обновлены.`,
      );
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Не удалось изменить роль");
    } finally {
      setRoleUpdating(false);
    }
  };

  // Генерация инициалов для аватара
  const getInitials = (name) => {
    if (!name) return "?";
    return name.slice(0, 1).toUpperCase();
  };

  // =============================================================================
  // 🧩 РЕНДЕР КАРТОЧКИ ПОЛЬЗОВАТЕЛЯ
  // =============================================================================
  const renderUserItem = ({ item }) => {
    const isStaff = ["admin", "owner", "manager"].includes(item.role);
    const isOwner = item.role === "owner";

    // Цвет бейджа в зависимости от роли
    let badgeColor = COLORS.textMuted;
    let badgeBg = COLORS.surfaceElevated;

    if (item.role === "admin" || item.role === "owner") {
      badgeColor = COLORS.primary;
      badgeBg = COLORS.primary + "15";
    } else if (item.role === "manager") {
      badgeColor = COLORS.warning;
      badgeBg = COLORS.warning + "15";
    }

    return (
      <PeCard style={styles.userCard}>
        <View style={GLOBAL_STYLES.rowBetween}>
          <View style={GLOBAL_STYLES.rowCenter}>
            {/* Аватар с инициалами */}
            <View style={[styles.avatar, isStaff && styles.avatarStaff]}>
              <Text
                style={[styles.avatarText, isStaff && styles.avatarTextStaff]}
              >
                {getInitials(item.first_name)}
              </Text>
            </View>

            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={GLOBAL_STYLES.h3} numberOfLines={1}>
                {item.first_name || "Без имени"}
              </Text>
              <Text style={GLOBAL_STYLES.textSmall} numberOfLines={1}>
                @{item.username || "нет_username"} • {item.telegram_id}
              </Text>
            </View>
          </View>

          {/* Роль */}
          <View style={[styles.roleBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.roleBadgeText, { color: badgeColor }]}>
              {item.role === "owner" ? "ВЛАДЕЛЕЦ" : item.role.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={GLOBAL_STYLES.rowBetween}>
          <View style={GLOBAL_STYLES.rowCenter}>
            <Phone
              color={COLORS.textMuted}
              size={14}
              style={{ marginRight: 6 }}
            />
            <Text style={GLOBAL_STYLES.textBody}>
              {item.phone || "Не указан"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.editRoleBtn, isOwner && { opacity: 0.5 }]}
            onPress={() => openRoleModal(item)}
            disabled={isOwner}
          >
            <Text style={styles.editRoleText}>Управление</Text>
          </TouchableOpacity>
        </View>
      </PeCard>
    );
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР
  // =============================================================================
  return (
    <View style={GLOBAL_STYLES.safeArea}>
      {/* 🎩 ШАПКА + ПОИСК */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View>
            <Text style={GLOBAL_STYLES.h1}>Персонал</Text>
            <Text style={GLOBAL_STYLES.textMuted}>Управление доступом</Text>
          </View>
          {/* Мини-статистика справа */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.admins}</Text>
              <Text style={styles.statLabel}>Admin</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.managers}</Text>
              <Text style={styles.statLabel}>Staff</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Всего</Text>
            </View>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchWrapper}>
          <Search
            size={18}
            color={COLORS.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Найти по имени, ID или телефону..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearBtn}
            >
              <X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 📜 СПИСОК */}
      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity
            onPress={() => fetchUsers()}
            style={styles.retryBtn}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
              Обновить базу
            </Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.telegram_id.toString()}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          onScrollBeginDrag={Keyboard.dismiss} // Скрывать клавиатуру при скролле
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Users color={COLORS.textMuted} size={32} />
              </View>
              <Text style={[GLOBAL_STYLES.h3, { marginTop: 16 }]}>
                {searchQuery ? "Ничего не найдено" : "База пуста"}
              </Text>
              <Text style={[GLOBAL_STYLES.textMuted, { marginTop: 8 }]}>
                {searchQuery
                  ? "Попробуйте изменить запрос"
                  : "Пользователи бота появятся здесь"}
              </Text>
            </View>
          }
        />
      )}

      {/* 🪟 МОДАЛЬНОЕ ОКНО */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={GLOBAL_STYLES.h2}>Права доступа</Text>
                <Text style={GLOBAL_STYLES.textMuted}>
                  {selectedUser?.first_name} (@{selectedUser?.username})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
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
                  style={[
                    styles.roleOptionBtn,
                    isActive && styles.roleOptionBtnActive,
                  ]}
                >
                  <View
                    style={[
                      styles.roleIconBox,
                      isActive && { backgroundColor: COLORS.primary },
                    ]}
                  >
                    {roleOpt.id === "admin" ? (
                      <Shield
                        size={18}
                        color={isActive ? "#fff" : COLORS.textMuted}
                      />
                    ) : roleOpt.id === "manager" ? (
                      <Briefcase
                        size={18}
                        color={isActive ? "#fff" : COLORS.textMuted}
                      />
                    ) : (
                      <UserIcon
                        size={18}
                        color={isActive ? "#fff" : COLORS.textMuted}
                      />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.roleOptionTitle,
                        isActive && { color: COLORS.primary },
                      ]}
                    >
                      {roleOpt.label}
                    </Text>
                    <Text style={GLOBAL_STYLES.textSmall}>{roleOpt.desc}</Text>
                  </View>

                  {isActive && <CheckCircle color={COLORS.primary} size={20} />}
                </TouchableOpacity>
              );
            })}

            {roleUpdating && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  // Stats Block
  statsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 8,
    minWidth: 40,
  },
  statValue: {
    fontWeight: "700",
    fontSize: 14,
    color: COLORS.textMain,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  // Search
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: "100%",
    color: COLORS.textMain,
    fontSize: 14,
  },
  clearBtn: { padding: 4 },

  // List
  listContent: {
    padding: SIZES.large,
    paddingBottom: 40,
  },
  userCard: {
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarStaff: {
    backgroundColor: COLORS.primary + "10",
    borderColor: COLORS.primary + "30",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  avatarTextStaff: {
    color: COLORS.primary,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    opacity: 0.5,
  },
  editRoleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
  },
  editRoleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
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
    paddingBottom: 40,
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
  roleOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: "transparent",
  },
  roleOptionBtnActive: {
    backgroundColor: COLORS.primary + "08",
    borderColor: COLORS.primary,
  },
  roleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  roleOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
  },

  // States
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
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
    backgroundColor: COLORS.danger + "10",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger + "30",
    marginBottom: 16,
    maxWidth: "80%",
  },
  errorText: {
    color: COLORS.danger,
    textAlign: "center",
  },
  retryBtn: {
    padding: 10,
  },
});
