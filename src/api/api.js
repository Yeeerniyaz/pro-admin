/**
 * @file src/api/api.js
 * @description Mobile API Client (React Native ERP Middleware v11.0.0).
 * Обеспечивает строгую типизацию HTTP-запросов к продакшен-серверу ProElectric.
 * ДОБАВЛЕНО: Контроль таймаутов (AbortController), умное логирование, защита от зависаний.
 *
 * @module MobileAPI
 */

// 🔥 Enterprise-стандарт: боевой сервер
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://erp.yeee.kz/api";
const TIMEOUT_MS = 15000; // 15 секунд на ответ, иначе отмена запроса

/**
 * Универсальная обертка для HTTP-запросов с поддержкой таймаутов.
 * Нативно поддерживает Cookie-сессии (credentials: "include").
 *
 * @param {string} endpoint - Путь (например, '/orders')
 * @param {Object} options - Настройки Fetch (method, body, headers)
 * @returns {Promise<any>}
 */
async function fetchWrapper(endpoint, options = {}) {
  options.credentials = "include"; // Обязательно для передачи Cookie сессии
  options.headers = options.headers || {};
  options.headers["Accept"] = "application/json";

  // Автоматическая установка Content-Type
  if (!(options.body instanceof FormData) && options.body) {
    options.headers["Content-Type"] = "application/json";
  }

  // Контроллер для прерывания зависших запросов (Timeout Guard)
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  options.signal = controller.signal;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    clearTimeout(id); // Очищаем таймер, если ответ пришел вовремя

    // Безопасный парсинг ответа
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(
        data.error || data.message || `Сбой сервера: код ${response.status}`,
      );
    }
    return data;
  } catch (error) {
    clearTimeout(id);

    // Обработка таймаута
    if (error.name === "AbortError") {
      console.error(`[Mobile API 🌐] Таймаут запроса: ${endpoint}`);
      throw new Error("Сервер не отвечает. Проверьте интернет-соединение.");
    }

    console.error(
      `[Mobile API 🌐] ${options.method || "GET"} ${endpoint} -> Ошибка:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Экспорт всех методов для работы Мобильной CRM (Data Access Layer)
 */
export const API = {
  // ==========================================
  // 🔐 AUTHENTICATION
  // ==========================================
  login: (login, password) =>
    fetchWrapper("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login: login.trim(), password: password.trim() }),
    }),

  logout: () => fetchWrapper("/auth/logout", { method: "POST" }),

  checkAuth: () => fetchWrapper("/auth/check"),

  // ==========================================
  // 📊 DASHBOARD (ANALYTICS)
  // ==========================================
  getStats: () => fetchWrapper("/dashboard/stats"),

  // ==========================================
  // 📦 ORDERS MANAGEMENT
  // ==========================================
  getOrders: (status = "all", limit = 100, offset = 0) =>
    fetchWrapper(
      `/orders?status=${encodeURIComponent(status)}&limit=${limit}&offset=${offset}`,
    ),

  createManualOrder: (data) =>
    fetchWrapper("/orders", { method: "POST", body: JSON.stringify(data) }),

  updateOrderStatus: (id, status) =>
    fetchWrapper(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateOrderDetails: (id, key, value) =>
    fetchWrapper(`/orders/${id}/details`, {
      method: "PATCH",
      body: JSON.stringify({ key, value }),
    }),

  // ==========================================
  // 💸 PROJECT FINANCE (ORDER LEVEL)
  // ==========================================
  updateOrderFinalPrice: (id, newPrice) =>
    fetchWrapper(`/orders/${id}/finance/price`, {
      method: "PATCH",
      body: JSON.stringify({ newPrice }),
    }),

  addOrderExpense: (id, amount, category, comment) =>
    fetchWrapper(`/orders/${id}/finance/expense`, {
      method: "POST",
      body: JSON.stringify({ amount, category, comment: comment?.trim() }),
    }),

  // ==========================================
  // 🏢 CORPORATE FINANCE (GLOBAL CASHBOX)
  // ==========================================
  getFinanceAccounts: () => fetchWrapper("/finance/accounts"),

  getFinanceTransactions: (limit = 100) =>
    fetchWrapper(`/finance/transactions?limit=${limit}`),

  addFinanceTransaction: (data) =>
    fetchWrapper("/finance/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ==========================================
  // ⚙️ SYSTEM SETTINGS (DYNAMIC PRICING)
  // ==========================================
  getSettings: () => fetchWrapper("/settings"),

  getPricelist: () => fetchWrapper("/pricelist"),

  updateSetting: (key, value) =>
    fetchWrapper("/settings", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),

  updateBulkSettings: (payloadArray) =>
    fetchWrapper("/settings", {
      method: "POST",
      body: JSON.stringify(payloadArray),
    }),

  // ==========================================
  // 👥 STAFF & BROADCAST
  // ==========================================
  getUsers: (limit = 100, offset = 0) =>
    fetchWrapper(`/users?limit=${limit}&offset=${offset}`),

  updateUserRole: (userId, role) =>
    fetchWrapper("/users/role", {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    }),

  sendBroadcast: (text, imageUrl, targetRole) =>
    fetchWrapper("/broadcast", {
      method: "POST",
      body: JSON.stringify({
        text: text.trim(),
        imageUrl: imageUrl?.trim(),
        targetRole,
      }),
    }),
};
