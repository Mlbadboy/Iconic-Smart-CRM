// Bulk Import Center Client-Side Handler

let activeJobId = null;
let pollInterval = null;
let selectedFile = null;

const token = localStorage.getItem('authToken');
if (!token) {
  window.location.href = '/login.html';
}

// Auth check check features
if (typeof requirePageFeature === 'function') {
  requirePageFeature('bulk_import');
}

document.addEventListener('DOMContentLoaded', () => {
  // Check parameters
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  if (type === 'products') {
    document.querySelector('input[name="importType"][value="products"]').checked = true;
  } else if (type === 'serials') {
    document.querySelector('input[name="importType"][value="serials"]').checked = true;
  }

  toggleTemplateLink();
  loadHistoryList();
  setupDragAndDrop();
  loadUserProfile();
});

function loadUserProfile() {
  const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
  if (user && user.name) {
    const el = document.getElementById('headerUserName');
    if (el) el.textContent = user.name;
    const mn = document.getElementById('userMenuName');
    if (mn) mn.textContent = user.name;
    const mr = document.getElementById('userMenuRole');
    if (mr) mr.textContent = (user.role || 'User').replace('-', ' ');
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const av = document.getElementById('avatarBadge');
    if (av) av.textContent = initials;
  }
}

function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('userDropdownMenu');
  if (menu) menu.classList.toggle('show');
}

window.addEventListener('click', (e) => {
  if (!e.target.closest('.user-dropdown')) {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.remove('show');
  }
});

function logout() {
  localStorage.clear();
  window.location.href = '/login.html';
}

// Setup drag and drop events
function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      handleFile(files[0]);
    }
  }, false);
}

function handleFileSelected(e) {
  const files = e.target.files;
  if (files.length) {
    handleFile(files[0]);
  }
}

function handleFile(file) {
  if (file.name.slice(-4).toLowerCase() !== '.csv') {
    showToast('Invalid format. Please select a .csv file', 'error');
    return;
  }
  selectedFile = file;
  document.getElementById('selectedFileName').innerText = file.name;
  document.getElementById('selectedFileSize').innerText = (file.size / 1024).toFixed(1) + ' KB';
  document.getElementById('selectedFileInfo').style.display = 'block';
}

function toggleTemplateLink() {
  // Kept for event bindings, actual download is routed via downloadTemplate below
}

async function downloadTemplate(e) {
  if (e) e.preventDefault();
  const type = document.querySelector('input[name="importType"]:checked').value;
  const url = type === 'products' ? '/api/bulk-import/templates/products' : '/api/bulk-import/templates/serials';
  
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch template from server');
    
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = type === 'products' ? 'products_template.csv' : 'serials_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Upload step
async function startUpload() {
  if (!selectedFile) {
    showToast('Please select or drop a CSV file first.', 'error');
    return;
  }

  const importType = document.querySelector('input[name="importType"]:checked').value;
  const importMode = document.querySelector('input[name="importMode"]:checked').value;
  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('importType', importType);

  // Clear previous screens
  document.getElementById('quotaAlert').style.display = 'none';
  document.getElementById('processingEmptyState').style.display = 'none';
  document.getElementById('validationResultDeck').style.display = 'none';
  document.getElementById('errorLogBox').style.display = 'none';
  document.getElementById('executionActions').style.display = 'none';
  document.getElementById('successSummary').style.display = 'none';

  // Show progress container
  const progressContainer = document.getElementById('jobProgressContainer');
  progressContainer.style.display = 'block';
  updateProgress('Uploading file...', 0, '0 KB / 0 KB');

  try {
    const res = await fetch('/api/bulk-import/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && data.code === 'STORAGE_QUOTA_EXCEEDED') {
        showQuotaAlert(data.error);
        progressContainer.style.display = 'none';
        document.getElementById('processingEmptyState').style.display = 'block';
        return;
      }
      throw new Error(data.error || 'Upload failed');
    }

    activeJobId = data.jobId;
    showToast('File uploaded successfully. Initializing validation...');

    // Trigger validation
    await triggerValidation(activeJobId, importMode);
  } catch (err) {
    showToast(err.message, 'error');
    progressContainer.style.display = 'none';
    document.getElementById('processingEmptyState').style.display = 'block';
  }
}

// Trigger validation
async function triggerValidation(jobId, mode) {
  try {
    const res = await fetch(`/api/bulk-import/${jobId}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Validation trigger failed');

    // Poll job status
    startPolling(jobId, 'validation');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Start polling status
function startPolling(jobId, stage) {
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/bulk-import/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to query status');
      const job = await res.json();

      if (stage === 'validation') {
        updateProgress(
          `Validating rows... (${job.processedRows} processed)`,
          job.progress,
          `${job.processedRows} / ${job.totalRows || 'Calculating...'} rows`
        );

        if (job.status === 'VALIDATED') {
          clearInterval(pollInterval);
          renderValidationResult(job);
        } else if (job.status === 'FAILED') {
          clearInterval(pollInterval);
          showToast('Validation failed.', 'error');
          document.getElementById('progressStatusText').innerText = 'Validation failed';
        }
      } else if (stage === 'execution') {
        updateProgress(
          `Importing valid records... (${job.importedRows} imported)`,
          job.progress,
          `${job.importedRows} / ${job.validRows} committed`
        );

        if (['COMPLETED', 'COMPLETED_WITH_ERRORS'].includes(job.status)) {
          clearInterval(pollInterval);
          renderExecutionSummary(job);
        } else if (job.status === 'FAILED') {
          clearInterval(pollInterval);
          showToast('Database import execution failed.', 'error');
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 500);
}

function updateProgress(status, percent, details) {
  document.getElementById('progressStatusText').innerText = status;
  document.getElementById('jobProgressBar').style.width = percent + '%';
  document.getElementById('progressPercent').innerText = percent + '%';
  document.getElementById('progressCount').innerText = details;
}

// Render validation result dashboard
async function renderValidationResult(job) {
  document.getElementById('jobProgressContainer').style.display = 'none';

  // Badges counts
  document.getElementById('countValid').innerText = job.validRows;
  document.getElementById('countWarnings').innerText = job.warningRows;
  document.getElementById('countErrors').innerText = job.errorRows;
  document.getElementById('validationResultDeck').style.display = 'grid';

  // Render logs if present
  if (job.errorRows > 0) {
    try {
      const res = await fetch(`/api/bulk-import/${job.jobId}/errors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const csvText = await res.text();
        const lines = csvText.split('\n').slice(1, 11); // Read top 10 errors
        const container = document.getElementById('errorLogContainer');
        container.innerHTML = '';
        lines.forEach(l => {
          if (!l.trim()) return;
          const parts = l.split(',');
          const div = document.createElement('div');
          div.className = 'error-log-item';
          div.innerText = `Row ${parts[0]}: ${parts[4]?.replace(/"/g, '') || 'Row validation rejected'}`;
          container.appendChild(div);
        });
        document.getElementById('errorLogBox').style.display = 'block';
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Display commit action button
  const execActions = document.getElementById('executionActions');
  execActions.style.display = 'flex';

  const downloadErrorsBtn = document.getElementById('downloadErrorsBtn');
  if (job.errorRows > 0) {
    downloadErrorsBtn.style.display = 'inline-block';
  } else {
    downloadErrorsBtn.style.display = 'none';
  }

  const commitBtn = document.getElementById('commitBtn');
  if (job.validRows > 0) {
    commitBtn.style.display = 'inline-block';
  } else {
    commitBtn.style.display = 'none';
  }

  loadHistoryList();
}

// Commit validated imports
async function commitImport() {
  if (!activeJobId) return;

  const importMode = document.querySelector('input[name="importMode"]:checked').value;
  document.getElementById('executionActions').style.display = 'none';
  document.getElementById('errorLogBox').style.display = 'none';

  const progressContainer = document.getElementById('jobProgressContainer');
  progressContainer.style.display = 'block';
  updateProgress('Importing valid records...', 0, '0 committed');

  try {
    const res = await fetch(`/api/bulk-import/${activeJobId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: importMode })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import commit failed');

    startPolling(activeJobId, 'execution');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Render execution summary completes
function renderExecutionSummary(job) {
  document.getElementById('jobProgressContainer').style.display = 'none';
  document.getElementById('validationResultDeck').style.display = 'none';

  const successText = `Successfully imported ${job.importedRows} records into database. ${job.rejectedRows} records rejected/skipped.`;
  document.getElementById('successSummaryText').innerText = successText;
  document.getElementById('successSummary').style.display = 'block';

  showToast('Bulk import completed!');
  loadHistoryList();
}

function downloadErrors() {
  if (!activeJobId) return;
  window.open(`/api/bulk-import/${activeJobId}/errors?token=${token}`, '_blank');
}

// Load execution history
async function loadHistoryList() {
  try {
    const res = await fetch('/api/bulk-import', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load history');
    const data = await res.json();

    const tbody = document.getElementById('historyTableBody');
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No bulk data imports performed yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(job => {
      const dateStr = new Date(job.createdAt).toLocaleString();
      const statusClass = `status-${job.status.toLowerCase()}`;

      return `
        <tr>
          <td><strong>${escapeHtml(job.fileName)}</strong></td>
          <td><span style="text-transform:uppercase;">${job.importType}</span></td>
          <td>${dateStr}</td>
          <td>${job.totalRows}</td>
          <td style="color:var(--success); font-weight:600;">${job.importedRows}</td>
          <td style="color:${job.rejectedRows > 0 ? 'var(--danger)' : 'var(--text-muted)'};">${job.rejectedRows}</td>
          <td><span class="status-pill ${statusClass}">${job.status.replace(/_/g, ' ')}</span></td>
          <td>
            ${job.errorRows > 0 ? `
              <button class="btn btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="window.open('/api/bulk-import/${job.jobId}/errors?token=${token}', '_blank')">
                ✕ Error CSV
              </button>
            ` : '-'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error rendering history:', err);
  }
}

function showQuotaAlert(msg) {
  const panel = document.getElementById('quotaAlert');
  document.getElementById('quotaAlertText').innerText = msg;
  panel.style.display = 'block';
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
