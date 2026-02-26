// --- Todo Logic ---

// Sort Logic Ref
function applyPreferredSorting() {
    // If the separate sorting file is loaded
    if(typeof window.applyPreferredSortingImpl === 'function') {
        window.applyPreferredSortingImpl();
    } else {
        // Fallback default sort (Points)
        window.todos.sort((a, b) => {
            if (a.done && !b.done) return 1; 
            if (b.done && !a.done) return -1;
            return b.votes - a.votes;
        });
    }
}

// Color logic
let selectedColor = null;

const form = document.getElementById('todoForm');
const input = document.getElementById('todoInput');
const list = document.getElementById('todoList');
const clearButton = document.querySelector('.clear-input');

// Filter listeners
if (input) {
    input.addEventListener('input', () => {
        if (clearButton) clearButton.style.display = input.value ? 'block' : 'none';
        drawTodos(); // Live redraw for filtering
    });
}
if(clearButton) {
    clearButton.addEventListener('click', () => { 
        input.value = ''; 
        clearButton.style.display = 'none'; 
        input.focus(); 
        drawTodos(); 
    });
}

// --- ADD TODO ---
if(form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const trimmedInput = input.value.trim();
    if (!trimmedInput) { alert("Please enter a task!"); return; }

    const topPriorityCheck = document.getElementById('topPriorityCheck');
    const midPriorityCheck = document.getElementById('midPriorityCheck');
    const deadlineInput = document.getElementById('deadlineInput');
    const categoryValue = document.getElementById('categorySelect').value;
    const detailsTextarea = document.querySelector('.detailsTextarea');

    // Calc votes
    const activeTodos = window.todos.filter(t => !t.deleted);
    let maxVotes = activeTodos.length ? Math.max(...activeTodos.map(t => t.votes)) : 0;
    let sumVotes = activeTodos.reduce((acc, t) => acc + t.votes, 0);
    let averageVotes = activeTodos.length ? Math.round(sumVotes / activeTodos.length) : 1; 

    let newTodo = {
        id: Date.now(),
        text: trimmedInput,
        votes: topPriorityCheck.checked ? maxVotes + 1 : midPriorityCheck.checked ? averageVotes : 0,
        deadline: deadlineInput.value ? new Date(deadlineInput.value) : null,
        done: false,
        deleted: false,
        bgColor: selectedColor,
        details: detailsTextarea ? detailsTextarea.value : null,
        category: categoryValue,
        timeAdded: new Date().toISOString(),
        timeDone: "",
        lastModified: new Date().toISOString()
    };

    window.todos.push(newTodo);
    window.notifyChange('todos');
    
    applyPreferredSorting();

    // Reset Form
    input.value = '';
    deadlineInput.value = '';
    topPriorityCheck.checked = false;
    midPriorityCheck.checked = false;
    if(document.getElementById('detailsContainer')) document.getElementById('detailsContainer').innerHTML = '';

    drawTodos();

    // Submit Animation
    let wavebutton = document.querySelector('.submitTodo');
    if(wavebutton) {
        let wave = document.createElement('div');
        wave.classList.add('wave', 'animate');
        wavebutton.textContent = 'Added!';
        wavebutton.appendChild(wave);
        setTimeout(() => { wave.remove(); wavebutton.textContent = 'Add'; }, 1000);
    }
});

// --- DRAW TODOS ---
window.drawTodos = function() {
    let list = document.querySelector('#todoList');
    if(!list) return;
    list.innerHTML = '';

    const categorySelect = document.getElementById('categorySelect');
    const categoryFilter = categorySelect ? categorySelect.value : 'none';
    const textFilter = input ? input.value.toLowerCase() : '';

    // Filter Logic
    let displayList = window.todos.filter(t => !t.deleted);

    if (categoryFilter !== 'none') {
        displayList = displayList.filter(t => t.category === categoryFilter);
        const notice = document.getElementById("categoryFilteringNotice");
        if(notice) notice.innerHTML = "<span class='close'>&#215;</span> Showing: " + categoryFilter;
    } else {
        const notice = document.getElementById("categoryFilteringNotice");
        if(notice) notice.innerHTML = "";
    }

    if (textFilter) {
        displayList = displayList.filter(t => t.text.toLowerCase().includes(textFilter));
    }

    // Render
    displayList.forEach(todo => {
        let listItem = document.createElement('li');
        listItem.id = todo.id;
        listItem.classList.add('listItem');
        if (todo.done) listItem.classList.add('done');
        if (todo.bgColor) listItem.style.backgroundColor = todo.bgColor;
        
        // Drag attributes
        listItem.setAttribute('draggable', 'true');
        listItem.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', todo.id); });

        // 1. TEXT (XSS Safe)
        let todoText = document.createElement('span');
        todoText.classList.add("toDoText");
        todoText.textContent = todo.text;
        todoText.addEventListener('dblclick', (e) => { e.preventDefault(); editTodo(todo.id); });

        // 1b. DETAILS PREVIEW (first 30 chars, subtle)
        let detailsPreview = document.createElement('span');
        detailsPreview.classList.add('todo-details-preview');
        if (todo.details && todo.details.toLowerCase() !== 'none') {
            const previewText = todo.details.length > 30 ? todo.details.substring(0, 30) + '…' : todo.details;
            detailsPreview.textContent = previewText;
        } else {
            detailsPreview.textContent = '';
        }
        detailsPreview.style.display = 'block';
        detailsPreview.style.fontSize = '0.9em';
        detailsPreview.style.opacity = '0.7';
        todoText.appendChild(detailsPreview);

        // 2. DEADLINE
        let deadlineDisplay = document.createElement('span');
        deadlineDisplay.classList.add('deadline');
        if (todo.deadline) {
             const d = new Date(todo.deadline);
             if (!isNaN(d.getTime())) deadlineDisplay.textContent = `Deadline: ${d.toDateString()}`;
        }

        // 3. VOTES
        let voteDisplay = document.createElement('span');
        voteDisplay.classList.add('votes');
        voteDisplay.textContent = `Votes: ${todo.votes}`;
        voteDisplay.addEventListener('dblclick', () => editVotes(todo.id));

        // 4. BUTTONS
        const mkBtn = (txt, cls, cb) => {
            const b = document.createElement('button');
            b.textContent = txt;
            b.className = cls;
            b.addEventListener('click', cb);
            return b;
        };

        let infoBtn = document.createElement('button');
        infoBtn.classList.add("info-button");
        infoBtn.textContent = 'i';
        infoBtn.addEventListener('click', () => {
            showDetails(todo.id);
        });

        const btnUp = mkBtn('Upvote', 'button-30', () => modifyVotes(todo.id, 1));
        const btnDown = mkBtn('Downvote', 'button-30', () => modifyVotes(todo.id, -1));
        const btnDone = mkBtn('Done', 'button-30', () => toggleDone(todo.id));
        const btnDel = mkBtn('Delete', 'button-30', () => softDeleteTodo(todo.id));

        listItem.append(todoText, deadlineDisplay, voteDisplay, infoBtn, btnUp, btnDown, btnDel, btnDone);
        list.appendChild(listItem);
    });
    
    window.updateHeaderStats();
};

// --- ACTIONS ---

function toggleDone(id) {
    let t = window.todos.find(x => x.id === id);
    if(t) {
        window.touchItem(t);
        t.done = !t.done;
        t.timeDone = t.done ? new Date().toISOString() : "";
        window.notifyChange('todos');
        
        // Animation then redraw
        const el = document.getElementById(id);
        if(el) {
            el.classList.add('slide-out');
            setTimeout(() => {
                applyPreferredSorting();
                drawTodos();
            }, 400);
        } else {
            drawTodos();
        }
    }
}

function softDeleteTodo(id) {
    let t = window.todos.find(x => x.id === id);
    if(t && confirm(`Delete "${t.text}"?`)) {
        window.touchItem(t);
        t.deleted = true; // Soft Delete
        window.notifyChange('todos');
        
        const el = document.getElementById(id);
        if(el) {
            el.classList.add('scale-out');
            setTimeout(drawTodos, 400);
        } else {
            drawTodos();
        }
    }
}

function modifyVotes(id, delta) {
    let t = window.todos.find(x => x.id === id);
    if(t) {
        window.touchItem(t);
        t.votes += delta;
        window.notifyChange('todos');
        applyPreferredSorting();
        drawTodos();
    }
}

function editTodo(id) {
    const t = window.todos.find(x => x.id === id);
    if(!t) return;
    const el = document.getElementById(id);
    const textSpan = el.querySelector('.toDoText');
    
    const input = document.createElement('input');
    input.value = t.text;
    input.addEventListener('blur', () => {
        if(input.value.trim() !== t.text) {
            window.touchItem(t);
            t.text = input.value.trim();
            window.notifyChange('todos');
        }
        drawTodos();
    });
    input.addEventListener('keydown', (e) => { if(e.key === 'Enter') input.blur(); });
    
    textSpan.replaceWith(input);
    input.focus();
}

function editVotes(id) {
    const t = window.todos.find(x => x.id === id);
    if(!t) return;
    const el = document.getElementById(id);
    const voteSpan = el.querySelector('.votes');
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = t.votes;
    input.style.width = '60px';
    
    input.addEventListener('blur', () => {
        const val = parseInt(input.value);
        if(!isNaN(val) && val !== t.votes) {
            window.touchItem(t);
            t.votes = val;
            window.notifyChange('todos');
        }
        drawTodos();
    });
    input.addEventListener('keydown', (e) => { if(e.key === 'Enter') input.blur(); });
    
    voteSpan.replaceWith(input);
    input.focus();
}

// --- DRAG DROP ---
if(list) {
    list.addEventListener('dragover', (e) => e.preventDefault());
    list.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedId = Number(e.dataTransfer.getData('text/plain'));
        const dropTarget = e.target.closest('li');
        if(!dropTarget || !draggedId) return;
        
        const targetId = Number(dropTarget.id);
        const dragIdx = window.todos.findIndex(x => x.id === draggedId);
        const targetIdx = window.todos.findIndex(x => x.id === targetId);
        
        if(dragIdx > -1 && targetIdx > -1) {
            const [item] = window.todos.splice(dragIdx, 1);
            window.todos.splice(targetIdx, 0, item);
            window.touchItem(item); // technically ordering changed, mark modified
            window.notifyChange('todos');
            drawTodos();
        }
    });
}

// --- DETAILS MODAL ---
function showDetails(id) {
    const t = window.todos.find(x => x.id === id);
    const modal = document.getElementById('detailsModal');
    const detailsText = document.getElementById('detailsText');
    if(!t || !modal) return;
    
    let html = `
    <table class="detailsTable"><tbody>
      <tr class="detailsMainText"><th>Text</th><td><span class="value"></span></td></tr>
      <tr class="detailsCategory"><th>Category</th><td><span class="value"></span></td></tr>
      <tr class="detailsVotes"><th>Votes</th><td><span class="value"></span></td></tr>
      <tr class="detailsDetails"><th>Details</th><td><span class="value"></span></td></tr>
      <tr class="detailsBgColor"><th>Color</th><td><span class="value"><code class="color-hex"></code></span></td></tr>
    </tbody></table>`;
    
    detailsText.innerHTML = html;
    
    // Populate textContent (XSS Safe)
    detailsText.querySelector('.detailsMainText .value').textContent = t.text;
    detailsText.querySelector('.detailsCategory .value').textContent = t.category || 'None';
    detailsText.querySelector('.detailsVotes .value').textContent = t.votes;
    detailsText.querySelector('.detailsDetails .value').textContent = t.details || 'None';
    detailsText.querySelector('.detailsBgColor .color-hex').textContent = t.bgColor || '';
    
    modal.setAttribute('data-todo-id', id);
    modal.style.display = 'block';
}

const saveDetailsBtn = document.getElementById('saveDetailsBtn');
if(saveDetailsBtn) {
    let isEditing = false;
    saveDetailsBtn.addEventListener('click', () => {
        const modal = document.getElementById('detailsModal');
        const id = Number(modal.getAttribute('data-todo-id'));
        const t = window.todos.find(x => x.id === id);
        
        if(isEditing) {
            // Save logic
            const inputs = document.getElementById('detailsText').querySelectorAll('input, textarea, select');
            window.touchItem(t);
            inputs.forEach(inp => {
                const row = inp.closest('tr');
                if(row.classList.contains('detailsMainText')) t.text = inp.value;
                if(row.classList.contains('detailsCategory')) t.category = inp.value === 'none' ? null : inp.value;
                if(row.classList.contains('detailsVotes')) t.votes = Number(inp.value);
                if(row.classList.contains('detailsDetails')) t.details = inp.value;
                if(row.classList.contains('detailsBgColor')) t.bgColor = inp.value;
            });
            window.notifyChange('todos');
            drawTodos();
            showDetails(id);
            saveDetailsBtn.textContent = "Edit Details";
            isEditing = false;
        } else {
            // Edit logic: replace simple spans with inputs
            const valueSpans = document.getElementById('detailsText').querySelectorAll('.value');
            valueSpans.forEach(span => {
                const row = span.closest('tr');
                let current = span.textContent;
                
                if(row.classList.contains('detailsCategory')) {
                    span.innerHTML = `<select><option value="none">None</option><option value="personal">Personal</option><option value="work">Work</option><option value="school">School</option><option value="groceries">Groceries</option><option value="household">Household</option><option value="software">Software</option><option value="entertainment">Entertainment</option><option value="children">Children</option><option value="fitness">Fitness</option></select>`; 
                    const sel = span.querySelector('select');
                    if(sel) sel.value = (t.category || 'none');
                } else if(row.classList.contains('detailsMainText') || row.classList.contains('detailsDetails')) {
                     span.innerHTML = `<textarea>${current === 'None' ? '' : current}</textarea>`;
                } else if(row.classList.contains('detailsBgColor')) {
                     span.innerHTML = `<input type="color" value="${t.bgColor || '#FFFFFF'}">`;
                } else if(row.classList.contains('detailsVotes')) {
                     span.innerHTML = `<input type="number" value="${current}">`;
                }
            });
            saveDetailsBtn.textContent = "Save Changes";
            isEditing = true;
        }
    });
    
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('detailsModal').style.display = 'none';
        isEditing = false;
        saveDetailsBtn.textContent = "Edit Details";
    });
}

// Color Picker
let dropdown = document.getElementById("dropdown");
let dropbtn = document.getElementById("dropbtn");
let colorOptions = Array.from(document.getElementsByClassName("color-option"));

if(dropbtn) {
    dropbtn.addEventListener('click', function () { 
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block"; 
    });
}

colorOptions.forEach(option => {
    option.addEventListener('click', function () {
        selectedColor = this.style.backgroundColor;
        if(dropbtn) dropbtn.style.backgroundColor = selectedColor;
        if(dropdown) dropdown.style.display = "none";
    });
});

// Category Filter
document.getElementById('categorySelect')?.addEventListener('change', function() { 
    drawTodos(); 
});
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('close')) {
        document.querySelector('#categorySelect').value = 'none';
        drawTodos();
    }
});

// Options Toggle
document.querySelector('.collapsible-btn')?.addEventListener('click', function() {
    const content = document.querySelector('.collapsible-content');
    content.style.display = (content.style.display === 'none' || content.style.display === '') ? 'grid' : 'none';
});

// Additional Details toggle
document.querySelector('.addDetails')?.addEventListener('click', () => {
    if (!document.querySelector('.detailsTextarea')){ 
        let textarea = document.createElement('textarea');
        textarea.name = "todoDetails"; 
        textarea.placeholder = "Enter additional details...";
        textarea.classList.add('detailsTextarea');
        document.getElementById('detailsContainer').appendChild(textarea); 
    }
});

// --- MENU GENERATION (RESTORED) ---

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
        <li><a href="#" id="makeAllWhiteBtn">Make all items white</a></li>
        <li><a href="#" id="backupBtn">Backup App</a></li>
        <li><a href="#" id="restoreBtn">Restore</a></li>
        <li><input type="file" id="uploadInput" style="display: none" /></li>
        <li>
            <a href="${typeof wpAppData !== 'undefined' ? wpAppData.login_url : '#'}">Login / Register</a> 
            <span class="note" style="margin-left:5px; font-size:0.8em; opacity:0.7;">(if you want cloud sync)</span>
        </li>
    `;
    
    // Attach Listeners
    setTimeout(() => {
        // Sorting
        const bindSort = (id, method) => {
            const btn = document.getElementById(id);
            if(btn) btn.addEventListener('click', () => {
                localStorage.setItem('preferredSorting', method);
                applyPreferredSorting();
                drawTodos();
                highlightActiveSortingOption();
            });
        };
        
        bindSort('sortPointsBtn', 'points');
        bindSort('sortAlphaBtn', 'alphabet');
        bindSort('sortColorBtn', 'color');
        bindSort('sortDeadlineBtn', 'deadline');
        bindSort('sortTimeAddedBtn', 'timeAdded');
        bindSort('sortTimeDoneBtn', 'timeDone');

        // Actions
        document.getElementById('recalculatePointsBtn').addEventListener('click', () => {
            let voteCounter = window.todos.length;
            window.todos.forEach(todo => { todo.votes = voteCounter; voteCounter--; });
            drawTodos();
        });

        const makeAllWhiteBtn = document.getElementById('makeAllWhiteBtn');
        if (makeAllWhiteBtn) {
            makeAllWhiteBtn.addEventListener('click', (event) => {
                event.preventDefault();
                window.todos.forEach(todo => {
                    if (todo.bgColor !== '#FFFFFF') {
                        window.touchItem(todo);
                        todo.bgColor = '#FFFFFF';
                    }
                });
                window.notifyChange('todos');
                drawTodos();
            });
        }

        document.getElementById('backupBtn').addEventListener('click', handleBackup);
        document.getElementById('restoreBtn').addEventListener('click', handleRestore);
        
        // Soft Delete All
        document.getElementById("clearLocalStorageBtn").addEventListener("click", function(event) {
            event.preventDefault();
            if (window.confirm("Are you sure you want to delete all to do items?")) {
                window.todos.forEach(t => {
                    window.touchItem(t);
                    t.deleted = true;
                });
                window.notifyChange('todos');
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
drawTodos(); // Draw on load

if(window.todoBtn) {
    window.todoBtn.addEventListener("click", function () {
        if(window.appSync) window.appSync.triggerSync(); 
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