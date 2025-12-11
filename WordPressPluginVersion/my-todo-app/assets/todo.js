// --- Todo Logic ---
// We use window.todos etc defined in generic.js

function rgbToHex(rgbStr) {
    if(typeof rgbStr !== 'string') return "#FFFFFF";
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgbStr);
    return result ? "#" + (1 << 24 | result[1] << 16 | result[2] << 8 | result[3]).toString(16).slice(1).toUpperCase() : rgbStr;
}

window.filteredTodos = window.todos;

function updateLocalStorage() { 
    localStorage.setItem('todos', JSON.stringify(window.todos)); 
}

let bgColors = ["#F0F8FF", "#F0FFF0", "#FFF5EE", "#F5F5F5", "#FFFACD", "#FFDAB9", "#FFE4E1", "#FFF0F5", "#FAF0E6", "#FDF5E6"];
let selectedColor;
let notificationToggle = document.getElementById('notificationToggle');

const form = document.getElementById('todoForm');
const input = document.getElementById('todoInput');
const list = document.getElementById('todoList');
const clearButton = document.querySelector('.clear-input');

// Event Listeners
if (input) {
    input.addEventListener('input', () => {
        // Original: show/hide clear button
        if (clearButton) {
            clearButton.style.display = input.value ? 'block' : 'none';
        }

        // NEW: live filter current list by text, respecting category filter
        const filterValue = input.value.toLowerCase();
        const listItems = document.querySelectorAll('#todoList .listItem');

        listItems.forEach(item => {
            const textEl = item.querySelector('.toDoText');
            const itemText = textEl ? textEl.textContent.toLowerCase() : '';

            if (!filterValue || itemText.includes(filterValue)) {
                item.style.display = '';   // reset to default (grid from CSS)
            } else {
                item.style.display = 'none';
            }
        });
    });
}

if(clearButton) clearButton.addEventListener('click', () => { 
    input.value = ''; 
    clearButton.style.display = 'none'; 
    input.focus(); 
    // Reset filter completely (category filter still applied in drawTodos)
    drawTodos(); 
});

if(form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const trimmedInput = input.value.trim();
    if (!trimmedInput) { alert("Please enter a task!"); return; }

    const topPriorityCheck = document.getElementById('topPriorityCheck');
    const midPriorityCheck = document.getElementById('midPriorityCheck');
    const deadlineInput = document.getElementById('deadlineInput');
    const categoryValue = document.getElementById('categorySelect').value;
    const detailsTextarea = document.querySelector('.detailsTextarea');

    let maxVotes = window.todos.length ? Math.max(...window.todos.map(t => t.votes)) : 0;
    let sumVotes = window.todos.reduce((acc, t) => acc + t.votes, 0);
    let averageVotes = window.todos.length ? Math.round(sumVotes / window.todos.length) : 1; 

    let newTodo = {
        id: Date.now(),
        text: trimmedInput,
        votes: topPriorityCheck.checked ? maxVotes + 1 : midPriorityCheck.checked ? averageVotes : 0,
        deadline: deadlineInput.value ? new Date(deadlineInput.value) : null,
        done: false,
        bgColor: selectedColor,
        details: detailsTextarea ? detailsTextarea.value : null,
        category: categoryValue,
        timeAdded: new Date().toISOString(),
        timeDone: ""
    }

    window.todos.push(newTodo);
    updateLocalStorage();
    if(typeof applyPreferredSorting === 'function') applyPreferredSorting();

    input.value = '';
    deadlineInput.value = '';
    topPriorityCheck.checked = false;
    midPriorityCheck.checked = false;

    drawTodos();
    if(document.getElementById('detailsContainer')) document.getElementById('detailsContainer').innerHTML = '';

    // Animation
    let wavebutton = document.querySelector('.submitTodo');
    if(wavebutton) {
        let wave = document.createElement('div');
        wave.classList.add('wave', 'animate');
        wavebutton.textContent = 'Added!';
        wavebutton.appendChild(wave);
        wave.addEventListener('animationend', function() { wave.remove(); wavebutton.textContent = 'Add'; });
    }
});

function showToast(message) {
    const toast = document.getElementById("toast");
    if(!toast) return;
    toast.innerHTML = message;
    toast.className = "toast show";
    setTimeout(function() { toast.className = toast.className.replace("show", ""); }, 3000);
}

// MAIN DRAW FUNCTION
window.drawTodos = function() {
    let list = document.querySelector('#todoList');
    if(!list) return;
    list.innerHTML = '';

    let categoryDrodown = document.getElementById('categorySelect');
    filterTodosByCategory(categoryDrodown ? categoryDrodown.value : 'none');
    
    window.filteredTodos.forEach(todo => {
        let listItem = document.createElement('li');
        let timeAddedValue = (todo.timeAdded && todo.timeAdded !== 'unknown') ? new Date(todo.timeAdded).toISOString().split('.')[0] : todo.id;
        
        listItem.setAttribute('data-timeAdded', timeAddedValue);
        if (todo.timeDone) listItem.setAttribute('data-timeDone', new Date(todo.timeDone).toLocaleString());
        listItem.id = todo.id;
        if (todo.details) listItem.setAttribute('data-details', todo.details);

        let todoText = document.createElement('span');
        todoText.classList.add("toDoText");
        todoText.textContent = todo.text;

        let voteDisplay = document.createElement('span');
        voteDisplay.classList.add('votes');
        voteDisplay.textContent = `Votes: ${todo.votes}`;
        voteDisplay.dataset.id = todo.id;
        voteDisplay.addEventListener('dblclick', function() { editVotes(todo.id); });

        let infoBtn = document.createElement('button');
        infoBtn.classList.add("info-button");
        infoBtn.innerHTML = '<span>i</span>';
        infoBtn.addEventListener('click', (e) => {
            resetModal();
            let listItem = e.target.closest('li'); 
            let details = listItem.getAttribute('data-details');
            showDetails(todo.id, generateDetailsHTML(todo, details));
        });

        let upvoteBtn = document.createElement('button'); 
        upvoteBtn.classList.add("button-30"); 
        upvoteBtn.textContent = 'Upvote'; 
        upvoteBtn.addEventListener('click', () => upvote(todo.id));

        let downvoteBtn = document.createElement('button'); 
        downvoteBtn.classList.add("button-30"); 
        downvoteBtn.textContent = 'Downvote'; 
        downvoteBtn.addEventListener('click', () => downvote(todo.id));

        let doneBtn = document.createElement('button'); 
        doneBtn.classList.add("button-30"); 
        doneBtn.textContent = 'Done'; 
        doneBtn.addEventListener('click', () => doneTodo(todo.id));

        let deleteBtn = document.createElement('button'); 
        deleteBtn.classList.add("button-30"); 
        deleteBtn.textContent = 'Delete'; 
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        let deadlineDisplay = document.createElement('span');
        deadlineDisplay.classList.add('deadline');
        if (todo.deadline) {
            if (!(todo.deadline instanceof Date)) todo.deadline = new Date(todo.deadline);
            if (!isNaN(todo.deadline.getTime())) deadlineDisplay.textContent = `Deadline: ${todo.deadline.toDateString()}`;
        }

        listItem.appendChild(todoText);
        listItem.appendChild(deadlineDisplay);
        listItem.appendChild(voteDisplay);
        listItem.appendChild(infoBtn);
        listItem.appendChild(upvoteBtn);
        listItem.appendChild(downvoteBtn);
        listItem.appendChild(deleteBtn);
        listItem.appendChild(doneBtn);

        listItem.setAttribute('draggable', 'true');
        listItem.style.backgroundColor = todo.bgColor ? todo.bgColor : '#fff';

        listItem.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', todo.id); });
        todoText.addEventListener('dblclick', function(e) { e.preventDefault(); editTodo(todo.id); });
        if (todo.done) listItem.classList.add('done');
        listItem.classList.add('listItem');
        list.appendChild(listItem);
    }); 
    if(window.updateHeaderStats) window.updateHeaderStats();
}

function generateDetailsHTML(todo, details) {
    return `
    <table class="detailsTable"><tbody>
      <tr class="detailsMainText"><th>Text</th><td><span class="value">${todo.text}</span></td></tr>
      <tr class="detailsCategory"><th>Category</th><td><span class="value">${todo.category ? todo.category : "None"}</span></td></tr>
      <tr class="detailsVotes"><th>Votes</th><td><span class="value">${todo.votes}</span></td></tr>
      <tr class="detailsDate"><th>Time Added</th><td><span class="value">${formatDateTimeForDisplay(todo.timeAdded)}</span></td></tr>
      <tr class="detailsDeadline"><th>Deadline</th><td data-iso="${todo.deadline}"><span class="value">${formatDateTimeForDisplay(todo.deadline)}</span></td></tr>
      <tr class="detailsBgColor"><th>Color</th><td><span class="value"><code class="color-hex">${todo.bgColor || ''}</code></span></td></tr>
      <tr class="detailsDetails"><th>Details</th><td><span class="value">${details || "None"}</span></td></tr>
    </tbody></table>`;
}

// Logic Functions
function doneTodo(id) {
    let todo = window.todos.find(t => t.id === id);
    const listItem = document.getElementById(id);
    listItem.classList.add('slide-out');
    listItem.addEventListener('animationend', () => {
        todo.done = !todo.done;
        todo.timeDone = todo.done ? new Date().toISOString() : null;
        applyPreferredSorting(); 
        updateLocalStorage(); 
        drawTodos();
    });
}

function deleteTodo(id) {
    let todo = window.todos.find(t => t.id === id);
    if (window.confirm(`Delete: "${todo.text}"?`)) {
        const listItem = document.getElementById(id);
        listItem.classList.add('scale-out');
        listItem.addEventListener('animationend', () => {
            window.todos = window.todos.filter(todo => todo.id !== id);
            applyPreferredSorting(); 
            updateLocalStorage(); 
            drawTodos();
        });
    }
}

function upvote(id) { 
    let t = window.todos.find(t => t.id === id); 
    t.votes++; 
    applyPreferredSorting(); 
    drawTodos(); 
    updateLocalStorage(); 
}

function downvote(id) { 
    let t = window.todos.find(t => t.id === id); 
    t.votes--; 
    applyPreferredSorting(); 
    drawTodos(); 
    updateLocalStorage(); 
}

if(list) {
    list.addEventListener('dragover', (e) => { e.preventDefault(); });
    list.addEventListener('drop', (e) => {
        e.preventDefault();
        let id = parseInt(e.dataTransfer.getData('text/plain'));
        let index = window.todos.findIndex(t => t.id === id);
        let [todo] = window.todos.splice(index, 1);
        let dropTargetId = parseInt(e.target.closest('li').dataset.id);
        let dropTargetIndex = window.todos.findIndex(t => t.id === dropTargetId);
        window.todos.splice(dropTargetIndex, 0, todo);
        updateLocalStorage(); 
        drawTodos();
    });
}

function editTodo(id) {
    const todo = window.todos.find(todo => todo.id === id);
    const listItem = document.getElementById(id);
    const input = document.createElement('input');
    input.value = todo.text;
    input.addEventListener('blur', (e) => { 
        todo.text = e.target.value; 
        drawTodos(); 
        updateLocalStorage(); 
    });
    input.addEventListener('keydown', function(e) { 
        if (e.key === 'Enter') { 
            e.preventDefault(); 
            e.target.blur(); 
        } 
    });
    listItem.textContent = ''; 
    listItem.appendChild(input); 
    input.focus();
}

function editVotes(id) {
    const todo = window.todos.find(todo => todo.id === id);
    const voteDisplay = document.querySelector(`.votes[data-id='${id}']`);
    const input = document.createElement('input');
    input.type = 'number'; 
    input.value = todo.votes;
    input.addEventListener('blur', (e) => { 
        todo.votes = parseInt(e.target.value); 
        applyPreferredSorting(); 
        updateLocalStorage(); 
        drawTodos(); 
    });
    input.addEventListener('keydown', function(e) { 
        if (e.key === 'Enter') { 
            e.preventDefault(); 
            e.target.blur(); 
        } 
    });
    voteDisplay.textContent = ''; 
    voteDisplay.appendChild(input); 
    input.focus();
}

// Modal Logic
let modal = document.getElementById('detailsModal');
let closeModal = document.querySelector('.modal-close');
let detailsTextElem = document.getElementById('detailsText');
let saveDetailsBtn = document.getElementById('saveDetailsBtn');
let isEditing = false;

function showDetails(todoId, detailsHTML) {
    detailsTextElem.innerHTML = detailsHTML;
    modal.setAttribute('data-todo-id', todoId);
    modal.style.display = 'block';
}

closeModal.onclick = function() { 
    modal.style.display = 'none'; 
    isEditing = false; 
    updateLocalStorage(); 
    drawTodos(); 
    saveDetailsBtn.textContent = "Edit Details"; 
};

window.onclick = function(event) { 
    if (event.target === modal) { 
        isEditing = false; 
        saveDetailsBtn.textContent = "Edit Details"; 
        modal.style.display = 'none'; 
        try { drawTodos(); } catch (e) {} 
    } 
};

function resetModal() { 
    isEditing = false; 
    updateLocalStorage(); 
    drawTodos(); 
    saveDetailsBtn.textContent = "Edit Details"; 
}

saveDetailsBtn.addEventListener('click', () => {
    const valueSpans = detailsTextElem.querySelectorAll('.value');
    const todoId = modal.getAttribute('data-todo-id');
    let todoToUpdate = window.todos.find(todo => todo.id === Number(todoId));
    
    if (isEditing) {
        // Save logic
        valueSpans.forEach(span => {
            const input = span.querySelector('input');
            const textarea = span.querySelector('textarea');
            const select = span.querySelector('select');
            let val = input ? input.value : (textarea ? textarea.value : (select ? select.value : ''));
            
            const row = span.closest('tr');
            if(row.classList.contains('detailsMainText')) todoToUpdate.text = val;
            if(row.classList.contains('detailsCategory')) todoToUpdate.category = (val === 'none') ? null : val;
            if(row.classList.contains('detailsVotes')) todoToUpdate.votes = Number(val);
            if(row.classList.contains('detailsDetails')) todoToUpdate.details = val;
            if(row.classList.contains('detailsBgColor') && input && input.type === 'color') todoToUpdate.bgColor = val.toUpperCase();
        });
        updateLocalStorage(); 
        drawTodos();
        saveDetailsBtn.textContent = "Edit Details";
    } else {
        // Edit logic
        valueSpans.forEach(span => {
            const row = span.closest('tr');
            let current = span.textContent;
            if(row.classList.contains('detailsCategory')) {
                span.innerHTML = `<select><option value="none">None</option><option value="personal">Personal</option><option value="work">Work</option><option value="school">School</option><option value="groceries">Groceries</option><option value="household">Household</option><option value="software">Software</option><option value="entertainment">Entertainment</option><option value="children">Children</option><option value="fitness">Fitness</option></select>`; 
            } else if(row.classList.contains('detailsMainText') || row.classList.contains('detailsDetails')) {
                 span.innerHTML = `<textarea>${current}</textarea>`;
            } else if(row.classList.contains('detailsBgColor')) {
                 // Try to get hex code
                 let hex = row.querySelector('.color-hex')?.textContent || '#FFFFFF';
                 span.innerHTML = `<input type="color" value="${hex}">`;
            } else if(row.classList.contains('detailsVotes')) {
                 span.innerHTML = `<input type="number" value="${current}">`;
            } else {
                 span.innerHTML = `<input type="text" value="${current}">`;
            }
        });
        saveDetailsBtn.textContent = "Save Changes";
    }
    isEditing = !isEditing;
});

// Color Picker
let dropdown = document.getElementById("dropdown");
let dropbtn = document.getElementById("dropbtn");
let colorOptions = Array.from(document.getElementsByClassName("color-option"));

dropbtn.addEventListener('click', function () { 
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block"; 
});

colorOptions.forEach(option => {
    option.addEventListener('click', function () {
        selectedColor = this.style.backgroundColor;
        dropbtn.style.backgroundColor = selectedColor;
        dropdown.style.display = "none";
    });
});

// Category Filter
function filterTodosByCategory(category) {
    const filterNotice = document.getElementById("categoryFilteringNotice");
    if (category === 'none') {
        window.filteredTodos = window.todos;
        if (filterNotice) filterNotice.innerHTML = "Showing all todos:";
    } else {
        window.filteredTodos = window.todos.filter(todo => todo.category === category);
        if (filterNotice) filterNotice.innerHTML = "<span class='close'>&#215;</span> Showing: " + category;
    }
}

document.getElementById('categorySelect').addEventListener('change', function() { 
    filterTodosByCategory(this.value); 
    drawTodos(); 
});

document.addEventListener('click', function(event) {
    if (event.target.classList.contains('close')) {
        document.querySelector('#categorySelect').value = 'none';
        filterTodosByCategory('none');
        drawTodos();
    }
});

// Options Toggle
document.querySelector('.collapsible-btn').addEventListener('click', function() {
    const content = document.querySelector('.collapsible-content');
    content.style.display = (content.style.display === 'none' || content.style.display === '') ? 'grid' : 'none';
});

// Additional Details toggle
document.querySelector('.addDetails').addEventListener('click', () => {
    if (!document.querySelector('.detailsTextarea')){ 
        let textarea = document.createElement('textarea');
        textarea.name = "todoDetails"; 
        textarea.placeholder = "Enter additional details...";
        textarea.classList.add('detailsTextarea');
        document.getElementById('detailsContainer').appendChild(textarea); 
    }
});

function recalculatePoints() {
    let voteCounter = window.todos.length;
    window.todos.forEach(todo => { todo.votes = voteCounter; voteCounter--; });
    drawTodos();
}

function handleBackup() {
    const data = {
        todos: window.todos || [],
        worktimes: window.worktimes || [],
        diaryEntries: window.diaryEntries || [],
        preferredSorting: localStorage.getItem('preferredSorting') || null
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todo-app-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleRestore() {
    const uploadInput = document.getElementById('uploadInput');
    if (!uploadInput) return;
    uploadInput.click();
    uploadInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.todos) window.todos = data.todos;
                if (data.worktimes) window.worktimes = data.worktimes;
                if (data.diaryEntries) window.diaryEntries = data.diaryEntries;
                if (data.preferredSorting) localStorage.setItem('preferredSorting', data.preferredSorting);
                updateLocalStorage();
                drawTodos();
                if (typeof window.drawWorktimes === 'function') window.drawWorktimes();
                if (typeof window.drawDiary === 'function') window.drawDiary();
            } catch (err) {
                alert('Invalid backup file');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
}

function createTodoMenu() {
    const menu = document.querySelector('.menu');
    menu.innerHTML = `
        <li><a href="#" id="sortPointsBtn">Sort by Points</a></li>
        <li><a href="#" id="sortAlphaBtn">Sort Alphabetically</a></li>
        <li><a href="#" id="sortColorBtn">Sort by Color</a></li>
        <li><a href="#" id="sortDeadlineBtn">Sort by Deadline</a></li>
        <li><a href="#" id="sortTimeAddedBtn">Sort by Time Added</a></li>
        <li><a href="#" id="sortTimeDoneBtn">Sort by Time Done</a></li>
        <li><a href="#" id="recalculatePointsBtn">Recalculate Points</a></li>
        <li><a href="#" id="clearLocalStorageBtn">Delete all to do items</a></li>
        <li><a href="#" id="backupBtn">Backup App</a></li>
        <li><a href="#" id="restoreBtn">Restore</a></li>
        <li><input type="file" id="uploadInput" style="display: none" /></li>
        <li>
            <a href="${wpAppData.login_url}">Login / Register</a> 
            <span class="note" style="margin-left:5px; font-size:0.8em; opacity:0.7;">(if you want cloud sync)</span>
        </li>
    `;
    
    // Attach Listeners
    setTimeout(() => {
        document.getElementById('sortPointsBtn').addEventListener('click', () => { sortByPoints(); highlightActiveSortingOption(); });
        document.getElementById('sortAlphaBtn').addEventListener('click', () => { sortAlphabetically(); highlightActiveSortingOption(); });
        document.getElementById('sortColorBtn').addEventListener('click', () => { sortByColor(); highlightActiveSortingOption(); });
        document.getElementById('sortDeadlineBtn').addEventListener('click', () => { sortByDeadline(); highlightActiveSortingOption(); });
        document.getElementById('sortTimeAddedBtn').addEventListener('click', () => { sortByTimeAdded(); highlightActiveSortingOption(); });
        document.getElementById('sortTimeDoneBtn').addEventListener('click', () => { sortByTimeDone(); highlightActiveSortingOption(); });
        document.getElementById('recalculatePointsBtn').addEventListener('click', recalculatePoints);
        document.getElementById('backupBtn').addEventListener('click', handleBackup);
        document.getElementById('restoreBtn').addEventListener('click', handleRestore);
        
        document.getElementById("clearLocalStorageBtn").addEventListener("click", function(event) {
            event.preventDefault();
            if (window.confirm("Are you sure you want to clear selected items from LocalStorage?")) {
                localStorage.removeItem('todos');
                localStorage.removeItem('preferredSorting');
                window.todos = [];
                drawTodos();
            }
        });
    }, 500);
}

function highlightActiveSortingOption() {
    const sortingMethod = localStorage.getItem('preferredSorting');
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    const map = {
        'points': 'sortPointsBtn',
        'alphabet': 'sortAlphaBtn',
        'color': 'sortColorBtn',
        'deadline': 'sortDeadlineBtn',
        'timeAdded': 'sortTimeAddedBtn',
        'timeDone': 'sortTimeDoneBtn'
    };
    const id = map[sortingMethod];
    if (id && document.getElementById(id)) {
        document.getElementById(id).closest('li').classList.add('active');
    }
}

// Initialize
createTodoMenu();
applyPreferredSorting();

// Main Switcher for TODO
if(window.todoBtn) {
    window.todoBtn.addEventListener("click", function () {
        if (typeof window.refreshFromCloud === 'function') {
            window.refreshFromCloud();
        }
        window.worktimeContainer.style.display = "none";
        window.diaryContainer.style.display = "none";
        window.todoContainer.style.display = "block";
        window.worktimeBtn.classList.add('inactive');
        window.todoBtn.classList.remove('inactive');
        window.diaryBtn.classList.add('inactive');
        document.getElementById('mainTitle').textContent = 'To Do List';
        if (typeof updateHeaderStats === 'function') updateHeaderStats();
        drawTodos();
        createTodoMenu();
    });
}
