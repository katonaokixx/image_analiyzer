from django.shortcuts import render

# Create your views here.
def user_image_table(request):
  """一般ユーザー向け画像テーブル"""
  return render(request, 'main/user_image_table.html')

def image_upload(request):
  """画像アップロード"""
  return render(request, 'main/image_upload.html')

def test(request):
  """テスト"""
  return render(request, 'main/test.html')

  