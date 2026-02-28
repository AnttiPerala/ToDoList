// Sorting State
let diarySort = { key: 'date', dir: 'desc' };

function getSortedDiaryEntries(list) {
    // SYNC FIX: Filter out soft-deleted items
    const arr = Array.from(list || window.diaryEntries).filter(e => !e.deleted);
    
    const { key, dir } = diarySort;
    const mult = dir === 'desc' ? -1 : 1;
    return arr.sort((a,b) => {
        let va, vb;
        if (key === 'date') { va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); }
        else if (key === 'category') { va = (a.category||'').toLowerCase(); vb = (b.category||'').toLowerCase(); }
        else { 
            // Compare raw text
            va = (a.description||'').toLowerCase(); 
            vb = (b.description||'').toLowerCase();
        }
        if (va < vb) return -1*mult; if (va > vb) return 1*mult; return 0;
    });
}

function addDiaryEntry(description, date, category) {
    const entry = {
        id: Date.now(),
        description: description, // Store RAW text (XSS Safe)
        date: new Date(date).toISOString(),
        category: category,
        deleted: false,
        lastModified: new Date().toISOString()
    };
    window.diaryEntries.push(entry);
    window.notifyChange('diary');
    
    // Refresh UI filters
    addCategoryFilter(); 
    applyDiaryFilters(); 
}

// --- RENDERING ---

window.drawDiary = function(entries) {
    // If no specific filtered list is passed, use the full sorted global list
    const listToDraw = entries || getSortedDiaryEntries(window.diaryEntries);
    
    const diaryList = document.getElementById('diaryList');
    diaryList.innerHTML = '';
    
    const table = document.createElement('div');
    table.className = 'diary-table';
    table.innerHTML = `
        <div class="diary-header" data-key="date">Date</div>
        <div class="diary-header" data-key="category">Category</div>
        <div class="diary-header" data-key="description">Description</div>
        <div class="diary-header">Edit</div>
        <div class="diary-header">Delete</div>
    `;

    listToDraw.forEach(entry => {
        const date = new Date(entry.date);
        
        // Date
        table.appendChild(window.createElementWithText('div', date.toLocaleDateString('fi-FI'), 'diary-cell'));
        
        // Category
        table.appendChild(window.createElementWithText('div', entry.category, 'diary-cell'));
        
        // Description (XSS Safe + Newlines)
        const descCell = document.createElement('div');
        descCell.className = 'diary-cell';
        descCell.style.whiteSpace = 'pre-wrap'; // CSS handles newlines
        descCell.textContent = entry.description;
        table.appendChild(descCell);
        
        // Edit
        const editCell = document.createElement('div');
        editCell.className = 'diary-cell';
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => editDiaryEntry(entry.id);
        editCell.appendChild(editBtn);
        table.appendChild(editCell);

        // Delete
        const delCell = document.createElement('div');
        delCell.className = 'diary-cell';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete';
        delBtn.textContent = 'Delete';
        delBtn.onclick = () => deleteDiaryEntry(entry.id);
        delCell.appendChild(delBtn);
        table.appendChild(delCell);
    });
    
    diaryList.appendChild(table);
    
    // Sort Headers
    table.querySelectorAll('.diary-header[data-key]').forEach(h => {
        h.style.cursor = 'pointer';
        h.addEventListener('click', () => { 
             const key = h.getAttribute('data-key');
             if (diarySort.key === key) diarySort.dir = (diarySort.dir === 'asc' ? 'desc' : 'asc');
             else { diarySort.key = key; diarySort.dir = (key === 'date' ? 'desc' : 'asc'); }
             applyDiaryFilters(); // Redraw with sort
        });
    });
}

// --- CRUD LOGIC ---

let editingDiaryId = null;
window.editDiaryEntry = function(id) {
    const entry = window.diaryEntries.find(item => item.id === id);
    if (entry) {
        document.getElementById('diaryInput').value = entry.description; // Raw text
        document.getElementById('diaryDate').value = new Date(entry.date).toISOString().split('T')[0];
        document.getElementById('diaryCategory').value = entry.category;
        
        const submitButton = document.getElementById('diaryForm').querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Entry';
        editingDiaryId = id;
    }
}

window.deleteDiaryEntry = function(id) {
    const entry = window.diaryEntries.find(item => item.id === id);
    if(entry && confirm("Delete entry?")) {
        window.touchItem(entry);
        entry.deleted = true; // Soft delete
        window.notifyChange('diary');
        applyDiaryFilters();
    }
}

// --- FILTERS & SEARCH (Restored) ---

function getTimeRangeBounds(value) {
    if (!value || value === 'all') return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start, end;
    switch (value) {
        case 'today':
            start = new Date(today); end = new Date(today); end.setHours(23, 59, 59, 999); break;
        case 'yesterday':
            start = new Date(today); start.setDate(start.getDate() - 1);
            end = new Date(start); end.setHours(23, 59, 59, 999); break;
        case 'thisWeek': {
            const dow = now.getDay();
            const mondayOffset = dow === 0 ? -6 : 1 - dow;
            start = new Date(today); start.setDate(start.getDate() + mondayOffset);
            end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999); break;
        }
        case 'lastWeek': {
            const dow = now.getDay();
            const mondayOffset = dow === 0 ? -6 : 1 - dow;
            const thisMonday = new Date(today); thisMonday.setDate(thisMonday.getDate() + mondayOffset);
            start = new Date(thisMonday); start.setDate(start.getDate() - 7);
            end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999); break;
        }
        case 'thisMonth':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); break;
        case 'lastMonth':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); break;
        case 'last6Months':
            start = new Date(now); start.setMonth(start.getMonth() - 6); start.setHours(0, 0, 0, 0);
            end = new Date(now); break;
        case 'last12Months':
            start = new Date(now); start.setMonth(start.getMonth() - 12); start.setHours(0, 0, 0, 0);
            end = new Date(now); break;
        case 'lastYear':
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999); break;
        case 'lastTwoYears':
            start = new Date(now); start.setFullYear(start.getFullYear() - 2); start.setHours(0, 0, 0, 0);
            end = new Date(now); break;
        default: return null;
    }
    return { start, end };
}

function filterEntriesByTimeRange(entries, timeValue) {
    const range = getTimeRangeBounds(timeValue);
    if (!range) return entries;
    return entries.filter(e => {
        const d = new Date(e.date).getTime();
        return d >= range.start.getTime() && d <= range.end.getTime();
    });
}

function getFilteredDiaryEntriesForExport() {
    const searchTerm = document.getElementById('diarySearch')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';
    const timeValue = document.getElementById('diaryTimeFilter')?.value || 'all';
    let entries = getSortedDiaryEntries(window.diaryEntries);
    entries = filterEntriesByTimeRange(entries, timeValue);
    return entries.filter(entry => {
        const matchesSearch = entry.description.toLowerCase().includes(searchTerm) ||
            new Date(entry.date).toLocaleDateString().includes(searchTerm) ||
            (entry.category && entry.category.toLowerCase().includes(searchTerm));
        const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });
}

function addCategoryFilter() {
    const existingFilter = document.querySelector('.diary-filter');
    if (existingFilter) existingFilter.remove();

    const defaultCategories = ["Life Event", "Purchase", "Item placement", "Data location change"];
    // Get used categories from non-deleted entries
    const usedCategories = [...new Set(getSortedDiaryEntries(window.diaryEntries).map(entry => entry.category))];
    const allCategories = [...new Set([...defaultCategories, ...usedCategories])].filter(category => category);
        
    const filterContainer = document.createElement('div');
    filterContainer.className = 'diary-filter';
    filterContainer.innerHTML = `
        <label for="categoryFilter">Display:</label>
        <select id="categoryFilter"><option value="all">All Categories</option>${allCategories.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    `;
    
    const list = document.getElementById('diaryList');
    if(list) list.before(filterContainer);
    
    document.getElementById('categoryFilter').addEventListener('change', applyDiaryFilters);
}

function addSearchFilter() {
    const existingSearch = document.querySelector('.diary-search');
    if (existingSearch) existingSearch.remove();
    const searchContainer = document.createElement('div');
    searchContainer.className = 'diary-search';
    searchContainer.innerHTML = `
        <input type="text" id="diarySearch" placeholder="Search diary entries...">
        <select id="diaryTimeFilter" title="Filter by time range">
            <option value="all">All times</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisWeek">This week</option>
            <option value="lastWeek">Last week</option>
            <option value="thisMonth">This month</option>
            <option value="lastMonth">Last month</option>
            <option value="last6Months">Last 6 months</option>
            <option value="last12Months">Last 12 months</option>
            <option value="lastYear">Last year</option>
            <option value="lastTwoYears">Last two years</option>
        </select>
        <button class="clear-search">×</button>
    `;
    
    const list = document.getElementById('diaryList');
    if(list) list.before(searchContainer);
    
    document.getElementById('diarySearch').addEventListener('input', applyDiaryFilters);
    document.getElementById('diaryTimeFilter').addEventListener('change', applyDiaryFilters);
    document.querySelector('.clear-search').addEventListener('click', function() {
        document.getElementById('diarySearch').value = '';
        applyDiaryFilters();
    });
}

function applyDiaryFilters() {
    const filteredEntries = getFilteredDiaryEntriesForExport();
    drawDiary(filteredEntries);
}


// --- MENU (Restored) ---

function createDiaryMenu() {
    const menu = document.querySelector('.menu');
    menu.innerHTML = `
        <li><a href="#" id="exportDiaryBtn">📃 Export as TXT</a></li>
        <li><a href="#" id="clearDiaryBtn">🗑️ Delete all diary entries</a></li>
        <li><a href="#" id="copyLifeEventsBtn">📌 Copy Life Events to Clipboard</a></li>
        <li><a href="#" id="copyPurchasesBtn">🛒 Copy Purchases to Clipboard</a></li>
        <li><a href="#" id="copyItemPlacementsBtn">📍 Copy Item Placements to Clipboard</a></li>
        <li><a href="#" id="copyDataLocationsBtn">💾 Copy Data Locations to Clipboard</a></li>
        <li><a href="#" id="backupBtn">💾 Backup App</a></li>
        <li><a href="#" id="restoreBtn">♻️ Restore</a></li>
        <li><input type="file" id="uploadDiaryInput" style="display: none" /></li>
        <li>
            <a href="${typeof wpAppData !== 'undefined' ? wpAppData.login_url : '#'}">🔐 Login / Register</a> 
            <span class="note" style="margin-left:5px; font-size:0.8em; opacity:0.7;">(if you want cloud sync)</span>
        </li>
        `;

    setTimeout(() => {
        document.getElementById('exportDiaryBtn').addEventListener('click', exportDiaryText);
        document.getElementById('clearDiaryBtn').addEventListener('click', clearDiaryData);
        document.getElementById('backupBtn').addEventListener('click', handleBackup);
        document.getElementById('restoreBtn').addEventListener('click', handleRestore);
        
        // Specific Copy Handlers
        document.getElementById('copyLifeEventsBtn').addEventListener('click', () => copyEntriesByCategory('Life Event'));
        document.getElementById('copyPurchasesBtn').addEventListener('click', () => copyEntriesByCategory('Purchase'));
        document.getElementById('copyItemPlacementsBtn').addEventListener('click', () => copyEntriesByCategory('Item placement'));
        document.getElementById('copyDataLocationsBtn').addEventListener('click', () => copyEntriesByCategory('Data location change'));
    }, 500);
}

function copyEntriesByCategory(category) {
    const entries = getFilteredDiaryEntriesForExport()
        .filter(entry => entry.category === category)
        .map(entry => {
            const date = new Date(entry.date);
            return `${date.toLocaleDateString()}: ${entry.description}`;
        })
        .join('\n');
        
    navigator.clipboard.writeText(entries).then(() => { alert(`${category} entries copied!`); });
}

function exportDiaryText() {
    const textContent = getFilteredDiaryEntriesForExport().map(entry => {
        const date = new Date(entry.date);
        return `Date: ${date.toLocaleDateString()}\nCategory: ${entry.category}\nEntry: ${entry.description}\n---------------`;
    }).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'diary_export.txt'; a.click();
}

function clearDiaryData() {
    if (confirm('Are you sure you want to delete all diary entries?')) {
        // Soft Delete All
        window.diaryEntries.forEach(e => {
            window.touchItem(e);
            e.deleted = true;
        });
        window.notifyChange('diary');
        applyDiaryFilters();
    }
}

// --- FORM HANDLING ---

const dForm = document.getElementById('diaryForm');
if(dForm) {
    // Default date to today
    const diaryDateInput = document.getElementById('diaryDate');
    if (diaryDateInput && !diaryDateInput.value) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        diaryDateInput.value = `${y}-${m}-${d}`;
    }

    dForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const textarea = document.getElementById('diaryInput');
      const description = textarea.value.trim();
      const date = document.getElementById('diaryDate').value;
      const category = document.getElementById('diaryCategory').value;
      if (description !== '') {
          // If editing
          if(editingDiaryId) {
             let idx = window.diaryEntries.findIndex(e => e.id === editingDiaryId);
             if(idx > -1) {
                 window.touchItem(window.diaryEntries[idx]);
                 window.diaryEntries[idx].description = description;
                 window.diaryEntries[idx].date = new Date(date).toISOString();
                 window.diaryEntries[idx].category = category;
             }
             editingDiaryId = null;
             dForm.querySelector('button[type="submit"]').textContent = 'Add Entry';
             window.notifyChange('diary');
             // Re-apply filters to show update
             addCategoryFilter(); 
             applyDiaryFilters();
          } else {
             addDiaryEntry(description, date, category);
          }
          textarea.value = '';
      }
    });
}

// Main Switcher
if(window.diaryBtn) {
    window.diaryBtn.addEventListener("click", function () {
        if(window.appSync) window.appSync.triggerSync();
        window.worktimeProjectFocus = null;
        window.diaryBtn.classList.remove('inactive');
        window.todoBtn.classList.add('inactive');
        window.worktimeBtn.classList.add('inactive');
        window.diaryContainer.style.display = "block";
        window.todoContainer.style.display = "none";
        window.worktimeContainer.style.display = "none";
        document.getElementById('mainTitle').textContent = 'Diary';
        if (typeof updateHeaderStats === 'function') updateHeaderStats();

        // Ensure date defaults to today when switching into diary mode (if empty)
        const diaryDateInput = document.getElementById('diaryDate');
        if (diaryDateInput && !diaryDateInput.value) {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            diaryDateInput.value = `${y}-${m}-${d}`;
        }
        
        createDiaryMenu();
        addCategoryFilter();
        addSearchFilter();
        applyDiaryFilters();
    });
}