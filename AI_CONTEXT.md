# AI Context & Developer Notes

This file serves as a persistent memory and knowledge base for the AI assistant and developers working on the D&D Card Creator project. **READ THIS FIRST** when starting a new session.

## Project Overview
- **Type:** Vanilla JavaScript Web Application (Vite)
- **Language:** Hebrew (RTL interface) - *All UI text must be in Hebrew.*
- **Core Functionality:** Generating D&D item cards using AI (Gemini) and rendering them on an HTML5 Canvas.

## Architecture & File Responsibilities
- **Entry Point:** `index.html` loads `main.js` (module).
- **Styling:**
  - `style.css`: Base styles.
  - `ui-improvements.css`: **Primary stylesheet for the modern UI.** Contains glassmorphism, layout overrides, and specific component styles.
- **Logic:**
  - `main.js`: **Core Orchestrator.** Handles form submissions, global event listeners, and initialization.
  - `ui-helpers.js`: **UI Utilities.** Handles collapsible sections, sliders, and purely visual DOM manipulations. *Do not put business logic here.*
  - `src/gemini-service.js`: **AI Integration.** Handles API calls to Gemini (text) and Pollinations.ai (image).
  - `src/card-renderer.js`: **Canvas Drawing.** Responsible for the `canvas` API calls. *All card visual changes happen here.*
  - `src/dnd-data.js`: Static data (types, rarities).

## ⚠️ CRITICAL WARNINGS & COMMON PITFALLS ⚠️

### 1. HTML Duplication (High Risk)
- **Issue:** `index.html` has a history of accidental duplication where the entire `sidebar-start`, `preview-panel`, and `sidebar-end` structure gets repeated.
- **Prevention:** When editing `index.html`, **ALWAYS** verify the integrity of the `<main>` tag. Ensure there is only **ONE** instance of each sidebar and the preview panel.
- **Structure:**
  ```html
  <main class="main-layout">
    <aside class="sidebar-start">...</aside>
    <section class="preview-panel">...</section>
    <aside class="sidebar-end">...</aside>
  </main>
  ```

### 2. CSS Syntax Errors
- **Issue:** `ui-improvements.css` is large and prone to unclosed blocks (`}`). This breaks the entire stylesheet silently.
- **Prevention:** After any CSS edit, verify that all blocks are closed. Be careful when nesting media queries.

### 3. RTL & Positioning
- **Context:** The app is `dir="rtl"`.
- **Pitfall:** "Left" often means "Right" in visual positioning.
- **Rule:** Test all positional changes (absolute positioning, floats, flex-direction) to ensure they behave correctly in RTL.

### 4. Canvas Text Wrapping
- **Context:** `card-renderer.js` handles text manually.
- **Pitfall:** Hebrew text wrapping can be tricky on Canvas.
- **Rule:** If text cuts off or overlaps, check the `wrapText` function in `card-renderer.js`.

## Optimization & Refactoring Goals
- **Split `main.js`:** It is becoming a "God Object". Move distinct logic (e.g., event handlers) to separate modules.
- **CSS Modularization:** Break `ui-improvements.css` into smaller, component-specific files (e.g., `buttons.css`, `forms.css`).
- **State Management:** Move away from reading/writing directly to the DOM for application state. Implement a simple `state.js` module.

## Workflow Tips
- **Git:** The project uses Git. If the code gets into an unrecoverable state, a hard reset to `origin/main` is a valid recovery strategy (after confirming with the user).
- **Testing:** Always verify:
    1.  Card Generation (Text & Image).
    2.  UI Layout (No duplications).
    3.  Console for errors (especially 404s or syntax errors).
