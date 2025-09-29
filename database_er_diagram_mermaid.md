# データベース設計図（Mermaid形式）

## draw.ioインポート用ER図（縦表示）

```mermaid
erDiagram
    %%{init: {"er": {"layoutDirection": "TOP_TO_BOTTOM"}}}%%
    MstUser {
        user_id PK "ユーザーID" int "AUTO_INCREMENT NOT NULL"
        username "ユーザー名" varchar "VARCHAR(20) NOT NULL UNIQUE"
        email "メールアドレス" varchar "VARCHAR(255) NOT NULL UNIQUE"
        is_admin "管理者権限" boolean "BOOLEAN NOT NULL DEFAULT FALSE"
        is_active "アカウント有効性" boolean "BOOLEAN NOT NULL DEFAULT TRUE"
    }
    
    TransUploadedImage {
        image_id PK "画像ID" int "AUTO_INCREMENT NOT NULL"
        user_id FK "ユーザーID" int "INT NOT NULL"
        filename "ファイル名" varchar "VARCHAR(255) NOT NULL"
        file_path "ファイルパス" varchar "VARCHAR(500) NOT NULL"
        upload_date "アップロード日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        status "ステータス" varchar "VARCHAR(20) NOT NULL DEFAULT 'preparing'"
    }
    
    TransImageAnalysis {
        analysis_id PK "解析ID" int "AUTO_INCREMENT NOT NULL"
        image_id FK "画像ID" int "INT NOT NULL"
        label "分類ラベル" varchar "VARCHAR(100) NOT NULL"
        confidence "信頼度" decimal "DECIMAL(5,2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 100.00)"
        model_name "モデル名" varchar "VARCHAR(50) NOT NULL"
        rank "順位" int "INT NOT NULL"
        analysis_started_at "解析開始時刻" datetime "DATETIME NULL"
        analysis_completed_at "解析完了時刻" datetime "DATETIME NULL"
        analysis_error "解析エラー" text "TEXT NULL"
    }
    
    MstUser ||--o{ TransUploadedImage : "1:N"
    TransUploadedImage ||--o{ TransImageAnalysis : "1:N"
```

## 関係の説明

### 関係の詳細
- **MstUser → TransUploadedImage**: 1対多（1つのユーザーが複数の画像をアップロード）
  - 削除動作：CASCADE（親削除時、子も削除）

- **TransUploadedImage → TransImageAnalysis**: 1対多（1つの画像が複数の解析結果を持つ）
  - 削除動作：CASCADE（親削除時、子も削除）


### 線の描き方による関係表現
- **右側に線が伸びるテーブル**: 親テーブル（参照元）
- **左側に線が伸びるテーブル**: 子テーブル（参照先）

## 横表示版（水平レイアウト）

```mermaid
erDiagram
    %%{init: {"er": {"layoutDirection": "LEFT_TO_RIGHT"}}}%%
    MstUser {
        user_id PK "ユーザーID" int "AUTO_INCREMENT NOT NULL"
        username "ユーザー名" varchar "VARCHAR(20) NOT NULL UNIQUE"
        email "メールアドレス" varchar "VARCHAR(255) NOT NULL UNIQUE"
        is_admin "管理者権限" boolean "BOOLEAN NOT NULL DEFAULT FALSE"
        is_active "アカウント有効性" boolean "BOOLEAN NOT NULL DEFAULT TRUE"
    }
    
    TransUploadedImage {
        image_id PK "画像ID" int "AUTO_INCREMENT NOT NULL"
        user_id FK "ユーザーID" int "INT NOT NULL"
        filename "ファイル名" varchar "VARCHAR(255) NOT NULL"
        file_path "ファイルパス" varchar "VARCHAR(500) NOT NULL"
        upload_date "アップロード日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        status "ステータス" varchar "VARCHAR(20) NOT NULL DEFAULT 'preparing'"
    }
    
    TransImageAnalysis {
        analysis_id PK "解析ID" int "AUTO_INCREMENT NOT NULL"
        image_id FK "画像ID" int "INT NOT NULL"
        label "分類ラベル" varchar "VARCHAR(100) NOT NULL"
        confidence "信頼度" decimal "DECIMAL(5,2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 100.00)"
        model_name "モデル名" varchar "VARCHAR(50) NOT NULL"
        rank "順位" int "INT NOT NULL"
        analysis_started_at "解析開始時刻" datetime "DATETIME NULL"
        analysis_completed_at "解析完了時刻" datetime "DATETIME NULL"
        analysis_error "解析エラー" text "TEXT NULL"
    }
    
    MstUser ||--o{ TransUploadedImage : "1:N"
    TransUploadedImage ||--o{ TransImageAnalysis : "1:N"
```

## データベース制約の詳細

### 主キー制約
- すべてのテーブルの主キーは `AUTO_INCREMENT` で自動採番
- 主キーは `NOT NULL` 制約あり

### NOT NULL制約
- **必須フィールド**: `user_id`, `username`, `email`, `is_admin`, `is_active`, `created_at`, `updated_at`
- **オプションフィールド**: `analysis_started_at`, `analysis_completed_at`, `analysis_error`, `previous_results`

### UNIQUE制約
- `MstUser.username`: ユーザー名の重複禁止
- `MstUser.email`: メールアドレスの重複禁止

### CHECK制約
- `confidence`: 0.00〜100.00の範囲内

### デフォルト値
- `is_admin`: FALSE
- `is_active`: TRUE
- `status`: 'preparing'
- `analysis_status`: 'not_started'
- `created_at`, `updated_at`: CURRENT_TIMESTAMP

### 外部キー制約
- `TransUploadedImage.user_id` → `MstUser.user_id` (CASCADE)
- `TransImageAnalysis.image_id` → `TransUploadedImage.image_id` (CASCADE)

## 解析エラー処理の詳細

### エラー状態の管理
- **TransUploadedImage.status**: 'preparing', 'analyzing', 'success', 'failed'
  - 'failed'状態でアップロードエラーを表現

### エラー情報の保存
- **TransImageAnalysis.analysis_error**: 解析エラー時の詳細ログを保存

### エラー処理フロー
1. アップロード開始時: `status = 'preparing'`
2. 解析開始時: `analysis_status = 'in_progress'`
3. 解析成功時: `analysis_status = 'completed'`
4. 解析失敗時: 
   - `analysis_status = 'failed'`でエラー状態を管理
   - `analysis_error`にエラー詳細を記録

## メンターのフィードバックへの対応

### 1. 解析ログは解析状態のみ記載
- **修正前**: 解析時刻、エラー詳細などが混在
- **修正後**: `analysis_status`のみで解析状態を管理
- **効果**: テーブルの役割が明確化

### 2. 各フィールドの適切な配置
- **解析時刻**: `TransImageAnalysis`に移動（解析結果の詳細データとして）
- **解析エラー**: `TransImageAnalysis`に移動（解析結果の詳細データとして）
- **アップロードエラー**: HTTPレスポンスで返す（アプリケーション側エラー）
- **インフラエラー**: Djangoの例外処理でキャッチ

## テーブル役割の明確化

### MstUser（ユーザーマスタ）
- ユーザー基本情報の管理
- 認証・認可の基盤

### TransUploadedImage（アップロード画像）
- 画像ファイルの基本情報管理
- アップロードプロセスの状態管理
- **アップロードエラーの記録**

### TransImageAnalysis（画像解析結果）
- 解析結果の詳細データ保存
- **解析時刻の記録**
- **解析エラーの記録**
- 複数結果の順位管理

### 解析状態の管理
- **TransUploadedImage.status**で解析状態を管理
- 前回解析結果は**TransImageAnalysis**から直接取得
- 解析プロセスの全体進行状況

## draw.ioでの使用方法

### 1. Mermaidからインポート
1. draw.ioにアクセス: https://app.diagrams.net/
2. 「Create New Diagram」を選択
3. 「Mermaid」を検索して選択
4. 上記のMermaidコードをコピー＆ペースト
5. 「Insert」をクリック
6. 自動的にER図が生成されます

### 2. 手動でER図を作成
1. draw.ioで「Entity Relationship」テンプレートを選択
2. 各テーブルを「Entity」図形で作成
3. フィールドを「Attribute」図形で追加
4. 関係を「Relationship」線で接続

### 3. 関係線の描き方
- **親テーブル**: 右側から線を伸ばす
- **子テーブル**: 左側から線を伸ばす
- **1対多**: 親側に「1」、子側に「多」の記号を配置
- **1対1**: 両側に「1」の記号を配置

## インデックス設計

### 推奨インデックス
- **MstUser**: `username`, `email` (UNIQUE制約により自動生成)
- **TransUploadedImage**: `user_id`, `status`, `upload_date`
- **TransImageAnalysis**: `image_id`, `model_name`, `analysis_started_at`

### 複合インデックス
- `TransUploadedImage(user_id, status)` - ユーザー別ステータス検索
- `TransImageAnalysis(image_id, rank)` - 画像別解析結果順位検索

## データ整合性制約

### CHECK制約
- `TransImageAnalysis.confidence`: 0.00-100.00の範囲
- `TransUploadedImage.status`: 'preparing', 'processing', 'completed', 'failed'のいずれか

### 外部キー制約
- 全てのFKにCASCADE DELETE設定
- 参照整合性の自動保証

## カスタマイズオプション

生成された図をdraw.ioで編集可能：
- 色の変更
- レイアウトの調整
- テキストの追加
- 関係線のスタイル変更
- 図形の移動・サイズ変更
- テーブル名やフィールド名の編集