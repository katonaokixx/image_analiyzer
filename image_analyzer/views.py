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

from .models import User, Image, AnalysisResult, TimelineLog, MLModel, ProgressLog, PasswordResetToken, AnalysisQueue
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
    return redirect('v2_login')

def user_image_table(request: HttpRequest):
    """一般ユーザー用画像テーブル"""
    # ログイン認証チェック
    if not request.user.is_authenticated:
        messages.error(request, 'ログインが必要です。')
        return redirect('login')
    
    # ログインしているユーザーの画像のみを表示
    images = Image.objects.filter(user=request.user).order_by('-upload_date')
    
    # ページネーション設定
    paginator = Paginator(images, 10)  # 10件/ページ
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # テンプレート互換性のためのデータ変換
    if images.exists() and hasattr(images.first(), 'image_id'):
        # 新しいモデルの場合、既存のテンプレート用にデータを変換
        converted_images = []
        for img in page_obj:
            # 既存のテンプレートが期待する属性を追加
            img.id = img.image_id
            img.filename = img.filename
            img.upload_date = img.upload_date
            img.status = img.status
            converted_images.append(img)
        page_obj.object_list = converted_images
    
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
        return redirect('admin_image_table')
    
    # 画像とユーザーを取得
    images = Image.objects.prefetch_related('analysis_results').order_by('-upload_date')
    users = User.objects.all().order_by('username')
    
    # View All機能のチェック
    view_all = request.GET.get('view_all', 'false').lower() == 'true'
    
    if view_all:
        # 全件表示
        return render(request, 'admin/admin_image_table.html', {
            'images': images,
            'page_obj': None,  # ページネーションなし
            'has_data': images.exists(),
            'view_all': True,
            'users': users,
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
            'users': users,
        })

@csrf_protect
@login_required
def image_upload(request: HttpRequest):
    # ログイン認証チェック
    if not request.user.is_authenticated:
        messages.error(request, 'ログインが必要です。')
        return redirect('login')
    
    # 新しいセッションとして開始するため、アップロード画像IDをクリア
    request.session['uploaded_image_ids'] = []
    request.session.modified = True
    print(f"DEBUG: 新しいセッションとして開始 - uploaded_image_ids = []")
    print(f"DEBUG: user = {request.user.username if request.user.is_authenticated else 'Anonymous'}")
    
    # セッションからアップロードした画像IDを取得（空のリスト）
    uploaded_image_ids = request.session.get('uploaded_image_ids', [])
    
    # セッションから選択された画像IDと状態を取得（バッジクリック時）
    selected_image_id = request.session.get('selected_image_id')
    selected_image_status = request.session.get('selected_image_status')
    if selected_image_id:
        # 選択された画像の情報を取得
        try:
            selected_image = Image.objects.get(id=selected_image_id, user=request.user)
            # 選択された画像をアップロード済み画像リストに追加
            if selected_image_id not in uploaded_image_ids:
                uploaded_image_ids.append(selected_image_id)
                request.session['uploaded_image_ids'] = uploaded_image_ids
        except Image.DoesNotExist:
            selected_image = None
        finally:
            # セッションから選択された画像IDと状態をクリア
            if 'selected_image_id' in request.session:
                del request.session['selected_image_id']
            if 'selected_image_status' in request.session:
                del request.session['selected_image_status']
    else:
        selected_image = None
        selected_image_status = None
    
    # 画像情報を取得
    uploaded_images = []
    if uploaded_image_ids:
        uploaded_images = Image.objects.filter(
            id__in=uploaded_image_ids,
            user=request.user
        ).order_by('-id')
        print(f"DEBUG: セッションから画像を取得: {[img.id for img in uploaded_images]}")
    else:
        # セッションが空の場合は、空のリストを使用（自動取得しない）
        uploaded_images = []
        print("DEBUG: セッションが空のため、アップロード済み画像なし")
    
    
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
            'id': img.id,
            'filename': img.filename,
            'thumbnail_url': img.thumbnail_url,
            'status': img.status
        })
    
    context = {
        'uploaded_images': uploaded_images,
        'selected_model': selected_model,
        'has_uploaded_images': has_uploaded_images,
        'has_selected_model': has_selected_model,
        'show_analysis_button': has_uploaded_images and has_selected_model,
        'show_timeline': has_uploaded_images,
        'selected_image': selected_image,
        'selected_image_status': selected_image_status,
        'analysis_status': analysis_status,
        'uploaded_images_json': uploaded_images_json
    }
    
    return render(request, 'main/image_upload.html', context)

@csrf_protect
@login_required
def re_image_upload(request: HttpRequest):
    """再解析専用ページ"""
    # ログイン認証チェック
    if not request.user.is_authenticated:
        messages.error(request, 'ログインが必要です。')
        return redirect('login')
    
    # セッションから選択された画像IDと状態を取得（バッジクリック時）
    # GETパラメータからも取得可能にする
    selected_image_id = request.GET.get('selected_image_id') or request.session.get('selected_image_id')
    selected_image_status = request.session.get('selected_image_status')
    
    print(f"DEBUG: selected_image_id = {selected_image_id}")
    print(f"DEBUG: user = {request.user}")
    
    selected_image = None
    if selected_image_id:
        try:
            selected_image = Image.objects.get(id=selected_image_id, user=request.user)
            selected_image_status = selected_image.status  # 画像の状態を設定
            print(f"DEBUG: selected_image found = {selected_image.filename}, status = {selected_image.status}")
        except Image.DoesNotExist:
            selected_image = None
            print(f"DEBUG: Image not found for ID {selected_image_id}")
            # 画像が存在しない場合はセッションをクリア
            if 'selected_image_id' in request.session:
                del request.session['selected_image_id']
            if 'selected_image_status' in request.session:
                del request.session['selected_image_status']
    else:
        print("DEBUG: No selected_image_id in session")
        # セッションに画像IDがない場合は、最新の画像を取得
        try:
            selected_image = Image.objects.filter(user=request.user).order_by('-upload_date').first()
            if selected_image:
                selected_image_status = selected_image.status
                print(f"DEBUG: Using latest image as fallback: {selected_image.filename}, status = {selected_image.status}")
        except Exception as e:
            print(f"DEBUG: Error getting latest image: {e}")
    
    # selected_image_statusがNoneの場合は、selected_imageの状態を使用
    if selected_image and selected_image_status is None:
        selected_image_status = selected_image.status
        print(f"DEBUG: selected_image_status was None, using image status: {selected_image_status}")
    
    print(f"DEBUG: selected_image_status = {selected_image_status}")
    
    # タイムライン情報を取得
    timeline_log = None
    if selected_image:
        try:
            timeline_log = selected_image.timeline_log
        except TimelineLog.DoesNotExist:
            timeline_log = None
    
    # 前回の解析結果を取得
    previous_results = AnalysisResult.objects.filter(image=selected_image).order_by('rank')[:3] if selected_image else []
    
    # 解析完了済みの場合のみ、3つ目のタイムライン（解析完了）に前回の解析結果を表示
    if timeline_log and previous_results.exists() and selected_image_status == 'completed':
        results_text = "前回の解析結果: "
        for i, r in enumerate(previous_results):
            results_text += f"{r.rank}位: {r.label} ({r.confidence}%)"
            if i < len(previous_results) - 1:
                results_text += " / "
        timeline_log.completion_step_description = results_text
        timeline_log.save()
    
    context = {
        'selected_image': selected_image,
        'selected_image_status': selected_image_status,
        'timeline_log': timeline_log,
        # 直近の解析結果（上位3件まで）をテンプレートに渡す
        'previous_results': previous_results,
    }
    
    return render(request, 'main/re_image_upload.html', context)

@require_POST
@csrf_protect
def api_set_selected_image(request: HttpRequest):
    """選択された画像IDと状態をセッションに保存"""
    import json
    
    try:
        data = json.loads(request.body)
        image_id = data.get('image_id')
        image_status = data.get('image_status')
        
        if not image_id:
            return JsonResponse({'ok': False, 'error': '画像IDが指定されていません'}, status=400)
        
        # セッションに画像IDと状態を保存
        request.session['selected_image_id'] = image_id
        request.session['selected_image_status'] = image_status
        
        return JsonResponse({'ok': True, 'message': '画像IDと状態が保存されました'})
        
    except Exception as e:
        print(f"選択画像ID保存エラー: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)

@require_POST
@csrf_protect
def api_select_model(request: HttpRequest):
    """モデル選択API"""
    model_name = request.POST.get('model')
    
    if not model_name:
        return JsonResponse({'ok': False, 'error': 'モデルが選択されていません'}, status=400)
    
    # セッションに選択されたモデルを保存
    request.session['selected_model'] = model_name
    request.session.modified = True
    
    return JsonResponse({'ok': True, 'model': model_name})

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
        img = save_file_and_create_image(f, request.user)
        
        # タイムラインログの作成・更新（解析ステップは保留）
        timeline_log, created = TimelineLog.objects.get_or_create(
            image=img,
            defaults={
                'upload_started_at': timezone.now(),
                'upload_completed_at': timezone.now(),
                # 1つ目のタイムライン情報を保存
                'upload_step_title': 'ファイルアップロード完了',
                'upload_step_description': 'ファイルのアップロードに成功しました',
                'upload_step_status': 'アップロード成功',
                'upload_step_icon': 'check-circle',
                'upload_step_color': 'success',
                # 解析ステップは未実行のためNone
                'analysis_step_status': None,
                'analysis_step_title': None,
                'completion_step_status': None,
                'completion_step_title': None,
            }
        )
        if not created:
            timeline_log.upload_completed_at = timezone.now()
            # 1つ目のタイムライン情報を更新
            timeline_log.upload_step_title = 'ファイルアップロード完了'
            timeline_log.upload_step_description = 'ファイルのアップロードに成功しました'
            timeline_log.upload_step_status = 'アップロード成功'
            timeline_log.upload_step_icon = 'check-circle'
            # 解析ステップは未実行のためNone
            timeline_log.analysis_step_status = None
            timeline_log.analysis_step_title = None
            timeline_log.completion_step_status = None
            timeline_log.completion_step_title = None
            timeline_log.upload_step_color = 'success'
            timeline_log.save()
        
        # アップロード完了時のステータスを設定
        img.status = 'uploaded'
        img.save()
        
        # 自動でキューに追加しない（ユーザーが明示的に解析を開始するまで待機）
        # try:
        #     # 次の位置を計算
        #     next_position = AnalysisQueue.objects.filter(
        #         status__in=['waiting', 'processing']
        #     ).count() + 1
        #     
        #     # キューアイテムを作成
        #     AnalysisQueue.objects.create(
        #         image=img,
        #         user=request.user if request.user.is_authenticated else None,
        #         position=next_position,
        #         priority='normal',
        #         status='waiting',
        #         model_name='resnet50'  # デフォルトモデル
        #     )
        # except Exception as e:
        #     # キュー追加に失敗してもアップロードは成功とする
        #     print(f"Failed to add image to queue: {e}")
        
        saved.append(img)
    
    # セッションにアップロードした画像IDを保存
    # 複数ファイル同時アップロード時の競合を避けるため、既存のセッション画像IDに追加
    uploaded_image_ids = request.session.get('uploaded_image_ids', [])
    for img in saved:
        if img.id not in uploaded_image_ids:
            uploaded_image_ids.append(img.id)
    request.session['uploaded_image_ids'] = uploaded_image_ids
    request.session.modified = True
    
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
    import logging
    logger = logging.getLogger(__name__)
    
    model_name = request.POST.get('model')
    image_id = request.POST.get('image_id')  # 個別画像ID（オプション）
    
    logger.info(f"=== 解析開始API呼び出し ===")
    logger.info(f"モデル: {model_name}, 画像ID: {image_id}, ユーザー: {request.user.username}")
    
    if not model_name:
        logger.error("モデルが指定されていません")
        return JsonResponse({'ok': False, 'error': 'モデルが指定されていません'}, status=400)
    
    # キューシステムを使用して解析を開始
    try:
        if image_id:
            # 個別画像解析の場合
            try:
                image = Image.objects.get(id=image_id, status__in=['uploaded', 'preparing', 'analyzing'])
                logger.info(f"個別画像解析対象: ID={image.id}, ファイル名={image.filename}, ステータス={image.status}")
            except Image.DoesNotExist:
                logger.error(f"指定された画像が見つからないか、解析対象ではありません: ID={image_id}")
                return JsonResponse({'ok': False, 'error': '指定された画像が見つからないか、解析対象ではありません'}, status=400)
            
            # 再解析の場合、古い解析結果を削除
            if image.status == 'completed':
                logger.info(f"再解析のため、古い解析結果を削除: 画像ID={image.id}")
                old_results = image.analysis_results.all()
                deleted_count = old_results.count()
                old_results.delete()
                logger.info(f"削除された解析結果数: {deleted_count}")
            
            # 解析開始時にタイムライン情報を保存
            timeline_log, created = TimelineLog.objects.get_or_create(
                image=image,
                defaults={
                    'analysis_started_at': timezone.now(),
                    # 2つ目のタイムライン情報を保存（成功時）
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
                # 2つ目のタイムライン情報を更新（成功時）
                timeline_log.analysis_step_title = '解析開始'
                timeline_log.analysis_step_description = 'AIによる画像解析を開始しました。'
                timeline_log.analysis_step_status = '解析中'
                timeline_log.analysis_step_icon = 'brain'
                timeline_log.analysis_step_color = 'warning'
                timeline_log.analysis_progress_percentage = 0
                timeline_log.analysis_progress_stage = 'preparing'
                timeline_log.save()
            
            # 既にキューに存在するかチェック
            existing_queue_item = AnalysisQueue.objects.filter(image=image).first()
            if existing_queue_item:
                logger.info(f"画像ID={image_id}は既にキューに追加されています")
                # 既にキューに存在する場合でも、キュー処理を開始
                start_queue_processing()
                return JsonResponse({'ok': True, 'message': 'この画像は既にキューに追加されています。処理を開始します。'})
            
            # タイムラインログを更新（解析開始時刻を記録）
            timeline_log.analysis_started_at = timezone.now()
            timeline_log.model_used = model_name
            timeline_log.save()
            
            # キューに追加
            next_position = AnalysisQueue.objects.filter(
                status__in=['waiting', 'processing']
            ).count() + 1
            
            queue_item = AnalysisQueue.objects.create(
                image=image,
                user=request.user if request.user.is_authenticated else None,
                position=next_position,
                priority='normal',
                status='waiting',
                model_name=model_name
            )
            
            # 画像のステータスを準備中に更新
            image.status = 'preparing'
            image.save()
            
            logger.info(f"個別画像をキューに追加: ID={image.id}, 位置={next_position}")
            
        else:
            # 一括解析の場合（このセッションでアップロードした画像のみを対象）
            uploaded_image_ids = request.session.get('uploaded_image_ids', [])
            if not uploaded_image_ids:
                logger.error("このセッションでアップロードした画像が見つかりません")
                return JsonResponse({'ok': False, 'error': 'このセッションでアップロードした画像が見つかりません'}, status=400)
            
            # セッション画像IDのうち、解析可能な状態の画像のみを取得
            available_images = Image.objects.filter(
                id__in=uploaded_image_ids,
                status__in=['uploaded', 'preparing', 'analyzing']
            ).order_by('-upload_date')
            
            # セッションから解析済みの画像IDを除外して更新
            active_image_ids = [img.id for img in available_images]
            request.session['uploaded_image_ids'] = active_image_ids
            request.session.modified = True
            
            logger.info(f"一括解析対象画像数: {available_images.count()} (セッション画像IDs: {uploaded_image_ids} -> 有効画像IDs: {active_image_ids})")
            
            images = available_images
            
            if not images.exists():
                logger.error("解析対象の画像が見つかりません")
                return JsonResponse({'ok': False, 'error': '解析対象の画像が見つかりません'}, status=400)
            
            # 各画像をキューに追加
            added_count = 0
            skipped_count = 0
            for img in images:
                # 既にキューに存在するかチェック
                existing_queue_item = AnalysisQueue.objects.filter(image=img).first()
                if existing_queue_item:
                    logger.info(f"画像ID={img.id}は既にキューに追加されています")
                    skipped_count += 1
                    continue
                
                next_position = AnalysisQueue.objects.filter(
                    status__in=['waiting', 'processing']
                ).count() + 1
                
                queue_item = AnalysisQueue.objects.create(
                    image=img,
                    user=request.user if request.user.is_authenticated else None,
                    position=next_position,
                    priority='normal',
                    status='waiting',
                    model_name=model_name
                )
                
                # 画像のステータスを準備中に更新
                img.status = 'preparing'
                img.save()
                
                added_count += 1
                logger.info(f"画像をキューに追加: ID={img.id}, 位置={next_position}")
            
            logger.info(f"一括解析で{added_count}件の画像をキューに追加、{skipped_count}件は既にキューに存在")
            
            # 既にキューに存在する画像がある場合でも、キュー処理を開始
            if skipped_count > 0:
                logger.info(f"既にキューに存在する{skipped_count}件の画像の処理を開始")
        
        # キュー処理を開始
        start_queue_processing()
        
        return JsonResponse({'ok': True, 'message': '解析をキューに追加しました'})
        
    except Exception as e:
        logger.error(f"キュー追加中にエラーが発生: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)

def start_queue_processing():
    """キュー処理を開始する"""
    import logging
    logger = logging.getLogger(__name__)
    
    def process_queue():
        logger.info("=== キュー処理開始 ===")
        while True:
            try:
                # 次のキューアイテムを取得
                next_item = AnalysisQueue.get_next_item()
                if not next_item:
                    logger.info("処理対象のキューアイテムがありません")
                    break
                
                logger.info(f"キューアイテム処理開始: ID={next_item.id}, 画像ID={next_item.image.id}")
                
                # キューアイテムのステータスを処理中に更新
                next_item.status = 'processing'
                next_item.started_at = timezone.now()
                next_item.save()
                
                # 画像のステータスを解析中に更新
                next_item.image.status = 'analyzing'
                next_item.image.save()
                
                # 解析を実行
                result = analysis_service.process_queue_item(next_item.id)
                
                if result.get('success'):
                    # 成功時
                    next_item.status = 'completed'
                    next_item.completed_at = timezone.now()
                    next_item.image.status = 'completed'
                    next_item.image.save()
                    logger.info(f"キューアイテム処理完了: ID={next_item.id}")
                else:
                    # 失敗時
                    next_item.status = 'failed'
                    next_item.error_message = result.get('error', 'Unknown error')
                    next_item.image.status = 'failed'
                    next_item.image.save()
                    
                    # 失敗時にタイムライン情報を更新
                    try:
                        timeline_log = next_item.image.timeline_log
                        timeline_log.analysis_step_title = '解析失敗'
                        timeline_log.analysis_step_description = '画像の解析に失敗しました'
                        timeline_log.analysis_step_status = '解析失敗'
                        timeline_log.analysis_step_icon = 'alert-circle'
                        timeline_log.analysis_step_color = 'error'
                        timeline_log.analysis_progress_percentage = 0
                        timeline_log.analysis_progress_stage = 'failed'
                        # 3つ目のタイムラインも失敗に更新
                        timeline_log.completion_step_title = '解析失敗'
                        timeline_log.completion_step_description = '画像の解析に失敗しました'
                        timeline_log.completion_step_status = '解析失敗'
                        timeline_log.completion_step_icon = 'alert-circle'
                        timeline_log.completion_step_color = 'error'
                        timeline_log.save()
                    except TimelineLog.DoesNotExist:
                        pass
                    
                    logger.error(f"キューアイテム処理失敗: ID={next_item.id}, エラー={result.get('error')}")
                
                next_item.save()
                
            except Exception as e:
                logger.error(f"キュー処理中にエラーが発生: {e}")
                break
        
        logger.info("=== キュー処理終了 ===")
    
    # キュー処理を別スレッドで実行
    queue_thread = threading.Thread(target=process_queue)
    queue_thread.daemon = True
    queue_thread.start()
    logger.info("キュー処理スレッドを開始")

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
                    # 解析結果を取得
                    results = AnalysisResult.objects.filter(image=image).order_by('rank')
                    result_data = []
                    for result in results:
                        result_data.append({
                            'label': result.label,
                            'confidence': result.confidence,
                            'rank': result.rank
                        })
                    
                    # 進捗を動的に計算（固定値ではなく）
                    if image.status == 'analyzing':
                        # 解析開始時刻から経過時間に基づいて進捗を計算
                        if hasattr(image, 'analysis_started_at') and image.analysis_started_at:
                            from django.utils import timezone
                            elapsed_time = timezone.now() - image.analysis_started_at
                            progress_percentage = min(90, int(elapsed_time.total_seconds() * 2))
                        else:
                            progress_percentage = min(90, int(latest_progress.progress_percentage * 1.5))
                    else:
                        progress_percentage = float(latest_progress.progress_percentage)
                    
                    return JsonResponse({
                        'ok': True,
                        'progress': progress_percentage,
                        'status': image.status,
                        'current_stage': latest_progress.current_stage,
                        'description': latest_progress.stage_description,
                        'result': result_data if result_data else None
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
        
        # キュー情報を取得
        queue_info = None
        if hasattr(image, 'queue_item') and image.queue_item:
            queue_info = {
                'position': image.queue_item.position,
                'status': image.queue_item.status,
                'waiting_position': image.queue_item.waiting_position,
                'priority': image.queue_item.priority,
                'queued_at': image.queue_item.queued_at.isoformat() if image.queue_item.queued_at else None,
                'estimated_wait_time': image.queue_item.estimated_wait_time,
            }
        
        # エラー情報を取得
        error_info = None
        if image.status == 'failed':
            # 最新のエラーログを取得
            from .models import ProgressLog
            latest_error = ProgressLog.objects.filter(
                image=image,
                current_stage__icontains='error'
            ).order_by('-timestamp').first()
            
            if latest_error:
                error_info = {
                    'error_message': latest_error.stage_description,
                    'error_stage': latest_error.current_stage,
                    'error_timestamp': latest_error.timestamp.isoformat(),
                }
            else:
                # フォールバック: 一般的なエラーメッセージ
                error_info = {
                    'error_message': '画像解析中にエラーが発生しました',
                    'error_stage': 'analysis_error',
                    'error_timestamp': timeline_log.analysis_started_at.isoformat() if timeline_log.analysis_started_at else None,
                }
        
        # タイムラインデータを構築
        timeline_data = {
            'image_id': image.id,
            'filename': image.filename,
            'status': image.status,
            'upload_started_at': timeline_log.upload_started_at.isoformat() if timeline_log.upload_started_at else None,
            'upload_completed_at': timeline_log.upload_completed_at.isoformat() if timeline_log.upload_completed_at else None,
            'model_used': timeline_log.model_used,
            'upload_duration': timeline_log.upload_duration,
            'queue_info': queue_info,
            'error_info': error_info,
        }
        
        # アップロードステップの情報
        if timeline_log.upload_step_status:
            timeline_data['upload_step'] = {
                'title': timeline_log.upload_step_title,
                'status': timeline_log.upload_step_status,
                'icon': timeline_log.upload_step_icon,
                'color': timeline_log.upload_step_color,
                'description': timeline_log.upload_step_description,
            }
        
        # 解析ステップは未実行なら返さない
        if timeline_log.analysis_step_status:
            timeline_data['analysis_started_at'] = timeline_log.analysis_started_at.isoformat() if timeline_log.analysis_started_at else None
            timeline_data['analysis_completed_at'] = timeline_log.analysis_completed_at.isoformat() if timeline_log.analysis_completed_at else None
            timeline_data['analysis_duration'] = timeline_log.analysis_duration
            timeline_data['analysis_step'] = {
                'title': timeline_log.analysis_step_title,
                'status': timeline_log.analysis_step_status,
                'icon': timeline_log.analysis_step_icon,
                'color': timeline_log.analysis_step_color,
                'description': timeline_log.analysis_step_description,
            }
        
        # 完了ステップも同様
        if timeline_log.completion_step_status:
            timeline_data['completion_step'] = {
                'title': timeline_log.completion_step_title,
                'status': timeline_log.completion_step_status,
                'icon': timeline_log.completion_step_icon,
                'color': timeline_log.completion_step_color,
                'description': timeline_log.completion_step_description,
            }
        
        timeline_data['total_duration'] = timeline_log.total_duration
        
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


@require_http_methods(["DELETE"])
@csrf_protect
@login_required
def api_delete_image(request: HttpRequest, image_id: int):
    """画像を削除するAPI"""
    import logging
    logger = logging.getLogger(__name__)
    
    # CSRFトークンのデバッグログ
    csrf_token = request.META.get('HTTP_X_CSRFTOKEN', '')
    logger.info(f"画像削除API呼び出し: 画像ID={image_id}, ユーザー={request.user.username}")
    logger.info(f"CSRFトークン長: {len(csrf_token)}")
    
    try:
        # 画像を取得（ユーザーが所有する画像のみ）
        image = Image.objects.get(id=image_id, user=request.user)
        
        # 関連する解析結果を削除
        image.analysis_results.all().delete()
        
        # 関連するタイムラインログを削除
        if hasattr(image, 'timeline_log'):
            image.timeline_log.delete()
        
        # 関連するキューアイテムを削除
        if hasattr(image, 'queue_item'):
            image.queue_item.delete()
        
        # ファイルを削除
        if image.file_path and os.path.exists(image.file_path):
            os.remove(image.file_path)
            logger.info(f"メインファイルを削除: {image.file_path}")
        
        if image.thumbnail_path and os.path.exists(image.thumbnail_path):
            os.remove(image.thumbnail_path)
            logger.info(f"サムネイルファイルを削除: {image.thumbnail_path}")
        
        # 画像レコードを削除
        image.delete()
        
        return JsonResponse({
            'ok': True,
            'success': True,
            'message': '画像を削除しました'
        })
        
    except Image.DoesNotExist:
        return JsonResponse({
            'ok': False,
            'success': False,
            'error': '画像が見つからないか、削除権限がありません'
        }, status=404)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"画像削除エラー: {str(e)}")
        return JsonResponse({
            'ok': False,
            'success': False,
            'error': f'削除に失敗しました: {str(e)}'
        }, status=500)


def save_file_and_create_image(uploaded_file, user):
    """アップロードされたファイルを保存してImageモデルを作成"""
    from django.core.files.storage import default_storage
    import logging
    
    logger = logging.getLogger(__name__)
    logger.info(f"=== ファイルアップロード開始 ===")
    logger.info(f"ファイル名: {uploaded_file.name}, サイズ: {uploaded_file.size} bytes, ユーザー: {user.username}")
    
    # ファイル保存ディレクトリを準備
    upload_dir = os.path.join(settings.MEDIA_ROOT, 'images')
    os.makedirs(upload_dir, exist_ok=True)
    logger.info(f"アップロードディレクトリ: {upload_dir}")
    
    # ファイル名を安全にする
    filename = uploaded_file.name
    name, ext = os.path.splitext(filename)
    safe_filename = secure_unique_filename(upload_dir, name, ext)
    logger.info(f"安全なファイル名: {safe_filename}")
    
    # ファイルを保存
    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    logger.info(f"ファイル保存完了: {file_path}")
    
    # Imageモデルを作成
    image = Image.objects.create(
        filename=safe_filename,
        file_path=file_path,
        status='uploaded',
        user=user  # 現在のユーザーを設定
    )
    logger.info(f"Imageモデル作成完了: ID={image.id}, ステータス={image.status}")
    
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


# ===== 解析キュー管理システム =====

@login_required
def queue_management_view(request):
    """管理者用キュー管理画面"""
    # 管理者権限チェック
    if not request.user.is_staff:
        messages.error(request, '管理者権限が必要です。')
        return redirect('user_image_table')
    
    # キューアイテムを取得
    queue_items = AnalysisQueue.objects.select_related('image', 'user').order_by('priority', 'position', 'queued_at')
    
    # 統計情報
    stats = {
        'total': queue_items.count(),
        'waiting': queue_items.filter(status='waiting').count(),
        'processing': queue_items.filter(status='processing').count(),
        'completed': queue_items.filter(status='completed').count(),
        'failed': queue_items.filter(status='failed').count(),
    }
    
    return render(request, 'admin/queue_management.html', {
        'queue_items': queue_items,
        'stats': stats,
    })


@require_POST
@csrf_protect
@login_required
def add_to_queue_view(request):
    """画像をキューに追加"""
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': '管理者権限が必要です'}, status=403)
    
    image_id = request.POST.get('image_id')
    priority = request.POST.get('priority', 'normal')
    
    try:
        image = Image.objects.get(id=image_id)
        
        # 既にキューに存在するかチェック
        existing_queue_item = AnalysisQueue.objects.filter(image=image).first()
        if existing_queue_item:
            return JsonResponse({'ok': False, 'error': 'この画像は既にキューに追加されています'})
        
        # 次の位置を計算
        next_position = AnalysisQueue.objects.filter(
            status__in=['waiting', 'processing']
        ).count() + 1
        
        # キューアイテムを作成
        queue_item = AnalysisQueue.objects.create(
            image=image,
            user=image.user if hasattr(image, 'user') else request.user,
            position=next_position,
            priority=priority,
            status='waiting'
        )
        
        return JsonResponse({
            'ok': True,
            'queue_id': queue_item.id,
            'position': queue_item.position,
            'message': f'画像をキューに追加しました（位置: {queue_item.position}）'
        })
        
    except Image.DoesNotExist:
        return JsonResponse({'ok': False, 'error': '画像が見つかりません'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
@login_required
def remove_from_queue_view(request):
    """キューから画像を削除"""
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': '管理者権限が必要です'}, status=403)
    
    queue_id = request.POST.get('queue_id')
    
    try:
        queue_item = AnalysisQueue.objects.get(id=queue_id)
        queue_item.cancel()
        
        return JsonResponse({
            'ok': True,
            'message': 'キューから削除しました'
        })
        
    except AnalysisQueue.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'キューアイテムが見つかりません'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
@login_required
def change_queue_position_view(request):
    """キュー内の位置を変更"""
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': '管理者権限が必要です'}, status=403)
    
    queue_id = request.POST.get('queue_id')
    new_position = int(request.POST.get('new_position'))
    
    try:
        queue_item = AnalysisQueue.objects.get(id=queue_id)
        old_position = queue_item.position
        queue_item.move_to_position(new_position)
        
        return JsonResponse({
            'ok': True,
            'old_position': old_position,
            'new_position': new_position,
            'message': f'位置を {old_position} から {new_position} に変更しました'
        })
        
    except AnalysisQueue.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'キューアイテムが見つかりません'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
@login_required
def change_queue_priority_view(request):
    """キューアイテムの優先度を変更"""
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': '管理者権限が必要です'}, status=403)
    
    queue_id = request.POST.get('queue_id')
    new_priority = request.POST.get('new_priority')
    
    try:
        queue_item = AnalysisQueue.objects.get(id=queue_id)
        old_priority = queue_item.priority
        queue_item.priority = new_priority
        queue_item.save()
        
        # 優先度変更後、キューを再整理
        AnalysisQueue.reorder_positions()
        
        return JsonResponse({
            'ok': True,
            'old_priority': old_priority,
            'new_priority': new_priority,
            'message': f'優先度を {old_priority} から {new_priority} に変更しました'
        })
        
    except AnalysisQueue.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'キューアイテムが見つかりません'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
@login_required
def change_queue_model_view(request):
    """キューのモデルを変更"""
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': '管理者権限が必要です'}, status=403)
    
    queue_id = request.POST.get('queue_id')
    new_model = request.POST.get('new_model')
    
    if not queue_id or not new_model:
        return JsonResponse({'ok': False, 'error': 'queue_idとnew_modelが必要です'})
    
    try:
        queue_item = AnalysisQueue.objects.get(id=queue_id)
        
        # 処理中の場合は変更不可
        if queue_item.status == 'processing':
            return JsonResponse({'ok': False, 'error': '処理中のアイテムは変更できません'})
        
        # モデル名を更新
        queue_item.model_name = new_model
        queue_item.save()
        
        return JsonResponse({
            'ok': True,
            'message': f'モデルを{new_model}に変更しました'
        })
        
    except AnalysisQueue.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'キューアイテムが見つかりません'})
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)})


@require_GET
@login_required
def get_queue_status_view(request):
    """キュー状態を取得（AJAX用）"""
    user_id = request.GET.get('user_id')
    
    if user_id and request.user.is_staff:
        # 管理者: 指定ユーザーのキュー状態
        queue_items = AnalysisQueue.objects.filter(user_id=user_id)
    else:
        # 一般ユーザー: 自分のキュー状態
        queue_items = AnalysisQueue.objects.filter(user=request.user)
    
    queue_data = []
    for item in queue_items:
        queue_data.append({
            'id': item.id,
            'image_id': item.image.id,
            'filename': item.image.filename,
            'position': item.position,
            'status': item.status,
            'status_display': item.get_status_display(),
            'priority': item.priority,
            'priority_display': item.get_priority_display(),
            'waiting_position': item.waiting_position,
            'estimated_wait_time': item.estimated_wait_time,
            'queued_at': item.queued_at.strftime('%Y-%m-%d %H:%M'),
        })
    
    return JsonResponse({
        'ok': True,
        'queue_items': queue_data
    })


@require_POST
@csrf_protect
@login_required
def start_queue_processing_view(request):
    """キュー処理を開始"""
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': '管理者権限が必要です'}, status=403)
    
    # 次の処理対象を取得
    next_item = AnalysisQueue.get_next_item()
    
    if not next_item:
        return JsonResponse({'ok': False, 'error': '処理対象のキューアイテムがありません'})
    
    # 実際の解析処理を開始（非同期）
    import threading
    from .services import analysis_service
    
    def process_async():
        result = analysis_service.process_queue_item(next_item.id)
        if result['success']:
            print(f"解析完了: {result['message']}")
        else:
            print(f"解析失敗: {result['error']}")
    
    # バックグラウンドで解析を実行
    thread = threading.Thread(target=process_async)
    thread.daemon = True
    thread.start()
    
    return JsonResponse({
        'ok': True,
        'queue_id': next_item.id,
        'image_id': next_item.image.id,
        'message': f'解析を開始しました: {next_item.image.filename}'
    })


@require_POST
@csrf_protect
@login_required
def complete_queue_processing_view(request):
    """キュー処理を完了"""
    if not request.user.is_staff:
        return JsonResponse({'ok': False, 'error': '管理者権限が必要です'}, status=403)
    
    queue_id = request.POST.get('queue_id')
    success = request.POST.get('success', 'true').lower() == 'true'
    error_message = request.POST.get('error_message', '')
    
    try:
        queue_item = AnalysisQueue.objects.get(id=queue_id)
        
        if success:
            queue_item.status = 'completed'
            queue_item.image.status = 'success'
        else:
            queue_item.status = 'failed'
            queue_item.image.status = 'failed'
            queue_item.error_message = error_message
            queue_item.retry_count += 1
        
        queue_item.completed_at = timezone.now()
        queue_item.save()
        queue_item.image.save()
        
        return JsonResponse({
            'ok': True,
            'message': f'処理を完了しました: {queue_item.image.filename}'
        })
        
    except AnalysisQueue.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'キューアイテムが見つかりません'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
@login_required
def api_complete_analysis(request: HttpRequest):
    """解析完了API"""
    import json
    import logging
    from django.utils import timezone
    
    logger = logging.getLogger(__name__)
    
    try:
        data = json.loads(request.body)
        image_id = data.get('image_id')
        
        if not image_id:
            return JsonResponse({'ok': False, 'error': '画像IDが指定されていません'}, status=400)
        
        try:
            image = Image.objects.get(id=image_id, user=request.user)
        except Image.DoesNotExist:
            return JsonResponse({'ok': False, 'error': '画像が見つかりません'}, status=404)
        
        # 画像のステータスを完了に更新
        image.status = 'completed'
        image.save()
        
        # タイムラインログを更新
        timeline_log, created = TimelineLog.objects.get_or_create(
            image=image,
            defaults={
                'upload_started_at': timezone.now(),
                'upload_completed_at': timezone.now(),
                'analysis_started_at': timezone.now(),
                'analysis_completed_at': timezone.now()
            }
        )
        if not created:
            timeline_log.analysis_completed_at = timezone.now()
            timeline_log.save()
        
        logger.info(f"解析完了: 画像ID={image_id}, ファイル名={image.filename}")
        
        return JsonResponse({
            'ok': True,
            'message': f'画像 {image.filename} の解析が完了しました',
            'image_id': image_id,
            'status': 'completed'
        })
        
    except Exception as e:
        logger.error(f"解析完了APIでエラー: {e}")
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@require_POST
@csrf_protect
def api_retry_analysis(request: HttpRequest):
    """失敗した画像の再解析API"""
    import json
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        data = json.loads(request.body)
        image_id = data.get('image_id')
        
        if not image_id:
            return JsonResponse({'success': False, 'error': '画像IDが必要です'}, status=400)
        
        # 画像を取得
        try:
            image = Image.objects.get(id=image_id)
        except Image.DoesNotExist:
            return JsonResponse({'success': False, 'error': '画像が見つかりません'}, status=404)
        
        # 再解析可能なステータスをチェック（アップロード済み、解析済み、または失敗した画像）
        if image.status not in ['uploaded', 'failed', 'completed', 'analyzing']:
            return JsonResponse({'success': False, 'error': f'再解析可能な画像ではありません。現在のステータス: {image.status}'}, status=400)
        
        # 画像のステータスをリセット
        image.status = 'uploaded'
        image.save()
        
        # 既存のエラーログをクリア
        from .models import ProgressLog
        ProgressLog.objects.filter(image=image, current_stage__icontains='error').delete()
        
        # 既存のキューアイテムを削除（すべてのステータス）
        from .models import AnalysisQueue
        AnalysisQueue.objects.filter(image=image).delete()
        
        # 既存の解析結果を削除
        from .models import AnalysisResult
        AnalysisResult.objects.filter(image=image).delete()
        
        # タイムラインログをリセット
        from .models import TimelineLog
        timeline_log, created = TimelineLog.objects.get_or_create(
            image=image,
            defaults={}
        )
        timeline_log.analysis_started_at = None
        timeline_log.analysis_completed_at = None
        timeline_log.model_used = None
        timeline_log.save()
        
        logger.info(f"画像再解析準備完了: ID={image.id}, ファイル名={image.filename}")
        
        return JsonResponse({
            'success': True, 
            'message': '再解析の準備が完了しました。モデルを選択して解析を開始してください。'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '無効なJSONデータです'}, status=400)
    except Exception as e:
        logger.error(f"再解析APIでエラー発生: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)