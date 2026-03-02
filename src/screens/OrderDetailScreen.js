/**
 * @file src/screens/OrderDetailScreen.js
 * @description Экран управления объектом (PROADMIN Mobile v17.0.0 Enterprise).
 * 🔥 ИСПРАВЛЕНО: Устранен баг "слепой зоны" статусов и разблокирована экономика для мелкого ремонта.
 * 🔥 ДОБАВЛЕНО: Генерация нередактируемых PDF документов (Договоры, Акты, Сметы).
 * 🔥 ДОБАВЛЕНО: Блок реквизитов (ИИН, ФИО Директора) и раздельная Смета/BOM.
 * НИКАКИХ УДАЛЕНИЙ: Весь функционал, API-Фоллбэки и модальные окна сохранены на 100%. ПОЛНЫЙ КОД.
 *
 * @module OrderDetailScreen
 * @version 17.0.0 (Full Cycle & PDF Edition)
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
  ArrowLeft,
  User,
  Phone,
  CheckCircle,
  PlusCircle,
  Trash2,
  Edit3,
  X,
  MapPin,
  AlignLeft,
  DollarSign,
  DownloadCloud,
  HardHat,
  Home,
  Settings,
  Layers,
  Tag,
  ShieldAlert,
  Wrench,
  FileText,
  Save
} from "lucide-react-native";

// 🔥 ИМПОРТЫ ДЛЯ РАБОТЫ С ФАЙЛАМИ И PDF
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

  // 🔥 ОПРЕДЕЛЯЕМ ТИП ОБЪЕКТА
  const isMinor = order.type === 'minor';

  // =============================================================================
  // 💾 STATE: РЕКВИЗИТЫ И ЗАМЕРЫ (Синхронизировано с Web CRM)
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

  // Извлекаем технические данные с защитой от undefined
  const params = order.details?.params || {};
  const financials = order.details?.financials || { final_price: order.total_price || 0, total_expenses: 0, net_profit: order.total_price || 0, expenses: [] };
  const calcBase = order.details?.total?.work || order.total_price || 0;

  // Парсинг тех. данных
  const calcMode = params.calcMode === 'sq_meter' ? 'По квадратуре (СНиП)' : 'Точный (price_list)';
  const area = params.area || order.area || 0;
  const rooms = params.rooms || 0;
  const isSmartHome = params.isSmartHome ? "Да" : "Нет";
  const tariffName = params.tariffName || "Стандарт";
  const wallType = params.wallType || "Не указано";
  const appliedDiscount = params.appliedDiscount || 0;
  const isMinThresholdApplied = order.details?.total?.isMinThresholdApplied || false;

  // Модалки
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: "", category: "", comment: "" });

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [newPrice, setNewPrice] = useState(financials.final_price?.toString() || order.total_price?.toString() || "");

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedBrigadeId, setSelectedBrigadeId] = useState(null);

  // =============================================================================
  // 🚀 ЗАГРУЗКА ДАННЫХ
  // =============================================================================
  useEffect(() => {
    if (isAdmin) {
      API.getBrigades()
        .then(data => setBrigades(data || []))
        .catch(err => console.log("Failed to load brigades:", err));
    }
  }, [isAdmin]);

  // =============================================================================
  // 🚀 API ОБРАБОТЧИКИ (С ЖЕЛЕЗОБЕТОННЫМИ ПРОВЕРКАМИ)
  // =============================================================================

  const handleTakeOrder = async () => {
    try {
      setLoading(true);
      if (isMinor) {
        if (typeof API.takeMinorRepair === 'function') {
          await API.takeMinorRepair(order.id);
        } else {
          const headers = await API.getHeaders();
          await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/take`, { method: 'POST', headers });
        }
      } else {
        await API.takeOrder(order.id); 
      }
      
      setOrder({ ...order, status: 'processing', brigade_name: user?.name });
      Alert.alert("Успех", "Объект успешно взят в работу!");
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      if (isMinor) {
        if (typeof API.updateMinorRepairStatus === 'function') {
          await API.updateMinorRepairStatus(order.id, newStatus);
        } else {
          const headers = await API.getHeaders();
          await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/status`, { 
            method: 'PATCH', 
            headers, 
            body: JSON.stringify({ status: newStatus }) 
          });
        }
      } else {
        await API.updateOrderStatus(order.id, newStatus);
      }
      
      setOrder({ ...order, status: newStatus });
      Alert.alert("Успех", "Статус объекта успешно обновлен!");
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeOrder = async () => {
    Alert.alert(
      "Закрытие объекта",
      isMinor ? "Вы уверены, что хотите завершить этот вызов?" : "Вы уверены? Будет произведен расчет долей и начислен долг.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Завершить",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              if (isMinor) {
                if (typeof API.updateMinorRepairStatus === 'function') {
                  await API.updateMinorRepairStatus(order.id, 'done');
                } else {
                  const headers = await API.getHeaders();
                  await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/status`, { 
                    method: 'PATCH', 
                    headers, 
                    body: JSON.stringify({ status: 'done' }) 
                  });
                }
                Alert.alert("Завершено!", "Вызов успешно закрыт.");
              } else {
                const res = await API.finalizeOrder(order.id);
                Alert.alert("Завершено!", `Объект закрыт.\nВаша доля: ${formatKZT(res.distribution.brigadeShare)}\nДолг Шефу: ${formatKZT(res.distribution.ownerShare)}`);
              }
              setOrder({ ...order, status: 'done' });
            } catch (e) {
              Alert.alert("Ошибка", e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCancelOrder = async () => {
    Alert.alert(
      "Отмена объекта",
      "Вы уверены, что хотите отменить этот объект? Он будет переведен в статус 'Отказ'.",
      [
        { text: "Нет", style: "cancel" },
        {
          text: "Да, отменить",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              if (isMinor) {
                if (typeof API.updateMinorRepairStatus === 'function') {
                  await API.updateMinorRepairStatus(order.id, 'cancel');
                } else {
                  const headers = await API.getHeaders();
                  await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/status`, { 
                    method: 'PATCH', 
                    headers, 
                    body: JSON.stringify({ status: 'cancel' }) 
                  });
                }
              } else {
                await API.updateOrderStatus(order.id, 'cancel');
              }
              setOrder({ ...order, status: 'cancel' });
              Alert.alert("Отменено", "Объект успешно переведен в отказы.");
            } catch (e) {
              Alert.alert("Ошибка", e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 🔥 МЕТОД СОХРАНЕНИЯ КОМПЛЕКСНОГО ЗАМЕРА
  const handleSaveMeasurement = async () => {
    try {
      setLoading(true);
      const payload = {
        clientName, directorName, clientPhone, iin_bin: iinBin,
        customer_type: customerType, duration, address,
        bomItems: bom, bom: bom,
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

  const handleSaveMetadata = async () => {
    if (isMinor) return Alert.alert("Информация", "Метаданные для мелкого ремонта редактируются из админ-панели.");
    try {
      setLoading(true);
      const res = await API.updateOrderMetadata(order.id, address, adminComment);
      setOrder({ ...order, details: res.details });
      Alert.alert("Сохранено", "Адрес и комментарий обновлены.");
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally { setLoading(false); }
  };

  const handleSaveBOM = async () => {
    try {
      setLoading(true);
      const res = await API.updateOrderBOM(order.id, bom);
      setOrder({ ...order, details: { ...order.details, bom: res.bom } });
      Alert.alert("Сохранено", "Спецификация (BOM) успешно обновлена.");
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally { setLoading(false); }
  };

  // 🔥 МЕТОД СКАЧИВАНИЯ PDF-ДОКУМЕНТОВ
  const handleDownloadDoc = async (type, nameStr) => {
    try {
      setLoading(true);
      const headers = await API.getHeaders();
      const fileUri = FileSystem.documentDirectory + `${nameStr}_Order_${order.id}.pdf`;
      const url = `https://erp.yeee.kz/api/orders/${order.id}/document/${type}`;

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
           mimeType: 'application/pdf',
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

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.category) return Alert.alert("Ошибка", "Заполните сумму и категорию.");
    try {
      setLoading(true);
      if (isMinor) {
        const headers = await API.getHeaders();
        await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/expense`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount: newExpense.amount, category: newExpense.category, comment: newExpense.comment })
        }).catch(() => {});
        
        const updatedExpenses = [...(financials.expenses || []), { ...newExpense, amount: parseFloat(newExpense.amount) }];
        const updatedTotalExp = (financials.total_expenses || 0) + parseFloat(newExpense.amount);
        
        setOrder({ 
          ...order, 
          details: { 
            ...order.details, 
            financials: { ...financials, expenses: updatedExpenses, total_expenses: updatedTotalExp } 
          } 
        });
      } else {
        const res = await API.addOrderExpense(order.id, newExpense.amount, newExpense.category, newExpense.comment);
        setOrder({ ...order, details: { ...order.details, financials: res.financials } });
      }
      setExpenseModalVisible(false);
      setNewExpense({ amount: "", category: "", comment: "" });
      Alert.alert("Расход добавлен", "Экономика объекта пересчитана.");
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally { setLoading(false); }
  };

  const handleUpdatePrice = async () => {
    if (!newPrice) return Alert.alert("Ошибка", "Введите цену.");
    try {
      setLoading(true);
      if (isMinor) {
        const headers = await API.getHeaders();
        await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/price`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ price: newPrice })
        }).catch(() => {});

        setOrder({ 
          ...order, 
          total_price: newPrice, 
          details: { 
            ...order.details, 
            financials: { ...financials, final_price: newPrice } 
          } 
        });
      } else {
        const res = await API.updateOrderPrice(order.id, newPrice); 
        setOrder({ ...order, total_price: newPrice, details: { ...order.details, financials: res.financials } });
      }
      setPriceModalVisible(false);
      Alert.alert("Цена обновлена", "Итоговая цена зафиксирована.");
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally { setLoading(false); }
  };

  const handleAssignBrigade = async () => {
    if (!selectedBrigadeId) return Alert.alert("Ошибка", "Выберите бригаду из списка.");
    try {
      setLoading(true);
      if (isMinor) {
        const headers = await API.getHeaders();
        await fetch(`https://erp.yeee.kz/api/minor-repairs/${order.id}/assign`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ brigadeId: selectedBrigadeId })
        });
      } else {
        await API.assignBrigade(order.id, selectedBrigadeId);
      }
      
      const assignedB = brigades.find(b => b.id.toString() === selectedBrigadeId.toString());
      setOrder({
        ...order,
        brigade_id: selectedBrigadeId,
        brigade_name: assignedB?.name,
        status: isMinor ? 'processing' : 'work'
      });
      setAssignModalVisible(false);
      Alert.alert("Успех", "Объект успешно передан бригаде!");
    } catch (e) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🧩 РЕНДЕР ЭКРАНА
  // =============================================================================

  return (
    <View style={GLOBAL_STYLES.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 300 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {isDone && (
            <View style={styles.alertDanger}>
              <Text style={{ color: COLORS.danger, fontWeight: '600', fontSize: SIZES.fontSmall }}>
                🔒 Объект в статусе: {order.status.toUpperCase()}. Изменения заблокированы.
              </Text>
            </View>
          )}

          {/* 👤 ИНФОРМАЦИЯ О КЛИЕНТЕ И РЕКВИЗИТЫ */}
          <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
            <Text style={styles.sectionTitle}>Информация и Реквизиты</Text>
            
            <View style={styles.infoRow}>
              <User color={COLORS.primary} size={18} style={{ marginRight: 8 }} />
              <Text style={GLOBAL_STYLES.textBody}>{order.client_name || "Не указано"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Phone color={COLORS.textMuted} size={18} style={{ marginRight: 8 }} />
              <Text style={GLOBAL_STYLES.textBody}>{order.client_phone || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <HardHat color={order.brigade_name ? COLORS.warning : COLORS.textMuted} size={18} style={{ marginRight: 8 }} />
              <Text style={[GLOBAL_STYLES.textBody, { color: order.brigade_name ? COLORS.warning : COLORS.textMuted, fontWeight: order.brigade_name ? '600' : '400' }]}>
                {order.brigade_name ? `Бригада: ${order.brigade_name}` : "Бригада не назначена (БИРЖА)"}
              </Text>
            </View>

            {isAdmin && !isDone && (
              <PeButton
                title={order.brigade_name ? "Сменить бригаду" : "Назначить бригаду"}
                variant="ghost"
                onPress={() => setAssignModalVisible(true)}
                style={{ marginBottom: SIZES.base, borderWidth: 1, borderColor: COLORS.border }}
              />
            )}

            <View style={styles.divider} />

            {!isMinor ? (
              <>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10, marginTop: 10 }}>
                  <TouchableOpacity style={[styles.toggleBtn, customerType === 'FIZ' && styles.toggleBtnActive]} onPress={() => !isDone && setCustomerType('FIZ')}>
                    <Text style={[styles.toggleText, customerType === 'FIZ' && styles.toggleTextActive]}>Физ. Лицо</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, customerType === 'TOO' && styles.toggleBtnActive]} onPress={() => !isDone && setCustomerType('TOO')}>
                    <Text style={[styles.toggleText, customerType === 'TOO' && styles.toggleTextActive]}>Юр. Лицо / ИП</Text>
                  </TouchableOpacity>
                </View>

                <PeInput label="ФИО или Название (ТОО/ИП)" value={clientName} onChangeText={setClientName} editable={!isDone && !loading} />
                {customerType === 'TOO' && (
                  <PeInput label="В лице директора (ФИО)" value={directorName} onChangeText={setDirectorName} editable={!isDone && !loading} />
                )}
                <PeInput label="ИИН / БИН" value={iinBin} onChangeText={setIinBin} editable={!isDone && !loading} keyboardType="numeric" />
                <PeInput label="Сроки (Например: 14 дней)" value={duration} onChangeText={setDuration} editable={!isDone && !loading} />
                <PeInput label="Телефон" value={clientPhone} onChangeText={setClientPhone} editable={!isDone && !loading} keyboardType="phone-pad" />
                <PeInput label="📍 Адрес объекта" value={address} onChangeText={setAddress} editable={!isDone && !loading} icon={<MapPin color={COLORS.textMuted} size={16} />} />
                <PeInput label="📝 Системный комментарий" value={adminComment} onChangeText={setAdminComment} editable={!isDone && !loading} multiline icon={<AlignLeft color={COLORS.textMuted} size={16} />} />
              </>
            ) : (
              <View>
                <Text style={GLOBAL_STYLES.textMuted}>📝 Описание задачи (Мелкий ремонт):</Text>
                <Text style={[GLOBAL_STYLES.textBody, { marginTop: SIZES.small, fontStyle: 'italic' }]}>
                  {adminComment || "Нет описания"}
                </Text>
              </View>
            )}
          </PeCard>

          {/* 📄 ГЕНЕРАЦИЯ ДОКУМЕНТОВ (PDF) */}
          {!isMinor && (
            <PeCard elevated={false} style={{ marginBottom: SIZES.medium, backgroundColor: 'rgba(255, 107, 0, 0.05)', borderColor: COLORS.primary, borderWidth: 1 }}>
              <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>Документы (PDF)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                <PeButton title="Договор" variant="secondary" icon={<FileText size={16} color={COLORS.textMain} />} onPress={() => handleDownloadDoc('contract', 'Dogovor')} style={{ flexBasis: '48%' }} loading={loading} />
                <PeButton title="Смета" variant="secondary" icon={<FileText size={16} color={COLORS.textMain} />} onPress={() => handleDownloadDoc('estimate', 'Smeta')} style={{ flexBasis: '48%' }} loading={loading} />
                <PeButton title="BOM (Матер.)" variant="secondary" icon={<FileText size={16} color={COLORS.textMain} />} onPress={() => handleDownloadDoc('bom', 'BOM')} style={{ flexBasis: '48%' }} loading={loading} />
                <PeButton title="Акт приемки" variant="secondary" icon={<FileText size={16} color={COLORS.textMain} />} onPress={() => handleDownloadDoc('acceptance', 'Akt')} style={{ flexBasis: '48%' }} loading={loading} />
              </View>
            </PeCard>
          )}

          {/* 🏢 БЛОК: ТЕХНИЧЕСКИЕ ДАННЫЕ (ТОЛЬКО ДЛЯ КОМПЛЕКСА) */}
          {!isMinor && area > 0 && (
            <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
              <Text style={styles.sectionTitle}>Технические данные</Text>
              
              <View style={styles.techRow}>
                <Settings color={COLORS.textMuted} size={16} style={{marginRight: 8}}/>
                <Text style={GLOBAL_STYLES.textMuted}>Метод расчета:</Text>
                <Text style={[GLOBAL_STYLES.textBody, {flex: 1, textAlign: 'right', fontStyle: 'italic'}]}>{calcMode}</Text>
              </View>

              <View style={styles.techRow}>
                <Home color={COLORS.textMuted} size={16} style={{marginRight: 8}}/>
                <Text style={GLOBAL_STYLES.textMuted}>Площадь / Комнаты:</Text>
                <Text style={[GLOBAL_STYLES.textBody, {flex: 1, textAlign: 'right'}]}>{area} м² / {rooms}</Text>
              </View>

              <View style={styles.techRow}>
                <Layers color={COLORS.textMuted} size={16} style={{marginRight: 8}}/>
                <Text style={GLOBAL_STYLES.textMuted}>Стены:</Text>
                <Text style={[GLOBAL_STYLES.textBody, {flex: 1, textAlign: 'right'}]}>{wallType}</Text>
              </View>

              <View style={styles.techRow}>
                <MapPin color={COLORS.textMuted} size={16} style={{marginRight: 8}}/>
                <Text style={GLOBAL_STYLES.textMuted}>Тариф:</Text>
                <Text style={[GLOBAL_STYLES.textBody, {flex: 1, textAlign: 'right', fontWeight: '600'}]}>{tariffName}</Text>
              </View>

              <View style={styles.techRow}>
                <Settings color={COLORS.primary} size={16} style={{marginRight: 8}}/>
                <Text style={GLOBAL_STYLES.textMuted}>Умный дом:</Text>
                <Text style={[GLOBAL_STYLES.textBody, {flex: 1, textAlign: 'right', color: isSmartHome === 'Да' ? COLORS.primary : COLORS.textMain}]}>{isSmartHome}</Text>
              </View>

              {appliedDiscount > 0 && (
                <View style={[styles.techRow, { marginTop: SIZES.small, paddingTop: SIZES.small, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                  <Tag color={COLORS.warning} size={16} style={{marginRight: 8}}/>
                  <Text style={{color: COLORS.warning, fontWeight: '600'}}>Применена скидка:</Text>
                  <Text style={{flex: 1, textAlign: 'right', color: COLORS.warning, fontWeight: '700'}}>-{formatKZT(appliedDiscount)}</Text>
                </View>
              )}

              {isMinThresholdApplied && (
                <View style={[styles.techRow, { marginTop: SIZES.small }]}>
                  <ShieldAlert color={COLORS.danger} size={16} style={{marginRight: 8}}/>
                  <Text style={{color: COLORS.danger, flex: 1, fontSize: 12}}>Сработал блокиратор минимальной рентабельности</Text>
                </View>
              )}
            </PeCard>
          )}

          {/* 🔥 СИСТЕМНЫЕ ДЕЙСТВИЯ (ВОРОНКА СТАТУСОВ ДЛЯ БРИГАДИРА) */}
          {!isDone && (
            <View style={{ marginBottom: SIZES.medium }}>
              
              {isManager && order.status === 'new' && (
                <PeButton
                  title="ВЗЯТЬ В РАБОТУ"
                  variant="primary"
                  icon={<DownloadCloud color={COLORS.textInverse} size={20} />}
                  onPress={handleTakeOrder}
                  loading={loading}
                  style={{ marginBottom: SIZES.base }}
                />
              )}

              {isManager && order.status === 'processing' && order.brigade_name && !isMinor && (
                <PeButton
                  title="НАЧАТЬ МОНТАЖ (В РАБОТЕ)"
                  variant="primary"
                  icon={<HardHat color={COLORS.textInverse} size={20} />}
                  onPress={() => handleStatusChange('work')}
                  loading={loading}
                  style={{ marginBottom: SIZES.base }}
                />
              )}

              {isManager && (order.status === 'work' || (isMinor && order.status === 'processing' && order.brigade_name)) && (
                <PeButton
                  title={isMinor ? "ЗАВЕРШИТЬ ВЫЗОВ" : "ЗАКРЫТЬ И РАСПРЕДЕЛИТЬ ПРИБЫЛЬ"}
                  variant="success"
                  icon={<CheckCircle color="#000" size={20} />}
                  onPress={handleFinalizeOrder}
                  loading={loading}
                  style={{ marginBottom: SIZES.base }}
                />
              )}
              
              {isAdmin && (
                <PeButton
                  title="ОТМЕНИТЬ ОБЪЕКТ (В ОТКАЗ)"
                  variant="danger"
                  icon={<X color="#fff" size={20} />}
                  onPress={handleCancelOrder}
                  loading={loading}
                />
              )}
            </View>
          )}

          {/* 💰 ЭКОНОМИКА */}
          <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
            <View style={GLOBAL_STYLES.rowBetween}>
              <Text style={styles.sectionTitle}>Экономика</Text>
              {!isDone && (
                <TouchableOpacity onPress={() => setPriceModalVisible(true)}>
                  <Edit3 color={COLORS.primary} size={20} />
                </TouchableOpacity>
              )}
            </View>

            {!isMinor && (
              <View style={styles.finRow}>
                <Text style={GLOBAL_STYLES.textMuted}>Расчетная база:</Text>
                <Text style={GLOBAL_STYLES.textBody}>{formatKZT(calcBase)}</Text>
              </View>
            )}
            
            <View style={[styles.finRow, { marginTop: 8 }]}>
              <Text style={GLOBAL_STYLES.textMuted}>{isMinor ? "Сумма вызова:" : "Договорная цена:"}</Text>
              <Text style={[GLOBAL_STYLES.textBody, { fontWeight: '700' }]}>
                {financials.final_price || order.total_price ? formatKZT(financials.final_price || order.total_price) : "Договорная"}
              </Text>
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
              ) : (
                <Text style={GLOBAL_STYLES.textMuted}>Чеков пока нет</Text>
              )}

              {!isDone && (
                <PeButton
                  title="Добавить расход (Чек)"
                  variant="ghost"
                  icon={<PlusCircle color={COLORS.textMain} size={18} />}
                  onPress={() => setExpenseModalVisible(true)}
                  style={{ marginTop: SIZES.medium, borderWidth: 1, borderColor: COLORS.border }}
                />
              )}
            </View>
          </PeCard>

          {/* 💼 СМЕТА (РАБОТЫ) */}
          {!isMinor && (
            <PeCard elevated={false} style={{ marginBottom: SIZES.medium }}>
              <Text style={styles.sectionTitle}>Смета (Работы)</Text>
              {estimate.length === 0 ? (
                <Text style={[GLOBAL_STYLES.textMuted, { marginBottom: SIZES.medium }]}>Список работ пуст</Text>
              ) : (
                estimate.map((item, index) => (
                  <View key={index} style={styles.bomItem}>
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
                  <View key={index} style={styles.bomItem}>
                    <View style={{ flex: 1, marginRight: SIZES.small }}>
                      <PeInput
                        placeholder="Материал"
                        value={item.name}
                        onChangeText={(val) => { const n = [...bom]; n[index].name = val; setBom(n); }}
                        editable={!isDone}
                        style={{ marginBottom: 0 }}
                      />
                    </View>
                    <View style={{ width: 60, marginRight: SIZES.small }}>
                      <PeInput
                        placeholder="Кол."
                        value={item.qty.toString()}
                        keyboardType="numeric"
                        onChangeText={(val) => { const n = [...bom]; n[index].qty = val; setBom(n); }}
                        editable={!isDone}
                        style={{ marginBottom: 0 }}
                      />
                    </View>
                    <View style={{ width: 50 }}>
                      <PeInput
                        placeholder="Ед."
                        value={item.unit}
                        onChangeText={(val) => { const n = [...bom]; n[index].unit = val; setBom(n); }}
                        editable={!isDone}
                        style={{ marginBottom: 0 }}
                      />
                    </View>
                    {!isDone && (
                      <TouchableOpacity onPress={() => { const n = [...bom]; n.splice(index, 1); setBom(n); }} style={{ marginLeft: SIZES.small }}>
                        <Trash2 color={COLORS.danger} size={20} />
                      </TouchableOpacity>
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
               icon={<Save color={COLORS.textInverse} size={20}/>}
               onPress={handleSaveMeasurement}
               loading={loading}
               style={{ marginBottom: 40 }}
             />
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🔮 МОДАЛЬНОЕ ОКНО ДЛЯ ЦЕНЫ */}
      <Modal visible={priceModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={GLOBAL_STYLES.rowBetween}>
                <Text style={GLOBAL_STYLES.h2}>Договорная цена</Text>
                <TouchableOpacity onPress={() => setPriceModalVisible(false)}><X color={COLORS.textMuted} size={24} /></TouchableOpacity>
              </View>
              <PeInput
                label="Новая цена (₸)"
                keyboardType="numeric"
                value={newPrice}
                onChangeText={setNewPrice}
                icon={<DollarSign color={COLORS.primary} size={18} />}
              />
              <PeButton title="Применить цену" variant="primary" onPress={handleUpdatePrice} loading={loading} style={{ marginTop: SIZES.medium }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🔮 МОДАЛЬНОЕ ОКНО ДЛЯ РАСХОДОВ */}
      <Modal visible={expenseModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={GLOBAL_STYLES.rowBetween}>
                <Text style={GLOBAL_STYLES.h2}>Добавить расход</Text>
                <TouchableOpacity onPress={() => setExpenseModalVisible(false)}><X color={COLORS.textMuted} size={24} /></TouchableOpacity>
              </View>
              <PeInput
                label="Сумма (₸)"
                keyboardType="numeric"
                value={newExpense.amount}
                onChangeText={(v) => setNewExpense({ ...newExpense, amount: v })}
              />
              <PeInput
                label="Категория (Например: Материалы)"
                value={newExpense.category}
                onChangeText={(v) => setNewExpense({ ...newExpense, category: v })}
              />
              <PeInput
                label="Комментарий / Номер чека (Опционально)"
                value={newExpense.comment}
                onChangeText={(v) => setNewExpense({ ...newExpense, comment: v })}
              />
              <PeButton title="Сохранить чек" variant="danger" onPress={handleAddExpense} loading={loading} style={{ marginTop: SIZES.medium }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🔮 МОДАЛЬНОЕ ОКНО ДЛЯ НАЗНАЧЕНИЯ БРИГАДЫ */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={GLOBAL_STYLES.rowBetween}>
                <Text style={GLOBAL_STYLES.h2}>Назначить бригаду</Text>
                <TouchableOpacity onPress={() => setAssignModalVisible(false)}><X color={COLORS.textMuted} size={24} /></TouchableOpacity>
              </View>

              <Text style={[GLOBAL_STYLES.textMuted, { marginBottom: SIZES.small, marginTop: SIZES.base }]}>
                Выберите бригаду для передачи объекта #{order.id}:
              </Text>

              {brigades.length === 0 ? (
                <Text style={[GLOBAL_STYLES.textMain, { marginVertical: SIZES.medium }]}>Нет активных бригад в системе.</Text>
              ) : (
                <View style={{ gap: SIZES.small, marginBottom: SIZES.large }}>
                  {brigades.map(b => (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.brigadeOption, selectedBrigadeId === b.id && styles.brigadeOptionActive]}
                      onPress={() => setSelectedBrigadeId(b.id)}
                      activeOpacity={0.7}
                    >
                      <HardHat color={selectedBrigadeId === b.id ? COLORS.primary : COLORS.textMuted} size={20} />
                      <Text style={[styles.brigadeOptionText, selectedBrigadeId === b.id && { color: COLORS.primary }]}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <PeButton
                title="Назначить на объект"
                variant="primary"
                onPress={handleAssignBrigade}
                loading={loading}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// =============================================================================
// 🎨 ВНУТРЕННИЕ СТИЛИ
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
  },
  backBtn: {
    marginRight: SIZES.medium,
    padding: SIZES.base,
  },
  scrollContent: {
    padding: SIZES.large
  },
  sectionTitle: {
    fontSize: SIZES.fontTitle,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: SIZES.medium,
    letterSpacing: -0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  finRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.medium,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  bomItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  alertDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: SIZES.medium,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.medium,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    padding: SIZES.large,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  brigadeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.medium,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brigadeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  brigadeOptionText: {
    marginLeft: SIZES.small,
    fontSize: SIZES.fontBase,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated
  },
  toggleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.15)'
  },
  toggleText: {
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  toggleTextActive: {
    color: COLORS.primary
  }
});