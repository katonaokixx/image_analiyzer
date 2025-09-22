from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import os

# 既存のUserモデルを取得
User = get_user_model()


class MstUser(models.Model):
    """ユーザーマスタ（ER図に完全準拠）"""
    
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
    
    is_admin = models.BooleanField(
        default=False,
        verbose_name='管理者権限'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='アカウント有効性'
    )
    
    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )
    
    class Meta:
        db_table = 'mst_user_v2'
        verbose_name = 'ユーザーマスタ'
        verbose_name_plural = 'ユーザーマスタ'
    
    def __str__(self):
        return self.username


class TransUploadedImage(models.Model):
    """画像アップロードテーブル"""
    
    # ステータスの選択肢
    STATUS_CHOICES = [
        ('preparing', '準備中'),
        ('analyzing', '解析中'),
        ('success', '解析成功'),
        ('failed', '失敗'),
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
    
    upload_date = models.DateTimeField(
        default=timezone.now,
        verbose_name='アップロード日時'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='uploaded',
        verbose_name='ステータス'
    )
    
    # エラー情報
    upload_error = models.TextField(
        verbose_name='アップロードエラー',
        blank=True,
        null=True
    )
    
    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )
    
    class Meta:
        db_table = 'trans_uploaded_image_v2'
        verbose_name = '画像アップロード'
        verbose_name_plural = '画像アップロード'
        ordering = ['-upload_date']
    
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
        verbose_name='解析開始時刻',
        null=True,
        blank=True
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
    
    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )
    
    class Meta:
        db_table = 'trans_image_analysis_v2'
        verbose_name = '画像解析結果'
        verbose_name_plural = '画像解析結果'
        ordering = ['image_id', 'rank']
    
    def __str__(self):
        return f"{self.image_id.filename} - {self.label} ({self.confidence}%)"


class TransAnalysisTimeline(models.Model):
    """解析ログテーブル"""
    
    # 解析状態の選択肢
    ANALYSIS_STATUS_CHOICES = [
        ('not_started', '未開始'),
        ('in_progress', '解析中'),
        ('completed', '解析完了'),
        ('failed', '解析失敗'),
    ]
    
    # 主キー
    timeline_id = models.AutoField(
        primary_key=True,
        verbose_name='タイムラインID'
    )
    
    # 外部キー
    image_id = models.OneToOneField(
        TransUploadedImage,
        on_delete=models.CASCADE,
        verbose_name='画像ID',
        related_name='timeline_log',
        db_column='image_id'
    )
    
    # 解析状態
    analysis_status = models.CharField(
        max_length=20,
        choices=ANALYSIS_STATUS_CHOICES,
        default='not_started',
        verbose_name='解析状態'
    )
    
    # 前回解析結果
    previous_results = models.CharField(
        max_length=200,
        verbose_name='前回解析結果',
        blank=True,
        null=True
    )
    
    class Meta:
        db_table = 'trans_analysis_timeline_v2'
        verbose_name = '解析ログ'
        verbose_name_plural = '解析ログ'
    
    def __str__(self):
        return f"{self.image_id.filename} - {self.get_analysis_status_display()}"