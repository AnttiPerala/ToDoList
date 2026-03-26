
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
        case 'mostRevived': sortByMostRevived(); break;
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

function sortByMostRevived() {
    window.todos.forEach(t => {
        if (typeof t.reviveCount !== 'number') t.reviveCount = t.reviveCount ? Number(t.reviveCount) || 0 : 0;
    });
    window.todos.sort((a, b) => {
        const ar = a.reviveCount || 0;
        const br = b.reviveCount || 0;
        if (ar === br) {
            // Tie-breaker: keep higher-voted and newer items first
            if (a.votes !== b.votes) return (b.votes || 0) - (a.votes || 0);
            const at = new Date(a.timeAdded || 0).getTime() || 0;
            const bt = new Date(b.timeAdded || 0).getTime() || 0;
            return bt - at;
        }
        return br - ar; // most revived first
    });
    localStorage.setItem('preferredSorting', 'mostRevived');
}
