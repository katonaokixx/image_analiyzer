// フィルタリング機能
function applyFilters() {
  console.log('=== applyFilters() called ===');

  // 検索テキスト
  const searchText = document.getElementById('exampleDataList').value.toLowerCase();
  console.log('Search text:', searchText);

  // 日付ソート
  const dateSort = document.getElementById('dateSort').value;
  console.log('Date sort:', dateSort);

  // ステータスフィルター
  const statusFilter = document.getElementById('selectFloating').value;
  console.log('Status filter:', statusFilter);

  // ラベルフィルター
  const labelFilter = document.getElementById('labelFilter').value;
  console.log('Label filter:', labelFilter);

  // 信頼度フィルター
  const confidenceFilter = document.getElementById('confidenceFilter').value;
  console.log('Confidence filter:', confidenceFilter);

  // テーブル行を取得
  const tableRows = document.querySelectorAll('tbody tr');
  console.log('Found table rows:', tableRows.length);

  // 日順ソートの処理
  const rowsArray = Array.from(tableRows);
  if (dateSort === '古い順') {
    rowsArray.sort((a, b) => {
      const dateA = a.querySelector('td:nth-child(2)').textContent.trim();
      const dateB = b.querySelector('td:nth-child(2)').textContent.trim();

      // 日付文字列をDateオブジェクトに変換して比較
      const dateObjA = new Date(dateA.replace(' ', 'T'));
      const dateObjB = new Date(dateB.replace(' ', 'T'));

      console.log(`Comparing dates: ${dateA} (${dateObjA}) vs ${dateB} (${dateObjB})`);

      return dateObjA - dateObjB;
    });
    console.log('Sorted by oldest first');
  } else if (dateSort === '新しい順') {
    rowsArray.sort((a, b) => {
      const dateA = a.querySelector('td:nth-child(2)').textContent.trim();
      const dateB = b.querySelector('td:nth-child(2)').textContent.trim();

      // 日付文字列をDateオブジェクトに変換して比較
      const dateObjA = new Date(dateA.replace(' ', 'T'));
      const dateObjB = new Date(dateB.replace(' ', 'T'));

      console.log(`Comparing dates: ${dateA} (${dateObjA}) vs ${dateB} (${dateObjB})`);

      return dateObjB - dateObjA;
    });
    console.log('Sorted by newest first');
  }

  // ソートされた行をテーブルに反映
  const tbody = document.querySelector('tbody');
  if (tbody) {
    rowsArray.forEach(row => {
      tbody.appendChild(row);
    });
  }

  let visibleCount = 0;
  let hiddenCount = 0;

  rowsArray.forEach((row, index) => {
    let showRow = true;

    // 検索フィルター
    if (searchText) {
      const rowText = row.textContent.toLowerCase();
      if (!rowText.includes(searchText)) {
        showRow = false;
      }
    }

    // ステータスフィルター
    if (statusFilter && statusFilter !== 'すべて') {
      const statusCell = row.querySelector('td:nth-child(3)');
      if (statusCell) {
        const statusText = statusCell.textContent.trim();
        console.log(`Row ${index} status:`, statusText);
        if (!statusText.includes(statusFilter)) {
          showRow = false;
        }
      }
    }

    // ラベルフィルター
    if (labelFilter && labelFilter !== 'すべて') {
      const labelCell = row.querySelector('td:nth-child(4)');
      if (labelCell) {
        const labelText = labelCell.textContent.trim();
        console.log(`Row ${index} labels:`, labelText);
        if (!labelText.includes(labelFilter)) {
          showRow = false;
        }
      }
    }

    // 信頼度フィルター
    if (confidenceFilter && confidenceFilter !== 'すべて') {
      const confidenceCell = row.querySelector('td:nth-child(5)');
      if (confidenceCell) {
        const confidenceText = confidenceCell.textContent.trim();
        console.log(`Row ${index} confidence:`, confidenceText);
        if (!checkConfidenceRange(confidenceText, confidenceFilter)) {
          showRow = false;
        }
      }
    }

    // 行の表示/非表示
    if (showRow) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
      hiddenCount++;
    }
  });

  console.log(`Filtering complete: ${visibleCount} visible, ${hiddenCount} hidden`);
  console.log('=== applyFilters() finished ===');
}

// 信頼度範囲チェック
function checkConfidenceRange(confidenceText, filter) {
  const confidence = parseFloat(confidenceText.replace('%', ''));

  switch (filter) {
    case '90%以上':
      return confidence >= 90;
    case '80-89%':
      return confidence >= 80 && confidence < 90;
    case '70-79%':
      return confidence >= 70 && confidence < 80;
    case '60-69%':
      return confidence >= 60 && confidence < 70;
    case '60%未満':
      return confidence < 60;
    default:
      return true;
  }
}

// すべてのフィルターをリセットする関数
function resetAllFilters() {
  console.log('Resetting all filters...');

  // 検索入力をリセット
  const searchInput = document.getElementById('exampleDataList');
  if (searchInput) {
    searchInput.value = '';
  }

  // 日付ソートをリセット
  const dateSort = document.getElementById('dateSort');
  if (dateSort) {
    dateSort.selectedIndex = 0; // 最初のオプションを選択
  }

  // ステータスフィルターをリセット
  const statusFilter = document.getElementById('selectFloating');
  if (statusFilter) {
    statusFilter.selectedIndex = 0; // 最初のオプションを選択
  }

  // ラベルフィルターをリセット
  const labelFilter = document.getElementById('labelFilter');
  if (labelFilter) {
    labelFilter.selectedIndex = 0; // 最初のオプションを選択
  }

  // 信頼度フィルターをリセット
  const confidenceFilter = document.getElementById('confidenceFilter');
  if (confidenceFilter) {
    confidenceFilter.selectedIndex = 0; // 最初のオプションを選択
  }

  // フィルターを適用（リセット後の状態を反映）
  setTimeout(() => {
    applyFilters();
  }, 100);

  console.log('All filters have been reset');
}

// ページ読み込み時にイベントリスナーを設定
document.addEventListener('DOMContentLoaded', function () {
  console.log('table.js loaded successfully');

  // 検索入力のエンターキーイベント
  const searchInput = document.getElementById('exampleDataList');
  console.log('Search input found:', searchInput);
  if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
      console.log('Key pressed:', e.key);
      if (e.key === 'Enter') {
        console.log('Enter pressed, applying filters');
        applyFilters();
      }
    });
  }

  // フィルター選択の変更イベント（onchangeを使用）
  const dateSort = document.getElementById('dateSort');
  console.log('Date sort found:', dateSort);
  if (dateSort) {
    dateSort.onchange = function () {
      console.log('Date sort changed (onchange):', this.value);
      applyFilters();
    };
  }

  const statusFilter = document.getElementById('selectFloating');
  console.log('Status filter found:', statusFilter);
  if (statusFilter) {
    statusFilter.onchange = function () {
      console.log('Status filter changed (onchange):', this.value);
      applyFilters();
    };
  }

  const labelFilter = document.getElementById('labelFilter');
  console.log('Label filter found:', labelFilter);
  if (labelFilter) {
    labelFilter.onchange = function () {
      console.log('Label filter changed (onchange):', this.value);
      applyFilters();
    };
  }

  const confidenceFilter = document.getElementById('confidenceFilter');
  console.log('Confidence filter found:', confidenceFilter);
  if (confidenceFilter) {
    confidenceFilter.onchange = function () {
      console.log('Confidence filter changed (onchange):', this.value);
      applyFilters();
    };
  }

  // 準備中のバッジはFlyonUIの自動表示を使用するため、手動イベントは不要
});

// 準備中バッジはFlyonUIの自動表示を使用するため、手動イベントは不要

// モデル選択モーダルを表示
function showModelSelectionModal(imageId) {
  console.log('=== showModelSelectionModal() called with imageId:', imageId === '');

  // モーダルを取得
  const modal = document.getElementById('slide-down-animated-modal');
  if (!modal) {
    console.error('Model selection modal not found');
    return;
  }

  // モーダルを表示
  modal.classList.remove('hidden');
  modal.classList.add('overlay-open');
  modal.style.display = 'block';
  modal.style.opacity = '1';
  modal.style.visibility = 'visible';

  console.log('Model selection modal opened');

  // モデル選択時の説明表示
  const modelSelector = document.getElementById('model-selector');
  if (modelSelector) {
    modelSelector.addEventListener('change', function (e) {
      const selectedModel = e.target.value;
      const descriptionEl = document.getElementById('model-description');
      if (!descriptionEl) return;

      const descriptions = {
        'resnet50': 'ResNet-50 v2.1は、深層学習における代表的な画像分類モデルです。高い精度と汎用性を持ち、様々な画像タスクに適用できます。ImageNetで学習済みで、1000クラスの分類が可能です。',
        'efficientnet': 'EfficientNet-B0は、効率性を重視した軽量モデルです。少ないパラメータ数で高い性能を実現し、モバイルデバイスやエッジコンピューティングに最適です。高速な推論が可能です。',
        'mobilenet': 'MobileNet v2は、モバイル環境に特化して設計されたモデルです。軽量で高速な処理が可能で、スマートフォンやタブレットでのリアルタイム画像認識に適しています。',
        'vgg16': 'VGG-16は、深いネットワーク構造を持つ高精度モデルです。詳細な特徴抽出が得意で、複雑な画像パターンの識別に優れています。計算量は多いですが、高い精度が期待できます。',
        'clip': 'CLIPは、画像とテキストの関係を学習した革新的なモデルです。アニメ・イラストの検出に特化しており、従来のモデルでは困難だったイラストやアニメキャラクターの識別が得意です。',
        'custom': 'カスタムモデルは、特定の用途やデータセットに特化して学習されたモデルです。ドメイン固有の特徴を捉えることができ、専門的な画像解析タスクに最適です。'
      };

      if (selectedModel && descriptions[selectedModel]) {
        descriptionEl.textContent = descriptions[selectedModel];
      } else {
        descriptionEl.textContent = 'モデルを選択すると、ここに詳細な説明が表示されます。';
      }
    });
  }

  // 解析開始ボタンのクリックイベントを設定
  const startBtn = document.getElementById('modal-start-analysis-btn');
  if (startBtn) {
    // 既存のイベントリスナーを削除
    startBtn.replaceWith(startBtn.cloneNode(true));
    const newStartBtn = document.getElementById('modal-start-analysis-btn');

    newStartBtn.addEventListener('click', function () {
      const selector = document.getElementById('model-selector');
      const model = selector ? selector.value : '';

      if (!model) {
        alert('モデルを選択してください');
        return;
      }

      console.log('Starting analysis for image:', imageId, 'with model:', model);

      // モーダルを閉じる
      modal.classList.add('hidden');
      modal.classList.remove('overlay-open');
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';

      // 個別画像解析を開始
      startIndividualAnalysis(imageId, model);
    });
  }
}

// 個別画像解析を開始
function startIndividualAnalysis(imageId, modelName) {
  console.log('=== startIndividualAnalysis() called ===', imageId, modelName);

  // 実際のAPI呼び出し
  fetch('/image_analyzer/api/analysis/start/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': getCSRFToken()
    },
    body: new URLSearchParams({
      'model': modelName,
      'image_id': imageId  // 個別画像IDを追加
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        console.log('Individual analysis started successfully:', data);
        // ページをリロードしてステータスを更新
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error('Failed to start individual analysis:', data.error);
        alert('解析の開始に失敗しました: ' + (data.error || '不明なエラー'));
      }
    })
    .catch(error => {
      console.error('Error starting individual analysis:', error);
      alert('解析の開始に失敗しました');
    });
}

// CSRFトークンを取得する関数
function getCSRFToken() {
  const token = document.querySelector('[name=csrfmiddlewaretoken]');
  return token ? token.value : '';
}