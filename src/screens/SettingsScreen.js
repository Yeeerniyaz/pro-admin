/**
 * @file src/screens/SettingsScreen.js
 * @description Экран управления прайс-листом и системными настройками (PROADMIN Mobile v11.0.0).
 * Позволяет администратору динамически менять цены на услуги с массовым сохранением.
 * ДОБАВЛЕНО: Глубокие тени (elevated), плавающая шапка, светящаяся кнопка сохранения (Glow FAB).
 *
 * @module SettingsScreen
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Save, Sliders, AlertCircle } from "lucide-react-native";

// Импорт нашей архитектуры
import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

export default function SettingsScreen() {
  // Состояния
  const [pricelist, setPricelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // =============================================================================
  // 📡 ЗАГРУЗКА ПРАЙС-ЛИСТА
  // =============================================================================
  const fetchSettings = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      const data = await API.getPricelist();
      // data ожидается в формате: [{ category: 'Штробление', items: [{ key, name, unit, currentPrice }] }]
      setPricelist(data || []);
    } catch (err) {
      setError(err.message || "Ошибка загрузки прайс-листа");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSettings(true);
  }, []);

  // =============================================================================
  // ✍️ ЛОКАЛЬНОЕ ОБНОВЛЕНИЕ ЦЕНЫ В STATE
  // =============================================================================
  const handlePriceChange = (categoryIndex, itemIndex, newPriceStr) => {
    // Копируем стейт для иммутабельности (Deep State Update)
    const updatedPricelist = [...pricelist];
    updatedPricelist[categoryIndex].items[itemIndex].currentPrice = newPriceStr;
    setPricelist(updatedPricelist);
  };

  // =============================================================================
  // 💾 СОХРАНЕНИЕ НА СЕРВЕР (BULK UPDATE)
  // =============================================================================
  const handleSaveSettings = async () => {
    setSaving(true);

    // Формируем плоский массив [{ key, value }] для нашего API
    const payload = [];
    pricelist.forEach((section) => {
      section.items.forEach((item) => {
        if (item.key) {
          payload.push({
            key: item.key,
            value: parseFloat(item.currentPrice) || 0,
          });
        }
      });
    });

    if (payload.length === 0) {
      Alert.alert("Внимание", "Нет данных для сохранения");
      setSaving(false);
      return;
    }

    try {
      await API.updateBulkSettings(payload);
      Alert.alert(
        "Успех",
        "Системный прайс-лист успешно обновлен. Новые сметы будут использовать эти цены.",
      );
    } catch (err) {
      Alert.alert("Ошибка", err.message || "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
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
      {/* 🎩 ШАПКА ЭКРАНА (Floating Header) */}
      <View style={styles.header}>
        <View style={GLOBAL_STYLES.rowCenter}>
          <View style={styles.iconWrapper}>
            <Sliders color={COLORS.primary} size={24} />
          </View>
          <View>
            <Text style={GLOBAL_STYLES.h1}>Прайс-лист</Text>
            <Text style={GLOBAL_STYLES.textMuted}>
              Глобальные расценки системы
            </Text>
          </View>
        </View>
      </View>

      {/* 📜 ОСНОВНОЙ КОНТЕНТ */}
      {error ? (
        <View style={styles.centerContainer}>
          <PeCard style={styles.errorCard}>
            <AlertCircle
              color={COLORS.danger}
              size={32}
              style={{ marginBottom: SIZES.small }}
            />
            <Text style={styles.errorText}>{error}</Text>
            <PeButton
              title="Повторить попытку"
              variant="secondary"
              onPress={() => fetchSettings()}
              style={{ marginTop: SIZES.medium }}
            />
          </PeCard>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[GLOBAL_STYLES.textMuted, { marginTop: SIZES.medium }]}>
            Синхронизация тарифов...
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
          >
            {pricelist.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={GLOBAL_STYLES.textMuted}>
                  Прайс-лист пуст или не настроен на сервере.
                </Text>
              </View>
            ) : (
              pricelist.map((section, catIdx) => (
                <View key={`cat-${catIdx}`} style={styles.categoryBlock}>
                  {/* Заголовок категории */}
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{section.category}</Text>
                  </View>

                  {/* Карточка с инпутами для этой категории (elevated v11.0) */}
                  <PeCard elevated={true} style={styles.itemsCard}>
                    {section.items.map((item, itemIdx) => (
                      <View key={`item-${item.key}`} style={styles.itemRow}>
                        {/* Название и единица измерения */}
                        <View style={styles.itemInfo}>
                          <Text style={GLOBAL_STYLES.textBody}>
                            {item.name}
                          </Text>
                          <Text style={GLOBAL_STYLES.textSmall}>
                            за {item.unit}
                          </Text>
                        </View>

                        {/* Поле ввода цены */}
                        <View style={styles.inputWrapper}>
                          <PeInput
                            value={String(item.currentPrice)}
                            onChangeText={(val) =>
                              handlePriceChange(catIdx, itemIdx, val)
                            }
                            keyboardType="numeric"
                            style={{ marginBottom: 0 }}
                            placeholder="0"
                          />
                        </View>
                      </View>
                    ))}
                  </PeCard>
                </View>
              ))
            )}

            {/* Отступ под плавающую кнопку (чтобы контент не перекрывался) */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* 💾 ПЛАВАЮЩАЯ КНОПКА СОХРАНЕНИЯ (FLOATING ACTION BUTTON) */}
          {pricelist.length > 0 && (
            <View style={styles.fabContainer}>
              <PeButton
                title="Сохранить прайс-лист"
                icon={<Save color="#fff" size={20} />}
                onPress={handleSaveSettings}
                loading={saving}
                variant="success"
                style={styles.fabGlow}
              />
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ ЭКРАНА
// =============================================================================
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.light,
    zIndex: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.medium,
  },
  scrollContent: {
    padding: SIZES.large,
  },

  // Категории и элементы
  categoryBlock: {
    marginBottom: SIZES.large,
  },
  categoryHeader: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: SIZES.small,
    marginBottom: SIZES.small,
  },
  categoryTitle: {
    fontSize: SIZES.fontTitle,
    fontWeight: "700",
    color: COLORS.textMain,
  },
  itemsCard: {
    padding: SIZES.small,
    paddingHorizontal: SIZES.medium,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.small,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  itemInfo: {
    flex: 1,
    paddingRight: SIZES.medium,
  },
  inputWrapper: {
    width: 110, // Фиксированная ширина для полей ввода цен
  },

  // Плавающая кнопка (FAB)
  fabContainer: {
    position: "absolute",
    bottom: SIZES.large,
    left: SIZES.large,
    right: SIZES.large,
  },
  fabGlow: {
    ...SHADOWS.glow, // Подключаем неоновое свечение для кнопки сохранения
    shadowColor: COLORS.success,
  },

  // Состояния
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.large,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  errorCard: {
    alignItems: "center",
    padding: SIZES.xlarge,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.fontBase,
    textAlign: "center",
    fontWeight: "500",
  },
});
