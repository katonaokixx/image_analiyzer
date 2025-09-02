// Test function to check if modal exists
function testModal() {
  const modal = document.getElementById('slide-down-animated-modal');
  console.log('Modal element:', modal);
  console.log('Modal HTML:', modal ? modal.outerHTML : 'Not found');
}

// Test function for preview modal
function testOpenModal() {
  console.log('=== Preview Modal Test ===');
  const previewModal = document.getElementById('slide-down-animated-modal');
  console.log('Preview modal element:', previewModal);
  console.log('Preview modal classes before:', previewModal.className);
  console.log('Preview modal HTML:', previewModal.outerHTML);

  // Check state immediately after click
  console.log('Preview modal classes immediately after click:', previewModal.className);

  // Check multiple times to see the transition
  for (let i = 1; i <= 10; i++) {
    setTimeout(() => {
      console.log(`Preview modal classes after ${i * 50}ms:`, previewModal.className);
      const rect = previewModal.getBoundingClientRect();
      console.log(`Preview modal bounding rect after ${i * 50}ms:`, rect);
    }, i * 50);
  }

  // Final check after longer delay
  setTimeout(() => {
    console.log('Preview modal final state:', previewModal.className);
    console.log('Preview modal final computed styles:', {
      display: window.getComputedStyle(previewModal).display,
      opacity: window.getComputedStyle(previewModal).opacity,
      visibility: window.getComputedStyle(previewModal).visibility,
      zIndex: window.getComputedStyle(previewModal).zIndex
    });
  }, 1000);
}

// Test function for image detail modal
function testImageModal() {
  console.log('=== Image Detail Modal Test ===');
  const imageModal = document.getElementById('slide-down-animated-modal');
  console.log('Image modal element:', imageModal);
  if (imageModal) {
    console.log('Image modal classes:', imageModal.className);
    console.log('Image modal HTML:', imageModal.outerHTML);
  } else {
    console.log('Image modal not found');
  }

  // Test if FlyonUI can find this modal
  const flyonuiButton = document.createElement('button');
  flyonuiButton.setAttribute('data-overlay', '#slide-down-animated-modal');
  flyonuiButton.style.display = 'none';
  document.body.appendChild(flyonuiButton);

  console.log('Test button created with data-overlay:', flyonuiButton.getAttribute('data-overlay'));

  // Try to trigger the modal
  flyonuiButton.click();

  // Clean up
  document.body.removeChild(flyonuiButton);

  console.log('Image modal test completed');
}

// Call test function when page loads
window.addEventListener('load', function () {
  console.log('Page loaded, testing modal...');
  testModal();
  testImageModal();

  // Add event listeners for close buttons
  const closeXButton = document.getElementById('modal-close-button');
  const closeButton = document.getElementById('modal-close-button');

  if (closeXButton) {
    closeXButton.addEventListener('click', function () {
      logCloseButtonClick('X button');
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', function () {
      logCloseButtonClick('Close button');
    });
  }
});