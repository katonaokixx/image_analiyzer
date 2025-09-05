import os
import logging
import numpy as np
from PIL import Image as PILImage
import requests
import time
from typing import List, Dict, Optional
from django.conf import settings
from django.utils import timezone
from .models import Image, AnalysisResult, TimelineLog, ProgressLog, AnalysisQueue

logger = logging.getLogger(__name__)

class AnalysisService:
    def __init__(self):
        self.models = {}
        self._load_models()
    
    def _load_models(self):
        """利用可能なモデルを読み込む"""
        try:
            # PyTorch ResNet-50
            self._load_pytorch_resnet50()
            
            # PyTorch MobileNet
            self._load_pytorch_mobilenet()
            
            # PyTorch VGG-16
            self._load_pytorch_vgg16()
            
            # CLIP
            self._load_clip()
            
            # モデル読み込み完了
            
        except Exception as e:
            logger.error(f"モデル読み込みエラー: {e}")
    
    def _load_pytorch_resnet50(self):
        """PyTorch ResNet-50モデルを読み込む"""
        try:
            import torch
            import torchvision.transforms as transforms
            from torchvision.models import resnet50, ResNet50_Weights
            
            # モデル読み込み
            model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
            model.eval()
            
            # 前処理定義
            transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            self.models['pytorch_resnet50'] = {
                'model': model,
                'transform': transform,
                'input_size': (224, 224),
                'type': 'pytorch_resnet50'
            }
            # PyTorch ResNet-50 読み込み完了
            
        except Exception as e:
            logger.error(f"PyTorch ResNet-50 読み込みエラー: {e}")
            self.models['pytorch_resnet50'] = {
                'model': None,
                'transform': None,
                'input_size': (224, 224),
                'type': 'pytorch_resnet50'
            }
    
    def _load_pytorch_mobilenet(self):
        """PyTorch MobileNetモデルを読み込む"""
        try:
            import torch
            import torchvision.transforms as transforms
            from torchvision.models import mobilenet_v2, MobileNet_V2_Weights
            
            # モデル読み込み
            model = mobilenet_v2(weights=MobileNet_V2_Weights.IMAGENET1K_V1)
            model.eval()
            
            # 前処理定義
            transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            self.models['pytorch_mobilenet'] = {
                'model': model,
                'transform': transform,
                'input_size': (224, 224),
                'type': 'pytorch_mobilenet'
            }
            # PyTorch MobileNet 読み込み完了
            
        except Exception as e:
            logger.error(f"PyTorch MobileNet 読み込みエラー: {e}")
            self.models['pytorch_mobilenet'] = {
                'model': None,
                'transform': None,
                'input_size': (224, 224),
                'type': 'pytorch_mobilenet'
            }
    
    def _load_pytorch_vgg16(self):
        """PyTorch VGG-16モデルを読み込む"""
        try:
            import torch
            import torchvision.transforms as transforms
            from torchvision.models import vgg16, VGG16_Weights
            
            # モデル読み込み
            model = vgg16(weights=VGG16_Weights.IMAGENET1K_V1)
            model.eval()
            
            # 前処理定義
            transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            self.models['pytorch_vgg16'] = {
                'model': model,
                'transform': transform,
                'input_size': (224, 224),
                'type': 'pytorch_vgg16'
            }
            # PyTorch VGG-16 読み込み完了
            
        except Exception as e:
            logger.error(f"PyTorch VGG-16 読み込みエラー: {e}")
            self.models['pytorch_vgg16'] = {
                'model': None,
                'transform': None,
                'input_size': (224, 224),
                'type': 'pytorch_vgg16'
            }
    
    def _load_clip(self):
        """CLIPモデルを読み込む"""
        try:
            import clip
            
            # モデル読み込み
            model, preprocess = clip.load("ViT-B/32", device="cpu")
            
            self.models['clip'] = {
                'model': model,
                'preprocess': preprocess,
                'input_size': (224, 224),
                'type': 'clip'
            }
            # CLIP 読み込み完了
            
        except Exception as e:
            logger.error(f"CLIP 読み込みエラー: {e}")
            self.models['clip'] = {
                'model': None,
                'preprocess': None,
                'input_size': (224, 224),
                'type': 'clip'
            }
    
    def get_available_models(self):
        """利用可能なモデル一覧を取得"""
        available = []
        for name, info in self.models.items():
            if info['model'] is not None:
                available.append({
                    'name': name,
                    'display_name': self._get_model_display_name(name),
                    'type': info['type']
                })
        return available
    
    def _get_model_display_name(self, model_name):
        """モデルの表示名を取得"""
        display_names = {
            'pytorch_resnet50': 'PyTorch ResNet-50',
            'pytorch_mobilenet': 'PyTorch MobileNet',
            'pytorch_vgg16': 'PyTorch VGG-16',
            'clip': 'CLIP'
        }
        return display_names.get(model_name, model_name)
    
    def preprocess_image(self, image_path: str, input_size: tuple) -> np.ndarray:
        """画像の前処理"""
        try:
            # 画像読み込み
            image = PILImage.open(image_path).convert('RGB')
            
            # リサイズ
            image = image.resize(input_size)
            
            # numpy配列に変換
            img_array = np.array(image)
            
            # バッチ次元を追加
            img_array = np.expand_dims(img_array, axis=0)
            
            return img_array
            
        except Exception as e:
            logger.error(f"画像前処理エラー: {e}")
            raise
    
    def analyze_image(self, image_path: str, model_name: str) -> Dict:
        """単一画像の解析"""
        try:
            # 解析開始
            
            # フロントエンドのモデル名を内部モデル名にマッピング
            model_mapping = {
                'resnet50': 'pytorch_resnet50',
                'efficientnet': 'tensorflow_efficientnet',
                'mobilenet': 'pytorch_mobilenet',
                'vgg16': 'pytorch_vgg16',
                'clip': 'clip'
            }
            
            internal_model_name = model_mapping.get(model_name, model_name)
            # モデル名マッピング
            
            if internal_model_name not in self.models:
                available_models = list(self.models.keys())
                raise ValueError(f"未知のモデル: {model_name} (内部名: {internal_model_name}), 利用可能: {available_models}")
            
            model_info = self.models[internal_model_name]
            
            if model_info['model'] is None:
                raise ValueError(f"モデルが読み込まれていません: {model_name}")
            
            # 画像の前処理
            img_array = self.preprocess_image(image_path, model_info['input_size'])
            
            # モデル別の予測実行
            if model_info['type'] == 'pytorch_resnet50':
                predictions = self._predict_pytorch_resnet50(img_array, model_info)
            elif model_info['type'] == 'pytorch_mobilenet':
                predictions = self._predict_pytorch_mobilenet(img_array, model_info)
            elif model_info['type'] == 'pytorch_vgg16':
                predictions = self._predict_pytorch_vgg16(img_array, model_info)
            elif model_info['type'] == 'clip':
                predictions = self._predict_clip(img_array, model_info)
            else:
                raise ValueError(f"未対応のモデルタイプ: {model_info['type']}")
            
            # 結果を整形
            results = self._format_predictions(predictions, internal_model_name)
            
            return {
                'success': True,
                'results': results,
                'model_name': model_name
            }
            
        except Exception as e:
            logger.error(f"画像解析エラー: {e}")
            return {
                'success': False,
                'error': str(e),
                'model_name': model_name
            }
    
    def _predict_pytorch_resnet50(self, img_array: np.ndarray, model_info: Dict) -> np.ndarray:
        """PyTorch ResNet-50での予測"""
        import torch
        
        # PIL画像に変換
        pil_image = PILImage.fromarray(img_array[0].astype('uint8'))
        
        # transformを適用
        img_tensor = model_info['transform'](pil_image)
        img_tensor = img_tensor.unsqueeze(0)
        
        # 予測実行
        with torch.no_grad():
            outputs = model_info['model'](img_tensor)
            predictions = torch.softmax(outputs, dim=1)
        
        return predictions.numpy()
    
    def _predict_pytorch_mobilenet(self, img_array: np.ndarray, model_info: Dict) -> np.ndarray:
        """PyTorch MobileNetでの予測"""
        import torch
        
        # PIL画像に変換
        pil_image = PILImage.fromarray(img_array[0].astype('uint8'))
        
        # transformを適用
        img_tensor = model_info['transform'](pil_image)
        img_tensor = img_tensor.unsqueeze(0)
        
        # 予測実行
        with torch.no_grad():
            outputs = model_info['model'](img_tensor)
            predictions = torch.softmax(outputs, dim=1)
        
        return predictions.numpy()
    
    def _predict_pytorch_vgg16(self, img_array: np.ndarray, model_info: Dict) -> np.ndarray:
        """PyTorch VGG-16での予測"""
        import torch
        
        # PIL画像に変換
        pil_image = PILImage.fromarray(img_array[0].astype('uint8'))
        
        # transformを適用
        img_tensor = model_info['transform'](pil_image)
        img_tensor = img_tensor.unsqueeze(0)
        
        # 予測実行
        with torch.no_grad():
            outputs = model_info['model'](img_tensor)
            predictions = torch.softmax(outputs, dim=1)
        
        return predictions.numpy()
    
    def _predict_clip(self, img_array: np.ndarray, model_info: Dict) -> np.ndarray:
        """CLIPでの予測"""
        import torch
        
        # PIL画像に変換
        pil_image = PILImage.fromarray(img_array[0].astype('uint8'))
        
        # preprocessを適用
        img_tensor = model_info['preprocess'](pil_image)
        img_tensor = img_tensor.unsqueeze(0)
        
        # 予測実行
        with torch.no_grad():
            outputs = model_info['model'].encode_image(img_tensor)
            predictions = torch.softmax(outputs, dim=1)
        
        return predictions.numpy()
    
    def _get_imagenet_classes(self) -> Dict[int, str]:
        """ImageNetクラス名を取得"""
        try:
            # オンラインからImageNetクラス名を取得
            response = requests.get(
                "https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt",
                timeout=5
            )
            if response.status_code == 200:
                class_names = {}
                for i, line in enumerate(response.text.strip().split('\n')):
                    class_names[i] = line.strip()
                # ImageNetクラス名を取得
                return class_names
        except Exception as e:
            logger.warning(f"オンラインからImageNetクラス名を取得できませんでした: {e}")
        
        # フォールバック: 基本的なクラス名
        return self._get_basic_imagenet_classes()
    
    def _get_basic_imagenet_classes(self) -> Dict[int, str]:
        """基本的なImageNetクラス名（フォールバック）"""
        basic_classes = {
            0: "tench", 1: "goldfish", 2: "great_white_shark", 3: "tiger_shark",
            4: "hammerhead", 5: "electric_ray", 6: "stingray", 7: "cock",
            8: "hen", 9: "ostrich", 10: "brambling", 11: "goldfinch",
            12: "house_finch", 13: "junco", 14: "indigo_bunting", 15: "robin",
            16: "bulbul", 17: "jay", 18: "magpie", 19: "chickadee",
            20: "water_ouzel", 21: "kite", 22: "bald_eagle", 23: "vulture",
            24: "great_grey_owl", 25: "European_fire_salamander", 26: "common_newt",
            27: "eft", 28: "spotted_salamander", 29: "axolotl", 30: "bullfrog",
            31: "tree_frog", 32: "tailed_frog", 33: "loggerhead", 34: "leatherback_turtle",
            35: "mud_turtle", 36: "terrapin", 37: "box_turtle", 38: "banded_gecko",
            39: "common_iguana", 40: "American_chameleon", 41: "whiptail", 42: "agama",
            43: "frilled_lizard", 44: "alligator_lizard", 45: "Gila_monster", 46: "green_lizard",
            47: "African_chameleon", 48: "Komodo_dragon", 49: "African_crocodile",
            50: "American_alligator", 51: "triceratops", 52: "thunder_snake", 53: "ringneck_snake",
            54: "hognose_snake", 55: "green_snake", 56: "king_snake", 57: "garter_snake",
            58: "water_snake", 59: "vine_snake", 60: "night_snake", 61: "boa_constrictor",
            62: "rock_python", 63: "Indian_cobra", 64: "green_mamba", 65: "sea_snake",
            66: "horned_viper", 67: "diamondback", 68: "sidewinder", 69: "trilobite",
            70: "harvestman", 71: "scorpion", 72: "black_and_gold_garden_spider", 73: "barn_spider",
            74: "garden_spider", 75: "black_widow", 76: "tarantula", 77: "wolf_spider",
            78: "tick", 79: "centipede", 80: "black_grouse", 81: "ptarmigan",
            82: "ruffed_grouse", 83: "prairie_chicken", 84: "peacock", 85: "quail",
            86: "partridge", 87: "African_grey", 88: "macaw", 89: "sulphur_crested_cockatoo",
            90: "lorikeet", 91: "coucal", 92: "bee_eater", 93: "hornbill",
            94: "hummingbird", 95: "jacamar", 96: "toucan", 97: "drake",
            98: "red_breasted_merganser", 99: "goose", 100: "black_swan"
        }
        return basic_classes
    
    def _get_japanese_translation(self, english_name: str) -> str:
        """英語のクラス名を日本語に翻訳"""
        translations = {
            "tench": "テンチ（コイ科の魚）",
            "goldfish": "金魚",
            "great_white_shark": "ホオジロザメ",
            "tiger_shark": "イタチザメ",
            "hammerhead": "シュモクザメ",
            "electric_ray": "シビレエイ",
            "stingray": "アカエイ",
            "cock": "雄鶏",
            "hen": "雌鶏",
            "ostrich": "ダチョウ",
            "brambling": "アトリ",
            "goldfinch": "ゴシキヒワ",
            "house_finch": "メキシコマシコ",
            "junco": "ユキヒメドリ",
            "indigo_bunting": "インディゴホオジロ",
            "robin": "コマツグミ",
            "bulbul": "ヒヨドリ",
            "jay": "カケス",
            "magpie": "カササギ",
            "chickadee": "シジュウカラ",
            "water_ouzel": "カワガラス",
            "kite": "トビ",
            "bald_eagle": "ハクトウワシ",
            "vulture": "ハゲワシ",
            "great_grey_owl": "カラフトフクロウ",
            "European_fire_salamander": "ヨーロッパサンショウウオ",
            "common_newt": "イモリ",
            "eft": "イモリの幼体",
            "spotted_salamander": "斑点サンショウウオ",
            "axolotl": "ウーパールーパー",
            "bullfrog": "ウシガエル",
            "tree_frog": "アマガエル",
            "tailed_frog": "尾のあるカエル",
            "loggerhead": "アカウミガメ",
            "leatherback_turtle": "オサガメ",
            "mud_turtle": "ヌマガメ",
            "terrapin": "テラピン",
            "box_turtle": "ハコガメ",
            "banded_gecko": "縞模様のヤモリ",
            "common_iguana": "グリーンイグアナ",
            "American_chameleon": "アメリカカメレオン",
            "whiptail": "鞭尾トカゲ",
            "agama": "アガマ",
            "frilled_lizard": "エリマキトカゲ",
            "alligator_lizard": "ワニトカゲ",
            "Gila_monster": "ドクトカゲ",
            "green_lizard": "緑のトカゲ",
            "African_chameleon": "アフリカカメレオン",
            "Komodo_dragon": "コモドオオトカゲ",
            "African_crocodile": "アフリカワニ",
            "American_alligator": "アメリカワニ",
            "triceratops": "トリケラトプス",
            "thunder_snake": "雷ヘビ",
            "ringneck_snake": "リングネックヘビ",
            "hognose_snake": "ブタノスヘビ",
            "green_snake": "緑のヘビ",
            "king_snake": "キングスネーク",
            "garter_snake": "ガータースネーク",
            "water_snake": "水ヘビ",
            "vine_snake": "つるヘビ",
            "night_snake": "夜ヘビ",
            "boa_constrictor": "ボアコンストリクター",
            "rock_python": "ロックパイソン",
            "Indian_cobra": "インドコブラ",
            "green_mamba": "グリーンマンバ",
            "sea_snake": "ウミヘビ",
            "horned_viper": "角のあるクサリヘビ",
            "diamondback": "ダイヤモンドバック",
            "sidewinder": "サイドワインダー",
            "trilobite": "三葉虫",
            "harvestman": "ザトウムシ",
            "scorpion": "サソリ",
            "black_and_gold_garden_spider": "黒と金の庭クモ",
            "barn_spider": "納屋クモ",
            "garden_spider": "庭クモ",
            "black_widow": "クロゴケグモ",
            "tarantula": "タランチュラ",
            "wolf_spider": "オオカミグモ",
            "tick": "ダニ",
            "centipede": "ムカデ",
            "black_grouse": "クロライチョウ",
            "ptarmigan": "ライチョウ",
            "ruffed_grouse": "エリマキライチョウ",
            "prairie_chicken": "プレーリーチキン",
            "peacock": "クジャク",
            "quail": "ウズラ",
            "partridge": "ヤマウズラ",
            "African_grey": "アフリカングレー",
            "macaw": "コンゴウインコ",
            "sulphur_crested_cockatoo": "キバタン",
            "lorikeet": "ロリキート",
            "coucal": "バンケン",
            "bee_eater": "ハチクイ",
            "hornbill": "サイチョウ",
            "hummingbird": "ハチドリ",
            "jacamar": "ヤマセミ",
            "toucan": "オオハシ",
            "drake": "雄のカモ",
            "red_breasted_merganser": "アカハシアイサ",
            "goose": "ガチョウ",
            "black_swan": "コクチョウ"
        }
        return translations.get(english_name, english_name)
    
    def _format_predictions(self, predictions: np.ndarray, model_name: str) -> List[Dict]:
        """予測結果を整形する"""
        try:
            # フロントエンドのモデル名を内部モデル名にマッピング
            model_mapping = {
                'resnet50': 'pytorch_resnet50',
                'efficientnet': 'tensorflow_efficientnet',
                'mobilenet': 'pytorch_mobilenet',
                'vgg16': 'pytorch_vgg16',
                'clip': 'clip'
            }
            
            internal_model_name = model_mapping.get(model_name, model_name)
            
            # ImageNetクラス名を読み込み
            class_names = self._get_imagenet_classes()
            
            # 上位5つの予測結果を取得
            top_indices = np.argsort(predictions[0])[-5:][::-1]
            
            results = []
            for i, idx in enumerate(top_indices):
                confidence = float(predictions[0][idx]) * 100
                english_name = class_names.get(idx, f"Class_{idx}")
                japanese_name = self._get_japanese_translation(english_name)
                
                # 日本語名と英語名を組み合わせて表示
                display_name = f"{japanese_name} ({english_name})" if japanese_name != english_name else japanese_name
            
                results.append({
                    'label': display_name,
                    'confidence': confidence,
                    'rank': i + 1
                })
        
            return results
    
        except Exception as e:
            logger.error(f"予測結果の整形に失敗: {e}")
            return [{'label': 'Error', 'confidence': 0.0, 'rank': 1}]

    def process_queue_item(self, queue_item_id: int) -> Dict:
        """キューアイテムを処理する"""
        try:
            from .models import AnalysisQueue, Image, AnalysisResult, TimelineLog
            
            # キューアイテムを取得
            queue_item = AnalysisQueue.objects.get(id=queue_item_id)
            image = queue_item.image
            
            # キューアイテム処理開始
            
            # 画像のステータスを解析中に更新
            image.status = 'analyzing'
            image.save()
            
            # タイムラインログを追加
            timeline_log, created = TimelineLog.objects.get_or_create(
                image=image,
                defaults={}
            )
            timeline_log.analysis_started_at = timezone.now()
            timeline_log.model_used = queue_item.model_name
            timeline_log.save()
            
            # 画像解析を実行
            result = self.analyze_image(image.file_path, queue_item.model_name)
            
            if result['success']:
                # 解析成功
                image.status = 'completed'
                image.save()
                
                # 解析結果を保存
                for i, pred in enumerate(result['results']):
                    AnalysisResult.objects.create(
                        image=image,
                        model_name=queue_item.model_name,
                        label=pred['label'],
                        confidence=pred['confidence'],
                        rank=pred['rank'],
                        model_version='1.0.0'  # デフォルトバージョン
                    )
                
                # キューアイテムを完了に更新
                queue_item.status = 'completed'
                queue_item.completed_at = timezone.now()
                queue_item.save()
                
                # タイムラインログを追加
                timeline_log, created = TimelineLog.objects.get_or_create(
                    image=image,
                    defaults={}
                )
                timeline_log.analysis_completed_at = timezone.now()
                timeline_log.save()
                    
                # 解析完了
                return {'success': True, 'message': f'画像ID {image.id} の解析が完了しました'}
                    
            else:
                # 解析失敗
                image.status = 'failed'
                image.save()
                
                # 失敗時の進捗ログを作成
                ProgressLog.objects.create(
                    image=image,
                    progress_percentage=0.0,
                    current_stage='failed',
                    stage_description=f'解析失敗: {result.get("error", "Unknown error")}'
                )
                
                # キューアイテムを失敗に更新
                queue_item.status = 'failed'
                queue_item.completed_at = timezone.now()
                queue_item.error_message = result.get('error', 'Unknown error')
                queue_item.save()
                
                # タイムラインログを追加
                timeline_log, created = TimelineLog.objects.get_or_create(
                    image=image,
                    defaults={}
                )
                # 失敗時は解析完了時刻は更新しない
                timeline_log.save()
                
                logger.error(f"解析失敗: 画像ID={image.id}, エラー={result['error']}")
                return {'success': False, 'error': result['error']}
            
        except Exception as e:
            logger.error(f"キューアイテム処理エラー: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_analysis_progress(self) -> Dict:
        """解析進捗を取得する"""
        try:
            from .models import Image, ProgressLog
            from django.utils import timezone
            
            # 解析中または準備中の画像を取得
            processing_images = Image.objects.filter(status__in=['preparing', 'analyzing'])
            total_processing = processing_images.count()
            
            # 失敗した画像を取得
            failed_images = Image.objects.filter(status='failed')
            total_failed = failed_images.count()
            
            # 完了した画像を取得
            completed_images = Image.objects.filter(status='completed')
            total_completed = completed_images.count()
            
            # 解析中の画像がない場合
            if total_processing == 0:
                # 完了した画像がある場合
                if total_completed > 0:
                    return {
                        'progress': 100,
                        'status': 'completed',
                        'current_stage': 'completed',
                        'description': '解析完了'
                    }
                
                # 失敗した画像がある場合
                if total_failed > 0:
                    # 最新の失敗ログから進捗を取得
                    latest_failed_progress = ProgressLog.objects.filter(
                        image__in=failed_images
                    ).order_by('-timestamp').first()
                    
                    if latest_failed_progress:
                        return {
                            'progress': float(latest_failed_progress.progress_percentage),
                            'status': 'failed',
                            'current_stage': latest_failed_progress.current_stage,
                            'description': latest_failed_progress.stage_description
                        }
                    else:
                        return {
                            'progress': 0,
                            'status': 'failed',
                            'current_stage': 'failed',
                            'description': '解析失敗'
                        }
                
                # 解析待ちの状態
                return {
                    'progress': 0,
                    'status': 'waiting',
                    'current_stage': 'waiting',
                    'description': '解析待ち...'
                }
            
            # 最新の進捗ログから進捗を取得
            latest_progress = ProgressLog.objects.filter(
                image__in=processing_images
            ).order_by('-timestamp').first()
            
            if latest_progress:
                return {
                    'progress': float(latest_progress.progress_percentage),
                    'status': 'analyzing',
                    'current_stage': latest_progress.current_stage,
                    'description': latest_progress.stage_description
                }
            else:
                return {
                    'progress': 0,
                    'status': 'analyzing',
                    'current_stage': 'preparing',
                    'description': '解析準備中...'
                }
                
        except Exception as e:
            logger.error(f"進捗取得エラー: {e}")
            return {
                'progress': 0,
                'status': 'error',
                'current_stage': 'error',
                'description': f'エラー: {str(e)}'
            }

# シングルトンインスタンス
analysis_service = AnalysisService()
