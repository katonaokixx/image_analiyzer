from __future__ import annotations
import os
import threading
from django.conf import settings
from django.db import transaction
from django.http import JsonResponse, HttpRequest, HttpResponseRedirect
from django.shortcuts import render, redirect
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_protect
from django.core.paginator import Paginator
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta

from .models import Image, MLModel, ProgressLog, TimelineLog, PasswordResetToken
from django.utils import timezone
from .services import analysis_service

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif'}
MAX_MB = 1
MAX_BYTES = MAX_MB * 1024 * 1024

# 認証関連のビュー
def login_view(request: HttpRequest):
    """ログインページ表示"""
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        
        if email and password:
            # メールアドレスでユーザーを検索
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(email=email)
                user = authenticate(request, username=user.username, password=password)
                if user is not None:
                    login(request, user)
                    # 管理者の場合は管理者ページへ、一般ユーザーは画像一覧へ
                    if user.is_staff:
                        return redirect('admin_image_table')
                    else:
                        return redirect('user_image_table')
                else:
                    messages.error(request, 'メールアドレスまたはパスワードが正しくありません。')
            except User.DoesNotExist:
                messages.error(request, 'メールアドレスまたはパスワードが正しくありません。')
        else:
            messages.error(request, 'メールアドレスとパスワードを入力してください。')
    
    return render(request, 'auth/login.html')

def signup_view(request: HttpRequest):
    """サインアップページ表示"""
    print(f"Signup view called with method: {request.method}")
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        is_admin = request.POST.get('is_admin') == 'on'
        
        print(f"Form data: username={username}, email={email}, is_admin={is_admin}")
        
        # バリデーション
        if not all([username, email, password, confirm_password]):
            print("Validation failed: missing fields")
            messages.error(request, 'すべての項目を入力してください。')
            return render(request, 'auth/signup.html')
        
        if password != confirm_password:
            print("Validation failed: password mismatch")
            messages.error(request, 'パスワードが一致しません。')
            return render(request, 'auth/signup.html')
        
        if len(password) < 6:
            print("Validation failed: password too short")
            messages.error(request, 'パスワードは6文字以上で入力してください。')
            return render(request, 'auth/signup.html')
        
        # ユーザー作成
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # 重複チェック
        if User.objects.filter(username=username).exists():
            print(f"Username already exists: {username}")
            return render(request, 'auth/signup.html', {'show_duplicate_modal': True, 'duplicate_type': 'username'})
        
        if User.objects.filter(email=email).exists():
            print(f"Email already exists: {email}")
            return render(request, 'auth/signup.html', {'show_duplicate_modal': True, 'duplicate_type': 'email'})
        
        try:
            print(f"Creating user: {username} with is_staff={is_admin}")
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_staff=is_admin
            )
            print(f"User created successfully: {user.id}")
            # 成功時にモーダルを表示するためのフラグを設定
            return render(request, 'auth/signup.html', {'show_success_modal': True})
        except Exception as e:
            print(f"User creation failed: {str(e)}")
            messages.error(request, f'アカウント作成に失敗しました: {str(e)}')
    
    return render(request, 'auth/signup.html')

def logout_view(request: HttpRequest):
    """ログアウト処理"""
    logout(request)
    messages.success(request, 'ログアウトしました。')
    return redirect('login')

def user_image_table(request: HttpRequest):
    """一般ユーザー用画像テーブル"""
    # ログイン認証チェック
    if not request.user.is_authenticated:
        messages.error(request, 'ログインが必要です。')
        return redirect('login')
    
    images = Image.objects.order_by('-upload_date')
    
    # ページネーション設定
    paginator = Paginator(images, 10)  # 10件/ページ
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'main/user_image_table.html', {
        'images': page_obj,  # ページネーションされたオブジェクト
        'page_obj': page_obj,  # ページネーション情報
        'has_data': images.exists(),
    })

def admin_image_table(request: HttpRequest):
    """管理者用画像テーブル"""
    # 管理者権限チェック
    if not request.user.is_authenticated:
        messages.error(request, 'ログインが必要です。')
        return redirect('login')
    
    if not request.user.is_staff:
        messages.error(request, '管理者権限が必要です。')
        return redirect('user_image_table')
    
    images = Image.objects.order_by('-upload_date')
    
    # View All機能のチェック
    view_all = request.GET.get('view_all', 'false').lower() == 'true'
    
    if view_all:
        # 全件表示
        return render(request, 'admin/admin_image_table.html', {
            'images': images,
            'page_obj': None,  # ページネーションなし
            'has_data': images.exists(),
            'view_all': True,
        })
    else:
        # ページネーション設定（10件/ページ）
        paginator = Paginator(images, 10)
        page_number = request.GET.get('page')
        page_obj = paginator.get_page(page_number)
        
        return render(request, 'admin/admin_image_table.html', {
            'images': page_obj,  # ページネーションされたオブジェクト
            'page_obj': page_obj,  # ページネーション情報
            'has_data': images.exists(),
            'view_all': False,
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
        
        # タイムラインログの作成・更新
        timeline_log, created = TimelineLog.objects.get_or_create(
            image=img,
            defaults={
                'upload_started_at': timezone.now(),
                'upload_completed_at': timezone.now()
            }
        )
        if not created:
            timeline_log.upload_completed_at = timezone.now()
            timeline_log.save()
        
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
    
    # 解析開始時のタイムライン記録
    for image in images:
        timeline_log, created = TimelineLog.objects.get_or_create(
            image=image,
            defaults={}
        )
        timeline_log.analysis_started_at = timezone.now()
        timeline_log.model_used = model_name
        timeline_log.save()

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


@require_GET
def api_get_timeline(request: HttpRequest, image_id: int):
    """画像のタイムラインデータを取得するAPI"""
    try:
        image = Image.objects.get(id=image_id)
        
        # タイムラインログを取得（存在しない場合は作成）
        timeline_log, created = TimelineLog.objects.get_or_create(
            image=image,
            defaults={}
        )
        
        # タイムラインデータを構築
        timeline_data = {
            'image_id': image.id,
            'filename': image.filename,
            'status': image.status,
            'upload_started_at': timeline_log.upload_started_at.isoformat() if timeline_log.upload_started_at else None,
            'upload_completed_at': timeline_log.upload_completed_at.isoformat() if timeline_log.upload_completed_at else None,
            'analysis_started_at': timeline_log.analysis_started_at.isoformat() if timeline_log.analysis_started_at else None,
            'analysis_completed_at': timeline_log.analysis_completed_at.isoformat() if timeline_log.analysis_completed_at else None,
            'model_used': timeline_log.model_used,
            'upload_duration': timeline_log.upload_duration,
            'analysis_duration': timeline_log.analysis_duration,
            'total_duration': timeline_log.total_duration,
        }
        
        return JsonResponse({
            'ok': True,
            'timeline': timeline_data
        })
        
    except Image.DoesNotExist:
        return JsonResponse({
            'ok': False,
            'error': '画像が見つかりません'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'ok': False,
            'error': f'タイムライン取得エラー: {str(e)}'
        }, status=500)


def save_file_and_create_image(uploaded_file):
    """アップロードされたファイルを保存してImageモデルを作成"""
    from django.core.files.storage import default_storage
    
    # ファイル保存ディレクトリを準備
    upload_dir = os.path.join(settings.MEDIA_ROOT, 'images')
    os.makedirs(upload_dir, exist_ok=True)
    
    # ファイル名を安全にする
    filename = uploaded_file.name
    name, ext = os.path.splitext(filename)
    safe_filename = secure_unique_filename(upload_dir, name, ext)
    
    # ファイルを保存
    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    
    # Imageモデルを作成
    image = Image.objects.create(
        filename=safe_filename,
        file_path=file_path,
        status='preparing'
    )
    
    return image

def secure_unique_filename(directory: str, base: str, ext: str) -> str:
    name = f"{base}{ext}"
    i = 1
    while os.path.exists(os.path.join(directory, name)):
        name = f"{base}_{i}{ext}"
        i += 1
    return name

# パスワードリセット関連のビュー
def password_reset_request_view(request):
    """パスワードリセットリクエスト画面"""
    if request.method == 'POST':
        email = request.POST.get('email')
        print(f"Password reset request for email: {email}")
        
        # ユーザーが存在するかチェック
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(email=email)
            print(f"User found: {user.username}")
            
            # 既存の未使用トークンを無効化
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
            
            # 新しいリセットトークンを生成
            reset_token = get_random_string(32)
            
            # データベースにトークンを保存
            token_obj = PasswordResetToken.objects.create(
                user=user,
                token=reset_token
            )
            
            # リセットURLを生成
            reset_url = request.build_absolute_uri(
                f"/password-reset/confirm/?token={reset_token}"
            )
            
            # メールテンプレートをレンダリング
            html_message = render_to_string('emails/password_reset.html', {
                'username': user.username,
                'reset_url': reset_url,
            })
            
            # メール送信
            try:
                send_mail(
                    subject='パスワードリセット - 画像解析アプリ',
                    message=f'パスワードリセットのリンク: {reset_url}',
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com'),
                    recipient_list=[email],
                    html_message=html_message,
                    fail_silently=False,
                )
                print(f"Password reset email sent to: {email}")
                print(f"Reset URL: {reset_url}")
                
                # 成功画面にリダイレクト
                return redirect('password_reset_success')
                
            except Exception as e:
                print(f"Failed to send email: {e}")
                messages.error(request, 'メール送信に失敗しました。しばらく時間をおいて再度お試しください。')
            
        except User.DoesNotExist:
            print(f"User not found for email: {email}")
            # セキュリティのため、ユーザーが存在しない場合でも成功メッセージを表示
            return redirect('password_reset_success')
    
    return render(request, 'auth/send_email_restpass.html')

def password_reset_confirm_view(request):
    """パスワードリセット確認画面"""
    # URLパラメータからトークンを取得
    token = request.GET.get('token')
    
    if not token:
        messages.error(request, '無効なリセットリンクです。')
        return redirect('password_reset_request')
    
    # トークンを検証
    try:
        token_obj = PasswordResetToken.objects.get(token=token)
        
        if not token_obj.is_valid:
            if token_obj.used:
                messages.error(request, 'このリセットリンクは既に使用されています。')
            elif token_obj.is_expired:
                messages.error(request, 'リセットリンクの有効期限が切れています。')
            else:
                messages.error(request, '無効なリセットリンクです。')
            return redirect('password_reset_request')
        
        user = token_obj.user
        
    except PasswordResetToken.DoesNotExist:
        messages.error(request, '無効なリセットリンクです。')
        return redirect('password_reset_request')
    
    if request.method == 'POST':
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        
        if password != confirm_password:
            messages.error(request, 'パスワードが一致しません。')
            return render(request, 'auth/password_reset.html', {'token': token})
        
        if len(password) < 6:
            messages.error(request, 'パスワードは6文字以上で入力してください。')
            return render(request, 'auth/password_reset.html', {'token': token})
        
        # パスワードを更新
        user.set_password(password)
        user.save()
        
        # トークンを使用済みとしてマーク
        token_obj.mark_as_used()
        
        messages.success(request, 'パスワードが正常に変更されました。')
        return render(request, 'auth/password_reset.html', {'token': token, 'show_success_modal': True})
    
    return render(request, 'auth/password_reset.html', {'token': token})

def password_reset_success_view(request):
    """パスワードリセットメール送信完了画面"""
    return render(request, 'auth/send_succefly_email.html')