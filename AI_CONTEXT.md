# AI Context & Developer Notes

This file serves as a persistent memory and knowledge base for AI assistants and developers working on the D&D Card Creator project. **READ THIS FIRST** when starting a new session.

## Project Overview
- **Type:** Vanilla JavaScript Web Application (Vite + ES Modules)
- **Runtime:** **MUST** run via `npm run dev`. Opening `index.html` directly fails due to CORS.
- **Language:** Hebrew (RTL) primary, English secondary - using i18n system
- **Core Functionality:** Generate D&D item cards using AI (Gemini/Imagen3/FLUX) and render on HTML5 Canvas

## Architecture (MVC Pattern)

### Controllers (`src/controllers/`)
| Controller | Responsibility |
|------------|----------------|
| `GeneratorController` | Card/image generation, AI API calls |
| `EditorController` | Form inputs → State updates |
| `RenderController` | State → Canvas rendering |
| `HistoryController` | Gallery/save/load functionality |
| `CharacterController` | Character sheet & portrait generation |
| `TabManager` | Tab navigation & lazy loading |

### Services (`src/services/`)
- `GeminiService` - All AI integrations (Gemini, Imagen3, GetImg/FLUX)
- `CardViewerService` - Modal card preview/edit
- `GetImgService` - FLUX image generation wrapper

### Core Files
| File | Lines | Responsibility |
|------|-------|----------------|
| `main.js` | ~240 | App initialization orchestrator |
| `state.js` | ~600 | Centralized state management |
| `card-renderer.js` | ~1100 | Canvas drawing (needs refactor) |
| `gemini-service.js` | ~1000 | AI APIs (needs refactor) |
| `i18n.js` | ~250 | Internationalization system |

## ⚠️ CRITICAL WARNINGS

### 1. Component Loading Timing
```javascript
// CORRECT: Wait for components
if (window.areComponentsLoaded) {
    init();
} else {
    document.addEventListener('componentsLoaded', init);
}
```

### 2. i18n Singleton (HMR Safe)
The i18n instance is stored on `window.__i18n_instance` to survive Vite HMR. Always import from `i18n.js` - don't create new instances.

### 3. RTL Positioning
`dir="rtl"` means "Left" is visually "Right". Test all positional CSS changes.

### 4. Large Files Warning
Files >500 lines are hard to maintain:
- `gemini-service.js` (998 lines) - Consider splitting by provider
- `card-renderer.js` (1086 lines) - Consider extracting utilities
- `GeneratorController.js` (940 lines) - Complex logic

### 5. Code Maintenance Rule
**DO NOT** add overrides (`!important`, duplicate listeners). **ALWAYS** find and fix the root cause.

## i18n Usage

```javascript
import i18n from './i18n.js';

// Get translation
const text = i18n.t('toasts.cardSaved');

// With parameters
const msg = i18n.t('character.creatingItemFor', { label: 'Sword' });

// Check locale
if (i18n.getLocale() === 'he') { /* Hebrew */ }

// Listen for changes
i18n.onLocaleChange((newLocale) => {
    // Update UI elements
});
```

## Key Data Flows

### Card Generation
```
User Input → GeneratorController.onGenerate()
  → GeminiService.generateItemDetails() → AI Text Response
  → GeminiService.generateItemImage() → AI Image
  → StateManager.setCardData()
  → RenderController.render() → Canvas Update
```

### Locale Change
```
Toggle Button Click → i18n.toggleLocale()
  → i18n.loadLocale() → Fetch JSON
  → i18n.updateDOM() → data-i18n elements
  → i18n.notifyListeners() → Custom callbacks
```

## Git Recovery
If code is broken: `git checkout origin/main -- <file>` or `git reset --hard origin/main`

## Testing Checklist
1. ✅ Card generates (text + image)
2. ✅ Language toggle works (EN ↔ עב)
3. ✅ Character dropdowns update with language
4. ✅ No console errors
