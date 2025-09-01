from django.urls import path
from . import views

urlpatterns = [
    path('', views.user_image_table, name='user_image_table'),
    path('image_upload/', views.image_upload, name='image_upload'),
    path('test/', views.test, name='test'),
]