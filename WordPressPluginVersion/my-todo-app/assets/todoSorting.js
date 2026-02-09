
// Expose as the implementation that todo.js expects:
window.applyPreferredSortingImpl = function applyPreferredSortingImpl() {
    const sortingMethod = localStorage.getItem('preferredSorting') || 'points';

    switch (sortingMethod) {
        case 'points':   sortByPoints(); break;
        case 'alphabet': sortAlphabetically(); break;
        case 'color':    sortByColor(); break;
        case 'deadline': sortByDeadline(); break;
        case 'timeAdded': sortByTimeAdded(); break;
        case 'timeDone':  sortByTimeDone(); break;
        default:         sortByPoints(); break;
    }
};


function sortByPoints() {
    window.todos.sort((a, b) => {
        if (a.done && !b.done) return 1; if (b.done && !a.done) return -1;
        // Basic point logic
        return b.votes - a.votes;
    });
    localStorage.setItem('preferredSorting', 'points');
}
function sortAlphabetically() {
    window.todos.sort((a, b) => a.text.localeCompare(b.text));
    localStorage.setItem('preferredSorting', 'alphabet');
}
function sortByColor() {
    window.todos.sort((a, b) => (a.bgColor || '').localeCompare(b.bgColor || ''));
    localStorage.setItem('preferredSorting', 'color');
}
function sortByDeadline() {
    window.todos.sort((a, b) => {
        if (!a.deadline) return 1; if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
    });
    localStorage.setItem('preferredSorting', 'deadline');
}
function sortByTimeAdded() {
    window.todos.sort((a, b) => {
        return (new Date(a.timeAdded).getTime() || 0) - (new Date(b.timeAdded).getTime() || 0);
    });
    localStorage.setItem('preferredSorting', 'timeAdded');
}
function sortByTimeDone() {
    window.todos.sort((a, b) => {
        if(!a.timeDone) return 1; if(!b.timeDone) return -1;
        return new Date(a.timeDone) - new Date(b.timeDone);
    });
    localStorage.setItem('preferredSorting', 'timeDone');
}
