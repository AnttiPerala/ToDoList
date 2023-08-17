

// Function to update localStorage
function updateLocalStorage() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

let todos = [];

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

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const topPriorityInput = document.getElementById('priorityCheck');

   

  



    // Calculate the current maximum votes
    let maxVotes = Math.max(...todos.map(todo => todo.votes)); //The map method creates a new array containing the votes of all todos, and the Math.max function finds the maximum value in this array. The ... operator (spread syntax) is used to spread the elements of this array into individual arguments to Math.max(). The effect is similar to calling Math.max(2, 5, 1), which returns 5.

    const detailsTextarea = document.querySelector('.detailsTextarea');


    let newTodo = {
        id: Date.now(),
        text: input.value,
        votes: topPriorityInput.checked ? maxVotes + 1 : 0,
        deadline: deadlineInput.value ? new Date(deadlineInput.value) : null,
        done: false,
        bgColor: selectedColor,
        details: detailsTextarea ? detailsTextarea.value : null,
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
});


function drawTodos() {
    list.innerHTML = '';

    // Get today's date at midnight for comparison
    let today = new Date();
    today.setHours(0, 0, 0, 0);


    
    todos.forEach(todo => {
        let listItem = document.createElement('li');

        // Embed the time added as a data-attribute
        listItem.setAttribute('data-timeAdded', new Date(todo.id).toLocaleString());

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
        <p class="detailsVotes">Votes: <span class="value">${todo.votes}</span></p>
        <p class="detailsDate">Time Added: <span class="value" data-iso="${listItem.getAttribute('data-timeAdded')}">${formatDateTimeForDisplay(listItem.getAttribute('data-timeAdded'))}</span></p>
        <p class="detailsDeadline">Deadline: <span class="value" data-iso="${todo.deadline}">${formatDateTimeForDisplay(todo.deadline)}</span></p>
        <p class="detailsTimeDone">Done: <span class="value">${todo.timeDone ? formatDateToDateTimeLocal(todo.timeDone) : "Not done yet"}</span></p> 
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

        listItem.style.backgroundColor = todo.bgColor ?? '#fff'; //, if todo.bgColor is a value that isn't null or undefined, it will be used. If todo.bgColor is null or undefined, the string '#fff' will be used instead.

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

let backupBtn = document.getElementById('backupBtn');

backupBtn.addEventListener('click', () => {
    console.log("click registered on backupBtn");
    let dataStr = JSON.stringify(todos);

    // Check for the availability of the share API (primarily for iOS Safari)
    if (navigator.share) {
        navigator.share({
            title: 'Todo backup',
            text: dataStr,
        }).catch(console.error);
    } else {
        let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        let exportFileDefaultName = 'todos_backup.json';
        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
});


/* Restore */

let uploadInput = document.getElementById('uploadInput');
let restoreBtn = document.getElementById('restoreBtn');

restoreBtn.addEventListener('click', () => {
    console.log("click registered on restoreBtn");
    uploadInput.click();
});

uploadInput.addEventListener('change', () => {
    let file = uploadInput.files[0];
    if (!file) {
        alert("No file selected");
    } else {
        let reader = new FileReader();
        reader.onload = function(e) {
            let contents = e.target.result;
            let json = JSON.parse(contents);
            // Validate the JSON contents here, if necessary
            if (Array.isArray(json)) {
                todos = json.map(todo => {
                    if (todo.deadline) {
                        todo.deadline = new Date(todo.deadline);
                    }
                    return todo;
                });
                updateLocalStorage();
                drawTodos();
            } else {
                alert("Invalid file contents");
            }
        };
        reader.readAsText(file);
    }
});



// Helper function to check if a date is today
function isToday(date) {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

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
        "detailsDetails": "details"
    };
    
    saveDetailsBtn.addEventListener('click', () => {
        const valueSpans = detailsTextElem.querySelectorAll('.value');
        const todoId = detailsModal.getAttribute('data-todo-id');
        let todoToUpdate = todos.find(todo => todo.id === Number(todoId));
    
        if (isEditing) {
            // Save Changes logic
            valueSpans.forEach(span => {
                const input = span.querySelector('input');
                if (input) {
                    span.textContent = input.value;  // reset back to text
                    const detailTypeClass = span.closest('p').classList[0];
                    const todoProp = classNameToObjectPropMap[detailTypeClass];
    
                    switch(todoProp) {
                        case 'votes':
                            todoToUpdate[todoProp] = Number(input.value);
                            break;
    
                        case 'timeAdded':
                        case 'deadline':
                        case 'timeDone':
                            if (input.value) {
                                todoToUpdate[todoProp] = new Date(input.value).toISOString();
                            } else {
                                todoToUpdate[todoProp] = null;
                            }
                            break;
    
                        default:
                            todoToUpdate[todoProp] = input.value;
                    }
                }
            });
            saveDetailsBtn.textContent = "Edit Details";
        } else {
            // Edit Details logic
            valueSpans.forEach(span => {
                const currentText = span.textContent;
                const parentP = span.closest('p');
    
                if (parentP.classList.contains('detailsDate') || parentP.classList.contains('detailsDeadline') || parentP.classList.contains('detailsTimeDone')) {
                    const isoDateTime = span.getAttribute('data-iso') || "";
                    span.innerHTML = `<input type="datetime-local" value="${formatDateToDateTimeLocal(isoDateTime)}">`;

                } else {
                    span.innerHTML = `<input type="text" value="${currentText}">`;
                }
            });
            saveDetailsBtn.textContent = "Save Changes";
        }
    
        isEditing = !isEditing;
        updateLocalStorage();        
        drawTodos();
    });
    
    
    
    
}


// Helper function to check if a date is in the past
function isPast(date) {
    if (!date) return false;
    const now = new Date();
    // Set to midnight for accurate comparison
    now.setHours(0, 0, 0, 0);
    return date < now;
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

/* SORT OPTIONS IN MENU */

function sortByPoints() {
    todos.sort((a, b) => {
        // If a is done and b is not, a comes last
        if (a.done && !b.done) return 1;
        // If b is done and a is not, b comes last
        if (b.done && !a.done) return -1;
    
        // If a's deadline is past and it's not done, and b's is not, a comes first
        if (isPast(a.deadline) && !a.done && (!isPast(b.deadline) || b.done)) return -1;
        // If b's deadline is past and it's not done, and a's is not, b comes first
        if (isPast(b.deadline) && !b.done && (!isPast(a.deadline) || a.done)) return 1;
    
        // If a's deadline is today and b's is not, a comes first
        if (isToday(a.deadline) && !isToday(b.deadline)) return -1;
        // If b's deadline is today and a's is not, b comes first
        if (isToday(b.deadline) && !isToday(a.deadline)) return 1;
    
        // If both deadlines are today or neither are, sort by votes
        return b.votes - a.votes;
    });
    localStorage.setItem('preferredSorting', 'points');
    drawTodos();
}

function sortAlphabetically() {
    todos.sort((a, b) => a.text.localeCompare(b.text));
    localStorage.setItem('preferredSorting', 'alphabet');
    drawTodos();
}



function sortByTimeAdded() {
    todos.sort((a, b) => a.id - b.id);
    localStorage.setItem('preferredSorting', 'timeAdded');
    drawTodos();
}


function sortByTimeDone() {
    todos.sort((a, b) => {
        if (a.timeDone && b.timeDone) {
            return new Date(a.timeDone) - new Date(b.timeDone);  // If both are done, compare their done times
        } else if (a.timeDone) {
            return -1;  // If only 'a' is done, 'a' comes first
        } else if (b.timeDone) {
            return 1;   // If only 'b' is done, 'b' comes first
        } else {
            return 0;   // If neither is done, their order remains unchanged
        }
    });
    localStorage.setItem('preferredSorting', 'timeDone');
    drawTodos();
}


document.querySelector("#sortPointsBtn").addEventListener("click", sortByPoints);
document.querySelector("#sortAlphaBtn").addEventListener("click", sortAlphabetically);
document.querySelector("#sortColorBtn").addEventListener("click", sortByColor);
document.querySelector("#sortTimeAddedBtn").addEventListener("click", sortByTimeAdded);
document.querySelector("#sortTimeDoneBtn").addEventListener("click", sortByTimeDone);
document.querySelector("#sortDeadlineBtn").addEventListener('click', sortByDeadline);


function applyPreferredSorting() {
    const sortingMethod = localStorage.getItem('preferredSorting');
    
    switch(sortingMethod) {
        case 'points':
            sortByPoints();
            break;
        case 'alphabet':
            sortAlphabetically();
            break;
        case 'color':
            sortByColor();
            break;
        case 'deadline':
            sortByColor();
            break;
        case 'timeAdded':
            sortByTimeAdded();
            break;
        case 'timeDone':
            sortByTimeDone();
            break;
        default:
            sortByPoints();
            drawTodos();
            break;
    }
}

// Function to convert RGB to HSL
function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if(max === min){
        h = s = 0; // achromatic
    } else {
        let diff = max - min;
        s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
        switch(max){
            case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
            case g: h = (b - r) / diff + 2; break;
            case b: h = (r - g) / diff + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s * 100, l * 100];
}

function sortByColor() {
    todos.sort((a, b) => {
        const colorA = a.bgColor ? a.bgColor.slice(4, -1).split(', ') : [255, 255, 255]; // Convert "rgb(r, g, b)" to [r, g, b]
        const colorB = b.bgColor ? b.bgColor.slice(4, -1).split(', ') : [255, 255, 255];

        const hueA = rgbToHsl(+colorA[0], +colorA[1], +colorA[2])[0];
        const hueB = rgbToHsl(+colorB[0], +colorB[1], +colorB[2])[0];

        return hueA - hueB;
    });

    localStorage.setItem('preferredSorting', 'color');
    drawTodos();
}

function sortByDeadline() {
    todos.sort((a, b) => {
        if (a.deadline && b.deadline) {
            return new Date(a.deadline) - new Date(b.deadline);
        } else if (a.deadline) {
            return -1; // If only a has a deadline, a comes first
        } else if (b.deadline) {
            return 1;  // If only b has a deadline, b comes first
        } else {
            return 0;  // If neither have a deadline, they are equal
        }
    });
    localStorage.setItem('preferredSorting', 'deadline');
    drawTodos();
}

/* Close menu */
/* The behavior of the "toggle menu" you've described relies on the interaction of the CSS pseudo-class :checked and the general sibling combinator (~). Here's a breakdown of how it works:

Checkbox (Input Element):

<input id="menu-toggle" type="checkbox" />
This checkbox acts as a state manager for the menu. When it's checked, the menu is open; when it's unchecked, the menu is closed.

Label for the Checkbox:

<label class='menu-button-container' for="menu-toggle">
    <div class='menu-button'></div>
</label>
This label is associated with the checkbox by the for attribute. Clicking on this label will change the state of the checkbox (check/uncheck). Typically, there would be a CSS style that makes this label appear as a menu button or icon to the user.

CSS Behavior (not provided but assumed):

In your CSS, there would likely be rules that use the :checked pseudo-class and the general sibling combinator (~) to change the visibility or position of the .menu when the checkbox is checked.  */

document.querySelector(".menu").addEventListener("click", function(e) {
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
    let textarea = document.createElement('textarea');
    textarea.name = "todoDetails"; // This will be useful when gathering form data
    textarea.placeholder = "Enter additional details...";
    textarea.classList.add('detailsTextarea');

    document.getElementById('detailsContainer').appendChild(textarea);
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
}

// Close the modal if clicked outside the modal content
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

/* HELPER FUNCTION FOR TIME FORMATTING */

function formatDateToDateTimeLocal(date) {
    let parsedDate = new Date(date);
    
    // Check if parsedDate is valid
    if (isNaN(parsedDate.getTime())) return "";

    let formattedDate = parsedDate.toISOString().split('.')[0];
    return formattedDate;
}

/* NICER TIME DISPLAY FORMAT */
function formatDateTimeForDisplay(isoString) {
    if (!isoString) return "";
    const dateObj = new Date(isoString);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return dateObj.toLocaleString(undefined, options);
}
