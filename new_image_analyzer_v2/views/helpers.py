"""
ヘルパー関数
画像検証、保存、解析処理などの共通処理
"""
import os
from django.conf import settings
from django.utils import timezone
from ..models import MstUser, TransUploadedImage, TransImageAnalysis

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif'}
MAX_MB = 1
MAX_BYTES = MAX_MB * 1024 * 1024


def validate_file(file):
    """ファイルバリデーション"""
    if not file:
        return 'ファイルが選択されていません'
    
    # ファイルサイズチェック
    if file.size > MAX_BYTES:
        return f'ファイルサイズが大きすぎます（最大{MAX_MB}MB）'
    
    # ファイル拡張子チェック
    file_ext = os.path.splitext(file.name)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return f'サポートされていないファイル形式です（{", ".join(ALLOWED_EXTENSIONS)}）'
    
    return None


def save_file_and_create_image_v2(file, user):
    """ファイルを保存して新しいモデルで画像レコードを作成（番号付与方式）"""
    import uuid
    from datetime import datetime
    from django.db import models
    
    # 元のファイル名を取得
    original_filename = file.name
    file_ext = os.path.splitext(original_filename)[1]
    
    # 既存のUserからMstUserを取得または作成
    mst_user, created = MstUser.objects.get_or_create(
        username=user.username,
        defaults={
            'email': user.email,
            'is_admin': user.is_staff,
            'is_active': user.is_active,
        }
    )
    
    # 重複チェックと番号付与
    display_filename = original_filename
    counter = 1
    
    # 同じユーザーが同じファイル名でアップロードした回数をカウント
    existing_count = TransUploadedImage.objects.filter(
        user_id=mst_user,
        filename__startswith=original_filename.split('.')[0]  # 拡張子を除いた部分でチェック
    ).count()
    
    if existing_count > 0:
        # 番号を付与
        name_without_ext = original_filename.split('.')[0]
        display_filename = f"{name_without_ext} ({existing_count}){file_ext}"
    
    # 物理ファイル用の一意なファイル名を生成（UUID方式を維持）
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    physical_filename = f"{timestamp}_{unique_id}{file_ext}"
    file_path = os.path.join(settings.MEDIA_ROOT, 'images', physical_filename)
    
    # ディレクトリを作成
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # ファイルを保存
    with open(file_path, 'wb') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    
    # ユーザーごとのアップロード順序番号を取得
    max_order = TransUploadedImage.objects.filter(
        user_id=mst_user
    ).aggregate(models.Max('upload_order'))['upload_order__max']
    
    next_order = (max_order or 0) + 1
    
    # 新しいモデルで画像レコードを作成
    img = TransUploadedImage.objects.create(
        user_id=mst_user,
        filename=display_filename,
        file_path=file_path,
        upload_order=next_order,
        status='analyzing'
    )
    
    return img


def perform_image_analysis(image, model_name):
    """実際の画像解析処理（v1のanalysis_serviceを使用）"""
    import logging
    from ..services import analysis_service
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"画像解析開始: ファイルパス={image.file_path}, モデル={model_name}")
        
        # v2用の解析サービスを使用して画像解析を実行
        analysis_response = analysis_service.analyze_image(image.file_path, model_name)
        logger.info(f"解析結果取得: {analysis_response}")
        logger.info(f"解析結果の型: {type(analysis_response)}")
        logger.info(f"successキーの値: {analysis_response.get('success', 'キーが存在しません')}")
        
        # v1の戻り値の形式をチェック
        if not analysis_response.get('success', False):
            logger.error(f"解析失敗: {analysis_response.get('error', '不明なエラー')}")
            logger.error(f"解析失敗の詳細: {analysis_response}")
            return [
                {
                    'label': 'Unknown',
                    'confidence': 0.0,
                    'model_name': model_name,
                    'rank': 1
                }
            ]
        
        results = analysis_response.get('results', [])
        logger.info(f"解析結果数: {len(results)}")
        
        # v2のモデル構造に合わせて結果を変換
        converted_results = []
        for i, result in enumerate(results):
            logger.info(f"結果{i+1}: {result}")
            converted_result = {
                'label': result.get('label', 'Unknown'),
                'confidence': float(result.get('confidence', 0.0)),
                'model_name': model_name,
                'rank': result.get('rank', i + 1)
            }
            converted_results.append(converted_result)
            logger.info(f"変換後結果{i+1}: {converted_result}")
        
        logger.info(f"変換完了: 最終結果数={len(converted_results)}")
        return converted_results
        
    except Exception as e:
        logger.error(f"個別画像解析エラー: {e}")
        # エラー時はサンプルデータを返す
        return [
            {
                'label': 'Unknown',
                'confidence': 0.0,
                'model_name': model_name,
                'rank': 1
            }
        ]


def process_single_image_analysis(image_id, model_name):
    """個別画像の解析処理"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        image = TransUploadedImage.objects.get(image_id=image_id)
        
        # 再解析の場合は古い解析結果を削除
        was_completed = image.status == 'completed'
        if was_completed:
            old_results = TransImageAnalysis.objects.filter(image_id=image)
            old_count = old_results.count()
            old_results.delete()
            logger.info(f"再解析開始: 画像ID={image.image_id} (古い解析結果{old_count}件を削除)")
        else:
            logger.info(f"解析処理開始: 画像ID={image.image_id}")
        
        # ステータスを解析中に更新
        image.status = 'analyzing'
        image.analysis_started_at = timezone.now()
        image.save()
        
        # 実際の解析処理
        analysis_results = perform_image_analysis(image, model_name)
        
        # 進捗バーとの同期のため、解析完了前に少し待機
        import time
        time.sleep(2)
        
        # 解析結果を保存（同じ解析実行なので同じ時刻を使用）
        analysis_time = timezone.now()
        for i, result in enumerate(analysis_results):
            TransImageAnalysis.objects.create(
                image_id=image,
                label=result.get('label', 'Unknown'),
                confidence=result.get('confidence', 0.0),
                model_name=result.get('model_name', 'unknown'),
                rank=i + 1,
                analysis_started_at=analysis_time,
                analysis_completed_at=analysis_time
            )
        
        # ステータスを完了に更新
        image.status = 'completed'
        image.analysis_completed_at = analysis_time
        image.save()
        
        logger.info(f"個別画像解析完了: ID={image_id}")
        
    except Exception as e:
        logger.error(f"個別画像解析エラー: {e}")
        # エラー時はステータスをエラーに更新
        try:
            image = TransUploadedImage.objects.get(image_id=image_id)
            image.status = 'error'
            image.save()
        except:
            pass


def process_batch_analysis(model_name):
    """一括解析処理"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # 準備中の画像を取得
        images = TransUploadedImage.objects.filter(status='preparing')
        
        for image in images:
            process_single_image_analysis(image.image_id, model_name)
        
        logger.info(f"一括解析完了: {images.count()}件")
        
    except Exception as e:
        logger.error(f"一括解析エラー: {e}")


def start_analysis_processing(image_id, model_name):
    """解析処理をバックグラウンドで開始"""
    import threading
    import logging
    logger = logging.getLogger(__name__)
    
    def process_analysis():
        try:
            if image_id:
                # 個別画像解析
                process_single_image_analysis(image_id, model_name)
            else:
                # 一括解析
                process_batch_analysis(model_name)
        except Exception as e:
            logger.error(f"解析処理中にエラーが発生: {e}")
    
    # バックグラウンドで実行
    thread = threading.Thread(target=process_analysis)
    thread.daemon = True
    thread.start()

