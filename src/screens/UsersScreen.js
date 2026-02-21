/**
 * @file src/screens/UsersScreen.js
 * @description Экран управления персоналом и доступами (PROADMIN Mobile v11.0.17 Enterprise).
 * Позволяет администратору просматривать базу пользователей из Telegram-бота и менять их роли.
 * ДОБАВЛЕНО: Кнопка перехода на BroadcastScreen, исправление отступов для Android.
 * ДОБАВЛЕНО: SafeAreaView для защиты верстки на современных экранах.
 * ДОБАВЛЕНО: OLED Black & Orange дизайн (замена синих акцентов на оранжевые, строгие рамки).
 * НИКАКИХ УДАЛЕНИЙ: Вся кастомная логика бейджей (isStaff, isOwner) и стейты сохранены на 100%.
 *
 * @module UsersScreen
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
import { SafeAreaView } from "react-native-safe-area-context"; // 🔥 ДОБАВЛЕНО: Защита от челок
import {
  Users,
  Shield,
  Phone,
  User as UserIcon,
  X,
  CheckCircle,
  Radio, // 🔥 Иконка для кнопки рассылки
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeBadge, PeButton } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

const ROLE_OPTIONS = [
  { id: "user", label: "Клиент (user)", desc: "Только создание заявок в боте" },
  {
    id: "manager",
    label: "Мастер (manager)",
    desc: "Доступ к объектам и сметам",
  },
  { id: "admin", label: "Администратор (admin)", desc: "Полный доступ к ERP" },
  { id: "owner", label: "Шеф (owner)", desc: "Абсолютный системный контроль" }, // 🔥 Добавлено для полноты системы
];

export default function UsersScreen({ navigation }) {
  // 🔥 Добавлен пропс navigation
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

      const data = await API.getUsers("", 100, 0); // Берем 100 последних пользователей
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

      // Локально обновляем стейт, чтобы не дергать базу лишний раз
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

  // =============================================================================
  // 🧩 РЕНДЕР КАРТОЧКИ ПОЛЬЗОВАТЕЛЯ (FLATLIST ITEM)
  // =============================================================================
  const renderUserItem = ({ item }) => {
    const isStaff =
      item.role === "admin" || item.role === "owner" || item.role === "manager";
    const isOwner = item.role === "owner";

    return (
      // 🔥 Изменено elevated=false для OLED дизайна (убрали мыльные тени)
      <PeCard elevated={false} style={styles.userCard}>
        <View style={GLOBAL_STYLES.rowBetween}>
          <View style={GLOBAL_STYLES.rowCenter}>
            <View style={[styles.avatar, isStaff && styles.avatarStaff]}>
              {isStaff ? (
                <Shield color={COLORS.primary} size={20} />
              ) : (
                <UserIcon color={COLORS.textMuted} size={20} />
              )}
            </View>
            <View>
              <Text style={GLOBAL_STYLES.h3} numberOfLines={1}>
                {item.first_name || "Без имени"}
              </Text>
              <Text style={GLOBAL_STYLES.textSmall}>
                @{item.username || "нет_username"} • ID: {item.telegram_id}
              </Text>
            </View>
          </View>

          {/* Кастомный бейдж роли (ваша логика сохранена на 100%) */}
          <View style={[styles.roleBadge, isStaff && styles.roleBadgeStaff]}>
            <Text
              style={[
                styles.roleBadgeText,
                isStaff && styles.roleBadgeTextStaff,
              ]}
            >
              {item.role.toUpperCase()}
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
            disabled={isOwner} // Владельца понизить нельзя!
            activeOpacity={0.7}
          >
            <Text style={styles.editRoleText}>Изменить права</Text>
          </TouchableOpacity>
        </View>
      </PeCard>
    );
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    // 🔥 Обернуто в SafeAreaView
    <SafeAreaView style={GLOBAL_STYLES.safeArea} edges={['top']}>
      {/* 🎩 ШАПКА ЭКРАНА С КНОПКОЙ РАССЫЛКИ */}
      <View style={styles.header}>
        <View style={GLOBAL_STYLES.rowCenter}>
          <View style={styles.iconWrapper}>
            <Users color={COLORS.primary} size={24} />
          </View>
          <View>
            <Text style={GLOBAL_STYLES.h1}>Персонал</Text>
            <Text style={GLOBAL_STYLES.textMuted}>База Telegram (v11.0.17)</Text>
          </View>
        </View>

        {/* 🔥 КНОПКА РАССЫЛКИ */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Broadcast")}
          style={styles.broadcastBtn}
          activeOpacity={0.7}
        >
          <Radio color={COLORS.primary} size={28} />
        </TouchableOpacity>
      </View>

      {/* 📜 СПИСОК ПОЛЬЗОВАТЕЛЕЙ */}
      {error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity
            onPress={() => fetchUsers()}
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
          data={users}
          keyExtractor={(item) => item.telegram_id.toString()}
          renderItem={renderUserItem}
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
              <Users color={COLORS.surfaceHover} size={48} />
              <Text
                style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.medium }]}
              >
                База пользователей пуста
              </Text>
            </View>
          }
        />
      )}

      {/* 🪟 МОДАЛЬНОЕ ОКНО СМЕНЫ РОЛИ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={GLOBAL_STYLES.h2}>Уровень доступа</Text>
                <Text style={GLOBAL_STYLES.textMuted}>
                  Для: {selectedUser?.first_name}
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
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
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
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={{ marginTop: SIZES.large }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    backgroundColor: COLORS.background, // 🔥 OLED Black
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  broadcastBtn: {
    padding: 8,
    backgroundColor: "rgba(255, 107, 0, 0.1)", // 🔥 Electric Orange
    borderRadius: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "rgba(255, 107, 0, 0.1)", // 🔥 Electric Orange
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.medium,
  },
  listContent: {
    padding: SIZES.large,
    paddingBottom: Platform.OS === "android" ? 100 : 40, // 🔥 Ваше исправление для Android Navigation Bar
  },

  // Карточка юзера
  userCard: {
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
    borderWidth: 1, // 🔥 Добавлена рамка вместо тени
    borderColor: COLORS.border,
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
    backgroundColor: "rgba(255, 107, 0, 0.1)", // 🔥 Electric Orange
  },
  roleBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: SIZES.radiusSm,
  },
  roleBadgeStaff: {
    backgroundColor: "rgba(255, 107, 0, 0.15)", // 🔥 Electric Orange
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

  // Модалка
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)", // 🔥 Более плотное затемнение OLED
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    padding: SIZES.large,
    paddingBottom: Platform.OS === "ios" ? 40 : SIZES.large,
    borderTopWidth: 1, // 🔥 Рамка модалки для контраста
    borderTopColor: COLORS.border,
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
    backgroundColor: "rgba(255, 107, 0, 0.05)", // 🔥 Оранжевый акцент выделения
    borderColor: COLORS.primary,
  },
  roleOptionTitle: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 4,
  },

  // Состояния
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