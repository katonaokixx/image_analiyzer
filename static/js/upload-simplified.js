

// ファイルアップロード関連のJavaScript
let progressIntervalId = null; // グローバルスコープで定義
let uploadEl = null; // グローバルスコープで定義
let individualProgressIntervalId = null; // 個別進捗監視用
let progressMonitoringInterval = null; // 解析進捗監視用
let animationInterval = null; // アニメーション用

// ページ離脱時の処理
window.addEventListener('beforeunload', function () {
  stopProgressWatcher();
  stopIndividualProgressWatcher();

  // 解析進捗監視も停止
  if (progressMonitoringInterval) {
    clearInterval(progressMonitoringInterval);
    progressMonitoringInterval = null;
    console.log('ページ離脱時に解析進捗監視を停止しました');
  }
});

// 進捗監視関数をグローバルスコープで定義
function startProgressWatcher() {
  return setInterval(checkUploadProgress, 50);
}

// 解析完了後のUI状態を完全にリセットする関数
function resetAnalysisUI() {
  console.log('🔄 解析UI状態をリセットします');

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

  console.log('✅ 解析UI状態のリセット完了');
}

function stopProgressWatcher() {
  if (progressIntervalId) {
    clearInterval(progressIntervalId);
    progressIntervalId = null;
    console.log('=== 進捗監視停止 ===');
  }
}

// アップロードUIを流用した解析進捗表示を生成
function createAnalysisProgressPreviews(uploadedImages) {
  console.log('📊 解析進捗表示開始 - 受け取った画像数:', uploadedImages.length);
  console.log('📊 受け取った画像詳細:', uploadedImages);

  const container = document.getElementById('analysis-progress-previews');
  if (!container) {
    console.error('analysis-progress-previews コンテナが見つかりません');
    return;
  }

  container.innerHTML = '';

  uploadedImages.forEach((image, index) => {
    console.log(`📊 画像${index + 1}を処理中:`, image);
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
      // 準備中の進捗は動的に計算（20-50%の範囲）
      const totalImages = getUploadedImages().length;
      const currentPosition = imageId;
      const progressPercent = Math.min(20 + (currentPosition / totalImages) * 30, 50);
      progressBar.style.width = `${progressPercent}%`;
      progressValue.textContent = Math.round(progressPercent);

      // ファイル拡張子は保持し、ステータスは別の要素で管理
      // statusText.textContent = `準備中（あと${remainingImages}枚）`;
      progressBar.className = 'progress-bar progress-warning transition-all duration-500';
      break;
    case 'analyzing':
      // 解析中の進捗は実際の進捗値を使用
      progressBar.style.width = '50%';
      progressValue.textContent = '50';
      // 解析中のステータステキストを設定
      statusText.textContent = '解析中';
      progressBar.className = 'progress-bar progress-info transition-all duration-500';
      break;
    case 'completed':
      console.log(`画像ID ${imageId} が解析完了しました`);
      progressBar.style.width = '100%';
      progressValue.textContent = '100';
      // 解析完了時のステータステキストを設定
      console.log(`画像ID ${imageId} のステータステキストを設定: 画像の解析が完了しました。`);
      statusText.textContent = '画像の解析が完了しました。';
      console.log(`画像ID ${imageId} のステータステキスト設定後:`, statusText.textContent);
      progressBar.className = 'progress-bar progress-success transition-all duration-500';

      // 個別の画像が完了した時にカードを更新（特定の画像IDを指定）
      updateAnalysisCardToCompletedForImage(imageId);
      break;
    case 'failed':
      console.log(`ステータス: failed - 画像ID: ${imageId}`);
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
            console.log('解析失敗タイムラインを表示');
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
      // 準備中の進捗を20-50%の範囲で段階的に更新
      const baseProgress = 20;
      const maxProgress = 50;
      const progressStep = (maxProgress - baseProgress) / uploadedImages.length;
      const imageProgress = Math.min(baseProgress + (index + 1) * progressStep, overallProgress);

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
        progressStatus = 'completed';
        progressWidth = '100%';
        progressValue = '100';
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

// アップロード済み画像を取得
let lastUploadedImagesCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 1000; // 1秒間キャッシュ

function getUploadedImages() {
  // キャッシュをチェック
  const now = Date.now();
  if (lastUploadedImagesCache && (now - lastCacheTime) < CACHE_DURATION) {
    console.log('🔍 キャッシュから画像データを取得:', lastUploadedImagesCache.length);
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
    console.log('🔍 方法1 - プレビューコンテナ内の画像要素:', imageElements.length);
  }

  // フォールバック: Dropzoneの要素を検索
  if (imageElements.length === 0) {
    imageElements = document.querySelectorAll('.dz-preview, .file-upload-preview');
    console.log('🔍 方法2 - Dropzone要素検索:', imageElements.length);
  }

  // さらにフォールバック: アップロードエリア内のすべての要素を検索
  if (imageElements.length === 0) {
    const uploadArea = document.querySelector('#file-upload-limit');
    if (uploadArea) {
      imageElements = uploadArea.querySelectorAll('.rounded-box, .dz-preview, [data-dz-thumbnail]');
      console.log('🔍 方法3 - アップロードエリア内検索:', imageElements.length);
    }
  }

  console.log('🔍 最終検索結果:', imageElements.length);
  console.log('🔍 画像要素詳細:', imageElements);

  imageElements.forEach((element, index) => {
    console.log(`🔍 要素${index + 1}を処理中:`, element);

    // ファイル名を取得（実際の要素から直接取得）
    const filenameElement = element.querySelector('[data-file-upload-file-name]');
    const fileExtElement = element.querySelector('[data-file-upload-file-ext]');

    let filename = filenameElement ? filenameElement.textContent.trim() : '';
    let fileExt = fileExtElement ? fileExtElement.textContent.trim() : '';

    console.log(`🔍 要素${index + 1}のファイル名:`, filename, '拡張子:', fileExt);

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
        console.log(`🔍 要素${index + 1}の属性からファイル名を取得:`, filename, fileExt);
      } else {
        console.log(`🔍 要素${index + 1}のファイル入力要素が見つかりません`);
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

  console.log('🔍 最終的に取得された画像数:', uploadedImages.length);
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
    console.log('サムネイル要素:', thumbnailImg);
    if (thumbnailImg && file.preview) {
      thumbnailImg.src = file.preview;
      thumbnailImg.style.display = 'block';
    } else {
      console.log('サムネイル要素またはプレビューが見つかりません');
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
      console.log(`progress[${idx}] ${pct.toFixed(1)}%`);
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
  console.log('=== ファイルアップロード初期化開始 ===');

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

  function getCSRFToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : '';
  }

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
    console.error('Dropzone is not available');
    return;
  }
  if (typeof HSFileUpload === 'undefined') {
    console.error('HSFileUpload is not available');
    return;
  }

  uploadEl = document.querySelector('#file-upload-limit');
  if (!uploadEl) {
    console.error('#file-upload-limit 要素が見つかりません。初期化中断');
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
      console.error('HSFileUpload 新規生成に失敗:', e);
      return;
    }
  }

  const dz = fileUpload.dropzone || fileUpload._dropzone || fileUpload._dz ||
    (fileUpload instanceof Dropzone ? fileUpload : null);

  if (!dz) {
    console.error('Dropzone インスタンス特定失敗');
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
    console.log('=== sending ===', file.name);
    formData.append('csrfmiddlewaretoken', getCSRFToken());
    xhr.setRequestHeader('X-CSRFToken', getCSRFToken());
  });

  // イベント主体
  const emitter = dz;

  // イベント登録
  emitter.on('addedfile', (file) => {
    console.log('=== addedfile ===', file && file.name);
    if (!firstFileAddedAt) firstFileAddedAt = Date.now();
    showUploadButton();

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
      const previews = uploadEl.querySelectorAll('[data-file-upload-preview]');
      const c = document.getElementById('upload-button-container');
      if (!c) return;

      // uploadInProgress または 成功表示中 は非表示にしない
      if (uploadInProgress || window.uploadSuccessShown) {
        c.classList.remove('hidden');
        return;
      }

      if (previews.length === 0) c.classList.add('hidden');
      else c.classList.remove('hidden');
    }
  });

  emitter.on('removedfile', (file) => {
    console.log('=== removedfile ===', file && file.name);
    checkFilesAndUpdateButton();
  });

  emitter.on('error', (file, msg) => {
    console.warn('=== Dropzone error ===', file && file.name, msg);
    batchFailCount++;
    showUploadError(typeof msg === 'string' ? msg : 'アップロードに失敗しました');
    uploadInProgress = false;
    setUploadBtn(RETRY_TEXT, false);

    // エラー時に進捗監視を停止
    stopProgressWatcher();
  });

  // 個別成功 (集計のみ)
  emitter.on('success', (file, resp) => {
    console.log('=== success ===', file && file.name, resp);
    console.log('残りキュー内ファイル数:', dz.getQueuedFiles().length);
    console.log('残りキュー内ファイル名:', dz.getQueuedFiles().map(f => f.name));
    batchSuccessCount++;

    // アップロード成功時にテンプレート要素を更新
    updateTemplateAfterUpload(file, resp);

    // キューに残りファイルがある場合は強制的にキュー処理を再開
    if (dz.getQueuedFiles().length > 0) {
      console.log('=== キュー処理再開 ===');
      console.log('残りファイル数:', dz.getQueuedFiles().length);
      setTimeout(() => {
        dz.processQueue();
      }, 100); // 100ms後にキュー処理を再開
    }
  });

  // Dropzoneの直接イベントも追加
  dz.on('success', function (file, resp) {
    console.log('=== Dropzone success ===', file && file.name, resp);

    // キューに残りファイルがある場合は強制的にキュー処理を再開
    if (dz.getQueuedFiles().length > 0) {
      console.log('=== Dropzone キュー処理再開 ===');
      console.log('残りファイル数:', dz.getQueuedFiles().length);
      setTimeout(() => {
        dz.processQueue();
      }, 100); // 100ms後にキュー処理を再開
    }

    // アップロード成功時にテンプレート要素を更新
    updateTemplateAfterUpload(file, resp);
  });

  // キュー完了 (集計表示に一本化)
  emitter.on('queuecomplete', () => {
    console.log('=== queuecomplete ===');
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
        console.log('[XHR load]', this.status, this.responseURL);
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
    console.log('[start-upload-btn] リスナー登録');
    btn.addEventListener('click', () => {
      console.log('=== アップロード開始クリック ===');
      window.uploadEnabled = true;

      const queued = dz.getQueuedFiles ? dz.getQueuedFiles() : [];
      const accepted = dz.getAcceptedFiles ? dz.getAcceptedFiles() : [];
      console.log('[クリック時] queued:', queued.length, 'accepted:', accepted.length,
        'url:', dz.options && dz.options.url, 'autoProcessQueue:', dz.options && dz.options.autoProcessQueue);

      if (queued.length === 0) {
        console.warn('送信キューが空');
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
        console.log('=== キュー処理開始 ===');
        console.log('キュー内ファイル数:', dz.getQueuedFiles().length);
        console.log('キュー内ファイル名:', dz.getQueuedFiles().map(f => f.name));
        console.log('並列アップロード設定:', dz.options.parallelUploads);
        dz.processQueue();
      } catch (e) {
        console.error('processQueue 実行エラー:', e);
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
    console.log('🔄 デバッグ: showUploadSuccess関数が呼び出されました');
    console.log('🔄 デバッグ: message:', message);
    console.log('🔄 デバッグ: force:', force);
    console.log('🔄 デバッグ: window.uploadSuccessShown:', window.uploadSuccessShown);
    console.log('🔄 デバッグ: window.isRestoringState:', window.isRestoringState);

    // リロード時の状態復元中は実行しない
    if (window.isRestoringState) {
      console.log('🔄 デバッグ: 状態復元中なのでshowUploadSuccessをスキップ');
      return;
    }

    window.uploadSuccessShown = true;
    console.log('🔄 デバッグ: uploadSuccessShownフラグをtrueに設定');
    const successTimeline = document.getElementById('timeline-item-1-success');
    const errorTimeline = document.getElementById('timeline-item-1-error');
    const timelineDescription = document.getElementById('timeline-description');
    const analysisButton = document.getElementById('analysis-button-container');
    const timelineContainer = document.getElementById('timeline-container');
    const uploadButtonContainer = document.getElementById('upload-button-container');

    console.log('🔄 デバッグ: UI要素の取得結果:');
    console.log('🔄 デバッグ: successTimeline:', successTimeline);
    console.log('🔄 デバッグ: errorTimeline:', errorTimeline);
    console.log('🔄 デバッグ: timelineDescription:', timelineDescription);
    console.log('🔄 デバッグ: analysisButton:', analysisButton);
    console.log('🔄 デバッグ: timelineContainer:', timelineContainer);
    console.log('🔄 デバッグ: uploadButtonContainer:', uploadButtonContainer);

    // 1つ目のタイムライン（アップロード完了）のみを表示
    if (successTimeline) {
      successTimeline.classList.remove('hidden');
      successTimeline.style.display = 'block';
      console.log('🔄 デバッグ: アップロード成功タイムラインを表示しました');
    } else {
      console.log('🔄 デバッグ: アップロード成功タイムラインが見つかりません');
    }

    if (errorTimeline) {
      errorTimeline.classList.add('hidden');
      errorTimeline.style.display = 'none';
      console.log('🔄 デバッグ: エラータイムラインを非表示にしました');
    } else {
      console.log('🔄 デバッグ: エラータイムラインが見つかりません');
    }

    if (timelineDescription) {
      timelineDescription.textContent = message;
      console.log('🔄 デバッグ: タイムライン説明を更新しました:', message);
    } else {
      console.log('🔄 デバッグ: タイムライン説明要素が見つかりません');
    }

    if (analysisButton) {
      analysisButton.classList.remove('hidden');
      console.log('🔄 デバッグ: 解析ボタンを表示しました');
    } else {
      console.log('🔄 デバッグ: 解析ボタンが見つかりません');
    }

    if (timelineContainer) {
      timelineContainer.classList.remove('hidden');
      console.log('🔄 デバッグ: タイムラインコンテナを表示しました');
    } else {
      console.log('🔄 デバッグ: タイムラインコンテナが見つかりません');
    }

    // アップロードボタンを非表示にして、解析ボタンを強調
    if (uploadButtonContainer) {
      uploadButtonContainer.classList.add('hidden');
      console.log('🔄 デバッグ: アップロードボタンを非表示にしました');
    } else {
      console.log('🔄 デバッグ: アップロードボタンが見つかりません');
    }

    // 解析タイムラインを確実に非表示にする
    console.log('🔄 デバッグ: 解析タイムライン非表示処理開始');
    const timeline2 = document.getElementById('timeline-item-2');
    const timeline2Error = document.getElementById('timeline-item-2-error');
    const timeline3 = document.getElementById('timeline-item-3');

    console.log('🔄 デバッグ: 解析タイムライン要素の取得結果:');
    console.log('🔄 デバッグ: timeline2:', timeline2);
    console.log('🔄 デバッグ: timeline2Error:', timeline2Error);
    console.log('🔄 デバッグ: timeline3:', timeline3);

    if (timeline2) {
      timeline2.className = 'hidden';
      timeline2.style.display = 'none';
      console.log('🔄 デバッグ: showUploadSuccessで解析開始タイムラインを非表示にしました');
    } else {
      console.log('🔄 デバッグ: 解析開始タイムラインが見つかりません');
    }

    if (timeline2Error) {
      timeline2Error.className = 'hidden';
      timeline2Error.style.display = 'none';
      console.log('🔄 デバッグ: showUploadSuccessで解析失敗タイムラインを非表示にしました');
    } else {
      console.log('🔄 デバッグ: 解析失敗タイムラインが見つかりません');
    }

    if (timeline3) {
      timeline3.className = 'hidden';
      timeline3.style.display = 'none';
      console.log('🔄 デバッグ: showUploadSuccessで解析完了タイムラインを非表示にしました');
    } else {
      console.log('🔄 デバッグ: 解析完了タイムラインが見つかりません');
    }

    console.log('🔄 デバッグ: 解析タイムライン非表示処理完了');
    setUploadBtn(START_TEXT, false);
    console.log('🔄 デバッグ: showUploadSuccess関数完了');
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
    const c = document.getElementById('upload-button-container');
    if (c) c.classList.remove('hidden');
  }

  function checkFilesAndUpdateButton() {
    const previews = uploadEl.querySelectorAll('[data-file-upload-preview]');
    const c = document.getElementById('upload-button-container');
    if (!c) return;
    if (previews.length === 0) c.classList.add('hidden');
    else c.classList.remove('hidden');
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
    console.error('Global error:', e.error);
    showUploadError('予期しないエラーが発生しました');
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
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
      startAnalysis(model);
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

function startAnalysis(modelName) {
  console.log('解析開始:', modelName);

  // 既存の解析進捗監視を停止
  if (progressMonitoringInterval) {
    clearInterval(progressMonitoringInterval);
    progressMonitoringInterval = null;
    console.log('既存の解析進捗監視を停止しました');
  }

  // UI状態をリセット
  resetAnalysisUI();

  const animationInterval = startAnalysisAnimation();
  const bar = document.getElementById('analysis-progress-bar');
  const valEl = document.getElementById('analysis-progress-value');

  // 実際のAPI呼び出し
  fetch('/api/analysis/start/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': getCSRFToken()
    },
    body: new URLSearchParams({
      'model': modelName
    })
  })
    .then(response => {
      // レスポンスがJSONかどうかをチェック
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('サーバーから無効なレスポンスが返されました');
      }
      return response.json();
    })
    .then(data => {
      if (data.ok) {
        console.log('解析開始API成功:', data);
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
        console.error('解析開始API失敗:', data.error);
        showAnalysisError(data.error || '解析の開始に失敗しました');
        updateAllImagesToFailed();
        clearInterval(animationInterval);
      }
    })
    .catch(error => {
      console.error('解析開始API呼び出しエラー:', error);
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
    // 実際の進捗を取得するAPI呼び出し
    fetch('/api/analysis/progress/')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.ok && data.progress !== undefined) {
          progress = data.progress;

          // 進捗バーの動きをログ出力（5%刻みで変化があった時のみ）
          if (Math.floor(progress / 5) !== Math.floor(lastLoggedProgress / 5)) {
            console.log(`📊 進捗バー更新: ${Math.round(progress)}% (ステージ: ${data.current_stage || 'unknown'})`);
            lastLoggedProgress = progress;
          }

          if (bar) {
            bar.style.width = progress + '%';
            // 進捗に応じて色を変更
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

          // 個別進捗も更新（実際の進捗値を渡す）
          updateIndividualProgressBasedOnStage(data.current_stage, data.status, progress);

          // 失敗時の処理
          if (data.status === 'failed') {
            clearInterval(progressMonitoringInterval);
            clearInterval(animInterval);
            progressMonitoringInterval = null;
            console.error('❌ 解析失敗:', data.error || '不明なエラー');
            console.error('❌ 失敗時の進捗:', progress + '%');
            console.error('❌ 失敗時のステージ:', data.current_stage || 'unknown');

            // 全画像を失敗状態に更新
            updateAllImagesToFailed();

            // 失敗時のタイムライン表示（解析が開始されている場合のみ）
            const timeline2 = document.getElementById('timeline-item-2');
            if (timeline2 && timeline2.style.display !== 'none') {
              const errorTimeline = document.getElementById('timeline-item-3-error');
              if (errorTimeline) {
                errorTimeline.className = '';
                errorTimeline.style.display = 'block';
                console.log('❌ 解析失敗タイムラインを表示');
              }
            }

            return; // 失敗時は処理を終了
          }

          // 準備中から解析中への移行をスムーズにする
          if (data.current_stage === 'preparing' && progress > 20) {
            // 準備中でも進捗が進んでいる場合は段階的に更新
            updatePreparingProgress(progress);
          }

          // 完了時の処理
          if (progress >= 100 || data.status === 'completed') {
            clearInterval(progressMonitoringInterval);
            clearInterval(animInterval);
            progressMonitoringInterval = null;

            // 個別進捗監視も停止
            stopIndividualProgressWatcher();

            console.log('✅ 解析完了: 100%');
            console.log('✅ 最終ステージ:', data.current_stage || 'unknown');
            console.log('✅ 解析結果:', data.result || '結果データなし');
            console.log('🛑 進捗監視を停止しました');
            console.log('🛑 個別進捗監視も停止しました');

            // カードの内容を「解析完了」に変更
            updateAnalysisCardToCompleted();

            // DBの状態を更新
            updateDatabaseStatus();

            // 解析完了後、3秒後に画像一覧ページにリダイレクト
            setTimeout(() => {
              console.log('🔄 解析完了: 画像一覧ページにリダイレクトします');
              window.location.href = '/user_image_table/';
            }, 3000);

            // 3点アニメーションを停止して完了アイコンを表示
            console.log('🔄 3点アニメーションを停止します');

            // 方法1: IDで検索
            const dots = [document.getElementById('dot-1'), document.getElementById('dot-2'), document.getElementById('dot-3')];
            console.log('🔍 IDで検索したドット要素:', dots);

            // 方法2: クラスで検索（フォールバック）
            const dotsByClass = document.querySelectorAll('.animate-pulse');
            console.log('🔍 クラスで検索したドット要素:', dotsByClass);

            // 両方の方法でアニメーションを停止
            [...dots, ...dotsByClass].forEach((dot, index) => {
              if (dot && dot.classList.contains('animate-pulse')) {
                console.log(`🔄 ドット${index + 1}を停止:`, dot);
                console.log(`🔄 ドット${index + 1}の現在のクラス:`, dot.className);
                dot.classList.remove('opacity-50', 'animate-pulse');
                dot.style.opacity = '1';
                console.log(`🔄 ドット${index + 1}の変更後のクラス:`, dot.className);
              }
            });

            // 完了アイコンを表示
            const dot1 = document.getElementById('dot-1') || document.querySelector('.animate-pulse');
            if (dot1) {
              console.log('✅ 完了アイコンを表示:', dot1);
              dot1.innerHTML = '<i class="icon-[tabler--check] text-success size-3"></i>';
              dot1.classList.remove('bg-warning', 'animate-pulse');
              dot1.classList.add('text-success');
              console.log('✅ 完了アイコン表示後のクラス:', dot1.className);
            } else {
              console.warn('⚠️ 完了アイコンを表示する要素が見つかりません');
            }

            // 他のドットを非表示
            const dot2 = document.getElementById('dot-2');
            const dot3 = document.getElementById('dot-3');
            if (dot2) dot2.style.display = 'none';
            if (dot3) dot3.style.display = 'none';

            // 進捗バーを完了状態に変更
            if (bar) {
              bar.classList.remove('bg-info');
              bar.classList.add('bg-success');
            }

            // ステータス表示を完了状態に変更
            const statusText = document.querySelector('#timeline-item-2 .text-warning');
            if (statusText) {
              statusText.textContent = '解析完了';
              statusText.classList.remove('text-warning');
              statusText.classList.add('text-success');
            }

            // 進捗バー横のステータステキストを更新
            const analysisStatusText = document.getElementById('analysis-status-text');
            if (analysisStatusText) {
              analysisStatusText.textContent = '解析完了';
              analysisStatusText.classList.remove('text-warning');
              analysisStatusText.classList.add('text-success');
              console.log('進捗バー横のステータスを更新:', analysisStatusText.textContent);
            }

            // 進捗バー下のステータステキストを更新
            const analysisStatusText2 = document.getElementById('analysis-status-text-2');
            if (analysisStatusText2) {
              analysisStatusText2.textContent = '解析完了';
              analysisStatusText2.classList.remove('text-warning');
              analysisStatusText2.classList.add('text-success');
              console.log('進捗バー下のステータスを更新:', analysisStatusText2.textContent);
            }

            // ステータスアイコンを更新
            const analysisStatusIcon = document.getElementById('analysis-status-icon');
            if (analysisStatusIcon) {
              analysisStatusIcon.innerHTML = '<i class="icon-[tabler--check] text-success size-4 sm:size-5"></i>';
              console.log('ステータスアイコンを更新');
            }

            // 解析開始タイムラインの背景色を緑色に更新
            const timelineItem2 = document.getElementById('timeline-item-2');
            if (timelineItem2) {
              const timelineEnd2 = timelineItem2.querySelector('.timeline-end');
              if (timelineEnd2) {
                timelineEnd2.classList.remove('bg-warning/5', 'border-warning/20');
                timelineEnd2.classList.add('bg-success/5', 'border-success/20');
                console.log('解析開始タイムラインの背景色を緑色に更新');
              }
            }

            setTimeout(() => {
              const item3 = document.getElementById('timeline-item-3');
              if (item3) {
                item3.className = '';
                item3.style.display = 'block';
              }
              // 解析完了後にセッションカウンターをリセット
              if (typeof sessionUploadCount !== 'undefined') {
                sessionUploadCount = 0;
              }

              // 解析完了後はUI状態をリセットしない（100%の状態を維持）
              // 次の解析開始時にリセットする
            }, 600);

            return; // 完了時は処理を終了
          }
        } else {
          console.log('進捗データが無効:', data);
        }
      })
      .catch(error => {
        console.error('❌ 進捗取得エラー:', error);
        console.error('❌ エラー詳細:', error.message);
        console.error('❌ エラー発生時の進捗:', progress + '%');

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

      console.log('画像一覧へボタンクリック');

      // モデルセレクターを動的に取得
      const modelSelector = getModelSelector();
      console.log('modelSelector:', modelSelector);
      console.log('modelSelector.value:', modelSelector ? modelSelector.value : 'undefined');
      console.log('alertElement:', alertElement);

      // アップロード済み画像があるかチェック
      const hasUploadedImages = document.querySelector('[data-file-upload-previews]').children.length > 0;

      // アップロード済み画像がない場合は、モデル選択をチェック
      if (!hasUploadedImages) {
        if (!modelSelector || !modelSelector.value) {
          console.log('モデルが選択されていません');
          // アラートを表示
          if (alertElement) {
            alertElement.classList.remove('hidden');
            alertElement.style.display = 'block';
            alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log('アラートを表示しました');
            console.log('アラート要素のクラス:', alertElement.className);
            console.log('アラート要素のスタイル:', alertElement.style.display);
          } else {
            console.error('アラート要素が見つかりません');
          }
          return;
        }
      }

      console.log('モデルが選択されています:', modelSelector.value);
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
  fetch('/api/select-model/', {
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
      if (data.ok) {
        console.log('モデル選択を保存しました:', modelName);
      } else {
        console.error('モデル選択の保存に失敗:', data.error);
      }
    })
    .catch(error => {
      console.error('モデル選択保存エラー:', error);
    });
}

// CSRFトークン取得関数
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function updateDatabaseStatus() {
  console.log('DB状態更新開始');

  // アップロードされた画像IDを取得
  const uploadedImageIds = getUploadedImages().map(img => img.id);

  if (uploadedImageIds.length === 0) {
    console.log('アップロードされた画像がありません');
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
          console.log(`✅ DB更新完了: 画像ID=${imageId}, ステータス=${data.status}`);
        } else {
          console.error(`❌ DB更新失敗: 画像ID=${imageId}, エラー=${data.error}`);
        }
      })
      .catch(error => {
        console.error(`❌ DB更新エラー: 画像ID=${imageId}, エラー=${error}`);
      });
  });
}

// 特定の画像IDのカードを「解析完了」に変更
function updateAnalysisCardToCompletedForImage(imageId) {
  console.log(`画像ID ${imageId} のカード更新開始`);

  // 特定の画像IDのプログレスコンテナを取得
  const progressBarPane = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  console.log(`画像ID ${imageId} のプログレスバーペイン:`, progressBarPane);

  const container = progressBarPane?.closest('.progress-container');
  console.log(`画像ID ${imageId} のコンテナ:`, container);

  if (!container) {
    console.log(`画像ID ${imageId} のプログレスコンテナが見つかりません`);
    return;
  }

  // ファイル名部分（ファイル名 + 拡張子）を取得
  const fileNameElement = container.querySelector(`[data-analysis-file-name="${imageId}"]`);
  const fileExtElement = container.querySelector(`[data-analysis-file-ext="${imageId}"]`);
  const statusElement = container.querySelector(`[data-analysis-file-size="${imageId}"]`);

  console.log(`画像ID ${imageId} の要素検索結果:`);
  console.log(`- fileNameElement:`, fileNameElement);
  console.log(`- fileExtElement:`, fileExtElement);
  console.log(`- statusElement:`, statusElement);

  if (fileNameElement) {
    // ファイル名はそのまま保持（ステータスは別の要素で管理）
    console.log(`画像ID ${imageId} のファイル名部分はそのまま保持:`, fileNameElement.textContent);
  }

  // ステータス部分は表示したまま（updateIndividualProgressで設定した内容を表示）
  if (statusElement) {
    console.log(`画像ID ${imageId} のステータス部分は表示したまま保持:`, statusElement.textContent);
    console.log(`画像ID ${imageId} のステータス要素のスタイル:`, statusElement.style.display);
  }

  // 説明テキストを更新
  const descriptionElement = container.querySelector('.text-xs');
  if (descriptionElement) {
    descriptionElement.textContent = '画像のカテゴリー分類が完了しました';
    console.log(`画像ID ${imageId} の説明テキストを更新しました`);
  }

  // より確実に「解析中」を含む要素を非表示にする
  const allElements = container.querySelectorAll('*');
  allElements.forEach((element, index) => {
    if (element.textContent && element.textContent.includes('解析中') && !element.textContent.includes('解析完了')) {
      console.log(`画像ID ${imageId} で「解析中」を含む要素を発見 (${index}):`, element.textContent, 'タグ:', element.tagName, 'クラス:', element.className);
      element.style.display = 'none';
      console.log(`画像ID ${imageId} で「解析中」を含む要素を非表示にしました`);
    }
  });

  console.log(`画像ID ${imageId} のカード更新完了`);
}

// カードの内容を「解析完了」に変更
function updateAnalysisCardToCompleted() {
  console.log('カード更新開始');

  const container = document.getElementById('analysis-progress-previews');
  if (!container) {
    console.error('analysis-progress-previewsコンテナが見つかりません');
    return;
  }

  // ファイル名部分（ファイル名 + 拡張子）を取得
  const fileNameElement = container.querySelector('[data-analysis-file-name]');
  const fileExtElement = container.querySelector('[data-analysis-file-ext]');
  const statusElement = container.querySelector('[data-analysis-file-size]');

  if (fileNameElement) {
    // ファイル名はそのまま保持（ステータスは別の要素で管理）
    console.log('ファイル名部分はそのまま保持:', fileNameElement.textContent);
  }

  // ステータス部分は表示したまま（updateIndividualProgressで設定した内容を表示）
  if (statusElement) {
    console.log('ステータス部分は表示したまま保持:', statusElement.textContent);
  }

  // 説明テキストを更新
  const descriptionElement = container.querySelector('.text-xs');
  if (descriptionElement) {
    descriptionElement.textContent = '画像のカテゴリー分類が完了しました';
    console.log('説明テキストを更新しました');
  }

  console.log('カード更新完了');
}

function getCSRFToken() {
  const token = document.querySelector('[name=csrfmiddlewaretoken]');
  if (token) {
    return token.value;
  }
  console.error('CSRFトークンが見つかりません');
  return '';
}