

// ファイルアップロード関連のJavaScript
let progressIntervalId = null; // グローバルスコープで定義
let uploadEl = null; // グローバルスコープで定義
let individualProgressIntervalId = null; // 個別進捗監視用
let progressMonitoringInterval = null; // 解析進捗監視用
let animationInterval = null; // アニメーション用
// uploadedImagesData は image_upload.html で定義済み（グローバル変数として早期定義）

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
function getLocalUploadedImagesFromDOM() {
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



    // 1つ目のタイムライン（アップロード完了）のみを表示（共通関数使用）
    toggleTimelineItem('timeline-item-1-success', true);
    toggleTimelineItem('timeline-item-1-error', false);
    updateTimelineDescription('timeline-description', message);

    if (analysisButton) {
      analysisButton.classList.remove('hidden');
    }

    toggleTimelineContainer(true);

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
    // 共通関数を使用してタイムラインを非表示
    toggleTimelineContainer(false);
    ['timeline-item-1-success', 'timeline-item-1-error',
      'timeline-item-2', 'timeline-item-2-error', 'timeline-item-3', 'timeline-item-3-error'].forEach(id => {
        toggleTimelineItem(id, false);
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

  // モーダル内の解析開始ボタンのイベントリスナー
  // （元 image-upload.js から統合）
  const modalAnalysisButton = document.getElementById('modal-start-analysis-btn');
  if (modalAnalysisButton) {
    modalAnalysisButton.addEventListener('click', function () {
      const model = document.getElementById('model-selector').value;
      if (!model) {
        alert('モデルを選択してください');
        return;
      }

      console.log('選択されたモデル:', model);
      // 初回解析を実行（image-analysis.jsのhandleAnalysisStart()を呼び出し）
      window.isRetryAnalysis = false;
      handleAnalysisStart(model);
    });
  }
});

