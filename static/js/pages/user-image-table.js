
// アップロードページに遷移する関数
function navigateToUploadPage(imageId, imageStatus) {
  console.log('navigateToUploadPage called with:', imageId, imageStatus);

  // URLパラメータで画像IDを渡す（CSRFトークン不要）
  window.location.href = `/v2/re_image_upload/?selected_image_id=${imageId}&image_status=${imageStatus}`;
}

// 再解析ページに遷移する関数
function navigateToReanalysis() {
  const currentImageId = window.currentModalImageId;
  if (currentImageId) {
    console.log('navigateToReanalysis called with imageId:', currentImageId);
    window.location.href = `/v2/re_image_upload/?selected_image_id=${currentImageId}&image_status=completed`;
  } else {
    console.error('画像IDが取得できません');
  }
}


// 削除確認状態に切り替える関数
function openDeleteConfirmModal() {
  const currentImageId = window.currentModalImageId;
  if (currentImageId) {
    console.log('削除確認状態に切り替え、画像ID:', currentImageId);

    // 画像詳細表示を非表示
    document.getElementById('modal-image-detail').classList.add('hidden');
    document.getElementById('modal-normal-buttons').classList.add('hidden');

    // 削除確認表示を表示
    document.getElementById('modal-delete-confirm').classList.remove('hidden');
    document.getElementById('modal-delete-buttons').classList.remove('hidden');

    // モーダルタイトルを変更
    document.querySelector('#slide-down-animated-modal .modal-title').textContent = '画像の削除';
  } else {
    console.error('画像IDが取得できません');
    alert('画像IDが取得できませんでした');
  }
}


// 画像削除を実行する関数
function confirmDeleteImage() {
  const currentImageId = window.currentModalImageId;
  if (!currentImageId) {
    console.error('画像IDが取得できません');
    alert('画像IDが取得できませんでした');
    return;
  }

  console.log('confirmDeleteImage called with imageId:', currentImageId);

  // CSRFトークンを取得
  console.log('CSRFトークン取得開始...');
  const csrfToken = getCSRFToken();
  console.log('取得されたCSRFトークン:', csrfToken);
  console.log('CSRFトークンの長さ:', csrfToken ? csrfToken.length : 'null');
  console.log('CSRFトークンの型:', typeof csrfToken);

  if (!csrfToken) {
    alert('CSRFトークンが取得できません。ページを再読み込みしてください。');
    return;
  }

  // 削除APIを呼び出し
  console.log('削除API呼び出し開始:', `/v2/api/images/${currentImageId}/delete/`);
  console.log('使用するCSRFトークン:', csrfToken);

  fetch(`/v2/api/images/${currentImageId}/delete/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken
    }
  })
    .then(response => {
      console.log('削除API応答:', response.status, response.statusText);
      if (response.ok) {
        return response.json();
      } else {
        return response.text().then(text => {
          console.error('削除APIエラー:', text);
          throw new Error(`削除に失敗しました (${response.status}): ${text}`);
        });
      }
    })
    .then(data => {
      console.log('削除API応答データ:', data);
      if (data.success || data.ok) {
        // 成功時はモーダルを閉じてページをリロード
        const modal = document.getElementById('slide-down-animated-modal');
        if (modal) {
          modal.classList.add('hidden');
          modal.classList.remove('overlay-open');
          modal.style.display = 'none';
          modal.style.opacity = '0';
          modal.style.visibility = 'hidden';
        }
        location.reload();
      } else {
        alert('削除に失敗しました: ' + (data.error || '不明なエラー'));
      }
    })
    .catch(error => {
      console.error('削除エラー:', error);
      alert('削除に失敗しました: ' + error.message);
    });
}

// CSRFトークンを取得する関数
// getCSRFToken()とgetCookie()は共通ユーティリティ（utils.js）を使用

// 削除確認をキャンセルして通常状態に戻す関数
function cancelDeleteConfirm() {
  console.log('削除確認をキャンセル、通常状態に戻します');

  // 削除確認表示を非表示
  document.getElementById('modal-delete-confirm').classList.add('hidden');
  document.getElementById('modal-delete-buttons').classList.add('hidden');

  // 画像詳細表示を表示
  document.getElementById('modal-image-detail').classList.remove('hidden');
  document.getElementById('modal-normal-buttons').classList.remove('hidden');

  // モーダルタイトルを元に戻す
  document.querySelector('#slide-down-animated-modal .modal-title').textContent = '画像詳細';
}

// モーダルに画像データを設定する関数
function openImageModal(filename, imageSrc, uploadTime, status, labels, confidence, imageId) {
  // 現在の画像IDを保存
  window.currentModalImageId = imageId;

  // モーダルの内容を設定
  document.getElementById('modal-filename').textContent = filename;
  document.getElementById('modal-image').src = imageSrc;
  document.getElementById('modal-image').alt = filename;
  document.getElementById('modal-upload-time').textContent = uploadTime;

  // ステータスバッジ
  const statusBadge = document.getElementById('modal-status-badge');
  statusBadge.textContent = status;
  statusBadge.className = 'badge badge-outline border-dashed me-2';

  // ステータスに応じて色を設定
  if (status === '解析成功') {
    statusBadge.classList.add('badge-success');
  } else if (status === '解析中') {
    statusBadge.classList.add('badge-warning');
  } else if (status === '準備中') {
    statusBadge.classList.add('badge-info');
  } else {
    statusBadge.classList.add('badge-error');
  }

  // ラベル
  const labelsContainer = document.getElementById('modal-labels');
  labelsContainer.innerHTML = '';
  if (labels && labels.length > 0) {
    labels.forEach(label => {
      const badge = document.createElement('span');
      badge.className = 'badge badge-primary';
      badge.textContent = label;
      labelsContainer.appendChild(badge);
    });
  } else {
    labelsContainer.innerHTML = '<span class="text-sm text-gray-500">ラベルなし</span>';
  }

  // 信頼度
  const confidenceBadge = document.getElementById('modal-confidence');
  if (confidence && confidence !== '-') {
    confidenceBadge.textContent = confidence;
    confidenceBadge.className = 'badge';

    // 信頼度に応じて色を設定
    const confidenceValue = parseFloat(confidence.replace('%', ''));
    if (confidenceValue >= 80) {
      confidenceBadge.classList.add('badge-success');
    } else if (confidenceValue >= 60) {
      confidenceBadge.classList.add('badge-warning');
    } else {
      confidenceBadge.classList.add('badge-error');
    }
  } else {
    confidenceBadge.textContent = '-';
    confidenceBadge.className = 'badge badge-outline';
  }
}

// テーブルのサムネイル画像クリックイベント
document.addEventListener('DOMContentLoaded', function () {
  const avatarElements = document.querySelectorAll('.avatar[data-overlay="#slide-down-animated-modal"]');

  avatarElements.forEach(avatar => {
    avatar.addEventListener('click', function () {
      const row = this.closest('tr');
      if (row) {
        const imageId = row.getAttribute('data-image-id');
        const filename = row.querySelector('td:nth-child(1) .font-medium')?.textContent || '';
        const uploadTime = row.querySelector('td:nth-child(2)')?.textContent || '';
        const status = row.querySelector('td:nth-child(3) .badge')?.textContent || '';
        const labels = Array.from(row.querySelectorAll('td:nth-child(4) .badge')).map(badge => badge.textContent);
        const confidence = row.querySelector('td:nth-child(5)')?.textContent || '-';

        // 画像URLを取得（サムネイルから）
        const thumbnailImg = row.querySelector('img');
        const imageSrc = thumbnailImg ? thumbnailImg.src : '';

        // モーダルを開く（画像IDも渡す）
        openImageModal(filename, imageSrc, uploadTime, status, labels, confidence, imageId);
      }
    });
  });
});

// クリックされた準備中バッジの画像IDを保存する変数
let clickedImageId = null;

// 進捗監視用の変数
let progressInterval = null;

// モデル選択モーダルの機能
document.addEventListener('DOMContentLoaded', () => {
  // イベント委譲を使用して準備中バッジのクリックイベントを処理
  document.addEventListener('click', function (event) {
    // 準備中バッジがクリックされた場合
    if (event.target.classList.contains('badge-secondary') &&
      event.target.getAttribute('data-overlay') === '#model-selection-modal') {
      const row = event.target.closest('tr');
      clickedImageId = row ? row.getAttribute('data-image-id') : null;
      console.log('準備中バッジクリック、画像ID:', clickedImageId);
      console.log('行要素:', row);
      console.log('data-image-id属性:', row ? row.getAttribute('data-image-id') : '行が見つからない');

      // 画像IDが取得できない場合の代替手段
      if (!clickedImageId) {
        console.error('画像IDを取得できませんでした');
        alert('画像IDを取得できませんでした。ページを再読み込みしてください。');
      }
    }
  });

  // イベント委譲を使用して解析中バッジのクリックイベントを処理
  document.addEventListener('click', function (event) {
    console.log('クリックされた要素:', event.target);
    console.log('クラス一覧:', event.target.classList.toString());
    console.log('data-overlay属性:', event.target.getAttribute('data-overlay'));

    // 解析中バッジがクリックされた場合
    if (event.target.classList.contains('badge-info') &&
      event.target.getAttribute('data-overlay') === '#analysis-progress-modal') {
      const row = event.target.closest('tr');
      const imageId = row ? row.getAttribute('data-image-id') : null;
      console.log('解析中バッジクリック、画像ID:', imageId);

      // 進捗監視を開始
      if (imageId) {
        startProgressMonitoring(imageId);
      } else {
        console.error('解析中バッジ: 画像IDを取得できませんでした');
      }
    }

    // 解析成功バッジがクリックされた場合
    if (event.target.classList.contains('badge-success') &&
      event.target.getAttribute('data-overlay') === '#slide-down-animated-modal') {
      const row = event.target.closest('tr');
      const imageId = row ? row.getAttribute('data-image-id') : null;
      console.log('解析成功バッジクリック、画像ID:', imageId);

      // 画像詳細モーダルを開く
      if (imageId) {
        openImageDetailModal(imageId);
      }
    }
  });

  // 解析開始ボタン
  const modalStartBtn = document.getElementById('modal-start-analysis-btn');
  if (modalStartBtn) {
    modalStartBtn.addEventListener('click', () => {
      const selector = document.getElementById('model-selector');
      const model = selector ? selector.value : '';
      if (!model) {
        alert('モデルを選択してください');
        return;
      }

      console.log('解析開始ボタンクリック時の画像ID:', clickedImageId);
      if (!clickedImageId) {
        console.error('画像IDが見つかりません');
        alert('画像IDを取得できませんでした');
        return;
      }

      startIndividualAnalysis(clickedImageId, model);
    });
  }

  // モーダルが閉じられた時に画像IDをリセット
  const modal = document.getElementById('model-selection-modal');
  if (modal) {
    modal.addEventListener('hidden.bs.modal', function () {
      clickedImageId = null;
      console.log('モーダル閉じる、画像IDリセット');
    });
  }

  // キャンセルボタンとXボタンで画像IDをリセット
  const cancelBtn = document.querySelector('[data-overlay="#model-selection-modal"]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      clickedImageId = null;
      console.log('キャンセルボタンクリック、画像IDリセット');
    });
  }

  // モデル選択時の説明表示
  const modelSelector = document.getElementById('model-selector');
  if (modelSelector) {
    modelSelector.addEventListener('change', (e) => {
      const selectedModel = e.target.value;
      const descriptionEl = document.getElementById('model-description');
      if (!descriptionEl) return;

      const descriptions = {
        'resnet50': 'ResNet-50 v2.1は、深層学習における代表的な画像分類モデルです。高い精度と汎用性を持ち、様々な画像タスクに適用できます。ImageNetで学習済みで、1000クラスの分類が可能です。',
        'efficientnet': 'EfficientNet-B0は、効率性を重視した軽量モデルです。少ないパラメータ数で高い性能を実現し、モバイルデバイスやエッジコンピューティングに最適です。高速な推論が可能です。',
        'mobilenet': 'MobileNet v2は、モバイル環境に特化して設計されたモデルです。軽量で高速な処理が可能で、スマートフォンやタブレットでのリアルタイム画像認識に適しています。',
        'vgg16': 'VGG-16は、深いネットワーク構造を持つ高精度モデルです。詳細な特徴抽出が得意で、複雑な画像パターンの識別に優れています。計算量は多いですが、高い精度が期待できます。',
        'custom': 'カスタムモデルは、特定の用途やデータセットに特化して学習されたモデルです。ドメイン固有の特徴を捉えることができ、専門的な画像解析タスクに最適です。'
      };

      if (selectedModel && descriptions[selectedModel]) {
        descriptionEl.textContent = descriptions[selectedModel];
      } else {
        descriptionEl.textContent = 'モデルを選択すると、ここに詳細な説明が表示されます。';
      }
    });
  }
});

// 個別画像解析開始
function startIndividualAnalysis(imageId, modelName) {
  console.log('=== 個別画像解析開始 ===');
  console.log('画像ID:', imageId);
  console.log('モデル名:', modelName);
  console.log('タイムスタンプ:', new Date().toISOString());

  // 画像IDが取得できない場合の処理
  if (!imageId) {
    console.error('画像IDが取得できません');
    alert('画像IDが取得できません。ページを再読み込みしてください。');
    return;
  }

  // CSRFトークンを取得
  const csrfToken = getCSRFToken();
  console.log('CSRFトークン:', csrfToken);

  // API呼び出し
  console.log('API呼び出し開始: /api/analysis/start/');
  console.log('リクエストボディ:', { image_id: imageId, model: modelName });

  fetch('/api/analysis/start/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': csrfToken
    },
    body: new URLSearchParams({
      'image_id': imageId,
      'model': modelName
    })
  })
    .then(response => {
      console.log('=== API応答受信 ===');
      console.log('ステータス:', response.status);
      console.log('ステータステキスト:', response.statusText);
      console.log('ヘッダー:', response.headers);

      // レスポンスがJSONかどうかをチェック
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('サーバーから無効なレスポンスが返されました');
      }
      return response.json();
    })
    .then(data => {
      console.log('=== 解析開始API応答 ===');
      console.log('成功:', data.ok);
      console.log('メッセージ:', data.message);
      console.log('結果:', data.results);
      console.log('エラー:', data.error);

      if (data.ok) {
        console.log('解析開始成功:', data);

        // モデル選択時刻を記録
        recordModelSelection(imageId, modelName);

        // バッジを「解析中」に更新
        updateBadgeStatus(imageId, 'analyzing');

        // モーダルを閉じる
        closeModelSelectionModal();

        // ページリロードは不要
      } else {
        console.error('解析開始失敗:', data.error);
        handleAnalysisError('解析の開始に失敗しました: ' + (data.error || '不明なエラー'));
      }
    })
    .catch(error => {
      console.error('=== API呼び出しエラー ===');
      console.error('エラー詳細:', error);
      console.error('エラーメッセージ:', error.message);
      console.error('エラースタック:', error.stack);
      handleAnalysisError('解析の開始中にエラーが発生しました: ' + error.message);
    });
}

// 解析エラー処理
function handleAnalysisError(errorMessage) {
  console.error('解析エラー:', errorMessage);

  // 画像IDを取得
  const imageId = clickedImageId;
  console.log('エラー処理時の画像ID:', imageId);

  // 画像IDをリセット
  clickedImageId = null;

  // FlyonUIのモーダルを正しく閉じる
  const modal = document.getElementById('model-selection-modal');
  if (modal) {
    // 方法1: FlyonUIのHSOverlayを使用してモーダルを閉じる
    if (window.HSOverlay) {
      const overlay = window.HSOverlay.getInstance(modal);
      if (overlay) {
        overlay.close();
      }
    }

    // 方法2: data-overlay属性を持つ要素をクリックしてモーダルを閉じる
    const closeBtn = document.querySelector('[data-overlay="#model-selection-modal"]');
    if (closeBtn) {
      closeBtn.click();
    }

    // 方法3: フォールバック - 手動でモーダルを閉じる
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('overlay-open');
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';

      // 背景オーバーレイも除去
      const overlay = document.querySelector('.overlay');
      if (overlay) {
        overlay.classList.remove('overlay-open');
        overlay.style.display = 'none';
      }

      // bodyからoverlay-openクラスを除去
      document.body.classList.remove('overlay-open');
    }, 100);
  }

  // エラーメッセージを表示
  alert(errorMessage);

  // 画像IDがある場合は、ステータスを失敗に更新
  if (imageId) {
    updateImageStatusToFailed(imageId).then(() => {
      // バッジを「失敗」に更新
      updateBadgeStatus(imageId, 'failed');
    }).catch(() => {
      // ステータス更新に失敗してもバッジを更新
      updateBadgeStatus(imageId, 'failed');
    });
  }
}

// モデル選択時刻を記録
function recordModelSelection(imageId, modelName) {
  console.log('モデル選択記録:', imageId, modelName);

  // モデル名の表示名を取得
  const modelDisplayNames = {
    'resnet50': 'ResNet-50 v2.1',
    'efficientnet': 'EfficientNet-B0',
    'mobilenet': 'MobileNet v2',
    'vgg16': 'VGG-16',
    'custom': 'カスタムモデル'
  };

  const displayName = modelDisplayNames[modelName] || modelName;

  // タイムライン表示を即座に更新
  const now = new Date();
  document.getElementById('model-selection-time').textContent = formatDateTime(now);
  document.getElementById('selected-model').textContent = `選択モデル: ${displayName}`;

  console.log('モデル選択記録完了:', displayName);
}

// 画像ステータスを失敗に更新
function updateImageStatusToFailed(imageId) {
  const csrfToken = getCSRFToken();

  return fetch('/api/update-status/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': csrfToken
    },
    body: new URLSearchParams({
      'image_id': imageId,
      'status': 'failed'
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        console.log('ステータス更新成功:', data);
      } else {
        console.error('ステータス更新失敗:', data.error);
      }
    })
    .catch(error => {
      console.error('ステータス更新エラー:', error);
    });
}

// 進捗監視開始
function startProgressMonitoring(imageId) {
  console.log('進捗監視開始:', imageId);

  // 既存の監視を停止
  if (progressInterval) {
    clearInterval(progressInterval);
  }

  // 進捗モーダルを手動で開く
  const modal = document.getElementById('analysis-progress-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'block';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';

    // 背景オーバーレイを追加
    document.body.classList.add('overlay-open');
  }

  // 進捗バーと％をリセット
  const progressBar = document.getElementById('modal-analysis-progress-bar');
  const progressValue = document.getElementById('modal-analysis-progress-value');
  if (progressBar) progressBar.style.width = '0%';
  if (progressValue) progressValue.textContent = '0';

  // 進捗説明をリセット
  const progressDescription = document.querySelector('#analysis-progress-modal .text-gray-600');
  if (progressDescription) {
    progressDescription.textContent = '解析を開始しています...';
  }

  // 0.5秒ごとに進捗を取得
  progressInterval = setInterval(() => {
    fetch(`/v2/api/analysis/progress/?image_id=${imageId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('進捗取得結果:', data);
        if (data.ok && data.progress !== undefined) {
          const progress = data.progress;
          console.log(`進捗更新: ${progress}% - ${data.description}`);
          if (progressBar) progressBar.style.width = progress + '%';
          if (progressValue) progressValue.textContent = progress;

          // 進捗説明も更新
          const progressDescription = document.querySelector('#analysis-progress-modal .text-gray-600');
          if (progressDescription && data.description) {
            progressDescription.textContent = data.description;
          }

          // 100%になったら監視を停止
          if (progress >= 100) {
            clearInterval(progressInterval);
            progressInterval = null;
            console.log('解析完了');

            // モーダル表示を完了状態に変更
            updateProgressModalToCompleted();

            // バッジを自動で更新
            updateBadgeStatus(imageId, 'success');
          }
        } else {
          console.log('進捗データが無効:', data);
        }
      })
      .catch(error => {
        console.error('進捗取得エラー:', error);
        // エラーが続く場合は監視を停止
        clearInterval(progressInterval);
        progressInterval = null;
      });
  }, 500);
}

// 進捗監視停止
function stopProgressMonitoring() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
    console.log('進捗監視停止');
  }
}

// 進捗モーダルを完了状態に変更
function updateProgressModalToCompleted() {
  // 進捗バーを完了状態に変更
  const progressBar = document.getElementById('modal-analysis-progress-bar');
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.classList.remove('progress-info');
    progressBar.classList.add('progress-success');
  }

  // 進捗値を100%に設定
  const progressValue = document.getElementById('modal-analysis-progress-value');
  if (progressValue) {
    progressValue.textContent = '100';
  }

  // 進捗説明を完了メッセージに変更
  const progressDescription = document.querySelector('#analysis-progress-modal .text-gray-600');
  if (progressDescription) {
    progressDescription.textContent = '解析が完了しました！';
    progressDescription.classList.remove('text-gray-600');
    progressDescription.classList.add('text-success');
  }

  // モーダルのタイトルを変更
  const modalTitle = document.querySelector('#analysis-progress-modal .modal-title');
  if (modalTitle) {
    modalTitle.textContent = '解析完了';
  }

  // ステータス表示を完了状態に変更
  const statusIcon = document.querySelector('#analysis-progress-modal .icon-\\[tabler--brain\\]');
  const statusText = document.querySelector('#analysis-progress-modal .text-info.font-medium');
  if (statusIcon && statusText) {
    statusIcon.className = 'icon-[tabler--check-circle] text-success size-4';
    statusText.textContent = '解析完了';
    statusText.classList.remove('text-info');
    statusText.classList.add('text-success');
  }

  // ローディングアニメーションを停止
  const loadingDots = document.querySelector('#analysis-progress-modal .flex.gap-1');
  if (loadingDots) {
    loadingDots.style.display = 'none';
  }

  console.log('進捗モーダルを完了状態に変更しました');

  // 3秒後に自動でモーダルを閉じる（オプション）
  setTimeout(() => {
    const modal = document.getElementById('analysis-progress-modal');
    if (modal) {
      const closeButton = modal.querySelector('[data-overlay="#analysis-progress-modal"]');
      if (closeButton) {
        closeButton.click();
      }
    }
  }, 3000);
}

// モデル選択モーダルを閉じる
function closeModelSelectionModal() {
  const modal = document.getElementById('model-selection-modal');
  if (modal) {
    // 方法1: モーダル内の閉じるボタンをクリック
    const closeButton = modal.querySelector('[data-hs-overlay-close]');
    if (closeButton) {
      closeButton.click();
      return; // 成功したら終了
    }

    // 方法2: FlyonUIのHSOverlayを使用してモーダルを閉じる
    if (typeof HSOverlay !== 'undefined') {
      try {
        // getInstanceを使用
        const overlay = HSOverlay.getInstance(modal);
        if (overlay && typeof overlay.close === 'function') {
          overlay.close();
          return; // 成功したら終了
        }

        // 直接closeメソッドを呼び出し
        if (typeof HSOverlay.close === 'function') {
          HSOverlay.close(modal);
          return; // 成功したら終了
        }
      } catch (error) {
        console.log('HSOverlay.close()でエラー:', error);
      }
    }

    // フォールバック - 手動でモーダルを閉じる
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('overlay-open');
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';

      // 背景オーバーレイも除去
      const overlay = document.querySelector('.overlay');
      if (overlay) {
        overlay.classList.remove('overlay-open');
        overlay.style.display = 'none';
      }

      // bodyからoverlay-openクラスを除去
      document.body.classList.remove('overlay-open');
    }, 100);
  }
}

// バッジステータスを更新
function updateBadgeStatus(imageId, status) {
  const row = document.querySelector(`tr[data-image-id="${imageId}"]`);
  if (!row) return;

  const statusCell = row.querySelector('td:nth-child(3)');
  if (!statusCell) return;

  // 既存のバッジを削除
  const existingBadge = statusCell.querySelector('.badge');
  if (existingBadge) {
    existingBadge.remove();
  }

  // 新しいバッジを作成
  let newBadge;
  if (status === 'success') {
    newBadge = document.createElement('span');
    newBadge.className = 'badge badge-outline border-dashed badge-success me-2 cursor-pointer';
    newBadge.textContent = '解析成功';
    newBadge.title = 'クリックしてタイムラインを確認';
    newBadge.setAttribute('data-overlay', '#timeline-modal');
  } else if (status === 'failed') {
    newBadge = document.createElement('span');
    newBadge.className = 'badge badge-outline border-dashed badge-error me-2 cursor-pointer';
    newBadge.textContent = '失敗';
    newBadge.title = 'クリックしてタイムラインを確認';
    newBadge.setAttribute('data-overlay', '#timeline-modal');
  } else if (status === 'analyzing') {
    newBadge = document.createElement('span');
    newBadge.className = 'badge badge-outline border-dashed badge-info me-2 cursor-pointer';
    newBadge.textContent = '解析中';
    newBadge.title = 'クリックしてタイムラインを確認';
    newBadge.setAttribute('data-overlay', '#timeline-modal');
  }

  if (newBadge) {
    statusCell.appendChild(newBadge);
    console.log(`バッジを更新: 画像ID ${imageId} -> ${status}`);
    console.log('新しいバッジのクラス:', newBadge.className);
    console.log('新しいバッジのdata-overlay:', newBadge.getAttribute('data-overlay'));

    // FlyonUIのモーダル機能を再初期化
    if (typeof HSOverlay !== 'undefined') {
      try {
        HSOverlay.autoInit();
        console.log('FlyonUIを再初期化しました');
      } catch (error) {
        console.log('FlyonUI再初期化エラー:', error);
      }
    }

    // 解析中バッジの場合は手動でクリックイベントを追加
    if (status === 'analyzing') {
      newBadge.addEventListener('click', function () {
        const row = this.closest('tr');
        const imageId = row ? row.getAttribute('data-image-id') : null;
        console.log('手動イベント: 解析中バッジクリック、画像ID:', imageId);

        if (imageId) {
          startProgressMonitoring(imageId);
        }
      });
      console.log('解析中バッジに手動クリックイベントを追加しました');
    }
  }
}

// モーダルが閉じられた時に進捗監視を停止
const progressModal = document.getElementById('analysis-progress-modal');
if (progressModal) {
  progressModal.addEventListener('hidden.bs.modal', function () {
    stopProgressMonitoring();
  });
}


// Function to reset all filters
function resetAllFilters() {
  console.log('Resetting all filters...');

  // Reset search input
  const searchInput = document.getElementById('exampleDataList');
  if (searchInput) {
    searchInput.value = '';
  }

  // Reset date sort
  const dateSort = document.getElementById('dateSort');
  if (dateSort) {
    dateSort.selectedIndex = 0; // Select first option
  }

  // Reset status filter
  const statusFilter = document.getElementById('selectFloating');
  if (statusFilter) {
    statusFilter.selectedIndex = 0; // Select first option
  }

  // Reset label filter
  const labelFilter = document.getElementById('labelFilter');
  if (labelFilter) {
    labelFilter.selectedIndex = 0; // Select first option
  }

  // Reset confidence filter
  const confidenceFilter = document.getElementById('confidenceFilter');
  if (confidenceFilter) {
    confidenceFilter.selectedIndex = 0; // Select first option
  }

  // Apply filters after reset
  applyFilters();
  console.log('All filters have been reset');
}

// Function to apply filters
function applyFilters() {
  const searchTerm = document.getElementById('exampleDataList').value.toLowerCase();
  const statusFilter = document.getElementById('selectFloating').value;
  const labelFilter = document.getElementById('labelFilter').value;
  const confidenceFilter = document.getElementById('confidenceFilter').value;
  const dateSort = document.getElementById('dateSort').value;

  console.log('フィルター適用:', { searchTerm, statusFilter, labelFilter, confidenceFilter, dateSort });

  const rows = document.querySelectorAll('tbody tr[data-image-id]');
  console.log('見つかった行数:', rows.length);
  let visibleCount = 0;

  // First, collect all rows and their data for sorting
  const rowData = [];
  rows.forEach(row => {
    let showRow = true;

    // Search filter
    if (searchTerm) {
      const filename = row.querySelector('.font-medium').textContent.toLowerCase();
      if (!filename.includes(searchTerm)) {
        showRow = false;
      }
    }

    // Status filter
    if (statusFilter !== 'すべて') {
      const statusBadge = row.querySelector('.badge');
      const statusText = statusBadge.textContent.trim();
      if (statusFilter === 'アップロード' && statusText !== 'アップロード完了') showRow = false;
      if (statusFilter === '解析成功' && statusText !== '解析成功') showRow = false;
      if (statusFilter === '解析中' && statusText !== '解析中') showRow = false;
      if (statusFilter === '準備中' && statusText !== '準備中') showRow = false;
      if (statusFilter === '失敗' && statusText !== '失敗') showRow = false;
    }

    // Label filter
    if (labelFilter !== 'すべて') {
      const labelCell = row.querySelector('td:nth-child(4)'); // ラベル列
      if (labelCell) {
        const labelText = labelCell.textContent.trim();
        if (!labelText.includes(labelFilter)) {
          showRow = false;
        }
      } else {
        showRow = false; // ラベルがない場合は非表示
      }
    }

    // Confidence filter
    if (confidenceFilter !== 'すべて') {
      const confidenceCell = row.querySelector('td:nth-child(5)'); // 信頼度列
      if (confidenceCell) {
        const confidenceText = confidenceCell.textContent.trim();
        const confidenceValue = parseFloat(confidenceText.replace('%', ''));

        if (confidenceFilter === '90%以上' && confidenceValue < 90) showRow = false;
        else if (confidenceFilter === '80-89%' && (confidenceValue < 80 || confidenceValue >= 90)) showRow = false;
        else if (confidenceFilter === '70-79%' && (confidenceValue < 70 || confidenceValue >= 80)) showRow = false;
        else if (confidenceFilter === '60-69%' && (confidenceValue < 60 || confidenceValue >= 70)) showRow = false;
        else if (confidenceFilter === '60%未満' && confidenceValue >= 60) showRow = false;
      } else {
        showRow = false; // 信頼度がない場合は非表示
      }
    }

    if (showRow) {
      // Get upload date for sorting
      const uploadDateText = row.querySelector('td:nth-child(2)').textContent.trim();
      const uploadDate = new Date(uploadDateText);

      // Get confidence for sorting
      const confidenceCell = row.querySelector('td:nth-child(5)');
      const confidenceValue = confidenceCell ? parseFloat(confidenceCell.textContent.replace('%', '')) : 0;

      // Get label for sorting
      const labelCell = row.querySelector('td:nth-child(4)');
      const labelText = labelCell ? labelCell.textContent.trim() : '';

      rowData.push({
        row: row,
        uploadDate: uploadDate,
        uploadDateText: uploadDateText,
        confidence: confidenceValue,
        label: labelText
      });
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });

  // Apply sorting based on multiple criteria
  console.log('複合ソート適用:', { dateSort, labelFilter, confidenceFilter });

  rowData.sort((a, b) => {
    // Primary sort: Label (if label filter is active)
    if (labelFilter !== 'すべて') {
      const labelA = a.label.toLowerCase();
      const labelB = b.label.toLowerCase();
      if (labelA !== labelB) {
        return labelA.localeCompare(labelB);
      }
    }

    // Secondary sort: Confidence (if confidence filter is active)
    if (confidenceFilter !== 'すべて') {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence; // Higher confidence first
      }
    }

    // Tertiary sort: Date
    if (dateSort === '古い順') {
      return a.uploadDate - b.uploadDate;
    } else if (dateSort === '新しい順') {
      return b.uploadDate - a.uploadDate;
    }

    // Default: filename alphabetical
    return a.filename.localeCompare(b.filename);
  });

  // Reorder and show rows
  const tbody = document.querySelector('tbody');
  if (tbody) {
    // Remove existing rows
    rowData.forEach(item => {
      item.row.remove();
    });

    // Add rows in sorted order
    rowData.forEach(item => {
      item.row.style.display = '';
      tbody.appendChild(item.row);
    });
  }

  console.log('表示される行数:', visibleCount);

  // Show "no results" message if no rows are visible
  let noResultsRow = tbody.querySelector('.no-results-row');

  console.log('検索結果チェック:', { visibleCount, totalRows: rows.length, hasNoResultsRow: !!noResultsRow });

  if (visibleCount === 0 && rows.length > 0) {
    console.log('検索結果なしメッセージを表示');
    if (!noResultsRow) {
      noResultsRow = document.createElement('tr');
      noResultsRow.className = 'no-results-row';
      noResultsRow.innerHTML = `
          <td colspan="5" class="text-center py-8">
            <div class="text-gray-500">
              <span class="icon-[tabler--search] size-8 mx-auto mb-2 block"></span>
              検索条件に一致する画像が見つかりません
            </div>
          </td>
        `;
      tbody.appendChild(noResultsRow);
      console.log('検索結果なしメッセージを追加');
    }
    noResultsRow.style.display = '';
  } else if (noResultsRow) {
    console.log('検索結果なしメッセージを非表示');
    noResultsRow.style.display = 'none';
  }
}

// Add event listeners for filters
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('exampleDataList');
  const filters = document.querySelectorAll('select');

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // Filter selects
  filters.forEach(filter => {
    filter.addEventListener('change', applyFilters);
  });
});

// タイムラインデータを取得してモーダルに表示する関数
async function loadTimelineModal(imageId) {
  try {
    console.log('タイムラインデータを取得中:', imageId);

    const response = await fetch(`/api/timeline/${imageId}/`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'タイムラインデータの取得に失敗');
    }

    const timeline = data.timeline;
    console.log('取得したタイムラインデータ:', timeline);

    // モーダルの基本情報を設定
    document.getElementById('timeline-filename').textContent = timeline.filename || 'ファイル名不明';

    // ステータス表示（準備中の場合はキュー情報も表示）
    let statusText = getStatusDisplayName(timeline.status);
    if (timeline.status === 'preparing' && timeline.queue_info && timeline.queue_info.waiting_position > 0) {
      statusText += ` → あと${timeline.queue_info.waiting_position}枚`;
    }
    document.getElementById('timeline-status').textContent = statusText;

    // 進捗バーの表示制御
    updateProgressSection(timeline.status, imageId);

    // タイムラインデータを設定
    updateTimelineDisplay(timeline);

  } catch (error) {
    console.error('タイムライン取得エラー:', error);
    // エラー時はデフォルト表示
    document.getElementById('timeline-filename').textContent = 'データ取得エラー';
    document.getElementById('timeline-status').textContent = 'エラー';
    resetTimelineDisplay();
  }
}

// ステータス表示名を取得する関数
function getStatusDisplayName(status) {
  const statusMap = {
    'upload': 'アップロード',
    'uploaded': 'アップロード完了',
    'preparing': '準備中',
    'analyzing': '解析中',
    'success': '解析成功',
    'failed': '失敗'
  };
  return statusMap[status] || status;
}

// モデル名の表示名変換
function getModelDisplayName(modelKey) {
  const modelMap = {
    'resnet50': 'PyTorch ResNet-50',
    'efficientnet': 'TensorFlow EfficientNet',
    'mobilenet': 'PyTorch MobileNet',
    'vgg16': 'PyTorch VGG-16',
    'custom': 'CLIP'
  };
  return modelMap[modelKey] || modelKey || '-';
}

// 進捗バーセクションの表示制御
function updateProgressSection(status, imageId) {
  const progressSection = document.getElementById('timeline-progress-section');

  if (status === 'analyzing') {
    // 解析中の場合は進捗バーを表示
    progressSection.classList.remove('hidden');
    startTimelineProgressMonitoring(imageId);
  } else {
    // 解析中以外の場合は進捗バーを非表示
    progressSection.classList.add('hidden');
    stopTimelineProgressMonitoring();
  }
}

// タイムライン進捗監視の変数
let timelineProgressInterval = null;

// タイムライン進捗監視を開始
function startTimelineProgressMonitoring(imageId) {
  // 既存の監視を停止
  stopTimelineProgressMonitoring();

  console.log('タイムライン進捗監視開始:', imageId);

  timelineProgressInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/analysis/progress/?image_id=${imageId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.ok) {
        updateTimelineProgress(data);

        // 100%に達したら監視を停止
        if (data.progress >= 100) {
          stopTimelineProgressMonitoring();
          // タイムラインデータを再取得して更新
          loadTimelineModal(imageId);
        }
      }
    } catch (error) {
      console.error('タイムライン進捗取得エラー:', error);
    }
  }, 1000);
}

// タイムライン進捗監視を停止
function stopTimelineProgressMonitoring() {
  if (timelineProgressInterval) {
    clearInterval(timelineProgressInterval);
    timelineProgressInterval = null;
    console.log('タイムライン進捗監視停止');
  }
}

// タイムライン進捗バーを更新
function updateTimelineProgress(data) {
  const progressBar = document.getElementById('timeline-progress-bar');
  const progressValue = document.getElementById('timeline-progress-value');
  const progressDescription = document.getElementById('timeline-progress-description');

  if (progressBar && progressValue) {
    progressBar.style.width = `${data.progress}%`;
    progressValue.textContent = Math.round(data.progress);

    // 進捗に応じてバーの色を変更
    progressBar.classList.remove('progress-info', 'progress-success');
    if (data.progress >= 100) {
      progressBar.classList.add('progress-success');
    } else {
      progressBar.classList.add('progress-info');
    }
  }

  if (progressDescription && data.description) {
    progressDescription.textContent = data.description;
  }
}

// タイムライン表示を更新する関数
function updateTimelineDisplay(timeline) {
  // アップロード時刻
  if (timeline.upload_completed_at) {
    const uploadTime = new Date(timeline.upload_completed_at);
    document.getElementById('upload-time').textContent = formatDateTime(uploadTime);

    if (timeline.upload_duration) {
      document.getElementById('upload-duration').textContent = `所要時間: ${formatDuration(timeline.upload_duration)}`;
    }
  } else {
    document.getElementById('upload-time').textContent = '-';
    document.getElementById('upload-duration').textContent = '所要時間: -';
  }

  // モデル選択時刻
  const modelSelectionItem = document.querySelector('#timeline-content .flex.items-center.gap-3:nth-child(2)');
  if (timeline.model_selected_at) {
    const modelSelectionTime = new Date(timeline.model_selected_at);
    document.getElementById('model-selection-time').textContent = formatDateTime(modelSelectionTime);
    document.getElementById('selected-model').textContent = `選択モデル: ${timeline.selected_model || '-'}`;
    // モデル選択アイテムを表示
    if (modelSelectionItem) {
      modelSelectionItem.style.display = 'flex';
    }
  } else {
    document.getElementById('model-selection-time').textContent = '-';
    document.getElementById('selected-model').textContent = '選択モデル: -';
    // モデル選択アイテムを非表示
    if (modelSelectionItem) {
      modelSelectionItem.style.display = 'none';
    }
  }

  // 解析開始時刻
  if (timeline.analysis_started_at) {
    const analysisStartTime = new Date(timeline.analysis_started_at);
    document.getElementById('analysis-start-time').textContent = formatDateTime(analysisStartTime);

    // モデル名を適切に表示
    const modelName = getModelDisplayName(timeline.model_used);
    document.getElementById('model-used').textContent = `使用モデル: ${modelName}`;
  } else {
    document.getElementById('analysis-start-time').textContent = '-';
    document.getElementById('model-used').textContent = '使用モデル: -';
  }

  // エラー情報の表示
  const errorInfoSection = document.getElementById('error-info-section');
  const retryBtn = document.getElementById('retry-analysis-btn');
  if (timeline.status === 'failed' && timeline.error_info) {
    errorInfoSection.classList.remove('hidden');
    retryBtn.classList.remove('hidden');
    document.getElementById('error-message').textContent = `エラーメッセージ: ${timeline.error_info.error_message}`;
    if (timeline.error_info.error_timestamp) {
      const errorTime = new Date(timeline.error_info.error_timestamp);
      document.getElementById('error-timestamp').textContent = formatDateTime(errorTime);
    } else {
      document.getElementById('error-timestamp').textContent = '-';
    }
  } else {
    errorInfoSection.classList.add('hidden');
    retryBtn.classList.add('hidden');
  }

  // 解析完了時刻
  if (timeline.analysis_completed_at) {
    const analysisEndTime = new Date(timeline.analysis_completed_at);
    document.getElementById('analysis-end-time').textContent = formatDateTime(analysisEndTime);

    if (timeline.analysis_duration) {
      document.getElementById('analysis-duration').textContent = `所要時間: ${formatDuration(timeline.analysis_duration)}`;
    }
  } else {
    document.getElementById('analysis-end-time').textContent = '-';
    document.getElementById('analysis-duration').textContent = '所要時間: -';
  }

  // 総所要時間
  if (timeline.total_duration) {
    document.getElementById('total-duration').textContent = formatDuration(timeline.total_duration);
  } else {
    document.getElementById('total-duration').textContent = '-';
  }
}

// 再解析機能
function retryAnalysis() {
  if (!currentImageId) {
    console.error('画像IDが設定されていません');
    return;
  }

  // 確認ダイアログ
  if (!confirm('この画像を再解析しますか？')) {
    return;
  }

  // 再解析ボタンを無効化
  const retryBtn = document.getElementById('retry-analysis-btn');
  retryBtn.disabled = true;
  retryBtn.innerHTML = '<span class="icon-[tabler--loader-2] size-4 mr-2 animate-spin"></span>再解析中...';

  // 再解析APIを呼び出し
  fetch('/api/analysis/retry/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
      image_id: currentImageId
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // 成功時はモーダルを閉じてページをリロード
        closeTimelineModal();
        location.reload();
      } else {
        alert('再解析の開始に失敗しました: ' + (data.error || '不明なエラー'));
        // ボタンを元に戻す
        retryBtn.disabled = false;
        retryBtn.innerHTML = '<span class="icon-[tabler--refresh] size-4 mr-2"></span>再解析';
      }
    })
    .catch(error => {
      console.error('再解析エラー:', error);
      alert('再解析の開始に失敗しました: ' + error.message);
      // ボタンを元に戻す
      retryBtn.disabled = false;
      retryBtn.innerHTML = '<span class="icon-[tabler--refresh] size-4 mr-2"></span>再解析';
    });
}

// タイムライン表示をリセットする関数
function resetTimelineDisplay() {
  document.getElementById('upload-time').textContent = '-';
  document.getElementById('upload-duration').textContent = '所要時間: -';
  document.getElementById('model-selection-time').textContent = '-';
  document.getElementById('selected-model').textContent = '選択モデル: -';
  document.getElementById('analysis-start-time').textContent = '-';
  document.getElementById('model-used').textContent = '使用モデル: -';
  document.getElementById('analysis-end-time').textContent = '-';
  document.getElementById('analysis-duration').textContent = '所要時間: -';
  document.getElementById('total-duration').textContent = '-';

  // エラー情報セクションを非表示
  const errorInfoSection = document.getElementById('error-info-section');
  const retryBtn = document.getElementById('retry-analysis-btn');
  if (errorInfoSection) errorInfoSection.classList.add('hidden');
  if (retryBtn) retryBtn.classList.add('hidden');

  // モデル選択アイテムを非表示
  const modelSelectionItem = document.querySelector('#timeline-content .flex.items-center.gap-3:nth-child(2)');
  if (modelSelectionItem) {
    modelSelectionItem.style.display = 'none';
  }
}

// 日時をフォーマットする関数
function formatDateTime(date) {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 所要時間をフォーマットする関数
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  }
}

// バッジクリック時にタイムラインモーダルを開く機能を追加
document.addEventListener('click', function (event) {
  const badge = event.target;
  if (badge.classList.contains('badge') && badge.getAttribute('data-overlay') === '#timeline-modal') {
    const row = badge.closest('tr');
    const imageId = row ? row.getAttribute('data-image-id') : null;
    if (imageId) {
      console.log('タイムラインモーダルを開く、画像ID:', imageId);
      loadTimelineModal(imageId);
    }
  }
});

// タイムラインモーダルが閉じられた時に進捗監視を停止
document.addEventListener('DOMContentLoaded', function () {
  const timelineModal = document.getElementById('timeline-modal');
  if (timelineModal) {
    // FlyonUIのモーダルイベントを監視
    timelineModal.addEventListener('hidden.bs.modal', function () {
      stopTimelineProgressMonitoring();
    });

    // 閉じるボタンクリック時も監視停止
    const closeButtons = timelineModal.querySelectorAll('[data-overlay="#timeline-modal"]');
    closeButtons.forEach(button => {
      button.addEventListener('click', function () {
        stopTimelineProgressMonitoring();
      });
    });
  }
});

// ===== テーブルのステータスリアルタイム更新機能 =====

let statusMonitoringInterval = null;

// ページ読み込み時にステータス監視を開始
document.addEventListener('DOMContentLoaded', function () {
  // 解析中の画像があるかチェック
  const analyzingImages = document.querySelectorAll('tr[data-image-id]');
  const analyzingImageIds = [];

  analyzingImages.forEach(row => {
    const badge = row.querySelector('.badge-info, .badge-secondary');
    if (badge) {
      // 解析中または準備中のバッジがある場合
      const imageId = row.getAttribute('data-image-id');
      if (imageId) {
        analyzingImageIds.push(imageId);
      }
    }
  });

  // 解析中の画像がある場合は監視開始
  if (analyzingImageIds.length > 0) {
    console.log('解析中の画像を検出、ステータス監視を開始:', analyzingImageIds);
    startStatusMonitoring(analyzingImageIds);
  }
});

// ステータス監視を開始
function startStatusMonitoring(initialImageIds) {
  // 既存の監視を停止
  if (statusMonitoringInterval) {
    clearInterval(statusMonitoringInterval);
  }

  let monitoringImageIds = [...initialImageIds];

  statusMonitoringInterval = setInterval(() => {
    // 監視対象の画像がなくなったら停止
    if (monitoringImageIds.length === 0) {
      console.log('監視対象の画像がなくなったため、監視を停止します');
      stopStatusMonitoring();
      return;
    }

    // ステータスを一括取得
    const imageIdsParam = monitoringImageIds.join(',');
    fetch(`/v2/api/images/status/?image_ids=${imageIdsParam}`)
      .then(response => response.json())
      .then(data => {
        if (data.ok && data.statuses) {
          // 各画像のステータスを更新
          const completedIds = [];

          Object.keys(data.statuses).forEach(imageId => {
            const statusInfo = data.statuses[imageId];
            updateImageRowStatus(imageId, statusInfo);

            // 完了した画像は監視対象から除外
            if (statusInfo.status === 'completed') {
              completedIds.push(imageId);
            }
          });

          // 完了した画像を監視対象から削除
          monitoringImageIds = monitoringImageIds.filter(id => !completedIds.includes(id.toString()));

          if (completedIds.length > 0) {
            console.log('解析完了した画像:', completedIds);
          }
        }
      })
      .catch(error => {
        console.error('ステータス取得エラー:', error);
      });
  }, 2000); // 2秒ごとにチェック
}

// ステータス監視を停止
function stopStatusMonitoring() {
  if (statusMonitoringInterval) {
    clearInterval(statusMonitoringInterval);
    statusMonitoringInterval = null;
    console.log('ステータス監視を停止しました');
  }
}

// テーブル行のステータスを更新
function updateImageRowStatus(imageId, statusInfo) {
  const row = document.querySelector(`tr[data-image-id="${imageId}"]`);
  if (!row) return;

  const statusCell = row.cells[2]; // ステータスカラム
  const labelCell = row.cells[3];  // ラベルカラム
  const confidenceCell = row.cells[4]; // 信頼度カラム

  if (!statusCell) return;

  // ステータスバッジを更新
  if (statusInfo.status === 'completed') {
    statusCell.innerHTML = '<span class="badge badge-outline border-dashed badge-success me-2">解析成功</span>';

    // ラベルと信頼度を更新
    if (statusInfo.label && labelCell) {
      labelCell.innerHTML = `<span class="badge badge-primary">${statusInfo.label}</span>`;
    }
    if (statusInfo.confidence !== null && confidenceCell) {
      confidenceCell.innerHTML = `<span class="badge badge-success">${statusInfo.confidence.toFixed(2)}%</span>`;
    }

    console.log(`画像 ${imageId} のステータスを更新: completed`);
  } else if (statusInfo.status === 'analyzing') {
    statusCell.innerHTML = '<span class="badge badge-outline border-dashed badge-info me-2">解析中</span>';
    console.log(`画像 ${imageId} のステータスを更新: analyzing`);
  } else if (statusInfo.status === 'preparing') {
    statusCell.innerHTML = '<span class="badge badge-outline border-dashed badge-secondary me-2">準備中</span>';
    console.log(`画像 ${imageId} のステータスを更新: preparing`);
  } else if (statusInfo.status === 'failed') {
    statusCell.innerHTML = '<span class="badge badge-outline border-dashed badge-error me-2">失敗</span>';
    console.log(`画像 ${imageId} のステータスを更新: failed`);
  }
}

