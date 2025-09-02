from __future__ import annotations
import os
import threading
from django.conf import settings
from django.db import transaction
from django.http import JsonResponse, HttpRequest
from django.shortcuts import render
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_protect

from .models import Image, MLModel, ProgressLog
from .services import analysis_service

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif'}
MAX_MB = 1
MAX_BYTES = MAX_MB * 1024 * 1024

def user_image_table(request: HttpRequest):
    images = Image.objects.order_by('-upload_date')
    return render(request, 'main/user_image_table.html', {
        'images': images,
        'has_data': images.exists(),
    })

@csrf_protect
def image_upload(request: HttpRequest):
    return render(request, 'main/image_upload.html')

@require_POST
@csrf_protect
def api_form_upload(request: HttpRequest):
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
        img = save_file_and_create_image(f)
        saved.append(img)
    
    return JsonResponse({
        'ok': True,
        'files': [{
            'id': img.id,
            'name': img.filename,
            'size': os.path.getsize(img.file_path),
            'status': img.status
        } for img in saved]
    })

@require_POST
@csrf_protect
def api_start_analysis(request: HttpRequest):
    """解析開始API"""
    model_name = request.POST.get('model')
    image_id = request.POST.get('image_id')  # 個別画像ID（オプション）
    
    if not model_name:
        return JsonResponse({'ok': False, 'error': 'モデルが指定されていません'}, status=400)
    
    # 個別画像解析の場合
    if image_id:
        try:
            image = Image.objects.get(id=image_id, status='preparing')
        except Image.DoesNotExist:
            return JsonResponse({'ok': False, 'error': '指定された画像が見つからないか、解析対象ではありません'}, status=400)
        
        images = [image]
    else:
        # 一括解析の場合（既存の動作）
        images = Image.objects.filter(status='preparing').order_by('-upload_date')
        if not images.exists():
            return JsonResponse({'ok': False, 'error': '解析対象の画像が見つかりません'}, status=400)
    
    # バックグラウンドで解析を実行
    def run_analysis():
        try:
            if image_id:
                # 個別画像解析
                result = analysis_service.analyze_single_image(int(image_id), model_name)
            else:
                # 一括解析
                image_ids = [img.id for img in images]
                result = analysis_service.analyze_images_batch(image_ids, model_name)
            
            if not result['success']:
                print(f"解析エラー: {result['error']}")
        except Exception as e:
            print(f"解析実行エラー: {e}")
    
    # 別スレッドで解析を実行
    analysis_thread = threading.Thread(target=run_analysis)
    analysis_thread.daemon = True
    analysis_thread.start()
    
    return JsonResponse({
        'ok': True, 
        'message': '解析を開始しました',
        'total_images': len(images),
        'individual': bool(image_id)
    })

@require_GET
def api_analysis_progress(request: HttpRequest):
    """解析進捗取得API"""
    try:
        image_id = request.GET.get('image_id')
        
        if image_id:
            # 個別画像の進捗を取得
            try:
                image = Image.objects.get(id=image_id)
                latest_progress = ProgressLog.objects.filter(
                    image=image
                ).order_by('-timestamp').first()
                
                if latest_progress:
                    return JsonResponse({
                        'ok': True,
                        'progress': float(latest_progress.progress_percentage),
                        'status': image.status,
                        'current_stage': latest_progress.current_stage,
                        'description': latest_progress.stage_description
                    })
                else:
                    return JsonResponse({
                        'ok': True,
                        'progress': 0,
                        'status': image.status,
                        'current_stage': 'waiting',
                        'description': '解析待機中...'
                    })
            except Image.DoesNotExist:
                return JsonResponse({
                    'ok': False,
                    'error': '画像が見つかりません'
                }, status=404)
        else:
            # 全体の進捗を取得（既存の動作）
            progress_data = analysis_service.get_analysis_progress()
            return JsonResponse({
                'ok': True,
                'progress': progress_data.get('progress', 0),
                'status': progress_data.get('status', 'unknown'),
                'current_stage': progress_data.get('current_stage', ''),
                'description': progress_data.get('description', '')
            })
    except Exception as e:
        return JsonResponse({
            'ok': False,
            'error': str(e)
        }, status=500)

def validate_file(f) -> str | None:
    if f.size > MAX_BYTES:
        return f'サイズが {MAX_MB}MB を超えています'
    ext = os.path.splitext(f.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return f'未対応拡張子です ({ext})'
    return None

@transaction.atomic
def save_file_and_create_image(f):
    upload_dir = os.path.join(settings.MEDIA_ROOT, 'images')
    os.makedirs(upload_dir, exist_ok=True)
    base, ext = os.path.splitext(f.name)
    ext = ext.lower()
    filename = secure_unique_filename(upload_dir, base, ext)
    full_path = os.path.join(upload_dir, filename)
    with open(full_path, 'wb+') as dest:
        for chunk in f.chunks():
            dest.write(chunk)
    img = Image.objects.create(
        filename=filename,
        file_path=full_path,
        status='preparing'
    )
    return img

@require_POST
@csrf_protect
def api_update_status(request: HttpRequest):
    """画像ステータス更新API"""
    image_id = request.POST.get('image_id')
    status = request.POST.get('status')
    
    if not image_id or not status:
        return JsonResponse({
            'ok': False,
            'error': 'image_idとstatusが必要です'
        })
    
    try:
        image = Image.objects.get(id=image_id)
        image.status = status
        image.save()
        
        return JsonResponse({
            'ok': True,
            'message': f'ステータスを{status}に更新しました'
        })
    except Image.DoesNotExist:
        return JsonResponse({
            'ok': False,
            'error': '画像が見つかりません'
        })
    except Exception as e:
        return JsonResponse({
            'ok': False,
            'error': f'ステータス更新エラー: {str(e)}'
        })

def secure_unique_filename(directory: str, base: str, ext: str) -> str:
    name = f"{base}{ext}"
    i = 1
    while os.path.exists(os.path.join(directory, name)):
        name = f"{base}_{i}{ext}"
        i += 1
    return name