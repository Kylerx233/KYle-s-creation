"""粒子可视化画布模块。"""

from __future__ import annotations

import math
from pathlib import Path

from PyQt6.QtCore import Qt, QRect, QRectF, QSize, QTimer
from PyQt6.QtGui import QColor, QFont, QImage, QPainter, QPaintEvent, QPixmap, QPen
from PyQt6.QtWidgets import QSizePolicy, QWidget

from core.hand_tracking import HandTracker
from core.particle.flow_field import FlowField
from core.particle.image_sampler import sample_image
from core.particle.particle import Particle


class ParticleCanvas(QWidget):
    def __init__(self, parent=None, hand_tracker: HandTracker | None = None) -> None:
        super().__init__(parent)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setStyleSheet("background-color: #f4f2e8;")

        self._image_path: Path | None = None
        self._original_pixmap: QPixmap | None = None
        self._background_pixmap: QPixmap | None = None
        self._bg_area: QRect | None = None
        self._particles: list[Particle] = []
        self.hand_tracker = hand_tracker or HandTracker()
        self._preview_pixmap: QPixmap | None = None
        self._flow_field: FlowField | None = None
        self._timer = QTimer(self)
        self._timer.setInterval(16)
        self._timer.timeout.connect(self._tick)
        self._timer.start()

        self._camera_timer = QTimer(self)
        self._camera_timer.setInterval(33)
        self._camera_timer.timeout.connect(self._update_camera_preview)
        self._camera_timer.start()

    def _refresh_camera_preview(self) -> None:
        frame = self.hand_tracker.get_frame()
        if frame is None:
            self._preview_pixmap = None
            return

        height, width, _ = frame.shape
        image = QImage(frame.data, width, height, frame.strides[0], QImage.Format.Format_RGB888)
        self._preview_pixmap = QPixmap.fromImage(image).scaled(
            QSize(240, 180),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )

    def sizeHint(self) -> QSize:
        return QSize(420, 600)

    def load_image(self, image_path: str) -> None:
        self._image_path = Path(image_path)
        self._particles.clear()
        self._original_pixmap = QPixmap(image_path)
        if self._original_pixmap.isNull():
            return

        self._scale_image_to_fullscreen()
        self._update_particles()
        self.update()

    def _scale_image_to_fullscreen(self) -> None:
        if self._original_pixmap is None:
            return

        target_size = QSize(max(1, self.width()), max(1, self.height()))
        self._background_pixmap = self._original_pixmap.scaled(
            target_size,
            Qt.AspectRatioMode.KeepAspectRatioByExpanding,
            Qt.TransformationMode.SmoothTransformation,
        )
        self._bg_area = QRect(
            -int((self._background_pixmap.width() - self.width()) / 2),
            -int((self._background_pixmap.height() - self.height()) / 2),
            self._background_pixmap.width(),
            self._background_pixmap.height(),
        )
        self._flow_field = FlowField(self.width(), self.height(), cell_size=88, speed=0.22)

    def _update_particles(self) -> None:
        if self._image_path is None or self._background_pixmap is None or self._bg_area is None:
            return

        self._particles.clear()
        target_width = self._background_pixmap.width()
        positions, _ = sample_image(self._image_path, target_width, 8)
        if len(positions) > 3000:
            step = max(1, len(positions) // 3000)
            positions = positions[::step]
            positions = positions[:3000]

        offset_x = self._bg_area.x()
        offset_y = self._bg_area.y()
        for x, y, color in positions:
            self._particles.append(Particle(x + offset_x, y + offset_y, color))

    def interact(self, x: float, y: float, strength: float) -> None:
        radius = 110.0
        for particle in self._particles:
            particle.apply_force(x, y, strength, radius)

    def mousePressEvent(self, event) -> None:
        if self._bg_area is None:
            return
        self.interact(event.position().x(), event.position().y(), 1.4)

    def mouseMoveEvent(self, event) -> None:
        if self._bg_area is None:
            return
        if event.buttons() & Qt.MouseButton.LeftButton:
            self.interact(event.position().x(), event.position().y(), 1.0)

    def mouseReleaseEvent(self, event) -> None:
        pass

    def _tick(self) -> None:
        if self._particles and self._flow_field is not None:
            self._flow_field.update(1.0)
            for particle in self._particles:
                flow_x, flow_y = self._flow_field.get_vector(particle.x, particle.y)
                particle.update(flow_x, flow_y)
            self.update()

    def _update_camera_preview(self) -> None:
        self.hand_tracker.update(self.width(), self.height())
        self._refresh_camera_preview()

        position = self.hand_tracker.get_index_tip_normalized()
        if position is not None and self._bg_area is not None:
            x = int(position[0] * self.width())
            y = int(position[1] * self.height())
            self.interact(x, y, 1.4)
        self.update()

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        self._scale_image_to_fullscreen()
        self._update_particles()

    def paintEvent(self, event: QPaintEvent) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.fillRect(self.rect(), QColor(244, 242, 232))

        if self._background_pixmap is not None and self._bg_area is not None:
            painter.drawPixmap(self._bg_area, self._background_pixmap)
            painter.setOpacity(0.95)
            for particle in self._particles:
                particle.draw(painter)
            painter.setOpacity(1.0)

            if self._preview_pixmap is not None:
                preview_margin = 12
                preview_rect = self._preview_pixmap.rect()
                preview_x = self.width() - preview_rect.width() - preview_margin
                preview_y = self.height() - preview_rect.height() - preview_margin
                painter.setOpacity(0.92)
                painter.drawPixmap(preview_x, preview_y, self._preview_pixmap)
                painter.setOpacity(1.0)

                index_tip = self.hand_tracker.get_index_tip_normalized()
                if index_tip is not None:
                    tip_x = int(index_tip[0] * preview_rect.width())
                    tip_y = int(index_tip[1] * preview_rect.height())
                    painter.setPen(QPen(QColor(255, 50, 50), 3))
                    painter.setBrush(QColor(255, 50, 50, 180))
                    painter.drawEllipse(
                        preview_x + tip_x - 8,
                        preview_y + tip_y - 8,
                        16,
                        16,
                    )

        else:
            painter.setPen(Qt.GlobalColor.darkGray)
            painter.setFont(QFont("Arial", 12))
            painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, "请点击“生成山水”以展示粒子效果")

        painter.end()
