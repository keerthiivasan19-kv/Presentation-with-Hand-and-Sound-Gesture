#!/usr/bin/env python3
"""
Interactive trainer for Presentation with gesture profiles.

This script calibrates personal gesture thresholds and operation mappings,
then saves them to gesture_profile.json (or GESTURE_PROFILE_PATH).
"""

from __future__ import annotations

import json
from pathlib import Path
import statistics
import time

import cv2

import gesture_controller as gc


ACTIONS = ["next", "prev", "start", "stop", "zoom_in", "zoom_out", "zoom_arm", "none"]


def ask_choice(prompt: str, options: list[str], default: str) -> str:
    default_index = options.index(default) + 1 if default in options else 1
    print(f"\n{prompt}")
    for i, option in enumerate(options, start=1):
        suffix = " (default)" if i == default_index else ""
        print(f"  {i}. {option}{suffix}")
    raw = input("Choose number: ").strip()
    if not raw:
        return options[default_index - 1]
    try:
        index = int(raw)
    except ValueError:
        return options[default_index - 1]
    if index < 1 or index > len(options):
        return options[default_index - 1]
    return options[index - 1]


def ask_yes_no(prompt: str, default_yes: bool = True) -> bool:
    default = "Y/n" if default_yes else "y/N"
    raw = input(f"{prompt} [{default}]: ").strip().lower()
    if not raw:
        return default_yes
    return raw in {"y", "yes"}


def quantile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int(round((len(ordered) - 1) * q))))
    return ordered[index]


def warmup(seconds: float, message: str) -> None:
    print(f"\n{message}")
    for remaining in range(int(seconds), 0, -1):
        print(f"  Starting in {remaining}...", end="\r")
        time.sleep(1)
    print("  Go!                ")


def collect_hand_metrics(duration_seconds: float, instruction: str) -> dict:
    metrics = {
        "velocity_pos": [],
        "velocity_neg": [],
        "displacement_pos": [],
        "displacement_neg": [],
        "pinch_velocity_pos": [],
        "pinch_velocity_neg": [],
    }

    print(f"\n{instruction}")
    print("Press ESC to cancel this capture window early.")

    mp_vision, hand_landmarker = gc.create_hand_landmarker()
    state = gc.GestureState()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Unable to open webcam for training.")

    preview_enabled = True
    last_timestamp_ms = 0
    end_ts = time.time() + duration_seconds

    with hand_landmarker:
        while time.time() < end_ts:
            ok, frame = cap.read()
            if not ok:
                continue

            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = gc.mp.Image(image_format=gc.mp.ImageFormat.SRGB, data=rgb)

            timestamp_ms = int(time.monotonic() * 1000)
            if timestamp_ms <= last_timestamp_ms:
                timestamp_ms = last_timestamp_ms + 1
            last_timestamp_ms = timestamp_ms

            result = hand_landmarker.detect_for_video(mp_image, timestamp_ms)
            if result.hand_landmarks:
                hand = result.hand_landmarks[0]
                gc.classify_gesture(hand, state)
                mp_vision.drawing_utils.draw_landmarks(
                    frame,
                    hand,
                    mp_vision.HandLandmarksConnections.HAND_CONNECTIONS,
                )

                vx = state.last_velocity_x
                dx = state.last_displacement_x
                pv = state.last_pinch_velocity
                if vx > 0:
                    metrics["velocity_pos"].append(vx)
                if vx < 0:
                    metrics["velocity_neg"].append(abs(vx))
                if dx > 0:
                    metrics["displacement_pos"].append(dx)
                if dx < 0:
                    metrics["displacement_neg"].append(abs(dx))
                if pv > 0:
                    metrics["pinch_velocity_pos"].append(pv)
                if pv < 0:
                    metrics["pinch_velocity_neg"].append(abs(pv))
            else:
                gc.reset_tracking(state)

            if preview_enabled:
                try:
                    cv2.putText(
                        frame,
                        instruction[:70],
                        (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.65,
                        (0, 255, 255),
                        2,
                        cv2.LINE_AA,
                    )
                    cv2.imshow("Gesture Trainer", frame)
                    if cv2.waitKey(1) & 0xFF == 27:
                        break
                except cv2.error:
                    preview_enabled = False
                    print("OpenCV preview unavailable, continuing headless capture.")

    cap.release()
    if preview_enabled:
        cv2.destroyAllWindows()
    return metrics


def collect_sound_stats() -> tuple[float, float] | None:
    try:
        import numpy as np
        import sounddevice as sd
    except Exception as error:
        print(f"Sound calibration skipped (dependency unavailable: {error})")
        return None

    def frame_rms(data):
        window = max(512, int(16000 * 0.08))
        result = []
        for i in range(0, len(data), window):
            part = data[i : i + window]
            if len(part) == 0:
                continue
            result.append(float(np.sqrt(np.mean(np.square(part)) + 1e-8)))
        return result

    print("\nSound calibration step 1/2: stay quiet for 3 seconds.")
    time.sleep(0.8)
    quiet = sd.rec(int(16000 * 3), samplerate=16000, channels=1, dtype="float32")
    sd.wait()
    quiet_rms = frame_rms(quiet[:, 0])
    quiet_mean = statistics.fmean(quiet_rms) if quiet_rms else 0.02

    print("Sound calibration step 2/2: clap 4-6 times in 4 seconds.")
    time.sleep(0.8)
    loud = sd.rec(int(16000 * 4), samplerate=16000, channels=1, dtype="float32")
    sd.wait()
    loud_rms = frame_rms(loud[:, 0])
    loud_peak = quantile(loud_rms, 0.9) if loud_rms else quiet_mean * 3

    sound_rms_min = max(0.03, quiet_mean * 2.0, loud_peak * 0.28)
    peak_multiplier = max(1.8, min(4.8, (loud_peak / (quiet_mean + 1e-6)) * 0.62))
    return sound_rms_min, peak_multiplier


def calibrate_thresholds() -> dict:
    warmup(3, "Calibration will start. Keep your camera ready.")
    right = collect_hand_metrics(4.0, "Perform RIGHT swipes repeatedly.")
    left = collect_hand_metrics(4.0, "Perform LEFT swipes repeatedly.")
    zoom_in = collect_hand_metrics(4.0, "Perform pinch OPEN (zoom in) repeatedly.")
    zoom_out = collect_hand_metrics(4.0, "Perform pinch CLOSE (zoom out) repeatedly.")

    swipe_v_candidates = [
        quantile(right["velocity_pos"], 0.65),
        quantile(left["velocity_neg"], 0.65),
    ]
    swipe_d_candidates = [
        quantile(right["displacement_pos"], 0.65),
        quantile(left["displacement_neg"], 0.65),
    ]
    pinch_v_candidates = [
        quantile(zoom_in["pinch_velocity_pos"], 0.65),
        quantile(zoom_out["pinch_velocity_neg"], 0.65),
    ]
    pinch_open_candidates = [v for v in [pinch_v_candidates[0]] if v > 0]
    pinch_close_candidates = [v for v in [pinch_v_candidates[1]] if v > 0]

    swipe_v = max(0.55, min([v for v in swipe_v_candidates if v > 0] or [gc.THRESHOLDS["min_swipe_velocity"]]) * 0.78)
    swipe_d = max(
        0.05,
        min([v for v in swipe_d_candidates if v > 0] or [gc.THRESHOLDS["min_swipe_displacement"]]) * 0.76,
    )
    pinch_open_v = max(
        0.18,
        min(pinch_open_candidates or [gc.THRESHOLDS["min_pinch_open_velocity"]]) * 0.74,
    )
    pinch_close_v = max(
        0.14,
        min(pinch_close_candidates or [gc.THRESHOLDS["min_pinch_close_velocity"]]) * 0.72,
    )

    thresholds = gc.DEFAULT_THRESHOLDS.copy()
    thresholds["min_swipe_velocity"] = round(swipe_v, 3)
    thresholds["min_swipe_displacement"] = round(swipe_d, 3)
    thresholds["min_pinch_open_velocity"] = round(pinch_open_v, 3)
    thresholds["min_pinch_close_velocity"] = round(pinch_close_v, 3)
    thresholds["swipe_direction_confirm_frames"] = 2
    thresholds["pinch_direction_confirm_frames"] = 2
    thresholds["zoom_cooldown_seconds"] = 0.40

    sound_calibrated = collect_sound_stats()
    if sound_calibrated:
        thresholds["sound_rms_min"] = round(sound_calibrated[0], 4)
        thresholds["sound_peak_multiplier"] = round(sound_calibrated[1], 3)

    return thresholds


def configure_operation_map(current_map: dict) -> dict:
    print("\nMap each detected primitive gesture to an operation.")
    result = {}
    labels = [
        ("swipe_right", "Swipe RIGHT"),
        ("swipe_left", "Swipe LEFT"),
        ("open_palm", "Palm Open+Close x2"),
        ("fist_hold", "Fist Hold"),
        ("two_finger_permission", "Two Fingers Permission"),
        ("pinch_open", "Pinch Open"),
        ("pinch_close", "Pinch Close"),
        ("clap_single", "Single Clap Sound"),
        ("clap_double", "Double Clap Sound"),
    ]
    for key, label in labels:
        default = current_map.get(key, gc.DEFAULT_OPERATION_MAP[key])
        choice = ask_choice(f"{label} -> action", ACTIONS, default if default in ACTIONS else "none")
        result[key] = choice
    return result


def main() -> None:
    print("Presentation with gesture - Training Wizard")
    print("---------------------------------------")

    profile_path = gc.get_profile_path()
    existing = gc.load_profile()

    use_calibration = ask_yes_no("Run live calibration for swipe/zoom/sound thresholds?", True)
    if use_calibration:
        thresholds = calibrate_thresholds()
    else:
        thresholds = existing["thresholds"]

    operation_map = configure_operation_map(existing["operation_map"])
    profile_name = input("\nProfile name (default: personal): ").strip() or "personal"

    profile = {
        "name": profile_name,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "operation_map": operation_map,
        "thresholds": thresholds,
    }

    profile_path.parent.mkdir(parents=True, exist_ok=True)
    profile_path.write_text(json.dumps(profile, indent=2), encoding="utf-8")

    print("\nProfile saved:")
    print(profile_path)
    print("\nHow to run with this profile:")
    print(f"  GESTURE_PROFILE_PATH=\"{profile_path}\" python gesture_controller.py")
    print("\nDefault run also uses this file if it is the standard gesture_profile.json.")


if __name__ == "__main__":
    main()
