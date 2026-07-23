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

## 技术架构

```
前端: Vite + Three.js + Canvas 2D + MediaPipe
后端: FastAPI + 豆包 Seedream API
```

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

## 快速启动

### 前端

```bash
cd frontend
npm install
npx vite --port 5175
```

### 后端

```bash
cd backend
cp .env.example .env   # 填写 DOUBAO_API_KEY
uvicorn app.main:app --port 8001
```

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

## 作者

**胡箬玺** — 中国传媒大学 25 级智能工程与创意设计

2026
