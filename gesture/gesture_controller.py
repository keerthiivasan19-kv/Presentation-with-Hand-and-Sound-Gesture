#!/usr/bin/env python3
"""
Gesture controller for slide navigation.

Flow:
1) Captures webcam frames with OpenCV.
2) Detects one hand with MediaPipe.
3) Classifies simple gestures:
   - Swipe right  -> "next"
   - Swipe left   -> "prev"
   - Palm open+close twice -> "start"
   - Fist hold    -> "stop" (pause/resume mode toggle in frontend)
   - Two fingers  -> "zoom_arm" permission
   - Thumbs-up    -> "zoom_out" (works when zoom mode is active)
   - Pinch spread -> "zoom_in" (works when zoom mode is active)
   - Pinch close  -> "zoom_out" (works when zoom mode is active)
4) Optional sound trigger:
   - One clap -> "next"
   - Two quick claps -> "prev"
5) Broadcasts gesture events over WebSocket on ws://localhost:8765.
"""

from __future__ import annotations

import asyncio
from collections import deque
import json
import math
import os
from pathlib import Path
import threading
import time
from dataclasses import dataclass, field
from urllib.error import URLError
from urllib.request import urlretrieve

MPL_CACHE_DIR = Path(__file__).resolve().parent / ".mplconfig"
MPL_CACHE_DIR.mkdir(exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPL_CACHE_DIR))

import cv2
import mediapipe as mp
import websockets
from websockets.exceptions import ConnectionClosed

HOST = "localhost"
PORT = 8765
MODEL_FILENAME = "hand_landmarker.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)
PROFILE_FILENAME = "gesture_profile.json"
COOLDOWN_SECONDS = 1.0
SMOOTHING_WINDOW = 5
MAX_SAMPLE_AGE_SECONDS = 0.35
MIN_SWIPE_DISPLACEMENT = 0.14
MIN_SWIPE_VELOCITY = 1.20
SWIPE_DIRECTION_CONFIRM_FRAMES = 2
MAX_START_VELOCITY = 0.35
MAX_START_DISPLACEMENT = 0.04
PALM_START_CYCLES = 2
PALM_SEQUENCE_TIMEOUT_SECONDS = 2.20
PALM_MIN_TRANSITION_INTERVAL = 0.10
FIST_HOLD_SECONDS = 0.25
MIN_PINCH_OPEN_VELOCITY = 0.32
MIN_PINCH_CLOSE_VELOCITY = 0.24
PINCH_DIRECTION_CONFIRM_FRAMES = 2
MAX_ZOOM_HORIZONTAL_VELOCITY = 0.55
MAX_ZOOM_DISPLACEMENT = 0.06
ZOOM_COOLDOWN_SECONDS = 0.45
SOUND_RMS_MIN = 0.08
SOUND_PEAK_MULTIPLIER = 2.2
SOUND_EVENT_COOLDOWN_SECONDS = 0.13
CLAP_DOUBLE_WINDOW_SECONDS = 0.60
CLAP_SINGLE_SETTLE_SECONDS = 0.42
CLAP_RATIO_MIN = 4.8
CLAP_RMS_MIN = 0.12
CLAP_PEAK_MIN = 0.24
CLAP_ZCR_MAX = 0.35
ZOOM_ARM_SECONDS = 6.0
TWO_FINGER_SPREAD_MIN = 0.036
TWO_FINGER_HOLD_SECONDS = 0.18
THUMB_EXTENSION_MIN = 0.12
ENABLE_START_GESTURE = os.environ.get("ENABLE_START_GESTURE", "1").lower() not in {"0", "false", "no"}
ENABLE_SOUND_GESTURE = os.environ.get("ENABLE_SOUND_GESTURE", "1").lower() not in {"0", "false", "no"}
ENABLE_STOP_GESTURE = os.environ.get("ENABLE_STOP_GESTURE", "1").lower() not in {"0", "false", "no"}
SOUND_DEBUG = os.environ.get("SOUND_DEBUG", "0").lower() in {"1", "true", "yes"}
SOUND_INPUT_DEVICE_RAW = os.environ.get("SOUND_INPUT_DEVICE", "").strip()

DEFAULT_OPERATION_MAP = {
    "swipe_right": "next",
    "swipe_left": "prev",
    "open_palm": "start",
    "fist_hold": "stop",
    "two_finger_permission": "zoom_arm",
    "thumb_up": "zoom_out",
    "pinch_open": "zoom_in",
    "pinch_close": "zoom_out",
    "clap_single": "next",
    "clap_double": "prev",
}

DEFAULT_THRESHOLDS = {
    "cooldown_seconds": COOLDOWN_SECONDS,
    "smoothing_window": SMOOTHING_WINDOW,
    "max_sample_age_seconds": MAX_SAMPLE_AGE_SECONDS,
    "min_swipe_displacement": MIN_SWIPE_DISPLACEMENT,
    "min_swipe_velocity": MIN_SWIPE_VELOCITY,
    "swipe_direction_confirm_frames": SWIPE_DIRECTION_CONFIRM_FRAMES,
    "max_start_velocity": MAX_START_VELOCITY,
    "max_start_displacement": MAX_START_DISPLACEMENT,
    "palm_start_cycles": PALM_START_CYCLES,
    "palm_sequence_timeout_seconds": PALM_SEQUENCE_TIMEOUT_SECONDS,
    "palm_min_transition_interval": PALM_MIN_TRANSITION_INTERVAL,
    "fist_hold_seconds": FIST_HOLD_SECONDS,
    "min_pinch_open_velocity": MIN_PINCH_OPEN_VELOCITY,
    "min_pinch_close_velocity": MIN_PINCH_CLOSE_VELOCITY,
    "pinch_direction_confirm_frames": PINCH_DIRECTION_CONFIRM_FRAMES,
    "max_zoom_horizontal_velocity": MAX_ZOOM_HORIZONTAL_VELOCITY,
    "max_zoom_displacement": MAX_ZOOM_DISPLACEMENT,
    "zoom_cooldown_seconds": ZOOM_COOLDOWN_SECONDS,
    "sound_rms_min": SOUND_RMS_MIN,
    "sound_peak_multiplier": SOUND_PEAK_MULTIPLIER,
    "sound_event_cooldown_seconds": SOUND_EVENT_COOLDOWN_SECONDS,
    "clap_double_window_seconds": CLAP_DOUBLE_WINDOW_SECONDS,
    "clap_single_settle_seconds": CLAP_SINGLE_SETTLE_SECONDS,
    "clap_ratio_min": CLAP_RATIO_MIN,
    "clap_rms_min": CLAP_RMS_MIN,
    "clap_peak_min": CLAP_PEAK_MIN,
    "clap_zcr_max": CLAP_ZCR_MAX,
    "zoom_arm_seconds": ZOOM_ARM_SECONDS,
    "two_finger_spread_min": TWO_FINGER_SPREAD_MIN,
    "two_finger_hold_seconds": TWO_FINGER_HOLD_SECONDS,
    "thumb_extension_min": THUMB_EXTENSION_MIN,
}


def _merged_profile(profile_raw: dict | None) -> dict:
    profile = {
        "name": "default",
        "operation_map": DEFAULT_OPERATION_MAP.copy(),
        "thresholds": DEFAULT_THRESHOLDS.copy(),
    }
    if not isinstance(profile_raw, dict):
        return profile

    if isinstance(profile_raw.get("name"), str) and profile_raw["name"].strip():
        profile["name"] = profile_raw["name"].strip()

    operation_map = profile_raw.get("operation_map")
    if isinstance(operation_map, dict):
        for key, default_value in DEFAULT_OPERATION_MAP.items():
            raw = operation_map.get(key, default_value)
            if isinstance(raw, str) and raw.strip():
                profile["operation_map"][key] = raw.strip()

        # Backward compatibility with older profiles.
        legacy_sound = operation_map.get("sound_peak")
        if isinstance(legacy_sound, str) and legacy_sound.strip():
            if "clap_single" not in operation_map:
                profile["operation_map"]["clap_single"] = legacy_sound.strip()

        legacy_snap_single = operation_map.get("snap_single")
        if isinstance(legacy_snap_single, str) and legacy_snap_single.strip():
            if "clap_single" not in operation_map:
                profile["operation_map"]["clap_single"] = legacy_snap_single.strip()

        legacy_snap_double = operation_map.get("snap_double")
        if isinstance(legacy_snap_double, str) and legacy_snap_double.strip():
            if "clap_double" not in operation_map:
                profile["operation_map"]["clap_double"] = legacy_snap_double.strip()

        legacy_clap = operation_map.get("clap")
        if isinstance(legacy_clap, str) and legacy_clap.strip():
            if "clap_single" not in operation_map and legacy_clap.strip().lower() != "none":
                profile["operation_map"]["clap_single"] = legacy_clap.strip()

    thresholds = profile_raw.get("thresholds")
    if isinstance(thresholds, dict):
        for key, default_value in DEFAULT_THRESHOLDS.items():
            raw = thresholds.get(key, default_value)
            if isinstance(default_value, int):
                try:
                    profile["thresholds"][key] = max(1, int(raw))
                except Exception:
                    profile["thresholds"][key] = default_value
            else:
                try:
                    profile["thresholds"][key] = float(raw)
                except Exception:
                    profile["thresholds"][key] = default_value

        # Backward compatibility for renamed thresholds.
        if "min_pinch_velocity" in thresholds:
            try:
                legacy_pinch = float(thresholds["min_pinch_velocity"])
                profile["thresholds"]["min_pinch_open_velocity"] = legacy_pinch
                profile["thresholds"]["min_pinch_close_velocity"] = max(0.14, legacy_pinch * 0.78)
            except Exception:
                pass
        if "snap_double_window_seconds" in thresholds and "clap_double_window_seconds" not in thresholds:
            try:
                profile["thresholds"]["clap_double_window_seconds"] = float(thresholds["snap_double_window_seconds"])
            except Exception:
                pass
        if "snap_single_settle_seconds" in thresholds and "clap_single_settle_seconds" not in thresholds:
            try:
                profile["thresholds"]["clap_single_settle_seconds"] = float(thresholds["snap_single_settle_seconds"])
            except Exception:
                pass
    return profile


def get_profile_path() -> Path:
    raw = os.environ.get("GESTURE_PROFILE_PATH", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return Path(__file__).resolve().parent / PROFILE_FILENAME


def load_profile() -> dict:
    path = get_profile_path()
    if not path.exists():
        return _merged_profile(None)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return _merged_profile(None)
    return _merged_profile(raw)


PROFILE = load_profile()
OPERATION_MAP = PROFILE["operation_map"]
THRESHOLDS = PROFILE["thresholds"]


def mapped_event(key: str, default: str) -> str:
    raw = OPERATION_MAP.get(key, default)
    return raw.strip() if isinstance(raw, str) and raw.strip() else default


class ZoomGate:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._armed_until: float = 0.0

    def arm(self, seconds: float) -> None:
        arm_seconds = max(0.2, float(seconds))
        with self._lock:
            self._armed_until = max(self._armed_until, time.time() + arm_seconds)

    def is_armed(self) -> bool:
        with self._lock:
            return time.time() <= self._armed_until

    def remaining_seconds(self) -> float:
        with self._lock:
            return max(0.0, self._armed_until - time.time())

    def clear(self) -> None:
        with self._lock:
            self._armed_until = 0.0


ZOOM_GATE = ZoomGate()


@dataclass
class GestureState:
    samples: deque[tuple[float, float]] = field(
        default_factory=lambda: deque(maxlen=int(THRESHOLDS["smoothing_window"]))
    )
    prev_smoothed_x: float | None = None
    prev_smoothed_t: float | None = None
    pinch_samples: deque[tuple[float, float]] = field(
        default_factory=lambda: deque(maxlen=int(THRESHOLDS["smoothing_window"]))
    )
    prev_smoothed_pinch: float | None = None
    prev_smoothed_pinch_t: float | None = None
    palm_prev_open: bool = False
    palm_cycle_count: int = 0
    palm_sequence_started_at: float = 0.0
    palm_last_transition_at: float = 0.0
    two_finger_since: float | None = None
    two_finger_latched: bool = False
    thumb_up_latched: bool = False
    fist_since: float | None = None
    stop_latched: bool = False
    last_velocity_x: float = 0.0
    last_displacement_x: float = 0.0
    prev_pinch_distance: float | None = None
    prev_pinch_t: float | None = None
    last_pinch_velocity: float = 0.0
    last_pinch_distance: float = 0.0
    pinch_last_dir: int = 0
    pinch_dir_streak: int = 0
    swipe_last_dir: int = 0
    swipe_dir_streak: int = 0
    last_emit_at: float = 0.0
    last_zoom_emit_at: float = 0.0


class GestureHub:
    def __init__(self) -> None:
        self.clients: set[websockets.WebSocketServerProtocol] = set()
        self.queue: asyncio.Queue[dict] = asyncio.Queue()

    async def ws_handler(self, websocket: websockets.WebSocketServerProtocol) -> None:
        self.clients.add(websocket)
        await websocket.send(json.dumps({"gesture": "connected"}))
        try:
            async for _ in websocket:
                pass
        finally:
            self.clients.discard(websocket)

    async def broadcast_loop(self) -> None:
        while True:
            event = await self.queue.get()
            if not self.clients:
                continue

            payload = json.dumps(event)
            stale_clients = []
            for client in self.clients:
                try:
                    await client.send(payload)
                except ConnectionClosed:
                    stale_clients.append(client)

            for client in stale_clients:
                self.clients.discard(client)


def is_open_palm(landmarks) -> bool:
    return (
        landmarks[8].y < landmarks[6].y
        and landmarks[12].y < landmarks[10].y
        and landmarks[16].y < landmarks[14].y
        and landmarks[20].y < landmarks[18].y
    )


def is_fist(landmarks) -> bool:
    fingers_curled = (
        landmarks[8].y > landmarks[6].y
        and landmarks[12].y > landmarks[10].y
        and landmarks[16].y > landmarks[14].y
        and landmarks[20].y > landmarks[18].y
    )
    thumb_close = abs(landmarks[4].x - landmarks[5].x) < 0.08 and abs(landmarks[4].y - landmarks[5].y) < 0.1
    return fingers_curled and thumb_close


def is_two_finger_permission(landmarks) -> bool:
    index_extended = landmarks[8].y < landmarks[6].y
    middle_extended = landmarks[12].y < landmarks[10].y
    ring_curled = landmarks[16].y > landmarks[14].y
    pinky_curled = landmarks[20].y > landmarks[18].y
    thumb_folded = abs(landmarks[4].x - landmarks[5].x) < 0.16 and abs(landmarks[4].y - landmarks[5].y) < 0.16
    spread = abs(landmarks[8].x - landmarks[12].x)

    return (
        index_extended
        and middle_extended
        and ring_curled
        and pinky_curled
        and thumb_folded
        and spread >= THRESHOLDS["two_finger_spread_min"]
    )


def is_thumb_up(landmarks) -> bool:
    thumb_tip_above_ip = landmarks[4].y < landmarks[3].y
    thumb_ip_above_mcp = landmarks[3].y < landmarks[2].y
    thumb_tip_above_knuckles = landmarks[4].y < min(landmarks[6].y, landmarks[10].y)
    thumb_extension = math.hypot(landmarks[4].x - landmarks[2].x, landmarks[4].y - landmarks[2].y)

    curled_non_thumb_fingers = sum(
        1
        for tip_idx, pip_idx in ((8, 6), (12, 10), (16, 14), (20, 18))
        if landmarks[tip_idx].y > landmarks[pip_idx].y
    )
    return (
        curled_non_thumb_fingers >= 3
        and thumb_tip_above_ip
        and thumb_ip_above_mcp
        and thumb_tip_above_knuckles
        and thumb_extension >= THRESHOLDS["thumb_extension_min"]
    )


def pinch_distance(landmarks) -> float:
    return math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y)


def hand_scale(landmarks) -> float:
    wrist_to_middle_mcp = math.hypot(landmarks[0].x - landmarks[9].x, landmarks[0].y - landmarks[9].y)
    palm_width = math.hypot(landmarks[5].x - landmarks[17].x, landmarks[5].y - landmarks[17].y)
    return max(wrist_to_middle_mcp, palm_width, 0.08)


def normalized_pinch_distance(landmarks) -> float:
    return pinch_distance(landmarks) / hand_scale(landmarks)


def reset_palm_sequence(state: GestureState) -> None:
    state.palm_prev_open = False
    state.palm_cycle_count = 0
    state.palm_sequence_started_at = 0.0
    state.palm_last_transition_at = 0.0


def reset_tracking(state: GestureState) -> None:
    state.samples.clear()
    state.prev_smoothed_x = None
    state.prev_smoothed_t = None
    state.pinch_samples.clear()
    state.prev_smoothed_pinch = None
    state.prev_smoothed_pinch_t = None
    reset_palm_sequence(state)
    state.two_finger_since = None
    state.two_finger_latched = False
    state.thumb_up_latched = False
    state.fist_since = None
    state.stop_latched = False
    state.last_velocity_x = 0.0
    state.last_displacement_x = 0.0
    state.prev_pinch_distance = None
    state.prev_pinch_t = None
    state.last_pinch_velocity = 0.0
    state.last_pinch_distance = 0.0
    state.pinch_last_dir = 0
    state.pinch_dir_streak = 0
    state.swipe_last_dir = 0
    state.swipe_dir_streak = 0


def ensure_model_file() -> Path:
    model_path = Path(__file__).resolve().parent / MODEL_FILENAME
    if model_path.exists():
        return model_path

    print(f"Model not found: {model_path.name}")
    print(f"Downloading model from: {MODEL_URL}")
    try:
        urlretrieve(MODEL_URL, model_path)
        print(f"Model downloaded: {model_path}")
        return model_path
    except URLError as exc:  # pragma: no cover - network specific
        raise RuntimeError(
            "Failed to download hand_landmarker.task. "
            f"Download manually from {MODEL_URL} into the gesture folder."
        ) from exc


def push_sample_and_get_smoothed_x(state: GestureState, now: float, index_x: float) -> float:
    state.samples.append((now, index_x))

    while state.samples and now - state.samples[0][0] > THRESHOLDS["max_sample_age_seconds"]:
        state.samples.popleft()

    if not state.samples:
        return index_x

    return sum(sample_x for _, sample_x in state.samples) / len(state.samples)


def push_sample_and_get_smoothed_pinch(state: GestureState, now: float, pinch_value: float) -> float:
    state.pinch_samples.append((now, pinch_value))

    while state.pinch_samples and now - state.pinch_samples[0][0] > THRESHOLDS["max_sample_age_seconds"]:
        state.pinch_samples.popleft()

    if not state.pinch_samples:
        return pinch_value

    return sum(sample_pinch for _, sample_pinch in state.pinch_samples) / len(state.pinch_samples)


def classify_gesture(landmarks, state: GestureState) -> str | None:
    now = time.time()

    index_x = landmarks[8].x
    smoothed_x = push_sample_and_get_smoothed_x(state, now, index_x)
    gesture = None
    velocity_x = 0.0
    displacement_x = 0.0

    if state.prev_smoothed_x is not None and state.prev_smoothed_t is not None:
        dt = now - state.prev_smoothed_t
        if dt > 0:
            velocity_x = (smoothed_x - state.prev_smoothed_x) / dt

    if len(state.samples) >= 2:
        displacement_x = state.samples[-1][1] - state.samples[0][1]

    pinch = normalized_pinch_distance(landmarks)
    smoothed_pinch = push_sample_and_get_smoothed_pinch(state, now, pinch)
    pinch_velocity = 0.0
    if state.prev_smoothed_pinch is not None and state.prev_smoothed_pinch_t is not None:
        pinch_dt = now - state.prev_smoothed_pinch_t
        if pinch_dt > 0:
            pinch_velocity = (smoothed_pinch - state.prev_smoothed_pinch) / pinch_dt

    state.prev_smoothed_pinch = smoothed_pinch
    state.prev_smoothed_pinch_t = now
    state.prev_pinch_distance = smoothed_pinch
    state.prev_pinch_t = now
    state.last_pinch_velocity = pinch_velocity
    state.last_pinch_distance = smoothed_pinch

    state.last_velocity_x = velocity_x
    state.last_displacement_x = displacement_x

    ready_for_emit = now - state.last_emit_at >= THRESHOLDS["cooldown_seconds"]
    ready_for_zoom_emit = now - state.last_zoom_emit_at >= THRESHOLDS["zoom_cooldown_seconds"]
    zoom_is_armed = ZOOM_GATE.is_armed()

    fist = is_fist(landmarks) if ENABLE_STOP_GESTURE else False
    if ready_for_emit and fist:
        if state.fist_since is None:
            state.fist_since = now
        elif not state.stop_latched and now - state.fist_since >= THRESHOLDS["fist_hold_seconds"]:
            gesture = mapped_event("fist_hold", "stop")
            state.stop_latched = True
    else:
        state.fist_since = None
        if not fist:
            state.stop_latched = False

    two_finger_permission = is_two_finger_permission(landmarks)
    stable_permission_pose = (
        abs(velocity_x) <= THRESHOLDS["max_start_velocity"]
        and abs(displacement_x) <= THRESHOLDS["max_start_displacement"]
    )

    if not gesture and two_finger_permission and stable_permission_pose:
        if state.two_finger_since is None:
            state.two_finger_since = now
        elif (
            ready_for_zoom_emit
            and not state.two_finger_latched
            and now - state.two_finger_since >= THRESHOLDS["two_finger_hold_seconds"]
        ):
            ZOOM_GATE.arm(THRESHOLDS["zoom_arm_seconds"])
            gesture = mapped_event("two_finger_permission", "zoom_arm")
            state.two_finger_latched = True
            state.last_zoom_emit_at = now
    else:
        state.two_finger_since = None
        if not two_finger_permission:
            state.two_finger_latched = False

    thumb_up = is_thumb_up(landmarks)
    stable_thumb_pose = (
        abs(velocity_x) <= THRESHOLDS["max_start_velocity"]
        and abs(displacement_x) <= THRESHOLDS["max_start_displacement"]
    )
    if (
        not gesture
        and ready_for_emit
        and ready_for_zoom_emit
        and zoom_is_armed
        and thumb_up
        and stable_thumb_pose
        and not state.thumb_up_latched
    ):
        gesture = mapped_event("thumb_up", "zoom_out")
        state.thumb_up_latched = True
        state.last_zoom_emit_at = now
    elif not thumb_up:
        state.thumb_up_latched = False

    if gesture:
        state.last_emit_at = now
        state.prev_smoothed_x = smoothed_x
        state.prev_smoothed_t = now
        reset_palm_sequence(state)
        state.two_finger_since = None
        state.two_finger_latched = False
        state.thumb_up_latched = False
        state.samples.clear()
        return gesture

    swipe_dir = 0
    if (
        abs(displacement_x) >= THRESHOLDS["min_swipe_displacement"]
        and abs(velocity_x) >= THRESHOLDS["min_swipe_velocity"]
    ):
        swipe_dir = 1 if velocity_x > 0 else -1

    if swipe_dir == 0:
        state.swipe_last_dir = 0
        state.swipe_dir_streak = 0
    elif swipe_dir == state.swipe_last_dir:
        state.swipe_dir_streak += 1
    else:
        state.swipe_last_dir = swipe_dir
        state.swipe_dir_streak = 1

    if ready_for_emit and state.swipe_dir_streak >= int(THRESHOLDS["swipe_direction_confirm_frames"]):
        gesture = mapped_event("swipe_right", "next") if state.swipe_last_dir > 0 else mapped_event("swipe_left", "prev")
        state.swipe_last_dir = 0
        state.swipe_dir_streak = 0

    pinch_dir = 0
    if (
        abs(velocity_x) <= THRESHOLDS["max_zoom_horizontal_velocity"]
        and abs(displacement_x) <= THRESHOLDS["max_zoom_displacement"]
    ):
        if pinch_velocity >= THRESHOLDS["min_pinch_open_velocity"]:
            pinch_dir = 1
        elif pinch_velocity <= -THRESHOLDS["min_pinch_close_velocity"]:
            pinch_dir = -1

    if pinch_dir == 0:
        state.pinch_last_dir = 0
        state.pinch_dir_streak = 0
    elif pinch_dir == state.pinch_last_dir:
        state.pinch_dir_streak += 1
    else:
        state.pinch_last_dir = pinch_dir
        state.pinch_dir_streak = 1

    if not zoom_is_armed:
        state.pinch_last_dir = 0
        state.pinch_dir_streak = 0

    if (
        not gesture
        and ready_for_emit
        and ready_for_zoom_emit
        and zoom_is_armed
        and state.pinch_dir_streak >= int(THRESHOLDS["pinch_direction_confirm_frames"])
    ):
        gesture = (
            mapped_event("pinch_open", "zoom_in")
            if state.pinch_last_dir > 0
            else mapped_event("pinch_close", "zoom_out")
        )
        state.last_zoom_emit_at = now
        state.pinch_last_dir = 0
        state.pinch_dir_streak = 0

    if ENABLE_START_GESTURE and not gesture and ready_for_emit:
        open_palm = is_open_palm(landmarks)
        stable_palm = (
            abs(velocity_x) <= THRESHOLDS["max_start_velocity"]
            and abs(displacement_x) <= THRESHOLDS["max_start_displacement"]
        )

        transition_interval = now - state.palm_last_transition_at if state.palm_last_transition_at else 999.0
        can_transition = (
            open_palm != state.palm_prev_open
            and stable_palm
            and transition_interval >= THRESHOLDS["palm_min_transition_interval"]
        )

        if can_transition:
            if open_palm:
                if (
                    state.palm_sequence_started_at == 0.0
                    or now - state.palm_sequence_started_at > THRESHOLDS["palm_sequence_timeout_seconds"]
                ):
                    state.palm_cycle_count = 0
                    state.palm_sequence_started_at = now
            else:
                if state.palm_sequence_started_at == 0.0:
                    state.palm_sequence_started_at = now
                state.palm_cycle_count += 1
                if state.palm_cycle_count >= int(THRESHOLDS["palm_start_cycles"]):
                    gesture = mapped_event("open_palm", "start")
                    reset_palm_sequence(state)

            state.palm_prev_open = open_palm
            state.palm_last_transition_at = now
        else:
            state.palm_prev_open = open_palm
            if (
                state.palm_sequence_started_at
                and now - state.palm_sequence_started_at > THRESHOLDS["palm_sequence_timeout_seconds"]
            ):
                reset_palm_sequence(state)

    state.prev_smoothed_x = smoothed_x
    state.prev_smoothed_t = now
    if gesture:
        state.last_emit_at = now
        reset_palm_sequence(state)
        state.two_finger_since = None
        state.two_finger_latched = False
        state.samples.clear()
        state.pinch_samples.clear()
    return gesture


def create_hand_landmarker():
    if not hasattr(mp, "tasks"):
        raise RuntimeError("Current mediapipe package has no tasks API.")

    model_path = ensure_model_file()
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision

    base_options = mp_python.BaseOptions(
        model_asset_path=str(model_path),
        delegate=mp_python.BaseOptions.Delegate.CPU,
    )
    options = mp_vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=mp_vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.6,
        min_tracking_confidence=0.6,
    )
    try:
        return mp_vision, mp_vision.HandLandmarker.create_from_options(options)
    except RuntimeError as exc:
        message = str(exc)
        if "NSOpenGLPixelFormat" in message:
            raise RuntimeError(
                "MediaPipe could not access a usable OpenGL context. "
                "Run this from a normal desktop Terminal session (not headless/SSH)."
            ) from exc
        raise


def run_camera_detector(loop: asyncio.AbstractEventLoop, hub: GestureHub, stop_event: threading.Event) -> None:
    try:
        mp_vision, hand_landmarker = create_hand_landmarker()
    except RuntimeError as error:
        print(f"[Gesture Error] {error}")
        stop_event.set()
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[Gesture Error] Unable to open webcam.")
        stop_event.set()
        return

    detector_state = GestureState()
    last_timestamp_ms = 0
    preview_enabled = True

    with hand_landmarker:
        while not stop_event.is_set():
            ok, frame = cap.read()
            if not ok:
                continue

            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            timestamp_ms = int(time.monotonic() * 1000)
            if timestamp_ms <= last_timestamp_ms:
                timestamp_ms = last_timestamp_ms + 1
            last_timestamp_ms = timestamp_ms

            try:
                result = hand_landmarker.detect_for_video(mp_image, timestamp_ms)
            except RuntimeError as error:
                message = str(error)
                if stop_event.is_set() or "cannot schedule new futures after shutdown" in message:
                    break
                print(f"[Gesture Warning] Hand detector runtime error: {error}")
                time.sleep(0.05)
                continue

            event = None
            if result.hand_landmarks:
                hand_landmarks = result.hand_landmarks[0]
                mp_vision.drawing_utils.draw_landmarks(
                    frame,
                    hand_landmarks,
                    mp_vision.HandLandmarksConnections.HAND_CONNECTIONS,
                )

                event = classify_gesture(hand_landmarks, detector_state)
            else:
                reset_tracking(detector_state)

            if event:
                print(f"Gesture: {event}")
                future = asyncio.run_coroutine_threadsafe(
                    hub.queue.put({"gesture": event, "ts": time.time()}), loop
                )
                future.result(timeout=1)

                cv2.putText(
                    frame,
                    f"Gesture: {event}",
                    (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0),
                    2,
                    cv2.LINE_AA,
                )

            cv2.putText(
                frame,
                (
                    f"vx={detector_state.last_velocity_x:+.2f} "
                    f"dx={detector_state.last_displacement_x:+.2f} "
                    f"pv={detector_state.last_pinch_velocity:+.2f} "
                    f"zoom={ZOOM_GATE.remaining_seconds():.1f}s"
                ),
                (20, 78),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.65,
                (255, 255, 0),
                2,
                cv2.LINE_AA,
            )

            cv2.putText(
                frame,
                "ESC to stop",
                (20, frame.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )

            if preview_enabled:
                try:
                    cv2.imshow("Gesture Controller", frame)
                    if cv2.waitKey(1) & 0xFF == 27:
                        stop_event.set()
                        break
                except cv2.error:
                    preview_enabled = False
                    print(
                        "[Gesture Warning] OpenCV preview window is unavailable. "
                        "Continuing in headless mode."
                    )

    cap.release()
    if preview_enabled:
        cv2.destroyAllWindows()


def run_sound_detector(loop: asyncio.AbstractEventLoop, hub: GestureHub, stop_event: threading.Event) -> None:
    if not ENABLE_SOUND_GESTURE:
        print("Sound gesture detector disabled (ENABLE_SOUND_GESTURE=0).")
        return

    try:
        import numpy as np
        import sounddevice as sd
    except Exception as error:  # pragma: no cover - dependency/env specific
        print(f"[Gesture Warning] Sound detector unavailable: {error}")
        return

    state = {
        "noise_floor": 0.0,
        "last_peak_at": 0.0,
        "start_ts": time.time(),
        "pending_clap_count": 0,
        "first_clap_at": 0.0,
        "last_debug_at": 0.0,
    }

    input_device = None
    if SOUND_INPUT_DEVICE_RAW:
        try:
            input_device = int(SOUND_INPUT_DEVICE_RAW)
        except Exception:
            input_device = SOUND_INPUT_DEVICE_RAW

    def emit_event(event_name: str, now: float, rms: float) -> None:
        print(f"Gesture: {event_name} (rms={rms:.3f})")
        asyncio.run_coroutine_threadsafe(
            hub.queue.put({"gesture": event_name, "source": "audio", "level": rms, "ts": now}),
            loop,
        )

    def audio_callback(indata, _frames, _time_info, status):
        if stop_event.is_set():
            return
        if status:
            return

        samples = indata[:, 0].astype("float32")
        rms = float(np.sqrt(np.mean(np.square(samples)) + 1e-8))
        peak = float(np.max(np.abs(samples)))
        if len(samples) > 1:
            zero_cross = float(np.mean(np.signbit(samples[1:]) != np.signbit(samples[:-1])))
        else:
            zero_cross = 0.0
        crest = peak / max(rms, 1e-6)
        now = time.time()

        if state["noise_floor"] <= 0:
            state["noise_floor"] = rms
        else:
            if rms < state["noise_floor"] * 1.8:
                state["noise_floor"] = (0.95 * state["noise_floor"]) + (0.05 * rms)
            else:
                # Ignore peaks when adapting baseline.
                state["noise_floor"] = (0.995 * state["noise_floor"]) + (0.005 * rms)

        threshold = max(THRESHOLDS["sound_rms_min"], state["noise_floor"] * THRESHOLDS["sound_peak_multiplier"])
        can_emit = (
            now - state["last_peak_at"] >= THRESHOLDS["sound_event_cooldown_seconds"]
            and now - state["start_ts"] >= 1.0
        )

        ratio = rms / max(state["noise_floor"], 1e-5)
        peak_trigger = peak >= max(THRESHOLDS["clap_peak_min"] * 0.88, threshold * 1.25)

        if SOUND_DEBUG and now - state["last_debug_at"] >= 0.5:
            state["last_debug_at"] = now
            print(
                "[Sound Debug] "
                f"rms={rms:.3f} peak={peak:.3f} zcr={zero_cross:.3f} "
                f"ratio={ratio:.2f} floor={state['noise_floor']:.3f} thr={threshold:.3f}"
            )

        if can_emit and (rms >= threshold or peak_trigger):
            state["last_peak_at"] = now

            clap_confident = (
                peak >= THRESHOLDS["clap_peak_min"]
                and (rms >= THRESHOLDS["clap_rms_min"] or ratio >= (THRESHOLDS["clap_ratio_min"] * 0.72))
                and zero_cross <= (THRESHOLDS["clap_zcr_max"] * 1.35)
            )
            clap_ratio_match = (
                ratio >= THRESHOLDS["clap_ratio_min"]
                and peak >= (THRESHOLDS["clap_peak_min"] * 0.85)
                and zero_cross <= (THRESHOLDS["clap_zcr_max"] * 1.35)
                and crest <= 8.0
            )
            is_clap = clap_confident or clap_ratio_match
            if not is_clap:
                return

            if is_clap:
                if state["pending_clap_count"] == 0:
                    state["pending_clap_count"] = 1
                    state["first_clap_at"] = now
                    return

                if now - state["first_clap_at"] <= THRESHOLDS["clap_double_window_seconds"]:
                    state["pending_clap_count"] = 0
                    state["first_clap_at"] = 0.0
                    emit_event(mapped_event("clap_double", "prev"), now, rms)
                    return

                emit_event(mapped_event("clap_single", "next"), now, rms)
                state["pending_clap_count"] = 1
                state["first_clap_at"] = now
                return

        if (
            state["pending_clap_count"] == 1
            and now - state["first_clap_at"] >= THRESHOLDS["clap_single_settle_seconds"]
        ):
            state["pending_clap_count"] = 0
            state["first_clap_at"] = 0.0
            emit_event(mapped_event("clap_single", "next"), now, rms)

    try:
        try:
            default_input = sd.default.device[0]
            probe_device = input_device if input_device is not None else default_input
            info = sd.query_devices(probe_device, "input")
            print(f"Sound input device: {info['name']}")
        except Exception:
            pass

        with sd.InputStream(
            channels=1,
            samplerate=16000,
            blocksize=1024,
            dtype="float32",
            device=input_device,
            callback=audio_callback,
        ):
            print("Sound gesture detector active (single clap next, double clap prev).")
            while not stop_event.is_set():
                time.sleep(0.1)
    except Exception as error:  # pragma: no cover - device/env specific
        print(f"[Gesture Warning] Sound detector failed: {error}")


async def main() -> None:
    stop_event = threading.Event()
    hub = GestureHub()
    loop = asyncio.get_running_loop()
    profile_path = get_profile_path()

    print(f"Gesture profile: {PROFILE.get('name', 'default')}")
    print(f"Profile file: {profile_path} ({'found' if profile_path.exists() else 'default settings'})")

    detector_thread = threading.Thread(
        target=run_camera_detector,
        args=(loop, hub, stop_event),
        daemon=True,
    )
    detector_thread.start()

    sound_thread = threading.Thread(
        target=run_sound_detector,
        args=(loop, hub, stop_event),
        daemon=True,
    )
    sound_thread.start()

    # If detector fails immediately (e.g., unsupported MediaPipe runtime), stop gracefully.
    await asyncio.sleep(0.15)
    if stop_event.is_set():
        print("Gesture detector failed during startup. WebSocket server not started.")
        return

    async with websockets.serve(hub.ws_handler, HOST, PORT):
        print(f"Gesture WebSocket server: ws://{HOST}:{PORT}")
        print("Start your frontend presentation mode to consume gestures.")

        broadcaster_task = asyncio.create_task(hub.broadcast_loop())
        try:
            while not stop_event.is_set():
                await asyncio.sleep(0.2)
        finally:
            broadcaster_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await broadcaster_task


if __name__ == "__main__":
    import contextlib

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
