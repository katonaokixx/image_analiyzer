// フィルタリング機能
function applyFilters() {
  console.log('=== applyFilters() called ===');

  // 検索テキスト
  const searchText = document.getElementById('exampleDataList').value.toLowerCase();
  console.log('Search text:', searchText);

  // 日付ソート
  const dateSort = document.getElementById('dateSort').value;
  console.log('Date sort:', dateSort);

  // ステータスフィルター
  const statusFilter = document.getElementById('selectFloating').value;
  console.log('Status filter:', statusFilter);

  // ラベルフィルター
  const labelFilter = document.getElementById('labelFilter').value;
  console.log('Label filter:', labelFilter);

  // 信頼度フィルター
  const confidenceFilter = document.getElementById('confidenceFilter').value;
  console.log('Confidence filter:', confidenceFilter);

  // テーブル行を取得
  const tableRows = document.querySelectorAll('tbody tr');
  console.log('Found table rows:', tableRows.length);

  // 日順ソートの処理
  const rowsArray = Array.from(tableRows);
  if (dateSort === '古い順') {
    rowsArray.sort((a, b) => {
      const dateA = a.querySelector('td:nth-child(2)').textContent.trim();
      const dateB = b.querySelector('td:nth-child(2)').textContent.trim();
      return dateA.localeCompare(dateB);
    });
    console.log('Sorted by oldest first');
  } else if (dateSort === '新しい順') {
    rowsArray.sort((a, b) => {
      const dateA = a.querySelector('td:nth-child(2)').textContent.trim();
      const dateB = b.querySelector('td:nth-child(2)').textContent.trim();
      return dateB.localeCompare(dateA);
    });
    console.log('Sorted by newest first');
  }

  // ソートされた行をテーブルに反映
  const tbody = document.querySelector('tbody');
  if (tbody) {
    rowsArray.forEach(row => {
      tbody.appendChild(row);
    });
  }

  let visibleCount = 0;
  let hiddenCount = 0;

  rowsArray.forEach((row, index) => {
    let showRow = true;

    // 検索フィルター
    if (searchText) {
      const rowText = row.textContent.toLowerCase();
      if (!rowText.includes(searchText)) {
        showRow = false;
      }
    }

    // ステータスフィルター
    if (statusFilter && statusFilter !== 'すべて') {
      const statusCell = row.querySelector('td:nth-child(3)');
      if (statusCell) {
        const statusText = statusCell.textContent.trim();
        console.log(`Row ${index} status:`, statusText);
        if (!statusText.includes(statusFilter)) {
          showRow = false;
        }
      }
    }

    // ラベルフィルター
    if (labelFilter && labelFilter !== 'すべて') {
      const labelCell = row.querySelector('td:nth-child(4)');
      if (labelCell) {
        const labelText = labelCell.textContent.trim();
        console.log(`Row ${index} labels:`, labelText);
        if (!labelText.includes(labelFilter)) {
          showRow = false;
        }
      }
    }

    // 信頼度フィルター
    if (confidenceFilter && confidenceFilter !== 'すべて') {
      const confidenceCell = row.querySelector('td:nth-child(5)');
      if (confidenceCell) {
        const confidenceText = confidenceCell.textContent.trim();
        console.log(`Row ${index} confidence:`, confidenceText);
        if (!checkConfidenceRange(confidenceText, confidenceFilter)) {
          showRow = false;
        }
      }
    }

    // 行の表示/非表示
    if (showRow) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
      hiddenCount++;
    }
  });

  console.log(`Filtering complete: ${visibleCount} visible, ${hiddenCount} hidden`);
  console.log('=== applyFilters() finished ===');
}

// 信頼度範囲チェック
function checkConfidenceRange(confidenceText, filter) {
  const confidence = parseFloat(confidenceText.replace('%', ''));

  switch (filter) {
    case '90%以上':
      return confidence >= 90;
    case '80-89%':
      return confidence >= 80 && confidence < 90;
    case '70-79%':
      return confidence >= 70 && confidence < 80;
    case '60-69%':
      return confidence >= 60 && confidence < 70;
    case '60%未満':
      return confidence < 60;
    default:
      return true;
  }
}

// すべてのフィルターをリセットする関数
function resetAllFilters() {
  console.log('Resetting all filters...');

  // 検索入力をリセット
  const searchInput = document.getElementById('exampleDataList');
  if (searchInput) {
    searchInput.value = '';
  }

  // 日付ソートをリセット
  const dateSort = document.getElementById('dateSort');
  if (dateSort) {
    dateSort.selectedIndex = 0; // 最初のオプションを選択
  }

  // ステータスフィルターをリセット
  const statusFilter = document.getElementById('selectFloating');
  if (statusFilter) {
    statusFilter.selectedIndex = 0; // 最初のオプションを選択
  }

  // ラベルフィルターをリセット
  const labelFilter = document.getElementById('labelFilter');
  if (labelFilter) {
    labelFilter.selectedIndex = 0; // 最初のオプションを選択
  }

  // 信頼度フィルターをリセット
  const confidenceFilter = document.getElementById('confidenceFilter');
  if (confidenceFilter) {
    confidenceFilter.selectedIndex = 0; // 最初のオプションを選択
  }

  // フィルターを適用（リセット後の状態を反映）
  setTimeout(() => {
    applyFilters();
  }, 100);

  console.log('All filters have been reset');
}

// ページ読み込み時にイベントリスナーを設定
document.addEventListener('DOMContentLoaded', function () {
  console.log('table.js loaded successfully');

  // 検索入力のエンターキーイベント
  const searchInput = document.getElementById('exampleDataList');
  console.log('Search input found:', searchInput);
  if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
      console.log('Key pressed:', e.key);
      if (e.key === 'Enter') {
        console.log('Enter pressed, applying filters');
        applyFilters();
      }
    });
  }

  // フィルター選択の変更イベント（onchangeを使用）
  const dateSort = document.getElementById('dateSort');
  console.log('Date sort found:', dateSort);
  if (dateSort) {
    dateSort.onchange = function () {
      console.log('Date sort changed (onchange):', this.value);
      applyFilters();
    };
  }

  const statusFilter = document.getElementById('selectFloating');
  console.log('Status filter found:', statusFilter);
  if (statusFilter) {
    statusFilter.onchange = function () {
      console.log('Status filter changed (onchange):', this.value);
      applyFilters();
    };
  }

  const labelFilter = document.getElementById('labelFilter');
  console.log('Label filter found:', labelFilter);
  if (labelFilter) {
    labelFilter.onchange = function () {
      console.log('Label filter changed (onchange):', this.value);
      applyFilters();
    };
  }

  const confidenceFilter = document.getElementById('confidenceFilter');
  console.log('Confidence filter found:', confidenceFilter);
  if (confidenceFilter) {
    confidenceFilter.onchange = function () {
      console.log('Confidence filter changed (onchange):', this.value);
      applyFilters();
    };
  }
});