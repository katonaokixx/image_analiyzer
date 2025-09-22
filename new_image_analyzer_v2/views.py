from __future__ import annotations
import os
import threading
from django.conf import settings
from django.db import transaction
from django.http import JsonResponse, HttpRequest, HttpResponseRedirect
from django.shortcuts import render, redirect
from django.views.decorators.http import require_POST, require_GET, require_http_methods
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

# 新しいモデルをインポート
from .models import MstUser, TransUploadedImage, TransImageAnalysis, TransAnalysisTimeline
from django.utils import timezone
# 既存のサービスをインポート（後で新しいモデル用に修正）
from image_analyzer.services import analysis_service
# 既存のモデルもインポート（認証用）
from image_analyzer.models import PasswordResetToken

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
    """ファイルを保存して新しいモデルで画像レコードを作成"""
    # ファイル名を生成
    filename = f"{timezone.now().strftime('%Y%m%d_%H%M%S')}_{file.name}"
    file_path = os.path.join(settings.MEDIA_ROOT, 'images', filename)
    
    print(f"DEBUG: ファイル名: {filename}")
    print(f"DEBUG: ファイルパス: {file_path}")
    
    # ディレクトリを作成
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # ファイルを保存
    with open(file_path, 'wb') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    
    print(f"DEBUG: ファイル保存完了: {file_path}")
    print(f"DEBUG: ファイル存在確認: {os.path.exists(file_path)}")
    
    # 既存のUserからMstUserを取得または作成
    mst_user, created = MstUser.objects.get_or_create(
        username=user.username,
        defaults={
            'email': user.email,
            'is_admin': user.is_staff,
            'is_active': user.is_active,
        }
    )
    
    print(f"DEBUG: MstUser: {mst_user.username} (created: {created})")
    
    # 新しいモデルで画像レコードを作成
    img = TransUploadedImage.objects.create(
        user_id=mst_user,  # MstUserのインスタンスを渡す
        filename=filename,
        file_path=file_path,
        upload_date=timezone.now(),
        status='uploaded'
    )
    
    print(f"DEBUG: TransUploadedImage作成完了: ID={img.image_id}")
    
    return img

# 認証関連のビュー（既存の認証システムを使用）
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
                        return redirect('v2_admin_image_table')
                    else:
                        return redirect('v2_user_image_table')
                else:
                    messages.error(request, 'メールアドレスまたはパスワードが正しくありません。')
            except User.DoesNotExist:
                messages.error(request, 'メールアドレスまたはパスワードが正しくありません。')
        else:
            messages.error(request, 'メールアドレスとパスワードを入力してください。')
    
    return render(request, 'auth/login.html')

def signup_view(request: HttpRequest):
    """サインアップページ表示"""
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        password_confirm = request.POST.get('password_confirm')
        
        if password != password_confirm:
            messages.error(request, 'パスワードが一致しません。')
            return render(request, 'image_analyzer/signup.html')
        
        if username and email and password:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
                )
                # 新しいMstUserも作成
                MstUser.objects.create(
                    username=username,
                    email=email,
                    is_admin=False,
                    is_active=True
                )
                messages.success(request, 'アカウントが作成されました。ログインしてください。')
                return redirect('v2_login')
            except Exception as e:
                messages.error(request, f'アカウント作成に失敗しました: {str(e)}')
        else:
            messages.error(request, 'すべてのフィールドを入力してください。')
    
    return render(request, 'auth/signup.html')

def logout_view(request: HttpRequest):
    """ログアウト"""
    logout(request)
    messages.success(request, 'ログアウトしました。')
    return redirect('v2_login')

def password_reset_request_view(request: HttpRequest):
    """パスワードリセット要求"""
    if request.method == 'POST':
        email = request.POST.get('email')
        if email:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(email=email)
                # パスワードリセットトークン生成
                token = get_random_string(32)
                PasswordResetToken.objects.create(
                    user=user,
                    token=token,
                    expires_at=timezone.now() + timedelta(hours=1)
                )
                
                # メール送信
                reset_url = f"{request.build_absolute_uri('/')}v2/password-reset/confirm/?token={token}"
                send_mail(
                    'パスワードリセット',
                    f'パスワードリセットのリンク: {reset_url}',
                    settings.EMAIL_HOST_USER,
                    [email],
                    fail_silently=False,
                )
                messages.success(request, 'パスワードリセットのメールを送信しました。')
            except User.DoesNotExist:
                messages.error(request, 'このメールアドレスは登録されていません。')
        else:
            messages.error(request, 'メールアドレスを入力してください。')
    
    return render(request, 'auth/password_reset.html')

def password_reset_confirm_view(request: HttpRequest):
    """パスワードリセット確認"""
    token = request.GET.get('token')
    if not token:
        messages.error(request, '無効なトークンです。')
        return redirect('v2_password_reset_request')
    
    try:
        reset_token = PasswordResetToken.objects.get(token=token, expires_at__gt=timezone.now())
        if request.method == 'POST':
            password = request.POST.get('password')
            password_confirm = request.POST.get('password_confirm')
            
            if password == password_confirm:
                reset_token.user.set_password(password)
                reset_token.user.save()
                reset_token.delete()
                messages.success(request, 'パスワードがリセットされました。')
                return redirect('v2_login')
            else:
                messages.error(request, 'パスワードが一致しません。')
        
        return render(request, 'auth/send_email_restpass.html', {'token': token})
    except PasswordResetToken.DoesNotExist:
        messages.error(request, 'トークンの有効期限が切れています。')
        return redirect('v2_password_reset_request')

def password_reset_success_view(request: HttpRequest):
    """パスワードリセット成功"""
    return render(request, 'auth/send_succefly_email.html')

# メイン機能のビュー（新しいモデルを使用）
@login_required
def user_image_table(request: HttpRequest):
    """ユーザー画像テーブル表示（新しいモデル使用）"""
    # ログイン認証チェック
    if not request.user.is_authenticated:
        messages.error(request, 'ログインが必要です。')
        return redirect('v2_login')
    
    # 新しいモデルを使用して画像を取得
    try:
        # 既存のUserからMstUserを取得
        mst_user = MstUser.objects.get(username=request.user.username)
        images = TransUploadedImage.objects.filter(user_id=mst_user).order_by('-upload_date')
    except MstUser.DoesNotExist:
        # MstUserが存在しない場合は空のクエリセット
        images = TransUploadedImage.objects.none()
    
    # ページネーション設定
    paginator = Paginator(images, 10)  # 10件/ページ
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # テンプレートに渡すデータ
    images_list = list(page_obj.object_list)
    context = {
        'page_obj': page_obj,
        'images': images_list,  # リストに変換してテンプレートでインデックスアクセス可能にする
        'has_data': len(images_list) > 0,  # データがあるかどうかのフラグ
        'user': request.user,
    }
    
    return render(request, 'main/user_image_table.html', context)

@login_required
def admin_image_table(request: HttpRequest):
    """管理者画像テーブル表示（新しいモデル使用）"""
    # 管理者権限チェック
    if not request.user.is_staff:
        messages.error(request, '管理者権限が必要です。')
        return redirect('v2_user_image_table')
    
    # 新しいモデルを使用して画像を取得
    images = TransUploadedImage.objects.all().order_by('-upload_date')
    users = MstUser.objects.all().order_by('username')
    
    # View All機能のチェック
    view_all = request.GET.get('view_all', 'false').lower() == 'true'
    
    if view_all:
        # 全ユーザーの画像を表示
        filtered_images = images
    else:
        # ログインユーザーの画像のみ表示
        try:
            mst_user = MstUser.objects.get(username=request.user.username)
            filtered_images = images.filter(user_id=mst_user)
        except MstUser.DoesNotExist:
            filtered_images = TransUploadedImage.objects.none()
    
    # ページネーション設定
    paginator = Paginator(filtered_images, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'users': users,
        'view_all': view_all,
        'user': request.user,
    }
    
    return render(request, 'admin/admin_image_table.html', context)

def image_upload(request: HttpRequest):
    """画像アップロードページ表示"""
    # ログイン認証チェック
    if not request.user.is_authenticated:
        messages.error(request, 'ログインが必要です。')
        return redirect('v2_login')
    
    # 新しいモデルを使用して画像を取得
    try:
        # 既存のUserからMstUserを取得
        mst_user = MstUser.objects.get(username=request.user.username)
        uploaded_images = TransUploadedImage.objects.filter(user_id=mst_user).order_by('-upload_date')
    except MstUser.DoesNotExist:
        # MstUserが存在しない場合は空のクエリセット
        uploaded_images = TransUploadedImage.objects.none()
    
    # 選択されたモデルを取得
    selected_model = request.session.get('selected_model', '')
    has_uploaded_images = len(uploaded_images) > 0
    has_selected_model = bool(selected_model)
    
    # 解析状態を取得（最新の画像の状態）
    analysis_status = None
    if uploaded_images:
        latest_image = uploaded_images.first()
        analysis_status = latest_image.status
    
    # アップロード済み画像の情報をJSON形式で準備
    uploaded_images_json = []
    for img in uploaded_images:
        uploaded_images_json.append({
            'id': img.image_id,
            'filename': img.filename,
            'thumbnail_url': f'/uploads/images/{img.filename}',
            'status': img.status
        })
    
    # JSON文字列として変換
    import json
    uploaded_images_json_str = json.dumps(uploaded_images_json)
    
    context = {
        'uploaded_images': uploaded_images,
        'selected_model': selected_model,
        'has_uploaded_images': has_uploaded_images,
        'has_selected_model': has_selected_model,
        'show_analysis_button': has_uploaded_images and has_selected_model,
        'show_timeline': has_uploaded_images,
        'analysis_status': analysis_status,
        'uploaded_images_json': uploaded_images_json_str
    }
    
    return render(request, 'main/image_upload.html', context)

@csrf_protect
@login_required
def re_image_upload(request: HttpRequest):
    """再解析専用ページ（新しいモデル使用）"""
    import logging
    logger = logging.getLogger(__name__)
    
    # 最初に必ずログを出力
    print("=" * 50)
    print("DEBUG: re_image_upload view called")
    print(f"DEBUG: request.method = {request.method}")
    print(f"DEBUG: request.GET = {request.GET}")
    print(f"DEBUG: request.user = {request.user}")
    print(f"DEBUG: request.user.is_authenticated = {request.user.is_authenticated}")
    
    logger.info("=" * 50)
    logger.info("DEBUG: re_image_upload view called")
    logger.info(f"DEBUG: request.method = {request.method}")
    logger.info(f"DEBUG: request.GET = {request.GET}")
    logger.info(f"DEBUG: request.user = {request.user}")
    logger.info(f"DEBUG: request.user.is_authenticated = {request.user.is_authenticated}")
    
    # ログイン認証チェック
    if not request.user.is_authenticated:
        print("DEBUG: User not authenticated, redirecting to login")
        logger.info("DEBUG: User not authenticated, redirecting to login")
        messages.error(request, 'ログインが必要です。')
        return redirect('v2_login')
    
    # セッションから選択された画像IDと状態を取得（バッジクリック時）
    # GETパラメータからも取得可能にする
    selected_image_id = request.GET.get('selected_image_id') or request.session.get('selected_image_id')
    selected_image_status = request.session.get('selected_image_status')
    
    print(f"DEBUG: selected_image_id = {selected_image_id}")
    print(f"DEBUG: selected_image_status = {selected_image_status}")
    logger.info(f"DEBUG: selected_image_id = {selected_image_id}")
    logger.info(f"DEBUG: selected_image_status = {selected_image_status}")
    
    selected_image = None
    if selected_image_id:
        print(f"DEBUG: Processing selected_image_id = {selected_image_id}")
        try:
            # 新しいモデルを使用
            mst_user = MstUser.objects.get(username=request.user.username)
            print(f"DEBUG: Found mst_user = {mst_user}")
            selected_image = TransUploadedImage.objects.get(image_id=selected_image_id, user_id=mst_user)
            selected_image_status = selected_image.status  # 画像の状態を設定
            print(f"DEBUG: selected_image found = {selected_image.filename}, status = {selected_image.status}")
            logger.info(f"DEBUG: selected_image found = {selected_image.filename}, status = {selected_image.status}")
        except (TransUploadedImage.DoesNotExist, MstUser.DoesNotExist) as e:
            selected_image = None
            print(f"DEBUG: Image not found for ID {selected_image_id}, error: {e}")
            logger.info(f"DEBUG: Image not found for ID {selected_image_id}, error: {e}")
            # 画像が存在しない場合はセッションをクリア
            if 'selected_image_id' in request.session:
                del request.session['selected_image_id']
            if 'selected_image_status' in request.session:
                del request.session['selected_image_status']
    else:
        print("DEBUG: No selected_image_id in session")
        logger.info("DEBUG: No selected_image_id in session")
        # セッションに画像IDがない場合は、最新の画像を取得
        try:
            mst_user = MstUser.objects.get(username=request.user.username)
            selected_image = TransUploadedImage.objects.filter(user_id=mst_user).order_by('-upload_date').first()
            if selected_image:
                selected_image_status = selected_image.status
                print(f"DEBUG: Using latest image as fallback: {selected_image.filename}, status = {selected_image.status}")
                logger.info(f"DEBUG: Using latest image as fallback: {selected_image.filename}, status = {selected_image.status}")
        except Exception as e:
            print(f"DEBUG: Error getting latest image: {e}")
            logger.info(f"DEBUG: Error getting latest image: {e}")
    
    # selected_image_statusがNoneの場合は、selected_imageの状態を使用
    if selected_image and selected_image_status is None:
        selected_image_status = selected_image.status
        print(f"DEBUG: selected_image_status was None, using image status: {selected_image_status}")
        logger.info(f"DEBUG: selected_image_status was None, using image status: {selected_image_status}")
    
    print(f"DEBUG: selected_image_status = {selected_image_status}")
    logger.info(f"DEBUG: selected_image_status = {selected_image_status}")
    
    # タイムライン情報を取得
    print("DEBUG: Getting timeline information")
    timeline_log = None
    if selected_image:
        try:
            timeline_log = TransAnalysisTimeline.objects.get(image_id=selected_image)
            print(f"DEBUG: Found timeline_log = {timeline_log}")
        except TransAnalysisTimeline.DoesNotExist:
            timeline_log = None
            print("DEBUG: No timeline_log found")
    else:
        print("DEBUG: No selected_image, skipping timeline")
    
    # 前回の解析結果を取得（v1と同じロジック）
    print("DEBUG: Getting previous analysis results")
    previous_results = []
    if selected_image:
        try:
            # 最新の解析結果を取得（上位3件まで）
            previous_results = TransImageAnalysis.objects.filter(image_id=selected_image).order_by('-confidence')[:3]
            print(f"DEBUG: previous_results count = {previous_results.count()}")
            for i, result in enumerate(previous_results):
                print(f"DEBUG: previous_results[{i}] = {result.label} ({result.confidence}%)")
            logger.info(f"DEBUG: previous_results count = {previous_results.count()}")
            for i, result in enumerate(previous_results):
                logger.info(f"DEBUG: previous_results[{i}] = {result.label} ({result.confidence}%)")
        except Exception as e:
            print(f"DEBUG: Error getting previous_results: {e}")
            logger.info(f"DEBUG: Error getting previous_results: {e}")
            previous_results = []
    else:
        print("DEBUG: No selected_image, skipping previous_results")
    
    # 解析完了済みの場合のみ、3つ目のタイムライン（解析完了）に前回の解析結果を表示
    print("DEBUG: Setting timeline description")
    if timeline_log and previous_results and selected_image_status == 'completed':
        print("DEBUG: All conditions met for timeline description")
        results_text = "直近の解析結果: "
        for i, r in enumerate(previous_results):
            # 新しいモデルの構造に合わせて調整
            label = r.label if r.label else 'Unknown'
            confidence = float(r.confidence) if r.confidence else 0
            results_text += f"{i+1}位: {label} ({confidence:.1f}%)"
            if i < len(previous_results) - 1:
                results_text += " / "
        print(f"DEBUG: results_text = {results_text}")
        # v1と同じフィールド名を使用
        timeline_log.completion_step_description = results_text
        timeline_log.save()
        logger.info("DEBUG: Timeline description saved to completion_step_description field")
        # データベースから再取得して最新の値を確認
        timeline_log.refresh_from_db()
        logger.info(f"DEBUG: timeline_log.completion_step_description after save = {timeline_log.completion_step_description}")
        logger.info(f"DEBUG: Set timeline description = {results_text}")
    else:
        print(f"DEBUG: Timeline description conditions not met: timeline_log={timeline_log is not None}, previous_results={len(previous_results) if previous_results else 0}, status={selected_image_status}")
    
    # デバッグ情報を追加
    print("DEBUG: Final debug information")
    print(f"DEBUG: selected_image = {selected_image}")
    if selected_image:
        print(f"DEBUG: selected_image.filename = {selected_image.filename}")
        print(f"DEBUG: selected_image.thumbnail_url = {selected_image.thumbnail_url}")
        print(f"DEBUG: selected_image.file_path = {selected_image.file_path}")
        print(f"DEBUG: selected_image.image_id = {selected_image.image_id}")
    else:
        print("DEBUG: selected_image is None")
    
    print(f"DEBUG: timeline_log = {timeline_log}")
    if timeline_log:
        print(f"DEBUG: timeline_log.previous_results = '{timeline_log.previous_results}'")
        print(f"DEBUG: timeline_log.previous_results type = {type(timeline_log.previous_results)}")
        print(f"DEBUG: timeline_log.previous_results length = {len(timeline_log.previous_results) if timeline_log.previous_results else 0}")
        print(f"DEBUG: timeline_log.previous_results bool = {bool(timeline_log.previous_results)}")
        print(f"DEBUG: timeline_log.analysis_status = {timeline_log.analysis_status}")
    print(f"DEBUG: previous_results count = {len(previous_results) if previous_results else 0}")
    
    logger.info(f"DEBUG: selected_image = {selected_image}")
    if selected_image:
        logger.info(f"DEBUG: selected_image.filename = {selected_image.filename}")
        logger.info(f"DEBUG: selected_image.thumbnail_url = {selected_image.thumbnail_url}")
        logger.info(f"DEBUG: selected_image.file_path = {selected_image.file_path}")
        logger.info(f"DEBUG: selected_image.image_id = {selected_image.image_id}")
    else:
        logger.info("DEBUG: selected_image is None")
    
    context = {
        'selected_image': selected_image,
        'selected_image_status': selected_image_status,
        'timeline_log': timeline_log,
        # 直近の解析結果（上位3件まで）をテンプレートに渡す
        'previous_results': previous_results,
    }
    
    logger.info("DEBUG: Rendering template")
    return render(request, 'main/re_image_upload.html', context)

# API ビュー（新しいモデルを使用）
@require_POST
@csrf_protect
def api_form_upload(request: HttpRequest):
    """画像アップロードAPI（新しいモデル使用）"""
    print("DEBUG: === アップロードAPI開始 ===")
    print(f"DEBUG: ユーザー: {request.user}")
    print(f"DEBUG: 認証状態: {request.user.is_authenticated}")
    
    if not request.user.is_authenticated:
        print("DEBUG: 認証エラー")
        return JsonResponse({'ok': False, 'errors': ['ログインが必要です']}, status=401)
    
    # Dropzoneからの直接ファイル送信に対応
    files = request.FILES.getlist('file')  # Dropzoneは 'file' で送信
    if not files:
        files = request.FILES.getlist('files')  # フォールバック: 'files' も試す
    
    print(f"DEBUG: Found {len(files)} files")
    for i, file in enumerate(files):
        print(f"DEBUG: ファイル{i+1}: {file.name}, サイズ: {file.size}")
    
    if not files:
        print("DEBUG: ファイルが選択されていません")
        return JsonResponse({'ok': False, 'errors': ['ファイルが選択されていません']}, status=400)
    
    # 個別ファイルバリデーション
    errors = []
    valid_files = []
    
    for f in files:
        print(f"DEBUG: ファイル検証開始: {f.name}")
        error = validate_file(f)
        if error:
            print(f"DEBUG: 検証エラー: {f.name} - {error}")
            errors.append(f'{f.name}: {error}')
        else:
            print(f"DEBUG: 検証成功: {f.name}")
            valid_files.append(f)
    
    if errors:
        print(f"DEBUG: 検証エラー: {errors}")
        return JsonResponse({'ok': False, 'errors': errors}, status=400)
    
    # ファイル保存
    saved = []
    for f in valid_files:
        print(f"DEBUG: ファイル保存開始: {f.name}")
        try:
            # 新しいモデルを使用して画像を保存
            img = save_file_and_create_image_v2(f, request.user)
            print(f"DEBUG: 画像保存成功: {img.image_id}, {img.filename}")
            
            # タイムラインログの作成・更新（解析ステップは保留）
            timeline, created = TransAnalysisTimeline.objects.get_or_create(
                image_id=img,
                defaults={
                    'analysis_status': 'uploaded',
                    'previous_results': None,
                }
            )
            if not created:
                timeline.analysis_status = 'uploaded'
                timeline.previous_results = None
                timeline.save()
            
            saved.append(img)
            print(f"DEBUG: タイムライン作成完了: {timeline.timeline_id}")
        except Exception as e:
            print(f"DEBUG: ファイル保存エラー: {f.name} - {str(e)}")
            errors.append(f'{f.name}: 保存エラー - {str(e)}')
    
    # エラーハンドリング
    if not saved:
        print("DEBUG: 保存できたファイルがありません")
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
        response_data.append({
            'id': img.image_id,
            'filename': img.filename,
            'thumbnail_url': f'/uploads/images/{img.filename}',
            'status': img.status
        })
    
    print(f"DEBUG: レスポンス準備完了: {len(response_data)}件")
    for img_data in response_data:
        print(f"DEBUG: Response image: {img_data}")
    
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
    import logging
    logger = logging.getLogger(__name__)
    
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
            
            # 再解析の場合、古い解析結果を削除
            if image.status == 'completed':
                logger.info(f"再解析のため、古い解析結果を削除: 画像ID={image.image_id}")
                old_results = TransImageAnalysis.objects.filter(image_id=image)
                deleted_count = old_results.count()
                old_results.delete()
                logger.info(f"削除された解析結果数: {deleted_count}")
            
            # 解析開始時にタイムライン情報を保存
            timeline_log, created = TransAnalysisTimeline.objects.get_or_create(
                image_id=image,
                defaults={
                    'analysis_started_at': timezone.now(),
                    'analysis_step_title': '解析開始',
                    'analysis_step_description': 'AIによる画像解析を開始しました。',
                    'analysis_step_status': '解析中',
                    'analysis_step_icon': 'brain',
                    'analysis_step_color': 'warning',
                    'analysis_progress_percentage': 0,
                    'analysis_progress_stage': 'preparing'
                }
            )
            if not created:
                timeline_log.analysis_started_at = timezone.now()
                timeline_log.analysis_step_title = '解析開始'
                timeline_log.analysis_step_description = 'AIによる画像解析を開始しました。'
                timeline_log.analysis_step_status = '解析中'
                timeline_log.analysis_step_icon = 'brain'
                timeline_log.analysis_step_color = 'warning'
                timeline_log.analysis_progress_percentage = 0
                timeline_log.analysis_progress_stage = 'preparing'
                timeline_log.save()
            
            # 画像のステータスを準備中に更新
            image.status = 'preparing'
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
            ).order_by('-upload_date')
            
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

def process_single_image_analysis(image_id, model_name):
    """個別画像の解析処理"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        image = TransUploadedImage.objects.get(image_id=image_id)
        
        # ステータスを解析中に更新
        image.status = 'analyzing'
        image.save()
        
        # タイムラインを更新
        timeline = TransAnalysisTimeline.objects.filter(image_id=image).first()
        if timeline:
            timeline.analysis_step_title = 'AI解析実行中'
            timeline.analysis_step_description = f'{model_name}モデルで画像を解析しています...'
            timeline.analysis_step_status = '解析中'
            timeline.analysis_progress_percentage = 50
            timeline.analysis_progress_stage = 'analyzing'
            timeline.save()
        
        # 既存の解析結果を削除（重複を防ぐ）
        TransImageAnalysis.objects.filter(image_id=image).delete()
        logger.info(f"既存の解析結果を削除しました: 画像ID={image.image_id}")
        
        # 実際の解析処理（ここでは簡単な例）
        analysis_results = perform_image_analysis(image, model_name)
        
        # 解析結果を保存
        for i, result in enumerate(analysis_results):
            TransImageAnalysis.objects.create(
                image_id=image,
                label=result.get('label', 'Unknown'),
                confidence=result.get('confidence', 0.0),
                model_name=result.get('model_name', 'unknown'),
                rank=i + 1,
                analysis_started_at=timezone.now(),
                analysis_completed_at=timezone.now()
            )
        
        # ステータスを完了に更新
        image.status = 'completed'
        image.save()
        
        # タイムラインを完了に更新
        if timeline:
            timeline.analysis_step_title = '解析完了'
            timeline.analysis_step_description = '画像の解析が正常に完了しました。'
            timeline.analysis_step_status = '完了'
            timeline.analysis_step_icon = 'check-circle'
            timeline.analysis_step_color = 'success'
            timeline.analysis_progress_percentage = 100
            timeline.analysis_progress_stage = 'completed'
            timeline.analysis_completed_at = timezone.now()
            timeline.save()
        
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

def perform_image_analysis(image, model_name):
    """実際の画像解析処理（v1のanalysis_serviceを使用）"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"画像解析開始: ファイルパス={image.file_path}, モデル={model_name}")
        
        # v1のanalysis_serviceを使用して画像解析を実行
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
                'confidence': float(result.get('confidence', 0.0)),  # 既にパーセンテージ
                'model_name': model_name,
                'rank': result.get('rank', i + 1)
            }
            converted_results.append(converted_result)
            logger.info(f"変換後結果{i+1}: {converted_result}")
        
        logger.info(f"変換完了: 最終結果数={len(converted_results)}")
        return converted_results
        
    except Exception as e:
        logger.error(f"個別画像解析エラー: {e}")
        print(f"個別画像解析エラー: {e}")
        # エラー時はサンプルデータを返す
        return [
            {
                'label': 'Unknown',
                'confidence': 0.0,
                'model_name': model_name,
                'rank': 1
            }
        ]

@require_GET
def api_analysis_progress(request: HttpRequest):
    """解析進捗API"""
    import logging
    logger = logging.getLogger(__name__)
    
    image_id = request.GET.get('image_id')
    logger.info(f"進捗API呼び出し: image_id={image_id}")
    
    try:
        if image_id:
            # 個別画像の進捗を取得
            try:
                image = TransUploadedImage.objects.get(image_id=image_id)
                timeline = TransAnalysisTimeline.objects.filter(image_id=image).first()
                
                if timeline:
                    # 画像のステータスに基づいて進捗を決定
                    if image.status == 'completed':
                        progress_percentage = 100
                        progress_stage = 'completed'
                        step_title = '解析完了'
                        step_description = '画像解析が正常に完了しました'
                        step_icon = 'check'
                        step_color = 'success'
                    elif image.status == 'analyzing':
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
                    
                    progress_data = {
                        'image_id': image.image_id,
                        'status': image.status,
                        'progress_percentage': progress_percentage,
                        'progress_stage': progress_stage,
                        'step_title': step_title,
                        'step_description': step_description,
                        'step_status': timeline.analysis_status,
                        'step_icon': step_icon,
                        'step_color': step_color,
                        'started_at': None,
                        'completed_at': None
                    }
                else:
                    progress_data = {
                        'image_id': image.image_id,
                        'status': image.status,
                        'progress_percentage': 0,
                        'progress_stage': 'waiting',
                        'step_title': '待機中',
                        'step_description': '解析の準備をしています...',
                        'step_status': '待機中',
                        'step_icon': 'clock',
                        'step_color': 'info',
                        'started_at': None,
                        'completed_at': None
                    }
                
                return JsonResponse(progress_data)
                
            except TransUploadedImage.DoesNotExist:
                return JsonResponse({'status': 'error', 'error': '指定された画像が見つかりません'}, status=404)
        
        else:
            # セッション画像の一括進捗を取得
            uploaded_image_ids = request.session.get('uploaded_image_ids', [])
            if not uploaded_image_ids:
                return JsonResponse({
                    'status': 'waiting',
                    'progress_percentage': 0,
                    'progress_stage': 'waiting'
                })
            
            # 最新の画像の進捗を取得
            try:
                latest_image = TransUploadedImage.objects.filter(image_id__in=uploaded_image_ids).order_by('-upload_date').first()
                if not latest_image:
                    return JsonResponse({
                        'status': 'waiting',
                        'progress_percentage': 0,
                        'progress_stage': 'waiting'
                    })
                
                timeline = TransAnalysisTimeline.objects.filter(image_id=latest_image).first()
                
                if timeline:
                    # 画像のステータスに基づいて進捗を決定
                    if latest_image.status == 'completed':
                        progress_percentage = 100
                        progress_stage = 'completed'
                        step_title = '解析完了'
                        step_description = '画像解析が正常に完了しました'
                        step_icon = 'check'
                        step_color = 'success'
                    elif latest_image.status == 'analyzing':
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
                    
                    progress_data = {
                        'image_id': latest_image.image_id,
                        'status': latest_image.status,
                        'progress_percentage': progress_percentage,
                        'progress_stage': progress_stage,
                        'step_title': step_title,
                        'step_description': step_description,
                        'step_status': timeline.analysis_status,
                        'step_icon': step_icon,
                        'step_color': step_color,
                        'started_at': None,
                        'completed_at': None
                    }
                else:
                    progress_data = {
                        'image_id': latest_image.image_id,
                        'status': latest_image.status,
                        'progress_percentage': 0,
                        'progress_stage': 'waiting',
                        'step_title': '待機中',
                        'step_description': '解析の準備をしています...',
                        'step_status': '待機中',
                        'step_icon': 'clock',
                        'step_color': 'info',
                        'started_at': None,
                        'completed_at': None
                    }
                
                return JsonResponse(progress_data)
                
            except Exception as e:
                logger.error(f"セッション画像進捗取得エラー: {e}")
                return JsonResponse({
                    'status': 'error',
                    'error': str(e)
                }, status=500)
    
    except Exception as e:
        logger.error(f"進捗取得エラー: {e}")
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)

@require_POST
@csrf_protect
def api_complete_analysis(request: HttpRequest):
    """解析完了API"""
    import logging
    import json
    logger = logging.getLogger(__name__)
    
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
        
        # 画像のステータスを完了に更新
        image.status = 'completed'
        image.save()
        
        # タイムラインを完了に更新
        timeline = TransAnalysisTimeline.objects.filter(image_id=image).first()
        if timeline:
            timeline.analysis_step_title = '解析完了'
            timeline.analysis_step_description = f'{len(saved_results)}件の解析結果が保存されました。'
            timeline.analysis_step_status = '完了'
            timeline.analysis_step_icon = 'check-circle'
            timeline.analysis_step_color = 'success'
            timeline.analysis_progress_percentage = 100
            timeline.analysis_progress_stage = 'completed'
            timeline.analysis_completed_at = timezone.now()
            timeline.save()
        
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
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # 画像の存在確認
        try:
            image = TransUploadedImage.objects.get(image_id=image_id)
        except TransUploadedImage.DoesNotExist:
            return JsonResponse({'ok': False, 'error': '指定された画像が見つかりません'}, status=404)
        
        # タイムライン情報を取得
        timeline = TransAnalysisTimeline.objects.filter(image_id=image).first()
        
        if timeline:
            # 画像のステータスに基づいて進捗を決定
            if image.status == 'completed':
                progress_percentage = 100
                progress_stage = 'completed'
                step_title = '解析完了'
                step_description = '画像解析が正常に完了しました'
                step_icon = 'check'
                step_color = 'success'
            elif image.status == 'analyzing':
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
                'analysis_started_at': None,
                'analysis_completed_at': None,
                'current_step': {
                    'title': step_title,
                    'description': step_description,
                    'status': timeline.analysis_status,
                    'icon': step_icon,
                    'color': step_color
                },
                'progress': {
                    'percentage': progress_percentage,
                    'stage': progress_stage
                },
                'model_used': '未指定'
            }
        else:
            # タイムライン情報がない場合のデフォルト値
            timeline_data = {
                'image_id': image.image_id,
                'filename': image.filename,
                'status': image.status,
                'analysis_started_at': None,
                'analysis_completed_at': None,
                'current_step': {
                    'title': '待機中',
                    'description': '解析の準備をしています...',
                    'status': '待機中',
                    'icon': 'clock',
                    'color': 'info'
                },
                'progress': {
                    'percentage': 0,
                    'stage': 'waiting'
                },
                'model_used': '未指定'
            }
        
        # 解析結果も取得
        analysis_results = TransImageAnalysis.objects.filter(image_id=image).order_by('-created_at')
        results_data = []
        
        for result in analysis_results:
            results_data.append({
                'analysis_id': result.analysis_id,
                'label': result.label,
                'confidence': result.confidence,
                'model_name': result.model_name,
                'rank': result.rank,
                'created_at': result.created_at.isoformat()
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
    """画像削除API"""
    import logging
    import os
    logger = logging.getLogger(__name__)
    
    try:
        # 画像の存在確認
        try:
            image = TransUploadedImage.objects.get(image_id=image_id)
        except TransUploadedImage.DoesNotExist:
            return JsonResponse({'ok': False, 'error': '指定された画像が見つかりません'}, status=404)
        
        # ファイルパスを取得
        file_path = image.file_path
        
        # 関連データを削除
        deleted_count = 0
        
        # 解析結果を削除
        analysis_results = TransImageAnalysis.objects.filter(image_id=image)
        analysis_count = analysis_results.count()
        analysis_results.delete()
        deleted_count += analysis_count
        
        # タイムライン情報を削除
        timeline_results = TransAnalysisTimeline.objects.filter(image_id=image)
        timeline_count = timeline_results.count()
        timeline_results.delete()
        deleted_count += timeline_count
        
        # 画像レコードを削除
        image.delete()
        deleted_count += 1
        
        # 物理ファイルを削除
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"物理ファイルを削除: {file_path}")
            except Exception as e:
                logger.warning(f"物理ファイル削除エラー: {e}")
        
        logger.info(f"画像削除完了: ID={image_id}, 削除レコード数={deleted_count}")
        
        return JsonResponse({
            'ok': True,
            'message': f'画像と関連データを削除しました（{deleted_count}件のレコードを削除）'
        })
        
    except Exception as e:
        logger.error(f"画像削除エラー: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)

# キュー管理ビュー（新しいモデルを使用）
@login_required
def queue_management_view(request: HttpRequest):
    """キュー管理ページ表示"""
    # TODO: 新しいモデルを使用した処理を実装
    return render(request, 'admin/queue_management.html')

@require_POST
@csrf_protect
def add_to_queue_view(request: HttpRequest):
    """キューに追加API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})

@require_POST
@csrf_protect
def remove_from_queue_view(request: HttpRequest):
    """キューから削除API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})

@require_POST
@csrf_protect
def change_queue_position_view(request: HttpRequest):
    """キュー位置変更API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})

@require_POST
@csrf_protect
def change_queue_priority_view(request: HttpRequest):
    """キュー優先度変更API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})

@require_POST
@csrf_protect
def change_queue_model_view(request: HttpRequest):
    """キューモデル変更API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})

@require_GET
def get_queue_status_view(request: HttpRequest):
    """キュー状態取得API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success', 'queue': []})

@require_POST
@csrf_protect
def start_queue_processing_view(request: HttpRequest):
    """キュー処理開始API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})

@require_POST
@csrf_protect
def complete_queue_processing_view(request: HttpRequest):
    """キュー処理完了API"""
    # TODO: 新しいモデルを使用した処理を実装
    return JsonResponse({'status': 'success'})

@require_POST
@csrf_protect
def api_delete_image(request: HttpRequest, image_id: int):
    """画像を削除するAPI（v2）"""
    import logging
    logger = logging.getLogger(__name__)
    
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
        
        # 関連するタイムラインログを削除
        TransAnalysisTimeline.objects.filter(image_id=image).delete()
        
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