"""主窗口模块。负责组织顶部标题、绘图区域和底部按钮。"""

from pathlib import Path

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (QFormLayout, QGroupBox, QHBoxLayout, QLabel,
                             QLineEdit, QMainWindow, QMessageBox, QPushButton,
                             QVBoxLayout, QWidget)

from config.api_config import APIConfig
from core.ai_generator import AIImageGenerator
from ui.canvas import DrawingCanvas
from ui.result_view import ResultView


class MainWindow(QMainWindow):
    """应用主窗口。"""

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("《江山千里——绘梦成型》")
        self.resize(1200, 780)

        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        layout = QVBoxLayout(central_widget)
        layout.setAlignment(Qt.AlignmentFlag.AlignTop)

        title_label = QLabel("《江山千里——绘梦成型》")
        title_label.setStyleSheet("font-size: 24px; font-weight: bold; margin: 12px 0;")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title_label)

        settings_group = QGroupBox("AI 设定")
        settings_layout = QFormLayout()
        self.api_key_input = QLineEdit()
        self.api_key_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.api_key_input.setPlaceholderText("请输入 DOUBAO_API_KEY")
        self.api_base_input = QLineEdit()
        self.api_base_input.setPlaceholderText("可选，默认 https://api.doubao.com/v1")
        self.model_input = QLineEdit()
        self.model_input.setPlaceholderText("可选，默认 doubao-image-1")
        settings_layout.addRow("API Key:", self.api_key_input)
        settings_layout.addRow("Base URL:", self.api_base_input)
        settings_layout.addRow("模型:", self.model_input)
        settings_group.setLayout(settings_layout)
        layout.addWidget(settings_group)

        self._load_api_settings()

        workspace = QHBoxLayout()
        workspace.setSpacing(10)

        self.canvas = DrawingCanvas(self)
        workspace.addWidget(self.canvas, stretch=2)

        self.result_view = ResultView(self)
        workspace.addWidget(self.result_view, stretch=1)

        layout.addLayout(workspace, stretch=1)

        button_bar = QHBoxLayout()
        button_bar.setAlignment(Qt.AlignmentFlag.AlignCenter)

        clear_button = QPushButton("清空画布")
        clear_button.clicked.connect(self.canvas.clear_canvas)
        button_bar.addWidget(clear_button)

        save_button = QPushButton("保存作品")
        save_button.clicked.connect(self.save_ink_painting)
        button_bar.addWidget(save_button)

        save_api_button = QPushButton("保存 API 设置")
        save_api_button.clicked.connect(self.save_api_settings)
        button_bar.addWidget(save_api_button)

        dream_button = QPushButton("绘梦成景")
        dream_button.clicked.connect(self.generate_landscape)
        button_bar.addWidget(dream_button)

        layout.addLayout(button_bar)

        self.status_label = QLabel("准备就绪")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_label.setStyleSheet("margin-top: 10px; color: #333;")
        layout.addWidget(self.status_label)

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
        sketch_path = Path(__file__).resolve().parent.parent / "output" / "input_sketch.png"
        sketch_path.parent.mkdir(parents=True, exist_ok=True)
        saved = self.canvas.save_image(str(sketch_path))
        if not saved:
            self.status_label.setText("保存草图失败，请重试。")
            QMessageBox.critical(self, "保存失败", "无法保存当前画布为草图。")
            return

        self.status_label.setText("正在生成，请稍候...")
        prompt = (
            "请将这幅用户绘制的水墨草图转化为中国传统青绿山水画。"
            " 保持用户原始构图、山水布局和笔触方向。"
            " 将简单线条扩展为具有宋代山水意境的完整画卷。"
            " 风格参考：\n《千里江山图》\n中国青绿山水\n宋代绘画美学\n宣纸纹理\n水墨晕染\n云雾缭绕\n远山近水\n细腻山石结构\n东方留白美学"
            " 要求：保持原始草图的空间关系。不要改变主要构图。不要生成现代建筑。不要生成西方油画风格。"
        )

        try:
            generator = AIImageGenerator(APIConfig())
            generated_path = generator.generate(str(sketch_path), prompt)
            self.result_view.display_image(str(generated_path))
            self.status_label.setText("生成成功，已显示 AI 图片。")
            QMessageBox.information(self, "生成成功", f"生成图片已保存到：{generated_path}")
        except Exception as err:
            self.status_label.setText("生成失败，请检查 API 配置或网络。")
            QMessageBox.critical(self, "生成失败", f"AI 生图失败：{err}")

    def _load_api_settings(self) -> None:
        config = APIConfig()
        self.api_key_input.setText(config.api_key)
        self.api_base_input.setText(config.api_base)
        self.model_input.setText(config.model)

    def save_api_settings(self) -> None:
        api_key = self.api_key_input.text().strip()
        api_base = self.api_base_input.text().strip() or "https://api.doubao.com/v1"
        model = self.model_input.text().strip() or "doubao-image-1"

        config = APIConfig(api_key=api_key, api_base=api_base, model=model)
        try:
            config.validate()
        except ValueError as err:
            QMessageBox.warning(self, "配置错误", str(err))
            return

        try:
            config.save()
            self.status_label.setText("API 设置已保存到 .env，重启后自动生效。")
            QMessageBox.information(self, "保存成功", "API 设置已写入 .env 文件。")
        except OSError as err:
            QMessageBox.critical(self, "保存失败", f"无法保存配置：{err}")
