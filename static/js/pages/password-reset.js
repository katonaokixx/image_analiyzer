/**
 * パスワードリセットページ用JavaScript
 * templates/auth/password_reset.html から抽出
 */

document.addEventListener('DOMContentLoaded', function () {
  // 成功モーダルの表示処理
  const showSuccessModal = document.body.dataset.showSuccessModal === 'true';

  if (showSuccessModal) {
    console.log('=== PASSWORD RESET SUCCESS MODAL DEBUG ===');
    console.log('show_success_modal is true, attempting to show modal...');

    // モーダルを即座に表示
    const successModal = document.getElementById('password-reset-success-modal');
    if (successModal) {
      console.log('Modal element found, showing modal...');

      // モーダルを表示
      successModal.classList.remove('hidden');
      successModal.classList.add('overlay-open');

      // モーダルの表示を確実にする
      successModal.style.display = 'block';
      successModal.style.visibility = 'visible';
      successModal.style.opacity = '1';
      successModal.style.position = 'fixed';
      successModal.style.top = '0';
      successModal.style.left = '0';
      successModal.style.width = '100%';
      successModal.style.height = '100%';
      successModal.style.zIndex = '1000';

      // 背景オーバーレイを手動で追加
      if (!document.querySelector('.modal-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;';
        document.body.appendChild(backdrop);
      }

      // モーダルコンテンツの表示を確実にする
      const modalContent = successModal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.style.display = 'block';
        modalContent.style.visibility = 'visible';
        modalContent.style.opacity = '1';
        modalContent.style.position = 'relative';
        modalContent.style.zIndex = '1001';
        modalContent.style.maxWidth = '500px';
        modalContent.style.width = '90%';
        modalContent.style.margin = '20px';
        modalContent.style.background = 'white';
        modalContent.style.borderRadius = '8px';
        modalContent.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      }

      // モーダルダイアログの表示を確実にする
      const modalDialog = successModal.querySelector('.modal-dialog');
      if (modalDialog) {
        modalDialog.style.display = 'flex';
        modalDialog.style.alignItems = 'center';
        modalDialog.style.justifyContent = 'center';
        modalDialog.style.minHeight = '100vh';
        modalDialog.style.margin = '0';
      }

      console.log('Modal should be visible now');
      console.log('Modal classes:', successModal.className);
      console.log('Modal computed style:', window.getComputedStyle(successModal).display);

      // 5秒後にログイン画面にリダイレクト
      const loginUrl = document.body.dataset.loginUrl || '/v2/login/';
      setTimeout(function () {
        console.log('Redirecting to login page...');
        window.location.href = loginUrl;
      }, 5000);
    } else {
      console.error('Modal element not found!');
    }
  }

  const passwordInput = document.getElementById('toggle-password');
  const confirmPasswordInput = document.getElementById('userConfrimPassword');
  const passwordStrengthBar = document.getElementById('password-strength-bar');
  const confirmPasswordStrengthBar = document.getElementById('confirm-password-strength-bar');
  const passwordMinLengthRule = document.querySelector('[data-pw-strength-rule="min-length"]');
  const passwordLowercaseRule = document.querySelector('[data-pw-strength-rule="lowercase"]');
  const passwordUppercaseRule = document.querySelector('[data-pw-strength-rule="uppercase"]');
  const passwordNumbersRule = document.querySelector('[data-pw-strength-rule="numbers"]');
  const confirmPasswordRule = document.querySelector('#confirm-password-hints-content [data-pw-strength-rule="min-length"]');

  console.log('Password reset validation elements found:', {
    passwordInput: !!passwordInput,
    passwordStrengthBar: !!passwordStrengthBar,
    passwordMinLengthRule: !!passwordMinLengthRule,
    passwordLowercaseRule: !!passwordLowercaseRule,
    passwordUppercaseRule: !!passwordUppercaseRule,
    passwordNumbersRule: !!passwordNumbersRule,
    confirmPasswordInput: !!confirmPasswordInput,
    confirmPasswordStrengthBar: !!confirmPasswordStrengthBar,
    confirmPasswordRule: !!confirmPasswordRule
  });

  function validatePassword() {
    const value = passwordInput.value;
    const hasMinLength = value.length >= 6;
    const hasLowercase = /[a-z]/.test(value);
    const hasUppercase = /[A-Z]/.test(value);
    const hasNumbers = /[0-9]/.test(value);
    const isValid = hasMinLength && hasLowercase && hasUppercase && hasNumbers;

    console.log('Validating password:', { value, hasMinLength, hasLowercase, hasUppercase, hasNumbers, isValid });

    // 強度バーの更新
    if (value.length === 0) {
      passwordStrengthBar.style.backgroundColor = '#d1d5db'; // グレー
      passwordStrengthBar.style.width = '0%';
    } else if (isValid) {
      passwordStrengthBar.style.backgroundColor = '#10b981'; // 緑色
      passwordStrengthBar.style.width = '100%';
    } else {
      passwordStrengthBar.style.backgroundColor = '#ef4444'; // 赤色
      passwordStrengthBar.style.width = '100%';
    }

    // ルール表示の更新
    function updateRule(rule, isValid) {
      if (rule) {
        const check = rule.querySelector('[data-check]');
        const uncheck = rule.querySelector('[data-uncheck]');

        if (isValid) {
          rule.style.setProperty('color', '#10b981', 'important'); // 緑色
          if (check) check.classList.remove('hidden');
          if (uncheck) uncheck.classList.add('hidden');
        } else {
          rule.style.setProperty('color', '#6b7280', 'important'); // グレー色
          if (check) check.classList.add('hidden');
          if (uncheck) uncheck.classList.remove('hidden');
        }
      }
    }

    updateRule(passwordMinLengthRule, hasMinLength);
    updateRule(passwordLowercaseRule, hasLowercase);
    updateRule(passwordUppercaseRule, hasUppercase);
    updateRule(passwordNumbersRule, hasNumbers);
  }

  function validateConfirmPassword() {
    const value = confirmPasswordInput.value;
    const passwordValue = passwordInput.value;
    const isMatch = value === passwordValue && value.length > 0;

    console.log('Validating confirm password:', { value, passwordValue, isMatch });

    // 強度バーの更新
    if (value.length === 0) {
      confirmPasswordStrengthBar.style.backgroundColor = '#d1d5db'; // グレー
      confirmPasswordStrengthBar.style.width = '0%';
    } else if (isMatch) {
      confirmPasswordStrengthBar.style.backgroundColor = '#10b981'; // 緑色
      confirmPasswordStrengthBar.style.width = '100%';
    } else {
      confirmPasswordStrengthBar.style.backgroundColor = '#ef4444'; // 赤色
      confirmPasswordStrengthBar.style.width = '100%';
    }

    // ルール表示の更新
    if (confirmPasswordRule) {
      const check = confirmPasswordRule.querySelector('[data-check]');
      const uncheck = confirmPasswordRule.querySelector('[data-uncheck]');

      if (isMatch) {
        confirmPasswordRule.style.setProperty('color', '#10b981', 'important'); // 緑色
        console.log('Setting confirmPasswordRule to green:', confirmPasswordRule.style.color);
        if (check) check.classList.remove('hidden');
        if (uncheck) uncheck.classList.add('hidden');
      } else {
        confirmPasswordRule.style.setProperty('color', '#6b7280', 'important'); // グレー色
        console.log('Setting confirmPasswordRule to gray:', confirmPasswordRule.style.color);
        if (check) check.classList.add('hidden');
        if (uncheck) uncheck.classList.remove('hidden');
      }
    }
  }

  if (passwordInput && confirmPasswordInput) {
    passwordInput.addEventListener('input', function () {
      validatePassword();
      validateConfirmPassword(); // パスワードが変更されたら確認パスワードも再検証
    });

    passwordInput.addEventListener('blur', validatePassword);

    confirmPasswordInput.addEventListener('input', validateConfirmPassword);
  } else {
    console.error('Password inputs not found!');
  }
});

