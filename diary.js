// Worktime entries array
let diaryEntries = JSON.parse(localStorage.getItem("diaryEntries")) || [];

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
  document.getElementById("diaryStart").value = now;
  document.getElementById("diaryEnd").value = now;
  // Hide To-Do container and show Worktime container
  todoContainer.style.display = "none";
  diaryContainer.style.display = "block";
  drawDiary();
});


// Function to draw worktime entries
function drawDiary() {
    // Clear the current list
    diaryList.innerHTML = "Diary feature coming soon!";
  
    // Loop through worktime entries and create list items
    diaryEntries.forEach((diaryentry, index) => {
      const li = document.createElement("li");
      li.className = "diaryItem";
  
      const diaryDescription = document.createElement("span");
      diaryDescription.textContent = `${diaryentry.description} - Start: ${formatDateTimeForDisplay(worktime.start)} - End: ${formatDateTimeForDisplay(worktime.end)}`;
      li.appendChild(diaryDescription);
  
      // Delete button for each worktime entry
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "button-30";
      deleteBtn.addEventListener("click", function () {
        deleteDiaryEntry(index);
      });
      li.appendChild(deleteBtn);
  
      diaryList.appendChild(li);
    });
  }