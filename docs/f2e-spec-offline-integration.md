# 阿里前端规约离线接入说明

## 接入范围

本项目已按离线方式接入阿里前端规约配置：

- ESLint：`eslint-config-ali` base 配置。
- Stylelint：`stylelint-config-ali`。
- Prettier：`prettier-config-ali`。
- Markdownlint：`markdownlint-config-ali`。

未接入 Git hooks、commitlint、lint-staged，避免改变当前提交流程。

## 保留与忽略

为了避免格式化或 lint 第三方/生成产物，以下目录已被忽略：

- `dist`
- `node_modules`
- `src/vendor`
- `src_backup-*`
- `packages/mobile-spreadsheet-adapter.zip`

## 需要离线安装的包

当前本地 `node_modules` 缺少规约相关依赖，未运行 lint。请从内部 registry、离线缓存或预置包安装：

```text
eslint@^9.0.0
eslint-config-ali@^16.0.0
eslint-config-prettier@^10.0.1
eslint-plugin-prettier@^5.2.3
stylelint@^17.6.0
stylelint-config-ali@^3.0.0
prettier@^3.1.1
prettier-config-ali@^1.0.0
markdownlint-cli@^0.45.0
markdownlint-config-ali@^0.1.1
```

## 依赖可用后的校验命令

```bash
npm run lint
npm run lint:eslint
npm run lint:style
npm run lint:markdown
npm run format:check
```

修复命令：

```bash
npm run lint:fix
npm run format
```
