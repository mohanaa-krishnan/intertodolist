# To-Do List

An interactive, client-side to-do list built with vanilla HTML, CSS, and JavaScript. It focuses on DOM manipulation, event handling, and local data persistence.

## Features

- **Full CRUD**: add, edit (double-click or Edit button; Enter saves, Esc cancels), complete, and delete tasks
- **Automatic persistence**: tasks and the selected filter are saved to `window.localStorage` and restored on reload; open tabs stay in sync
- **Filtering**: All, Active, and Completed, with a live "tasks left" counter and Clear completed
- **State-driven rendering**: one `state` object is the source of truth; every action updates state, saves, then re-renders
- **Dynamic DOM + delegated events**: list items are built with `createElement`/`textContent` (no `innerHTML`), and one listener per event type is attached to the list
- **Accessible**: labelled controls, `aria-pressed` filters, live-region announcements, visible focus, reduced-motion support
- **Light/dark theme** toggle, remembered between visits

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page markup |
| `style.css` | Design tokens, theme, layout, and to-do styles |
| `script.js` | Theme toggle + to-do app logic (state, storage, CRUD, filters) |
