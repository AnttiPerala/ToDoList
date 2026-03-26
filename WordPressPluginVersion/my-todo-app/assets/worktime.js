// --- SORTING STATE ---
let worktimeSortKey = localStorage.getItem('worktimeSortKey') || 'date'; // date, start, duration, description, project, end
let worktimeSortDir = localStorage.getItem('worktimeSortDir') || 'desc'; // asc, desc

function setWorktimeSort(key) {
    if (worktimeSortKey === key) {
        worktimeSortDir = (worktimeSortDir === 'asc') ? 'desc' : 'asc';
    } else {
        worktimeSortKey = key;
        // Default sort directions
        worktimeSortDir = (key === 'description' || key === 'project') ? 'asc' : 'desc';
    }
    localStorage.setItem('worktimeSortKey', worktimeSortKey);
    localStorage.setItem('worktimeSortDir', worktimeSortDir);

    // Redraw immediately
    const pf = document.getElementById('projectFilter');
    const period = document.querySelector('.worktime-filters button.active')?.dataset.period || 'thisMonth';
    drawWorktimes(period, pf ? pf.value : 'All projects');
}

function getSortedWorktimes(items) {
    const dir = worktimeSortDir === 'asc' ? 1 : -1;
    return items.sort((a, b) => {
        let valA, valB;

        switch (worktimeSortKey) {
            case 'start':
            case 'date':
                valA = new Date(a.start).getTime();
                valB = new Date(b.start).getTime();
                break;
            case 'end':
                valA = new Date(a.end).getTime();
                valB = new Date(b.end).getTime();
                break;
            case 'duration':
                valA = (new Date(a.end) - new Date(a.start));
                valB = (new Date(b.end) - new Date(b.start));
                break;
            case 'description':
                valA = (a.description || '').toLowerCase();
                valB = (b.description || '').toLowerCase();
                break;
            case 'project':
                valA = (a.project || '').toLowerCase();
                valB = (b.project || '').toLowerCase();
                break;
            default:
                valA = new Date(a.start).getTime();
                valB = new Date(b.start).getTime();
        }
        
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });
}

// --- CORE DATA LOGIC ---

function getProjectsFromLastTwoYears() {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const projects = ['All projects', ...new Set(window.worktimes
        .filter(entry => !entry.deleted && new Date(entry.start) >= twoYearsAgo)
        .map(entry => entry.project)
        .filter(Boolean))];
    return projects;
}

const WT_PROJECT_TARGETS_KEY = 'worktimeProjectTargets';
const WT_PROJECT_ARCHIVE_KEY = 'worktimeArchivedProjects';

function wt_projectNorm(name) {
    return (name || '').trim().toLowerCase();
}

function wt_getAllProjectNames() {
    const fromEntries = (window.worktimes || [])
        .filter(entry => !entry.deleted)
        .map(entry => (entry.project || '').trim())
        .filter(Boolean);
    const archived = Object.keys(wt_loadArchivedProjects());
    // archived is stored normalized; keep original names from entries for display
    return [...new Set(fromEntries)].sort((a, b) => a.localeCompare(b));
}

function wt_loadArchivedProjects() {
    try {
        const raw = localStorage.getItem(WT_PROJECT_ARCHIVE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_) {
        return {};
    }
}

function wt_saveArchivedProjects(map) {
    localStorage.setItem(WT_PROJECT_ARCHIVE_KEY, JSON.stringify(map || {}));
}

function wt_isArchivedProject(name) {
    const norm = wt_projectNorm(name);
    if (!norm) return false;
    const archived = wt_loadArchivedProjects();
    return Boolean(archived[norm]);
}

function wt_loadProjectTargets() {
    try {
        const raw = localStorage.getItem(WT_PROJECT_TARGETS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_) {
        return {};
    }
}

function wt_saveProjectTargets(targets) {
    localStorage.setItem(WT_PROJECT_TARGETS_KEY, JSON.stringify(targets || {}));
}

function wt_getPresetRange(periodType, customStart, customEnd) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let start;
    let end;

    if (periodType === 'thisYear') {
        start = new Date(y, 0, 1, 0, 0, 0, 0);
        end = new Date(y, 11, 31, 23, 59, 59, 999);
    } else if (periodType === 'springSemester') {
        start = new Date(y, 0, 1, 0, 0, 0, 0);
        end = new Date(y, 5, 30, 23, 59, 59, 999);
    } else if (periodType === 'autumnSemester') {
        start = new Date(y, 7, 1, 0, 0, 0, 0);
        end = new Date(y, 11, 31, 23, 59, 59, 999);
    } else if (periodType === 'thisMonth') {
        start = new Date(y, m, 1, 0, 0, 0, 0);
        end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    } else if (periodType === 'thisWeek') {
        const day = now.getDay(); // 0 Sunday
        const mondayDiff = (day + 6) % 7;
        start = new Date(now);
        start.setDate(now.getDate() - mondayDiff);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    } else {
        if (!customStart || !customEnd) return null;
        start = new Date(customStart + 'T00:00:00');
        end = new Date(customEnd + 'T23:59:59.999');
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    }
    return { start, end };
}

function wt_minutesForProjectInRange(project, startDate, endDate) {
    const projNorm = wt_projectNorm(project || 'No project');
    return (window.worktimes || [])
        .filter(w => !w.deleted)
        .filter(w => wt_projectNorm(w.project || 'No project') === projNorm)
        .filter(w => {
            const d = new Date(w.start);
            return d >= startDate && d <= endDate;
        })
        .reduce((acc, w) => acc + Math.max(0, Math.round((new Date(w.end) - new Date(w.start)) / 60000)), 0);
}

function filterWorktimesByPeriod(period, selectedProject = 'All projects') {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return window.worktimes.filter(entry => {
        if (entry.deleted) return false;
        
        const entryDate = new Date(entry.start);
        const matchesPeriod = period === 'all' ? true : 
            period === 'thisMonth' ? (entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth) :
            period === 'lastMonth' ? (entryDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear) && entryDate.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1)) :
            period === 'thisYear' ? (entryDate.getFullYear() === currentYear) :
            period === 'lastYear' ? (entryDate.getFullYear() === currentYear - 1) : true;
        const matchesProject = selectedProject === 'All projects' ? true : entry.project === selectedProject;
        return matchesPeriod && matchesProject;
    });
}

// --- DRAW FUNCTION ---

window.drawWorktimes = function(period = 'all', selectedProject = 'All projects') {
    const listEl = document.getElementById('worktimeList');
    listEl.innerHTML = ''; 

    const table = document.createElement('div');
    table.className = 'worktime-table';
    
    // 1. Build Interactive Headers
    const headers = [
        { label: 'Date', key: 'date' },
        { label: 'Start', key: 'start' },
        { label: 'Duration', key: 'duration' },
        { label: 'Description', key: 'description' },
        { label: 'Project', key: 'project' },
        { label: 'End', key: 'end' },
        { label: 'Edit', key: null },
        { label: 'Delete', key: null }
    ];

    headers.forEach(h => {
        const div = document.createElement('div');
        div.className = 'worktime-header';
        
        if (h.key) {
            // Sort Arrow Logic
            let label = h.label;
            if (worktimeSortKey === h.key) {
                label += (worktimeSortDir === 'asc' ? ' ▲' : ' ▼');
            }
            div.textContent = label;
            div.style.cursor = 'pointer';
            div.dataset.sort = h.key;
            div.onclick = () => setWorktimeSort(h.key);
        } else {
            div.textContent = h.label;
        }
        table.appendChild(div);
    });

    // 2. Filter & Sort Data
    let totalMinutes = 0;
    let filtered = filterWorktimesByPeriod(period, selectedProject);
    filtered = getSortedWorktimes(filtered);

    // 3. Render Rows
    filtered.forEach((entry) => {
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        const duration = Math.round((endDate - startDate) / 60000) || 0;
        totalMinutes += duration;
        
        // Date
        table.appendChild(window.createElementWithText('div', startDate.toLocaleDateString('fi-FI'), 'worktime-cell'));
        
        // Start Time
        table.appendChild(window.createElementWithText('div', startDate.toLocaleTimeString('fi-FI', { hour12: false, hour: '2-digit', minute: '2-digit' }), 'worktime-cell'));
        
        // Duration (Formatted)
        const durText = `${duration} min ${duration > 59 ? `(${Math.floor(duration/60)}h${duration%60 === 0 ? '' : ` ${duration%60}min`})` : ''}`;
        table.appendChild(window.createElementWithText('div', durText, 'worktime-cell'));
        
        // Description (XSS Safe)
        table.appendChild(window.createElementWithText('div', entry.description || '', 'worktime-cell'));
        
        // Project (XSS Safe + Click for totals feature)
        const projCell = window.createElementWithText('div', entry.project || 'No project', 'worktime-cell');
        projCell.style.cursor = 'help';
        projCell.title = "Click to see this month's total";
        projCell.onclick = () => wt_showProjectThisMonthModal(entry.project);
        table.appendChild(projCell);
        
        // End Time
        table.appendChild(window.createElementWithText('div', endDate.toLocaleTimeString('fi-FI', { hour12: false, hour: '2-digit', minute: '2-digit' }), 'worktime-cell'));
        
        // Buttons
        const editCell = document.createElement('div');
        editCell.className = 'worktime-cell';
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => editWorktime(entry.id);
        editCell.appendChild(editBtn);
        table.appendChild(editCell);

        const delCell = document.createElement('div');
        delCell.className = 'worktime-cell';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete';
        delBtn.textContent = 'Delete';
        delBtn.onclick = () => deleteWorktime(entry.id);
        delCell.appendChild(delBtn);
        table.appendChild(delCell);
    });

    // 4. Totals Display
    const hours = Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;
    const top = document.getElementById('worktimeTotalsTop'); 
    if (top) {
        top.innerHTML = `<span>Total:</span> <span>${totalMinutes} min</span> <span class="muted">(${hours}h${min? ' ' + min + 'min' : ''})</span>`;

        const focusProjectRaw = window.worktimeProjectFocus;
        const focusProject = (typeof focusProjectRaw === 'string' ? focusProjectRaw.trim() : '') || null;
        if (focusProject) {
            const thisMonth = wt_hm(wt_minutesForProjectThisMonth(focusProject));
            const thisYear = wt_hm(wt_minutesForProjectThisYear(focusProject));
            const allTimes = wt_hm(wt_minutesForProjectAllTime(focusProject));

            const statsLine = document.createElement('div');
            statsLine.className = 'muted';
            statsLine.style.marginTop = '2px';
            statsLine.style.fontSize = '0.9em';
            statsLine.textContent = `Total hours for project ${focusProject} this month: ${thisMonth}  This year: ${thisYear}  All times: ${allTimes}`;
            top.appendChild(statsLine);
        }
    }

    // Footer Row in Table
    table.appendChild(window.createElementWithText('div', 'Total:', 'worktime-cell total'));
    table.appendChild(window.createElementWithText('div', '', 'worktime-cell total'));
    table.appendChild(window.createElementWithText('div', `${totalMinutes} min (${hours}h ${min}m)`, 'worktime-cell total'));
    for(let i=0; i<5; i++) table.appendChild(document.createElement('div')).className = 'worktime-cell total';

    listEl.appendChild(table);
}

// --- DYNAMIC PROJECT INPUT ---

function updateProjectList() {
    const existingContainer = document.querySelector('.project-input-container');
    if (existingContainer) existingContainer.remove();
    
    const container = document.createElement('div');
    container.className = 'project-input-container';
    
    const select = document.createElement('select');
    select.id = 'projectSelect';
    select.className = 'button-30';
    
    const projects = getProjectsFromLastTwoYears()
        .filter(p => p !== 'All projects')
        .filter(p => !wt_isArchivedProject(p));
    
    select.innerHTML = `<option value="">Select Project</option>${projects.map(project => `<option value="${project}">${project}</option>`).join('')}<option value="custom">+ Add New Project</option><option value="manageProjects">⚙ Manage Projects</option>`;
    
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.id = 'projectInput';
    customInput.className = 'button-30';
    customInput.style.display = 'none';
    
    select.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            select.style.display = 'none';
            customInput.style.display = 'block';
            customInput.focus();
        } else if (e.target.value === 'manageProjects') {
            select.value = '';
            openProjectSettingsModal();
        } else {
            customInput.value = e.target.value;
        }
    });

    customInput.addEventListener('blur', () => {
        if (customInput.value.trim() === '') {
            select.value = '';
            select.style.display = 'block';
            customInput.style.display = 'none';
        }
    });
    
    container.appendChild(select);
    container.appendChild(customInput);
    
    const workDescription = document.getElementById('workDescription');
    if(workDescription) workDescription.parentNode.insertBefore(container, workDescription.nextSibling);
    
    const existingDatalist = document.getElementById('projectList');
    if (existingDatalist) existingDatalist.remove();
}

function refreshProjectSelectorsAndList() {
    updateProjectList();
    const pf = document.getElementById('projectFilter');
    if (pf) {
        pf.innerHTML = getProjectsFromLastTwoYears().map(p => `<option value="${p}">${p}</option>`).join('');
    }
    const activePeriod = document.querySelector('.worktime-filters button.active')?.dataset.period || 'thisMonth';
    drawWorktimes(activePeriod, pf ? pf.value : 'All projects');
}

function ensureProjectSettingsModal() {
    let modal = document.getElementById('projectSettingsModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'projectSettingsModal';
    modal.className = 'project-settings-modal';
    modal.innerHTML = `
      <div class="project-settings-content">
        <div class="project-settings-header">
          <h3>Manage Projects</h3>
          <button type="button" class="button-30" id="closeProjectSettingsBtn">Close</button>
        </div>
        <div id="projectSettingsBody"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    modal.querySelector('#closeProjectSettingsBtn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    return modal;
}

function renderProjectSettingsBody() {
    const modal = ensureProjectSettingsModal();
    const body = modal.querySelector('#projectSettingsBody');
    const targets = wt_loadProjectTargets();
    const archived = wt_loadArchivedProjects();
    const projects = wt_getAllProjectNames().sort((a, b) => {
        const aArchived = Boolean(archived[wt_projectNorm(a)]);
        const bArchived = Boolean(archived[wt_projectNorm(b)]);
        if (aArchived !== bArchived) return aArchived ? 1 : -1; // archived to bottom
        return a.localeCompare(b); // alphabetical inside each group
    });

    if (!projects.length) {
        body.innerHTML = `<p class="muted">No projects found yet.</p>`;
        return;
    }

    body.innerHTML = projects.map(project => {
        const thisMonth = wt_hm(wt_minutesForProjectThisMonth(project));
        const thisYear = wt_hm(wt_minutesForProjectThisYear(project));
        const allTimes = wt_hm(wt_minutesForProjectAllTime(project));
        const target = targets[project] || {};
        const isArchived = Boolean(archived[wt_projectNorm(project)]);
        return `
          <div class="project-settings-row ${isArchived ? 'archived' : ''}" data-project="${project.replace(/"/g, '&quot;')}">
            <div class="project-settings-name">${project}</div>
            <div class="project-settings-hours muted">Hours -> This month: ${thisMonth} | This year: ${thisYear} | All times: ${allTimes}</div>
            <div class="project-settings-actions">
              <input type="text" class="button-30 rename-input" placeholder="Rename project" value="${project.replace(/"/g, '&quot;')}">
              <button type="button" class="button-30 rename-project-btn">Rename</button>
              <button type="button" class="button-30 archive-project-btn">${isArchived ? 'Revive' : 'Archive'}</button>
              <button type="button" class="button-30 delete-project-btn">Delete Project</button>
            </div>
            <div class="project-target-box">
              <label>Target hours</label>
              <input type="number" min="0" step="0.5" class="button-30 target-hours" value="${target.hours ?? ''}" placeholder="Optional">
              <label>Period</label>
              <select class="button-30 target-period">
                <option value="thisYear" ${target.periodType === 'thisYear' ? 'selected' : ''}>This year</option>
                <option value="springSemester" ${target.periodType === 'springSemester' ? 'selected' : ''}>Spring semester</option>
                <option value="autumnSemester" ${target.periodType === 'autumnSemester' ? 'selected' : ''}>Autumn semester</option>
                <option value="thisMonth" ${target.periodType === 'thisMonth' ? 'selected' : ''}>This month</option>
                <option value="thisWeek" ${target.periodType === 'thisWeek' ? 'selected' : ''}>This week</option>
                <option value="custom" ${target.periodType === 'custom' ? 'selected' : ''}>Custom dates</option>
              </select>
              <input type="date" class="button-30 target-start" value="${target.startDate || ''}">
              <input type="date" class="button-30 target-end" value="${target.endDate || ''}">
              <button type="button" class="button-30 save-target-btn">Save target</button>
              <button type="button" class="button-30 clear-target-btn">Clear target</button>
            </div>
          </div>
        `;
    }).join('');

    body.querySelectorAll('.project-settings-row').forEach(row => {
        const oldProject = row.getAttribute('data-project');
        const renameInput = row.querySelector('.rename-input');
        const renameBtn = row.querySelector('.rename-project-btn');
        const archiveBtn = row.querySelector('.archive-project-btn');
        const deleteBtn = row.querySelector('.delete-project-btn');
        const periodSel = row.querySelector('.target-period');
        const startInput = row.querySelector('.target-start');
        const endInput = row.querySelector('.target-end');
        const hoursInput = row.querySelector('.target-hours');
        const saveTargetBtn = row.querySelector('.save-target-btn');
        const clearTargetBtn = row.querySelector('.clear-target-btn');

        const syncCustomDateDisabled = () => {
            const isCustom = periodSel.value === 'custom';
            startInput.disabled = !isCustom;
            endInput.disabled = !isCustom;
            startInput.style.display = isCustom ? '' : 'none';
            endInput.style.display = isCustom ? '' : 'none';
        };
        syncCustomDateDisabled();
        periodSel.addEventListener('change', syncCustomDateDisabled);

        renameBtn.addEventListener('click', () => {
            const newProject = (renameInput.value || '').trim();
            if (!newProject) return alert('Please enter a new name');
            if (wt_projectNorm(newProject) === wt_projectNorm(oldProject)) return;
            const clash = wt_getAllProjectNames().find(p => wt_projectNorm(p) === wt_projectNorm(newProject));
            if (clash) return alert('A project with this name already exists.');

            window.worktimes.forEach(w => {
                if (!w.deleted && wt_projectNorm(w.project) === wt_projectNorm(oldProject)) {
                    window.touchItem(w);
                    w.project = newProject;
                }
            });

            const targets = wt_loadProjectTargets();
            if (targets[oldProject]) {
                targets[newProject] = targets[oldProject];
                delete targets[oldProject];
                wt_saveProjectTargets(targets);
            }

            const archived = wt_loadArchivedProjects();
            const oldNorm = wt_projectNorm(oldProject);
            const newNorm = wt_projectNorm(newProject);
            if (archived[oldNorm]) {
                delete archived[oldNorm];
                archived[newNorm] = true;
                wt_saveArchivedProjects(archived);
            }

            window.notifyChange('worktimes');
            refreshProjectSelectorsAndList();
            renderProjectSettingsBody();
        });

        archiveBtn.addEventListener('click', () => {
            const archived = wt_loadArchivedProjects();
            const norm = wt_projectNorm(oldProject);
            if (!norm) return;
            if (archived[norm]) {
                delete archived[norm];
            } else {
                archived[norm] = true;
            }
            wt_saveArchivedProjects(archived);
            refreshProjectSelectorsAndList();
            renderProjectSettingsBody();
        });

        deleteBtn.addEventListener('click', () => {
            if (!confirm(`Delete project "${oldProject}" from entries? Entries will be kept as "No project".`)) return;
            window.worktimes.forEach(w => {
                if (!w.deleted && wt_projectNorm(w.project) === wt_projectNorm(oldProject)) {
                    window.touchItem(w);
                    w.project = '';
                }
            });
            const targets = wt_loadProjectTargets();
            delete targets[oldProject];
            wt_saveProjectTargets(targets);
            const archived = wt_loadArchivedProjects();
            delete archived[wt_projectNorm(oldProject)];
            wt_saveArchivedProjects(archived);
            window.notifyChange('worktimes');
            refreshProjectSelectorsAndList();
            renderProjectSettingsBody();
        });

        saveTargetBtn.addEventListener('click', () => {
            const hours = Number(hoursInput.value);
            if (hoursInput.value === '' || Number.isNaN(hours) || hours < 0) {
                return alert('Please enter a valid target hours value (0 or more).');
            }
            const periodType = periodSel.value;
            const range = wt_getPresetRange(periodType, startInput.value, endInput.value);
            if (!range) return alert('Please provide a valid start/end date for custom period.');

            const targets = wt_loadProjectTargets();
            targets[oldProject] = {
                hours,
                periodType,
                startDate: periodType === 'custom' ? startInput.value : '',
                endDate: periodType === 'custom' ? endInput.value : ''
            };
            wt_saveProjectTargets(targets);
            alert(`Saved target for "${oldProject}".`);
        });

        clearTargetBtn.addEventListener('click', () => {
            const targets = wt_loadProjectTargets();
            delete targets[oldProject];
            wt_saveProjectTargets(targets);
            hoursInput.value = '';
            periodSel.value = 'thisYear';
            startInput.value = '';
            endInput.value = '';
            syncCustomDateDisabled();
        });
    });
}

function openProjectSettingsModal() {
    const modal = ensureProjectSettingsModal();
    renderProjectSettingsBody();
    modal.style.display = 'flex';
}

// --- CRUD LOGIC ---

let editingId = null;

function highlightWorktimeForm() {
    const form = document.getElementById('worktimeForm');
    if (!form) return;
    form.classList.remove('worktime-edit-highlight');
    // Force reflow so animation can restart
    void form.offsetWidth;
    form.classList.add('worktime-edit-highlight');
    setTimeout(() => {
        form.classList.remove('worktime-edit-highlight');
    }, 1200);
}

window.editWorktime = function(id) {
    const entry = window.worktimes.find(item => item.id === id);
    if (entry) {
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        
        // Correct timezone for datetime-local input
        const startOffset = startDate.getTimezoneOffset() * 60000;
        const endOffset = endDate.getTimezoneOffset() * 60000;
        
        document.getElementById('workDescription').value = entry.description;
        
        // Handle Project Selector
        const pInput = document.getElementById('projectInput');
        const pSelect = document.getElementById('projectSelect');
        const knownProjects = Array.from(pSelect.options).map(o => o.value);
        
        if (knownProjects.includes(entry.project)) {
            pSelect.value = entry.project;
            pSelect.style.display = 'block';
            pInput.style.display = 'none';
        } else {
            pSelect.value = 'custom';
            pSelect.style.display = 'none';
            pInput.style.display = 'block';
            pInput.value = entry.project || '';
        }

        document.getElementById('workStart').value = (new Date(startDate - startOffset)).toISOString().slice(0, 16);
        document.getElementById('workEnd').value = (new Date(endDate - endOffset)).toISOString().slice(0, 16);
        
        // Trigger auto-calc for duration field
        wt_recomputeFromStartEnd();
        
        const submitButton = document.getElementById('worktimeForm').querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Worktime';
        editingId = id;

        // Bring the form into view and highlight it so the user notices edit mode
        window.scrollTo({ top: 0, behavior: 'smooth' });
        highlightWorktimeForm();
    }
}

window.deleteWorktime = function(id) {
    const entry = window.worktimes.find(t => t.id === id);
    if(entry && confirm("Delete Worktime?")) {
        window.touchItem(entry);
        entry.deleted = true;
        window.notifyChange('worktimes');
        const pf = document.getElementById('projectFilter');
        const period = document.querySelector('.worktime-filters button.active')?.dataset.period || 'thisMonth';
        drawWorktimes(period, pf ? pf.value : 'All projects');
    }
}

// Form Submit
const worktimeForm = document.getElementById("worktimeForm");
if(worktimeForm) {
    worktimeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const description = document.getElementById('workDescription').value;
        const projectInput = document.getElementById('projectInput');
        const projectSelect = document.getElementById('projectSelect');
        const rawProject = projectInput.value || projectSelect.value;
        const project = (rawProject || '').trim();
        const start = new Date(document.getElementById('workStart').value);
        let end;
        
        const workDuration = document.getElementById('workDuration');
        const workEnd = document.getElementById('workEnd');

        if (workDuration.value) {
            end = new Date(start.getTime() + workDuration.value * 60000);
        } else if (workEnd.value) {
            end = new Date(workEnd.value);
        } else {
            alert('Please provide either duration or end time');
            return;
        }

        const entry = {
            id: editingId || Date.now(),
            description,
            project,
            start: start.toISOString(),
            end: end.toISOString(),
            deleted: false,
            lastModified: new Date().toISOString()
        };

        if (editingId) {
            const index = window.worktimes.findIndex(item => item.id === editingId);
            window.worktimes[index] = entry;
            editingId = null;
            worktimeForm.querySelector('button[type="submit"]').textContent = 'Add Worktime';
        } else {
            window.worktimes.push(entry);
        }

        window.worktimeProjectFocus = project || 'No project';

        window.notifyChange('worktimes');
        
        updateProjectList();
        const pf = document.getElementById('projectFilter');
        if(pf) {
            pf.innerHTML = getProjectsFromLastTwoYears().map(p => `<option value="${p}">${p}</option>`).join('');
        }
        drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
        
        this.reset();
        wt_setDurationHint(''); // Clear hint
        projectSelect.style.display = 'block';
        projectSelect.value = '';
        projectInput.style.display = 'none';
        
        // Reset time to now
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        document.getElementById('workStart').value = (new Date(now - offset)).toISOString().slice(0, 16);
    });
}

// --- FILTERS & MENU ---

function addWorktimeFilterButtons() {
    if (document.querySelector('.worktime-filters')) return;
    const filterContainer = document.createElement('div');
    filterContainer.className = 'worktime-filters';
    const projects = getProjectsFromLastTwoYears();
    
    filterContainer.innerHTML = `
        <select class="button-30" id="projectFilter">
            ${projects.map(project => `<option value="${project}">${project}</option>`).join('')}
        </select>
        <button class="button-30" data-period="all">All times</button>
        <button class="button-30 active" data-period="thisMonth">This Month</button>
        <button class="button-30" data-period="lastMonth">Last Month</button>
        <button class="button-30" data-period="thisYear">This Year</button>
        <button class="button-30" data-period="lastYear">Last Year</button>
    `;

    const listEl = document.getElementById('worktimeList');
    if (listEl && listEl.parentNode) listEl.parentNode.insertBefore(filterContainer, listEl);

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            filterContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            drawWorktimes(e.target.dataset.period, document.getElementById('projectFilter')?.value || 'All projects');
        }
    });

    const pfSel = filterContainer.querySelector('#projectFilter');
    if (pfSel) {
      pfSel.addEventListener('change', (e) => {
          const activePeriod = filterContainer.querySelector('button.active')?.dataset.period || 'thisMonth';
          drawWorktimes(activePeriod, e.target.value);
      });
    }
}

function initializeWorktime() {
    addWorktimeFilterButtons();
    const pf=document.getElementById('projectFilter');
    drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
    updateProjectList();
    wt_wireDuration(); // Enable live hints
}

function createWorktimeMenu() {
    const menu = document.querySelector('.menu');
    menu.innerHTML = `
        <li><a href="#" id="exportWorktimeCsvBtn">📄 Export CSV</a></li>
        <li><a href="#" id="exportWorktimeTextBtn">📃 Export Text</a></li>
        <li><a href="#" id="exportWorktimeSystemBtn">📤 Export for Worktime System</a></li>
        <li><a href="#" id="clearWorktimeBtn">🗑️ Delete all worktime items</a></li>
        <li><a href="#" id="backupBtn">💾 Backup App</a></li>
        <li><a href="#" id="restoreBtn">♻️ Restore</a></li>
        <li><input type="file" id="uploadWorktimeInput" style="display: none" /></li>
        <li>
            <a href="${typeof wpAppData !== 'undefined' ? wpAppData.login_url : '#'}">🔐 Login / Register</a> 
            <span class="note" style="margin-left:5px; font-size:0.8em; opacity:0.7;">(if you want cloud sync)</span>
        </li>
        `;
    setTimeout(() => {
        document.getElementById('exportWorktimeCsvBtn').addEventListener('click', exportWorktimeCsv);
        document.getElementById('exportWorktimeTextBtn').addEventListener('click', exportWorktimeText);
        document.getElementById('clearWorktimeBtn').addEventListener('click', clearWorktimeData);
        document.getElementById('backupBtn').addEventListener('click', handleBackup);
        document.getElementById('restoreBtn').addEventListener('click', handleRestore);
        document.getElementById('exportWorktimeSystemBtn').addEventListener('click', exportWorktimeForSystem);
    }, 500);
}

// --- EXPORT HELPERS ---

function exportWorktimeCsv() {
    const csvContent = window.worktimes.filter(e => !e.deleted).map(entry => {
        const start = new Date(entry.start);
        const end = new Date(entry.end);
        const duration = Math.round((end - start) / 60000);
        return `${start.toLocaleDateString()},${start.toLocaleTimeString()},${duration},${entry.description},${entry.project},${end.toLocaleTimeString()}`;
    }).join('\n');
    const header = 'Date,Start Time,Duration (min),Description,Project,End Time\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'worktime_export.csv'; a.click();
}

function exportWorktimeText() {
    const textContent = window.worktimes.filter(e => !e.deleted).map(entry => {
        const start = new Date(entry.start);
        const end = new Date(entry.end);
        const duration = Math.round((end - start) / 60000);
        return `Date: ${start.toLocaleDateString()}\nStart: ${start.toLocaleTimeString()}\nDuration: ${duration} min\nDescription: ${entry.description}\nProject: ${entry.project}\nEnd: ${end.toLocaleTimeString()}\n---------------`;
    }).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'worktime_export.txt'; a.click();
}

function clearWorktimeData() {
    if (confirm('Are you sure you want to delete all worktime entries?')) {
        // Soft delete all
        window.worktimes.forEach(w => {
            window.touchItem(w);
            w.deleted = true;
        });
        window.notifyChange('worktimes');
        const pf=document.getElementById('projectFilter');
        drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
    }
}

// --- RESTORED INPUT HELPERS (AUTO-CALC & HINTS) ---

function wt_setDurationHint(mins){
    // We assume there is a span or div near the input to show the hint. 
    // If not, we append one dynamically.
    let el = document.getElementById('durationHelper');
    if (!el) {
        const dInput = document.getElementById('workDuration');
        if(dInput) {
            el = document.createElement('span');
            el.id = 'durationHelper';
            el.style.marginLeft = '10px';
            el.style.color = '#666';
            dInput.parentNode.insertBefore(el, dInput.nextSibling);
        } else return;
    }
    
    var m = parseInt(mins, 10);
    if (!isFinite(m) || m <= 0){ el.textContent = ''; return; }
    var h = Math.floor(m/60), r = m % 60;
    el.textContent = '= ' + (h? (h+'h') : '') + (h && r ? ' ' : '') + (r? (r+'min') : '');
}

function wt_recomputeFromStartEnd(){
    var s = document.getElementById('workStart');
    var e = document.getElementById('workEnd');
    var d = document.getElementById('workDuration');
    if (!s || !e || !d) return;
    if (!s.value || !e.value){ wt_setDurationHint(''); return; }
    var mins = Math.max(0, Math.round((new Date(e.value) - new Date(s.value))/60000));
    d.value = mins || '';
    wt_setDurationHint(mins);
}

function wt_recomputeEndFromStartAndDuration(){
    var s = document.getElementById('workStart');
    var e = document.getElementById('workEnd');
    var d = document.getElementById('workDuration');
    if (!s || !e || !d) return;
    var mins = parseInt(d.value, 10) || 0;
    if (!s.value || mins <= 0){ wt_setDurationHint(''); return; }
    var end = new Date(new Date(s.value).getTime() + mins*60000);
    var off = end.getTimezoneOffset()*60000;
    e.value = (new Date(end - off)).toISOString().slice(0,16);
    wt_setDurationHint(mins);
}

function wt_wireDuration(){
    var d = document.getElementById('workDuration');
    var s = document.getElementById('workStart');
    var e = document.getElementById('workEnd');
    if (d && !d.__wt_wired){ 
        d.__wt_wired = true; 
        d.addEventListener('input', function(){ if (this.value) wt_recomputeEndFromStartAndDuration(); else wt_setDurationHint(''); }); 
    }
    if (e && !e.__wt_wired){ 
        e.__wt_wired = true; 
        e.addEventListener('input', function(){ if (this.value) wt_recomputeFromStartEnd(); else wt_setDurationHint(''); }); 
    }
    if (s && !s.__wt_wired){ 
        s.__wt_wired = true; 
        s.addEventListener('input', function(){ 
            var dEl=document.getElementById('workDuration'); 
            var eEl=document.getElementById('workEnd'); 
            if (dEl && dEl.value) wt_recomputeEndFromStartAndDuration(); 
            else if (eEl && eEl.value) wt_recomputeFromStartEnd(); 
            else wt_setDurationHint(''); 
        }); 
    }
    if (d && d.value) wt_setDurationHint(d.value);
}

// --- PROJECT TOTALS MODAL (Restored) ---

function wt_minutesForProjectThisMonth(project){
    try {
        if (!Array.isArray(window.worktimes)) return 0;
        const projNorm = (project || 'No project').trim().toLowerCase();
        const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
        return window.worktimes
            .filter(w => !w.deleted)
            .filter(w => ((w.project || 'No project').trim().toLowerCase()) === projNorm)
            .filter(w => { const d = new Date(w.start); return d.getFullYear() === y && d.getMonth() === m; })
            .reduce((acc, w) => acc + Math.max(0, Math.round((new Date(w.end) - new Date(w.start)) / 60000)), 0);
    } catch(_) { return 0; }
}

function wt_minutesForProjectThisYear(project){
    try {
        if (!Array.isArray(window.worktimes)) return 0;
        const projNorm = (project || 'No project').trim().toLowerCase();
        const now = new Date(); const y = now.getFullYear();
        return window.worktimes
            .filter(w => !w.deleted)
            .filter(w => ((w.project || 'No project').trim().toLowerCase()) === projNorm)
            .filter(w => { const d = new Date(w.start); return d.getFullYear() === y; })
            .reduce((acc, w) => acc + Math.max(0, Math.round((new Date(w.end) - new Date(w.start)) / 60000)), 0);
    } catch(_) { return 0; }
}

function wt_minutesForProjectAllTime(project){
    try {
        if (!Array.isArray(window.worktimes)) return 0;
        const projNorm = (project || 'No project').trim().toLowerCase();
        return window.worktimes
            .filter(w => !w.deleted)
            .filter(w => ((w.project || 'No project').trim().toLowerCase()) === projNorm)
            .reduce((acc, w) => acc + Math.max(0, Math.round((new Date(w.end) - new Date(w.start)) / 60000)), 0);
    } catch(_) { return 0; }
}

function wt_hm(mins){ const mm=Math.max(0,Math.round(mins||0)); const h=Math.floor(mm/60), r=mm%60; return (h+'h' + (r? ' '+r+'min':'')); }

function wt_showProjectThisMonthModal(project){
    // Create modal element if missing
    let el = document.getElementById('worktimeProjectTotalsModal');
    if (!el) {
        el = document.createElement('div');
        el.id = 'worktimeProjectTotalsModal';
        el.style.position = 'fixed';
        el.style.top = '20%';
        el.style.left = '50%';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.background = 'rgba(0,0,0,0.8)';
        el.style.color = '#fff';
        el.style.padding = '15px 25px';
        el.style.borderRadius = '8px';
        el.style.zIndex = '9999';
        el.style.pointerEvents = 'none';
        el.style.transition = 'opacity 0.3s';
        el.style.opacity = '0';
        document.body.appendChild(el);
    }
    
    project = (project || 'No project'); if (typeof project === 'string') project = project.trim() || 'No project';
    const minutes = wt_minutesForProjectThisMonth(project);
    el.textContent = `${wt_hm(minutes)} this month · ${project}`;
    
    // Fade in
    el.style.opacity = '1';
    
    // Auto Fade out
    setTimeout(() => {
        el.style.opacity = '0';
    }, 2500);
}


// --- INIT ---

if(window.worktimeBtn) {
    window.worktimeBtn.addEventListener("click", function () {
         if(window.appSync) window.appSync.triggerSync();
        window.worktimeBtn.classList.remove('inactive');
        window.todoBtn.classList.add('inactive');
        window.diaryBtn.classList.add('inactive');
        window.worktimeContainer.style.display = "block";
        window.diaryContainer.style.display = "none";
        window.todoContainer.style.display = "none";
        document.getElementById('mainTitle').textContent = 'Worktimes';
        if (typeof updateHeaderStats === 'function') updateHeaderStats();
        
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        document.getElementById('workStart').value = (new Date(now - offset)).toISOString().slice(0, 16);
        
        createWorktimeMenu();
        initializeWorktime();
    });
}