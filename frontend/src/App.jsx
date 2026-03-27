import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fabric } from "fabric";

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const DEFAULT_PRESENTATION_ID = "demo";
const DEFAULT_GESTURE_WS = "ws://localhost:8765";
const APP_NAME = "Presentation with gesture";
const ZOOM_ARM_WINDOW_MS = 6000;

const FONT_FAMILIES = [
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Manrope", label: "Manrope" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Bebas Neue", label: "Bebas Neue" },
  { value: "DM Serif Display", label: "DM Serif Display" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond" },
  { value: "Sora", label: "Sora" },
  { value: "Orbitron", label: "Orbitron" }
];

const TEMPLATES = [
  {
    id: "sunset-pitch",
    name: "Sunset Pitch",
    description: "Warm keynote title slide",
    apply(canvas) {
      canvas.backgroundColor = "#fff6ea";
      const blobLeft = new fabric.Circle({
        left: -120,
        top: 380,
        radius: 360,
        fill: "#ff7e30",
        opacity: 0.28,
        selectable: false
      });
      const blobRight = new fabric.Circle({
        left: 980,
        top: -120,
        radius: 320,
        fill: "#ffb020",
        opacity: 0.22,
        selectable: false
      });
      const title = new fabric.Textbox("Launch Strategy 2026", {
        left: 120,
        top: 150,
        width: 860,
        fontFamily: "Space Grotesk",
        fontWeight: 700,
        fontSize: 82,
        fill: "#141414"
      });
      const subtitle = new fabric.Textbox("Roadmap • Team • Milestones", {
        left: 128,
        top: 352,
        width: 700,
        fontFamily: "Manrope",
        fontSize: 34,
        fill: "#2a2a2a"
      });
      canvas.add(blobLeft, blobRight, title, subtitle);
    }
  },
  {
    id: "ocean-data",
    name: "Ocean Data",
    description: "Blue analytics scene",
    apply(canvas) {
      canvas.backgroundColor = "#ebf7ff";
      const strip = new fabric.Rect({
        left: 0,
        top: 0,
        width: CANVAS_WIDTH,
        height: 110,
        fill: "#004a77",
        selectable: false
      });
      const card = new fabric.Rect({
        left: 120,
        top: 170,
        width: 1040,
        height: 460,
        rx: 26,
        ry: 26,
        fill: "#ffffff",
        shadow: "0 10px 35px rgba(0,0,0,0.12)"
      });
      const heading = new fabric.Textbox("Q4 Metrics Snapshot", {
        left: 150,
        top: 32,
        width: 600,
        fontFamily: "Space Grotesk",
        fontWeight: 700,
        fontSize: 46,
        fill: "#ffffff"
      });
      const detail = new fabric.Textbox("Revenue +34%\nEngagement +21%\nRetention +17%", {
        left: 170,
        top: 230,
        width: 420,
        fontFamily: "Manrope",
        fontSize: 40,
        lineHeight: 1.28,
        fill: "#1e293b"
      });
      const circle = new fabric.Circle({
        left: 760,
        top: 260,
        radius: 170,
        fill: "#00a6ff",
        opacity: 0.85
      });
      const circleLabel = new fabric.Textbox("+34%", {
        left: 824,
        top: 378,
        width: 180,
        fontFamily: "Space Grotesk",
        fontSize: 66,
        fontWeight: 700,
        fill: "#ffffff"
      });
      canvas.add(strip, card, heading, detail, circle, circleLabel);
    }
  },
  {
    id: "neon-product",
    name: "Neon Product",
    description: "Bold product launch mood",
    apply(canvas) {
      canvas.backgroundColor = "#0d0f21";
      const glowA = new fabric.Circle({
        left: 110,
        top: 90,
        radius: 250,
        fill: "#00d1ff",
        opacity: 0.25,
        selectable: false
      });
      const glowB = new fabric.Circle({
        left: 870,
        top: 250,
        radius: 280,
        fill: "#ff3d8d",
        opacity: 0.22,
        selectable: false
      });
      const title = new fabric.Textbox("Product Reveal", {
        left: 120,
        top: 140,
        width: 800,
        fontFamily: "Space Grotesk",
        fontWeight: 700,
        fontSize: 96,
        fill: "#ffffff"
      });
      const text = new fabric.Textbox("Immersive design, gesture-first control, and modern presentation workflow.", {
        left: 122,
        top: 350,
        width: 860,
        fontFamily: "Manrope",
        fontSize: 32,
        lineHeight: 1.3,
        fill: "#cde7ff"
      });
      const badge = new fabric.Rect({
        left: 122,
        top: 540,
        width: 310,
        height: 82,
        rx: 18,
        ry: 18,
        fill: "#ffffff"
      });
      const badgeText = new fabric.Textbox("LIVE DEMO", {
        left: 188,
        top: 565,
        width: 220,
        fontFamily: "Space Grotesk",
        fontSize: 32,
        fontWeight: 700,
        fill: "#0d0f21"
      });
      canvas.add(glowA, glowB, title, text, badge, badgeText);
    }
  },
  {
    id: "editorial-minimal",
    name: "Editorial Minimal",
    description: "Magazine style narrative frame",
    apply(canvas) {
      canvas.backgroundColor = "#f8f6f1";
      const rail = new fabric.Rect({
        left: 88,
        top: 80,
        width: 8,
        height: 560,
        fill: "#18181b",
        selectable: false
      });
      const title = new fabric.Textbox("Quarterly Story", {
        left: 140,
        top: 120,
        width: 820,
        fontFamily: "Playfair Display",
        fontWeight: 700,
        fontSize: 90,
        fill: "#1f1f22"
      });
      const body = new fabric.Textbox("Design, growth, and market response in one concise visual narrative.", {
        left: 146,
        top: 330,
        width: 760,
        fontFamily: "Manrope",
        fontSize: 30,
        lineHeight: 1.34,
        fill: "#374151"
      });
      const tag = new fabric.Textbox("REPORT", {
        left: 146,
        top: 560,
        width: 280,
        fontFamily: "Bebas Neue",
        fontSize: 52,
        fill: "#18181b",
        charSpacing: 110
      });
      canvas.add(rail, title, body, tag);
    }
  },
  {
    id: "aqua-futurist",
    name: "Aqua Futurist",
    description: "High-contrast futuristic dashboard",
    apply(canvas) {
      canvas.backgroundColor = "#081025";
      const panel = new fabric.Rect({
        left: 90,
        top: 88,
        width: 1100,
        height: 544,
        rx: 26,
        ry: 26,
        fill: "rgba(11, 35, 65, 0.84)",
        stroke: "#15e1d6",
        strokeWidth: 2
      });
      const halo = new fabric.Circle({
        left: 845,
        top: 180,
        radius: 160,
        fill: "#15e1d6",
        opacity: 0.18
      });
      const title = new fabric.Textbox("Control Center", {
        left: 150,
        top: 150,
        width: 620,
        fontFamily: "Orbitron",
        fontWeight: 700,
        fontSize: 72,
        fill: "#f6fdff"
      });
      const kpi = new fabric.Textbox("89.6%\\nUptime", {
        left: 885,
        top: 278,
        width: 230,
        fontFamily: "Sora",
        fontWeight: 700,
        fontSize: 46,
        fill: "#d8ffff"
      });
      const body = new fabric.Textbox("Gesture-aware controls with real-time deck command routing.", {
        left: 154,
        top: 338,
        width: 610,
        fontFamily: "Sora",
        fontSize: 28,
        lineHeight: 1.3,
        fill: "#9bd6ff"
      });
      canvas.add(panel, halo, title, kpi, body);
    }
  }
];

const BACKGROUND_THEMES = [
  { id: "paper", name: "Paper", color: "#ffffff" },
  { id: "cream", name: "Cream", color: "#fff8ec" },
  { id: "mint", name: "Mint", color: "#ebfff8" },
  { id: "sky", name: "Sky", color: "#ecf6ff" },
  { id: "peach", name: "Peach", color: "#ffe9df" },
  { id: "rose", name: "Rose", color: "#ffe7ef" },
  { id: "lavender", name: "Lavender", color: "#f2ecff" },
  { id: "aqua", name: "Aqua", color: "#def9ff" },
  { id: "sage", name: "Sage", color: "#e7f4ea" },
  { id: "sand", name: "Sand", color: "#f8f1de" },
  { id: "slate", name: "Slate", color: "#1f2937" },
  { id: "night", name: "Night", color: "#0f172a" }
];

function createStarPoints(spikes = 5, outerRadius = 120, innerRadius = 55) {
  const step = Math.PI / spikes;
  let rotation = -Math.PI / 2;
  const points = [];

  for (let i = 0; i < spikes; i += 1) {
    points.push({
      x: Math.cos(rotation) * outerRadius,
      y: Math.sin(rotation) * outerRadius
    });
    rotation += step;
    points.push({
      x: Math.cos(rotation) * innerRadius,
      y: Math.sin(rotation) * innerRadius
    });
    rotation += step;
  }

  return points;
}

function createSlide(seed) {
  return { id: `slide-${seed}`, objects: [] };
}

function cloneObjects(objects) {
  return JSON.parse(JSON.stringify(objects ?? []));
}

function clampSlideIndex(value, total) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(value, total - 1));
}

function makeLayerName(object, index) {
  if (!object) return `Layer ${index + 1}`;
  if (object.type === "textbox") {
    const preview = (object.text ?? "Text").trim().slice(0, 18);
    return `Text: ${preview || "Untitled"}`;
  }
  if (object.type === "rect") return `Rectangle ${index + 1}`;
  if (object.type === "circle") return `Circle ${index + 1}`;
  if (object.type === "image") return `Image ${index + 1}`;
  return `${object.type ?? "Object"} ${index + 1}`;
}

function normalizeGestureAction(rawGesture) {
  if (typeof rawGesture !== "string") return "";
  const gesture = rawGesture.trim().toLowerCase();

  const nextAliases = new Set([
    "next",
    "next_slide",
    "forward",
    "sound_next",
    "clap_next",
    "clap_single",
    "single_clap"
  ]);
  const prevAliases = new Set(["prev", "previous", "previous_slide", "back", "clap_double", "double_clap"]);
  const startAliases = new Set(["start", "home", "first_slide"]);
  const stopAliases = new Set(["stop", "pause", "resume", "toggle_pause", "toggle_gesture"]);
  const zoomInAliases = new Set(["zoom_in", "zoomin", "plus", "magnify_in"]);
  const zoomOutAliases = new Set(["zoom_out", "zoomout", "minus", "magnify_out", "thumb_up", "thumbs_up"]);
  const zoomArmAliases = new Set([
    "zoom_arm",
    "two_finger_permission",
    "two_finger_zoom",
    "two_fingers",
    "zoom_permission"
  ]);

  if (nextAliases.has(gesture)) return "next";
  if (prevAliases.has(gesture)) return "prev";
  if (startAliases.has(gesture)) return "start";
  if (stopAliases.has(gesture)) return "stop";
  if (zoomArmAliases.has(gesture)) return "zoom_arm";
  if (zoomInAliases.has(gesture)) return "zoom_in";
  if (zoomOutAliases.has(gesture)) return "zoom_out";
  if (gesture === "none") return "none";
  return gesture;
}

function isValidCssColor(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const sample = new Option().style;
  sample.color = "";
  sample.color = value.trim();
  return sample.color !== "";
}

function toColorInputValue(value, fallback = "#111111") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const hex = trimmed.slice(1).split("");
    return `#${hex.map((part) => `${part}${part}`).join("")}`.toLowerCase();
  }
  return fallback;
}

function loadObjectsIntoCanvas(canvas, objects, callback) {
  if (!canvas) return;
  canvas.clear();
  canvas.backgroundColor = "#ffffff";

  const serialized = cloneObjects(objects);
  if (!serialized.length) {
    canvas.renderAll();
    if (callback) callback();
    return;
  }

  fabric.util.enlivenObjects(serialized, (enlivened) => {
    enlivened.forEach((object) => canvas.add(object));
    canvas.renderAll();
    if (callback) callback();
  });
}

function PresentationOverlay({ slides, startIndex, onClose }) {
  const canvasElRef = useRef(null);
  const staticCanvasRef = useRef(null);
  const zoomArmTimerRef = useRef(null);
  const gesturePausedRef = useRef(false);
  const zoomArmedRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [gestureState, setGestureState] = useState("Disconnected");
  const [lastGesture, setLastGesture] = useState("none");
  const [zoomScale, setZoomScale] = useState(1);
  const [gesturePaused, setGesturePaused] = useState(false);
  const [zoomArmed, setZoomArmed] = useState(false);

  const totalSlides = slides.length;

  const armZoomWindow = useCallback(() => {
    setZoomArmed(true);
    zoomArmedRef.current = true;
    if (zoomArmTimerRef.current) {
      clearTimeout(zoomArmTimerRef.current);
    }
    zoomArmTimerRef.current = setTimeout(() => {
      setZoomArmed(false);
      zoomArmedRef.current = false;
      zoomArmTimerRef.current = null;
    }, ZOOM_ARM_WINDOW_MS);
  }, []);

  useEffect(() => {
    gesturePausedRef.current = gesturePaused;
  }, [gesturePaused]);

  useEffect(() => {
    zoomArmedRef.current = zoomArmed;
  }, [zoomArmed]);

  useEffect(() => {
    const staticCanvas = new fabric.StaticCanvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#ffffff"
    });

    staticCanvasRef.current = staticCanvas;
    loadObjectsIntoCanvas(staticCanvas, slides[startIndex]?.objects ?? []);

    return () => {
      staticCanvas.dispose();
      staticCanvasRef.current = null;
      if (zoomArmTimerRef.current) {
        clearTimeout(zoomArmTimerRef.current);
        zoomArmTimerRef.current = null;
      }
    };
  }, [slides, startIndex]);

  useEffect(() => {
    loadObjectsIntoCanvas(staticCanvasRef.current, slides[currentIndex]?.objects ?? []);
  }, [currentIndex, slides]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        setCurrentIndex((value) => clampSlideIndex(value + 1, totalSlides));
      }
      if (event.key === "ArrowLeft") {
        setCurrentIndex((value) => clampSlideIndex(value - 1, totalSlides));
      }
      if (event.key === "+" || event.key === "=") {
        setZoomScale((value) => Math.min(2.4, Number((value + 0.12).toFixed(2))));
      }
      if (event.key === "-" || event.key === "_") {
        setZoomScale((value) => Math.max(0.5, Number((value - 0.12).toFixed(2))));
      }
      if (event.key === "0") {
        setZoomScale(1);
      }
      if (event.key === " ") {
        event.preventDefault();
        setGesturePaused((value) => !value);
      }
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, totalSlides]);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_GESTURE_WS || DEFAULT_GESTURE_WS;
    let socket;

    try {
      socket = new WebSocket(wsUrl);
      setGestureState("Connecting");
      socket.onopen = () => setGestureState("Connected");
      socket.onclose = () => setGestureState("Disconnected");
      socket.onerror = () => setGestureState("Error");

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload.gesture) return;
          const gesture = normalizeGestureAction(payload.gesture);
          setLastGesture(gesture);

          if (!gesture || gesture === "none" || gesture === "connected") return;

          if (gesture === "stop") {
            setGesturePaused((value) => !value);
            return;
          }

          if (gesturePausedRef.current) return;

          if (gesture === "zoom_arm") {
            armZoomWindow();
            return;
          }

          if (gesture === "next" || gesture === "sound_next" || gesture === "clap_next" || gesture === "clap_single") {
            setCurrentIndex((value) => clampSlideIndex(value + 1, totalSlides));
          }
          if (gesture === "prev") {
            setCurrentIndex((value) => clampSlideIndex(value - 1, totalSlides));
          }
          if (gesture === "start") {
            setCurrentIndex(0);
          }
          if (gesture === "zoom_in") {
            if (!zoomArmedRef.current) return;
            setZoomScale((value) => Math.min(2.4, Number((value + 0.12).toFixed(2))));
          }
          if (gesture === "zoom_out") {
            if (!zoomArmedRef.current) return;
            setZoomScale((value) => Math.max(0.5, Number((value - 0.12).toFixed(2))));
          }
        } catch {
          setGestureState("Payload Error");
        }
      };
    } catch {
      setGestureState("Connection Failed");
    }

    return () => {
      if (socket) socket.close();
    };
  }, [armZoomWindow, totalSlides]);

  return (
    <div className="presentation-overlay">
      <header className="presentation-top">
        <div className="presentation-pill">Slide {currentIndex + 1}/{totalSlides}</div>
        <div className="presentation-pill">
          Gesture: {gestureState} | Last: {lastGesture} | Mode: {gesturePaused ? "Paused" : "Live"}
        </div>
        <div className="presentation-pill">Zoom Mode: {zoomArmed ? "Active" : "Inactive"}</div>
        <div className="presentation-pill">Zoom: {Math.round(zoomScale * 100)}%</div>
        <button className="danger" onClick={onClose}>
          Exit
        </button>
      </header>

      <div className="presentation-main">
        <div className="presentation-canvas-wrap" style={{ transform: `scale(${zoomScale})` }}>
          <canvas ref={canvasElRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
        </div>
      </div>

      <footer className="presentation-bottom">
        <button onClick={() => setCurrentIndex((value) => clampSlideIndex(value - 1, totalSlides))}>
          Previous
        </button>
        <button onClick={() => setCurrentIndex((value) => clampSlideIndex(value + 1, totalSlides))}>
          Next
        </button>
        <button onClick={() => setZoomScale((value) => Math.max(0.5, Number((value - 0.12).toFixed(2))))}>
          Zoom Out
        </button>
        <button onClick={() => setZoomScale((value) => Math.min(2.4, Number((value + 0.12).toFixed(2))))}>
          Zoom In
        </button>
        <button onClick={armZoomWindow}>Arm Zoom</button>
        <button onClick={() => setGesturePaused((value) => !value)}>
          {gesturePaused ? "Resume Gestures" : "Stop Gestures"}
        </button>
      </footer>
    </div>
  );
}

export default function App() {
  const canvasElRef = useRef(null);
  const fileInputRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  const slidesRef = useRef([createSlide(1)]);
  const currentSlideIndexRef = useRef(0);
  const historyRef = useRef({});
  const ignoreSelectionUpdateRef = useRef(false);
  const ignoreMutationEventsRef = useRef(false);

  const [slides, setSlides] = useState(slidesRef.current);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [apiStatus, setApiStatus] = useState("Ready. Build your presentation.");
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationSlides, setPresentationSlides] = useState([]);
  const [customBackgroundColor, setCustomBackgroundColor] = useState("#ffffff");

  const [selectedObject, setSelectedObject] = useState(null);
  const [layerItems, setLayerItems] = useState([]);
  const [activeLayerIndex, setActiveLayerIndex] = useState(-1);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    currentSlideIndexRef.current = currentSlideIndex;
  }, [currentSlideIndex]);

  const getCanvasObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return [];
    const json = canvas.toJSON();
    return cloneObjects(json.objects);
  }, []);

  const updateCurrentSlideObjects = useCallback((objects, baseSlides = slidesRef.current) => {
    const updated = baseSlides.map((slide, index) =>
      index === currentSlideIndexRef.current ? { ...slide, objects: cloneObjects(objects) } : slide
    );

    slidesRef.current = updated;
    setSlides(updated);
    return updated;
  }, []);

  const ensureHistoryEntry = useCallback((slideId, initialObjects = []) => {
    if (!historyRef.current[slideId]) {
      historyRef.current[slideId] = {
        states: [cloneObjects(initialObjects)],
        pointer: 0
      };
    }
  }, []);

  const updateHistoryBadges = useCallback((slideId) => {
    const history = historyRef.current[slideId];
    if (!history) {
      setHistoryState({ canUndo: false, canRedo: false });
      return;
    }
    setHistoryState({
      canUndo: history.pointer > 0,
      canRedo: history.pointer < history.states.length - 1
    });
  }, []);

  const pushHistoryState = useCallback(
    (slideId, objects) => {
      const history = historyRef.current[slideId];
      if (!history) return;

      const snapshot = cloneObjects(objects);
      const current = history.states[history.pointer] ?? [];
      if (JSON.stringify(current) === JSON.stringify(snapshot)) {
        updateHistoryBadges(slideId);
        return;
      }

      history.states = history.states.slice(0, history.pointer + 1);
      history.states.push(snapshot);
      if (history.states.length > 60) {
        history.states.shift();
      }
      history.pointer = history.states.length - 1;
      updateHistoryBadges(slideId);
    },
    [updateHistoryBadges]
  );

  const refreshLayerPanel = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const layers = objects.map((object, index) => ({
      index,
      name: makeLayerName(object, index),
      type: object.type ?? "object"
    }));

    setLayerItems(layers.reverse());

    const active = canvas.getActiveObject();
    if (!active) {
      setActiveLayerIndex(-1);
      return;
    }

    setActiveLayerIndex(objects.indexOf(active));
  }, []);

  const refreshSelection = useCallback(() => {
    if (ignoreSelectionUpdateRef.current) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject();
    if (!active || canvas.getActiveObjects().length > 1) {
      setSelectedObject(null);
      refreshLayerPanel();
      return;
    }

    const fill = typeof active.fill === "string" ? active.fill : "#111111";
    const stroke = typeof active.stroke === "string" ? active.stroke : "#111111";
    const fontFamily = typeof active.fontFamily === "string" && active.fontFamily.trim()
      ? active.fontFamily
      : "Space Grotesk";

    setSelectedObject({
      type: active.type,
      fill,
      stroke,
      opacity: Number(active.opacity ?? 1),
      angle: Number(active.angle ?? 0),
      fontSize: Number(active.fontSize ?? 40),
      fontFamily,
      fontWeight: String(
        typeof active.fontWeight === "number" ? active.fontWeight : active.fontWeight === "bold" ? 700 : 600
      ),
      fontStyle: active.fontStyle === "italic" ? "italic" : "normal",
      text: active.type === "textbox" ? active.text ?? "" : ""
    });
    refreshLayerPanel();
  }, [refreshLayerPanel]);

  const commitCanvasChange = useCallback(
    (statusMessage) => {
      const slide = slidesRef.current[currentSlideIndexRef.current];
      if (!slide) return;

      const objects = getCanvasObjects();
      updateCurrentSlideObjects(objects);
      pushHistoryState(slide.id, objects);
      refreshSelection();
      refreshLayerPanel();
      if (statusMessage) setApiStatus(statusMessage);
    },
    [getCanvasObjects, pushHistoryState, refreshLayerPanel, refreshSelection, updateCurrentSlideObjects]
  );

  const loadSlideOnCanvas = useCallback(
    (objects) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      ignoreSelectionUpdateRef.current = true;
      ignoreMutationEventsRef.current = true;
      loadObjectsIntoCanvas(canvas, objects, () => {
        ignoreSelectionUpdateRef.current = false;
        ignoreMutationEventsRef.current = false;
        refreshSelection();
        refreshLayerPanel();
      });
    },
    [refreshLayerPanel, refreshSelection]
  );

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      selection: true
    });

    fabricCanvasRef.current = canvas;
    ensureHistoryEntry(slidesRef.current[0].id, slidesRef.current[0].objects);
    updateHistoryBadges(slidesRef.current[0].id);
    loadSlideOnCanvas(slidesRef.current[0].objects);

    const onObjectModified = () => {
      if (ignoreMutationEventsRef.current) return;
      commitCanvasChange();
    };
    canvas.on("object:modified", onObjectModified);
    canvas.on("object:removed", onObjectModified);
    canvas.on("selection:created", refreshSelection);
    canvas.on("selection:updated", refreshSelection);
    canvas.on("selection:cleared", refreshSelection);

    return () => {
      canvas.off("object:modified", onObjectModified);
      canvas.off("object:removed", onObjectModified);
      canvas.off("selection:created", refreshSelection);
      canvas.off("selection:updated", refreshSelection);
      canvas.off("selection:cleared", refreshSelection);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [commitCanvasChange, ensureHistoryEntry, loadSlideOnCanvas, refreshSelection, updateHistoryBadges]);

  const withCanvasMutation = useCallback(
    (mutator, statusMessage) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      ignoreMutationEventsRef.current = true;
      try {
        mutator(canvas);
      } finally {
        ignoreMutationEventsRef.current = false;
      }
      canvas.requestRenderAll();
      commitCanvasChange(statusMessage);
    },
    [commitCanvasChange]
  );

  const selectSlide = useCallback(
    (index) => {
      if (index === currentSlideIndexRef.current) return;

      commitCanvasChange();

      const target = clampSlideIndex(index, slidesRef.current.length);
      const targetSlide = slidesRef.current[target];
      if (!targetSlide) return;

      setCurrentSlideIndex(target);
      currentSlideIndexRef.current = target;
      ensureHistoryEntry(targetSlide.id, targetSlide.objects);
      updateHistoryBadges(targetSlide.id);
      loadSlideOnCanvas(targetSlide.objects);
      setApiStatus(`Switched to slide ${target + 1}`);
    },
    [commitCanvasChange, ensureHistoryEntry, loadSlideOnCanvas, updateHistoryBadges]
  );

  const addSlide = useCallback(() => {
    commitCanvasChange();

    const nextSlide = createSlide(Date.now());
    const nextSlides = [...slidesRef.current, nextSlide];
    slidesRef.current = nextSlides;
    setSlides(nextSlides);

    ensureHistoryEntry(nextSlide.id, []);

    const nextIndex = nextSlides.length - 1;
    setCurrentSlideIndex(nextIndex);
    currentSlideIndexRef.current = nextIndex;
    updateHistoryBadges(nextSlide.id);
    loadSlideOnCanvas([]);
    setApiStatus("New slide created.");
  }, [commitCanvasChange, ensureHistoryEntry, loadSlideOnCanvas, updateHistoryBadges]);

  const deleteSlide = useCallback(
    (index) => {
      if (slidesRef.current.length === 1) return;

      commitCanvasChange();

      const deleting = slidesRef.current[index];
      const nextSlides = slidesRef.current.filter((_, slideIndex) => slideIndex !== index);
      delete historyRef.current[deleting.id];

      const nextIndex = clampSlideIndex(currentSlideIndexRef.current, nextSlides.length);
      slidesRef.current = nextSlides;
      setSlides(nextSlides);
      setCurrentSlideIndex(nextIndex);
      currentSlideIndexRef.current = nextIndex;

      const targetSlide = nextSlides[nextIndex];
      ensureHistoryEntry(targetSlide.id, targetSlide.objects);
      updateHistoryBadges(targetSlide.id);
      loadSlideOnCanvas(targetSlide.objects);
      setApiStatus("Slide deleted.");
    },
    [commitCanvasChange, ensureHistoryEntry, loadSlideOnCanvas, updateHistoryBadges]
  );

  const addTextbox = useCallback(() => {
    withCanvasMutation((canvas) => {
      const text = new fabric.Textbox("Your headline", {
        left: 140,
        top: 140,
        width: 560,
        fontSize: 68,
        fill: "#111827",
        fontFamily: "Space Grotesk",
        fontWeight: 700
      });
      canvas.add(text);
      canvas.setActiveObject(text);
    }, "Textbox added.");
  }, [withCanvasMutation]);

  const addRectangle = useCallback(() => {
    withCanvasMutation((canvas) => {
      const rect = new fabric.Rect({
        left: 220,
        top: 240,
        width: 340,
        height: 190,
        rx: 26,
        ry: 26,
        fill: "#ff7a18",
        opacity: 0.92
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    }, "Rectangle added.");
  }, [withCanvasMutation]);

  const addCircle = useCallback(() => {
    withCanvasMutation((canvas) => {
      const circle = new fabric.Circle({
        left: 320,
        top: 260,
        radius: 120,
        fill: "#17c6a3",
        opacity: 0.9
      });
      canvas.add(circle);
      canvas.setActiveObject(circle);
    }, "Circle added.");
  }, [withCanvasMutation]);

  const addTriangle = useCallback(() => {
    withCanvasMutation((canvas) => {
      const triangle = new fabric.Triangle({
        left: 260,
        top: 230,
        width: 260,
        height: 220,
        fill: "#3b82f6",
        opacity: 0.92
      });
      canvas.add(triangle);
      canvas.setActiveObject(triangle);
    }, "Triangle added.");
  }, [withCanvasMutation]);

  const addStar = useCallback(() => {
    withCanvasMutation((canvas) => {
      const star = new fabric.Polygon(createStarPoints(5, 120, 58), {
        left: 290,
        top: 210,
        fill: "#f43f5e",
        stroke: "#be123c",
        strokeWidth: 2,
        opacity: 0.95
      });
      canvas.add(star);
      canvas.setActiveObject(star);
    }, "Star added.");
  }, [withCanvasMutation]);

  const addImageFromUrl = useCallback(() => {
    const url = window.prompt("Paste image URL");
    if (!url) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    fabric.Image.fromURL(
      url,
      (image) => {
        withCanvasMutation((activeCanvas) => {
          if (image.width && image.width > 420) {
            image.scaleToWidth(420);
          }
          image.set({ left: 220, top: 180 });
          activeCanvas.add(image);
          activeCanvas.setActiveObject(image);
        }, "Image added from URL.");
      },
      { crossOrigin: "anonymous" }
    );
  }, [withCanvasMutation]);

  const addImageFromFile = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      fabric.Image.fromURL(String(reader.result), (image) => {
        withCanvasMutation((activeCanvas) => {
          if (image.width && image.width > 500) {
            image.scaleToWidth(500);
          }
          image.set({ left: 180, top: 160 });
          activeCanvas.add(image);
          activeCanvas.setActiveObject(image);
        }, "Image uploaded from computer.");
      });
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  }, [withCanvasMutation]);

  const removeSelected = useCallback(() => {
    withCanvasMutation((canvas) => {
      const selected = canvas.getActiveObjects();
      selected.forEach((object) => canvas.remove(object));
      canvas.discardActiveObject();
    }, "Selected object(s) removed.");
  }, [withCanvasMutation]);

  const duplicateSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject();
    if (!active) return;

    active.clone((cloned) => {
      withCanvasMutation((activeCanvas) => {
        cloned.set({
          left: (active.left ?? 120) + 26,
          top: (active.top ?? 120) + 26
        });
        activeCanvas.add(cloned);
        activeCanvas.setActiveObject(cloned);
      }, "Object duplicated.");
    });
  }, [withCanvasMutation]);

  const groupSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const selected = canvas.getActiveObjects();
    if (selected.length < 2) return;

    withCanvasMutation((activeCanvas) => {
      const selection = activeCanvas.getActiveObject();
      if (selection && selection.type === "activeSelection") {
        selection.toGroup();
      }
    }, "Objects grouped.");
  }, [withCanvasMutation]);

  const ungroupSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== "group") return;

    withCanvasMutation((activeCanvas) => {
      active.toActiveSelection();
      activeCanvas.requestRenderAll();
    }, "Group ungrouped.");
  }, [withCanvasMutation]);

  const alignSelectedCenter = useCallback(
    (axis) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active) return;

      withCanvasMutation((activeCanvas) => {
        if (axis === "x") {
          active.set({
            left: CANVAS_WIDTH / 2 - ((active.getScaledWidth?.() ?? active.width ?? 0) / 2)
          });
        } else {
          active.set({
            top: CANVAS_HEIGHT / 2 - ((active.getScaledHeight?.() ?? active.height ?? 0) / 2)
          });
        }
        active.setCoords();
        activeCanvas.setActiveObject(active);
      }, axis === "x" ? "Aligned to center horizontally." : "Aligned to center vertically.");
    },
    [withCanvasMutation]
  );

  const applyTemplate = useCallback((templateId) => {
    const template = TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return;

    withCanvasMutation((canvas) => {
      canvas.clear();
      canvas.backgroundColor = "#ffffff";
      template.apply(canvas);
    }, `Template applied: ${template.name}`);
  }, [withCanvasMutation]);

  const applyBackgroundTheme = useCallback(
    (themeId) => {
      const theme = BACKGROUND_THEMES.find((entry) => entry.id === themeId);
      if (!theme) return;

      withCanvasMutation((canvas) => {
        canvas.backgroundColor = theme.color;
        const objects = canvas.getObjects();
        if (theme.id === "night") {
          objects.forEach((object) => {
            if (object.type === "textbox" && (!object.fill || object.fill === "#111827")) {
              object.set("fill", "#f8fafc");
            }
          });
        }
      }, `Background applied: ${theme.name}`);
    },
    [withCanvasMutation]
  );

  const applyCustomBackground = useCallback(() => {
    const value = customBackgroundColor.trim();
    if (!isValidCssColor(value)) {
      setApiStatus("Invalid custom color. Use HEX, RGB, HSL, or CSS color names.");
      return;
    }

    withCanvasMutation((canvas) => {
      canvas.backgroundColor = value;
    }, `Background applied: ${value}`);
  }, [customBackgroundColor, withCanvasMutation]);

  const randomizeBackground = useCallback(() => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 28);
    const lightness = 78 + Math.floor(Math.random() * 16);
    const value = `hsl(${hue} ${saturation}% ${lightness}%)`;
    setCustomBackgroundColor(value);

    withCanvasMutation((canvas) => {
      canvas.backgroundColor = value;
    }, `Random background generated: ${value}`);
  }, [withCanvasMutation]);

  const moveLayer = useCallback((direction) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject();
    if (!active) return;

    withCanvasMutation((activeCanvas) => {
      if (direction === "up") activeCanvas.bringForward(active);
      if (direction === "down") activeCanvas.sendBackwards(active);
      activeCanvas.setActiveObject(active);
    }, "Layer order updated.");
  }, [withCanvasMutation]);

  const duplicateCurrentSlide = useCallback(() => {
    commitCanvasChange();
    const current = slidesRef.current[currentSlideIndexRef.current];
    if (!current) return;

    const clonedSlide = {
      id: `slide-${Date.now()}`,
      objects: cloneObjects(current.objects)
    };

    const insertAt = currentSlideIndexRef.current + 1;
    const nextSlides = [...slidesRef.current];
    nextSlides.splice(insertAt, 0, clonedSlide);

    slidesRef.current = nextSlides;
    setSlides(nextSlides);
    ensureHistoryEntry(clonedSlide.id, clonedSlide.objects);
    setCurrentSlideIndex(insertAt);
    currentSlideIndexRef.current = insertAt;
    updateHistoryBadges(clonedSlide.id);
    loadSlideOnCanvas(clonedSlide.objects);
    setApiStatus("Current slide duplicated.");
  }, [commitCanvasChange, ensureHistoryEntry, loadSlideOnCanvas, updateHistoryBadges]);

  const selectLayer = useCallback((index) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const object = canvas.getObjects()[index];
    if (!object) return;

    canvas.discardActiveObject();
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    refreshSelection();
  }, [refreshSelection]);

  const updateActiveObjectProperty = useCallback(
    (property, rawValue) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active || canvas.getActiveObjects().length > 1) return;

      let value = rawValue;
      if (property === "opacity" || property === "angle" || property === "fontSize" || property === "fontWeight") {
        value = Number(rawValue);
      }

      withCanvasMutation((activeCanvas) => {
        if (property === "text" && active.type === "textbox") {
          active.text = String(value);
        } else {
          active.set(property, value);
        }

        if (property === "fill" && !active.stroke) {
          active.set("stroke", "#000000");
        }

        active.setCoords();
        activeCanvas.setActiveObject(active);
      }, `Updated ${property}.`);
    },
    [withCanvasMutation]
  );

  const undo = useCallback(() => {
    const slide = slidesRef.current[currentSlideIndexRef.current];
    if (!slide) return;

    const history = historyRef.current[slide.id];
    if (!history || history.pointer <= 0) return;

    history.pointer -= 1;
    const snapshot = cloneObjects(history.states[history.pointer]);
    updateCurrentSlideObjects(snapshot);
    loadSlideOnCanvas(snapshot);
    updateHistoryBadges(slide.id);
    setApiStatus("Undo applied.");
  }, [loadSlideOnCanvas, updateCurrentSlideObjects, updateHistoryBadges]);

  const redo = useCallback(() => {
    const slide = slidesRef.current[currentSlideIndexRef.current];
    if (!slide) return;

    const history = historyRef.current[slide.id];
    if (!history || history.pointer >= history.states.length - 1) return;

    history.pointer += 1;
    const snapshot = cloneObjects(history.states[history.pointer]);
    updateCurrentSlideObjects(snapshot);
    loadSlideOnCanvas(snapshot);
    updateHistoryBadges(slide.id);
    setApiStatus("Redo applied.");
  }, [loadSlideOnCanvas, updateCurrentSlideObjects, updateHistoryBadges]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isPresentationMode) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      const command = event.metaKey || event.ctrlKey;

      if ((event.key === "Delete" || event.key === "Backspace") && !command) {
        event.preventDefault();
        removeSelected();
      }

      if (command && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if (command && (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey))) {
        event.preventDefault();
        redo();
      }

      if (command && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [duplicateSelected, isPresentationMode, redo, removeSelected, undo]);

  const loadPresentation = useCallback(async () => {
    try {
      setApiStatus("Loading presentation...");
      const response = await fetch(`/api/presentation/${DEFAULT_PRESENTATION_ID}`);
      if (!response.ok) throw new Error("Load failed");

      const payload = await response.json();
      const incomingSlides = Array.isArray(payload.slides) ? payload.slides : [];
      const normalized =
        incomingSlides.length > 0
          ? incomingSlides.map((slide, index) => ({
              id: slide.id ?? `slide-${index + 1}`,
              objects: Array.isArray(slide.objects) ? slide.objects : []
            }))
          : [createSlide(1)];

      historyRef.current = {};
      normalized.forEach((slide) => ensureHistoryEntry(slide.id, slide.objects));

      slidesRef.current = normalized;
      setSlides(normalized);
      setCurrentSlideIndex(0);
      currentSlideIndexRef.current = 0;

      updateHistoryBadges(normalized[0].id);
      loadSlideOnCanvas(normalized[0].objects);
      setApiStatus(`Loaded ${normalized.length} slide(s).`);
    } catch {
      setApiStatus("Could not load. Make sure backend is running.");
    }
  }, [ensureHistoryEntry, loadSlideOnCanvas, updateHistoryBadges]);

  const savePresentation = useCallback(async () => {
    commitCanvasChange();
    const preparedSlides = slidesRef.current;

    try {
      setApiStatus("Saving presentation...");
      const response = await fetch(`/api/presentation/${DEFAULT_PRESENTATION_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: DEFAULT_PRESENTATION_ID,
          slides: preparedSlides
        })
      });
      if (!response.ok) throw new Error("Save failed");
      setApiStatus(`Saved ${preparedSlides.length} slide(s) to backend.`);
    } catch {
      setApiStatus("Save failed. Backend should run on port 4000.");
    }
  }, [commitCanvasChange]);

  const exportJson = useCallback(() => {
    commitCanvasChange();
    const payload = JSON.stringify({ id: DEFAULT_PRESENTATION_ID, slides: slidesRef.current }, null, 2);

    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "keerthi-hand-gesture-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setApiStatus("JSON exported.");
  }, [commitCanvasChange]);

  const startPresentation = useCallback(() => {
    commitCanvasChange();
    setPresentationSlides(cloneObjects(slidesRef.current));
    setIsPresentationMode(true);
  }, [commitCanvasChange]);

  const currentSlideNumber = useMemo(() => currentSlideIndex + 1, [currentSlideIndex]);

  return (
    <div className="studio-root">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden-upload"
        accept="image/*"
        onChange={addImageFromFile}
      />

      <header className="top-banner">
        <div>
          <h1>{APP_NAME}</h1>
          <p>Presentation with gesture</p>
        </div>
        <div className="banner-actions">
          <button onClick={loadPresentation}>Load</button>
          <button onClick={savePresentation}>Save</button>
          <button onClick={exportJson}>Export JSON</button>
          <button className="primary" onClick={startPresentation}>
            Present
          </button>
        </div>
      </header>

      <main className="studio-grid">
        <aside className="glass-panel left-panel">
          <div className="panel-headline">
            <h2>Slides</h2>
            <div className="panel-actions">
              <button onClick={addSlide}>+ New</button>
              <button onClick={duplicateCurrentSlide}>Duplicate</button>
            </div>
          </div>

          <div className="slide-list">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`slide-card ${index === currentSlideIndex ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => selectSlide(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") selectSlide(index);
                }}
              >
                <span>Slide {index + 1}</span>
                <button
                  className="danger ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteSlide(index);
                  }}
                  disabled={slides.length === 1}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="template-section">
            <h3>Templates</h3>
            {TEMPLATES.map((template) => (
              <button key={template.id} className="template-chip" onClick={() => applyTemplate(template.id)}>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>

          <div className="template-section">
            <h3>Background Themes</h3>
            <div className="theme-grid">
              {BACKGROUND_THEMES.map((theme) => (
                <button key={theme.id} className="theme-swatch" onClick={() => applyBackgroundTheme(theme.id)}>
                  <span className="theme-dot" style={{ background: theme.color }} />
                  {theme.name}
                </button>
              ))}
            </div>
            <div className="theme-custom-row">
              <input
                type="text"
                value={customBackgroundColor}
                onChange={(event) => setCustomBackgroundColor(event.target.value)}
                placeholder="#FDF6E3 or hsl(200 80% 50%)"
              />
              <button onClick={applyCustomBackground}>Apply</button>
              <button onClick={randomizeBackground}>Random</button>
            </div>
          </div>
        </aside>

        <section className="canvas-column">
          <div className="glass-panel tool-panel">
            <div className="tool-group">
              <button onClick={addTextbox}>Text</button>
              <button onClick={addRectangle}>Rectangle</button>
              <button onClick={addCircle}>Circle</button>
              <button onClick={addTriangle}>Triangle</button>
              <button onClick={addStar}>Star</button>
              <button onClick={addImageFromUrl}>Image URL</button>
              <button onClick={() => fileInputRef.current?.click()}>Image Upload</button>
            </div>
            <div className="tool-group">
              <button onClick={duplicateSelected}>Duplicate</button>
              <button onClick={groupSelected}>Group</button>
              <button onClick={ungroupSelected}>Ungroup</button>
              <button onClick={() => moveLayer("up")}>Layer Up</button>
              <button onClick={() => moveLayer("down")}>Layer Down</button>
              <button className="danger" onClick={removeSelected}>
                Delete
              </button>
            </div>
            <div className="tool-group">
              <button onClick={() => alignSelectedCenter("x")}>Align Center X</button>
              <button onClick={() => alignSelectedCenter("y")}>Align Center Y</button>
            </div>
            <div className="tool-group compact">
              <button onClick={undo} disabled={!historyState.canUndo}>
                Undo
              </button>
              <button onClick={redo} disabled={!historyState.canRedo}>
                Redo
              </button>
            </div>
          </div>

          <div className="canvas-shell">
            <canvas ref={canvasElRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          </div>
        </section>

        <aside className="glass-panel right-panel">
          <div className="status-block">
            <h2>Status</h2>
            <p>{apiStatus}</p>
            <ul>
              <li>Slide: {currentSlideNumber}/{slides.length}</li>
              <li>Gesture WS: {import.meta.env.VITE_GESTURE_WS || DEFAULT_GESTURE_WS}</li>
              <li>Shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+D, Delete</li>
            </ul>
          </div>

          <div className="props-block">
            <h3>Properties</h3>
            {!selectedObject && <p>Select one object to edit style.</p>}
            {selectedObject && (
              <div className="props-grid">
                <label>
                  Fill
                  <input
                    type="color"
                    value={toColorInputValue(selectedObject.fill, "#111111")}
                    onChange={(event) => updateActiveObjectProperty("fill", event.target.value)}
                  />
                  <input
                    type="text"
                    value={selectedObject.fill}
                    onChange={(event) => updateActiveObjectProperty("fill", event.target.value)}
                    placeholder="Any CSS color"
                  />
                </label>
                <label>
                  Stroke
                  <input
                    type="color"
                    value={toColorInputValue(selectedObject.stroke, "#111111")}
                    onChange={(event) => updateActiveObjectProperty("stroke", event.target.value)}
                  />
                  <input
                    type="text"
                    value={selectedObject.stroke}
                    onChange={(event) => updateActiveObjectProperty("stroke", event.target.value)}
                    placeholder="Any CSS color"
                  />
                </label>
                <label>
                  Opacity
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={selectedObject.opacity}
                    onChange={(event) => updateActiveObjectProperty("opacity", event.target.value)}
                  />
                </label>
                <label>
                  Rotation
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={selectedObject.angle}
                    onChange={(event) => updateActiveObjectProperty("angle", event.target.value)}
                  />
                </label>
                {selectedObject.type === "textbox" && (
                  <>
                    <label>
                      Font Size
                      <input
                        type="range"
                        min="16"
                        max="128"
                        step="1"
                        value={selectedObject.fontSize}
                        onChange={(event) => updateActiveObjectProperty("fontSize", event.target.value)}
                      />
                    </label>
                    <label>
                      Font Family
                      <select
                        value={selectedObject.fontFamily}
                        onChange={(event) => updateActiveObjectProperty("fontFamily", event.target.value)}
                      >
                        {FONT_FAMILIES.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Font Weight
                      <select
                        value={String(selectedObject.fontWeight)}
                        onChange={(event) => updateActiveObjectProperty("fontWeight", event.target.value)}
                      >
                        <option value="300">300</option>
                        <option value="400">400</option>
                        <option value="500">500</option>
                        <option value="600">600</option>
                        <option value="700">700</option>
                        <option value="800">800</option>
                      </select>
                    </label>
                    <label>
                      Font Style
                      <select
                        value={selectedObject.fontStyle}
                        onChange={(event) => updateActiveObjectProperty("fontStyle", event.target.value)}
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                      </select>
                    </label>
                    <label>
                      Text
                      <input
                        type="text"
                        value={selectedObject.text}
                        onChange={(event) => updateActiveObjectProperty("text", event.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="layers-block">
            <h3>Layers</h3>
            <div className="layer-list">
              {layerItems.map((layer) => (
                <button
                  key={`${layer.index}-${layer.name}`}
                  className={`layer-item ${activeLayerIndex === layer.index ? "active" : ""}`}
                  onClick={() => selectLayer(layer.index)}
                >
                  <span>{layer.name}</span>
                  <small>{layer.type}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="gesture-block">
            <h3>Gesture Use Guide</h3>
            <ol>
              <li>Keep hand inside center webcam area, 40-60 cm from camera.</li>
              <li>Swipe right/left for next/previous slide.</li>
              <li>Fist hold triggers STOP/RESUME gesture mode.</li>
              <li>Show two fingers to grant zoom permission.</li>
              <li>After permission, pinch open/close controls zoom in/out.</li>
              <li>Thumbs-up performs zoom out while zoom mode is active.</li>
              <li>One clap moves to next slide.</li>
              <li>Two quick claps move to previous slide.</li>
              <li>Palm open and close two times to jump to first slide.</li>
              <li>Use bright lighting and plain background for stability.</li>
              <li>Run training: <code>python train_gesture_profile.py</code> to calibrate per-operation controls.</li>
              <li>For stable demo, run: <code>ENABLE_START_GESTURE=0 python gesture_controller.py</code></li>
            </ol>
          </div>
        </aside>
      </main>

      {isPresentationMode && (
        <PresentationOverlay
          slides={presentationSlides}
          startIndex={currentSlideIndex}
          onClose={() => setIsPresentationMode(false)}
        />
      )}
    </div>
  );
}
