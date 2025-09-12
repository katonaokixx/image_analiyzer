# データベース設計図（Mermaid形式）

## draw.ioインポート用ER図（縦表示）

```mermaid
erDiagram
    %%{init: {"er": {"layoutDirection": "TOP_TO_BOTTOM"}}}%%
    MatUser {
        int user_id PK "ユーザーID"
        string username "ユーザー名"
        string email "メールアドレス"
        boolean is_staff "管理者権限"
        boolean is_active "アカウント有効性"
    }
    
    Tranimages {
        int image_id PK "画像ID"
        int user_id FK "ユーザーID"
        string filename "ファイル名"
        string file_path "ファイルパス"
        datetime upload_date "アップロード日時"
        string status "ステータス"
    }
    
    TranimageAnalysis {
        int analysis_id PK "解析ID"
        int image_id FK "画像ID"
        string label "分類ラベル"
        decimal confidence "信頼度(0.00-100.00)"
        string model_name "モデル名"
        int rank "順位"
        datetime created_at "作成日時"
    }
    
    TranimageTimeline {
        int timeline_id PK "タイムラインID"
        int image_id FK "画像ID"
        datetime upload_completed_at "アップロード完了時刻"
        datetime analysis_started_at "解析開始時刻"
        datetime analysis_completed_at "解析完了時刻"
        int analysis_progress_percentage "進捗率"
        string model_used "使用モデル"
        string display_data "表示用データ"
        datetime created_at "作成日時"
        datetime updated_at "更新日時"
    }
    
    MatUser ||--o{ Tranimages : "1:N 親子関係"
    Tranimages ||--o{ TranimageAnalysis : "1:N 親子関係"
    Tranimages ||--|| TranimageTimeline : "1:1 親子関係"
```

## 親子関係の説明

### 階層構造
```
MatUser (親)
  └── Tranimages (子)
      ├── TranimageAnalysis (孫)
      └── TranimageTimeline (子、1:1)
```

### 関係の詳細
- **MatUser → Tranimages**: 1対多 親子関係（1つのユーザーが複数の画像をアップロード）
  - 親：MatUser
  - 子：Tranimages
  - 削除動作：CASCADE（親削除時、子も削除）

- **Tranimages → TranimageAnalysis**: 1対多 親子関係（1つの画像が複数の解析結果を持つ）
  - 親：Tranimages
  - 子：TranimageAnalysis
  - 削除動作：CASCADE（親削除時、子も削除）

- **Tranimages → TranimageTimeline**: 1対1 親子関係（1つの画像が1つのタイムラインを持つ）
  - 親：Tranimages
  - 子：TranimageTimeline
  - 削除動作：CASCADE（親削除時、子も削除）

## 横表示版（水平レイアウト）

```mermaid
erDiagram
    %%{init: {"er": {"layoutDirection": "LEFT_TO_RIGHT"}}}%%
    MatUser {
        int user_id PK "ユーザーID"
        string username "ユーザー名"
        string email "メールアドレス"
        boolean is_staff "管理者権限"
        boolean is_active "アカウント有効性"
    }
    
    Tranimages {
        int image_id PK "画像ID"
        int user_id FK "ユーザーID"
        string filename "ファイル名"
        string file_path "ファイルパス"
        datetime upload_date "アップロード日時"
        string status "ステータス"
    }
    
    TranimageAnalysis {
        int analysis_id PK "解析ID"
        int image_id FK "画像ID"
        string label "分類ラベル"
        decimal confidence "信頼度(0.00-100.00)"
        string model_name "モデル名"
        int rank "順位"
        datetime created_at "作成日時"
    }
    
    TranimageTimeline {
        int timeline_id PK "タイムラインID"
        int image_id FK "画像ID"
        datetime upload_completed_at "アップロード完了時刻"
        datetime analysis_started_at "解析開始時刻"
        datetime analysis_completed_at "解析完了時刻"
        int analysis_progress_percentage "進捗率"
        string model_used "使用モデル"
        string display_data "表示用データ"
        datetime created_at "作成日時"
        datetime updated_at "更新日時"
    }
    
    MatUser ||--o{ Tranimages : "1:N 親子関係"
    Tranimages ||--o{ TranimageAnalysis : "1:N 親子関係"
    Tranimages ||--|| TranimageTimeline : "1:1 親子関係"
```

## draw.ioでの使用方法

1. draw.ioにアクセス: https://app.diagrams.net/
2. 「Create New Diagram」を選択
3. 「Mermaid」を検索して選択
4. 上記のMermaidコードをコピー＆ペースト
5. 「Insert」をクリック
6. 自動的にER図が生成されます

## カスタマイズオプション

生成された図をdraw.ioで編集可能：
- 色の変更
- レイアウトの調整
- テキストの追加
- 関係線のスタイル変更
- 図形の移動・サイズ変更
