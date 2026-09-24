// Web App Deployment Endpoint
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVnxbkylSC6aKiZ7e7UdrKogVqsVrFTQOEZ8exauIUj47XrQpgK9TAaRBOpR56ESoR/exec";

let configData = {};
let isZoomed = false;
let googleEmail = "bypassed_user@example.com"; // Bypassed

// DOM Elements
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
if (helpToggleBtn) {
  helpToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    helpBox.classList.toggle('active');
  });
}

if (closeHelpBtn) {
  closeHelpBtn.addEventListener('click', () => {
    helpBox.classList.remove('active');
  });
}

// Close Help Box when clicking outside
document.addEventListener('click', (e) => {
  if (helpBox && !helpBox.contains(e.target) && e.target !== helpToggleBtn) {
    helpBox.classList.remove('active');
  }
});

function showModal(text = "Processing request...") {
  if (loadingText && loadingModal) {
    loadingText.textContent = text;
    loadingModal.classList.add('active');
  }
}

function hideModal() {
  if (loadingModal) {
    loadingModal.classList.remove('active');
  }
}

function enableFormInputs() {
  if (dateSelect) dateSelect.disabled = false;
  const emailElem = document.getElementById('email');
  const rollElem = document.getElementById('rollNumber');

  if (emailElem) emailElem.disabled = false;
  if (rollElem) rollElem.disabled = false;
  if (serialInput) serialInput.disabled = false;
}

// ------------------------------------------------------------
// CONFIG FETCHING & DROPDOWN POPULATION (NO AUTH CHECK)
// ------------------------------------------------------------

async function loadConfig() {
  // Clear any existing hardcoded HTML options immediately
  if (dateSelect) {
    dateSelect.innerHTML = '<option value="">Loading dates...</option>';
  }

  showModal("Please wait. Loading options...");
  try {
    const response = await fetch(`${SCRIPT_URL}?_=${Date.now()}`);
    const json = await response.json();

    if (json.status === "success" && json.data) {
      configData = json.data;
      populateDates();
      enableFormInputs();
    } else {
      showStatus("Failed to load options from server. Try later...", "error");
    }
  } catch (err) {
    showStatus("Network error while loading configuration.", "error");
  } finally {
    hideModal();
  }
}

function populateDates() {
  if (!dateSelect) return;

  const dates = Object.keys(configData)
    .filter(d => d !== 'Date')
    .sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('_').map(Number);
      const [dayB, monthB, yearB] = b.split('_').map(Number);

      return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
    });

  if (dates.length === 0) {
    dateSelect.innerHTML = '<option value="">No dates available</option>';
    dateSelect.disabled = true;
    return;
  }

  dateSelect.innerHTML = '<option value="">-- Select Date --</option>';

  dates.forEach(date => {
    const opt = document.createElement('option');
    opt.value = date;
    opt.textContent = date.replace(/_/g, '/');
    dateSelect.appendChild(opt);
  });

  dateSelect.disabled = false;
}

// ------------------------------------------------------------
// SELECTION & PREVIEW HANDLERS
// ------------------------------------------------------------

if (dateSelect) {
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
}

if (groupSelect) {
  groupSelect.addEventListener('change', () => {
    updateImagePreview();
    updateSerialLimit();
  });
}

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
  if (previewImg) {
    previewImg.src = '';
    previewImg.style.display = 'none';
  }
  if (previewPlaceholder) {
    previewPlaceholder.style.display = 'block';
  }
}

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
  if (serialInput) {
    serialInput.removeAttribute('max');
    serialInput.placeholder = "e.g. 12";
  }
}

// ------------------------------------------------------------
// FORM SUBMISSION HANDLING
// ------------------------------------------------------------

if (attendanceForm) {
  attendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatus();

    const serialNum = parseInt(serialInput.value.trim(), 10);
    const maxSerial = getMaxSerial();

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
      googleEmail: googleEmail,
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
}

function showStatus(text, type) {
  if (statusMessage) {
    statusMessage.textContent = text;
    statusMessage.className = `status-msg ${type}`;
    statusMessage.style.display = 'block';
  }
}

function hideStatus() {
  if (statusMessage) statusMessage.style.display = 'none';
}

// Run immediately on page load
loadConfig();