from __future__ import annotations
import os
from django.conf import settings
from django.db import transaction
from django.http import JsonResponse, HttpRequest
from django.shortcuts import render
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_protect

from .models import Image

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
    ids = request.POST.getlist('ids[]') or request.POST.getlist('ids')
    if not ids:
        return JsonResponse({'ok': False, 'error': 'IDが指定されていません'}, status=400)
    updated = Image.objects.filter(id__in=ids).update(status='analyzing')
    return JsonResponse({'ok': True, 'updated': updated})

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

def secure_unique_filename(directory: str, base: str, ext: str) -> str:
    name = f"{base}{ext}"
    i = 1
    while os.path.exists(os.path.join(directory, name)):
        name = f"{base}_{i}{ext}"
        i += 1
    return name