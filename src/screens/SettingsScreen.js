/**
 * @file src/screens/SettingsScreen.js
 * @description Экран настроек профиля и приложения (PROADMIN Mobile v10.0.0).
 * Центр управления конфигурацией, безопасностью и сессией пользователя.
 * UPGRADES (Senior):
 * - Расширенный профиль пользователя.
 * - Секционные настройки (Account, App, Support).
 * - Интерактивные переключатели (Toggles).
 * - Блок "О приложении" с версией.
 * - Безопасный выход из системы.
 *
 * @module SettingsScreen
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
} from "react-native";
import {
  User,
  Bell,
  Moon,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  FileText,
  Smartphone,
  Mail,
  Lock,
} from "lucide-react-native";

// Импорт архитектуры
import { useAuth } from "../context/AuthContext";
import { PeCard, PeButton } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, FONTS } from "../theme/theme";

// Константы
const APP_VERSION = "10.0.0 (Build 2026.02.19)";
const SUPPORT_EMAIL = "support@proelectric.com";
const SUPPORT_PHONE = "+7 (777) 123-45-67";

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();

  // Локальные настройки (в будущем можно вынести в Context или AsyncStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  // =============================================================================
  // ⚡️ ОБРАБОТЧИКИ
  // =============================================================================

  const handleLogout = () => {
    Alert.alert(
      "Выход из системы",
      "Вы уверены, что хотите выйти из аккаунта?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              // Навигация в LoginScreen произойдет автоматически через AuthContext
            } catch (e) {
              Alert.alert("Ошибка", "Не удалось завершить сессию");
            }
          },
        },
      ],
    );
  };

  const handleSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() =>
      Alert.alert("Ошибка", "Не удалось открыть почтовый клиент"),
    );
  };

  const handleCallSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {});
  };

  // =============================================================================
  // 🧩 КОМПОНЕНТЫ
  // =============================================================================

  const SettingItem = ({
    icon,
    label,
    value,
    onPress,
    isSwitch,
    switchValue,
    onSwitchChange,
    color,
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={isSwitch ? () => onSwitchChange(!switchValue) : onPress}
      activeOpacity={isSwitch ? 1 : 0.7}
      disabled={isSwitch && Platform.OS === "android"} // На Android свитч сам обрабатывает нажатие
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: (color || COLORS.primary) + "15" },
          ]}
        >
          {React.cloneElement(icon, {
            size: 20,
            color: color || COLORS.primary,
          })}
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>

      <View style={styles.settingRight}>
        {isSwitch ? (
          <Switch
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={"#fff"}
            ios_backgroundColor={COLORS.border}
            onValueChange={onSwitchChange}
            value={switchValue}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        ) : (
          <>
            {value && <Text style={styles.settingValue}>{value}</Text>}
            <ChevronRight size={18} color={COLORS.textMuted} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const SectionTitle = ({ title }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  // =============================================================================
  // 🖥 UI RENDER
  // =============================================================================
  return (
    <SafeAreaView style={GLOBAL_STYLES.safeArea}>
      <View style={styles.header}>
        <Text style={GLOBAL_STYLES.h1}>Настройки</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Карточка Профиля */}
        <PeCard style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.name || "Администратор"}
              </Text>
              <Text style={styles.profileRole}>
                {user?.role === "owner"
                  ? "Владелец"
                  : user?.role === "admin"
                    ? "Администратор"
                    : "Сотрудник"}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email || "admin@proelectric.com"}
              </Text>
            </View>
          </View>
          <PeButton
            title="Редактировать профиль"
            variant="outline"
            size="small"
            style={{ marginTop: 16 }}
            onPress={() =>
              Alert.alert("В разработке", "Функция редактирования профиля")
            }
          />
        </PeCard>

        {/* 2. Настройки Аккаунта */}
        <SectionTitle title="Аккаунт и Безопасность" />
        <View style={styles.sectionContainer}>
          <SettingItem
            icon={<Lock />}
            label="Сменить пароль"
            onPress={() => Alert.alert("Безопасность", "Функция смены пароля")}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Shield />}
            label="Биометрия (FaceID)"
            isSwitch
            switchValue={biometricsEnabled}
            onSwitchChange={setBiometricsEnabled}
          />
        </View>

        {/* 3. Настройки Приложения */}
        <SectionTitle title="Приложение" />
        <View style={styles.sectionContainer}>
          <SettingItem
            icon={<Bell />}
            label="Push-уведомления"
            isSwitch
            switchValue={notificationsEnabled}
            onSwitchChange={setNotificationsEnabled}
            color={COLORS.warning}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Moon />}
            label="Тёмная тема"
            isSwitch
            switchValue={darkModeEnabled}
            onSwitchChange={setDarkModeEnabled}
            color={COLORS.secondary}
          />
        </View>

        {/* 4. Помощь и Инфо */}
        <SectionTitle title="Поддержка" />
        <View style={styles.sectionContainer}>
          <SettingItem
            icon={<HelpCircle />}
            label="Написать в поддержку"
            onPress={handleSupport}
            color={COLORS.success}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Smartphone />}
            label="Позвонить нам"
            value={SUPPORT_PHONE}
            onPress={handleCallSupport}
            color={COLORS.success}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<FileText />}
            label="Политика конфиденциальности"
            onPress={() => Linking.openURL("https://proelectric.com/privacy")}
            color={COLORS.textMuted}
          />
        </View>

        {/* 5. Выход и Версия */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut
              size={20}
              color={COLORS.danger}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.logoutText}>Выйти из аккаунта</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Версия: {APP_VERSION}</Text>
          <Text style={styles.copyrightText}>© 2026 ProElectric Inc.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// 🎨 СТИЛИ
// =============================================================================
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.small,
  },

  // Profile Card
  profileCard: {
    padding: 20,
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    // Легкий градиентный эффект через тень (симуляция)
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    textTransform: "uppercase",
    marginBottom: 4,
    backgroundColor: COLORS.primary + "15",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Sections
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
    marginTop: 8,
  },
  sectionContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.surfaceElevated,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textMain,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 60, // Отступ под иконку
  },

  // Footer
  footer: {
    alignItems: "center",
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: COLORS.danger + "10",
    marginBottom: 24,
  },
  logoutText: {
    color: COLORS.danger,
    fontWeight: "600",
    fontSize: 15,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  copyrightText: {
    color: COLORS.textMuted,
    fontSize: 11,
    opacity: 0.6,
  },
});
