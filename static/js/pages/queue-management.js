/**
 * キュー管理ページ用JavaScript
 * templates/admin/queue_management.html から抽出
 */

// 次の処理を開始
function startNextProcessing() {
  fetch('/api/queue/start-processing/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        showMessage('success', data.message);
        setTimeout(() => location.reload(), 1000);
      } else {
        showMessage('error', data.error);
      }
    })
    .catch(error => {
      showMessage('error', 'エラーが発生しました: ' + error.message);
    });
}

// キューアイテムの位置を変更
function moveQueueItem(queueId, newPosition) {
  if (newPosition < 1) return;

  fetch('/api/queue/change-position/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `queue_id=${queueId}&new_position=${newPosition}`
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        showMessage('success', data.message);
        setTimeout(() => location.reload(), 1000);
      } else {
        showMessage('error', data.error);
      }
    })
    .catch(error => {
      showMessage('error', 'エラーが発生しました: ' + error.message);
    });
}

// 優先度を変更
function changePriority(queueId, newPriority) {
  fetch('/api/queue/change-priority/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `queue_id=${queueId}&new_priority=${newPriority}`
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        showMessage('success', data.message);
        setTimeout(() => location.reload(), 1000);
      } else {
        showMessage('error', data.error);
      }
    })
    .catch(error => {
      showMessage('error', 'エラーが発生しました: ' + error.message);
    });
}

// モデルを変更
function changeModel(queueId, newModel) {
  fetch('/api/queue/change-model/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `queue_id=${queueId}&new_model=${newModel}`
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        showMessage('success', data.message);
      } else {
        showMessage('error', data.error);
      }
    })
    .catch(error => {
      showMessage('error', 'エラーが発生しました: ' + error.message);
    });
}

// キューから削除
function removeFromQueue(queueId) {
  if (!confirm('このアイテムをキューから削除しますか?')) return;

  fetch('/api/queue/remove/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `queue_id=${queueId}`
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        showMessage('success', data.message);
        setTimeout(() => location.reload(), 1000);
      } else {
        showMessage('error', data.error);
      }
    })
    .catch(error => {
      showMessage('error', 'エラーが発生しました: ' + error.message);
    });
}

// キューを再整理
function reorderQueue() {
  if (!confirm('キューを優先度順に再整理しますか?')) return;

  // ここでキュー再整理のAPIを呼び出す
  showMessage('info', 'キューを再整理しています...');
  setTimeout(() => location.reload(), 1000);
}

// ページを更新
function refreshQueue() {
  location.reload();
}

// メッセージ表示
function showMessage(type, message) {
  const messageArea = document.getElementById('message-area');
  const alertClass = type === 'success' ? 'alert-success' :
    type === 'error' ? 'alert-error' : 'alert-info';

  const messageDiv = document.createElement('div');
  messageDiv.className = `alert ${alertClass} mb-2 shadow-lg`;
  messageDiv.innerHTML = `
    <span>${message}</span>
    <button class="btn btn-sm btn-circle btn-ghost" onclick="this.parentElement.remove()">
      <span class="icon-[tabler--x] size-4"></span>
    </button>
  `;

  messageArea.appendChild(messageDiv);

  // 5秒後に自動削除
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, 5000);
}

// フィルター機能
document.addEventListener('DOMContentLoaded', function () {
  const statusFilter = document.getElementById('statusFilter');
  const priorityFilter = document.getElementById('priorityFilter');

  function applyFilters() {
    const statusValue = statusFilter.value;
    const priorityValue = priorityFilter.value;
    const rows = document.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const status = row.dataset.status;
      const priority = row.dataset.priority;

      let showRow = true;

      if (statusValue && status !== statusValue) {
        showRow = false;
      }

      if (priorityValue && priority !== priorityValue) {
        showRow = false;
      }

      row.style.display = showRow ? '' : 'none';
    });
  }

  statusFilter.addEventListener('change', applyFilters);
  priorityFilter.addEventListener('change', applyFilters);
});

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

// ページ読み込み時に画像を読み込み
document.addEventListener('DOMContentLoaded', loadImages);

