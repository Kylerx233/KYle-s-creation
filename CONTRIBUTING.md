# 贡献指南

欢迎为《江山千里——绘梦成型》贡献代码、文档、问题和想法。

## 如何开始

1. Fork 本仓库
2. 克隆到本地：
   ```bash
git clone https://github.com/Kylerx233/KYle-s-creation.git
cd KYle-s-creation
```
3. 创建新的功能分支：
   ```bash
git checkout -b feature/your-feature-name
```

## 编码规范

- Python 代码请遵循 PEP 8 风格。
- 变量、函数和类名请使用具有描述性的英文或拼音命名。
- 每个模块应保留适当注释，保证可读性。

## 贡献流程

1. 创建 Issue 或在已有 Issue 下留言
2. 提交功能分支
3. 发起 Pull Request，并描述你的修改内容与测试步骤

## 测试建议

- 如果你修改了渲染、手势或粒子逻辑，请先运行：
  ```bash
  python main.py
  ```

- 如果添加了可测功能，请补充 `tests/` 下的测试用例。

## 资源说明

- `assets/background.png`：代表场景底图
- `assets/bgm/`：本地 BGM 目录，程序自动加载 MP3 文件
- `hand_landmarker.task`：MediaPipe 手势模型

## 注意事项

- 不要将敏感信息（如 API Key）直接提交到仓库
- 音频文件请放在 `assets/bgm/`，并加入 `.gitignore`
- 如果没有 `hand_landmarker.task`，请先从官方渠道下载
