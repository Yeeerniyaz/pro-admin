/**
 * @file src/screens/CreateOrderScreen.js
 * @description Экран создания нового объекта/лида (PROADMIN Mobile v10.0.0).
 * Позволяет администратору заводить клиентов в CRM вручную, минуя Telegram-бота.
 * При сохранении бэкенд автоматически генерирует смету (BOM) на основе площади и типа стен.
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
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";

export default function CreateOrderScreen({ navigation }) {
  // Стейты формы
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [area, setArea] = useState("50");
  const [rooms, setRooms] = useState("2");
  const [wallType, setWallType] = useState("wall_concrete");

  const [loading, setLoading] = useState(false);

  // =============================================================================
  // 🚀 ОБРАБОТЧИК СОЗДАНИЯ ОБЪЕКТА
  // =============================================================================
  const handleCreateOrder = async () => {
    // 1. Валидация
    if (!clientName.trim() || !clientPhone.trim()) {
      Alert.alert(
        "Ошибка",
        "Имя и телефон заказчика обязательны для заполнения",
      );
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
      // 2. Отправка данных на боевой сервер (erp.yeee.kz)
      await API.createManualOrder({
        clientName,
        clientPhone,
        area: numArea,
        rooms: parseInt(rooms, 10) || 1,
        wallType,
      });

      // 3. Успех
      Alert.alert(
        "Успех",
        "Новый объект успешно создан и добавлен в реестр. Смета сгенерирована.",
        [{ text: "Отлично", onPress: () => navigation.goBack() }], // Возвращаемся назад
      );
    } catch (err) {
      Alert.alert(
        "Ошибка создания",
        err.message || "Не удалось создать объект",
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
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* 🎩 ШАПКА ЭКРАНА */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft color={COLORS.textMain} size={24} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: SIZES.small }}>
              <Text style={GLOBAL_STYLES.h2} numberOfLines={1}>
                Новый объект
              </Text>
              <Text style={GLOBAL_STYLES.textMuted}>Ручное создание лида</Text>
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
            <PeCard style={{ padding: SIZES.large }}>
              {/* --- БЛОК 1: ДАННЫЕ КЛИЕНТА --- */}
              <Text style={styles.sectionTitle}>Контакты заказчика</Text>

              <PeInput
                label="Имя заказчика"
                value={clientName}
                onChangeText={setClientName}
                placeholder="Например: Александр"
                icon={<User color={COLORS.textMuted} size={18} />}
              />

              <PeInput
                label="Телефон"
                value={clientPhone}
                onChangeText={setClientPhone}
                placeholder="+7 (777) 000-00-00"
                keyboardType="phone-pad"
                icon={<Phone color={COLORS.textMuted} size={18} />}
              />

              <View style={styles.divider} />

              {/* --- БЛОК 2: ПАРАМЕТРЫ ОБЪЕКТА --- */}
              <Text style={styles.sectionTitle}>Параметры для сметы</Text>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: SIZES.small }}>
                  <PeInput
                    label="Площадь (м²)"
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

              {/* --- БЛОК 3: МАТЕРИАЛ СТЕН --- */}
              <Text
                style={[
                  GLOBAL_STYLES.textSmall,
                  {
                    color: COLORS.textMuted,
                    marginBottom: SIZES.base,
                    textTransform: "uppercase",
                  },
                ]}
              >
                Материал стен
              </Text>
              <View style={styles.wallTypeContainer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setWallType("wall_concrete")}
                  style={[
                    styles.wallBtn,
                    wallType === "wall_concrete" && styles.wallBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.wallBtnText,
                      wallType === "wall_concrete" && styles.wallBtnTextActive,
                    ]}
                  >
                    Бетон
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setWallType("wall_brick")}
                  style={[
                    styles.wallBtn,
                    wallType === "wall_brick" && styles.wallBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.wallBtnText,
                      wallType === "wall_brick" && styles.wallBtnTextActive,
                    ]}
                  >
                    Кирпич
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setWallType("wall_gas")}
                  style={[
                    styles.wallBtn,
                    wallType === "wall_gas" && styles.wallBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.wallBtnText,
                      wallType === "wall_gas" && styles.wallBtnTextActive,
                    ]}
                  >
                    Газоблок
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Кнопка создания */}
              <PeButton
                title="Сгенерировать и создать"
                variant="success"
                onPress={handleCreateOrder}
                loading={loading}
                style={{ marginTop: SIZES.large }}
              />
            </PeCard>

            <View style={{ height: 40 }} />
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
  },
  backBtn: {
    padding: SIZES.base,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radiusSm,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.fontBase,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: SIZES.medium,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.large,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Кнопки выбора стен
  wallTypeContainer: {
    flexDirection: "row",
    gap: SIZES.small,
    marginBottom: SIZES.large,
  },
  wallBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: "transparent",
  },
  wallBtnActive: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: COLORS.primary,
  },
  wallBtnText: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  wallBtnTextActive: {
    color: COLORS.primary,
  },
});
