from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import os


class MstUser(models.Model):
    """ユーザーマスタ（ER図に完全準拠）"""
    
    # Django認証システムに必要な属性
    REQUIRED_FIELDS = ['email']
    USERNAME_FIELD = 'username'
    
    # 主キー
    user_id = models.AutoField(
        primary_key=True,
        verbose_name='ユーザーID'
    )
    
    # 基本情報
    username = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='ユーザー名'
    )
    
    email = models.EmailField(
        unique=True,
        verbose_name='メールアドレス'
    )
    
    password = models.CharField(
        max_length=128,
        verbose_name='パスワード',
        default='pbkdf2_sha256$260000$dummy$dummy'  # ダミーパスワード
    )
    
    is_admin = models.BooleanField(
        default=False,
        verbose_name='管理者権限'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='アカウント有効性'
    )
    
    class Meta:
        db_table = 'mst_user_v2'
        verbose_name = 'ユーザーマスタ'
        verbose_name_plural = 'ユーザーマスタ'
    
    def __str__(self):
        return self.username
    
    # Django認証システム互換メソッド
    @property
    def is_authenticated(self):
        return True
    
    @property
    def is_anonymous(self):
        return False
    
    @property
    def pk(self):
        return self.user_id
    
    @property
    def is_staff(self):
        return self.is_admin
    
    @property
    def is_superuser(self):
        return self.is_admin
    
    def has_perm(self, perm, obj=None):
        return self.is_admin
    
    def has_module_perms(self, app_label):
        return self.is_admin
    
    def get_username(self):
        return self.username
    
    @classmethod
    def get_by_natural_key(cls, username):
        """Django認証システム用のメソッド"""
        return cls.objects.get(username=username)


class TransUploadedImage(models.Model):
    """画像アップロードテーブル"""
    
    # ステータスの選択肢
    STATUS_CHOICES = [
        ('uploading', 'アップロード中'),
        ('uploaded', 'アップロード完了'),
        ('analyzing', '解析中'),
        ('completed', '解析完了'),
        ('failed', '解析失敗'),
    ]
    
    # 主キー
    image_id = models.AutoField(
        primary_key=True,
        verbose_name='画像ID'
    )
    
    # 外部キー
    user_id = models.ForeignKey(
        MstUser,
        on_delete=models.CASCADE,
        verbose_name='ユーザーID',
        related_name='uploaded_images',
        db_column='user_id'
    )
    
    # 基本情報
    filename = models.CharField(
        max_length=255,
        verbose_name='ファイル名'
    )
    
    file_path = models.CharField(
        max_length=500,
        verbose_name='ファイルパス'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='analyzing',
        verbose_name='ステータス'
    )
    
    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='アップロード日時'
    )
    
    analysis_started_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='解析開始時刻'
    )
    
    analysis_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='解析完了時刻'
    )
    
    # タイムスタンプ
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )
    
    class Meta:
        db_table = 'trans_uploaded_image_v2'
        verbose_name = '画像アップロード'
        verbose_name_plural = '画像アップロード'
        ordering = ['-created_at']
    
    @property
    def thumbnail_url(self):
        """Webアクセス可能なサムネイルURLを生成"""
        from django.conf import settings
        import urllib.parse
        
        # ファイルパスから相対パスに変換
        relative_path = os.path.relpath(self.file_path, settings.MEDIA_ROOT)
        # ファイル名をURLエンコード
        encoded_path = urllib.parse.quote(relative_path, safe='/')
        return f"{settings.MEDIA_URL}{encoded_path}"
    
    def get_previous_results(self):
        """前回の解析結果を取得（最新の解析実行の結果を信頼度順で取得、上位3件）"""
        # まず最新の解析完了時刻を取得
        latest_analysis_time = TransImageAnalysis.objects.filter(image_id=self).order_by('-analysis_completed_at').first()
        if latest_analysis_time:
            # 最新の解析実行の結果を信頼度順で取得（上位3件まで）
            return TransImageAnalysis.objects.filter(
                image_id=self,
                analysis_completed_at=latest_analysis_time.analysis_completed_at
            ).order_by('-confidence')[:3]
        else:
            return TransImageAnalysis.objects.none()
    
    def get_previous_results_text(self):
        """前回の解析結果をテキスト形式で取得"""
        results = self.get_previous_results()
        if not results:
            return None
        
        result_texts = []
        for i, result in enumerate(results, 1):
            result_texts.append(f"{i}位: {result.label} ({result.confidence}%)")
        
        return " / ".join(result_texts)
    
    def __str__(self):
        return f"{self.filename} ({self.get_status_display()})"


class TransImageAnalysis(models.Model):
    """画像解析結果テーブル"""
    
    # 主キー
    analysis_id = models.AutoField(
        primary_key=True,
        verbose_name='解析ID'
    )
    
    # 外部キー
    image_id = models.ForeignKey(
        TransUploadedImage,
        on_delete=models.CASCADE,
        verbose_name='画像ID',
        related_name='analysis_results',
        db_column='image_id'
    )
    
    # 解析結果
    label = models.CharField(
        max_length=100,
        verbose_name='分類ラベル'
    )
    
    confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='信頼度',
        validators=[MinValueValidator(0.00), MaxValueValidator(100.00)]
    )
    
    model_name = models.CharField(
        max_length=50,
        verbose_name='モデル名'
    )
    
    rank = models.PositiveIntegerField(
        verbose_name='順位'
    )
    
    # 解析時刻
    analysis_started_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='解析開始時刻'
    )
    
    analysis_completed_at = models.DateTimeField(
        verbose_name='解析完了時刻',
        null=True,
        blank=True
    )
    
    # エラー情報
    analysis_error = models.TextField(
        verbose_name='解析エラー',
        blank=True,
        null=True
    )
    
    class Meta:
        db_table = 'trans_image_analysis_v2'
        verbose_name = '画像解析結果'
        verbose_name_plural = '画像解析結果'
        ordering = ['image_id', 'rank']
    
    def __str__(self):
        return f"{self.image_id.filename} - {self.label} ({self.confidence}%)"

