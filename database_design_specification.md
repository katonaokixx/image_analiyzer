  # 画像解析アプリケーション データベース設計書

## 概要
本アプリケーションは画像解析システムで、ユーザーが画像をアップロードし、機械学習モデルを使用して画像の分類を行うシステムです。


  ## テーブル設計

  ### 1. User（ユーザー管理）
  **テーブル名**: `auth_user`
  **役割**: システムのユーザー（一般ユーザー・管理者）を管理

  | フィールド名 | データ型 | 制約 | 説明 |
  |-------------|----------|------|------|
  | id | Integer | PK | ユーザーID |
  | username | Char(20) | UNIQUE, NOT NULL | ユーザー名（3-20文字、英数字とアンダースコア） |
  | email | Email | UNIQUE, NOT NULL | メールアドレス |
  | is_staff | Boolean | DEFAULT False | 管理者権限フラグ |
  | is_active | Boolean | DEFAULT True | アカウント有効性 |

  ### 2. Image（画像管理）
  **テーブル名**: `images`
  **役割**: アップロードされた画像の基本情報を管理

  | フィールド名 | データ型 | 制約 | 説明 |
  |-------------|----------|------|------|
  | id | Integer | PK | 画像ID |
  | filename | Char(255) | NOT NULL | ファイル名 |
  | file_path | Char(500) | NOT NULL | ファイル保存パス |
  | upload_date | DateTime | AUTO | アップロード日時 |
  | status | Char(20) | CHOICES | ステータス（upload, uploaded, preparing, analyzing, success, failed） |
  | user_id | Integer | FK → User | アップロードユーザー |

  ### 3. AnalysisResult（解析結果管理）
  **テーブル名**: `analysis_results`
  **役割**: 画像解析の結果（ラベル・信頼度）を管理

  | フィールド名 | データ型 | 制約 | 説明 |
  |-------------|----------|------|------|
  | id | Integer | PK | 結果ID |
  | image_id | Integer | FK → Image | 対象画像 |
  | label | Char(100) | NOT NULL | 解析されたラベル |
  | confidence | Decimal(5,2) | 0.00-100.00 | 信頼度（%） |
  | model_name | Char(50) | NOT NULL | 使用モデル名 |
  | rank | Integer | NOT NULL | 順位（1位、2位など） |
  | created_at | DateTime | AUTO | 解析実行日時 |

  ### 4. TimelineLog（タイムラインログ管理）
  **テーブル名**: `timeline_logs`
  **役割**: UI表示用のタイムライン情報と進捗管理（Imageと1対1）

  | フィールド名 | データ型 | 制約 | 説明 |
  |-------------|----------|------|------|
  | id | Integer | PK | タイムラインID |
  | image_id | Integer | FK → Image (UNIQUE) | 対象画像（1対1） |
  | upload_completed_at | DateTime | NULL | アップロード完了時刻 |
  | analysis_started_at | DateTime | NULL | 解析開始時刻 |
  | analysis_completed_at | DateTime | NULL | 解析完了時刻 |
  | analysis_progress_percentage | Integer | DEFAULT 0 | 解析進捗率（0-100） |
  | model_used | Char(50) | NULL | 使用モデル名 |
  | 表示用データ | - | - | タイトル、説明、ステータス、アイコン、色等（詳細は実装時に決定） |
  | created_at | DateTime | AUTO | 作成日時 |
  | updated_at | DateTime | AUTO | 更新日時 |

  ## テーブル間の関係図

  ```
  User (1) ──→ (N) Image
  Image (1) ──→ (N) AnalysisResult
  Image (1) ──→ (1) TimelineLog
  Image (N) ──→ (1) MLModel (optional)
  ```

  ## 主要な設計思想

  ### 1. **画像中心の設計**
  - `Image`テーブルを中心として、関連する解析結果とタイムラインが紐づく
  - 1つの画像に対して複数の解析結果（複数モデルでの解析）が可能

  ### 2. **直感的なタイムライン表示**
  - アップロード完了から解析完了までの流れを視覚的に表示
  - 進捗状況と解析結果の要約を一目で確認可能

  ### 3. **権限管理**
  - 一般ユーザーと管理者の区別
  - ユーザー単位でのデータ分離

  ## 削除時の動作

  - **CASCADE**: 親が削除されると子も削除される
    - User削除 → Image削除
    - Image削除 → AnalysisResult, TimelineLog削除

  - **SET_NULL**: 親が削除されると子の外部キーがNULLになる
    - MLModel削除 → Imageのmodel_usedがNULLになる

## 運用上の特徴

1. **シンプルな構成**: 主要機能を4テーブルで表現（実際は10テーブル構成）
2. **監査性**: 詳細なログとタイムスタンプ
3. **ユーザビリティ**: 直感的なタイムライン表示
4. **拡張性**: 新しいモデルや機能の追加が容易

  この設計により、画像解析アプリケーションとして必要な機能を効率的に実現し、保守性の高いシステムとなっています。
