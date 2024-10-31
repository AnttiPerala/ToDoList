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

    const today = new Date().toISOString().split('T')[0];
    document.getElementById("diaryDate").value = today;

    worktimeContainer.style.display = "none";
    diaryContainer.style.display = "block";
    todoContainer.style.display = "none";

    drawDiary();
});

function drawDiary() {
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

    diaryEntries.forEach(entry => {
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

function drawDiaryEntries(filterCategory) {
    // Clear existing entries
    const existingEntries = document.querySelectorAll('.diaryItem');
    existingEntries.forEach(entry => entry.remove());
    
    // Filter and display entries
    const filteredEntries = filterCategory 
        ? diaryEntries.filter(entry => entry.category === filterCategory)
        : diaryEntries;

    filteredEntries.forEach((entry, index) => {
        const li = document.createElement("li");
        li.className = "diaryItem";
        li.style.backgroundColor = entry.color;

        const dateSpan = document.createElement("span");
        dateSpan.className = "diary-date";
        dateSpan.textContent = new Date(entry.date).toLocaleDateString();
        
        const descriptionSpan = document.createElement("span");
        descriptionSpan.className = "diary-description";
        descriptionSpan.innerHTML = entry.description; // Use innerHTML to render the <br> tags

        // Create category dropdown
        const categorySelect = document.createElement("select");
        categorySelect.className = "diary-category-select";
        
        // Add empty option first
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "No category";
        categorySelect.appendChild(emptyOption);
        
        const categories = ["Life Event", "Purchase", "Item placement", "Data location change"];
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            if (entry.category === category) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });

        categorySelect.addEventListener('change', (e) => {
            entry.category = e.target.value;
            updateDiaryStorage();
        });

        li.appendChild(dateSpan);
        li.appendChild(descriptionSpan);
        li.appendChild(categorySelect);
        
        diaryList.appendChild(li);
    });
}


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
