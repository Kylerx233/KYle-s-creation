# 《江山千里——绘梦成型》

一个基于 Python + PyQt6 + MediaPipe 的中国山水数字绘画交互项目。
当前已实现摄像头手势输入、食指红点预览与水墨画布实时渲染，并加入了可视化 AI 图像生成配置入口。

## 功能概览
- 摄像头手势绘画输入（MediaPipe HandLandmarker）
- 画布实时墨迹扩散与持久化显示
- 手指红点预览叠层
- 背景画布（自动读取 `assets` 目录图片）
- AI 参数面板：可在界面输入 API Key、Base URL、模型 ID，并保存到 `.env`
- AI 生成结果显示面板

## 技术栈
- Python 3.11+
- PyQt6
- OpenCV
- MediaPipe Tasks
- Pillow
- NumPy
- Requests
- python-dotenv

## 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/Kylerx233/KYle-s-creation.git
cd KYle-s-creation
```

### 2. 安装依赖
```bash
python -m pip install -r requirements.txt
```

### 3. 配置环境变量（AI 图生图）
如果你希望直接通过界面保存 API 设置，可先复制示例文件：
```bash
cp .env.example .env
```
Windows PowerShell 可使用：
```powershell
Copy-Item .env.example .env
```

然后编辑 `.env`，示例内容为：
```text
DOUBAO_API_KEY=
DOUBAO_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/images/generations
DOUBAO_MODEL=doubao-seedream-5-0-260128
```

也可以直接在应用顶部的 `AI 设定` 面板中输入 API Key、Base URL 和模型后点击 `保存 API 设置`。

### 4. 准备手势模型文件
项目运行需要 `hand_landmarker.task`，请放在项目根目录：
`hand_landmarker.task`

若缺失可下载：
```bash
python -c "import urllib.request; urllib.request.urlretrieve('https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task','hand_landmarker.task'); print('saved')"
```

### 5. 启动应用
```bash
python main.py
```

## AI 配置说明
当前版本支持 UI 内直接配置 AI API：
- `DOUBAO_API_KEY`
- `DOUBAO_API_BASE_URL`
- `DOUBAO_MODEL`

点击 `保存 API 设置` 后，配置会写入项目根目录的 `.env` 文件。

## 当前已完成 vs 计划中

### 已完成
- 基础 GUI 主窗口与画布
- 手势追踪输入（摄像头 + 食指绘制）
- 食指红点预览层
- 墨迹扩散与持续留痕
- 背景图自动加载（`assets/background.png` 或 `assets` 内首张图片）
- AI 设定面板与 `.env` 持久化保存
- AI 结果展示面板

### 计划中
- AI 生成稳定性与错误提示优化
- 粒子互动与动态视觉效果优化
- 更完善的测试覆盖与 CI
- 异步生成与线程优化，避免 UI 阻塞

## 运行截图

> 当前项目中的背景画布示例（可替换为你的运行界面截图）

![运行截图](assets/background.png)

## 单元测试说明
运行测试：
```bash
python -m pytest -q
```

当前测试状态：
- 已提供 `tests/` 目录结构
- 当前仓库几乎无有效测试用例，执行后通常会显示 `no tests ran`
- 后续会补充手势输入与墨场核心逻辑测试

## 目录结构
```text
.
├─assets/
├─core/
├─tests/
├─ui/
├─main.py
└─requirements.txt
```

## License
本项目使用 MIT License，详见 [LICENSE](LICENSE)。
