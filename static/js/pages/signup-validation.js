/**
 * サインアップページのバリデーション用JavaScript
 * templates/auth/signup.html から抽出
 */

document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM loaded, initializing validation');

  // アカウント作成成功時にモーダルを表示して自動リダイレクト
  const showSuccessModal = document.body.dataset.showSuccessModal === 'true';
  const showDuplicateModal = document.body.dataset.showDuplicateModal === 'true';

  if (showSuccessModal) {
    console.log('=== SUCCESS MODAL DEBUG ===');
    console.log('show_success_modal is true, attempting to show modal...');

    // モーダルを即座に表示
    const successModal = document.getElementById('signup-success-modal');
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
      setTimeout(function () {
        console.log('Redirecting to login page...');
        const loginUrl = document.body.dataset.loginUrl || '/v2/login/';
        window.location.href = loginUrl;
      }, 5000);
    } else {
      console.error('Success modal element not found!');
    }
  } else {
    console.log('show_success_modal is false, modal will not be shown');
  }

  // 重複エラーモーダルの表示
  if (showDuplicateModal) {
    console.log('=== DUPLICATE MODAL DEBUG ===');
    console.log('show_duplicate_modal is true, attempting to show modal...');

    const duplicateModal = document.getElementById('signup-duplicate-modal');
    if (duplicateModal) {
      console.log('Duplicate modal element found, showing modal...');

      // モーダルを表示
      duplicateModal.classList.remove('hidden');
      duplicateModal.classList.add('overlay-open');

      // モーダルの表示を確実にする
      duplicateModal.style.display = 'block';
      duplicateModal.style.visibility = 'visible';
      duplicateModal.style.opacity = '1';
      duplicateModal.style.position = 'fixed';
      duplicateModal.style.top = '0';
      duplicateModal.style.left = '0';
      duplicateModal.style.width = '100%';
      duplicateModal.style.height = '100%';
      duplicateModal.style.zIndex = '1000';

      // 背景オーバーレイを手動で追加
      if (!document.querySelector('.modal-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;';
        document.body.appendChild(backdrop);
      }

      // モーダルコンテンツの表示を確実にする
      const modalContent = duplicateModal.querySelector('.modal-content');
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
      const modalDialog = duplicateModal.querySelector('.modal-dialog');
      if (modalDialog) {
        modalDialog.style.display = 'flex';
        modalDialog.style.alignItems = 'center';
        modalDialog.style.justifyContent = 'center';
        modalDialog.style.minHeight = '100vh';
        modalDialog.style.margin = '0';
      }

      console.log('Duplicate modal should be visible now');

      // 5秒後にログイン画面にリダイレクト
      setTimeout(function () {
        console.log('Redirecting to login page...');
        const loginUrl = document.body.dataset.loginUrl || '/v2/login/';
        window.location.href = loginUrl;
      }, 5000);
    } else {
      console.error('Duplicate modal element not found!');
    }
  } else {
    console.log('show_duplicate_modal is false, modal will not be shown');
  }

  const usernameInput = document.getElementById('userName');
  const usernameStrengthBar = document.getElementById('username-strength-bar');
  const minLengthRule = document.querySelector('[data-pw-strength-rule="min-length"]');
  const lowercaseRule = document.querySelector('[data-pw-strength-rule="lowercase"]');

  const emailInput = document.getElementById('userEmail');
  const emailStrengthBar = document.getElementById('email-strength-bar');
  const emailMinLengthRule = document.querySelector('#email-hints-content [data-pw-strength-rule="min-length"]');
  const emailLowercaseRule = document.querySelector('#email-hints-content [data-pw-strength-rule="lowercase"]');

  const passwordInput = document.getElementById('toggle-password');
  const passwordStrengthBar = document.getElementById('password-strength-bar');
  const passwordMinLengthRule = document.querySelector('#password-hints-content [data-pw-strength-rule="min-length"]');
  const passwordLowercaseRule = document.querySelector('#password-hints-content [data-pw-strength-rule="lowercase"]');
  const passwordUppercaseRule = document.querySelector('#password-hints-content [data-pw-strength-rule="uppercase"]');
  const passwordNumbersRule = document.querySelector('#password-hints-content [data-pw-strength-rule="numbers"]');

  const confirmPasswordInput = document.getElementById('userConfrimPassword');
  const confirmPasswordStrengthBar = document.getElementById('confirm-password-strength-bar');
  const confirmPasswordRule = document.querySelector('#confirm-password-hints-content [data-pw-strength-rule="min-length"]');

  console.log('Elements found:', {
    usernameInput: !!usernameInput,
    usernameStrengthBar: !!usernameStrengthBar,
    minLengthRule: !!minLengthRule,
    lowercaseRule: !!lowercaseRule,
    emailInput: !!emailInput,
    emailStrengthBar: !!emailStrengthBar,
    emailMinLengthRule: !!emailMinLengthRule,
    emailLowercaseRule: !!emailLowercaseRule,
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

  function validateUsername() {
    const value = usernameInput.value;
    const isValid = /^[a-zA-Z0-9_ () \u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,20}$/.test(value);

    console.log('Validating username:', { value, isValid });

    // 強度バーの更新
    if (value.length === 0) {
      usernameStrengthBar.style.backgroundColor = '#d1d5db'; // グレー
      usernameStrengthBar.style.width = '0%';
    } else if (isValid) {
      usernameStrengthBar.style.backgroundColor = '#10b981'; // 緑色
      usernameStrengthBar.style.width = '100%';
    } else {
      usernameStrengthBar.style.backgroundColor = '#ef4444'; // 赤色
      usernameStrengthBar.style.width = '100%';
    }

    // ルール表示の更新
    if (minLengthRule) {
      const minLengthValid = value.length >= 2 && value.length <= 20;
      const minLengthCheck = minLengthRule.querySelector('[data-check]');
      const minLengthUncheck = minLengthRule.querySelector('[data-uncheck]');

      console.log('Min length validation:', { minLengthValid, hasCheck: !!minLengthCheck, hasUncheck: !!minLengthUncheck });

      if (minLengthValid) {
        minLengthRule.style.setProperty('color', '#10b981', 'important'); // 緑色
        console.log('Setting minLengthRule to green:', minLengthRule.style.color);
        if (minLengthCheck) minLengthCheck.classList.remove('hidden');
        if (minLengthUncheck) minLengthUncheck.classList.add('hidden');
      } else {
        minLengthRule.style.setProperty('color', '#6b7280', 'important'); // グレー色
        console.log('Setting minLengthRule to gray:', minLengthRule.style.color);
        if (minLengthCheck) minLengthCheck.classList.add('hidden');
        if (minLengthUncheck) minLengthUncheck.classList.remove('hidden');
      }
    }

    if (lowercaseRule) {
      const patternValid = /^[a-zA-Z0-9_ () \u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(value);
      const lowercaseCheck = lowercaseRule.querySelector('[data-check]');
      const lowercaseUncheck = lowercaseRule.querySelector('[data-uncheck]');

      console.log('Pattern validation:', { patternValid, hasCheck: !!lowercaseCheck, hasUncheck: !!lowercaseUncheck });

      if (patternValid && value.length > 0) {
        lowercaseRule.style.setProperty('color', '#10b981', 'important'); // 緑色
        console.log('Setting lowercaseRule to green:', lowercaseRule.style.color);
        if (lowercaseCheck) lowercaseCheck.classList.remove('hidden');
        if (lowercaseUncheck) lowercaseUncheck.classList.add('hidden');
      } else {
        lowercaseRule.style.setProperty('color', '#6b7280', 'important'); // グレー色
        console.log('Setting lowercaseRule to gray:', lowercaseRule.style.color);
        if (lowercaseCheck) lowercaseCheck.classList.add('hidden');
        if (lowercaseUncheck) lowercaseUncheck.classList.remove('hidden');
      }
    }
  }

  function validateEmail() {
    const value = emailInput.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);

    console.log('Validating email:', { value, isValid });

    // 強度バーの更新
    if (value.length === 0) {
      emailStrengthBar.style.backgroundColor = '#d1d5db'; // グレー
      emailStrengthBar.style.width = '0%';
    } else if (isValid) {
      emailStrengthBar.style.backgroundColor = '#10b981'; // 緑色
      emailStrengthBar.style.width = '100%';
    } else {
      emailStrengthBar.style.backgroundColor = '#ef4444'; // 赤色
      emailStrengthBar.style.width = '100%';
    }

    // ルール表示の更新
    if (emailMinLengthRule) {
      const emailFormatValid = emailRegex.test(value);
      const emailMinLengthCheck = emailMinLengthRule.querySelector('[data-check]');
      const emailMinLengthUncheck = emailMinLengthRule.querySelector('[data-uncheck]');

      console.log('Email format validation:', { emailFormatValid, hasCheck: !!emailMinLengthCheck, hasUncheck: !!emailMinLengthUncheck });

      if (emailFormatValid && value.length > 0) {
        emailMinLengthRule.style.setProperty('color', '#10b981', 'important'); // 緑色
        console.log('Setting emailMinLengthRule to green:', emailMinLengthRule.style.color);
        if (emailMinLengthCheck) emailMinLengthCheck.classList.remove('hidden');
        if (emailMinLengthUncheck) emailMinLengthUncheck.classList.add('hidden');
      } else {
        emailMinLengthRule.style.setProperty('color', '#6b7280', 'important'); // グレー色
        console.log('Setting emailMinLengthRule to gray:', emailMinLengthRule.style.color);
        if (emailMinLengthCheck) emailMinLengthCheck.classList.add('hidden');
        if (emailMinLengthUncheck) emailMinLengthUncheck.classList.remove('hidden');
      }
    }

    if (emailLowercaseRule) {
      const hasAtAndDomain = value.includes('@') && value.includes('.') && value.length > 0;
      const emailLowercaseCheck = emailLowercaseRule.querySelector('[data-check]');
      const emailLowercaseUncheck = emailLowercaseRule.querySelector('[data-uncheck]');

      console.log('Email domain validation:', { hasAtAndDomain, hasCheck: !!emailLowercaseCheck, hasUncheck: !!emailLowercaseUncheck });

      if (hasAtAndDomain) {
        emailLowercaseRule.style.setProperty('color', '#10b981', 'important'); // 緑色
        console.log('Setting emailLowercaseRule to green:', emailLowercaseRule.style.color);
        if (emailLowercaseCheck) emailLowercaseCheck.classList.remove('hidden');
        if (emailLowercaseUncheck) emailLowercaseUncheck.classList.add('hidden');
      } else {
        emailLowercaseRule.style.setProperty('color', '#6b7280', 'important'); // グレー色
        console.log('Setting emailLowercaseRule to gray:', emailLowercaseRule.style.color);
        if (emailLowercaseCheck) emailLowercaseCheck.classList.add('hidden');
        if (emailLowercaseUncheck) emailLowercaseUncheck.classList.remove('hidden');
      }
    }
  }

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
    function updateRule(rule, isValid, ruleName) {
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

    updateRule(passwordMinLengthRule, hasMinLength, 'min-length');
    updateRule(passwordLowercaseRule, hasLowercase, 'lowercase');
    updateRule(passwordUppercaseRule, hasUppercase, 'uppercase');
    updateRule(passwordNumbersRule, hasNumbers, 'numbers');
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

  if (usernameInput) {
    usernameInput.addEventListener('input', validateUsername);
    usernameInput.addEventListener('blur', validateUsername);
    console.log('Username event listeners added');
  } else {
    console.error('Username input not found!');
  }

  if (emailInput) {
    emailInput.addEventListener('input', validateEmail);
    emailInput.addEventListener('blur', validateEmail);
    console.log('Email event listeners added');
  } else {
    console.error('Email input not found!');
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      validatePassword();
      validateConfirmPassword(); // パスワードが変更されたら確認パスワードも再検証
    });
    passwordInput.addEventListener('blur', validatePassword);
    console.log('Password event listeners added');
  } else {
    console.error('Password input not found!');
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', validateConfirmPassword);
    confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
    console.log('Confirm password event listeners added');
  } else {
    console.error('Confirm password input not found!');
  }

  // フォーム送信時のバリデーション（一時的に無効化）
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function (e) {
      console.log('Form submit event triggered');
      const username = usernameInput.value;
      const email = emailInput.value;
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      console.log('Form data:', { username, email, password: '***', confirmPassword: '***' });

      // バリデーション（一時的にコメントアウト）
      /*
      const usernameValid = /^[a-zA-Z0-9_ () \u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,20}$/.test(username);
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const passwordValid = password.length >= 6 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
      const confirmPasswordValid = password === confirmPassword && confirmPassword.length > 0;

      if (!usernameValid || !emailValid || !passwordValid || !confirmPasswordValid) {
        e.preventDefault();
        alert('すべての項目を正しく入力してください。');
        return false;
      }
      */

      console.log('Form submission allowed');
    });
  }
});

