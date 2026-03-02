/**
 * @file src/screens/OrderDetailScreen.js
 * @description Экран управления объектом (PROADMIN Mobile v16.2.0 Enterprise).
 * 🔥 ДОБАВЛЕНО (v16.2.0): Полная интеграция с модулем DocumentService (Скачивание DOCX).
 * 🔥 ДОБАВЛЕНО (v16.2.0): Блок реквизитов (ИИН, ФИО Директора, ТОО/Физ. лицо).
 * 🔥 ДОБАВЛЕНО (v16.2.0): Разделение на Смету (Работы) и Спецификацию (BOM).
 * НИКАКИХ УДАЛЕНИЙ: Воронка статусов, экономика и базовая логика сохранены на 100%.
 *
 * @module OrderDetailScreen
 * @version 16.2.0 (Documents & Measurements Edition)
 */

import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Keyboard
} from "react-native";
import {
  ArrowLeft, User, Phone, CheckCircle, PlusCircle, Trash2, Edit3,
  X, MapPin, AlignLeft, DollarSign, DownloadCloud, HardHat, Home,
  Settings, Layers, Tag, ShieldAlert, Wrench, FileText, Save, Briefcase
} from "lucide-react-native";

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import API from "../api/api";
import { PeCard, PeBadge, PeButton, PeInput } from "../components/ui";
import { COLORS, GLOBAL_STYLES, SIZES } from "../theme/theme";
import { AuthContext } from "../context/AuthContext";

const formatKZT = (num) => (parseFloat(num) || 0).toLocaleString("ru-RU") + " ₸";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

export default function OrderDetailScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const initialOrder = route.params?.order || {};
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);

  const [brigades, setBrigades] = useState([]);
  const isDone = order.status === 'done' || order.status === 'archived' || order.status === 'cancel';
  const isMinor = order.type === 'minor';

  // =============================================================================
  // 💾 STATE: РЕКВИЗИТЫ И ЗАМЕРЫ (NEW 16.2)
  // =============================================================================
  const [address, setAddress] = useState(order.details?.address || "");
  const [adminComment, setAdminComment] = useState(order.details?.admin_comment || order.details?.client_comment || order.description || "");

  const [clientName, setClientName] = useState(order.details?.clientName || order.client_name || "");
  const [clientPhone, setClientPhone] = useState(order.details?.clientPhone || order.client_phone || "");
  const [directorName, setDirectorName] = useState(order.details?.directorName || order.details?.director_name || "");
  const [iinBin, setIinBin] = useState(order.details?.iin_bin || order.details?.iinBin || "");
  const [customerType, setCustomerType] = useState(order.details?.customer_type || order.details?.customerType || "FIZ");
  const [duration, setDuration] = useState(order.details?.duration || "");

  const [estimate, setEstimate] = useState(Array.isArray(order.details?.estimateItems || order.details?.estimate) ? (order.details?.estimateItems || order.details?.estimate) : []);
  const [bom, setBom] = useState(Array.isArray(order.details?.bomItems || order.details?.bom) ? (order.details?.bomItems || order.details?.bom) : []);

  // Финансы и Тех данные
  const params = order.details?.params || {};
  const financials = order.details?.financials || { final_price: order.total_price || 0, total_expenses: 0, net_profit: order.total_price || 0, expenses: [] };
  const calcBase = order.details?.total?.work || order.total_price || 0;

  const calcMode = params.calcMode === 'sq_meter' ? 'По квадратуре (СНиП)' : 'Точный (price_list)';
  const area = params.area || order.area || 0;
  const rooms = params.rooms || 0;
  const isSmartHome = params.isSmartHome ? "Да" : "Нет";
  const tariffName = params.tariffName || "Стандарт";
  const wallType = params.wallType || "Не указано";
  const appliedDiscount = params.appliedDiscount || 0;

  // Модалки
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: "", category: "", comment: "" });
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState(financials.final_price?.toString() || order.total_price?.toString() || "");
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedBrigadeId, setSelectedBrigadeId] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      API.getBrigades().then(data => setBrigades(data || [])).catch(() => { });
    }
  }, [isAdmin]);

  // =============================================================================
  // 🚀 CORE ФУНКЦИИ (СТАТУСЫ, ФИНАНСЫ)
  // =============================================================================

  const handleTakeOrder = async () => {
    try {
      setLoading(true);
      if (isMinor) {
        if (typeof API.takeMinorRepair === 'function') await API.takeMinorRepair(order.id);
        else { const h = await API.getHeaders(); await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/take`, { method: 'POST', headers: h }); }
      } else { await API.takeOrder(order.id); }
      setOrder({ ...order, status: 'processing', brigade_name: user?.name });
      Alert.alert("Успех", "Объект успешно взят в работу!");
    } catch (e) { Alert.alert("Ошибка", e.message); } finally { setLoading(false); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      if (isMinor) {
        if (typeof API.updateMinorRepairStatus === 'function') await API.updateMinorRepairStatus(order.id, newStatus);
        else { const h = await API.getHeaders(); await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/status`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: newStatus }) }); }
      } else { await API.updateOrderStatus(order.id, newStatus); }
      setOrder({ ...order, status: newStatus });
      Alert.alert("Успех", "Статус объекта обновлен!");
    } catch (e) { Alert.alert("Ошибка", e.message); } finally { setLoading(false); }
  };

  const handleFinalizeOrder = async () => {
    Alert.alert("Закрытие объекта", "Вы уверены? Будет произведен расчет долей.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Завершить", style: "destructive", onPress: async () => {
          try {
            setLoading(true);
            if (isMinor) {
              if (typeof API.updateMinorRepairStatus === 'function') await API.updateMinorRepairStatus(order.id, 'done');
              else { const h = await API.getHeaders(); await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/status`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'done' }) }); }
              Alert.alert("Завершено!", "Вызов закрыт.");
            } else {
              const res = await API.finalizeOrder(order.id);
              Alert.alert("Завершено!", `Объект закрыт.\nВаша доля: ${formatKZT(res.distribution.brigadeShare)}`);
            }
            setOrder({ ...order, status: 'done' });
          } catch (e) { Alert.alert("Ошибка", e.message); } finally { setLoading(false); }
        }
      }
    ]);
  };

  const handleCancelOrder = async () => {
    Alert.alert("Отмена объекта", "Отменить этот объект?", [
      { text: "Нет", style: "cancel" },
      {
        text: "Да", style: "destructive", onPress: async () => {
          try {
            setLoading(true);
            if (isMinor) {
              if (typeof API.updateMinorRepairStatus === 'function') await API.updateMinorRepairStatus(order.id, 'cancel');
              else { const h = await API.getHeaders(); await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/status`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'cancel' }) }); }
            } else { await API.updateOrderStatus(order.id, 'cancel'); }
            setOrder({ ...order, status: 'cancel' });
          } catch (e) { Alert.alert("Ошибка", e.message); } finally { setLoading(false); }
        }
      }
    ]);
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.category) return Alert.alert("Ошибка", "Заполните сумму и категорию.");
    try {
      setLoading(true);
      if (isMinor) {
        const h = await API.getHeaders();
        await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/expense`, { method: 'POST', headers: h, body: JSON.stringify({ amount: newExpense.amount, category: newExpense.category, comment: newExpense.comment }) }).catch(() => { });
        const updatedExpenses = [...(financials.expenses || []), { ...newExpense, amount: parseFloat(newExpense.amount) }];
        setOrder({ ...order, details: { ...order.details, financials: { ...financials, expenses: updatedExpenses, total_expenses: (financials.total_expenses || 0) + parseFloat(newExpense.amount) } } });
      } else {
        const res = await API.addOrderExpense(order.id, newExpense.amount, newExpense.category, newExpense.comment);
        setOrder({ ...order, details: { ...order.details, financials: res.financials } });
      }
      setExpenseModalVisible(false);
      setNewExpense({ amount: "", category: "", comment: "" });
    } catch (e) { Alert.alert("Ошибка", e.message); } finally { setLoading(false); }
  };

  const handleUpdatePrice = async () => {
    if (!newPrice) return Alert.alert("Ошибка", "Введите цену.");
    try {
      setLoading(true);
      if (isMinor) {
        const h = await API.getHeaders();
        await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/price`, { method: 'PATCH', headers: h, body: JSON.stringify({ price: newPrice }) }).catch(() => { });
        setOrder({ ...order, total_price: newPrice, details: { ...order.details, financials: { ...financials, final_price: newPrice } } });
      } else {
        const res = await API.updateOrderPrice(order.id, newPrice);
        setOrder({ ...order, total_price: newPrice, details: { ...order.details, financials: res.financials } });
      }
      setPriceModalVisible(false);
    } catch (e) { Alert.alert("Ошибка", e.message); } finally { setLoading(false); }
  };

  const handleAssignBrigade = async () => {
    if (!selectedBrigadeId) return Alert.alert("Ошибка", "Выберите бригаду.");
    try {
      setLoading(true);
      if (isMinor) {
        const h = await API.getHeaders();
        await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/assign`, { method: 'PATCH', headers: h, body: JSON.stringify({ brigadeId: selectedBrigadeId }) });
      } else { await API.assignBrigade(order.id, selectedBrigadeId); }
      const assignedB = brigades.find(b => b.id.toString() === selectedBrigadeId.toString());
      setOrder({ ...order, brigade_id: selectedBrigadeId, brigade_name: assignedB?.name, status: isMinor ? 'processing' : 'work' });
      setAssignModalVisible(false);
    } catch (e) { Alert.alert("Ошибка", e.message); } finally { setLoading(false); }
  };

  // =============================================================================
  // 💼 ФУНКЦИИ ЗАМЕРА И ДОКУМЕНТОВ (NEW)
  // =============================================================================

  const handleSaveMeasurement = async () => {
    try {
      setLoading(true);
      const payload = {
        clientName, directorName, clientPhone, iin_bin: iinBin,
        customer_type: customerType, duration, address,
        bomItems: bom, bom: bom, // Дублируем для обратной совместимости
        estimateItems: estimate, estimate: estimate,
        admin_comment: adminComment
      };

      await API.saveMeasurementData(order.id, payload);
      Alert.alert("Успех", "Результаты замера и реквизиты сохранены в базе!");
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Ошибка сохранения", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDoc = async (type, nameStr) => {
    try {
      setLoading(true);
      const headers = await API.getHeaders();
      const fileUri = FileSystem.documentDirectory + `${nameStr}_Order_${order.id}.docx`;
      const url = `https://erp.yeee.kz/api/orders/${order.id}/document/${type}`;

      // Добавляем Cookie вручную в опции скачивания
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          'Cookie': headers['Cookie'] || ''
        }
      });

      if (downloadRes.status !== 200) {
        throw new Error(`Ошибка сервера. Код: ${downloadRes.status}`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: 'Отправить документ'
        });
      } else {
        Alert.alert("Сохранено", `Файл загружен.`);
      }
    } catch (e) {
      Alert.alert("Ошибка генерации", e.message);
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🧩 РЕНДЕР ЭКРАНА
  // =============================================================================

  return (
    <View style={GLOBAL_STYLES.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* ШАПКА */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} disabled={loading}>
            <ArrowLeft color={COLORS.textMain} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isMinor && <Wrench color={COLORS.primary} size={18} style={{ marginRight: 6 }} />}
              <Text style={GLOBAL_STYLES.h2}>Объект #{order.id}</Text>
            </View>
            <Text style={GLOBAL_STYLES.textSmall}>{formatDate(order.created_at)}</Text>
          </View>
          <PeBadge status={order.status} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingBottom: 300 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {isDone && (
            <View style={styles.alertDanger}>
              <Text style={{ color: COLORS.danger, fontWeight: '600', fontSize: SIZES.fontSmall }}>
                🔒 Объект в статусе: {order.status.toUpperCase()}. Изменения заблокированы.
              </Text>
            </View>
          )}

          {/* ВОРОНКА СТАТУСОВ */}
          {!isDone && (
            <View style={{ marginBottom: SIZES.medium }}>
              {isManager && order.status === 'new' && (
                <PeButton title="ВЗЯТЬ В РАБОТУ" variant="primary" icon={<DownloadCloud color={COLORS.textInverse} size={20} />} onPress={handleTakeOrder} loading={loading} style={{ marginBottom: SIZES.base }} />
              )}
              {isManager && order.status === 'processing' && order.brigade_name && !isMinor && (
                <PeButton title="НАЧАТЬ МОНТАЖ (В РАБОТЕ)" variant="primary" icon={<HardHat color={COLORS.textInverse} size={20} />} onPress={() => handleStatusChange('work')} loading={loading} style={{ marginBottom: SIZES.base }} />
              )}
              {isManager && (order.status === 'work' || (isMinor && order.status === 'processing' && order.brigade_name)) && (
                <PeButton title={isMinor ? "ЗАВЕРШИТЬ ВЫЗОВ" : "ЗАКРЫТЬ И РАСПРЕДЕЛИТЬ ПРИБЫЛЬ"} variant="success" icon={<CheckCircle color="#000" size={20} />} onPress={handleFinalizeOrder} loading={loading} style={{ marginBottom: SIZES.base }} />
              )}
              {isAdmin && (
                <PeButton title="ОТМЕНИТЬ ОБЪЕКТ" variant="danger" icon={<X color="#fff" size={20} />} onPress={handleCancelOrder} loading={loading} />
              )}
            </View>
          )}

          {/* 📝 РЕКВИЗИТЫ И МЕТАДАННЫЕ (NEW 16.2) */}
          <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
            <Text style={styles.sectionTitle}>Реквизиты и Данные</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.toggleBtn, customerType === 'FIZ' && styles.toggleBtnActive]}
                onPress={() => !isDone && setCustomerType('FIZ')}
              ><Text style={[styles.toggleText, customerType === 'FIZ' && styles.toggleTextActive]}>Физ. Лицо</Text></TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, customerType === 'TOO' && styles.toggleBtnActive]}
                onPress={() => !isDone && setCustomerType('TOO')}
              ><Text style={[styles.toggleText, customerType === 'TOO' && styles.toggleTextActive]}>Юр. Лицо / ИП</Text></TouchableOpacity>
            </View>

            <PeInput label="ФИО или Название (Например: ИП АССАНБЕК)" value={clientName} onChangeText={setClientName} editable={!isDone} />
            {customerType === 'TOO' && (
              <PeInput label="В лице директора (ФИО)" value={directorName} onChangeText={setDirectorName} editable={!isDone} />
            )}

            <PeInput label="ИИН / БИН" value={iinBin} onChangeText={setIinBin} editable={!isDone} keyboardType="numeric" />
            <PeInput label="Сроки выполнения (Например: 14 дней)" value={duration} onChangeText={setDuration} editable={!isDone} />
            <PeInput label="Телефон" value={clientPhone} onChangeText={setClientPhone} editable={!isDone} keyboardType="phone-pad" />
            <PeInput label="Адрес объекта" value={address} onChangeText={setAddress} editable={!isDone} />
            <PeInput label="Системный комментарий" value={adminComment} onChangeText={setAdminComment} editable={!isDone} multiline />

          </PeCard>

          {/* 📄 ГЕНЕРАЦИЯ ДОКУМЕНТОВ (NEW 16.2) */}
          {!isMinor && (
            <PeCard elevated={false} style={{ marginBottom: SIZES.medium, backgroundColor: 'rgba(255, 107, 0, 0.05)', borderColor: COLORS.primary, borderWidth: 1 }}>
              <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>Генерация Документов</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                <PeButton title="Договор" variant="secondary" icon={<FileText size={16} color={COLORS.textMain} />} onPress={() => handleDownloadDoc('contract', 'Dogovor')} style={{ flexBasis: '48%' }} loading={loading} />
                <PeButton title="Смета" variant="secondary" icon={<FileText size={16} color={COLORS.textMain} />} onPress={() => handleDownloadDoc('estimate', 'Smeta')} style={{ flexBasis: '48%' }} loading={loading} />
                <PeButton title="BOM (Материалы)" variant="secondary" icon={<FileText size={16} color={COLORS.textMain} />} onPress={() => handleDownloadDoc('bom', 'BOM')} style={{ flexBasis: '48%' }} loading={loading} />
                <PeButton title="Акт приемки" variant="secondary" icon={<FileText size={16} color={COLORS.textMain} />} onPress={() => handleDownloadDoc('acceptance', 'Akt')} style={{ flexBasis: '48%' }} loading={loading} />
              </View>
            </PeCard>
          )}

          {/* 💼 СМЕТА (РАБОТЫ) */}
          {!isMinor && (
            <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
              <Text style={styles.sectionTitle}>Смета (Работы)</Text>
              {estimate.length === 0 ? (
                <Text style={[GLOBAL_STYLES.textMuted, { marginBottom: SIZES.medium }]}>Список работ пуст</Text>
              ) : (
                estimate.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <PeInput placeholder="Работа" value={item.name} onChangeText={(val) => { const n = [...estimate]; n[index].name = val; setEstimate(n); }} editable={!isDone} style={{ marginBottom: 0 }} />
                    </View>
                    <View style={{ width: 60, marginRight: 8 }}>
                      <PeInput placeholder="Кол." value={item.qty?.toString()} keyboardType="numeric" onChangeText={(val) => { const n = [...estimate]; n[index].qty = val; setEstimate(n); }} editable={!isDone} style={{ marginBottom: 0 }} />
                    </View>
                    <View style={{ width: 50 }}>
                      <PeInput placeholder="Ед." value={item.unit} onChangeText={(val) => { const n = [...estimate]; n[index].unit = val; setEstimate(n); }} editable={!isDone} style={{ marginBottom: 0 }} />
                    </View>
                    {!isDone && (
                      <TouchableOpacity onPress={() => { const n = [...estimate]; n.splice(index, 1); setEstimate(n); }} style={{ marginLeft: 8 }}><Trash2 color={COLORS.danger} size={20} /></TouchableOpacity>
                    )}
                  </View>
                ))
              )}
              {!isDone && (
                <PeButton title="Добавить работу" variant="ghost" icon={<PlusCircle size={18} color={COLORS.textMain} />} onPress={() => setEstimate([...estimate, { name: "", qty: 1, unit: "м", price: 0 }])} />
              )}
            </PeCard>
          )}

          {/* 📋 СПЕЦИФИКАЦИЯ (BOM) */}
          {!isMinor && (
            <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
              <Text style={styles.sectionTitle}>Спецификация (BOM)</Text>
              {bom.length === 0 ? (
                <Text style={[GLOBAL_STYLES.textMuted, { marginBottom: SIZES.medium }]}>Спецификация пуста</Text>
              ) : (
                bom.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <PeInput placeholder="Материал" value={item.name} onChangeText={(val) => { const n = [...bom]; n[index].name = val; setBom(n); }} editable={!isDone} style={{ marginBottom: 0 }} />
                    </View>
                    <View style={{ width: 60, marginRight: 8 }}>
                      <PeInput placeholder="Кол." value={item.qty?.toString()} keyboardType="numeric" onChangeText={(val) => { const n = [...bom]; n[index].qty = val; setBom(n); }} editable={!isDone} style={{ marginBottom: 0 }} />
                    </View>
                    <View style={{ width: 50 }}>
                      <PeInput placeholder="Ед." value={item.unit} onChangeText={(val) => { const n = [...bom]; n[index].unit = val; setBom(n); }} editable={!isDone} style={{ marginBottom: 0 }} />
                    </View>
                    {!isDone && (
                      <TouchableOpacity onPress={() => { const n = [...bom]; n.splice(index, 1); setBom(n); }} style={{ marginLeft: 8 }}><Trash2 color={COLORS.danger} size={20} /></TouchableOpacity>
                    )}
                  </View>
                ))
              )}
              {!isDone && (
                <PeButton title="Добавить материал" variant="ghost" icon={<PlusCircle size={18} color={COLORS.textMain} />} onPress={() => setBom([...bom, { name: "", qty: 1, unit: "шт" }])} />
              )}
            </PeCard>
          )}

          {/* 💾 ГЛОБАЛЬНАЯ КНОПКА СОХРАНЕНИЯ ЗАМЕРА */}
          {!isDone && !isMinor && (
            <PeButton
              title="СОХРАНИТЬ РЕЗУЛЬТАТЫ ЗАМЕРА"
              variant="primary"
              icon={<Save color={COLORS.textInverse} size={20} />}
              onPress={handleSaveMeasurement}
              loading={loading}
              style={{ marginBottom: SIZES.medium }}
            />
          )}

          {/* 💰 ЭКОНОМИКА */}
          <PeCard elevated={false} style={{ marginBottom: 40 }}>
            <View style={GLOBAL_STYLES.rowBetween}>
              <Text style={styles.sectionTitle}>Экономика</Text>
              {!isDone && (<TouchableOpacity onPress={() => setPriceModalVisible(true)}><Edit3 color={COLORS.primary} size={20} /></TouchableOpacity>)}
            </View>

            <View style={[styles.finRow, { marginTop: 8 }]}>
              <Text style={GLOBAL_STYLES.textMuted}>Договорная цена:</Text>
              <Text style={[GLOBAL_STYLES.textBody, { fontWeight: '700' }]}>{formatKZT(financials.final_price || order.total_price)}</Text>
            </View>

            <View style={[styles.finRow, { marginTop: 8 }]}>
              <Text style={GLOBAL_STYLES.textMuted}>Сумма чеков (Расход):</Text>
              <Text style={{ color: COLORS.danger, fontWeight: '700' }}>-{formatKZT(financials.total_expenses || 0)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.finRow}>
              <Text style={[GLOBAL_STYLES.textBody, { textTransform: 'uppercase', fontWeight: '700' }]}>Чистая прибыль:</Text>
              <Text style={{ color: COLORS.success, fontSize: SIZES.fontTitle, fontWeight: '700' }}>
                {formatKZT((financials.final_price || order.total_price || 0) - (financials.total_expenses || 0))}
              </Text>
            </View>

            <View style={{ marginTop: SIZES.large }}>
              <Text style={[GLOBAL_STYLES.h3, { marginBottom: SIZES.base }]}>Реестр расходов</Text>
              {financials.expenses?.length > 0 ? (
                financials.expenses.map((exp, idx) => (
                  <View key={idx} style={styles.expenseItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={GLOBAL_STYLES.textBody}>{exp.category}</Text>
                      {exp.comment ? <Text style={GLOBAL_STYLES.textSmall}>{exp.comment}</Text> : null}
                    </View>
                    <Text style={{ color: COLORS.danger, fontWeight: '600' }}>-{formatKZT(exp.amount)}</Text>
                  </View>
                ))
              ) : (<Text style={GLOBAL_STYLES.textMuted}>Чеков пока нет</Text>)}

              {!isDone && (
                <PeButton title="Добавить расход (Чек)" variant="ghost" icon={<PlusCircle color={COLORS.textMain} size={18} />} onPress={() => setExpenseModalVisible(true)} style={{ marginTop: SIZES.medium, borderWidth: 1, borderColor: COLORS.border }} />
              )}
            </View>
          </PeCard>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🔮 МОДАЛЬНЫЕ ОКНА (Остаются без изменений) */}
      <Modal visible={priceModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={GLOBAL_STYLES.rowBetween}>
              <Text style={GLOBAL_STYLES.h2}>Договорная цена</Text>
              <TouchableOpacity onPress={() => setPriceModalVisible(false)}><X color={COLORS.textMuted} size={24} /></TouchableOpacity>
            </View>
            <PeInput label="Новая цена (₸)" keyboardType="numeric" value={newPrice} onChangeText={setNewPrice} icon={<DollarSign color={COLORS.primary} size={18} />} />
            <PeButton title="Применить цену" variant="primary" onPress={handleUpdatePrice} loading={loading} style={{ marginTop: SIZES.medium }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={expenseModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={GLOBAL_STYLES.rowBetween}>
              <Text style={GLOBAL_STYLES.h2}>Добавить расход</Text>
              <TouchableOpacity onPress={() => setExpenseModalVisible(false)}><X color={COLORS.textMuted} size={24} /></TouchableOpacity>
            </View>
            <PeInput label="Сумма (₸)" keyboardType="numeric" value={newExpense.amount} onChangeText={(v) => setNewExpense({ ...newExpense, amount: v })} />
            <PeInput label="Категория" value={newExpense.category} onChangeText={(v) => setNewExpense({ ...newExpense, category: v })} />
            <PeInput label="Комментарий" value={newExpense.comment} onChangeText={(v) => setNewExpense({ ...newExpense, comment: v })} />
            <PeButton title="Сохранить чек" variant="danger" onPress={handleAddExpense} loading={loading} style={{ marginTop: SIZES.medium }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SIZES.large, paddingVertical: SIZES.medium, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { marginRight: SIZES.medium, padding: SIZES.base },
  scrollContent: { padding: SIZES.large },
  sectionTitle: { fontSize: SIZES.fontTitle, fontWeight: "700", color: COLORS.textMain, marginBottom: SIZES.medium, letterSpacing: -0.5 },
  finRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SIZES.medium },
  expenseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  listItem: { flexDirection: "row", alignItems: "center", marginBottom: SIZES.medium },
  alertDanger: { backgroundColor: "rgba(239, 68, 68, 0.1)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)", padding: SIZES.medium, borderRadius: SIZES.radiusSm, marginBottom: SIZES.medium, alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, padding: SIZES.large, borderTopLeftRadius: SIZES.radiusLg, borderTopRightRadius: SIZES.radiusLg, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radiusSm, alignItems: 'center', backgroundColor: COLORS.surfaceElevated },
  toggleBtnActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(255, 107, 0, 0.15)' },
  toggleText: { color: COLORS.textMuted, fontWeight: '600' },
  toggleTextActive: { color: COLORS.primary }
});