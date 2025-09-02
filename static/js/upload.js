

// ファイルアップロード関連のJavaScript
let progressIntervalId = null; // グローバルスコープで定義
let uploadEl = null; // グローバルスコープで定義

// 進捗監視関数をグローバルスコープで定義
function startProgressWatcher() {
  return setInterval(checkUploadProgress, 50);
}

function stopProgressWatcher() {
  if (progressIntervalId) {
    clearInterval(progressIntervalId);
    progressIntervalId = null;
    console.log('=== 進捗監視停止 ===');
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
          parallelUploads: 5,
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
    dz.options.headers = dz.options.headers || {};
    dz.options.headers['X-CSRFToken'] = getCSRFToken();
  } else {
    dz.on && dz.on('init', function () {
      if (this.options) {
        this.options.autoProcessQueue = false;
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
    batchSuccessCount++;
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
    if (!force && window.uploadSuccessShown) return;
    window.uploadSuccessShown = true;
    const successTimeline = document.getElementById('timeline-item-1-success');
    const errorTimeline = document.getElementById('timeline-item-1-error');
    const timelineDescription = document.getElementById('timeline-description');
    const analysisButton = document.getElementById('analysis-button-container');
    const timelineContainer = document.getElementById('timeline-container');
    const uploadButtonContainer = document.getElementById('upload-button-container');

    if (successTimeline) {
      successTimeline.classList.remove('hidden');
      successTimeline.style.display = 'block';
    }
    if (errorTimeline) {
      errorTimeline.classList.add('hidden');
      errorTimeline.style.display = 'none';
    }
    if (timelineDescription) timelineDescription.textContent = message;
    if (analysisButton) analysisButton.classList.remove('hidden');
    if (timelineContainer) timelineContainer.classList.remove('hidden');

    // アップロードボタンを非表示にして、解析ボタンを強調
    if (uploadButtonContainer) uploadButtonContainer.classList.add('hidden');

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
      'timeline-item-2', 'timeline-item-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('hidden');
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
      const modal = document.getElementById('slide-down-animated-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('overlay-open');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
      }
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

function startAnalysis(modelName) {
  console.log('解析開始:', modelName);

  // 解析開始UIを表示
  const item2 = document.getElementById('timeline-item-2');
  if (item2) {
    item2.classList.remove('hidden');
    item2.style.display = 'block';
  }

  const animationInterval = startAnalysisAnimation();
  const bar = document.getElementById('analysis-progress-bar');
  const valEl = document.getElementById('analysis-progress-value');

  // 実際のAPI呼び出し
  fetch('/image_analyzer/api/analysis/start/', {
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
        console.log('解析開始API成功:', data);
        // 進捗監視を開始
        monitorAnalysisProgress(bar, valEl, animationInterval);
      } else {
        console.error('解析開始API失敗:', data.error);
        showAnalysisError(data.error || '解析の開始に失敗しました');
        clearInterval(animationInterval);
      }
    })
    .catch(error => {
      console.error('解析開始API呼び出しエラー:', error);
      showAnalysisError('解析の開始に失敗しました');
      clearInterval(animationInterval);
    });
}

function monitorAnalysisProgress(bar, valEl, animationInterval) {
  let progress = 0;
  const progressInterval = setInterval(() => {
    // 実際の進捗を取得するAPI呼び出し
    fetch('/image_analyzer/api/analysis/progress/')
      .then(response => response.json())
      .then(data => {
        if (data.ok && data.progress !== undefined) {
          progress = data.progress;
          if (bar) bar.style.width = progress + '%';
          if (valEl) valEl.textContent = Math.round(progress);

          if (progress >= 100) {
            clearInterval(progressInterval);
            clearInterval(animationInterval);
            setTimeout(() => {
              const item3 = document.getElementById('timeline-item-3');
              if (item3) {
                item3.classList.remove('hidden');
                item3.style.display = 'block';
              }
              // 解析完了後にセッションカウンターをリセット
              if (typeof sessionUploadCount !== 'undefined') {
                sessionUploadCount = 0;
              }
            }, 600);
          }
        }
      })
      .catch(error => {
        console.error('進捗取得エラー:', error);
        // エラー時は手動で進捗を進める
        progress += Math.random() * 10;
        if (progress > 100) progress = 100;
        if (bar) bar.style.width = progress + '%';
        if (valEl) valEl.textContent = Math.round(progress);

        if (progress >= 100) {
          clearInterval(progressInterval);
          clearInterval(animationInterval);
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