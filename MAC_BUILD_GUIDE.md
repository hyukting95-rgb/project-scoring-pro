# Mac 版本构建指南 (Mac Build Guide)

由于 macOS 的安全机制和签名要求，**Mac 版安装包 (.dmg) 必须在 macOS 系统下生成**。无法直接在 Windows 环境下生成可用的 .dmg 文件。

请按照以下步骤在您的 Mac 电脑上进行构建。

## 准备工作 (Prerequisites)

1.  **准备一台 Mac 电脑**
2.  **安装 Node.js**
    *   访问 [nodejs.org](https://nodejs.org/) 下载并安装 LTS 版本。
    *   安装完成后，在终端输入 `node -v` 检查是否安装成功。
3.  **获取源代码**
    *   将本项目文件夹完整复制到您的 Mac 电脑上。

## 构建步骤 (Build Steps)

### 方法一：使用自动脚本 (推荐)

1.  打开终端 (Terminal)。
2.  输入 `cd ` (注意有个空格)，然后将项目文件夹拖入终端窗口，按回车进入目录。
3.  运行以下命令赋予脚本执行权限：
    ```bash
    chmod +x build_mac.sh
    ```
4.  运行构建脚本：
    ```bash
    ./build_mac.sh
    ```
5.  等待构建完成，文件夹会自动打开，您将看到 `.dmg` 安装包。

### 方法二：手动命令构建

如果您喜欢手动操作，也可以依次执行以下命令：

1.  打开终端并进入项目目录。
2.  安装依赖：
    ```bash
    npm install
    ```
3.  执行构建命令：
    ```bash
    npm run electron:build:mac
    ```
4.  构建完成后，安装包位于 `release-app-v3` 目录下。

## 常见问题 (FAQ)

*   **构建失败，提示签名错误？**
    *   我们在配置中设置了 `identity: null`，这意味着构建的是**未签名**的开发版。
    *   安装时如果提示“无法打开，因为来自不明开发者”，请在“系统设置 -> 隐私与安全性”中点击“仍要打开”。
*   **如何更换应用图标？**
    *   请准备一个 `icon.icns` 文件 (Mac 专用图标格式)。
    *   将其放入项目根目录下的 `build` 文件夹中 (如果没有 `build` 文件夹请新建一个)。
    *   重命名为 `icon.icns`。
    *   重新运行构建命令即可。

---
**Technical Note:**
The build configuration is set in `package.json` under the `mac` section. It is currently configured to output a `.dmg` file without code signing requirements (`identity: null`), making it easy to build and share locally.
