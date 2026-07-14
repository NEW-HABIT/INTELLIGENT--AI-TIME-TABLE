from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.ChatView.as_view(), name='ai-chat'),
    path('explain-conflict/', views.ExplainConflictView.as_view(), name='ai-explain'),
]
