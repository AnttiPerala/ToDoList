
(function() {
    const statusEl = document.getElementById('syncStatus');
    const isLoggedIn = (typeof wpAppData !== 'undefined') ? wpAppData.is_logged_in : false; 

    function showStatus(msg) {
        if(statusEl) statusEl.textContent = msg;
        console.log('[Sync] ' + msg);
    }

    // --- SETUP STATUS BUTTON UI ---
    if(statusEl) {
        // Tooltip
        statusEl.title = "If you don't have an account data, data is saved to your browsers local storage. Create an account by clicking here if you want cloud sync";
        
        // Click behavior
        statusEl.style.cursor = 'pointer';
        statusEl.addEventListener('click', () => {
            if(typeof wpAppData !== 'undefined' && wpAppData.login_url) {
                window.location.href = wpAppData.login_url;
            } else {
                alert("Login URL not found. Please refresh.");
            }
        });

        // Initial text
        if (!isLoggedIn) {
            statusEl.textContent = "Saved Locally (Not logged in)";
            statusEl.style.backgroundColor = "rgba(255, 230, 230, 0.9)";
            statusEl.style.color = "#333";
        }
    }

    // 1. PULL Data on Load (Only if logged in)
    function pullData() {
        if (!isLoggedIn) {
            if(window.refreshAppUI) window.refreshAppUI();
            return;
        }

        showStatus('Syncing...');
        
        fetch(wpAppData.root + 'todo-app/v1/sync', {
            method: 'GET',
            headers: { 'X-WP-Nonce': wpAppData.nonce }
        })
        .then(response => response.json())
        .then(data => {
            if (data.todos) window.todos = data.todos;
            if (data.worktimes) window.worktimes = data.worktimes;
            if (data.diaryEntries) window.diaryEntries = data.diaryEntries;

            // Fix Dates
            if(window.todos) window.todos.forEach(t => { if(t.deadline) t.deadline = new Date(t.deadline); });
            if(window.worktimes) window.worktimes.forEach(w => { w.start = new Date(w.start); w.end = new Date(w.end); });

            // Sync LocalStorage
            localStorage.setItem('todos', JSON.stringify(window.todos));
            localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
            localStorage.setItem('diaryEntries', JSON.stringify(window.diaryEntries));

            if(window.refreshAppUI) window.refreshAppUI();
            showStatus('Synced to Cloud');
        })
        .catch(err => {
            console.error(err);
            showStatus('Sync Error');
        });
    }

    // 2. PUSH Data on Change
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const pushData = debounce(() => {
        // If not logged in, we only update status text to remind them it's local
        if (!isLoggedIn) {
            showStatus('Saved Locally');
            setTimeout(() => { 
                if(statusEl) statusEl.textContent = "Saved Locally (Not logged in)"; 
            }, 2000);
            return; 
        }

        showStatus('Saving to Cloud...');
        const payload = {
            todos: window.todos || [],
            worktimes: window.worktimes || [],
            diaryEntries: window.diaryEntries || []
        };

        fetch(wpAppData.root + 'todo-app/v1/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpAppData.nonce },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => { showStatus('Saved to Cloud'); })
        .catch(err => { console.error(err); showStatus('Save Failed'); });
    }, 2000);

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key === 'todos' || key === 'worktimes' || key === 'diaryEntries') {
            pushData();
        }
    };

    document.addEventListener('DOMContentLoaded', pullData);
})();
