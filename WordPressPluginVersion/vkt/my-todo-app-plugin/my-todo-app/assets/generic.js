
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

// --- DATA NORMALIZATION ---
window.todos = window.todos.map(todo => {
    if (todo.deadline) todo.deadline = new Date(todo.deadline);
    if (!('timeAdded' in todo) || !todo.timeAdded) {
        const idNum = Number(todo.id);
        todo.timeAdded = (!Number.isNaN(idNum) && idNum > 0) ? new Date(idNum).toISOString().split('.')[0] : "unknown";
    }
    if (!('timeDone' in todo)) todo.timeDone = todo.done ? new Date().toISOString().split('.')[0] : "";
    return todo;
});

window.worktimes = window.worktimes.map(worktime => ({
    ...worktime,
    start: new Date(worktime.start),
    end: new Date(worktime.end)
}));

// --- HELPERS ---
window.refreshAppUI = function() {
    if (typeof drawTodos === 'function') drawTodos();
    if (typeof drawWorktimes === 'function') {
        const pf = document.getElementById('projectFilter');
        drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
    }
    if (typeof drawDiary === 'function') drawDiary();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
};

function hexToRgb(hex) {
    let bigint = parseInt(hex.slice(1), 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return [r, g, b];
}

function formatDateToDateTimeLocal(date) {
    let parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return "";
    return parsedDate.toISOString().split('.')[0];
}

function formatDateTimeForDisplay(isoString) {
    if (!isoString) return "";
    const dateObj = new Date(isoString);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return dateObj.toLocaleString(undefined, options);
}

function isToday(date) {
    let parsedDate;
    if (!date) return false;
    if (typeof date === 'string') parsedDate = new Date(date);
    else if (date instanceof Date) parsedDate = date;
    else return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate.getTime() === today.getTime();
}

function handleBackup() {
    const dataToExport = {
        todos: window.todos,
        worktimes: window.worktimes,
        diaryEntries: window.diaryEntries
    };
    const dataStr = JSON.stringify(dataToExport);
    const blob = new Blob([dataStr], {type: 'application/json'});
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
            if (json.todos && json.worktimes && json.diaryEntries) {
                window.todos = json.todos.map(t => { if(t.deadline) t.deadline = new Date(t.deadline); return t; });
                window.worktimes = json.worktimes.map(w => ({...w, start: new Date(w.start), end: new Date(w.end)}));
                window.diaryEntries = json.diaryEntries;
                localStorage.setItem('todos', JSON.stringify(window.todos));
                localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
                localStorage.setItem('diaryEntries', JSON.stringify(window.diaryEntries));
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
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
        return (node.offsetWidth + node.offsetHeight) > 0;
    };
    if (isVisible(window.worktimeContainer)) {
        const n = window.worktimes ? window.worktimes.length : 0;
        el.textContent = `total of ${n} worktimes recorded`;
        return;
    }
    if (isVisible(window.diaryContainer)) {
        const n = window.diaryEntries ? window.diaryEntries.length : 0;
        el.textContent = `${n} diary entries written`;
        return;
    }
    const total = window.todos ? window.todos.length : 0;
    const completed = window.todos ? window.todos.filter(t => t && t.done).length : 0;
    el.textContent = `${Math.max(0, total - completed)} todos to do, ${completed} todos completed`;
}

function setupStatsObservers() {
    window.addEventListener('storage', window.updateHeaderStats);
    window.updateHeaderStats();
    if(document.getElementById('mainTitle')) {
        document.getElementById('mainTitle').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
}
window.addEventListener('load', setupStatsObservers);
