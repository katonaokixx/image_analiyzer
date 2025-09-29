
// 選択された画像がある場合のタイムライン表示制御
document.addEventListener('DOMContentLoaded', function () {
  // テンプレート変数を埋め込まず、DOMのdata属性から取得
  const ctxEl = document.getElementById('page-context');
  const selectedImageStatus = (ctxEl?.dataset.selectedImageStatus || '').trim();
  const selectedImageId = ctxEl?.dataset.selectedImageId || '';

  // グローバル変数として設定
  window.currentImageId = selectedImageId;

  // 現在表示されている解析結果を確認
  logCurrentDisplayedResults();

  // タイムラインコンテナを表示
  const timelineContainer = document.getElementById('timeline-container');
  if (timelineContainer) {
    timelineContainer.classList.remove('hidden');
    timelineContainer.classList.add('block');
    timelineContainer.style.display = 'block';
  }

  // 1つ目のタイムライン（ファイルアップロード完了）は常に表示
  // timeline1は後で宣言されるため、ここでは削除


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
  // 少し遅延してからボタンを取得（DOMが完全に読み込まれるまで待つ）
  setTimeout(() => {
    // 複数の方法でボタンを取得
    const retryButton = document.getElementById('start-analysis-btn') || document.querySelector('#start-analysis-btn');

    if (retryButton) {

      // 既存のイベントリスナーを削除
      retryButton.onclick = null;

      // 複数の方法でイベントリスナーを設定
      const clickHandler = function (e) {
        e.preventDefault();

        // FlyonUIがモーダルを表示した後にイベントリスナーを設定
        setTimeout(() => {
          setupModalButtonEvents();
        }, 200); // FlyonUIのモーダル表示を待つ
      };

      // addEventListenerとonclickの両方を設定
      retryButton.addEventListener('click', clickHandler);
      retryButton.onclick = clickHandler;
    }
  }, 500); // 500ms遅延

});

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
      if (event && event.defaultPrevented) {
        return;
      }
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // ボタンの連続クリックを防ぐ
      if (modalStartButton.disabled) {
        return;
      }

      // ボタンを無効化
      modalStartButton.disabled = true;
      modalStartButton.innerHTML = '<span class="loading loading-spinner loading-sm"></span>処理中...';

      // モーダルを閉じる
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

      retryAnalysis();
    };

    // 単一のイベントリスナーのみを設定
    modalStartButton.addEventListener('click', startClickHandler);
  }

  // モーダルのキャンセルボタンのイベント設定
  const modalCancelButton = document.querySelector('[data-overlay="#slide-down-animated-modal"]');

  if (modalCancelButton) {

    // 既存のイベントリスナーを削除
    modalCancelButton.onclick = null;

    // addEventListenerを使用してイベントリスナーを設定
    modalCancelButton.addEventListener('click', function (e) {
      e.preventDefault();

      // モーダルを閉じる
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
    });
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

  // 1つ目: ファイルアップロード完了（常に表示）
  // timeline1は後で宣言されるため、ここでは削除

  // 2つ目: 解析開始/解析失敗（analyzing, completed, failedで表示）
  // ただし、再解析ページでは過去の解析履歴は非表示にする
  // timeline2は後で宣言されるため、ここでは削除

  // デバッグ: 1つ目のタイムラインが確実に表示されているか確認
  const timeline1Check = document.getElementById('timeline-item-1-success');
  if (timeline1Check) {
    timeline1Check.classList.remove('hidden');
    timeline1Check.style.display = 'block';
  }

  // タイムライン表示制御
  const timeline1 = document.getElementById('timeline-item-1'); // アップロード成功
  const timeline2 = document.getElementById('timeline-item-2'); // 解析開始
  const timeline3 = document.getElementById('timeline-item-3'); // 解析完了

  // 全てのタイムラインを初期状態で非表示にする
  [timeline1, timeline2, timeline3].forEach(timeline => {
    if (timeline) {
      timeline.classList.add('hidden');
      timeline.style.display = 'none';
    }
  });

  // selected_image_statusに基づいて表示制御
  if (status === 'uploaded') {
    // アップロードのみの場合：1つ目のタイムラインのみ表示
    if (timeline1) {
      timeline1.classList.remove('hidden');
      timeline1.style.display = 'block';
    }
  } else if (status === 'analyzing') {
    // 解析中の場合：1つ目と2つ目のタイムラインを表示
    if (timeline1) {
      timeline1.classList.remove('hidden');
      timeline1.style.display = 'block';
    }
    if (timeline2) {
      timeline2.classList.remove('hidden');
      timeline2.style.display = 'block';
    }
  } else if (status === 'completed') {
    // 解析完了の場合：3つ目のタイムラインのみ表示
    if (timeline3) {
      timeline3.classList.remove('hidden');
      timeline3.style.display = 'block';
    }
  }


  // 4つ目と5つ目は再解析時のみ表示（初期状態では非表示のまま）
  // これらは retryAnalysis() 関数内で制御される
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
    // 再解析ボタンは常に表示
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
    isRetryAnalysisRunning = false; // フラグをリセット
    return;
  }

  // 再解析フラグを設定（再解析専用ページなので常にtrue）
  window.isRetryAnalysis = true;

  // 4つ目のタイムライン（再解析開始）を表示
  const timeline4 = document.getElementById('timeline-item-4');
  if (timeline4) {
    timeline4.classList.remove('hidden');
    timeline4.style.display = 'block';
    // 再解析開始時刻を設定
    const startedAt = document.getElementById('timeline-retry-started-at');
    if (startedAt && (!startedAt.textContent || startedAt.textContent.trim() === '')) {
      const now = new Date();
      startedAt.textContent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    // 進捗バーを生成
    generateRetryProgressBar();
  }

  // 再解析ボタンを無効化
  const analysisButton = document.getElementById('analysis-button-container');
  const button = analysisButton.querySelector('button');
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="icon-[tabler--loader-2] size-5 mr-2 animate-spin"></span>再解析中...';
  }

  // CSRFトークンを取得
  const csrfToken = getCSRFToken();

  // 再解析APIを呼び出し
  fetch('/v2/api/analysis/retry/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken
    },
    body: JSON.stringify({
      image_id: window.currentImageId
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // 再解析準備完了 - 実際の解析を開始
        startRetryAnalysis();
      } else {
        alert('再解析の準備に失敗しました: ' + (data.error || '不明なエラー'));
        // ボタンを元に戻す
        if (button) {
          button.disabled = false;
          button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
        }
        isRetryAnalysisRunning = false; // フラグをリセット
      }
    })
    .catch(error => {
      alert('再解析の準備に失敗しました: ' + error.message);
      // ボタンを元に戻す
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
      }
      isRetryAnalysisRunning = false; // フラグをリセット
    });
}

// 再解析を実際に開始する関数
function startRetryAnalysis() {

  // 進捗バーを0%にリセット
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

  // CSRFトークンを取得
  const csrfToken = getCSRFToken();

  // モーダルで選択されたモデルを取得
  const modelSelector = document.getElementById('model-selector');
  const selectedModel = modelSelector ? modelSelector.value : 'vgg16';

  const requestData = {
    image_id: window.currentImageId,
    model: selectedModel // 選択されたモデルを使用
  };

  // 解析APIを呼び出し
  fetch('/v2/api/analysis/start/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': csrfToken
    },
    body: new URLSearchParams(requestData)
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      if (data.ok || data.success) {
        startRetryProgressMonitoring();
        // 成功時はフラグをリセットしない（進捗監視が完了するまで）
      } else {
        alert('再解析の開始に失敗しました: ' + (data.error || data.message || '不明なエラー'));
        // ボタンを元に戻す
        const analysisButton = document.getElementById('analysis-button-container');
        const button = analysisButton.querySelector('button');
        if (button) {
          button.disabled = false;
          button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
        }
        isRetryAnalysisRunning = false; // フラグをリセット
      }
    })
    .catch(error => {
      alert('再解析の開始に失敗しました: ' + error.message);
      // ボタンを元に戻す
      const analysisButton = document.getElementById('analysis-button-container');
      const button = analysisButton.querySelector('button');
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
      }
      isRetryAnalysisRunning = false; // フラグをリセット
    });
}

// 再解析進捗バーを生成する関数（image_uploadの2つ目のタイムラインと同じUI）
function generateRetryProgressBar() {
  const progressContainer = document.getElementById('retry-analysis-progress-previews');

  if (!progressContainer) {
    return;
  }

  // 選択された画像の情報を取得（data属性から）
  const ctxEl = document.getElementById('page-context');
  const selectedImage = {
    id: ctxEl?.dataset.selectedImageId || '',
    filename: ctxEl?.dataset.selectedImageFilename || '',
    thumbnail_url: ctxEl?.dataset.selectedImageThumbnailUrl || '',
    status: ctxEl?.dataset.selectedImageStatus || '',
    progress_percentage: Number(ctxEl?.dataset.analysisProgressPercentage || 0),
    progress_stage: ctxEl?.dataset.analysisProgressStage || 'preparing'
  };

  // 既存の進捗バーをクリア
  progressContainer.innerHTML = '';

  // ファイル名と拡張子を分離
  const lastDot = selectedImage.filename.lastIndexOf('.');
  const filename = lastDot > 0 ? selectedImage.filename.substring(0, lastDot) : selectedImage.filename;
  const fileExt = lastDot > 0 ? selectedImage.filename.substring(lastDot + 1) : '';

  // image_uploadの2つ目のタイムラインと同じ構造で進捗バーを生成
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

  // 進捗アニメーションを開始
  animateRetryProgress();
}


// 再解析進捗バーを更新する関数
function updateRetryProgressBar(percentage) {
  const progressBar = document.getElementById('retry-progress-bar-pane');
  const progressValue = document.getElementById('retry-progress-bar-value');

  if (progressBar) {
    progressBar.style.width = percentage + '%';
  }

  if (progressValue) {
    progressValue.textContent = percentage;
  }

  // 100%の場合は成功スタイルを適用
  if (percentage >= 100) {
    if (progressBar) {
      progressBar.classList.add('progress-success');
    }
  }
}

// 再解析進捗アニメーション
function animateRetryProgress() {
  const progressBar = document.getElementById('retry-progress-bar-pane');
  const progressValue = document.getElementById('retry-progress-bar-value');

  if (!progressBar || !progressValue) {
    return;
  }

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress > 100) progress = 100;

    progressBar.style.width = progress + '%';
    progressValue.textContent = Math.round(progress);

    if (progress >= 100) {
      clearInterval(interval);
      // 進捗完了時の処理
      progressBar.classList.add('progress-success');
    }
  }, 200);
}

// 再解析進捗監視機能
function startRetryProgressMonitoring() {
  // 既存のintervalをクリア
  if (retryProgressInterval) {
    clearInterval(retryProgressInterval);
  }

  // 進捗監視の間隔（1秒）
  retryProgressInterval = setInterval(() => {
    checkRetryProgress();
  }, 1000);

  // 5秒後にタイムアウト（強制的に完了タイムラインを表示）
  setTimeout(() => {
    if (retryProgressInterval) {
      clearInterval(retryProgressInterval);
      retryProgressInterval = null;
    }

    // 強制的に完了タイムラインを表示
    if (window.isRetryAnalysis) {
      updateIndividualProgress(window.currentImageId, 'completed', 100, 'completed');
      updateAnalysisCardToCompleted();
      showRetryCompletedTimeline();

      // 再解析ボタンの状態を復元
      const analysisButton = document.getElementById('analysis-button-container');
      const button = analysisButton ? analysisButton.querySelector('button') : null;
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
      }

      // 3秒後にページリロード
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }

    isRetryAnalysisRunning = false; // フラグをリセット
  }, 5000);
}

// 解析結果を再取得して表示を更新する関数
function refreshAnalysisResults(imageId) {
  fetch(`/api/timeline/${imageId}/`)
    .then(response => response.json())
    .then(data => {
      if (data.ok && data.timeline) {
        // 解析結果を表示エリアに更新
        updateAnalysisResultsDisplay(data.timeline);
      }
    })
    .catch(error => {
      // エラーハンドリング
    });
}

// 解析結果表示を更新する関数
function updateAnalysisResultsDisplay(timeline) {
  // 現在表示されている解析結果を確認
  logCurrentDisplayedResults();

  // 手動リロード用のボタンを表示
  showManualReloadButton();
}

// 現在表示されている解析結果をログ出力する関数
function logCurrentDisplayedResults() {
  // ページ内のテキストから解析結果を抽出
  const pageText = document.body.textContent;

  // 「前回の解析結果」パターンを検索
  const resultPattern = /前回の解析結果[：:]\s*([^]+?)(?=\n|$)/;
  const match = pageText.match(resultPattern);

  // 特定の要素から解析結果を探す
  const possibleElements = [
    document.querySelector('.timeline-description'),
    document.querySelector('#timeline-description'),
    document.querySelector('[class*="result"]'),
    document.querySelector('[id*="result"]')
  ];

  // ページ全体のテキストから解析結果らしき部分を抽出
  const resultKeywords = ['ファッション', 'アニメ', 'テクノロジー', '人物', '乗り物'];
}

// 手動リロードボタンを表示する関数
function showManualReloadButton() {
  // 既存のボタンを削除
  const existingBtn = document.getElementById('manual-reload-btn');
  if (existingBtn) {
    existingBtn.remove();
  }

  // 新しいリロードボタンを作成
  const reloadBtn = document.createElement('button');
  reloadBtn.id = 'manual-reload-btn';
  reloadBtn.className = 'btn btn-primary btn-sm mt-2';
  reloadBtn.innerHTML = '<span class="icon-[tabler--refresh] size-4 mr-2"></span>解析結果を更新';
  reloadBtn.onclick = () => {
    window.location.reload();
  };

  // 再解析ボタンの下に追加
  const buttonContainer = document.getElementById('analysis-button-container');
  if (buttonContainer) {
    buttonContainer.appendChild(reloadBtn);
  }
}

// 再解析進捗確認
function checkRetryProgress() {
  if (!window.currentImageId) {
    return;
  }

  fetch(`/v2/api/analysis/progress/?image_id=${window.currentImageId}`)
    .then(response => response.json())
    .then(data => {

      // 進捗パーセンテージを更新（最初のアップロード時と同じロジックを使用）
      if (data.progress_percentage !== undefined) {
        updateIndividualProgress(window.currentImageId, data.status, data.progress_percentage, data.progress_stage);
      }

      if (data.status === 'completed' && (data.progress >= 100 || data.progress_percentage >= 100)) {
        // 再解析完了（API進捗または進捗パーセンテージが100%になった時）
        if (window.isRetryAnalysis) {
          // 再解析の進捗バーを100%に更新（最初のアップロード時と同じロジックを使用）
          updateIndividualProgress(window.currentImageId, 'completed', 100, 'completed');
          // カードの表示を「再解析完了」に更新
          updateAnalysisCardToCompleted();
          showRetryCompletedTimeline();

          // 3秒後にページリロード
          setTimeout(() => {
            window.location.reload();
          }, 3000);

          // 再解析ボタンの状態を復元
          const analysisButton = document.getElementById('analysis-button-container');
          const button = analysisButton ? analysisButton.querySelector('button') : null;
          if (button) {
            button.disabled = false;
            button.innerHTML = '<span class="icon-[tabler--refresh] size-5 mr-2"></span>再解析';
          }
        }

        // 進捗監視を停止
        if (retryProgressInterval) {
          clearInterval(retryProgressInterval);
          retryProgressInterval = null;
        }
        isRetryAnalysisRunning = false; // フラグをリセット
      } else if (data.status === 'failed') {
        // 再解析失敗
        alert('再解析に失敗しました: ' + (data.error || '不明なエラー'));

        // 進捗監視を停止
        if (retryProgressInterval) {
          clearInterval(retryProgressInterval);
          retryProgressInterval = null;
        }
        isRetryAnalysisRunning = false; // フラグをリセット
      }
      // analyzingの場合は継続監視
    })
    .catch(error => {
      // 進捗監視を停止
      if (retryProgressInterval) {
        clearInterval(retryProgressInterval);
        retryProgressInterval = null;
      }
      isRetryAnalysisRunning = false; // フラグをリセット
    });
}

// カードの内容を「解析完了」に変更
function updateAnalysisCardToCompleted() {
  // 再解析の場合は4つ目のタイムラインのコンテナを更新
  const container = window.isRetryAnalysis ?
    document.getElementById('retry-analysis-progress-previews') :
    document.getElementById('analysis-progress-previews');

  if (!container) {
    return;
  }

  // ファイル名部分（ファイル名 + 拡張子）を取得
  const fileNameElement = container.querySelector('[data-analysis-file-name]');
  const fileExtElement = container.querySelector('[data-analysis-file-ext]');
  const statusElement = container.querySelector('[data-analysis-file-size]');
  const analysisStatusElement = container.querySelector('[data-analysis-status]');

  // ファイル名要素はそのまま保持（完了テキストは別の要素で管理）
  if (fileNameElement) {
    // ファイル名はそのまま保持
  }

  // ステータス要素のテキストを空にする（再解析完了時はステータステキストを表示しない）
  if (analysisStatusElement) {
    analysisStatusElement.textContent = '';
  }

  // ステータス部分を非表示にする
  if (statusElement) {
    statusElement.style.display = 'none';
  }

  // 説明テキストを更新
  const descriptionElement = container.querySelector('.text-xs');
  if (descriptionElement) {
    const descriptionText = window.isRetryAnalysis ? '画像の再解析が完了しました' : '画像のカテゴリー分類が完了しました';
    descriptionElement.textContent = descriptionText;
  }

  // より確実に「解析中」を含む要素を非表示にする
  const allElements = container.querySelectorAll('*');
  allElements.forEach((element, index) => {
    if (element.textContent && element.textContent.includes('解析中') && !element.textContent.includes('解析完了')) {
      element.style.display = 'none';
    }
  });

  // 「再解析中」を「再解析完了」に変更
  const retryElements = container.querySelectorAll('*');
  retryElements.forEach((element, index) => {
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
    // 再解析完了時刻を設定
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
  if (!container) {
    return;
  }

  container.innerHTML = '';

  // 選択された画像の情報を取得（data属性から）
  const ctxEl = document.getElementById('page-context');
  const selectedImage = {
    id: ctxEl?.dataset.selectedImageId || '',
    filename: ctxEl?.dataset.selectedImageFilename || '',
    thumbnail_url: ctxEl?.dataset.selectedImageThumbnailUrl || '',
    status: ctxEl?.dataset.selectedImageStatus || '',
    progress_percentage: Number(ctxEl?.dataset.analysisProgressPercentage || 0),
    progress_stage: ctxEl?.dataset.analysisProgressStage || 'preparing'
  };

  if (!selectedImage.id) {
    return;
  }

  // ファイル名と拡張子を分離
  const lastDot = selectedImage.filename.lastIndexOf('.');
  const filename = lastDot > 0 ? selectedImage.filename.substring(0, lastDot) : selectedImage.filename;
  const fileExt = lastDot > 0 ? selectedImage.filename.substring(lastDot + 1) : '';

  // アップロード時のUIテンプレートを完全に流用
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

  // ステータスに応じて進捗バーを更新
  updateIndividualProgress(selectedImage.id, selectedImage.status, selectedImage.progress_percentage, selectedImage.progress_stage);
}

// 個別進捗を更新（アップロードUI構造に合わせて）
function updateIndividualProgress(imageId, status, progressPercentage = 0, progressStage = 'preparing') {
  const progressBar = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  const progressValue = document.querySelector(`[data-analysis-progress-bar-value="${imageId}"]`);
  const statusText = document.querySelector(`[data-analysis-file-size="${imageId}"]`);

  if (!progressBar || !progressValue || !statusText) return;

  // DBから取得した進捗情報を使用
  if (progressPercentage > 0) {
    progressBar.style.width = `${progressPercentage}%`;
    progressValue.textContent = progressPercentage;
  }

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
      const totalImages = 1; // 再解析時は1枚のみ
      const currentPosition = 1;
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
    // ステータス部分は表示したまま保持
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

// CSRFトークン取得関数
function getCSRFToken() {
  return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

