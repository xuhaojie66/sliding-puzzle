# Sliding Puzzle 🧩

一个支持自定义图片上传的滑块拼图游戏，基于 React + Vite + Tailwind CSS 构建。

**在线体验：** [https://dist-two-ashy-84.vercel.app](https://dist-two-ashy-84.vercel.app)

## 功能特性

- 支持上传任意图片，自动切割为拼图块
- 三种难度可选：3×3、4×4、5×5
- 支持鼠标点击和键盘方向键两种操作方式
- 实时计步和计时
- 可显示/隐藏编号辅助定位
- 游戏中提供参考原图预览
- 打乱算法保证每局都有解
- 滑块移动带平滑过渡动画

## 技术栈

- **React 19** — UI 框架
- **Vite** — 构建工具
- **Tailwind CSS 4** — 样式方案
- **Canvas API** — 图片切割

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
├── public/
│   └── cute-kitten.png       # 默认图片素材
├── src/
│   ├── App.jsx               # 游戏主组件
│   ├── main.jsx              # 入口文件
│   └── index.css             # Tailwind 入口
├── vite.config.js            # Vite + Tailwind 配置
└── package.json
```

## 部署

项目已关联 GitHub 仓库，推送代码到 `main` 分支会自动触发 Vercel 部署。

## License

MIT
