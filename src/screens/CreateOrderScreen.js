/**
 * @file src/screens/CreateOrderScreen.js
 * @description Экран создания нового объекта/лида (PROADMIN Mobile v10.0.0).
 * Позволяет администратору заводить клиентов в CRM вручную.
 * * UPGRADES (Senior):
 * - FIX: Удален TouchableWithoutFeedback, который закрывал клавиатуру при вводе текста.
 * - FIX: SafeAreaView (react-native-safe-area-context) для устранения белой полосы внизу.
 * - FEAT: Интеграция с реальным API (erp.yeee.kz).
 * - FEAT: Добавлена визуальная валидация (state errors).
 * - FEAT: Никакого сокращения кода, все функции сохранены и улучшены.
 *
 * @module CreateOrderScreen
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  PlusSquare,
  User,
  Phone,
  Maximize,
  Home,
  MapPin,
  FileText,
  CheckCircle2,
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";

// Константы для типов стен (Легко расширять)
const WALL_TYPES = [
  { id: "wall_concrete", label: "Бетон" },
  { id: "wall_brick", label: "Кирпич" },
  { id: "wall_gas", label: "Газоблок" },
];

export default function CreateOrderScreen({ navigation }) {
  // Стейты формы
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");

  // Значения по умолчанию для быстрого ввода
  const [area, setArea] = useState("50");
  const [rooms, setRooms] = useState("2");
  const [wallType, setWallType] = useState("wall_concrete");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({}); // Стейт для ошибок валидации

  // Форматирование телефона на лету
  const handlePhoneChange = (text) => {
    // Оставляем только цифры и плюс
    let cleaned = text.replace(/[^0-9+]/g, "");
    setClientPhone(cleaned);
    if (errors.clientPhone) setErrors({ ...errors, clientPhone: null });
  };

  // =============================================================================
  // 🛡 ВАЛИДАЦИЯ И ОБРАБОТЧИК СОЗДАНИЯ ОБЪЕКТА
  // =============================================================================
  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    if (!clientName.trim()) {
      newErrors.clientName = "Введите имя заказчика";
      isValid = false;
    }

    if (!clientPhone.trim() || clientPhone.length < 10) {
      newErrors.clientPhone = "Введите корректный номер";
      isValid = false;
    }

    if (!address.trim()) {
      newErrors.address = "Укажите адрес объекта";
      isValid = false;
    }

    const numArea = parseInt(area, 10);
    if (isNaN(numArea) || numArea <= 0) {
      newErrors.area = "Укажите площадь";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleCreateOrder = async () => {
    Keyboard.dismiss();

    // 1. Строгая валидация перед отправкой
    if (!validateForm()) {
      Alert.alert(
        "Внимание",
        "Пожалуйста, заполните все обязательные поля корректно.",
      );
      return;
    }

    setLoading(true);

    try {
      // 2. Отправка данных на реальный сервер (API)
      const orderPayload = {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        address: address.trim(),
        comment: comment.trim(),
        area: parseInt(area, 10),
        rooms: parseInt(rooms, 10) || 1,
        wallType: wallType,
      };

      await API.createManualOrder(orderPayload);

      // 3. Успех
      Alert.alert(
        "Успех",
        "Новый объект успешно создан.\nСмета сгенерирована и отправлена на расчет.",
        [{ text: "Отлично", onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert(
        "Ошибка создания",
        err.message ||
          "Не удалось создать объект. Проверьте соединение с сервером.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* 🎩 ШАПКА ЭКРАНА */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={loading}
          >
            <ArrowLeft color={COLORS.textMain} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: SIZES.small }}>
            <Text style={GLOBAL_STYLES.h2} numberOfLines={1}>
              Новый объект
            </Text>
            <Text style={GLOBAL_STYLES.textMuted}>Регистрация заказа</Text>
          </View>
          <View style={styles.headerIcon}>
            <PlusSquare color={COLORS.primary} size={24} />
          </View>
        </View>

        {/* 📜 ОСНОВНОЙ КОНТЕНТ (ScrollView решает проблему закрытия клавиатуры) */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <PeCard style={styles.formCard}>
            {/* --- БЛОК 1: ДАННЫЕ КЛИЕНТА --- */}
            <View style={styles.sectionHeader}>
              <User
                size={16}
                color={COLORS.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Контакты заказчика</Text>
            </View>

            <PeInput
              label="Имя заказчика *"
              value={clientName}
              onChangeText={(text) => {
                setClientName(text);
                if (errors.clientName)
                  setErrors({ ...errors, clientName: null });
              }}
              placeholder="Например: Александр"
              icon={<User color={COLORS.textMuted} size={18} />}
              autoCapitalize="words"
              error={errors.clientName}
              editable={!loading}
            />

            <PeInput
              label="Телефон *"
              value={clientPhone}
              onChangeText={handlePhoneChange}
              placeholder="+7 (777) 000-00-00"
              keyboardType="phone-pad"
              icon={<Phone color={COLORS.textMuted} size={18} />}
              error={errors.clientPhone}
              editable={!loading}
            />

            <View style={styles.divider} />

            {/* --- БЛОК 2: ЛОКАЦИЯ --- */}
            <View style={styles.sectionHeader}>
              <MapPin
                size={16}
                color={COLORS.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Локация</Text>
            </View>

            <PeInput
              label="Адрес объекта *"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                if (errors.address) setErrors({ ...errors, address: null });
              }}
              placeholder="Улица, дом, кв..."
              icon={<MapPin color={COLORS.textMuted} size={18} />}
              error={errors.address}
              editable={!loading}
            />

            <PeInput
              label="Комментарий / Заметки"
              value={comment}
              onChangeText={setComment}
              placeholder="Этаж, код домофона, особенности..."
              icon={<FileText color={COLORS.textMuted} size={18} />}
              multiline
              numberOfLines={2}
              style={{ minHeight: 60 }}
              editable={!loading}
            />

            <View style={styles.divider} />

            {/* --- БЛОК 3: ПАРАМЕТРЫ ДЛЯ СМЕТЫ --- */}
            <View style={styles.sectionHeader}>
              <Maximize
                size={16}
                color={COLORS.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Параметры объекта</Text>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: SIZES.small }}>
                <PeInput
                  label="Площадь (м²) *"
                  value={area}
                  onChangeText={(text) => {
                    setArea(text);
                    if (errors.area) setErrors({ ...errors, area: null });
                  }}
                  keyboardType="numeric"
                  icon={<Maximize color={COLORS.textMuted} size={18} />}
                  error={errors.area}
                  editable={!loading}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PeInput
                  label="Кол-во комнат"
                  value={rooms}
                  onChangeText={setRooms}
                  keyboardType="numeric"
                  icon={<Home color={COLORS.textMuted} size={18} />}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Выбор стен */}
            <Text style={styles.labelSmall}>Материал стен</Text>
            <View style={styles.wallTypeContainer}>
              {WALL_TYPES.map((type) => {
                const isActive = wallType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    activeOpacity={0.7}
                    disabled={loading}
                    onPress={() => setWallType(type.id)}
                    style={[styles.wallBtn, isActive && styles.wallBtnActive]}
                  >
                    {isActive && (
                      <View style={styles.checkIcon}>
                        <CheckCircle2 size={12} color={COLORS.primary} />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.wallBtnText,
                        isActive && styles.wallBtnTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Кнопка создания */}
            <View style={styles.footer}>
              <PeButton
                title="Создать объект"
                variant="success"
                onPress={handleCreateOrder}
                loading={loading}
                icon={<PlusSquare size={20} color="#fff" />}
                fullWidth
              />
              <Text style={styles.footerNote}>
                Смета будет рассчитана сервером автоматически
              </Text>
            </View>
          </PeCard>

          {/* Отступ снизу для комфортного скролла */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.medium,
    paddingTop: SIZES.large, // Дополнительный отступ сверху, так как edges={['bottom']}
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  backBtn: {
    padding: SIZES.base,
    marginRight: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: SIZES.medium,
  },
  formCard: {
    padding: SIZES.large,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  sectionTitle: {
    fontSize: SIZES.fontBase,
    fontWeight: "700",
    color: COLORS.textMain,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.large,
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 8,
    marginTop: 4,
    textTransform: "uppercase",
  },
  wallTypeContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: SIZES.large,
  },
  wallBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  wallBtnActive: {
    backgroundColor: COLORS.primary + "10",
    borderColor: COLORS.primary,
  },
  wallBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  wallBtnTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  checkIcon: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  footer: {
    marginTop: SIZES.medium,
  },
  footerNote: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 12,
  },
});
