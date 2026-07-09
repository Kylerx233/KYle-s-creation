"""主窗口模块。负责组织顶部标题、绘图区域和底部按钮。"""

from pathlib import Path

from PyQt6.QtCore import QPropertyAnimation, QThread, Qt, QUrl
from PyQt6.QtMultimedia import QAudioOutput, QMediaPlayer
from PyQt6.QtWidgets import (QGraphicsOpacityEffect, QHBoxLayout, QStackedLayout,
                             QLabel, QMainWindow, QMessageBox, QPushButton,
                             QVBoxLayout, QWidget)

from core.ai_worker import AIWorker
from core.hand_tracking import HandTracker
from ui.canvas import DrawingCanvas
from ui.particle_canvas import ParticleCanvas


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

        self.status_label = QLabel("准备就绪。")
        self.status_label.setStyleSheet("font-size: 14px; color: #444; margin-bottom: 10px;")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.status_label)

        self.hand_tracker = HandTracker()
        self.canvas = DrawingCanvas(self, hand_tracker=self.hand_tracker)
        self.particle_canvas = ParticleCanvas(self, hand_tracker=self.hand_tracker)

        self.audio_output = QAudioOutput(self)
        self.bgm_player = QMediaPlayer(self)
        self.bgm_player.setAudioOutput(self.audio_output)
        self.bgm_sources = self._load_bgm_sources()
        self.current_bgm = None

        self.workspace_stack = QStackedLayout()
        self.workspace_stack.setSpacing(0)
        self.workspace_stack.addWidget(self.canvas)
        self.workspace_stack.addWidget(self.particle_canvas)
        self.workspace_stack.setCurrentWidget(self.canvas)

        workspace = QHBoxLayout()
        workspace.setSpacing(14)
        workspace.addLayout(self.workspace_stack, stretch=1)
        layout.addLayout(workspace, stretch=1)

        button_bar = QHBoxLayout()
        button_bar.setAlignment(Qt.AlignmentFlag.AlignCenter)

        clear_button = QPushButton("清空画布")
        clear_button.clicked.connect(self.canvas.clear_canvas)
        button_bar.addWidget(clear_button)

        save_button = QPushButton("保存作品")
        save_button.clicked.connect(self.save_ink_painting)
        button_bar.addWidget(save_button)

        self.generate_button = QPushButton("生成山水")
        self.generate_button.clicked.connect(self.generate_landscape)
        button_bar.addWidget(self.generate_button)

        layout.addLayout(button_bar)

        self.canvas.start()
        self.particle_canvas.stop()
        self.play_bgm("canvas")

    def _load_bgm_sources(self) -> dict[str, Path]:
        bgm_dir = Path(__file__).resolve().parent.parent / "assets" / "bgm"
        tracks = sorted(bgm_dir.glob("*.mp3"))
        sources: dict[str, Path] = {}
        if not tracks:
            return sources
        sources["canvas"] = tracks[0]
        if len(tracks) > 1:
            sources["particle"] = tracks[1]
        return sources

    def play_bgm(self, scene: str) -> None:
        source = self.bgm_sources.get(scene)
        if source is None or not source.exists():
            return
        self.bgm_player.setSource(QUrl.fromLocalFile(str(source)))
        self.audio_output.setVolume(0.35)
        self.bgm_player.play()
        self.current_bgm = scene

    def save_ink_painting(self) -> None:
        """保存当前作品为 output/ink_painting.png。"""
        output_dir = Path(__file__).resolve().parent.parent / "output"
        output_path = output_dir / "ink_painting.png"
        success, error = self.canvas.save_image(str(output_path))

        if success:
            QMessageBox.information(self, "保存成功", f"作品已保存到：{output_path}")
        else:
            QMessageBox.critical(self, "保存失败", f"无法保存作品：{error}")

    def generate_landscape(self) -> None:
        sketch_path = Path(__file__).resolve().parent.parent / "output" / "input_sketch.png"
        sketch_path.parent.mkdir(parents=True, exist_ok=True)
        saved, error = self.canvas.save_image(str(sketch_path))
        if not saved:
            self.status_label.setText("保存草图失败，请重试。")
            QMessageBox.critical(self, "保存失败", f"无法保存当前画布为草图：{error}")
            return

        self.status_label.setText("正在生成山水意境...")
        self.generate_button.setEnabled(False)
        self.canvas.setEnabled(False)

        prompt = (
            "请将这幅用户绘制的水墨草图转化为中国传统青绿山水画。"
            " 保持用户原始构图、山水布局和笔触方向。"
            " 将简单线条扩展为具有宋代山水意境的完整画卷。"
            " 风格参考：\n《千里江山图》\n中国青绿山水\n宋代绘画美学\n宣纸纹理\n水墨晕染\n云雾缭绕\n远山近水\n细腻山石结构\n东方留白美学"
            " 要求：保持原始草图的空间关系。不要改变主要构图。不要生成现代建筑。不要生成西方油画风格。"
        )

        self.ai_thread = QThread(self)
        self.ai_worker = AIWorker(str(sketch_path), prompt)
        self.ai_worker.moveToThread(self.ai_thread)
        self.ai_thread.started.connect(self.ai_worker.run)
        self.ai_worker.finished.connect(self.on_ai_finished)
        self.ai_worker.error.connect(self.on_ai_error)
        self.ai_worker.finished.connect(self.ai_thread.quit)
        self.ai_worker.error.connect(self.ai_thread.quit)
        self.ai_worker.finished.connect(self.ai_worker.deleteLater)
        self.ai_worker.error.connect(self.ai_worker.deleteLater)
        self.ai_thread.finished.connect(self.ai_thread.deleteLater)
        self.ai_thread.start()
        self.canvas.stop()

    def on_ai_finished(self, generated_path: str) -> None:
        try:
            self.particle_canvas.load_image(generated_path)
            self._fade_to_widget(self.particle_canvas)
            self.particle_canvas.start()
            self.status_label.setText("生成完成，已切换到互动粒子展示。")
            self.play_bgm("particle")
        except Exception as err:
            self.status_label.setText("粒子展示启动失败，请查看日志。")
            QMessageBox.critical(self, "展示失败", f"粒子展示启动失败：{err}")
        finally:
            self.generate_button.setEnabled(True)

    def on_ai_error(self, error_message: str) -> None:
        self.status_label.setText(f"生成失败：{error_message}")
        self.generate_button.setEnabled(True)
        self.canvas.setEnabled(True)
        QMessageBox.critical(self, "生成失败", f"AI 生图失败：{error_message}")

    def _fade_to_widget(self, target_widget: QWidget) -> None:
        current_widget = self.workspace_stack.currentWidget()
        if current_widget is target_widget:
            return

        current_effect = QGraphicsOpacityEffect(current_widget)
        current_widget.setGraphicsEffect(current_effect)
        current_animation = QPropertyAnimation(current_effect, b"opacity", self)
        current_animation.setDuration(300)
        current_animation.setStartValue(1.0)
        current_animation.setEndValue(0.0)

        def on_fade_out_finished() -> None:
            current_widget.setGraphicsEffect(None)
            if current_widget is self.canvas:
                self.canvas.stop()
            elif current_widget is self.particle_canvas:
                self.particle_canvas.stop()
            self.workspace_stack.setCurrentWidget(target_widget)
            if target_widget is self.canvas:
                self.canvas.start()
            elif target_widget is self.particle_canvas:
                self.particle_canvas.start()
            target_effect = QGraphicsOpacityEffect(target_widget)
            target_widget.setGraphicsEffect(target_effect)
            target_effect.setOpacity(0.0)
            target_animation = QPropertyAnimation(target_effect, b"opacity", self)
            target_animation.setDuration(300)
            target_animation.setStartValue(0.0)
            target_animation.setEndValue(1.0)

            def on_fade_in_finished() -> None:
                target_widget.setGraphicsEffect(None)
                self.canvas.setEnabled(target_widget is self.canvas)
            target_animation.finished.connect(on_fade_in_finished)
            target_animation.start()

        current_animation.finished.connect(on_fade_out_finished)
        current_animation.start()

    def closeEvent(self, event) -> None:
        self.hand_tracker.release()
        super().closeEvent(event)
