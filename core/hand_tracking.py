"""MediaPipe 手势识别模块。用于摄像头手势输入到绘画系统。"""

from __future__ import annotations

import time
from dataclasses import dataclass

import cv2
import numpy as np
from mediapipe.tasks.python.vision import hand_landmarker
from mediapipe.tasks.python.vision.core import image as mp_image
from mediapipe.tasks.python.vision.core import image_processing_options as image_processing_options_lib
from mediapipe.tasks.python.vision.core import vision_task_running_mode
from mediapipe.tasks.python.core import base_options as base_options_lib


@dataclass
class HandInput:
    x: int
    y: int
    pressure: float
    speed: float


class HandTracker:
    """封装 OpenCV + MediaPipe Hands 的摄像头手势输入。"""

    def __init__(self, camera_index: int = 0) -> None:
        self.cap = self._open_camera(camera_index)
        self.camera_index = camera_index
        self.cap_width = 640
        self.cap_height = 480
        if self.cap is not None and self.cap.isOpened():
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.cap_width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.cap_height)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            for _ in range(5):
                self.cap.read()

        options = hand_landmarker.HandLandmarkerOptions(
            base_options=base_options_lib.BaseOptions(model_asset_path="hand_landmarker.task"),
            running_mode=vision_task_running_mode.VisionTaskRunningMode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.hands = hand_landmarker.HandLandmarker.create_from_options(options)

        self._drawing = False
        self._latest: HandInput | None = None
        self._latest_frame: np.ndarray | None = None
        self._latest_index_tip: tuple[float, float] | None = None
        self._last_x: float | None = None
        self._last_y: float | None = None
        self._last_t: float | None = None

    def _open_camera(self, camera_index: int) -> cv2.VideoCapture | None:
        for index in range(camera_index, camera_index + 3):
            for api in (cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY):
                cap = cv2.VideoCapture(index, api)
                if cap.isOpened():
                    self.camera_index = index
                    return cap
                cap.release()
        return None

    def is_camera_ready(self) -> bool:
        return bool(self.cap is not None and self.cap.isOpened())

    def update(self, canvas_width: int, canvas_height: int) -> None:
        if not self.is_camera_ready():
            self._drawing = False
            self._latest = None
            return

        success, frame = self.cap.read()
        if not success or frame is None:
            self._drawing = False
            self._latest = None
            return

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = mp_image.Image(image_format=mp_image.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(time.time() * 1000)
        if hasattr(self, "_last_timestamp_ms") and timestamp_ms <= self._last_timestamp_ms:
            timestamp_ms = self._last_timestamp_ms + 1
        self._last_timestamp_ms = timestamp_ms

        self._latest_frame = rgb.copy()
        self._latest_index_tip = None

        result = self.hands.detect_for_video(image, timestamp_ms)
        if not result.hand_landmarks:
            self._drawing = False
            self._latest = None
            return

        hand_landmarks = result.hand_landmarks[0]
        if hasattr(hand_landmarks, "landmarks"):
            landmarks = hand_landmarks.landmarks
        else:
            landmarks = hand_landmarks

        if not landmarks or len(landmarks) < 13:
            self._drawing = False
            self._latest = None
            return

        index_tip = landmarks[8]
        index_pip = landmarks[6]
        middle_tip = landmarks[12]
        middle_pip = landmarks[10]
        self._latest_index_tip = (float(index_tip.x), float(index_tip.y))

        self._drawing = bool(index_tip.y < index_pip.y and middle_tip.y > middle_pip.y)

        x = int(max(0.0, min(1.0, index_tip.x)) * max(1, canvas_width - 1))
        y = int(max(0.0, min(1.0, index_tip.y)) * max(1, canvas_height - 1))

        now = time.time()
        if self._last_x is None or self._last_y is None or self._last_t is None:
            speed = 0.0
        else:
            dt = max(1e-3, now - self._last_t)
            dx = x - self._last_x
            dy = y - self._last_y
            speed = (dx * dx + dy * dy) ** 0.5 / dt

        pressure = float(max(0.2, min(1.0, 1.0 - speed / 1200.0)))

        self._latest = HandInput(x=x, y=y, pressure=pressure, speed=speed)
        self._last_x = float(x)
        self._last_y = float(y)
        self._last_t = now

    def get_position(self) -> dict[str, float] | None:
        if self._latest is None:
            return None
        return {
            "x": float(self._latest.x),
            "y": float(self._latest.y),
            "pressure": float(self._latest.pressure),
            "speed": float(self._latest.speed),
        }

    def get_frame(self) -> np.ndarray | None:
        return self._latest_frame

    def get_index_tip_normalized(self) -> tuple[float, float] | None:
        return self._latest_index_tip

    def is_drawing(self) -> bool:
        return self._drawing

    def release(self) -> None:
        if self.cap is not None:
            self.cap.release()
        if self.hands is not None:
            self.hands.close()
