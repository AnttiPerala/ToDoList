// Assuming that the same JSON structure for the to-do list is used for worktime entries, 
// let's add a new worktime functionality that allows users to switch to a worktime diary and record work sessions.

// Add HTML for worktime button and container in index.html
// Note: This part is ideally placed within the appropriate container in your index.html
/*
<button id="worktimeBtn" class="button-30">Worktime</button>
<div id="worktimeContainer" style="display: none;">
  <form id="worktimeForm">
    <input type="text" id="workDescription" placeholder="Enter work description" required />
    <input type="datetime-local" id="workStart" required />
    <input type="datetime-local" id="workEnd" required />
    <button type="submit" class="button-30">Add Worktime</button>
  </form>
  <ul id="worktimeList"></ul>
</div>
*/

// JavaScript code to handle the worktime tab functionality
const worktimeBtn = document.getElementById("btnWorktimeMode");
const diaryBtn =  document.getElementById("btnDiaryMode");
const worktimeContainer = document.getElementById("worktimeModeWrap");
const diaryContainer = document.getElementById("diaryModeWrap");
const todoContainer = document.getElementById("todoModeWrap"); // Assuming the to-do list container has this ID
const worktimeForm = document.getElementById("worktimeForm");
const worktimeList = document.getElementById("worktimeList");
const diaryForm = document.getElementById("diaryForm");
const diaryList = document.getElementById("diaryList");


const projects = getProjectsFromLastTwoYears();

// Event listener to toggle between To-Do list and Worktime diary
worktimeBtn.addEventListener("click", function () {
    worktimeBtn.classList.remove('inactive');
    todoBtn.classList.add('inactive');
    diaryBtn.classList.add('inactive');

    worktimeContainer.style.display = "block";
    diaryContainer.style.display = "none";
    todoContainer.style.display = "none";

    document.getElementById('mainTitle').textContent = 'Worktimes';
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
    
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    document.getElementById('workStart').value = localISOTime;
    
    createWorktimeMenu();
    initializeWorktime();
});

const filterContainer = document.createElement('div');    filterContainer.className = 'worktime-filters';
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

    
    worktimeList.parentNode.insertBefore(filterContainer, worktimeList);

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Update active button
            filterContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Filter and redraw worktimes
            drawWorktimes(e.target.dataset.period);
        }
    });
  function getProjectsFromLastTwoYears() {
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    
      const projects = ['All projects', ...new Set(worktimes
          .filter(entry => new Date(entry.start) >= twoYearsAgo)
          .map(entry => entry.project)
          .filter(Boolean))];
    
      console.log('Found projects:', projects);
      return projects;
  }
  function filterWorktimesByPeriod(period, selectedProject = 'All projects') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      return worktimes.filter(entry => {
          const entryDate = new Date(entry.start);
          const matchesPeriod = period === 'all' ? true : 
              period === 'thisMonth' ? (entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth) :
              period === 'lastMonth' ? (entryDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear) && 
                                      entryDate.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1)) :
              period === 'thisYear' ? (entryDate.getFullYear() === currentYear) :
              period === 'lastYear' ? (entryDate.getFullYear() === currentYear - 1) : true;

          const matchesProject = selectedProject === 'All projects' ? true : entry.project === selectedProject;
        
          return matchesPeriod && matchesProject;
      });
  }
  
// --- Sorting state for Worktime table ---
let worktimeSortKey = localStorage.getItem('worktimeSortKey') || 'date'; // 'date' | 'start' | 'duration' | 'description' | 'project' | 'end'
let worktimeSortDir = localStorage.getItem('worktimeSortDir') || 'desc'; // 'asc' | 'desc'

function setWorktimeSort(key) {
  if (worktimeSortKey === key) {
    worktimeSortDir = (worktimeSortDir === 'asc') ? 'desc' : 'asc';
  } else {
    worktimeSortKey = key;
    // sensible default direction per column
    worktimeSortDir = (key === 'description' || key === 'project') ? 'asc' : 'desc';
  }
  localStorage.setItem('worktimeSortKey', worktimeSortKey);
  localStorage.setItem('worktimeSortDir', worktimeSortDir);

  const filterContainer = document.querySelector('.worktime-filters');
  const period = filterContainer?.querySelector('button.active')?.dataset.period || 'all';
  const selectedProject = document.getElementById('projectFilter')?.value || 'All projects';
  drawWorktimes(period, selectedProject);
}

function worktimeHeaderLabel(label, key) {
  const arrow = (worktimeSortKey === key) ? (worktimeSortDir === 'asc' ? ' ▲' : ' ▼') : '';
  return `${label}${arrow}`;
}

function sortWorktimeItems(items) {
  const dir = worktimeSortDir === 'asc' ? 1 : -1;
  return items.sort((a, b) => {
    switch (worktimeSortKey) {
      case 'date':
      case 'start':
        return (a.startDate - b.startDate) * dir;
      case 'end':
        return (a.endDate - b.endDate) * dir;
      case 'duration':
        return (a.duration - b.duration) * dir;
      case 'description': {
        const A = (a.entry.description || '').toString().toLowerCase();
        const B = (b.entry.description || '').toString().toLowerCase();
        return A.localeCompare(B) * dir;
      }
      case 'project': {
        const A = (a.entry.project || '').toString().toLowerCase();
        const B = (b.entry.project || '').toString().toLowerCase();
        return A.localeCompare(B) * dir;
      }
      default:
        return (a.startDate - b.startDate) * dir;
    }
  });
}

function drawWorktimes(period = 'all', selectedProject = 'All projects') {
  const listEl = document.getElementById('worktimeList');
  const table = document.createElement('div');
  table.className = 'worktime-table';

  // Build headers with sort indicators
  table.innerHTML = `
    <div class="worktime-header" data-sort="date">${worktimeHeaderLabel('Date', 'date')}</div>
    <div class="worktime-header" data-sort="start">${worktimeHeaderLabel('Start Time', 'start')}</div>
    <div class="worktime-header" data-sort="duration">${worktimeHeaderLabel('Duration', 'duration')}</div>
    <div class="worktime-header" data-sort="description">${worktimeHeaderLabel('Description', 'description')}</div>
    <div class="worktime-header" data-sort="project">${worktimeHeaderLabel('Project', 'project')}</div>
    <div class="worktime-header" data-sort="end">${worktimeHeaderLabel('End Time', 'end')}</div>
    <div class="worktime-header">Edit</div>
    <div class="worktime-header">Delete</div>
  `;

  // Prepare data
  let totalMinutes = 0;
  const filtered = filterWorktimesByPeriod(period, selectedProject);

  const items = filtered.map(entry => {
    const startDate = new Date(entry.start);
    const endDate = new Date(entry.end);
    const duration = Math.round((endDate - startDate) / 60000) || 0;
    return { entry, startDate, endDate, duration };
  });

  // Apply sorting
  sortWorktimeItems(items);

  // Render rows
  items.forEach(({ entry, startDate, endDate, duration }) => {
    totalMinutes += duration;
    table.innerHTML += `
      <div class="worktime-cell">${startDate.toLocaleDateString('fi-FI')}</div>
      <div class="worktime-cell">${startDate.toLocaleTimeString('fi-FI', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
      <div class="worktime-cell">${duration} min ${duration > 59 ? `(${Math.floor(duration/60)}h${duration%60 === 0 ? '' : ` ${duration%60}min`})` : ''}</div>
      <div class="worktime-cell">${entry.description || ''}</div>
      <div class="worktime-cell">${entry.project || 'No project'}</div>
      <div class="worktime-cell">${endDate.toLocaleTimeString('fi-FI', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
      <div class="worktime-cell">
        <button onclick="editWorktime(${entry.id})" class="btn-edit">Edit</button>
      </div>
      <div class="worktime-cell">
        <button onclick="deleteWorktime(${entry.id})" class="btn-delete">Delete</button>
      </div>
    `;
  });

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  try { const top=document.getElementById('worktimeTotalsTop'); if(top){ top.innerHTML = `<span>Total:</span> <span>${totalMinutes} min</span> <span class=\"muted\">(${hours}h${remainingMinutes? ' ' + remainingMinutes + 'min' : ''})</span>`; } } catch(e) {}

  table.innerHTML += `
    <div class="worktime-cell total">Total:</div>
    <div class="worktime-cell total"></div>
    <div class="worktime-cell total">${totalMinutes} min ${totalMinutes > 59 ? `(${hours}h${remainingMinutes === 0 ? '' : ` ${remainingMinutes}min`})` : ''}</div>
    <div class="worktime-cell total"></div>
    <div class="worktime-cell total"></div>
    <div class="worktime-cell total"></div>
    <div class="worktime-cell total"></div>
    <div class="worktime-cell total"></div>
  `;

  listEl.innerHTML = '';
  listEl.appendChild(table);

  // Attach click handlers for sorting
  table.querySelectorAll('.worktime-header[data-sort]').forEach(h => {
    h.style.cursor = 'pointer';
    h.addEventListener('click', () => {
      setWorktimeSort(h.getAttribute('data-sort'));
    });
  });
}
    function addWorktimeFilterButtons() {
      if (document.querySelector('.worktime-filters')) {
          return;
      }

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

// Insert before the list
const listEl = document.getElementById('worktimeList');
if (listEl && listEl.parentNode) {
  listEl.parentNode.insertBefore(filterContainer, listEl);
}

// Default to "This Month" on load for this toolbar
(function(){
    const btnAll = filterContainer.querySelector('[data-period="all"]');
    const btnThis = filterContainer.querySelector('[data-period="thisMonth"]');
    if (btnAll) btnAll.classList.remove('active');
    if (btnThis) btnThis.classList.add('active');
    const pf = document.getElementById('projectFilter');
    drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
})();

// Wire clicks
filterContainer.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        filterContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        drawWorktimes(e.target.dataset.period, document.getElementById('projectFilter')?.value || 'All projects');
    }
});

// Wire project selector
const pfSel = filterContainer.querySelector('#projectFilter');
if (pfSel) {
  pfSel.addEventListener('change', (e) => {
      const activePeriod = filterContainer.querySelector('button.active')?.dataset.period || 'thisMonth';
      drawWorktimes(activePeriod, e.target.value);
  });
}

// Rest of the function remains the same

  }
    worktimeList.parentNode.insertBefore(filterContainer, worktimeList);

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            filterContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            drawWorktimes(e.target.dataset.period, document.getElementById('projectFilter').value);
        }
    });

    document.getElementById('projectFilter').addEventListener('change', (e) => {
        const activePeriod = filterContainer.querySelector('button.active').dataset.period;
        drawWorktimes(activePeriod, e.target.value);
    });

  // Call this when initializing the worktime view

/* WT_HELPERS_MIN */
(function(){
  function wt_setDurationHint(mins){
    var el = document.getElementById('durationHelper');
    if (!el) return;
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
    if (d && !d.__wt_wired){ d.__wt_wired = true; d.addEventListener('input', function(){ if (this.value) wt_recomputeEndFromStartAndDuration(); else wt_setDurationHint(''); }); }
    if (e && !e.__wt_wired){ e.__wt_wired = true; e.addEventListener('input', function(){ if (this.value) wt_recomputeFromStartEnd(); else wt_setDurationHint(''); }); }
    if (s && !s.__wt_wired){ s.__wt_wired = true; s.addEventListener('input', function(){ var dEl=document.getElementById('workDuration'); var eEl=document.getElementById('workEnd'); if (dEl && dEl.value) wt_recomputeEndFromStartAndDuration(); else if (eEl && eEl.value) wt_recomputeFromStartEnd(); else wt_setDurationHint(''); }); }
    if (d && d.value) wt_setDurationHint(d.value);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wt_wireDuration, {once:true}); else wt_wireDuration();
  window.__wt_setDurationHint = wt_setDurationHint;
  window.__wt_wireDuration = wt_wireDuration;
})();
function initializeWorktime() {
    addWorktimeFilterButtons();
    (function(){ const pf=document.getElementById('projectFilter'); drawWorktimes('thisMonth', pf ? pf.value : 'All projects'); })();
}
// Add event listeners for the worktime form inputs
const workDuration = document.getElementById('workDuration');
const workEnd = document.getElementById('workEnd');
const workStart = document.getElementById('workStart');

workDuration.addEventListener('input', function() {
    if (this.value) {
        const startDate = new Date(workStart.value);
        const endDate = new Date(startDate.getTime() + this.value * 60000);
        const offset = endDate.getTimezoneOffset() * 60000;
        workEnd.value = (new Date(endDate - offset)).toISOString().slice(0, 16);
    } else {
        workEnd.value = '';
    }
});

workEnd.addEventListener('input', function() {
    if (this.value) {
        const startDate = new Date(workStart.value);
        const endDate = new Date(this.value);
        const durationMinutes = Math.round((endDate - startDate) / 60000);
        workDuration.value = durationMinutes;
    } else {
        workDuration.value = '';
    }
    const duration = durationMinutes;
    const durationDisplay = `<div class="worktime-cell">
    ${duration} min 
    ${duration > 59 ? `(${Math.floor(duration / 60)}h${duration % 60 === 0 ? '' : ` ${duration % 60 > 0 ? `${duration % 60}min` : ''}`})` : ''}
  </div>`;
      document.querySelector('.worktime-cell').innerHTML = durationDisplay;    }
);
// Function to get unique project names from current year
function getProjectNames() {
    const currentYear = new Date().getFullYear();
    return [...new Set(worktimes
        .filter(entry => new Date(entry.start).getFullYear() === currentYear)
        .map(entry => entry.project)
        .filter(Boolean))];
}
// Function to update project datalist
function updateProjectList() {
    const existingContainer = document.querySelector('.project-input-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    const container = document.createElement('div');
    container.className = 'project-input-container';
    
    const select = document.createElement('select');
    select.id = 'projectSelect';
    select.className = 'button-30';
    
    const projects = getProjectsFromLastTwoYears().filter(p => p !== 'All projects');
    
    select.innerHTML = `
        <option value="">Select Project</option>
        ${projects.map(project => `<option value="${project}">${project}</option>`).join('')}
        <option value="custom">+ Add New Project</option>
    `;
    
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
    workDescription.parentNode.insertBefore(container, workDescription.nextSibling);

    // Remove any existing datalist
    const existingDatalist = document.getElementById('projectList');
    if (existingDatalist) {
        existingDatalist.remove();
    }
}
let editingId = null;
function editWorktime(id) {
    const entry = worktimes.find(item => item.id === id);
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
        
        const submitButton = worktimeForm.querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Worktime';
        
        editingId = id;
    }
}
// Modify the form submit handler to handle both new entries and updates
worktimeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const description = document.getElementById('workDescription').value;
    const projectInput = document.getElementById('projectInput');
    const projectSelect = document.getElementById('projectSelect');
    const project = projectInput.value || projectSelect.value;
    const start = new Date(document.getElementById('workStart').value);
    let end;

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
        const index = worktimes.findIndex(item => item.id === editingId);
        worktimes[index] = entry;
        editingId = null;
        worktimeForm.querySelector('button[type="submit"]').textContent = 'Add Worktime';
    } else {
        worktimes.push(entry);
    }

    localStorage.setItem('worktimes', JSON.stringify(worktimes));
    
    // Force refresh of all project-related UI elements
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
        projectFilter.innerHTML = getProjectsFromLastTwoYears()
            .map(p => `<option value="${p}">${p}</option>`)
            .join('');
    }
(function(){
  const pf=document.getElementById('projectFilter');
  drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
})();
    updateProjectList();
    
    this.reset();
    workEnd.disabled = false;
    workDuration.disabled = false;
    
    // Reset project select visibility
    projectSelect.style.display = 'block';
    projectSelect.value = '';
    projectInput.style.display = 'none';
});

// Initialize project list when page loads
updateProjectList();
// Function to delete a worktime entry
function deleteWorktime(index) {
  worktimes.splice(index, 1);
  localStorage.setItem("worktimes", JSON.stringify(worktimes));
(function(){
  const pf=document.getElementById('projectFilter');
  drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
})();
}

// Utility function to format date-time for display (reusing the function from todo.js)
function formatDateTimeForDisplay(isoString) {
  if (!isoString) return "";
  const dateObj = new Date(isoString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return dateObj.toLocaleString(undefined, options);
}

// Initial draw of worktime entries when page loads
(function(){
  const pf=document.getElementById('projectFilter');
  drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
})();
function createWorktimeMenu() {
    const menu = document.querySelector('.menu');
    const menuItems = [
        { id: 'exportWorktimeCsvBtn', text: 'Export CSV' },
        { id: 'exportWorktimeTextBtn', text: 'Export Text' },
        { id: 'clearWorktimeBtn', text: 'Delete all worktime items' },
        { id: 'backupBtn', text: 'Backup App' },
        { id: 'restoreBtn', text: 'Restore' },
        { id: 'loginBtn', text: 'Login', note: '(In development. Only needed for syncing across devices)' }
    ];

    menu.innerHTML = menuItems.map(item => `
        <li>
            <span class="checkmark">✔</span>
            <a href="#" id="${item.id}">${item.text}</a>
            ${item.note ? `<span class="note"> ${item.note}</span>` : ''}
        </li>
    `).join('');

    // Add file input for restore functionality
    const fileInput = document.createElement('li');
    fileInput.innerHTML = '<input type="file" id="uploadWorktimeInput" style="display: none" />';
    menu.appendChild(fileInput);

    attachWorktimeMenuListeners();
}

function attachWorktimeMenuListeners() {
    document.getElementById('exportWorktimeCsvBtn').addEventListener('click', exportWorktimeCsv);
    document.getElementById('exportWorktimeTextBtn').addEventListener('click', exportWorktimeText);
    document.getElementById('clearWorktimeBtn').addEventListener('click', clearWorktimeData);
    document.getElementById('backupBtn').addEventListener('click', handleBackup);
    document.getElementById('restoreBtn').addEventListener('click', handleRestore);
    //document.getElementById('loginBtn').addEventListener('click', login);
}

function backupWorktime() {
    const data = JSON.stringify(worktimes);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worktime_backup.json';
    a.click();
}

function restoreWorktime() {
    document.getElementById('uploadWorktimeInput').click();
}

function loginWorktime() {
    alert('Login functionality coming soon!');
}
function exportWorktimeCsv() {
    const csvContent = worktimes.map(entry => {
        const start = new Date(entry.start);
        const end = new Date(entry.end);
        const duration = Math.round((end - start) / 60000);
        return `${start.toLocaleDateString()},${start.toLocaleTimeString()},${duration},${entry.description},${entry.project},${end.toLocaleTimeString()}`;
    }).join('\n');

    const header = 'Date,Start Time,Duration (min),Description,Project,End Time\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worktime_export.csv';
    a.click();
}

function exportWorktimeText() {
    const textContent = worktimes.map(entry => {
        const start = new Date(entry.start);
        const end = new Date(entry.end);
        const duration = Math.round((end - start) / 60000);
        return `Date: ${start.toLocaleDateString()}\nStart: ${start.toLocaleTimeString()}\nDuration: ${duration} min\nDescription: ${entry.description}\nProject: ${entry.project}\nEnd: ${end.toLocaleTimeString()}\n---------------`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worktime_export.txt';
    a.click();
}

function clearWorktimeData() {
    if (confirm('Are you sure you want to delete all worktime entries?')) {
        worktimes = [];
        localStorage.setItem('worktimes', JSON.stringify(worktimes));
(function(){
  const pf=document.getElementById('projectFilter');
  drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
})();
    }
}



const now = new Date();
const offset = now.getTimezoneOffset() * 60000;
const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
document.getElementById('workStart').value = localISOTime;


// -- Project totals modal (2s auto-fade) --
function wt_minutesForProjectThisMonth(project){
  try {
    if (!Array.isArray(worktimes)) return 0;
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
    return worktimes
      .filter(w => (w.project || 'No project') === project)
      .filter(w => { const d = new Date(w.start); return d.getFullYear() === y && d.getMonth() === m; })
      .reduce((acc, w) => acc + Math.max(0, Math.round((new Date(w.end) - new Date(w.start)) / 60000)), 0);
  } catch(_) { return 0; }
}
function wt_hm(mins){ const mm=Math.max(0,Math.round(mins||0)); const h=Math.floor(mm/60), r=mm%60; return (h+'h' + (r? ' '+r+'min':'')); }
function wt_showProjectThisMonthModal(project){
  const el = document.getElementById('worktimeProjectTotalsModal');
  if (!el) return;
  project = (project || 'No project'); if (typeof project === 'string') project = project.trim() || 'No project';
  const minutes = wt_minutesForProjectThisMonth(project);
  el.textContent = `${wt_hm(minutes)} this month · ${project}`;
  el.style.opacity = '1';
  el.style.pointerEvents = 'auto';
  el.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden', 'true');
  }, 2000);
}
