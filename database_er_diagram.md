# データベース設計 ER図（Mermaid形式）

## テーブル関係図

```mermaid
erDiagram
    User ||--o{ Image : "uploads"
    User ||--o{ PasswordResetToken : "has"
    User ||--o{ AnalysisQueue : "queues"
    
    Image ||--o{ ProgressLog : "has progress"
    Image ||--o{ AnalysisResult : "has results"
    Image ||--|| TimelineLog : "has timeline"
    Image ||--|| AnalysisQueue : "in queue"
    Image }o--|| MLModel : "uses model"
    
    User {
        int id PK
        string username UK
        string email UK
        boolean is_staff
        boolean is_active
        datetime date_joined
        datetime last_login
    }
    
    MLModel {
        int id PK
        string name
        string version
        boolean is_active
        text description
        datetime created_at
        datetime updated_at
    }
    
    Image {
        int id PK
        string filename
        string file_path
        string thumbnail_path
        datetime upload_date
        string status
        int user_id FK
        int model_used_id FK
        text error_log
        datetime created_at
        datetime updated_at
    }
    
    ProgressLog {
        int id PK
        int image_id FK
        decimal progress_percentage
        string current_stage
        text stage_description
        datetime timestamp
        datetime estimated_completion
    }
    
    AnalysisResult {
        int id PK
        int image_id FK
        string label
        decimal confidence
        string model_name
        string model_version
        int rank
        datetime created_at
    }
    
    TimelineLog {
        int id PK
        int image_id FK
        datetime upload_started_at
        datetime upload_completed_at
        string upload_step_title
        string upload_step_description
        string upload_step_status
        string upload_step_icon
        string upload_step_color
        string analysis_step_title
        string analysis_step_description
        string analysis_step_status
        string analysis_step_icon
        string analysis_step_color
        int analysis_progress_percentage
        string analysis_progress_stage
        string completion_step_title
        string completion_step_description
        string completion_step_status
        string completion_step_icon
        string completion_step_color
        datetime analysis_started_at
        datetime analysis_completed_at
        string model_used
        datetime created_at
        datetime updated_at
    }
    
    PasswordResetToken {
        int id PK
        int user_id FK
        string token UK
        datetime created_at
        boolean used
    }
    
    AnalysisQueue {
        int id PK
        int image_id FK
        int user_id FK
        int position
        string status
        string priority
        datetime queued_at
        datetime started_at
        datetime completed_at
        text error_message
        int retry_count
        string model_name
    }
```

## システム全体のフロー図

```mermaid
flowchart TD
    A[ユーザー登録・ログイン] --> B[画像アップロード]
    B --> C[Image テーブル作成]
    C --> D[TimelineLog 作成]
    C --> E[AnalysisQueue 追加]
    
    E --> F[キュー処理開始]
    F --> G[ProgressLog 記録]
    G --> H[機械学習モデル実行]
    H --> I[AnalysisResult 保存]
    I --> J[TimelineLog 更新]
    J --> K[解析完了]
    
    L[管理者] --> M[全ユーザー画像確認]
    L --> N[キュー管理]
    L --> O[システム監視]
    
    P[エラー発生] --> Q[Error Log 記録]
    Q --> R[リトライ処理]
    R --> F
```

## データフロー図

```mermaid
graph LR
    subgraph "ユーザー層"
        U1[一般ユーザー]
        U2[管理者]
    end
    
    subgraph "アプリケーション層"
        A1[画像アップロード]
        A2[解析処理]
        A3[結果表示]
        A4[管理機能]
    end
    
    subgraph "データベース層"
        D1[User]
        D2[Image]
        D3[MLModel]
        D4[ProgressLog]
        D5[AnalysisResult]
        D6[TimelineLog]
        D7[AnalysisQueue]
        D8[PasswordResetToken]
    end
    
    subgraph "機械学習層"
        M1[ResNet-50]
        M2[EfficientNet]
        M3[MobileNet]
        M4[VGG-16]
        M5[CLIP]
    end
    
    U1 --> A1
    U1 --> A3
    U2 --> A4
    
    A1 --> D1
    A1 --> D2
    A1 --> D6
    A1 --> D7
    
    A2 --> D4
    A2 --> D5
    A2 --> D6
    
    A3 --> D2
    A3 --> D5
    A3 --> D6
    
    A4 --> D1
    A4 --> D2
    A4 --> D7
    
    A2 --> M1
    A2 --> M2
    A2 --> M3
    A2 --> M4
    A2 --> M5
    
    D3 --> M1
    D3 --> M2
    D3 --> M3
    D3 --> M4
    D3 --> M5
```

## draw.ioでの作成手順

1. **draw.ioを開く**
2. **新しい図を作成**
3. **以下の手順でテーブルを作成**：
   - 左パネルから「Entity Relationship」または「Database」を選択
   - 各テーブルをドラッグ&ドロップ
   - テーブル名とフィールドを入力
   - 主キー（PK）、外部キー（FK）、一意制約（UK）を設定
   - テーブル間の関係線を描画

4. **推奨レイアウト**：
   - Userを中央上部に配置
   - Imageを中央に配置
   - 関連テーブルをImageの周りに配置
   - MLModelを右側に配置

5. **色分けの提案**：
   - User関連：青色
   - Image関連：緑色
   - ログ・結果関連：オレンジ色
   - キュー関連：紫色

この設計書とMermaid図を参考に、draw.ioで詳細なER図を作成できます。
