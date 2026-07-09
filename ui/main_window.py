"""主窗口模块。负责组织顶部标题、绘图区域和底部按钮。"""

from pathlib import Path

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPixmap
from PyQt6.QtWidgets import (QHBoxLayout, QLabel, QMainWindow, QMessageBox,
                             QPushButton, QVBoxLayout, QWidget)

from config.api_config import APIConfig
from core.ai_generator import AIImageGenerator
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

        dream_button = QPushButton("绘梦成景")
        dream_button.clicked.connect(self.generate_landscape)
        button_bar.addWidget(dream_button)

        layout.addLayout(button_bar)

        self.output_label = QLabel()
        self.output_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.output_label.setStyleSheet("margin-top: 10px; border: 1px solid #ccc; padding: 8px; background: #ffffff;")
        layout.addWidget(self.output_label)

    def save_ink_painting(self) -> None:
        """保存当前作品为 output/ink_painting.png。"""
        output_dir = Path(__file__).resolve().parent.parent / "output"
        output_path = output_dir / "ink_painting.png"
        success = self.canvas.save_image(str(output_path))

        if success:
            QMessageBox.information(self, "保存成功", f"作品已保存到：{output_path}")
        else:
            QMessageBox.critical(self, "保存失败", "无法保存作品。")

    def generate_landscape(self) -> None:
        """生成 AI 图像并显示结果。"""
        try:
            sketch_path = Path(__file__).resolve().parent.parent / "output" / "input_sketch.png"
            sketch_path.parent.mkdir(parents=True, exist_ok=True)
            saved = self.canvas.save_image(str(sketch_path))
            if not saved:
                QMessageBox.critical(self, "保存失败", "无法保存当前画布为草图。")
                return

            prompt = (
                "请将这幅用户绘制的水墨草图转化为中国传统青绿山水画。"
                " 保持用户原始构图、山水布局和笔触方向。"
                " 将简单线条扩展为具有宋代山水意境的完整画卷。"
                " 风格参考：\n《千里江山图》\n中国青绿山水\n宋代绘画美学\n宣纸纹理\n水墨晕染\n云雾缭绕\n远山近水\n细腻山石结构\n东方留白美学"
                " 要求：保持原始草图的空间关系。不要改变主要构图。不要生成现代建筑。不要生成西方油画风格。"
            )

            generator = AIImageGenerator(APIConfig())
            generated_path = generator.generate(str(sketch_path), prompt)
            self.display_generated_image(str(generated_path))
            QMessageBox.information(self, "生成成功", f"生成图片已保存到：{generated_path}")
        except Exception as err:
            QMessageBox.critical(self, "生成失败", f"AI 生图失败：{err}")

    def display_generated_image(self, image_path: str) -> None:
        output = Path(image_path)
        if not output.exists():
            QMessageBox.critical(self, "显示失败", "生成图片不存在。")
            return

        pixmap = QPixmap(str(output))
        if pixmap.isNull():
            QMessageBox.critical(self, "显示失败", "无法加载生成图片。")
            return

        scaled = pixmap.scaled(560, 420, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
        self.output_label.setPixmap(scaled)
