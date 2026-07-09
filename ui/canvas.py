"""绘画画布模块。负责接收鼠标输入并渲染反应扩散墨场。"""

from __future__ import annotations

from pathlib import Path
from time import time

from PyQt6.QtCore import QPoint, Qt, QTimer, QSize
from PyQt6.QtGui import QImage, QPainter, QPixmap, QPen, QColor
from PyQt6.QtWidgets import QWidget
from PIL import Image

from core.brush_engine import InkBrushEngine
from core.hand_tracking import HandTracker
from core.ink_brush import InkBrush
from core.ink_field import InkField
from core.paper import PaperTexture
from core.stroke import Stroke


class DrawingCanvas(QWidget):
    """一个带有宣纸纹理和实时反应扩散墨场的绘图区域。"""

    def __init__(self, parent=None, hand_tracker: HandTracker | None = None) -> None:
        super().__init__(parent)
        self.setMinimumSize(900, 600)
        self.setMouseTracking(True)
        self.setStyleSheet("background-color: #f5ebd8; border: 1px solid #c7b28a;")

        self.field = InkField(1920, 1080)
        self.ink_brush = InkBrush(self.field)
        self.brush_engine = InkBrushEngine(base_size=3.2)
        self.hand_tracker = hand_tracker or HandTracker()
        self.paper = PaperTexture((1920, 1080))
        self._last_point: QPoint | None = None
        self._stroke: Stroke | None = None
        self._display_image: Image.Image | None = None
        self._pixmap_original = QPixmap(self.width(), self.height())
        self._pixmap = QPixmap(self.width(), self.height())
        self._cached_size = self.size()
        self._paper_pixmap: QPixmap | None = None

        self.timer = QTimer(self)
        self.timer.setInterval(34)
        self.timer.timeout.connect(self._tick)
        self.timer.start()

        self.hand_timer = QTimer(self)
        self.hand_timer.setInterval(40)
        self.hand_timer.timeout.connect(self._poll_hand_input)
        self.hand_timer.start()

        self._refresh_display()

    def _tick(self) -> None:
        """每隔一段时间更新一次墨场并刷新显示。"""
        self.field.update()
        self._refresh_display()

    def _poll_hand_input(self) -> None:
        """周期性从摄像头手势系统读取输入并转发到墨场。"""
        self.hand_tracker.update(self.width(), self.height())
        if not self.hand_tracker.is_drawing():
            self._last_point = None
            self._stroke = None
            return

        pos = self.hand_tracker.get_position()
        if pos is None:
            self._last_point = None
            self._stroke = None
            return

        point = QPoint(int(pos["x"]), int(pos["y"]))
        if self._stroke is None:
            self._stroke = Stroke()
            self._stroke.add_point(point.x(), point.y(), time())
            self._last_point = point
            self._inject_from_point(point, pos["speed"])
            return

        self._stroke.add_point(point.x(), point.y(), time())
        self._inject_from_point(point, pos["speed"])

    def _refresh_display(self) -> None:
        """将当前墨场和宣纸纹理合成后刷新显示。"""
        if self._paper_pixmap is None:
            paper_image = self.paper.as_pil_image().convert("RGBA")
            paper_qimage = QImage(
                paper_image.tobytes("raw", "RGBA"),
                paper_image.width,
                paper_image.height,
                QImage.Format.Format_RGBA8888,
            )
            self._paper_pixmap = QPixmap.fromImage(paper_qimage)

        paper_image = self.paper.as_pil_image().convert("RGBA")
        ink_image = Image.fromarray(self.field.to_image(), "RGBA")
        self._display_image = Image.alpha_composite(paper_image, ink_image)

        ink_qimage = QImage(
            self._display_image.tobytes("raw", "RGBA"),
            self._display_image.width,
            self._display_image.height,
            QImage.Format.Format_RGBA8888,
        )
        ink_pixmap = QPixmap.fromImage(ink_qimage)

        self._pixmap_original = self._paper_pixmap.copy()
        painter = QPainter(self._pixmap_original)
        painter.drawPixmap(0, 0, ink_pixmap)
        painter.end()

        if self.size() != self._cached_size or self._pixmap.isNull():
            self._cached_size = self.size()
            self._pixmap = self._pixmap_original.scaled(self._cached_size, Qt.AspectRatioMode.IgnoreAspectRatio, Qt.TransformationMode.FastTransformation)
        else:
            self._pixmap = self._pixmap_original.scaled(self._cached_size, Qt.AspectRatioMode.IgnoreAspectRatio, Qt.TransformationMode.FastTransformation)

        camera_frame = self.hand_tracker.get_frame()
        if camera_frame is not None:
            height, width, _ = camera_frame.shape
            frame_image = QImage(
                camera_frame.data,
                width,
                height,
                camera_frame.strides[0],
                QImage.Format.Format_RGB888,
            ).copy()
            preview_size = QSize(240, 180)
            self._preview_pixmap = QPixmap.fromImage(frame_image).scaled(
                preview_size, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation
            )
        self.update()

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        self._cached_size = QSize(0, 0)
        self._refresh_display()

    def paintEvent(self, event) -> None:
        """把当前墨场绘制到界面。"""
        painter = QPainter(self)
        painter.drawPixmap(0, 0, self._pixmap)

        if hasattr(self, "_preview_pixmap") and self._preview_pixmap is not None:
            margin = 12
            preview_rect = self._preview_pixmap.rect()
            preview_x = self.width() - preview_rect.width() - margin
            preview_y = self.height() - preview_rect.height() - margin
            painter.setOpacity(0.92)
            painter.drawPixmap(preview_x, preview_y, self._preview_pixmap)
            painter.setOpacity(1.0)

            index_tip = self.hand_tracker.get_index_tip_normalized()
            if index_tip is not None:
                tip_x = int(index_tip[0] * preview_rect.width())
                tip_y = int(index_tip[1] * preview_rect.height())
                indicator_radius = 8
                painter.setPen(QPen(QColor(255, 50, 50), 3))
                painter.setBrush(QColor(255, 50, 50, 200))
                painter.drawEllipse(preview_x + tip_x - indicator_radius // 2, preview_y + tip_y - indicator_radius // 2, indicator_radius, indicator_radius)

        painter.end()

    def mousePressEvent(self, event) -> None:
        """鼠标按下时记录起点并立即注入墨。"""
        if event.button() == Qt.MouseButton.LeftButton:
            point = event.position().toPoint()
            self._last_point = point
            self._stroke = Stroke()
            self._stroke.add_point(point.x(), point.y(), time())
            self._inject_from_point(point, 1.2)

    def mouseMoveEvent(self, event) -> None:
        """鼠标移动时根据速度向墨场注入墨。"""
        if event.buttons() & Qt.MouseButton.LeftButton and self._last_point is not None:
            point = event.position().toPoint()
            dx = point.x() - self._last_point.x()
            dy = point.y() - self._last_point.y()
            move_speed = (dx * dx + dy * dy) ** 0.5
            if self._stroke is None:
                self._stroke = Stroke()
            self._stroke.add_point(point.x(), point.y(), time())
            self._inject_from_point(point, float(move_speed))

    def mouseReleaseEvent(self, event) -> None:
        """鼠标释放时结束当前绘制。"""
        if event.button() == Qt.MouseButton.LeftButton:
            self._last_point = None
            self._stroke = None

    def _inject_from_point(self, point: QPoint, speed: float | None = None) -> None:
        """把鼠标位置转换到墨场坐标并注入墨。"""
        if self._last_point is not None and speed is None:
            dx = point.x() - self._last_point.x()
            dy = point.y() - self._last_point.y()
            speed = (dx * dx + dy * dy) ** 0.5
        elif speed is None:
            speed = 0.0

        if self._stroke is None:
            self._stroke = Stroke()

        steps = 1
        if self._last_point is not None:
            dx = point.x() - self._last_point.x()
            dy = point.y() - self._last_point.y()
            distance = (dx * dx + dy * dy) ** 0.5
            steps = max(1, int(distance / 4))

        params = self.brush_engine.evaluate(self._stroke, input_speed=float(speed))
        for step_index in range(steps):
            t = step_index / max(1, steps - 1)
            interp_x = int(self._last_point.x() + dx * t) if self._last_point is not None else point.x()
            interp_y = int(self._last_point.y() + dy * t) if self._last_point is not None else point.y()
            field_x = int(interp_x / max(1, self.width()) * self.field.width)
            field_y = int(interp_y / max(1, self.height()) * self.field.height)
            self.ink_brush.apply(field_x, field_y, float(speed), params=params)

        self._last_point = point

    def clear_canvas(self) -> None:
        """清空当前画布。"""
        self.field.clear()
        self._refresh_display()

    def closeEvent(self, event) -> None:
        """窗口关闭时释放摄像头。"""
        self.hand_tracker.release()
        super().closeEvent(event)

    def save_image(self, path: str) -> tuple[bool, str | None]:
        """保存当前作品为 PNG。"""
        output_path = Path(path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if self._display_image is None:
            self._refresh_display()

        if self._display_image is not None:
            try:
                self._display_image.save(str(output_path), "PNG")
                return True, None
            except Exception as exc:
                error_message = f"PIL save failure: {exc}"
        else:
            error_message = "No display image available."

        if hasattr(self, "_pixmap") and not self._pixmap.isNull():
            if self._pixmap.save(str(output_path), "PNG"):
                return True, None
            return False, "QPixmap save failure"

        return False, error_message
