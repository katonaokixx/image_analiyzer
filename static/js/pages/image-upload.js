// グローバル変数（progressInterval, uploadedImagesData）は image_upload.html で早期定義済み

// セッション復元処理は session-manager.js に移動済み
// 解析処理は image-analysis.js に移動済み

// モーダル内の解析開始ボタンのイベントリスナー
document.addEventListener('DOMContentLoaded', function () {
  const modalAnalysisButton = document.getElementById('modal-start-analysis-btn');
  if (modalAnalysisButton) {
    modalAnalysisButton.addEventListener('click', function () {
      const model = document.getElementById('model-selector').value;
      if (!model) {
        alert('モデルを選択してください');
        return;
      }

      console.log('選択されたモデル:', model);
      // 初回解析を実行（image-analysis.jsのhandleAnalysisStart()を呼び出し）
      window.isRetryAnalysis = false;
      handleAnalysisStart(model);
    });
  }
});
