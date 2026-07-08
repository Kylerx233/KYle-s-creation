"""MediaPipe 手势识别模块。用于摄像头手势输入到绘画系统。"""

from __future__ import annotations

import shutil
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

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
        self.cap = cv2.VideoCapture(camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)

        source_model_path = Path(__file__).resolve().parent.parent / "hand_landmarker.task"
        temp_model_path = Path(tempfile.gettempdir()) / "hand_landmarker_ascii.task"
        shutil.copy2(source_model_path, temp_model_path)
        options = hand_landmarker.HandLandmarkerOptions(
            base_options=base_options_lib.BaseOptions(model_asset_path=str(temp_model_path)),
            running_mode=vision_task_running_mode.VisionTaskRunningMode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.hands = hand_landmarker.HandLandmarker.create_from_options(options)

        self._drawing = False
        self._latest: HandInput | None = None
        self._last_x: float | None = None
        self._last_y: float | None = None
        self._last_t: float | None = None
        self.last_frame: np.ndarray | None = None
        self.last_index_tip: tuple[int, int] | None = None
        self._draw_history: list[bool] = []
        self._smoothed_x: float | None = None
        self._smoothed_y: float | None = None
        self._last_valid_time: float = 0.0
        self._grace_period: float = 0.16

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
        self.last_frame = rgb
        image = mp_image.Image(image_format=mp_image.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(time.time() * 1000)

        result = self.hands.detect_for_video(image, timestamp_ms)
        now = time.time()
        if not result.hand_landmarks:
            if self._drawing and now - self._last_valid_time < self._grace_period:
                return
            self._drawing = False
            self._latest = None
            self._draw_history.clear()
            return

        first_hand = result.hand_landmarks[0]
        landmarks = getattr(first_hand, 'landmarks', first_hand)
        if not hasattr(landmarks, '__len__') or len(landmarks) < 13:
            if self._drawing and now - self._last_valid_time < self._grace_period:
                return
            self._drawing = False
            self._latest = None
            self._draw_history.clear()
            return

        index_tip = landmarks[8]
        index_pip = landmarks[6]
        middle_tip = landmarks[12]
        middle_pip = landmarks[10]

        current_draw = bool(index_tip.y < index_pip.y and middle_tip.y > middle_pip.y)
        self._draw_history.append(current_draw)
        if len(self._draw_history) > 6:
            self._draw_history.pop(0)
        self._drawing = sum(self._draw_history) >= 3

        raw_x = max(0.0, min(1.0, index_tip.x))
        raw_y = max(0.0, min(1.0, index_tip.y))
        if self._smoothed_x is None or self._smoothed_y is None:
            self._smoothed_x = raw_x
            self._smoothed_y = raw_y
        else:
            self._smoothed_x = self._smoothed_x * 0.7 + raw_x * 0.3
            self._smoothed_y = self._smoothed_y * 0.7 + raw_y * 0.3

        x = int(self._smoothed_x * max(1, canvas_width - 1))
        y = int(self._smoothed_y * max(1, canvas_height - 1))

        if self._last_x is None or self._last_y is None or self._last_t is None:
            speed = 0.0
        else:
            dt = max(1e-3, now - self._last_t)
            dx = x - self._last_x
            dy = y - self._last_y
            speed = (dx * dx + dy * dy) ** 0.5 / dt

        pressure = float(max(0.2, min(1.0, 1.0 - speed / 1200.0)))
        if self.last_frame is not None:
            frame_width = self.last_frame.shape[1]
            frame_height = self.last_frame.shape[0]
            self.last_index_tip = (
                int(self._smoothed_x * frame_width),
                int(self._smoothed_y * frame_height),
            )

        self._latest = HandInput(x=x, y=y, pressure=pressure, speed=speed)
        self._last_x = float(x)
        self._last_y = float(y)
        self._last_t = now
        self._last_valid_time = now

    def get_position(self) -> dict[str, float] | None:
        if self._latest is None:
            return None
        return {
            "x": float(self._latest.x),
            "y": float(self._latest.y),
            "pressure": float(self._latest.pressure),
            "speed": float(self._latest.speed),
        }

    def get_preview_data(self) -> tuple[np.ndarray | None, tuple[int, int] | None]:
        return self.last_frame, self.last_index_tip

    def is_drawing(self) -> bool:
        return self._drawing

    def release(self) -> None:
        if self.cap is not None:
            self.cap.release()
        if self.hands is not None:
            self.hands.close()
