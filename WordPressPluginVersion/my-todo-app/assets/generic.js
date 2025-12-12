// --- GLOBAL DATA STORAGE ---
window.todos = JSON.parse(localStorage.getItem('todos')) || [];
window.worktimes = JSON.parse(localStorage.getItem('worktimes')) || [];
window.diaryEntries = JSON.parse(localStorage.getItem('diaryEntries')) || [];

// --- GLOBAL DOM ELEMENTS ---
window.todoBtn = document.getElementById("btnTodoMode");
window.worktimeBtn = document.getElementById("btnWorktimeMode");
window.diaryBtn = document.getElementById("btnDiaryMode");
window.todoContainer = document.getElementById("todoModeWrap");
window.worktimeContainer = document.getElementById("worktimeModeWrap");
window.diaryContainer = document.getElementById("diaryModeWrap");

// --- DATA NORMALIZATION & MIGRATION ---
function normalizeData(list) {
    // FIX: Use 1970 as default for legacy items so server updates overwrite them
    const legacyDate = new Date(0).toISOString(); 
    
    return list.map(item => {
        if (!item.id) item.id = Date.now() + Math.random(); 
        
        // CRITICAL FIX: If missing timestamp, treat as very old
        if (!item.lastModified) item.lastModified = legacyDate;
        
        if (typeof item.deleted === 'undefined') item.deleted = false;
        
        // Type fixing
        if (item.deadline) item.deadline = new Date(item.deadline);
        if (item.start) item.start = new Date(item.start);
        if (item.end) item.end = new Date(item.end);
        
        return item;
    });
}

// Initial Normalization
window.todos = normalizeData(window.todos);
window.worktimes = normalizeData(window.worktimes);
window.diaryEntries = normalizeData(window.diaryEntries);

// --- STATE MANAGEMENT ---
window.notifyChange = function(type) {
    if (type === 'todos' || type === 'all') localStorage.setItem('todos', JSON.stringify(window.todos));
    if (type === 'worktimes' || type === 'all') localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
    if (type === 'diary' || type === 'all') localStorage.setItem('diaryEntries', JSON.stringify(window.diaryEntries));

    if (window.appSync && typeof window.appSync.triggerSync === 'function') {
        window.appSync.triggerSync();
    }
    
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
};

window.touchItem = function(item) {
    item.lastModified = new Date().toISOString();
    return item;
};

// --- HELPERS ---

window.refreshAppUI = function() {
    if (typeof drawTodos === 'function') drawTodos();
    if (typeof drawWorktimes === 'function') {
        const pf = document.getElementById('projectFilter');
        const activeBtn = document.querySelector('.worktime-filters button.active');
        const period = activeBtn ? activeBtn.dataset.period : 'thisMonth';
        drawWorktimes(period, pf ? pf.value : 'All projects');
    }
    if (typeof drawDiary === 'function') drawDiary();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
};

window.createElementWithText = function(tag, text, className) {
    const el = document.createElement(tag);
    el.textContent = text || '';
    if (className) el.className = className;
    return el;
};

function formatDateTimeForDisplay(isoString) {
    if (!isoString) return "";
    const dateObj = new Date(isoString);
    if(isNaN(dateObj.getTime())) return "";
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return dateObj.toLocaleString(undefined, options);
}

// --- BACKUP / RESTORE ---

function handleBackup() {
    const cleanTodos = window.todos.filter(x => !x.deleted);
    const cleanWork = window.worktimes.filter(x => !x.deleted);
    const cleanDiary = window.diaryEntries.filter(x => !x.deleted);

    const dataToExport = {
        todos: cleanTodos,
        worktimes: cleanWork,
        diaryEntries: cleanDiary
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'full_app_backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleRestore() {
    const existingInput = document.getElementById('uploadInput');
    if (existingInput) existingInput.remove();
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.id = 'uploadInput';
    uploadInput.style.display = 'none';
    document.body.appendChild(uploadInput);
    
    uploadInput.addEventListener('change', handleFileUpload);
    uploadInput.click();
}

function handleFileUpload(e) {
    let file = e.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let json = JSON.parse(e.target.result);
            if (json.todos || json.worktimes || json.diaryEntries) {
                if(json.todos) window.todos = normalizeData(json.todos);
                if(json.worktimes) window.worktimes = normalizeData(json.worktimes);
                if(json.diaryEntries) window.diaryEntries = normalizeData(json.diaryEntries);

                window.notifyChange('all');
                window.refreshAppUI();
                alert("Data restored!");
            }
        } catch (error) { alert("Restore failed: " + error); }
    };
    reader.readAsText(file);
}

window.updateHeaderStats = function() {
    const el = document.getElementById('todo-stats');
    if (!el) return;
    
    const isVisible = (node) => {
        if (!node) return false;
        const cs = window.getComputedStyle(node);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
    };

    if (isVisible(window.worktimeContainer)) {
        const n = window.worktimes ? window.worktimes.filter(t => !t.deleted).length : 0;
        el.textContent = `total of ${n} worktimes recorded`;
        return;
    }
    if (isVisible(window.diaryContainer)) {
        const n = window.diaryEntries ? window.diaryEntries.filter(t => !t.deleted).length : 0;
        el.textContent = `${n} diary entries written`;
        return;
    }
    const activeTodos = window.todos ? window.todos.filter(t => !t.deleted) : [];
    const total = activeTodos.length;
    const completed = activeTodos.filter(t => t.done).length;
    el.textContent = `${Math.max(0, total - completed)} todos to do, ${completed} todos completed`;
}

window.addEventListener('load', () => {
    window.updateHeaderStats();
    if(document.getElementById('mainTitle')) {
        document.getElementById('mainTitle').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
});