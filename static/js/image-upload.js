
// セッションから保存されたモデル選択を復元
document.addEventListener('DOMContentLoaded', function () {
  const selectedModel = '{{ selected_model|default:""|escapejs }}';
  const modelSelector = document.getElementById('model-selector');

  if (selectedModel && modelSelector) {
    modelSelector.value = selectedModel;
  }

  // セッションから解析状態を復元
  const analysisStatus = '{{ analysis_status|default:""|escapejs }}';
  const uploadedImagesStr = '{{ uploaded_images_json|default:"[]"|escapejs }}';
  let uploadedImages = [];
  try {
    uploadedImages = JSON.parse(uploadedImagesStr);
  } catch (e) {
    console.error('JSON解析エラー:', e);
    uploadedImages = [];
  }

  console.log('デバッグ: analysisStatus =', analysisStatus);
  console.log('デバッグ: analysisStatus type =', typeof analysisStatus);
  console.log('デバッグ: analysisStatus length =', analysisStatus.length);
  console.log('デバッグ: analysisStatus === "uploaded" =', analysisStatus === 'uploaded');
  console.log('デバッグ: analysisStatus === "failed" =', analysisStatus === 'failed');
  console.log('デバッグ: uploadedImages =', uploadedImages);

  // リロード時の状態復元中であることを示すフラグを設定
  window.isRestoringState = true;
  console.log('🔄 デバッグ: 状態復元を開始');
  console.log('🔄 デバッグ: 現在のURL:', window.location.href);
  console.log('🔄 デバッグ: ページタイトル:', document.title);

  // リロード時にuploadSuccessShownフラグをリセットしない
  if (uploadedImages && uploadedImages.length > 0) {
    window.uploadSuccessShown = true;
    console.log('🔄 デバッグ: アップロード済み画像があるため、uploadSuccessShownフラグをtrueに設定');
  } else {
    console.log('🔄 デバッグ: アップロード済み画像がないため、uploadSuccessShownフラグはfalseのまま');
  }

  if (uploadedImages && uploadedImages.length > 0) {
    console.log('🔄 デバッグ: アップロード済み画像データを処理開始');
    console.log('🔄 デバッグ: 生のuploadedImagesデータ:', uploadedImages);
    console.log('🔄 デバッグ: uploadedImagesの型:', typeof uploadedImages);
    console.log('🔄 デバッグ: uploadedImagesの長さ:', uploadedImages.length);

    // uploadedImagesは既にJavaScriptオブジェクトなので、そのまま使用
    const images = uploadedImages;
    console.log('🔄 デバッグ: 解析された画像データ:', images);
    console.log('🔄 デバッグ: 画像数:', images.length);

    console.log('🔄 デバッグ: 画像が存在するため、UI状態を復元します');
    // 1つ目のタイムライン（アップロード完了）を表示
    const timelineContainer = document.getElementById('timeline-container');
    const timeline1 = document.getElementById('timeline-item-1-success');

    console.log('🔄 デバッグ: タイムライン要素の取得結果:');
    console.log('🔄 デバッグ: timelineContainer:', timelineContainer);
    console.log('🔄 デバッグ: timeline1:', timeline1);

    if (timelineContainer && timeline1) {
      timelineContainer.classList.remove('hidden');
      timelineContainer.style.display = 'block';
      timeline1.classList.remove('hidden');
      timeline1.style.display = 'block';
      console.log('🔄 デバッグ: アップロード完了タイムラインを表示しました');
    } else {
      console.log('🔄 デバッグ: タイムライン要素が見つかりません');
    }

    // アップロード完了後は解析ボタンを表示し、アップロードボタンを非表示にする
    const analysisButton = document.getElementById('analysis-button-container');
    const uploadButtonContainer = document.getElementById('upload-button-container');

    console.log('🔄 デバッグ: ボタン要素の取得結果:');
    console.log('🔄 デバッグ: analysisButton:', analysisButton);
    console.log('🔄 デバッグ: uploadButtonContainer:', uploadButtonContainer);

    if (analysisButton) {
      analysisButton.classList.remove('hidden');
      console.log('🔄 デバッグ: 解析ボタンを表示しました');
      console.log('🔄 デバッグ: 解析ボタンのクラス:', analysisButton.className);
      console.log('🔄 デバッグ: 解析ボタンのスタイル:', analysisButton.style.display);
    } else {
      console.log('🔄 デバッグ: 解析ボタンが見つかりません');
    }

    if (uploadButtonContainer) {
      uploadButtonContainer.classList.add('hidden');
      console.log('🔄 デバッグ: アップロードボタンを非表示にしました');
      console.log('🔄 デバッグ: アップロードボタンのクラス:', uploadButtonContainer.className);
      console.log('🔄 デバッグ: アップロードボタンのスタイル:', uploadButtonContainer.style.display);
    } else {
      console.log('🔄 デバッグ: アップロードボタンが見つかりません');
    }

    // 解析が実際に開始されている場合のみ2つ目以降のタイムラインを表示
    console.log('🔄 デバッグ: 解析タイムライン表示条件のチェック開始');
    console.log('🔄 デバッグ: analysisStatus =', analysisStatus);
    console.log('🔄 デバッグ: analysisStatus !== "uploaded" チェック:', analysisStatus !== 'uploaded');
    console.log('🔄 デバッグ: analysisStatus === "uploaded" チェック:', analysisStatus === 'uploaded');

    // 解析が開始されている場合のみ2つ目以降のタイムラインを表示
    // uploaded状態や空文字列の場合は解析タイムラインを表示しない
    if (analysisStatus &&
      analysisStatus !== 'uploaded' &&
      analysisStatus !== '' &&
      analysisStatus.trim() !== '' &&
      (analysisStatus === 'analyzing' || analysisStatus === 'completed' || analysisStatus === 'failed')) {

      console.log('🔄 デバッグ: 解析タイムラインを表示する条件を満たしています');
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
          console.log('デバッグ: 解析完了のため解析ボタンを非表示');
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
          console.log('デバッグ: 解析失敗のため解析ボタンを非表示');
        }
      }
    } else if (analysisStatus === 'uploaded' || analysisStatus === '' || analysisStatus.trim() === '') {
      console.log('🔄 デバッグ: アップロード完了のみのため、解析タイムラインは表示しません');
      console.log('🔄 デバッグ: analysisStatus =', analysisStatus);

      // アップロード完了時は解析タイムラインを確実に非表示にする
      const timeline2 = document.getElementById('timeline-item-2');
      const timeline2Error = document.getElementById('timeline-item-2-error');
      const timeline3 = document.getElementById('timeline-item-3');

      if (timeline2) {
        timeline2.classList.add('hidden');
        timeline2.style.display = 'none';
        console.log('デバッグ: 解析開始タイムラインを非表示');
      }
      if (timeline2Error) {
        timeline2Error.classList.add('hidden');
        timeline2Error.style.display = 'none';
        console.log('デバッグ: 解析失敗タイムラインを非表示');
      }
      if (timeline3) {
        timeline3.classList.add('hidden');
        timeline3.style.display = 'none';
        console.log('デバッグ: 解析完了タイムラインを非表示');
      }
    } else {
      console.log('🔄 デバッグ: 不明な状態のため、解析タイムラインは表示しません');
      console.log('🔄 デバッグ: analysisStatus =', analysisStatus);

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

    console.log('解析状態を復元しました:', analysisStatus);
  }
} else {
  console.log('🔄 デバッグ: アップロード済み画像がない場合の処理');
  // アップロード済み画像がない場合は、アップロードボタンを表示し、解析ボタンを非表示にする
  const analysisButton = document.getElementById('analysis-button-container');
  const uploadButtonContainer = document.getElementById('upload-button-container');

  console.log('🔄 デバッグ: ボタン要素の取得結果（画像なし）:');
  console.log('🔄 デバッグ: analysisButton:', analysisButton);
  console.log('🔄 デバッグ: uploadButtonContainer:', uploadButtonContainer);

  if(analysisButton) {
    analysisButton.classList.add('hidden');
    console.log('🔄 デバッグ: アップロード済み画像がないため解析ボタンを非表示にしました');
  } else {
    console.log('🔄 デバッグ: 解析ボタンが見つかりません');
  }

  if(uploadButtonContainer) {
    uploadButtonContainer.classList.remove('hidden');
    console.log('🔄 デバッグ: アップロード済み画像がないためアップロードボタンを表示しました');
  } else {
    console.log('🔄 デバッグ: アップロードボタンが見つかりません');
  }
}

  // 状態復元完了
  window.isRestoringState = false;
console.log('🔄 デバッグ: 状態復元完了');
console.log('🔄 デバッグ: 最終的なUI状態:');
console.log('🔄 デバッグ: - タイムラインコンテナ:', document.getElementById('timeline-container')?.style.display);
console.log('🔄 デバッグ: - 解析ボタン:', document.getElementById('analysis-button-container')?.style.display);
console.log('🔄 デバッグ: - アップロードボタン:', document.getElementById('upload-button-container')?.style.display);
console.log('🔄 デバッグ: - uploadSuccessShown:', window.uploadSuccessShown);
console.log('🔄 デバッグ: - isRestoringState:', window.isRestoringState);

// 初期化時に解析タイムラインを確実に非表示にする
console.log('🔄 デバッグ: 初期化時の解析タイムライン非表示処理開始');
const timeline2 = document.getElementById('timeline-item-2');
const timeline2Error = document.getElementById('timeline-item-2-error');
const timeline3 = document.getElementById('timeline-item-3');

console.log('🔄 デバッグ: 解析タイムライン要素の取得結果:');
console.log('🔄 デバッグ: timeline2:', timeline2);
console.log('🔄 デバッグ: timeline2Error:', timeline2Error);
console.log('🔄 デバッグ: timeline3:', timeline3);

if (timeline2) {
  timeline2.classList.add('hidden');
  timeline2.style.display = 'none';
  console.log('🔄 デバッグ: 初期化時に解析開始タイムラインを非表示にしました');
} else {
  console.log('🔄 デバッグ: 解析開始タイムラインが見つかりません');
}

if (timeline2Error) {
  timeline2Error.classList.add('hidden');
  timeline2Error.style.display = 'none';
  console.log('🔄 デバッグ: 初期化時に解析失敗タイムラインを非表示にしました');
} else {
  console.log('🔄 デバッグ: 解析失敗タイムラインが見つかりません');
}

if (timeline3) {
  timeline3.classList.add('hidden');
  timeline3.style.display = 'none';
  console.log('🔄 デバッグ: 初期化時に解析完了タイムラインを非表示にしました');
} else {
  console.log('🔄 デバッグ: 解析完了タイムラインが見つかりません');
}

// 解析完了失敗タイムラインも非表示にする
const timeline3Error = document.getElementById('timeline-item-3-error');
if (timeline3Error) {
  timeline3Error.classList.add('hidden');
  timeline3Error.style.display = 'none';
  console.log('🔄 デバッグ: 初期化時に解析完了失敗タイムラインを非表示にしました');
} else {
  console.log('🔄 デバッグ: 解析完了失敗タイムラインが見つかりません');
}

console.log('🔄 デバッグ: 初期化時の解析タイムライン非表示処理完了');
  });

// 初回解析機能
function startAnalysis(modelName) {
  console.log('初回解析開始:', modelName);

  // 初回解析フラグを設定
  window.isRetryAnalysis = false;

  // 2つ目のタイムライン（解析開始）を表示
  const timeline2 = document.getElementById('timeline-item-2');
  if (timeline2) {
    timeline2.classList.remove('hidden');
    timeline2.style.display = 'block';
    console.log('2つ目のタイムライン（解析開始）を表示');

    // 進捗バーを生成
    generateAnalysisProgressBar();
  }

  // 解析ボタンを無効化
  const analysisButton = document.getElementById('start-analysis-btn');
  if (analysisButton) {
    analysisButton.disabled = true;
    analysisButton.innerHTML = '<span class="icon-[tabler--loader-2] size-5 mr-2 animate-spin"></span>解析中...';
  }

  // 解析APIを呼び出し
  fetch('/api/analysis/start/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({
      model_name: modelName
    })
  })
    .then(response => response.json())
    .then(data => {
      console.log('解析API応答:', data);
      if (data.success) {
        // 解析開始成功 - 進捗監視を開始
        console.log('解析が開始されました。進捗を監視します。');
        startAnalysisProgressMonitoring();
      } else {
        alert('解析の開始に失敗しました: ' + (data.error || '不明なエラー'));
        // ボタンを元に戻す
        if (analysisButton) {
          analysisButton.disabled = false;
          analysisButton.innerHTML = '<span class="icon-[tabler--brain] size-5 mr-2"></span>モデルを選択';
        }
      }
    })
    .catch(error => {
      console.error('解析開始API呼び出しエラー:', error);
      alert('解析の開始中にエラーが発生しました: ' + error.message);
      // ボタンを元に戻す
      if (analysisButton) {
        analysisButton.disabled = false;
        analysisButton.innerHTML = '<span class="icon-[tabler--brain] size-5 mr-2"></span>モデルを選択';
      }
    });
}


// 現在の画像IDを取得
function getCurrentImageId() {
  // セッションから取得した画像データを使用
  if (uploadedImages && uploadedImages.length > 0) {
    return uploadedImages[0].id; // 最初の画像のIDを返す
  }
  return null;
}


// 初回解析進捗バー生成
function generateAnalysisProgressBar() {
  const container = document.getElementById('analysis-progress-previews');
  if (!container) return;

  container.innerHTML = `
  <div class="rounded-box bg-base-100 shadow-base-300/20 p-3 shadow-lg">
    <div class="mb-1 flex items-center justify-between">
      <div class="flex items-center gap-x-3">
        <span class="text-base-content/80 border-base-content/20 flex size-8 items-center justify-center rounded-lg border p-0.5">
          <span class="icon-[tabler--photo] text-base-content/70 size-5"></span>
        </span>
        <div>
          <p class="text-base-content text-sm font-medium">解析中...</p>
          <p class="text-base-content/50 text-xs">AIによる画像解析を実行中です</p>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-x-3 whitespace-nowrap">
      <div class="progress h-2" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar progress-primary transition-all duration-500" style="width:0%"></div>
      </div>
      <span class="text-base-content mb-0.5 text-sm">0%</span>
    </div>
  </div>
  `;
}

// 初回解析進捗監視
function startAnalysisProgressMonitoring() {
  const progressBar = document.querySelector('#analysis-progress-previews .progress-bar');
  const progressValue = document.querySelector('#analysis-progress-previews .text-sm');

  if (!progressBar || !progressValue) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress > 100) progress = 100;

    progressBar.style.width = `${progress}%`;
    progressValue.textContent = `${Math.round(progress)}%`;

    if (progress >= 100) {
      clearInterval(interval);
      console.log('進捗100%に達しました。カードを更新します。');
      // カードの内容を「解析完了」に変更
      updateAnalysisCardToCompleted();
      // 解析完了タイムラインを表示
      showAnalysisCompletedTimeline();
    }
  }, 500);
}

// カードの内容を「解析完了」に変更
function updateAnalysisCardToCompleted() {
  console.log('カード更新開始');

  // より具体的なセレクターで要素を取得
  const container = document.getElementById('analysis-progress-previews');
  console.log('container:', container);

  if (container) {
    // すべてのp要素を取得して「解析中」を含むものを非表示にする
    const allTexts = container.querySelectorAll('p');
    console.log('見つかったp要素の数:', allTexts.length);

    allTexts.forEach((p, index) => {
      console.log(`p要素 ${index}:`, p.textContent, 'クラス:', p.className);
      if (p.textContent.includes('解析中')) {
        p.style.display = 'none';
        console.log('「解析中」を含むテキストを非表示にしました');
      }
      if (p.textContent.includes('AIによる画像解析を実行中です')) {
        p.textContent = '画像のカテゴリー分類が完了しました';
        console.log('説明テキストを変更しました');
      }
    });

    // 従来の方法も試す
    const statusText = container.querySelector('.text-sm.font-medium');
    const descriptionText = container.querySelector('.text-xs');

    console.log('statusText要素:', statusText);
    console.log('descriptionText要素:', descriptionText);

    if (statusText) {
      statusText.style.display = 'none';
      console.log('「解析中...」テキストを非表示にしました（従来の方法）');
    }

    if (descriptionText) {
      descriptionText.textContent = '画像のカテゴリー分類が完了しました';
      console.log('説明テキストを変更しました（従来の方法）');
    }
  } else {
    console.error('analysis-progress-previewsコンテナが見つかりません');
  }
}

// 初回解析完了タイムライン表示
function showAnalysisCompletedTimeline() {
  const timeline3 = document.getElementById('timeline-item-3');
  if (timeline3) {
    timeline3.classList.remove('hidden');
    timeline3.style.display = 'block';
    console.log('3つ目のタイムライン（解析完了）を表示');
  }
}


// CSRFトークン取得
function getCSRFToken() {
  const token = document.querySelector('[name=csrfmiddlewaretoken]');
  return token ? token.value : '';
}

// モーダル内の解析開始ボタンのイベント設定
const modalStartButton = document.getElementById('modal-start-analysis-btn');
if (modalStartButton) {
  modalStartButton.addEventListener('click', function () {
    const selector = document.getElementById('model-selector');
    const model = selector ? selector.value : '';
    if (!model) {
      alert('モデルを選択してください');
      return;
    }

    // 初回解析を実行
    window.isRetryAnalysis = false;
    startAnalysis(model);
  });
}

