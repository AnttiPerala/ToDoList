var worktimeSortKey, worktimeSortDir;
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
const durationHelper = document.getElementById('durationHelper');
const worktimeTotalsTop = document.getElementById('worktimeTotalsTop');
const diaryForm = document.getElementById("diaryForm");


function setDurationHint(mins) {
  if (!durationHelper) return;
  const m = parseInt(mins, 10);
  if (!Number.isFinite(m) || m <= 0) { durationHelper.textContent = ''; return; }
  const h = Math.floor(m / 60), r = m % 60;
  durationHelper.textContent = `= ${h > 0 ? `${h}h` : ''}${h > 0 && r > 0 ? ' ' : ''}${r > 0 ? `${r}min` : ''}`;
}

function recomputeFromStartEnd() {
  const workStart = document.getElementById('workStart');
  const workEnd = document.getElementById('workEnd');
  const workDuration = document.getElementById('workDuration');
  if (!workStart.value || !workEnd.value) { setDurationHint(''); return; }
  const startDate = new Date(workStart.value);
  const endDate = new Date(workEnd.value);
  const mins = Math.max(0, Math.round((endDate - startDate) / 60000));
  workDuration.value = mins || '';
  setDurationHint(mins);
}

function recomputeEndFromStartAndDuration() {
  const workStart = document.getElementById('workStart');
  const workEnd = document.getElementById('workEnd');
  const workDuration = document.getElementById('workDuration');
  if (!workStart.value || !workDuration.value) { setDurationHint(''); return; }
  const startDate = new Date(workStart.value);
  const endDate = new Date(startDate.getTime() + parseInt(workDuration.value, 10) * 60000);
  const offset = endDate.getTimezoneOffset() * 60000;
  workEnd.value = (new Date(endDate - offset)).toISOString().slice(0, 16);
  setDurationHint(parseInt(workDuration.value, 10));
}
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
});const filterContainer = document.createElement('div');    filterContainer.className = 'worktime-filters';
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
    const storedProject = localStorage.getItem('worktimeSelectedProject');
    const projectFilterEl = filterContainer.querySelector('#projectFilter');
    if (storedProject && [...projectFilterEl.options].some(o => o.value === storedProject)) {
      projectFilterEl.value = storedProject;
    }
worktimeList.parentNode.insertBefore(filterContainer, worktimeList);
    const initProject = filterContainer.querySelector('#projectFilter').value;
    drawWorktimes('thisMonth', initProject);

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Update active button
            filterContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Filter and redraw worktimes
            drawWorktimes(e.target.dataset.period, document.getElementById('projectFilter').value);
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
worktimeSortKey = localStorage.getItem('worktimeSortKey') || 'date'; // 'date' | 'start' | 'duration' | 'description' | 'project' | 'end'
worktimeSortDir = localStorage.getItem('worktimeSortDir') || 'desc'; // 'asc' | 'desc'

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
  if (worktimeTotalsTop) { worktimeTotalsTop.innerHTML = `<span>Total:</span> <span>${totalMinutes} min</span> <span class=\"muted\">(${Math.floor(totalMinutes/60)}h${remainingMinutes === 0 ? '' : ' ' + remainingMinutes + 'min'})</span>`; }

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

      // Rest of the function remains the same
  }
    worktimeList.parentNode.insertBefore(filterContainer, worktimeList);
    drawWorktimes('thisMonth', filterContainer.querySelector('#projectFilter').value);

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            filterContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            drawWorktimes(e.target.dataset.period, document.getElementById('projectFilter').value);
        }
    });

    document.getElementById('projectFilter').addEventListener('change', (e) => {
      localStorage.setItem('worktimeSelectedProject', e.target.value);
      const activePeriod = filterContainer.querySelector('button.active').dataset.period;
      drawWorktimes(activePeriod, e.target.value);
    });

  // Call this when initializing the worktime view
function initializeWorktime() {
    addWorktimeFilterButtons();
    const fc = document.querySelector('.worktime-filters');
    const period = fc ? (fc.querySelector('button.active')?.dataset.period || 'thisMonth') : 'thisMonth';
    const project = document.getElementById('projectFilter')?.value || 'All projects';
    drawWorktimes(period, project);
}
// Add event listeners for the worktime form inputs
const workDuration = document.getElementById('workDuration');
const workEnd = document.getElementById('workEnd');
const workStart = document.getElementById('workStart');

workDuration.addEventListener('input', function () {
  if (this.value) {
    recomputeEndFromStartAndDuration();
  } else {
    document.getElementById('workEnd').value = '';
    setDurationHint('');
  }
});

workEnd.addEventListener('input', function () {
});
workStart.addEventListener('input', function () {
  const workDuration = document.getElementById('workDuration');
  const workEnd = document.getElementById('workEnd');
  if (workDuration.value) {
    recomputeEndFromStartAndDuration();
  } else if (workEnd.value) {
    recomputeFromStartEnd();
  } else {
    setDurationHint('');
  }
});

workEnd.addEventListener('input', function () {
  if (this.value) {
    recomputeFromStartEnd();
  } else {
    document.getElementById('workDuration').value = '';
    setDurationHint('');
  }
});

    // Safe project input handler (guarded to avoid undefined refs)
    (function(){
      const customInput = document.getElementById('projectInput');
      const select = document.getElementById('projectFilter');
      if (!customInput || !select) return;
      customInput.addEventListener('blur', () => {
        if (customInput.value.trim() === '') {
          select.value = '';
          select.style.display = 'block';
          customInput.style.display = 'none';
        }
      });
    })();

    // Populate the datalist with projects
    (function(){
      const dl = document.getElementById('projectList');
      if (!dl) return;
      const opts = getProjectsFromLastTwoYears().map(p => `<option value="${p}"></option>`).join('');
      dl.innerHTML = opts;
    })();
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
    
    drawWorktimes((document.querySelector('.worktime-filters button.active')||{}).dataset?.period || 'thisMonth', document.getElementById('projectFilter')?.value || 'All projects');
    updateProjectList();
    
    this.reset();
    workEnd.disabled = false;
    workDuration.disabled = false;
    
    // Keep project input visible (no auto-hiding)
    if (projectSelect) {
      projectSelect.style.display = 'none';
      projectSelect.value = '';
    }
    const projectInputEl = document.getElementById('projectInput');
    if (projectInputEl) {
      projectInputEl.style.display = 'block';
    }
});

// Initialize project list when page loads
updateProjectList();
// Function to delete a worktime entry
function deleteWorktime(index) {
  worktimes.splice(index, 1);
  localStorage.setItem("worktimes", JSON.stringify(worktimes));
  drawWorktimes((document.querySelector('.worktime-filters button.active')||{}).dataset?.period || 'thisMonth', document.getElementById('projectFilter')?.value || 'All projects');
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


// Refresh the project datalist based on existing entries
function updateProjectList() {
  try {
    const listId = 'projectList';
    const inputEl = document.getElementById('projectInput');
    const datalist = document.getElementById(listId) || (function(){
      const dl = document.createElement('datalist');
      dl.id = listId;
      document.body.appendChild(dl);
      return dl;
    })();

    const projects = (typeof getProjectsFromLastTwoYears === 'function')
      ? getProjectsFromLastTwoYears()
      : Array.from(new Set((worktimes || []).map(e => (e.project || 'No project'))));

    datalist.innerHTML = projects.map(p => `<option value="${p}"></option>`).join('');

    // Ensure the input is wired to the datalist
    if (inputEl && inputEl.getAttribute('list') !== listId) {
      inputEl.setAttribute('list', listId);
    }
  } catch (e) {
    console.warn('updateProjectList() failed:', e);
  }
}

// Initial draw of worktime entries when page loads
drawWorktimes((document.querySelector('.worktime-filters button.active')||{}).dataset?.period || 'thisMonth', document.getElementById('projectFilter')?.value || 'All projects');





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
        drawWorktimes((document.querySelector('.worktime-filters button.active')||{}).dataset?.period || 'thisMonth', document.getElementById('projectFilter')?.value || 'All projects');
    }
}



const now = new Date();
const offset = now.getTimezoneOffset() * 60000;
const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
document.getElementById('workStart').value = localISOTime;



// ---- Project totals helpers & modal ----
function minutesToHM(mins) {
  const m = Math.max(0, Math.round(mins||0));
  const h = Math.floor(m/60), r = m%60;
  return {h, r, label: `${h}h${r? ' ' + r + 'min' : ''}`};
}

function totalMinutesForProject(project) {
  return (worktimes || []).filter(e => (e.project || 'No project') === project)
    .reduce((acc, e) => acc + Math.max(0, Math.round((new Date(e.end) - new Date(e.start))/60000)), 0);
}

function totalMinutesForProjectThisMonth(project) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  return (worktimes || []).filter(e => (e.project || 'No project') === project)
    .filter(e => { const d = new Date(e.start); return d.getFullYear()===y && d.getMonth()===m; })
    .reduce((acc, e) => acc + Math.max(0, Math.round((new Date(e.end) - new Date(e.start))/60000)), 0);
}

function showWorktimeProjectTotalsModal(project) {
  const modal = document.getElementById('worktimeProjectTotalsModal');
  const body = document.getElementById('wptBody');
  const title = document.getElementById('wptTitle');
  const closeBtn = document.getElementById('wptCloseBtn');
  const okBtn = document.getElementById('wptOkBtn');
  if (!modal || !body) return;

  const totalAll = minutesToHM(totalMinutesForProject(project));
  const totalMonth = minutesToHM(totalMinutesForProjectThisMonth(project));

  title.textContent = `Project totals — ${project || 'No project'}`;
  body.innerHTML = `
    <div class="big">${totalAll.label} total on this project</div>
    <div class="muted" style="margin-top:6px;">This month: ${totalMonth.label}</div>
  `;

  function close() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('fade-out');
    closeBtn?.removeEventListener('click', close);
    okBtn?.removeEventListener('click', close);
    modal.removeEventListener('click', onBackdrop);
  }
  function onBackdrop(e) {
    if (e.target === modal || e.target.classList.contains('modal-backdrop')) close();
  }

  closeBtn?.addEventListener('click', close);
  okBtn?.addEventListener('click', close);
  modal.addEventListener('click', onBackdrop);

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  // Auto fade out after 2 seconds
  setTimeout(() => {
    modal.classList.add('fade-out');
    setTimeout(() => {
      modal.classList.remove('fade-out');
      if (!modal.classList.contains('hidden')) {
        try { close(); } catch(e) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }
      }
    }, 350);
  }, 2000);
}