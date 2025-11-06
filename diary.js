// Safe fallbacks for UI bindings (avoid TDZ/redeclarations)
(function(){
  try {
    if (!('diaryBtn' in window)) window.diaryBtn = document.getElementById('btnDiaryMode');
    if (!('todoBtn' in window)) window.todoBtn = document.getElementById('btnTodoMode');
    if (!('worktimeBtn' in window)) window.worktimeBtn = document.getElementById('btnWorktimeMode');
    if (!('diaryContainer' in window)) window.diaryContainer = document.getElementById('diaryModeWrap');
    if (!('todoContainer' in window)) window.todoContainer = document.getElementById('todoModeWrap');
    if (!('worktimeContainer' in window)) window.worktimeContainer = document.getElementById('worktimeModeWrap');
  } catch(_) {}
})();

// --- Diary sorting state ---
let diarySort = { key: 'date', dir: 'desc' };

function getSortedDiaryEntries(list) {
    const arr = Array.from(list || diaryEntries);
    const { key, dir } = diarySort;
    const mult = dir === 'desc' ? -1 : 1;
    return arr.sort((a,b) => {
        let va, vb;
        if (key === 'date') { va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); }
        else if (key === 'category') { va = (a.category||'').toLowerCase(); vb = (b.category||'').toLowerCase(); }
        else { // description
            const sa = (a.description||'').replace(/<br\s*\/?>/gi,'\n').toLowerCase();
            const sb = (b.description||'').replace(/<br\s*\/?>/gi,'\n').toLowerCase();
            va = sa; vb = sb;
        }
        if (va < vb) return -1*mult; if (va > vb) return 1*mult; return 0;
    });
}


// Render ▲/▼ indicators on sorted column headers
function __renderDiarySortIndicators(container) {
    const table = container || document;
    const map = { date: 'Date', category: 'Category', description: 'Description' };
    table.querySelectorAll('.diary-header[data-key]').forEach(h => {
        const key = h.getAttribute('data-key');
        const label = map[key] || key;
        let arrow = '';
        if (diarySort && diarySort.key === key) {
            arrow = diarySort.dir === 'asc' ? ' \u25B2' : ' \u25BC'; // ▲ / ▼
            h.setAttribute('aria-sort', diarySort.dir === 'asc' ? 'ascending' : 'descending');
        } else {
            h.removeAttribute('aria-sort');
        }
        h.textContent = label + arrow;
    });
}

function setDiarySort(key) {
    if (diarySort.key === key) diarySort.dir = (diarySort.dir === 'asc' ? 'desc' : 'asc');
    else { diarySort.key = key; diarySort.dir = (key === 'date' ? 'desc' : 'asc'); }
    drawDiary();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
}


// Function to update localStorage for diary
function updateDiaryStorage() {
    localStorage.setItem('diaryEntries', JSON.stringify(diaryEntries));
}


function addDiaryEntry(description, date, category) {
    const entry = {
        id: Date.now(),
        description: description.replace(/\n/g, '<br>'),
        date: new Date(date).toISOString(),
        category: category,
        color: selectedColor || bgColors[Math.floor(Math.random() * bgColors.length)]
    };
    diaryEntries.push(entry);
    updateDiaryStorage();
    drawDiary();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
}

// Event listener to toggle between To-Do list and Worktime diary
diaryBtn.addEventListener("click", function () {
    diaryBtn.classList.remove('inactive');
    todoBtn.classList.add('inactive');
    worktimeBtn.classList.add('inactive');

    diaryContainer.style.display = "block";
    todoContainer.style.display = "none";
    worktimeContainer.style.display = "none";

    createDiaryMenu();
    addCategoryFilter();
    addSearchFilter(); // Add this line
    drawDiary();
});
function addCategoryFilter() {
    const existingFilter = document.querySelector('.diary-filter');
    if (existingFilter) {
        existingFilter.remove();
    }

    const defaultCategories = [
        "Life Event",
        "Purchase",
        "Item placement",
        "Data location change"
    ];
    
    const usedCategories = [...new Set(getSortedDiaryEntries(diaryEntries).map(entry => entry.category))];
    const allCategories = [...new Set([...defaultCategories, ...usedCategories])]
        .filter(category => category);
        
    const filterContainer = document.createElement('div');
    filterContainer.className = 'diary-filter';
    filterContainer.innerHTML = `
        <label for="categoryFilter">Display:</label>
        <select id="categoryFilter">
            <option value="all">All Categories</option>
            ${allCategories.map(category => 
                `<option value="${category}">${category}</option>`
            ).join('')}
        </select>
    `;
    
    document.getElementById('diaryList').before(filterContainer);
    
    document.getElementById('categoryFilter').addEventListener('change', applyDiaryFilters);
}

function drawDiary(entries = diaryEntries) {
    const data = Array.isArray(entries) ? entries : diaryEntries;
    const sorted = getSortedDiaryEntries(data);
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

    sorted.forEach(entry => {
        const date = new Date(entry.date);
        
        table.innerHTML += `
            <div class="diary-cell">${date.toLocaleDateString('fi-FI')}</div>
            <div class="diary-cell">${entry.category}</div>
            <div class="diary-cell">${entry.description}</div>
            <div class="diary-cell">
                <button onclick="editDiaryEntry(${entry.id})" class="btn-edit">Edit</button>
            </div>
            <div class="diary-cell">
                <button onclick="deleteDiaryEntry(${entry.id})" class="btn-delete">Delete</button>
            </div>
        `;
    });

    diaryList.appendChild(table);
    __renderDiarySortIndicators(diaryList);
    table.querySelectorAll('.diary-header[data-key]').forEach(h => {
        h.style.cursor = 'pointer';
        h.addEventListener('click', () => setDiarySort(h.getAttribute('data-key')));
    });
}
function exportDiaryText() {
    const textContent = getSortedDiaryEntries(diaryEntries).map(entry => {
        const date = new Date(entry.date);
        return `Date: ${date.toLocaleDateString('fi-FI')}\nCategory: ${entry.category}\nEntry: ${entry.description}\n---------------`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diary_export.txt';
    a.click();
}

// Call addCategoryFilter when switching to diary mode
diaryBtn.addEventListener("click", function () {
    diaryBtn.classList.remove('inactive');
    todoBtn.classList.add('inactive');
    worktimeBtn.classList.add('inactive');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById("diaryDate").value = today;

    worktimeContainer.style.display = "none";
    diaryContainer.style.display = "block";
    todoContainer.style.display = "none";

    document.getElementById('mainTitle').textContent = 'Diary';
    createDiaryMenu();
    addCategoryFilter();
    drawDiary();
});

/* Clear input btn */

const diaryInput = document.querySelector('#diaryInput');
const diaryClearButton = document.querySelector('.diary-clear-input');

// Show/hide diary clear button based on input content
diaryInput.addEventListener('input', () => {
    diaryClearButton.style.display = diaryInput.value ? 'block' : 'none';
});

// Clear diary input when button is clicked
diaryClearButton.addEventListener('click', () => {
    diaryInput.value = '';
    diaryClearButton.style.display = 'none';
    diaryInput.focus();
});

    

// Add form submit handler
document.getElementById('diaryForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const textarea = document.getElementById('diaryInput');
  const description = textarea.value.trim();
  const date = document.getElementById('diaryDate').value;
  const category = document.getElementById('diaryCategory').value;
  
  if (description !== '') {
      addDiaryEntry(description, date, category);
      textarea.value = '';
  } else {
      alert("Please enter a diary entry!");
  }
});

let editingDiaryId = null;

function editDiaryEntry(id) {
    const entry = diaryEntries.find(item => item.id === id);
    if (entry) {
        document.getElementById('diaryInput').value = entry.description.replace(/<br>/g, '\n');
        document.getElementById('diaryDate').value = new Date(entry.date).toISOString().split('T')[0];
        document.getElementById('diaryCategory').value = entry.category;
        
        const submitButton = diaryForm.querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Entry';
        
        editingDiaryId = id;
    }
}

function deleteDiaryEntry(id) {
    diaryEntries = diaryEntries.filter(item => item.id !== id);
    updateDiaryStorage();
    drawDiary();
}

function createDiaryMenu() {
    const menu = document.querySelector('.menu');
    const menuItems = [
        { id: 'exportDiaryBtn', text: 'Export as TXT' },
        { id: 'clearDiaryBtn', text: 'Delete all diary entries' },
        { id: 'copyLifeEventsBtn', text: 'Copy Life Events to Clipboard' },
        { id: 'copyPurchasesBtn', text: 'Copy Purchases to Clipboard' },
        { id: 'copyItemPlacementsBtn', text: 'Copy Item Placements to Clipboard' },
        { id: 'copyDataLocationsBtn', text: 'Copy Data Locations to Clipboard' },
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
    fileInput.innerHTML = '<input type="file" id="uploadDiaryInput" style="display: none" />';
    menu.appendChild(fileInput);

    attachDiaryMenuListeners();
}

function attachDiaryMenuListeners() {
    document.getElementById('exportDiaryBtn').addEventListener('click', exportDiaryText);
    document.getElementById('clearDiaryBtn').addEventListener('click', clearDiaryData);
    document.getElementById('backupBtn').addEventListener('click', handleBackup);
    document.getElementById('restoreBtn').addEventListener('click', handleRestore);
    //document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('copyLifeEventsBtn').addEventListener('click', () => copyEntriesByCategory('Life Event'));
    document.getElementById('copyPurchasesBtn').addEventListener('click', () => copyEntriesByCategory('Purchase'));
    document.getElementById('copyItemPlacementsBtn').addEventListener('click', () => copyEntriesByCategory('Item placement'));
    document.getElementById('copyDataLocationsBtn').addEventListener('click', () => copyEntriesByCategory('Data location change'));
}

function copyEntriesByCategory(category) {
    const entries = getSortedDiaryEntries(diaryEntries)
        .filter(entry => entry.category === category)
        .map(entry => {
            const date = new Date(entry.date);
            return `${date.toLocaleDateString()}: ${entry.description}`;
        })
        .join('\n');
        
    navigator.clipboard.writeText(entries)
        .then(() => {
            alert(`${category} entries copied to clipboard!`);
        });
}

function exportDiaryText() {
    const textContent = getSortedDiaryEntries(diaryEntries).map(entry => {
        const date = new Date(entry.date);
        return `Date: ${date.toLocaleDateString()}\nCategory: ${entry.category}\nEntry: ${entry.description}\n---------------`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diary_export.txt';
    a.click();
}

function clearDiaryData() {
    if (confirm('Are you sure you want to delete all diary entries?')) {
        diaryEntries = [];
        updateDiaryStorage();
        drawDiary();
    }
}

function backupDiary() {
    const data = JSON.stringify(diaryEntries);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diary_backup.json';
    a.click();
}

function restoreDiary() {
    document.getElementById('uploadDiaryInput').click();
}

function loginDiary() {
    alert('Login functionality coming soon!');
}
function addSearchFilter() {
    const existingSearch = document.querySelector('.diary-search');
    if (existingSearch) {
        existingSearch.remove();
    }

    const searchContainer = document.createElement('div');
    searchContainer.className = 'diary-search';
    searchContainer.innerHTML = `
        <input type="text" id="diarySearch" placeholder="Search diary entries...">
        <button class="clear-search">×</button>
    `;
    
    document.getElementById('diaryList').before(searchContainer);

    // Add search functionality
    const searchInput = document.getElementById('diarySearch');
    const clearSearch = document.querySelector('.clear-search');

    searchInput.addEventListener('input', applyDiaryFilters);

    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        applyDiaryFilters();
    });
}

function applyDiaryFilters() {
    const searchTerm = document.getElementById('diarySearch')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';
    
    const filteredEntries = diaryEntries.filter(entry => {
        const matchesSearch = entry.description.toLowerCase().includes(searchTerm) ||
            new Date(entry.date).toLocaleDateString().includes(searchTerm) ||
            entry.category.toLowerCase().includes(searchTerm);
            
        const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    drawDiary(filteredEntries);
}
