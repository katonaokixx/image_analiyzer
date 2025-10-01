"""
API関連のビュー
画像アップロード、解析開始、進捗取得、削除など
"""
import os
import json
import logging
from django.http import JsonResponse, HttpRequest
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_protect
from django.utils import timezone
from ..models import MstUser, TransUploadedImage, TransImageAnalysis
from .helpers import (
    validate_file,
    save_file_and_create_image_v2,
    start_analysis_processing
)

logger = logging.getLogger(__name__)


@require_POST
@csrf_protect
def api_form_upload(request: HttpRequest):
    """画像アップロードAPI（新しいモデル使用）"""
    if not request.user.is_authenticated:
        return JsonResponse({'ok': False, 'errors': ['ログインが必要です']}, status=401)
    
    # Dropzoneからの直接ファイル送信に対応
    files = request.FILES.getlist('file')  # Dropzoneは 'file' で送信
    if not files:
        files = request.FILES.getlist('files')  # フォールバック: 'files' も試す
    
    if not files:
        return JsonResponse({'ok': False, 'errors': ['ファイルが選択されていません']}, status=400)
    
    # 個別ファイルバリデーション
    errors = []
    valid_files = []
    
    for f in files:
        error = validate_file(f)
        if error:
            errors.append(f'{f.name}: {error}')
        else:
            valid_files.append(f)
    
    if errors:
        return JsonResponse({'ok': False, 'errors': errors}, status=400)
    
    # ファイル保存
    saved = []
    for f in valid_files:
        try:
            # 新しいモデルを使用して画像を保存
            img = save_file_and_create_image_v2(f, request.user)
            
            # 画像のステータスを更新
            img.status = 'uploaded'
            img.upload_completed_at = timezone.now()
            img.save()
            
            saved.append(img)
        except Exception as e:
            # インフラ側のエラー（ディスク容量不足、権限エラーなど）
            errors.append(f'{f.name}: サーバーエラーが発生しました')
    
    # エラーハンドリング
    if not saved:
        return JsonResponse({'ok': False, 'errors': errors}, status=400)
    
    # セッションにアップロードした画像IDを保存
    uploaded_image_ids = request.session.get('uploaded_image_ids', [])
    for img in saved:
        if img.image_id not in uploaded_image_ids:
            uploaded_image_ids.append(img.image_id)
    request.session['uploaded_image_ids'] = uploaded_image_ids
    request.session.modified = True
    
    # レスポンス用の画像情報を準備
    response_data = []
    for img in saved:
        # file_pathから実際のファイル名を取得
        physical_filename = os.path.basename(img.file_path)
        response_data.append({
            'id': img.image_id,
            'filename': img.filename,
            'thumbnail_url': f'/uploads/images/{physical_filename}',
            'status': img.status
        })
    
    return JsonResponse({
        'ok': True,
        'message': f'{len(saved)}個のファイルがアップロードされました',
        'images': response_data
    })


@require_POST
@csrf_protect
def api_set_selected_image(request: HttpRequest):
    """選択画像設定API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})


@require_POST
@csrf_protect
def api_select_model(request: HttpRequest):
    """モデル選択API"""
    model_name = request.POST.get('model_name')
    if not model_name:
        return JsonResponse({'ok': False, 'message': 'モデル名が指定されていません'}, status=400)
    
    # セッションに選択されたモデルを保存
    request.session['selected_model'] = model_name
    request.session.modified = True
    
    return JsonResponse({'ok': True, 'model': model_name})


@require_POST
@csrf_protect
def api_start_analysis(request: HttpRequest):
    """解析開始API"""
    model_name = request.POST.get('model')
    image_id = request.POST.get('image_id')  # 個別画像ID（オプション）
    
    logger.info(f"=== v2解析開始API呼び出し ===")
    logger.info(f"モデル: {model_name}, 画像ID: {image_id}, ユーザー: {request.user.username}")
    
    if not model_name:
        logger.error("モデルが指定されていません")
        return JsonResponse({'ok': False, 'error': 'モデルが指定されていません'}, status=400)
    
    try:
        if image_id:
            # 個別画像解析の場合
            try:
                image = TransUploadedImage.objects.get(image_id=image_id, status__in=['uploaded', 'preparing', 'analyzing', 'completed'])
                logger.info(f"個別画像解析対象: ID={image.image_id}, ファイル名={image.filename}, ステータス={image.status}")
            except TransUploadedImage.DoesNotExist:
                logger.error(f"指定された画像が見つからないか、解析対象ではありません: ID={image_id}")
                return JsonResponse({'ok': False, 'error': '指定された画像が見つからないか、解析対象ではありません'}, status=400)
            
            # 再解析の場合、古い解析結果は削除しない（前回解析結果の表示のため）
            if image.status == 'completed':
                logger.info(f"再解析開始: 画像ID={image.image_id} (既存の解析結果は保持)")
            
            # 画像のステータスを直接更新
            image.analysis_started_at = timezone.now()
            image.status = 'analyzing'
            image.save()
            
            logger.info(f"個別画像の解析を開始: ID={image.image_id}")
            
        else:
            # 一括解析の場合（このセッションでアップロードした画像のみを対象）
            uploaded_image_ids = request.session.get('uploaded_image_ids', [])
            if not uploaded_image_ids:
                logger.error("このセッションでアップロードした画像が見つかりません")
                return JsonResponse({'ok': False, 'error': 'このセッションでアップロードした画像が見つかりません'}, status=400)
            
            # セッション画像IDのうち、解析可能な状態の画像のみを取得
            available_images = TransUploadedImage.objects.filter(
                image_id__in=uploaded_image_ids,
                status__in=['uploaded', 'preparing', 'analyzing']
            ).order_by('-created_at')
            
            # セッションから解析済みの画像IDを除外して更新
            active_image_ids = [img.image_id for img in available_images]
            request.session['uploaded_image_ids'] = active_image_ids
            request.session.modified = True
            
            logger.info(f"一括解析対象画像数: {available_images.count()} (セッション画像IDs: {uploaded_image_ids} -> 有効画像IDs: {active_image_ids})")
            
            if not available_images.exists():
                logger.error("解析対象の画像が見つかりません")
                return JsonResponse({'ok': False, 'error': '解析対象の画像が見つかりません'}, status=400)
            
            # 各画像のステータスを準備中に更新
            for img in available_images:
                img.status = 'preparing'
                img.save()
            
            logger.info(f"一括解析で{available_images.count()}件の画像の解析を開始")
        
        # 解析処理を開始（バックグラウンドで実行）
        start_analysis_processing(image_id, model_name)
        
        return JsonResponse({'success': True, 'message': '解析を開始しました'})
        
    except Exception as e:
        logger.error(f"解析開始中にエラーが発生: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
def api_complete_analysis(request: HttpRequest):
    """解析完了API"""
    try:
        data = json.loads(request.body)
        image_id = data.get('image_id')
        analysis_results = data.get('results', [])
        
        if not image_id:
            return JsonResponse({'ok': False, 'error': '画像IDが指定されていません'}, status=400)
        
        try:
            image = TransUploadedImage.objects.get(image_id=image_id)
        except TransUploadedImage.DoesNotExist:
            return JsonResponse({'ok': False, 'error': '指定された画像が見つかりません'}, status=404)
        
        # 解析結果を保存
        saved_results = []
        for i, result in enumerate(analysis_results):
            analysis = TransImageAnalysis.objects.create(
                image_id=image,
                label=result.get('label', 'Unknown'),
                confidence=result.get('confidence', 0.0),
                model_name=result.get('model_name', 'unknown'),
                rank=i + 1,
                analysis_started_at=timezone.now(),
                analysis_completed_at=timezone.now()
            )
            saved_results.append({
                'id': analysis.analysis_id,
                'label': analysis.label,
                'confidence': analysis.confidence,
                'model_name': analysis.model_name,
                'rank': analysis.rank
            })
        
        logger.info(f"解析結果保存完了: 画像ID={image_id}, 結果数={len(saved_results)}")
        logger.info(f"解析完了: 画像ID={image_id}, 結果数={len(saved_results)}")
        
        return JsonResponse({
            'ok': True,
            'message': '解析が完了しました',
            'results': saved_results
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'ok': False, 'error': '無効なJSONデータです'}, status=400)
    except Exception as e:
        logger.error(f"解析完了処理エラー: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
def api_retry_analysis(request: HttpRequest):
    """解析再試行API（api_start_analysisと同じ処理）"""
    return api_start_analysis(request)


@require_POST
@csrf_protect
def api_update_status(request: HttpRequest):
    """ステータス更新API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})


@require_GET
def api_get_timeline(request: HttpRequest, image_id: int):
    """タイムライン取得API"""
    try:
        # 画像の存在確認
        try:
            image = TransUploadedImage.objects.get(image_id=image_id)
        except TransUploadedImage.DoesNotExist:
            return JsonResponse({'ok': False, 'error': '指定された画像が見つかりません'}, status=404)
        
        # 解析結果の存在を確認
        has_analysis_results = TransImageAnalysis.objects.filter(image_id=image).exists()
        
        # 画像のステータスに基づいて進捗を決定（シンプルなロジック）
        if image.status == 'completed':
            # 完了ステータスの場合は100%
            progress_percentage = 100
            progress_stage = 'completed'
            step_title = '解析完了'
            step_description = '画像解析が正常に完了しました'
            step_icon = 'check'
            step_color = 'success'
        elif image.status == 'analyzing':
            # 解析中の場合
            if has_analysis_results:
                progress_percentage = 90
                progress_stage = 'analyzing'
                step_title = '解析中'
                step_description = '解析結果を処理中...'
                step_icon = 'spinner'
                step_color = 'primary'
            else:
                progress_percentage = 50
                progress_stage = 'analyzing'
                step_title = '解析中'
                step_description = '画像を解析しています...'
                step_icon = 'spinner'
                step_color = 'primary'
        else:
            progress_percentage = 0
            progress_stage = 'waiting'
            step_title = '待機中'
            step_description = '解析の準備をしています...'
            step_icon = 'clock'
            step_color = 'info'
        
        timeline_data = {
            'image_id': image.image_id,
            'filename': image.filename,
            'status': image.status,
            'analysis_started_at': image.analysis_started_at,
            'analysis_completed_at': image.analysis_completed_at,
            'current_step': {
                'title': step_title,
                'description': step_description,
                'status': image.status,
                'icon': step_icon,
                'color': step_color
            },
            'progress': {
                'percentage': progress_percentage,
                'stage': progress_stage
            },
            'model_used': '未指定'
        }
        
        # 解析結果も取得
        analysis_results = TransImageAnalysis.objects.filter(image_id=image).order_by('-analysis_completed_at')
        results_data = []
        
        for result in analysis_results:
            results_data.append({
                'analysis_id': result.analysis_id,
                'label': result.label,
                'confidence': result.confidence,
                'model_name': result.model_name,
                'rank': result.rank,
                'created_at': result.analysis_completed_at.isoformat() if result.analysis_completed_at else None
            })
        
        timeline_data['analysis_results'] = results_data
        
        return JsonResponse({
            'ok': True,
            'timeline': timeline_data
        })
        
    except Exception as e:
        logger.error(f"タイムライン取得エラー: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
def api_delete_image(request: HttpRequest, image_id: int):
    """画像を削除するAPI（v2）"""
    logger.info(f"画像削除API呼び出し: 画像ID={image_id}, ユーザー={request.user.username}")
    
    try:
        # 既存のUserからMstUserを取得
        mst_user = MstUser.objects.get(username=request.user.username)
        logger.info(f"MstUser取得成功: {mst_user.username}")
        
        # 画像を取得（ユーザーが所有する画像のみ）
        image = TransUploadedImage.objects.get(image_id=image_id, user_id=mst_user)
        logger.info(f"画像取得成功: {image.filename}")
        
        # 関連する解析結果を削除
        TransImageAnalysis.objects.filter(image_id=image).delete()
        
        # ファイルを削除
        if image.file_path and os.path.exists(image.file_path):
            os.remove(image.file_path)
            logger.info(f"ファイルを削除: {image.file_path}")
        
        # 画像レコードを削除
        image.delete()
        
        return JsonResponse({
            'ok': True,
            'success': True,
            'message': '画像を削除しました'
        })
        
    except MstUser.DoesNotExist:
        return JsonResponse({
            'ok': False,
            'success': False,
            'error': 'ユーザーが見つかりません'
        }, status=404)
    except TransUploadedImage.DoesNotExist:
        return JsonResponse({
            'ok': False,
            'success': False,
            'error': '画像が見つからないか、削除権限がありません'
        }, status=404)
    except Exception as e:
        logger.error(f"画像削除エラー: {str(e)}")
        return JsonResponse({
            'ok': False,
            'success': False,
            'error': f'削除中にエラーが発生しました: {str(e)}'
        }, status=500)


@require_GET
def api_get_uploaded_images(request: HttpRequest):
    """セッションのアップロード済み画像情報を取得"""
    try:
        uploaded_image_ids = request.session.get('uploaded_image_ids', [])
        
        if not uploaded_image_ids:
            return JsonResponse({'ok': True, 'images': []})
        
        images = TransUploadedImage.objects.filter(image_id__in=uploaded_image_ids).order_by('-created_at')
        
        images_data = []
        for img in images:
            physical_filename = os.path.basename(img.file_path)
            images_data.append({
                'id': img.image_id,
                'filename': img.filename,
                'thumbnail_url': f'/uploads/images/{physical_filename}',
                'status': img.status
            })
        
        logger.info(f"アップロード済み画像情報を返却: {len(images_data)}件")
        return JsonResponse({'ok': True, 'images': images_data})
        
    except Exception as e:
        logger.error(f"画像情報取得エラー: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_GET
def api_get_images_status(request: HttpRequest):
    """複数画像のステータス一括取得API（テーブル画面用）"""
    try:
        # リクエストから画像IDリストを取得
        image_ids_str = request.GET.get('image_ids', '')
        if not image_ids_str:
            return JsonResponse({'ok': False, 'error': '画像IDが指定されていません'}, status=400)
        
        # カンマ区切りのIDリストをパース
        image_ids = [int(id.strip()) for id in image_ids_str.split(',') if id.strip()]
        
        # 画像のステータスを取得
        images = TransUploadedImage.objects.filter(image_id__in=image_ids)
        
        # 結果を構築
        status_data = {}
        for image in images:
            # 解析結果を取得
            latest_result = TransImageAnalysis.objects.filter(
                image_id=image
            ).order_by('-confidence').first()
            
            status_info = {
                'status': image.status,
                'label': latest_result.label if latest_result else None,
                'confidence': latest_result.confidence if latest_result else None
            }
            
            # 準備中の画像の場合は待ち順番を計算
            if image.status == 'preparing':
                # 同じユーザーの解析中の画像数をカウント
                analyzing_count = TransUploadedImage.objects.filter(
                    user_id=image.user_id,
                    status='analyzing'
                ).count()
                
                # 同じユーザーの自分より前の準備中の画像数をカウント
                preparing_before_count = TransUploadedImage.objects.filter(
                    user_id=image.user_id,
                    status='preparing',
                    upload_order__lt=image.upload_order
                ).count()
                
                # 待ち枚数 = 解析中の枚数 + 自分より前の準備中の枚数
                waiting_count = analyzing_count + preparing_before_count
                status_info['waiting_count'] = waiting_count
            
            status_data[str(image.image_id)] = status_info
        
        return JsonResponse({
            'ok': True,
            'statuses': status_data
        })
        
    except Exception as e:
        logger.error(f"ステータス取得エラー: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_GET
def api_analysis_progress(request: HttpRequest):
    """解析進捗取得API"""
    try:
        image_id = request.GET.get('image_id')
        
        if image_id:
            # 個別画像の進捗を取得
            try:
                image = TransUploadedImage.objects.get(image_id=image_id)
                
                # 解析結果の存在を確認
                has_analysis_results = TransImageAnalysis.objects.filter(image_id=image).exists()
                
                # 画像のステータスに基づいて進捗を決定（連続的な進捗）
                if image.status == 'completed':
                    # 完了ステータスの場合は100%
                    progress_percentage = 100
                    current_stage = 'completed'
                    description = '画像解析が正常に完了しました'
                elif image.status == 'analyzing':
                    # 解析中の場合は連続的な進捗を計算
                    if has_analysis_results:
                        # 解析結果がある場合は90-99%の範囲でランダムに進捗
                        import random
                        progress_percentage = random.randint(90, 99)
                        current_stage = 'analyzing'
                        description = '解析結果を処理中...'
                    else:
                        # 解析開始からの経過時間に基づいて段階的な進捗を計算
                        import time
                        elapsed_time = time.time() - image.analysis_started_at.timestamp()
                        
                        # 実際の解析時間に合わせた進捗計算（5-10秒で完了想定）
                        if elapsed_time < 1.0:
                            progress_percentage = 10
                        elif elapsed_time < 2.0:
                            progress_percentage = 20
                        elif elapsed_time < 3.0:
                            progress_percentage = 30
                        elif elapsed_time < 4.0:
                            progress_percentage = 40
                        elif elapsed_time < 5.0:
                            progress_percentage = 50
                        elif elapsed_time < 6.0:
                            progress_percentage = 60
                        elif elapsed_time < 7.0:
                            progress_percentage = 70
                        elif elapsed_time < 8.0:
                            progress_percentage = 80
                        elif elapsed_time < 9.0:
                            progress_percentage = 85
                        else:
                            progress_percentage = 89
                        current_stage = 'analyzing'
                        description = '画像を解析しています...'
                else:
                    progress_percentage = 0
                    current_stage = 'waiting'
                    description = '解析の準備をしています...'
                
                # 解析結果を取得
                results = TransImageAnalysis.objects.filter(image_id=image).order_by('-confidence')[:3]
                result_data = []
                for result in results:
                    result_data.append({
                        'label': result.label,
                        'confidence': result.confidence,
                        'rank': result.rank
                    })
                
                return JsonResponse({
                    'ok': True,
                    'progress': progress_percentage,
                    'status': image.status,
                    'current_stage': current_stage,
                    'description': description,
                    'result': result_data if result_data else None
                })
                
            except TransUploadedImage.DoesNotExist:
                return JsonResponse({
                    'ok': False,
                    'error': '画像が見つかりません'
                }, status=404)
        else:
            # セッション画像の一括進捗を取得（複数画像対応）
            uploaded_image_ids = request.session.get('uploaded_image_ids', [])
            
            if not uploaded_image_ids:
                return JsonResponse({
                    'ok': True,
                    'progress': 0,
                    'status': 'waiting',
                    'current_stage': 'waiting',
                    'description': '解析待機中...',
                    'total_images': 0,
                    'completed_images': 0
                })
            
            try:
                # 対象画像を全て取得
                images = TransUploadedImage.objects.filter(image_id__in=uploaded_image_ids)
                total_count = images.count()
                
                if total_count == 0:
                    return JsonResponse({
                        'ok': True,
                        'progress': 0,
                        'status': 'waiting',
                        'current_stage': 'waiting',
                        'description': '解析待機中...',
                        'total_images': 0,
                        'completed_images': 0
                    })
                
                # 完了した画像数をカウント
                completed_count = images.filter(status='completed').count()
                analyzing_count = images.filter(status='analyzing').count()
                preparing_count = images.filter(status='preparing').count()
                
                # 実際の進捗を計算（完了画像数 / 総画像数）
                progress_percentage = int((completed_count / total_count) * 100)
                
                # ステータスと説明文を決定
                if completed_count == total_count:
                    # 全て完了
                    current_stage = 'completed'
                    description = f'{total_count}枚の画像解析が全て完了しました'
                    status = 'completed'
                elif analyzing_count > 0 or preparing_count > 0:
                    # 解析中または準備中
                    current_stage = 'analyzing'
                    description = f'{completed_count}/{total_count}枚完了（解析中: {analyzing_count}枚、準備中: {preparing_count}枚）'
                    status = 'analyzing'
                else:
                    # 待機中
                    current_stage = 'waiting'
                    description = '解析の準備をしています...'
                    status = 'waiting'
                
                logger.info(f"一括進捗: {completed_count}/{total_count}枚完了 ({progress_percentage}%)")
                
                return JsonResponse({
                    'ok': True,
                    'progress': progress_percentage,
                    'status': status,
                    'current_stage': current_stage,
                    'description': description,
                    'total_images': total_count,
                    'completed_images': completed_count,
                    'analyzing_images': analyzing_count,
                    'preparing_images': preparing_count
                })
                
            except Exception as e:
                logger.error(f"進捗取得エラー: {e}")
                return JsonResponse({
                    'ok': False,
                    'error': str(e)
                }, status=500)
                
    except Exception as e:
        logger.error(f"進捗取得APIエラー: {e}")
        return JsonResponse({
            'ok': False,
            'error': str(e)
        }, status=500)


@require_GET
def api_image_detail(request: HttpRequest, image_id: int):
    """画像詳細取得API（最新の解析結果を含む）"""
    try:
        # 画像の存在確認
        try:
            image = TransUploadedImage.objects.get(image_id=image_id)
        except TransUploadedImage.DoesNotExist:
            return JsonResponse({'ok': False, 'error': '指定された画像が見つかりません'}, status=404)
        
        # 最新の解析結果を取得
        latest_results = image.get_previous_results()
        
        # 解析結果データを構築
        result_data = []
        for result in latest_results:
            result_data.append({
                'label': result.label,
                'confidence': float(result.confidence),
                'rank': result.rank,
                'model_name': result.model_name
            })
        
        # 画像詳細データを返す
        return JsonResponse({
            'ok': True,
            'image': {
                'image_id': image.image_id,
                'filename': image.filename,
                'status': image.status,
                'created_at': image.created_at.isoformat() if image.created_at else None,
                'analysis_started_at': image.analysis_started_at.isoformat() if image.analysis_started_at else None,
                'analysis_completed_at': image.analysis_completed_at.isoformat() if image.analysis_completed_at else None,
            },
            'results': result_data
        })
        
    except Exception as e:
        logger.error(f"画像詳細取得エラー: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)

