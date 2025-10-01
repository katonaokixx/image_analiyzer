/**
 * 進捗バー管理モジュール
 * アップロード・解析の進捗表示を統一的に管理
 */

/**
 * 進捗バークラス
 */
class ProgressBar {
  /**
   * @param {string} selector - 進捗バー要素のセレクタ
   * @param {Object} options - オプション
   * @param {string} options.valueSelector - 進捗値表示要素のセレクタ
   * @param {boolean} options.showPercentage - パーセンテージ表示の有無
   * @param {boolean} options.animate - アニメーション有効化
   */
  constructor(selector, options = {}) {
    this.selector = selector;
    this.options = {
      valueSelector: null,
      showPercentage: true,
      animate: true,
      ...options
    };
    this.currentProgress = 0;
  }

  /**
   * 進捗バー要素を取得
   * @returns {NodeList} 進捗バー要素
   */
  getElements() {
    return document.querySelectorAll(this.selector);
  }

  /**
   * 進捗値表示要素を取得
   * @returns {NodeList|null} 進捗値表示要素
   */
  getValueElements() {
    if (this.options.valueSelector) {
      return document.querySelectorAll(this.options.valueSelector);
    }
    return null;
  }

  /**
   * 進捗を更新
   * @param {number} percentage - 進捗パーセンテージ (0-100)
   */
  update(percentage) {
    percentage = Math.min(Math.max(percentage, 0), 100); // 0-100に制限
    this.currentProgress = percentage;

    const elements = this.getElements();
    elements.forEach(element => {
      // 幅を更新
      element.style.width = `${percentage}%`;
      element.setAttribute('aria-valuenow', percentage);

      // 色を変更（完了・進行中・待機中）
      if (percentage >= 100) {
        element.classList.remove('progress-primary', 'progress-warning', 'progress-info');
        element.classList.add('progress-success');
      } else if (percentage > 0) {
        element.classList.remove('progress-success', 'progress-warning', 'progress-info');
        element.classList.add('progress-primary');
      } else {
        element.classList.remove('progress-success', 'progress-primary');
        element.classList.add('progress-info');
      }
    });

    // 進捗値を更新
    if (this.options.showPercentage) {
      const valueElements = this.getValueElements();
      if (valueElements) {
        valueElements.forEach(element => {
          element.textContent = Math.round(percentage);
        });
      }
    }
  }

  /**
   * 進捗をリセット
   */
  reset() {
    this.update(0);
  }

  /**
   * 進捗を完了状態に設定
   */
  complete() {
    this.update(100);
  }

  /**
   * エラー状態に設定
   */
  setError() {
    const elements = this.getElements();
    elements.forEach(element => {
      element.classList.remove('progress-primary', 'progress-success', 'progress-info');
      element.classList.add('progress-error');
    });
  }

  /**
   * 警告状態に設定
   */
  setWarning() {
    const elements = this.getElements();
    elements.forEach(element => {
      element.classList.remove('progress-primary', 'progress-success', 'progress-info', 'progress-error');
      element.classList.add('progress-warning');
    });
  }

  /**
   * アニメーション付きで進捗を更新
   * @param {number} targetPercentage - 目標パーセンテージ
   * @param {number} duration - アニメーション時間（ミリ秒）
   */
  animateTo(targetPercentage, duration = 300) {
    if (!this.options.animate) {
      this.update(targetPercentage);
      return;
    }

    const startPercentage = this.currentProgress;
    const diff = targetPercentage - startPercentage;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // イージング関数（easeOutQuad）
      const eased = 1 - Math.pow(1 - progress, 2);
      const currentValue = startPercentage + (diff * eased);
      
      this.update(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }
}

/**
 * 汎用進捗バー更新関数
 * @param {string} selector - セレクタ
 * @param {number} percentage - パーセンテージ
 */
function updateProgressBar(selector, percentage) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(element => {
    element.style.width = `${percentage}%`;
    element.setAttribute('aria-valuenow', percentage);
  });
}

/**
 * 汎用進捗値更新関数
 * @param {string} selector - セレクタ
 * @param {number} value - 値
 */
function updateProgressValue(selector, value) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(element => {
    element.textContent = Math.round(value);
  });
}

/**
 * 進捗監視クラス
 */
class ProgressMonitor {
  /**
   * @param {Function} fetchProgress - 進捗取得関数
   * @param {Function} onProgress - 進捗更新時のコールバック
   * @param {Object} options - オプション
   */
  constructor(fetchProgress, onProgress, options = {}) {
    this.fetchProgress = fetchProgress;
    this.onProgress = onProgress;
    this.options = {
      interval: 1000, // ポーリング間隔（ミリ秒）
      maxRetries: 60, // 最大リトライ回数
      onComplete: null,
      onError: null,
      ...options
    };
    this.intervalId = null;
    this.retryCount = 0;
  }

  /**
   * 監視を開始
   */
  start() {
    if (this.intervalId) {
      this.stop();
    }

    this.retryCount = 0;
    this.intervalId = setInterval(async () => {
      try {
        const progress = await this.fetchProgress();
        
        if (this.onProgress) {
          this.onProgress(progress);
        }

        // 完了チェック
        if (progress.status === 'completed' || progress.progress >= 100) {
          this.stop();
          if (this.options.onComplete) {
            this.options.onComplete(progress);
          }
        }

        // エラーチェック
        if (progress.status === 'failed' || progress.status === 'error') {
          this.stop();
          if (this.options.onError) {
            this.options.onError(progress);
          }
        }

        this.retryCount++;
        if (this.retryCount >= this.options.maxRetries) {
          console.warn('進捗監視: 最大リトライ回数に達しました');
          this.stop();
        }
      } catch (error) {
        console.error('進捗監視エラー:', error);
        if (this.options.onError) {
          this.options.onError(error);
        }
      }
    }, this.options.interval);
  }

  /**
   * 監視を停止
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 監視中かどうか
   * @returns {boolean}
   */
  isRunning() {
    return this.intervalId !== null;
  }
}

/**
 * 画像アップロード進捗プレビュー作成
 * @param {Array} images - 画像リスト
 * @param {string} containerId - コンテナID
 */
function createImageProgressPreviews(images, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`進捗プレビューコンテナが見つかりません: ${containerId}`);
    return;
  }

  container.innerHTML = '';

  images.forEach(image => {
    const lastDot = image.filename.lastIndexOf('.');
    const filename = lastDot > 0 ? image.filename.substring(0, lastDot) : image.filename;
    const fileExt = lastDot > 0 ? image.filename.substring(lastDot + 1) : '';

    const progressItem = document.createElement('div');
    progressItem.className = 'mb-2 progress-container';
    progressItem.id = `progress-item-${image.id}`;

    progressItem.innerHTML = `
      <div class="rounded-box bg-base-100 shadow-base-300/20 p-3 shadow-lg">
        <div class="mb-1 flex items-center justify-between">
          <div class="flex items-center gap-x-3">
            <span class="text-base-content/80 border-base-content/20 flex size-8 items-center justify-center rounded-lg border p-0.5">
              <img class="rounded-md w-full h-full object-cover" src="${image.thumbnail_url || ''}" alt="">
            </span>
            <div>
              <p class="text-base-content text-sm font-medium">
                <span class="inline-block truncate align-bottom">${filename}</span>
                ${fileExt ? '<span>.' + fileExt + '</span>' : ''}
              </p>
              <p class="text-base-content/50 text-xs" data-progress-status="${image.id}">待機中...</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-x-3 whitespace-nowrap">
          <div class="progress h-2" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar progress-info transition-all duration-500" 
                 style="width:0" 
                 data-progress-bar="${image.id}"></div>
          </div>
          <span class="text-base-content mb-0.5 text-sm">
            <span data-progress-value="${image.id}">0</span>%
          </span>
        </div>
      </div>
    `;

    container.appendChild(progressItem);
  });
}

