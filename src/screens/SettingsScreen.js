/**
 * @file src/screens/SettingsScreen.js
 * @description Экран управления прайс-листом и системными настройками (PROADMIN Mobile v12.2.1 Enterprise).
 * 🔥 ИСПРАВЛЕНО (v12.2.1): Убрано дублирование отступа SafeAreaView (черная полоса сверху).
 * 🔥 ДОБАВЛЕНО: Полная поддержка Гибридного Калькулятора (Управление тарифами за кв.м. и коэффициентами).
 * 🔥 ДОБАВЛЕНО: Управление Глобальными Скидками и Режимом калькулятора прямо с телефона.
 * ИСПРАВЛЕНО: Жесткий фикс клавиатуры (behavior="padding") для Android.
 * НИКАКИХ УДАЛЕНИЙ: Вся бизнес-логика сохранена на 100%. ПОЛНЫЙ КОД.
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
  TouchableOpacity,
} from "react-native";
import { Save, Sliders, AlertCircle, TrendingDown, Layers, Settings } from "lucide-react-native";

import { API } from "../api/api";
import { PeCard, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES, SHADOWS } from "../theme/theme";

export default function SettingsScreen() {
  // Состояния
  const [pricelist, setPricelist] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [coefficients, setCoefficients] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({
    global_discount_active: 'false',
    global_discount_percent: '10',
    calculator_mode: 'sq_meter'
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // =============================================================================
  // 📡 ЗАГРУЗКА ДАННЫХ ИЗ БЭКЕНДА
  // =============================================================================
  const fetchSettings = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh) setLoading(true);

      // Запрашиваем параллельно и прайс, и настройки
      const [priceData, settingsData] = await Promise.all([
        API.getPricelist(),
        API.getSettings()
      ]);

      setPricelist(priceData || []);

      const rawSettings = settingsData.settings || {};
      const calcData = settingsData.calcData || { tariffs: [], coefficients: [] };

      setGlobalSettings({
        global_discount_active: rawSettings.global_discount_active || 'false',
        global_discount_percent: rawSettings.global_discount_percent || '10',
        calculator_mode: rawSettings.calculator_mode || 'sq_meter'
      });

      // Фильтруем дубликаты (Анти-Дубликатор)
      const uniqueTariffs = Object.values((calcData.tariffs || []).reduce((acc, t) => {
        acc[t.property_type] = t; return acc;
      }, {}));
      
      const uniqueCoeffs = Object.values((calcData.coefficients || []).reduce((acc, c) => {
        acc[c.code] = c; return acc;
      }, {}));

      setTariffs(uniqueTariffs);
      setCoefficients(uniqueCoeffs);

    } catch (err) {
      setError(err.message || "Ошибка загрузки настроек");
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
  // ✍️ ЛОКАЛЬНОЕ ОБНОВЛЕНИЕ STATE
  // =============================================================================
  const handlePriceChange = (categoryIndex, itemIndex, newPriceStr) => {
    const updatedPricelist = [...pricelist];
    updatedPricelist[categoryIndex].items[itemIndex].currentPrice = newPriceStr;
    setPricelist(updatedPricelist);
  };

  const handleTariffChange = (index, val) => {
    const updated = [...tariffs];
    updated[index].base_price_sqm = val;
    setTariffs(updated);
  };

  const handleCoeffChange = (index, val) => {
    const updated = [...coefficients];
    updated[index].multiplier = val;
    setCoefficients(updated);
  };

  const handleGlobalChange = (key, val) => {
    setGlobalSettings(prev => ({ ...prev, [key]: val }));
  };

  // =============================================================================
  // 💾 СОХРАНЕНИЕ НА СЕРВЕР (ORCHESTRATOR)
  // =============================================================================
  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      // 1. Сохраняем общие настройки (скидки, режим) + точный прайс
      const payload = [
        { key: 'global_discount_active', value: globalSettings.global_discount_active },
        { key: 'global_discount_percent', value: parseFloat(globalSettings.global_discount_percent) || 0 },
        { key: 'calculator_mode', value: globalSettings.calculator_mode }
      ];

      pricelist.forEach((section) => {
        section.items.forEach((item) => {
          // Игнорируем ключи, которые уже обработали
          if (item.key && item.key !== 'calculator_mode' && item.key !== 'global_discount_active' && item.key !== 'global_discount_percent') {
            payload.push({
              key: item.key,
              value: parseFloat(item.currentPrice) || 0,
            });
          }
        });
      });

      await API.updateBulkSettings(payload);

      // 2. Сохраняем Тарифы
      for (const t of tariffs) {
        await API.updateTariffs(t.property_type, parseFloat(t.base_price_sqm));
      }

      // 3. Сохраняем Коэффициенты
      for (const c of coefficients) {
        await API.updateCoefficients(c.code, parseFloat(c.multiplier));
      }

      Alert.alert(
        "Успех",
        "Настройки, тарифы и прайс-лист успешно обновлены на сервере.",
      );
      fetchSettings(true); // Перезагружаем для надежности
    } catch (err) {
      Alert.alert("Ошибка сохранения", err.message || "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  // =============================================================================
  // 🖥 UI COMPONENTS (ПОДКОМПОНЕНТЫ)
  // =============================================================================
  
  // Кастомный переключатель (Segmented Control)
  const SegmentedControl = ({ options, selectedValue, onSelect }) => (
    <View style={styles.segmentedContainer}>
      {options.map((opt) => {
        const isActive = selectedValue === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segmentButton, isActive && styles.segmentActive]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // =============================================================================
  // 🖥 ГЛАВНЫЙ РЕНДЕР ЭКРАНА
  // =============================================================================
  return (
    // 🔥 ИСПРАВЛЕНИЕ: Используем стандартный View вместо SafeAreaView для избежания двойных отступов
    <View style={GLOBAL_STYLES.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* 🎩 ШАПКА ЭКРАНА */}
        <View style={styles.header}>
          <View style={GLOBAL_STYLES.rowCenter}>
            <View style={styles.iconWrapper}>
              <Sliders color={COLORS.primary} size={24} />
            </View>
            <View>
              <Text style={GLOBAL_STYLES.h1}>Конфигурация</Text>
              <Text style={GLOBAL_STYLES.textMuted}>
                Глобальные расценки системы
              </Text>
            </View>
          </View>
        </View>

        {/* 📜 ОСНОВНОЙ КОНТЕНТ */}
        {error ? (
          <View style={styles.centerContainer}>
            <PeCard elevated={false} style={styles.errorCard}>
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
              Загрузка конфигурации из БД...
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={COLORS.primary}
                />
              }
            >
              
              {/* 🎁 БЛОК 1: ГЛОБАЛЬНЫЕ СКИДКИ */}
              <View style={styles.categoryBlock}>
                <View style={styles.categoryHeader}>
                  <TrendingDown color={COLORS.primary} size={18} style={{marginRight: 6}}/>
                  <Text style={styles.categoryTitle}>Скидки и Режим</Text>
                </View>
                <PeCard elevated={false} style={styles.itemsCard}>
                  <View style={styles.itemRowCol}>
                    <Text style={GLOBAL_STYLES.textBody}>Режим калькулятора</Text>
                    <SegmentedControl 
                      options={[
                        { label: 'Квадратура', value: 'sq_meter' },
                        { label: 'Точный', value: 'price_list' }
                      ]}
                      selectedValue={globalSettings.calculator_mode}
                      onSelect={(val) => handleGlobalChange('calculator_mode', val)}
                    />
                  </View>
                  <View style={styles.itemRowCol}>
                    <Text style={GLOBAL_STYLES.textBody}>Статус скидки</Text>
                    <SegmentedControl 
                      options={[
                        { label: 'ВКЛЮЧЕНА', value: 'true' },
                        { label: 'ВЫКЛЮЧЕНА', value: 'false' }
                      ]}
                      selectedValue={globalSettings.global_discount_active}
                      onSelect={(val) => handleGlobalChange('global_discount_active', val)}
                    />
                  </View>
                  {globalSettings.global_discount_active === 'true' && (
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={GLOBAL_STYLES.textBody}>Процент скидки</Text>
                        <Text style={GLOBAL_STYLES.textSmall}>в %</Text>
                      </View>
                      <View style={styles.inputWrapper}>
                        <PeInput
                          value={String(globalSettings.global_discount_percent)}
                          onChangeText={(val) => handleGlobalChange('global_discount_percent', val)}
                          keyboardType="numeric"
                          style={{ marginBottom: 0 }}
                          placeholder="0"
                        />
                      </View>
                    </View>
                  )}
                </PeCard>
              </View>

              {/* 🏢 БЛОК 2: ТАРИФЫ ЗА МЕТР */}
              <View style={styles.categoryBlock}>
                <View style={styles.categoryHeader}>
                  <Layers color={COLORS.primary} size={18} style={{marginRight: 6}}/>
                  <Text style={styles.categoryTitle}>Базовые тарифы (за 1 м²)</Text>
                </View>
                <PeCard elevated={false} style={styles.itemsCard}>
                  {tariffs.length === 0 ? (
                    <Text style={GLOBAL_STYLES.textMuted}>Тарифы не найдены в БД</Text>
                  ) : (
                    tariffs.map((t, idx) => (
                      <View key={`tariff-${t.id || idx}`} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={GLOBAL_STYLES.textBody}>{t.name}</Text>
                          <Text style={GLOBAL_STYLES.textSmall}>₸ / м²</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                          <PeInput
                            value={String(t.base_price_sqm)}
                            onChangeText={(val) => handleTariffChange(idx, val)}
                            keyboardType="numeric"
                            style={{ marginBottom: 0 }}
                            placeholder="0"
                          />
                        </View>
                      </View>
                    ))
                  )}
                </PeCard>
              </View>

              {/* 📈 БЛОК 3: КОЭФФИЦИЕНТЫ */}
              <View style={styles.categoryBlock}>
                <View style={styles.categoryHeader}>
                  <Settings color={COLORS.primary} size={18} style={{marginRight: 6}}/>
                  <Text style={styles.categoryTitle}>Коэффициенты</Text>
                </View>
                <PeCard elevated={false} style={styles.itemsCard}>
                  {coefficients.length === 0 ? (
                    <Text style={GLOBAL_STYLES.textMuted}>Коэффициенты не найдены</Text>
                  ) : (
                    coefficients.map((c, idx) => (
                      <View key={`coeff-${c.id || idx}`} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={GLOBAL_STYLES.textBody}>{c.name}</Text>
                          <Text style={GLOBAL_STYLES.textSmall}>{c.code}</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                          <PeInput
                            value={String(c.multiplier)}
                            onChangeText={(val) => handleCoeffChange(idx, val)}
                            keyboardType="numeric"
                            style={{ marginBottom: 0 }}
                            placeholder="0.00"
                          />
                        </View>
                      </View>
                    ))
                  )}
                </PeCard>
              </View>

              {/* 📋 БЛОК 4: ДЕТАЛЬНЫЙ ПРАЙС-ЛИСТ */}
              {pricelist.map((section, catIdx) => {
                // Исключаем системные настройки из списка (так как мы вынесли их наверх)
                if (section.category.includes("Настройки алгоритма")) return null;

                return (
                  <View key={`cat-${catIdx}`} style={styles.categoryBlock}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryTitle}>{section.category}</Text>
                    </View>
                    <PeCard elevated={false} style={styles.itemsCard}>
                      {section.items.map((item, itemIdx) => (
                        <View key={`item-${item.key}`} style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <Text style={GLOBAL_STYLES.textBody}>{item.name}</Text>
                            <Text style={GLOBAL_STYLES.textSmall}>за {item.unit}</Text>
                          </View>
                          <View style={styles.inputWrapper}>
                            <PeInput
                              value={String(item.currentPrice)}
                              onChangeText={(val) => handlePriceChange(catIdx, itemIdx, val)}
                              keyboardType="numeric"
                              style={{ marginBottom: 0 }}
                              placeholder="0"
                            />
                          </View>
                        </View>
                      ))}
                    </PeCard>
                  </View>
                );
              })}

            </ScrollView>

            {/* 💾 ПЛАВАЮЩАЯ КНОПКА СОХРАНЕНИЯ */}
            <View style={styles.fabContainer}>
              <PeButton
                title="Сохранить настройки"
                icon={<Save color="#000" size={20} />}
                onPress={handleSaveSettings}
                loading={saving}
                variant="success"
                style={styles.fabGlow}
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
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
    backgroundColor: COLORS.background, // Строгий OLED черный фон
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "rgba(255, 107, 0, 0.1)", // Фирменный оранжевый акцент
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
    flexDirection: 'row',
    alignItems: 'center',
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
  itemRowCol: {
    flexDirection: "column",
    paddingVertical: SIZES.small,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 8,
  },
  itemInfo: {
    flex: 1,
    paddingRight: SIZES.medium,
  },
  inputWrapper: {
    width: 110, // Фиксированная ширина для полей ввода цен
  },

  // Segmented Control (переключатели)
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: SIZES.radiusSm - 2,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#000',
  },

  // Плавающая кнопка (FAB)
  fabContainer: {
    position: "absolute",
    bottom: SIZES.large,
    left: SIZES.large,
    right: SIZES.large,
  },
  fabGlow: {
    ...SHADOWS.glow,
    shadowColor: COLORS.success,
  },

  // Состояния
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.large,
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