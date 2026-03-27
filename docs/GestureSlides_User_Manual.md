# Presentation with gesture - Complete User Manual

Version: 3.0  
Workspace: `/Users/keerthiiee/Documents/New project`

This manual explains exactly how to run and use your upgraded app with advanced design modules and expanded gesture controls.

## 1) Project Overview

`Presentation with gesture` is an advanced presentation prototype with:

- Canva-like design editor
- PowerPoint-style presentation player
- Hand + sound gesture controls
- JSON save/load backend

## 2) New Modules Added

## 2.1 Design Modules

- Template engine (`Sunset Pitch`, `Ocean Data`, `Neon Product`, `Editorial Minimal`, `Aqua Futurist`)
- Expanded background theme module (12 presets + custom CSS color input + random color generator)
- Shape module (`Rectangle`, `Circle`, `Triangle`, `Star`)
- Object styling module (fill, stroke, opacity, rotation, text, font size, font family, font weight, font style)
- Font module (10 families including Space Grotesk, Playfair Display, Orbitron, DM Serif Display)
- Layer management module (layer select, move up/down)
- Layout module (align center X, align center Y)
- Grouping module (group / ungroup)

## 2.2 Productivity Modules

- Undo / Redo
- Duplicate object
- Duplicate slide
- Image URL import
- Local image upload
- JSON export

## 2.3 Gesture Modules

- `next` and `prev` (swipe)
- `start` (palm open+close repeated twice)
- `stop` (fist hold, toggles pause/resume in presentation mode)
- `zoom_arm` (two-finger permission enables zoom mode)
- `zoom_in` and `zoom_out` (pinch spread/close while zoom mode is active)
- `next` and `prev` by claps (one clap next, two quick claps previous)

## 3) How To Start the System

Use 3 terminals.

## Terminal A - Backend

```bash
cd /Users/keerthiiee/Documents/New\ project/backend
npm install
npm run dev
```

## Terminal B - Frontend

```bash
cd /Users/keerthiiee/Documents/New\ project/frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

## Terminal C - Gesture Service

```bash
cd /Users/keerthiiee/Documents/New\ project/gesture
source .venv/bin/activate
python gesture_controller.py
```

Expected logs:

- `Gesture WebSocket server: ws://localhost:8765`
- `Sound gesture detector active (single clap next, double clap prev).`

## 4) Gesture Usage - Proper Method

## 4.1 Camera Position

1. Keep one hand in frame.
2. Distance: 40-60 cm from webcam.
3. Keep hand near center.
4. Use stable front lighting.
5. Avoid cluttered background.

## 4.2 Gesture Actions

- Swipe right -> next slide
- Swipe left -> previous slide
- Palm open + close two times -> go to first slide
- Fist hold (~0.25s) -> stop/resume gesture actions
- Show two fingers -> grant zoom permission
- Pinch open/close -> zoom in/out while zoom mode is active
- Thumbs-up -> zoom out while zoom mode is active
- One clap -> next slide
- Two quick claps -> previous slide

## 4.3 If Gestures Are Too Sensitive

Run with start disabled:

```bash
cd /Users/keerthiiee/Documents/New\ project/gesture
source .venv/bin/activate
ENABLE_START_GESTURE=0 python gesture_controller.py
```

Disable sound trigger if needed:

```bash
ENABLE_SOUND_GESTURE=0 python gesture_controller.py
```

If accidental fist detection keeps toggling STOP during clap testing:

```bash
ENABLE_STOP_GESTURE=0 python gesture_controller.py
```

If clap is not triggering, run with sound debug:

```bash
SOUND_DEBUG=1 python gesture_controller.py
```

If needed, force a specific microphone:

```bash
python -c "import sounddevice as sd; print(sd.query_devices())"
SOUND_INPUT_DEVICE=<device index or name> python gesture_controller.py
```

## 4.4 Train Gesture For Each Operation (Recommended)

Run the training wizard:

```bash
cd /Users/keerthiiee/Documents/New\ project/gesture
source .venv/bin/activate
python train_gesture_profile.py
```

This trainer lets you:

- calibrate swipe/zoom/sound thresholds from your own motion style
- map each primitive gesture to an operation (`next`, `prev`, `start`, `stop`, `zoom_arm`, `zoom_in`, `zoom_out`, `none`)
- save profile to `gesture_profile.json`

Then run normally:

```bash
python gesture_controller.py
```

Or force custom profile path:

```bash
GESTURE_PROFILE_PATH=/absolute/path/to/gesture_profile.json python gesture_controller.py
```

## 5) Editor Usage Flow (Recommended)

1. Create slide(s) from left panel.
2. Apply a template first.
3. Set a background theme.
4. Add text + shapes + images.
5. Use properties panel to style selected object.
6. Use layers panel for precise object selection.
7. Use align/group tools to structure content.
8. Save frequently.
9. Start presentation mode and test gestures.

## 6) Presentation Mode Controls

## Keyboard

- `ArrowRight` -> next
- `ArrowLeft` -> previous
- `+` / `=` -> zoom in
- `-` -> zoom out
- `0` -> zoom reset
- `Space` -> stop/resume gestures
- `Esc` -> exit presentation

## Gesture in Presentation

- Works through WebSocket events from gesture service
- Stop mode can be toggled by fist or Space
- Zoom gestures affect slide scale directly via two-finger permission + pinch controls

## 7) Keyboard Shortcuts in Editor

- `Delete` / `Backspace` -> remove selected
- `Ctrl/Cmd + Z` -> undo
- `Ctrl/Cmd + Y` -> redo
- `Ctrl/Cmd + D` -> duplicate selected object

## 8) Troubleshooting

## A) Port already in use (8765)

```bash
lsof -nP -iTCP:8765 -sTCP:LISTEN
kill <PID>
```

## B) OpenCV preview not available

Handled automatically: app continues in headless mode and still emits gesture events.

## C) Camera permission issue

Grant Terminal/Python camera permission in macOS settings.

## D) Sound trigger too frequent

- Reduce background noise
- Move away from loud fan/speakers
- Set `ENABLE_SOUND_GESTURE=0`

## 9) Final Demo Checklist

- [ ] Frontend running
- [ ] Backend running
- [ ] Gesture + sound module running
- [ ] Create and style 3-5 slides
- [ ] Save and load deck once
- [ ] Show gesture navigation + stop + zoom
- [ ] Show new modules (templates, themes, group, layers)

## 10) Quick Start Commands

```bash
# Backend
cd /Users/keerthiiee/Documents/New\ project/backend && npm run dev

# Frontend
cd /Users/keerthiiee/Documents/New\ project/frontend && npm run dev

# Gesture
cd /Users/keerthiiee/Documents/New\ project/gesture && source .venv/bin/activate && python gesture_controller.py
```
