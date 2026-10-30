/* ============================================================
   script.js — Mohanaa Krishnan Portfolio
   Responsibilities:
     1. Update footer year
     2. Theme toggle (light / dark) with localStorage persistence
   ============================================================ */

/* ---------- 1. Current year ---------- */
const yearEl = document.querySelector('#current-year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ---------- 2. Theme toggle ---------- */
(function () {
  var STORAGE_KEY = 'theme';
  var html = document.documentElement;

  /* Resolve the effective theme from html[data-theme] */
  function currentTheme() {
    return html.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  /* Persist and apply a theme */
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}

    /* Update <meta name="theme-color"> tags */
    var lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]');
    var darkMeta  = document.querySelector('meta[name="theme-color"][media*="dark"]');
    if (lightMeta && darkMeta) {
      /* The meta approach for JS toggling: swap content on the "no-media" tag */
    }
    var plainMeta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (plainMeta) {
      plainMeta.setAttribute('content', theme === 'dark' ? '#0d0d0d' : '#ffffff');
    }

    /* Sync all toggle buttons */
    var toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(function (btn) {
      var isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
      var label = btn.querySelector('.theme-toggle-label');
      if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
    });
  }

  /* Wire up every toggle button on the page */
  var toggles = document.querySelectorAll('.theme-toggle');
  toggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  });

  /* Sync initial state */
  applyTheme(currentTheme());

  /* React to OS preference change (only when no stored choice) */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) {}
    if (!stored) applyTheme(e.matches ? 'dark' : 'light');
  });
})();


/* ============================================================
   todo.js — To-Do List app
   Responsibilities:
     1. Hold all app data in a single `state` object
     2. Persist tasks + filter to window.localStorage automatically
     3. CRUD: create, read (render), update (toggle / edit), delete
     4. Filtering: All / Active / Completed
     5. Build DOM dynamically and use delegated event listeners

   Data flow:  user event -> update state -> save() -> render()
   The DOM is always rebuilt from `state`, never the other way round.
   ============================================================ */
(function () {
  'use strict';

  var TASKS_KEY  = 'todo.tasks.v1';
  var FILTER_KEY = 'todo.filter.v1';
  var FILTERS    = ['all', 'active', 'completed'];

  /* ---------- Element references ---------- */
  var form      = document.getElementById('todo-form');
  var input     = document.getElementById('todo-input');
  var errorEl   = document.getElementById('todo-error');
  var filtersEl = document.getElementById('todo-filters');
  var countEl   = document.getElementById('todo-count');
  var listEl    = document.getElementById('todo-list');
  var emptyEl   = document.getElementById('todo-empty');
  var clearBtn  = document.getElementById('todo-clear');
  var statusEl  = document.getElementById('todo-status');

  if (!form || !listEl) return; /* not the to-do page */

  /* ---------- State ---------- */
  var state = {
    tasks: [],        /* [{ id, text, completed, createdAt }] */
    filter: 'all',    /* 'all' | 'active' | 'completed' */
    editingId: null   /* id of the task being edited (not persisted) */
  };

  /* ============================================================
     Persistence (localStorage, wrapped in try/catch like the theme code)
     ============================================================ */
  function load() {
    try {
      var raw = localStorage.getItem(TASKS_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        state.tasks = parsed.filter(isValidTask);
      }
      var savedFilter = localStorage.getItem(FILTER_KEY);
      if (FILTERS.indexOf(savedFilter) !== -1) state.filter = savedFilter;
    } catch (_) {
      state.tasks = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks));
      localStorage.setItem(FILTER_KEY, state.filter);
    } catch (_) {
      /* storage blocked or full: the app keeps working for this session */
    }
  }

  /* Guard against corrupted / hand-edited storage */
  function isValidTask(t) {
    return t && typeof t.id === 'string' && typeof t.text === 'string' &&
           typeof t.completed === 'boolean';
  }

  /* ============================================================
     Helpers
     ============================================================ */
  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function findTask(id) {
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === id) return state.tasks[i];
    }
    return null;
  }

  function visibleTasks() {
    return state.tasks.filter(function (t) {
      if (state.filter === 'active') return !t.completed;
      if (state.filter === 'completed') return t.completed;
      return true;
    });
  }

  function announce(message) {
    statusEl.textContent = '';
    /* tiny delay so repeated identical messages are still announced */
    window.setTimeout(function () { statusEl.textContent = message; }, 30);
  }

  function showError(message) {
    errorEl.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  /* ============================================================
     CRUD operations (each one changes state, then saves + renders)
     ============================================================ */
  function addTask(text) {
    state.tasks.push({
      id: makeId(),
      text: text,
      completed: false,
      createdAt: Date.now()
    });
    commit();
    announce('Task added: ' + text);
  }

  function toggleTask(id) {
    var task = findTask(id);
    if (!task) return;
    task.completed = !task.completed;
    commit();
    announce(task.completed ? 'Marked complete' : 'Marked active');
  }

  function updateTask(id, text) {
    var task = findTask(id);
    if (!task) return;
    task.text = text;
    commit();
    announce('Task updated');
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
    if (state.editingId === id) state.editingId = null;
    commit();
    announce('Task deleted');
  }

  function clearCompleted() {
    var removed = state.tasks.filter(function (t) { return t.completed; }).length;
    if (!removed) return;
    state.tasks = state.tasks.filter(function (t) { return !t.completed; });
    commit();
    announce(removed + (removed === 1 ? ' completed task cleared' : ' completed tasks cleared'));
  }

  function setFilter(filter) {
    if (FILTERS.indexOf(filter) === -1) return;
    state.filter = filter;
    commit();
  }

  /* Edit mode helpers */
  function startEdit(id) {
    state.editingId = id;
    render();
    var field = listEl.querySelector('.todo-edit-input');
    if (field) { field.focus(); field.select(); }
  }

  function finishEdit(id, save_, refocus) {
    if (state.editingId !== id) return; /* already finished (guards re-entrancy) */
    var field = listEl.querySelector('.todo-edit-input');
    var next = field ? field.value.trim() : '';
    state.editingId = null;

    if (save_ && next) {
      var task = findTask(id);
      if (task && task.text !== next) { updateTask(id, next); }
      else { render(); }
    } else {
      if (save_ && !next) announce('Task text cannot be empty. Change discarded.');
      render();
    }
    if (refocus) focusAction(id, 'edit');
  }

  function focusAction(id, action) {
    var btn = listEl.querySelector('[data-id="' + id + '"] [data-action="' + action + '"]');
    if (btn) btn.focus();
  }

  function commit() {
    save();
    render();
  }

  /* ============================================================
     Rendering — build DOM nodes with createElement / textContent
     (never innerHTML, so user text can't inject markup)
     ============================================================ */
  function createItem(task) {
    var li = document.createElement('li');
    li.className = 'todo-item' + (task.completed ? ' is-completed' : '');
    li.dataset.id = task.id;

    var check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'todo-toggle';
    check.checked = task.completed;
    check.dataset.action = 'toggle';
    check.setAttribute('aria-label', 'Mark "' + task.text + '" as complete');
    li.appendChild(check);

    if (state.editingId === task.id) {
      var edit = document.createElement('input');
      edit.type = 'text';
      edit.className = 'todo-edit-input';
      edit.value = task.text;
      edit.maxLength = 200;
      edit.setAttribute('aria-label', 'Edit task');
      li.appendChild(edit);
    } else {
      var label = document.createElement('span');
      label.className = 'todo-text';
      label.dataset.action = 'edit-text';
      label.textContent = task.text;
      li.appendChild(label);

      var actions = document.createElement('div');
      actions.className = 'todo-actions';

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'todo-action';
      editBtn.dataset.action = 'edit';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit "' + task.text + '"');

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'todo-action todo-action-danger';
      delBtn.dataset.action = 'delete';
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('aria-label', 'Delete "' + task.text + '"');

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      li.appendChild(actions);
    }
    return li;
  }

  function render() {
    /* List */
    var tasks = visibleTasks();
    var fragment = document.createDocumentFragment();
    tasks.forEach(function (task) { fragment.appendChild(createItem(task)); });
    listEl.textContent = '';
    listEl.appendChild(fragment);

    /* Empty-state message */
    var emptyMsg = '';
    if (!state.tasks.length) emptyMsg = 'No tasks yet. Add your first one above.';
    else if (!tasks.length && state.filter === 'active') emptyMsg = 'Nothing active. Everything is done.';
    else if (!tasks.length && state.filter === 'completed') emptyMsg = 'No completed tasks yet.';
    emptyEl.textContent = emptyMsg;
    emptyEl.hidden = !emptyMsg;

    /* Counter */
    var activeCount = state.tasks.filter(function (t) { return !t.completed; }).length;
    countEl.textContent = activeCount + (activeCount === 1 ? ' task left' : ' tasks left');

    /* Filter buttons */
    var buttons = filtersEl.querySelectorAll('.todo-filter');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === state.filter));
    });

    /* Clear completed */
    clearBtn.disabled = !state.tasks.some(function (t) { return t.completed; });
  }

  /* ============================================================
     Events — delegated: one listener per container, not per item
     ============================================================ */

  /* Create */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) {
      showError('Please enter a task.');
      input.focus();
      return;
    }
    showError('');
    addTask(text);
    input.value = '';
    input.focus();
  });

  input.addEventListener('input', function () {
    if (errorEl.textContent) showError('');
  });

  /* Update (toggle) — "change" fires for checkboxes on click and Space */
  listEl.addEventListener('change', function (e) {
    var target = e.target;
    if (target.dataset.action !== 'toggle') return;
    var li = target.closest('.todo-item');
    if (li) toggleTask(li.dataset.id);
  });

  /* Update (start edit) + Delete */
  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var li = btn.closest('.todo-item');
    if (!li) return;
    if (btn.dataset.action === 'delete') {
      /* move focus somewhere sensible before the node disappears */
      var next = li.nextElementSibling || li.previousElementSibling;
      deleteTask(li.dataset.id);
      var target = next && listEl.querySelector('[data-id="' + next.dataset.id + '"] [data-action="delete"]');
      (target || input).focus();
    } else if (btn.dataset.action === 'edit') {
      startEdit(li.dataset.id);
    }
  });

  /* Update (start edit by double-click on the text) */
  listEl.addEventListener('dblclick', function (e) {
    var text = e.target.closest('[data-action="edit-text"]');
    if (!text) return;
    var li = text.closest('.todo-item');
    if (li) startEdit(li.dataset.id);
  });

  /* Update (finish edit with the keyboard) */
  listEl.addEventListener('keydown', function (e) {
    if (!e.target.classList.contains('todo-edit-input')) return;
    var li = e.target.closest('.todo-item');
    if (!li) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit(li.dataset.id, true, true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishEdit(li.dataset.id, false, true);
    }
  });

  /* Update (finish edit by clicking away) */
  listEl.addEventListener('focusout', function (e) {
    if (!e.target.classList.contains('todo-edit-input')) return;
    var li = e.target.closest('.todo-item');
    if (li) finishEdit(li.dataset.id, true, false);
  });

  /* Filtering */
  filtersEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.todo-filter');
    if (btn) setFilter(btn.dataset.filter);
  });

  clearBtn.addEventListener('click', function () {
    clearCompleted();
    input.focus();
  });

  /* Keep multiple open tabs in sync */
  window.addEventListener('storage', function (e) {
    if (e.key === TASKS_KEY || e.key === FILTER_KEY) {
      load();
      state.editingId = null;
      render();
    }
  });

  /* ---------- Boot ---------- */
  load();
  render();
})();
