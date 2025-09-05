from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinLengthValidator, RegexValidator, EmailValidator
from django.utils import timezone
from datetime import timedelta
import os
import urllib.parse

# Create your models here.

class User(AbstractUser):
    """カスタムユーザーモデル（最小構成）"""
    
    # Django標準フィールド（フロントエンド要件に合わせて）
    username = models.CharField(
        max_length=20,  # フロントエンド要件: 3-20文字
        unique=True,
        validators=[
            MinLengthValidator(3),
            RegexValidator(
                regex=r'^[a-zA-Z0-9_]+$',
                message='ユーザー名は英数字とアンダースコアのみ使用できます'
            )
        ],
        verbose_name='ユーザー名'
    )
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        verbose_name='メールアドレス'
    )
    
    # 権限管理（フロントエンド要件）
    is_staff = models.BooleanField(
        default=False,
        verbose_name='管理者権限'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='アカウント有効性'
    )
    
    # タイムスタンプ
    date_joined = models.DateTimeField(
        auto_now_add=True,
        verbose_name='登録日時'
    )
    last_login = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='最終ログイン'
    )
    
    class Meta:
        db_table = 'auth_user'
        verbose_name = 'ユーザー'
        verbose_name_plural = 'ユーザー'
    
    def __str__(self):
        return f"{self.username} ({self.email})"

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
        ('uploaded', 'アップロード完了'),
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
    
    # ユーザー関連付け
    user = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        verbose_name='アップロードユーザー',
        related_name='uploaded_images'
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
    
    model_name = models.CharField(
        max_length=50,
        verbose_name='使用モデル名',
        help_text='解析に使用したモデルの名前'
    )
    
    model_version = models.CharField(
        max_length=20,
        verbose_name='モデルバージョン',
        help_text='解析に使用したモデルのバージョン'
    )
    
    rank = models.PositiveIntegerField(
        verbose_name='順位',
        help_text='予測結果の順位（1位、2位など）'
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


class PasswordResetToken(models.Model):
    """パスワードリセットトークンモデル"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        db_table = 'password_reset_tokens'
        ordering = ['-created_at']

    def __str__(self):
        return f"PasswordResetToken for {self.user.username} - {self.created_at}"

    @property
    def is_expired(self):
        """トークンが期限切れかどうか"""
        expiry_time = self.created_at + timedelta(seconds=getattr(settings, 'PASSWORD_RESET_TIMEOUT', 3600))
        return timezone.now() > expiry_time

    @property
    def is_valid(self):
        """トークンが有効かどうか"""
        return not self.used and not self.is_expired

    def mark_as_used(self):
        """トークンを使用済みとしてマーク"""
        self.used = True
        self.save()


class AnalysisQueue(models.Model):
    """解析キュー管理モデル"""
    
    QUEUE_STATUS_CHOICES = [
        ('waiting', '待機中'),
        ('processing', '処理中'),
        ('completed', '完了'),
        ('failed', '失敗'),
        ('cancelled', 'キャンセル'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', '低'),
        ('normal', '通常'),
        ('high', '高'),
        ('urgent', '緊急'),
    ]
    
    # 基本情報
    image = models.OneToOneField(Image, on_delete=models.CASCADE, related_name='queue_item')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='queue_items')
    
    # キュー管理
    position = models.PositiveIntegerField(verbose_name='キュー位置')
    status = models.CharField(
        max_length=20, 
        choices=QUEUE_STATUS_CHOICES, 
        default='waiting',
        verbose_name='キュー状態'
    )
    priority = models.CharField(
        max_length=10, 
        choices=PRIORITY_CHOICES, 
        default='normal',
        verbose_name='優先度'
    )
    
    # タイムスタンプ
    queued_at = models.DateTimeField(auto_now_add=True, verbose_name='キュー追加日時')
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='処理開始日時')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='処理完了日時')
    
    # エラー情報
    error_message = models.TextField(blank=True, verbose_name='エラーメッセージ')
    retry_count = models.PositiveIntegerField(default=0, verbose_name='リトライ回数')
    
    # 処理設定
    model_name = models.CharField(max_length=100, blank=True, verbose_name='使用モデル')
    
    class Meta:
        db_table = 'analysis_queue'
        ordering = ['priority', 'position', 'queued_at']
        verbose_name = '解析キュー'
        verbose_name_plural = '解析キュー'

    def __str__(self):
        return f"Queue #{self.position}: {self.image.filename} ({self.get_status_display()})"

    @property
    def waiting_position(self):
        """待機中の位置（処理中より前の待機中アイテム数）"""
        if self.status != 'waiting':
            return 0
        
        waiting_count = AnalysisQueue.objects.filter(
            status='waiting',
            priority__gte=self.priority,
            position__lt=self.position
        ).count()
        
        return waiting_count + 1

    @property
    def estimated_wait_time(self):
        """推定待機時間（分）"""
        if self.status != 'waiting':
            return 0
        
        # 平均処理時間を5分と仮定
        avg_processing_time = 5
        return self.waiting_position * avg_processing_time

    def move_to_position(self, new_position):
        """キュー内の位置を変更"""
        if new_position == self.position:
            return
        
        # 他のアイテムの位置を調整
        if new_position > self.position:
            # 後ろに移動
            AnalysisQueue.objects.filter(
                position__gt=self.position,
                position__lte=new_position
            ).exclude(id=self.id).update(position=models.F('position') - 1)
        else:
            # 前に移動
            AnalysisQueue.objects.filter(
                position__gte=new_position,
                position__lt=self.position
            ).exclude(id=self.id).update(position=models.F('position') + 1)
        
        self.position = new_position
        self.save()

    def cancel(self):
        """キューからキャンセル"""
        self.status = 'cancelled'
        self.completed_at = timezone.now()
        self.save()
        
        # 後続のアイテムの位置を調整
        AnalysisQueue.objects.filter(
            position__gt=self.position
        ).update(position=models.F('position') - 1)

    @classmethod
    def get_next_item(cls):
        """次の処理対象アイテムを取得"""
        return cls.objects.filter(
            status='waiting'
        ).order_by('priority', 'position', 'queued_at').first()

    @classmethod
    def reorder_positions(cls):
        """キュー位置を再整理"""
        items = cls.objects.filter(
            status__in=['waiting', 'processing']
        ).order_by('priority', 'queued_at')
        
        for index, item in enumerate(items, 1):
            item.position = index
            item.save(update_fields=['position'])