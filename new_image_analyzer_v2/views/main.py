"""
メインページのビュー
画像テーブル、アップロードページ、再解析ページ
"""
import os
import json
import logging
from django.http import HttpRequest
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from ..models import MstUser, TransUploadedImage, TransImageAnalysis

logger = logging.getLogger(__name__)


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
        # ファイル名をそのまま表示（番号付与方式）
        image.simple_filename = image.filename
    
    context = {
        'page_obj': page_obj,
        'images': images_list,
        'has_data': len(images_list) > 0,
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
        'has_data': len(images_list) > 0,
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
        physical_filename = os.path.basename(img.file_path)
        uploaded_images_json.append({
            'id': img.image_id,
            'filename': img.filename,
            'thumbnail_url': f'/uploads/images/{physical_filename}',
            'status': img.status
        })
    
    # JSON文字列として変換
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
            # 新しいモデルを使用
            mst_user = MstUser.objects.get(username=request.user.username)
            selected_image = TransUploadedImage.objects.get(image_id=selected_image_id, user_id=mst_user)
            selected_image_status = selected_image.status
            
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
    
    # 前回の解析結果を取得
    previous_results = []
    if selected_image:
        try:
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
            logger.info(f"DEBUG: previous_results count = {previous_results.count()}")
            for i, result in enumerate(previous_results):
                logger.info(f"DEBUG: previous_results[{i}] = {result.label} ({result.confidence}%)")
        except Exception as e:
            logger.info(f"DEBUG: Error getting previous_results: {e}")
            previous_results = []
    
    # 前回解析結果のテキスト生成
    previous_results_text = None
    if previous_results and selected_image_status == 'completed':
        results_text = "直近の解析結果: "
        for i, r in enumerate(previous_results):
            label = r.label if r.label else 'Unknown'
            confidence = float(r.confidence) if r.confidence else 0
            results_text += f"{i+1}位: {label} ({confidence:.1f}%)"
            if i < len(previous_results) - 1:
                results_text += " / "
        
        previous_results_text = results_text
    
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
        'previous_results': previous_results,
        'previous_results_text': previous_results_text,
    }
    
    logger.info("DEBUG: Rendering template")
    return render(request, 'main/re_analysis.html', context)

