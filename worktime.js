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
    <button class="button-30 active" data-period="all">All times</button>
    <button class="button-30" data-period="thisMonth">This Month</button>
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
    
      return ['All projects', ...new Set(worktimes
          .filter(entry => new Date(entry.start) >= twoYearsAgo)
          .map(entry => entry.project)
          .filter(Boolean))];
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
  function drawWorktimes(period = 'all', selectedProject = 'All projects') {
      const worktimeList = document.getElementById('worktimeList');
      const table = document.createElement('div');
      table.className = 'worktime-table';
  
      table.innerHTML = `
          <div class="worktime-header">Date</div>
          <div class="worktime-header">Start Time</div>
          <div class="worktime-header">Duration</div>
          <div class="worktime-header">Description</div>
          <div class="worktime-header">Project</div>
          <div class="worktime-header">End Time</div>
          <div class="worktime-header">Edit</div>
          <div class="worktime-header">Delete</div>
      `;

      let totalMinutes = 0;
      const filteredWorktimes = filterWorktimesByPeriod(period, selectedProject);

      filteredWorktimes.forEach(entry => {
          const startDate = new Date(entry.start);
          const endDate = new Date(entry.end);
          const duration = Math.round((endDate - startDate) / 60000);
          totalMinutes += duration;

          table.innerHTML += `
              <div class="worktime-cell">${startDate.toLocaleDateString()}</div>
              <div class="worktime-cell">${startDate.toLocaleTimeString()}</div>
              <div class="worktime-cell">${duration} min</div>
              <div class="worktime-cell">${entry.description}</div>
              <div class="worktime-cell">${entry.project || 'No project'}</div>
              <div class="worktime-cell">${endDate.toLocaleTimeString()}</div>
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
  
      table.innerHTML += `
          <div class="worktime-cell total">Total:</div>
          <div class="worktime-cell total"></div>
          <div class="worktime-cell total">${totalMinutes} min (${hours}h ${remainingMinutes}min)</div>
          <div class="worktime-cell total"></div>
          <div class="worktime-cell total"></div>
          <div class="worktime-cell total"></div>
          <div class="worktime-cell total"></div>
          <div class="worktime-cell total"></div>
      `;

      worktimeList.innerHTML = '';
      worktimeList.appendChild(table);
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
          <button class="button-30 active" data-period="all">All times</button>
          <button class="button-30" data-period="thisMonth">This Month</button>
          <button class="button-30" data-period="lastMonth">Last Month</button>
          <button class="button-30" data-period="thisYear">This Year</button>
          <button class="button-30" data-period="lastYear">Last Year</button>
      `;

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
function initializeWorktime() {
    addWorktimeFilterButtons();
    drawWorktimes();
}
// Add event listeners for the worktime form inputs
const workDuration = document.getElementById('workDuration');
const workEnd = document.getElementById('workEnd');

workDuration.addEventListener('input', function() {
  if (this.value) {
      workEnd.value = '';
      workEnd.disabled = true;
  } else {
      workEnd.disabled = false;
  }
});

workEnd.addEventListener('input', function() {
  if (this.value) {
      workDuration.value = '';
      workDuration.disabled = true;
  } else {
      workDuration.disabled = false;
  }
});
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
    const projectInput = document.getElementById('projectInput');
    const projects = getProjectNames();
    
    // Convert input to select if it isn't already
    if (projectInput.tagName !== 'SELECT') {
        const select = document.createElement('select');
        select.id = 'projectInput';
        select.className = projectInput.className;
        projectInput.parentNode.replaceChild(select, projectInput);
    }
    
    // Add empty option as default
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Project';
    projectInput.innerHTML = '';
    projectInput.appendChild(defaultOption);
    
    // Add all project options
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectInput.appendChild(option);
    });
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
    const project = document.getElementById('projectInput').value;
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
        // Update existing entry
        const index = worktimes.findIndex(item => item.id === editingId);
        worktimes[index] = entry;
        editingId = null;
        worktimeForm.querySelector('button[type="submit"]').textContent = 'Add Worktime';
    } else {
        // Add new entry
        worktimes.push(entry);
    }

    localStorage.setItem('worktimes', JSON.stringify(worktimes));
    drawWorktimes();
    this.reset();
    workEnd.disabled = false;
    workDuration.disabled = false;
    updateProjectList();
});

// Initialize project list when page loads
updateProjectList();
// Function to delete a worktime entry
function deleteWorktime(index) {
  worktimes.splice(index, 1);
  localStorage.setItem("worktimes", JSON.stringify(worktimes));
  drawWorktimes();
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
drawWorktimes();





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
        drawWorktimes();
    }
}



const now = new Date();
const offset = now.getTimezoneOffset() * 60000;
const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
document.getElementById('workStart').value = localISOTime;
