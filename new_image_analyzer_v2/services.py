import os
import logging
import numpy as np
from PIL import Image as PILImage
import requests
import time
from typing import List, Dict, Optional
from django.conf import settings
from django.utils import timezone
from .models import TransUploadedImage, TransImageAnalysis

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
            
            # PyTorch EfficientNet
            self._load_pytorch_efficientnet()
            
            # CLIP
            self._load_clip()
            
            # モデル読み込み完了
            logger.info(f"モデル読み込み完了: {list(self.models.keys())}")
            
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
    
    def _load_pytorch_efficientnet(self):
        """PyTorch EfficientNetモデルを読み込む"""
        try:
            import torch
            import torchvision.transforms as transforms
            from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
            
            # モデル読み込み
            model = efficientnet_b0(weights=EfficientNet_B0_Weights.IMAGENET1K_V1)
            model.eval()
            
            # 前処理定義
            transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            self.models['pytorch_efficientnet'] = {
                'model': model,
                'transform': transform,
                'input_size': (224, 224),
                'type': 'pytorch_efficientnet'
            }
            # PyTorch EfficientNet 読み込み完了
            
        except Exception as e:
            logger.error(f"PyTorch EfficientNet 読み込みエラー: {e}")
            self.models['pytorch_efficientnet'] = {
                'model': None,
                'transform': None,
                'input_size': (224, 224),
                'type': 'pytorch_efficientnet'
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
                'efficientnet': 'pytorch_efficientnet',
                'mobilenet': 'pytorch_mobilenet',
                'vgg16': 'pytorch_vgg16',
                'clip': 'clip',
                'custom': 'clip'  # customモデルをCLIPにマッピング
            }
            
            internal_model_name = model_mapping.get(model_name, model_name)
            # モデル名マッピング
            logger.info(f"モデル名マッピング: {model_name} -> {internal_model_name}")
            logger.info(f"利用可能なモデル: {list(self.models.keys())}")
            
            if internal_model_name not in self.models:
                available_models = list(self.models.keys())
                raise ValueError(f"未知のモデル: {model_name} (内部名: {internal_model_name}), 利用可能: {available_models}")
            
            model_info = self.models[internal_model_name]
            logger.info(f"モデル情報: {model_info}")
            
            if model_info['model'] is None:
                logger.error(f"モデルが読み込まれていません: {internal_model_name}")
                # モデルが読み込まれていない場合はエラーを返す
                return {
                    'success': False,
                    'error': f'モデル {internal_model_name} が読み込まれていません。PyTorch/CLIPのインストールを確認してください。'
                }
            
            # 画像の前処理
            logger.info(f"画像前処理開始: 入力サイズ={model_info['input_size']}")
            img_array = self.preprocess_image(image_path, model_info['input_size'])
            logger.info(f"画像前処理完了: 形状={img_array.shape}")
            
            # モデル別の予測実行
            logger.info(f"予測実行開始: {model_info['type']}")
            if model_info['type'] == 'pytorch_resnet50':
                predictions = self._predict_pytorch_resnet50(img_array, model_info)
            elif model_info['type'] == 'pytorch_mobilenet':
                predictions = self._predict_pytorch_mobilenet(img_array, model_info)
            elif model_info['type'] == 'pytorch_vgg16':
                predictions = self._predict_pytorch_vgg16(img_array, model_info)
            elif model_info['type'] == 'pytorch_efficientnet':
                predictions = self._predict_pytorch_efficientnet(img_array, model_info)
            elif model_info['type'] == 'clip':
                predictions = self._predict_clip(img_array, model_info)
            else:
                raise ValueError(f"未対応のモデルタイプ: {model_info['type']}")
            
            logger.info(f"予測完了: 形状={predictions.shape}")
            logger.info(f"予測結果の最大値: {predictions.max():.6f}")
            logger.info(f"予測結果の最小値: {predictions.min():.6f}")
            
            # 結果を整形
            logger.info("結果整形開始")
            results = self._format_predictions(predictions, internal_model_name)
            logger.info(f"結果整形完了: {len(results)}件")
            
            for i, result in enumerate(results):
                logger.info(f"  結果{i+1}: {result['label']} ({result['confidence']}%) - ランク{result['rank']}")
            
            return {'success': True, 'results': results}
            
        except Exception as e:
            logger.error(f"画像解析エラー: {e}")
            return {'success': False, 'error': str(e)}
    
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
    
    def _predict_pytorch_efficientnet(self, img_array: np.ndarray, model_info: Dict) -> np.ndarray:
        """PyTorch EfficientNetでの予測"""
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
        """CLIPでの予測（アニメ・イラスト検出対応）"""
        import torch
        import clip
        
        # PIL画像に変換
        pil_image = PILImage.fromarray(img_array[0].astype('uint8'))
        
        # preprocessを適用
        img_tensor = model_info['preprocess'](pil_image)
        img_tensor = img_tensor.unsqueeze(0)
        
        # テキストプロンプトを定義（アニメ・イラストを優先）
        text_prompts = [
            "anime character illustration",
            "manga drawing",
            "cartoon character",
            "fantasy character",
            "elf character",
            "cute anime girl",
            "anime art style",
            "illustration drawing",
            "realistic photograph",
            "safety equipment helmet",
            "animal",
            "building",
            "car", "vehicle", "automobile", "sports car", "racing car",
            "person",
            "nature"
        ]
        
        # 予測実行
        with torch.no_grad():
            # 画像とテキストの埋め込みを取得
            image_features = model_info['model'].encode_image(img_tensor)
            text_features = model_info['model'].encode_text(torch.cat([clip.tokenize(prompt) for prompt in text_prompts]))
            
            # 類似度を計算
            similarities = (100.0 * image_features @ text_features.T).softmax(dim=-1)
            
            # 19次元の配列に変換（CLIPクラス数に合わせる）
            predictions = torch.zeros(1, 19)
            
            # アニメ・イラスト関連のスコアを設定
            predictions[0][0] = similarities[0][0]  # anime character
            predictions[0][1] = similarities[0][1]  # manga illustration
            predictions[0][2] = similarities[0][2]  # cartoon character
            predictions[0][3] = similarities[0][3]  # fantasy character
            predictions[0][4] = similarities[0][4]  # elf character
            predictions[0][5] = similarities[0][5]  # cute anime girl
            predictions[0][6] = similarities[0][6]  # anime art style
            predictions[0][7] = similarities[0][7]  # illustration drawing
            predictions[0][8] = similarities[0][8]  # realistic photo
            predictions[0][9] = similarities[0][9]  # safety equipment
            predictions[0][10] = similarities[0][10]  # animal
            predictions[0][11] = similarities[0][11]  # building
            predictions[0][12] = similarities[0][12]  # car
            predictions[0][13] = similarities[0][13]  # vehicle
            predictions[0][14] = similarities[0][14]  # automobile
            predictions[0][15] = similarities[0][15]  # sports car
            predictions[0][16] = similarities[0][16]  # racing car
            predictions[0][17] = similarities[0][17]  # person
            predictions[0][18] = similarities[0][18]  # nature
            
            # 予測結果を正規化して、複数のクラスに確率を分散
            # 最大値が0.9を超える場合は、他のクラスにも確率を分散
            max_val = torch.max(predictions[0])
            if max_val > 0.9:
                # 最大値のクラスの確率を0.7に制限
                max_idx = torch.argmax(predictions[0])
                predictions[0][max_idx] = 0.7
                
                # 残りの確率を他のクラスに分散
                remaining_prob = 0.3
                other_indices = torch.arange(19) != max_idx
                other_probs = remaining_prob / other_indices.sum()
                predictions[0][other_indices] = other_probs
            
            # 最終的に正規化
            predictions[0] = predictions[0] / predictions[0].sum()
        
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
    
    def _get_clip_classes(self) -> Dict[int, str]:
        """CLIP用のクラス名"""
        return {
            0: "anime character illustration",
            1: "manga drawing", 
            2: "cartoon character",
            3: "fantasy character",
            4: "elf character",
            5: "cute anime girl",
            6: "anime art style",
            7: "illustration drawing",
            8: "realistic photograph",
            9: "safety equipment helmet",
            10: "animal",
            11: "building",
            12: "car",
            13: "vehicle",
            14: "automobile",
            15: "sports car",
            16: "racing car",
            17: "person",
            18: "nature"
        }
    
    def _get_broad_category_mapping(self) -> Dict[str, List[str]]:
        """大分類カテゴリーのマッピング辞書"""
        return {
            '人物': [
                'person', 'man', 'woman', 'child', 'baby', 'boy', 'girl',
                'face', 'head', 'portrait', 'selfie', 'people', 'human',
                'mask', 'wig', 'shower cap', 'hat', 'cap', 'helmet'
            ],
            '動物': [
                'dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'sheep', 'pig',
                'elephant', 'lion', 'tiger', 'bear', 'wolf', 'fox', 'deer',
                'rabbit', 'mouse', 'rat', 'hamster', 'squirrel', 'chipmunk',
                'beaver', 'otter', 'weasel', 'skunk', 'badger', 'raccoon',
                'panda', 'koala', 'kangaroo', 'monkey', 'ape', 'gorilla',
                'chimpanzee', 'orangutan', 'lemur', 'sloth', 'anteater',
                'armadillo', 'hedgehog', 'porcupine', 'platypus', 'echidna'
            ],
            '建物': [
                'house', 'building', 'bridge', 'tower', 'castle', 'palace',
                'church', 'temple', 'mosque', 'synagogue', 'cathedral',
                'skyscraper', 'office', 'school', 'hospital', 'library',
                'museum', 'theater', 'stadium', 'airport', 'station',
                'hotel', 'restaurant', 'shop', 'store', 'market', 'mall'
            ],
            '乗り物': [
                'car', 'truck', 'bus', 'van', 'motorcycle', 'bicycle',
                'airplane', 'helicopter', 'boat', 'ship', 'yacht',
                'train', 'subway', 'tram', 'taxi', 'ambulance', 'fire',
                'police', 'tank', 'tractor', 'bulldozer', 'crane'
            ],
            '自然': [
                'mountain', 'hill', 'valley', 'forest', 'tree', 'flower',
                'grass', 'leaf', 'branch', 'root', 'bark', 'wood',
                'ocean', 'sea', 'lake', 'river', 'stream', 'waterfall',
                'beach', 'desert', 'canyon', 'cave', 'volcano', 'island',
                'sky', 'cloud', 'sun', 'moon', 'star', 'rainbow',
                'snow', 'ice', 'rock', 'stone', 'sand', 'dirt'
            ],
            '食べ物': [
                'food', 'meal', 'dish', 'plate', 'bowl', 'cup', 'glass',
                'bread', 'cake', 'cookie', 'pie', 'pizza', 'sandwich',
                'burger', 'hotdog', 'sausage', 'bacon', 'ham', 'chicken',
                'beef', 'pork', 'fish', 'shrimp', 'lobster', 'crab',
                'apple', 'banana', 'orange', 'grape', 'strawberry',
                'vegetable', 'carrot', 'potato', 'tomato', 'onion',
                'lettuce', 'cabbage', 'broccoli', 'corn', 'pepper'
            ],
            'アニメ・イラスト': [
                'comic book', 'cartoon', 'drawing', 'illustration',
                'sketch', 'painting', 'artwork', 'manga', 'anime',
                'book', 'magazine', 'poster', 'print', 'picture', 'image',
                'envelope', 'paper', 'handkerchief', 'mask', 'towel'
            ],
            'テクノロジー': [
                'computer', 'laptop', 'desktop', 'monitor', 'keyboard',
                'mouse', 'phone', 'smartphone', 'tablet', 'camera',
                'television', 'tv', 'radio', 'speaker', 'headphone',
                'microphone', 'printer', 'scanner', 'router', 'modem',
                'hardware', 'software', 'gadget', 'device', 'machine'
            ],
            'ファッション': [
                'clothing', 'shirt', 'dress', 'pants', 'jeans', 'skirt',
                'jacket', 'coat', 'sweater', 'hoodie', 't-shirt',
                'shoes', 'boots', 'sneakers', 'sandals', 'heels',
                'gloves', 'scarf', 'tie', 'belt', 'watch', 'jewelry', 
                'ring', 'necklace', 'earring', 'bracelet', 'bag', 'purse', 'backpack'
            ],
            'スポーツ': [
                'sports', 'game', 'ball', 'football', 'soccer', 'basketball',
                'tennis', 'baseball', 'golf', 'hockey', 'cricket',
                'volleyball', 'badminton', 'ping', 'pong', 'rugby',
                'swimming', 'running', 'cycling', 'skiing', 'skating',
                'surfing', 'diving', 'boxing', 'wrestling', 'martial',
                'gym', 'fitness', 'exercise', 'workout', 'training'
            ]
        }
    
    def _apply_broad_category_classification(self, predictions: np.ndarray, model_name: str) -> List[Dict]:
        """大分類カテゴリーでの分類"""
        try:
            # クラス名を取得
            if model_name == 'clip':
                class_names = self._get_clip_classes()
            else:
                class_names = self._get_imagenet_classes()
            
            # 大分類マッピングを取得
            category_mapping = self._get_broad_category_mapping()
            
            
            # 各カテゴリーの信頼度を計算
            category_scores = {}
            for category, keywords in category_mapping.items():
                category_confidence = 0.0
                for idx, class_name in class_names.items():
                    # idxが整数であることを確認
                    if isinstance(idx, int) and idx < len(predictions[0]):
                        if any(keyword in class_name.lower() for keyword in keywords):
                            category_confidence += predictions[0][idx]
                
                # 人物とアニメ・イラストを優先（重み付け）
                if category == '人物':
                    category_confidence *= 2.0  # 2倍の重み
                elif category == 'アニメ・イラスト':
                    category_confidence *= 1.5  # 1.5倍の重み
                
                category_scores[category] = category_confidence
            
            # 信頼度順にソート
            sorted_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
            
            # 上位3つのカテゴリーを返す
            results = []
            for i, (category, confidence) in enumerate(sorted_categories[:3]):
                if confidence > 0.001:  # 0.1%以上の信頼度
                    # 信頼度を20%以上、90%以下に調整（より現実的な値に）
                    min_confidence = 0.20
                    max_confidence = 0.90
                    adjusted_confidence = max(min(confidence, max_confidence), min_confidence)
                    
                    results.append({
                        'label': category,
                        'confidence': adjusted_confidence * 100,
                        'rank': i + 1
                    })
            
            # 結果が1件以下の場合は、信頼度の閾値を下げて追加の結果を取得
            if len(results) < 3:
                for i, (category, confidence) in enumerate(sorted_categories[3:6]):
                    if confidence > 0.0001:  # 0.01%以上の信頼度
                        # 信頼度を15%以上、80%以下に調整（より現実的な値に）
                        min_confidence = 0.15
                        max_confidence = 0.80
                        adjusted_confidence = max(min(confidence, max_confidence), min_confidence)
                        
                        results.append({
                            'label': category,
                            'confidence': adjusted_confidence * 100,
                            'rank': len(results) + 1
                        })
                        
                        if len(results) >= 3:
                            break
            
            return results
                
        except Exception as e:
            logger.error(f"大分類カテゴリー分類エラー: {e}")
            return []
    
    def _format_predictions(self, predictions: np.ndarray, model_name: str) -> List[Dict]:
        """予測結果を整形する（大分類カテゴリー使用）"""
        try:
            # フロントエンドのモデル名を内部モデル名にマッピング
            model_mapping = {
                'resnet50': 'pytorch_resnet50',
                'efficientnet': 'pytorch_efficientnet',
                'mobilenet': 'pytorch_mobilenet',
                'vgg16': 'pytorch_vgg16',
                'clip': 'clip',
                'custom': 'clip'  # customモデルをCLIPにマッピング
            }
            
            internal_model_name = model_mapping.get(model_name, model_name)
            
            # CLIPの場合は専用の処理を行う
            if internal_model_name == 'clip':
                return self._format_clip_predictions(predictions)
            
            # 大分類カテゴリーでの分類を適用
            broad_category_results = self._apply_broad_category_classification(predictions, internal_model_name)
            
            # 結果がある場合はそれを返す
            if broad_category_results:
                return broad_category_results
            
            # 大分類で結果がない場合は、デフォルト結果を返す
            logger.warning(f"大分類で結果が取得できませんでした: {internal_model_name}")
            return [
                {'label': '分類不明', 'confidence': 50.0, 'rank': 1},
                {'label': 'その他', 'confidence': 30.0, 'rank': 2},
                {'label': '未分類', 'confidence': 20.0, 'rank': 3}
            ]
        
        except Exception as e:
            logger.error(f"予測結果の整形に失敗: {e}")
            return [{'label': 'Error', 'confidence': 0.0, 'rank': 1}]
    
    def _format_clip_predictions(self, predictions: np.ndarray) -> List[Dict]:
        """CLIP専用の予測結果整形（大分類カテゴリーにマッピング）"""
        try:
            # CLIP専用のカテゴリーマッピング
            clip_categories = {
                'アニメ・イラスト': [0, 1, 2, 3, 4, 5, 6, 7],  # anime, manga, cartoon, fantasy, elf, cute anime girl, anime art, illustration
                'ファッション': [8, 9],  # realistic photo, safety equipment
                '動物': [10],  # animal
                '建物': [11],  # building
                '乗り物': [12, 13, 14, 15, 16],  # car, vehicle, automobile, sports car, racing car
                '人物': [17],  # person
                '自然': [18]   # nature
            }
            
            # 各カテゴリーのスコアを計算
            category_scores = {}
            for category, indices in clip_categories.items():
                total_score = 0.0
                for idx in indices:
                    if idx < len(predictions[0]):
                        total_score += predictions[0][idx]
                category_scores[category] = total_score * 100
            
            # スコアが高い順にソート
            sorted_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
            
            # 上位3つを結果として返す
            results = []
            for i, (category, score) in enumerate(sorted_categories[:3]):
                # スコアが低い場合は最小値を設定
                if score < 10.0:
                    score = max(score, 10.0)
                
                results.append({
                    'label': category,
                    'confidence': round(score, 2),
                    'rank': i + 1
                })
            
            return results
            
        except Exception as e:
            logger.error(f"CLIP予測結果の整形に失敗: {e}")
            return [{'label': 'Error', 'confidence': 0.0, 'rank': 1}]


# シングルトンインスタンス
analysis_service = AnalysisService()
