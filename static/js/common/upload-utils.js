/**
 * アップロード関連のユーティリティ関数
 */

/**
 * 解析進捗プレビューを生成
 * アップロード済み画像の解析進捗を表示するUIを生成
 * @param {Array} uploadedImages - アップロード済み画像の配列
 * @param {string} containerId - プレビューを表示するコンテナID（デフォルト: 'analysis-progress-previews'）
 */
function createAnalysisProgressPreviews(uploadedImages, containerId = 'analysis-progress-previews') {
  console.log('createAnalysisProgressPreviews: 開始');

  const container = document.getElementById(containerId);
  if (!container) {
    console.log('createAnalysisProgressPreviews: コンテナが見つかりません:', containerId);
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

  console.log('createAnalysisProgressPreviews: プレビュー生成完了');
}

/**
 * タイムラインアイテムの表示/非表示を切り替え
 * @param {string} itemId - タイムラインアイテムのID
 * @param {boolean} show - 表示するかどうか
 * @param {string} className - 設定するクラス名（オプション）
 */
function toggleTimelineItem(itemId, show, className = '') {
  const item = document.getElementById(itemId);
  if (item) {
    if (show) {
      item.className = className;
      item.style.display = 'block';
    } else {
      item.classList.add('hidden');
      item.style.display = 'none';
    }
  }
}

/**
 * タイムラインコンテナの表示/非表示を切り替え
 * @param {boolean} show - 表示するかどうか
 */
function toggleTimelineContainer(show) {
  const container = document.getElementById('timeline-container');
  if (container) {
    if (show) {
      container.classList.remove('hidden');
      container.style.display = 'block';
    } else {
      container.classList.add('hidden');
      container.style.display = 'none';
    }
  }
}

/**
 * タイムラインの説明テキストを更新
 * @param {string} elementId - 説明要素のID
 * @param {string} text - 設定するテキスト
 */
function updateTimelineDescription(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

