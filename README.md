# 諒のドラゴンクエスト2026

お子様の学習管理をRPG風にゲーミフィケーションした楽しい学習記録Webアプリケーションです。

## プロジェクト概要

- **名前**: 諒のドラゴンクエスト2026
- **目的**: 年間の学習進捗を楽しくRPG風に管理する
- **対象**: 小学生の学習記録とモチベーション向上

## 主な機能

### ✅ 実装済み機能

1. **年間カレンダー形式の学習記録**
   - 1月〜12月までの月別表示
   - 今日の日付から年末までを表示（過去分は非表示）
   
2. **8つの学習カテゴリー**
   - グノーブル国語（防御力アップ）
   - グノーブル算数（攻撃力アップ）
   - 基礎力完成テスト（力アップ）
   - 四谷大塚漢字（体力アップ）
   - その他国語（防御力アップ）
   - その他算数（攻撃力アップ）
   - その他（スーパークエスト）（全パラメーターアップ）
   - その他（自由記述）（ゴールド+10）

3. **RPG風パラメーター管理**
   - **防御力（国語）**: 初期値5、レベルシステム搭載
   - **攻撃力（算数）**: 初期値5、レベルシステム搭載
   - **力（基礎力）**: 初期値5、レベルシステム搭載
   - **体力（漢字）**: 初期値5、レベルシステム搭載
   - **ゴールド**: 自由記述でゲット
   - チェックするとランダムで1〜3上昇
   - 5ポイント上昇ごとにレベルアップ

4. **ボスモンスター出現システム**
   - 全パラメーターが10を超えるとボス出現
   - 10, 20, 30, 40, 50のしきい値で異なるボスが登場
   - **ボス一覧**:
     - 暗記魔人ザンキング（10以上）
     - 計算魔王カルクロス（20以上）
     - 読解竜ドクカイザー（30以上）
     - 応用魔神オーヨード（40以上）
     - 大魔王ジュケンデビル（50以上）

5. **メモ機能**
   - 各学習項目にメモを追加可能
   - 具体的な学習内容を記録

6. **ドラゴンクエスト風デザイン**
   - レトロゲーム風のUI
   - 青紫のグラデーション背景
   - ゴールドのボーダーとテキスト
   - パラメーターバーのビジュアル表示

## 技術スタック

- **フロントエンド**: HTML, CSS (TailwindCSS), JavaScript (Vanilla)
- **バックエンド**: Hono (TypeScript)
- **データベース**: Cloudflare D1 (SQLite)
- **デプロイ**: Cloudflare Pages
- **開発環境**: Vite + Wrangler

## API エンドポイント

### パラメーター取得
```
GET /api/parameters
```
レスポンス例:
```json
{
  "defense": 5,
  "attack": 5,
  "power": 5,
  "hp": 5,
  "gold": 0,
  "defenseLevel": 2,
  "attackLevel": 2,
  "powerLevel": 2,
  "hpLevel": 2,
  "currentBoss": null
}
```

### 学習記録追加
```
POST /api/records
```
リクエストボディ:
```json
{
  "year": 2026,
  "month": 1,
  "day": 20,
  "category": "グノーブル国語",
  "memo": "漢字テスト100点"
}
```

### 学習記録取得
```
GET /api/records?year=2026&month=1
```

### 学習記録削除
```
DELETE /api/records/:id
```

## データモデル

### learning_records テーブル
| カラム名 | 型 | 説明 |
|---------|-----|-----|
| id | INTEGER | 主キー |
| year | INTEGER | 年 |
| month | INTEGER | 月 |
| day | INTEGER | 日 |
| category | TEXT | 学習カテゴリー |
| memo | TEXT | メモ |
| created_at | DATETIME | 作成日時 |

### parameters テーブル
| カラム名 | 型 | 説明 |
|---------|-----|-----|
| id | INTEGER | 主キー |
| defense | INTEGER | 防御力（国語） |
| attack | INTEGER | 攻撃力（算数） |
| power | INTEGER | 力（基礎力） |
| hp | INTEGER | 体力（漢字） |
| gold | INTEGER | ゴールド |
| updated_at | DATETIME | 更新日時 |

## ローカル開発

### 初回セットアップ
```bash
# 依存関係インストール
npm install

# ローカルデータベースマイグレーション
npm run db:migrate:local

# ビルド
npm run build

# 開発サーバー起動
pm2 start ecosystem.config.cjs
```

### 開発コマンド
```bash
# ビルド
npm run build

# ローカル開発サーバー（PM2）
npm run dev:d1

# データベースリセット
npm run db:reset

# ポートクリーンアップ
npm run clean-port
```

## デプロイ

### Cloudflare Pages デプロイ手順

1. **Cloudflare D1データベース作成**
```bash
npx wrangler d1 create webapp-production
# 出力されたdatabase_idをwrangler.jsonc に設定
```

2. **本番データベースマイグレーション**
```bash
npm run db:migrate:prod
```

3. **Cloudflare Pagesプロジェクト作成**
```bash
npx wrangler pages project create webapp --production-branch main
```

4. **デプロイ実行**
```bash
npm run deploy:prod
```

## 使い方

1. **アクセス**: ブラウザでアプリを開く
2. **学習記録**: 各月の学習項目にチェックを入れる
3. **メモ追加**: 必要に応じてメモを入力
4. **パラメーター確認**: 上部のパラメーターバーで成長を確認
5. **ボス挑戦**: 全パラメーターを上げてボスを出現させる
6. **モチベーション維持**: レベルアップとボス出現で学習意欲向上

## プロジェクト構成

```
webapp/
├── src/
│   └── index.tsx           # メインアプリケーション
├── migrations/
│   └── 0001_initial_schema.sql  # データベーススキーマ
├── public/
│   └── static/
│       └── style.css       # カスタムCSS
├── ecosystem.config.cjs    # PM2設定
├── wrangler.jsonc          # Cloudflare設定
├── package.json            # 依存関係とスクリプト
└── README.md               # このファイル
```

## デプロイステータス

- **プラットフォーム**: Cloudflare Pages
- **ステータス**: ✅ ローカル開発完了、本番デプロイ準備中
- **開発サーバーURL**: https://3000-i0h62zpec9ggr6e4gb5eb-5634da27.sandbox.novita.ai
- **本番URL**: （デプロイ後に追加）

## 今後の推奨機能

### 未実装の機能候補

1. **データエクスポート機能**
   - 学習記録をCSVでダウンロード
   - 月次/年次レポート生成

2. **リマインダー機能**
   - 毎日の学習チェックリマインド

3. **実績システム**
   - 連続記録日数バッジ
   - 特別なトロフィー獲得

4. **保護者向けダッシュボード**
   - 学習進捗の可視化グラフ
   - 月次サマリー

5. **モバイル最適化**
   - プログレッシブWebアプリ（PWA）化
   - スマホ専用UI

## ライセンス

このプロジェクトは個人利用を目的としています。

---

**製作日**: 2026年1月20日  
**バージョン**: 1.0.0  
**製作者**: GenSpark AI Assistant
