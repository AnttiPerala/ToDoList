
// Refactored diary.js

// Sorting State
let diarySort = { key: 'date', dir: 'desc' };

function getSortedDiaryEntries(list) {
    const arr = Array.from(list || window.diaryEntries);
    const { key, dir } = diarySort;
    const mult = dir === 'desc' ? -1 : 1;
    return arr.sort((a,b) => {
        let va, vb;
        if (key === 'date') { va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); }
        else if (key === 'category') { va = (a.category||'').toLowerCase(); vb = (b.category||'').toLowerCase(); }
        else { 
            const sa = (a.description||'').replace(/<br\s*\/?>/gi,'\n').toLowerCase();
            const sb = (b.description||'').replace(/<br\s*\/?>/gi,'\n').toLowerCase();
            va = sa; vb = sb;
        }
        if (va < vb) return -1*mult; if (va > vb) return 1*mult; return 0;
    });
}

function updateDiaryStorage() { localStorage.setItem('diaryEntries', JSON.stringify(window.diaryEntries)); }

function addDiaryEntry(description, date, category) {
    const entry = {
        id: Date.now(),
        description: description.replace(/\n/g, '<br>'),
        date: new Date(date).toISOString(),
        category: category
    };
    window.diaryEntries.push(entry);
    updateDiaryStorage();
    drawDiary();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
}

window.drawDiary = function(entries = window.diaryEntries) {
    const sorted = getSortedDiaryEntries(entries);
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
            <div class="diary-cell"><button onclick="editDiaryEntry(${entry.id})" class="btn-edit">Edit</button></div>
            <div class="diary-cell"><button onclick="deleteDiaryEntry(${entry.id})" class="btn-delete">Delete</button></div>
        `;
    });
    diaryList.appendChild(table);
    
    table.querySelectorAll('.diary-header[data-key]').forEach(h => {
        h.style.cursor = 'pointer';
        h.addEventListener('click', () => { 
             const key = h.getAttribute('data-key');
             if (diarySort.key === key) diarySort.dir = (diarySort.dir === 'asc' ? 'desc' : 'asc');
             else { diarySort.key = key; diarySort.dir = (key === 'date' ? 'desc' : 'asc'); }
             drawDiary();
        });
    });
}

let editingDiaryId = null;
window.editDiaryEntry = function(id) {
    const entry = window.diaryEntries.find(item => item.id === id);
    if (entry) {
        document.getElementById('diaryInput').value = entry.description.replace(/<br>/g, '\n');
        document.getElementById('diaryDate').value = new Date(entry.date).toISOString().split('T')[0];
        document.getElementById('diaryCategory').value = entry.category;
        
        const submitButton = document.getElementById('diaryForm').querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Entry';
        editingDiaryId = id;
    }
}

window.deleteDiaryEntry = function(id) {
    window.diaryEntries = window.diaryEntries.filter(item => item.id !== id);
    updateDiaryStorage();
    drawDiary();
}

function addCategoryFilter() {
    const existingFilter = document.querySelector('.diary-filter');
    if (existingFilter) existingFilter.remove();

    const defaultCategories = ["Life Event", "Purchase", "Item placement", "Data location change"];
    const usedCategories = [...new Set(getSortedDiaryEntries(window.diaryEntries).map(entry => entry.category))];
    const allCategories = [...new Set([...defaultCategories, ...usedCategories])].filter(category => category);
        
    const filterContainer = document.createElement('div');
    filterContainer.className = 'diary-filter';
    filterContainer.innerHTML = `
        <label for="categoryFilter">Display:</label>
        <select id="categoryFilter"><option value="all">All Categories</option>${allCategories.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    `;
    
    document.getElementById('diaryList').before(filterContainer);
    document.getElementById('categoryFilter').addEventListener('change', applyDiaryFilters);
}

function addSearchFilter() {
    const existingSearch = document.querySelector('.diary-search');
    if (existingSearch) existingSearch.remove();
    const searchContainer = document.createElement('div');
    searchContainer.className = 'diary-search';
    searchContainer.innerHTML = `<input type="text" id="diarySearch" placeholder="Search diary entries..."><button class="clear-search">×</button>`;
    document.getElementById('diaryList').before(searchContainer);
    
    document.getElementById('diarySearch').addEventListener('input', applyDiaryFilters);
    document.querySelector('.clear-search').addEventListener('click', function() {
        document.getElementById('diarySearch').value = '';
        applyDiaryFilters();
    });
}

function applyDiaryFilters() {
    const searchTerm = document.getElementById('diarySearch')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';
    
    const filteredEntries = window.diaryEntries.filter(entry => {
        const matchesSearch = entry.description.toLowerCase().includes(searchTerm) ||
            new Date(entry.date).toLocaleDateString().includes(searchTerm) ||
            entry.category.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });
    drawDiary(filteredEntries);
}

function createDiaryMenu() {
    const menu = document.querySelector('.menu');
    // ADDED LOGIN LINK with COLORS FIXED
    const loginLink = (typeof wpAppData !== 'undefined') ? wpAppData.login_url : '#';
    menu.innerHTML = `
        <li><a href="#" id="exportDiaryBtn">Export as TXT</a></li>
        <li><a href="#" id="clearDiaryBtn">Delete all diary entries</a></li>
        <li><a href="#" id="copyLifeEventsBtn">Copy Life Events to Clipboard</a></li>
        <li><a href="#" id="copyPurchasesBtn">Copy Purchases to Clipboard</a></li>
        <li><a href="#" id="copyItemPlacementsBtn">Copy Item Placements to Clipboard</a></li>
        <li><a href="#" id="copyDataLocationsBtn">Copy Data Locations to Clipboard</a></li>
        <li><a href="#" id="backupBtn">Backup App</a></li>
        <li><a href="#" id="restoreBtn">Restore</a></li>
        <li><input type="file" id="uploadDiaryInput" style="display: none" /></li>
        <li style="border-top:1px solid #ccc; background:#f9f9f9; color:#333;">
            <a href="${loginLink}" style="color:#0070f3; font-weight:bold;">Login / Register</a> 
            <span class="note" style="margin-left:5px; font-size:0.8em; opacity:0.8; color:#333;">(if you want cloud sync)</span>
        </li>
    `;

    setTimeout(() => {
        document.getElementById('exportDiaryBtn').addEventListener('click', exportDiaryText);
        document.getElementById('clearDiaryBtn').addEventListener('click', clearDiaryData);
        document.getElementById('backupBtn').addEventListener('click', handleBackup);
        document.getElementById('restoreBtn').addEventListener('click', handleRestore);
        document.getElementById('copyLifeEventsBtn').addEventListener('click', () => copyEntriesByCategory('Life Event'));
        document.getElementById('copyPurchasesBtn').addEventListener('click', () => copyEntriesByCategory('Purchase'));
        document.getElementById('copyItemPlacementsBtn').addEventListener('click', () => copyEntriesByCategory('Item placement'));
        document.getElementById('copyDataLocationsBtn').addEventListener('click', () => copyEntriesByCategory('Data location change'));
    }, 500);
}

function copyEntriesByCategory(category) {
    const entries = getSortedDiaryEntries(window.diaryEntries)
        .filter(entry => entry.category === category)
        .map(entry => {
            const date = new Date(entry.date);
            return `${date.toLocaleDateString()}: ${entry.description}`;
        })
        .join('\n');
        
    navigator.clipboard.writeText(entries).then(() => { alert(`${category} entries copied!`); });
}

function exportDiaryText() {
    const textContent = getSortedDiaryEntries(window.diaryEntries).map(entry => {
        const date = new Date(entry.date);
        return `Date: ${date.toLocaleDateString()}\nCategory: ${entry.category}\nEntry: ${entry.description}\n---------------`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'diary_export.txt'; a.click();
}

function clearDiaryData() {
    if (confirm('Are you sure you want to delete all diary entries?')) {
        window.diaryEntries = [];
        updateDiaryStorage();
        drawDiary();
    }
}

const dForm = document.getElementById('diaryForm');
if(dForm) {
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
                 window.diaryEntries[idx].description = description.replace(/\n/g, '<br>');
                 window.diaryEntries[idx].date = new Date(date).toISOString();
                 window.diaryEntries[idx].category = category;
             }
             editingDiaryId = null;
             dForm.querySelector('button[type="submit"]').textContent = 'Add Entry';
             updateDiaryStorage();
             drawDiary();
          } else {
             addDiaryEntry(description, date, category);
          }
          textarea.value = '';
      }
    });
}

if(window.diaryBtn) {
    window.diaryBtn.addEventListener("click", function () {
        window.diaryBtn.classList.remove('inactive');
        window.todoBtn.classList.add('inactive');
        window.worktimeBtn.classList.add('inactive');
        window.diaryContainer.style.display = "block";
        window.todoContainer.style.display = "none";
        window.worktimeContainer.style.display = "none";
        document.getElementById('mainTitle').textContent = 'Diary';
        if (typeof updateHeaderStats === 'function') updateHeaderStats();
        
        createDiaryMenu();
        addCategoryFilter();
        addSearchFilter();
        drawDiary();
    });
}
