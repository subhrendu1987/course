// Web App Deployment Endpoint
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGKmP2E9yDjd1MNhMdB7K-ZecdB5wAQhLcYbo89-vlQCP7XLhgLXJPdt7PE_JD1LWHMQ/exec";

let configData = {};
let isZoomed = false;

const dateSelect = document.getElementById('classDate');
const groupSelect = document.getElementById('groupName');
const previewImg = document.getElementById('previewImg');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const serialInput = document.getElementById('serialNumber');
const attendanceForm = document.getElementById('attendanceForm');
const submitBtn = document.getElementById('submitBtn');
const statusMessage = document.getElementById('statusMessage');

// Loading Modal Elements
const loadingModal = document.getElementById('loadingModal');
const loadingText = document.getElementById('loadingText');

// Image Lightbox Elements
const imageModal = document.getElementById('imageModal');
const fullscreenImg = document.getElementById('fullscreenImg');
const closeImageModal = document.getElementById('closeImageModal');

// Help Box Elements
const helpToggleBtn = document.getElementById('helpToggleBtn');
const helpBox = document.getElementById('helpBox');
const closeHelpBtn = document.getElementById('closeHelpBtn');

// Toggle Help Box
helpToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  helpBox.classList.toggle('active');
});

closeHelpBtn.addEventListener('click', () => {
  helpBox.classList.remove('active');
});

// Close Help Box when clicking outside
document.addEventListener('click', (e) => {
  if (!helpBox.contains(e.target) && e.target !== helpToggleBtn) {
    helpBox.classList.remove('active');
  }
});

function showModal(text = "Processing request...") {
  loadingText.textContent = text;
  loadingModal.classList.add('active');
}

function hideModal() {
  loadingModal.classList.remove('active');
}

// Fetch Config Data on Page Load
async function loadConfig() {
  showModal("Please wait. Loading options...");
  try {
    const response = await fetch(SCRIPT_URL);
    const json = await response.json();

    if (json.status === "success" && json.data) {
      configData = json.data;
      populateDates();
    } else {
      showStatus("Failed to load options from server. Try later...", "error");
    }
  } catch (err) {
    showStatus("Network error while loading configuration.", "error");
  } finally {
    hideModal();
  }
}

// Populate Date Dropdown (skips non-date header keys if present)
function populateDates() {
  dateSelect.innerHTML = '<option value="">-- Select Date --</option>';
  const dates = Object.keys(configData).filter(d => d !== 'Date');

  if (dates.length === 0) {
    dateSelect.innerHTML = '<option value="">No dates available</option>';
    return;
  }

  dates.forEach(date => {
    const opt = document.createElement('option');
    opt.value = date;
    opt.textContent = date.replace(/_/g, '/');
    dateSelect.appendChild(opt);
  });
}

// Handle Date Selection Change
dateSelect.addEventListener('change', () => {
  const selectedDate = dateSelect.value;
  groupSelect.innerHTML = '<option value="">-- Select Group --</option>';
  resetPreview();
  resetSerialLimit();

  if (selectedDate && configData[selectedDate]) {
    groupSelect.disabled = false;
    configData[selectedDate].forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.group;
      opt.textContent = item.group;
      groupSelect.appendChild(opt);
    });
  } else {
    groupSelect.disabled = true;
    groupSelect.innerHTML = '<option value="">Select Date First</option>';
  }
});

// Handle Group Selection Change -> Update Image & Limits
groupSelect.addEventListener('change', () => {
  updateImagePreview();
  updateSerialLimit();
});

function updateImagePreview() {
  const selectedDate = dateSelect.value;
  const selectedGroup = groupSelect.value;

  if (selectedDate && selectedGroup && configData[selectedDate]) {
    const match = configData[selectedDate].find(item => item.group === selectedGroup);
    if (match && match.imageUrl) {
      previewImg.src = match.imageUrl;
      previewImg.style.display = 'block';
      previewPlaceholder.style.display = 'none';
      return;
    }
  }
  resetPreview();
}

function resetPreview() {
  previewImg.src = '';
  previewImg.style.display = 'none';
  previewPlaceholder.style.display = 'block';
}

// Helper: Get maxSerial for current selected Date and Group
function getMaxSerial() {
  const selectedDate = dateSelect.value;
  const selectedGroup = groupSelect.value;

  if (selectedDate && selectedGroup && configData[selectedDate]) {
    const match = configData[selectedDate].find(item => item.group === selectedGroup);
    if (match && match.maxSerial !== undefined && match.maxSerial !== null) {
      return Number(match.maxSerial);
    }
  }
  return null;
}

// Update input max attribute & placeholder based on maxSerial
function updateSerialLimit() {
  const maxSerial = getMaxSerial();

  if (maxSerial !== null && !isNaN(maxSerial)) {
    serialInput.max = maxSerial;
    serialInput.placeholder = `e.g. 1 to ${maxSerial}`;
  } else {
    resetSerialLimit();
  }
}

function resetSerialLimit() {
  serialInput.removeAttribute('max');
  serialInput.placeholder = "e.g. 12";
}

// Lightbox Zoom Event Listeners
previewImg.addEventListener('click', () => {
  if (previewImg.src) {
    fullscreenImg.src = previewImg.src;
    imageModal.classList.add('active');
  }
});

fullscreenImg.addEventListener('click', (e) => {
  e.stopPropagation();
  isZoomed = !isZoomed;

  if (isZoomed) {
    fullscreenImg.classList.add('zoomed');
    updateZoomPosition(e);
  } else {
    resetZoom();
  }
});

fullscreenImg.addEventListener('mousemove', (e) => {
  if (isZoomed) updateZoomPosition(e);
});

function updateZoomPosition(e) {
  const rect = fullscreenImg.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  fullscreenImg.style.transformOrigin = `${x}% ${y}%`;
}

function resetZoom() {
  isZoomed = false;
  fullscreenImg.classList.remove('zoomed');
  fullscreenImg.style.transformOrigin = 'center center';
}

function closeFullscreen() {
  resetZoom();
  imageModal.classList.remove('active');
}

closeImageModal.addEventListener('click', closeFullscreen);

imageModal.addEventListener('click', (e) => {
  if (e.target === imageModal) closeFullscreen();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (imageModal.classList.contains('active')) closeFullscreen();
    if (helpBox.classList.contains('active')) helpBox.classList.remove('active');
  }
});

// Form Submission Handling
attendanceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideStatus();

  const serialNum = parseInt(serialInput.value.trim(), 10);
  const maxSerial = getMaxSerial();

  // Validate Serial Number against upper bound
  if (isNaN(serialNum) || serialNum < 1) {
    showStatus('❌ Serial Number must be a valid number greater than 0.', 'error');
    return;
  }

  if (maxSerial !== null && serialNum > maxSerial) {
    showStatus(`❌ Serial Number cannot be greater than ${maxSerial} for this section.`, 'error');
    return;
  }

  submitBtn.disabled = true;
  showModal("Submitting attendance...");

  const payload = {
    date: dateSelect.value,
    group: groupSelect.value,
    email: document.getElementById('email').value.trim(),
    rollNumber: document.getElementById('rollNumber').value.trim(),
    serialNumber: serialInput.value.trim()
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === 'success') {
      showStatus('✅ ' + (result.message || 'Attendance marked successfully!'), 'success');
      serialInput.value = '';
    } else if (result.status === 'conflict') {
      showStatus('⚠️ ' + (result.message || 'Duplicate submission detected.'), 'warning');
    } else {
      showStatus('❌ ' + (result.message || 'An error occurred during submission.'), 'error');
    }
  } catch (err) {
    showStatus('❌ Submission failed. Please try again.', 'error');
  } finally {
    hideModal();
    submitBtn.disabled = false;
  }
});

function showStatus(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = `status-msg ${type}`;
  statusMessage.style.display = 'block';
}

function hideStatus() {
  statusMessage.style.display = 'none';
}

// Initialize Page
loadConfig();