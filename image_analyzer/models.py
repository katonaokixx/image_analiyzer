from django.db import models
from django.conf import settings
import os
import urllib.parse

# Create your models here.

class MLModel(models.Model):
    """機械学習モデル管理テーブル"""
    
    # モデル名の選択肢
    MODEL_CHOICES = [
        ('resnet50', 'ResNet-50 v2.1'),
        ('efficientnet', 'EfficientNet-B0'),
        ('mobilenet', 'MobileNet v2'),
        ('vgg16', 'VGG-16'),
        ('custom', 'カスタムモデル'),
    ]
    
    name = models.CharField(
        max_length=50,
        choices=MODEL_CHOICES,
        verbose_name='モデル名'
    )
    
    version = models.CharField(
        max_length=20,
        default='1.0.0',
        verbose_name='バージョン'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='使用可能'
    )
    
    description = models.TextField(
        verbose_name='モデル説明',
        help_text='モデルの特徴や用途について説明'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )
    
    class Meta:
        db_table = 'ml_models'
        verbose_name = '機械学習モデル'
        verbose_name_plural = '機械学習モデル'
        ordering = ['name', 'version']
    
    def __str__(self):
        return f"{self.get_name_display()} v{self.version}"


class Image(models.Model):
    """画像管理テーブル"""
    
    # ステータスの選択肢
    STATUS_CHOICES = [
        ('preparing', '準備中'),
        ('analyzing', '解析中'),
        ('success', '解析成功'),
        ('failed', '失敗'),
    ]
    
    filename = models.CharField(
        max_length=255,
        verbose_name='ファイル名'
    )
    
    file_path = models.CharField(
        max_length=500,
        verbose_name='ファイル保存パス'
    )
    
    thumbnail_path = models.CharField(
        max_length=500,
        verbose_name='サムネイル画像パス',
        blank=True,
        null=True
    )
    
    upload_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name='アップロード日時'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='preparing',
        verbose_name='ステータス'
    )
    
    model_used = models.ForeignKey(
        MLModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='使用モデル'
    )
    
    error_log = models.TextField(
        verbose_name='エラーログ',
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )
    
    class Meta:
        db_table = 'images'
        verbose_name = '画像'
        verbose_name_plural = '画像'
        ordering = ['-upload_date']
    
    def __str__(self):
        return f"{self.filename} ({self.get_status_display()})"
    
    @property
    def file_url(self):
        """Webアクセス可能なファイルURLを生成"""
        if self.file_path:
            # 絶対パスから相対パスに変換
            relative_path = os.path.relpath(self.file_path, settings.MEDIA_ROOT)
            # ファイル名をURLエンコード
            encoded_path = urllib.parse.quote(relative_path, safe='/')
            return f"{settings.MEDIA_URL}{encoded_path}"
        return None
    
    @property
    def thumbnail_url(self):
        """Webアクセス可能なサムネイルURLを生成"""
        if self.thumbnail_path:
            # 絶対パスから相対パスに変換
            relative_path = os.path.relpath(self.thumbnail_path, settings.MEDIA_ROOT)
            # ファイル名をURLエンコード
            encoded_path = urllib.parse.quote(relative_path, safe='/')
            return f"{settings.MEDIA_URL}{encoded_path}"
        return self.file_url  # サムネイルがない場合は元画像を使用


class ProgressLog(models.Model):
    """進捗ログ管理テーブル"""
    
    # 解析段階の選択肢
    STAGE_CHOICES = [
        ('preprocessing', '前処理'),
        ('model_execution', 'モデル実行'),
        ('postprocessing', '後処理'),
        ('completed', '完了'),
    ]
    
    image = models.ForeignKey(
        Image,
        on_delete=models.CASCADE,
        verbose_name='画像',
        related_name='progress_logs'
    )
    
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='進捗率',
        help_text='0.00〜100.00の範囲'
    )
    
    current_stage = models.CharField(
        max_length=20,
        choices=STAGE_CHOICES,
        verbose_name='現在の段階'
    )
    
    stage_description = models.TextField(
        verbose_name='段階の詳細説明',
        blank=True,
        null=True
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name='ログ記録時刻'
    )
    
    estimated_completion = models.DateTimeField(
        verbose_name='推定完了時刻',
        blank=True,
        null=True
    )
    
    class Meta:
        db_table = 'progress_logs'
        verbose_name = '進捗ログ'
        verbose_name_plural = '進捗ログ'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.image.filename} - {self.get_current_stage_display()} ({self.progress_percentage}%)"


class AnalysisResult(models.Model):
    """解析結果管理テーブル"""
    
    image = models.ForeignKey(
        Image,
        on_delete=models.CASCADE,
        verbose_name='画像',
        related_name='analysis_results'
    )
    
    label = models.CharField(
        max_length=100,
        verbose_name='解析されたラベル'
    )
    
    confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='信頼度',
        help_text='0.00〜100.00%の範囲'
    )
    
    model_version = models.CharField(
        max_length=20,
        verbose_name='モデルバージョン',
        help_text='解析に使用したモデルのバージョン'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='解析実行日時'
    )
    
    class Meta:
        db_table = 'analysis_results'
        verbose_name = '解析結果'
        verbose_name_plural = '解析結果'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.image.filename} - {self.label} ({self.confidence}%)"


class TimelineLog(models.Model):
    """タイムラインログ管理テーブル"""
    
    image = models.OneToOneField(
        Image,
        on_delete=models.CASCADE,
        verbose_name='画像',
        related_name='timeline_log'
    )
    
    upload_started_at = models.DateTimeField(
        verbose_name='アップロード開始時刻',
        null=True,
        blank=True
    )
    
    upload_completed_at = models.DateTimeField(
        verbose_name='アップロード完了時刻',
        null=True,
        blank=True
    )
    
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
    
    model_used = models.CharField(
        max_length=50,
        verbose_name='使用モデル',
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )
    
    class Meta:
        db_table = 'timeline_logs'
        verbose_name = 'タイムラインログ'
        verbose_name_plural = 'タイムラインログ'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.image.filename} - Timeline"
    
    @property
    def upload_duration(self):
        """アップロード所要時間（秒）"""
        if self.upload_started_at and self.upload_completed_at:
            delta = self.upload_completed_at - self.upload_started_at
            return delta.total_seconds()
        return None
    
    @property
    def analysis_duration(self):
        """解析所要時間（秒）"""
        if self.analysis_started_at and self.analysis_completed_at:
            delta = self.analysis_completed_at - self.analysis_started_at
            return delta.total_seconds()
        return None
    
    @property
    def total_duration(self):
        """総所要時間（秒）"""
        if self.upload_started_at and self.analysis_completed_at:
            delta = self.analysis_completed_at - self.upload_started_at
            return delta.total_seconds()
        return None