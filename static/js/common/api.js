/**
 * API呼び出し共通ラッパー
 * Django REST APIとの通信を簡略化
 */

/**
 * 汎用API呼び出し関数
 * @param {string} endpoint - APIエンドポイント（例: '/v2/api/analysis/start/'）
 * @param {Object} options - fetch options
 * @param {string} options.method - HTTPメソッド（GET, POST, PUT, DELETEなど）
 * @param {Object|FormData} options.body - リクエストボディ
 * @param {Object} options.headers - 追加のヘッダー
 * @param {boolean} options.useFormData - FormDataを使用する場合はtrue
 * @returns {Promise<any>} APIレスポンス
 */
async function apiCall(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    useFormData = false
  } = options;

  // デフォルトヘッダーを設定
  const defaultHeaders = {
    'X-CSRFToken': getCSRFToken(),
  };

  // FormDataを使用しない場合のみContent-Typeを設定
  if (!useFormData && body && !(body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // ヘッダーをマージ
  const finalHeaders = { ...defaultHeaders, ...headers };

  // リクエストオプションを構築
  const fetchOptions = {
    method,
    headers: finalHeaders,
    credentials: 'same-origin', // Cookieを含める
  };

  // ボディを追加（GETリクエストでは不要）
  if (body && method !== 'GET') {
    if (body instanceof FormData || useFormData) {
      fetchOptions.body = body;
    } else if (typeof body === 'object') {
      fetchOptions.body = JSON.stringify(body);
    } else {
      fetchOptions.body = body;
    }
  }

  try {
    const response = await fetch(endpoint, fetchOptions);

    // HTTPエラーチェック
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    // JSONレスポンスを返す
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    // JSON以外のレスポンス
    return await response.text();
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

/**
 * 画像アップロードAPI
 * @param {FormData} formData - アップロードするフォームデータ
 * @returns {Promise<Object>} アップロード結果
 */
async function uploadImage(formData) {
  return apiCall('/v2/api/form-upload/', {
    method: 'POST',
    body: formData,
    useFormData: true
  });
}

/**
 * 解析開始API
 * @param {string} model - 使用するモデル名
 * @param {number|null} imageId - 画像ID（オプション）
 * @returns {Promise<Object>} 解析開始結果
 */
async function startAnalysis(model, imageId = null) {
  const params = new URLSearchParams({ model });
  if (imageId) {
    params.append('image_id', imageId);
  }

  return apiCall('/v2/api/analysis/start/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });
}

/**
 * 解析進捗取得API
 * @param {number|null} imageId - 画像ID（オプション、nullの場合はセッション全体）
 * @returns {Promise<Object>} 進捗情報
 */
async function getAnalysisProgress(imageId = null) {
  const endpoint = imageId 
    ? `/v2/api/analysis/progress/?image_id=${imageId}`
    : '/v2/api/analysis/progress/';
  
  return apiCall(endpoint, { method: 'GET' });
}

/**
 * アップロード済み画像一覧取得API
 * @returns {Promise<Object>} アップロード済み画像リスト
 */
async function getUploadedImages() {
  return apiCall('/v2/api/images/uploaded/', { method: 'GET' });
}

/**
 * 画像ステータス取得API
 * @param {Array<number>} imageIds - 画像IDの配列
 * @returns {Promise<Object>} 画像ステータス情報
 */
async function getImagesStatus(imageIds) {
  const ids = Array.isArray(imageIds) ? imageIds.join(',') : imageIds;
  return apiCall(`/v2/api/images/status/?image_ids=${ids}`, { method: 'GET' });
}

/**
 * 解析リトライAPI
 * @param {number} imageId - 画像ID
 * @param {string} model - 使用するモデル名
 * @returns {Promise<Object>} リトライ結果
 */
async function retryAnalysis(imageId, model) {
  return apiCall('/v2/api/analysis/retry/', {
    method: 'POST',
    body: { image_id: imageId, model }
  });
}

/**
 * 画像削除API
 * @param {number} imageId - 画像ID
 * @returns {Promise<Object>} 削除結果
 */
async function deleteImage(imageId) {
  return apiCall(`/v2/api/images/${imageId}/delete/`, {
    method: 'POST'
  });
}

/**
 * 解析完了API
 * @param {number} imageId - 画像ID
 * @returns {Promise<Object>} 完了結果
 */
async function completeAnalysis(imageId) {
  return apiCall('/v2/api/analysis/complete/', {
    method: 'POST',
    body: { image_id: imageId }
  });
}

/**
 * タイムライン取得API
 * @param {number} imageId - 画像ID
 * @returns {Promise<Object>} タイムライン情報
 */
async function getTimeline(imageId) {
  return apiCall(`/v2/api/timeline/${imageId}/`, { method: 'GET' });
}

/**
 * 画像詳細取得API
 * @param {number} imageId - 画像ID
 * @returns {Promise<Object>} 画像詳細情報
 */
async function getImageDetail(imageId) {
  return apiCall(`/v2/api/images/${imageId}/detail/`, { method: 'GET' });
}

