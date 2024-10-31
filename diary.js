// Diary entries array with localStorage support
let diaryEntries = JSON.parse(localStorage.getItem("diaryEntries")) || [];

// Function to update localStorage for diary
function updateDiaryStorage() {
    localStorage.setItem('diaryEntries', JSON.stringify(diaryEntries));
}

// Function to add new diary entry
function addDiaryEntry(description, date) {
    const entry = {
        id: Date.now(),
        description: description,
        date: new Date(date),
        color: selectedColor || bgColors[Math.floor(Math.random() * bgColors.length)]
    };
    diaryEntries.push(entry);
    updateDiaryStorage();
    drawDiary();
}

// Event listener to toggle between To-Do list and Worktime diary
diaryBtn.addEventListener("click", function () {
    //remove inactive class
    diaryBtn.classList.remove('inactive');
    //add inactive class
    todoBtn.classList.add('inactive');
    worktimeBtn.classList.add('inactive');

    // Get today's date in YYYY-MM-DD format for the date input
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("diaryDate").value = today;

    worktimeContainer.style.display = "none";
    diaryContainer.style.display = "block";
    todoContainer.style.display = "none";

    drawDiary();
});

function drawDiary() {
    diaryList.innerHTML = "";
    
    // Track currently selected filter
    const filterSelect = document.createElement("select");
    filterSelect.className = "diary-filter-select";
    
    // Add "Show All" option first
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Show All";
    filterSelect.appendChild(allOption);
    
    // Add all category options
    const categories = ["Life Event", "Purchase", "Item placement", "Data location change"];
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        filterSelect.appendChild(option);
    });

    // Add filter dropdown at the top of the list
    const filterContainer = document.createElement("div");
    filterContainer.className = "diary-filter-container";
    filterContainer.textContent = "Filter by category: ";
    filterContainer.appendChild(filterSelect);
    diaryList.appendChild(filterContainer);

    // Filter entries based on selected category
    filterSelect.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        drawDiaryEntries(selectedCategory);
    });

    // Initial draw of all entries
    drawDiaryEntries("");
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
}// Update form submit handler
document.getElementById('diaryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const description = document.getElementById('diaryInput').value.trim();
    const date = document.getElementById('diaryDate').value;
    const category = document.getElementById('diaryCategory').value;
    
    if (!description) {
        alert("Please enter a diary entry!");
        return;
    }
    
    addDiaryEntry(description, date, category);
    document.getElementById('diaryInput').value = '';
});