
// 選択された画像がある場合のタイムライン表示制御
document.addEventListener('DOMContentLoaded', function () {
  // テンプレート変数を埋め込まず、DOMのdata属性から取得
  const ctxEl = document.getElementById('page-context');
  const selectedImageStatus = (ctxEl?.dataset.selectedImageStatus || '').trim();
  const selectedImageId = ctxEl?.dataset.selectedImageId || '';

  // グローバル変数として設定
  window.currentImageId = selectedImageId;

  // タイムラインコンテナを表示
  const timelineContainer = document.getElementById('timeline-container');
  if (timelineContainer) {
    timelineContainer.classList.remove('hidden');
    timelineContainer.classList.add('block');
    timelineContainer.style.display = 'block';
  }

  if (selectedImageStatus) {
    showTimelineForSelectedImage(selectedImageStatus);

    // タイムラインが消えないように定期的にチェック
    setInterval(() => {
      const timelineContainer = document.getElementById('timeline-container');
      if (timelineContainer && timelineContainer.classList.contains('hidden')) {
        showTimelineForSelectedImage(selectedImageStatus);
      }
    }, 1000);
  }

  // 再解析ボタンのイベント設定（モーダル表示用）
  setupRetryButtonEvents();
});

// 再解析ボタンのイベントを設定する関数
function setupRetryButtonEvents() {
  const retryButton = document.getElementById('start-analysis-btn');

  if (retryButton) {
    // 既存のイベントリスナーを削除
    retryButton.onclick = null;

    // 新しいイベントリスナーを設定
    retryButton.onclick = function (e) {
      // FlyonUIがモーダルを表示した後にイベントリスナーを設定
      setTimeout(() => {
        setupModalButtonEvents();
      }, 200);
    };
  }
}

// モーダル内のボタンイベントを設定する関数
function setupModalButtonEvents() {
  // モーダル内の解析開始ボタンのイベント設定
  const modalStartButton = document.getElementById('modal-start-analysis-btn');

  if (modalStartButton) {
    // 既存のイベントリスナーを削除
    modalStartButton.onclick = null;

    // 単一のイベントリスナーを設定
    const startClickHandler = function (event) {
      // イベントの重複実行を防ぐ
      if (event && event.defaultPrevented) return;
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // ボタンの連続クリックを防ぐ
      if (modalStartButton.disabled) return;

      // ボタンを無効化
      modalStartButton.disabled = true;
      modalStartButton.innerHTML = '<span class="loading loading-spinner loading-sm"></span>処理中...';

      // 再解析ボタンも無効化
      const retryButton = document.getElementById('start-analysis-btn');
      if (retryButton) {
        retryButton.disabled = true;
        retryButton.innerHTML = '再解析中...';
      }

      // モーダルを閉じる
      closeModal();

      retryAnalysis();
    };

    // 単一のイベントリスナーのみを設定
    modalStartButton.addEventListener('click', startClickHandler);
  }

  // モーダルのキャンセルボタンのイベント設定
  const modalCancelButton = document.getElementById('modal-cancel-btn');

  if (modalCancelButton) {
    // 既存のイベントリスナーを削除
    modalCancelButton.onclick = null;

    // addEventListenerを使用してイベントリスナーを設定
    modalCancelButton.addEventListener('click', function (e) {
      e.preventDefault();

      // モーダルを閉じる
      closeModal();

      // 再解析ボタンを有効化
      const retryButton = document.getElementById('start-analysis-btn');
      if (retryButton) {
        retryButton.disabled = false;
        retryButton.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
      }

      // 再解析ボタンのイベントを再設定
      setTimeout(() => {
        setupRetryButtonEvents();
      }, 100);
    });
  }
}

// モーダルを閉じる共通処理
function closeModal() {
  const modal = document.getElementById('slide-down-animated-modal');
  
  if (modal) {
    // オーバーレイを完全に削除
    modal.classList.add('hidden');
    modal.style.display = 'none';
    modal.classList.remove('open', 'opened');
    modal.removeAttribute('aria-overlay');
    modal.removeAttribute('style');

    // オーバーレイの背景も削除
    const overlay = document.querySelector('.overlay-backdrop');
    if (overlay) {
      overlay.remove();
    }

    // bodyのスクロールを復元
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }
}

// 選択された画像のステータスに応じてタイムラインを表示
function showTimelineForSelectedImage(status) {
  // タイムラインコンテナを表示
  const timelineContainer = document.getElementById('timeline-container');
  if (timelineContainer) {
    timelineContainer.style.display = 'block';
    timelineContainer.classList.remove('hidden');
    timelineContainer.classList.add('block');
  }

  const timeline1 = document.getElementById('timeline-item-1');
  const timeline2 = document.getElementById('timeline-item-2');
  const timeline3 = document.getElementById('timeline-item-3');

  // 全てのタイムラインを初期状態で非表示にする
  [timeline1, timeline2, timeline3].forEach(timeline => {
    if (timeline) {
      timeline.classList.add('hidden');
      timeline.style.display = 'none';
    }
  });

  // selected_image_statusに基づいて表示制御
  if (status === 'uploaded') {
    if (timeline1) {
      timeline1.classList.remove('hidden');
      timeline1.style.display = 'block';
    }
  } else if (status === 'analyzing') {
    if (timeline1) {
      timeline1.classList.remove('hidden');
      timeline1.style.display = 'block';
    }
    if (timeline2) {
      timeline2.classList.remove('hidden');
      timeline2.style.display = 'block';
    }
  } else if (status === 'completed') {
    if (timeline3) {
      timeline3.classList.remove('hidden');
      timeline3.style.display = 'block';
    }
  }

  // 4つ目と5つ目は再解析時のみ表示（初期状態では非表示のまま）
  const timeline4 = document.getElementById('timeline-item-4');
  const timeline5 = document.getElementById('timeline-item-5');
  if (timeline4) {
    timeline4.className = 'hidden';
    timeline4.style.display = 'none';
  }
  if (timeline5) {
    timeline5.className = 'hidden';
    timeline5.style.display = 'none';
  }

  // ボタンの表示制御
  const analysisButton = document.getElementById('analysis-button-container');
  if (analysisButton) {
    analysisButton.classList.remove('hidden');
  }
}

// 再解析の実行中フラグ
let isRetryAnalysisRunning = false;
// 再解析進捗監視のinterval
let retryProgressInterval = null;

// 再解析機能
function retryAnalysis() {
  // 重複実行を防ぐ
  if (isRetryAnalysisRunning) {
    return;
  }

  isRetryAnalysisRunning = true;

  if (!window.currentImageId) {
    alert('画像IDが設定されていません');
    isRetryAnalysisRunning = false;
    return;
  }

  // 再解析フラグを設定（再解析専用ページなので常にtrue）
  window.isRetryAnalysis = true;

  const timeline4 = document.getElementById('timeline-item-4');
  if (timeline4) {
    timeline4.classList.remove('hidden');
    timeline4.style.display = 'block';
    const startedAt = document.getElementById('timeline-retry-started-at');
    if (startedAt && (!startedAt.textContent || startedAt.textContent.trim() === '')) {
      const now = new Date();
      startedAt.textContent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    generateRetryProgressBar();
  }

  const analysisButton = document.getElementById('analysis-button-container');
  const button = analysisButton.querySelector('button');
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="icon-[tabler--loader-2] size-5 mr-2 animate-spin"></span>再解析中...';
  }

  startRetryAnalysis();
}

// 再解析を実際に開始する関数
function startRetryAnalysis() {
  const progressBar = document.querySelector(`[data-analysis-progress-bar-pane="${window.currentImageId}"]`);
  const progressValue = document.querySelector(`[data-analysis-progress-bar-value="${window.currentImageId}"]`);
  const statusText = document.querySelector(`[data-analysis-file-size="${window.currentImageId}"]`);

  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.className = 'progress-bar progress-primary transition-all duration-500';
  }
  if (progressValue) {
    progressValue.textContent = '0';
  }
  if (statusText) {
    statusText.textContent = '解析準備中';
  }

  const modelSelector = document.getElementById('model-selector');
  const selectedModel = modelSelector ? modelSelector.value : 'vgg16';

  startAnalysis(selectedModel, window.currentImageId)
    .then(data => {
      if (data.ok || data.success) {
        startRetryProgressMonitoring();
      } else {
        alert('再解析の開始に失敗しました: ' + (data.error || data.message || '不明なエラー'));
        resetRetryButton();
        isRetryAnalysisRunning = false;
      }
    })
    .catch(error => {
      alert('再解析の開始に失敗しました: ' + error.message);
      resetRetryButton();
      isRetryAnalysisRunning = false;
    });
}

// 再解析ボタンをリセット
function resetRetryButton() {
  const analysisButton = document.getElementById('analysis-button-container');
  const button = analysisButton.querySelector('button');
  if (button) {
    button.disabled = false;
    button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
  }
}

// 再解析進捗バーを生成する関数
function generateRetryProgressBar() {
  const progressContainer = document.getElementById('retry-analysis-progress-previews');
  if (!progressContainer) return;

  const ctxEl = document.getElementById('page-context');
  const selectedImage = {
    id: ctxEl?.dataset.selectedImageId || '',
    filename: ctxEl?.dataset.selectedImageFilename || '',
    thumbnail_url: ctxEl?.dataset.selectedImageThumbnailUrl || ''
  };

  progressContainer.innerHTML = '';

  const lastDot = selectedImage.filename.lastIndexOf('.');
  const filename = lastDot > 0 ? selectedImage.filename.substring(0, lastDot) : selectedImage.filename;
  const fileExt = lastDot > 0 ? selectedImage.filename.substring(lastDot + 1) : '';

  const progressHTML = `
      <div class="rounded-box bg-base-100 shadow-base-300/20 p-3 shadow-lg">
        <div class="mb-1 flex items-center justify-between">
          <div class="flex items-center gap-x-3">
            <span class="text-base-content/80 border-base-content/20 flex size-8 items-center justify-center rounded-lg border p-0.5">
              <img src="${selectedImage.thumbnail_url || '/uploads/images/placeholder.jpg'}" alt="再解析中" class="rounded-md w-full h-full object-cover">
            </span>
            <div>
              <p class="text-base-content text-sm font-medium">
                <span class="inline-block truncate align-bottom" data-analysis-file-name="${selectedImage.id}">${filename}.${fileExt}</span>
                <span data-analysis-file-ext="${selectedImage.id}" style="display: none;">${fileExt}</span>
                <span data-analysis-status="${selectedImage.id}">再解析中</span>
              </p>
              <p class="text-base-content/50 text-xs">AIによる画像再解析を実行中</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-x-3 whitespace-nowrap">
          <div class="progress h-2" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" id="retry-progress-bar">
            <div class="progress-bar progress-primary transition-all duration-500" style="width:0" id="retry-progress-bar-pane"></div>
          </div>
          <span class="text-base-content mb-0.5 text-sm">
            <span id="retry-progress-bar-value">0</span>%
          </span>
        </div>
      </div>
    `;

  progressContainer.innerHTML = progressHTML;
}

// 再解析進捗監視機能
function startRetryProgressMonitoring() {
  if (retryProgressInterval) {
    clearInterval(retryProgressInterval);
  }

  retryProgressInterval = setInterval(() => {
    checkRetryProgress();
  }, 1000);

  setTimeout(() => {
    if (retryProgressInterval) {
      clearInterval(retryProgressInterval);
      retryProgressInterval = null;
    }

    if (window.isRetryAnalysis) {
      updateIndividualProgress(window.currentImageId, 'completed', 100, 'completed');
      updateAnalysisCardToCompleted();
      showRetryCompletedTimeline();

      const analysisButton = document.getElementById('analysis-button-container');
      const button = analysisButton ? analysisButton.querySelector('button') : null;
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
      }

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }

    isRetryAnalysisRunning = false;
  }, 5000);
}

// 再解析進捗確認
function checkRetryProgress() {
  if (!window.currentImageId) return;

  getAnalysisProgress(window.currentImageId)
    .then(data => {
      if (data.progress_percentage !== undefined) {
        updateIndividualProgress(window.currentImageId, data.status, data.progress_percentage, data.progress_stage);
      }

      if (data.status === 'completed' && data.progress_percentage >= 100) {
        if (window.isRetryAnalysis) {
          updateIndividualProgress(window.currentImageId, 'completed', 100, 'completed');
          updateAnalysisCardToCompleted();
          showRetryCompletedTimeline();

          setTimeout(() => {
            window.location.reload();
          }, 3000);

          const analysisButton = document.getElementById('analysis-button-container');
          const button = analysisButton ? analysisButton.querySelector('button') : null;
          if (button) {
            button.disabled = false;
            button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
          }
        }

        if (retryProgressInterval) {
          clearInterval(retryProgressInterval);
          retryProgressInterval = null;
        }
        isRetryAnalysisRunning = false;
      } else if (data.status === 'failed') {
        alert('再解析に失敗しました: ' + (data.error || '不明なエラー'));

        if (retryProgressInterval) {
          clearInterval(retryProgressInterval);
          retryProgressInterval = null;
        }
        isRetryAnalysisRunning = false;
      }
    })
    .catch(error => {
      if (retryProgressInterval) {
        clearInterval(retryProgressInterval);
        retryProgressInterval = null;
      }
      isRetryAnalysisRunning = false;
    });
}

// カードの内容を「解析完了」に変更
function updateAnalysisCardToCompleted() {
  const container = window.isRetryAnalysis ?
    document.getElementById('retry-analysis-progress-previews') :
    document.getElementById('analysis-progress-previews');

  if (!container) return;

  const statusElement = container.querySelector('[data-analysis-file-size]');
  const analysisStatusElement = container.querySelector('[data-analysis-status]');

  if (analysisStatusElement) {
    analysisStatusElement.textContent = '';
  }

  if (statusElement) {
    statusElement.style.display = 'none';
  }

  const descriptionElement = container.querySelector('.text-xs');
  if (descriptionElement) {
    const descriptionText = window.isRetryAnalysis ? '画像の再解析が完了しました' : '画像のカテゴリー分類が完了しました';
    descriptionElement.textContent = descriptionText;
  }

  const allElements = container.querySelectorAll('*');
  allElements.forEach((element) => {
    if (element.textContent && element.textContent.includes('解析中') && !element.textContent.includes('解析完了')) {
      element.style.display = 'none';
    }
  });

  const retryElements = container.querySelectorAll('*');
  retryElements.forEach((element) => {
    if (element.textContent && element.textContent.includes('再解析中') && !element.textContent.includes('再解析完了')) {
      element.textContent = element.textContent.replace('再解析中', '再解析完了');
    }
  });
}

// 再解析完了タイムライン表示
function showRetryCompletedTimeline() {
  const timeline5 = document.getElementById('timeline-item-5');
  if (timeline5) {
    timeline5.classList.remove('hidden');
    timeline5.style.display = 'block';
    const completedAt = document.getElementById('timeline-retry-completed-at');
    if (completedAt && (!completedAt.textContent || completedAt.textContent.trim() === '')) {
      const now = new Date();
      completedAt.textContent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  }
}

// アップロードUIを流用した解析進捗表示を生成
function createAnalysisProgressPreviews() {
  const container = document.getElementById('analysis-progress-previews');
  if (!container) return;

  container.innerHTML = '';

  const ctxEl = document.getElementById('page-context');
  const selectedImage = {
    id: ctxEl?.dataset.selectedImageId || '',
    filename: ctxEl?.dataset.selectedImageFilename || '',
    thumbnail_url: ctxEl?.dataset.selectedImageThumbnailUrl || '',
    status: ctxEl?.dataset.selectedImageStatus || '',
    progress_percentage: Number(ctxEl?.dataset.analysisProgressPercentage || 0),
    progress_stage: ctxEl?.dataset.analysisProgressStage || 'preparing'
  };

  if (!selectedImage.id) return;

  const lastDot = selectedImage.filename.lastIndexOf('.');
  const filename = lastDot > 0 ? selectedImage.filename.substring(0, lastDot) : selectedImage.filename;
  const fileExt = lastDot > 0 ? selectedImage.filename.substring(lastDot + 1) : '';

  const progressItem = document.createElement('div');
  progressItem.className = 'mb-2';
  progressItem.id = `analysis-progress-item-${selectedImage.id}`;

  progressItem.innerHTML = `
      <div class="rounded-box bg-base-100 shadow-base-300/20 p-3 shadow-lg">
        <div class="mb-1 flex items-center justify-between">
          <div class="flex items-center gap-x-3">
            <span class="text-base-content/80 border-base-content/20 flex size-8 items-center justify-center rounded-lg border p-0.5">
              <img class="rounded-md w-full h-full object-cover" data-analysis-thumbnail="${selectedImage.id}" src="${selectedImage.thumbnail_url || ''}" alt="" style="display: ${selectedImage.thumbnail_url ? 'block' : 'none'}">
              <span class="icon-[tabler--photo] text-base-content/70 size-5" data-analysis-icon="${selectedImage.id}" style="display: ${selectedImage.thumbnail_url ? 'none' : 'block'}"></span>
            </span>
            <div>
              <p class="text-base-content text-sm font-medium">
                <span class="inline-block truncate align-bottom" data-analysis-file-name="${selectedImage.id}">${filename}.${fileExt}</span>
                <span data-analysis-file-ext="${selectedImage.id}" style="display: none;">${fileExt}</span>
              </p>
              <p class="text-base-content/50 text-xs" data-analysis-file-size="${selectedImage.id}">解析完了</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-x-3 whitespace-nowrap">
          <div class="progress h-2" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" data-analysis-progress-bar="${selectedImage.id}">
            <div class="progress-bar progress-primary transition-all duration-500" style="width:0%" data-analysis-progress-bar-pane="${selectedImage.id}"></div>
          </div>
          <span class="text-base-content mb-0.5 text-sm">
            <span data-analysis-progress-bar-value="${selectedImage.id}">0</span>%
          </span>
        </div>
      </div>
    `;

  container.appendChild(progressItem);
  updateIndividualProgress(selectedImage.id, selectedImage.status, selectedImage.progress_percentage, selectedImage.progress_stage);
}

// 個別進捗を更新
function updateIndividualProgress(imageId, status, progressPercentage = 0, progressStage = 'preparing') {
  const progressBar = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  const progressValue = document.querySelector(`[data-analysis-progress-bar-value="${imageId}"]`);
  const statusText = document.querySelector(`[data-analysis-file-size="${imageId}"]`);

  if (!progressBar || !progressValue || !statusText) return;

  if (progressPercentage > 0) {
    progressBar.style.width = `${progressPercentage}%`;
    progressValue.textContent = progressPercentage;
  }

  switch (status) {
    case 'uploaded':
      progressBar.style.width = '100%';
      progressValue.textContent = '100';
      progressBar.className = 'progress-bar progress-success transition-all duration-500';
      break;
    case 'preparing':
      if (progressPercentage > 0) {
        progressBar.style.width = `${progressPercentage}%`;
        progressValue.textContent = Math.round(progressPercentage);
      }
      progressBar.className = 'progress-bar progress-warning transition-all duration-500';
      break;
    case 'analyzing':
      if (progressPercentage > 0) {
        progressBar.style.width = `${progressPercentage}%`;
        progressValue.textContent = Math.round(progressPercentage);
      }
      statusText.textContent = '解析中';
      progressBar.className = 'progress-bar progress-info transition-all duration-500';
      break;
    case 'completed':
      progressBar.style.width = '100%';
      progressValue.textContent = '100';
      statusText.textContent = '画像の解析が完了しました。';
      progressBar.className = 'progress-bar progress-success transition-all duration-500';
      updateAnalysisCardToCompletedForImage(imageId);
      break;
    case 'failed':
      progressBar.style.width = '0%';
      progressValue.textContent = '0';
      statusText.textContent = '解析失敗';
      progressBar.className = 'progress-bar progress-error transition-all duration-500';
      setTimeout(() => {
        const timeline2 = document.getElementById('timeline-item-2');
        if (timeline2 && timeline2.style.display !== 'none') {
          const errorTimeline = document.getElementById('timeline-item-3-error');
          if (errorTimeline) {
            errorTimeline.className = '';
            errorTimeline.style.display = 'block';
          }
        }
      }, 100);
      break;
    case 'error':
      progressBar.style.width = '0%';
      progressValue.textContent = '0';
      statusText.textContent = 'エラー';
      progressBar.className = 'progress-bar progress-error transition-all duration-500';
      break;
  }
}

// 特定の画像IDのカードを「解析完了」に変更
function updateAnalysisCardToCompletedForImage(imageId) {
  const progressBarPane = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  const container = progressBarPane?.closest('.progress-container');

  if (!container) return;

  const descriptionElement = container.querySelector('.text-xs');
  if (descriptionElement) {
    descriptionElement.textContent = '画像のカテゴリー分類が完了しました';
  }

  const allElements = container.querySelectorAll('*');
  allElements.forEach((element) => {
    if (element.textContent && element.textContent.includes('解析中') && !element.textContent.includes('解析完了')) {
      element.style.display = 'none';
    }
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
      'resnet50': 'PyTorch ResNet-50は、実際の機械学習ライブラリを使用した汎用画像分類モデルです。ImageNetで学習済みで、1000クラスの高精度な分類が可能です。実写画像の詳細な解析に最適です。',
      'efficientnet': 'TensorFlow EfficientNetは、効率性を重視した軽量モデルです。少ないパラメータ数で高い性能を実現し、高速な推論が可能です。（現在エラー中）',
      'mobilenet': 'PyTorch MobileNetは、モバイル環境に特化した軽量モデルです。実際のライブラリを使用して、スマートフォンでも高速な画像認識が可能です。',
      'vgg16': 'PyTorch VGG-16は、深いネットワーク構造を持つ高精度モデルです。実際のライブラリを使用して、詳細な特徴抽出と複雑な画像パターンの識別が可能です。',
      'custom': 'CLIPは、OpenAIが開発した柔軟なテキストラベル分類モデルです。アニメ/実写の区別や、カスタムラベルの生成が可能で、最も人間に近い解析が期待できます。'
    };

    descriptionEl.textContent = descriptions[selectedModel] || 'モデルを選択すると、ここに詳細な説明が表示されます。';
  });
}