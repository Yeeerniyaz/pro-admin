/**
 * @file src/api/api.js
 * @description Клиент API для подключения к боевому серверу ProElectric (erp.yeee.kz).
 * * ARCHITECT NOTES:
 * - Base URL: https://erp.yeee.kz
 * - Auth Strategy: Cookie-based Session (Express + Passport).
 * - Data Mapping: Конвертация camelCase (App) <-> snake_case (DB/API).
 * - Missing Endpoints: Финансы и Рассылки пока заглушены (Stubs), так как их нет в backend-коде.
 *
 * @module API
 */

// Базовый адрес вашего сервера
const BASE_URL = "https://erp.yeee.kz";

/**
 * Универсальная функция запроса.
 * Автоматически обрабатывает куки (credentials: 'include') и ошибки.
 */
const request = async (endpoint, method = "GET", body = null) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const config = {
    method,
    headers,
    credentials: "include", // ВАЖНО: Позволяет передавать connect.sid куки
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    // Логируем запросы для отладки
    console.log(`[API Request] ${method} ${BASE_URL}${endpoint}`);

    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Обработка потери сессии (401 Unauthorized)
    if (response.status === 401) {
      throw new Error("Сессия истекла. Требуется повторный вход.");
    }

    // Если сервер вернул пустое тело (например, при 204 No Content)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `Ошибка сервера: ${response.status}`,
      );
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
};

export const API = {
  // ===========================================================================
  // 🔐 АВТОРИЗАЦИЯ (Passport.js Local Strategy)
  // ===========================================================================

  login: async (email, password) => {
    // Passport ожидает поля 'username' и 'password'
    // Сервер возвращает объект пользователя при успехе
    const response = await request("/login", "POST", {
      username: email, // Маппинг email -> username
      password: password,
    });

    // Бэкенд возвращает пользователя, но нам нужно привести его к формату для Context
    return mapUserFromApi(response);
  },

  logout: async () => {
    // Passport logout обычно делается через GET или POST
    return request("/logout", "GET");
  },

  checkAuth: async () => {
    // Эндпоинт для проверки текущей сессии
    const response = await request("/api/user", "GET");
    return mapUserFromApi(response);
  },

  // ===========================================================================
  // 📦 ЗАКАЗЫ (ORDERS)
  // ===========================================================================

  getOrders: async (statusFilter = "all", limit = 20, offset = 0) => {
    // Передаем параметры фильтрации, если бэк их поддерживает
    // В app.js: app.get('/api/orders', ...)
    let url = `/api/orders?limit=${limit}&offset=${offset}`;
    if (statusFilter !== "all") {
      url += `&status=${statusFilter}`;
    }

    const orders = await request(url, "GET");

    // Маппинг snake_case (DB) -> camelCase (App)
    return orders.map(mapOrderFromApi);
  },

  getOrderDetails: async (id) => {
    const order = await request(`/api/orders/${id}`, "GET");
    return mapOrderFromApi(order);
  },

  createManualOrder: async (data) => {
    // Маппинг данных формы в формат, ожидаемый сервером (Postgres columns)
    const payload = {
      client_name: data.clientName,
      client_phone: data.clientPhone,
      address: data.address,
      area: parseInt(data.area),
      rooms: parseInt(data.rooms),
      wall_type: data.wallType,
      comment: data.comment,
      // Дополнительные поля, если нужны
      status: "new",
    };

    const response = await request("/api/orders", "POST", payload);
    return mapOrderFromApi(response);
  },

  updateOrderStatus: async (id, status) => {
    // В app.js: app.put('/api/orders/:id/status')
    const response = await request(`/api/orders/${id}/status`, "PUT", {
      status,
    });
    return mapOrderFromApi(response);
  },

  // Эти методы пока не реализованы на бэкенде в предоставленном коде.
  // Оставляем их рабочими (без ошибок), но без реального сохранения,
  // чтобы UI не ломался.
  updateOrderFinalPrice: async (id, newPrice) => {
    console.warn("API: updateOrderFinalPrice not implemented on backend");
    return {
      final_price: newPrice,
      net_profit: newPrice,
      total_expenses: 0,
      expenses: [],
    };
  },

  addOrderExpense: async (id, amount, category, comment) => {
    console.warn("API: addOrderExpense not implemented on backend");
    return {
      final_price: 0,
      net_profit: -amount,
      total_expenses: amount,
      expenses: [{ amount, category, comment, date: new Date().toISOString() }],
    };
  },

  // ===========================================================================
  // 👥 ПОЛЬЗОВАТЕЛИ (USERS)
  // ===========================================================================

  getUsers: async (limit = 100, offset = 0) => {
    // В app.js: app.get('/api/users')
    const users = await request("/api/users", "GET");
    return users.map(mapUserFromApi);
  },

  updateUserRole: async (telegramId, newRole) => {
    // В app.js: app.post('/api/users/:id/role')
    // Важно: telegramId здесь используется как идентификатор в URL
    const response = await request(`/api/users/${telegramId}/role`, "POST", {
      role: newRole,
    });
    return mapUserFromApi(response);
  },

  // ===========================================================================
  // 💸 ФИНАНСЫ (FINANCE) - STUBS
  // ===========================================================================
  // На сервере erp.yeee.kz в файле src/app.js НЕТ роутов /finance.
  // Возвращаем пустые заглушки, чтобы экран FinanceScreen открывался.

  getFinanceAccounts: async () => {
    // Заглушка
    return [
      {
        id: 1,
        name: "Основной счет (Сервер не готов)",
        type: "cash",
        balance: 0,
      },
    ];
  },

  getFinanceTransactions: async (limit = 50) => {
    // Заглушка
    return [];
  },

  addFinanceTransaction: async (data) => {
    // Заглушка
    console.warn("API: Finance not implemented on backend");
    return { id: Math.random(), ...data, created_at: new Date().toISOString() };
  },

  // ===========================================================================
  // 📡 РАССЫЛКИ (BROADCAST) - STUBS
  // ===========================================================================
  // На сервере erp.yeee.kz в файле src/app.js НЕТ роутов /broadcast.

  getBroadcastHistory: async () => {
    return [];
  },

  sendBroadcast: async (data) => {
    // Если бы был эндпоинт, это выглядело бы так:
    // return request('/api/broadcast', 'POST', data);
    console.warn("API: Broadcast not implemented on backend");
    return { success: true };
  },
};

// =============================================================================
// 🔄 HELPERS: DATA MAPPING
// =============================================================================

/**
 * Преобразует пользователя из формата API (snake_case) в App (camelCase)
 */
const mapUserFromApi = (data) => {
  if (!data) return null;
  return {
    telegram_id: data.telegram_id || data.id, // ID может быть разным
    username: data.username,
    first_name: data.first_name || data.name,
    role: data.role,
    phone: data.phone_number || data.phone, // Postgres field vs App field
  };
};

/**
 * Преобразует заказ из формата API (Postgres) в App
 */
const mapOrderFromApi = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    client_name: data.client_name, // DB column
    client_phone: data.client_phone, // DB column
    address: data.address,
    area: data.area,
    total_price: data.total_price || 0,
    created_at: data.created_at,
    // Конструируем объект details, который ждет UI
    details: {
      financials: {
        final_price: data.total_price || 0,
        total_expenses: 0, // На бэке пока нет учета расходов
        net_profit: data.total_price || 0,
        expenses: [],
      },
      bom: [], // На бэке пока нет BOM
      params: {
        wallType: data.wall_type, // DB column
        rooms: data.rooms,
        comment: data.description || data.comment, // DB column
      },
    },
  };
};
