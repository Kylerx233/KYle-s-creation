# 《江山千里——绘梦成型》

基于 Python + PyQt6 + MediaPipe 的中国水墨互动绘画项目。

项目将摄像头手势、实时水墨笔触、AI 山水生成与粒子交互融合，提供一个可视化的创作与演示体验。

## 主要功能

- 实时手势绘画输入：使用 MediaPipe HandLandmarker 识别食指位置
- 真实墨迹效果：基于扩散与持久化的墨场渲染
- 第一幕背景纹理：`assets/background.png` 作为 1920x1080 全屏底图
- 第二幕粒子互动：AI 生成图像后粒子流场与手势/鼠标交互
- BGM 支持：自动加载 `assets/bgm/` 中的 MP3 文件
- AI 图生图入口：保存画布草图后，通过 AI 生成山水景致

## 技术栈

- Python 3.11+
- PyQt6
- OpenCV
- MediaPipe Tasks
- Pillow
- NumPy
- Requests
- python-dotenv

## 安装与运行

### 1. 克隆仓库

```bash
git clone https://github.com/Kylerx233/KYle-s-creation.git
cd KYle-s-creation
```

### 2. 安装依赖

```bash
python -m pip install -r requirements.txt
```

### 3. 准备手势模型

项目需要放置 `hand_landmarker.task` 到项目根目录。

如果文件缺失，可使用：

```bash
python -c "import urllib.request; urllib.request.urlretrieve('https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task', 'hand_landmarker.task')"
```

### 4. 可选：配置 AI 生成

复制示例环境文件：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

然后编辑 `.env`：

```text
DOUBAO_API_KEY=
DOUBAO_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/images/generations
DOUBAO_MODEL=doubao-seedream-5-0-260128
```

也可以启动应用后，在 `AI 设定` 面板中输入参数并保存。

### 5. 添加背景与音乐资源

- 背景图：`assets/background.png`
- BGM 文件：放入 `assets/bgm/` 目录，程序会自动加载第 1 个文件作为第一幕 BGM，第 2 个文件作为第二幕 BGM。

> 注意：本仓库已将 `assets/bgm/*.mp3` 添加到 `.gitignore`，请不要直接提交音频文件。

### 6. 启动应用

```bash
python main.py
```

## 开发流程

### 主要目录

```text
.
├── assets/              # 背景与运行资源
├── core/                # 核心逻辑与渲染模块
├── ui/                  # PyQt6 可视化组件
├── tests/               # 测试用例目录
├── main.py              # 应用入口
├── requirements.txt     # Python 依赖
├── README.md            # 项目说明
└── CONTRIBUTING.md      # 贡献指南
```

### 开发说明

- `ui/main_window.py`：主界面与场景切换
- `ui/canvas.py`：第一幕水墨绘制画布
- `ui/particle_canvas.py`：第二幕粒子交互画布
- `core/ink_brush.py`：墨迹印章与注入逻辑
- `core/ink_field.py`：墨场扩散与持久化
- `core/paper.py`：背景纹理与 `assets/background.png` 加载

### 本地开发步骤

1. 新建功能分支：

```bash
git checkout -b feature/your-feature-name
```

2. 实现功能并运行本地测试

3. 提交改动：

```bash
git add .
git commit -m "feat: add ..."
```

4. 推送分支并创建 Pull Request

```bash
git push origin feature/your-feature-name
```

## 贡献与反馈

欢迎提交 Issues、PR 或建议：

- 添加新手势玩法
- 优化粒子/墨迹渲染
- 提升 AI 生成流程
- 补齐测试与 CI

## 版权与许可

本项目使用 MIT 许可证，详见 [LICENSE](LICENSE)。
