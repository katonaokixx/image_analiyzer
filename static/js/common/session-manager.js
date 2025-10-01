/**
 * セッション管理モジュール
 * アップロードページでのセッション復元とUI初期化を管理
 */

// セッションから保存されたモデル選択を復元
document.addEventListener('DOMContentLoaded', function () {
  const selectedModel = window.selectedModel || '';
  const modelSelector = document.getElementById('model-selector');

  // 新規アップロードページではデフォルト値をクリア
  if (modelSelector) {
    modelSelector.value = '';
  }

  // セッションから解析状態を復元
  const analysisStatus = window.analysisStatus || '';
  const uploadedImagesStr = window.uploadedImagesJson || '[]';
  let uploadedImages = [];
  try {
    uploadedImages = JSON.parse(uploadedImagesStr);
    // グローバル変数にも保存
    if (typeof uploadedImagesData !== 'undefined') {
      uploadedImagesData = uploadedImages;
      console.log('DOMContentLoaded: uploadedImagesDataを復元:', uploadedImagesData);
    }
  } catch (e) {
    console.error('JSON解析エラー:', e);
    uploadedImages = [];
    if (typeof uploadedImagesData !== 'undefined') {
      uploadedImagesData = [];
    }
  }

  // リロード時の状態復元中であることを示すフラグを設定
  window.isRestoringState = true;

  // 初期状態では uploadSuccessShown をfalseに設定
  window.uploadSuccessShown = false;

  // リロード時にuploadSuccessShownフラグを設定（画像がある場合のみ）
  if (uploadedImages && uploadedImages.length > 0) {
    window.uploadSuccessShown = true;

    // タイムライン表示（アップロード完了）
    toggleTimelineContainer(true);
    toggleTimelineItem('timeline-item-1-success', true);

    // アップロード完了後は解析ボタンを表示し、アップロードボタンを非表示にする
    const analysisButton = document.getElementById('analysis-button-container');
    const uploadButtonContainer = document.getElementById('upload-button-container');

    if (analysisButton) {
      analysisButton.classList.remove('hidden');
    }

    if (uploadButtonContainer) {
      uploadButtonContainer.classList.add('hidden');
    }

    // 解析が実際に開始されている場合のみ2つ目以降のタイムラインを表示
    if (analysisStatus &&
      analysisStatus !== 'uploaded' &&
      analysisStatus !== '' &&
      analysisStatus.trim() !== '' &&
      (analysisStatus === 'analyzing' || analysisStatus === 'completed' || analysisStatus === 'failed')) {

      // 2つ目のタイムライン（解析開始）を表示
      const timeline2 = document.getElementById('timeline-item-2');
      if (timeline2) {
        timeline2.classList.remove('hidden');
        timeline2.style.display = 'block';
      }

      // 解析状態に応じて3つ目のタイムラインを表示
      if (analysisStatus === 'completed') {
        const timeline3 = document.getElementById('timeline-item-3');
        if (timeline3) {
          timeline3.classList.remove('hidden');
          timeline3.style.display = 'block';
        }
        // 解析完了時は解析ボタンを非表示にする
        if (analysisButton) {
          analysisButton.classList.add('hidden');
        }
      } else if (analysisStatus === 'failed') {
        // 失敗時は2つ目のタイムラインを非表示にして、失敗専用タイムラインを表示
        if (timeline2) {
          timeline2.classList.add('hidden');
          timeline2.style.display = 'none';
        }

        // 2つ目のタイムライン（解析失敗）を表示
        const timeline2Error = document.getElementById('timeline-item-2-error');
        if (timeline2Error) {
          timeline2Error.classList.remove('hidden');
          timeline2Error.style.display = 'block';
        }
        if (analysisButton) {
          analysisButton.classList.add('hidden');
        }
      } else if (analysisStatus === 'analyzing') {
        // 解析中の場合は進捗監視を開始
        // image-analysis.jsが定義する startProgressMonitoring() を呼び出し
        if (typeof startProgressMonitoring === 'function') {
          console.log('セッション復元: 解析中のため進捗監視を開始');
          // 少し遅延させてからDOM要素が確実に存在するようにする
          setTimeout(() => {
            startProgressMonitoring();
          }, 100);
        }
      }
    }
  }

  // 状態復元完了フラグを設定
  setTimeout(() => {
    window.isRestoringState = false;
  }, 500);
});

