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

// --- CATEGORY CONFIG (dropdown + manage modal) ---
const TC_SETTINGS_KEY = 'todoCategorySettings';
const TC_DEFAULT_CATEGORIES = [
    { value: 'none', label: '⬜ None' },
    { value: 'personal', label: '👤 Personal' },
    { value: 'work', label: '💼 Work' },
    { value: 'software', label: '💻 Software' },
    { value: 'school', label: '🎓 School' },
    { value: 'groceries', label: '🛒 Groceries' },
    { value: 'household', label: '🏠 Household' },
    { value: 'entertainment', label: '🎬 Entertainment' },
    { value: 'children', label: '🧸 Children' },
    { value: 'fitness', label: '💪 Fitness' }
];

function tc_loadSettings() {
    try {
        const raw = localStorage.getItem(TC_SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return {
            hiddenDefaults: Array.isArray(parsed.hiddenDefaults) ? parsed.hiddenDefaults : [],
            custom: Array.isArray(parsed.custom) ? parsed.custom : [],
            popularityOrder: Boolean(parsed.popularityOrder)
        };
    } catch (_) {
        return { hiddenDefaults: [], custom: [], popularityOrder: false };
    }
}

function tc_saveSettings(s) {
    localStorage.setItem(TC_SETTINGS_KEY, JSON.stringify(s));
}

function tc_slugify(name) {
    let s = (name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!s) s = 'category';
    return s;
}

function tc_activeTodoCountForCategory(catValue) {
    return (window.todos || []).filter(t => {
        if (t.deleted || t.done) return false;
        const c = t.category == null || t.category === '' ? 'none' : t.category;
        return c === catValue;
    }).length;
}

function tc_knownValueSet(settings) {
    const set = new Set(['none']);
    TC_DEFAULT_CATEGORIES.forEach(c => {
        if (c.value !== 'none' && !settings.hiddenDefaults.includes(c.value)) set.add(c.value);
    });
    (settings.custom || []).forEach(c => set.add(c.value));
    return set;
}

function tc_mergedCategoryList(settings) {
    const hidden = new Set(settings.hiddenDefaults || []);
    const out = [];
    const seen = new Set();
    TC_DEFAULT_CATEGORIES.forEach(c => {
        if (c.value === 'none') {
            out.push({ ...c });
            seen.add('none');
        } else if (!hidden.has(c.value)) {
            out.push({ ...c });
            seen.add(c.value);
        }
    });
    (settings.custom || []).forEach(c => {
        if (c && c.value && !seen.has(c.value)) {
            out.push({ value: c.value, label: c.label || c.value });
            seen.add(c.value);
        }
    });
    (window.todos || []).filter(t => !t.deleted).forEach(t => {
        const v = t.category == null || t.category === '' ? 'none' : t.category;
        if (!seen.has(v)) {
            seen.add(v);
            out.push({ value: v, label: v });
        }
    });
    return out;
}

function tc_sortCategoriesForDropdown(list, settings) {
    const noneItem = list.find(c => c.value === 'none');
    const rest = list.filter(c => c.value !== 'none');
    if (settings.popularityOrder) {
        rest.sort((a, b) => {
            const ca = tc_activeTodoCountForCategory(a.value);
            const cb = tc_activeTodoCountForCategory(b.value);
            if (cb !== ca) return cb - ca;
            return (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' });
        });
    } else {
        const orderMap = new Map(TC_DEFAULT_CATEGORIES.map((c, i) => [c.value, i]));
        rest.sort((a, b) => {
            const ia = orderMap.has(a.value) ? orderMap.get(a.value) : 999;
            const ib = orderMap.has(b.value) ? orderMap.get(b.value) : 999;
            if (ia !== ib) return ia - ib;
            return (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' });
        });
    }
    return noneItem ? [noneItem, ...rest] : rest;
}

function tc_getLabelForValue(value) {
    const v = value == null || value === '' ? 'none' : value;
    const settings = tc_loadSettings();
    const list = tc_mergedCategoryList(settings);
    const found = list.find(c => c.value === v);
    return found ? found.label : v;
}

/**
 * @param {HTMLSelectElement} selectEl
 * @param {string} selectedValue
 * @param {{ includeManage?: boolean }} opts
 */
function tc_populateSelect(selectEl, selectedValue, opts) {
    const o = opts || {};
    const includeManage = o.includeManage !== false;
    const settings = tc_loadSettings();
    let list = tc_mergedCategoryList(settings);
    list = tc_sortCategoriesForDropdown(list, settings);

    selectEl.innerHTML = '';
    list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.value;
        opt.textContent = c.label;
        selectEl.appendChild(opt);
    });
    if (includeManage) {
        const manage = document.createElement('option');
        manage.value = '__manage__';
        manage.textContent = '⚙ Manage…';
        manage.className = 'category-manage-option';
        selectEl.appendChild(manage);
    }
    const valid = [...selectEl.options].filter(op => op.value !== '__manage__').map(op => op.value);
    let want = selectedValue === '__manage__' || !selectedValue ? 'none' : selectedValue;
    if (!valid.includes(want)) want = 'none';
    selectEl.value = want;
}

function tc_initCategoryDropdown() {
    const sel = document.getElementById('categorySelect');
    if (!sel) return;
    const prev = sel.value || sel.dataset.prevValue || 'none';
    tc_populateSelect(sel, prev, { includeManage: true });
    sel.dataset.prevValue = sel.value;
}

function tc_removeCategoryFromTodos(catValue) {
    (window.todos || []).forEach(t => {
        const c = t.category == null || t.category === '' ? 'none' : t.category;
        if (c === catValue) {
            window.touchItem(t);
            t.category = null;
        }
    });
}

function tc_ensureCategoryModal() {
    let modal = document.getElementById('categoryManageModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'categoryManageModal';
    modal.className = 'category-manage-modal';
    modal.innerHTML = `
      <div class="category-manage-content">
        <div class="category-manage-header">
          <h3>Manage categories</h3>
          <button type="button" class="button-30" id="categoryManageCloseBtn">Close</button>
        </div>
        <label class="category-manage-popularity">
          <input type="checkbox" id="categoryPopularityOrder" />
          <span>Show in order of popularity</span>
        </label>
        <p class="muted category-manage-hint">Popularity is the number of active (not done) tasks per category.</p>
        <div id="categoryManageList" class="category-manage-list"></div>
        <div class="category-manage-add">
          <input type="text" id="categoryManageNewName" class="button-30" placeholder="New category name" maxlength="80" />
          <button type="button" class="button-30" id="categoryManageAddBtn">Add category</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    modal.querySelector('#categoryManageCloseBtn').addEventListener('click', () => { modal.style.display = 'none'; });
    const newNameInput = modal.querySelector('#categoryManageNewName');
    if (newNameInput && !newNameInput.__tcEnterWired) {
        newNameInput.__tcEnterWired = true;
        newNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = document.getElementById('categoryManageAddBtn');
                if (btn) btn.click();
            }
        });
    }
    return modal;
}

function tc_renderCategoryManageList() {
    const settings = tc_loadSettings();
    const listEl = document.getElementById('categoryManageList');
    const pop = document.getElementById('categoryPopularityOrder');
    if (!listEl || !pop) return;
    pop.checked = settings.popularityOrder;

    const merged = tc_mergedCategoryList(settings);
    listEl.innerHTML = '';
    merged.forEach(c => {
        const row = document.createElement('div');
        row.className = 'category-manage-row';
        const count = tc_activeTodoCountForCategory(c.value);
        const name = document.createElement('span');
        name.className = 'category-manage-name';
        name.textContent = c.label;
        const meta = document.createElement('span');
        meta.className = 'muted category-manage-meta';
        meta.textContent = `${count} active`;
        row.appendChild(name);
        row.appendChild(meta);
        if (c.value !== 'none') {
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'button-30 category-manage-delete';
            del.textContent = 'Delete';
            del.addEventListener('click', () => {
                if (!confirm(`Remove category "${c.label}"? Tasks will become uncategorized (None).`)) return;
                const next = tc_loadSettings();
                if (TC_DEFAULT_CATEGORIES.some(d => d.value === c.value)) {
                    if (!next.hiddenDefaults.includes(c.value)) next.hiddenDefaults.push(c.value);
                } else {
                    next.custom = (next.custom || []).filter(x => x.value !== c.value);
                }
                tc_saveSettings(next);
                tc_removeCategoryFromTodos(c.value);
                window.notifyChange('todos');
                tc_initCategoryDropdown();
                drawTodos();
                tc_renderCategoryManageList();
            });
            row.appendChild(del);
        }
        listEl.appendChild(row);
    });
}

function tc_openCategoryManageModal() {
    const modal = tc_ensureCategoryModal();
    const pop = document.getElementById('categoryPopularityOrder');
    tc_renderCategoryManageList();
    pop.onchange = () => {
        const s = tc_loadSettings();
        s.popularityOrder = pop.checked;
        tc_saveSettings(s);
        tc_initCategoryDropdown();
    };
    const addBtn = document.getElementById('categoryManageAddBtn');
    const newInput = document.getElementById('categoryManageNewName');
    addBtn.onclick = () => {
        const raw = (newInput.value || '').trim();
        if (!raw) return alert('Enter a category name.');
        let base = tc_slugify(raw);
        const s = tc_loadSettings();
        let val = base;
        let n = 2;
        const taken = tc_knownValueSet(s);
        while (taken.has(val) || val === 'none') {
            val = `${base}_${n++}`;
        }
        const label = raw.length > 60 ? raw.slice(0, 60) + '…' : raw;
        s.custom = s.custom || [];
        s.custom.push({ value: val, label: label });
        tc_saveSettings(s);
        newInput.value = '';
        tc_initCategoryDropdown();
        tc_renderCategoryManageList();
    };
    modal.style.display = 'flex';
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
        if (clearButton) clearButton.style.display = input.value ? 'inline-flex' : 'none';
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
    let rawCat = document.getElementById('categorySelect').value;
    if (rawCat === '__manage__') rawCat = 'none';
    const categoryValue = rawCat === 'none' ? null : rawCat;
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

    if (categoryFilter !== 'none' && categoryFilter !== '__manage__') {
        displayList = displayList.filter(t => t.category === categoryFilter);
        const notice = document.getElementById("categoryFilteringNotice");
        if(notice) notice.innerHTML = "<span class='close'>&#215;</span> Showing: " + tc_getLabelForValue(categoryFilter);
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
        const wasDone = t.done;
        const nowIso = new Date().toISOString();
        t.done = !t.done;
        if (t.done) {
            t.timeDone = nowIso;
        } else {
            t.timeDone = "";
            t.timeUndone = nowIso;
            t.reviveCount = (t.reviveCount || 0) + 1;
        }
        window.notifyChange('todos');
        
        // Animation then redraw
        const el = document.getElementById(id);
        if (el) {
            if (!wasDone && t.done) {
                // Newly completed: slide out
                el.classList.add('slide-out');
                setTimeout(() => {
                    applyPreferredSorting();
                    drawTodos();
                }, 400);
            } else if (wasDone && !t.done) {
                // Revived from done: subtle pulse highlight
                el.classList.add('revive');
                setTimeout(() => {
                    el.classList.remove('revive');
                    applyPreferredSorting();
                    drawTodos();
                }, 400);
            } else {
                drawTodos();
            }
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

function setPriorityInCategory(id, mode) {
    const t = window.todos.find(x => x.id === id);
    if (!t) return;
    const cat = t.category || 'none';
    const sameCat = window.todos.filter(x => !x.deleted && (x.category || 'none') === cat);
    if (!sameCat.length) return;

    const votes = sameCat.map(x => x.votes);
    const max = Math.max(...votes);
    const min = Math.min(...votes);
    const avg = Math.round(votes.reduce((a, b) => a + b, 0) / votes.length) || 0;

    let newVotes = t.votes;
    if (mode === 'top') newVotes = max + 1;
    else if (mode === 'mid') newVotes = avg;
    else if (mode === 'bottom') newVotes = min - 1;

    if (newVotes === t.votes) return;

    window.touchItem(t);
    t.votes = newVotes;
    window.notifyChange('todos');
    applyPreferredSorting();
    drawTodos();
    showDetails(id);
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
      <tr class="detailsAdded"><th>Added</th><td><span class="value"></span></td></tr>
      <tr class="detailsLastUndone"><th>Last revived</th><td><span class="value"></span></td></tr>
      <tr class="detailsRevives"><th>Times revived</th><td><span class="value"></span></td></tr>
      <tr class="detailsDetails"><th>Details</th><td><span class="value"></span></td></tr>
      <tr class="detailsBgColor"><th>Color</th><td><span class="value"><code class="color-hex"></code></span></td></tr>
    </tbody></table>`;
    
    detailsText.innerHTML = html;
    
    // Populate textContent (XSS Safe)
    detailsText.querySelector('.detailsMainText .value').textContent = t.text;
    detailsText.querySelector('.detailsCategory .value').textContent = tc_getLabelForValue(t.category);
    detailsText.querySelector('.detailsVotes .value').textContent = t.votes;
    detailsText.querySelector('.detailsAdded .value').textContent = t.timeAdded ? formatDateTimeForDisplay(t.timeAdded) : 'Unknown';
    detailsText.querySelector('.detailsLastUndone .value').textContent = t.timeUndone ? formatDateTimeForDisplay(t.timeUndone) : 'Never';
    detailsText.querySelector('.detailsRevives .value').textContent = t.reviveCount || 0;
    detailsText.querySelector('.detailsDetails .value').textContent = t.details || 'None';
    detailsText.querySelector('.detailsBgColor .color-hex').textContent = t.bgColor || '';

    const catLabel = tc_getLabelForValue(t.category);
    const actions = document.createElement('div');
    actions.className = 'details-priority-actions';

    const makeBtn = (label, mode) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'button-30';
        b.textContent = label;
        b.addEventListener('click', () => setPriorityInCategory(id, mode));
        return b;
    };

    actions.appendChild(makeBtn(`▲ Make top in category: ${catLabel}`, 'top'));
    actions.appendChild(makeBtn(`➜ Make mid in category: ${catLabel}`, 'mid'));
    actions.appendChild(makeBtn(`▼ Make bottom in category: ${catLabel}`, 'bottom'));

    actions.style.marginTop = '0.75rem';
    actions.style.display = 'flex';
    actions.style.flexWrap = 'wrap';
    actions.style.gap = '0.5rem';

    detailsText.appendChild(actions);

    if (t.done) {
        const reviveRow = document.createElement('div');
        reviveRow.className = 'details-revive-actions';
        reviveRow.style.marginTop = '0.5rem';
        const reviveBtn = document.createElement('button');
        reviveBtn.type = 'button';
        reviveBtn.className = 'button-30';
        reviveBtn.textContent = '↩ Revive (mark not done)';
        reviveBtn.addEventListener('click', () => {
            toggleDone(id);
            showDetails(id);
        });
        reviveRow.appendChild(reviveBtn);
        detailsText.appendChild(reviveRow);
    }
    
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
            saveDetailsBtn.textContent = "✎ Edit details";
            isEditing = false;
        } else {
            // Edit logic: replace simple spans with inputs
            const valueSpans = document.getElementById('detailsText').querySelectorAll('.value');
            valueSpans.forEach(span => {
                const row = span.closest('tr');
                let current = span.textContent;
                
                if(row.classList.contains('detailsCategory')) {
                    span.innerHTML = '';
                    const sel = document.createElement('select');
                    tc_populateSelect(sel, t.category || 'none', { includeManage: false });
                    span.appendChild(sel);
                } else if(row.classList.contains('detailsMainText') || row.classList.contains('detailsDetails')) {
                     span.innerHTML = `<textarea>${current === 'None' ? '' : current}</textarea>`;
                } else if(row.classList.contains('detailsBgColor')) {
                     span.innerHTML = `<input type="color" value="${t.bgColor || '#FFFFFF'}">`;
                } else if(row.classList.contains('detailsVotes')) {
                     span.innerHTML = `<input type="number" value="${current}">`;
                }
            });
            saveDetailsBtn.textContent = "💾 Save changes";
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
    if (this.value === '__manage__') {
        const prev = this.dataset.prevValue || 'none';
        tc_openCategoryManageModal();
        tc_populateSelect(this, prev, { includeManage: true });
        this.dataset.prevValue = this.value;
        return;
    }
    this.dataset.prevValue = this.value;
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
    if (!content) return;
    content.style.display = (content.style.display === 'none' || content.style.display === '') ? 'grid' : 'none';
});

// Additional Details toggle (delegate so it always works)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.addDetails');
    if (!btn) return;
    const container = document.getElementById('detailsContainer');
    if (!container) return;
    if (!container.querySelector('.detailsTextarea')) {
        const textarea = document.createElement('textarea');
        textarea.name = 'todoDetails';
        textarea.placeholder = 'Enter additional details...';
        textarea.classList.add('detailsTextarea');
        container.appendChild(textarea);
    }
});

// --- MENU GENERATION (RESTORED) ---

function createTodoMenu() {
    const menu = document.querySelector('.menu');
    menu.innerHTML = `
        <li><a href="#" id="sortPointsBtn">⭐ Sort by Points</a></li>
        <li><a href="#" id="sortAlphaBtn">🔤 Sort Alphabetically</a></li>
        <li><a href="#" id="sortColorBtn">🎨 Sort by Color</a></li>
        <li><a href="#" id="sortDeadlineBtn">⏰ Sort by Deadline</a></li>
        <li><a href="#" id="sortTimeAddedBtn">🕒 Sort by Time Added</a></li>
        <li><a href="#" id="sortTimeDoneBtn">✅ Sort by Time Done</a></li>
        <li><a href="#" id="sortMostRevivedBtn">🧟 Sort by Most Revived</a></li>
        <li><a href="#" id="recalculatePointsBtn">🔁 Recalculate Points</a></li>
        <li><a href="#" id="clearLocalStorageBtn">🗑️ Delete all to do items</a></li>
        <li><a href="#" id="makeAllWhiteBtn">⬜ Make all items white</a></li>
        <li><a href="#" id="backupBtn">💾 Backup App</a></li>
        <li><a href="#" id="restoreBtn">♻️ Restore</a></li>
        <li><input type="file" id="uploadInput" style="display: none" /></li>
        <li>
            <a href="${typeof wpAppData !== 'undefined' ? wpAppData.login_url : '#'}">🔐 Login / Register</a> 
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
        bindSort('sortMostRevivedBtn', 'mostRevived');

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
        'timeDone': 'sortTimeDoneBtn',
        'mostRevived': 'sortMostRevivedBtn'
    };
    const id = map[sortingMethod];
    if (id && document.getElementById(id)) {
        document.getElementById(id).closest('li').classList.add('active');
    }
}

// Initialize
tc_initCategoryDropdown();
createTodoMenu();
applyPreferredSorting();
drawTodos(); // Draw on load

if(window.todoBtn) {
    window.todoBtn.addEventListener("click", function () {
        if(window.appSync) window.appSync.triggerSync(); 
        window.worktimeProjectFocus = null;
        window.worktimeContainer.style.display = "none";
        window.diaryContainer.style.display = "none";
        window.todoContainer.style.display = "block";
        window.worktimeBtn.classList.add('inactive');
        window.todoBtn.classList.remove('inactive');
        window.diaryBtn.classList.add('inactive');
        document.getElementById('mainTitle').textContent = 'To Do List';
        if (typeof updateHeaderStats === 'function') updateHeaderStats();
        tc_initCategoryDropdown();
        drawTodos();
        createTodoMenu();
    });
}