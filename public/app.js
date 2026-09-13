// API Base URL
const API_URL = 'http://localhost:5000/api';

// Global state
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let currentCaseId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (authToken && currentUser) {
        if (currentUser.isAdmin) {
            showAdminDashboard();
        } else {
            showDashboard();
            loadDashboardData();
        }
    } else {
        showLogin();
    }

    // Setup form handlers
    setupFormHandlers();
});

// Form handlers
function setupFormHandlers() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        await login(email, password);
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            policeId: document.getElementById('regPoliceId').value,
            department: document.getElementById('regDepartment').value,
            station: document.getElementById('regStation').value
        };
        await register(data);
    });

    // Case form
    document.getElementById('caseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createCase();
    });

    // Upload form (inside modal)
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await uploadEvidence();
    });
}

// Authentication functions
async function login(email, password) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.officer;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast('Login successful!', 'success');
            if (currentUser.isAdmin) {
                showAdminDashboard();
            } else {
                showDashboard();
                loadDashboardData();
            }
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Make sure server is running.', 'error');
        console.error('Login error:', error);
    } finally {
        showLoading(false);
    }
}

async function register(data) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            showLogin();
            document.getElementById('loginEmail').value = data.email;
        } else {
            showToast(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Make sure server is running.', 'error');
        console.error('Register error:', error);
    } finally {
        showLoading(false);
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showToast('Logged out successfully', 'info');
    showLogin();
}

// Evidence functions
async function uploadEvidence() {
    showLoading(true);
    try {
        const formData = new FormData();
        formData.append('file', document.getElementById('evidenceFile').files[0]);
        formData.append('caseId', document.getElementById('caseId').value);
        formData.append('evidenceName', document.getElementById('evidenceName').value);
        formData.append('evidenceType', document.getElementById('evidenceType').value);
        formData.append('description', document.getElementById('description').value);

        const uploadCaseId = document.getElementById('caseId').value; // save before reset

        const response = await fetch(`${API_URL}/evidence/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Evidence uploaded successfully!', 'success');
            closeUploadModal();
            openCaseDetail(uploadCaseId);
            loadCases();
        } else {
            showToast(data.message || 'Upload failed', 'error');
        }
    } catch (error) {
        showToast('Upload error. Check file size and connection.', 'error');
        console.error('Upload error:', error);
    } finally {
        showLoading(false);
    }
}

async function loadEvidenceList() {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/evidence/list`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (response.ok) {
            displayEvidenceList(data);
        } else {
            showToast('Failed to load evidence', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
        console.error('Load evidence error:', error);
    } finally {
        showLoading(false);
    }
}

// All evidence stored for client-side filtering
let allEvidenceData = [];

function displayEvidenceList(evidenceList) {
    allEvidenceData = evidenceList;

    // Populate case dropdown with unique case IDs
    const caseSelect = document.getElementById('filterCase');
    const currentVal = caseSelect.value;
    const uniqueCases = [...new Set(evidenceList.map(ev => ev.caseId))].sort();
    caseSelect.innerHTML = '<option value="">All Cases</option>' +
        uniqueCases.map(c => `<option value="${c}" ${currentVal === c ? 'selected' : ''}>${c}</option>`).join('');

    renderEvidenceTable(evidenceList);
}

function renderEvidenceTable(evidenceList) {
    const tbody = document.getElementById('evidenceTableBody');
    
    if (evidenceList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:32px;">No evidence found</td></tr>';
        return;
    }

    tbody.innerHTML = evidenceList.map(ev => `
        <tr>
            <td><span class="evidence-name-link" onclick="filterByCase('${ev.caseId}')">${ev.caseId}</span></td>
            <td>
                <span class="evidence-name-link" onclick="previewEvidence('${ev._id}', '${ev.evidenceName}', '${ev.evidenceType}', '${ev.fileName}', '${ev.fileSize}', '${ev.caseId}')">${ev.evidenceName}</span>
            </td>
            <td>${ev.evidenceType}</td>
            <td>${new Date(ev.createdAt).toLocaleDateString()}</td>
            <td><span class="status-badge status-${ev.verificationStatus}">${ev.verificationStatus}</span></td>
            <td>
                <button onclick="verifyEvidence('${ev._id}')" class="btn btn-info btn-small">Verify</button>
                <button onclick="downloadEvidence('${ev._id}', '${ev.fileName}')" class="btn btn-success btn-small">Download</button>
                <button onclick="showCustody('${ev._id}', '${ev.evidenceName}')" class="btn btn-secondary btn-small" style="background:#6366f1;color:white;border:none;">Custody</button>
            </td>
        </tr>
    `).join('');
}

function filterByCase(caseId) {
    document.getElementById('filterCase').value = caseId;
    filterEvidence();
}

function filterEvidence() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const caseFilter = document.getElementById('filterCase').value;
    const type = document.getElementById('filterType').value;
    const status = document.getElementById('filterStatus').value;

    const filtered = allEvidenceData.filter(ev => {
        const matchSearch = !search ||
            ev.caseId.toLowerCase().includes(search) ||
            ev.evidenceName.toLowerCase().includes(search);
        const matchCase = !caseFilter || ev.caseId === caseFilter;
        const matchType = !type || ev.evidenceType === type;
        const matchStatus = !status || ev.verificationStatus === status;
        return matchSearch && matchCase && matchType && matchStatus;
    });

    renderEvidenceTable(filtered);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCase').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStatus').value = '';
    renderEvidenceTable(allEvidenceData);
}

async function verifyEvidence(evidenceId) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/evidence/verify/${evidenceId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (response.ok) {
            const resultDiv = document.getElementById('verifyResult');
            const isAuthentic = data.isAuthentic;

            // Hide placeholder
            document.getElementById('verifyPlaceholder').style.display = 'none';

            const shortHash = h => h ? h.substring(0, 20) + '...' + h.substring(h.length - 8) : '-';

            resultDiv.innerHTML = `
                <div class="verify-result-card ${isAuthentic ? 'verify-authentic' : 'verify-tampered'}">
                    <div class="verify-result-header">
                        <div class="verify-status-icon ${isAuthentic ? 'icon-authentic' : 'icon-tampered'}">
                            ${isAuthentic
                                ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
                                : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
                            }
                        </div>
                        <div>
                            <div class="verify-result-title">${isAuthentic ? 'Evidence Integrity Confirmed' : 'Tampering Detected'}</div>
                            <div class="verify-result-sub">${isAuthentic ? 'The file matches its original blockchain record.' : 'This file has been modified since it was uploaded.'}</div>
                        </div>
                    </div>
                    <div class="verify-details-grid">
                        <div class="verify-detail-row">
                            <span class="verify-detail-label">Blockchain Hash</span>
                            <span class="verify-detail-value mono">${shortHash(data.originalHash)}</span>
                        </div>
                        <div class="verify-detail-row">
                            <span class="verify-detail-label">Current File Hash</span>
                            <span class="verify-detail-value mono ${isAuthentic ? '' : 'hash-mismatch'}">${shortHash(data.currentHash)}</span>
                        </div>
                        <div class="verify-detail-row">
                            <span class="verify-detail-label">Transaction ID</span>
                            <span class="verify-detail-value mono">${data.transactionId ? shortHash(data.transactionId) : '-'}</span>
                        </div>
                        <div class="verify-detail-row">
                            <span class="verify-detail-label">Block Number</span>
                            <span class="verify-detail-value">${data.blockNumber || '-'}</span>
                        </div>
                        <div class="verify-detail-row">
                            <span class="verify-detail-label">Verifications Run</span>
                            <span class="verify-detail-value">${data.verificationCount || 1}</span>
                        </div>
                    </div>
                </div>
            `;

            showTab('verify');
            showToast(isAuthentic ? 'Integrity verified — no tampering detected' : 'Warning: tampering detected', isAuthentic ? 'success' : 'error');
            loadEvidenceList();
        } else {
            showToast(data.message || 'Verification failed', 'error');
        }
    } catch (error) {
        showToast('Verification error', 'error');
        console.error('Verify error:', error);
    } finally {
        showLoading(false);
    }
}

// Preview functions
async function previewEvidence(id, name, type, fileName, fileSize, caseId) {
    document.getElementById('previewTitle').textContent = name;
    const sizeKB = fileSize ? Math.round(fileSize / 1024) : '?';
    document.getElementById('previewMeta').textContent = `Case: ${caseId}  •  Type: ${type}  •  Size: ${sizeKB} KB`;

    const body = document.getElementById('previewBody');
    body.innerHTML = '<div class="preview-loading">Loading preview...</div>';

    // Set download button
    document.getElementById('previewDownloadBtn').onclick = () => downloadEvidence(id, fileName);

    // Show modal
    document.getElementById('previewModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        const response = await fetch(`${API_URL}/evidence/${id}/download`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) { body.innerHTML = '<p class="preview-error">Could not load file.</p>'; return; }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (type === 'image') {
            body.innerHTML = `<img src="${url}" alt="${name}" class="preview-img">`;
        } else if (type === 'video') {
            body.innerHTML = `<video src="${url}" controls class="preview-video">Your browser does not support video.</video>`;
        } else if (type === 'audio') {
            body.innerHTML = `<div class="preview-audio-wrap"><div class="preview-audio-icon">🎵</div><p>${fileName}</p><audio src="${url}" controls></audio></div>`;
        } else {
            // Document / unsupported - show info card
            body.innerHTML = `
                <div class="preview-doc">
                    <div class="preview-doc-icon">📄</div>
                    <p class="preview-doc-name">${fileName}</p>
                    <p class="text-muted" style="font-size:13px;">Preview not available for this file type.<br>Use the Download button to open it.</p>
                </div>`;
        }
    } catch (err) {
        body.innerHTML = '<p class="preview-error">Failed to load preview.</p>';
    }
}

function closePreviewModal() {
    document.getElementById('previewModal').classList.add('hidden');
    document.body.style.overflow = '';
    // Clean up blob URLs inside
    const body = document.getElementById('previewBody');
    const media = body.querySelector('img, video, audio');
    if (media && media.src.startsWith('blob:')) URL.revokeObjectURL(media.src);
    body.innerHTML = '';
}

function closePreview(e) {
    if (e.target.id === 'previewModal') closePreviewModal();
}

async function downloadEvidence(evidenceId, fileName) {
    try {
        const response = await fetch(`${API_URL}/evidence/${evidenceId}/download`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('Download started', 'success');
        } else {
            showToast('Download failed', 'error');
        }
    } catch (error) {
        showToast('Download error', 'error');
        console.error('Download error:', error);
    }
}

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/evidence/stats/dashboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('totalEvidence').textContent = data.totalEvidence || 0;
            document.getElementById('totalCases').textContent = data.totalCases || 0;
            document.getElementById('verifiedEvidence').textContent = data.verifiedEvidence || 0;
            document.getElementById('tamperedEvidence').textContent = data.tamperedEvidence || 0;

            const activityDiv = document.getElementById('recentActivity');
            if (data.recentEvidence && data.recentEvidence.length > 0) {
                activityDiv.innerHTML = data.recentEvidence.map(ev => `
                    <p>${ev.evidenceName} — ${ev.caseId} (${new Date(ev.createdAt).toLocaleDateString()})</p>
                `).join('');
            } else {
                activityDiv.innerHTML = '<p class="text-muted">No recent activity</p>';
            }
        }
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// Activity Log
async function loadActivityLog() {
    const tbody = document.getElementById('activityTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">Loading...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/activity/log`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const logs = await response.json();

        if (!response.ok || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">No activity yet</td></tr>';
            return;
        }

        const actionIcons = { upload: '', verify: '', download: '', login: '', logout: '' };
        const resultClass = { success: 'status-verified', tampered: 'status-tampered', failed: 'status-pending' };

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td style="white-space:nowrap;">${new Date(log.createdAt).toLocaleString()}</td>
                <td>${log.officerName || '-'}</td>
                <td>${log.action}</td>
                <td>${log.evidenceName || '-'}</td>
                <td>${log.caseId || '-'}</td>
                <td><span class="status-badge ${resultClass[log.result] || 'status-pending'}">${log.result || '-'}</span></td>
                <td style="font-size:13px;color:var(--gray-600);">${log.details || '-'}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">Failed to load activity</td></tr>';
    }
}

// ============================================
// ADMIN PANEL
// ============================================

function showAdminDashboard() {
    hideAllScreens();
    document.getElementById('adminScreen').classList.add('active');
    document.getElementById('adminUserName').textContent = currentUser?.name || 'Admin';
    loadAdminStats();
}

function showAdminTab(tabName, btn) {
    document.querySelectorAll('#adminScreen .tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('#adminScreen .tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');

    if (tabName === 'adminOfficers') loadAdminOfficers();
    else if (tabName === 'adminActivity') loadAdminActivity();
    else if (tabName === 'adminOverview') loadAdminStats();
    else if (tabName === 'adminCases') loadAdminCases();
}

async function loadAdminStats() {
    try {
        const res = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('adminTotalOfficers').textContent = data.totalOfficers || 0;
            document.getElementById('adminTotalEvidence').textContent = data.totalEvidence || 0;
            document.getElementById('adminVerified').textContent = data.verifiedEvidence || 0;
            document.getElementById('adminTampered').textContent = data.tamperedEvidence || 0;
            document.getElementById('adminTotalActions').textContent = data.totalActions || 0;
        }
    } catch (err) { console.error('Admin stats error:', err); }
}

async function loadAdminCases() {
    const tbody = document.getElementById('adminCasesBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/admin/cases`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const cases = await res.json();
        if (!res.ok || cases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">No cases yet</td></tr>';
            return;
        }
        const statusColors = { open: 'status-pending', under_investigation: 'status-verified', closed: 'status-tampered' };
        const statusLabels = { open: 'Open', under_investigation: 'Under Investigation', closed: 'Closed' };
        tbody.innerHTML = cases.map(c => `
            <tr>
                <td style="padding:14px 16px; font-weight:700; color:var(--blue);">${c.caseId}</td>
                <td style="padding:14px 16px;">${c.title}</td>
                <td style="padding:14px 16px;"><span class="status-badge ${statusColors[c.status]}">${statusLabels[c.status]}</span></td>
                <td style="padding:14px 16px;">${c.createdByName}</td>
                <td style="padding:14px 16px; font-size:13px;">${(c.assignedOfficerNames || []).join(', ') || '-'}</td>
                <td style="padding:14px 16px;">${c.evidenceCount}</td>
                <td style="padding:14px 16px; font-size:13px;">${new Date(c.createdAt).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">Failed to load cases</td></tr>';
    }
}

async function loadAdminOfficers() {
    const tbody = document.getElementById('adminOfficersBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/admin/officers`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const officers = await res.json();
        if (!res.ok || officers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">No officers registered yet</td></tr>';
            return;
        }
        tbody.innerHTML = officers.map(o => `
            <tr>
                <td style="padding:14px 16px; font-weight:600;">${o.name}</td>
                <td style="padding:14px 16px;">${o.email}</td>
                <td style="padding:14px 16px;"><span class="status-badge status-verified">${o.policeId}</span></td>
                <td style="padding:14px 16px;">${o.department}</td>
                <td style="padding:14px 16px;">${o.station || '-'}</td>
                <td style="padding:14px 16px; font-size:13px;">${new Date(o.createdAt).toLocaleDateString()}</td>
                <td style="padding:14px 16px; font-size:13px;">${o.lastLogin ? new Date(o.lastLogin).toLocaleString() : 'Never'}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">Failed to load officers</td></tr>';
    }
}

async function loadAdminActivity() {
    const tbody = document.getElementById('adminActivityBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/admin/activity`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const logs = await res.json();
        if (!res.ok || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">No activity logged yet</td></tr>';
            return;
        }
        const icons = { upload: '', verify: '', download: '', login: '', logout: '' };
        const cls = { success: 'status-verified', tampered: 'status-tampered', failed: 'status-pending' };
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td style="padding:12px 16px; white-space:nowrap; font-size:13px;">${new Date(log.createdAt).toLocaleString()}</td>
                <td style="padding:12px 16px;">${log.officerName || '-'}</td>
                <td style="padding:12px 16px;">${log.action}</td>
                <td style="padding:12px 16px;">${log.evidenceName || '-'}</td>
                <td style="padding:12px 16px;">${log.caseId || '-'}</td>
                <td style="padding:12px 16px;"><span class="status-badge ${cls[log.result] || 'status-pending'}">${log.result || '-'}</span></td>
                <td style="padding:12px 16px; font-size:13px; color:var(--gray-600);">${log.details || '-'}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px;">Failed to load activity</td></tr>';
    }
}

// ============================================
// CASE MANAGEMENT
// ============================================

async function createCase() {
    const caseId = document.getElementById('newCaseId').value.trim();
    const title = document.getElementById('newCaseTitle').value.trim();
    const description = document.getElementById('newCaseDesc').value.trim();
    const officersRaw = document.getElementById('newCaseOfficers').value.trim();
    const assignPoliceIds = officersRaw ? officersRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    showLoading(true);
    try {
        const res = await fetch(`${API_URL}/cases/create`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseId, title, description, assignPoliceIds })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Case ${data.caseId} created!`, 'success');
            document.getElementById('caseForm').reset();
            loadCases();
        } else {
            showToast(data.message || 'Failed to create case', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadCases() {
    const container = document.getElementById('casesList');
    container.innerHTML = '<p class="text-muted">Loading cases...</p>';
    try {
        const res = await fetch(`${API_URL}/cases/list`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const cases = await res.json();

        if (!res.ok || cases.length === 0) {
            container.innerHTML = '<p class="text-muted">No cases created yet. Create one above.</p>';
            return;
        }

        const statusColors = { open: 'status-pending', under_investigation: 'status-verified', closed: 'status-tampered' };
        const statusLabels = { open: 'Open', under_investigation: 'Under Investigation', closed: 'Closed' };

        container.innerHTML = `
            <div class="cases-grid">
                ${cases.map(c => `
                    <div class="case-card" onclick="openCaseDetail('${c.caseId}')">
                        <div class="case-card-header">
                            <span class="case-id">${c.caseId}</span>
                            <span class="status-badge ${statusColors[c.status]}">${statusLabels[c.status]}</span>
                        </div>
                        <div class="case-title">${c.title}</div>
                        <div class="case-meta">
                            <span>${c.evidenceCount} evidence item${c.evidenceCount !== 1 ? 's' : ''}</span>
                            <span>${c.createdByName}</span>
                        </div>
                        <div class="case-date">${new Date(c.createdAt).toLocaleDateString()}</div>
                        <div class="case-actions" onclick="event.stopPropagation()">
                            <select onchange="updateCaseStatus('${c.caseId}', this.value)" class="case-status-select">
                                <option value="open" ${c.status === 'open' ? 'selected' : ''}>Open</option>
                                <option value="under_investigation" ${c.status === 'under_investigation' ? 'selected' : ''}>Under Investigation</option>
                                <option value="closed" ${c.status === 'closed' ? 'selected' : ''}>Closed</option>
                            </select>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    } catch (err) {
        container.innerHTML = '<p class="text-muted">Failed to load cases.</p>';
    }
}

async function updateCaseStatus(caseId, status) {
    try {
        const res = await fetch(`${API_URL}/cases/${caseId}/status`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            showToast('Case status updated', 'success');
            loadCases();
        }
    } catch (err) {
        showToast('Failed to update status', 'error');
    }
}

async function openCaseDetail(caseId) {
    currentCaseId = caseId;
    document.getElementById('caseModalTitle').textContent = `Case: ${caseId}`;
    document.getElementById('caseModalMeta').textContent = '';
    document.getElementById('caseModalBody').innerHTML = '<p class="text-muted">Loading...</p>';
    document.getElementById('caseModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(`${API_URL}/cases/${caseId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        document.getElementById('caseModalTitle').textContent = `${data.caseId} — ${data.title}`;
        document.getElementById('caseModalMeta').textContent = `${data.description || ''} • Created by ${data.createdByName}`;

        const evidence = data.evidence || [];
        const assignedNames = data.assignedOfficerNames || [];
        document.getElementById('caseModalBody').innerHTML = `
            <div style="padding:16px 24px; border-bottom:1px solid var(--gray-100); background:var(--gray-50); width:100%;">
                <span style="font-size:13px; color:var(--gray-600);">Assigned Officers: <strong>${assignedNames.join(', ') || 'None'}</strong></span>
                ${data.createdBy === currentUser?.id ? `
                <span style="margin-left:16px;">
                    <input type="text" id="assignPoliceIdInput" placeholder="Police ID" style="padding:5px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:13px;width:100px;">
                    <button onclick="assignOfficerToCase('${data.caseId}')" class="btn btn-info btn-small" style="margin-left:6px;">Add Officer</button>
                </span>` : ''}
            </div>
            <div style="padding:24px; width:100%;">
            ${evidence.length === 0
                ? '<p class="text-muted">No evidence uploaded for this case yet.</p>'
                : `<table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                        <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:var(--gray-600);">Name</th>
                        <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:var(--gray-600);">Type</th>
                        <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:var(--gray-600);">Uploaded By</th>
                        <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:var(--gray-600);">Date</th>
                        <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:var(--gray-600);">Status</th>
                    </tr></thead>
                    <tbody>${evidence.map(ev => `
                        <tr style="border-bottom:1px solid var(--gray-100);">
                            <td style="padding:12px;font-weight:500;">${ev.evidenceName}</td>
                            <td style="padding:12px;">${ev.evidenceType}</td>
                            <td style="padding:12px;font-size:13px;">${ev.uploadedByName || '-'}</td>
                            <td style="padding:12px;font-size:13px;">${new Date(ev.createdAt).toLocaleDateString()}</td>
                            <td style="padding:12px;"><span class="status-badge status-${ev.verificationStatus}">${ev.verificationStatus}</span></td>
                        </tr>`).join('')}
                    </tbody></table>`}
            </div>`;
    } catch (err) {
        document.getElementById('caseModalBody').innerHTML = '<p class="preview-error">Failed to load case details.</p>';
    }
}

async function assignOfficerToCase(caseId) {
    const policeId = document.getElementById('assignPoliceIdInput').value.trim();
    if (!policeId) return showToast('Enter a Police ID', 'error');
    try {
        const res = await fetch(`${API_URL}/cases/${caseId}/assign`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ policeId })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            openCaseDetail(caseId);
        } else {
            showToast(data.message || 'Failed to assign officer', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
}

function closeCaseModal() {
    document.getElementById('caseModal').classList.add('hidden');
    document.body.style.overflow = '';
    currentCaseId = null;
}

function toggleUploadForm() {
    if (!currentCaseId) return;
    document.getElementById('uploadModalTitle').textContent = `Add Evidence to ${currentCaseId}`;
    document.getElementById('uploadForm').reset();
    document.getElementById('caseId').value = currentCaseId;
    document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    document.getElementById('uploadForm').reset();
}

// ============================================
// CHAIN OF CUSTODY
// ============================================
async function showCustody(evidenceId, evidenceName) {
    document.getElementById('custodyTitle').textContent = `Chain of Custody: ${evidenceName}`;
    document.getElementById('custodyBody').innerHTML = '<p class="text-muted" style="padding:20px;">Loading...</p>';
    document.getElementById('custodyModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(`${API_URL}/evidence/${evidenceId}/custody`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        const chain = data.custodyChain || [];

        if (chain.length === 0) {
            document.getElementById('custodyBody').innerHTML = '<p class="text-muted" style="padding:20px;">No custody records yet.</p>';
            return;
        }

        const actionMeta = {
            uploaded:   { label: 'Uploaded',   color: '#2563eb', bg: '#eff6ff', svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>` },
            verified:   { label: 'Verified',   color: '#16a34a', bg: '#f0fdf4', svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>` },
            downloaded: { label: 'Downloaded', color: '#7c3aed', bg: '#f5f3ff', svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>` },
        };
        const resultColor = { success: '#16a34a', tampered: '#dc2626', failed: '#d97706' };

        document.getElementById('custodyBody').innerHTML = `
            <div class="custody-timeline">
                ${chain.map((entry, i) => {
                    const meta = actionMeta[entry.action] || { label: entry.action, color: '#64748b', bg: '#f8fafc', svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>` };
                    return `
                    <div class="custody-entry">
                        <div class="custody-node">
                            <div class="custody-icon-wrap" style="background:${meta.bg}; color:${meta.color}; border-color:${meta.color}30;">
                                ${meta.svg}
                            </div>
                            ${i < chain.length - 1 ? '<div class="custody-connector"></div>' : ''}
                        </div>
                        <div class="custody-card">
                            <div class="custody-card-header">
                                <span class="custody-action-badge" style="background:${meta.bg}; color:${meta.color};">${meta.label}</span>
                                <span class="custody-time">${new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                            <div class="custody-officer">${entry.officerName || 'Unknown Officer'}</div>
                            ${entry.note ? `<div class="custody-note" style="color:${resultColor[entry.result] || '#64748b'};">${entry.note}</div>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    } catch (err) {
        document.getElementById('custodyBody').innerHTML = '<p class="preview-error" style="padding:20px;">Failed to load custody chain.</p>';
    }
}

function closeCustodyModal() {
    document.getElementById('custodyModal').classList.add('hidden');
    document.body.style.overflow = '';
}

// UI functions
function showLogin() {
    hideAllScreens();
    document.getElementById('loginScreen').classList.add('active');
}

function showRegister() {
    hideAllScreens();
    document.getElementById('registerScreen').classList.add('active');
}

function showDashboard() {
    hideAllScreens();
    document.getElementById('dashboardScreen').classList.add('active');
    document.getElementById('userName').textContent = currentUser?.name || 'Officer';
    document.getElementById('dashboardGreeting').textContent = `Welcome, ${currentUser?.name || 'Officer'}`;

    // Show Activity Log tab only for admins
    document.querySelectorAll('.admin-only').forEach(el => {
        if (currentUser?.isAdmin) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event?.target?.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');

    // Load data for specific tabs
    if (tabName === 'evidence') {
        loadEvidenceList();
    } else if (tabName === 'dashboard') {
        loadDashboardData();
    } else if (tabName === 'activity') {
        loadActivityLog();
    } else if (tabName === 'cases') {
        loadCases();
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
