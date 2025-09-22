from django.contrib import admin
from .models import MstUser, TransUploadedImage, TransImageAnalysis, TransAnalysisTimeline


@admin.register(MstUser)
class MstUserAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'username', 'email', 'is_admin', 'is_active']
    list_filter = ['is_active', 'is_admin']
    search_fields = ['username', 'email']


@admin.register(TransUploadedImage)
class TransUploadedImageAdmin(admin.ModelAdmin):
    list_display = ['image_id', 'filename', 'user_id', 'status', 'upload_date']
    list_filter = ['status', 'upload_date', 'user_id']
    search_fields = ['filename', 'user_id__user__username']
    readonly_fields = ['image_id', 'created_at', 'updated_at']


@admin.register(TransImageAnalysis)
class TransImageAnalysisAdmin(admin.ModelAdmin):
    list_display = ['analysis_id', 'image_id', 'label', 'confidence', 'model_name', 'rank']
    list_filter = ['model_name', 'rank', 'analysis_started_at']
    search_fields = ['label', 'image_id__filename']
    readonly_fields = ['analysis_id', 'created_at', 'updated_at']


@admin.register(TransAnalysisTimeline)
class TransAnalysisTimelineAdmin(admin.ModelAdmin):
    list_display = ['timeline_id', 'image_id', 'analysis_status', 'previous_results']
    list_filter = ['analysis_status']
    search_fields = ['image_id__filename']
    readonly_fields = ['timeline_id']