// グローバル変数
let progressInterval = null;
// uploadedImagesData は upload-simplified.js で定義済み

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
    uploadedImagesData = uploadedImages;
    console.log('DOMContentLoaded: uploadedImagesDataを復元:', uploadedImagesData);
  } catch (e) {
    console.error('JSON解析エラー:', e);
    uploadedImages = [];
    uploadedImagesData = [];
  }

  // リロード時の状態復元中であることを示すフラグを設定
  window.isRestoringState = true;

  // 初期状態では uploadSuccessShown をfalseに設定
  window.uploadSuccessShown = false;

  // リロード時にuploadSuccessShownフラグを設定（画像がある場合のみ）
  if (uploadedImages && uploadedImages.length > 0) {
    window.uploadSuccessShown = true;
    // uploadedImagesは既にJavaScriptオブジェクトなので、そのまま使用
    const images = uploadedImages;
    // 1つ目のタイムライン（アップロード完了）を表示
    const timelineContainer = document.getElementById('timeline-container');
    const timeline1 = document.getElementById('timeline-item-1-success');

    if (timelineContainer && timeline1) {
      timelineContainer.classList.remove('hidden');
      timelineContainer.style.display = 'block';
      timeline1.classList.remove('hidden');
      timeline1.style.display = 'block';
    }

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

    // 解析が開始されている場合のみ2つ目以降のタイムラインを表示
    // uploaded状態や空文字列の場合は解析タイムラインを表示しない
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
      }
    } else if (analysisStatus === 'uploaded' || analysisStatus === '' || analysisStatus.trim() === '') {

      // アップロード完了時は解析タイムラインを確実に非表示にする
      const timeline2 = document.getElementById('timeline-item-2');
      const timeline2Error = document.getElementById('timeline-item-2-error');
      const timeline3 = document.getElementById('timeline-item-3');

      if (timeline2) {
        timeline2.classList.add('hidden');
        timeline2.style.display = 'none';
      }
      if (timeline2Error) {
        timeline2Error.classList.add('hidden');
        timeline2Error.style.display = 'none';
      }
      if (timeline3) {
        timeline3.classList.add('hidden');
        timeline3.style.display = 'none';
      }
    } else {

      // 不明な状態でも解析タイムラインを非表示にする
      const timeline2 = document.getElementById('timeline-item-2');
      const timeline2Error = document.getElementById('timeline-item-2-error');
      const timeline3 = document.getElementById('timeline-item-3');

      if (timeline2) {
        timeline2.classList.add('hidden');
        timeline2.style.display = 'none';
      }
      if (timeline2Error) {
        timeline2Error.classList.add('hidden');
        timeline2Error.style.display = 'none';
      }
      if (timeline3) {
        timeline3.classList.add('hidden');
        timeline3.style.display = 'none';
      }
    }

  } else {
    // アップロード済み画像がない場合は、アップロードボタンを表示し、解析ボタンを非表示にする
    const analysisButton = document.getElementById('analysis-button-container');
    const uploadButtonContainer = document.getElementById('upload-button-container');

    if (analysisButton) {
      analysisButton.classList.add('hidden');
    }

    if (uploadButtonContainer) {
      uploadButtonContainer.classList.remove('hidden');
    }
  }

  // 状態復元完了
  window.isRestoringState = false;

  // アップロードボタンのイベントリスナーを設定
  const uploadButton = document.getElementById('upload-button');
  if (uploadButton) {
    uploadButton.addEventListener('click', function () {
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.click();
      }
    });
  }

  // ファイル選択のイベントリスナーを設定
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', function (event) {
      const files = event.target.files;
      if (files && files.length > 0) {
        uploadFiles(files);
      }
    });
  }

  // 解析ボタンのイベントリスナーを設定（モーダルを開く）
  const analysisButton = document.getElementById('start-analysis-btn');
  if (analysisButton) {
    analysisButton.addEventListener('click', function () {
      console.log('モデル選択モーダルを開きます');
      // モーダルはFlyonUIの機能で自動的に開かれる
    });
  }

  // モーダル内の解析開始ボタンのイベントリスナー
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

// ファイルアップロード関数
function uploadFiles(files) {
  const formData = new FormData();

  // ファイルサイズと形式をチェック
  const maxSize = 1 * 1024 * 1024; // 1MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // ファイルサイズチェック
    if (file.size > maxSize) {
      alert(`ファイル ${file.name} は1MBを超えています。`);
      continue;
    }

    // ファイル形式チェック
    if (!allowedTypes.includes(file.type)) {
      alert(`ファイル ${file.name} は対応していない形式です。`);
      continue;
    }

    formData.append('files', file);
  }

  if (formData.getAll('files').length === 0) {
    alert('アップロード可能なファイルがありません。');
    return;
  }

  // アップロード開始
  const uploadButton = document.getElementById('upload-button');
  const uploadButtonText = uploadButton.querySelector('span');
  const originalText = uploadButtonText.textContent;

  uploadButton.disabled = true;
  uploadButtonText.textContent = 'アップロード中...';

  fetch('/v2/api/form-upload/', {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': getCSRFToken()
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok && data.images) {
        // アップロード成功
        window.uploadSuccessShown = true;

        // 画像データをグローバル変数に保存（IDを含む）
        uploadedImagesData = data.images;
        console.log('アップロード済み画像データを保存:', uploadedImagesData);

        // タイムラインを表示
        const timelineContainer = document.getElementById('timeline-container');
        const timeline1 = document.getElementById('timeline-item-1-success');

        if (timelineContainer && timeline1) {
          timelineContainer.classList.remove('hidden');
          timelineContainer.style.display = 'block';
          timeline1.classList.remove('hidden');
          timeline1.style.display = 'block';
        }

        // ボタンの表示を切り替え
        const analysisButton = document.getElementById('analysis-button-container');
        const uploadButtonContainer = document.getElementById('upload-button-container');

        if (analysisButton) {
          analysisButton.classList.remove('hidden');
        }

        if (uploadButtonContainer) {
          uploadButtonContainer.classList.add('hidden');
        }

        // アップロードした画像を表示
        displayUploadedImages(data.images);

      } else {
        alert('アップロードに失敗しました: ' + (data.error || '不明なエラー'));
      }
    })
    .catch(error => {
      console.error('アップロードエラー:', error);
      alert('アップロード中にエラーが発生しました。');
    })
    .finally(() => {
      uploadButton.disabled = false;
      uploadButtonText.textContent = originalText;
    });
}

// アップロードした画像を表示
function displayUploadedImages(images) {
  const imageContainer = document.getElementById('uploaded-images-container');
  if (!imageContainer) return;

  imageContainer.innerHTML = '';

  images.forEach(image => {
    const imageElement = document.createElement('div');
    imageElement.className = 'flex items-center space-x-3 p-3 bg-gray-50 rounded-lg';
    imageElement.innerHTML = `
      <img src="${image.thumbnail_url}" alt="${image.filename}" class="w-16 h-16 object-cover rounded">
        <div>
        <p class="font-medium text-gray-900">${image.filename}</p>
        <p class="text-sm text-gray-500">${image.file_size} bytes</p>
  </div>
  `;
    imageContainer.appendChild(imageElement);
  });
}

// 解析開始関数
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
  if (!analysisButton) {
    console.error('解析ボタンが見つかりません');
    return;
  }
  const analysisButtonText = analysisButton.querySelector('span');
  if (!analysisButtonText) {
    console.error('解析ボタンのテキスト要素が見つかりません');
    return;
  }

  if (status === 'completed') {
    analysisButton.disabled = false;
    analysisButtonText.textContent = '解析完了';

    // 3つ目のタイムラインを表示
    const timeline3 = document.getElementById('timeline-item-3');
    if (timeline3) {
      timeline3.classList.remove('hidden');
      timeline3.style.display = 'block';
    }

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

    // 失敗タイムラインを表示
    const timeline2Error = document.getElementById('timeline-item-2-error');
    if (timeline2Error) {
      timeline2Error.classList.remove('hidden');
      timeline2Error.style.display = 'block';
    }

  } else if (status === 'analyzing') {
    console.log('updateAnalysisUI: analyzing status detected');
    analysisButtonText.textContent = `解析中... ${progress}%`;

    // 2つ目のタイムラインを表示（解析開始時）
    const timeline2 = document.getElementById('timeline-item-2');
    console.log('updateAnalysisUI: timeline2 element:', timeline2);
    if (timeline2) {
      console.log('updateAnalysisUI: showing timeline2');
      timeline2.classList.remove('hidden');
      timeline2.style.display = 'block';
    } else {
      console.log('updateAnalysisUI: timeline2 not found');
    }

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
          console.log('DEBUG: typeof getUploadedImages =', typeof getUploadedImages);
          console.log('DEBUG: getUploadedImages関数 =', getUploadedImages);

          // API呼び出しラッパーを使用
          try {
            const promise = getUploadedImages();
            console.log('DEBUG: getUploadedImages()の戻り値 =', promise);
            console.log('DEBUG: isPromise?', promise instanceof Promise);

            promise
              .then(data => {
                console.log('DEBUG: API応答データ =', data);
                if (data.ok && data.images && data.images.length > 0) {
                  console.log('updateAnalysisUI: アップロード済み画像情報を取得しました:', data.images);
                  uploadedImagesData = data.images;
                  console.log('updateAnalysisUI: calling createAnalysisProgressPreviews with', uploadedImagesData.length, 'images');
                  createAnalysisProgressPreviews(uploadedImagesData);
                } else {
                  console.log('updateAnalysisUI: アップロード済み画像が見つかりません');
                }
              })
              .catch(error => {
                console.error('画像情報の取得エラー（詳細）:', error);
                console.error('エラースタック:', error.stack);
              });
          } catch (e) {
            console.error('getUploadedImages()呼び出しでエラー:', e);
            console.error('エラースタック:', e.stack);
          }
        } else {
          console.log('updateAnalysisUI: calling createAnalysisProgressPreviews with', uploadedImagesData.length, 'images');
          createAnalysisProgressPreviews(uploadedImagesData);
        }
      } else {
        console.log('updateAnalysisUI: 進捗バーは既に生成済み');
      }
    } else {
      console.log('updateAnalysisUI: コンテナが見つかりません');
    }

    // 進捗バーを実際の進捗値で更新
    let progressPercentage = progress || 0;
    console.log('updateAnalysisUI: 進捗を更新:', progressPercentage + '%');
    updateProgressBar(progressPercentage);
  }
}

// 進捗バー生成（再解析と同じ処理）
// createAnalysisProgressPreviews()は共通モジュール（upload-utils.js）を使用

// アップロード済み画像を取得（グローバル変数から取得）
function getLocalUploadedImages() {
  console.log('getLocalUploadedImages: 開始');

  // グローバル変数に保存された画像データを使用
  if (uploadedImagesData && uploadedImagesData.length > 0) {
    console.log('getLocalUploadedImages: グローバル変数から取得:', uploadedImagesData);
    return uploadedImagesData;
  }

  console.log('getLocalUploadedImages: グローバル変数が空のため、空配列を返します');
  return [];
}

// 進捗バー更新は共通モジュール（progress.js）のupdateProgressBar()とupdateProgressValue()を使用
function updateProgressBar(percentage) {
  console.log('updateProgressBar: 進捗更新開始', percentage);

  // 共通モジュールの関数を使用
  const progressBars = document.querySelectorAll('[data-analysis-progress-bar-pane]');
  progressBars.forEach(bar => {
    bar.style.width = `${percentage}%`;
    bar.setAttribute('aria-valuenow', percentage);

    // 色の変更
    if (percentage >= 100) {
      bar.classList.remove('progress-primary', 'progress-warning');
      bar.classList.add('progress-success');
    } else if (percentage > 0) {
      bar.classList.remove('progress-success', 'progress-warning');
      bar.classList.add('progress-primary');
    }
  });

  const progressValues = document.querySelectorAll('[data-analysis-progress-bar-value]');
  progressValues.forEach(value => {
    value.textContent = Math.round(percentage);
  });
}

// CSRFトークン取得
// getCSRFToken()は共通ユーティリティ（utils.js）を使用

// 各画像の個別進捗を更新
function updateIndividualImagesProgress() {
  // グローバル変数から画像IDを取得
  if (!uploadedImagesData || uploadedImagesData.length === 0) {
    console.log('個別進捗更新: アップロード済み画像データがありません');
    return;
  }

  const imageIds = uploadedImagesData.map(img => img.id);
  console.log('個別進捗更新: 画像ID =', imageIds);

  // ステータスを一括取得
  fetch(`/v2/api/images/status/?image_ids=${imageIds.join(',')}`)
    .then(response => response.json())
    .then(data => {
      console.log('個別ステータスレスポンス:', data);
      if (data.ok && data.statuses) {
        uploadedImagesData.forEach(image => {
          const statusInfo = data.statuses[image.id];
          if (statusInfo) {
            console.log(`画像 ${image.id} のステータス:`, statusInfo);
            updateSingleImageProgress(image.id, statusInfo);
          }
        });
      }
    })
    .catch(error => {
      console.error('個別ステータス取得エラー:', error);
    });
}

// 個別画像の進捗バーを更新
function updateSingleImageProgress(imageId, statusInfo) {
  const progressBar = document.querySelector(`[data-analysis-progress-bar-pane="${imageId}"]`);
  const progressValueEl = document.querySelector(`[data-analysis-progress-bar-value="${imageId}"]`);
  const statusTextEl = document.querySelector(`[data-analysis-file-size="${imageId}"]`);

  if (!progressBar) {
    console.log(`画像 ${imageId} の進捗バーが見つかりません`);
    return;
  }

  console.log(`画像 ${imageId} のステータス更新:`, statusInfo.status);

  // ステータスに応じて進捗を設定
  if (statusInfo.status === 'completed') {
    progressBar.style.width = '100%';
    if (progressValueEl) progressValueEl.textContent = '100';
    progressBar.className = 'progress-bar progress-success transition-all duration-500';
    if (statusTextEl) statusTextEl.textContent = '解析完了';
  } else if (statusInfo.status === 'analyzing') {
    // 解析中は50-90%の範囲で徐々に増加
    const currentWidth = parseInt(progressBar.style.width) || 50;
    const newWidth = Math.min(90, currentWidth + 10);
    progressBar.style.width = newWidth + '%';
    if (progressValueEl) progressValueEl.textContent = newWidth.toString();
    progressBar.className = 'progress-bar progress-info transition-all duration-500';
    if (statusTextEl) statusTextEl.textContent = '解析中';
  } else if (statusInfo.status === 'preparing') {
    // 準備中は10-30%の範囲
    const currentWidth = parseInt(progressBar.style.width) || 10;
    const newWidth = Math.min(30, currentWidth + 5);
    progressBar.style.width = newWidth + '%';
    if (progressValueEl) progressValueEl.textContent = newWidth.toString();
    progressBar.className = 'progress-bar progress-warning transition-all duration-500';
    if (statusTextEl) statusTextEl.textContent = '準備中';
  }
}

