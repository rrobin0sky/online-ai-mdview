# mdview ⚡

<div align="center">
  <img src="app-icon.svg" width="128" height="128" alt="mdview Icon" />
  <h3>极轻量、秒开的本地 Markdown 桌面阅读器与在线排版编辑神器</h3>
  <p>专注于单文件/单目录沉浸式阅读与双栏编辑 • 冷启动 &lt; 300ms • Shiki 语法高亮 • Mermaid 图表支持</p>

  <p>
    <a href="https://github.com/rrobin0sky/online-ai-mdview"><img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Web-blue?logo=apple" alt="macOS | Web"></a>
    <a href="https://tauri.app"><img src="https://img.shields.io/badge/Tauri-v2.2-24C8D8?logo=tauri&logoColor=white" alt="Tauri v2"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
    <a href="https://mdview.bin0sky.tech"><img src="https://img.shields.io/badge/Web-mdview.bin0sky.tech-purple" alt="Online Web"></a>
    <a href="https://rrobin0sky.github.io/online-ai-mdview/"><img src="https://img.shields.io/badge/Demo-GitHub%20Pages-brightgreen?logo=github" alt="GitHub Pages"></a>
  </p>
</div>

---

## ✨ 核心特性

- ⚡ **极致启动速度**：基于 Tauri v2 与操作系统原生 Webview，无 Electron 重量级运行时，启动秒开（< 300ms），内存开销极低（< 50MB）。
- 📖 **双击即读 / 命令行直达**：
  - `mdview <file.md>`：直接进入极简无干扰的单文件阅读模式。
  - `mdview <directory>`：展示左侧极简 Markdown 目录树，快速切换阅读。
- 🔄 **文件热重载 (Live Reload)**：基于 Rust 原生 `notify` 监听底层文件变动（带 100ms 防抖），在外部编辑器（Neovim、VS Code）或 AI 脚本保存时，前端无闪烁原地热更新，阅读进度不跳动。
- 🎨 **现代化语法高亮与一键复制代码**：
  - 内置 **Shiki** 代码高亮引擎（VS Code 同款精度）。
  - 每个代码块顶部均有语言标识与常驻/悬浮 **"一键复制 (Copy)"** 按钮，点击即带 "Copied!" 状态反馈。
- 📑 **浮动 TOC 目录大纲 (Scrollspy)**：
  - 自动解析 `h1 ~ h6` 标题，点击平滑滚动。
  - `IntersectionObserver` 实时滚动跟随高亮当前浏览章节。
- 🌓 **优雅双色主题**：默认智能跟随系统深色/浅色模式，顶部随时可一键切换。

---

## 🏗️ 架构与技术栈

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **桌面基座** | **Tauri v2** | 原生轻量窗口容器与进程间通信 (IPC) |
| **后端语言** | **Rust** | 负责 CLI 参数提取、文件/目录安全访问、`notify` 系统级事件监听 |
| **前端框架** | **React 19 + TypeScript + Vite** | 极速构建与扁平响应式状态 |
| **排版样式** | **Tailwind CSS v4** | 居中排版（最大宽 860px），GitHub / Notion 级舒适行高与表格 |
| **Markdown 引擎**| **markdown-it + Shiki** | 支持 GFM 表格、任务列表、锚点自动绑定 |

---

## 🚀 快速上手与本地调试

### 1. 环境准备
- **Rust & Cargo**: >= 1.77 (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Node.js**: >= 18 (`pnpm` 推荐)

### 2. 安装依赖
```bash
pnpm install
```

### 3. 本地启动开发环境

#### 方式 A：一键启动完整桌面客户端（推荐）
```bash
pnpm tauri dev
```

#### 方式 B：仅启动 Web 前端预览
```bash
pnpm dev
# 访问 http://localhost:1420 即可预览内置 Demo
```

---

## 💻 命令行调用测试 (CLI)

我们已在根目录下提供了便捷测试脚本 `bin/mdview`：

```bash
# 1. 打开单个 Markdown 文件（单文件模式）
./bin/mdview fixtures/single-demo.md

# 2. 打开指定目录（左侧展示文件树）
./bin/mdview fixtures/

# 3. 安装到系统全局 PATH（可选）
ln -s "$(pwd)/src-tauri/target/release/mdview" /usr/local/bin/mdview
# 之后即可在任何终端直接执行：
mdview my-document.md
```

---

## 🧪 单元测试

后端核心模块已包含完整的自动化单元测试（CLI 路径解析、目录树过滤构建、`notify` 监听热重载）：

```bash
cd src-tauri
cargo test
```

输出示例：
```text
running 4 tests
test cli::tests::test_resolve_directory ... ok
test cli::tests::test_resolve_file ... ok
test fs_service::tests::test_build_file_tree ... ok
test watcher::tests::test_notify_watcher ... ok

test result: ok. 4 passed; 0 failed; finished in 0.01s
```

---

## 📦 打包与分发 (macOS / Linux / Windows)

运行 Tauri 官方打包命令即可构建独立应用：

```bash
# 构建 Release 版本与安装包
pnpm tauri build
```

打包产物位置：
- **macOS (`.app` / `.dmg`)**：
  - 二进制：`src-tauri/target/release/mdview`
  - `.app` 应用程序包：`src-tauri/target/release/bundle/macos/mdview.app`
  - `.dmg` 安装镜像：`src-tauri/target/release/bundle/dmg/mdview_0.1.0_aarch64.dmg`
- **Linux (`.deb` / `.AppImage`)**：
  - `src-tauri/target/release/bundle/deb/`
  - `src-tauri/target/release/bundle/appimage/`

---

## 📂 项目目录说明

```text
online-ai-mdview/
├── bin/
│   └── mdview                   # CLI 启动快捷包装脚本
├── fixtures/                    # 示例测试 Markdown 文件与目录
│   ├── single-demo.md           # 包含丰富代码块、表格、任务列表的示例
│   └── docs/                    # 多级目录文档测试
├── src-tauri/                   # Rust 后端源码
│   ├── Cargo.toml
│   ├── tauri.conf.json          # Tauri v2 配置与窗口属性
│   └── src/
│       ├── main.rs              # 二进制入口
│       ├── lib.rs               # Tauri IPC 指令分发与状态管理
│       ├── cli.rs               # 毫秒级 CLI 启动参数解析
│       ├── fs_service.rs        # 文件读取与递归 Markdown 树提取
│       └── watcher.rs           # notify 文件监听与热重载广播
└── src/                         # 前端源码
    ├── components/
    │   ├── HeaderBar.tsx        # 顶栏（面包屑、Live 状态、字数统计）
    │   ├── FileSidebar.tsx      # 目录模式下的左侧极简文件树与搜索
    │   ├── MarkdownViewer.tsx   # 居中阅读器（代码块复制、无闪烁重渲）
    │   ├── TableOfContents.tsx  # 右侧 TOC 浮动大纲与 Scrollspy
    │   └── ThemeToggle.tsx      # 深色/浅色模式切换
    ├── lib/
    │   ├── markdown.ts          # markdown-it + Shiki 高亮与复制按钮封装
    │   ├── toc.ts               # 大纲提取与平滑锚点定位
    │   └── tauri-bridge.ts      # 跨平台 IPC 通信桥
    └── styles/
        ├── index.css            # 基础排版与暗色变量
        └── markdown.css         # GitHub 级排版细节定制
```

---

## 🌐 Web 端一键部署 (Cloudflare Pages)

本项目前端是纯客户端驱动的 React 19 SPA，已内置 `wrangler.json`，可直接部署在 Cloudflare Pages 上作为在线 Markdown 工具：

```bash
# 1. 构建 Web 静态产物
pnpm build

# 2. 部署到 Cloudflare Pages
npx wrangler pages deploy dist --project-name online-ai-mdview
```

推荐在 Cloudflare Dashboard 中连接 GitHub 仓库 `online-ai-mdview`，配置：
- **Build command**: `pnpm build`
- **Build output directory**: `dist`
- **自定义域名**: `mdview.bin0sky.tech`

---

## 📄 开源许可证 (License)

本项目采用 [MIT License](LICENSE) 开源协议。

