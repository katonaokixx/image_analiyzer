# データベース設計図（Mermaid形式）

## draw.ioインポート用ER図（縦表示）

```mermaid
erDiagram
    %%{init: {"er": {"layoutDirection": "TOP_TO_BOTTOM"}}}%%
    CustomUser {
        user_id PK "ユーザーID" int "AUTO_INCREMENT NOT NULL"
        username "ユーザー名" varchar "VARCHAR(20) NOT NULL UNIQUE"
        email "メールアドレス" varchar "VARCHAR(255) NOT NULL UNIQUE"
        is_admin "管理者権限" boolean "BOOLEAN NOT NULL DEFAULT FALSE"
        is_active "アカウント有効性" boolean "BOOLEAN NOT NULL DEFAULT TRUE"
        created_at "作成日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        updated_at "更新日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    }
    
    UploadedImage {
        image_id PK "画像ID" int "AUTO_INCREMENT NOT NULL"
        user_id FK "ユーザーID" int "INT NOT NULL"
        filename "ファイル名" varchar "VARCHAR(255) NOT NULL"
        file_path "ファイルパス" varchar "VARCHAR(500) NOT NULL"
        upload_date "アップロード日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        status "ステータス" varchar "VARCHAR(20) NOT NULL DEFAULT 'preparing'"
        created_at "作成日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        updated_at "更新日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    }
    
    ImageAnalysis {
        analysis_id PK "解析ID" int "AUTO_INCREMENT NOT NULL"
        image_id FK "画像ID" int "INT NOT NULL"
        label "分類ラベル" varchar "VARCHAR(100) NOT NULL"
        confidence "信頼度" decimal "DECIMAL(5,2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 100.00)"
        model_name "モデル名" varchar "VARCHAR(50) NOT NULL"
        rank "順位" int "INT NOT NULL"
        created_at "作成日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        updated_at "更新日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    }
    
    AnalysisTimeline {
        timeline_id PK "タイムラインID" int "AUTO_INCREMENT NOT NULL"
        image_id FK "画像ID" int "INT NOT NULL"
        upload_completed_at "アップロード完了時刻" datetime "DATETIME NULL"
        analysis_started_at "解析開始時刻" datetime "DATETIME NULL"
        analysis_completed_at "解析完了時刻" datetime "DATETIME NULL"
        progress_percentage "進捗率" int "INT NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100)"
        model_used "使用モデル" varchar "VARCHAR(50) NULL"
        display_data "表示用データ" text "TEXT NULL"
        created_at "作成日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        updated_at "更新日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    }
    
    CustomUser ||--o{ UploadedImage : "1:N"
    UploadedImage ||--o{ ImageAnalysis : "1:N"
    UploadedImage ||--|| AnalysisTimeline : "1:1"
```

## 関係の説明

### 関係の詳細
- **CustomUser → UploadedImage**: 1対多（1つのユーザーが複数の画像をアップロード）
  - 削除動作：CASCADE（親削除時、子も削除）

- **UploadedImage → ImageAnalysis**: 1対多（1つの画像が複数の解析結果を持つ）
  - 削除動作：CASCADE（親削除時、子も削除）

- **UploadedImage → AnalysisTimeline**: 1対1（1つの画像が1つのタイムラインを持つ）
  - 削除動作：CASCADE（親削除時、子も削除）

### 線の描き方による関係表現
- **右側に線が伸びるテーブル**: 親テーブル（参照元）
- **左側に線が伸びるテーブル**: 子テーブル（参照先）

## 横表示版（水平レイアウト）

```mermaid
erDiagram
    %%{init: {"er": {"layoutDirection": "LEFT_TO_RIGHT"}}}%%
    CustomUser {
        user_id PK "ユーザーID" int "AUTO_INCREMENT NOT NULL"
        username "ユーザー名" varchar "VARCHAR(20) NOT NULL UNIQUE"
        email "メールアドレス" varchar "VARCHAR(255) NOT NULL UNIQUE"
        is_admin "管理者権限" boolean "BOOLEAN NOT NULL DEFAULT FALSE"
        is_active "アカウント有効性" boolean "BOOLEAN NOT NULL DEFAULT TRUE"
        created_at "作成日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        updated_at "更新日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    }
    
    UploadedImage {
        image_id PK "画像ID" int "AUTO_INCREMENT NOT NULL"
        user_id FK "ユーザーID" int "INT NOT NULL"
        filename "ファイル名" varchar "VARCHAR(255) NOT NULL"
        file_path "ファイルパス" varchar "VARCHAR(500) NOT NULL"
        upload_date "アップロード日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        status "ステータス" varchar "VARCHAR(20) NOT NULL DEFAULT 'preparing'"
        created_at "作成日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        updated_at "更新日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    }
    
    ImageAnalysis {
        analysis_id PK "解析ID" int "AUTO_INCREMENT NOT NULL"
        image_id FK "画像ID" int "INT NOT NULL"
        label "分類ラベル" varchar "VARCHAR(100) NOT NULL"
        confidence "信頼度" decimal "DECIMAL(5,2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 100.00)"
        model_name "モデル名" varchar "VARCHAR(50) NOT NULL"
        rank "順位" int "INT NOT NULL"
        created_at "作成日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        updated_at "更新日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    }
    
    AnalysisTimeline {
        timeline_id PK "タイムラインID" int "AUTO_INCREMENT NOT NULL"
        image_id FK "画像ID" int "INT NOT NULL"
        upload_completed_at "アップロード完了時刻" datetime "DATETIME NULL"
        analysis_started_at "解析開始時刻" datetime "DATETIME NULL"
        analysis_completed_at "解析完了時刻" datetime "DATETIME NULL"
        progress_percentage "進捗率" int "INT NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100)"
        model_used "使用モデル" varchar "VARCHAR(50) NULL"
        display_data "表示用データ" text "TEXT NULL"
        created_at "作成日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        updated_at "更新日時" datetime "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    }
    
    CustomUser ||--o{ UploadedImage : "1:N"
    UploadedImage ||--o{ ImageAnalysis : "1:N"
    UploadedImage ||--|| AnalysisTimeline : "1:1"
```

## データベース制約の詳細

### 主キー制約
- すべてのテーブルの主キーは `AUTO_INCREMENT` で自動採番
- 主キーは `NOT NULL` 制約あり

### NOT NULL制約
- **必須フィールド**: `user_id`, `username`, `email`, `is_admin`, `is_active`, `created_at`, `updated_at`
- **オプションフィールド**: `upload_completed_at`, `analysis_started_at`, `analysis_completed_at`, `model_used`, `display_data`

### UNIQUE制約
- `CustomUser.username`: ユーザー名の重複禁止
- `CustomUser.email`: メールアドレスの重複禁止

### CHECK制約
- `confidence`: 0.00〜100.00の範囲内
- `progress_percentage`: 0〜100の範囲内

### デフォルト値
- `is_admin`: FALSE
- `is_active`: TRUE
- `status`: 'preparing'
- `progress_percentage`: 0
- `created_at`, `updated_at`: CURRENT_TIMESTAMP

### 外部キー制約
- `UploadedImage.user_id` → `CustomUser.user_id` (CASCADE)
- `ImageAnalysis.image_id` → `UploadedImage.image_id` (CASCADE)
- `AnalysisTimeline.image_id` → `UploadedImage.image_id` (CASCADE)

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

## カスタマイズオプション

生成された図をdraw.ioで編集可能：
- 色の変更
- レイアウトの調整
- テキストの追加
- 関係線のスタイル変更
- 図形の移動・サイズ変更
- テーブル名やフィールド名の編集
