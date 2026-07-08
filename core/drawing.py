"""简单绘图状态管理模块。后续可扩展为更复杂的绘图工具。"""

from dataclasses import dataclass, field
from typing import Optional

from PyQt6.QtCore import QPoint
from PyQt6.QtGui import QColor


@dataclass
class DrawingState:
    """保存当前画布的绘制状态。"""

    is_drawing: bool = False
    last_point: Optional[QPoint] = None
    pen_color: QColor = field(default_factory=lambda: QColor("black"))
    pen_width: int = 2
