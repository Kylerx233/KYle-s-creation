"""主窗口模块。负责组织顶部标题、绘图区域和底部按钮。"""

from pathlib import Path

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (QHBoxLayout, QLabel, QMainWindow, QMessageBox,
                             QPushButton, QVBoxLayout, QWidget)

from ui.canvas import DrawingCanvas


class MainWindow(QMainWindow):
    """应用主窗口。"""

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("《江山千里——绘梦成型》")
        self.resize(1100, 760)

        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        layout = QVBoxLayout(central_widget)
        layout.setAlignment(Qt.AlignmentFlag.AlignTop)

        title_label = QLabel("《江山千里——绘梦成型》")
        title_label.setStyleSheet("font-size: 24px; font-weight: bold; margin: 12px 0;")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title_label)

        self.canvas = DrawingCanvas(self)
        layout.addWidget(self.canvas, stretch=1)

        button_bar = QHBoxLayout()
        button_bar.setAlignment(Qt.AlignmentFlag.AlignCenter)

        clear_button = QPushButton("清空画布")
        clear_button.clicked.connect(self.canvas.clear_canvas)
        button_bar.addWidget(clear_button)

        save_button = QPushButton("保存作品")
        save_button.clicked.connect(self.save_ink_painting)
        button_bar.addWidget(save_button)

        layout.addLayout(button_bar)

    def save_ink_painting(self) -> None:
        """保存当前作品为 output/ink_painting.png。"""
        output_dir = Path(__file__).resolve().parent.parent / "output"
        output_path = output_dir / "ink_painting.png"
        success = self.canvas.save_image(str(output_path))

        if success:
            QMessageBox.information(self, "保存成功", f"作品已保存到：{output_path}")
        else:
            QMessageBox.critical(self, "保存失败", "无法保存作品。")
