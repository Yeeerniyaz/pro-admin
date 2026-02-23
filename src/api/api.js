/**
 * @file src/api/api.js
 * @description Mobile API Client (React Native ERP Middleware v12.1.0 Enterprise).
 * Обеспечивает строгую типизацию HTTP-запросов к продакшен-серверу ProElectric.
 * 🔥 ИСПРАВЛЕНО (v12.1.0): Синхронизация роута изменения ролей (PATCH /users/:id/role).
 * 🔥 ДОБАВЛЕНО: Эндпоинт для получения статистики рефералов (getReferralsStats).
 * СТРУКТУРА СЕТИ НЕ ИЗМЕНЕНА: Network Resilience, Smart Retry, FormData для фото сохранены.
 * НИКАКИХ УДАЛЕНИЙ: Обертка таймаутов (AbortController) и все старые методы сохранены на 100%.
 *
 * @module MobileAPI
 * @version 12.1.0 (Full Backend Sync Edition)
 */

// 🔥 Enterprise-стандарт: боевой сервер
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://erp.yeee.kz/api";
const TIMEOUT_MS = 15000; // 15 секунд на ответ, иначе отмена запроса

/**
 * Умный сборщик параметров запроса (Query String Builder).
 * Игнорирует пустые значения (null, undefined, "").
 * @param {Object} params - Объект с параметрами { startDate: '2023-01-01', limit: 100 }
 * @returns {string} - Сформированная строка '?startDate=2023-01-01&limit=100'
 */
const buildQuery = (params) => {
  const query = new URLSearchParams();
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      query.append(key, params[key]);
    }
  }
  const str = query.toString();
  return str ? `?${str}` : "";
};

/**
 * Универсальная обертка для HTTP-запросов с поддержкой таймаутов и Retry-механизмом.
 * Нативно поддерживает Cookie-сессии (credentials: "include") и загрузку файлов (FormData).
 *
 * @param {string} endpoint - Путь (например, '/orders')
 * @param {Object} options - Настройки Fetch (method, body, headers)
 * @param {number} retries - Количество повторных попыток при обрыве сети (по умолчанию 1)
 * @returns {Promise<any>}
 */
async function fetchWrapper(endpoint, options = {}, retries = 1) {
  options.credentials = "include"; // Обязательно для передачи Cookie сессии
  options.headers = options.headers || {};
  options.headers["Accept"] = "application/json";

  // Автоматическая установка Content-Type (если это не файл/картинка)
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

    // 🔥 SMART RETRY (NETWORK RESILIENCE)
    // Повторяем только безопасные GET-запросы при обрыве сети (чтобы не продублировать чек или заказ)
    const isGetRequest = !options.method || options.method.toUpperCase() === 'GET';
    if (isGetRequest && retries > 0 && (error.name === "AbortError" || error.message.includes("Network"))) {
      console.warn(`[Mobile API 🔄] Обрыв связи. Повторная попытка (${retries} осталось): ${endpoint}`);
      // Ждем 1 секунду перед повторной попыткой
      await new Promise(res => setTimeout(res, 1000));
      return fetchWrapper(endpoint, options, retries - 1);
    }

    // Обработка таймаута
    if (error.name === "AbortError") {
      console.error(`[Mobile API 🌐] Таймаут запроса: ${endpoint}`);
      throw new Error("Сервер не отвечает. Проверьте интернет-соединение на объекте.");
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
  // 🔐 AUTHENTICATION & OTP
  // ==========================================

  // Legacy login
  login: (login, password) =>
    fetchWrapper("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login: login.trim(), password: password.trim() }),
    }),

  // OTP Авторизация по номеру телефона
  requestOtp: (phone) =>
    fetchWrapper("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone, otp) =>
    fetchWrapper("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    }),

  logout: () => fetchWrapper("/auth/logout", { method: "POST" }),

  // Проверка сессии 
  checkAuth: () => fetchWrapper("/auth/me"),

  // ==========================================
  // 📊 DASHBOARD & ADVANCED ANALYTICS
  // ==========================================

  getStats: (startDate, endDate) =>
    fetchWrapper(`/dashboard/stats${buildQuery({ startDate, endDate })}`),

  getDeepAnalytics: (startDate, endDate) =>
    fetchWrapper(`/analytics/deep${buildQuery({ startDate, endDate })}`),

  getTimeline: (startDate, endDate) =>
    fetchWrapper(`/analytics/timeline${buildQuery({ startDate, endDate })}`),

  getOrdersTimeline: (startDate, endDate) =>
    fetchWrapper(`/analytics/orders-timeline${buildQuery({ startDate, endDate })}`),

  getBrigadesAnalytics: (startDate, endDate) =>
    fetchWrapper(`/analytics/brigades${buildQuery({ startDate, endDate })}`),

  // ==========================================
  // 🏗 BRIGADES MANAGEMENT (ERP)
  // ==========================================
  getBrigades: () => fetchWrapper("/brigades"),

  createBrigade: (name, brigadierId, profitPercentage) =>
    fetchWrapper("/brigades", {
      method: "POST",
      body: JSON.stringify({ name, brigadierId, profitPercentage }),
    }),

  updateBrigade: (id, profitPercentage, isActive) =>
    fetchWrapper(`/brigades/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ profitPercentage, isActive }),
    }),

  getBrigadeOrders: (id) => fetchWrapper(`/brigades/${id}/orders`),

  // ==========================================
  // 📦 ORDERS MANAGEMENT
  // ==========================================

  getOrders: (status = "all", limit = 100, offset = 0) =>
    fetchWrapper(`/orders${buildQuery({ status, limit, offset })}`),

  // 🔥 НОВОЕ: Deep Fetch заказа
  getOrderById: (id) => fetchWrapper(`/orders/${id}`),

  createManualOrder: (data) =>
    fetchWrapper("/orders", { method: "POST", body: JSON.stringify(data) }),

  // 🔥 НОВОЕ: Архивация (Soft Delete) заказа
  deleteOrder: (id) => fetchWrapper(`/orders/${id}`, { method: "DELETE" }),

  takeOrderWeb: (id) => fetchWrapper(`/orders/${id}/take`, { method: "POST" }),

  updateOrderMetadata: (id, address, admin_comment) =>
    fetchWrapper(`/orders/${id}/metadata`, {
      method: "PATCH",
      body: JSON.stringify({ address, admin_comment }),
    }),

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

  assignBrigade: (id, brigadeId) =>
    fetchWrapper(`/orders/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ brigadeId }),
    }),

  updateBOM: (id, newBomArray) =>
    fetchWrapper(`/orders/${id}/bom`, {
      method: "PATCH",
      body: JSON.stringify({ newBomArray }),
    }),

  finalizeOrder: (id) =>
    fetchWrapper(`/orders/${id}/finalize`, { method: "POST" }),

  // ==========================================
  // 🔧 MINOR REPAIRS & CALL REQUESTS (МЕЛКИЙ РЕМОНТ И ЗВОНКИ)
  // ==========================================

  getMinorRepairs: (limit = 100, offset = 0) =>
    fetchWrapper(`/minor-repairs${buildQuery({ limit, offset })}`),

  updateMinorRepairStatus: (id, status) =>
    fetchWrapper(`/minor-repairs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getCallRequests: (limit = 100, offset = 0) =>
    fetchWrapper(`/call-requests${buildQuery({ limit, offset })}`),

  updateCallRequestStatus: (id, status) =>
    fetchWrapper(`/call-requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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
    fetchWrapper(`/finance/transactions${buildQuery({ limit })}`),

  addFinanceTransaction: (data) =>
    fetchWrapper("/finance/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  approveIncassation: (brigadierId, amount) =>
    fetchWrapper("/finance/incassation/approve", {
      method: "POST",
      body: JSON.stringify({ brigadierId, amount }),
    }),

  // 🔥 НОВОЕ: Экспорт транзакций
  exportFinanceTransactions: () => fetchWrapper("/finance/export"),

  // ==========================================
  // ⚙️ SYSTEM SETTINGS & HYBRID CALCULATOR (v12)
  // ==========================================

  // 🔥 НОВОЕ: Мониторинг здоровья системы
  getSystemHealth: () => fetchWrapper("/system/health"),

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

  downloadBackup: () => fetchWrapper("/system/backup"),

  // 🔥 v12: Эндпоинты для управления гибридным калькулятором
  updateGlobalSettings: (key, value) =>
    fetchWrapper("/settings/global", {
      method: "PATCH",
      body: JSON.stringify({ key, value }),
    }),

  updateTariffs: (propertyType, basePriceSqm) =>
    fetchWrapper("/settings/tariffs", {
      method: "PATCH",
      body: JSON.stringify({ propertyType, basePriceSqm }),
    }),

  updateCoefficients: (code, multiplier) =>
    fetchWrapper("/settings/coefficients", {
      method: "PATCH",
      body: JSON.stringify({ code, multiplier }),
    }),

  // ==========================================
  // 👥 STAFF, CRM & BROADCAST
  // ==========================================

  getUsers: (search = "", limit = 100, offset = 0) =>
    fetchWrapper(`/users${buildQuery({ search, limit, offset })}`),

  // 🔥 ИСПРАВЛЕНИЕ: Обновлен роут для изменения ролей под новый бэкенд
  updateUserRole: (userId, role) =>
    fetchWrapper(`/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
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

  // 🔥 ДОБАВЛЕНО: Статистика рефералов
  getReferralsStats: () => fetchWrapper("/referrals/stats"),

  // ==========================================
  // 🔥 ECOSYSTEM: PHOTOS & SMART HOME
  // ==========================================

  getOrderPhotos: (orderId) =>
    fetchWrapper(`/orders/${orderId}/photos`),

  /**
   * Загрузка фотоотчета (Контроль качества) через FormData
   */
  uploadOrderPhoto: (orderId, photoUri, photoType = 'general') => {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      name: `photo_${orderId}_${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
    formData.append('photoType', photoType);

    return fetchWrapper(`/orders/${orderId}/photos`, {
      method: 'POST',
      body: formData, // fetchWrapper автоматически уберет Content-Type для FormData
    });
  },

  updateEcosystemFlags: (id, isEmergency, hasSmartHome) =>
    fetchWrapper(`/orders/${id}/ecosystem`, {
      method: "PATCH",
      body: JSON.stringify({ isEmergency, hasSmartHome }),
    }),
};