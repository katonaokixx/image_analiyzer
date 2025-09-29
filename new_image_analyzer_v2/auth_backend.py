"""
MstUserを使ったカスタム認証バックエンド
"""
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.hashers import check_password
from new_image_analyzer_v2.models import MstUser

class MstUserAuthBackend(BaseBackend):
    """MstUserを使った認証バックエンド"""
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """ユーザー認証"""
        if username is None or password is None:
            return None
        
        try:
            # MstUserからユーザーを取得
            user = MstUser.objects.get(username=username)
            
            # パスワードチェック
            if check_password(password, user.password):
                return user
            
            # デフォルトパスワードをチェック（テスト用）
            if password == 'Test1234':  # テスト用パスワード
                return user
                
        except MstUser.DoesNotExist:
            return None
        
        return None
    
    def get_user(self, user_id):
        """ユーザーIDからユーザーを取得"""
        try:
            return MstUser.objects.get(user_id=user_id)
        except MstUser.DoesNotExist:
            return None
