/**
 * @file src/api/api.js
 * @description Единый слой доступа к данным API (Mobile Client v17.0.0 Enterprise).
 * 🔥 АРХИТЕКТУРНОЕ ОБНОВЛЕНИЕ (v17.0.0): Полная синхронизация с новыми роутами бэкенда.
 * - Убраны устаревшие префиксы `/mobile/`.
 * - Роуты аналитики переведены на `/analytics`.
 * - Добавлены методы для загрузки Настроек и Прайс-листа (Фикс ошибки pricelist.map).
 * - Добавлены методы для создания Мелкого ремонта и Запросов звонков.
 * - Интегрировано военное шифрование сессии (expo-secure-store).
 *
 * @module API
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = 'https://erp.yeee.kz/api';

const fetchWithTimeout = async (resource, options = {}) => {
  const { timeout = 15000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw new Error(err.name === 'AbortError' ? 'Превышено время ожидания сервера' : 'Ошибка сети. Проверьте интернет.');
  }
};

class API {
  // 🔥 Чтение токена из защищенного хранилища
  static async getHeaders() {
    const cookie = await SecureStore.getItemAsync('session_cookie');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(cookie ? { 'Cookie': cookie } : {})
    };
  }

  static async handleResponse(response) {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const sessionId = setCookie.split(';')[0];
      await SecureStore.setItemAsync('session_cookie', sessionId);
    }

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('[API Parse Error] RAW Response:', text.substring(0, 300));
      throw new Error(`Сбой ответа сервера (${response.status}). Ожидался JSON, но получен HTML. Ссылка не актуальна.`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Произошла ошибка HTTP: ${response.status}`);
    }
    return data;
  }

  // ==========================================
  // 🔐 AUTHENTICATION
  // ==========================================

  static async login(username, password) {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ login: username, password }),
    });
    return this.handleResponse(response);
  }

  static async verifyOtp(phone, otp) {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: await this.getHeaders(),
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
      headers: await this.getHeaders(),
      body: JSON.stringify({ phone }),
    });
    return this.handleResponse(response);
  }

  static async logout() {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    await SecureStore.deleteItemAsync('session_cookie');
    return this.handleResponse(response);
  }

  static async registerPushToken(token) {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/push-token`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ token }),
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // 📊 DASHBOARD & ANALYTICS (ОБНОВЛЕНО!)
  // ==========================================

  static async getDashboardStats(startDate, endDate) {
    let url = `${BASE_URL}/analytics/mobile/dashboard/stats` // 🔥 Исправлено с /mobile/dashboard/stats
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetchWithTimeout(url, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async getDeepAnalytics(startDate, endDate) {
    let url = `${BASE_URL}/analytics/deep`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetchWithTimeout(url, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async getTimeline(startDate, endDate) {
    let url = `${BASE_URL}/analytics/timeline`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetchWithTimeout(url, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  // ==========================================
  // 📦 ORDERS MANAGEMENT (ОБНОВЛЕНО!)
  // ==========================================

  // 🔥 Обновлено: Запрашиваем склеенный список из модуля Аналитики (Крупные + Мелкие)
  // 🔥 Обновлено: Запрашиваем склеенный список из модуля Аналитики (Крупные + Мелкие)
  static async getOrders(status = 'all', limit = 100, offset = 0) {
    let url = `${BASE_URL}/analytics/mobile/orders?limit=${limit}&offset=${offset}`;
    if (status !== 'all') {
      url += `&status=${status}`;
    }

    const response = await fetchWithTimeout(url, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async getOrderById(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}`, { headers: await this.getHeaders() });
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

  static async saveMeasurementData(id, payload) {
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/measurement`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(payload)
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
    const response = await fetchWithTimeout(`${BASE_URL}/orders/${id}/photos`, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  // ==========================================
  // 🔧 MINOR REPAIRS (МЕЛКИЙ РЕМОНТ)
  // ==========================================

  static async getMinorRepairs() {
    const response = await fetchWithTimeout(`${BASE_URL}/minor-repairs`, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async takeMinorRepair(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/minor-repairs/${id}/take`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  static async updateMinorRepairStatus(id, status) {
    const response = await fetchWithTimeout(`${BASE_URL}/minor-repairs/${id}/status`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ status })
    });
    return this.handleResponse(response);
  }

  static async createMinorRepair(data) {
    const response = await fetchWithTimeout(`${BASE_URL}/minor-repairs`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // 📞 CALL REQUESTS (ЗВОНКИ)
  // ==========================================

  static async getCallRequests(limit = 100, offset = 0) {
    const response = await fetchWithTimeout(`${BASE_URL}/call-requests?limit=${limit}&offset=${offset}`, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async updateCallRequestStatus(id, status) {
    const response = await fetchWithTimeout(`${BASE_URL}/call-requests/${id}/status`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ status })
    });
    return this.handleResponse(response);
  }

  static async createCallRequest(data) {
    const response = await fetchWithTimeout(`${BASE_URL}/call-requests`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // ⚙️ СИСТЕМНЫЕ НАСТРОЙКИ И ПРАЙС-ЛИСТ (NEW!)
  // ==========================================

  static async getSettings() {
    const response = await fetchWithTimeout(`${BASE_URL}/settings`, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async getPricelist() {
    const response = await fetchWithTimeout(`${BASE_URL}/settings/pricelist`, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  // ==========================================
  // 👷 BRIGADES MANAGEMENT
  // ==========================================

  static async getBrigades() {
    const response = await fetchWithTimeout(`${BASE_URL}/brigades`, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async createBrigade(data) {
    const response = await fetchWithTimeout(`${BASE_URL}/brigades`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  static async updateBrigade(id, data) {
    const response = await fetchWithTimeout(`${BASE_URL}/brigades/${id}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  }

  static async deleteBrigade(id) {
    const response = await fetchWithTimeout(`${BASE_URL}/brigades/${id}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // ==========================================
  // 👥 STAFF & BROADCAST
  // ==========================================

  static async getUsers(search = "", limit = 100, offset = 0) {
    let url = `${BASE_URL}/users?limit=${limit}&offset=${offset}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const response = await fetchWithTimeout(url, { headers: await this.getHeaders() });
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
    const response = await fetchWithTimeout(`${BASE_URL}/system/broadcast`, {
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
    const response = await fetchWithTimeout(`${BASE_URL}/finance/accounts`, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async getFinanceTransactions(limit = 100) {
    const response = await fetchWithTimeout(`${BASE_URL}/finance/transactions?limit=${limit}`, { headers: await this.getHeaders() });
    return this.handleResponse(response);
  }

  static async exportFinanceTransactions() {
    const response = await fetchWithTimeout(`${BASE_URL}/finance/export`, { headers: await this.getHeaders() });
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