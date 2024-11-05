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
