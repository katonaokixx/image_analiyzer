// 再解析ページに遷移する関数
function navigateToReanalysis() {
  const currentImageId = window.currentModalImageId;
  if (currentImageId) {
    window.location.href = `/v2/re_image_upload/?selected_image_id=${currentImageId}&image_status=completed`;
  } else {
    console.error('画像IDが取得できません');
  }
}


// 削除確認状態に切り替える関数
function openDeleteConfirmModal() {
  const currentImageId = window.currentModalImageId;
  if (currentImageId) {
    // 画像詳細表示を非表示
    document.getElementById('modal-image-detail').classList.add('hidden');
    document.getElementById('modal-normal-buttons').classList.add('hidden');

    // 削除確認表示を表示
    document.getElementById('modal-delete-confirm').classList.remove('hidden');
    document.getElementById('modal-delete-buttons').classList.remove('hidden');

    // モーダルタイトルを変更
    document.querySelector('#slide-down-animated-modal .modal-title').textContent = '画像の削除';
  } else {
    console.error('画像IDが取得できません');
    alert('画像IDが取得できませんでした');
  }
}


// 画像削除を実行する関数
function confirmDeleteImage() {
  const currentImageId = window.currentModalImageId;
  if (!currentImageId) {
    console.error('画像IDが取得できません');
    alert('画像IDが取得できませんでした');
    return;
  }

  const csrfToken = getCSRFToken();
  if (!csrfToken) {
    alert('CSRFトークンが取得できません。ページを再読み込みしてください。');
    return;
  }

  // api.js統合版を使用
  deleteImage(currentImageId)
    .then(data => {
      if (data.success || data.ok) {
        // 成功時はモーダルを閉じてページをリロード
        const modal = document.getElementById('slide-down-animated-modal');
        if (modal) {
          modal.classList.add('hidden');
          modal.classList.remove('overlay-open');
          modal.style.display = 'none';
          modal.style.opacity = '0';
          modal.style.visibility = 'hidden';
        }
        location.reload();
      } else {
        alert('削除に失敗しました: ' + (data.error || '不明なエラー'));
      }
    })
    .catch(error => {
      console.error('削除エラー:', error);
      alert('削除に失敗しました: ' + error.message);
    });
}

// CSRFトークンを取得する関数
// getCSRFToken()とgetCookie()は共通ユーティリティ（utils.js）を使用

// 削除確認をキャンセルして通常状態に戻す関数
function cancelDeleteConfirm() {
  // 削除確認表示を非表示
  document.getElementById('modal-delete-confirm').classList.add('hidden');
  document.getElementById('modal-delete-buttons').classList.add('hidden');

  // 画像詳細表示を表示
  document.getElementById('modal-image-detail').classList.remove('hidden');
  document.getElementById('modal-normal-buttons').classList.remove('hidden');

  // モーダルタイトルを元に戻す
  document.querySelector('#slide-down-animated-modal .modal-title').textContent = '画像詳細';
}

// モーダルに画像データを設定する関数
function openImageModal(filename, imageSrc, uploadTime, status, labels, confidence, imageId) {
  // 現在の画像IDを保存
  window.currentModalImageId = imageId;

  // モーダルの内容を設定
  document.getElementById('modal-filename').textContent = filename;
  document.getElementById('modal-image').src = imageSrc;
  document.getElementById('modal-image').alt = filename;
  document.getElementById('modal-upload-time').textContent = uploadTime;

  // ステータスバッジ
  const statusBadge = document.getElementById('modal-status-badge');
  statusBadge.textContent = status;
  statusBadge.className = 'badge badge-outline border-dashed me-2';

  // ステータスに応じて色を設定
  if (status === '解析成功') {
    statusBadge.classList.add('badge-success');
  } else if (status === '解析中') {
    statusBadge.classList.add('badge-warning');
  } else if (status === '準備中') {
    statusBadge.classList.add('badge-info');
  } else {
    statusBadge.classList.add('badge-error');
  }

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

// ===== DOMContentLoaded イベントハンドラ（統合版）=====
document.addEventListener('DOMContentLoaded', function () {
  // 1. テーブルのサムネイル画像クリックイベント
  const avatarElements = document.querySelectorAll('.avatar[data-overlay="#slide-down-animated-modal"]');
  avatarElements.forEach(avatar => {
    avatar.addEventListener('click', function () {
      const row = this.closest('tr');
      if (row) {
        const imageId = row.getAttribute('data-image-id');
        const filename = row.querySelector('td:nth-child(1) .font-medium')?.textContent || '';
        const uploadTime = row.querySelector('td:nth-child(2)')?.textContent || '';
        const status = row.querySelector('td:nth-child(3) .badge')?.textContent || '';
        const labels = Array.from(row.querySelectorAll('td:nth-child(4) .badge')).map(badge => badge.textContent);
        const confidence = row.querySelector('td:nth-child(5)')?.textContent || '-';

        // 画像URLを取得（サムネイルから）
        const thumbnailImg = row.querySelector('img');
        const imageSrc = thumbnailImg ? thumbnailImg.src : '';

        // モーダルを開く（画像IDも渡す）
        openImageModal(filename, imageSrc, uploadTime, status, labels, confidence, imageId);
      }
    });
  });

  // 2. フィルターのイベントリスナー
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

  // 3. ステータス監視の開始
  // 解析中の画像があるかチェック
  const analyzingImages = document.querySelectorAll('tr[data-image-id]');
  const analyzingImageIds = [];

  analyzingImages.forEach(row => {
    const badge = row.querySelector('.badge-info, .badge-secondary');
    if (badge) {
      // 解析中または準備中のバッジがある場合
      const imageId = row.getAttribute('data-image-id');
      if (imageId) {
        analyzingImageIds.push(imageId);
      }
    }
  });

  // 解析中の画像がある場合は監視開始
  if (analyzingImageIds.length > 0) {
    startStatusMonitoring(analyzingImageIds);
  }
});


// 進捗監視用の変数
let progressInterval = null;

// 画像ステータスを失敗に更新（api.js統合版を使用）
function updateImageStatusToFailed(imageId) {
  return updateStatus(imageId, 'failed')
    .then(data => {
      if (data.ok) {
        console.log('ステータス更新成功:', data);
      } else {
        console.error('ステータス更新失敗:', data.error);
      }
    })
    .catch(error => {
      console.error('ステータス更新エラー:', error);
    });
}

// Function to reset all filters
function resetAllFilters() {
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
}

// Function to apply filters
function applyFilters() {
  const searchTerm = document.getElementById('exampleDataList').value.toLowerCase();
  const statusFilter = document.getElementById('selectFloating').value;
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
      if (statusFilter === 'アップロード' && statusText !== 'アップロード完了') showRow = false;
      if (statusFilter === '解析成功' && statusText !== '解析成功') showRow = false;
      if (statusFilter === '解析中' && statusText !== '解析中') showRow = false;
      if (statusFilter === '準備中' && statusText !== '準備中') showRow = false;
      if (statusFilter === '失敗' && statusText !== '失敗') showRow = false;
    }

    // Label filter
    if (labelFilter !== 'すべて') {
      const labelCell = row.querySelector('td:nth-child(4)'); // ラベル列
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
      const confidenceCell = row.querySelector('td:nth-child(5)'); // 信頼度列
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
      // Get upload date for sorting
      const uploadDateText = row.querySelector('td:nth-child(2)').textContent.trim();
      const uploadDate = new Date(uploadDateText);

      // Get confidence for sorting
      const confidenceCell = row.querySelector('td:nth-child(5)');
      const confidenceValue = confidenceCell ? parseFloat(confidenceCell.textContent.replace('%', '')) : 0;

      // Get label for sorting
      const labelCell = row.querySelector('td:nth-child(4)');
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

    // Default: filename alphabetical
    return a.filename.localeCompare(b.filename);
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

  // Show "no results" message if no rows are visible
  let noResultsRow = tbody.querySelector('.no-results-row');

  if (visibleCount === 0 && rows.length > 0) {
    if (!noResultsRow) {
      noResultsRow = document.createElement('tr');
      noResultsRow.className = 'no-results-row';
      noResultsRow.innerHTML = `
          <td colspan="5" class="text-center py-8">
            <div class="text-gray-500">
              <span class="icon-[tabler--search] size-8 mx-auto mb-2 block"></span>
              検索条件に一致する画像が見つかりません
            </div>
          </td>
        `;
      tbody.appendChild(noResultsRow);
    }
    noResultsRow.style.display = '';
  } else if (noResultsRow) {
    noResultsRow.style.display = 'none';
  }
}

// ===== テーブルのステータスリアルタイム更新機能 =====

let statusMonitoringInterval = null;

// ステータス監視を開始
function startStatusMonitoring(initialImageIds) {
  // 既存の監視を停止
  if (statusMonitoringInterval) {
    clearInterval(statusMonitoringInterval);
  }

  let monitoringImageIds = [...initialImageIds];

  statusMonitoringInterval = setInterval(() => {
    // 監視対象の画像がなくなったら停止
    if (monitoringImageIds.length === 0) {
      stopStatusMonitoring();
      return;
    }

    // ステータスを一括取得（api.js統合版）
    getImagesStatus(monitoringImageIds)
      .then(data => {
        if (data.ok && data.statuses) {
          // 各画像のステータスを更新
          const completedIds = [];

          Object.keys(data.statuses).forEach(imageId => {
            const statusInfo = data.statuses[imageId];
            updateImageRowStatus(imageId, statusInfo);

            // 完了した画像は監視対象から除外
            if (statusInfo.status === 'completed') {
              completedIds.push(imageId);
            }
          });

          // 完了した画像を監視対象から削除
          monitoringImageIds = monitoringImageIds.filter(id => !completedIds.includes(id.toString()));
        }
      })
      .catch(error => {
        console.error('ステータス取得エラー:', error);
      });
  }, 2000); // 2秒ごとにチェック
}

// ステータス監視を停止
function stopStatusMonitoring() {
  if (statusMonitoringInterval) {
    clearInterval(statusMonitoringInterval);
    statusMonitoringInterval = null;
  }
}

// テーブル行のステータスを更新
function updateImageRowStatus(imageId, statusInfo) {
  const row = document.querySelector(`tr[data-image-id="${imageId}"]`);
  if (!row) return;

  const statusCell = row.cells[2]; // ステータスカラム
  const labelCell = row.cells[3];  // ラベルカラム
  const confidenceCell = row.cells[4]; // 信頼度カラム

  if (!statusCell) return;

  // ステータスバッジを更新
  if (statusInfo.status === 'completed') {
    statusCell.innerHTML = '<span class="badge badge-outline border-dashed badge-success me-2">解析成功</span>';

    // ラベルと信頼度を更新
    if (statusInfo.label && labelCell) {
      labelCell.innerHTML = `<span class="badge badge-primary">${statusInfo.label}</span>`;
    }
    if (statusInfo.confidence !== null && statusInfo.confidence !== undefined && confidenceCell) {
      // confidenceが数値の場合はtoFixed()を使用、文字列の場合はそのまま使用
      const confidenceValue = typeof statusInfo.confidence === 'number'
        ? statusInfo.confidence.toFixed(2)
        : parseFloat(statusInfo.confidence).toFixed(2);
      confidenceCell.innerHTML = `<span class="badge badge-success">${confidenceValue}%</span>`;
    }
  } else if (statusInfo.status === 'analyzing') {
    statusCell.innerHTML = '<span class="badge badge-outline border-dashed badge-info me-2">解析中</span>';
  } else if (statusInfo.status === 'preparing') {
    // 準備中の場合は待ち順番を表示
    let statusText = '準備中';
    if (statusInfo.waiting_count !== undefined && statusInfo.waiting_count !== null) {
      statusText = `準備中（あと${statusInfo.waiting_count}枚）`;
    }
    statusCell.innerHTML = `<span class="badge badge-outline border-dashed badge-secondary me-2">${statusText}</span>`;
  } else if (statusInfo.status === 'failed') {
    statusCell.innerHTML = '<span class="badge badge-outline border-dashed badge-error me-2">失敗</span>';
  }
}
