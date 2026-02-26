<div align="center">

# KomaKun! · 分镜君！· コマくん！

**The Open-Source Manga Translation IDE**

AI-powered OCR · Smart Cleaning · Pro Typesetting — all in your browser.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)

</div>

---

<details open>
<summary><b>🇬🇧 English</b></summary>

### What is KomaKun!

KomaKun! is a browser-based manga/comic translation IDE. Import raw scans, run AI-powered OCR, clean text with neural inpainting, translate with LLMs, and typeset — all in one workspace. No install required for end users.

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) or npm / yarn
- A **Google Cloud API Key** (required for OCR — see below)

### Install & Run

```bash
# 1. Clone
git clone https://github.com/drawhisper-org/komakun.git
cd komakun

# 2. Install dependencies
pnpm install

# 3. Run development server
pnpm dev
```

Open **http://localhost:3000** and create a local profile to start.

### Google Cloud API Key (Required)

A Google Cloud API key is **required** for OCR (text detection on manga pages). Without it, auto-detection will not work.

#### How to create one

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Library**.
4. Search for **Cloud Vision API** and click **Enable**.
5. Go to **APIs & Services → Credentials**.
6. Click **+ CREATE CREDENTIALS → API key**.
7. Copy the generated key.
8. *(Recommended)* Click **Edit API key** → under **API restrictions**, select **Restrict key** and choose only **Cloud Vision API**.

#### Setup in KomaKun!

1. Open KomaKun! in your browser.
2. Click your avatar (top-right) → **Settings**.
3. Go to the **Model Config** tab.
4. Select **Google** as the AI Provider.
5. Paste your API key and click **Validate & Save**.

> The key is stored locally in your browser (IndexedDB). It is never sent to any server other than Google's API endpoints.

### Translation Models (Bring Your Own Key)

OCR is powered by Google Cloud Vision, but **translation** supports multiple LLM providers:

| Provider | Models | How to get a key |
|----------|--------|-----------------|
| **Google** (Gemini) | Gemini 2.0 Flash, Gemini 2.5 Pro | [Google AI Studio](https://aistudio.google.com/apikey) |
| **OpenAI** | GPT-4o, GPT-4o mini | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude Sonnet, Claude Haiku | [Anthropic Console](https://console.anthropic.com/) |

Switch providers anytime in **Settings → Model Config**. Each provider key is stored separately.

### Pay-As-You-Go Mode

Don't have your own API keys? KomaKun! also offers a **Pay-As-You-Go** mode:

- Purchase credits directly within the app via **Stripe** or credit/debit card.
- Credits are consumed per OCR call and per translation request.
- No subscription — pay only for what you use.

> Pay-As-You-Go removes the need to manage API keys yourself. Great for casual users and small teams.

### Build for Production

```bash
pnpm build   # outputs to .next/
pnpm start   # serves the production build
```

### Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS v4** + shadcn/ui
- **Framer Motion** for animations
- **Zustand** for state management
- **next-intl** for i18n (en, zh, zh-TW, ja)
- **IndexedDB** for local data persistence

### License

GNU Affero General Public License v3.0 — free to use, fork, and self-host. Any modified version served over a network must also be open-sourced under the same license.

</details>

<details>
<summary><b>🇨🇳 中文</b></summary>

### KomaKun! 是什么

KomaKun!（分镜君！）是一个基于浏览器的漫画翻译 IDE。导入生扫页面，用 AI 进行 OCR 文字识别，神经修复去字，LLM 翻译，专业嵌字——全部在一个工作区完成。终端用户无需安装任何软件。

### 环境要求

- **Node.js** ≥ 18
- **pnpm**（推荐）或 npm / yarn
- 一个 **Google Cloud API Key**（OCR 必需，详见下文）

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/drawhisper-org/komakun.git
cd komakun

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev
```

打开 **http://localhost:3000**，创建本地档案即可开始使用。

### Google Cloud API Key（必需）

Google Cloud API Key 是 OCR（漫画页面文字检测）的**必需项**。没有它，自动文字识别将无法工作。

#### 如何创建

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 创建新项目（或选择已有项目）。
3. 进入 **APIs & Services → 库**。
4. 搜索 **Cloud Vision API**，点击**启用**。
5. 进入 **APIs & Services → 凭据**。
6. 点击 **+ 创建凭据 → API 密钥**。
7. 复制生成的密钥。
8. *（建议）* 点击**编辑 API 密钥** → **API 限制**中选择**限制密钥**，仅勾选 **Cloud Vision API**。

#### 在 KomaKun! 中配置

1. 在浏览器中打开 KomaKun!。
2. 点击右上角头像 → **设置**。
3. 进入**模型设置**标签页。
4. 选择 **Google** 作为 AI 服务。
5. 粘贴你的 API 密钥，点击**验证并保存**。

> 密钥仅存储在浏览器本地（IndexedDB），不会发送到 Google API 以外的任何服务器。

### 翻译模型（自带密钥）

OCR 由 Google Cloud Vision 驱动，但**翻译**支持多个 LLM 供应商：

| 供应商 | 模型 | 获取密钥 |
|--------|------|---------|
| **Google** (Gemini) | Gemini 2.0 Flash, Gemini 2.5 Pro | [Google AI Studio](https://aistudio.google.com/apikey) |
| **OpenAI** | GPT-4o, GPT-4o mini | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude Sonnet, Claude Haiku | [Anthropic Console](https://console.anthropic.com/) |

随时在**设置 → 模型设置**中切换供应商，每个供应商的密钥独立存储。

### 按量付费模式

没有自己的 API 密钥？KomaKun! 还提供**按量付费**模式：

- 在应用内通过 **Stripe** 或信用卡/借记卡直接购买额度。
- 额度按 OCR 调用次数和翻译请求次数消耗。
- 无需订阅——用多少付多少。

> 按量付费模式让你无需自行管理 API 密钥，非常适合轻度用户和小团队。

### 构建生产版本

```bash
pnpm build   # 输出到 .next/
pnpm start   # 启动生产服务
```

### 技术栈

- **Next.js 16**（App Router, Turbopack）
- **Tailwind CSS v4** + shadcn/ui
- **Framer Motion** 动画
- **Zustand** 状态管理
- **next-intl** 国际化（en, zh, zh-TW, ja）
- **IndexedDB** 本地数据持久化

### 许可证

GNU Affero 通用公共许可证 v3.0 —— 免费使用、Fork、自建部署。任何通过网络提供服务的修改版本必须同样以相同许可证开源。

</details>

<details>
<summary><b>🇯🇵 日本語</b></summary>

### KomaKun! とは

KomaKun!（コマくん！）は、ブラウザベースのマンガ翻訳 IDE です。生スキャンをインポートし、AI による OCR でテキストを検出、ニューラルインペインティングで消字、LLM で翻訳、そしてプロ品質の植字——すべてひとつのワークスペースで完結します。エンドユーザーのインストールは不要です。

### 必要な環境

- **Node.js** ≥ 18
- **pnpm**（推奨）または npm / yarn
- **Google Cloud API キー**（OCR に必須。詳細は下記）

### インストール & 起動

```bash
# 1. クローン
git clone https://github.com/drawhisper-org/komakun.git
cd komakun

# 2. 依存関係をインストール
pnpm install

# 3. 開発サーバーを起動
pnpm dev
```

**http://localhost:3000** を開き、ローカルプロフィールを作成すれば利用開始です。

### Google Cloud API キー（必須）

Google Cloud API キーは OCR（マンガページのテキスト検出）に**必須**です。これがないと自動検出は動作しません。

#### 作成手順

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス。
2. 新しいプロジェクトを作成（または既存のものを選択）。
3. **APIs & Services → ライブラリ** に移動。
4. **Cloud Vision API** を検索し、**有効にする** をクリック。
5. **APIs & Services → 認証情報** に移動。
6. **+ 認証情報を作成 → API キー** をクリック。
7. 生成されたキーをコピー。
8. *（推奨）* **API キーを編集** → **API の制限** で **キーを制限** を選び、**Cloud Vision API** のみを選択。

#### KomaKun! での設定

1. ブラウザで KomaKun! を開く。
2. 右上のアバターをクリック → **設定**。
3. **モデル設定** タブを開く。
4. AI プロバイダーとして **Google** を選択。
5. API キーを貼り付け、**検証して保存** をクリック。

> キーはブラウザのローカルストレージ（IndexedDB）にのみ保存されます。Google の API エンドポイント以外のサーバーに送信されることはありません。

### 翻訳モデル（Bring Your Own Key）

OCR は Google Cloud Vision で動作しますが、**翻訳**は複数の LLM プロバイダーに対応しています：

| プロバイダー | モデル | キーの取得先 |
|-------------|--------|------------|
| **Google** (Gemini) | Gemini 2.0 Flash, Gemini 2.5 Pro | [Google AI Studio](https://aistudio.google.com/apikey) |
| **OpenAI** | GPT-4o, GPT-4o mini | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude Sonnet, Claude Haiku | [Anthropic Console](https://console.anthropic.com/) |

**設定 → モデル設定** でいつでもプロバイダーを切り替え可能。各プロバイダーのキーは個別に保存されます。

### 従量課金モード

API キーをお持ちでない方のために、KomaKun! は**従量課金**モードも提供しています：

- アプリ内で **Stripe** またはクレジットカード/デビットカードでクレジットを購入。
- クレジットは OCR の呼び出しと翻訳リクエストごとに消費されます。
- サブスクリプション不要——使った分だけお支払い。

> 従量課金モードなら API キーの管理が不要です。ライトユーザーや小規模チームに最適。

### 本番ビルド

```bash
pnpm build   # .next/ に出力
pnpm start   # 本番ビルドを起動
```

### 技術スタック

- **Next.js 16**（App Router, Turbopack）
- **Tailwind CSS v4** + shadcn/ui
- **Framer Motion**（アニメーション）
- **Zustand**（状態管理）
- **next-intl**（i18n: en, zh, zh-TW, ja）
- **IndexedDB**（ローカルデータ永続化）

### ライセンス

GNU Affero General Public License v3.0 — 無料で利用、フォーク、セルフホスト可能。ネットワーク経由でサービスを提供する改変版も、同じライセンスでソースを公開する必要があります。

</details>
