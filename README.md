# 服外 Building Energy AI 前端

这是服外建筑能耗管理与 AI 运维平台的前端工程，基于 Vue 3、Vite、TypeScript 和 Nginx 部署。

当前前端包含：

- 建筑查询引擎：筛选、排序、高级筛选、自然语言查询助手、导出报表任务。
- 统计分析：能耗趋势、建筑/设备绩效表、报表工作台、AI 运维建议。
- 故障分析：异常列表、异常详情、AI 诊断与反馈。
- 知识库：数据集范围切换、文档检索、文件展示。
- 全局运维智慧 AI 助手：支持历史会话、上下文问答、工具调用状态流。

## 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm
- Docker，可选，用于容器化部署
- 后端服务默认监听 `http://127.0.0.1:8000`

## 本地开发

安装依赖：

```sh
npm install
```

启动开发服务：

```sh
npm run dev
```

开发环境下，Vite 会把 `/api` 代理到 `http://127.0.0.1:8000`，并去掉 `/api` 前缀。配置位于 `vite.config.ts`。

## 构建与检查

类型检查：

```sh
npm run type-check
```

生产构建：

```sh
npm run build
```

本地预览构建产物：

```sh
npm run preview
```

## Docker 部署

构建镜像：

```sh
docker build -t fuwai-frontend:latest .
```

运行容器：

```sh
docker run --rm -p 8080:80 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  fuwai-frontend:latest
```

访问：

```txt
http://localhost:8080
```

如果前后端在同一个 Docker 网络中运行，建议使用后端容器名作为 `BACKEND_URL`：

```sh
docker run --rm -p 8080:80 \
  --network fuwai-net \
  -e BACKEND_URL=http://fw-backend:8000 \
  fuwai-frontend:latest
```

## Nginx 运行时配置

镜像内置 `nginx.conf.template`，容器启动时由官方 Nginx entrypoint 自动注入环境变量。

可配置变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BACKEND_URL` | `http://host.docker.internal:8000` | 后端服务地址，不带尾部斜杠也可 |

代理规则：

- 前端请求 `/api/buildings` 会被转发到 `${BACKEND_URL}/buildings`
- 前端请求 `/api/ai/status` 会被转发到 `${BACKEND_URL}/ai/status`
- `/api/ai/status` 关闭了 Nginx buffering，用于支持 SSE 实时状态流
- 前端路由使用 `try_files $uri $uri/ /index.html`以避免刷新页面404

健康检查：

```sh
curl http://localhost:8080/healthz
```

## 写在最后

1个月以来，我们完成了不计其数的概念验证、经历了不知多少次的推翻重做、攻克了不计其数的概念难关，最终完成了如此成就。虽说不上精良，但也初具规模，一路上感谢有你们。
———— Fridayssheep