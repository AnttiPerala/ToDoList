// Global variables for application data
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let worktimes = JSON.parse(localStorage.getItem('worktimes')) || [];
let diaryEntries = JSON.parse(localStorage.getItem('diaryEntries')) || [];

// Convert date strings to Date objects for todos and worktimes
todos = todos.map(todo => {
    if (todo.deadline) {
        todo.deadline = new Date(todo.deadline);
    }
    return todo;
});

worktimes = worktimes.map(worktime => ({
    ...worktime,
    start: new Date(worktime.start),
    end: new Date(worktime.end)
}));


// Convert hex color to RGB format
function hexToRgb(hex) {
    let bigint = parseInt(hex.slice(1), 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return [r, g, b];
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

// Updated backup functionality to include both To-Do items and Worktimes
function handleBackup() {
    submitTodoButton.textContent = 'Backing up...';

    try {
        const dataToExport = {
            todos: todos,
            worktimes: worktimes,
            diaryEntries: diaryEntries
        };

        const dataStr = JSON.stringify(dataToExport);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'full_app_backup.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        submitTodoButton.textContent = 'Backup Successful!';
        setTimeout(() => {
            submitTodoButton.textContent = 'Add';
        }, 3000);
    } catch (error) {
        console.error('Backup failed:', error);
        submitTodoButton.textContent = 'Backup Failed';
        setTimeout(() => {
            submitTodoButton.textContent = 'Add';
        }, 3000);
    }
}



// Helper function to check if a date is today
function isToday(date) {
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

    return parsedDate.getTime() === today.getTime();
}


function handleRestore() {
    console.log("Restore initiated");
    
    // Remove any existing upload input
    const existingInput = document.getElementById('uploadInput');
    if (existingInput) {
        existingInput.remove();
    }
    
    // Create fresh input element
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.id = 'uploadInput';
    uploadInput.style.display = 'none';
    document.body.appendChild(uploadInput);
    
    uploadInput.addEventListener('change', handleFileUpload);
    console.log("Triggering file selection");
    uploadInput.click();
}



function handleFileUpload(e) {
    let file = e.target.files[0];
    if (!file) {
        alert("No file selected");
    } else {
        let reader = new FileReader();
        reader.onload = function(e) {
            try {
                console.log("Starting restore process");
                let contents = e.target.result;
                let json = JSON.parse(contents);
                console.log("Parsed JSON:", json);

                if (json.todos && Array.isArray(json.todos) && 
                    json.worktimes && Array.isArray(json.worktimes) &&
                    json.diaryEntries && Array.isArray(json.diaryEntries)) {
                    
                    console.log("Before restore - Current data:", {
                        todos: todos,
                        worktimes: worktimes,
                        diaryEntries: diaryEntries
                    });

                    todos = json.todos.map(todo => {
                        if (todo.deadline) {
                            todo.deadline = new Date(todo.deadline);
                        }
                        return todo;
                    });

                    worktimes = json.worktimes.map(worktime => ({
                        ...worktime,
                        start: new Date(worktime.start),
                        end: new Date(worktime.end)
                    }));

                    diaryEntries = json.diaryEntries;

                    console.log("After restore - Updated data:", {
                        todos: todos,
                        worktimes: worktimes,
                        diaryEntries: diaryEntries
                    });

                    localStorage.setItem('todos', JSON.stringify(todos));
                    localStorage.setItem('worktimes', JSON.stringify(worktimes));
                    localStorage.setItem('diaryEntries', JSON.stringify(diaryEntries));

                    const todoContainer = document.getElementById('todoModeWrap');
                    const worktimeContainer = document.getElementById('worktimeModeWrap');
                    const diaryContainer = document.getElementById('diaryModeWrap');

                    if (todoContainer.style.display !== 'none') drawTodos();
                    if (worktimeContainer.style.display !== 'none') drawWorktimes();
                    if (diaryContainer.style.display !== 'none') drawDiary();

                    alert("Data successfully restored!");
                } else {
                    console.log("Invalid JSON structure:", json);
                    alert("Invalid file contents: JSON format is incorrect.");
                }
            } catch (error) {
                console.error("Restore failed:", error);
                alert("Invalid file contents: Failed to parse JSON.");
            }
        };
        reader.readAsText(file);
    }
}

