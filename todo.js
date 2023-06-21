

// Function to update localStorage
function updateLocalStorage() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

let todos = [];

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

    let newTodo = {
        id: Date.now(),
        text: input.value,
        votes: 0,
        deadline: deadlineInput.value ? new Date(deadlineInput.value) : null,
        done: false
    }

    todos.push(newTodo);
    updateLocalStorage();

    input.value = '';
    deadlineInput.value = '';

    drawTodos();
});


function drawTodos() {
    list.innerHTML = '';

    // Get today's date at midnight for comparison
    let today = new Date();
    today.setHours(0, 0, 0, 0);

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
    
    todos.forEach(todo => {
        let listItem = document.createElement('li');

        // Set the id of the list item
        listItem.id = todo.id;

        let todoText = document.createElement('span');
        todoText.classList.add("toDoText");
        todoText.textContent = todo.text;

        let voteDisplay = document.createElement('span');
        voteDisplay.classList.add('votes');
        voteDisplay.textContent = `Votes: ${todo.votes}`;

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
            deadlineDisplay.textContent = `Deadline: ${todo.deadline.toDateString()}`;
        }
        
        listItem.appendChild(todoText);
        listItem.appendChild(voteDisplay);
        listItem.appendChild(deadlineDisplay);
        listItem.appendChild(upvoteBtn);
        listItem.appendChild(downvoteBtn);
        listItem.appendChild(doneBtn);
        listItem.appendChild(deleteBtn);

        // Make the list item draggable
        listItem.setAttribute('draggable', 'true');

        // Add drag and drop event listeners
        listItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', todo.id);
        });

        listItem.addEventListener('dblclick', function(e) {
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
    });
}

function doneTodo(id) {
    let todo = todos.find(t => t.id === id);
    todo.done = !todo.done; //toggle

    updateLocalStorage();
    drawTodos();
}

function deleteTodo(id) {

    let todo = todos.find(t => t.id === id);
    console.log("Deleted todo with text: " + todo.text)
    // Filter out the todo with the given id (which will delete it)
    todos = todos.filter(todo => todo.id !== id);

    updateLocalStorage();
    drawTodos();
}


// Initial drawing of todos
drawTodos();

function upvote(id) {
    let todo = todos.find(t => t.id === id);
    todo.votes++;
    updateLocalStorage();
    drawTodos();
}

function upvote(id) {
    let todo = todos.find(t => t.id === id);
    todo.votes++;
    updateLocalStorage();
    drawTodos();
}

function downvote(id) {
    let todo = todos.find(t => t.id === id);
    todo.votes--;
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
    let dataStr = JSON.stringify(todos);
    let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    let exportFileDefaultName = 'todos_backup.json';

    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
});

/* Restore */

let uploadInput = document.getElementById('uploadInput');
let restoreBtn = document.getElementById('restoreBtn');

restoreBtn.addEventListener('click', () => {
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

/* BROWSER NOTIFICATIONS */

let notificationToggle = document.getElementById('notificationToggle');

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
    const protocol = window.location.protocol;
    const notificationCheckbox = document.getElementById('notificationWrap');
    if (protocol === 'http:' || protocol === 'https:') {
        notificationCheckbox.style.display = "block";
    } else {
        notificationCheckbox.style.display = "none";
    }
}

// Helper function to check if a date is in the past
function isPast(date) {
    if (!date) return false;
    const now = new Date();
    // Set to midnight for accurate comparison
    now.setHours(0, 0, 0, 0);
    return date < now;
}