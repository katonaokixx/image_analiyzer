from __future__ import annotations
import os
import threading
from django.conf import settings
from django.db import transaction, models
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
from .models import MstUser, TransUploadedImage, TransImageAnalysis
from django.utils import timezone
# v2用の解析サービスをインポート
from .services import analysis_service

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
        user_id=mst_user,  # MstUserのインスタンスを渡す
        filename=display_filename,  # 表示用ファイル名を保存
        file_path=file_path,  # 物理ファイルパス
        upload_order=next_order,  # アップロード順序
        status='analyzing'  # 直接解析中に
    )
    
    
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
    if request.user.is_staff:
        # 管理者の場合は全ユーザーの画像を表示
        images = TransUploadedImage.objects.all().order_by('-created_at')
    else:
        try:
            pass
            # 既存のUserからMstUserを取得
            mst_user = MstUser.objects.get(username=request.user.username)
            images = TransUploadedImage.objects.filter(user_id=mst_user).order_by('-created_at')
        except MstUser.DoesNotExist:
            # MstUserが存在しない場合は空のクエリセット
            images = TransUploadedImage.objects.none()
    
    # ページネーション設定
    paginator = Paginator(images, 10)  # 10件/ページ
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # テンプレートに渡すデータ
    images_list = list(page_obj.object_list)
    
    # 各画像にシンプルなファイル名を追加
    for image in images_list:
        pass
        
        # ファイル名をそのまま表示（番号付与方式）
        image.simple_filename = image.filename
    
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
    images = TransUploadedImage.objects.all().order_by('-created_at')
    users = MstUser.objects.all().order_by('username')
    
    # View All機能のチェック
    view_all = request.GET.get('view_all', 'false').lower() == 'true'
    
    if view_all or request.user.is_staff:
        # 管理者またはView Allが有効な場合は全ユーザーの画像を表示
        filtered_images = images
    else:
        pass
        # 一般ユーザーの場合は自分の画像のみ表示
        try:
            mst_user = MstUser.objects.get(username=request.user.username)
            filtered_images = images.filter(user_id=mst_user)
        except MstUser.DoesNotExist:
            filtered_images = TransUploadedImage.objects.none()
    
    # ページネーション設定
    paginator = Paginator(filtered_images, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # 各画像にシンプルなファイル名を追加
    images_list = list(page_obj.object_list)
    for image in images_list:
        # ファイル名をそのまま表示（番号付与方式）
        image.simple_filename = image.filename
    
    context = {
        'page_obj': page_obj,
        'images': images_list,
        'users': users,
        'view_all': view_all,
        'user': request.user,
        'has_data': len(images_list) > 0,  # データがあるかどうかのフラグ
    }
    
    return render(request, 'admin/admin_image_table.html', context)

def image_upload(request: HttpRequest):
    """画像アップロードページ表示"""
    # ログイン認証チェック
    if not request.user.is_authenticated:
        messages.error(request, 'ログインが必要です。')
        return redirect('v2_login')
    
    # 新規アップロードページでは、セッションをクリア（まっさらな状態から開始）
    # ただし、既に画像がアップロード済みで解析中の場合はクリアしない
    uploaded_image_ids = request.session.get('uploaded_image_ids', [])
    has_active_analysis = False
    if uploaded_image_ids:
        # アップロード済み画像があり、解析中または準備中の場合はクリアしない
        active_images = TransUploadedImage.objects.filter(
            image_id__in=uploaded_image_ids,
            status__in=['analyzing', 'preparing']
        )
        has_active_analysis = active_images.exists()
    
    if 'clear_session' not in request.GET and not has_active_analysis:
        # 初回アクセス時、または解析がアクティブでない場合のみセッションをクリア
        request.session['uploaded_image_ids'] = []
        request.session['selected_model'] = ''
        request.session.modified = True
    
    # セッションから画像IDを取得（新規アップロードページではセッションの画像のみ表示）
    uploaded_image_ids = request.session.get('uploaded_image_ids', [])
    
    # セッションの画像のみを取得
    if uploaded_image_ids:
        uploaded_images = TransUploadedImage.objects.filter(image_id__in=uploaded_image_ids).order_by('-created_at')
    else:
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
        # file_pathから実際のファイル名を取得
        import os
        physical_filename = os.path.basename(img.file_path)
        uploaded_images_json.append({
            'id': img.image_id,
            'filename': img.filename,
            'thumbnail_url': f'/uploads/images/{physical_filename}',
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
def re_analysis(request: HttpRequest):
    """再解析専用ページ（新しいモデル使用）"""
    import logging
    logger = logging.getLogger(__name__)
    
    # 最初に必ずログを出力
    
    logger.info("=" * 50)
    logger.info("DEBUG: re_analysis view called")
    logger.info(f"DEBUG: request.method = {request.method}")
    logger.info(f"DEBUG: request.GET = {request.GET}")
    logger.info(f"DEBUG: request.user = {request.user}")
    logger.info(f"DEBUG: request.user.is_authenticated = {request.user.is_authenticated}")
    
    # ログイン認証チェック
    if not request.user.is_authenticated:
        logger.info("DEBUG: User not authenticated, redirecting to login")
        messages.error(request, 'ログインが必要です。')
        return redirect('v2_login')
    
    # セッションから選択された画像IDと状態を取得（バッジクリック時）
    # GETパラメータからも取得可能にする
    selected_image_id = request.GET.get('selected_image_id') or request.session.get('selected_image_id')
    selected_image_status = request.session.get('selected_image_status')
    
    logger.info(f"DEBUG: selected_image_id = {selected_image_id}")
    logger.info(f"DEBUG: selected_image_status = {selected_image_status}")
    
    selected_image = None
    if selected_image_id:
        try:
            pass
            # 新しいモデルを使用
            mst_user = MstUser.objects.get(username=request.user.username)
            selected_image = TransUploadedImage.objects.get(image_id=selected_image_id, user_id=mst_user)
            selected_image_status = selected_image.status  # 画像の状態を設定
            
            # 進捗バーとタイムラインの表示を同期させる
            # analysis_completed_atが設定されていない場合は、まだ完全に完了していない
            if selected_image.status == 'completed' and selected_image.analysis_completed_at is None:
                # 解析結果が存在するかどうかで進捗を調整
                has_analysis_results = TransImageAnalysis.objects.filter(image_id=selected_image).exists()
                if has_analysis_results:
                    # 解析結果はあるが、まだ完全に完了していない
                    # analysis_completed_atを設定して完全に完了させる
                    selected_image.analysis_completed_at = timezone.now()
                    selected_image.save()
                    logger.info(f"DEBUG: analysis_completed_at設定完了: 画像ID={selected_image.image_id}")
                else:
                    pass
                    # 解析結果がない場合は、そのまま表示
                    logger.info(f"DEBUG: No analysis results, keeping status as completed")
            
            logger.info(f"DEBUG: selected_image found = {selected_image.filename}, status = {selected_image.status}, analysis_completed_at = {selected_image.analysis_completed_at}")
        except (TransUploadedImage.DoesNotExist, MstUser.DoesNotExist) as e:
            selected_image = None
            logger.info(f"DEBUG: Image not found for ID {selected_image_id}, error: {e}")
            # 画像が存在しない場合はセッションをクリア
            if 'selected_image_id' in request.session:
                del request.session['selected_image_id']
            if 'selected_image_status' in request.session:
                del request.session['selected_image_status']
    else:
        pass
        logger.info("DEBUG: No selected_image_id in session")
        # セッションに画像IDがない場合は、最新の画像を取得
        try:
            mst_user = MstUser.objects.get(username=request.user.username)
            selected_image = TransUploadedImage.objects.filter(user_id=mst_user).order_by('-created_at').first()
            if selected_image:
                selected_image_status = selected_image.status
                logger.info(f"DEBUG: Using latest image as fallback: {selected_image.filename}, status = {selected_image.status}")
        except Exception as e:
            logger.info(f"DEBUG: Error getting latest image: {e}")
    
    # selected_image_statusがNoneの場合は、selected_imageの状態を使用
    if selected_image and selected_image_status is None:
        selected_image_status = selected_image.status
        logger.info(f"DEBUG: selected_image_status was None, using image status: {selected_image_status}")
    
    logger.info(f"DEBUG: selected_image_status = {selected_image_status}")
    
    # 画像情報を取得（タイムライン情報は不要）
    image_info = None
    if selected_image:
        image_info = selected_image
    else:
        pass
    
    # 前回の解析結果を取得（v1と同じロジック）
    previous_results = []
    if selected_image:
        try:
            pass
            # 最新の解析結果を取得（最新の解析実行の結果を信頼度順で取得）
            # まず最新の解析完了時刻を取得
            latest_analysis_time = TransImageAnalysis.objects.filter(image_id=selected_image).order_by('-analysis_completed_at').first()
            if latest_analysis_time:
                # 最新の解析実行の結果を信頼度順で取得（上位3件まで）
                previous_results = TransImageAnalysis.objects.filter(
                    image_id=selected_image,
                    analysis_completed_at=latest_analysis_time.analysis_completed_at
                ).order_by('-confidence')[:3]
            else:
                previous_results = []
            for i, result in enumerate(previous_results):
                pass
            logger.info(f"DEBUG: previous_results count = {previous_results.count()}")
            for i, result in enumerate(previous_results):
                logger.info(f"DEBUG: previous_results[{i}] = {result.label} ({result.confidence}%)")
        except Exception as e:
            logger.info(f"DEBUG: Error getting previous_results: {e}")
            previous_results = []
    else:
        pass
    
    # 前回解析結果のテキスト生成（TransAnalysisTimelineを使わない方法）
    
    previous_results_text = None
    if previous_results and selected_image_status == 'completed':
        results_text = "直近の解析結果: "
        for i, r in enumerate(previous_results):
            # 新しいモデルの構造に合わせて調整
            label = r.label if r.label else 'Unknown'
            confidence = float(r.confidence) if r.confidence else 0
            results_text += f"{i+1}位: {label} ({confidence:.1f}%)"
            if i < len(previous_results) - 1:
                results_text += " / "
        
        previous_results_text = results_text
    else:
        pass
    
    # デバッグ情報を追加
    if selected_image:
        pass
    else:
        pass
    
    
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
        'image_info': image_info,
        # 直近の解析結果（上位3件まで）をテンプレートに渡す
        'previous_results': previous_results,
        'previous_results_text': previous_results_text,
    }
    
    logger.info("DEBUG: Rendering template")
    return render(request, 'main/re_analysis.html', context)

# API ビュー（新しいモデルを使用）
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
    
    for i, file in enumerate(files):
        pass
    
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
            pass
            valid_files.append(f)
    
    if errors:
        return JsonResponse({'ok': False, 'errors': errors}, status=400)
    
    # ファイル保存
    saved = []
    for f in valid_files:
        try:
            pass
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
        import os
        physical_filename = os.path.basename(img.file_path)
        response_data.append({
            'id': img.image_id,
            'filename': img.filename,
            'thumbnail_url': f'/uploads/images/{physical_filename}',
            'status': img.status
        })
    
    for img_data in response_data:
        pass
    
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
            
            # 再解析の場合、古い解析結果は削除しない（前回解析結果の表示のため）
            if image.status == 'completed':
                logger.info(f"再解析開始: 画像ID={image.image_id} (既存の解析結果は保持)")
            
            # TransAnalysisTimelineは削除されたため、画像のステータスを直接更新
            image.analysis_started_at = timezone.now()
            image.status = 'analyzing'
            image.save()
            
            logger.info(f"個別画像の解析を開始: ID={image.image_id}")
            
        else:
            pass
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
                pass
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
        
        # 実際の解析処理（ここでは簡単な例）
        analysis_results = perform_image_analysis(image, model_name)
        
        # 進捗バーとの同期のため、解析完了前に少し待機
        import time
        time.sleep(2)  # 2秒待機して進捗バーの更新を待つ
        
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
        image.analysis_completed_at = analysis_time  # 解析完了時刻も設定
        image.save()
        
        # TransAnalysisTimelineは削除されたため、タイムライン更新は不要
        
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
        pass
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
        # エラー時はサンプルデータを返す
        return [
            {
                'label': 'Unknown',
                'confidence': 0.0,
                'model_name': model_name,
                'rank': 1
            }
        ]


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
        
        # 解析結果の保存は完了したが、進捗バーが100%になるまでステータスは更新しない
        # 画像のステータスは進捗バーが100%になってから更新される
        logger.info(f"解析結果保存完了: 画像ID={image_id}, 結果数={len(saved_results)}")
        
        # 解析結果が保存されたことを示すフラグを設定（進捗バー用）
        # この時点ではまだステータスは'analyzing'のまま
        
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
        pass
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
                progress_percentage = 90  # 解析結果はあるが、まだ完了していない
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
    """画像削除API"""
    import logging
    import os
    logger = logging.getLogger(__name__)
    
    try:
        pass
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
        
        # TransAnalysisTimelineは削除されたため、タイムライン情報の削除は不要
        
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

@require_POST
@csrf_protect
def api_delete_image(request: HttpRequest, image_id: int):
    """画像を削除するAPI（v2）"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"画像削除API呼び出し: 画像ID={image_id}, ユーザー={request.user.username}")
    
    try:
        pass
        # 既存のUserからMstUserを取得
        mst_user = MstUser.objects.get(username=request.user.username)
        logger.info(f"MstUser取得成功: {mst_user.username}")
        
        # 画像を取得（ユーザーが所有する画像のみ）
        image = TransUploadedImage.objects.get(image_id=image_id, user_id=mst_user)
        logger.info(f"画像取得成功: {image.filename}")
        
        # 関連する解析結果を削除
        TransImageAnalysis.objects.filter(image_id=image).delete()
        
        # TransAnalysisTimelineは削除されたため、タイムラインログの削除は不要
        
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
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        uploaded_image_ids = request.session.get('uploaded_image_ids', [])
        
        if not uploaded_image_ids:
            return JsonResponse({'ok': True, 'images': []})
        
        images = TransUploadedImage.objects.filter(image_id__in=uploaded_image_ids).order_by('-created_at')
        
        images_data = []
        for img in images:
            import os
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
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        pass
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
    import logging
    logger = logging.getLogger(__name__)
    
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
                        pass
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
            pass
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
                pass
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
                    pass
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
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        pass
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