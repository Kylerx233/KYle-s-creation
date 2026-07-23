# 江山千里——绘梦成型

> AI × Interactive Art — 数字青绿山水交互装置

![封面](assets/background.png)

基于《千里江山图》美学，结合 AI 图像生成、Shader 流体模拟与手势识别的数字艺术交互作品。

---

## 体验流程

```
首页 → Scene 1 绘梦 → Scene 2 墨生山河 → Scene 3 画卷徐开 → Scene 4 山河苏醒
```

| 场景 | 说明 | 交互方式 |
|---|---|---|
| **Scene 1 · 绘梦** | 水墨画板，隔空绘制草图 | ☝️ 伸食指绘画 / 👌 OK 手势提交 |
| **Scene 2 · 墨生山河** | 雾散裱画，AI 生成山水 | 自动播放，展示科普文案 |
| **Scene 3 · 画卷徐开** | 画卷卷起再展开，AI 山水呈现 | 自动播放 |
| **Scene 4 · 山河苏醒** | 山水互动，手势拂水，诗意浮现 | 手指拂过水面 / 按 E 触发归卷 |

---

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| **前端框架** | Vite + Vanilla JS | 模块化场景管理 |
| **3D/Shader** | Three.js + GLSL | OrthographicCamera + ShaderMaterial |
| **2D 渲染** | Canvas 2D API | 水墨笔刷、画卷、雾气 |
| **手势识别** | MediaPipe HandLandmarker | 21 关键点实时追踪 |
| **后端** | FastAPI + httpx | REST API，图片处理 |
| **AI 生成** | 豆包 Seedream API (火山方舟) | 草图 → 青绿山水 |
| **字体** | Google Fonts | Ma Shan Zheng / LXGW WenKai / Noto Serif SC / Noto Sans SC |
| **音频** | Web Audio | 双轨 BGM 淡入淡出切换 |

### Scene 4 渲染管线

```
手势/鼠标 → uMouseVel
                ↓
Disturb Shader → Ping-Pong 双缓冲 → Screen Shader → 屏幕
  径向推开         颜料沉积累积       涟漪/呼吸/云雾
  方向拖拽                          青绿调色/暗角
```

### 手势系统

- **MediaPipe HandLandmarker** — 单手 21 关键点实时追踪
- **绘画** `isDrawing` — 食指伸直 + 其余三指蜷曲
- **提交** `isOK` — 拇指食指捏合 + 其余三指伸直
- **扰动** — 食指位置映射为 Shader 水波速度场

---

## 核心功能

- **手势隔空绘画** — MediaPipe 手部追踪，食指绘画/OK 提交，零接触交互
- **AI 山水生成** — 豆包 Seedream API，草图→青绿山水
- **实时 Shader 水波** — Ping-Pong 双缓冲 + 自定义 GLSL 扰动/涟漪/云雾
- **动态诗句系统** — 根据交互强度自动浮现东方诗意文字气泡
- **归卷动画** — CSS 卷轴合拢 + 题跋淡入，山河终归于静
- **双轨 BGM** — 空山私语 / 江南烟雨，随场景自动切换

## 本地运行

### 环境要求

- Node.js >= 18
- Python >= 3.11
- 摄像头（手势交互需要）

### 前端

```bash
cd frontend
npm install
npx vite --port 5175
```

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
cp .env.example .env        # 编辑填入 DOUBAO_API_KEY
uvicorn app.main:app --port 8001
```

> `.env` 已加入 `.gitignore`，API Key 不会提交到仓库。使用 `.env.example` 作为模板。

---

## 项目结构

```
JiangShanQianLi/
├── frontend/src/
│   ├── scene/           # 场景 Scene 1-4
│   │   ├── sceneDraw.js      第一幕 · 绘梦
│   │   ├── sceneGenerate.js  第二幕 · 墨生山河
│   │   ├── sceneUnfold.js    第三幕 · 画卷徐开
│   │   └── sceneAwaken.js    第四幕 · 山河苏醒
│   ├── systems/
│   │   ├── drawing/     # 水墨笔刷 + 画板
│   │   ├── fluid/       # 流体模拟
│   │   ├── gesture/     # MediaPipe 手势适配
│   │   └── audio/       # BGM 管理
│   ├── core/            # Ticker / EventBus / StateMachine
│   ├── services/        # API 客户端
│   └── ui/              # HUD 调试面板
├── backend/app/
│   ├── api/v1/          # REST API
│   ├── services/        # 豆包 Seedream 服务
│   └── models/          # 数据模型
└── assets/              # 背景图 / BGM / 字体
```

---

## 字体系统

| 层级 | 字体 | 用途 |
|---|---|---|
| 主标题 | **Ma Shan Zheng** | 首页、卷轴题跋、归卷字幕 |
| 诗句 | **LXGW WenKai** | 互动文字气泡 |
| 正文 | **Noto Serif SC** | 科普文案、展签 |
| UI | **Noto Sans SC** | 按钮、提示 |

---

## BGM

- **空山私语** — 首页 + Scene 1-3
- **江南烟雨** — Scene 4（淡入过渡）

---

## 致谢

- 《千里江山图》王希孟（北宋）
- 豆包 Seedream API
- MediaPipe HandLandmarker
- Three.js
- BGM: rainstreetcat

---

## 团队

| 成员 | 分工 |
|---|---|
| **胡箬玺** | 全栈开发、交互设计、Shader 编写、视觉设计 |

中国传媒大学 25 级智能工程与创意设计

2026

---

## 许可

MIT License
