/**
 * @file src/api/api.js
 * @description Слой доступа к данным API (Mobile Client v13.0.1 Enterprise).
 * Обеспечивает строгую типизацию запросов к REST API сервера ProElectric.
 * 🔥 ИСПРАВЛЕНО (v13.0.1): Восстановлены ВСЕ оригинальные методы (getOrders, deleteOrder и т.д.). Ни одной строчки не удалено.
 * ДОБАВЛЕНО: Регистрация Push-токенов (registerPushToken).
 * ДОБАВЛЕНО: Маршрутизация на /api/mobile/orders для получения склеенных лидов.
 * ДОБАВЛЕНО: API для Мелкого ремонта (takeMinorRepair, updateMinorRepairStatus).
 *
 * @module API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = 'http://erp.yeee.kz/api'; // Убедитесь, что IP или домен сервера правильные

const fetchWithTimeout = async (resource, options = {}) => {
  const { timeout = 15000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
};

class API {
  static async getHeaders() {
    const cookie = await AsyncStorage.getItem('session_cookie');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {})
    };
  }

  static async handleResponse(response) {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      // Сохраняем первую куку (Обычно это proelectric.sid)
      const sessionId = setCookie.split(';')[0];
      await AsyncStorage.setItem('session_cookie', sessionId);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('Ошибка парсинга ответа от сервера');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Произошла ошибка при запросе к серверу');
    }
    return data;
  }

  // ==========================================
  // 🔐 AUTHENTICATION
  // ==========================================

  static async login(phone, otp) {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    return this.handleResponse(response);
  }

  static async checkAuth() {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/me`, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async requestOtp(phone) {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return this.handleResponse(response);
  }

  static async logout() {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    await AsyncStorage.removeItem('session_cookie');
    return this.handleResponse(response);
  }

  // 🔥 НОВОЕ: Регистрация Push-токена устройства
  static async registerPushToken(token) {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/push-token`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ token }),
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // 📊 DASHBOARD & ANALYTICS
  // ==========================================

  // 🔥 ИЗМЕНЕНО: Обращаемся к мобильному эндпоинту для учета мелкого ремонта
  static async getDashboardStats(startDate, endDate) {
    let url = `${BASE_URL}/mobile/dashboard/stats`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetchWithTimeout(url, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async getDeepAnalytics(startDate, endDate) {
    let url = `${BASE_URL}/analytics/deep`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetchWithTimeout(url, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async getTimeline(startDate, endDate) {
    let url = `${BASE_URL}/analytics/timeline`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetchWithTimeout(url, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // 📦 ORDERS MANAGEMENT
  // ==========================================

  // 🔥 ИЗМЕНЕНО: Переключено на /mobile/orders для склейки крупного и мелкого ремонта
  static async getOrders(status = 'all', limit = 100, offset = 0) {
    let url = `${BASE_URL}/mobile/orders?limit=${limit}&offset=${offset}`;
    if (status !== 'all') {
      url += `&status=${status}`;
    }

    const response = await fetchWithTimeout(url, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async getOrderById(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}`, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async takeOrder(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/take`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async updateOrderMetadata(id, address, admin_comment) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/metadata`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ address, admin_comment })
    });
    return this.handleResponse(response);
  }

  static async updateOrderBOM(id, newBomArray) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/bom`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ newBomArray })
    });
    return this.handleResponse(response);
  }

  static async updateOrderStatus(id, status) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/status`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ status })
    });
    return this.handleResponse(response);
  }

  static async updateOrderPrice(id, newPrice) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/finance/price`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ newPrice })
    });
    return this.handleResponse(response);
  }

  static async addOrderExpense(id, amount, category, comment) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/finance/expense`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ amount, category, comment })
    });
    return this.handleResponse(response);
  }

  static async finalizeOrder(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/finalize`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Восстановленные оригинальные методы:
  static async createManualOrder(data) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  static async deleteOrder(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async assignBrigade(id, brigadeId) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/assign`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ brigadeId })
    });
    return this.handleResponse(response);
  }

  static async getOrderPhotos(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/photos`, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // 🔧 MINOR REPAIRS (МЕЛКИЙ РЕМОНТ СПЕЦИФИКА)
  // ==========================================

  // 🔥 НОВОЕ: Взять мелкий ремонт в работу
  static async takeMinorRepair(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/minor-repairs/${id}/take`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // 🔥 НОВОЕ: Обновить статус мелкого ремонта
  static async updateMinorRepairStatus(id, status) {
    const response = await fetchWithTimeout(`${BASE_URL}/minor-repairs/${id}/status`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ status })
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // 👥 STAFF & BROADCAST
  // ==========================================

  static async getUsers(search = "", limit = 100, offset = 0) {
    let url = `${BASE_URL}/users?limit=${limit}&offset=${offset}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const response = await fetchWithTimeout(url, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async updateUserRole(userId, role) {
    const response = await fetchWithTimeout(`${BASE_URL}/users/${userId}/role`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ role })
    });
    return this.handleResponse(response);
  }

  static async sendBroadcast(text, imageUrl, targetRole) {
    const response = await fetchWithTimeout(`${BASE_URL}/broadcast`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ text, imageUrl, targetRole })
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // 🏢 CORPORATE FINANCE
  // ==========================================

  static async getFinanceAccounts() {
    const response = await fetchWithTimeout(`${BASE_URL}/finance/accounts`, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async getFinanceTransactions(limit = 100) {
    const response = await fetchWithTimeout(`${BASE_URL}/finance/transactions?limit=${limit}`, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async exportFinanceTransactions() {
    const response = await fetchWithTimeout(`${BASE_URL}/finance/export`, {
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async addFinanceTransaction(data) {
    const response = await fetchWithTimeout(`${BASE_URL}/finance/transactions`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  static async approveIncassation(brigadierId, amount) {
    const response = await fetchWithTimeout(`${BASE_URL}/finance/incassation/approve`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ brigadierId, amount })
    });
    return this.handleResponse(response);
  }

}

export default API;