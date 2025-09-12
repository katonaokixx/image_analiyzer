# バリデーションルール可視化図

## 1. ユーザー認証バリデーション比較

```mermaid
graph TD
    A["ユーザー登録"] --> B["フロントエンドバリデーション"]
    A --> C["バックエンドバリデーション"]
    
    B --> D["ユーザー名: 2-20文字<br/>英数字_日本語スペース"]
    B --> E["パスワード: 6文字以上<br/>大文字・小文字・数字"]
    
    C --> F["ユーザー名: 3-20文字<br/>英数字_のみ"]
    C --> G["パスワード: Django標準"]
    
    D --> H["問題: 不整合"]
    E --> I["問題: セキュリティリスク"]
    F --> H
    G --> I
    
    style H fill:#ffcccc
    style I fill:#ffcccc
    style D fill:#fff2cc
    style E fill:#fff2cc
    style F fill:#d5e8d4
    style G fill:#d5e8d4
```

## 2. ファイルアップロードバリデーション

```mermaid
graph TD
    A["ファイルアップロード"] --> B["フロントエンド"]
    A --> C["バックエンド"]
    
    B --> D["サイズ: 1MB"]
    B --> E["形式: JPG,PNG,GIF"]
    B --> F["枚数: 5枚"]
    
    C --> G["サイズ: 1MB<br/>MAX_BYTES = 1MB * 1024 * 1024"]
    C --> H["形式: .jpg,.jpeg,.png,.gif<br/>ALLOWED_EXTENSIONS"]
    C --> I["枚数: 5枚"]
    
    D --> J["OK: 整合"]
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    
    style J fill:#d5e8d4
    style D fill:#d5e8d4
    style E fill:#d5e8d4
    style F fill:#d5e8d4
    style G fill:#d5e8d4
    style H fill:#d5e8d4
    style I fill:#d5e8d4
```

## 3. データベース制約関係図

```mermaid
erDiagram
    User {
        string username "UNIQUE, 3-20文字"
        string email "UNIQUE, EmailValidator"
        boolean is_staff "管理者権限"
    }
    
    Image {
        string status "CHOICES: upload,uploaded,preparing,analyzing,success,failed"
        string filename "max_length=255"
        string file_path "max_length=500"
    }
    
    AnalysisResult {
        decimal confidence "0.00-100.00%"
        int rank "正の整数"
        string model_name "max_length=50"
    }
    
    TimelineLog {
        int analysis_progress_percentage "0-100の範囲"
        datetime upload_completed_at
        datetime analysis_completed_at
    }
    
    AnalysisQueue {
        string status "waiting,processing,completed,failed,cancelled"
        string priority "low,normal,high,urgent"
        int position "正の整数"
    }
    
    User ||--o{ Image : "CASCADE削除"
    Image ||--o{ AnalysisResult : "CASCADE削除"
    Image ||--|| TimelineLog : "1:1関係"
    Image ||--|| AnalysisQueue : "1:1関係"
```

## 4. バリデーション問題の影響フロー

```mermaid
flowchart TD
    A["ユーザーが登録フォーム入力"] --> B{"フロントエンド<br/>バリデーション"}
    
    B -->|通過| C["サーバーに送信"]
    B -->|失敗| D["エラー表示"]
    
    C --> E{"バックエンド<br/>バリデーション"}
    
    E -->|通過| F["ユーザー作成成功"]
    E -->|失敗| G["エラー発生"]
    
    G --> H["ユーザー体験の悪化"]
    G --> I["データ整合性の問題"]
    
    J["問題のあるケース"] --> K["ユーザー名: 2文字で入力"]
    K --> L["フロントエンド: 通過"]
    L --> M["バックエンド: 3文字未満でエラー"]
    
    style G fill:#ffcccc
    style H fill:#ffcccc
    style I fill:#ffcccc
    style M fill:#ffcccc
```

## 5. 修正優先度マトリックス

```mermaid
graph TD
    A["バリデーション問題"] --> B["緊急"]
    A --> C["重要"]
    A --> D["改善"]
    
    B --> E["ユーザー名バリデーション不整合<br/>2文字入力でフロント通過<br/>バックエンドでエラー"]
    B --> F["パスワードセキュリティ<br/>6文字 vs 8文字要件<br/>特殊文字なし"]
    
    C --> G["フロントエンドとバックエンド<br/>バリデーションルール統一"]
    C --> H["エラーメッセージの一貫性"]
    
    D --> I["統一バリデーションサービス"]
    D --> J["設定ファイル化"]
    D --> K["バリデーションログ"]
    
    style E fill:#ff9999
    style F fill:#ff9999
    style G fill:#ffcc99
    style H fill:#ffcc99
    style I fill:#ffffcc
    style J fill:#ffffcc
    style K fill:#ffffcc
```

## 6. 修正作業フロー

```mermaid
flowchart LR
    A["現状分析"] --> B["フロントエンド修正"]
    B --> C["バックエンド確認"]
    C --> D["テスト実行"]
    D --> E{"問題解決?"}
    
    E -->|No| F["追加修正"]
    F --> C
    
    E -->|Yes| G["次の問題へ"]
    G --> H["パスワード要件強化"]
    H --> I["統一バリデーション実装"]
    
    style A fill:#e1d5e7
    style B fill:#d5e8d4
    style C fill:#d5e8d4
    style D fill:#fff2cc
    style G fill:#d5e8d4
    style H fill:#d5e8d4
    style I fill:#d5e8d4
```

## 7. ステータス値の関係図

```mermaid
graph TD
    A["画像解析プロセス"] --> B["Image.status"]
    A --> C["AnalysisQueue.status"]
    
    B --> D["upload: アップロード"]
    B --> E["uploaded: アップロード完了"]
    B --> F["preparing: 準備中"]
    B --> G["analyzing: 解析中"]
    B --> H["success: 解析成功"]
    B --> I["failed: 失敗"]
    
    C --> J["waiting: 待機中"]
    C --> K["processing: 処理中"]
    C --> L["completed: 完了"]
    C --> M["failed: 失敗"]
    C --> N["cancelled: キャンセル"]
    
    O["混乱しやすい点"] --> P["Image: success vs AnalysisQueue: completed"]
    
    style H fill:#d5e8d4
    style L fill:#d5e8d4
    style P fill:#fff2cc
```

## 使用方法

1. **Mermaid Live Editor**: https://mermaid.live/edit で各図を確認
2. **draw.io**: 図をインポートして編集
3. **ドキュメント**: 各図をコピーしてドキュメントに貼り付け

各図は独立しており、用途に応じて使用できます。
