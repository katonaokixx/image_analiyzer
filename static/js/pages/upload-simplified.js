

// ファイルアップロード関連のJavaScript
let progressIntervalId = null; // グローバルスコープで定義
let uploadEl = null; // グローバルスコープで定義
let individualProgressIntervalId = null; // 個別進捗監視用
let progressMonitoringInterval = null; // 解析進捗監視用
let animationInterval = null; // アニメーション用
let uploadedImagesData = []; // アップロード済み画像のデータ（IDを含む） - image-upload.jsと共有

// 初期状態を強制的に設定（FlyonUIが削除する前に）
document.addEventListener('DOMContentLoaded', () => {
  // できるだけ早く実行
  const c = document.getElementById('upload-button-container');
  if (c) {
    c.classList.add('hidden');
    c.classList.remove('flex');
    console.log('初期状態を強制設定: hidden クラスを追加');
  }

  // 複数回チェックして強制的に hidden を維持
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const c = document.getElementById('upload-button-container');
      if (c && !c.classList.contains('hidden')) {
        console.log(`${i * 100}ms後: hidden が削除されていたので再設定`);
        c.classList.add('hidden');
        c.classList.remove('flex');
      }
    }, i * 100);
  }
});

// ページ離脱時の処理
window.addEventListener('beforeunload', function () {
  stopProgressWatcher();
  stopIndividualProgressWatcher();

  // 解析進捗監視も停止
  if (progressMonitoringInterval) {
    clearInterval(progressMonitoringInterval);
    progressMonitoringInterval = null;
  }
});

// 進捗監視関数をグローバルスコープで定義
function startProgressWatcher() {
  return setInterval(checkUploadProgress, 500);
}

// 解析完了後のUI状態を完全にリセットする関数
function resetAnalysisUI() {

  // 進捗バーをリセット
  const bar = document.getElementById('analysis-progress-bar');
  if (bar) {
    bar.style.width = '0%';
    bar.classList.remove('bg-info', 'bg-success', 'bg-error');
    bar.classList.add('bg-info');
  }

  // 進捗値をリセット
  const valEl = document.getElementById('analysis-progress-value');
  if (valEl) {
    valEl.textContent = '0';
  }

  // ステータステキストをリセット
  const statusText = document.querySelector('#timeline-item-2 .text-warning');
  if (statusText) {
    statusText.textContent = '解析準備中';
    statusText.classList.remove('text-warning', 'text-success', 'text-error');
    statusText.classList.add('text-warning');
  }

  // 進捗バー横のステータステキストをリセット
  const analysisStatusText = document.getElementById('analysis-status-text');
  if (analysisStatusText) {
    analysisStatusText.textContent = '解析準備中';
    analysisStatusText.classList.remove('text-warning', 'text-success', 'text-error');
    analysisStatusText.classList.add('text-warning');
  }

  // 進捗バー下のステータステキストをリセット
  const analysisStatusText2 = document.getElementById('analysis-status-text-2');
  if (analysisStatusText2) {
    analysisStatusText2.textContent = '解析準備中';
    analysisStatusText2.classList.remove('text-warning', 'text-success', 'text-error');
    analysisStatusText2.classList.add('text-warning');
  }

  // ステータスアイコンをリセット
  const analysisStatusIcon = document.getElementById('analysis-status-icon');
  if (analysisStatusIcon) {
    analysisStatusIcon.innerHTML = '<i class="icon-[tabler--clock] text-warning size-4 sm:size-5"></i>';
  }

  // タイムラインの背景色をリセット
  const timelineItem2 = document.getElementById('timeline-item-2');
  if (timelineItem2) {
    const timelineEnd2 = timelineItem2.querySelector('.timeline-end');
    if (timelineEnd2) {
      timelineEnd2.classList.remove('bg-warning/5', 'border-warning/20', 'bg-success/5', 'border-success/20', 'bg-error/5', 'border-error/20');
      timelineEnd2.classList.add('bg-warning/5', 'border-warning/20');
    }
  }

  // 完了アイコンをリセット
  const dot1 = document.getElementById('dot-1');
  if (dot1) {
    dot1.innerHTML = '<div class="w-2 h-2 bg-warning rounded-full animate-pulse"></div>';
    dot1.classList.remove('text-success');
    dot1.classList.add('bg-warning', 'animate-pulse');
  }

  // 他のドットを表示
  const dot2 = document.getElementById('dot-2');
  const dot3 = document.getElementById('dot-3');
  if (dot2) {
    dot2.style.display = 'block';
    dot2.innerHTML = '<div class="w-2 h-2 bg-warning rounded-full animate-pulse"></div>';
  }
  if (dot3) {
    dot3.style.display = 'block';
    dot3.innerHTML = '<div class="w-2 h-2 bg-warning rounded-full animate-pulse"></div>';
  }

  // タイムラインアイテム3を非表示
  const item3 = document.getElementById('timeline-item-3');
  if (item3) {
    item3.className = 'hidden';
    item3.style.display = 'none';
  }

}

function stopProgressWatcher() {
  if (progressIntervalId) {
    clearInterval(progressIntervalId);
    progressIntervalId = null;
  }
}

// アップロードUIを流用した解析進捗表示を生成
function createAnalysisProgressPreviews(uploadedImages) {
  const container = document.getElementById('analysis-progress-previews');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  uploadedImages.forEach((image, index) => {
    // ファイル名と拡張子を分離
    const lastDot = image.filename.lastIndexOf('.');
    const filename = lastDot > 0 ? image.filename.substring(0, lastDot) : image.filename;
    const fileExt = lastDot > 0 ? image.filename.substring(lastDot + 1) : '';

    // アップロード時のUIテンプレートを完全に流用
    const progressItem = document.createElement('div');
    progressItem.className = 'mb-2 progress-container';
    progressItem.id = `analysis-progress-item-${image.id}`;

    progressItem.innerHTML = `
      <div class="rounded-box bg-base-100 shadow-base-300/20 p-3 shadow-lg">
        <div class="mb-1 flex items-center justify-between">
          <div class="flex items-center gap-x-3">
            <span class="text-base-content/80 border-base-content/20 flex size-8 items-center justify-center rounded-lg border p-0.5">
              <img class="rounded-md w-full h-full object-cover" data-analysis-thumbnail="${image.id}" src="${image.thumbnail_url || ''}" alt="" style="display: ${image.thumbnail_url ? 'block' : 'none'}">
              <span class="icon-[tabler--photo] text-base-content/70 size-5" data-analysis-icon="${image.id}" style="display: ${image.thumbnail_url ? 'none' : 'block'}"></span>
            </span>
            <div>
              <p class="text-base-content text-sm font-medium">
                <span class="inline-block truncate align-bottom" data-analysis-file-name="${image.id}">${filename}.${fileExt}</span>
                <span data-analysis-file-ext="${image.id}" style="display: none;">${fileExt}</span>
              </p>
              <p class="text-base-content/50 text-xs" data-analysis-file-size="${image.id}">解析中</p>
            </div>
          </div>
          <div class="flex items-center">
            <!-- アイコンを削除 -->
          </div>
        </div>
        <div class="flex items-center gap-x-3 whitespace-nowrap">
          <div class="progress h-2" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" data-analysis-progress-bar="${image.id}">
            <div class="progress-bar progress-primary transition-all duration-500" style="width:0%" data-analysis-progress-bar-pane="${image.id}"></div>
          </div>
          <span class="text-base-content mb-0.5 text-sm">
            <span data-analysis-progress-bar-value="${image.id}">0</span>%
          </span>
        </div>
      </div>
    `;

    container.appendChild(progressItem);
  });
}

// 個別進捗監視を開始
function startIndividualProgressWatcher() {
  if (individualProgressIntervalId) {
    clearInterval(individualProgressIntervalId);
  }

  individualProgressIntervalId = setInterval(checkIndividualProgress, 1000);
}

// 個別進捗監視を停止
function stopIndividualProgressWatcher() {
  if (individualProgressIntervalId) {
    clearInterval(individualProgressIntervalId);
    individualProgressIntervalId = null;
  }
}

// 個別進捗をチェック
function checkIndividualProgress() {
  // 解析が完了している場合は個別進捗監視を停止
  if (progressMonitoringInterval === null) {
    stopIndividualProgressWatcher();
    return;
  }

  // アップロード済み画像の進捗をチェック
  const uploadedImages = getUploadedImages();
  if (uploadedImages.length === 0) return;

  uploadedImages.forEach(image => {
    updateIndividualProgress(image.id, image.status);
  });
}

// 個別進捗を更新（アップロードUI構造に合わせて）
function updateIndividualProgress(imageId, status) {
  const progressBar = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  const progressValue = document.querySelector(`[data-analysis-progress-bar-value="${imageId}"]`);
  const statusText = document.querySelector(`[data-analysis-file-size="${imageId}"]`);

  if (!progressBar || !progressValue || !statusText) return;

  switch (status) {
    case 'uploaded':
      progressBar.style.width = '100%';
      progressValue.textContent = '100';
      // ファイル拡張子は保持し、ステータスは別の要素で管理
      // statusText.textContent = '解析中';
      progressBar.className = 'progress-bar progress-success transition-all duration-500';
      break;
    case 'preparing':
      // 準備中の進捗は実際の進捗値を使用（APIから取得した値）
      const progressPercent = data.progress || 0;
      progressBar.style.width = `${progressPercent}%`;
      progressValue.textContent = Math.round(progressPercent);

      // ファイル拡張子は保持し、ステータスは別の要素で管理
      // statusText.textContent = `準備中（あと${remainingImages}枚）`;
      progressBar.className = 'progress-bar progress-warning transition-all duration-500';
      break;
    case 'analyzing':
      // 解析中の進捗は実際の進捗値を使用（APIから取得した値）
      const actualProgress = data.progress || 0;
      progressBar.style.width = actualProgress + '%';
      progressValue.textContent = actualProgress;
      // 解析中のステータステキストを設定
      statusText.textContent = '解析中';
      progressBar.className = 'progress-bar progress-info transition-all duration-500';
      break;
    case 'completed':
      progressBar.style.width = '100%';
      progressValue.textContent = '100';
      // 解析完了時のステータステキストを設定
      statusText.textContent = '画像の解析が完了しました。';
      progressBar.className = 'progress-bar progress-success transition-all duration-500';

      // 個別の画像が完了した時にカードを更新（特定の画像IDを指定）
      updateAnalysisCardToCompletedForImage(imageId);
      break;
    case 'failed':
      progressBar.style.width = '0%';
      progressValue.textContent = '0';
      statusText.textContent = '解析失敗';
      progressBar.className = 'progress-bar progress-error transition-all duration-500';

      // 解析失敗タイムラインを表示（解析が開始されている場合のみ）
      setTimeout(() => {
        // 解析が開始されているかチェック
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

// 解析開始時に全画像のステータスを準備中に更新
function updateAllImagesToPreparing() {
  const uploadedImages = getUploadedImages();
  uploadedImages.forEach(image => {
    updateIndividualProgress(image.id, 'preparing');
  });
}

// 解析開始時に全画像のステータスを解析中に更新
function updateAllImagesToAnalyzing() {
  const uploadedImages = getUploadedImages();
  uploadedImages.forEach(image => {
    updateIndividualProgress(image.id, 'analyzing');
  });
}

// 解析失敗時に全画像のステータスを失敗に更新
function updateAllImagesToFailed() {
  const uploadedImages = getUploadedImages();
  uploadedImages.forEach(image => {
    updateIndividualProgress(image.id, 'failed');
  });
}

// 準備中の進捗を段階的に更新
function updatePreparingProgress(overallProgress) {
  const uploadedImages = getUploadedImages();

  uploadedImages.forEach((image, index) => {
    const progressBar = document.querySelector(`[data-analysis-progress-bar-pane="${image.id}"]`);
    const progressValueEl = document.querySelector(`[data-analysis-progress-bar-value="${image.id}"]`);

    if (progressBar && progressValueEl) {
      // 実際の進捗値を使用
      const imageProgress = overallProgress;

      progressBar.style.width = `${imageProgress}%`;
      progressValueEl.textContent = Math.round(imageProgress);
    }
  });
}

// 解析段階に基づいて個別進捗を更新
function updateIndividualProgressBasedOnStage(currentStage, status, actualProgress = 0) {
  const uploadedImages = getUploadedImages();

  uploadedImages.forEach((image, index) => {
    let progressStatus = 'preparing';
    let progressWidth = '0%';
    let progressValue = '0';

    switch (currentStage) {
      case 'preparing':
        progressStatus = 'preparing';
        // 実際の進捗を使用（APIから取得した値）
        progressWidth = `${actualProgress}%`;
        progressValue = Math.round(actualProgress);
        break;
      case 'analyzing':
        progressStatus = 'analyzing';
        // 実際の進捗を使用（APIから取得した値）
        progressWidth = `${actualProgress}%`;
        progressValue = Math.round(actualProgress);
        break;
      case 'completed':
        // 実際の進捗が100%になった時のみ完了状態にする
        if (actualProgress >= 100) {
          progressStatus = 'completed';
          progressWidth = '100%';
          progressValue = '100';
        } else {
          // 100%未満の場合は現在の進捗を維持
          progressStatus = 'analyzing';
          progressWidth = `${actualProgress}%`;
          progressValue = Math.round(actualProgress);
        }
        break;
      case 'failed':
        progressStatus = 'failed';
        progressWidth = '0%';
        progressValue = '0';
        break;
      case 'error':
        progressStatus = 'error';
        progressWidth = '0%';
        progressValue = '0';
        break;
    }

    // 進捗バーと値を直接更新
    const progressBar = document.querySelector(`[data-analysis-progress-bar-pane="${image.id}"]`);
    const progressValueEl = document.querySelector(`[data-analysis-progress-bar-value="${image.id}"]`);

    if (progressBar) {
      progressBar.style.width = progressWidth;
    }
    if (progressValueEl) {
      progressValueEl.textContent = progressValue;
    }

    updateIndividualProgress(image.id, progressStatus);
  });
}

// 全画像の進捗を個別に取得して更新
function updateIndividualProgressForAllImages() {
  const uploadedImages = getUploadedImages();

  console.log('updateIndividualProgressForAllImages呼び出し、画像数:', uploadedImages.length);

  if (uploadedImages.length === 0) {
    console.log('アップロード済み画像が見つかりません');
    return;
  }

  // 各画像のIDリストを作成
  const imageIds = uploadedImages.map(img => img.id);
  console.log('取得した画像ID:', imageIds);

  // ステータスを一括取得
  const apiUrl = `/v2/api/images/status/?image_ids=${imageIds.join(',')}`;
  console.log('ステータス取得API呼び出し:', apiUrl);

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      console.log('ステータス取得レスポンス:', data);
      if (data.ok && data.statuses) {
        uploadedImages.forEach(image => {
          const statusInfo = data.statuses[image.id];
          if (statusInfo) {
            console.log(`画像 ${image.id} のステータス:`, statusInfo);
            updateIndividualImageProgress(image.id, statusInfo);
          }
        });
      }
    })
    .catch(error => {
      console.error('個別ステータス取得エラー:', error);
    });
}

// 個別画像の進捗バーを更新
function updateIndividualImageProgress(imageId, statusInfo) {
  const progressBar = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  const progressValueEl = document.querySelector(`[data-analysis-progress-bar-value="${imageId}"]`);
  const statusText = document.querySelector(`[data-analysis-file-size="${imageId}"]`);

  if (!progressBar || !progressValueEl) return;

  // ステータスに応じて進捗を設定
  if (statusInfo.status === 'completed') {
    progressBar.style.width = '100%';
    progressValueEl.textContent = '100';
    progressBar.className = 'progress-bar progress-success transition-all duration-500';
    if (statusText) statusText.textContent = '解析完了';
  } else if (statusInfo.status === 'analyzing') {
    // 解析中は推定進捗（50-90%）
    const currentWidth = parseInt(progressBar.style.width) || 50;
    const newWidth = Math.min(90, currentWidth + 5);
    progressBar.style.width = newWidth + '%';
    progressValueEl.textContent = newWidth;
    progressBar.className = 'progress-bar progress-info transition-all duration-500';
    if (statusText) statusText.textContent = '解析中';
  } else if (statusInfo.status === 'preparing') {
    // 準備中は0-30%
    const currentWidth = parseInt(progressBar.style.width) || 0;
    const newWidth = Math.min(30, currentWidth + 5);
    progressBar.style.width = newWidth + '%';
    progressValueEl.textContent = newWidth;
    progressBar.className = 'progress-bar progress-warning transition-all duration-500';
    if (statusText) statusText.textContent = '準備中';
  } else if (statusInfo.status === 'uploaded') {
    // アップロード完了
    progressBar.style.width = '100%';
    progressValueEl.textContent = '100';
    progressBar.className = 'progress-bar progress-success transition-all duration-500';
  }
}

// アップロード済み画像を取得
let lastUploadedImagesCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 1000; // 1秒間キャッシュ

function getUploadedImages() {
  // キャッシュをチェック
  const now = Date.now();
  if (lastUploadedImagesCache && (now - lastCacheTime) < CACHE_DURATION) {
    return lastUploadedImagesCache;
  }

  // ページからアップロード済み画像の情報を取得
  const uploadedImages = [];

  // アップロード済み画像の要素を取得（正しいセレクターを使用）
  const previewsContainer = document.querySelector('[data-file-upload-previews]');
  let imageElements = [];

  if (previewsContainer) {
    // コンテナ内の実際の画像要素を取得
    imageElements = previewsContainer.querySelectorAll('.rounded-box.bg-base-100');
  }

  // フォールバック: Dropzoneの要素を検索
  if (imageElements.length === 0) {
    imageElements = document.querySelectorAll('.dz-preview, .file-upload-preview');
  }

  // さらにフォールバック: アップロードエリア内のすべての要素を検索
  if (imageElements.length === 0) {
    const uploadArea = document.querySelector('#file-upload-limit');
    if (uploadArea) {
      imageElements = uploadArea.querySelectorAll('.rounded-box, .dz-preview, [data-dz-thumbnail]');
    }
  }



  imageElements.forEach((element, index) => {

    // ファイル名を取得（実際の要素から直接取得）
    const filenameElement = element.querySelector('[data-file-upload-file-name]');
    const fileExtElement = element.querySelector('[data-file-upload-file-ext]');

    let filename = filenameElement ? filenameElement.textContent.trim() : '';
    let fileExt = fileExtElement ? fileExtElement.textContent.trim() : '';


    // ファイル名が空の場合は、要素の属性から取得を試行
    if (!filename) {
      // ファイル名が空のため、要素の属性から取得を試行
      const fileInput = element.querySelector('input[type="file"]');
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fullName = file.name;
        const lastDot = fullName.lastIndexOf('.');
        if (lastDot > 0) {
          filename = fullName.substring(0, lastDot);
          fileExt = fullName.substring(lastDot + 1);
        } else {
          filename = fullName;
          fileExt = '';
        }

      } else {

      }
    }

    const fullFilename = filename && fileExt ? `${filename}.${fileExt}` :
      filename ? filename : `image${index + 1}.jpg`;

    // 画像の状態を判定（簡易版）
    const progressBar = element.querySelector('[data-file-upload-progress-bar-pane]');
    const progressWidth = progressBar ? progressBar.style.width : '0%';
    let status = 'uploaded';

    if (progressWidth === '100%') {
      status = 'analyzing'; // アップロード完了後は解析中と仮定
    }

    // サムネイルURLを取得
    const thumbnailImg = element.querySelector('[data-dz-thumbnail]');
    const thumbnailUrl = thumbnailImg ? thumbnailImg.src : '';

    // サムネイル要素を取得

    uploadedImages.push({
      id: index + 1,
      filename: fullFilename,
      status: status,
      thumbnail_url: thumbnailUrl
    });
  });

  // キャッシュを更新
  lastUploadedImagesCache = uploadedImages;
  lastCacheTime = now;

  return uploadedImages;
}

// グローバル関数として定義（他のスクリプトからもアクセス可能にする）
window.getUploadedImages = getUploadedImages;

// アップロード成功後にテンプレート要素を更新
function updateTemplateAfterUpload(file, resp) {
  // より広範囲でアップロード済み画像の要素を取得
  const imageElements = document.querySelectorAll('[data-file-upload-preview]');

  imageElements.forEach((element, index) => {

    // ファイル名を更新
    // テンプレート要素の場合は、contentプロパティから検索
    const searchElement = element.content ? element.content : element;
    const filenameElement = searchElement.querySelector('[data-file-upload-file-name]');
    const fileExtElement = searchElement.querySelector('[data-file-upload-file-ext]');

    // 要素を検索して更新

    if (filenameElement && fileExtElement) {
      const fullName = file.name;
      const lastDot = fullName.lastIndexOf('.');
      if (lastDot > 0) {
        const filename = fullName.substring(0, lastDot);
        const fileExt = fullName.substring(lastDot + 1);
        filenameElement.textContent = filename;
        fileExtElement.textContent = fileExt;
        // ファイル名を更新
      }
    } else {
      // ファイル名要素または拡張子要素が見つかりません
    }

    // 進捗バーを100%に更新
    const progressBar = searchElement.querySelector('[data-file-upload-progress-bar-pane]');
    if (progressBar) {
      progressBar.style.width = '100%';
    }

    // 進捗値を更新
    const progressValue = searchElement.querySelector('[data-file-upload-progress-value]');
    if (progressValue) {
      progressValue.textContent = '100';
    }

    // サムネイルを更新
    const thumbnailImg = searchElement.querySelector('[data-dz-thumbnail]');
    if (thumbnailImg && file.preview) {
      thumbnailImg.src = file.preview;
      thumbnailImg.style.display = 'block';
    }
  });

  // テンプレート要素が見つからない場合は、直接要素を検索して更新
  if (imageElements.length === 0) {
    // ファイル名を更新
    const filenameElements = document.querySelectorAll('[data-file-upload-file-name]');
    const fileExtElements = document.querySelectorAll('[data-file-upload-file-ext]');

    if (filenameElements.length > 0 && fileExtElements.length > 0) {
      const fullName = file.name;
      const lastDot = fullName.lastIndexOf('.');
      if (lastDot > 0) {
        const filename = fullName.substring(0, lastDot);
        const fileExt = fullName.substring(lastDot + 1);
        filenameElements[0].textContent = filename;
        fileExtElements[0].textContent = fileExt;
      }
    }

    // 進捗バーを100%に更新
    const progressBars = document.querySelectorAll('[data-file-upload-progress-bar-pane]');
    if (progressBars.length > 0) {
      progressBars[0].style.width = '100%';
    }

    // 進捗値を更新
    const progressValues = document.querySelectorAll('[data-file-upload-progress-value]');
    if (progressValues.length > 0) {
      progressValues[0].textContent = '100';
    }

    // サムネイルを更新
    const thumbnailImgs = document.querySelectorAll('[data-dz-thumbnail]');
    if (thumbnailImgs.length > 0 && file.preview) {
      thumbnailImgs[0].src = file.preview;
      thumbnailImgs[0].style.display = 'block';
    }
  }
}

function checkUploadProgress() {
  // より広範囲で進捗バーを検索
  const bars = document.querySelectorAll('[data-file-upload-progress-bar-pane]');
  if (bars.length === 0) return;

  bars.forEach((bar, idx) => {
    const raw = bar.style.width || getComputedStyle(bar).width;
    const pct = normalizePercent(raw);
    if (raw !== bar.dataset.lastRaw) {
      bar.dataset.lastRaw = raw;

      // 進捗％表示を更新
      const progressValue = bar.closest('[data-file-upload-preview]')?.querySelector('[data-file-upload-progress-value]');
      if (progressValue) {
        progressValue.textContent = Math.round(pct);
      }
    }
  });
}

function normalizePercent(widthStr) {
  if (!widthStr) return 0;

  // %表記の場合
  if (widthStr.endsWith('%')) {
    const match = widthStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  // px表記の場合
  if (widthStr.endsWith('px')) {
    const px = parseFloat(widthStr);
    const parent = document.querySelector('[data-file-upload-progress-bar-pane]')?.parentElement;
    if (parent && parent.offsetWidth > 0) {
      return (px / parent.offsetWidth) * 100;
    }
    return 0;
  }

  // 数字のみの場合
  const match = widthStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

window.addEventListener('load', () => {

  window.uploadSuccessShown = false;
  window.uploadEnabled = false;

  // 可視エラー判定の猶予
  const ERROR_SCAN_DELAY_MS = 500;
  let firstFileAddedAt = 0;

  let uploadInProgress = false;
  const START_TEXT = 'アップロード開始';
  const UPLOADING_TEXT = 'アップロード中...';
  const RETRY_TEXT = '再試行';

  let currentBatchFiles = [];
  let totalUploadedFiles = 0; // 累計アップロードファイル数
  let batchSuccessCount = 0;
  let batchFailCount = 0;
  let sessionUploadCount = 0; // セッション内の累積アップロード数

  // CSRFトークン取得は共通ユーティリティ（utils.js）を使用

  function getUploadBtn() {
    return document.getElementById('start-upload-btn');
  }
  function setUploadBtn(text, disabled) {
    const btn = getUploadBtn();
    if (!btn) return;

    // アイコン付きのHTMLを設定
    let iconClass = 'icon-[tabler--upload]';
    if (text === UPLOADING_TEXT) {
      iconClass = 'icon-[tabler--loader-2] animate-spin';
    } else if (text === RETRY_TEXT) {
      iconClass = 'icon-[tabler--refresh]';
    }

    btn.innerHTML = `<span class="${iconClass} size-5 mr-2"></span>${text}`;
    btn.disabled = !!disabled;
  }
  function anyFileFailed() {
    return dz.files.some(f => f.status === 'error' || f.status === 'canceled');
  }

  // ライブラリ存在確認
  if (typeof Dropzone === 'undefined') {
    return;
  }
  if (typeof HSFileUpload === 'undefined') {
    return;
  }

  uploadEl = document.querySelector('#file-upload-limit');
  if (!uploadEl) {
    return;
  }

  let fileUpload = HSFileUpload.getInstance(uploadEl);
  if (!fileUpload) {
    try {
      fileUpload = new HSFileUpload(uploadEl, {
        dropzone: {
          parallelUploads: 1,  // 並列アップロードを1に制限（確実な順次処理）
          maxFiles: 5,
          autoProcessQueue: false,
          headers: {
            'X-CSRFToken': getCSRFToken()
          }
        }
      });
    } catch (e) {
      return;
    }
  }

  const dz = fileUpload.dropzone || fileUpload._dropzone || fileUpload._dz ||
    (fileUpload instanceof Dropzone ? fileUpload : null);

  if (!dz) {
    return;
  }

  // options ガード
  if (!fileUpload.options) fileUpload.options = {};

  // autoProcessQueue 強制 (安全化)
  if (dz.options) {
    dz.options.autoProcessQueue = false;
    dz.options.parallelUploads = 1;  // 並列アップロードを1に制限（確実な順次処理）
    dz.options.maxFiles = 5;
    dz.options.headers = dz.options.headers || {};
    dz.options.headers['X-CSRFToken'] = getCSRFToken();
  } else {
    dz.on && dz.on('init', function () {
      if (this.options) {
        this.options.autoProcessQueue = false;
        this.options.parallelUploads = 1;  // 並列アップロードを1に制限（確実な順次処理）
        this.options.maxFiles = 5;
        this.options.headers = this.options.headers || {};
        this.options.headers['X-CSRFToken'] = getCSRFToken();
      }
    });
  }

  // ファイル送信時にCSRFトークンを確実に送信
  dz.on('sending', function (file, xhr, formData) {
    formData.append('csrfmiddlewaretoken', getCSRFToken());
    xhr.setRequestHeader('X-CSRFToken', getCSRFToken());
  });

  // イベント主体
  const emitter = dz;

  // イベント登録
  emitter.on('addedfile', (file) => {
    console.log('addedfile event triggered:', file.name);
    if (!firstFileAddedAt) firstFileAddedAt = Date.now();
    checkFilesAndUpdateButton();

    // ファイル追加時にエラータイムラインを非表示にする
    const errorTimeline = document.getElementById('timeline-item-1-error');
    if (errorTimeline) {
      errorTimeline.classList.add('hidden');
      errorTimeline.style.display = 'none';
    }

    // 成功タイムラインも非表示にする（新しいアップロードのため）
    const successTimeline = document.getElementById('timeline-item-1-success');
    if (successTimeline) {
      successTimeline.classList.add('hidden');
      successTimeline.style.display = 'none';
    }

    // アップロード成功フラグをリセット
    window.uploadSuccessShown = false;

    // サムネイルを生成
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (e) {
        file.preview = e.target.result;
        // テンプレート要素を更新
        updateTemplateAfterUpload(file, { success: true, image_id: Date.now() });
      };
      reader.readAsDataURL(file);
    }
    function checkFilesAndUpdateButton() {
      // Dropzoneの内部ファイル数を直接チェック
      const c = document.getElementById('upload-button-container');
      if (!c) return;

      const fileCount = dz.files ? dz.files.length : 0;
      console.log('checkFilesAndUpdateButton: Dropzone fileCount =', fileCount);
      console.log('checkFilesAndUpdateButton: uploadInProgress =', uploadInProgress);
      console.log('checkFilesAndUpdateButton: window.uploadSuccessShown =', window.uploadSuccessShown);

      // uploadInProgress または 成功表示中 は非表示にしない
      if (uploadInProgress || window.uploadSuccessShown) {
        console.log('checkFilesAndUpdateButton: ボタンを表示（進行中または成功表示中）');
        c.classList.remove('hidden');
        return;
      }

      if (fileCount === 0) {
        console.log('checkFilesAndUpdateButton: ボタンを非表示（ファイルなし）');
        c.classList.add('hidden');
        c.classList.remove('flex');
      } else {
        console.log('checkFilesAndUpdateButton: ボタンを表示（ファイルあり）');
        c.classList.remove('hidden');
        c.classList.add('flex');
      }
    }
  });

  emitter.on('removedfile', (file) => {
    checkFilesAndUpdateButton();
  });

  emitter.on('error', (file, msg) => {
    batchFailCount++;
    showUploadError(typeof msg === 'string' ? msg : 'アップロードに失敗しました');
    uploadInProgress = false;
    setUploadBtn(RETRY_TEXT, false);

    // エラー時に進捗監視を停止
    stopProgressWatcher();
  });

  // 個別成功 (集計のみ)
  emitter.on('success', (file, resp) => {
    batchSuccessCount++;

    // アップロード成功時にテンプレート要素を更新
    updateTemplateAfterUpload(file, resp);

    // キューに残りファイルがある場合は強制的にキュー処理を再開
    if (dz.getQueuedFiles().length > 0) {
      setTimeout(() => {
        dz.processQueue();
      }, 100); // 100ms後にキュー処理を再開
    }
  });

  // Dropzoneの直接イベントも追加
  dz.on('success', function (file, resp) {
    // キューに残りファイルがある場合は強制的にキュー処理を再開
    if (dz.getQueuedFiles().length > 0) {
      setTimeout(() => {
        dz.processQueue();
      }, 100); // 100ms後にキュー処理を再開
    }

    // アップロード成功時にテンプレート要素を更新
    updateTemplateAfterUpload(file, resp);
  });

  // キュー完了 (集計表示に一本化)
  emitter.on('queuecomplete', () => {
    uploadInProgress = false;

    const succeededInBatch = batchSuccessCount;
    const failedInBatch = batchFailCount;

    if (succeededInBatch > 0) {
      totalUploadedFiles += succeededInBatch;
      sessionUploadCount += succeededInBatch;

      let msg;
      if (sessionUploadCount === 1) {
        msg = '1件のファイルをアップロードしました。';
      } else {
        msg = `合計${sessionUploadCount}件のファイルをアップロードしました。`;
      }

      showUploadSuccess(msg, true);

      // 成功ファイルは削除せず、プレビューと進捗バーを残す
      // dz.removeAllFiles(true); // 進捗バーを残すためにコメントアウト
    } else if (failedInBatch > 0) {
      showUploadError('ファイルのアップロードに失敗しました');
    }

    setUploadBtn(START_TEXT, false);
    currentBatchFiles = [];

    // アップロード完了時に進捗監視を停止
    stopProgressWatcher();
  });

  // 手動開始ボタン
  bindStartUploadButton();

  // DOM変更監視 (サブ保険)
  const observer = new MutationObserver(() => {
    checkFilesAndUpdateButton();
  });
  observer.observe(uploadEl, { childList: true, subtree: true });

  // 進捗監視はアップロード開始時に開始するため、ここでは開始しない
  // progressIntervalId = startProgressWatcher();

  // XHR フック (多重防止 & 対象URLフィルタ)
  if (!XMLHttpRequest.__uploadHooked) {
    XMLHttpRequest.__uploadHooked = true;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      const targetUrl = dz.options && dz.options.url;
      // フック対象か判定 (open のとき記録する方式が本来安全だが簡易で)
      this.addEventListener('load', function () {
        if (targetUrl && this.responseURL && !this.responseURL.includes(targetUrl)) return;
        if (this.status === 200) {
          let data = null;
          try { data = JSON.parse(this.responseText); } catch { }
          if (data && data.success) {
            // 個別成功表示はしない（集計で表示するため）
            // 必要ならファイルオブジェクトに情報付与: file.serverData = data;
          } else if (data && data.error) {
            showUploadError(data.error);
          } else if (!data) {
            // 非JSON だが 200 → そのまま黙認 (Dropzone が success 判定する)
          }
        } else {
          showUploadError('ファイルのアップロードに失敗しました');
        }
      });
      return origSend.apply(this, args);
    };
  }

  // 初期非表示
  forceHideTimelineItems();

  // --------------------------------------------------
  // 内部関数
  // --------------------------------------------------
  function bindStartUploadButton() {
    const btn = document.getElementById('start-upload-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      window.uploadEnabled = true;

      const queued = dz.getQueuedFiles ? dz.getQueuedFiles() : [];
      const accepted = dz.getAcceptedFiles ? dz.getAcceptedFiles() : [];

      if (queued.length === 0) {

        return;
      }

      // 新バッチ開始
      window.uploadSuccessShown = false;
      currentBatchFiles = queued.slice();
      batchSuccessCount = 0;
      batchFailCount = 0;

      btn.disabled = true;
      btn.textContent = UPLOADING_TEXT;
      uploadInProgress = true;

      // 進捗監視を開始（既存の監視があれば停止してから開始）
      if (progressIntervalId) {
        stopProgressWatcher();
      }
      progressIntervalId = startProgressWatcher();

      try {
        dz.processQueue();
      } catch (e) {
        btn.disabled = false;
        btn.textContent = START_TEXT;
      }
    });
  }



  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent === null) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
    return true;
  }

  function detectVisibleUploadError(previewRoot) {
    // data-file-upload-file-error 優先
    const candidates = previewRoot.querySelectorAll('[data-file-upload-file-error], .text-error');
    for (const el of candidates) {
      if (!el.textContent) continue;
      if (!isVisible(el)) continue;
      return el.textContent.trim();
    }
    return null;
  }



  function showUploadSuccess(message, force = false) {


    // リロード時の状態復元中は実行しない
    if (window.isRestoringState) {
      return;
    }

    window.uploadSuccessShown = true;
    const successTimeline = document.getElementById('timeline-item-1-success');
    const errorTimeline = document.getElementById('timeline-item-1-error');
    const timelineDescription = document.getElementById('timeline-description');
    const analysisButton = document.getElementById('analysis-button-container');
    const timelineContainer = document.getElementById('timeline-container');
    const uploadButtonContainer = document.getElementById('upload-button-container');



    // 1つ目のタイムライン（アップロード完了）のみを表示
    if (successTimeline) {
      successTimeline.classList.remove('hidden');
      successTimeline.style.display = 'block';
    } else {

    }

    if (errorTimeline) {
      errorTimeline.classList.add('hidden');
      errorTimeline.style.display = 'none';
    } else {

    }

    if (timelineDescription) {
      timelineDescription.textContent = message;
    } else {

    }

    if (analysisButton) {
      analysisButton.classList.remove('hidden');
    } else {

    }

    if (timelineContainer) {
      timelineContainer.classList.remove('hidden');
    } else {

    }

    // アップロードボタンを非表示にして、解析ボタンを強調
    if (uploadButtonContainer) {
      uploadButtonContainer.classList.add('hidden');
    } else {

    }

    // 解析タイムラインを確実に非表示にする
    const timeline2 = document.getElementById('timeline-item-2');
    const timeline2Error = document.getElementById('timeline-item-2-error');
    const timeline3 = document.getElementById('timeline-item-3');



    if (timeline2) {
      timeline2.className = 'hidden';
      timeline2.style.display = 'none';
    } else {

    }

    if (timeline2Error) {
      timeline2Error.className = 'hidden';
      timeline2Error.style.display = 'none';
    } else {

    }

    if (timeline3) {
      timeline3.className = 'hidden';
      timeline3.style.display = 'none';
    } else {

    }

    setUploadBtn(START_TEXT, false);
  }

  function showUploadError(errorMessage) {
    if (window.uploadSuccessShown) return;
    const successTimeline = document.getElementById('timeline-item-1-success');
    const errorTimeline = document.getElementById('timeline-item-1-error');
    const errorDescription = document.getElementById('timeline-error-description');
    const timelineContainer = document.getElementById('timeline-container');
    if (successTimeline) successTimeline.classList.add('hidden');
    if (errorTimeline) {
      errorTimeline.classList.remove('hidden');
      errorTimeline.style.display = 'block';
    }
    if (errorDescription) errorDescription.textContent = errorMessage;
    if (timelineContainer) timelineContainer.classList.remove('hidden');
    setUploadBtn(RETRY_TEXT, false);
  }

  function showUploadButton() {
    console.log('showUploadButton: called');
    const c = document.getElementById('upload-button-container');
    if (c) {
      console.log('showUploadButton: ボタンを表示');
      c.classList.remove('hidden');
    }
  }

  function checkFilesAndUpdateButton() {
    // Dropzoneの内部ファイル数を直接チェック
    const c = document.getElementById('upload-button-container');
    if (!c) return;

    const fileCount = dz.files ? dz.files.length : 0;
    console.log('checkFilesAndUpdateButton(2): Dropzone fileCount =', fileCount);

    if (fileCount === 0) {
      c.classList.add('hidden');
      c.classList.remove('flex');
    } else {
      c.classList.remove('hidden');
      c.classList.add('flex');
    }
  }

  function forceHideTimelineItems() {
    const timelineContainer = document.getElementById('timeline-container');
    if (timelineContainer) timelineContainer.classList.add('hidden');
    ['timeline-item-1-success', 'timeline-item-1-error',
      'timeline-item-2', 'timeline-item-2-error', 'timeline-item-3', 'timeline-item-3-error'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.className = 'hidden';
          el.style.display = 'none';
        }
      });
    const analysisButton = document.getElementById('analysis-button-container');
    if (analysisButton) analysisButton.classList.add('hidden');
  }

  // グローバルエラー
  window.addEventListener('error', (e) => {
    showUploadError('予期しないエラーが発生しました');
  });
  window.addEventListener('unhandledrejection', (e) => {
    showUploadError('アップロード処理でエラーが発生しました');
  });
});

// 解析中アニメーション
function startAnalysisAnimation() {
  const dots = [document.getElementById('dot-1'), document.getElementById('dot-2'), document.getElementById('dot-3')];
  let currentDot = 0;
  const animationInterval = setInterval(() => {
    dots.forEach((dot, i) => {
      if (!dot) return;
      dot.classList.toggle('opacity-50', i !== currentDot);
      dot.classList.toggle('animate-pulse', i === currentDot);
    });
    currentDot = (currentDot + 1) % dots.length;
  }, 500);
  return animationInterval;
}

// モデル選択モーダルを閉じる
function closeModelSelectionModal() {
  const modal = document.getElementById('slide-down-animated-modal');
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

// 解析開始ボタン
document.addEventListener('DOMContentLoaded', () => {
  const modalStartBtn = document.getElementById('modal-start-analysis-btn');
  if (modalStartBtn) {
    modalStartBtn.addEventListener('click', () => {
      const selector = document.getElementById('model-selector');
      const model = selector ? selector.value : '';
      if (!model) {
        alert('モデルを選択してください');
        return;
      }
      // モーダルを正しく閉じる
      closeModelSelectionModal();
      // 初回解析を実行
      window.isRetryAnalysis = false;
      handleAnalysisStart(model);
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
        'clip': 'CLIPは、OpenAIが開発した革新的な画像-テキスト理解モデルです。アニメ・イラストの検出に特化しており、従来のモデルでは困難だったイラストやアニメキャラクターの識別が得意です。',
        'custom': 'カスタムモデルは、特定の用途やデータセットに特化して学習されたモデルです。ドメイン固有の特徴を捉えることができ、専門的な画像解析タスクに最適です。'
      };

      if (selectedModel && descriptions[selectedModel]) {
        descriptionEl.textContent = descriptions[selectedModel];
      } else {
        descriptionEl.textContent = 'モデルを選択すると、ここに詳細な説明が表示されます。';
      }
    });
  }

  // タイムラインの時刻表示を補完（テンプレートで未設定の場合は現在時刻を表示）
  function setTimeIfEmpty(elementId) {
    const el = document.getElementById(elementId);
    if (el && (!el.textContent || el.textContent.trim() === '')) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      el.textContent = `${y}-${m}-${d} ${hh}:${mm}`;
    }
  }

  // 再解析開始/完了時にも動的に時刻設定
  function setRetryStartedTime() { setTimeIfEmpty('timeline-retry-started-at'); }
  function setRetryCompletedTime() { setTimeIfEmpty('timeline-retry-completed-at'); }
});

function handleAnalysisStart(modelName) {

  // 既存の解析進捗監視を停止
  if (progressMonitoringInterval) {
    clearInterval(progressMonitoringInterval);
    progressMonitoringInterval = null;
  }

  // UI状態をリセット
  resetAnalysisUI();

  const animationInterval = startAnalysisAnimation();
  const bar = document.getElementById('analysis-progress-bar');
  const valEl = document.getElementById('analysis-progress-value');

  // API呼び出しラッパーを使用
  startAnalysis(modelName)
    .then(data => {
      console.log('=== 解析開始API応答 ===', data);
      console.log('data.ok:', data.ok);
      console.log('data.success:', data.success);
      console.log('条件判定:', data.ok || data.success);

      if (data.ok || data.success) {
        // API成功時のみ解析開始UIを表示
        const item2 = document.getElementById('timeline-item-2');
        if (item2) {
          item2.className = '';
          item2.style.display = 'block';
        }

        // アップロードUIを流用した解析進捗表示を生成
        const uploadedImages = getUploadedImages();
        createAnalysisProgressPreviews(uploadedImages);

        // 全画像のステータスを準備中に更新
        updateAllImagesToPreparing();

        // 個別進捗監視を開始
        startIndividualProgressWatcher();

        // 進捗監視を開始
        monitorAnalysisProgress(bar, valEl, animationInterval);
      } else {
        showAnalysisError(data.error || '解析の開始に失敗しました');
        updateAllImagesToFailed();
        clearInterval(animationInterval);
      }
    })
    .catch(error => {
      showAnalysisError('解析の開始中にエラーが発生しました: ' + error.message);
      updateAllImagesToFailed();
      clearInterval(animationInterval);
    });
}

function monitorAnalysisProgress(bar, valEl, animInterval) {
  let progress = 0;
  let lastLoggedProgress = -1; // 前回ログ出力した進捗を記録

  // 既存の監視を停止
  if (progressMonitoringInterval) {
    clearInterval(progressMonitoringInterval);
  }

  // グローバル変数に保存
  progressMonitoringInterval = setInterval(() => {
    // API呼び出しラッパーを使用
    getAnalysisProgress()
      .then(data => {
        if (data.ok && data.progress !== undefined) {
          progress = data.progress;

          // 進捗バーの動きをログ出力（5%刻みで変化があった時のみ）
          if (Math.floor(progress / 5) !== Math.floor(lastLoggedProgress / 5)) {
            lastLoggedProgress = progress;
          }

          if (bar) {
            bar.style.width = progress + '%';
            // 進捗に応じて色を変更（確実に100%になった時のみ完了色に）
            if (progress >= 100) {
              bar.classList.remove('bg-info', 'bg-warning');
              bar.classList.add('bg-success');
            } else if (progress > 0) {
              bar.classList.remove('bg-success', 'bg-warning');
              bar.classList.add('bg-info');
            }
          }
          if (valEl) valEl.textContent = Math.round(progress);

          // 進捗説明も更新
          const progressDescription = document.querySelector('#timeline-item-2 .text-xs');
          if (progressDescription && data.description) {
            progressDescription.textContent = data.description;
          }

          // 個別進捗も更新（各画像のステータスを個別に取得）
          updateIndividualProgressForAllImages();

          // 失敗時の処理
          if (data.status === 'failed') {
            clearInterval(progressMonitoringInterval);
            clearInterval(animInterval);
            progressMonitoringInterval = null;

            // 全画像を失敗状態に更新
            updateAllImagesToFailed();

            // 失敗時のタイムライン表示（解析が開始されている場合のみ）
            const timeline2 = document.getElementById('timeline-item-2');
            if (timeline2 && timeline2.style.display !== 'none') {
              const errorTimeline = document.getElementById('timeline-item-3-error');
              if (errorTimeline) {
                errorTimeline.className = '';
                errorTimeline.style.display = 'block';
              }
            }

            return; // 失敗時は処理を終了
          }

          // 準備中から解析中への移行をスムーズにする
          if (data.current_stage === 'preparing' && progress > 20) {
            // 準備中でも進捗が進んでいる場合は段階的に更新
            updatePreparingProgress(progress);
          }

          // 完了時の処理（全画像が完了した時のみ）
          if (progress >= 100 && data.status === 'completed') {
            // 全画像が完了したことを確認
            if (data.completed_images === data.total_images && data.total_images > 0) {
              console.log(`全ての画像が完了しました (${data.completed_images}/${data.total_images}枚)`);

              clearInterval(progressMonitoringInterval);
              clearInterval(animInterval);
              progressMonitoringInterval = null;

              // 個別進捗監視も停止
              stopIndividualProgressWatcher();

              // カードの内容を「解析完了」に変更
              updateAnalysisCardToCompleted();

              // DBの状態を更新
              updateDatabaseStatus();

              // 全画像完了後にリダイレクト
              setTimeout(() => {
                window.location.href = '/v2/';
              }, 3000);
            }
          } else if (data.total_images > 0) {
            // 進捗中の場合、説明文を更新
            console.log(`解析進捗: ${data.completed_images}/${data.total_images}枚完了 (${progress}%)`);
          }
        } else {
        }
      })
      .catch(error => {

        // 解析が開始されていない場合は失敗ステータスに更新しない
        if (progress > 0 || progressMonitoringInterval) {
          updateAllImagesToFailed();
        }

        clearInterval(progressMonitoringInterval);
        clearInterval(animInterval);
        progressMonitoringInterval = null;

        if (progress >= 100) {
          clearInterval(progressMonitoringInterval);
          clearInterval(animInterval);
          progressMonitoringInterval = null;
        }
      });
  }, 1000); // 1秒ごとに進捗を確認
}

function showAnalysisError(message) {
  const errorTimeline = document.getElementById('timeline-item-1-error');
  const errorDescription = document.getElementById('timeline-error-description');
  const timelineContainer = document.getElementById('timeline-container');

  if (errorTimeline) {
    errorTimeline.classList.remove('hidden');
    errorTimeline.style.display = 'block';
  }
  if (errorDescription) errorDescription.textContent = message;
  if (timelineContainer) timelineContainer.classList.remove('hidden');
}

// 画像一覧へボタンのバリデーション処理
document.addEventListener('DOMContentLoaded', function () {
  const goToImageListBtn = document.getElementById('go-to-image-list-btn');
  const alertElement = document.getElementById('model-selection-alert');

  // モデルセレクターは動的に取得
  function getModelSelector() {
    return document.getElementById('model-selector');
  }

  if (goToImageListBtn) {
    goToImageListBtn.addEventListener('click', function (e) {
      e.preventDefault();

      // モデルセレクターを動的に取得
      const modelSelector = getModelSelector();

      // アップロード済み画像があるかチェック
      const hasUploadedImages = document.querySelector('[data-file-upload-previews]').children.length > 0;

      // アップロード済み画像がない場合は、モデル選択をチェック
      if (!hasUploadedImages) {
        if (!modelSelector || !modelSelector.value) {
          // アラートを表示
          if (alertElement) {
            alertElement.classList.remove('hidden');
            alertElement.style.display = 'block';
            alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {

          }
          return;
        }
      }
      // モデルが選択されている場合は画像一覧へ遷移
      window.location.href = '/user_image_table/';
    });
  }

  // モデル選択時にアラートを非表示
  const modelSelector = getModelSelector();
  if (modelSelector) {
    modelSelector.addEventListener('change', function () {
      if (alertElement && this.value) {
        alertElement.classList.add('hidden');
      }

      // モデル選択をセッションに保存
      if (this.value) {
        saveModelSelection(this.value);
      }
    });
  }
});

// モデル選択をセッションに保存する関数
function saveModelSelection(modelName) {
  fetch('/v2/api/select-model/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': getCSRFToken()
    },
    body: new URLSearchParams({
      'model': modelName
    })
  })
    .then(response => response.json())
    .then(data => {
      // 保存結果はUI上の表示に影響しないためログ出力を省略
    })
    .catch(error => {
      // エラー時もUIを止めない
    });
}

// CSRFトークン取得関数
// getCookie()は共通ユーティリティ（utils.js）を使用

function updateDatabaseStatus() {

  // アップロードされた画像IDを取得
  const uploadedImageIds = getUploadedImages().map(img => img.id);

  if (uploadedImageIds.length === 0) {
    return;
  }

  // 各画像のステータスをDBで更新
  uploadedImageIds.forEach(imageId => {
    fetch('/api/analysis/complete/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({
        image_id: imageId
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.ok) {
        } else {
        }
      })
      .catch(error => {
      });
  });
}

// 特定の画像IDのカードを「解析完了」に変更
function updateAnalysisCardToCompletedForImage(imageId) {

  // 特定の画像IDのプログレスコンテナを取得
  const progressBarPane = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  const container = progressBarPane?.closest('.progress-container');

  if (!container) {
    return;
  }

  // ファイル名部分（ファイル名 + 拡張子）を取得
  const fileNameElement = container.querySelector(`[data-analysis-file-name="${imageId}"]`);
  const fileExtElement = container.querySelector(`[data-analysis-file-ext="${imageId}"]`);
  const statusElement = container.querySelector(`[data-analysis-file-size="${imageId}"]`);


  if (fileNameElement) {
    // ファイル名はそのまま保持（ステータスは別の要素で管理）
  }

  // ステータス部分は表示したまま（updateIndividualProgressで設定した内容を表示）
  if (statusElement) {
  }

  // 説明テキストを更新
  const descriptionElement = container.querySelector('.text-xs');
  if (descriptionElement) {
    descriptionElement.textContent = '画像のカテゴリー分類が完了しました';
  }

  // より確実に「解析中」を含む要素を非表示にする
  const allElements = container.querySelectorAll('*');
  allElements.forEach((element, index) => {
    if (element.textContent && element.textContent.includes('解析中') && !element.textContent.includes('解析完了')) {
      element.style.display = 'none';
    }
  });

}

// カードの内容を「解析完了」に変更
function updateAnalysisCardToCompleted() {

  const container = document.getElementById('analysis-progress-previews');
  if (!container) {
    return;
  }

  // ファイル名部分（ファイル名 + 拡張子）を取得
  const fileNameElement = container.querySelector('[data-analysis-file-name]');
  const fileExtElement = container.querySelector('[data-analysis-file-ext]');
  const statusElement = container.querySelector('[data-analysis-file-size]');

  if (fileNameElement) {
    // ファイル名はそのまま保持（ステータスは別の要素で管理）
  }

  // ステータス部分は表示したまま（updateIndividualProgressで設定した内容を表示）
  if (statusElement) {
  }

  // 説明テキストを更新
  const descriptionElement = container.querySelector('.text-xs');
  if (descriptionElement) {
    descriptionElement.textContent = '画像のカテゴリー分類が完了しました';
  }

}

// getCSRFToken()は共通ユーティリティ（utils.js）を使用