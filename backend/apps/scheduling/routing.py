from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/generation/(?P<generation_id>[^/]+)/$', consumers.TimetableGenerationConsumer.as_asgi()),
]
