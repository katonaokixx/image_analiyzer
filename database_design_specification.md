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
| date_joined | DateTime | AUTO | 登録日時 |
| last_login | DateTime | NULL | 最終ログイン日時 |

### 2. MLModel（機械学習モデル管理）
**テーブル名**: `ml_models`
**役割**: 使用可能な機械学習モデルを管理

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| id | Integer | PK | モデルID |
| name | Char(50) | CHOICES | モデル名（resnet50, efficientnet, mobilenet, vgg16, clip, custom） |
| version | Char(20) | DEFAULT '1.0.0' | バージョン |
| is_active | Boolean | DEFAULT True | 使用可能フラグ |
| description | Text | - | モデル説明 |
| created_at | DateTime | AUTO | 作成日時 |
| updated_at | DateTime | AUTO | 更新日時 |

### 3. Image（画像管理）
**テーブル名**: `images`
**役割**: アップロードされた画像の基本情報を管理

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| id | Integer | PK | 画像ID |
| filename | Char(255) | NOT NULL | ファイル名 |
| file_path | Char(500) | NOT NULL | ファイル保存パス |
| thumbnail_path | Char(500) | NULL | サムネイル画像パス |
| upload_date | DateTime | AUTO | アップロード日時 |
| status | Char(20) | CHOICES | ステータス（upload, uploaded, preparing, analyzing, success, failed） |
| user_id | Integer | FK → User | アップロードユーザー |
| model_used_id | Integer | FK → MLModel | 使用モデル（NULL可） |
| error_log | Text | NULL | エラーログ |
| created_at | DateTime | AUTO | 作成日時 |
| updated_at | DateTime | AUTO | 更新日時 |

### 4. ProgressLog（進捗ログ管理）
**テーブル名**: `progress_logs`
**役割**: 画像解析の進捗状況を詳細に記録

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| id | Integer | PK | ログID |
| image_id | Integer | FK → Image | 対象画像 |
| progress_percentage | Decimal(5,2) | 0.00-100.00 | 進捗率 |
| current_stage | Char(20) | CHOICES | 現在の段階（preprocessing, model_execution, postprocessing, completed） |
| stage_description | Text | NULL | 段階の詳細説明 |
| timestamp | DateTime | AUTO | ログ記録時刻 |
| estimated_completion | DateTime | NULL | 推定完了時刻 |

### 5. AnalysisResult（解析結果管理）
**テーブル名**: `analysis_results`
**役割**: 画像解析の結果（ラベル・信頼度）を管理

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| id | Integer | PK | 結果ID |
| image_id | Integer | FK → Image | 対象画像 |
| label | Char(100) | NOT NULL | 解析されたラベル |
| confidence | Decimal(5,2) | 0.00-100.00 | 信頼度（%） |
| model_name | Char(50) | NOT NULL | 使用モデル名 |
| model_version | Char(20) | NOT NULL | モデルバージョン |
| rank | Integer | NOT NULL | 順位（1位、2位など） |
| created_at | DateTime | AUTO | 解析実行日時 |

### 6. TimelineLog（タイムラインログ管理）
**テーブル名**: `timeline_logs`
**役割**: UI表示用のタイムライン情報を管理（Imageと1対1）

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| id | Integer | PK | タイムラインID |
| image_id | Integer | FK → Image (UNIQUE) | 対象画像（1対1） |
| upload_started_at | DateTime | NULL | アップロード開始時刻 |
| upload_completed_at | DateTime | NULL | アップロード完了時刻 |
| upload_step_title | Char(100) | DEFAULT | アップロード完了タイトル |
| upload_step_description | Char(200) | DEFAULT | アップロード完了説明 |
| upload_step_status | Char(50) | DEFAULT | アップロード完了ステータス |
| upload_step_icon | Char(50) | DEFAULT | アップロード完了アイコン |
| upload_step_color | Char(20) | DEFAULT | アップロード完了色 |
| analysis_step_title | Char(100) | NULL | 解析ステップタイトル |
| analysis_step_description | Char(200) | NULL | 解析ステップ説明 |
| analysis_step_status | Char(50) | NULL | 解析ステップステータス |
| analysis_step_icon | Char(50) | DEFAULT | 解析ステップアイコン |
| analysis_step_color | Char(20) | DEFAULT | 解析ステップ色 |
| analysis_progress_percentage | Integer | DEFAULT 0 | 解析進捗率 |
| analysis_progress_stage | Char(50) | DEFAULT | 解析進捗ステージ |
| completion_step_title | Char(100) | NULL | 完了ステップタイトル |
| completion_step_description | Char(200) | NULL | 完了ステップ説明 |
| completion_step_status | Char(50) | NULL | 完了ステップステータス |
| completion_step_icon | Char(50) | DEFAULT | 完了ステップアイコン |
| completion_step_color | Char(20) | DEFAULT | 完了ステップ色 |
| analysis_started_at | DateTime | NULL | 解析開始時刻 |
| analysis_completed_at | DateTime | NULL | 解析完了時刻 |
| model_used | Char(50) | NULL | 使用モデル |
| created_at | DateTime | AUTO | 作成日時 |
| updated_at | DateTime | AUTO | 更新日時 |

### 7. PasswordResetToken（パスワードリセット）
**テーブル名**: `password_reset_tokens`
**役割**: パスワードリセット用のトークン管理

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| id | Integer | PK | トークンID |
| user_id | Integer | FK → User | 対象ユーザー |
| token | Char(64) | UNIQUE | リセットトークン |
| created_at | DateTime | AUTO | 作成日時 |
| used | Boolean | DEFAULT False | 使用済みフラグ |

### 8. AnalysisQueue（解析キュー管理）
**テーブル名**: `analysis_queue`
**役割**: 解析処理のキュー管理（Imageと1対1）

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| id | Integer | PK | キューID |
| image_id | Integer | FK → Image (UNIQUE) | 対象画像（1対1） |
| user_id | Integer | FK → User | 対象ユーザー |
| position | Integer | NOT NULL | キュー位置 |
| status | Char(20) | CHOICES | キュー状態（waiting, processing, completed, failed, cancelled） |
| priority | Char(10) | CHOICES | 優先度（low, normal, high, urgent） |
| queued_at | DateTime | AUTO | キュー追加日時 |
| started_at | DateTime | NULL | 処理開始日時 |
| completed_at | DateTime | NULL | 処理完了日時 |
| error_message | Text | NULL | エラーメッセージ |
| retry_count | Integer | DEFAULT 0 | リトライ回数 |
| model_name | Char(100) | NULL | 使用モデル |

## テーブル間の関係図

```
User (1) ──→ (N) Image
User (1) ──→ (N) PasswordResetToken
User (1) ──→ (N) AnalysisQueue
Image (1) ──→ (N) ProgressLog
Image (1) ──→ (N) AnalysisResult
Image (1) ──→ (1) TimelineLog
Image (1) ──→ (1) AnalysisQueue
MLModel (1) ──→ (N) Image (optional)
```

## 主要な設計思想

### 1. **画像中心の設計**
- `Image`テーブルを中心として、関連する解析結果、進捗、タイムラインが紐づく
- 1つの画像に対して複数の解析結果（複数モデルでの解析）が可能

### 2. **詳細な進捗管理**
- `ProgressLog`: 技術的な進捗管理（前処理、モデル実行、後処理）
- `TimelineLog`: UI表示用の詳細なタイムライン情報

### 3. **キューシステム**
- 優先度と位置管理による解析キュー
- リトライ機能付きのエラーハンドリング

### 4. **柔軟なタイムライン表示**
- UI表示に特化したタイムライン情報
- アイコン、色、ステータスなどの表示用データ

### 5. **権限管理**
- 一般ユーザーと管理者の区別
- ユーザー単位でのデータ分離

## 削除時の動作

- **CASCADE**: 親が削除されると子も削除される
  - User削除 → Image, PasswordResetToken, AnalysisQueue削除
  - Image削除 → ProgressLog, AnalysisResult, TimelineLog, AnalysisQueue削除

- **SET_NULL**: 親が削除されると子の外部キーがNULLになる
  - MLModel削除 → Imageのmodel_usedがNULLになる

## 運用上の特徴

1. **スケーラビリティ**: 複数の機械学習モデルに対応
2. **監査性**: 詳細なログとタイムスタンプ
3. **ユーザビリティ**: 直感的なタイムライン表示
4. **信頼性**: キューシステムとエラーハンドリング
5. **拡張性**: 新しいモデルや機能の追加が容易

この設計により、画像解析アプリケーションとして必要な機能を網羅し、将来の拡張にも対応できる柔軟なシステムとなっています。
