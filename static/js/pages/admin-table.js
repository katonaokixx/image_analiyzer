/**
 * 管理者画像テーブル用JavaScript
 * templates/admin/admin_image_table.html から抽出
 */

// Function to reset all filters
function resetAllFilters() {
  console.log('Resetting all filters...');

  // Reset search input
  const searchInput = document.getElementById('exampleDataList');
  if (searchInput) {
    searchInput.value = '';
  }

  // Reset date sort
  const dateSort = document.getElementById('dateSort');
  if (dateSort) {
    dateSort.selectedIndex = 0; // Select first option
  }

  // Reset status filter
  const statusFilter = document.getElementById('selectFloating');
  if (statusFilter) {
    statusFilter.selectedIndex = 0; // Select first option
  }

  // Reset user filter
  const userFilter = document.getElementById('userFilter');
  if (userFilter) {
    userFilter.selectedIndex = 0; // Select first option
  }

  // Reset model filter
  const modelFilter = document.getElementById('modelFilter');
  if (modelFilter) {
    modelFilter.selectedIndex = 0; // Select first option
  }

  // Reset label filter
  const labelFilter = document.getElementById('labelFilter');
  if (labelFilter) {
    labelFilter.selectedIndex = 0; // Select first option
  }

  // Reset confidence filter
  const confidenceFilter = document.getElementById('confidenceFilter');
  if (confidenceFilter) {
    confidenceFilter.selectedIndex = 0; // Select first option
  }

  // Apply filters after reset
  applyFilters();
  console.log('All filters have been reset');
}

// Function to apply filters
function applyFilters() {
  const searchTerm = document.getElementById('exampleDataList').value.toLowerCase();
  const statusFilter = document.getElementById('selectFloating').value;
  const userFilter = document.getElementById('userFilter').value;
  const modelFilter = document.getElementById('modelFilter').value;
  const labelFilter = document.getElementById('labelFilter').value;
  const confidenceFilter = document.getElementById('confidenceFilter').value;
  const dateSort = document.getElementById('dateSort').value;

  const rows = document.querySelectorAll('tbody tr[data-image-id]');
  let visibleCount = 0;

  // First, collect all rows and their data for sorting
  const rowData = [];
  rows.forEach(row => {
    let showRow = true;

    // Search filter
    if (searchTerm) {
      const filename = row.querySelector('.font-medium').textContent.toLowerCase();
      if (!filename.includes(searchTerm)) {
        showRow = false;
      }
    }

    // Status filter
    if (statusFilter !== 'すべて') {
      const statusBadge = row.querySelector('.badge');
      const statusText = statusBadge.textContent.trim();
      if (statusFilter === 'アップロード完了' && statusText !== 'アップロード完了') showRow = false;
      if (statusFilter === '解析成功' && statusText !== '解析成功') showRow = false;
      if (statusFilter === '解析中' && statusText !== '解析中') showRow = false;
      if (statusFilter === '準備中' && statusText !== '準備中') showRow = false;
      if (statusFilter === '失敗' && statusText !== '失敗') showRow = false;
    }

    // User filter
    if (userFilter !== 'すべて') {
      const username = row.querySelector('td:first-child .font-medium').textContent.trim();
      if (username !== userFilter) showRow = false;
    }

    // Model filter
    if (modelFilter !== 'すべて') {
      const modelBadge = row.querySelector('td:nth-child(10) .badge');
      if (modelBadge) {
        const modelText = modelBadge.textContent.trim();
        // データベースの値と表示名の対応
        const modelMapping = {
          'resnet50': 'PyTorch ResNet-50',
          'vgg16': 'PyTorch VGG-16',
          'mobilenet': 'PyTorch MobileNet',
          'clip': 'CLIP'
        };
        const expectedDisplayName = modelMapping[modelText] || modelText;
        if (expectedDisplayName !== modelFilter) showRow = false;
      } else {
        showRow = false;
      }
    }

    // Label filter
    if (labelFilter !== 'すべて') {
      const labelCell = row.querySelector('td:nth-child(5)'); // ラベル列
      if (labelCell) {
        const labelText = labelCell.textContent.trim();
        if (!labelText.includes(labelFilter)) {
          showRow = false;
        }
      } else {
        showRow = false; // ラベルがない場合は非表示
      }
    }

    // Confidence filter
    if (confidenceFilter !== 'すべて') {
      const confidenceCell = row.querySelector('td:nth-child(6)'); // 信頼度列
      if (confidenceCell) {
        const confidenceText = confidenceCell.textContent.trim();
        const confidenceValue = parseFloat(confidenceText.replace('%', ''));

        if (confidenceFilter === '90%以上' && confidenceValue < 90) showRow = false;
        else if (confidenceFilter === '80-89%' && (confidenceValue < 80 || confidenceValue >= 90)) showRow = false;
        else if (confidenceFilter === '70-79%' && (confidenceValue < 70 || confidenceValue >= 80)) showRow = false;
        else if (confidenceFilter === '60-69%' && (confidenceValue < 60 || confidenceValue >= 70)) showRow = false;
        else if (confidenceFilter === '60%未満' && confidenceValue >= 60) showRow = false;
      } else {
        showRow = false; // 信頼度がない場合は非表示
      }
    }

    if (showRow) {
      // Get upload date for sorting (3rd column in admin table)
      const uploadDateText = row.querySelector('td:nth-child(3)').textContent.trim();
      const uploadDate = new Date(uploadDateText);

      // Get confidence for sorting
      const confidenceCell = row.querySelector('td:nth-child(6)');
      const confidenceValue = confidenceCell ? parseFloat(confidenceCell.textContent.replace('%', '')) : 0;

      // Get label for sorting
      const labelCell = row.querySelector('td:nth-child(5)');
      const labelText = labelCell ? labelCell.textContent.trim() : '';

      rowData.push({
        row: row,
        uploadDate: uploadDate,
        uploadDateText: uploadDateText,
        confidence: confidenceValue,
        label: labelText
      });
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });

  // Apply sorting based on multiple criteria
  console.log('複合ソート適用:', { dateSort, labelFilter, confidenceFilter });

  rowData.sort((a, b) => {
    // Primary sort: Label (if label filter is active)
    if (labelFilter !== 'すべて') {
      const labelA = a.label.toLowerCase();
      const labelB = b.label.toLowerCase();
      if (labelA !== labelB) {
        return labelA.localeCompare(labelB);
      }
    }

    // Secondary sort: Confidence (if confidence filter is active)
    if (confidenceFilter !== 'すべて') {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence; // Higher confidence first
      }
    }

    // Tertiary sort: Date
    if (dateSort === '古い順') {
      return a.uploadDate - b.uploadDate;
    } else if (dateSort === '新しい順') {
      return b.uploadDate - a.uploadDate;
    }

    // Default: upload date (newest first)
    return b.uploadDate - a.uploadDate;
  });

  // Reorder and show rows
  const tbody = document.querySelector('tbody');
  if (tbody) {
    // Remove existing rows
    rowData.forEach(item => {
      item.row.remove();
    });

    // Add rows in sorted order
    rowData.forEach(item => {
      item.row.style.display = '';
      tbody.appendChild(item.row);
    });
  }

  // Update pagination info
  const paginationInfo = document.querySelector('.text-sm.text-base-content\\/80');
  if (paginationInfo) {
    paginationInfo.innerHTML = `<span class="font-semibold">${visibleCount}</span> 件の画像を表示中`;
  }

  // Show "no results" message if no rows are visible
  let noResultsRow = tbody.querySelector('.no-results-row');

  console.log('検索結果チェック:', { visibleCount, totalRows: rows.length, hasNoResultsRow: !!noResultsRow });

  if (visibleCount === 0 && rows.length > 0) {
    console.log('検索結果なしメッセージを表示');
    if (!noResultsRow) {
      noResultsRow = document.createElement('tr');
      noResultsRow.className = 'no-results-row';
      noResultsRow.innerHTML = `
          <td colspan="8" class="text-center py-8">
            <div class="text-gray-500">
              <span class="icon-[tabler--search] size-8 mx-auto mb-2 block"></span>
              検索条件に一致する画像が見つかりません
            </div>
          </td>
        `;
      tbody.appendChild(noResultsRow);
      console.log('検索結果なしメッセージを追加');
    }
    noResultsRow.style.display = '';
  } else if (noResultsRow) {
    console.log('検索結果なしメッセージを非表示');
    noResultsRow.style.display = 'none';
  }
}

// Add event listeners for filters
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('exampleDataList');
  const filters = document.querySelectorAll('select');

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // Filter selects
  filters.forEach(filter => {
    filter.addEventListener('change', applyFilters);
  });
});

// モーダルに画像データを設定する関数
function openImageModal(filename, imageSrc, uploadTime, username, status, analysisStart, analysisEnd, model, labels, confidence) {
  // モーダルの内容を設定
  document.getElementById('modal-filename').textContent = filename;
  document.getElementById('modal-image').src = imageSrc;
  document.getElementById('modal-image').alt = filename;
  document.getElementById('modal-upload-time').textContent = uploadTime;
  document.getElementById('modal-username').textContent = username;
  // ステータスバッジの設定
  const statusBadge = document.getElementById('modal-status-badge');
  console.log('Status value:', status); // デバッグ用
  statusBadge.textContent = status;

  // ステータスに応じてバッジの色を設定
  if (status === '解析成功') {
    statusBadge.className = 'badge badge-outline border-dashed badge-success me-2';
    console.log('Set success badge'); // デバッグ用
  } else if (status === '解析中') {
    statusBadge.className = 'badge badge-outline border-dashed badge-info me-2';
    console.log('Set info badge'); // デバッグ用
  } else if (status === 'アップロード完了') {
    statusBadge.className = 'badge badge-outline border-dashed badge-warning me-2';
    console.log('Set warning badge'); // デバッグ用
  } else if (status === '準備中') {
    statusBadge.className = 'badge badge-outline border-dashed badge-secondary me-2';
    console.log('Set secondary badge'); // デバッグ用
  } else if (status === '失敗') {
    statusBadge.className = 'badge badge-outline border-dashed badge-error me-2';
    console.log('Set error badge'); // デバッグ用
  } else {
    statusBadge.className = 'badge badge-outline border-dashed me-2';
    console.log('Set default badge, status was:', status); // デバッグ用
  }
  document.getElementById('modal-analysis-start').textContent = analysisStart;
  document.getElementById('modal-analysis-end').textContent = analysisEnd;

  // モデル名の表示名変換
  const modelDisplayMapping = {
    'resnet50': 'PyTorch ResNet-50',
    'vgg16': 'PyTorch VGG-16',
    'mobilenet': 'PyTorch MobileNet',
    'clip': 'CLIP'
  };
  const displayModel = modelDisplayMapping[model] || model;
  document.getElementById('modal-model').textContent = displayModel;

  // ラベル
  const labelsContainer = document.getElementById('modal-labels');
  labelsContainer.innerHTML = '';
  if (labels && labels.length > 0) {
    labels.forEach(label => {
      const badge = document.createElement('span');
      badge.className = 'badge badge-primary';
      badge.textContent = label;
      labelsContainer.appendChild(badge);
    });
  } else {
    labelsContainer.innerHTML = '<span class="text-sm text-gray-500">ラベルなし</span>';
  }

  // 信頼度
  const confidenceBadge = document.getElementById('modal-confidence');
  if (confidence && confidence !== '-') {
    confidenceBadge.textContent = confidence;
    confidenceBadge.className = 'badge';

    // 信頼度に応じて色を設定
    const confidenceValue = parseFloat(confidence.replace('%', ''));
    if (confidenceValue >= 80) {
      confidenceBadge.classList.add('badge-success');
    } else if (confidenceValue >= 60) {
      confidenceBadge.classList.add('badge-warning');
    } else {
      confidenceBadge.classList.add('badge-error');
    }
  } else {
    confidenceBadge.textContent = '-';
    confidenceBadge.className = 'badge badge-outline';
  }
}

// 画像読み込み処理
function loadImages() {
  const placeholders = document.querySelectorAll('.image-placeholder-small[data-src]');
  placeholders.forEach(placeholder => {
    const src = placeholder.dataset.src;
    if (src) {
      const img = new Image();
      img.onload = function () {
        placeholder.style.backgroundImage = `url(${src})`;
        placeholder.classList.add('image-loaded');
      };
      img.onerror = function () {
        console.log('Failed to load image:', src);
      };
      img.src = src;
    }
  });
}

// テーブルのサムネイル画像クリックイベント
document.addEventListener('DOMContentLoaded', function () {
  // 画像読み込みを開始
  loadImages();
  const avatarElements = document.querySelectorAll('.avatar[data-overlay="#slide-down-animated-modal"]');

  avatarElements.forEach(avatar => {
    avatar.addEventListener('click', function () {
      const row = this.closest('tr');
      if (row) {
        const username = row.querySelector('td:nth-child(1) .font-medium')?.textContent || '';
        const filename = row.querySelector('td:nth-child(2) .font-medium')?.textContent || '';
        const uploadTime = row.querySelector('td:nth-child(3)')?.textContent || '';
        const status = row.querySelector('td:nth-child(4) .badge')?.textContent?.trim() || '';
        const labels = Array.from(row.querySelectorAll('td:nth-child(5) .badge')).map(badge => badge.textContent);
        const confidence = row.querySelector('td:nth-child(6) .badge')?.textContent || '-';
        const analysisStart = row.querySelector('td:nth-child(8)')?.textContent || '-';
        const analysisEnd = row.querySelector('td:nth-child(9)')?.textContent || '-';
        const model = row.querySelector('td:nth-child(10) .badge')?.textContent || '-';

        // 画像URLを取得（サムネイルから）
        const thumbnailImg = row.querySelector('.image-placeholder-small');
        const imageSrc = thumbnailImg ? thumbnailImg.dataset.src : '';

        // モーダルを開く
        openImageModal(filename, imageSrc, uploadTime, username, status, analysisStart, analysisEnd, model, labels, confidence);
      }
    });
  });

  // タイムラインモーダル関連のイベント処理
  document.addEventListener('click', function (event) {
    // タイムラインモーダルを開くバッジがクリックされた場合
    if (event.target.getAttribute('data-overlay') === '#timeline-modal') {
      const row = event.target.closest('tr');
      const imageId = row ? row.getAttribute('data-image-id') : null;
      console.log('タイムラインバッジクリック、画像ID:', imageId);

      if (imageId) {
        openTimelineModal(imageId);
      }
    }
  });

  // タイムラインモーダルを開く関数
  function openTimelineModal(imageId) {
    // 画像データを取得
    const row = document.querySelector(`tr[data-image-id="${imageId}"]`);
    if (!row) return;

    const filename = row.querySelector('td:nth-child(2) .font-medium')?.textContent || '';
    const status = row.querySelector('td:nth-child(4) .badge')?.textContent?.trim() || '';
    const uploadTime = row.querySelector('td:nth-child(3)')?.textContent || '';
    const analysisStart = row.querySelector('td:nth-child(8)')?.textContent || '-';
    const analysisEnd = row.querySelector('td:nth-child(9)')?.textContent || '-';
    const model = row.querySelector('td:nth-child(10) .badge')?.textContent || '-';

    // モーダルにデータを設定
    document.getElementById('timeline-filename').textContent = filename;

    // ステータス表示（準備中の場合はキュー情報も表示）
    let statusText = status;
    if (status === '準備中') {
      // キュー情報を取得して表示
      const queueInfo = row.querySelector('.text-warning');
      if (queueInfo) {
        statusText += ` → ${queueInfo.textContent}`;
      }
    }
    document.getElementById('timeline-status').textContent = statusText;
    document.getElementById('upload-time').textContent = uploadTime;
    document.getElementById('analysis-start-time').textContent = analysisStart;
    document.getElementById('analysis-end-time').textContent = analysisEnd;
    document.getElementById('model-used').textContent = `使用モデル: ${model}`;

    // 進捗バーの表示制御
    const progressSection = document.getElementById('timeline-progress-section');
    if (status === '解析中') {
      progressSection.classList.remove('hidden');
      // 進捗バーの更新（ダミーデータ）
      updateProgressBar(75); // 例: 75%の進捗
    } else {
      progressSection.classList.add('hidden');
    }

    // 所要時間の計算（ダミーデータ）
    document.getElementById('upload-duration').textContent = '所要時間: 2秒';
    document.getElementById('analysis-duration').textContent = '所要時間: 15秒';
    document.getElementById('total-duration').textContent = '17秒';
  }

  // 進捗バー更新関数
  function updateProgressBar(percentage) {
    const progressBar = document.getElementById('timeline-progress-bar');
    const progressValue = document.getElementById('timeline-progress-value');

    if (progressBar && progressValue) {
      progressBar.style.width = `${percentage}%`;
      progressValue.textContent = percentage;
    }
  }

  // 進捗監視用の変数
  let progressInterval = null;

  // 進捗監視開始
  function startProgressMonitoring(imageId) {
    console.log('管理者テーブル: 進捗監視開始:', imageId);

    // 既存の監視を停止
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    // 進捗モーダルを手動で開く
    const modal = document.getElementById('analysis-progress-modal');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'block';
    }

    // 進捗監視を開始
    progressInterval = setInterval(() => {
      fetch(`/api/progress/${imageId}/`)
        .then(response => response.json())
        .then(data => {
          console.log('管理者テーブル: 進捗データ取得:', data);

          if (data.success && data.progress) {
            const progress = data.progress;

            // 進捗バーを更新
            updateProgressBar(progress.percentage);

            // 進捗説明を更新
            const description = document.getElementById('timeline-progress-description');
            if (description) {
              description.textContent = progress.description || '解析中...';
            }

            // 完了チェック
            if (progress.percentage >= 100 && progress.status === 'completed') {
              console.log('管理者テーブル: 解析完了');
              clearInterval(progressInterval);
              progressInterval = null;

              // モーダル表示を完了状態に変更
              updateProgressModalToCompleted();

              // バッジを自動で更新
              updateBadgeStatus(imageId, 'success');
            }
          } else {
            console.log('管理者テーブル: 進捗データが無効:', data);
          }
        })
        .catch(error => {
          console.error('管理者テーブル: 進捗取得エラー:', error);
          // エラーが続く場合は監視を停止
          clearInterval(progressInterval);
          progressInterval = null;
        });
    }, 3000); // 3秒間隔で監視
  }

  // バッジステータスを更新
  function updateBadgeStatus(imageId, status) {
    const row = document.querySelector(`tr[data-image-id="${imageId}"]`);
    if (!row) return;

    const statusCell = row.querySelector('td:nth-child(4)'); // ステータス列
    if (!statusCell) return;

    // 既存のバッジを削除
    const existingBadge = statusCell.querySelector('.badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // 新しいバッジを作成
    let newBadge;
    if (status === 'success') {
      newBadge = document.createElement('span');
      newBadge.className = 'badge badge-outline border-dashed badge-success me-2 cursor-pointer';
      newBadge.textContent = '解析成功';
      newBadge.title = 'クリックしてタイムラインを確認';
      newBadge.setAttribute('data-overlay', '#timeline-modal');
    } else if (status === 'failed') {
      newBadge = document.createElement('span');
      newBadge.className = 'badge badge-outline border-dashed badge-error me-2 cursor-pointer';
      newBadge.textContent = '失敗';
      newBadge.title = 'クリックしてタイムラインを確認';
      newBadge.setAttribute('data-overlay', '#timeline-modal');
    } else if (status === 'analyzing') {
      newBadge = document.createElement('span');
      newBadge.className = 'badge badge-outline border-dashed badge-info me-2 cursor-pointer';
      newBadge.textContent = '解析中';
      newBadge.title = 'クリックしてタイムラインを確認';
      newBadge.setAttribute('data-overlay', '#timeline-modal');
    }

    if (newBadge) {
      statusCell.appendChild(newBadge);

      // FlyonUIを再初期化
      if (typeof window.flyonui !== 'undefined') {
        try {
          window.flyonui.init();
        } catch (error) {
          console.log('FlyonUI再初期化エラー:', error);
        }
      }

      // 解析中バッジの場合は手動でクリックイベントを追加
      if (status === 'analyzing') {
        newBadge.addEventListener('click', function () {
          const row = this.closest('tr');
          const imageId = row ? row.getAttribute('data-image-id') : null;
          console.log('手動イベント: 解析中バッジクリック、画像ID:', imageId);

          if (imageId) {
            startProgressMonitoring(imageId);
          }
        });
        console.log('解析中バッジに手動クリックイベントを追加しました');
      }
    }
  }

  // 解析中バッジのクリックイベントを追加
  document.addEventListener('click', function (event) {
    // 解析中バッジがクリックされた場合
    if (event.target.classList.contains('badge-info') &&
      event.target.getAttribute('data-overlay') === '#timeline-modal') {
      const row = event.target.closest('tr');
      const imageId = row ? row.getAttribute('data-image-id') : null;
      console.log('管理者テーブル: 解析中バッジクリック、画像ID:', imageId);

      // 進捗監視を開始
      if (imageId) {
        startProgressMonitoring(imageId);
      } else {
        console.error('管理者テーブル: 解析中バッジ: 画像IDを取得できませんでした');
      }
    }
  });

  // モーダルが閉じられた時に進捗監視を停止
  const progressModal = document.getElementById('analysis-progress-modal');
  if (progressModal) {
    progressModal.addEventListener('hidden.bs.modal', function () {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
        console.log('管理者テーブル: 進捗監視を停止しました');
      }
    });
  }

});

// エラーログモーダルを開く関数（グローバルスコープ）
function openErrorModal(imageId) {
  console.log('Opening error modal for image ID:', imageId);

  // 画像データを取得
  const row = document.querySelector(`tr[data-image-id="${imageId}"]`);
  if (!row) {
    console.log('Row not found for image ID:', imageId);
    return;
  }

  // テーブル構造に基づいてデータを取得
  console.log('Row cells:', row.cells);
  console.log('Cell 0 HTML:', row.cells[0]?.innerHTML);
  console.log('Cell 1 HTML:', row.cells[1]?.innerHTML);
  console.log('Cell 2 HTML:', row.cells[2]?.innerHTML);

  // 1列目: ユーザー名
  const username = row.cells[0]?.querySelector('.font-medium')?.textContent?.trim() || '';

  // 2列目: ファイル名（2番目のdivの中の.font-medium）
  const filename = row.cells[1]?.querySelector('div:nth-child(2) .font-medium')?.textContent?.trim() || '';

  // 3列目: アップロード日時
  const uploadTime = row.cells[2]?.textContent?.trim() || '';

  console.log('Extracted data:', { username, filename, uploadTime });

  // エラーメッセージ（実際のエラーログがある場合はここで取得）
  const errorMessage = '解析処理でエラーが発生しました。';
  const errorTimestamp = new Date().toLocaleString('ja-JP');

  // モーダルにデータを設定
  document.getElementById('error-filename').textContent = filename || '不明';
  document.getElementById('error-username').textContent = username || '不明';
  document.getElementById('error-upload-time').textContent = uploadTime || '不明';
  document.getElementById('error-message').textContent = errorMessage;
  document.getElementById('error-timestamp').textContent = errorTimestamp;
}

// アップロードページに遷移する関数
function navigateToUploadPage(imageId, imageStatus) {
  console.log('navigateToUploadPage called with:', imageId, imageStatus);

  // URLパラメータで画像IDを渡す（CSRFトークン不要）
  window.location.href = `/v2/re_analysis/?selected_image_id=${imageId}&image_status=${imageStatus}`;
}

