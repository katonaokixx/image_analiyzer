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
    path('re_analysis/', views.re_analysis, name='v2_re_analysis'),
    path('admin_table/', views.admin_image_table, name='v2_admin_image_table'),
    
    # API URL（新しいモデルを使用）
    path('api/form-upload/', views.api_form_upload, name='v2_api_form_upload'),
    path('api/set-selected-image/', views.api_set_selected_image, name='v2_api_set_selected_image'),
    path('api/select-model/', views.api_select_model, name='v2_api_select_model'),
    path('api/analysis/start/', views.api_start_analysis, name='v2_api_start_analysis'),
    path('api/analysis/progress/', views.api_analysis_progress, name='v2_api_analysis_progress'),
    path('api/analysis/complete/', views.api_complete_analysis, name='v2_api_complete_analysis'),
    path('api/images/uploaded/', views.api_get_uploaded_images, name='v2_api_get_uploaded_images'),
    path('api/images/status/', views.api_get_images_status, name='v2_api_get_images_status'),
    path('api/analysis/retry/', views.api_retry_analysis, name='v2_api_retry_analysis'),
    path('api/update-status/', views.api_update_status, name='v2_api_update_status'),
    path('api/timeline/<int:image_id>/', views.api_get_timeline, name='v2_api_get_timeline'),
    path('api/images/<int:image_id>/detail/', views.api_image_detail, name='v2_api_image_detail'),
    path('api/images/<int:image_id>/delete/', views.api_delete_image, name='v2_api_delete_image'),
]
