# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side, single-page web application that serves as a personal productivity hub. It provides a real-time greeting with date and time, a Pomodoro-style focus timer, a persistent task manager, and a customizable quick-links panel. All data is stored exclusively in the browser's Local Storage — no backend or server is required. The application is built using plain HTML, CSS, and Vanilla JavaScript, and must run correctly in all modern browsers.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI component that displays the current time, date, and a time-of-day greeting message.
- **Focus_Timer**: The UI component that manages a 25-minute countdown timer.
- **Task_Manager**: The UI component that allows the user to add, edit, complete, and delete tasks.
- **Task**: A single to-do item consisting of a text description and a completion status.
- **Quick_Links_Panel**: The UI component that displays user-defined shortcut buttons that open external URLs.
- **Quick_Link**: A single entry consisting of a label and a URL, saved in Local Storage.
- **Local_Storage**: The browser's built-in `localStorage` API used for all client-side data persistence.
- **Active_Task**: A Task whose completion status is false.
- **Completed_Task**: A Task whose completion status is true.
- **Session**: A single 25-minute countdown cycle managed by the Focus_Timer.

---

## Requirements

### Requirement 1: Real-Time Greeting Display

**User Story:** As a user, I want to see the current time, date, and a personalized greeting when I open the Dashboard, so that I have immediate context about the time of day.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Greeting_Widget SHALL display the current time in HH:MM format, derived from the user's local device clock, and SHALL update the displayed time every 60 seconds.
2. THE Greeting_Widget SHALL display the current date including the full weekday name, day, month, and year (e.g., "Monday, 16 June 2025").
3. IF the current local hour is between 0 and 11 (inclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Morning, [Name]".
4. IF the current local hour is between 12 and 17 (inclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Afternoon, [Name]".
5. IF the current local hour is between 18 and 23 (inclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Evening, [Name]".
6. THE Greeting_Widget SHALL read the user's name from a value stored in Local Storage under the key "dashboard_user_name"; IF no name is stored, THEN THE Greeting_Widget SHALL display the greeting without a name suffix (e.g., "Good Morning").

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can manage focused work sessions.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Focus_Timer SHALL display a countdown of 25:00 (MM:SS format).
2. WHEN the user activates the start control, THE Focus_Timer SHALL begin counting down one second at a time.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL update the displayed time every second.
4. WHEN the user activates the stop control, THE Focus_Timer SHALL pause the countdown and retain the current remaining time.
5. WHEN the user activates the reset control, THE Focus_Timer SHALL stop any active countdown and reset the displayed time to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a visual indicator to notify the user that the Session has ended; the visual indicator SHALL persist until the user activates the reset control.
7. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL disable the start control to prevent duplicate timers.
8. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL enable the start control and disable the stop control.
9. THE Focus_Timer SHALL enable the stop control only while the countdown is actively running, and SHALL disable the stop control when the timer is paused or reset.

---

### Requirement 3: Task Management — Adding and Displaying Tasks

**User Story:** As a user, I want to add new tasks and see all my tasks listed on the Dashboard, so that I can track what I need to do.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide a text input field and a submit control for adding a new Task.
2. WHEN the user submits a non-empty task description, THE Task_Manager SHALL add the Task to the task list, display it within 300 milliseconds, and clear the input field.
3. IF the user submits an empty or whitespace-only task description, THEN THE Task_Manager SHALL reject the input and display an inline validation message without adding a Task; the validation message SHALL be removed when the user modifies the input field.
4. WHEN the Dashboard loads, THE Task_Manager SHALL display all Tasks stored in Local Storage.
5. THE Task_Manager SHALL visually distinguish Active_Tasks from Completed_Tasks by applying strikethrough text and opacity of 50% or less to Completed_Tasks.
6. IF the user submits a task description exceeding 200 characters, THEN THE Task_Manager SHALL reject the input and display an inline validation message indicating the character limit without adding a Task.

---

### Requirement 4: Task Management — Editing Tasks

**User Story:** As a user, I want to edit the text of an existing task, so that I can correct or update its description without deleting and re-adding it.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide an edit control for each Task in the task list.
2. WHEN the user activates the edit control for a Task, THE Task_Manager SHALL replace the task description text with an editable input field pre-populated with the current task description.
3. WHEN the user confirms the edit with a non-empty value of 200 characters or fewer, THE Task_Manager SHALL update the Task description and return to display mode.
4. IF the user confirms the edit with an empty or whitespace-only value, THEN THE Task_Manager SHALL reject the update, display an inline error message indicating the field cannot be empty, and retain the original task description.
5. WHEN a Task is updated, THE Task_Manager SHALL save the updated Task list to Local Storage within 100 milliseconds.
6. WHEN the user cancels the edit (e.g., presses Escape or activates a cancel control), THE Task_Manager SHALL discard the in-progress changes and return the Task to display mode with the original description unchanged.

---

### Requirement 5: Task Management — Completing and Deleting Tasks

**User Story:** As a user, I want to mark tasks as done and delete tasks I no longer need, so that I can keep my task list current.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide a completion toggle control (e.g., a checkbox) for each Task.
2. WHEN the user activates the completion toggle for an Active_Task, THE Task_Manager SHALL set the Task's completion status to true, apply the Completed_Task visual style, and save the updated Task list to Local Storage.
3. WHEN the user activates the completion toggle for a Completed_Task, THE Task_Manager SHALL set the Task's completion status to false, restore the Active_Task visual style, and save the updated Task list to Local Storage.
4. THE Task_Manager SHALL provide a delete control for each Task.
5. WHEN the user activates the delete control for a Task, THE Task_Manager SHALL remove the Task from the list and update Local Storage within 100 milliseconds.

---

### Requirement 6: Task Persistence via Local Storage

**User Story:** As a user, I want my tasks to be saved automatically, so that my task list is still available when I reopen the browser.

#### Acceptance Criteria

1. WHEN a Task is added, THE Task_Manager SHALL serialize the complete Task list as a JSON array and write it to Local Storage under a fixed key.
2. WHEN a Task is edited, THE Task_Manager SHALL serialize the updated Task list and write it to Local Storage.
3. WHEN a Task is deleted, THE Task_Manager SHALL serialize the updated Task list and write it to Local Storage.
4. WHEN a Task's completion status changes, THE Task_Manager SHALL serialize the updated Task list and write it to Local Storage.
5. WHEN the Dashboard loads, THE Task_Manager SHALL read the Task list from Local Storage and render all stored Tasks.
6. IF Local Storage contains no Task data or contains data that cannot be parsed as a valid JSON array on load, THEN THE Task_Manager SHALL render an empty task list without errors.
7. IF a Local Storage write operation fails for any reason, THEN THE Task_Manager SHALL display a visible inline error message informing the user that the task could not be saved, and SHALL retain the current in-session task list state.

---

### Requirement 7: Quick Links Management — Adding and Displaying Links

**User Story:** As a user, I want to add favorite website shortcuts that are saved across sessions, so that I can quickly navigate to the sites I use most.

#### Acceptance Criteria

1. THE Quick_Links_Panel SHALL provide an input field for a link label (maximum 50 characters) and an input field for a URL (maximum 2048 characters), and a submit control for adding a new Quick_Link.
2. WHEN the user submits a Quick_Link with both a non-empty label and a URL beginning with "http://" or "https://" and containing a valid domain, THE Quick_Links_Panel SHALL add the Quick_Link and display it as a clickable button within the same render cycle.
3. IF the user submits a Quick_Link with an empty label, an empty URL, or a URL that does not begin with "http://" or "https://", THEN THE Quick_Links_Panel SHALL reject the input and display an inline validation message indicating which field is invalid without adding the Quick_Link.
4. WHEN a Quick_Link button is clicked, THE Quick_Links_Panel SHALL open the associated URL in a new browser tab.
5. WHEN the Dashboard loads, THE Quick_Links_Panel SHALL read the Quick_Link list from Local Storage and render all stored Quick_Links.
6. IF the number of stored Quick_Links reaches 50, THEN THE Quick_Links_Panel SHALL disable the submit control and display a message informing the user that the maximum number of Quick_Links has been reached.
7. IF Local Storage is unavailable on load or a write operation fails, THEN THE Quick_Links_Panel SHALL display a visible warning message informing the user that Quick_Links cannot be saved or loaded.

---

### Requirement 8: Quick Links Management — Deleting Links

**User Story:** As a user, I want to remove quick links I no longer need, so that my links panel stays relevant.

#### Acceptance Criteria

1. THE Quick_Links_Panel SHALL provide a delete control for each Quick_Link.
2. WHEN the user activates the delete control for a Quick_Link, THE Quick_Links_Panel SHALL remove the Quick_Link entry from the panel before the next user interaction.
3. WHEN a Quick_Link is removed from the panel, THE Quick_Links_Panel SHALL write the updated Quick_Link list to Local Storage.
4. IF the Local Storage write operation fails after a Quick_Link is deleted, THEN THE Quick_Links_Panel SHALL restore the deleted Quick_Link to the panel and display an inline error message informing the user that the change could not be saved.

---

### Requirement 9: Quick Links Persistence via Local Storage

**User Story:** As a user, I want my quick links to be saved automatically, so that they are still available when I reopen the browser.

#### Acceptance Criteria

1. WHEN a Quick_Link is added, THE Quick_Links_Panel SHALL serialize the complete Quick_Link list as a JSON array and write it to Local Storage.
2. WHEN a Quick_Link is deleted, THE Quick_Links_Panel SHALL serialize the updated Quick_Link list and write it to Local Storage.
3. WHEN the Dashboard loads, THE Quick_Links_Panel SHALL read the Quick_Link list from Local Storage and render all stored Quick_Links.
4. IF Local Storage contains no Quick_Link data on load, THEN THE Quick_Links_Panel SHALL render an empty panel displaying no Quick_Link entries.
5. IF Local Storage contains data that cannot be parsed as a valid JSON array on load, THEN THE Quick_Links_Panel SHALL discard the malformed data, render an empty panel, and display a visible error message informing the user that saved links could not be loaded.
6. IF a Local Storage write operation fails, THEN THE Quick_Links_Panel SHALL retain the current in-session Quick_Link list state and display a visible error message informing the user that the change could not be persisted.

---

### Requirement 10: Layout and Visual Design

**User Story:** As a user, I want a clean, readable, and visually organized Dashboard, so that I can use it comfortably without distraction.

#### Acceptance Criteria

1. THE Dashboard SHALL organize all widgets (Greeting_Widget, Focus_Timer, Task_Manager, Quick_Links_Panel) such that each widget is contained within a visually distinct region with clear boundaries (e.g., background color, border, or spacing) that separates it from adjacent widgets.
2. THE Dashboard SHALL use a single CSS file located at `css/style.css` for all visual styling.
3. THE Dashboard SHALL use a single JavaScript file located at `js/app.js` for all application logic.
4. THE Dashboard SHALL render on viewport widths between 320px and 2560px with no content clipping, no horizontal scrollbar, and no overlapping between widget content areas.
5. THE Dashboard SHALL use a font size of at least 14px for all body text and interactive control labels.

---

### Requirement 11: Browser Compatibility and Performance

**User Story:** As a user, I want the Dashboard to load quickly and work in my browser without errors, so that I can rely on it daily.

#### Acceptance Criteria

1. THE Dashboard SHALL function correctly in the latest stable release of Chrome, Firefox, Edge, and Safari, meaning all widgets render, are interactive, and produce no uncaught JavaScript errors in the browser console, without polyfills or build steps.
2. WHEN the Dashboard page is opened on a connection with a download speed of at least 25 Mbps, THE Dashboard SHALL load and render all widgets within 2 seconds.
3. THE Dashboard SHALL use only the native browser `localStorage` API for data persistence, with no external libraries or frameworks.
4. WHEN Local Storage is unavailable or throws an error, THE Dashboard SHALL display a visible warning message informing the user that data cannot be saved.
