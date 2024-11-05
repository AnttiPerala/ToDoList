

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
    highlightActiveSortingOption();  // Call the function to visually indicate the active sorting option

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
        let colorA, colorB;

        if (a.bgColor && a.bgColor.startsWith("#")) {
            const rgb = hexToRgb(a.bgColor);
            colorA = rgb ? [rgb.r, rgb.g, rgb.b] : [255, 255, 255];
        } else if (a.bgColor && a.bgColor.startsWith("rgb")) {
            colorA = a.bgColor.slice(4, -1).split(', ').map(Number);
        } else {
            colorA = [255, 255, 255]; // Default white
        }

        if (b.bgColor && b.bgColor.startsWith("#")) {
            const rgb = hexToRgb(b.bgColor);
            colorB = rgb ? [rgb.r, rgb.g, rgb.b] : [255, 255, 255];
        } else if (b.bgColor && b.bgColor.startsWith("rgb")) {
            colorB = b.bgColor.slice(4, -1).split(', ').map(Number);
        } else {
            colorB = [255, 255, 255]; // Default white
        }

        const hslA = rgbToHsl(...colorA);
        const hslB = rgbToHsl(...colorB);

        // Treat white and null as having infinite hue for sorting purposes
        const hueA = (hslA[2] === 100) ? Infinity : hslA[0];
        const hueB = (hslB[2] === 100) ? Infinity : hslB[0];

        if (hueA !== hueB) return hueA - hueB;
        return hslB[2] - hslA[2]; 
    });

    localStorage.setItem('preferredSorting', 'color');
    drawTodos();
}




function sortByDeadline() {
    todos.sort((a, b) => {
        // If a is done and b is not, then a should come after b
        if (a.done && !b.done) return 1;
        
        // If b is done and a is not, then b should come after a
        if (b.done && !a.done) return -1;
        
        // Now that we've handled the "done" cases, we can compare deadlines
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
    todos.sort((a, b) => {
        // If a.text is empty/null/undefined and b.text is not, a should come after b
        if (!a.text && b.text) return 1;

        // If b.text is empty/null/undefined and a.text is not, b should come after a
        if (a.text && !b.text) return -1;

        // If both are empty/null/undefined, they're considered equal in terms of sorting
        if (!a.text && !b.text) return 0;

        // If both are strings, compare them
        return a.text.localeCompare(b.text);
    });
    
    localStorage.setItem('preferredSorting', 'alphabet');
    drawTodos();
}




function sortByTimeAdded() {
    todos.sort((a, b) => {
        // Check if timeAdded exists for the todos, if not, use id
        let timeA = a.timeAdded ? new Date(a.timeAdded).getTime() : a.id;
        let timeB = b.timeAdded ? new Date(b.timeAdded).getTime() : b.id;

        return timeA - timeB;
    });
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