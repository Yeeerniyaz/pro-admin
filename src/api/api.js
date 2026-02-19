/**
 * @file src/api/api.js
 * @description Mobile API Client (React Native ERP Middleware v10.0.0).
 * Обеспечивает строгую типизацию HTTP-запросов к продакшен-серверу ProElectric.
 * Включает защиту от обрывов сети, безопасный парсинг ответов и ENV-конфигурацию.
 *
 * @module MobileAPI
 * @version 10.0.0 (Enterprise Mobile Finance Edition)
 */

// 🔥 Enterprise-стандарт: берем URL из переменных окружения Expo, либо используем боевой фоллбэк
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://erp.yeee.kz/api";

/**
 * Универсальная обертка для HTTP-запросов (Mobile Fetch Wrapper).
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

  // Автоматическая установка Content-Type, если это не отправка файлов (FormData)
  if (!(options.body instanceof FormData) && options.body) {
    options.headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    // Безопасный парсинг ответа (защита от краша при пустом теле ответа сервера)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      // Пробрасываем детализированную ошибку для UI мобильного приложения
      throw new Error(
        data.error || data.message || `Ошибка сервера: ${response.status}`,
      );
    }
    return data;
  } catch (error) {
    // Детальное логирование для терминала Expo / React Native Debugger
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
      body: JSON.stringify({ login, password }),
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

  // URL Encode защищает от спецсимволов в строке запроса
  getOrders: (status = "all", limit = 100, offset = 0) =>
    fetchWrapper(
      `/orders?status=${encodeURIComponent(status)}&limit=${limit}&offset=${offset}`,
    ),

  /**
   * Создание оффлайн-лида вручную (Без бота, прямо с телефона)
   */
  createManualOrder: (data) =>
    fetchWrapper("/orders", { method: "POST", body: JSON.stringify(data) }),

  updateOrderStatus: (id, status) =>
    fetchWrapper(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /**
   * Универсальное обновление деталей (BOM-массив, адрес, комментарий)
   */
  updateOrderDetails: (id, key, value) =>
    fetchWrapper(`/orders/${id}/details`, {
      method: "PATCH",
      body: JSON.stringify({ key, value }),
    }),

  // ==========================================
  // 💸 PROJECT FINANCE (ORDER LEVEL)
  // ==========================================

  /**
   * Переопределение итоговой цены для клиента
   */
  updateOrderFinalPrice: (id, newPrice) =>
    fetchWrapper(`/orders/${id}/finance/price`, {
      method: "PATCH",
      body: JSON.stringify({ newPrice }),
    }),

  /**
   * Добавление расхода к объекту (Материалы, Такси, Инструмент за счет проекта)
   */
  addOrderExpense: (id, amount, category, comment) =>
    fetchWrapper(`/orders/${id}/finance/expense`, {
      method: "POST",
      body: JSON.stringify({ amount, category, comment }),
    }),

  // ==========================================
  // 🏢 CORPORATE FINANCE (GLOBAL CASHBOX v10.0)
  // ==========================================

  /**
   * Получение списка всех счетов (касс) компании и их балансов
   */
  getFinanceAccounts: () => fetchWrapper("/finance/accounts"),

  /**
   * Получение истории глобальных транзакций компании
   * @param {number} limit - Количество последних записей
   */
  getFinanceTransactions: (limit = 100) =>
    fetchWrapper(`/finance/transactions?limit=${limit}`),

  /**
   * Проведение новой финансовой операции по компании (Доход/Расход)
   * @param {Object} data - { accountId, amount, type ('income'|'expense'), category, comment }
   */
  addFinanceTransaction: (data) =>
    fetchWrapper("/finance/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ==========================================
  // ⚙️ SYSTEM SETTINGS (DYNAMIC PRICING)
  // ==========================================
  getSettings: () => fetchWrapper("/settings"),

  /**
   * Получение структурированного прайс-листа по категориям
   */
  getPricelist: () => fetchWrapper("/pricelist"),

  updateSetting: (key, value) =>
    fetchWrapper("/settings", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),

  /**
   * Массовое обновление настроек (Bulk Update) за одну транзакцию
   */
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
      body: JSON.stringify({ text, imageUrl, targetRole }),
    }),
};
