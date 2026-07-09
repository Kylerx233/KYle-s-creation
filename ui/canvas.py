"""绘画画布模块。负责接收鼠标输入并渲染反应扩散墨场。"""

from __future__ import annotations

from pathlib import Path
from time import time

from PyQt6.QtCore import QPoint, Qt, QTimer
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

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setMinimumSize(900, 600)
        self.setMouseTracking(True)
        self.setStyleSheet("background: transparent; border: none;")

        self.field = InkField(512, 512)
        self.ink_brush = InkBrush()
        self.brush_engine = InkBrushEngine(base_size=3.2)
        self.hand_tracker = HandTracker()
        self.paper = PaperTexture((512, 512))
        self._last_point: QPoint | None = None
        self._stroke: Stroke | None = None
        self._display_image: Image.Image | None = None
        self._pixmap = QPixmap(self.width(), self.height())

        self.timer = QTimer(self)
        self.timer.setInterval(33)
        self.timer.timeout.connect(self._tick)
        self.timer.start()

        self.hand_timer = QTimer(self)
        self.hand_timer.setInterval(33)
        self.hand_timer.timeout.connect(self._poll_hand_input)
        self.hand_timer.start()

        self._preview_image: QPixmap | None = None
        self._preview_tip: QPoint | None = None

        self._refresh_display()

    def _tick(self) -> None:
        """每隔一段时间更新一次墨场并刷新显示。"""
        self.field.update()
        self._refresh_display()

    def _poll_hand_input(self) -> None:
        """周期性从摄像头手势系统读取输入并转发到墨场。"""
        self.hand_tracker.update(self.width(), self.height())
        self._update_preview()
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
            self._stroke.add_point(point.x(), point.y(), time(), speed=pos["speed"])
            self._last_point = point
            self._inject_from_point(point, pos["speed"], pos["pressure"])
            return

        self._stroke.add_point(point.x(), point.y(), time(), speed=pos["speed"])
        self._inject_from_point(point, pos["speed"], pos["pressure"])

    def _refresh_display(self) -> None:
        """将当前墨场和宣纸纹理合成后刷新显示。"""
        paper_image = self.paper.as_pil_image().convert("RGBA")
        ink_image = Image.fromarray(self.field.to_image(), "RGBA")
        composed = Image.alpha_composite(paper_image, ink_image)
        self._display_image = composed

        qimage = QImage(
            composed.tobytes("raw", "RGBA"),
            composed.width,
            composed.height,
            QImage.Format.Format_RGBA8888,
        )
        self._pixmap = QPixmap.fromImage(qimage)
        self.update()

    def _update_preview(self) -> None:
        """更新摄像头预览和食指红点。"""
        frame, tip = self.hand_tracker.get_preview_data()
        if frame is None:
            self._preview_image = None
            self._preview_tip = None
            return

        height, width, _ = frame.shape
        qimage = QImage(frame.data, width, height, width * 3, QImage.Format.Format_RGB888)
        self._preview_image = QPixmap.fromImage(qimage).scaled(240, 180, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
        if tip is not None:
            x = int(tip[0] * (self._preview_image.width() / width))
            y = int(tip[1] * (self._preview_image.height() / height))
            self._preview_tip = QPoint(x, y)
        else:
            self._preview_tip = None

    def paintEvent(self, event) -> None:
        """把当前墨场绘制到界面。"""
        painter = QPainter(self)
        scaled_pixmap = self._pixmap.scaled(self.size(), Qt.AspectRatioMode.IgnoreAspectRatio, Qt.TransformationMode.SmoothTransformation)
        painter.drawPixmap(0, 0, scaled_pixmap)

        if self._preview_image is not None:
            preview_rect = self._preview_image.rect()
            preview_rect.moveTopRight(self.rect().topRight() - QPoint(10, -10))
            painter.setOpacity(0.85)
            painter.drawPixmap(preview_rect.topLeft(), self._preview_image)
            painter.setOpacity(1.0)
            if self._preview_tip is not None:
                pen = QPen(QColor(255, 0, 0), 8)
                painter.setPen(pen)
                painter.drawPoint(preview_rect.topLeft() + self._preview_tip)

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

    def _inject_from_point(self, point: QPoint, speed: float | None = None, pressure: float = 0.6) -> None:
        """把鼠标位置转换到墨场坐标并注入墨。"""
        if self._last_point is not None and speed is None:
            dx = point.x() - self._last_point.x()
            dy = point.y() - self._last_point.y()
            speed = (dx * dx + dy * dy) ** 0.5
        elif speed is None:
            speed = 0.0

        field_x = int(point.x() / max(1, self.width()) * self.field.width)
        field_y = int(point.y() / max(1, self.height()) * self.field.height)
        if self._stroke is None:
            self._stroke = Stroke()
        params = self.brush_engine.evaluate(self._stroke, input_speed=float(speed))
        amount = max(0.14, float(speed) * 0.06) * (0.6 + max(0.4, pressure))
        radius = int(max(3, params["brush_size"] * (1.0 - min(1.0, float(speed) / 20.0) * 0.35)))
        self._inject_line(field_x, field_y, amount, radius, params)
        self._last_point = point
        self._refresh_display()

    def _inject_line(self, field_x: int, field_y: int, amount: float, radius: int, params: dict[str, float]) -> None:
        """沿两点间路径连续注入墨点。"""
        if self._last_point is None:
            self.field.inject(
                field_x,
                field_y,
                amount,
                radius=radius,
                direction=params["direction"],
                aspect_ratio=params["aspect_ratio"],
                wetness=params["wetness"],
            )
            return

        last_x = int(self._last_point.x() / max(1, self.width()) * self.field.width)
        last_y = int(self._last_point.y() / max(1, self.height()) * self.field.height)
        dx = field_x - last_x
        dy = field_y - last_y
        dist = (dx * dx + dy * dy) ** 0.5
        steps = max(1, int(dist / max(2, radius * 0.8)))
        for step in range(1, steps + 1):
            t = step / (steps + 1)
            ix = int(last_x + dx * t)
            iy = int(last_y + dy * t)
            self.field.inject(
                ix,
                iy,
                amount,
                radius=radius,
                direction=params["direction"],
                aspect_ratio=params["aspect_ratio"],
                wetness=params["wetness"],
            )
        self.field.inject(
            field_x,
            field_y,
            amount,
            radius=radius,
            direction=params["direction"],
            aspect_ratio=params["aspect_ratio"],
            wetness=params["wetness"],
        )

    def clear_canvas(self) -> None:
        """清空当前画布。"""
        self.field.clear()
        self._refresh_display()

    def closeEvent(self, event) -> None:
        """窗口关闭时释放摄像头。"""
        self.hand_tracker.release()
        super().closeEvent(event)

    def save_image(self, path: str) -> bool:
        """保存当前作品为 PNG。"""
        output_path = Path(path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if self._display_image is None:
            return False
        self._display_image.save(str(output_path), "PNG")
        return True
