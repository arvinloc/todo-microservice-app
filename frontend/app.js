(() => {
  "use strict";

  const { AUTH_URL, TODO_URL } = window.APP_CONFIG;

  /* ------------------------------------------------------------------ *
   *  Хранилище сессии
   * ------------------------------------------------------------------ */
  const TOKEN_KEY = "todo.token";
  const EMAIL_KEY = "todo.email";

  const session = {
    get token() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
    get email() { try { return localStorage.getItem(EMAIL_KEY) || ""; } catch { return ""; } },
    save(token, email) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EMAIL_KEY, email);
      } catch { /* приватный режим */ }
    },
    clear() {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
      } catch { /* noop */ }
    },
  };

  /* ------------------------------------------------------------------ *
   *  Утилиты
   * ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "class") node.className = value;
      else if (key === "html") node.innerHTML = value; // только для статичных иконок
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }

  function toast(message, type = "info") {
    const node = el("div", { class: `toast${type === "error" ? " is-error" : ""}`, text: message });
    $("#toasts").append(node);
    setTimeout(() => {
      node.style.transition = "opacity .25s";
      node.style.opacity = "0";
      setTimeout(() => node.remove(), 260);
    }, 3200);
  }

  function setLoading(button, loading) {
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
  }

  function showError(node, message) {
    node.textContent = message || "";
    node.hidden = !message;
  }

  /* ------------------------------------------------------------------ *
   *  API-клиент
   * ------------------------------------------------------------------ */
  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }

  const KNOWN_ERRORS = {
    "this user already exists": "Пользователь с таким email уже существует",
    "user not found": "Пользователь не найден — проверьте email или зарегистрируйтесь",
    "Something went wrong": "Что-то пошло не так. Попробуйте ещё раз",
    "token is expired": "Сессия истекла, войдите снова",
    "invalid authorization credentials": "Недействительный токен, войдите снова",
    "token is invalid": "Недействительный токен, войдите снова",
  };

  function extractMessage(data, status) {
    const detail = data && data.detail;
    if (typeof detail === "string") return KNOWN_ERRORS[detail] || detail;
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0];
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
      if (field === "email") return "Введите корректный email";
      if (field === "title") return "Название должно быть от 1 до 255 символов";
      if (field === "description") return "Описание должно быть от 1 до 255 символов";
      return first.msg || "Проверьте введённые данные";
    }
    return `Ошибка запроса (${status})`;
  }

  async function request(base, path, { method = "GET", body, auth = false } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) headers["Authorization"] = `Bearer ${session.token}`;

    let response;
    try {
      response = await fetch(base + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError("Сервер недоступен. Проверьте, что сервисы запущены и настроен CORS", 0);
    }

    if (response.status === 401 && auth) {
      logout("Сессия истекла, войдите снова");
      throw new ApiError("Сессия истекла", 401);
    }

    if (response.status === 204) return null;

    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(extractMessage(data, response.status), response.status);
    return data;
  }

  const api = {
    signup: (email, password) => request(AUTH_URL, "/signup", { method: "POST", body: { email, password } }),
    signin: (email, password) => request(AUTH_URL, "/signin", { method: "POST", body: { email, password } }),
    list: () => request(TODO_URL, "/", { auth: true }),
    create: (todo) => request(TODO_URL, "/", { method: "POST", body: todo, auth: true }),
    update: (id, todo) => request(TODO_URL, `/${id}`, { method: "PATCH", body: todo, auth: true }),
    remove: (id) => request(TODO_URL, `/${id}`, { method: "DELETE", auth: true }),
  };

  /* ------------------------------------------------------------------ *
   *  Авторизация
   * ------------------------------------------------------------------ */
  let expiryTimer = null;

  function tokenExpiry(token) {
    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(decodeURIComponent(escape(atob(payload))));
      return typeof json.exp === "number" ? json.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    const exp = session.token ? tokenExpiry(session.token) : null;
    if (!exp) return;
    const delay = exp - Date.now();
    if (delay <= 0) return logout("Сессия истекла, войдите снова");
    // setTimeout ограничен ~24.8 днями, токен живёт 15 минут, но на всякий случай
    expiryTimer = setTimeout(() => logout("Сессия истекла, войдите снова"), Math.min(delay, 2 ** 31 - 1));
  }

  function logout(message) {
    clearTimeout(expiryTimer);
    session.clear();
    state.todos = [];
    render();
    showView();
    if (message) toast(message, "error");
  }

  let authMode = "signin";

  function setAuthMode(mode) {
    authMode = mode;
    const signin = mode === "signin";
    $$(".tab").forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    $("#auth-title").textContent = signin ? "С возвращением" : "Создать аккаунт";
    $("#auth-subtitle").textContent = signin
      ? "Войдите, чтобы увидеть свои задачи."
      : "Зарегистрируйтесь, чтобы начать вести задачи.";
    $("#auth-submit").textContent = signin ? "Войти" : "Зарегистрироваться";
    $("#auth-password").autocomplete = signin ? "current-password" : "new-password";
    showError($("#auth-error"), "");
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const emailInput = $("#auth-email");
    const passwordInput = $("#auth-password");
    const errorNode = $("#auth-error");
    const button = $("#auth-submit");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    emailInput.classList.remove("is-invalid");
    passwordInput.classList.remove("is-invalid");
    showError(errorNode, "");

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      emailInput.classList.add("is-invalid");
      return showError(errorNode, "Введите корректный email");
    }
    if (!password) {
      passwordInput.classList.add("is-invalid");
      return showError(errorNode, "Введите пароль");
    }

    setLoading(button, true);
    try {
      if (authMode === "signup") {
        await api.signup(email, password);
        toast("Аккаунт создан");
      }
      const { access_token } = await api.signin(email, password);
      session.save(access_token, email);
      passwordInput.value = "";
      scheduleExpiry();
      showView();
      loadTodos();
    } catch (error) {
      showError(errorNode, error.message);
    } finally {
      setLoading(button, false);
    }
  }

  /* ------------------------------------------------------------------ *
   *  Задачи
   * ------------------------------------------------------------------ */
  const state = {
    todos: [],
    filter: "all",
    editingId: null,
    loading: false,
  };

  function showView() {
    const authed = Boolean(session.token);
    $("#view-auth").hidden = authed;
    $("#view-todos").hidden = !authed;
    $("#session").hidden = !authed;
    $("#session-email").textContent = session.email;
    if (!authed) $("#auth-email").focus({ preventScroll: true });
  }

  async function loadTodos() {
    state.loading = true;
    render();
    try {
      state.todos = await api.list();
    } catch (error) {
      if (error.status !== 401) toast(error.message, "error");
    } finally {
      state.loading = false;
      render();
    }
  }

  function visibleTodos() {
    if (state.filter === "active") return state.todos.filter((t) => !t.completed);
    if (state.filter === "done") return state.todos.filter((t) => t.completed);
    return state.todos;
  }

  function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function renderCounter() {
    const total = state.todos.length;
    const left = state.todos.filter((t) => !t.completed).length;
    $("#todo-counter").textContent = total === 0
      ? "Здесь появятся ваши задачи"
      : left === 0
        ? "Всё готово 🎉"
        : `${left} ${pluralize(left, "задача осталась", "задачи осталось", "задач осталось")}`;
  }

  function renderEmpty(items) {
    const empty = $("#todo-empty");
    const show = !state.loading && items.length === 0;
    empty.hidden = !show;
    if (!show) return;

    if (state.todos.length === 0) {
      $("#empty-title").textContent = "Пока пусто";
      $("#empty-text").textContent = "Добавьте первую задачу выше.";
    } else {
      $("#empty-title").textContent = state.filter === "done" ? "Нет выполненных задач" : "Нет активных задач";
      $("#empty-text").textContent = "Смените фильтр, чтобы увидеть остальные.";
    }
  }

  function renderTodo(todo) {
    if (state.editingId === todo.id) return renderEditor(todo);

    const check = el("button", {
      class: "check",
      type: "button",
      "aria-label": todo.completed ? "Отметить невыполненной" : "Отметить выполненной",
      "aria-pressed": String(todo.completed),
      html: ICONS.check,
      onclick: () => toggleTodo(todo),
    });

    const actions = el("div", { class: "todo-actions" }, [
      el("button", {
        class: "icon-btn", type: "button", "aria-label": "Редактировать", title: "Редактировать",
        html: ICONS.edit,
        onclick: () => { state.editingId = todo.id; render(); },
      }),
      el("button", {
        class: "icon-btn danger", type: "button", "aria-label": "Удалить", title: "Удалить",
        html: ICONS.trash,
        onclick: (e) => deleteTodo(todo, e.currentTarget.closest(".todo")),
      }),
    ]);

    return el("li", { class: `todo${todo.completed ? " is-done" : ""}`, "data-id": todo.id }, [
      check,
      el("div", { class: "todo-body" }, [
        el("p", { class: "todo-title", text: todo.title }),
        el("p", { class: "todo-desc", text: todo.description }),
      ]),
      actions,
    ]);
  }

  function renderEditor(todo) {
    const title = el("input", { class: "input", value: todo.title, maxlength: "255", "aria-label": "Название" });
    const desc = el("input", { class: "input", value: todo.description, maxlength: "255", "aria-label": "Описание" });
    const error = el("p", { class: "form-error", role: "alert", hidden: "" });
    const save = el("button", { class: "btn btn-primary btn-sm", type: "submit", text: "Сохранить" });
    const cancel = el("button", {
      class: "btn btn-ghost btn-sm", type: "button", text: "Отмена",
      onclick: () => { state.editingId = null; render(); },
    });

    const form = el("form", { class: "todo-edit", novalidate: "" }, [
      title, desc, error,
      el("div", { class: "todo-edit-actions" }, [cancel, save]),
    ]);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nextTitle = title.value.trim();
      const nextDesc = desc.value.trim();
      if (!nextTitle || !nextDesc) {
        return showError(error, "Заполните название и описание");
      }
      setLoading(save, true);
      try {
        const updated = await api.update(todo.id, {
          title: nextTitle, description: nextDesc, completed: todo.completed,
        });
        replaceTodo(updated);
        state.editingId = null;
        render();
      } catch (err) {
        if (err.status !== 401) showError(error, err.message);
      } finally {
        setLoading(save, false);
      }
    });

    form.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { state.editingId = null; render(); }
    });

    queueMicrotask(() => title.focus());
    return el("li", { class: "todo", "data-id": todo.id }, [form]);
  }

  function render() {
    renderCounter();
    $$(".chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.filter === state.filter));

    const list = $("#todo-list");
    const items = visibleTodos();
    $("#todo-skeleton").hidden = !state.loading;
    list.hidden = state.loading;
    list.replaceChildren(...(state.loading ? [] : items.map(renderTodo)));
    renderEmpty(items);
  }

  function replaceTodo(updated) {
    state.todos = state.todos.map((t) => (t.id === updated.id ? updated : t));
  }

  async function toggleTodo(todo) {
    const previous = todo.completed;
    // оптимистичное обновление
    replaceTodo({ ...todo, completed: !previous });
    render();
    try {
      const updated = await api.update(todo.id, {
        title: todo.title, description: todo.description, completed: !previous,
      });
      replaceTodo(updated);
    } catch (error) {
      replaceTodo({ ...todo, completed: previous });
      if (error.status !== 401) toast(error.message, "error");
    }
    render();
  }

  async function deleteTodo(todo, node) {
    try {
      await api.remove(todo.id);
      if (node) {
        node.classList.add("is-leaving");
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      state.todos = state.todos.filter((t) => t.id !== todo.id);
      render();
    } catch (error) {
      if (error.status !== 401) toast(error.message, "error");
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const titleInput = $("#todo-title");
    const descInput = $("#todo-desc");
    const errorNode = $("#todo-error");
    const button = $("#todo-add");

    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    showError(errorNode, "");
    if (!title) { titleInput.focus(); return showError(errorNode, "Введите название"); }
    if (!description) { descInput.focus(); return showError(errorNode, "Введите описание"); }

    setLoading(button, true);
    try {
      const created = await api.create({ title, description, completed: false });
      state.todos = [created, ...state.todos];
      titleInput.value = "";
      descInput.value = "";
      titleInput.focus();
      render();
    } catch (error) {
      if (error.status !== 401) showError(errorNode, error.message);
    } finally {
      setLoading(button, false);
    }
  }

  /* ------------------------------------------------------------------ *
   *  Инициализация
   * ------------------------------------------------------------------ */
  function init() {
    $$(".tab").forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.mode)));
    $("#auth-form").addEventListener("submit", handleAuthSubmit);
    $("#todo-form").addEventListener("submit", handleCreate);
    $("#logout-btn").addEventListener("click", () => logout());
    $$(".chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        state.filter = chip.dataset.filter;
        render();
      })
    );

    showView();
    if (session.token) {
      scheduleExpiry();
      if (session.token) loadTodos();
    }
    render();
  }

  init();
})();