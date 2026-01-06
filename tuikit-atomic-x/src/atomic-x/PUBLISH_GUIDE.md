# NPM 包发布指南

## 发布前准备

### 1. 更新版本号

在 `package.json` 中更新版本号：

```json
{
  "version": "1.0.0"  // 遵循语义化版本规范
}
```

### 2. 检查文件结构

确保以下文件存在：
- `package.json` - 包配置
- `README.md` - 使用文档
- `.npmignore` - 排除文件配置
- `index.ts` - 主入口文件
- 所有源代码文件

### 3. 运行类型检查

```bash
cd src/atomic-x
npm run type-check
```

### 4. 运行 Lint 检查

```bash
npm run lint
```

## 发布步骤

### 方式一：从 state 目录直接发布

```bash
# 1. 进入 state 目录
cd src/atomic-x

# 2. 登录 npm（如果还没有登录）
npm login

# 3. 发布包
npm publish

# 或者发布到私有 registry
npm publish --registry=https://your-registry.com
```

### 方式二：使用 npm link 本地测试

```bash
# 1. 在 state 目录创建链接
cd src/atomic-x
npm link

# 2. 在项目根目录使用链接
cd ../../..
npm link @trtc/uikit-live-state

# 3. 测试完成后取消链接
npm unlink @trtc/uikit-live-state
cd src/atomic-x
npm unlink
```

### 方式三：使用相对路径（开发阶段）

在项目根目录的 `package.json` 中添加：

```json
{
  "dependencies": {
    "@trtc/uikit-live-state": "file:./src/atomic-x"
  }
}
```

然后运行：

```bash
npm install
```

## 版本管理

### 语义化版本规范

- **主版本号（Major）**: 不兼容的 API 修改
- **次版本号（Minor）**: 向下兼容的功能性新增
- **修订号（Patch）**: 向下兼容的问题修正

### 发布不同版本

```bash
# 发布补丁版本（1.0.0 -> 1.0.1）
npm version patch
npm publish

# 发布次版本（1.0.0 -> 1.1.0）
npm version minor
npm publish

# 发布主版本（1.0.0 -> 2.0.0）
npm version major
npm publish
```

## 发布到私有 Registry

### 配置 .npmrc

在 `src/atomic-x` 目录创建 `.npmrc` 文件：

```
registry=https://your-registry.com
@trtc:registry=https://your-registry.com
```

### 发布

```bash
cd src/atomic-x
npm publish
```

## 验证发布

### 1. 检查包信息

```bash
npm view @trtc/uikit-live-state
```

### 2. 安装测试

```bash
npm install @trtc/uikit-live-state
```

### 3. 导入测试

```typescript
import { login, getLiveList } from '@trtc/uikit-live-state';
```

## 注意事项

1. **确保 HybridBridge 依赖**: 使用该包的项目必须配置好 HybridBridge native module
2. **TypeScript 支持**: 包使用 TypeScript 编写，确保使用项目的 TypeScript 配置可以正确解析
3. **React Native 版本**: 确保 peerDependencies 中的 React Native 版本兼容
4. **私有包**: 如果发布到私有 registry，确保有相应的访问权限

## 回滚版本

如果需要撤销已发布的版本：

```bash
# 注意：只能在 72 小时内撤销
npm unpublish @trtc/uikit-live-state@1.0.0
```

## 更新文档

发布新版本后，记得：
1. 更新 `README.md` 中的示例
2. 更新 `CHANGELOG.md`（如果存在）
3. 通知团队成员版本更新

