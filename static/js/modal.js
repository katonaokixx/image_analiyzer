function openImageModal(filename, imageSrc, uploadTime, status, labels, confidence) {

  // モーダルの内容を設定
  document.getElementById('modal-filename').textContent = filename;
  document.getElementById('modal-image').src = imageSrc;
  document.getElementById('modal-upload-time').textContent = uploadTime;

  // ステータスに適切なバッジスタイルを設定
  const statusBadge = document.getElementById('modal-status-badge');
  statusBadge.textContent = status;

  // 既存のバッジクラスを削除
  statusBadge.className = 'badge badge-outline border-dashed me-2';

  // ステータスに基づいて適切なバッジ色を追加
  if (status.includes('解析成功')) {
    statusBadge.classList.add('badge-success');
  } else if (status.includes('失敗')) {
    statusBadge.classList.add('badge-error');
  } else if (status.includes('解析中')) {
    statusBadge.classList.add('badge-info');
  } else if (status.includes('準備中')) {
    statusBadge.classList.add('badge-secondary');
  }

  // ラベルにバッジスタイルを設定
  const labelsContainer = document.getElementById('modal-labels');
  labelsContainer.innerHTML = ''; // 既存のコンテンツをクリア

  if (labels && labels !== '-') {
    const labelArray = labels.split(', ');
    labelArray.forEach(label => {
      const badge = document.createElement('span');
      badge.className = 'badge me-1';

      // ラベルの内容に基づいて適切なバッジ色を追加
      if (label.includes('犬') || label.includes('猫') || label.includes('鳥') || label.includes('動物')) {
        badge.classList.add('badge-error'); // 赤色 - 動物・生物系
      } else if (label.includes('屋外') || label.includes('公園') || label.includes('海') || label.includes('山')) {
        badge.classList.add('badge-secondary'); // グレー - 場所・環境系
      } else if (label.includes('風景') || label.includes('自然') || label.includes('空') || label.includes('森')) {
        badge.classList.add('badge-success'); // 緑色 - 自然・風景系
      } else if (label.includes('車') || label.includes('建物') || label.includes('家具')) {
        badge.classList.add('badge-warning'); // オレンジ - 物体系
      } else if (label.includes('走る') || label.includes('歩く') || label.includes('座る')) {
        badge.classList.add('badge-info'); // 水色 - 活動・動作系
      } else if (label.includes('人物') || label.includes('男性') || label.includes('女性') || label.includes('子供')) {
        badge.classList.add('badge-primary'); // 青色 - 人物・キャラクター系
      } else {
        badge.classList.add('badge-accent'); // 紫色 - その他・アニメ系
      }

      badge.textContent = label.trim();
      labelsContainer.appendChild(badge);
    });
  } else {
    // 空のラベルの場合はダッシュを表示
    const dash = document.createElement('span');
    dash.className = 'text-sm text-gray-500';
    dash.textContent = '-';
    labelsContainer.appendChild(dash);
  }
  // 信頼度にバッジスタイルを設定
  const confidenceBadge = document.getElementById('modal-confidence');
  confidenceBadge.textContent = confidence;

  // 既存のバッジクラスを削除
  confidenceBadge.className = 'badge';

  // 信頼度の値に基づいて適切なバッジ色とスタイルを追加
  if (confidence === '-') {
    confidenceBadge.classList.add('badge-outline', 'badge-secondary'); // アウトライン + グレー - 処理中/未設定
  } else if (confidence.includes('%')) {
    const confidenceValue = parseInt(confidence);
    if (confidenceValue >= 90) {
      confidenceBadge.classList.add('badge-outline', 'badge-success', 'badge-lg'); // アウトライン + 緑色 + 大きめ - 高信頼度
    } else if (confidenceValue >= 80) {
      confidenceBadge.classList.add('badge-soft', 'badge-info'); // ソフト + 水色 - 中高信頼度
    } else if (confidenceValue >= 70) {
      confidenceBadge.classList.add('badge-ghost', 'badge-warning'); // ゴースト + オレンジ - 中信頼度
    } else if (confidenceValue >= 60) {
      confidenceBadge.classList.add('badge-solid', 'badge-error', 'badge-sm'); // ソリッド + 赤色 + 小さい - 低信頼度
    } else {
      confidenceBadge.classList.add('badge-solid', 'badge-error', 'badge-xs'); // ソリッド + 赤色 + 超小 - 低信頼度
    }
  } else {
    confidenceBadge.classList.add('badge-outline', 'badge-secondary'); // アウトライン + グレー - その他
  }

  // プレビューモーダルと同じ方法でモーダルを開く
  const modal = document.getElementById('image-detail-modal');

  // まずFlyonUIのオーバーレイシステムを使用してみる
  const existingButton = document.querySelector('button[data-overlay="#image-detail-modal"]');
  if (existingButton) {
    existingButton.click();
  } else {
    // フォールバック: 一時的なボタンを作成
    const triggerButton = document.createElement('button');
    triggerButton.setAttribute('data-overlay', '#image-detail-modal');
    triggerButton.style.display = 'none';
    document.body.appendChild(triggerButton);
    triggerButton.click();
    document.body.removeChild(triggerButton);
  }

  // 短い遅延後に手動でモーダルを開くことも試す
  setTimeout(() => {
    modal.classList.remove('hidden');
    modal.style.display = 'block';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
  }, 50);

  // FlyonUIがオーバーレイトリガーを処理するのを待つ
  setTimeout(() => {
    // FlyonUIが適切に処理しなかった場合は、手動でモーダルの状態を設定
    if (modal.classList.contains('hidden')) {
      modal.classList.remove('hidden');
      modal.style.display = 'block';
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
    }
  }, 100); // FlyonUIが処理する時間を与える

}

function closeImageModal() {
  const modal = document.getElementById('image-detail-modal');

  modal.classList.add('hidden');
  modal.classList.remove('overlay-open');
  modal.style.display = 'none';
  modal.style.opacity = '0';
  modal.style.visibility = 'hidden';
}

function logCloseButtonClick(buttonType) {
  const modal = document.getElementById('image-detail-modal');

  // data-overlay属性が存在するかチェック
  const button = event.target.closest('button');

  // FlyonUIが適切に動作しないため、手動でモーダルを閉じる
  modal.classList.add('hidden');
  modal.style.display = 'none';
  modal.style.opacity = '0';
  modal.style.visibility = 'hidden';

  // クリックを妨げている可能性のある背景オーバーレイも削除
  const overlays = document.querySelectorAll('.overlay:not(#image-detail-modal)');
  overlays.forEach(overlay => {
    if (overlay.style.display !== 'none') {
      overlay.style.display = 'none';
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
    }
  });

  // FlyonUIのオーバーレイ要素も削除を試行
  const flyonuiOverlays = document.querySelectorAll('[data-overlay-backdrop]');
  flyonuiOverlays.forEach(overlay => {
    overlay.remove();
  });

  // グレーの背景を引き起こしている4つの追加オーバーレイ要素を削除
  const extraOverlays = document.querySelectorAll('div.overlay.modal:not(#image-detail-modal)');
  extraOverlays.forEach((overlay, index) => {
    overlay.remove();
  });

  // 'open'と'opened'クラスを持つ要素も削除を試行
  const openElements = document.querySelectorAll('.open.opened:not(#image-detail-modal)');
  openElements.forEach(element => {
    element.remove();
  });

  // 安全なオーバーレイ削除: 特定のオーバーレイ要素のみ削除
  const safeOverlays = document.querySelectorAll('div.overlay.modal:not(#image-detail-modal)');
  safeOverlays.forEach((overlay, index) => {
    overlay.remove();
  });

  // バックドロップ要素も削除
  const backdrops = document.querySelectorAll('[class*="backdrop"], [class*="overlay-backdrop"]');
  backdrops.forEach(backdrop => {
    backdrop.remove();
  });

  // クリックを妨げている可能性のあるbodyとhtmlのスタイルもリセット
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  document.documentElement.style.overflow = '';
  document.documentElement.style.pointerEvents = '';
}