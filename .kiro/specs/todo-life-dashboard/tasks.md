# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a client-side single-page web application using plain HTML5, CSS3, and Vanilla JavaScript (ES2020+). The build is zero-dependency: no bundler, no framework, no backend. All persistence uses the native `localStorage` API. The implementation proceeds in layers — project scaffold → shared services → individual widgets → integration wiring — so each step is runnable and testable before the next begins.

---

## Tasks

- [x] 1. Scaffold project structure and HTML skeleton
  - Create `index.html` with `<!DOCTYPE html>`, `<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1.0">`, and correct `<link>`/`<script>` tags pointing to `css/style.css` and `js/app.js` (defer)
  - Add four widget container elements with IDs: `#greeting-widget`, `#focus-timer`, `#task-manager`, `#quick-links-panel`
  - Add required child element IDs inside each container: `#greeting-time`, `#greeting-date`, `#greeting-message` (Greeting_Widget); `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset` (FocusTimer); `#task-input`, `#task-submit`, `#task-list` (TaskManager); `#link-label-input`, `#link-url-input`, `#link-submit`, `#quick-links-list` (QuickLinksPanel)
  - Create empty `css/style.css` and `js/app.js` files
  - _Requirements: 10.2, 10.3_

- [x] 2. Implement `StorageService` and baseline layout CSS
  - [x] 2.1 Implement `StorageService` in `js/app.js`
    - Write `StorageService` as a `const` object literal with `isAvailable()`, `get(key)`, `set(key, value)`, and `remove(key)` methods
    - `isAvailable()` tries a `localStorage.setItem` / `removeItem` probe and returns `true`/`false`
    - `get(key)` wraps `localStorage.getItem` + `JSON.parse` in try/catch; returns parsed value or `null`
    - `set(key, value)` wraps `JSON.stringify` + `localStorage.setItem` in try/catch; returns `{ ok: true }` or `{ ok: false, error }`
    - `remove(key)` wraps `localStorage.removeItem` in try/catch; returns `{ ok: true }` or `{ ok: false, error }`
    - _Requirements: 6.1–6.7, 9.1–9.6, 11.3, 11.4_


  - [x] 2.4 Write baseline layout CSS in `css/style.css`
    - CSS reset / box-sizing, body font (≥14px), background colour
    - Grid or flexbox layout that places all four widgets in clearly distinct regions with visible boundaries (background, border, or spacing)
    - Responsive rules ensuring no horizontal scroll and no overlap from 320px to 2560px
    - Stub `.task--completed` class: `text-decoration: line-through; opacity: 0.5`
    - Stub `.timer--finished` class for the session-end visual indicator
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

- [x] 3. Implement `GreetingWidget`
  - [x] 3.1 Implement `GreetingWidget` module in `js/app.js`
    - Write `getGreetingPrefix(hour)` pure function: returns `"Good Morning"` for 0–11, `"Good Afternoon"` for 12–17, `"Good Evening"` for 18–23
    - Write `renderGreeting()`: reads current `Date`, formats time as HH:MM, formats date as "Weekday, D Month YYYY", reads `dashboard_user_name` from `StorageService.get`, builds greeting string appending `, [Name]` only when name is a non-empty non-whitespace string, writes to `#greeting-time`, `#greeting-date`, `#greeting-message`
    - Write `GreetingWidget.init()`: calls `renderGreeting()` immediately, then starts a `setInterval` of 60,000 ms
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_


- [x] 4. Implement `FocusTimer`
  - [x] 4.1 Implement `FocusTimer` state machine in `js/app.js`
    - Define internal state object `{ remainingSeconds: 1500, state: 'idle', intervalId: null }`
    - Write `updateDisplay()`: formats `remainingSeconds` as MM:SS and writes to `#timer-display`
    - Write `setButtonStates(state)`: applies enable/disable rules per the design table (idle: start✅ stop❌ reset✅; running: start❌ stop✅ reset✅; paused: start✅ stop❌ reset✅; finished: start✅ stop❌ reset✅)
    - Implement `start()`, `stop()`, `reset()` action functions that transition state, manage `setInterval`/`clearInterval`, call `updateDisplay()` and `setButtonStates()`
    - On reaching 00:00: clear interval, set state to `'finished'`, toggle `.timer--finished` class on the container
    - `reset()` removes `.timer--finished`, resets `remainingSeconds` to 1500, sets state to `'idle'`
    - Write `FocusTimer.init()`: calls `updateDisplay()`, `setButtonStates('idle')`, attaches click listeners to `#timer-start`, `#timer-stop`, `#timer-reset`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_


- [x] 5. Checkpoint — Core widgets verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement `TaskManager` — add and display
  - [x] 6.1 Implement task add and render pipeline in `js/app.js`
    - Define in-memory `tasks` array; write `loadTasks()` that calls `StorageService.get('dashboard_tasks')`, falls back to `[]` on `null` or non-array, and populates the array
    - Write `saveTasks()`: calls `StorageService.set('dashboard_tasks', tasks)`; if `ok` is `false`, shows an inline storage error near `#task-list`
    - Write `renderTaskList()`: clears `#task-list` and re-renders all tasks as `<li>` elements; each `<li>` contains a checkbox, description `<span>`, edit `<button>`, delete `<button>`; apply `task--completed` class when `completed === true`
    - Write `addTask(description)`: trim input; reject empty/whitespace with `<span role="alert">` inline message (cleared on `input` event); reject if > 200 chars; create Task object using `crypto.randomUUID()` (or `Date.now().toString()` as fallback), call `saveTasks()`, call `renderTaskList()`, clear input field
    - Attach `submit` / click listener on `#task-submit` and keydown `Enter` on `#task-input`
    - Write `TaskManager.init()`: calls `loadTasks()`, `renderTaskList()`, attaches add-task listener
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.5, 6.6, 6.7_


- [x] 7. Implement `TaskManager` — edit and complete/delete
  - [x] 7.1 Implement task edit flow in `js/app.js`
    - In `renderTaskList()`, attach `click` listener on each edit button that: saves original `description` in a closure variable, replaces the description `<span>` with an `<input>` pre-populated with the current description, swaps the edit button for save/cancel buttons
    - On confirm (Enter / save button): trim; reject empty with inline error retaining original; reject > 200 chars; update task in `tasks` array, call `saveTasks()`, call `renderTaskList()`
    - On cancel (Escape / cancel button): restore the `<span>` with the original description, no array or storage mutation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.2 Implement task completion toggle and delete in `js/app.js`
    - In `renderTaskList()`, attach `change` listener on each checkbox: toggle `task.completed`, apply/remove `task--completed` CSS class, call `saveTasks()`
    - In `renderTaskList()`, attach `click` listener on each delete button: splice task from `tasks` array, call `saveTasks()`, call `renderTaskList()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Checkpoint — Task Manager fully functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement `QuickLinksPanel`
  - [x] 9.1 Implement URL validation and add-link pipeline in `js/app.js`
    - Write `isValidUrl(value)` pure function: returns `true` iff `value` starts with `http://` or `https://` AND `new URL(value)` does not throw a `TypeError`
    - Define in-memory `links` array; write `loadLinks()` and `saveLinks()` (same pattern as `loadTasks`/`saveTasks` but using key `dashboard_quick_links`; on malformed JSON show visible error per Requirement 9.5)
    - Write `renderLinks()`: clears `#quick-links-list`; renders each link as a `<div>` containing an `<a target="_blank" rel="noopener noreferrer">` and a delete `<button>`; if `links.length >= 50`, disable `#link-submit` and show capacity message
    - Write `addLink(label, url)`: validate label (non-empty, ≤ 50 chars) and URL (non-empty, passes `isValidUrl`); show per-field inline `<span role="alert">` on failure; on success create QuickLink object, call `saveLinks()`, call `renderLinks()`, clear inputs
    - Write `QuickLinksPanel.init()`: calls `loadLinks()`, `renderLinks()`, attaches `click`/`submit` listener on `#link-submit`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 9.3, 9.4_


  - [x] 9.4 Implement Quick_Link delete with rollback in `js/app.js`
    - In `renderLinks()`, attach `click` listener on each delete button: note the item, splice from `links`, call `saveLinks()`; if `saveLinks()` returns `{ ok: false }`, restore the item to `links`, call `renderLinks()`, show inline error
    - _Requirements: 8.1, 8.2, 8.3, 8.4_


- [x] 10. Implement `App.init()`, global error handling, and `localStorage` unavailability banner
  - [x] 10.1 Wire all widgets together in `App.init()` and add global unavailability banner
    - Write `App.init()` that is called on `DOMContentLoaded`: checks `StorageService.isAvailable()`; if false, inserts a visible global banner warning at the top of the page; then calls `GreetingWidget.init()`, `FocusTimer.init()`, `TaskManager.init()`, `QuickLinksPanel.init()`
    - Attach `App.init` to `document.addEventListener('DOMContentLoaded', App.init)`
    - Wrap the entire `app.js` body in an IIFE to avoid global scope pollution
    - _Requirements: 11.1, 11.4_

- [x] 11. Checkpoint — Full widget integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Polish CSS and responsiveness
  - [x] 12.1 Complete responsive CSS for all four widgets
    - Finalize widget card styles: padding, border-radius, box-shadow or border for visual separation
    - Timer display font sizing; button active/disabled visual states (`.timer--finished` highlight)
    - Task list item layout: checkbox + text + action buttons in a single row; `task--completed` strikethrough at ≤ 50% opacity
    - Quick_Links grid/flex wrap for link buttons; capacity message styling
    - Media-query breakpoints ensuring no horizontal scrollbar and no widget overlap at 320px, 768px, 1280px, and 2560px
    - All body text and interactive labels ≥ 14px
    - _Requirements: 10.1, 10.4, 10.5_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- All code must stay in `index.html`, `css/style.css`, and `js/app.js` — no additional files, no imports from CDNs, no build step
- Property tests use **fast-check** (installed as a dev dependency for testing only; it does not ship to production)
- Each property test file must include the comment tag `// Feature: todo-life-dashboard, Property N: <property text>`
- Property tests validate universal invariants (100+ iterations each); unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at logical milestones
- The `StorageService` is the single boundary for all `localStorage` access — widgets never call `localStorage` directly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.4"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "7.1"] },
    { "id": 5, "tasks": ["7.2", "9.1"] },
    { "id": 6, "tasks": ["7.3", "7.4", "7.5", "9.2", "9.3", "9.4"] },
    { "id": 7, "tasks": ["9.5", "9.6", "10.1"] },
    { "id": 8, "tasks": ["10.2", "12.1"] },
    { "id": 9, "tasks": ["12.2"] }
  ]
}
```
