<div align="center">

# KomaKun! · 分镜君！· コマくん！

**The Open-Source Manga Translation IDE**

AI-powered OCR · Smart Cleaning · Pro Typesetting — all in your browser.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)

</div>

---

## 🇬🇧 English

### What is KomaKun!

KomaKun! is a browser-based manga/comic translation IDE. Import raw scans, run AI-powered OCR, clean text with neural inpainting, translate with LLMs, and typeset — all in one workspace. No install required for end users.

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) or npm / yarn

### Install & Run

```bash
# 1. Clone
git clone https://github.com/nicejoy/komakun.git
cd komakun

# 2. Install dependencies
pnpm install

# 3. Run development server
pnpm dev
```

Open **http://localhost:3000** and create a local profile to start.

### API Keys Setup

KomaKun! relies on external APIs for OCR, inpainting, and translation. You only need **2 API keys** to unlock all features if you choose Replicate as your LLM provider.

#### 1. Google Cloud Vision API Key (OCR) — Required

This key powers OCR (text detection on manga pages). Without it, text auto-detection will not work.

> ⚠️ This is a **Google Cloud** API key, different from the Google AI Studio key used for Gemini LLM models.

**How to create:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Library**.
4. Search for **Cloud Vision API** and click **Enable**.
5. Go to **APIs & Services → Credentials**.
6. Click **+ CREATE CREDENTIALS → API key**.
7. Copy the generated key.
8. *(Recommended)* Click **Edit API key** → under **API restrictions**, select **Restrict key** and choose only **Cloud Vision API**.

**Setup in KomaKun!:**
Settings → **Vision API** → Paste your key → **Validate & Save**.

> All keys are stored locally in your browser (IndexedDB). They are never sent to any server other than the respective API endpoints.

#### 2. Replicate API Key (Inpainting + LLM Translation) — Recommended

A single Replicate key powers **both** inpainting (smart text cleaning) **and** LLM translation. This is the recommended setup — only 2 API keys total for the full workflow.

**How to create:**

1. Go to [replicate.com](https://replicate.com/) and sign in.
2. Navigate to **Account Settings → API tokens**.
3. Create a new token and copy it.

**Setup in KomaKun!:**
1. Settings → **Inpainting** → Select **Replicate** → Paste your key → **Save Replicate Key**.
2. Settings → **Model Config** → Select **Replicate** as AI Provider → Choose a model → **Validate & Save**.
   The Replicate API key from step 1 is automatically shared — no need to enter it again.

**Available Replicate models:**

| Model | Description |
|-------|-------------|
| DeepSeek V3.1 | Strong multilingual translation |
| GPT-5.2 | OpenAI's latest via Replicate |
| GPT-4.1 | Balanced cost and quality |
| Gemini 2.5 Flash | Fast and cost-effective |
| Kimi K2.5 | Moonshot AI's flagship |

#### 3. Other LLM Providers (Optional)

If you prefer a different LLM provider for translation, KomaKun! also supports:

| Provider | Models | API Key Source |
|----------|--------|---------------|
| **Google (Gemini)** | Gemini 3 Flash, Gemini 2.5 Flash, Gemini 3.1 Pro | [Google AI Studio](https://aistudio.google.com/) |
| **OpenAI** | GPT-5.2, GPT-5 Mini, GPT-4.1, GPT-5.2 Pro | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **OpenRouter** | 100+ models (dynamically fetched) | [OpenRouter](https://openrouter.ai/keys) |
| **Local** | Any OpenAI-compatible endpoint (Ollama, etc.) | No key needed |

> ⚠️ The **Google (Gemini)** API key is obtained from [Google AI Studio](https://aistudio.google.com/), **not** from Google Cloud Console. It is a separate key from the Cloud Vision API key used for OCR.

Switch providers anytime in **Settings → Model Config**.

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
- **react-konva** for canvas rendering

### License

GNU Affero General Public License v3.0 — free to use, fork, and self-host. Any modified version served over a network must also be open-sourced under the same license.

---

## 🇨🇳 中文

### KomaKun! 是什么

KomaKun!（分镜君！）是一个基于浏览器的漫画翻译 IDE。导入生扫页面，用 AI 进行 OCR 文字识别，神经修复去字，LLM 翻译，专业嵌字——全部在一个工作区完成。终端用户无需安装任何软件。

### 环境要求

- **Node.js** ≥ 18
- **pnpm**（推荐）或 npm / yarn

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/nicejoy/komakun.git
cd komakun

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev
```

打开 **http://localhost:3000**，创建本地档案即可开始使用。

### API 密钥配置

KomaKun! 依赖外部 API 实现 OCR、图像修复和翻译。如果选择 Replicate 作为 LLM 供应商，你只需要 **2 个 API 密钥**即可解锁全部功能。

#### 1. Google Cloud Vision API 密钥（OCR）— 必需

用于 OCR（漫画页面文字检测）。没有它，自动文字识别将无法工作。

> ⚠️ 这是 **Google Cloud** API 密钥，与下方用于 Gemini LLM 模型的 Google AI Studio 密钥**不同**。

**如何创建：**

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 创建新项目（或选择已有项目）。
3. 进入 **APIs & Services → 库**。
4. 搜索 **Cloud Vision API**，点击**启用**。
5. 进入 **APIs & Services → 凭据**。
6. 点击 **+ 创建凭据 → API 密钥**。
7. 复制生成的密钥。
8. *（建议）* 点击**编辑 API 密钥** → **API 限制**中选择**限制密钥**，仅勾选 **Cloud Vision API**。

**在 KomaKun! 中配置：**
设置 → **Vision API** → 粘贴密钥 → **验证并保存**。

> 所有密钥仅存储在浏览器本地（IndexedDB），不会发送到对应 API 端点以外的任何服务器。

#### 2. Replicate API 密钥（图像修复 + LLM 翻译）— 推荐

一个 Replicate 密钥同时驱动**图像修复**（智能去字）**和** LLM 翻译。这是推荐的配置方式——全流程总共只需 2 个 API 密钥。

**如何创建：**

1. 前往 [replicate.com](https://replicate.com/) 并登录。
2. 进入 **Account Settings → API tokens**。
3. 创建新的 token 并复制。

**在 KomaKun! 中配置：**
1. 设置 → **图像修复** → 选择 **Replicate** → 粘贴密钥 → **保存 Replicate 密钥**。
2. 设置 → **模型设置** → 选择 **Replicate** 作为 AI 供应商 → 选择模型 → **验证并保存**。
   第 1 步的 Replicate API 密钥会自动共享，无需重复输入。

**可用的 Replicate 模型：**

| 模型 | 说明 |
|------|------|
| DeepSeek V3.1 | 强大的多语言翻译 |
| GPT-5.2 | 通过 Replicate 使用 OpenAI 最新模型 |
| GPT-4.1 | 性价比均衡 |
| Gemini 2.5 Flash | 快速且经济 |
| Kimi K2.5 | 月之暗面旗舰模型 |

#### 3. 其他 LLM 供应商（可选）

如果你偏好其他 LLM 供应商进行翻译，KomaKun! 还支持：

| 供应商 | 模型 | API 密钥来源 |
|--------|------|-------------|
| **Google (Gemini)** | Gemini 3 Flash, Gemini 2.5 Flash, Gemini 3.1 Pro | [Google AI Studio](https://aistudio.google.com/) |
| **OpenAI** | GPT-5.2, GPT-5 Mini, GPT-4.1, GPT-5.2 Pro | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **OpenRouter** | 100+ 模型（动态获取） | [OpenRouter](https://openrouter.ai/keys) |
| **本地** | 任何 OpenAI 兼容端点（Ollama 等） | 无需密钥 |

> ⚠️ **Google (Gemini)** 的 API 密钥从 [Google AI Studio](https://aistudio.google.com/) 获取，**不是**从 Google Cloud Console。它与 OCR 使用的 Cloud Vision API 密钥是两个不同的密钥。

随时在**设置 → 模型设置**中切换供应商。

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
- **react-konva** 画布渲染

### 许可证

GNU Affero 通用公共许可证 v3.0 —— 免费使用、Fork、自建部署。任何通过网络提供服务的修改版本必须同样以相同许可证开源。

---

## 🇯🇵 日本語

### KomaKun! とは

KomaKun!（コマくん！）は、ブラウザベースのマンガ翻訳 IDE です。生スキャンをインポートし、AI による OCR でテキストを検出、ニューラルインペインティングで消字、LLM で翻訳、そしてプロ品質の植字——すべてひとつのワークスペースで完結します。エンドユーザーのインストールは不要です。

### 必要な環境

- **Node.js** ≥ 18
- **pnpm**（推奨）または npm / yarn

### インストール & 起動

```bash
# 1. クローン
git clone https://github.com/nicejoy/komakun.git
cd komakun

# 2. 依存関係をインストール
pnpm install

# 3. 開発サーバーを起動
pnpm dev
```

**http://localhost:3000** を開き、ローカルプロフィールを作成すれば利用開始です。

### API キーの設定

KomaKun! は OCR、修復、翻訳に外部 API を使用します。LLM プロバイダーに Replicate を選べば、**API キーは 2 つだけ**で全機能が使えます。

#### 1. Google Cloud Vision API キー（OCR）— 必須

OCR（マンガページのテキスト検出）に使用します。これがないと自動検出は動作しません。

> ⚠️ これは **Google Cloud** の API キーであり、下記の Gemini LLM モデル用 Google AI Studio キーとは**別物**です。

**作成手順：**

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス。
2. 新しいプロジェクトを作成（または既存のものを選択）。
3. **APIs & Services → ライブラリ** に移動。
4. **Cloud Vision API** を検索し、**有効にする** をクリック。
5. **APIs & Services → 認証情報** に移動。
6. **+ 認証情報を作成 → API キー** をクリック。
7. 生成されたキーをコピー。
8. *（推奨）* **API キーを編集** → **API の制限** で **キーを制限** を選び、**Cloud Vision API** のみを選択。

**KomaKun! での設定：**
設定 → **Vision API** → キーを貼り付け → **検証して保存**。

> すべてのキーはブラウザのローカルストレージ（IndexedDB）にのみ保存されます。各 API エンドポイント以外のサーバーに送信されることはありません。

#### 2. Replicate API キー（修復 + LLM 翻訳）— 推奨

Replicate キー 1 つで**インペインティング**（スマート消字）**と** LLM 翻訳の**両方**が使えます。推奨のセットアップで、全ワークフローに必要なキーは合計 2 つだけです。

**作成手順：**

1. [replicate.com](https://replicate.com/) にアクセスしてサインイン。
2. **Account Settings → API tokens** に移動。
3. 新しいトークンを作成してコピー。

**KomaKun! での設定：**
1. 設定 → **修復** → **Replicate** を選択 → キーを貼り付け → **Replicate キーを保存**。
2. 設定 → **モデル設定** → AI プロバイダーとして **Replicate** を選択 → モデルを選択 → **検証して保存**。
   ステップ 1 の Replicate API キーが自動的に共有されるため、再入力は不要です。

**利用可能な Replicate モデル：**

| モデル | 説明 |
|--------|------|
| DeepSeek V3.1 | 優れた多言語翻訳 |
| GPT-5.2 | Replicate 経由で OpenAI 最新モデル |
| GPT-4.1 | コストと品質のバランス |
| Gemini 2.5 Flash | 高速・低コスト |
| Kimi K2.5 | Moonshot AI のフラッグシップ |

#### 3. その他の LLM プロバイダー（任意）

他の LLM プロバイダーを使いたい場合、以下にも対応しています：

| プロバイダー | モデル | API キーの取得先 |
|-------------|--------|-----------------|
| **Google (Gemini)** | Gemini 3 Flash, Gemini 2.5 Flash, Gemini 3.1 Pro | [Google AI Studio](https://aistudio.google.com/) |
| **OpenAI** | GPT-5.2, GPT-5 Mini, GPT-4.1, GPT-5.2 Pro | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **OpenRouter** | 100 以上のモデル（動的取得） | [OpenRouter](https://openrouter.ai/keys) |
| **ローカル** | OpenAI 互換エンドポイント（Ollama 等） | キー不要 |

> ⚠️ **Google (Gemini)** の API キーは [Google AI Studio](https://aistudio.google.com/) から取得します。Google Cloud Console からではありません。OCR 用の Cloud Vision API キーとは別のキーです。

**設定 → モデル設定** でいつでもプロバイダーを切り替えられます。

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
- **react-konva**（キャンバスレンダリング）

### ライセンス

GNU Affero General Public License v3.0 — 無料で利用、フォーク、セルフホスト可能。ネットワーク経由でサービスを提供する改変版も、同じライセンスでソースを公開する必要があります。
