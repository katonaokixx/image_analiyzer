// グローバル変数
let progressInterval = null;
// uploadedImagesData は upload-simplified.js で定義済み

// セッション復元処理は session-manager.js に移動済み

// モーダル内の解析開始ボタンのイベントリスナー
document.addEventListener('DOMContentLoaded', function () {
  const modalAnalysisButton = document.getElementById('modal-start-analysis-btn');
  if (modalAnalysisButton) {
    modalAnalysisButton.addEventListener('click', function () {
      const model = document.getElementById('model-selector').value;
      if (!model) {
        alert('モデルを選択してください');
        return;
      }

      console.log('選択されたモデル:', model);
      // 初回解析を実行
      window.isRetryAnalysis = false;
      handleAnalysisStart(model);
    });
  }
});

// ====================================
// 以下の関数は image-analysis.js に移動予定
// ====================================

function handleAnalysisStart(model) {
  const analysisButton = document.getElementById('start-analysis-btn');
  if (!analysisButton) {
    console.error('解析ボタンが見つかりません');
    return;
  }
  const analysisButtonText = analysisButton.querySelector('span');
  if (!analysisButtonText) {
    console.error('解析ボタンのテキスト要素が見つかりません');
    return;
  }
  const originalText = analysisButtonText.textContent;

  analysisButton.disabled = true;
  analysisButtonText.textContent = '解析中...';

  const csrfToken = getCSRFToken();
  console.log('CSRFトークン:', csrfToken);

  // API呼び出しラッパーを使用
  startAnalysis(model)
    .then(data => {
      console.log('解析開始API応答:', data);
      if (data.ok || data.success) {
        // 解析開始成功
        console.log('解析開始直後: analyzingステータスを表示');
        updateAnalysisUI('analyzing', 0);
        startProgressMonitoring();
      } else {
        alert('解析の開始に失敗しました: ' + (data.error || '不明なエラー'));
        analysisButton.disabled = false;
        analysisButtonText.textContent = originalText;
      }
    })
    .catch(error => {
      console.error('解析開始エラー:', error);
      alert('解析開始中にエラーが発生しました。');
      analysisButton.disabled = false;
      analysisButtonText.textContent = originalText;
    });
}

// 進捗監視開始
function startProgressMonitoring() {
  let attemptCount = 0;
  const maxAttempts = 60; // 最大60回（3分間）

  // 既存の監視を停止
  if (progressInterval) {
    clearInterval(progressInterval);
  }

  progressInterval = setInterval(() => {
    attemptCount++;

    // 最大試行回数に達した場合は監視を停止
    if (attemptCount > maxAttempts) {
      clearInterval(progressInterval);
      progressInterval = null;
      console.warn('進捗監視の最大試行回数に達しました');
      updateAnalysisUI('failed');
      return;
    }
    // API呼び出しラッパーを使用
    getAnalysisProgress()
      .then(data => {
        console.log('進捗データ:', data);
        console.log('進捗ステータス:', data.status);
        console.log('進捗パーセンテージ:', data.progress_percentage);

        // 進捗説明を常に更新
        const progressDescription = document.getElementById('timeline-analysis-description');
        if (progressDescription && data.description) {
          progressDescription.textContent = data.description;
        }

        if (data.status === 'completed' && data.progress >= 100) {
          // 全画像が完了したことを確認
          if (data.completed_images === data.total_images && data.total_images > 0) {
            console.log(`進捗監視: 全画像完了検出 (${data.completed_images}/${data.total_images}枚)`);
            clearInterval(progressInterval);
            progressInterval = null;
            updateAnalysisUI('completed');

            // 進捗バーのステータステキストを「解析成功」に変更
            const progressBars = document.querySelectorAll('[data-analysis-progress-bar-pane]');
            progressBars.forEach(progressBar => {
              const statusText = progressBar.closest('.progress-container').querySelector('[data-analysis-file-size]');
              if (statusText) {
                statusText.textContent = '解析成功';
              }
            });

            // 3秒後にリダイレクト
            setTimeout(() => {
              window.location.href = '/v2/';
            }, 3000);
          } else {
            console.log(`進捗監視: 解析継続中 (${data.completed_images}/${data.total_images}枚完了)`);
            // まだ完了していない画像がある場合は個別進捗を更新
            updateIndividualImagesProgress();
          }
        } else if (data.status === 'failed') {
          console.log('進捗監視: 失敗ステータス検出');
          clearInterval(progressInterval);
          progressInterval = null;
          updateAnalysisUI('failed');
        } else {
          console.log('進捗監視: 解析中ステータス検出');
          // 解析中の場合、UIを更新してから進捗バーを更新
          updateAnalysisUI('analyzing', data.progress_percentage);

          // 進捗バーを実際の進捗値で更新
          let progressPercentage = data.progress || 0;
          updateProgressBar(progressPercentage);

          // 各画像の個別進捗を更新
          updateIndividualImagesProgress();
        }
      })
      .catch(error => {
        console.error('進捗取得エラー:', error);
        // エラーが続く場合は監視を停止
        clearInterval(progressInterval);
        progressInterval = null;
        updateAnalysisUI('failed');
      });
  }, 3000); // 3秒間隔に変更
}

// 解析UI更新
function updateAnalysisUI(status, progress = 0) {
  const analysisButton = document.getElementById('start-analysis-btn');
  if (!analysisButton) return;

  const analysisButtonText = analysisButton.querySelector('span');
  if (!analysisButtonText) return;

  if (status === 'completed') {
    analysisButton.disabled = false;
    analysisButtonText.textContent = '解析完了';

    // 3つ目のタイムラインを表示（共通関数使用）
    toggleTimelineItem('timeline-item-3', true);

    // 進捗バーを100%に設定
    updateProgressBar(100);

    // 進捗バーのステータステキストを「解析成功」に変更
    const progressBars = document.querySelectorAll('[data-analysis-progress-bar-pane]');
    progressBars.forEach(progressBar => {
      const statusText = progressBar.closest('.progress-container').querySelector('[data-analysis-file-size]');
      if (statusText) {
        statusText.textContent = '解析成功';
      }
    });

    // v1と同様に個別進捗監視も停止
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    // 3秒後にuser_image_tableに遷移（v1と同じ動作）
    setTimeout(() => {
      window.location.href = '/v2/user_image_table/';
    }, 3000);

  } else if (status === 'failed') {
    analysisButton.disabled = false;
    analysisButtonText.textContent = '解析失敗';

    // 失敗タイムラインを表示（共通関数使用）
    toggleTimelineItem('timeline-item-2-error', true);

  } else if (status === 'analyzing') {
    console.log('updateAnalysisUI: analyzing status detected');
    analysisButtonText.textContent = `解析中... ${progress}%`;

    // 2つ目のタイムラインを表示（解析開始時）（共通関数使用）
    console.log('updateAnalysisUI: showing timeline2');
    toggleTimelineItem('timeline-item-2', true);

    // 進捗バーを生成（初回のみ）
    const container = document.getElementById('analysis-progress-previews');
    console.log('updateAnalysisUI: container =', container);
    console.log('updateAnalysisUI: container.children.length =', container ? container.children.length : 'N/A');
    console.log('updateAnalysisUI: uploadedImagesData.length =', uploadedImagesData.length);

    if (container) {
      if (container.children.length === 0) {
        // uploadedImagesDataが空の場合、セッションから取得を試みる
        if (uploadedImagesData.length === 0) {
          console.log('updateAnalysisUI: uploadedImagesDataが空です。セッションから画像情報を取得します');
          
          console.log('DEBUG: getUploadedImages()を呼び出します');
          console.log('DEBUG: getUploadedImages type:', typeof getUploadedImages);
          
          const promise = getUploadedImages();
          console.log('DEBUG: getUploadedImages()の戻り値:', promise);
          console.log('DEBUG: 戻り値の型:', typeof promise);
          console.log('DEBUG: promise.then:', typeof promise.then);
          
          promise.then(data => {
            console.log('updateAnalysisUI: API応答:', data);
            if (data.ok && data.images) {
              uploadedImagesData = data.images;
              console.log('updateAnalysisUI: uploadedImagesDataを更新:', uploadedImagesData);
              createAnalysisProgressPreviews(uploadedImagesData);
            }
          }).catch(error => {
            console.error('updateAnalysisUI: 画像取得エラー:', error);
          });
        } else {
          console.log('updateAnalysisUI: uploadedImagesDataがあります。プレビューを生成します');
          createAnalysisProgressPreviews(uploadedImagesData);
        }
      }
    }
  }
}

// createAnalysisProgressPreviews()は共通モジュール（upload-utils.js）を使用

// アップロード済み画像を取得（グローバル変数から取得）
function getLocalUploadedImages() {
  console.log('getLocalUploadedImages: 開始');

  // グローバル変数に保存された画像データを使用
  if (uploadedImagesData && uploadedImagesData.length > 0) {
    console.log('getLocalUploadedImages: グローバル変数から取得:', uploadedImagesData);
    return uploadedImagesData;
  }

  console.log('getLocalUploadedImages: グローバル変数が空です');
  return [];
}

// 進捗バーを更新する関数
function updateProgressBar(percentage) {
  console.log('updateProgressBar: 進捗 =', percentage, '%');

  // 進捗バー要素を取得して更新
  const progressBars = document.querySelectorAll('[data-analysis-progress-bar-pane]');
  const progressValues = document.querySelectorAll('[data-analysis-progress-bar-value]');

  progressBars.forEach(progressBar => {
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);

    // 色の変更ロジック
    progressBar.classList.remove('progress-primary', 'progress-warning', 'progress-info', 'progress-success', 'progress-error');
    if (percentage >= 100) {
      progressBar.classList.add('progress-success');
    } else if (percentage > 0) {
      progressBar.classList.add('progress-info');
    } else {
      progressBar.classList.add('progress-primary');
    }
  });

  progressValues.forEach(progressValue => {
    progressValue.textContent = Math.round(percentage);
  });
}

// 個別画像の進捗を更新する関数
function updateIndividualImagesProgress() {
  console.log('updateIndividualImagesProgress: 個別画像進捗を更新');

  // グローバル変数から画像IDを取得
  const images = getLocalUploadedImages();
  if (!images || images.length === 0) {
    console.log('updateIndividualImagesProgress: 画像データがありません');
    return;
  }

  // 各画像の進捗を取得して更新
  images.forEach(image => {
    const imageId = image.id;
    // 個別画像の進捗を取得
    getAnalysisProgress(imageId)
      .then(data => {
        if (data.ok) {
          updateSingleImageProgress(imageId, data);
        }
      })
      .catch(error => {
        console.error(`画像${imageId}の進捗取得エラー:`, error);
      });
  });
}

// 単一画像の進捗を更新する関数
function updateSingleImageProgress(imageId, statusInfo) {
  console.log(`updateSingleImageProgress: 画像${imageId}の進捗を更新`, statusInfo);

  const progressBarPane = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  const progressValueEl = document.querySelector(`[data-analysis-progress-bar-value="${imageId}"]`);
  const statusTextEl = document.querySelector(`[data-analysis-file-size="${imageId}"]`);

  if (!progressBarPane || !progressValueEl) return;

  let percentage = statusInfo.progress || statusInfo.progress_percentage || 0;
  let status = statusInfo.status || 'preparing';

  // 進捗バーの更新
  progressBarPane.style.width = `${percentage}%`;
  progressValueEl.textContent = Math.round(percentage);

  // 色の更新
  progressBarPane.classList.remove('progress-primary', 'progress-warning', 'progress-info', 'progress-success', 'progress-error');
  if (status === 'completed') {
    progressBarPane.classList.add('progress-success');
  } else if (status === 'analyzing') {
    progressBarPane.classList.add('progress-info');
  } else if (status === 'preparing') {
    progressBarPane.classList.add('progress-warning');
  } else if (status === 'failed' || status === 'error') {
    progressBarPane.classList.add('progress-error');
  } else {
    progressBarPane.classList.add('progress-primary');
  }

  // ステータステキストの更新
  if (statusTextEl) {
    if (status === 'completed') {
      statusTextEl.textContent = '解析完了';
    } else if (status === 'analyzing') {
      statusTextEl.textContent = '解析中';
    } else if (status === 'preparing') {
      statusTextEl.textContent = '準備中';
    } else if (status === 'uploaded') {
      statusTextEl.textContent = 'アップロード完了';
    } else if (status === 'failed' || status === 'error') {
      statusTextEl.textContent = '解析失敗';
    } else {
      statusTextEl.textContent = statusInfo.description || '不明なステータス';
    }
  }
}

