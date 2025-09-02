from django.urls import path
from . import views

urlpatterns = [
    path('', views.user_image_table, name='user_image_table'),
    # 新UI統一: test_upload を image_upload に改名済み。
    path('image_upload/', views.image_upload, name='image_upload'),
    path('admin_table/', views.admin_image_table, name='admin_image_table'),
    path('api/form-upload/', views.api_form_upload, name='api_form_upload'),
    path('api/analysis/start/', views.api_start_analysis, name='api_start_analysis'),
    path('api/analysis/progress/', views.api_analysis_progress, name='api_analysis_progress'),
    path('api/update-status/', views.api_update_status, name='api_update_status'),
    path('api/timeline/<int:image_id>/', views.api_get_timeline, name='api_get_timeline'),
]