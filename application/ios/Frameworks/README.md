# Frameworks 目录说明

此目录用于存放本地 Framework 文件，支持**模式 2：本地 Framework 模式**。

## 目录结构

```
Frameworks/
├── AtomicXCore.xcframework/    # 本地 Framework 文件（不提交到 Git）
├── RTCRoomEngine.xcframework/  # 本地 Framework 文件（不提交到 Git）
├── AtomicXCore.podspec         # Podspec 配置文件（提交到 Git）
├── RTCRoomEngine.podspec       # Podspec 配置文件（提交到 Git）
└── README.md                   # 本说明文件
```

## 使用方式

### 方式 1：CI 构建（自动）

CI 脚本会自动将 SDK Framework 文件复制到此目录：

```bash
# 示例（参考 ci-build-ipa.sh）
cp -R ${SDK_DIR}/AtomicXCore*.xcframework ${IOS_DIR}/Frameworks/
cp -R ${SDK_DIR}/RTCRoomEngine/RTCRoomEngine*.xcframework ${IOS_DIR}/Frameworks/
```

### 方式 2：本地开发（手动）

1. 将 Framework 文件复制到此目录：
   ```bash
   cp -R /path/to/AtomicXCore.xcframework ./Frameworks/
   cp -R /path/to/RTCRoomEngine.xcframework ./Frameworks/
   ```

2. （可选）更新 podspec 文件中的版本号，确保与实际 Framework 版本一致：
   ```ruby
   # 在 AtomicXCore.podspec 和 RTCRoomEngine.podspec 中
   s.version = '3.5.0.954'  # 替换为实际版本号
   ```

3. 运行 pod install：
   ```bash
   cd ../  # 回到 ios 目录
   pod install
   ```

## 工作原理

Podfile 会自动检测此目录：
- 如果同时存在 `.xcframework` 和 `.podspec` 文件
- 且未启用源码编译模式（`BUILD_ENGINE_SOURCE` 或 `BUILD_ATOMICX_CORE_SOURCE` 未设置）
- 则自动使用本地 Framework 模式

## 注意事项

1. **版本号管理**：podspec 文件中的版本号 `999.999.999` 是占位符，使用时会根据实际情况更新
2. **Git 管理**：
   - ✅ 提交 `.podspec` 文件和 `README.md`
   - ❌ 不提交 `.xcframework` 文件（添加到 `.gitignore`）
3. **依赖关系**：
   - `AtomicXCore` 依赖 `RTCRoomEngine/Professional`
   - `RTCRoomEngine` 依赖 `TXLiteAVSDK_Professional` 和 `TXIMSDK_Plus_iOS_XCFramework`

## 优先级说明

SDK 集成模式的优先级（从高到低）：
1. **源码编译模式**：`BUILD_ENGINE_SOURCE=true` + `ENGINE_SOURCE_PATH`
2. **本地 Framework 模式**：本目录存在完整文件（当前模式）
3. **CocoaPods 仓库模式**：从 CocoaPods 仓库下载（默认）

详见 `docs/ios/sdk_dependency_mode.md`

