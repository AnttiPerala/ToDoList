const todoBtn = document.getElementById("btnTodoMode"); // Assuming there's a button for To-Do list with this ID

document.getElementById('mainTitle').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});


function rgbToHex(rgbStr) {
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgbStr);
    if (result) {
        return "#" + (1 << 24 | result[1] << 16 | result[2] << 8 | result[3]).toString(16).slice(1).toUpperCase();
    } else {
        return rgbStr; // Return original string if it's not in RGB format
    }
}

let filteredTodos = todos;  // GLOBAL VAR FOR CATEGORY FILTERING


// Function to update localStorage
function updateLocalStorage() {
    localStorage.setItem('todos', JSON.stringify(todos));
}



let bgColors = ["#F0F8FF", "#F0FFF0", "#FFF5EE", "#F5F5F5", "#FFFACD", "#FFDAB9", "#FFE4E1", "#FFF0F5", "#FAF0E6", "#FDF5E6"];

// Define a variable to store the selected color
let selectedColor;

let notificationToggle = document.getElementById('notificationToggle');

function getLocalStorage() {
    let todoLocal = JSON.parse(localStorage.getItem('todos'));
    if (todoLocal) {
        todos = todoLocal.map(todo => {
            if (todo.deadline) {
                todo.deadline = new Date(todo.deadline);
            }
            return todo;
        });
    }
}

getLocalStorage();

const form = document.getElementById('todoForm');
const input = document.getElementById('todoInput');
const list = document.getElementById('todoList');

//SUBMIT NEW TODO (ADDBTN)
form.addEventListener('submit', (e) => {

        e.preventDefault();

        // Check if the input value is empty or whitespace
            const trimmedInput = input.value.trim();
            if (!trimmedInput) {
                alert("Please enter a task before submitting!");
                return; // Exit early from the event listener
            }

        const topPriorityInput = document.getElementById('topPriorityCheck');
        const midPriorityCheck = document.getElementById('midPriorityCheck');

    // Add event listeners to the checkboxes
    topPriorityCheck.addEventListener('change', function() {
        if (this.checked) {
            midPriorityCheck.checked = false;
        }
    });

    midPriorityCheck.addEventListener('change', function() {
        if (this.checked) {
            topPriorityCheck.checked = false;
        }
    });

    // Calculate the current maximum votes
    let maxVotes = Math.max(...todos.map(todo => todo.votes));

    // Calculate the average votes
    let sumVotes = todos.reduce((acc, todo) => acc + todo.votes, 0);
    let averageVotes = todos.length ? Math.max(1, Math.round(sumVotes / todos.length)) : 1; 

    const detailsTextarea = document.querySelector('.detailsTextarea');

    const categoryValue = document.getElementById('categorySelect').value;


    let newTodo = {
        id: Date.now(),
        text: trimmedInput,
        votes: topPriorityInput.checked ? maxVotes + 1 : midPriorityCheck.checked ? averageVotes : 0,
        deadline: deadlineInput.value ? new Date(deadlineInput.value) : null,
        done: false,
        bgColor: selectedColor,
        details: detailsTextarea ? detailsTextarea.value : null,
        category: categoryValue
    }

    todos.push(newTodo);

        updateLocalStorage();
        applyPreferredSorting();

        input.value = '';
        deadlineInput.value = '';
        topPriorityInput.checked = false; // Reset the checkbox

        // generate a random index for color selection
        let randomIndex = Math.floor(Math.random() * colorOptions.length);

        // set the button background to the random color
        button.style.backgroundColor = colorOptions[randomIndex].style.backgroundColor;

        //set the selected color variable also
        selectedColor = colorOptions[randomIndex].style.backgroundColor;

        drawTodos();
        document.getElementById('detailsContainer').innerHTML = '';

        //showToast("Todo item submitted!");

        let wavebutton = document.querySelector('.submitTodo');
  
        let wave = document.createElement('div');
        wave.classList.add('wave', 'animate');
        wavebutton.textContent = 'Added!';
        wavebutton.appendChild(wave);
        
        
        wave.addEventListener('animationend', function() {
          wave.remove();
          wavebutton.textContent = 'Add';
        });

}); //end form submit

/* TOAST messages */

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerHTML = message;
    toast.className = "toast show";
    setTimeout(function() { 
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}



function drawTodos() {
    let list = document.querySelector('#todoList');
    list.innerHTML = '';

    // Get today's date at midnight for comparison
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    //update filtered
    let categoryDrodown = document.getElementById('categorySelect');
    filterTodosByCategory(categoryDrodown.value);
    
    filteredTodos.forEach(todo => {
        let listItem = document.createElement('li');

         // Check if the todo has a timeAdded property, and use it, otherwise use id
        let timeAddedValue = todo.timeAdded ? new Date(todo.timeAdded).toLocaleString() : new Date(todo.id).toLocaleString();
    

        // Embed the time added as a data-attribute
        listItem.setAttribute('data-timeAdded', timeAddedValue);

        // If there's a timeDone value, embed it as a data-attribute
        if (todo.timeDone) {
        listItem.setAttribute('data-timeDone', new Date(todo.timeDone).toLocaleString());
        }

        // Set the id of the list item
        listItem.id = todo.id;

        //add details as data attribute
        if (todo.details) {
            listItem.setAttribute('data-details', todo.details);
        }

        let todoText = document.createElement('span');
        todoText.classList.add("toDoText");
        todoText.textContent = todo.text;

        let voteDisplay = document.createElement('span');
        voteDisplay.classList.add('votes');
        voteDisplay.textContent = `Votes: ${todo.votes}`;
        voteDisplay.dataset.id = todo.id;  // Add this line
        voteDisplay.addEventListener('dblclick', function() {  // Add this block
            console.log('click');
            editVotes(todo.id);
        });

        //add info buttons
        let infoBtn = document.createElement('button');
        infoBtn.classList.add("info-button");
        infoBtn.innerHTML = '<span>i</span>';

    // Modify the Info Button Functionality
    infoBtn.addEventListener('click', (e) => {
        resetModal();
        let listItem = e.target.closest('li'); 
    
        if (!listItem) return; 
    
        let timeAdded = listItem.getAttribute('data-timeAdded');
        let timeDoneValue = listItem.getAttribute('data-timeDone');
    
        let timeDone;
    
        if (timeDoneValue) {  // Check if the attribute exists and is not null
            timeDone = new Date(timeDoneValue).toLocaleString();
        } else {
            timeDone = "Not done yet";
        }
    
        let details = listItem.getAttribute('data-details');

        let toDoTextElement = listItem.querySelector('.toDoText');

        let formattedDeadline = todo.deadline ? formatDateToDateTimeLocal(todo.deadline) : "No deadline set";

        showDetails(todo.id,`
        <p class="detailsMainText">Text: <span class="value">${toDoTextElement.textContent}</span></p>
        <p class="detailsCategory">Category: <span class="value">${todo.category ? todo.category : "None"}</span></p>
        <p class="detailsVotes">Votes: <span class="value">${todo.votes}</span></p>
        <p class="detailsDate">Time Added: <span class="value" data-iso="${listItem.getAttribute('data-timeAdded')}">${formatDateTimeForDisplay(listItem.getAttribute('data-timeAdded'))}</span></p>
        <p class="detailsDeadline">Deadline: <span class="value" data-iso="${todo.deadline}">${formatDateTimeForDisplay(todo.deadline)}</span></p>
        <p class="detailsTimeDone">Done: <span class="value">${todo.timeDone ? formatDateToDateTimeLocal(todo.timeDone) : "Not done yet"}</span></p> 
        <p class="detailsBgColor">Background Color: <span class="value"><div class="colorBox" style="background-color: ${rgbToHex(todo.bgColor) || "#ffffff"}"; width: 20px; height: 20px;"></div></span></p>
        <p class="detailsDetails">Additional details: <span class="value">${details ? details : "None"}</span></p>`);
    

    
        
    });
    
    



        // Add buttons for upvote, downvote and delete
        let upvoteBtn = document.createElement('button');
        upvoteBtn.classList.add("button-30");
        upvoteBtn.textContent = 'Upvote';
        upvoteBtn.addEventListener('click', () => upvote(todo.id));

        let downvoteBtn = document.createElement('button');
        downvoteBtn.classList.add("button-30");
        downvoteBtn.textContent = 'Downvote';
        downvoteBtn.addEventListener('click', () => downvote(todo.id));

        let doneBtn = document.createElement('button');
        doneBtn.classList.add("button-30");
        doneBtn.textContent = 'Done';
        doneBtn.addEventListener('click', () => doneTodo(todo.id));

        let deleteBtn = document.createElement('button');
        deleteBtn.classList.add("button-30");
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

      // Add a display for the deadline
let deadlineDisplay = document.createElement('span');
if (todo.deadline) {
    // Ensure that todo.deadline is a Date object
    if (!(todo.deadline instanceof Date)) {
        todo.deadline = new Date(todo.deadline);
    }

    // If it's a valid date after attempting conversion
    if (!isNaN(todo.deadline.getTime())) {
        deadlineDisplay.textContent = `Deadline: ${todo.deadline.toDateString()}`;
    } else {
        deadlineDisplay.textContent = `Deadline: Invalid Date`; // or handle it some other way
    }
}

        
        listItem.appendChild(todoText);
        listItem.appendChild(deadlineDisplay);
        listItem.appendChild(voteDisplay);
        listItem.appendChild(infoBtn);
        listItem.appendChild(upvoteBtn);
        listItem.appendChild(downvoteBtn);
        listItem.appendChild(deleteBtn);
        listItem.appendChild(doneBtn);


        // Make the list item draggable
        listItem.setAttribute('draggable', 'true');

        listItem.style.backgroundColor = rgbToHex(todo.bgColor) ?? '#fff'; //, if todo.bgColor is a value that isn't null or undefined, it will be used. If todo.bgColor is null or undefined, the string '#fff' will be used instead.

        // Add drag and drop event listeners
        listItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', todo.id);
        });

        todoText.addEventListener('dblclick', function(e) {
            e.preventDefault();
            editTodo(todo.id);
        });

        if (todo.done) {
            listItem.classList.add('done');
        }

        listItem.classList.add('listItem');
        list.appendChild(listItem);

        // Rest of the list item creation code...

           // If the deadline is within the next hour and we haven't already notified the user
           if (todo.deadline && !todo.notified && todo.deadline - new Date() <= 60 * 60 * 1000 && notificationToggle.checked) {
            new Notification('To-do item deadline approaching', { body: `Your to-do item "${todo.text}" is due within the next hour.` });
            todo.notified = true;
            updateLocalStorage();
        }
    }); /* end foreach todo */
}

function doneTodo(id) {
    let todo = todos.find(t => t.id === id);
    todo.done = !todo.done; //toggle

    // If it's marked as done, set the timeDone. Otherwise, set it to null
    if (todo.done) {
        todo.timeDone = new Date().toISOString();
    } else {
        todo.timeDone = null;
    }

    applyPreferredSorting();
    updateLocalStorage();
    drawTodos();
}

function deleteTodo(id) {
    let todo = todos.find(t => t.id === id);

    // Ask for confirmation
    let isConfirmed = window.confirm(`Are you sure you want to delete the todo: "${todo.text}"?`);

    if (isConfirmed) {
        console.log("Deleted todo with text: " + todo.text)
        // Filter out the todo with the given id (which will delete it)
        todos = todos.filter(todo => todo.id !== id);

        applyPreferredSorting();
        updateLocalStorage();
        drawTodos();
    }
}



// Initial drawing of todos
drawTodos();

function upvote(id) {
    let todo = todos.find(t => t.id === id);
    todo.votes++;
    applyPreferredSorting();
    updateLocalStorage();
    drawTodos();
}



function downvote(id) {
    let todo = todos.find(t => t.id === id);
    todo.votes--;
    applyPreferredSorting();
    updateLocalStorage();
    drawTodos();
}

list.addEventListener('dragover', (e) => {
    e.preventDefault();
});

list.addEventListener('drop', (e) => {
    e.preventDefault();

    // Get the id of the dragged todo
    let id = parseInt(e.dataTransfer.getData('text/plain'));

    // Find the index of the dragged todo
    let index = todos.findIndex(t => t.id === id);

    // Remove the todo from the old position
    let [todo] = todos.splice(index, 1);

    // Get the todo over which the dragged todo was dropped
    let dropTargetId = parseInt(e.target.closest('li').dataset.id);

    // Find the index of the drop target
    let dropTargetIndex = todos.findIndex(t => t.id === dropTargetId);

    // Add the todo at the new position
    todos.splice(dropTargetIndex, 0, todo);

    updateLocalStorage();
    drawTodos();
});

const submitTodoButton = document.querySelector('.submitTodo');




/* DOUBLE CLICK TO EDIT TEXT */



function editTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    const listItem = document.getElementById(id); // Gets the list item by id

    console.log("hello from editTodo");

    // Create a new input field and set its value to the todo text
    const input = document.createElement('input');
    input.value = todo.text;

    // When the input loses focus or the enter key is pressed, update the todo text and redraw the list
    input.addEventListener('blur', updateTodoText);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            updateTodoText(e);
        }
    });

    function updateTodoText(e) {
        todo.text = e.target.value;
        drawTodos();
        updateLocalStorage();
    }

    // Replace the todo text with the input field
    listItem.textContent = '';
    listItem.appendChild(input);

    // Focus the input field
    input.focus();
}

/* DOUBLE CLICK TO EDIT VOTES */

function editVotes(id) {
    const todo = todos.find(todo => todo.id === id);
    const voteDisplay = document.querySelector(`.votes[data-id='${id}']`);

    console.log("hello from editVotes");

    // Create a new input field and set its value to the todo text
    const input = document.createElement('input');
    input.type = 'number';
    input.value = todo.votes;

    // When the input loses focus or the enter key is pressed, update the todo text and redraw the list
    input.addEventListener('blur', updateTodoVotes);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            updateTodoVotes(e);
        }
    });

    function updateTodoVotes(e) {
        todo.votes = parseInt(e.target.value);
        applyPreferredSorting();
        updateLocalStorage();
        drawTodos();
    }

    // Replace the todo text with the input field
    voteDisplay.textContent = '';
    voteDisplay.appendChild(input);

    // Focus the input field
    input.focus();
}


/* BROWSER NOTIFICATIONS */



notificationToggle.addEventListener('change', function() {
    if (this.checked) {
        if (Notification.permission === 'granted') {
            // If it's okay let's create a notification
            return;
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(function (permission) {
                if (permission === 'granted') {
                    console.log('Permission granted!');
                } else {
                    console.log('Permission not granted.');
                    // User didn't grant permission, uncheck the checkbox
                    notificationToggle.checked = false;
                }
            });
        }
    }
});

/* TEST NOTIFICATIONS */

document.querySelector("#testNotification").addEventListener('click', () => {
    if (Notification.permission === "granted") {
        new Notification("Test Notification", {
            body: "This is a test notification",
            icon: "" // You can provide a URL for an icon here
        });
    } else {
        console.log("Permission for notifications is not granted");
    }
});


/* ONLY SHOW THE NOTIFICATION OPTION IF RUNNING FROM A SERVER */

window.onload = function() {
    console.log("loaded");

    //filter to none
    let categoryDrodown = document.getElementById('categorySelect');
    filterTodosByCategory(categoryDrodown.value);
  
    const protocol = window.location.protocol;
    const notificationCheckbox = document.getElementById('notificationWrap');

    if ((protocol === 'http:' || protocol === 'https:') && window.innerWidth >= 800) {
        notificationCheckbox.style.display = "block";
    } else {
        notificationCheckbox.style.display = "none";
    }
    applyPreferredSorting();

    /* DETAILS EDITING */
    const detailsModal = document.getElementById('detailsModal');
    const detailsTextElem = document.getElementById('detailsText');
    const saveDetailsBtn = document.getElementById('saveDetailsBtn');
    let isEditing = false;  // A flag to track the editing state
    
    const classNameToObjectPropMap = {
        "detailsMainText": "text",
        "detailsVotes": "votes",
        "detailsDate": "timeAdded",
        "detailsDeadline": "deadline",  // New mapping for the deadline
        "detailsTimeDone": "timeDone",
        "detailsDetails": "details",
        'detailsBgColor': 'bgColor',
        'detailsCategory': 'category',


    };
    
    saveDetailsBtn.addEventListener('click', () => {
        const valueSpans = detailsTextElem.querySelectorAll('.value');
        const todoId = detailsModal.getAttribute('data-todo-id');
        let todoToUpdate = todos.find(todo => todo.id === Number(todoId));
        console.log("Initial todoToUpdate:", todoToUpdate);
    
        const colorBox = document.querySelector('.colorBox'); // Move this line outside the loop
        if (isEditing) {
            // Save Changes logic
            valueSpans.forEach(span => {
                let valueToUse;
                const input = span.querySelector('input');
                const textarea = span.querySelector('textarea');
                
                const detailTypeClass = span.closest('p').classList[0];
                const todoProp = classNameToObjectPropMap[detailTypeClass];
        
                if (input) {
                    valueToUse = input.value;
                } else if (textarea) {
                    valueToUse = textarea.value;
                    span.textContent = valueToUse; // Convert textarea back to text
                }
        
                switch (todoProp) {
                    case 'votes':
                        todoToUpdate[todoProp] = Number(valueToUse);
                        span.textContent = valueToUse;  // Convert votes input back to text
                        break;
                    case 'bgColor':
                        const colorInput = span.querySelector('input[type="color"]');
                        if (colorInput) {
                            todoToUpdate['bgColor'] = colorInput.value;
                            span.innerHTML = ''; // Clear out the input field
                            colorBox.style.backgroundColor = colorInput.value; // Set the colorBox's background to the chosen color
                            colorBox.style.display = 'block'; // Display the colorBox
                        }
                        break;
                        case 'category':
                            const categorySelect = span.querySelector('select');
                            if (categorySelect) {
                                todoToUpdate[todoProp] = categorySelect.value === 'none' ? null : categorySelect.value;
                                span.textContent = todoToUpdate[todoProp] || 'none';
                                console.log('Updated category:', todoToUpdate[todoProp]); // Add this line

                            }
                        break;
                    default:
                        todoToUpdate[todoProp] = valueToUse;
                        if (input && input.type !== 'color') {
                            span.textContent = valueToUse; // Convert input back to text
                        }
                }
            });
    
            saveDetailsBtn.textContent = "Edit Details";
        } else {
            // Edit Details logic
            valueSpans.forEach(span => {
                const currentText = span.textContent;
                const parentP = span.closest('p');
    
                if (parentP.classList.contains('detailsBgColor')) {
                    colorBox.style.display = 'none'; // Hide colorBox when switching to edit mode
                    const currentColor = todoToUpdate.bgColor || "#ffffff";
                    span.innerHTML = `<input type="color" value="${rgbToHex(currentColor)}">`;
                } else if (parentP.classList.contains('detailsCategory')) {
                    const currentCategory = todoToUpdate.category || 'none';
                    span.innerHTML = `
                        <select>
                            <option value="none" ${currentCategory === 'none' ? 'selected' : ''}>None</option>
                            <option value="personal" ${currentCategory === 'personal' ? 'selected' : ''}>Personal</option>
                            <option value="work" ${currentCategory === 'work' ? 'selected' : ''}>Work</option>
                            <option value="school" ${currentCategory === 'school' ? 'selected' : ''}>School</option>
                            <option value="groceries" ${currentCategory === 'groceries' ? 'selected' : ''}>Groceries</option>
                            <option value="household" ${currentCategory === 'household' ? 'selected' : ''}>Household</option>
                            <option value="software" ${currentCategory === 'software' ? 'selected' : ''}>Software</option>
                            <option value="entertainment" ${currentCategory === 'entertainment' ? 'selected' : ''}>Entertainment</option>
                            <option value="children" ${currentCategory === 'children' ? 'selected' : ''}>Children</option>
                            <option value="fitness" ${currentCategory === 'fitness' ? 'selected' : ''}>Fitness</option>
                        </select>
                    `;
                } else if (parentP.classList.contains('detailsDate') || parentP.classList.contains('detailsDeadline') || parentP.classList.contains('detailsTimeDone')) {
                    const isoDateTime = span.getAttribute('data-iso') || "";
                    span.innerHTML = `<input type="datetime-local" value="${formatDateToDateTimeLocal(isoDateTime)}">`;
                } else if (parentP.classList.contains('detailsMainText') || parentP.classList.contains('detailsDetails')) {
                    span.innerHTML = `<textarea rows="1">${currentText}</textarea>`;
                } else {
                    span.innerHTML = `<input type="text" value="${currentText}">`;
                }
            });
    
            saveDetailsBtn.textContent = "Save Changes";
        }
    
        isEditing = !isEditing;
    
        if (!isEditing) {
            colorBox.style.display = 'block'; // Show colorBox when switching back to view mode
        }
    
        applyPreferredSorting();
        updateLocalStorage();        
        drawTodos();
    });
    
} // END WINDOW ONLOAD



// Helper function to check if a date is in the past
function isPast(date) {
    let parsedDate;

    if (!date) return false; // handle null or undefined dates

    if (typeof date === 'string') {
        parsedDate = new Date(date);
    } else if (date instanceof Date) {
        parsedDate = date;
    } else {
        console.error("Received invalid date:", date);
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetting the hours, minutes, seconds, and milliseconds to get the start of the day

    parsedDate.setHours(0, 0, 0, 0); // Resetting the hours, minutes, seconds, and milliseconds to get the start of the day

    return parsedDate.getTime() < today.getTime();
}


/* COLOR PICKER */

let dropdown = document.getElementById("dropdown");
let button = document.getElementById("dropbtn");
let colorOptions = Array.from(document.getElementsByClassName("color-option"));

button.addEventListener('click', function () {
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});



colorOptions.forEach(option => {
    option.addEventListener('click', function () {
        selectedColor = this.style.backgroundColor;  // Save the selected color
        button.style.backgroundColor = selectedColor;
        dropdown.style.display = "none";
        console.log("selectedColor: " + selectedColor)
    });
});

function createTodoMenu() {
    const menu = document.querySelector('.menu');
    const menuItems = [
        { id: 'sortPointsBtn', text: 'Sort by Points', note: '(Default)' },
        { id: 'sortAlphaBtn', text: 'Sort Alphabetically' },
        { id: 'sortColorBtn', text: 'Sort by Color' },
        { id: 'sortDeadlineBtn', text: 'Sort by Deadline' },
        { id: 'sortTimeAddedBtn', text: 'Sort by Time Added' },
        { id: 'sortTimeDoneBtn', text: 'Sort by Time Marked "Done"' },
        { id: 'recalculatePointsBtn', text: 'Recalculate Points' },
        { id: 'clearLocalStorageBtn', text: 'Delete all to do items' },
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

    // Add the file input for restore functionality
    const fileInput = document.createElement('li');
    fileInput.innerHTML = '<input type="file" id="uploadInput" style="display: none" />';
    menu.appendChild(fileInput);
    attachTodoMenuListeners();
}

// Call this function when the page loads
createTodoMenu();

function attachTodoMenuListeners() {
    let backupBtn = document.getElementById('backupBtn');


    document.getElementById('sortPointsBtn').addEventListener('click', sortByPoints);
    document.getElementById('sortAlphaBtn').addEventListener('click', sortAlphabetically);
    document.getElementById('sortColorBtn').addEventListener('click', sortByColor);
    document.getElementById('sortDeadlineBtn').addEventListener('click', sortByDeadline);
    document.getElementById('sortTimeAddedBtn').addEventListener('click', sortByTimeAdded);
    document.getElementById('sortTimeDoneBtn').addEventListener('click', sortByTimeDone);
    document.getElementById('recalculatePointsBtn').addEventListener('click', recalculatePoints);
  
    /* DELETE STORAGE */

document.getElementById("clearLocalStorageBtn").addEventListener("click", function(event) {
    // Prevent default behavior (like navigating to another page)
    event.preventDefault();

    // Display a confirmation dialog
    var userConfirmation = window.confirm("Are you sure you want to clear selected items from LocalStorage?");

    // If the user clicks "OK"
    if (userConfirmation) {
        // Delete only the specified items from localStorage
        localStorage.removeItem('todos');
        localStorage.removeItem('preferredSorting');
        
        todos = [];
        drawTodos();
    }
});




// Update the event listener to use the named function
backupBtn.addEventListener('click', handleBackup);



/* Restore */

let uploadInput = document.getElementById('uploadInput');
let restoreBtn = document.getElementById('restoreBtn');


restoreBtn.addEventListener('click', handleRestore);
uploadInput.addEventListener('change', handleFileUpload);



}






document.querySelector("#sortPointsBtn").addEventListener("click", function(){
    localStorage.setItem('preferredSorting', 'points');
    sortByPoints();
    highlightActiveSortingOption();
});

document.querySelector("#sortAlphaBtn").addEventListener("click", function(){
    localStorage.setItem('preferredSorting', 'alphabet');
    sortAlphabetically();
    highlightActiveSortingOption();
});

document.querySelector("#sortColorBtn").addEventListener("click", function(){
    localStorage.setItem('preferredSorting', 'color');
    sortByColor();
    highlightActiveSortingOption();
});

document.querySelector("#sortTimeAddedBtn").addEventListener("click", function(){
    localStorage.setItem('preferredSorting', 'timeAdded');
    sortByTimeAdded();
    highlightActiveSortingOption();
});

document.querySelector("#sortTimeDoneBtn").addEventListener("click", function(){
    localStorage.setItem('preferredSorting', 'timeDone');
    sortByTimeDone();
    highlightActiveSortingOption();
});

document.querySelector("#sortDeadlineBtn").addEventListener('click', function(){
    localStorage.setItem('preferredSorting', 'deadline');
    sortByDeadline();
    highlightActiveSortingOption();
});




document.querySelector(".menu").addEventListener("click", function(e) {

    e.stopPropagation();

    // Check if a link within the menu was clicked
    if (e.target.tagName === 'A') {
        document.getElementById("menu-toggle").checked = false;
    }
});

/* MAKE THE INPUT FIELD ALSO FILTER */

document.querySelector('#todoInput').addEventListener('input', function() {
    const filterValue = this.value.toLowerCase();
    const listItems = document.querySelectorAll('.listItem');
  
    listItems.forEach(item => {
      const itemText = item.querySelector('.toDoText').textContent.toLowerCase();
      if (itemText.includes(filterValue)) {
        item.style.display = 'grid';
      } else {
        item.style.display = 'none';
      }
    });
  });

  document.querySelector('.addDetails').addEventListener('click', () => {
    if (!document.querySelector('.detailsTextarea')){ //check first if exists already
            let textarea = document.createElement('textarea');
        textarea.name = "todoDetails"; // This will be useful when gathering form data
        textarea.placeholder = "Enter additional details...";
        textarea.classList.add('detailsTextarea');

        document.getElementById('detailsContainer').appendChild(textarea); 
    }
   
});

/* CUSTOM MODAL */

let modal = document.getElementById('detailsModal');
let closeModal = document.querySelector('.modal-close');
let detailsTextElem = document.getElementById('detailsText');

// Function to open the modal and set the details text
function showDetails(todoId, detailsHTML) {
    detailsTextElem.innerHTML = detailsHTML;
    modal.setAttribute('data-todo-id', todoId); // Save the todoId in the modal for reference
    modal.style.display = 'block';
}



// Close the modal
closeModal.onclick = function() {
    modal.style.display = 'none';
    isEditing = false;
    saveDetailsBtn.textContent = "Edit Details";

}

function resetModal() {
    isEditing = false;
    saveDetailsBtn.textContent = "Edit Details";
    // any other default state settings can go here
}

// Close the modal if clicked outside the modal content
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}



/* TOGGLE FORM OPTIONS DETAILS */

document.querySelector('.collapsible-btn').addEventListener('click', function() {
    const content = document.querySelector('.collapsible-content');
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'grid';
    } else {
        content.style.display = 'none';
    }
});

/* FILTER BY CATEGORIES */

document.getElementById('categorySelect').addEventListener('change', function() {
    const selectedCategory = this.value;
    filterTodosByCategory(selectedCategory);
    drawTodos();
});

/* Remove category */
document.addEventListener('click', function(event) {
    // Check if the clicked element has the class 'close'
    if (event.target.classList.contains('close')) {
        console.log('Element with close clicked:', event.target);
        document.querySelector('#categorySelect').value = 'none';
        drawTodos();

    }
});


function filterTodosByCategory(category) {
    const filterNotice = document.getElementById("categoryFilteringNotice");
    if (category === 'none') {
        filteredTodos = todos;  // Display all todos when "None" is selected.
        if (filterNotice){
            filterNotice.innerHTML = "Showing all todos:";
        }
       
    } else {
        filteredTodos = todos.filter(todo => todo.category === category);
        if (filterNotice){
            filterNotice.innerHTML = "<span class='close'>&#215;</span> Showing todos of category <i>" + category + "</i>:";
        }
    }
    
}

/* SHOW CHECKMARK IN ACTIVE SORTING MENU ITEM */

function highlightActiveSortingOption() {
    const sortingMethod = localStorage.getItem('preferredSorting');

    console.log('highlightActiveSortingOption');
    // Remove active class from all menu items
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));

    // Mapping sorting methods to their respective element IDs
    const sortingToElementIdMap = {
        'points': 'sortPointsBtn',
        'alphabet': 'sortAlphaBtn',
        'color': 'sortColorBtn',
        'deadline': 'sortDeadlineBtn',
        'timeAdded': 'sortTimeAddedBtn',
        'timeDone': 'sortTimeDoneBtn'
    };

    const activeElementId = sortingToElementIdMap[sortingMethod];
    if (activeElementId) {
        const activeElement = document.getElementById(activeElementId);
        if (activeElement) {
            activeElement.closest('li').classList.add('active');  // Highlight the parent <li> of the active sorting button
        }
    }
}

document.querySelector("#menu-toggle").addEventListener('change', function() {
    if(this.checked) {
        highlightActiveSortingOption();
    }
});

function recalculatePoints() {
    let voteCounter = todos.length;
    todos.forEach(todo => {
        todo.votes = voteCounter;
        voteCounter--;
    });
    drawTodos();
}

document.getElementById('recalculatePointsBtn').addEventListener('click', recalculatePoints);

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
  
    document.getElementById('mainTitle').textContent = 'To Do List';

    drawTodos(); // Assuming there is a function drawTodos() for displaying to-do items
    createTodoMenu();
  
  });
