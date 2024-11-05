// Diary entries array with localStorage support
let diaryEntries = JSON.parse(localStorage.getItem("diaryEntries")) || [];

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
    
    const usedCategories = [...new Set(diaryEntries.map(entry => entry.category))];
    const allCategories = [...new Set([...defaultCategories, ...usedCategories])]
        .filter(category => category);
        
    const filterContainer = document.createElement('div');
    filterContainer.className = 'diary-filter';
    filterContainer.innerHTML = `
        <select id="categoryFilter">
            <option value="all">All Categories</option>
            ${allCategories.map(category => 
                `<option value="${category}">${category}</option>`
            ).join('')}
        </select>
    `;
    
    document.getElementById('diaryList').before(filterContainer);
    
    document.getElementById('categoryFilter').addEventListener('change', function() {
        drawDiary(this.value);
    });
}

function drawDiary(filterCategory = 'all') {
    const diaryList = document.getElementById('diaryList');
    const table = document.createElement('div');
    table.className = 'diary-table';
    
    table.innerHTML = `
        <div class="diary-header">Date</div>
        <div class="diary-header">Category</div>
        <div class="diary-header">Description</div>
        <div class="diary-header">Edit</div>
        <div class="diary-header">Delete</div>
    `;

    const filteredEntries = filterCategory === 'all' 
        ? diaryEntries 
        : diaryEntries.filter(entry => entry.category === filterCategory);

    filteredEntries.forEach(entry => {
        const date = new Date(entry.date);
        
        table.innerHTML += `
            <div class="diary-cell">${date.toLocaleDateString()}</div>
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

    diaryList.innerHTML = '';
    diaryList.appendChild(table);
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
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('copyLifeEventsBtn').addEventListener('click', () => copyEntriesByCategory('Life Event'));
    document.getElementById('copyPurchasesBtn').addEventListener('click', () => copyEntriesByCategory('Purchase'));
    document.getElementById('copyItemPlacementsBtn').addEventListener('click', () => copyEntriesByCategory('Item placement'));
    document.getElementById('copyDataLocationsBtn').addEventListener('click', () => copyEntriesByCategory('Data location change'));
}

function copyEntriesByCategory(category) {
    const entries = diaryEntries
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
    const textContent = diaryEntries.map(entry => {
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
