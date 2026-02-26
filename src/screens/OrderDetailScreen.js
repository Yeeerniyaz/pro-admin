/**
 * @file src/screens/OrderDetailScreen.js
 * @description Детальный экран заказа (PROADMIN Mobile v12.12.0 Enterprise).
 * Обеспечивает полное управление объектом: статусы, BOM, чеки, финансы.
 * 🔥 ДОБАВЛЕНО (v12.12.0): Adaptive UI. Экран теперь динамически подстраивается под тип заказа:
 * 1. Комплексный монтаж (type: 'complex' или undefined) - Оригинальный интерфейс 100%.
 * 2. Мелкий ремонт (type: 'minor') - Скрыт BOM, добавлено описание задачи, 0% комиссии.
 * 3. Запросы связи (type: 'call') - Упрощенный интерфейс для менеджеров.
 * НИКАКИХ УДАЛЕНИЙ. ВЕСЬ ОРИГИНАЛЬНЫЙ КОД СОХРАНЕН.
 *
 * @module OrderDetailScreen
 * @version 12.12.0 (Adaptive Multi-Type Edition)
 */

import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Linking
} from "react-native";
import {
  ArrowLeft,
  Settings,
  ShoppingBag,
  DollarSign,
  User,
  MapPin,
  FileText,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Phone,
  HardHat,
  Cpu,
  Wrench // Иконка для мелкого ремонта
} from "lucide-react-native";

import { API } from "../api/api";
import { PeCard, PeBadge, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";
import { AuthContext } from "../context/AuthContext";

const formatKZT = (num) => {
  return (parseFloat(num) || 0).toLocaleString("ru-RU") + " ₸";
};

// =============================================================================
// КОМПОНЕНТ ЭКРАНА
// =============================================================================
export default function OrderDetailScreen({ route, navigation }) {
  const { order: initialOrder } = route.params;
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  // State
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);

  // Финансовый State
  const [finalPrice, setFinalPrice] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Материалы");
  const [expenseComment, setExpenseComment] = useState("");
  const [modalExpenseVisible, setModalExpenseVisible] = useState(false);

  // Метаданные State
  const [address, setAddress] = useState("");
  const [adminComment, setAdminComment] = useState("");

  // BOM State
  const [bomList, setBomList] = useState([]);
  const [isBomEdited, setIsBomEdited] = useState(false);

  // Type Detection (Для адаптивного UI)
  const isMinor = order.type === 'minor';
  const isCall = order.type === 'call' || order.type === 'call_me';
  const isComplex = !isMinor && !isCall; // Стандартный монтаж

  // =============================================================================
  // ИНИЦИАЛИЗАЦИЯ
  // =============================================================================
  useEffect(() => {
    loadOrderDetails();
  }, []);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await API.getOrderById(order.id);
      setOrder(data);
      
      const details = data.details || {};
      const financials = details.financials || {};
      
      setFinalPrice(financials.final_price?.toString() || data.total_price?.toString() || "0");
      setAddress(details.address || "");
      setAdminComment(details.admin_comment || "");
      
      if (details.bom && Array.isArray(details.bom)) {
        setBomList(JSON.parse(JSON.stringify(details.bom)));
      } else {
        setBomList([]);
      }
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setLoading(false);
    }
  };

  const isOrderClosed = order.status === "done" || order.status === "archived";

  // =============================================================================
  // ДЕЙСТВИЯ (БИЗНЕС-ЛОГИКА)
  // =============================================================================

  // 🔥 УНИВЕРСАЛЬНЫЙ МЕТОД ВЗЯТИЯ ЗАКАЗА
  const handleTakeOrder = async () => {
    try {
      setLoading(true);
      if (isMinor) {
        await API.takeMinorRepair(order.id);
      } else {
        await API.takeOrder(order.id);
      }
      Alert.alert("Успех", "Объект успешно взят в работу!");
      loadOrderDetails();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      setLoading(true);
      if (isMinor) {
        await API.updateMinorRepairStatus(order.id, newStatus);
      } else if (isCall) {
         await API.updateCallRequestStatus(order.id, newStatus);
      } else {
        await API.updateOrderStatus(order.id, newStatus);
      }
      Alert.alert("Успех", "Статус обновлен");
      loadOrderDetails();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  const handleUpdateMetadata = async () => {
    try {
      setLoading(true);
      await API.updateOrderMetadata(order.id, address, adminComment);
      Alert.alert("Успех", "Данные сохранены");
      loadOrderDetails();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    try {
      setLoading(true);
      await API.updateOrderPrice(order.id, finalPrice);
      Alert.alert("Успех", "Цена зафиксирована");
      loadOrderDetails();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseAmount || isNaN(expenseAmount) || Number(expenseAmount) <= 0) {
      Alert.alert("Ошибка", "Введите корректную сумму");
      return;
    }
    try {
      setLoading(true);
      await API.addOrderExpense(order.id, expenseAmount, expenseCategory, expenseComment);
      setModalExpenseVisible(false);
      setExpenseAmount("");
      setExpenseComment("");
      Alert.alert("Успех", "Расход добавлен");
      loadOrderDetails();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    Alert.alert(
      "Завершение объекта",
      isMinor 
        ? "Завершить вызов? Вся сумма будет добавлена к вашему заработку без комиссии." 
        : "Вы уверены? Будет произведен расчет долей и начислен долг на бригаду.",
      [
        { text: "Отмена", style: "cancel" },
        { 
          text: "Да, завершить", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await API.finalizeOrder(order.id);
              Alert.alert("Успех", isMinor ? "Вызов завершен!" : `Заработано: ${formatKZT(res.distribution?.brigadeShare)}`);
              loadOrderDetails();
            } catch (e) {
              Alert.alert("Ошибка", e.message);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleMakeCall = () => {
    if (order.client_phone || order.phone) {
      Linking.openURL(`tel:${order.client_phone || order.phone}`);
    } else {
      Alert.alert("Ошибка", "Телефон клиента не указан");
    }
  };

  // =============================================================================
  // ЛОГИКА BOM (ТОЛЬКО ДЛЯ КОМПЛЕКСНОГО МОНТАЖА)
  // =============================================================================
  const updateBOMItem = (index, field, value) => {
    const newList = [...bomList];
    newList[index][field] = field === 'qty' ? parseFloat(value) || 0 : value;
    setBomList(newList);
    setIsBomEdited(true);
  };

  const removeBOMItem = (index) => {
    const newList = [...bomList];
    newList.splice(index, 1);
    setBomList(newList);
    setIsBomEdited(true);
  };

  const addBOMItem = () => {
    setBomList([...bomList, { name: "", qty: 1, unit: "шт" }]);
    setIsBomEdited(true);
  };

  const saveBOMList = async () => {
    try {
      setLoading(true);
      await API.updateOrderBOM(order.id, bomList);
      setIsBomEdited(false);
      Alert.alert("Успех", "Спецификация сохранена");
      loadOrderDetails();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
      setLoading(false);
    }
  };

  // =============================================================================
  // ДАННЫЕ ДЛЯ РЕНДЕРА
  // =============================================================================
  const details = order.details || {};
  const params = details.params || {};
  const financials = details.financials || {
    final_price: order.total_price || order.price || 0,
    total_expenses: 0,
    net_profit: order.total_price || order.price || 0,
    expenses: []
  };

  const isSmartHome = params.isSmartHome === true;
  const area = order.area || params.area || 0;
  
  // =============================================================================
  // РЕНДЕР
  // =============================================================================
  if (loading && !order.id) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, GLOBAL_STYLES.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={GLOBAL_STYLES.safeArea}>
      {/* 🎩 ШАПКА */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.textMain} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Объект #{order.id}</Text>
          <PeBadge status={order.status} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* АЛЕРТ: ЗАКАЗ ЗАКРЫТ */}
        {isOrderClosed && (
          <View style={styles.closedAlert}>
            <Text style={styles.closedAlertText}>Заказ завершен. Редактирование заблокировано.</Text>
          </View>
        )}

        {/* ⚠️ КНОПКА "ЗАБРАТЬ" (Если заказ новый на бирже) */}
        {(!isAdmin && order.status === 'new') && (
           <TouchableOpacity style={styles.takeBtn} onPress={handleTakeOrder} disabled={loading}>
             <Text style={styles.takeBtnText}>ЗАБРАТЬ ОБЪЕКТ В РАБОТУ</Text>
           </TouchableOpacity>
        )}

        {/* 👤 КЛИЕНТ */}
        <PeCard elevated={false} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <User color={COLORS.primary} size={20} />
            <Text style={styles.sectionTitle}>Заказчик</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={GLOBAL_STYLES.textMuted}>Имя:</Text>
            <Text style={GLOBAL_STYLES.textBody}>{order.client_name || order.first_name || "Неизвестно"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={GLOBAL_STYLES.textMuted}>Телефон:</Text>
            <TouchableOpacity onPress={handleMakeCall} style={GLOBAL_STYLES.rowCenter}>
              <Text style={[GLOBAL_STYLES.textBody, { color: COLORS.primary, fontWeight: '600', marginRight: 8 }]}>
                {order.client_phone || order.phone || "—"}
              </Text>
              <Phone color={COLORS.primary} size={16} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={GLOBAL_STYLES.textMuted}>Username:</Text>
            <Text style={GLOBAL_STYLES.textBody}>@{order.username || "—"}</Text>
          </View>
        </PeCard>

        {/* 🔥 АДАПТИВНЫЙ БЛОК: ТЕХНИЧЕСКИЕ ДАННЫЕ */}
        <PeCard elevated={false} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            {isMinor ? <Wrench color={COLORS.primary} size={20} /> : <Settings color={COLORS.primary} size={20} />}
            <Text style={styles.sectionTitle}>{isMinor ? "Детали вызова" : "Технические данные"}</Text>
          </View>

          {isMinor && (
            <View style={styles.minorDescBox}>
              <Text style={styles.minorDescText}>{order.description || details.client_comment || "Описание отсутствует"}</Text>
            </View>
          )}

          {isComplex && (
            <>
              <View style={styles.infoRow}>
                <Text style={GLOBAL_STYLES.textMuted}>Площадь:</Text>
                <Text style={styles.monoText}>{area} м²</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={GLOBAL_STYLES.textMuted}>Комнат:</Text>
                <Text style={styles.monoText}>{params.rooms || 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={GLOBAL_STYLES.textMuted}>Стены:</Text>
                <Text style={GLOBAL_STYLES.textBody}>{params.wallType || "—"}</Text>
              </View>
              {isSmartHome && (
                <View style={[GLOBAL_STYLES.rowCenter, { marginTop: 12, padding: 12, backgroundColor: 'rgba(255,107,0,0.1)', borderRadius: 8 }]}>
                  <Cpu color={COLORS.primary} size={20} style={{ marginRight: 8 }} />
                  <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Интеграция Умного Дома</Text>
                </View>
              )}
            </>
          )}
        </PeCard>

        {/* 📋 УПРАВЛЕНИЕ МЕТАДАННЫМИ И СТАТУСОМ (ДЛЯ ВСЕХ, КРОМЕ ЗВОНКОВ) */}
        {!isCall && (
          <PeCard elevated={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MapPin color={COLORS.primary} size={20} />
              <Text style={styles.sectionTitle}>Координаты и Статус</Text>
            </View>
            
            <PeInput 
              label="Точный адрес объекта" 
              placeholder="г. Алматы, ул..." 
              value={address} 
              onChangeText={setAddress}
              editable={!isOrderClosed}
            />
            <PeInput 
              label="Заметка (Только для бригады)" 
              placeholder="..." 
              value={adminComment} 
              onChangeText={setAdminComment}
              editable={!isOrderClosed}
              multiline
            />
            
            {!isOrderClosed && (
              <TouchableOpacity style={styles.outlineBtn} onPress={handleUpdateMetadata} disabled={loading}>
                <Save color={COLORS.textMain} size={18} />
                <Text style={styles.outlineBtnText}>Сохранить данные</Text>
              </TouchableOpacity>
            )}

            <Text style={[GLOBAL_STYLES.textMuted, { marginTop: 16, marginBottom: 8 }]}>Смена статуса:</Text>
            <View style={styles.statusGrid}>
              <TouchableOpacity 
                style={[styles.statusBtn, order.status === 'processing' && styles.statusBtnActive]}
                onPress={() => handleChangeStatus('processing')} disabled={isOrderClosed || loading}>
                <Text style={[styles.statusBtnText, order.status === 'processing' && styles.statusBtnTextActive]}>В замере</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusBtn, order.status === 'work' && styles.statusBtnActive]}
                onPress={() => handleChangeStatus('work')} disabled={isOrderClosed || loading}>
                <Text style={[styles.statusBtnText, order.status === 'work' && styles.statusBtnTextActive]}>В работе</Text>
              </TouchableOpacity>
            </View>
          </PeCard>
        )}

        {/* 💵 ФИНАНСЫ (ДЛЯ КОМПЛЕКСА И МЕЛКОГО РЕМОНТА) */}
        {!isCall && (
          <PeCard elevated={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <DollarSign color={COLORS.success} size={20} />
              <Text style={styles.sectionTitle}>Юнит-экономика</Text>
            </View>
            
            {isComplex && (
              <View style={styles.infoRow}>
                <Text style={GLOBAL_STYLES.textMuted}>Расчетная база (Система):</Text>
                <Text style={GLOBAL_STYLES.textBody}>{formatKZT(details.total?.grand || order.total_price)}</Text>
              </View>
            )}
            
            <View style={{ marginVertical: 12 }}>
              <PeInput 
                label="Окончательная цена для клиента (₸)" 
                placeholder="0" 
                value={finalPrice} 
                onChangeText={setFinalPrice}
                keyboardType="numeric"
                editable={!isOrderClosed}
                style={{ marginBottom: 8 }}
              />
              {!isOrderClosed && (
                <TouchableOpacity style={styles.outlineBtn} onPress={handleUpdatePrice} disabled={loading}>
                  <CheckCircle color={COLORS.textMain} size={18} />
                  <Text style={styles.outlineBtnText}>Зафиксировать цену</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={GLOBAL_STYLES.textMuted}>Затраты на материалы (Чеки):</Text>
              <Text style={[styles.monoText, { color: COLORS.danger }]}>-{formatKZT(financials.total_expenses)}</Text>
            </View>
            
            <View style={styles.profitBox}>
              <Text style={{ color: COLORS.success, fontWeight: '600' }}>{isMinor ? 'ВАШ ЧИСТЫЙ ЗАРАБОТОК:' : 'ЧИСТАЯ ПРИБЫЛЬ:'}</Text>
              <Text style={[GLOBAL_STYLES.h2, { color: COLORS.success }]}>{formatKZT(financials.net_profit)}</Text>
            </View>

            {!isOrderClosed && (
               <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]} onPress={() => setModalExpenseVisible(true)}>
                 <Plus color={COLORS.danger} size={18} />
                 <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Добавить Расход (Чек)</Text>
               </TouchableOpacity>
            )}

            {/* Список чеков */}
            {financials.expenses && financials.expenses.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[GLOBAL_STYLES.textMuted, { marginBottom: 8 }]}>История расходов:</Text>
                {financials.expenses.map((exp, idx) => (
                  <View key={idx} style={styles.expenseItem}>
                    <View>
                      <Text style={{ color: COLORS.textMain, fontWeight: '500' }}>{exp.category}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{exp.comment || 'Без описания'}</Text>
                    </View>
                    <Text style={{ color: COLORS.danger, fontWeight: '600' }}>-{formatKZT(exp.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </PeCard>
        )}

        {/* 🛍 BOM СПЕЦИФИКАЦИЯ (ТОЛЬКО ДЛЯ КОМПЛЕКСНОГО МОНТАЖА) */}
        {isComplex && (
          <PeCard elevated={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <ShoppingBag color={COLORS.primary} size={20} />
              <Text style={styles.sectionTitle}>Спецификация (BOM)</Text>
            </View>
            
            {bomList.length === 0 ? (
              <Text style={[GLOBAL_STYLES.textMuted, { textAlign: 'center', marginVertical: 16 }]}>Список пуст</Text>
            ) : (
              bomList.map((item, index) => (
                <View key={index} style={styles.bomItemRow}>
                  <View style={{ flex: 1 }}>
                    <PeInput 
                      placeholder="Наименование" 
                      value={item.name} 
                      onChangeText={(val) => updateBOMItem(index, 'name', val)}
                      editable={!isOrderClosed}
                      style={{ marginBottom: 0, height: 40 }}
                    />
                  </View>
                  <View style={{ width: 60, marginHorizontal: 8 }}>
                    <PeInput 
                      placeholder="Кол" 
                      value={item.qty.toString()} 
                      onChangeText={(val) => updateBOMItem(index, 'qty', val)}
                      keyboardType="numeric"
                      editable={!isOrderClosed}
                      style={{ marginBottom: 0, height: 40, textAlign: 'center' }}
                    />
                  </View>
                  <View style={{ width: 50 }}>
                    <PeInput 
                      placeholder="Ед" 
                      value={item.unit} 
                      onChangeText={(val) => updateBOMItem(index, 'unit', val)}
                      editable={!isOrderClosed}
                      style={{ marginBottom: 0, height: 40, textAlign: 'center', paddingHorizontal: 4 }}
                    />
                  </View>
                  {!isOrderClosed && (
                    <TouchableOpacity onPress={() => removeBOMItem(index)} style={styles.bomDeleteBtn}>
                      <Trash2 color={COLORS.danger} size={18} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            {!isOrderClosed && (
              <View style={GLOBAL_STYLES.rowBetween}>
                <TouchableOpacity style={styles.outlineBtn} onPress={addBOMItem}>
                  <Plus color={COLORS.textMain} size={18} />
                  <Text style={styles.outlineBtnText}>Добавить</Text>
                </TouchableOpacity>
                {isBomEdited && (
                  <TouchableOpacity style={[styles.outlineBtn, { borderColor: COLORS.primary }]} onPress={saveBOMList} disabled={loading}>
                    <Save color={COLORS.primary} size={18} />
                    <Text style={[styles.outlineBtnText, { color: COLORS.primary }]}>Сохранить BOM</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </PeCard>
        )}

        {/* ✅ КНОПКА ЗАВЕРШЕНИЯ */}
        {(!isOrderClosed && (order.status === 'work' || isMinor)) && (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinalize} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <CheckCircle color="#fff" size={24} style={{ marginRight: 10 }} />
                <Text style={styles.finishBtnText}>ЗАВЕРШИТЬ И РАСЧИТАТЬ</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 🪟 МОДАЛКА: ДОБАВЛЕНИЕ РАСХОДА */}
      <Modal visible={modalExpenseVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={[GLOBAL_STYLES.h2, { marginBottom: 16 }]}>Новый чек (Расход)</Text>
            <PeInput 
              label="Сумма (₸)" 
              placeholder="Например: 15000" 
              value={expenseAmount} 
              onChangeText={setExpenseAmount}
              keyboardType="numeric"
            />
            <PeInput 
              label="Назначение" 
              placeholder="Покупка кабеля..." 
              value={expenseComment} 
              onChangeText={setExpenseComment}
            />
            
            <View style={[GLOBAL_STYLES.rowBetween, { marginTop: 16 }]}>
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1, marginRight: 8 }]} onPress={() => setModalExpenseVisible(false)}>
                <Text style={styles.outlineBtnText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1, marginLeft: 8, backgroundColor: COLORS.danger, borderColor: COLORS.danger }]} onPress={handleAddExpense} disabled={loading}>
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// =============================================================================
// СТИЛИ
// =============================================================================
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  scrollContent: {
    padding: SIZES.medium,
  },
  sectionCard: {
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
    borderRadius: SIZES.radiusMd,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.textMain,
    marginLeft: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  minorDescBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginBottom: 12
  },
  minorDescText: {
    color: COLORS.textMain,
    fontStyle: 'italic',
    lineHeight: 20
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: SIZES.fontBase,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  profitBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 16,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.surface,
  },
  outlineBtnText: {
    color: COLORS.textMain,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
  },
  actionBtnText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  takeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    marginBottom: SIZES.medium,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  takeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: SIZES.fontBase,
    letterSpacing: 1,
  },
  finishBtn: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.medium,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  finishBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: SIZES.fontBase,
    letterSpacing: 1,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.surfaceElevated,
  },
  statusBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  statusBtnText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  statusBtnTextActive: {
    color: COLORS.primary,
  },
  bomItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bomDeleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: SIZES.radiusSm,
    marginLeft: 8,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closedAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.medium,
  },
  closedAlertText: {
    color: COLORS.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.large,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    padding: SIZES.large,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  }
});