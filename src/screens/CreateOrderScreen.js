/**
 * @file src/screens/CreateOrderScreen.js
 * @description Экран создания нового объекта/лида (PROADMIN Mobile v12.6.1 Enterprise).
 * Позволяет администратору заводить клиентов в CRM вручную, минуя Telegram-бота.
 * При сохранении бэкенд автоматически генерирует смету (BOM) на основе площади, типа стен и тарифа.
 * 🔥 ИСПРАВЛЕНО (v12.6.1): Добавлен обязательный выбор опции "Умный дом".
 * 🔥 ИСПРАВЛЕНО: Убран двойной отступ сверху (черная полоса). SafeAreaView заменен на View.
 * ДОБАВЛЕНО: Поддержка Гибридного калькулятора — выбор типа объекта (Квартира/Дом/Коммерция).
 * НИКАКИХ УДАЛЕНИЙ: Вся бизнес-логика и форма сохранены на 100%. ПОЛНЫЙ КОД.
 *
 * @module CreateOrderScreen
 * @version 12.6.1 (Smart Home Toggle Edition)
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
  Cpu, // Иконка для Умного дома
  CheckCircle
} from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

export default function CreateOrderScreen({ navigation }) {
  // Стейты формы
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [area, setArea] = useState("");
  const [rooms, setRooms] = useState("2");
  
  // Новые параметры для Гибридного калькулятора v12
  const [propertyType, setPropertyType] = useState("apartment");
  const [wallType, setWallType] = useState("wall_concrete");
  const [isSmartHome, setIsSmartHome] = useState(false); // 🔥 Добавлено: Состояние Умного дома

  const [loading, setLoading] = useState(false);

  // =============================================================================
  // 🚀 ОБРАБОТЧИК СОХРАНЕНИЯ (API)
  // =============================================================================
  const handleCreateOrder = async () => {
    // Валидация
    if (!clientName.trim() || !clientPhone.trim() || !area.trim() || !rooms.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все обязательные поля.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        area: parseFloat(area),
        rooms: parseInt(rooms, 10),
        wallType,
        propertyType,
        isSmartHome, // 🔥 Передаем флаг Умного дома на бэкенд
      };

      await API.createManualOrder(payload);

      Alert.alert("Успех!", "Объект успешно создан. Смета и BOM сгенерированы автоматически.", [
        { text: "Отлично", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Ошибка при создании", error.message || "Не удалось создать заказ.");
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР
  // =============================================================================
  return (
    // 🔥 ИСПРАВЛЕНИЕ: Используем стандартный View вместо SafeAreaView для избежания двойных отступов
    <View style={GLOBAL_STYLES.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>

            {/* 🎩 ПЛАВАЮЩАЯ ШАПКА */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <ArrowLeft color={COLORS.textMain} size={24} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={GLOBAL_STYLES.h2}>Новый объект</Text>
                <Text style={GLOBAL_STYLES.textSmall}>Оффлайн клиент</Text>
              </View>
              <View style={styles.headerIcon}>
                <PlusSquare color={COLORS.primary} size={20} />
              </View>
            </View>

            {/* 📜 ФОРМА */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >

              {/* 🎯 БЛОК 1: КОНТАКТЫ */}
              <Text style={styles.sectionTitle}>1. Данные клиента</Text>
              <PeCard elevated={false} style={{ marginBottom: SIZES.large }}>
                <PeInput
                  label="Имя заказчика"
                  placeholder="Иван Иванов"
                  value={clientName}
                  onChangeText={setClientName}
                  icon={<User color={COLORS.textMuted} size={18} />}
                  editable={!loading}
                />
                <PeInput
                  label="Телефон"
                  placeholder="+7 (777) 000-00-00"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  keyboardType="phone-pad"
                  icon={<Phone color={COLORS.textMuted} size={18} />}
                  editable={!loading}
                  style={{ marginBottom: 0 }} // Убираем отступ у последнего инпута
                />
              </PeCard>

              {/* 🎯 БЛОК 2: ПАРАМЕТРЫ ОБЪЕКТА */}
              <Text style={styles.sectionTitle}>2. Инженерные параметры</Text>
              <PeCard elevated={false} style={{ marginBottom: SIZES.large }}>
                
                {/* 🔥 ВЫБОР ТИПА ОБЪЕКТА (ДЛЯ ТАРИФА) */}
                <Text style={styles.inputLabel}>Тип объекта</Text>
                <View style={[styles.wallTypeContainer, { marginBottom: SIZES.large }]}>
                  <TouchableOpacity
                    style={[
                      styles.wallBtn,
                      propertyType === "apartment" && styles.wallBtnActive,
                    ]}
                    onPress={() => setPropertyType("apartment")}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.wallBtnText,
                        propertyType === "apartment" && styles.wallBtnTextActive,
                      ]}
                    >
                      🏢 Квартира (Стандарт)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.wallBtn,
                      propertyType === "house" && styles.wallBtnActive,
                    ]}
                    onPress={() => setPropertyType("house")}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.wallBtnText,
                        propertyType === "house" && styles.wallBtnTextActive,
                      ]}
                    >
                      🏡 Частный дом / Коттедж
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.wallBtn,
                      propertyType === "commercial" && styles.wallBtnActive,
                    ]}
                    onPress={() => setPropertyType("commercial")}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.wallBtnText,
                        propertyType === "commercial" && styles.wallBtnTextActive,
                      ]}
                    >
                      🏬 Коммерческое помещение
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ПЛОЩАДЬ И КОМНАТЫ */}
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: SIZES.small }}>
                    <PeInput
                      label="Площадь (м²)"
                      placeholder="50"
                      value={area}
                      onChangeText={setArea}
                      keyboardType="numeric"
                      icon={<Maximize color={COLORS.textMuted} size={18} />}
                      editable={!loading}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: SIZES.small }}>
                    <PeInput
                      label="Комнаты"
                      placeholder="2"
                      value={rooms}
                      onChangeText={setRooms}
                      keyboardType="numeric"
                      icon={<Home color={COLORS.textMuted} size={18} />}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* ТИП СТЕН */}
                <Text style={styles.inputLabel}>Тип стен (для штробления)</Text>
                <View style={[styles.wallTypeContainer, { marginBottom: SIZES.large }]}>
                  <TouchableOpacity
                    style={[
                      styles.wallBtn,
                      wallType === "wall_concrete" && styles.wallBtnActive,
                    ]}
                    onPress={() => setWallType("wall_concrete")}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.wallBtnText,
                        wallType === "wall_concrete" && styles.wallBtnTextActive,
                      ]}
                    >
                      Бетон / Монолит
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.wallBtn,
                      wallType === "wall_brick" && styles.wallBtnActive,
                    ]}
                    onPress={() => setWallType("wall_brick")}
                    activeOpacity={0.7}
                    disabled={loading}
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
                    style={[
                      styles.wallBtn,
                      wallType === "wall_gas" && styles.wallBtnActive,
                    ]}
                    onPress={() => setWallType("wall_gas")}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.wallBtnText,
                        wallType === "wall_gas" && styles.wallBtnTextActive,
                      ]}
                    >
                      Газоблок / ГКЛ
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 🔥 УМНЫЙ ДОМ (НОВОЕ) */}
                <Text style={styles.inputLabel}>Дополнительные опции</Text>
                <TouchableOpacity
                  style={[
                    styles.smartHomeBtn,
                    isSmartHome && styles.smartHomeBtnActive,
                  ]}
                  onPress={() => setIsSmartHome(!isSmartHome)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <View style={GLOBAL_STYLES.rowCenter}>
                    <Cpu 
                      color={isSmartHome ? COLORS.primary : COLORS.textMuted} 
                      size={20} 
                      style={{ marginRight: 12 }} 
                    />
                    <Text
                      style={[
                        styles.smartHomeText,
                        isSmartHome && styles.smartHomeTextActive,
                      ]}
                    >
                      Система «Умный дом»
                    </Text>
                  </View>
                  {isSmartHome && (
                    <CheckCircle color={COLORS.primary} size={20} />
                  )}
                </TouchableOpacity>

              </PeCard>

              {/* 🔘 КНОПКА СОЗДАНИЯ */}
              <PeButton
                title="Сгенерировать объект и смету"
                icon={<PlusSquare color={COLORS.textInverse} size={20} />}
                onPress={handleCreateOrder}
                loading={loading}
                style={{ marginTop: SIZES.medium, marginBottom: 40 }}
              />

            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

// =============================================================================
// 🎨 СТИЛИ
// =============================================================================
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  backBtn: {
    padding: SIZES.base,
    marginLeft: -SIZES.base,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: SIZES.small,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radiusSm,
    backgroundColor: "rgba(255, 107, 0, 0.1)", // Оранжевый фон
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputLabel: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textMuted,
    marginBottom: SIZES.base,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  wallTypeContainer: {
    flexDirection: "column",
    gap: SIZES.small,
  },
  wallBtn: {
    paddingVertical: 12,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  wallBtnActive: {
    backgroundColor: "rgba(255, 107, 0, 0.15)", // Оранжевый OLED
    borderColor: COLORS.primary,
  },
  wallBtnText: {
    color: COLORS.textMuted,
    fontSize: SIZES.fontBase,
    fontWeight: "600",
  },
  wallBtnTextActive: {
    color: COLORS.primary,
  },
  
  // 🔥 Стили для кнопки Умного дома
  smartHomeBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.medium,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
  },
  smartHomeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 107, 0, 0.1)",
  },
  smartHomeText: {
    fontSize: SIZES.fontBase,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  smartHomeTextActive: {
    color: COLORS.textMain,
  }
});