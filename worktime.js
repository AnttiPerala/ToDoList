// Assuming that the same JSON structure for the to-do list is used for worktime entries, 
// let's add a new worktime functionality that allows users to switch to a worktime diary and record work sessions.

// Add HTML for worktime button and container in index.html
// Note: This part is ideally placed within the appropriate container in your index.html
/*
<button id="worktimeBtn" class="button-30">Worktime</button>
<div id="worktimeContainer" style="display: none;">
  <form id="worktimeForm">
    <input type="text" id="workDescription" placeholder="Enter work description" required />
    <input type="datetime-local" id="workStart" required />
    <input type="datetime-local" id="workEnd" required />
    <button type="submit" class="button-30">Add Worktime</button>
  </form>
  <ul id="worktimeList"></ul>
</div>
*/

// JavaScript code to handle the worktime tab functionality
const worktimeBtn = document.getElementById("btnWorktimeMode");
const todoBtn = document.getElementById("btnTodoMode"); // Assuming there's a button for To-Do list with this ID
const diaryBtn =  document.getElementById("btnDiaryMode");
const worktimeContainer = document.getElementById("worktimeModeWrap");
const diaryContainer = document.getElementById("diaryModeWrap");
const todoContainer = document.getElementById("todoModeWrap"); // Assuming the to-do list container has this ID
const worktimeForm = document.getElementById("worktimeForm");
const worktimeList = document.getElementById("worktimeList");
const diaryForm = document.getElementById("diaryForm");
const diaryList = document.getElementById("diaryList");

// Worktime entries array
let worktimes = JSON.parse(localStorage.getItem("worktimes")) || [];

// Event listener to toggle between To-Do list and Worktime diary
worktimeBtn.addEventListener("click", function () {
    //remove inactive class
    worktimeBtn.classList.remove('inactive');
    //add inactive class
    todoBtn.classList.add('inactive');

    diaryBtn.classList.add('inactive');



      // Populate worktime form with current date and time
  const now = new Date().toISOString().slice(0, 16);
  document.getElementById("workStart").value = now;
  document.getElementById("workEnd").value = now;
  // Hide To-Do container and show Worktime container
  todoContainer.style.display = "none";
  diaryContainer.style.display = "none";
  worktimeContainer.style.display = "block";
  drawWorktimes();
});

// Function to draw worktime entries
function drawWorktimes() {
  // Clear the current list
  worktimeList.innerHTML = "";

  // Loop through worktime entries and create list items
  worktimes.forEach((worktime, index) => {
    const li = document.createElement("li");
    li.className = "worktimeItem";

    const workDescription = document.createElement("span");
    workDescription.textContent = `${worktime.description} - Start: ${formatDateTimeForDisplay(worktime.start)} - End: ${formatDateTimeForDisplay(worktime.end)}`;
    li.appendChild(workDescription);

    // Delete button for each worktime entry
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "button-30";
    deleteBtn.addEventListener("click", function () {
      deleteWorktime(index);
    });
    li.appendChild(deleteBtn);

    worktimeList.appendChild(li);
  });
}

// Function to add a new worktime entry
worktimeForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const workDescription = document.getElementById("workDescription").value;
  const workStart = document.getElementById("workStart").value;
  const workEnd = document.getElementById("workEnd").value;

  // Create new worktime object
  const newWorktime = {
    description: workDescription,
    start: workStart,
    end: workEnd,
  };

  // Add to worktimes array and save to localStorage
  worktimes.push(newWorktime);
  localStorage.setItem("worktimes", JSON.stringify(worktimes));

  // Redraw the worktime list
  drawWorktimes();

  // Clear the form
  worktimeForm.reset();
});

// Function to delete a worktime entry
function deleteWorktime(index) {
  worktimes.splice(index, 1);
  localStorage.setItem("worktimes", JSON.stringify(worktimes));
  drawWorktimes();
}

// Utility function to format date-time for display (reusing the function from todo.js)
function formatDateTimeForDisplay(isoString) {
  if (!isoString) return "";
  const dateObj = new Date(isoString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return dateObj.toLocaleString(undefined, options);
}

// Initial draw of worktime entries when page loads
drawWorktimes();



// Integration for switching back to To-Do list from Worktime
todoBtn.addEventListener("click", function () {
  // Hide Worktime container and show To-Do container
  worktimeContainer.style.display = "none";
  diaryContainer.style.display = "none";
  todoContainer.style.display = "block";

  worktimeBtn.classList.add('inactive');
  //add inactive class
  todoBtn.classList.remove('inactive');

  diaryBtn.classList.add('inactive');


  drawTodos(); // Assuming there is a function drawTodos() for displaying to-do items
});
