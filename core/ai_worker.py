"""AI 后台任务模块，使用 QThread 执行生成。"""

from __future__ import annotations

from pathlib import Path

from PyQt6.QtCore import QObject, pyqtSignal

from core.ai_generate import AIImageGenerator
from core.api_config import APIConfig


class AIWorker(QObject):
    finished = pyqtSignal(str)
    error = pyqtSignal(str)

    def __init__(self, sketch_path: str, prompt: str) -> None:
        super().__init__()
        self.sketch_path = Path(sketch_path)
        self.prompt = prompt

    def run(self) -> None:
        try:
            generator = AIImageGenerator(APIConfig())
            generated_path = generator.generate(str(self.sketch_path), self.prompt)
        except Exception as exc:
            self.error.emit(str(exc))
        else:
            self.finished.emit(str(generated_path))
