# バリデーション比較図（シンプル版）

## 1. 問題のあるバリデーション

```mermaid
graph LR
    subgraph "ユーザー名バリデーション"
        A["フロントエンド<br/>2-20文字<br/>日本語OK"] 
        B["バックエンド<br/>3-20文字<br/>英数字_のみ"]
        C["ルール<br/>3-20文字<br/>記号のみ禁止"]
        
        A -.->|不整合| B
        A -.->|不整合| C
    end
    
    subgraph "パスワードバリデーション"
        D["フロントエンド<br/>6文字以上<br/>大文字小文字数字"]
        E["バックエンド<br/>Django標準"]
        F["ルール<br/>8文字以上<br/>特殊文字必須"]
        
        D -.->|不整合| E
        D -.->|不整合| F
    end
    
    style A fill:#ffcccc
    style D fill:#ffcccc
    style B fill:#fff2cc
    style C fill:#fff2cc
    style E fill:#fff2cc
    style F fill:#fff2cc
```

## 2. 正常なバリデーション

```mermaid
graph LR
    subgraph "ファイルアップロード"
        A["フロントエンド<br/>1MB<br/>JPG,PNG,GIF<br/>5枚まで"]
        B["バックエンド<br/>1MB<br/>JPG,PNG,GIF<br/>5枚まで"]
        C["ルール<br/>1MB<br/>JPG,PNG,GIF<br/>5枚まで"]
        
        A -->|整合| B
        A -->|整合| C
    end
    
    style A fill:#d5e8d4
    style B fill:#d5e8d4
    style C fill:#d5e8d4
```

## 3. 修正が必要な優先順位

```mermaid
graph TD
    A["バリデーション問題"] --> B["最優先"]
    A --> C["重要"]
    A --> D["改善"]
    
    B --> E["ユーザー名<br/>2文字入力でエラー"]
    B --> F["パスワード<br/>セキュリティ不足"]
    
    C --> G["バリデーション統一"]
    C --> H["エラーメッセージ改善"]
    
    D --> I["設定ファイル化"]
    D --> J["ログ機能追加"]
    
    style E fill:#ff9999
    style F fill:#ff9999
    style G fill:#ffcc99
    style H fill:#ffcc99
    style I fill:#ffffcc
    style J fill:#ffffcc
```

## 4. 実際の問題シナリオ

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant B as バックエンド
    
    U->>F: ユーザー名「ab」入力
    F->>F: バリデーション（2-20文字OK）
    F->>B: 登録リクエスト送信
    B->>B: バリデーション（3文字未満エラー）
    B->>F: エラーレスポンス
    F->>U: エラー表示
    Note over U: ユーザー混乱
```

## 5. 修正後の理想状態

```mermaid
graph LR
    subgraph "修正後"
        A["フロントエンド<br/>3-20文字<br/>英数字_のみ<br/>8文字以上<br/>特殊文字必須"]
        B["バックエンド<br/>3-20文字<br/>英数字_のみ<br/>8文字以上<br/>特殊文字必須"]
        C["ルール<br/>3-20文字<br/>記号のみ禁止<br/>8文字以上<br/>特殊文字必須"]
        
        A -->|整合| B
        A -->|整合| C
    end
    
    style A fill:#d5e8d4
    style B fill:#d5e8d4
    style C fill:#d5e8d4
```

## 使用方法

1. **Mermaid Live Editor**: https://mermaid.live/edit で確認
2. **プレゼンテーション**: 図を使って問題を説明
3. **ドキュメント**: READMEや仕様書に組み込み

これらの図は、複雑な表よりも視覚的に分かりやすく、問題点を明確に示しています。

