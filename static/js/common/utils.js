/**
 * 共通ユーティリティ関数
 * CSRFトークン取得、Cookie操作、通知表示など
 */

/**
 * Cookieから指定された名前の値を取得
 * @param {string} name - Cookie名
 * @returns {string|null} Cookie値、見つからない場合はnull
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * CSRFトークンを取得
 * DjangoのCSRF保護に必要なトークンを複数の方法で取得
 * @returns {string} CSRFトークン
 */
function getCSRFToken() {
  // 方法1: csrfmiddlewaretokenフィールドから取得（最優先）
  const tokenField = document.querySelector('[name=csrfmiddlewaretoken]');
  if (tokenField && tokenField.value) {
    return tokenField.value;
  }

  // 方法2: Cookieから取得（Djangoの標準的な方法）
  const cookieToken = getCookie('csrftoken');
  if (cookieToken) {
    return cookieToken;
  }

  // トークンが見つからない場合は空文字を返す
  console.warn('CSRFトークンが見つかりませんでした');
  return '';
}

/**
 * 通知メッセージを表示
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - 表示時間（ミリ秒）、0で自動非表示なし
 */
function showNotification(message, type = 'info', duration = 3000) {
  // 既存の通知コンテナを探す、なければ作成
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(container);
  }

  // 通知要素を作成
  const notification = document.createElement('div');
  const typeClasses = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info'
  };

  notification.className = `alert ${typeClasses[type] || 'alert-info'} shadow-lg max-w-md`;
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <span>${message}</span>
      <button class="btn btn-sm btn-ghost btn-circle" onclick="this.parentElement.parentElement.remove()">
        <span class="icon-[tabler--x] size-4"></span>
      </button>
    </div>
  `;

  container.appendChild(notification);

  // 自動非表示
  if (duration > 0) {
    setTimeout(() => {
      notification.remove();
    }, duration);
  }
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 * @param {number} bytes - バイト数
 * @returns {string} フォーマットされたファイルサイズ
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * デバウンス関数
 * 連続した呼び出しを制限し、最後の呼び出しのみ実行
 * @param {Function} func - 実行する関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @returns {Function} デバウンスされた関数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * エラーメッセージを標準化して表示
 * @param {Error|string} error - エラーオブジェクトまたはメッセージ
 */
function handleError(error) {
  const message = error.message || error.toString() || 'エラーが発生しました';
  console.error('Error:', error);
  showNotification(message, 'error', 5000);
}

