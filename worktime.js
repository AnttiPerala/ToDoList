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

// Worktime entries array
let worktimes = JSON.parse(localStorage.getItem("worktimes")) || [];

// Event listener to toggle between To-Do list and Worktime diary
worktimeBtn.addEventListener("click", function () {
    worktimeBtn.classList.remove('inactive');
    todoBtn.classList.add('inactive');
    diaryBtn.classList.add('inactive');

    worktimeContainer.style.display = "block";
    diaryContainer.style.display = "none";
    todoContainer.style.display = "none";

    createWorktimeMenu();
});


// Function to draw worktime entries
function drawWorktimes() {
    const worktimeList = document.getElementById('worktimeList');
    const table = document.createElement('div');
    table.className = 'worktime-table';
    
    // Add headers including new columns
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

    worktimes.forEach(entry => {
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        const duration = Math.round((endDate - startDate) / 60000);

        // Add cells including action buttons
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

    worktimeList.innerHTML = '';
    worktimeList.appendChild(table);
}// Add event listeners for the worktime form inputs
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
    const projectList = document.getElementById('projectList');
    projectList.innerHTML = '';
    const projects = getProjectNames();
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        projectList.appendChild(option);
    });
}

let editingId = null;

function editWorktime(id) {
    const entry = worktimes.find(item => item.id === id);
    if (entry) {
        // Fill form with entry data
        document.getElementById('workDescription').value = entry.description;
        document.getElementById('projectInput').value = entry.project || '';
        document.getElementById('workStart').value = new Date(entry.start).toISOString().slice(0, 16);
        document.getElementById('workEnd').value = new Date(entry.end).toISOString().slice(0, 16);
        
        // Clear duration field since we're showing end time
        document.getElementById('workDuration').value = '';
        
        // Change submit button text
        const submitButton = worktimeForm.querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Worktime';
        
        // Store editing id
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
        { id: 'clearWorktimeBtn', text: 'Delete all worktime items' }
    ];

    menu.innerHTML = menuItems.map(item => `
        <li>
            <span class="checkmark">✔</span>
            <a href="#" id="${item.id}">${item.text}</a>
        </li>
    `).join('');

    attachWorktimeMenuListeners();
}

function attachWorktimeMenuListeners() {
    document.getElementById('exportWorktimeCsvBtn').addEventListener('click', exportWorktimeCsv);
    document.getElementById('exportWorktimeTextBtn').addEventListener('click', exportWorktimeText);
    document.getElementById('clearWorktimeBtn').addEventListener('click', clearWorktimeData);
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
