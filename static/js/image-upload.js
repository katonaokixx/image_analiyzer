// グローバル変数
let progressInterval = null;

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
  } catch (e) {
    console.error('JSON解析エラー:', e);
    uploadedImages = [];
  }

  // リロード時の状態復元中であることを示すフラグを設定
  window.isRestoringState = true;

  // リロード時にuploadSuccessShownフラグをリセットしない
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
      startAnalysis(model);
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
      if (data.success) {
        // アップロード成功
        window.uploadSuccessShown = true;

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
        displayUploadedImages(data.uploaded_images);

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
function startAnalysis(model) {
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

  fetch('/v2/api/analysis/start/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': csrfToken
    },
    body: new URLSearchParams({
      model: model
    })
  })
    .then(response => response.json())
    .then(data => {
      console.log('解析開始API応答:', data);
      if (data.success) {
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
    fetch('/v2/api/analysis/progress/')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('進捗データ:', data);
        console.log('進捗ステータス:', data.status);
        console.log('進捗パーセンテージ:', data.progress_percentage);

        if (data.status === 'completed') {
          console.log('進捗監視: 完了ステータス検出');
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

          // v1と同様に進捗説明も更新
          const progressDescription = document.querySelector('#timeline-item-2 .text-xs');
          if (progressDescription && data.step_description) {
            progressDescription.textContent = data.step_description;
          }
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

    // 進捗バーを生成（再解析と同じ処理）
    const uploadedImages = getUploadedImages();
    console.log('updateAnalysisUI: calling createAnalysisProgressPreviews with', uploadedImages.length, 'images');
    createAnalysisProgressPreviews(uploadedImages);

    // 進捗バーを実際の進捗値で更新
    let progressPercentage = progress || 0;
    console.log('updateAnalysisUI: 進捗を更新:', progressPercentage + '%');
    updateProgressBar(progressPercentage);
  }
}

// 進捗バー生成（再解析と同じ処理）
function createAnalysisProgressPreviews(uploadedImages) {
  console.log('createAnalysisProgressPreviews: 開始');

  const container = document.getElementById('analysis-progress-previews');
  if (!container) {
    console.log('createAnalysisProgressPreviews: コンテナが見つかりません');
    return;
  }
  console.log('createAnalysisProgressPreviews: コンテナが見つかりました');

  console.log('createAnalysisProgressPreviews: アップロード済み画像数:', uploadedImages.length);
  if (uploadedImages.length === 0) {
    console.log('createAnalysisProgressPreviews: アップロード済み画像がありません');
    return;
  }

  container.innerHTML = '';
  console.log('createAnalysisProgressPreviews: コンテナをクリアしました');

  uploadedImages.forEach((image, index) => {
    // ファイル名と拡張子を分離
    const lastDot = image.filename.lastIndexOf('.');
    const filename = lastDot > 0 ? image.filename.substring(0, lastDot) : image.filename;
    const fileExt = lastDot > 0 ? image.filename.substring(lastDot + 1) : '';

    // 進捗アイテムを生成
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

// アップロード済み画像を取得（v1のロジックを完全に移植）
function getUploadedImages() {
  console.log('getUploadedImages: 開始');

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

  console.log('getUploadedImages: 画像要素数:', imageElements.length);

  imageElements.forEach((element, index) => {
    // ファイル名を取得（実際の要素から直接取得）
    const filenameElement = element.querySelector('[data-file-upload-file-name]');
    const fileExtElement = element.querySelector('[data-file-upload-file-ext]');

    let filename = filenameElement ? filenameElement.textContent.trim() : '';
    let fileExt = fileExtElement ? fileExtElement.textContent.trim() : '';

    // ファイル名が空の場合は、要素の属性から取得を試行
    if (!filename) {
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

    console.log(`getUploadedImages: 画像${index + 1}:`, {
      filename: fullFilename,
      thumbnailUrl: thumbnailUrl,
      status: status
    });

    uploadedImages.push({
      id: `image${index + 1}`,
      filename: fullFilename,
      thumbnail_url: thumbnailUrl,
      status: status
    });
  });

  console.log('getUploadedImages: 結果:', uploadedImages);
  return uploadedImages;
}

// 進捗バー更新
function updateProgressBar(percentage) {
  console.log('updateProgressBar: 進捗更新開始', percentage);

  // 生成された進捗バーを更新
  const progressBars = document.querySelectorAll('[data-analysis-progress-bar-pane]');
  const progressValues = document.querySelectorAll('[data-analysis-progress-bar-value]');

  console.log('updateProgressBar: 進捗バー要素数:', progressBars.length);
  console.log('updateProgressBar: 進捗値要素数:', progressValues.length);

  progressBars.forEach((progressBar, index) => {
    console.log(`updateProgressBar: 進捗バー${index + 1}を更新:`, percentage + '%');
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);

    // v1と同様に色を変更
    if (percentage >= 100) {
      progressBar.classList.remove('progress-primary', 'progress-warning');
      progressBar.classList.add('progress-success');
    } else if (percentage > 0) {
      progressBar.classList.remove('progress-success', 'progress-warning');
      progressBar.classList.add('progress-primary');
    }
  });

  progressValues.forEach((progressValue, index) => {
    console.log(`updateProgressBar: 進捗値${index + 1}を更新:`, Math.round(percentage));
    progressValue.textContent = Math.round(percentage);
  });
}

// CSRFトークン取得
function getCSRFToken() {
  // 複数の方法でCSRFトークンを取得
  let token = document.querySelector('[name=csrfmiddlewaretoken]');
  if (token) {
    return token.value;
  }

  // Cookieから取得
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }

  // メタタグから取得
  token = document.querySelector('meta[name=csrf-token]');
  if (token) {
    return token.getAttribute('content');
  }

  console.warn('CSRFトークンが見つかりません');
  return '';
}

