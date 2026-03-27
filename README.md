# Presentation with gesture: PowerPoint + Canva + Multimodal Gestures

This repository is a one-week advanced prototype starter for:
- Canva-like editor (templates, themes, layers, grouping, alignment, styling)
- PowerPoint-style slide deck + presentation mode
- Hand + sound gesture control (MediaPipe + OpenCV + WebSocket + clap detection)

## 1) Architecture

```text
frontend (React + Fabric.js)
   |- slide editor
   |- presentation player
   |- WebSocket client (gesture events)
        |
        | ws://localhost:8765
        v
gesture module (Python + MediaPipe + OpenCV)
   |- detects swipe/palm open-close cycle/fist/pinch + clap audio trigger
   |- broadcasts: next / prev / start / stop / zoom_arm / zoom_in / zoom_out
        |
        | REST /api
        v
backend (Node + Express)
   |- save/load presentation JSON
```

## 2) Folder Structure

```text
frontend/
backend/
gesture/
```

## 3) Run Setup

Open 3 terminals from the project root.

### Terminal A: Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### Terminal B: Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### Terminal C: Gesture service

Use Python 3.10-3.12 recommended (MediaPipe is most stable there).

```bash
cd gesture
rm -rf .venv
/Users/keerthiiee/.pyenv/versions/3.10.13/bin/python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python gesture_controller.py
```

Gesture WebSocket runs on `ws://localhost:8765`.
The script auto-downloads `hand_landmarker.task` on first run.

If automatic download fails, download manually and place in `gesture/`:

- `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`

If you see `Could not create an NSOpenGLPixelFormat`, run this from a normal macOS desktop Terminal session (not headless/no-GUI shell).

```bash
open -a Terminal
```

If you see `address already in use` for port `8765`, stop the old gesture server:

```bash
lsof -nP -iTCP:8765 -sTCP:LISTEN
kill <PID>
```

If OpenCV windowing fails with `cv2.imshow` errors, the script now falls back to headless mode automatically and still sends gesture events over WebSocket.

If you want only swipe navigation (`next`/`prev`) and no `start` gesture:

```bash
ENABLE_START_GESTURE=0 python gesture_controller.py
```

If you want to disable clap trigger:

```bash
ENABLE_SOUND_GESTURE=0 python gesture_controller.py
```

If accidental fist detection is pausing gestures while you test clap:

```bash
ENABLE_STOP_GESTURE=0 python gesture_controller.py
```

If clap is not triggering, print live audio diagnostics:

```bash
SOUND_DEBUG=1 python gesture_controller.py
```

If needed, force a specific microphone input device:

```bash
python -c "import sounddevice as sd; print(sd.query_devices())"
SOUND_INPUT_DEVICE=<device index or name> python gesture_controller.py
```

### Train Your Own Gesture Profile

You can train/customize gesture thresholds and operation mapping:

```bash
cd gesture
source .venv/bin/activate
python train_gesture_profile.py
```

This saves a profile at `gesture/gesture_profile.json` (or custom `GESTURE_PROFILE_PATH`).
`gesture_controller.py` loads this profile automatically.

## 4) Implemented Features

- Multi-slide editor (add/select/delete slides)
- Add text, rectangle, circle, triangle, star, image (URL/upload)
- Templates + background themes + layers + grouping + alignment
- Undo/Redo + duplicate object + duplicate slide
- Save and load slides through backend JSON
- Export presentation JSON locally
- Presentation overlay with:
  - keyboard navigation (`ArrowLeft`, `ArrowRight`, `Esc`, `+`, `-`, `0`, `Space`)
  - gesture navigation via WebSocket:
    - `next`: next slide
    - `prev`: previous slide
    - `start`: palm open+close twice to jump to first slide
    - `stop`: pause/resume gesture actions
    - `zoom_arm`: two-finger permission activates zoom mode
    - `zoom_in`: pinch open zooms in (while zoom mode is active)
    - `zoom_out`: pinch close or thumbs-up zooms out (while zoom mode is active)
    - `next`: one clap
    - `prev`: two quick claps

## 5) One-Week Build Plan (Realistic)

### Day 1: Foundation
- Run frontend/backend
- Understand slide JSON and Fabric object model

### Day 2: Editor polish
- Add font picker, color picker, alignment buttons
- Add duplicate object and undo/redo stacks

### Day 3: Canva-like tools
- Add template presets
- Add object grouping and layer lock/hide

### Day 4: Presentation improvements
- Add presenter notes
- Add timer and pointer mode

### Day 5: Gesture robustness
- Tune swipe threshold
- Add confidence filtering and cooldown tuning

### Day 6: Export/Import
- Add PDF export (`html2canvas` + `jsPDF`) or server-side pipeline
- Add import of saved JSON decks

### Day 7: Demo day
- Stabilize UI
- Record walkthrough
- Prepare architecture + flow slides

## 6) Recommended Codex Prompts

Use these prompts in sequence:

1. `Add undo/redo support to the Fabric slide editor with Ctrl+Z/Ctrl+Y and toolbar buttons.`
2. `Add a right-side properties panel to edit selected object's fill, stroke, font size, and rotation.`
3. `Add slide templates and a "create from template" modal with at least 5 themes.`
4. `Improve gesture_controller.py by using velocity + moving average smoothing for swipe detection.`
5. `Add PDF export for each slide in presentation order.`

## 7) Notes

- This starter is advanced-prototype level, not full Canva production scale.
- For real-time collaboration, next step is `socket.io` or Firebase/WebRTC.
- For `.pptx` export, use a dedicated backend conversion pipeline later.
