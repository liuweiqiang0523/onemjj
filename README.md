# OneMJJ

一个 MJJ 的低维护自救中心：VPS 检测、网络工具、自托管入口、PT 媒体、AI API、常用脚本和 MJJ 生存手册。

## 本地开发

```bash
pnpm install
pnpm run dev
```

## 构建

```bash
pnpm run build
```

输出目录：`dist/`

## 内容维护

第一版内容在 `src/data.ts`：

- `tools`：首页工具卡片
- `scripts`：脚本速查
- `notes`：小报/Wiki 内容卡片

后续可以把真实服务入口、三网检测 API、状态页数据逐步接进去。
