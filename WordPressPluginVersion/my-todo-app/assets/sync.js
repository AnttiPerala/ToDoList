(function() {
    const statusEl = document.getElementById('syncStatus');
    const isLoggedIn = typeof wpAppData !== 'undefined' && wpAppData.is_logged_in;
    
    let isDirty = false;
    let syncTimer = null;

    // --- UTILS ---
    function showStatus(msg, color) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        if(color) statusEl.style.color = color;
        else statusEl.style.color = ''; 
    }

    if (statusEl) {
        statusEl.title = isLoggedIn ? "Syncing with Cloud" : "Saved Locally (Click to Login)";
        statusEl.style.cursor = 'pointer';
        statusEl.addEventListener('click', () => {
            if (!isLoggedIn && wpAppData.login_url) window.location.href = wpAppData.login_url;
            else pullData(); 
        });
        if(!isLoggedIn) showStatus("Saved Locally", "gray");
    }

    // --- DEBUG MERGE LOGIC ---
    function mergeArrays(localArray, serverArray, typeName) {
        console.groupCollapsed(`[SYNC] Merging ${typeName} (${serverArray.length} server items vs ${localArray.length} local)`);
        
        const map = new Map();
        
        // 1. Load Local
        localArray.forEach(item => map.set(item.id, item));

        // 2. Compare Server
        let updates = 0;
        let conflicts = 0;
        let localWins = 0;

        serverArray.forEach(serverItem => {
            const localItem = map.get(serverItem.id);
            
            if (!localItem) {
                // New from server
                map.set(serverItem.id, serverItem);
                updates++;
                console.log(`[SYNC] New Item from Server: ${serverItem.id}`);
            } else {
                // Conflict Resolution
                const serverTimeStr = serverItem.lastModified || "1970-01-01T00:00:00.000Z";
                const localTimeStr = localItem.lastModified || "1970-01-01T00:00:00.000Z";
                
                const serverTime = new Date(serverTimeStr).getTime();
                const localTime = new Date(localTimeStr).getTime();
                const timeDiff = serverTime - localTime;

                // Log the conflict details
                // Only log if they are semantically different (e.g. Done status changed)
                const isSemanticallyDifferent = JSON.stringify(serverItem) !== JSON.stringify(localItem);

                if (serverTime > localTime) {
                    // Server Wins
                    map.set(serverItem.id, serverItem);
                    updates++;
                    console.log(`[SYNC][WIN:SERVER] ID: ${serverItem.id} | Server (${serverTimeStr}) is newer than Local (${localTimeStr}). Diff: ${timeDiff/1000}s`);
                } else if (serverTime < localTime) {
                    // Local Wins
                    localWins++;
                    isDirty = true; // We have data the server doesn't have
                    if(isSemanticallyDifferent) {
                        console.warn(`[SYNC][WIN:LOCAL] ID: ${serverItem.id} | Local (${localTimeStr}) is newer than Server (${serverTimeStr}). Keeping Local. Diff: ${Math.abs(timeDiff/1000)}s`);
                    }
                } else {
                    // Equal timestamps
                    if(isSemanticallyDifferent) {
                        // Timestamps equal but data different? Prefer server to force consistency
                        console.warn(`[SYNC][TIE] ID: ${serverItem.id} | Timestamps identical but content differs. Preferring Server.`);
                        map.set(serverItem.id, serverItem);
                        updates++;
                    }
                }
            }
        });

        console.log(`[SYNC] Merge Complete: ${updates} accepted from server, ${localWins} kept from local.`);
        console.groupEnd();
        return Array.from(map.values());
    }

    // --- SYNC FUNCTIONS ---

    function pullData() {
        if (!isLoggedIn) return;
        showStatus('Syncing...');

        // Anti-cache param
        const url = wpAppData.root + 'todo-app/v1/sync?t=' + Date.now();

        fetch(url, {
            method: 'GET',
            headers: { 
                'X-WP-Nonce': wpAppData.nonce,
                'Cache-Control': 'no-store'
            }
        })
        .then(res => {
            console.log(`[SYNC] Pull HTTP Status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            let changed = false;

            if (data.todos) {
                window.todos = mergeArrays(window.todos, data.todos, "Todos");
                changed = true;
            }
            if (data.worktimes) {
                window.worktimes = mergeArrays(window.worktimes, data.worktimes, "Worktimes");
                changed = true;
            }
            if (data.diaryEntries) {
                window.diaryEntries = mergeArrays(window.diaryEntries, data.diaryEntries, "Diary");
                changed = true;
            }

            if (changed) {
                // Re-hydrate dates
                window.todos.forEach(t => { if(t.deadline) t.deadline = new Date(t.deadline); });
                window.worktimes.forEach(w => { w.start = new Date(w.start); w.end = new Date(w.end); });

                // Save to LS
                localStorage.setItem('todos', JSON.stringify(window.todos));
                localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
                localStorage.setItem('diaryEntries', JSON.stringify(window.diaryEntries));
                
                window.refreshAppUI();
                showStatus('Synced');
            }
        })
        .catch(err => {
            console.error('[SYNC] Pull Failed:', err);
            showStatus('Offline', 'red');
        });
    }

    function pushData() {
        if (!isLoggedIn) return;
        if (!isDirty) return;

        showStatus('Saving...');
        console.log('[SYNC] Pushing data to server...');

        const payload = {
            todos: window.todos,
            worktimes: window.worktimes,
            diaryEntries: window.diaryEntries
        };

        fetch(wpAppData.root + 'todo-app/v1/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': wpAppData.nonce
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log('[SYNC] Push successful. Server Response:', data);
            isDirty = false;
            showStatus('Saved to Cloud');
        })
        .catch(err => {
            console.error('[SYNC] Push Error:', err);
            showStatus('Save Failed (Retrying)', 'orange');
        });
    }

    // --- API ---
    window.appSync = {
        triggerSync: function() {
            isDirty = true;
            showStatus('Unsaved Changes...', '#888');
            console.log('[SYNC] Local change detected. Scheduling push...');
            clearTimeout(syncTimer);
            syncTimer = setTimeout(pushData, 2000);
        }
    };

    // --- INIT ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[SYNC] Initializing...');
        pullData();
    });
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('[SYNC] Tab visible, pulling...');
            pullData();
        }
    });
    
    window.addEventListener('focus', () => {
         console.log('[SYNC] Window focused, pulling...');
         pullData();
    });

    // Beacon for close
    window.addEventListener('beforeunload', () => {
        if (isLoggedIn && isDirty) {
            const payload = { todos: window.todos, worktimes: window.worktimes, diaryEntries: window.diaryEntries };
            const blob = new Blob([JSON.stringify(payload)], {type: 'application/json'});
            navigator.sendBeacon(wpAppData.root + 'todo-app/v1/sync', blob);
        }
    });

})();