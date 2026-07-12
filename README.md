# 《江山千里——绘梦成型》

《江山千里——绘梦成型》是一套面向数字交互艺术装置的项目：用户先在第一幕绘制草图，随后由 AI 生成青绿山水，再通过流体、粒子和手势交互让画面“活起来”。

当前仓库已经开始向 H5 / FastAPI 的双层架构迁移：前端负责场景、流体、粒子与交互，后端负责草图上传、AI 调用和资源编排。

## 当前结构

- `frontend/`：Vite + WebGL / Canvas2D 的 H5 交互层
- `backend/`：FastAPI + 豆包 API 的生成服务
- `core/`、`ui/`：现有桌面版实现，作为迁移参考基线
- `docs/`：架构、场景、性能与 API 说明
- `release/`：桌面版打包产物

## 快速开始

### 桌面版（当前稳定版）

```bash
python main.py
```

### H5 前端（开发中）

```bash
cd frontend
npm install
npm run dev
```

### 后端（开发中）

```bash
cd backend
python -m pip install -e .
uvicorn app.main:app --reload
```

## 核心文档

- [architecture.md](docs/architecture.md)
- [scenes.md](docs/scenes.md)
- [performance.md](docs/performance.md)
- [api.md](docs/api.md)
- [foundation.md](docs/foundation.md)
- [release.md](docs/release.md)

## 正式制作流程

### 一键验收

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
```

### CI 自动验收

- 工作流文件：`.github/workflows/ci.yml`
- Push 或 PR 会自动执行后端测试、根目录测试、前端构建

## 开发原则

- 艺术表达优先，技术为视觉服务
- 60 FPS 优先，禁止无谓的每帧对象创建
- 模块化、可测试、可扩展
- Python 保留 AI / 手势 / 资源管理，H5 负责实时视觉表现

## 许可

本项目使用 MIT 许可证，详见 [LICENSE](LICENSE)。
