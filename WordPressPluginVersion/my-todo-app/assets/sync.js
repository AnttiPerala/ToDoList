(function() {
    const statusEl = document.getElementById('syncStatus');
    const isLoggedIn = wpAppData.is_logged_in; // Passed from PHP

    console.log('[SYNC] sync.js loaded. isLoggedIn =', isLoggedIn);

    function showStatus(msg) {
        if (statusEl) statusEl.textContent = msg;
        console.log('[SYNC][STATUS]', msg);
    }

    // --- SETUP STATUS BUTTON UI ---
    if (statusEl) {
        // 1. Tooltip Hover Text
        statusEl.title = "If you don't have an account data, data is saved to your browsers local storage. Create an account by clicking here if you want cloud sync";
        
        // 2. Click behavior
        statusEl.style.cursor = 'pointer';
        statusEl.addEventListener('click', () => {
            console.log('[SYNC] syncStatus clicked, redirecting to login_url:', wpAppData.login_url);
            window.location.href = wpAppData.login_url;
        });

        // 3. Initial text
        if (!isLoggedIn) {
            statusEl.textContent = "Saved Locally (Not logged in)";
            statusEl.style.backgroundColor = "rgba(255, 200, 200, 0.8)"; // slight red tint to indicate no sync
            console.log('[SYNC] Not logged in, using local-only mode.');
        }
    }

    // --- LOCAL SNAPSHOT + GUARD FLAGS ---
    // We track last stored JSON strings so we can see when something *actually* changes.
    const watchedKeys = ['todos', 'worktimes', 'diaryEntries'];

    let lastSnapshots = {
        todos: localStorage.getItem('todos') || '[]',
        worktimes: localStorage.getItem('worktimes') || '[]',
        diaryEntries: localStorage.getItem('diaryEntries') || '[]'
    };

    let isApplyingServerData = false;

    function logSnapshot(label) {
        try {
            console.log('[SYNC][SNAPSHOT]', label, {
                todosLen: (lastSnapshots.todos || '').length,
                worktimesLen: (lastSnapshots.worktimes || '').length,
                diaryEntriesLen: (lastSnapshots.diaryEntries || '').length
            });
        } catch (e) {
            console.warn('[SYNC][SNAPSHOT] log error', e);
        }
    }

    function updateSnapshotsFromLocalStorage() {
        watchedKeys.forEach(key => {
            try {
                lastSnapshots[key] = localStorage.getItem(key) || '[]';
            } catch (e) {
                console.warn('[SYNC] Failed to read localStorage for key', key, e);
            }
        });
        logSnapshot('updated from localStorage');
    }

    logSnapshot('initial');

    // --- PULL Data from Server ---
    function pullData(reason) {
        if (!reason) reason = 'unspecified';
        console.log('[SYNC] pullData() called. reason =', reason, 'isLoggedIn =', isLoggedIn);

        if (!isLoggedIn) {
            console.log('[SYNC] Not logged in, skipping server pull. Just refreshing UI from localStorage.');
            if (typeof window.refreshAppUI === 'function') {
                window.refreshAppUI();
            }
            return;
        }

        showStatus('Syncing...');

        fetch(wpAppData.root + 'todo-app/v1/sync', {
            method: 'GET',
            headers: { 'X-WP-Nonce': wpAppData.nonce }
        })
        .then(response => {
            console.log('[SYNC] pullData() fetch completed. HTTP status =', response.status);
            return response.json();
        })
        .then(data => {
            console.log('[SYNC] pullData() received data from server:', {
                todosCount: data.todos ? data.todos.length : 0,
                worktimesCount: data.worktimes ? data.worktimes.length : 0,
                diaryEntriesCount: data.diaryEntries ? data.diaryEntries.length : 0
            });

            // Replace in-memory arrays
            if (data.todos) window.todos = data.todos;
            if (data.worktimes) window.worktimes = data.worktimes;
            if (data.diaryEntries) window.diaryEntries = data.diaryEntries;

            // Fix Dates
            if (window.todos) {
                window.todos.forEach(t => {
                    if (t.deadline) t.deadline = new Date(t.deadline);
                });
            }
            if (window.worktimes) {
                window.worktimes.forEach(w => {
                    w.start = new Date(w.start);
                    w.end = new Date(w.end);
                });
            }

            console.log('[SYNC] Applying server data to localStorage (guard isApplyingServerData = true).');
            isApplyingServerData = true;
            try {
                localStorage.setItem('todos', JSON.stringify(window.todos || []));
                localStorage.setItem('worktimes', JSON.stringify(window.worktimes || []));
                localStorage.setItem('diaryEntries', JSON.stringify(window.diaryEntries || []));
            } finally {
                isApplyingServerData = false;
                console.log('[SYNC] Finished applying server data (isApplyingServerData reset to false).');
            }

            updateSnapshotsFromLocalStorage();

            if (typeof window.refreshAppUI === 'function') {
                console.log('[SYNC] Calling window.refreshAppUI() after pullData().');
                window.refreshAppUI();
            }
            showStatus('Synced to Cloud');
        })
        .catch(err => {
            console.error('[SYNC] pullData() error:', err);
            showStatus('Sync Error (Offline)');
        });
    }

    // Expose for todo.js/worktime.js/diary.js
    window.refreshFromCloud = function(reason) {
        console.log('[SYNC] window.refreshFromCloud() called. reason =', reason || 'manual');
        try {
            pullData(reason || 'refreshFromCloud');
        } catch (e) {
            console.error('[SYNC] refreshFromCloud error:', e);
        }
    };

    // --- PUSH Data on Change ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const pushData = debounce(() => {
        console.log('[SYNC] pushData() debounced function executing. isLoggedIn =', isLoggedIn);

        // If not logged in, localStorage is already updated,
        // we just show a helpful status.
        if (!isLoggedIn) {
            showStatus('Saved Locally');
            return;
        }

        const payload = {
            todos: window.todos || [],
            worktimes: window.worktimes || [],
            diaryEntries: window.diaryEntries || []
        };

        console.log('[SYNC] pushData() sending payload to server:', {
            todosCount: payload.todos.length,
            worktimesCount: payload.worktimes.length,
            diaryEntriesCount: payload.diaryEntries.length
        });

        showStatus('Saving to Cloud...');

        fetch(wpAppData.root + 'todo-app/v1/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': wpAppData.nonce
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            console.log('[SYNC] pushData() fetch completed. HTTP status =', response.status);
            return response.json();
        })
        .then(data => {
            console.log('[SYNC] pushData() server response JSON:', data);
            showStatus('Saved to Cloud');
            updateSnapshotsFromLocalStorage();
        })
        .catch(err => {
            console.error('[SYNC] pushData() error:', err);
            showStatus('Save Failed');
        });
    }, 2000);

    // --- Intercept localStorage.setItem to trigger Sync/UI update ---
    const originalSetItem = localStorage.setItem.bind(localStorage);

    localStorage.setItem = function(key, value) {
        // Log ALL setItem calls first
        try {
            console.log('[SYNC][LS] localStorage.setItem called:', {
                key,
                valuePreview: (typeof value === 'string' ? value.slice(0, 80) : String(value).slice(0, 80)),
                isApplyingServerData
            });
            // If you want full stack traces for weird writes, temporarily uncomment:
            // console.trace('[SYNC][LS] Trace for setItem key', key);
        } catch (e) {
            console.warn('[SYNC][LS] logging error', e);
        }

        originalSetItem.apply(this, arguments);

        // Ignore writes that come from applying server data (pullData)
        if (isApplyingServerData) {
            console.log('[SYNC][LS] Ignoring setItem for key', key, 'because isApplyingServerData = true.');
            return;
        }

        if (!watchedKeys.includes(key)) {
            // Not one of the synced keys
            return;
        }

        const newVal = String(value);
        const prevVal = lastSnapshots[key];

        console.log('[SYNC][LS] Watched key set:', {
            key,
            prevLen: prevVal ? prevVal.length : 0,
            newLen: newVal.length,
            changed: prevVal !== newVal
        });

        if (prevVal === newVal) {
            console.log('[SYNC][LS] Value did not change for key', key, '- NOT triggering pushData().');
            return;
        }

        // Record new snapshot and trigger push
        lastSnapshots[key] = newVal;
        console.log('[SYNC][LS] Value changed for key', key, '- scheduling pushData().');
        pushData();
    };

    // --- Auto-pull when tab becomes visible again ---
    document.addEventListener('visibilitychange', function() {
        console.log('[SYNC][PAGE] visibilitychange:', document.visibilityState);
        if (document.visibilityState === 'visible') {
            pullData('visibilitychange');
        }
    });

    // --- Auto-pull when window gains focus (desktop) ---
    window.addEventListener('focus', function() {
        console.log('[SYNC][PAGE] window focus event fired.');
        pullData('window-focus');
    });

    // Initial pull on page load
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[SYNC][PAGE] DOMContentLoaded, calling pullData().');
        pullData('DOMContentLoaded');
    });
})();
