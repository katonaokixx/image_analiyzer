#!/usr/bin/env python3
"""
CLIPのダミーデータを一括削除するスクリプト
"""
import os
import sys
import django

# Django設定
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'image_analysis_app.settings')
django.setup()

from image_analyzer.models import AnalysisResult

def fix_clip_dummy_data():
    """CLIPのダミーデータを一括削除"""
    print("=== CLIPのダミーデータ一括削除 ===")
    
    # ダミーデータのラベル
    dummy_labels = ['鳥', '猫', '犬', 'bird', 'cat', 'dog']
    
    # ダミーデータを検索
    dummy_results = AnalysisResult.objects.filter(
        model_name='clip',
        label__in=dummy_labels
    )
    
    deleted_count = dummy_results.count()
    print(f"削除対象: {deleted_count}件")
    
    if deleted_count > 0:
        # 削除実行
        dummy_results.delete()
        print(f"✅ ダミーデータ {deleted_count} 件を削除しました")
    else:
        print("✅ 削除対象のダミーデータはありません")
    
    # 残っているCLIP結果を確認
    remaining_results = AnalysisResult.objects.filter(model_name='clip')
    print(f"\\n残っているCLIP結果: {remaining_results.count()}件")
    
    if remaining_results.exists():
        print("\\n最新のCLIP結果:")
        for result in remaining_results.order_by('-id')[:5]:
            print(f"  画像ID: {result.image.id}, ラベル: {result.label}, 信頼度: {result.confidence}%")
    
    return deleted_count

if __name__ == "__main__":
    fix_clip_dummy_data()
