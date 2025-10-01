"""
認証関連のビュー
ログイン、サインアップ、ログアウト、パスワードリセット
"""
from django.http import HttpRequest
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from ..models import MstUser


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
                # TODO: パスワードリセット機能実装時にPasswordResetTokenモデルを作成
                # パスワードリセットトークン生成
                # token = get_random_string(32)
                # PasswordResetToken.objects.create(...)
                
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
    
    # TODO: パスワードリセット機能実装時にPasswordResetTokenモデルを作成
    messages.error(request, 'この機能は現在利用できません。')
    return redirect('v2_password_reset_request')


def password_reset_success_view(request: HttpRequest):
    """パスワードリセット成功"""
    return render(request, 'auth/send_succefly_email.html')

