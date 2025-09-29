from django import template

register = template.Library()

@register.filter
def simple_filename(filename):
    """
    ファイル名をシンプル化するフィルター
    例: 20250926_043703__ (4).jpeg -> __ (4).jpeg
    """
    if not filename:
        return filename
    
    # ファイル名から拡張子を取得
    if '.' in filename:
        name_part, extension = filename.rsplit('.', 1)
        # アンダースコア2つ以降の部分を取得
        if '__' in name_part:
            simple_part = name_part.split('__', 1)[1]
            return f"{simple_part}.{extension}"
    
    return filename


