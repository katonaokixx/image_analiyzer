import os
import logging
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Optional
from django.conf import settings
from .models import Image as ImageModel, MLModel, AnalysisResult, ProgressLog

logger = logging.getLogger(__name__)

class ImageAnalysisService:
    """画像解析サービスクラス"""
    
    def __init__(self):
        self.models = {}
        self.load_models()
    
    def load_models(self):
        """機械学習モデルを読み込む"""
        try:
            import tensorflow as tf
            
            # モデル定義（実際のモデルファイルがある場合は読み込み）
            self.models = {
                'resnet50': self._create_resnet50_model(),
                'efficientnet': self._create_efficientnet_model(),
                'mobilenet': self._create_mobilenet_model(),
                'vgg16': self._create_vgg16_model(),
                'custom': self._create_custom_model()
            }
            logger.info("機械学習モデルの読み込み完了")
        except ImportError as e:
            logger.error(f"TensorFlowの読み込みに失敗: {e}")
            # TensorFlowが利用できない場合はダミーモデルを使用
            self.models = {
                'resnet50': self._create_dummy_model(),
                'efficientnet': self._create_dummy_model(),
                'mobilenet': self._create_dummy_model(),
                'vgg16': self._create_dummy_model(),
                'custom': self._create_dummy_model()
            }
    
    def _create_resnet50_model(self):
        """ResNet-50モデルを作成"""
        try:
            import tensorflow as tf
            from tensorflow.keras.applications import ResNet50
            from tensorflow.keras.applications.resnet50 import preprocess_input
            
            model = ResNet50(weights='imagenet', include_top=True)
            return {
                'model': model,
                'preprocess': preprocess_input,
                'input_size': (224, 224)
            }
        except Exception as e:
            logger.error(f"ResNet-50モデルの作成に失敗: {e}")
            return self._create_dummy_model()
    
    def _create_efficientnet_model(self):
        """EfficientNetモデルを作成"""
        try:
            import tensorflow as tf
            from tensorflow.keras.applications import EfficientNetB0
            from tensorflow.keras.applications.efficientnet import preprocess_input
            
            model = EfficientNetB0(weights='imagenet', include_top=True)
            return {
                'model': model,
                'preprocess': preprocess_input,
                'input_size': (224, 224)
            }
        except Exception as e:
            logger.error(f"EfficientNetモデルの作成に失敗: {e}")
            return self._create_dummy_model()
    
    def _create_mobilenet_model(self):
        """MobileNetモデルを作成"""
        try:
            import tensorflow as tf
            from tensorflow.keras.applications import MobileNetV2
            from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
            
            model = MobileNetV2(weights='imagenet', include_top=True)
            return {
                'model': model,
                'preprocess': preprocess_input,
                'input_size': (224, 224)
            }
        except Exception as e:
            logger.error(f"MobileNetモデルの作成に失敗: {e}")
            return self._create_dummy_model()
    
    def _create_vgg16_model(self):
        """VGG-16モデルを作成"""
        try:
            import tensorflow as tf
            from tensorflow.keras.applications import VGG16
            from tensorflow.keras.applications.vgg16 import preprocess_input
            
            model = VGG16(weights='imagenet', include_top=True)
            return {
                'model': model,
                'preprocess': preprocess_input,
                'input_size': (224, 224)
            }
        except Exception as e:
            logger.error(f"VGG-16モデルの作成に失敗: {e}")
            return self._create_dummy_model()
    
    def _create_custom_model(self):
        """カスタムモデルを作成"""
        # 実際のカスタムモデルがある場合はここで読み込み
        return self._create_dummy_model()
    
    def _create_dummy_model(self):
        """ダミーモデルを作成（TensorFlowが利用できない場合）"""
        return {
            'model': None,
            'preprocess': lambda x: x,
            'input_size': (224, 224)
        }
    
    def preprocess_image(self, image_path: str, input_size: Tuple[int, int]) -> np.ndarray:
        """画像を前処理する"""
        try:
            # PILで画像を読み込み
            pil_image = Image.open(image_path)
            
            # RGBに変換
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # リサイズ
            pil_image = pil_image.resize(input_size)
            
            # NumPy配列に変換
            img_array = np.array(pil_image)
            
            # バッチ次元を追加
            img_array = np.expand_dims(img_array, axis=0)
            
            return img_array
        except Exception as e:
            logger.error(f"画像の前処理に失敗: {e}")
            raise
    
    def analyze_image(self, image_path: str, model_name: str) -> List[Dict]:
        """画像を解析する"""
        try:
            if model_name not in self.models:
                raise ValueError(f"未対応のモデル: {model_name}")
            
            model_info = self.models[model_name]
            
            # 画像の前処理
            img_array = self.preprocess_image(image_path, model_info['input_size'])
            
            # モデルが利用可能な場合
            if model_info['model'] is not None:
                # 前処理関数を適用
                img_array = model_info['preprocess'](img_array)
                
                # 予測実行
                predictions = model_info['model'].predict(img_array, verbose=0)
                
                # 結果を整形
                results = self._format_predictions(predictions, model_name)
            else:
                # ダミーモデルの場合
                results = self._generate_dummy_results(model_name)
            
            return results
            
        except Exception as e:
            logger.error(f"画像解析に失敗: {e}")
            raise
    
    def _format_predictions(self, predictions: np.ndarray, model_name: str) -> List[Dict]:
        """予測結果を整形する"""
        try:
            # ImageNetクラス名を読み込み
            class_names = self._get_imagenet_classes()
            
            # 上位5つの予測結果を取得
            top_indices = np.argsort(predictions[0])[-5:][::-1]
            
            results = []
            for i, idx in enumerate(top_indices):
                confidence = float(predictions[0][idx]) * 100
                label = class_names.get(idx, f"Class_{idx}")
                
                results.append({
                    'label': label,
                    'confidence': confidence,
                    'rank': i + 1
                })
            
            return results
            
        except Exception as e:
            logger.error(f"予測結果の整形に失敗: {e}")
            return self._generate_dummy_results(model_name)
    
    def _get_imagenet_classes(self) -> Dict[int, str]:
        """ImageNetクラス名を取得"""
        # 簡易版のクラス名（実際の実装では完全なクラス名リストを使用）
        return {
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
            50: "American_alligator", 51: "triceratops", 52: "thunder_snake",
            53: "ringneck_snake", 54: "hognose_snake", 55: "green_snake", 56: "king_snake",
            57: "garter_snake", 58: "water_snake", 59: "vine_snake", 60: "night_snake",
            61: "boa_constrictor", 62: "rock_python", 63: "Indian_cobra", 64: "green_mamba",
            65: "sea_snake", 66: "horned_viper", 67: "diamondback", 68: "sidewinder",
            69: "trilobite", 70: "harvestman", 71: "scorpion", 72: "black_and_gold_garden_spider",
            73: "barn_spider", 74: "garden_spider", 75: "black_widow", 76: "tarantula",
            77: "wolf_spider", 78: "tick", 79: "centipede", 80: "black_grouse",
            81: "ptarmigan", 82: "ruffed_grouse", 83: "prairie_chicken", 84: "peacock",
            85: "quail", 86: "partridge", 87: "African_grey", 88: "macaw",
            89: "sulphur_crested_cockatoo", 90: "lorikeet", 91: "coucal", 92: "bee_eater",
            93: "hornbill", 94: "hummingbird", 95: "jacamar", 96: "toucan",
            97: "drake", 98: "red_breasted_merganser", 99: "goose"
        }
    
    def _generate_dummy_results(self, model_name: str) -> List[Dict]:
        """ダミーの解析結果を生成"""
        dummy_labels = [
            "cat", "dog", "bird", "car", "tree", "house", "person", "flower"
        ]
        
        results = []
        for i in range(3):  # 上位3つの結果
            label = dummy_labels[i % len(dummy_labels)]
            confidence = 95.0 - (i * 10) + np.random.random() * 5
            
            results.append({
                'label': label,
                'confidence': confidence,
                'rank': i + 1
            })
        
        return results
    
    def analyze_images_batch(self, image_ids: List[int], model_name: str) -> Dict:
        """複数の画像を一括解析する"""
        try:
            images = ImageModel.objects.filter(id__in=image_ids, status='preparing')
            total_images = images.count()
            
            if total_images == 0:
                return {'success': False, 'error': '解析対象の画像が見つかりません'}
            
            # 解析開始
            images.update(status='analyzing')
            
            results = []
            for i, image in enumerate(images):
                try:
                    # 進捗ログを記録
                    progress = (i / total_images) * 100
                    ProgressLog.objects.create(
                        image=image,
                        progress_percentage=progress,
                        current_stage='model_execution',
                        stage_description=f'画像 {i+1}/{total_images} を解析中'
                    )
                    
                    # 画像解析実行
                    analysis_results = self.analyze_image(image.file_path, model_name)
                    
                    # 結果をデータベースに保存
                    for result in analysis_results:
                        AnalysisResult.objects.create(
                            image=image,
                            label=result['label'],
                            confidence=result['confidence'],
                            model_version='1.0.0'
                        )
                    
                    results.append({
                        'image_id': image.id,
                        'filename': image.filename,
                        'results': analysis_results
                    })
                    
                except Exception as e:
                    logger.error(f"画像 {image.filename} の解析に失敗: {e}")
                    image.status = 'failed'
                    image.error_log = str(e)
                    image.save()
            
            # 解析完了
            images.filter(status='analyzing').update(status='success')
            
            # 最終進捗ログ
            for image in images:
                ProgressLog.objects.create(
                    image=image,
                    progress_percentage=100.0,
                    current_stage='completed',
                    stage_description='解析完了'
                )
            
            return {
                'success': True,
                'total_images': total_images,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"一括解析に失敗: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_analysis_progress(self) -> Dict:
        """解析進捗を取得する"""
        try:
            analyzing_images = ImageModel.objects.filter(status='analyzing')
            total_analyzing = analyzing_images.count()
            
            if total_analyzing == 0:
                return {'progress': 100, 'status': 'completed'}
            
            # 最新の進捗ログから進捗を取得
            latest_progress = ProgressLog.objects.filter(
                image__in=analyzing_images
            ).order_by('-timestamp').first()
            
            if latest_progress:
                return {
                    'progress': float(latest_progress.progress_percentage),
                    'status': 'analyzing',
                    'current_stage': latest_progress.current_stage,
                    'description': latest_progress.stage_description
                }
            else:
                return {'progress': 0, 'status': 'analyzing'}
                
        except Exception as e:
            logger.error(f"進捗取得に失敗: {e}")
            return {'progress': 0, 'status': 'error', 'error': str(e)}


# グローバルインスタンス
analysis_service = ImageAnalysisService()
