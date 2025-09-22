from django.urls import path
from . import views

urlpatterns = [
    # 認証関連URL（v2に移行）
    # path('login/', views.login_view, name='login'),
    # path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    # path('password-reset/', views.password_reset_request_view, name='password_reset_request'),
    # path('password-reset/confirm/', views.password_reset_confirm_view, name='password_reset_confirm'),
    # path('password-reset/success/', views.password_reset_success_view, name='password_reset_success'),
    
    # 既存のURL
    path('', views.user_image_table, name='user_image_table'),
    path('user_image_table/', views.user_image_table, name='user_image_table_alt'),
    # 新UI統一: test_upload を image_upload に改名済み。
    path('image_upload/', views.image_upload, name='image_upload'),
    path('re_image_upload/', views.re_image_upload, name='re_image_upload'),
    path('admin_table/', views.admin_image_table, name='admin_image_table'),
    path('api/form-upload/', views.api_form_upload, name='api_form_upload'),
    path('api/set-selected-image/', views.api_set_selected_image, name='api_set_selected_image'),
    path('api/select-model/', views.api_select_model, name='api_select_model'),
    path('api/analysis/start/', views.api_start_analysis, name='api_start_analysis'),
    path('api/analysis/progress/', views.api_analysis_progress, name='api_analysis_progress'),
    path('api/analysis/complete/', views.api_complete_analysis, name='api_complete_analysis'),
    path('api/analysis/retry/', views.api_retry_analysis, name='api_retry_analysis'),
    path('api/update-status/', views.api_update_status, name='api_update_status'),
    path('api/timeline/<int:image_id>/', views.api_get_timeline, name='api_get_timeline'),
    path('api/images/<int:image_id>/delete/', views.api_delete_image, name='api_delete_image'),
    
    # 解析キュー管理システム
    path('queue/', views.queue_management_view, name='queue_management'),
    path('api/queue/add/', views.add_to_queue_view, name='add_to_queue'),
    path('api/queue/remove/', views.remove_from_queue_view, name='remove_from_queue'),
    path('api/queue/change-position/', views.change_queue_position_view, name='change_queue_position'),
    path('api/queue/change-priority/', views.change_queue_priority_view, name='change_queue_priority'),
    path('api/queue/change-model/', views.change_queue_model_view, name='change_queue_model'),
    path('api/queue/status/', views.get_queue_status_view, name='get_queue_status'),
    path('api/queue/start-processing/', views.start_queue_processing_view, name='start_queue_processing'),
    path('api/queue/complete-processing/', views.complete_queue_processing_view, name='complete_queue_processing'),
]