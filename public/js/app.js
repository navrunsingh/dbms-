/* ═══════════════════════════════════════════════════════════════════════════
   OrganLink — Frontend Application Logic
   ═══════════════════════════════════════════════════════════════════════════ */

const API = '';

// ── Navigation ──
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.dataset.section;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');
    // Load data for the section
    loadSectionData(section);
  });
});

function loadSectionData(section) {
  switch (section) {
    case 'dashboard':   loadDashboard(); break;
    case 'donors':      loadDonors(); break;
    case 'recipients':  loadRecipients(); break;
    case 'organs':      loadOrgans(); break;
    case 'hospitals':   loadHospitals(); break;
    case 'consent':     loadConsent(); break;
    case 'findmatch':   loadFindMatchDropdowns(); break;
    case 'matches':     loadMatches(); break;
    case 'queries':     loadQueries(); break;
    case 'transactions': loadTransactionDropdowns(); break;
  }
}

// ── Toast Notifications ──
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Utility: Format date ──
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Utility: Form to JSON ──
function formToJSON(form) {
  const fd = new FormData(form);
  const obj = {};
  for (const [key, val] of fd.entries()) {
    if (val === '') continue;
    // Handle checkboxes
    obj[key] = val;
  }
  // Handle unchecked checkboxes
  form.querySelectorAll('input[type=checkbox]').forEach(cb => {
    obj[cb.name] = cb.checked;
  });
  return obj;
}

// ═══════════════════════════════════ DASHBOARD ═══════════════════════════════════

async function loadDashboard() {
  try {
    const [statsRes, alertsRes] = await Promise.all([
      fetch(`${API}/api/dashboard/stats`),
      fetch(`${API}/api/dashboard/alerts`)
    ]);
    const stats = await statsRes.json();
    const alerts = await alertsRes.json();

    document.getElementById('stat-active-donors').textContent = stats.activeDonors;
    document.getElementById('stat-recipients').textContent = stats.recipientsWaiting;
    document.getElementById('stat-available-organs').textContent = stats.availableOrgans;
    document.getElementById('stat-matches').textContent = stats.totalMatches;
    document.getElementById('stat-surgeries').textContent = stats.successfulSurgeries;
    document.getElementById('stat-hospitals').textContent = stats.authorizedHospitals;

    // Urgency Alerts
    document.getElementById('alert-count').textContent = alerts.length;
    const alertList = document.getElementById('alert-list');
    if (alerts.length === 0) {
      alertList.innerHTML = '<div class="empty-state"><p>No critical patients at this time</p></div>';
    } else {
      alertList.innerHTML = alerts.map(a => `
        <div class="alert-item">
          <span class="alert-score">${a.Medical_Urgency_Score}</span>
          <span class="alert-name">${a.Name}</span>
          <span class="alert-blood">${a.Blood_Group}</span>
          <span class="alert-status ${a.Status.toLowerCase()}">${a.Status}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Dashboard load failed:', err);
  }
}

// ═══════════════════════════════════ DONORS ═══════════════════════════════════

async function loadDonors(params = {}) {
  try {
    let url = `${API}/api/donors`;
    const qs = new URLSearchParams(params).toString();
    if (qs) url = `${API}/api/donors/search?${qs}`;
    const res = await fetch(url);
    const donors = await res.json();
    const tbody = document.querySelector('#table-donors tbody');
    tbody.innerHTML = donors.map(d => `
      <tr>
        <td>${d.D_ID}</td>
        <td>${d.Name}</td>
        <td>${d.Age}</td>
        <td>${d.Blood_group}</td>
        <td>${d.Contact_no || '—'}</td>
        <td>${d.City || '—'}</td>
        <td><span class="status-badge ${d.Is_Alive ? 'status-alive' : 'status-deceased'}">${d.Is_Alive ? 'Alive' : 'Deceased'}</span></td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-edit" onclick="editDonor(${d.D_ID})">Edit</button>
          <button class="btn btn-sm btn-delete" onclick="deleteDonor(${d.D_ID})">Delete</button>
        </div></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load donors failed:', err);
  }
}

document.getElementById('form-donor').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = formToJSON(e.target);
    const res = await fetch(`${API}/api/donors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`Donor registered (ID: ${result.D_ID})`);
      e.target.reset();
      loadDonors();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to register donor', 'error');
  }
});

document.getElementById('btn-search-donors').addEventListener('click', () => {
  const name = document.getElementById('donor-search-name').value;
  const blood_group = document.getElementById('donor-search-blood').value;
  const city = document.getElementById('donor-search-city').value;
  loadDonors({ name, blood_group, city });
});

// ═══════════════════════════════════ RECIPIENTS ═══════════════════════════════════

async function loadRecipients() {
  try {
    const res = await fetch(`${API}/api/recipients`);
    const recipients = await res.json();
    const tbody = document.querySelector('#table-recipients tbody');
    tbody.innerHTML = recipients.map(r => {
      const urgencyColor = r.Medical_Urgency_Score > 90 ? 'var(--danger)' : r.Medical_Urgency_Score > 70 ? 'var(--warning)' : 'var(--success)';
      return `
      <tr>
        <td>${r.R_ID}</td>
        <td>${r.Name}</td>
        <td>${r.Age}</td>
        <td>${r.Blood_Group}</td>
        <td><span style="color:${urgencyColor}; font-weight:700;">${r.Medical_Urgency_Score}</span></td>
        <td>${fmtDate(r.Registration_Date)}</td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-edit" onclick="editRecipient(${r.R_ID})">Edit</button>
          <button class="btn btn-sm btn-delete" onclick="deleteRecipient(${r.R_ID})">Delete</button>
        </div></td>
      </tr>
    `}).join('');
  } catch (err) {
    console.error('Load recipients failed:', err);
  }
}

document.getElementById('form-recipient').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = formToJSON(e.target);
    const res = await fetch(`${API}/api/recipients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`Recipient registered (ID: ${result.R_ID})`);
      e.target.reset();
      loadRecipients();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to register recipient', 'error');
  }
});

// ═══════════════════════════════════ ORGANS ═══════════════════════════════════

async function loadOrgans() {
  try {
    const res = await fetch(`${API}/api/organs`);
    const organs = await res.json();
    const tbody = document.querySelector('#table-organs tbody');
    const now = new Date();
    tbody.innerHTML = organs.map(o => {
      const isExpired = new Date(o.Expiry_Time) < now;
      const statusBadge = isExpired && o.Status === 'Available'
        ? `<span class="status-badge status-rejected">Expired</span>`
        : `<span class="status-badge status-${o.Status.toLowerCase()}">${o.Status}</span>`;
      const expiryCell = isExpired
        ? `<span style="color: var(--danger); font-weight:600;">${fmtDateTime(o.Expiry_Time)} ⚠</span>`
        : fmtDateTime(o.Expiry_Time);
      return `
      <tr ${isExpired && o.Status === 'Available' ? 'style="opacity:0.7;"' : ''}>
        <td>${o.O_ID}</td>
        <td>${o.Type}</td>
        <td>${o.Blood_Group}</td>
        <td>${statusBadge}</td>
        <td>${o.Donor_Name || o.Donor_ID}</td>
        <td>${fmtDateTime(o.Harvest_Time)}</td>
        <td>${expiryCell}</td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-edit" onclick="editOrgan(${o.O_ID})">Edit</button>
          <button class="btn btn-sm btn-delete" onclick="deleteOrgan(${o.O_ID})">Delete</button>
        </div></td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Load organs failed:', err);
  }
}

document.getElementById('form-organ').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = formToJSON(e.target);
    const res = await fetch(`${API}/api/organs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`Organ added (ID: ${result.O_ID})`);
      e.target.reset();
      loadOrgans();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to add organ', 'error');
  }
});

// ═══════════════════════════════════ HOSPITALS ═══════════════════════════════════

async function loadHospitals() {
  try {
    const res = await fetch(`${API}/api/hospitals`);
    const hospitals = await res.json();
    const tbody = document.querySelector('#table-hospitals tbody');
    tbody.innerHTML = hospitals.map(h => `
      <tr>
        <td>${h.H_ID}</td>
        <td>${h.Name}</td>
        <td>${h.Location || '—'}</td>
        <td>${h.License_No}</td>
        <td><span class="status-badge ${h.Is_Authorized ? 'status-authorized' : 'status-unauthorized'}">${h.Is_Authorized ? 'Yes' : 'No'}</span></td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-edit" onclick="editHospital(${h.H_ID})">Edit</button>
          <button class="btn btn-sm btn-delete" onclick="deleteHospital(${h.H_ID})">Delete</button>
        </div></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load hospitals failed:', err);
  }
}

document.getElementById('form-hospital').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = formToJSON(e.target);
    const res = await fetch(`${API}/api/hospitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`Hospital added (ID: ${result.H_ID})`);
      e.target.reset();
      loadHospitals();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to add hospital', 'error');
  }
});

// ═══════════════════════════════════ CONSENT ═══════════════════════════════════

async function loadConsent() {
  try {
    const res = await fetch(`${API}/api/consent`);
    const docs = await res.json();
    const tbody = document.querySelector('#table-consent tbody');
    tbody.innerHTML = docs.map(c => `
      <tr>
        <td>${c.C_ID}</td>
        <td>${c.Document_Type}</td>
        <td><span class="status-badge status-${c.Approval_Status.toLowerCase()}">${c.Approval_Status}</span></td>
        <td>${fmtDate(c.Upload_Date)}</td>
        <td>${c.Donor_Name} (${c.Donor_ID})</td>
        <td><div class="action-btns">
          ${c.Approval_Status === 'Pending' ? `
            <button class="btn btn-sm btn-approve" onclick="updateConsent(${c.C_ID}, 'Approved')">Approve</button>
            <button class="btn btn-sm btn-reject" onclick="updateConsent(${c.C_ID}, 'Rejected')">Reject</button>
          ` : ''}
          <button class="btn btn-sm btn-delete" onclick="deleteConsent(${c.C_ID})">Delete</button>
        </div></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load consent failed:', err);
  }
}

async function updateConsent(id, status) {
  try {
    const res = await fetch(`${API}/api/consent/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Approval_Status: status })
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`Document ${id} ${status.toLowerCase()}`);
      loadConsent();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to update consent', 'error');
  }
}
// Make globally accessible for inline onclick
window.updateConsent = updateConsent;

document.getElementById('form-consent').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = formToJSON(e.target);
    const res = await fetch(`${API}/api/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`Consent document created (ID: ${result.C_ID})`);
      e.target.reset();
      loadConsent();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to create consent document', 'error');
  }
});

// ═══════════════════════════════════ FIND MATCH ═══════════════════════════════════

async function loadFindMatchDropdowns() {
  try {
    const [recRes, hospRes] = await Promise.all([
      fetch(`${API}/api/recipients`),
      fetch(`${API}/api/hospitals`)
    ]);
    const recipients = await recRes.json();
    const hospitals = await hospRes.json();

    const sel = document.getElementById('select-match-recipient');
    sel.innerHTML = '<option value="">Select a recipient...</option>' +
      recipients.map(r => `<option value="${r.R_ID}">${r.Name} — ${r.Blood_Group} (Urgency: ${r.Medical_Urgency_Score})</option>`).join('');

    window.hospitalOptionsHTML = '<option value="">Select a hospital...</option>' + 
      hospitals.map(h => `<option value="${h.H_ID}">${h.Name} (${h.Location})</option>`).join('');
  } catch (err) {
    console.error('Load match dropdowns failed:', err);
  }
}

document.getElementById('form-findmatch').addEventListener('submit', async (e) => {
  e.preventDefault();
  const recipientId = document.getElementById('select-match-recipient').value;
  if (!recipientId) return;

  try {
    const res = await fetch(`${API}/api/matches/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Recipient_ID: parseInt(recipientId) })
    });
    const data = await res.json();
    const resultsDiv = document.getElementById('match-results');
    resultsDiv.style.display = 'block';

    // Recipient info
    const r = data.recipient;
    document.getElementById('match-recipient-info').innerHTML = `
      <div class="recipient-avatar">${r.Name.charAt(0)}</div>
      <div class="recipient-details">
        <h4>${r.Name}</h4>
        <div class="recipient-meta">
          <span>ID: ${r.R_ID}</span>
          <span>Blood: ${r.Blood_Group}</span>
          <span>Urgency: <strong style="color:${r.Medical_Urgency_Score > 90 ? 'var(--danger)' : 'var(--warning)'}">${r.Medical_Urgency_Score}</strong></span>
          <span>Registered: ${fmtDate(r.Registration_Date)}</span>
        </div>
      </div>
    `;

    // Compatible organs
    const organsList = document.getElementById('match-organs-list');
    if (data.compatible_organs.length === 0) {
      organsList.innerHTML = '<div class="no-matches-msg">No compatible organs found. The patient remains on the waiting list.</div>';
    } else {
      organsList.innerHTML = data.compatible_organs.map(o => `
        <div class="organ-match-card">
          <h4>${o.Type} — ${o.Blood_Group}</h4>
          <div class="organ-meta">
            <span><strong>Organ ID:</strong> ${o.O_ID}</span>
            <span><strong>Donor:</strong> ${o.Donor_Name} (${o.Is_Alive ? 'Living' : 'Deceased'})</span>
            <span><strong>Harvested:</strong> ${fmtDateTime(o.Harvest_Time)}</span>
            <span><strong>Expires:</strong> ${fmtDateTime(o.Expiry_Time)}</span>
          </div>
          <div style="margin-top: 12px; margin-bottom: 12px;">
            <label style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px; display: block;">Performing Hospital:</label>
            <select id="select-hosp-${o.O_ID}" class="form-input" style="width: 100%; padding: 6px; font-size: 14px;">
              ${window.hospitalOptionsHTML || '<option value="301">Central Health Hospital</option>'}
            </select>
          </div>
          <button class="btn btn-primary" style="width:100%;" onclick="allocateOrgan(${o.O_ID}, ${recipientId})">Allocate Organ</button>
        </div>
      `).join('');
    }
    showToast(`Found ${data.match_count} compatible organ(s)`, data.match_count > 0 ? 'success' : 'info');
  } catch (err) {
    showToast('Error finding matches', 'error');
  }
});

// Perform Scenario 1: Allocate the organ!
async function allocateOrgan(organId, recipientId) {
  const hospitalSelect = document.getElementById(`select-hosp-${organId}`);
  const hospitalId = hospitalSelect ? hospitalSelect.value : null;

  if (!hospitalId) {
    showToast('Please select a hospital for the surgery.', 'error');
    return;
  }

  try {
    const matchId = Math.floor(Math.random() * 900) + 1000; // Generate random Match ID
    const res = await fetch(`${API}/api/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        M_ID: matchId,
        Organ_ID: organId,
        Recipient_ID: recipientId,
        Hospital_ID: hospitalId,
        Compatibility_Score: 95
      })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`SUCCESS: Organ ${organId} allocated! Match ID: ${matchId}`, 'success');
    
    // Hide the search results since the organ is no longer available
    document.getElementById('match-results').style.display = 'none';
  } catch(err) {
    showToast(err.message, 'error');
  }
}
window.allocateOrgan = allocateOrgan;

// ═══════════════════════════════════ MATCHES & SURGERY ═══════════════════════════════════

async function loadMatches() {
  try {
    const res = await fetch(`${API}/api/matches`);
    const matches = await res.json();
    const tbody = document.querySelector('#table-matches tbody');
    tbody.innerHTML = matches.map(m => `
      <tr>
        <td>${m.M_ID}</td>
        <td>${fmtDate(m.Match_Date)}</td>
        <td>${m.Organ_Type} (${m.Organ_Blood})</td>
        <td>${m.Donor_Name}</td>
        <td>${m.Recipient_Name}</td>
        <td>${m.Hospital_Name}</td>
        <td>${m.Compatibility_Score}</td>
        <td><span class="status-badge ${m.Surgery_Outcome === 'Successful' ? 'status-approved' : m.Surgery_Outcome === 'No Surgery Yet' ? 'status-pending' : 'status-rejected'}">${m.Surgery_Outcome}</span></td>
        <td>
          <button class="btn btn-sm btn-delete" onclick="deleteMatch(${m.M_ID})" ${m.Surgery_Outcome !== 'No Surgery Yet' ? 'disabled title="Cannot delete match after surgery"' : ''}>Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load matches failed:', err);
  }
}

document.getElementById('form-surgery').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = formToJSON(e.target);
    const res = await fetch(`${API}/api/surgeries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`Surgery recorded (ID: ${result.S_ID})`);
      e.target.reset();
      loadMatches();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to record surgery', 'error');
  }
});

// ═══════════════════════════════════ QUERY RUNNER ═══════════════════════════════════

let queriesMeta = [];

async function loadQueries() {
  try {
    const res = await fetch(`${API}/api/queries`);
    queriesMeta = await res.json();
    const sel = document.getElementById('query-select');
    sel.innerHTML = '<option value="">Select a query to run...</option>' +
      queriesMeta.map(q => `<option value="${q.id}">Q${q.id}: ${q.title} [${q.category}]</option>`).join('');
    document.getElementById('btn-run-query').disabled = false;
  } catch (err) {
    console.error('Load queries failed:', err);
  }
}

document.getElementById('query-select').addEventListener('change', (e) => {
  const id = parseInt(e.target.value);
  const q = queriesMeta.find(x => x.id === id);
  const detail = document.getElementById('query-detail');
  if (q) {
    detail.style.display = 'block';
    document.getElementById('query-category').textContent = q.category;
    document.getElementById('query-description').textContent = q.description;
    document.getElementById('query-sql').textContent = 'Click "Run Query" to execute and see the SQL...';
  } else {
    detail.style.display = 'none';
  }
  document.getElementById('query-results-container').style.display = 'none';
});

document.getElementById('btn-run-query').addEventListener('click', async () => {
  const id = document.getElementById('query-select').value;
  if (!id) return;

  try {
    const res = await fetch(`${API}/api/queries/run/${id}`);
    const data = await res.json();

    // Show SQL
    document.getElementById('query-sql').textContent = data.query.sql;

    // Show results
    const container = document.getElementById('query-results-container');
    container.style.display = 'block';
    document.getElementById('query-row-count').textContent =
      data.isModification ? `${data.rowCount} row(s) affected` : `${data.rowCount} row(s)`;

    const thead = document.querySelector('#table-query-results thead tr');
    const tbody = document.querySelector('#table-query-results tbody');

    if (data.isModification || !Array.isArray(data.results) || data.results.length === 0) {
      thead.innerHTML = '<th>Result</th>';
      tbody.innerHTML = `<tr><td>${data.isModification ? `${data.rowCount} row(s) affected` : 'No results'}</td></tr>`;
    } else {
      const keys = Object.keys(data.results[0]);
      thead.innerHTML = keys.map(k => `<th>${k}</th>`).join('');
      tbody.innerHTML = data.results.map(row =>
        '<tr>' + keys.map(k => {
          let val = row[k];
          if (val === null || val === undefined) val = '—';
          else if (typeof val === 'object' && val instanceof Date) val = fmtDate(val);
          return `<td>${val}</td>`;
        }).join('') + '</tr>'
      ).join('');
    }

    showToast(`Query ${id} executed successfully`);
  } catch (err) {
    showToast('Query execution failed', 'error');
  }
});

// ═══════════════════════════════════ TRANSACTIONS (Scenario 2 Config) ═══════════════════════════════════

async function deleteMatch(id) {
  if (!confirm('Delete Match #' + id + '? This will also automatically return the Organ Status back to Available.')) return;
  try {
    const r = await fetch(`${API}/api/matches/${id}`, { method: 'DELETE' });
    const result = await r.json();
    showToast(r.ok ? 'Match deleted successfully' : result.error, r.ok ? 'success' : 'error');
    if (r.ok) {
      loadMatches();
      // Ensure the Organs table gets refreshed if it is visible
      loadOrgans();
    }
  } catch (err) {
    showToast('Failed to delete match', 'error');
  }
}
window.deleteMatch = deleteMatch;

async function loadTransactionDropdowns() {
  try {
    const [organsRes, hospitalsRes, recipientsRes] = await Promise.all([
      fetch(`${API}/api/organs/available`),
      fetch(`${API}/api/hospitals/authorized`),
      fetch(`${API}/api/recipients`)
    ]);
    const organs = await organsRes.json();
    const hospitals = await hospitalsRes.json();
    const recipients = await recipientsRes.json();

    const organSelect = document.getElementById('conflict-organ');
    organSelect.innerHTML =
      '<option value="">Select an available organ...</option>' +
      organs.map(o => `<option value="${o.O_ID}" data-blood="${o.Blood_Group}">${o.Type} — ${o.Blood_Group} (ID: ${o.O_ID})</option>`).join('');

    const hospitalOptions = '<option value="">Select...</option>' +
      hospitals.map(h => `<option value="${h.H_ID}">${h.Name}</option>`).join('');
    document.getElementById('conflict-hospital-a').innerHTML = hospitalOptions;
    document.getElementById('conflict-hospital-b').innerHTML = hospitalOptions;

    const updateRecipientDropdowns = () => {
      const selectedOption = organSelect.options[organSelect.selectedIndex];
      const selectedBlood = selectedOption ? selectedOption.getAttribute('data-blood') : null;
      
      const filteredRecipients = selectedBlood 
        ? recipients.filter(r => r.Blood_Group === selectedBlood)
        : recipients; // Show all if no organ selected

      const recipientOptions = '<option value="">Select...</option>' +
        filteredRecipients.map(r => `<option value="${r.R_ID}">${r.Name} — ${r.Blood_Group}</option>`).join('');
      
      document.getElementById('conflict-recipient-a').innerHTML = recipientOptions;
      document.getElementById('conflict-recipient-b').innerHTML = recipientOptions;
    };

    organSelect.addEventListener('change', updateRecipientDropdowns);
    updateRecipientDropdowns(); // Initialize with all recipients

  } catch (err) {
    console.error('Load transaction dropdowns failed:', err);
  }
}

document.getElementById('btn-demo-scenario2')?.addEventListener('click', async () => {
  const logDiv = document.getElementById('scenario2-log');
  const organIdInput = document.getElementById('scenario2-organ-id').value;
  const organId = parseInt(organIdInput);
  
  if (!organId) {
    showToast('Please enter an expired Organ ID first', 'error');
    return;
  }
  
  logDiv.style.display = 'block';
  logDiv.innerHTML = '';
  
  const addLog = (text, className = '') => {
    logDiv.innerHTML += `<div class="log-line ${className}">${text}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  };
  
  addLog('> START TRANSACTION;', 'info');
  addLog(`> Attempting to allocate Expired Organ (ID ${organId}) to Recipient 402...`, 'wait');
  
  // Wait a tiny bit for dramatic effect
  await new Promise(r => setTimeout(r, 600));

  try {
    const res = await fetch(`${API}/api/transactions/test-expired`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ Organ_ID: organId })
    });
    const data = await res.json();
    
    addLog(`> INSERT INTO Match_Record...`, 'wait');
    await new Promise(r => setTimeout(r, 400));

    if (!res.ok) {
      addLog(`❌ ERROR: ${data.error}`, 'fail');
      showToast(data.error, 'error');
    } else if (data.blocked) {
      if (data.reason === 'expired') {
        addLog(`❌ TRIGGER FIRED: ${data.message}`, 'fail');
        addLog(`> Database automatically rolled back to prevent illegal operation.`, 'fail');
        addLog(`> TRANSACTION ROLLED BACK. No data was saved.`, 'info');
        showToast('Scenario 2: Rollback demonstrated correctly', 'success');
      } else if (data.reason === 'not_found') {
        addLog(`❌ ERROR: Organ ${organId} does not exist in the database.`, 'fail');
        showToast(`Organ ${organId} not found`, 'error');
      } else if (data.reason === 'already_used' || data.reason === 'already_matched') {
        addLog(`❌ ERROR: ${data.message}`, 'fail');
        showToast(data.message, 'error');
      }
    } else {
      addLog(`✅ Organ ${organId} is NOT expired. The trigger did not fire.`, 'ok');
      addLog(`> Transaction rolled back (demo only, no data changed).`, 'info');
      showToast(`Organ ${organId} is NOT expired`, 'info');
    }
  } catch(err) {
    addLog(`❌ Network Error: ${err.message}`, 'fail');
    showToast('Connection error', 'error');
  }
});

document.getElementById('form-conflict').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = formToJSON(e.target);
  data.Organ_ID = parseInt(data.Organ_ID);
  data.Hospital_A_ID = parseInt(data.Hospital_A_ID);
  data.Hospital_B_ID = parseInt(data.Hospital_B_ID);
  data.Recipient_A_ID = parseInt(data.Recipient_A_ID);
  data.Recipient_B_ID = parseInt(data.Recipient_B_ID);

  if (data.Hospital_A_ID === data.Hospital_B_ID) {
    showToast('Please select two different hospitals', 'error');
    return;
  }

  // Get hospital names
  const hospAName = document.getElementById('conflict-hospital-a').selectedOptions[0].textContent;
  const hospBName = document.getElementById('conflict-hospital-b').selectedOptions[0].textContent;
  document.getElementById('terminal-a-name').textContent = hospAName;
  document.getElementById('terminal-b-name').textContent = hospBName;

  // Show dual screen
  document.getElementById('dual-screen').style.display = 'grid';
  document.getElementById('conflict-explanation').style.display = 'none';

  const logA = document.getElementById('log-a');
  const logB = document.getElementById('log-b');
  logA.innerHTML = '';
  logB.innerHTML = '';

  // Animate with delays
  function addLog(target, text, cls, delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        const line = document.createElement('div');
        line.className = `log-line ${cls}`;
        line.textContent = text;
        target.appendChild(line);
        target.scrollTop = target.scrollHeight;
        resolve();
      }, delay);
    });
  }

  try {
    // Animate loading
    await addLog(logA, '> BEGIN TRANSACTION', 'info', 200);
    await addLog(logB, '> BEGIN TRANSACTION', 'info', 400);
    await addLog(logA, '> SELECT ... FOR UPDATE (Organ ' + data.Organ_ID + ')', 'info', 800);
    await addLog(logA, '✓ Lock acquired. Organ is Available.', 'ok', 1200);
    await addLog(logB, '> SELECT ... FOR UPDATE (Organ ' + data.Organ_ID + ')', 'info', 1600);
    await addLog(logB, '⏳ BLOCKED — Waiting for Connection A\'s lock...', 'wait', 2000);

    // Actually run the conflict
    const res = await fetch(`${API}/api/transactions/conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      await addLog(logA, '> INSERT Match_Record — Trigger sets Status → Allocated', 'info', 2500);
      await addLog(logA, '> INSERT Provides_For', 'info', 2800);
      await addLog(logA, '✓ COMMIT — Lock released.', 'ok', 3200);
      await addLog(logA, '🏆 ALLOCATION SUCCESSFUL!', 'ok', 3500);

      await addLog(logB, '> Lock released. Executing query...', 'info', 3800);
      await addLog(logB, '✗ WHERE Status=\'Available\' → 0 rows (already Allocated)', 'fail', 4200);
      await addLog(logB, '> ROLLBACK — Organ already claimed.', 'fail', 4600);
      await addLog(logB, '❌ ALLOCATION DENIED', 'fail', 5000);

      // Show explanation
      setTimeout(() => {
        const expDiv = document.getElementById('conflict-explanation');
        expDiv.style.display = 'block';
        expDiv.innerHTML = `
          <h4>🔒 How InnoDB Prevented Double Allocation</h4>
          <p style="color:var(--text-secondary); margin-bottom:12px; font-size:0.9rem;">${result.message}</p>
          <ul>
            ${result.explanation.details.map(d => `<li>${d}</li>`).join('')}
          </ul>
        `;
      }, 5200);
    } else {
      await addLog(logA, '✗ ' + (result.message || result.error), 'fail', 2500);
      await addLog(logB, '✗ Operation cancelled.', 'fail', 2800);
    }

    showToast(result.success ? 'Conflict demo complete!' : result.message || 'Demo failed', result.success ? 'success' : 'error');
  } catch (err) {
    showToast('Transaction demo failed: ' + err.message, 'error');
  }
});

// ═══════════════════════════════════ INIT ═══════════════════════════════════

// Load dashboard on startup
loadDashboard();

// ═══════════════════════════════════ MODAL / EDIT / DELETE ═══════════════════════════════════

const bloodOptions = ['O+','O-','A+','A-','B+','B-','AB+','AB-'];
const bloodSelect = (name, val) => `<select name="${name}" required>${bloodOptions.map(b => `<option value="${b}" ${b===val?'selected':''}>${b}</option>`).join('')}</select>`;

function closeModal() {
  document.getElementById('edit-modal').style.display = 'none';
}
window.closeModal = closeModal;

function openModal(title, fields, onSave) {
  document.getElementById('modal-title').textContent = title;
  const form = document.getElementById('form-edit');
  form.innerHTML = fields;
  document.getElementById('edit-modal').style.display = 'flex';
  document.getElementById('btn-modal-save').onclick = async () => {
    await onSave(formToJSON(form));
    closeModal();
  };
}

// ── DONORS ──
async function editDonor(id) {
  const res = await fetch(`${API}/api/donors/${id}`);
  const d = await res.json();
  openModal('Edit Donor #' + id, `
    <div class="form-group"><label>Name</label><input type="text" name="Name" value="${d.Name}" required /></div>
    <div class="form-group"><label>Age</label><input type="number" name="Age" value="${d.Age}" min="0" required /></div>
    <div class="form-group"><label>Blood Group</label>${bloodSelect('Blood_group', d.Blood_group)}</div>
    <div class="form-group"><label>Contact</label><input type="text" name="Contact_no" value="${d.Contact_no || ''}" /></div>
    <div class="form-group"><label>City</label><input type="text" name="City" value="${d.City || ''}" /></div>
    <div class="form-group form-toggle"><label>Alive</label>
      <label class="toggle"><input type="checkbox" name="Is_Alive" ${d.Is_Alive ? 'checked' : ''} /><span class="toggle-slider"></span></label>
    </div>
  `, async (data) => {
    const r = await fetch(`${API}/api/donors/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const result = await r.json();
    showToast(r.ok ? 'Donor updated' : result.error, r.ok ? 'success' : 'error');
    loadDonors();
  });
}
async function deleteDonor(id) {
  if (!confirm('Delete Donor #' + id + '? This action cannot be undone.')) return;
  const r = await fetch(`${API}/api/donors/${id}`, { method:'DELETE' });
  const result = await r.json();
  showToast(r.ok ? 'Donor deleted' : result.error, r.ok ? 'success' : 'error');
  loadDonors();
}
window.editDonor = editDonor;
window.deleteDonor = deleteDonor;

// ── RECIPIENTS ──
async function editRecipient(id) {
  const res = await fetch(`${API}/api/recipients`);
  const all = await res.json();
  const r = all.find(x => x.R_ID === id);
  if (!r) return showToast('Recipient not found', 'error');
  openModal('Edit Recipient #' + id, `
    <div class="form-group"><label>Name</label><input type="text" name="Name" value="${r.Name}" required /></div>
    <div class="form-group"><label>Age</label><input type="number" name="Age" value="${r.Age}" min="0" required /></div>
    <div class="form-group"><label>Blood Group</label>${bloodSelect('Blood_Group', r.Blood_Group)}</div>
    <div class="form-group"><label>Urgency (0–100)</label><input type="number" name="Medical_Urgency_Score" value="${r.Medical_Urgency_Score}" min="0" max="100" required /></div>
  `, async (data) => {
    const res = await fetch(`${API}/api/recipients/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const result = await res.json();
    showToast(res.ok ? 'Recipient updated' : result.error, res.ok ? 'success' : 'error');
    loadRecipients();
  });
}
async function deleteRecipient(id) {
  if (!confirm('Delete Recipient #' + id + '?')) return;
  const r = await fetch(`${API}/api/recipients/${id}`, { method:'DELETE' });
  const result = await r.json();
  showToast(r.ok ? 'Recipient deleted' : result.error, r.ok ? 'success' : 'error');
  loadRecipients();
}
window.editRecipient = editRecipient;
window.deleteRecipient = deleteRecipient;

// ── ORGANS ──
function fmtForInput(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 16);
}
async function editOrgan(id) {
  const res = await fetch(`${API}/api/organs`);
  const all = await res.json();
  const o = all.find(x => x.O_ID === id);
  if (!o) return showToast('Organ not found', 'error');
  const typeOptions = ['Kidney','Liver','Heart','Lung','Cornea','Pancreas'];
  const statusOptions = ['Available','Allocated','Used'];
  openModal('Edit Organ #' + id, `
    <div class="form-group"><label>Type</label><select name="Type" required>${typeOptions.map(t => `<option value="${t}" ${t===o.Type?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="form-group"><label>Status</label><select name="Status" required>${statusOptions.map(s => `<option value="${s}" ${s===o.Status?'selected':''}>${s}</option>`).join('')}</select></div>
    <div class="form-group"><label>Harvest Time</label><input type="datetime-local" name="Harvest_Time" value="${fmtForInput(o.Harvest_Time)}" required /></div>
    <div class="form-group"><label>Expiry Time</label><input type="datetime-local" name="Expiry_Time" value="${fmtForInput(o.Expiry_Time)}" required /></div>
    <div class="form-group"><label>Donor ID</label><input type="number" name="Donor_ID" value="${o.Donor_ID}" required /></div>
  `, async (data) => {
    const res = await fetch(`${API}/api/organs/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const result = await res.json();
    showToast(res.ok ? 'Organ updated' : result.error, res.ok ? 'success' : 'error');
    loadOrgans();
  });
}
async function deleteOrgan(id) {
  if (!confirm('Delete Organ #' + id + '?')) return;
  const r = await fetch(`${API}/api/organs/${id}`, { method:'DELETE' });
  const result = await r.json();
  showToast(r.ok ? 'Organ deleted' : result.error, r.ok ? 'success' : 'error');
  loadOrgans();
}
window.editOrgan = editOrgan;
window.deleteOrgan = deleteOrgan;

// ── HOSPITALS ──
async function editHospital(id) {
  const res = await fetch(`${API}/api/hospitals`);
  const all = await res.json();
  const h = all.find(x => x.H_ID === id);
  if (!h) return showToast('Hospital not found', 'error');
  openModal('Edit Hospital #' + id, `
    <div class="form-group"><label>Name</label><input type="text" name="Name" value="${h.Name}" required /></div>
    <div class="form-group"><label>Location</label><input type="text" name="Location" value="${h.Location || ''}" /></div>
    <div class="form-group"><label>License No</label><input type="text" name="License_No" value="${h.License_No}" required /></div>
    <div class="form-group form-toggle"><label>Authorized</label>
      <label class="toggle"><input type="checkbox" name="Is_Authorized" ${h.Is_Authorized ? 'checked' : ''} /><span class="toggle-slider"></span></label>
    </div>
  `, async (data) => {
    const res = await fetch(`${API}/api/hospitals/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const result = await res.json();
    showToast(res.ok ? 'Hospital updated' : result.error, res.ok ? 'success' : 'error');
    loadHospitals();
  });
}
async function deleteHospital(id) {
  if (!confirm('Delete Hospital #' + id + '?')) return;
  const r = await fetch(`${API}/api/hospitals/${id}`, { method:'DELETE' });
  const result = await r.json();
  showToast(r.ok ? 'Hospital deleted' : result.error, r.ok ? 'success' : 'error');
  loadHospitals();
}
window.editHospital = editHospital;
window.deleteHospital = deleteHospital;

// ── CONSENT ──
async function deleteConsent(id) {
  if (!confirm('Delete Consent Document #' + id + '?')) return;
  const r = await fetch(`${API}/api/consent/${id}`, { method:'DELETE' });
  const result = await r.json();
  showToast(r.ok ? 'Document deleted' : result.error, r.ok ? 'success' : 'error');
  loadConsent();
}
window.deleteConsent = deleteConsent;
