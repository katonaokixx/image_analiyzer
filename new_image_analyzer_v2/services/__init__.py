"""
画像解析サービスパッケージ
"""

# 後方互換性のために、既存のAnalysisServiceをインポート
# 段階的なリファクタリングのため、一時的に旧services.pyから読み込む
import sys
import os

# 親ディレクトリのservices.pyをインポートできるようにする
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from ..services import AnalysisService
    __all__ = ['AnalysisService']
except ImportError:
    # services.pyが見つからない場合は何もしない
    pass

