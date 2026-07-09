"""AI 生成结果展示视图。"""

from __future__ import annotations

from pathlib import Path

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPixmap
from PyQt6.QtWidgets import QLabel, QVBoxLayout, QWidget


class ResultView(QWidget):
    """显示 AI 生成图像结果的 UI 组件。"""

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setStyleSheet("background: #f7f7f7; border: 1px solid #ddd; padding: 8px;")

        self.layout = QVBoxLayout(self)
        self.layout.setAlignment(Qt.AlignmentFlag.AlignTop)

        self.title_label = QLabel("AI 生成山水")
        self.title_label.setStyleSheet("font-size: 18px; font-weight: bold; margin-bottom: 8px;")
        self.layout.addWidget(self.title_label)

        self.image_label = QLabel()
        self.image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.image_label.setStyleSheet("background: #ffffff; border: 1px solid #ccc;")
        self.layout.addWidget(self.image_label)

    def display_image(self, image_path: str) -> None:
        output = Path(image_path)
        if not output.exists():
            self.image_label.setText("生成图片不存在")
            return

        pixmap = QPixmap(str(output))
        if pixmap.isNull():
            self.image_label.setText("加载生成图片失败")
            return

        scaled = pixmap.scaled(520, 520, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
        self.image_label.setPixmap(scaled)
