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

  console.log('All filters have been reset');
}