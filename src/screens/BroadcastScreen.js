/**
 * @file src/screens/BroadcastScreen.js
 * @description Центр уведомлений и рассылок (PROADMIN Mobile v13.8.0 Enterprise).
 * Интеграция с Telegram-ботом: позволяет админу делать массовые рассылки пользователям по ролям.
 * 🔥 ИСПРАВЛЕНО (v13.8.0): Фатальная ошибка импорта API (import API вместо { API }), вызывавшая краш.
 * 🔥 ДОБАВЛЕНО (v13.8.0): Динамическое превью изображения (Live Image Preview) для проверки битых ссылок перед рассылкой.
 * ИСПРАВЛЕНО: Убран двойной отступ сверху (черная полоса). SafeAreaView заменен на View.
 * ИСПРАВЛЕНО: Жесткий фикс клавиатуры при вводе длинного текста рассылки.
 * ДОБАВЛЕНО: OLED Black & Orange дизайн (строгие рамки, оранжевые акценты).
 * НИКАКИХ УДАЛЕНИЙ: Вся бизнес-логика (API, Confirm Dialog, State) сохранена на 100%. ПОЛНЫЙ КОД.
 *
 * @module BroadcastScreen
 * @version 13.8.0 (Live Preview & Safe Import Edition)
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
  Image, // 🔥 Добавлено для превью картинки
} from "react-native";
import {
  Radio,
  Send,
  Users,
  ShieldAlert,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react-native";

// 🔥 ИСПРАВЛЕНО: Правильный дефолтный импорт нашего нового API
import API from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

// Конфиг аудиторий
const TARGET_OPTIONS = [
  {
    id: "all",
    label: "Всем (Общая)",
    icon: <Radio color={COLORS.textMuted} size={16} />,
  },
  {
    id: "user",
    label: "Только Клиентам",
    icon: <Users color={COLORS.textMuted} size={16} />,
  },
  {
    id: "manager",
    label: "Персоналу (Мастера)",
    icon: <ShieldAlert color={COLORS.textMuted} size={16} />,
  },
];

export default function BroadcastScreen({ navigation }) {
  // Стейты формы
  const [targetRole, setTargetRole] = useState("all");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // =============================================================================
  // 🚀 ОБРАБОТЧИК ОТПРАВКИ РАССЫЛКИ
  // =============================================================================
  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      Alert.alert("Ошибка", "Текст рассылки не может быть пустым");
      return;
    }

    // 🔥 Улучшенный Confirm Dialog (показывает наличие картинки)
    Alert.alert(
      "Подтверждение",
      `Вы уверены, что хотите запустить рассылку?\n\n👥 Аудитория: ${TARGET_OPTIONS.find((t) => t.id === targetRole).label}\n🖼 Картинка: ${imageUrl.trim() ? 'Прикреплена' : 'Нет'}`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Запустить",
          style: "destructive",
          onPress: executeBroadcast,
        },
      ],
    );
  };

  const executeBroadcast = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const res = await API.sendBroadcast(
        message,
        imageUrl.trim() || null,
        targetRole,
      );

      // Бэкенд возвращает success и message с количеством получателей
      Alert.alert(
        "Рассылка запущена",
        res.message || "Сообщения отправляются в фоновом режиме.",
        [{ text: "Отлично", onPress: () => navigation.goBack() }] // Автоматический возврат после успеха
      );

      // Очищаем форму после успешной отправки
      setMessage("");
      setImageUrl("");
    } catch (err) {
      Alert.alert(
        "Ошибка рассылки",
        err.message || "Проверьте соединение с сервером",
      );
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    <View style={GLOBAL_STYLES.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>

            {/* 🎩 ШАПКА ЭКРАНА (OLED Header) */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                disabled={loading}
                activeOpacity={0.7}
              >
                <ArrowLeft color={COLORS.textMain} size={24} />
              </TouchableOpacity>

              <View style={GLOBAL_STYLES.rowCenter}>
                <View style={styles.headerIcon}>
                  <Radio color={COLORS.primary} size={24} />
                </View>
                <View>
                  <Text style={GLOBAL_STYLES.h2}>Уведомления</Text>
                  <Text style={GLOBAL_STYLES.textMuted}>
                    Telegram-рассылка
                  </Text>
                </View>
              </View>
            </View>

            {/* 📜 ОСНОВНОЙ КОНТЕНТ */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <PeCard elevated={false} style={styles.cardContainer}>
                {/* 1. Выбор аудитории */}
                <Text style={styles.sectionTitle}>1. Выберите аудиторию</Text>
                <View style={styles.targetContainer}>
                  {TARGET_OPTIONS.map((opt) => {
                    const isActive = targetRole === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        activeOpacity={0.7}
                        onPress={() => setTargetRole(opt.id)}
                        style={[
                          styles.targetBtn,
                          isActive && styles.targetBtnActive,
                        ]}
                      >
                        {React.cloneElement(opt.icon, {
                          color: isActive ? COLORS.primary : COLORS.textMuted,
                        })}
                        <Text
                          style={[
                            styles.targetBtnText,
                            isActive && styles.targetBtnTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 2. URL Картинки (Опционально) */}
                <Text style={[styles.sectionTitle, { marginTop: SIZES.medium }]}>
                  2. Изображение (URL, опционально)
                </Text>
                <PeInput
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="https://example.com/image.jpg"
                  autoCapitalize="none"
                  autoCorrect={false}
                  icon={<ImageIcon color={COLORS.textMuted} size={18} />}
                  editable={!loading}
                  style={imageUrl.trim() ? { marginBottom: SIZES.base } : {}}
                />

                {/* 🔥 LIVE ПРЕВЬЮ ИЗОБРАЖЕНИЯ */}
                {imageUrl.trim().length > 5 && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>Предпросмотр (если ссылка валидна):</Text>
                    <Image 
                      source={{ uri: imageUrl.trim() }} 
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                {/* 3. Текст рассылки */}
                <Text style={[styles.sectionTitle, { marginTop: SIZES.medium }]}>
                  3. Текст сообщения (поддерживает HTML)
                </Text>
                <View style={styles.textAreaContainer}>
                  <PeInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Введите текст рассылки. Например: <b>Внимание!</b> Скидки 20% на монтаж..."
                    multiline={true}
                    numberOfLines={8}
                    style={styles.textArea}
                    textAlignVertical="top"
                    editable={!loading}
                  />
                </View>

                {/* Инфо-блок */}
                <View style={styles.infoBox}>
                  <Text style={GLOBAL_STYLES.textSmall}>
                    Рассылка осуществляется через официального бота ProElectric.
                    Доставка занимает время в зависимости от размера базы.
                  </Text>
                </View>

                {/* Кнопка запуска */}
                <PeButton
                  title="Запустить рассылку"
                  variant="primary"
                  icon={<Send color="#000" size={18} />}
                  onPress={handleSendBroadcast}
                  loading={loading}
                  style={[styles.glowButton, { marginTop: SIZES.large }]}
                />
              </PeCard>

              {/* Отступ для комфортного скролла над клавиатурой */}
              <View style={{ height: 150 }} />
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background, // 🔥 Строгий черный OLED фон
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  backBtn: {
    marginRight: SIZES.medium,
    padding: SIZES.base,
    marginLeft: -SIZES.base,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "rgba(255, 107, 0, 0.1)", // 🔥 Фирменный оранжевый акцент
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.medium,
  },
  scrollContent: {
    padding: SIZES.large,
  },
  cardContainer: {
    padding: SIZES.large,
    borderWidth: 1, // 🔥 Строгая рамка вместо тени
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: SIZES.fontBase,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: SIZES.small,
    textTransform: "uppercase",
  },

  // Селектор аудитории
  targetContainer: {
    gap: SIZES.small,
    marginBottom: SIZES.small,
  },
  targetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  targetBtnActive: {
    backgroundColor: "rgba(255, 107, 0, 0.05)", // 🔥 Оранжевый акцент выделения
    borderColor: COLORS.primary,
  },
  targetBtnText: {
    fontSize: SIZES.fontBase,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginLeft: SIZES.small,
  },
  targetBtnTextActive: {
    color: COLORS.primary,
  },

  // Превью изображения
  previewContainer: {
    marginBottom: SIZES.medium,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    padding: SIZES.small,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: SIZES.small,
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: SIZES.radiusSm,
    backgroundColor: '#1a1a1a', // Заглушка, пока грузится
  },

  // Текстовая область
  textAreaContainer: {
    minHeight: 150,
  },
  textArea: {
    minHeight: 150,
    paddingTop: Platform.OS === "ios" ? SIZES.small : 12,
  },

  // Инфо-блок
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: SIZES.medium,
    borderRadius: SIZES.radiusSm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    marginTop: SIZES.small,
  },

  glowButton: {
    ...SHADOWS.glow,
  },
});