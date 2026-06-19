/* To-Do Life Dashboard — js/app.js */
/* All application logic lives inside a single IIFE to avoid global scope pollution. */

(function () {
  'use strict';

  /* =========================================================
     SECTION 1: StorageService
     Centralised, error-safe wrapper around localStorage.
     Widgets NEVER call localStorage directly — always use this.
     Requirements: 6.1–6.7, 9.1–9.6, 11.3, 11.4
     ========================================================= */

  const StorageService = {
    /**
     * Checks whether localStorage is readable and writable.
     * Uses a probe key to test both setItem and removeItem.
     * Returns true if available, false otherwise.
     */
    isAvailable() {
      const probe = '__storage_probe__';
      try {
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Reads a value from localStorage and deserialises it from JSON.
     * Returns the parsed value, or null if the key is missing or the
     * stored string cannot be parsed as valid JSON.
     * @param {string} key
     * @returns {*} parsed value or null
     */
    get(key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    /**
     * Serialises value to JSON and writes it to localStorage.
     * Returns { ok: true } on success, or { ok: false, error } on failure.
     * @param {string} key
     * @param {*} value
     * @returns {{ ok: boolean, error?: Error }}
     */
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e };
      }
    },

    /**
     * Removes a key from localStorage.
     * Returns { ok: true } on success, or { ok: false, error } on failure.
     * @param {string} key
     * @returns {{ ok: boolean, error?: Error }}
     */
    remove(key) {
      try {
        localStorage.removeItem(key);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e };
      }
    },
  };

  /* =========================================================
     SECTION 2: GreetingWidget
     Displays live HH:MM time, full date string, and a
     time-of-day greeting that optionally includes the user's
     name read from localStorage.
     Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
     ========================================================= */

  const GreetingWidget = (function () {

    /**
     * Returns the appropriate greeting prefix for the given hour.
     * @param {number} hour  Integer in [0, 23]
     * @returns {"Good Morning"|"Good Afternoon"|"Good Evening"}
     */
    function getGreetingPrefix(hour) {
      if (hour >= 0 && hour <= 11) return 'Good Morning';
      if (hour >= 12 && hour <= 17) return 'Good Afternoon';
      return 'Good Evening';
    }

    /**
     * Reads the current date/time, formats all display strings,
     * reads the stored user name, then writes to the three DOM targets.
     */
    function renderGreeting() {
      const now = new Date();

      // — Time: HH:MM (zero-padded, 24-hour) —
      const hours   = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timeStr = hours + ':' + minutes;

      // — Date: "Weekday, D Month YYYY" —
      const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const MONTHS   = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
      const weekday  = WEEKDAYS[now.getDay()];
      const day      = now.getDate();
      const month    = MONTHS[now.getMonth()];
      const year     = now.getFullYear();
      const dateStr  = weekday + ', ' + day + ' ' + month + ' ' + year;

      // — Greeting message —
      const prefix = getGreetingPrefix(now.getHours());
      const storedName = StorageService.get('dashboard_user_name');
      // Append ", [Name]" only when name is a non-empty, non-whitespace-only string
      const isValidName = typeof storedName === 'string' && storedName.trim().length > 0;
      const greetingStr = isValidName ? prefix + ', ' + storedName.trim() : prefix;

      // — Write to DOM —
      const elTime    = document.getElementById('greeting-time');
      const elDate    = document.getElementById('greeting-date');
      const elMessage = document.getElementById('greeting-message');

      if (elTime)    elTime.textContent    = timeStr;
      if (elDate)    elDate.textContent    = dateStr;
      if (elMessage) elMessage.textContent = greetingStr;
    }

    /**
     * Initialises the widget: renders immediately, then refreshes every 60 s.
     */
    function init() {
      renderGreeting();
      setInterval(renderGreeting, 60000);
    }

    // Expose only what other modules need
    return { init, getGreetingPrefix };
  }());

  /* =========================================================
     SECTION 3: FocusTimer
     25-minute Pomodoro countdown with start, stop, and reset
     controls. Manages its own state machine internally.
     Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
     ========================================================= */

  const FocusTimer = (function () {

    // Internal state object — single source of truth for the timer
    const timerState = {
      remainingSeconds: 1500,           // 25 * 60
      state: 'idle',                    // 'idle' | 'running' | 'paused' | 'finished'
      intervalId: null
    };

    /**
     * Formats timerState.remainingSeconds as MM:SS (zero-padded)
     * and writes the result to #timer-display.
     */
    function updateDisplay() {
      const mins = String(Math.floor(timerState.remainingSeconds / 60)).padStart(2, '0');
      const secs = String(timerState.remainingSeconds % 60).padStart(2, '0');
      const el = document.getElementById('timer-display');
      if (el) el.textContent = mins + ':' + secs;
    }

    /**
     * Applies enable/disable rules to the three timer buttons
     * based on the supplied state string.
     *
     * | State    | Start | Stop | Reset |
     * |----------|-------|------|-------|
     * | idle     |  ✅   |  ❌  |  ✅   |
     * | running  |  ❌   |  ✅  |  ✅   |
     * | paused   |  ✅   |  ❌  |  ✅   |
     * | finished |  ✅   |  ❌  |  ✅   |
     *
     * @param {'idle'|'running'|'paused'|'finished'} state
     */
    function setButtonStates(state) {
      const btnStart = document.getElementById('timer-start');
      const btnStop  = document.getElementById('timer-stop');
      const btnReset = document.getElementById('timer-reset');

      if (!btnStart || !btnStop || !btnReset) return;

      const isRunning = state === 'running';
      btnStart.disabled = isRunning;
      btnStop.disabled  = !isRunning;
      btnReset.disabled = false;  // always enabled
    }

    /**
     * Starts the countdown.
     * Valid from: 'idle' or 'paused' states.
     * Sets up a 1-second interval that decrements remainingSeconds,
     * updates the display, and handles the finished condition.
     */
    function start() {
      if (timerState.state !== 'idle' && timerState.state !== 'paused') return;

      timerState.state = 'running';
      setButtonStates('running');

      timerState.intervalId = setInterval(function () {
        timerState.remainingSeconds -= 1;
        updateDisplay();

        if (timerState.remainingSeconds <= 0) {
          // Countdown complete
          clearInterval(timerState.intervalId);
          timerState.intervalId = null;
          timerState.remainingSeconds = 0;
          timerState.state = 'finished';

          const container = document.getElementById('focus-timer');
          if (container) container.classList.add('timer--finished');

          setButtonStates('finished');
        }
      }, 1000);
    }

    /**
     * Pauses the countdown.
     * Valid from: 'running' state only.
     * Clears the interval and retains the current remaining time.
     */
    function stop() {
      if (timerState.state !== 'running') return;

      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
      timerState.state = 'paused';

      updateDisplay();
      setButtonStates('paused');
    }

    /**
     * Resets the timer back to 25:00 regardless of current state.
     * Clears any active interval and removes the finished visual indicator.
     */
    function reset() {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;

      const container = document.getElementById('focus-timer');
      if (container) container.classList.remove('timer--finished');

      timerState.remainingSeconds = 1500;
      timerState.state = 'idle';

      updateDisplay();
      setButtonStates('idle');
    }

    /**
     * Initialises the FocusTimer: sets the initial display to 25:00,
     * sets the correct button states for 'idle', and wires up the
     * three control buttons.
     * Called by App.init() on DOMContentLoaded.
     */
    function init() {
      updateDisplay();
      setButtonStates('idle');

      document.getElementById('timer-start').addEventListener('click', start);
      document.getElementById('timer-stop').addEventListener('click', stop);
      document.getElementById('timer-reset').addEventListener('click', reset);
    }

    // Expose only the public interface
    return { init };

  }());

  /* =========================================================
     SECTION 4: TaskManager
     Full CRUD task list with localStorage persistence via
     StorageService. Handles add, display, complete/uncomplete,
     edit, and delete operations.
     Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.5, 6.6, 6.7
     ========================================================= */

  const TaskManager = (function () {

    // In-memory task array — single source of truth for the session
    let tasks = [];

    /**
     * Loads tasks from localStorage via StorageService.
     * Falls back to an empty array if the stored value is null,
     * missing, or not an array (covers Requirements 6.5, 6.6).
     */
    function loadTasks() {
      const stored = StorageService.get('dashboard_tasks');
      tasks = Array.isArray(stored) ? stored : [];
    }

    /**
     * Persists the current in-memory task array to localStorage.
     * If the write fails, displays a visible inline error message
     * near #task-list (Requirement 6.7).
     * @returns {boolean} true if save succeeded, false otherwise
     */
    function saveTasks() {
      const result = StorageService.set('dashboard_tasks', tasks);
      if (!result.ok) {
        showStorageError();
        return false;
      }
      return true;
    }

    /**
     * Shows a storage-error message as a sibling of #task-list.
     * Replaces any existing error to avoid duplicates.
     */
    function showStorageError() {
      const taskList = document.getElementById('task-list');
      if (!taskList) return;

      // Remove any existing storage error
      const existing = taskList.parentNode.querySelector('.task-storage-error');
      if (existing) existing.remove();

      const errSpan = document.createElement('span');
      errSpan.className = 'task-storage-error';
      errSpan.setAttribute('role', 'alert');
      errSpan.textContent = 'Could not save — storage error.';
      errSpan.style.color = '#dc2626';
      errSpan.style.fontSize = '0.875rem';
      errSpan.style.display = 'block';
      errSpan.style.marginTop = '4px';
      taskList.parentNode.insertBefore(errSpan, taskList);
    }

    /**
     * Clears #task-list and re-renders every task in the in-memory
     * array as a <li> element.
     *
     * Each <li> contains:
     *   - <input type="checkbox"> for completion toggle
     *   - <span> for the task description
     *   - <button> for edit
     *   - <button> for delete
     *
     * The CSS class `task--completed` is applied when completed === true.
     * Requirements: 3.4, 3.5, 5.1, 5.4
     */
    function renderTaskList() {
      const taskList = document.getElementById('task-list');
      if (!taskList) return;

      taskList.innerHTML = '';

      tasks.forEach(function (task) {
        const li = document.createElement('li');
        li.dataset.taskId = task.id;

        if (task.completed) {
          li.classList.add('task--completed');
        }

        // — Completion checkbox —
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute('aria-label', 'Mark task complete: ' + task.description);
        checkbox.addEventListener('change', function () {
          toggleTaskComplete(task.id);
        });

        // — Description span —
        const descSpan = document.createElement('span');
        descSpan.className = 'task-description';
        descSpan.textContent = task.description;

        // — Edit button —
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.textContent = 'Edit';
        editBtn.setAttribute('aria-label', 'Edit task: ' + task.description);
        editBtn.addEventListener('click', function () {
          startEditTask(task.id, li);
        });

        // — Delete button —
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.description);
        deleteBtn.addEventListener('click', function () {
          deleteTask(task.id);
        });

        li.appendChild(checkbox);
        li.appendChild(descSpan);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);

        taskList.appendChild(li);
      });
    }

    /**
     * Toggles the completion status of the task with the given id,
     * persists, and re-renders.
     * Requirements: 5.2, 5.3, 6.4
     * @param {string} id
     */
    function toggleTaskComplete(id) {
      const task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      task.completed = !task.completed;
      saveTasks();
      renderTaskList();
    }

    /**
     * Removes the task with the given id from the array,
     * persists, and re-renders.
     * Requirements: 5.5, 6.3
     * @param {string} id
     */
    function deleteTask(id) {
      tasks = tasks.filter(function (t) { return t.id !== id; });
      saveTasks();
      renderTaskList();
    }

    /**
     * Switches a task <li> into inline-edit mode:
     * replaces the description <span> with a pre-populated <input>,
     * and swaps Edit/Delete buttons for Save/Cancel.
     * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
     * @param {string} id        Task id to edit
     * @param {HTMLLIElement} li The list item element for this task
     */
    function startEditTask(id, li) {
      const task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;

      const originalDescription = task.description;

      // Replace description span with an input
      const descSpan = li.querySelector('.task-description');
      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.value = originalDescription;
      editInput.maxLength = 200;
      editInput.setAttribute('aria-label', 'Edit task description');
      li.replaceChild(editInput, descSpan);

      // Replace Edit/Delete buttons with Save/Cancel
      const editBtn   = li.querySelector('button[aria-label^="Edit"]');
      const deleteBtn = li.querySelector('button[aria-label^="Delete"]');

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.textContent = 'Save';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';

      if (editBtn)   li.replaceChild(saveBtn, editBtn);
      if (deleteBtn) li.replaceChild(cancelBtn, deleteBtn);

      // Inline validation error span for the edit field
      let editErrorSpan = null;

      function showEditError(message) {
        if (!editErrorSpan) {
          editErrorSpan = document.createElement('span');
          editErrorSpan.setAttribute('role', 'alert');
          editErrorSpan.style.color = '#dc2626';
          editErrorSpan.style.fontSize = '0.875rem';
          editErrorSpan.style.display = 'block';
          li.appendChild(editErrorSpan);
        }
        editErrorSpan.textContent = message;
      }

      function clearEditError() {
        if (editErrorSpan) {
          editErrorSpan.textContent = '';
        }
      }

      editInput.addEventListener('input', clearEditError);

      function confirmEdit() {
        const trimmed = editInput.value.trim();
        if (trimmed.length === 0) {
          showEditError('Task description cannot be empty.');
          return;
        }
        if (trimmed.length > 200) {
          showEditError('Task description must be 200 characters or fewer.');
          return;
        }
        task.description = trimmed;
        saveTasks();
        renderTaskList();
      }

      function cancelEdit() {
        task.description = originalDescription;
        renderTaskList();
      }

      saveBtn.addEventListener('click', confirmEdit);
      cancelBtn.addEventListener('click', cancelEdit);

      // Keyboard: Enter = save, Escape = cancel
      editInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') confirmEdit();
        if (e.key === 'Escape') cancelEdit();
      });

      editInput.focus();
    }

    /**
     * Validates and adds a new task from the given description string.
     * - Trims whitespace; rejects empty/whitespace-only (Requirement 3.3)
     * - Rejects descriptions > 200 characters (Requirement 3.6)
     * - Creates a Task object with a UUID (or Date.now fallback)
     * - Appends to in-memory array, persists, re-renders, clears input
     * Requirements: 3.1, 3.2, 3.3, 3.6, 6.1
     * @param {string} description Raw string from the input field
     */
    function addTask(description) {
      const taskInput = document.getElementById('task-input');

      // Clear any previous validation error
      clearAddError();

      const trimmed = (typeof description === 'string') ? description.trim() : '';

      // Reject empty / whitespace-only
      if (trimmed.length === 0) {
        showAddError('Please enter a task description.');
        return;
      }

      // Reject over-length descriptions
      if (trimmed.length > 200) {
        showAddError('Task description must be 200 characters or fewer.');
        return;
      }

      // Generate a unique id — prefer crypto.randomUUID(), fall back to Date.now()
      const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : Date.now().toString();

      const newTask = {
        id: id,
        description: trimmed,
        completed: false,
        createdAt: new Date().toISOString()
      };

      tasks.push(newTask);
      saveTasks();
      renderTaskList();

      // Clear the input field (Requirement 3.2)
      if (taskInput) taskInput.value = '';
    }

    /**
     * Shows an inline validation <span role="alert"> near #task-input.
     * @param {string} message
     */
    function showAddError(message) {
      const taskInput = document.getElementById('task-input');
      if (!taskInput) return;

      // Avoid duplicate error spans
      let errSpan = taskInput.parentNode.querySelector('.task-add-error');
      if (!errSpan) {
        errSpan = document.createElement('span');
        errSpan.className = 'task-add-error';
        errSpan.setAttribute('role', 'alert');
        errSpan.style.color = '#dc2626';
        errSpan.style.fontSize = '0.875rem';
        errSpan.style.width = '100%';
        taskInput.parentNode.appendChild(errSpan);
      }
      errSpan.textContent = message;
    }

    /**
     * Removes the inline validation error for the add-task input.
     */
    function clearAddError() {
      const taskInput = document.getElementById('task-input');
      if (!taskInput) return;
      const errSpan = taskInput.parentNode.querySelector('.task-add-error');
      if (errSpan) errSpan.textContent = '';
    }

    /**
     * Attaches submit event listeners:
     * - click on #task-submit
     * - keydown Enter on #task-input
     * Also wires the input event on #task-input to clear any inline error.
     */
    function attachAddTaskListeners() {
      const taskInput  = document.getElementById('task-input');
      const taskSubmit = document.getElementById('task-submit');

      if (taskSubmit) {
        taskSubmit.addEventListener('click', function () {
          addTask(taskInput ? taskInput.value : '');
        });
      }

      if (taskInput) {
        taskInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            addTask(taskInput.value);
          }
        });

        // Clear validation error as soon as the user modifies the field
        taskInput.addEventListener('input', clearAddError);
      }
    }

    /**
     * Public initialisation entry point.
     * Loads persisted tasks, renders them, and wires up the add-task UI.
     * Called by App.init() on DOMContentLoaded (wired in task 10.1).
     */
    function init() {
      loadTasks();
      renderTaskList();
      attachAddTaskListeners();
    }

    // Expose the public API
    return { init };

  }());

  /* =========================================================
     SECTION 5: QuickLinksPanel
     Full CRUD quick-links list with localStorage persistence via
     StorageService. Handles add, display, and delete operations
     with delete-rollback on storage failure.
     Requirements: 7.1–7.6, 8.1–8.4, 9.1–9.6
     ========================================================= */

  const QuickLinksPanel = (function () {

    // In-memory links array — single source of truth for the session
    let links = [];

    /**
     * Pure function: returns true iff the value starts with http:// or
     * https:// AND can be parsed by the URL constructor without throwing.
     * Requirements: 7.2, 7.3, Property 8
     * @param {string} value
     * @returns {boolean}
     */
    function isValidUrl(value) {
      if (typeof value !== 'string') return false;
      if (!value.startsWith('http://') && !value.startsWith('https://')) return false;
      try {
        new URL(value);
        return true;
      } catch (e) {
        return false;
      }
    }

    /**
     * Loads links from localStorage via StorageService.
     * Falls back to empty array if value is null or not an array.
     * If raw JSON is present but malformed, shows a visible error
     * per Requirement 9.5.
     */
    function loadLinks() {
      // Check whether raw data exists in storage before parsing
      const raw = localStorage.getItem('dashboard_quick_links');
      if (raw === null) {
        // No data stored — normal empty state (Requirement 9.4)
        links = [];
        return;
      }

      const stored = StorageService.get('dashboard_quick_links');
      if (Array.isArray(stored)) {
        links = stored;
      } else {
        // StorageService.get returns null on bad JSON (parse error)
        // raw is not null, so this is a malformed payload (Requirement 9.5)
        links = [];
        showLinksError('Saved links could not be loaded — data was corrupted and has been reset.');
      }
    }

    /**
     * Persists the current in-memory links array to localStorage.
     * Returns the result object from StorageService.set so callers
     * can inspect { ok: boolean }.
     * If the write fails, displays a visible inline error (Requirement 9.6).
     * @returns {{ ok: boolean, error?: Error }}
     */
    function saveLinks() {
      const result = StorageService.set('dashboard_quick_links', links);
      if (!result.ok) {
        showLinksError('Could not save — storage error.');
      }
      return result;
    }

    /**
     * Shows a storage/load error message as a sibling of #quick-links-list.
     * Replaces any existing error to avoid duplicates.
     * Requirements: 9.5, 9.6, 7.7
     * @param {string} message
     */
    function showLinksError(message) {
      const listEl = document.getElementById('quick-links-list');
      if (!listEl) return;

      const existing = listEl.parentNode.querySelector('.links-storage-error');
      if (existing) existing.remove();

      const errSpan = document.createElement('span');
      errSpan.className = 'links-storage-error';
      errSpan.setAttribute('role', 'alert');
      errSpan.textContent = message;
      errSpan.style.color = '#dc2626';
      errSpan.style.fontSize = '0.875rem';
      errSpan.style.display = 'block';
      errSpan.style.marginTop = '4px';
      listEl.parentNode.insertBefore(errSpan, listEl);
    }

    /**
     * Clears any existing links storage error message.
     */
    function clearLinksError() {
      const listEl = document.getElementById('quick-links-list');
      if (!listEl) return;
      const existing = listEl.parentNode.querySelector('.links-storage-error');
      if (existing) existing.remove();
    }

    /**
     * Clears #quick-links-list and re-renders every link in the in-memory
     * array as a <div> containing an <a> and a delete <button>.
     *
     * If links.length >= 50, disables #link-submit and shows capacity message.
     * Requirements: 7.2, 7.4, 7.6, 8.1
     */
    function renderLinks() {
      const listEl   = document.getElementById('quick-links-list');
      const submitBtn = document.getElementById('link-submit');
      if (!listEl) return;

      listEl.innerHTML = '';

      // Remove any existing capacity message
      const existingCapMsg = document.getElementById('quick-links-panel')
        && document.querySelector('.links-capacity-message');
      if (existingCapMsg) existingCapMsg.remove();

      links.forEach(function (link, index) {
        const div = document.createElement('div');
        div.className = 'quick-link-item';
        div.dataset.linkId = link.id;

        // Anchor — opens in new tab, per Requirements 7.2 and 7.4
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = link.label;

        // Delete button — Requirements 8.1, 8.2, 8.3, 8.4
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', 'Delete link: ' + link.label);
        deleteBtn.addEventListener('click', function () {
          deleteLink(link.id, index);
        });

        div.appendChild(anchor);
        div.appendChild(deleteBtn);
        listEl.appendChild(div);
      });

      // Capacity enforcement (Requirement 7.6)
      if (submitBtn) {
        if (links.length >= 50) {
          submitBtn.disabled = true;

          const capMsg = document.createElement('span');
          capMsg.className = 'links-capacity-message';
          capMsg.setAttribute('role', 'status');
          capMsg.textContent = 'Maximum of 50 quick links reached. Delete a link to add more.';
          capMsg.style.color = '#b45309';
          capMsg.style.fontSize = '0.875rem';
          capMsg.style.display = 'block';
          capMsg.style.marginTop = '4px';
          listEl.parentNode.insertBefore(capMsg, listEl);
        } else {
          submitBtn.disabled = false;
        }
      }
    }

    /**
     * Removes the link at the given index from the in-memory array,
     * persists, and re-renders. If saveLinks() returns { ok: false },
     * restores the item at its original index, re-renders, and shows
     * an inline error (delete-with-rollback).
     * Requirements: 8.1, 8.2, 8.3, 8.4
     * @param {string} id     Link id to delete
     * @param {number} index  Current index in the links array
     */
    function deleteLink(id, index) {
      // Find the item by id in case indices shifted
      const actualIndex = links.findIndex(function (l) { return l.id === id; });
      if (actualIndex === -1) return;

      const removedItem = links[actualIndex];
      links.splice(actualIndex, 1);

      const result = saveLinks();

      if (!result.ok) {
        // Rollback: restore the item at its original position (Requirement 8.4)
        links.splice(actualIndex, 0, removedItem);
        renderLinks();
        showLinksError('Could not delete — storage error. The link has been restored.');
        return;
      }

      renderLinks();
    }

    /**
     * Shows a per-field inline <span role="alert"> error next to the given input.
     * @param {HTMLInputElement} inputEl
     * @param {string} message
     * @param {string} errorClass  CSS class to identify this error span
     */
    function showFieldError(inputEl, message, errorClass) {
      if (!inputEl) return;
      let errSpan = inputEl.parentNode.querySelector('.' + errorClass);
      if (!errSpan) {
        errSpan = document.createElement('span');
        errSpan.className = errorClass;
        errSpan.setAttribute('role', 'alert');
        errSpan.style.color = '#dc2626';
        errSpan.style.fontSize = '0.875rem';
        errSpan.style.display = 'block';
        inputEl.parentNode.appendChild(errSpan);
      }
      errSpan.textContent = message;
    }

    /**
     * Clears a per-field inline error span.
     * @param {HTMLInputElement} inputEl
     * @param {string} errorClass
     */
    function clearFieldError(inputEl, errorClass) {
      if (!inputEl) return;
      const errSpan = inputEl.parentNode.querySelector('.' + errorClass);
      if (errSpan) errSpan.textContent = '';
    }

    /**
     * Validates and adds a new link from the given label and url strings.
     * - Label: non-empty after trim, ≤ 50 chars
     * - URL: non-empty, passes isValidUrl
     * - Per-field <span role="alert"> inline errors on failure
     * - On success: creates QuickLink, calls saveLinks(), renderLinks(), clears inputs
     * Requirements: 7.1, 7.2, 7.3, 9.1
     * @param {string} labelValue  Raw value from #link-label-input
     * @param {string} urlValue    Raw value from #link-url-input
     */
    function addLink(labelValue, urlValue) {
      const labelInput = document.getElementById('link-label-input');
      const urlInput   = document.getElementById('link-url-input');

      // Clear previous errors
      clearFieldError(labelInput, 'link-label-error');
      clearFieldError(urlInput, 'link-url-error');

      const trimmedLabel = (typeof labelValue === 'string') ? labelValue.trim() : '';
      const trimmedUrl   = (typeof urlValue === 'string') ? urlValue.trim() : '';

      let hasError = false;

      // Validate label
      if (trimmedLabel.length === 0) {
        showFieldError(labelInput, 'Please enter a label.', 'link-label-error');
        hasError = true;
      } else if (trimmedLabel.length > 50) {
        showFieldError(labelInput, 'Label must be 50 characters or fewer.', 'link-label-error');
        hasError = true;
      }

      // Validate URL
      if (trimmedUrl.length === 0) {
        showFieldError(urlInput, 'Please enter a URL.', 'link-url-error');
        hasError = true;
      } else if (!isValidUrl(trimmedUrl)) {
        showFieldError(urlInput, 'URL must start with http:// or https:// and be a valid address.', 'link-url-error');
        hasError = true;
      }

      if (hasError) return;

      // Capacity check (Requirement 7.6)
      if (links.length >= 50) return;

      // Generate unique id — prefer crypto.randomUUID(), fall back to Date.now()
      const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : Date.now().toString();

      const newLink = {
        id: id,
        label: trimmedLabel,
        url: trimmedUrl
      };

      links.push(newLink);
      saveLinks();
      renderLinks();

      // Clear inputs (Requirement 7.2)
      if (labelInput) labelInput.value = '';
      if (urlInput)   urlInput.value   = '';
    }

    /**
     * Attaches submit/click listener on #link-submit.
     * Also wires 'input' events on the two fields to clear their errors.
     */
    function attachAddLinkListeners() {
      const labelInput  = document.getElementById('link-label-input');
      const urlInput    = document.getElementById('link-url-input');
      const submitBtn   = document.getElementById('link-submit');

      if (submitBtn) {
        submitBtn.addEventListener('click', function () {
          addLink(labelInput ? labelInput.value : '', urlInput ? urlInput.value : '');
        });
      }

      if (labelInput) {
        labelInput.addEventListener('input', function () {
          clearFieldError(labelInput, 'link-label-error');
        });
      }

      if (urlInput) {
        urlInput.addEventListener('input', function () {
          clearFieldError(urlInput, 'link-url-error');
        });
      }
    }

    /**
     * Public initialisation entry point.
     * Loads persisted links, renders them, and wires up the add-link UI.
     * Called by App.init() on DOMContentLoaded.
     */
    function init() {
      loadLinks();
      renderLinks();
      attachAddLinkListeners();
    }

    // Expose the public API and isValidUrl for testing
    return { init, isValidUrl };

  }());

  /* =========================================================
     SECTION 6: App Bootstrap
     Initialises all completed widgets on DOMContentLoaded.
     Requirements: all widget init requirements
     ========================================================= */

  /**
   * Checks localStorage availability and shows a global banner
   * warning if it is inaccessible (Requirement 11.4).
   */
  function checkStorageAvailability() {
    if (!StorageService.isAvailable()) {
      const banner = document.createElement('div');
      banner.setAttribute('role', 'alert');
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0',
        'background:#dc2626', 'color:#fff', 'text-align:center',
        'padding:8px 16px', 'font-size:0.9rem', 'z-index:9999'
      ].join(';');
      banner.textContent = 'Storage unavailable — data cannot be saved in this session.';
      document.body.insertAdjacentElement('afterbegin', banner);
    }
  }

  /**
   * App.init — bootstraps all widgets once the DOM is ready.
   * Called automatically on DOMContentLoaded.
   */
  const App = {
    init() {
      checkStorageAvailability();
      GreetingWidget.init();
      FocusTimer.init();
      TaskManager.init();
      QuickLinksPanel.init();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})();
