/**
 * @file src/screens/CreateOrderScreen.js
 * @description Экран создания нового объекта/лида (PROADMIN Mobile v13.7.0 Enterprise).
 * Позволяет администратору заводить клиентов в CRM вручную, минуя Telegram-бота.
 * 🔥 ДОБАВЛЕНО (v13.7.0): Универсальный шлюз. Поддержка создания "Мелкого ремонта".
 * 🔥 ДОБАВЛЕНО (v13.7.0): Динамический рендер формы и безопасный Fallback для API мелкого ремонта.
 * ИСПРАВЛЕНО: Добавлен обязательный выбор опции "Умный дом" (из предыдущих версий).
 * ИСПРАВЛЕНО: Убран двойной отступ сверху (черная полоса). SafeAreaView заменен на View.
 * НИКАКИХ УДАЛЕНИЙ: Вся бизнес-логика сложного расчета (BOM) сохранена на 100%. ПОЛНЫЙ КОД.
 *
 * @module CreateOrderScreen
 * @version 13.7.0 (Unified Creation Gateway Edition)
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
  Cpu, 
  CheckCircle,
  Wrench,
  AlignLeft,
  DollarSign
} from "lucide-react-native";

// Импорт нашей архитектуры
import API from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

export default function CreateOrderScreen({ navigation }) {
  // 🔥 Глобальный переключатель типа создаваемого объекта
  const [orderType, setOrderType] = useState("complex"); // 'complex' | 'minor'

  // Общие стейты контактов
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  
  // Стейты для КОМПЛЕКСА (Complex)
  const [area, setArea] = useState("");
  const [rooms, setRooms] = useState("2");
  const [propertyType, setPropertyType] = useState("apartment");
  const [wallType, setWallType] = useState("wall_concrete");
  const [isSmartHome, setIsSmartHome] = useState(false);

  // Стейты для МЕЛКОГО РЕМОНТА (Minor)
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [loading, setLoading] = useState(false);

  // =============================================================================
  // 🚀 ОБРАБОТЧИК СОХРАНЕНИЯ (API) С УМНЫМ РОУТИНГОМ
  // =============================================================================
  const handleCreateOrder = async () => {
    // 1. Валидация общих полей
    if (!clientName.trim() || !clientPhone.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните имя и телефон клиента.");
      return;
    }

    try {
      setLoading(true);

      // 🛑 ВЕТКА 1: СОЗДАНИЕ МЕЛКОГО РЕМОНТА
      if (orderType === "minor") {
        if (!description.trim()) {
          Alert.alert("Ошибка", "Опишите задачу для мелкого ремонта.");
          setLoading(false);
          return;
        }

        const payload = {
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          description: description.trim(),
          price: parseFloat(price) || 0,
        };

        // Бронежилет (Fallback) на случай отсутствия метода в api.js
        if (typeof API.createMinorRepair === 'function') {
          await API.createMinorRepair(payload);
        } else {
          const headers = await API.getHeaders();
          const res = await fetch('https://erp.yeee.kz/api/minor-repairs', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Ошибка при создании вызова");
          }
        }

        Alert.alert("Успех!", "Вызов мелкого ремонта успешно создан и отправлен на биржу.", [
          { text: "Отлично", onPress: () => navigation.goBack() }
        ]);
      } 
      // 🏗 ВЕТКА 2: СОЗДАНИЕ КОМПЛЕКСНОГО ОБЪЕКТА
      else {
        if (!area.trim() || !rooms.trim()) {
          Alert.alert("Ошибка", "Для комплекса необходимо указать площадь и кол-во комнат.");
          setLoading(false);
          return;
        }

        const payload = {
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          area: parseFloat(area),
          rooms: parseInt(rooms, 10),
          wallType,
          propertyType,
          isSmartHome,
        };

        await API.createManualOrder(payload);

        Alert.alert("Успех!", "Объект успешно создан. Смета и BOM сгенерированы автоматически.", [
          { text: "Отлично", onPress: () => navigation.goBack() }
        ]);
      }
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
                <Text style={GLOBAL_STYLES.h2}>Новый клиент</Text>
                <Text style={GLOBAL_STYLES.textSmall}>Ручное добавление в CRM</Text>
              </View>
              <View style={styles.headerIcon}>
                <PlusSquare color={COLORS.primary} size={20} />
              </View>
            </View>

            {/* 🎛 ПЕРЕКЛЮЧАТЕЛЬ ТИПА ЗАКАЗА */}
            <View style={{ paddingHorizontal: SIZES.large, paddingTop: SIZES.medium }}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    orderType === "complex" && styles.typeBtnActive,
                  ]}
                  onPress={() => setOrderType("complex")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeText, orderType === "complex" && styles.typeTextActive]}>
                    Комплекс
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    orderType === "minor" && styles.typeBtnActive,
                  ]}
                  onPress={() => setOrderType("minor")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeText, orderType === "minor" && styles.typeTextActive]}>
                    Мелкий ремонт
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 📜 ФОРМА */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >

              {/* 🎯 БЛОК 1: КОНТАКТЫ (ОБЩИЙ) */}
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
                  style={{ marginBottom: 0 }}
                />
              </PeCard>

              {/* 🎯 БЛОК 2: ДИНАМИЧЕСКИЙ РЕНДЕР ЗАВИСИМО ОТ ТИПА */}
              {orderType === "minor" ? (
                <>
                  {/* ФОРМА ДЛЯ МЕЛКОГО РЕМОНТА */}
                  <Text style={styles.sectionTitle}>2. Детали вызова</Text>
                  <PeCard elevated={false} style={{ marginBottom: SIZES.large }}>
                    <PeInput
                      label="Описание задачи (Что сломалось?)"
                      placeholder="Например: Не работает розетка на кухне, выбивает автомат..."
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      icon={<AlignLeft color={COLORS.textMuted} size={18} />}
                      editable={!loading}
                    />
                    <PeInput
                      label="Договорная цена (₸) - Опционально"
                      placeholder="0 (если не указано — договорная)"
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                      icon={<DollarSign color={COLORS.textMuted} size={18} />}
                      editable={!loading}
                      style={{ marginBottom: 0 }}
                    />
                  </PeCard>
                </>
              ) : (
                <>
                  {/* ФОРМА ДЛЯ КОМПЛЕКСА (ОРИГИНАЛЬНАЯ) */}
                  <Text style={styles.sectionTitle}>2. Инженерные параметры</Text>
                  <PeCard elevated={false} style={{ marginBottom: SIZES.large }}>
                    
                    {/* ВЫБОР ТИПА ОБЪЕКТА */}
                    <Text style={styles.inputLabel}>Тип объекта</Text>
                    <View style={[styles.wallTypeContainer, { marginBottom: SIZES.large }]}>
                      <TouchableOpacity
                        style={[styles.wallBtn, propertyType === "apartment" && styles.wallBtnActive]}
                        onPress={() => setPropertyType("apartment")}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        <Text style={[styles.wallBtnText, propertyType === "apartment" && styles.wallBtnTextActive]}>
                          🏢 Квартира (Стандарт)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.wallBtn, propertyType === "house" && styles.wallBtnActive]}
                        onPress={() => setPropertyType("house")}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        <Text style={[styles.wallBtnText, propertyType === "house" && styles.wallBtnTextActive]}>
                          🏡 Частный дом / Коттедж
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.wallBtn, propertyType === "commercial" && styles.wallBtnActive]}
                        onPress={() => setPropertyType("commercial")}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        <Text style={[styles.wallBtnText, propertyType === "commercial" && styles.wallBtnTextActive]}>
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
                        style={[styles.wallBtn, wallType === "wall_concrete" && styles.wallBtnActive]}
                        onPress={() => setWallType("wall_concrete")}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        <Text style={[styles.wallBtnText, wallType === "wall_concrete" && styles.wallBtnTextActive]}>
                          Бетон / Монолит
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.wallBtn, wallType === "wall_brick" && styles.wallBtnActive]}
                        onPress={() => setWallType("wall_brick")}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        <Text style={[styles.wallBtnText, wallType === "wall_brick" && styles.wallBtnTextActive]}>
                          Кирпич
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.wallBtn, wallType === "wall_gas" && styles.wallBtnActive]}
                        onPress={() => setWallType("wall_gas")}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        <Text style={[styles.wallBtnText, wallType === "wall_gas" && styles.wallBtnTextActive]}>
                          Газоблок / ГКЛ
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* УМНЫЙ ДОМ */}
                    <Text style={styles.inputLabel}>Дополнительные опции</Text>
                    <TouchableOpacity
                      style={[styles.smartHomeBtn, isSmartHome && styles.smartHomeBtnActive]}
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
                        <Text style={[styles.smartHomeText, isSmartHome && styles.smartHomeTextActive]}>
                          Система «Умный дом»
                        </Text>
                      </View>
                      {isSmartHome && (
                        <CheckCircle color={COLORS.primary} size={20} />
                      )}
                    </TouchableOpacity>

                  </PeCard>
                </>
              )}

              {/* 🔘 КНОПКА СОЗДАНИЯ (Динамический текст) */}
              <PeButton
                title={orderType === "minor" ? "Создать вызов на бирже" : "Сгенерировать объект и смету"}
                icon={orderType === "minor" ? <Wrench color={COLORS.textInverse} size={20} /> : <PlusSquare color={COLORS.textInverse} size={20} />}
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
  
  // Переключатель типов
  typeSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: SIZES.medium,
    alignItems: "center",
    borderRadius: SIZES.radiusSm,
  },
  typeBtnActive: {
    backgroundColor: "rgba(255, 107, 0, 0.15)", // Оранжевый OLED
    borderColor: COLORS.primary,
  },
  typeText: {
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    fontSize: SIZES.fontSmall,
  },
  typeTextActive: {
    color: COLORS.primary,
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
    backgroundColor: "rgba(255, 107, 0, 0.15)",
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