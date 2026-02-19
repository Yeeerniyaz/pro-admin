/**
 * @file src/screens/CreateOrderScreen.js
 * @description Экран создания нового объекта/лида (PROADMIN Mobile v10.0.0).
 * Позволяет администратору заводить клиентов в CRM вручную.
 * * UPGRADES (Senior):
 * - Добавлено поле Адреса (критично для логистики).
 * - Добавлено поле Комментария.
 * - Улучшена валидация и форматирование.
 * - Оптимизирован рендеринг селекторов.
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
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import {
  ArrowLeft,
  PlusSquare,
  User,
  Phone,
  Maximize,
  Home,
  MapPin, // New
  FileText, // New
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
  const [address, setAddress] = useState(""); // New: Адрес
  const [comment, setComment] = useState(""); // New: Комментарий

  // Значения по умолчанию для быстрого ввода
  const [area, setArea] = useState("50");
  const [rooms, setRooms] = useState("2");
  const [wallType, setWallType] = useState("wall_concrete");

  const [loading, setLoading] = useState(false);

  // Форматирование телефона на лету
  const handlePhoneChange = (text) => {
    // Оставляем только цифры и плюс
    let cleaned = text.replace(/[^0-9+]/g, "");
    setClientPhone(cleaned);
  };

  // =============================================================================
  // 🚀 ОБРАБОТЧИК СОЗДАНИЯ ОБЪЕКТА
  // =============================================================================
  const handleCreateOrder = async () => {
    // 1. Валидация (Строгая)
    if (!clientName.trim()) {
      Alert.alert("Ошибка", "Введите имя заказчика");
      return;
    }
    if (!clientPhone.trim() || clientPhone.length < 10) {
      Alert.alert("Ошибка", "Введите корректный номер телефона");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Ошибка", "Адрес объекта обязателен"); // New Check
      return;
    }

    const numArea = parseInt(area, 10);
    if (isNaN(numArea) || numArea <= 0) {
      Alert.alert("Ошибка", "Введите корректную площадь объекта");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      // 2. Отправка данных на сервер
      // Передаем расширенный набор данных
      const orderPayload = {
        clientName,
        clientPhone,
        address, // New
        comment, // New
        area: numArea,
        rooms: parseInt(rooms, 10) || 1,
        wallType,
        source: "manual_app", // Метка источника
        createdAt: new Date().toISOString(),
      };

      await API.createManualOrder(orderPayload);

      // 3. Успех
      Alert.alert(
        "Успех",
        "Новый объект успешно создан.\nСмета сгенерирована и отправлена на расчет.",
        [{ text: "К списку заказов", onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert(
        "Ошибка создания",
        err.message || "Не удалось создать объект. Проверьте соединение.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    <KeyboardAvoidingView
      style={GLOBAL_STYLES.safeArea}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} // Твики для клавиатуры
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* 🎩 ШАПКА ЭКРАНА */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

          {/* 📜 ОСНОВНОЙ КОНТЕНТ */}
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
                onChangeText={setClientName}
                placeholder="Иван Иванов"
                icon={<User color={COLORS.textMuted} size={18} />}
                autoCapitalize="words"
              />

              <PeInput
                label="Телефон *"
                value={clientPhone}
                onChangeText={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                keyboardType="phone-pad"
                icon={<Phone color={COLORS.textMuted} size={18} />}
              />

              <View style={styles.divider} />

              {/* --- БЛОК 2: ЛОКАЦИЯ (New) --- */}
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
                onChangeText={setAddress}
                placeholder="Улица, дом, кв..."
                icon={<MapPin color={COLORS.textMuted} size={18} />}
                multiline={false} // Адрес обычно одной строкой, но длинной
              />

              <PeInput
                label="Комментарий / Заметки"
                value={comment}
                onChangeText={setComment}
                placeholder="Этаж, код, особенности..."
                icon={<FileText color={COLORS.textMuted} size={18} />}
                multiline
                numberOfLines={2}
                style={{ minHeight: 60 }} // Чуть выше поле для заметок
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
                    onChangeText={setArea}
                    keyboardType="numeric"
                    icon={<Maximize color={COLORS.textMuted} size={18} />}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PeInput
                    label="Кол-во комнат"
                    value={rooms}
                    onChangeText={setRooms}
                    keyboardType="numeric"
                    icon={<Home color={COLORS.textMuted} size={18} />}
                  />
                </View>
              </View>

              {/* Выбор стен (Оптимизировано через map) */}
              <Text style={styles.labelSmall}>Материал стен</Text>
              <View style={styles.wallTypeContainer}>
                {WALL_TYPES.map((type) => {
                  const isActive = wallType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      activeOpacity={0.7}
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
                  Смета будет рассчитана автоматически
                </Text>
              </View>
            </PeCard>

            {/* Отступ снизу для скролла */}
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.medium,
    paddingTop: SIZES.medium,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 2, // Небольшая тень для отделения шапки
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
    borderRadius: 12, // Чуть мягче углы
    backgroundColor: COLORS.primary + "15", // Прозрачный primary
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
  // Wall Type Selector
  labelSmall: {
    fontSize: 12,
    fontFamily: "Inter-Medium", // Если есть шрифт
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
  // Footer
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
