from django.urls import path
from . import views

urlpatterns = [
    # 認証関連URL（既存の認証システムを使用）
    path('login/', views.login_view, name='v2_login'),
    path('signup/', views.signup_view, name='v2_signup'),
    path('logout/', views.logout_view, name='v2_logout'),
    path('password-reset/', views.password_reset_request_view, name='v2_password_reset_request'),
    path('password-reset/confirm/', views.password_reset_confirm_view, name='v2_password_reset_confirm'),
    path('password-reset/success/', views.password_reset_success_view, name='v2_password_reset_success'),
    
    # メイン機能URL（新しいモデルを使用）
    path('', views.user_image_table, name='v2_user_image_table'),
    path('user_image_table/', views.user_image_table, name='v2_user_image_table_alt'),
    path('image_upload/', views.image_upload, name='v2_image_upload'),
    path('re_image_upload/', views.re_image_upload, name='v2_re_image_upload'),
    path('admin_table/', views.admin_image_table, name='v2_admin_image_table'),
    
    # API URL（新しいモデルを使用）
    path('api/form-upload/', views.api_form_upload, name='v2_api_form_upload'),
    path('api/set-selected-image/', views.api_set_selected_image, name='v2_api_set_selected_image'),
    path('api/select-model/', views.api_select_model, name='v2_api_select_model'),
    path('api/analysis/start/', views.api_start_analysis, name='v2_api_start_analysis'),
    path('api/analysis/progress/', views.api_analysis_progress, name='v2_api_analysis_progress'),
    path('api/analysis/complete/', views.api_complete_analysis, name='v2_api_complete_analysis'),
    path('api/analysis/retry/', views.api_retry_analysis, name='v2_api_retry_analysis'),
    path('api/update-status/', views.api_update_status, name='v2_api_update_status'),
    path('api/timeline/<int:image_id>/', views.api_get_timeline, name='v2_api_get_timeline'),
    path('api/images/<int:image_id>/detail/', views.api_image_detail, name='v2_api_image_detail'),
    path('api/images/<int:image_id>/delete/', views.api_delete_image, name='v2_api_delete_image'),
    
    # 解析キュー管理システム（新しいモデルを使用）
    path('queue/', views.queue_management_view, name='v2_queue_management'),
    path('api/queue/add/', views.add_to_queue_view, name='v2_add_to_queue'),
    path('api/queue/remove/', views.remove_from_queue_view, name='v2_remove_from_queue'),
    path('api/queue/change-position/', views.change_queue_position_view, name='v2_change_queue_position'),
    path('api/queue/change-priority/', views.change_queue_priority_view, name='v2_change_queue_priority'),
    path('api/queue/change-model/', views.change_queue_model_view, name='v2_change_queue_model'),
    path('api/queue/status/', views.get_queue_status_view, name='v2_get_queue_status'),
    path('api/queue/start-processing/', views.start_queue_processing_view, name='v2_start_queue_processing'),
    path('api/queue/complete-processing/', views.complete_queue_processing_view, name='v2_complete_queue_processing'),
    
    # 画像削除API
    path('api/images/<int:image_id>/delete/', views.api_delete_image, name='v2_api_delete_image'),
]
