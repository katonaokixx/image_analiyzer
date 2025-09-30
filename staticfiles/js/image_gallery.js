// 画像ギャラリーの遅延読み込みとエラーハンドリング
window.addEventListener('load', () => {

  // 画像プレースホルダーの遅延読み込み
  function loadImagePlaceholders() {
    const placeholders = document.querySelectorAll('.image-placeholder, .image-placeholder-small, .image-placeholder-modal');

    placeholders.forEach(placeholder => {
      const imageSrc = placeholder.getAttribute('data-src');
      if (!imageSrc) return;

      // 画像を読み込み
      const img = new Image();

      img.onload = () => {
        // 読み込み成功：プレースホルダーを画像に置き換え
        placeholder.style.backgroundImage = `url(${imageSrc})`;
        placeholder.style.backgroundSize = 'cover';
        placeholder.style.backgroundPosition = 'center';
        placeholder.style.backgroundRepeat = 'no-repeat';

        // スケルトンローダーを非表示
        const skeleton = placeholder.querySelector('.skeleton');
        if (skeleton) {
          skeleton.style.display = 'none';
        }

        // クラスを追加してCSSセレクターで確実にスタイル適用
        placeholder.classList.add('image-loaded');


      };

      img.onerror = () => {
        // 読み込み失敗：エラー表示
        const skeleton = placeholder.querySelector('.skeleton');
        if (skeleton) {
          skeleton.innerHTML = '<div class="flex items-center justify-center h-full text-error"><span class="icon-[tabler--photo-x] size-8"></span></div>';
        }


      };

      // 画像読み込み開始
      img.src = imageSrc;
    });
  }

  // Intersection Observer でビューポートに入った時だけ読み込み
  function setupLazyLoading() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const placeholder = entry.target;
          const imageSrc = placeholder.getAttribute('data-src');

          if (imageSrc && !placeholder.dataset.loaded) {
            placeholder.dataset.loaded = 'true';
            loadImage(placeholder, imageSrc);
          }
        }
      });
    }, {
      rootMargin: '50px' // 50px手前から読み込み開始
    });

    // プレースホルダーを監視対象に追加
    const placeholders = document.querySelectorAll('.image-placeholder, .image-placeholder-small, .image-placeholder-modal');
    placeholders.forEach(placeholder => {
      observer.observe(placeholder);
    });
  }

  // 個別画像読み込み関数
  function loadImage(placeholder, imageSrc) {
    const img = new Image();

    img.onload = () => {
      // 読み込み成功
      placeholder.style.backgroundImage = `url(${imageSrc})`;
      placeholder.style.backgroundSize = 'cover';
      placeholder.style.backgroundPosition = 'center';
      placeholder.style.backgroundRepeat = 'no-repeat';

      // スケルトンローダーを非表示
      const skeleton = placeholder.querySelector('.skeleton');
      if (skeleton) {
        skeleton.style.display = 'none';
      }

      // クラスを追加してCSSセレクターで確実にスタイル適用
      placeholder.classList.add('image-loaded');


    };

    img.onerror = () => {
      // 読み込み失敗
      const skeleton = placeholder.querySelector('.skeleton');
      if (skeleton) {
        skeleton.innerHTML = '<div class="flex items-center justify-center h-full text-error"><span class="icon-[tabler--photo-x] size-8"></span></div>';
      }
    };

    img.src = imageSrc;
  }

  // 初期化
  if ('IntersectionObserver' in window) {
    setupLazyLoading();
  } else {
    // フォールバック：即座に読み込み
    loadImagePlaceholders();
  }


});
