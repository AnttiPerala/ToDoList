
// Refactored worktime.js (Preserving functionality)

function getProjectsFromLastTwoYears() {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const projects = ['All projects', ...new Set(window.worktimes
        .filter(entry => new Date(entry.start) >= twoYearsAgo)
        .map(entry => entry.project)
        .filter(Boolean))];
    return projects;
}

function filterWorktimesByPeriod(period, selectedProject = 'All projects') {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return window.worktimes.filter(entry => {
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

window.drawWorktimes = function(period = 'all', selectedProject = 'All projects') {
    const listEl = document.getElementById('worktimeList');
    const table = document.createElement('div');
    table.className = 'worktime-table';
    
    // Header
    table.innerHTML = `
        <div class="worktime-header">Date</div>
        <div class="worktime-header">Start</div>
        <div class="worktime-header">Duration</div>
        <div class="worktime-header">Description</div>
        <div class="worktime-header">Project</div>
        <div class="worktime-header">End</div>
        <div class="worktime-header">Edit</div>
        <div class="worktime-header">Delete</div>
    `;

    let totalMinutes = 0;
    const filtered = filterWorktimesByPeriod(period, selectedProject);
    filtered.sort((a, b) => new Date(b.start) - new Date(a.start)); // Default sort

    filtered.forEach((entry) => {
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        const duration = Math.round((endDate - startDate) / 60000) || 0;
        totalMinutes += duration;
        
        table.innerHTML += `
          <div class="worktime-cell">${startDate.toLocaleDateString('fi-FI')}</div>
          <div class="worktime-cell">${startDate.toLocaleTimeString('fi-FI', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
          <div class="worktime-cell">${duration} min ${duration > 59 ? `(${Math.floor(duration/60)}h${duration%60 === 0 ? '' : ` ${duration%60}min`})` : ''}</div>
          <div class="worktime-cell">${entry.description || ''}</div>
          <div class="worktime-cell">${entry.project || 'No project'}</div>
          <div class="worktime-cell">${endDate.toLocaleTimeString('fi-FI', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
          <div class="worktime-cell"><button onclick="editWorktime(${entry.id})" class="btn-edit">Edit</button></div>
          <div class="worktime-cell"><button onclick="deleteWorktime(${entry.id})" class="btn-delete">Delete</button></div>
        `;
    });

    // Total Row
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const top = document.getElementById('worktimeTotalsTop'); 
    if(top) top.innerHTML = `<span>Total:</span> <span>${totalMinutes} min</span> <span class="muted">(${hours}h${remainingMinutes? ' ' + remainingMinutes + 'min' : ''})</span>`;

    table.innerHTML += `
        <div class="worktime-cell total">Total:</div><div class="worktime-cell total"></div>
        <div class="worktime-cell total">${totalMinutes} min</div>
        <div class="worktime-cell total"></div><div class="worktime-cell total"></div><div class="worktime-cell total"></div><div class="worktime-cell total"></div><div class="worktime-cell total"></div>
    `;

    listEl.innerHTML = '';
    listEl.appendChild(table);
}

// Restored Dynamic Project Input Logic
function updateProjectList() {
    const existingContainer = document.querySelector('.project-input-container');
    if (existingContainer) existingContainer.remove();
    
    const container = document.createElement('div');
    container.className = 'project-input-container';
    
    const select = document.createElement('select');
    select.id = 'projectSelect';
    select.className = 'button-30';
    
    const projects = getProjectsFromLastTwoYears().filter(p => p !== 'All projects');
    
    select.innerHTML = `<option value="">Select Project</option>${projects.map(project => `<option value="${project}">${project}</option>`).join('')}<option value="custom">+ Add New Project</option>`;
    
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
    
    // Cleanup old datalist if exists
    const existingDatalist = document.getElementById('projectList');
    if (existingDatalist) existingDatalist.remove();
}

// Edit/Delete Logic
let editingId = null;
window.editWorktime = function(id) {
    const entry = window.worktimes.find(item => item.id === id);
    if (entry) {
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        const startOffset = startDate.getTimezoneOffset() * 60000;
        const endOffset = endDate.getTimezoneOffset() * 60000;
        
        document.getElementById('workDescription').value = entry.description;
        document.getElementById('projectInput').value = entry.project || '';
        document.getElementById('workStart').value = (new Date(startDate - startOffset)).toISOString().slice(0, 16);
        document.getElementById('workEnd').value = (new Date(endDate - endOffset)).toISOString().slice(0, 16);
        document.getElementById('workDuration').value = '';
        
        const submitButton = document.getElementById('worktimeForm').querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Worktime';
        editingId = id;
    }
}

window.deleteWorktime = function(id) {
    window.worktimes = window.worktimes.filter(t => t.id !== id);
    localStorage.setItem("worktimes", JSON.stringify(window.worktimes));
    const pf = document.getElementById('projectFilter');
    drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
}

// Form Submit
const worktimeForm = document.getElementById("worktimeForm");
if(worktimeForm) {
    worktimeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const description = document.getElementById('workDescription').value;
        const projectInput = document.getElementById('projectInput');
        const projectSelect = document.getElementById('projectSelect');
        const project = projectInput.value || projectSelect.value;
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
            end: end.toISOString()
        };

        if (editingId) {
            const index = window.worktimes.findIndex(item => item.id === editingId);
            window.worktimes[index] = entry;
            editingId = null;
            worktimeForm.querySelector('button[type="submit"]').textContent = 'Add Worktime';
        } else {
            window.worktimes.push(entry);
        }

        localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
        
        // Refresh UI
        updateProjectList();
        const pf = document.getElementById('projectFilter');
        // Update Filter options
        if(pf) {
            pf.innerHTML = getProjectsFromLastTwoYears().map(p => `<option value="${p}">${p}</option>`).join('');
        }
        drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
        
        this.reset();
        // Reset Inputs
        projectSelect.style.display = 'block';
        projectSelect.value = '';
        projectInput.style.display = 'none';
    });
}

// Filter Buttons Helper
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
}

// --- Menu Functions ---
function createWorktimeMenu() {
    const menu = document.querySelector('.menu');
    menu.innerHTML = `
        <li><a href="#" id="exportWorktimeCsvBtn">Export CSV</a></li>
        <li><a href="#" id="exportWorktimeTextBtn">Export Text</a></li>
        <li><a href="#" id="exportWorktimeSystemBtn">Export for Worktime System</a></li>
        <li><a href="#" id="clearWorktimeBtn">Delete all worktime items</a></li>
        <li><a href="#" id="backupBtn">Backup App</a></li>
        <li><a href="#" id="restoreBtn">Restore</a></li>
        <li><input type="file" id="uploadWorktimeInput" style="display: none" /></li>
        <li>
            <a href="${wpAppData.login_url}">Login / Register</a> 
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

function exportWorktimeCsv() {
    const csvContent = window.worktimes.map(entry => {
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
    const textContent = window.worktimes.map(entry => {
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
        window.worktimes = [];
        localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
        const pf=document.getElementById('projectFilter');
        drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
    }
}

// Main Switcher
if(window.worktimeBtn) {
    window.worktimeBtn.addEventListener("click", function () {
         if (typeof window.refreshFromCloud === 'function') {
            window.refreshFromCloud();
        }
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
