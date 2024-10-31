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
    worktimeContainer.style.display = "none";
    diaryContainer.style.display = "block";
    todoContainer.style.display = "none";

    // Populate worktime form with current date and time
    const now = new Date().toISOString().slice(0, 16);
    document.getElementById("diaryDate").value = now;
    // Hide To-Do container and show Worktime container
    todoContainer.style.display = "none";
    diaryContainer.style.display = "block";
    drawDiary();
});

// Enhanced draw diary function
function drawDiary() {
    diaryList.innerHTML = "";
    
    diaryEntries.forEach((entry, index) => {
        const li = document.createElement("li");
        li.className = "diaryItem";
        li.style.backgroundColor = entry.color;

        // Create category dropdown for each entry
        const categorySelect = document.createElement("select");
        categorySelect.className = "diary-category-select";
        
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

        // Add change listener to update category
        categorySelect.addEventListener('change', (e) => {
            entry.category = e.target.value;
            updateDiaryStorage();
        });

        const dateSpan = document.createElement("span");
        dateSpan.className = "diary-date";
        dateSpan.textContent = new Date(entry.date).toLocaleDateString();
        
        const descriptionSpan = document.createElement("span");
        descriptionSpan.className = "diary-description";
        descriptionSpan.textContent = entry.description;

        // Add all elements to the list item
        li.appendChild(categorySelect);
        li.appendChild(dateSpan);
        li.appendChild(descriptionSpan);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "button-30";
        deleteBtn.onclick = () => {
            diaryEntries.splice(index, 1);
            updateDiaryStorage();
            drawDiary();
        };

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "button-30";
        editBtn.onclick = () => {
            const newText = prompt("Edit diary entry:", entry.description);
            if (newText !== null) {
                entry.description = newText;
                updateDiaryStorage();
                drawDiary();
            }
        };

        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        diaryList.appendChild(li);
    });
}
// Update form submit handler
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