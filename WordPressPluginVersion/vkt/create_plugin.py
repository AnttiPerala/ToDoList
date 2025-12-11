import os
import zipfile

# --- CONFIGURATION ---
plugin_name = "my-todo-app"

# --- 1. PHP Plugin File ---
php_content = r"""<?php
/*
Plugin Name: My Todo & Worktime App (Complete)
Description: The full version of your Todo/Worktime/Diary app synced to WordPress.
Version: 2.4
Author: Generated
*/

if ( ! defined( 'ABSPATH' ) ) exit;

// 1. REST API for Syncing
add_action( 'rest_api_init', function () {
    register_rest_route( 'todo-app/v1', '/sync', array(
        'methods' => 'GET',
        'callback' => 'mta_get_data',
        'permission_callback' => function() { return is_user_logged_in(); }
    ));

    register_rest_route( 'todo-app/v1', '/sync', array(
        'methods' => 'POST',
        'callback' => 'mta_save_data',
        'permission_callback' => function() { return is_user_logged_in(); }
    ));
});

function mta_get_data( $request ) {
    $user_id = get_current_user_id();
    $data = get_user_meta( $user_id, 'mta_app_data', true );
    if ( empty( $data ) ) {
        return new WP_REST_Response( array( 'todos' => [], 'worktimes' => [], 'diaryEntries' => [] ), 200 );
    }
    return new WP_REST_Response( $data, 200 );
}

function mta_save_data( $request ) {
    $user_id = get_current_user_id();
    $params = $request->get_json_params();
    update_user_meta( $user_id, 'mta_app_data', $params );
    return new WP_REST_Response( array( 'status' => 'success' ), 200 );
}

// 2. Page Template
add_filter( 'theme_page_templates', function( $templates ) {
    $templates['app-template.php'] = 'Todo App Canvas';
    return $templates;
});

add_filter( 'template_include', function( $template ) {
    if ( is_page() ) {
        $meta = get_post_meta( get_the_ID(), '_wp_page_template', true );
        if ( 'app-template.php' == $meta ) {
            return plugin_dir_path( __FILE__ ) . 'templates/app-template.php';
        }
    }
    return $template;
});

// 3. Asset Loading
add_action( 'wp_enqueue_scripts', function() {
    if ( is_page() && get_page_template_slug() == 'app-template.php' ) {
        
        wp_enqueue_style( 'mta-style', plugins_url( 'assets/style.css', __FILE__ ), array(), '2.4' );

        $deps = array('jquery'); 
        
        // 1. Generic (Global) - We localize data here so it exists before Todo/Worktime load
        wp_enqueue_script( 'mta-generic', plugins_url( 'assets/generic.js', __FILE__ ), $deps, '2.4', true );
        
        wp_localize_script( 'mta-generic', 'wpAppData', array(
            'root' => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
            'is_logged_in' => is_user_logged_in(),
            'login_url' => wp_login_url( get_permalink() )
        ));

        // 2. Helpers
        wp_enqueue_script( 'mta-sorting', plugins_url( 'assets/todoSorting.js', __FILE__ ), array('mta-generic'), '2.4', true );
        wp_enqueue_script( 'mta-export', plugins_url( 'assets/exportWorktimeToSystem.js', __FILE__ ), array('mta-generic'), '2.4', true );
        
        // 3. Modules
        wp_enqueue_script( 'mta-todo', plugins_url( 'assets/todo.js', __FILE__ ), array('mta-generic', 'mta-sorting'), '2.4', true );
        wp_enqueue_script( 'mta-worktime', plugins_url( 'assets/worktime.js', __FILE__ ), array('mta-generic', 'mta-export'), '2.4', true );
        wp_enqueue_script( 'mta-diary', plugins_url( 'assets/diary.js', __FILE__ ), array('mta-generic'), '2.4', true );

        // 4. Sync Logic
        wp_enqueue_script( 'mta-sync', plugins_url( 'assets/sync.js', __FILE__ ), array('mta-todo', 'mta-worktime', 'mta-diary'), '2.4', true );
    }
});
"""

# --- 2. HTML Template ---
html_content = r"""<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta charset="UTF-8">
  <title><?php the_title(); ?></title>
  <?php wp_head(); ?>
  <style>
      /* Reset WP admin bar interference */
      html { margin-top: 0 !important; } 
      #wpadminbar { display: none; }
  </style>
</head>
<body>
  <header id="myHeader">
    <!-- menu 2 -->
    <div class="menuWrap">
      <input id="menu-toggle" type="checkbox" />
      <label class="menu-button-container" for="menu-toggle">
          <div class="menu-button"></div>
      </label>
      <ul class="menu">
      </ul>
    </div>

    <div class="titleBlock">
      <h1 id="mainTitle">To Do List</h1>
      <p id="todo-stats" class="todo-stats"></p>
    </div>
    
    <!-- Sync Status Indicator -->
    <div id="syncStatus" style="position:fixed; top:10px; right:10px; font-size:12px; opacity:0.8; z-index:9999; background:rgba(255,255,255,0.9); padding:4px 8px; border-radius:4px; font-weight:bold; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
  </header>

  <div id="modeSelect">
    <button id="btnTodoMode" class="btn" type="submit">To Do</button>
    <button id="btnWorktimeMode" class="btn inactive" type="submit">Worktime</button>
    <button id="btnDiaryMode" class="btn inactive" type="submit">Diary</button>
  </div>

  <div id="todoModeWrap">
    <div id="menuRow">
      <form id="todoForm">
        <div class="input-wrapper" style="width:100%; position:relative;">
            <textarea id="todoInput" placeholder="Add a new task"></textarea>
            <button type="button" class="clear-input">×</button>
        </div>

        <button class="collapsible-btn" type="button">Options</button>

        <div class="collapsible-content">
          <div class="dropdown">
            <label for="categorySelect">Category:</label>
            <select id="categorySelect">
              <option value="none">None</option>
              <option value="personal">Personal</option>
              <option value="work">Work</option>
              <option value="software">Software</option>
              <option value="school">School</option>
              <option value="groceries">Groceries</option>
              <option value="household">Household</option>
              <option value="entertainment">Entertainment</option>
              <option value="children">Children</option>
              <option value="fitness">Fitness</option>
            </select>
            <span class='close'>&#215;</span>
          </div>

          <div class="deadLineWrap">
            Deadline: <input type="date" id="deadlineInput" />
          </div>

          <div id="notificationPlaceholder">
            <div id="notificationWrap">
              <label for="notificationToggle"> Enable notifications</label>
              <input type="checkbox" id="notificationToggle" name="notificationToggle" />
              <button id="testNotification" type="button">Test Notification</button>
            </div>
          </div>

          <div id="priorityCheckWrap">
            <label for="priorityCheck">Top Priority: </label>
            <input type="checkbox" id="topPriorityCheck" class="large-checkbox" />
            <br />
            <label for="priorityCheck">Mid Priority: </label>
            <input type="checkbox" id="midPriorityCheck" class="large-checkbox" />
          </div>
          <div class="dropdown">
            <button class="dropbtn chooseColor" id="dropbtn" type="button">Choose color</button>
            <div class="dropdown-content" id="dropdown">
              <div style="background-color: #ffb3ba" class="color-option"></div>
              <div style="background-color: #ffdfba" class="color-option"></div>
              <div style="background-color: #ffffba" class="color-option"></div>
              <div style="background-color: #baffc9" class="color-option"></div>
              <div style="background-color: #bae1ff" class="color-option"></div>
              <div style="background-color: #e8b5ce" class="color-option"></div>
              <div style="background-color: #f7d5b6" class="color-option"></div>
              <div style="background-color: #f2f6b6" class="color-option"></div>
              <div style="background-color: #a6e3d7" class="color-option"></div>
              <div style="background-color: #c3ddf9" class="color-option"></div>
              <div style="background-color: #ccd1ff" class="color-option"></div>
              <div style="background-color: #e8ccff" class="color-option"></div>
              <div style="background-color: #ffccf9" class="color-option"></div>
              <div style="background-color: #ffcccc" class="color-option"></div>
              <div style="background-color: #d5a6a6" class="color-option"></div>
              <div style="background-color: #aedff7" class="color-option"></div>
              <div style="background-color: #d6f5d6" class="color-option"></div>
              <div style="background-color: #f5f6c4" class="color-option"></div>
              <div style="background-color: #f6ecf7" class="color-option"></div>
              <div style="background-color: #f7d9c4" class="color-option"></div>
            </div>
          </div>

          <div id="extraInfoButtonContainer">
            <button class="addDetails btn" type="button">+ Details</button>
            <input type="file" id="uploadInput" style="display: none" />
          </div>

          <div id="detailsContainer"></div>
        </div>

        <button class="submitTodo button-30" type="submit">Add</button>
      </form>
    </div>

    <div id="detailsModal" class="modal">
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        <h2>Todo Details</h2>
        <p id="detailsText"></p>
        <button id="saveDetailsBtn">Edit Details</button>
      </div>
    </div>

    <span id="categoryFilteringNotice"></span>
    <ul id="todoList"></ul>
    <div id="toast"></div>
  </div>

  <!-- Worktime Container -->
  <div id="worktimeModeWrap" style="display: none;">
    <form id="worktimeForm">
      <input type="text" id="workDescription" placeholder="Enter work description" required />

      <!-- IMPORTANT: The JS will replace/append to this, so we need the parent structure correct -->
      <datalist id="projectList"></datalist> 
      
      <input type="datetime-local" id="workStart" required />
      <input type="number" id="workDuration" placeholder="Duration in minutes (optional)" min="1" />
      <span id="durationHelper" class="duration-helper"></span>
      <input type="datetime-local" id="workEnd" />
      <button type="submit" class="button-30">Add Worktime</button>
    </form>
    <br>
    <div id="worktimeTotalsTop" class="worktime-totals-top"></div>

    <ul id="worktimeList"></ul>
  </div> 
  
  <div id="worktimeProjectTotalsModal" style="position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: rgba(20,20,20,0.96); color: #fff; padding: 10px 14px; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,0.35); font-size: 14px; line-height: 1.2; opacity: 0; pointer-events: none; transition: opacity 300ms ease; z-index: 9999; max-width: 90vw; text-align: center;" aria-live="polite" aria-hidden="true"></div>

  <!--  Diary Container -->
  <div id="diaryModeWrap" style="display: none;">
    <form id="diaryForm">
      <div style="position:relative;">
          <textarea id="diaryInput" placeholder="Write your diary entry..." rows="4" style="width: 100%; margin-bottom: 10px;"></textarea>
          <button type="button" class="diary-clear-input">×</button>
      </div>

      <div class="diaryEntryButtons">
        <input type="date" id="diaryDate" required>
        <select id="diaryCategory" required>
          <option value="Life Event">Life Event</option>
          <option value="Purchase">Purchase</option>
          <option value="Item placement">Item placement</option>
          <option value="Data location change">Data location change</option>
        </select>
        <button type="submit" class="button-30">Add Entry</button>
      </div>
    </form>
    <ul id="diaryList"></ul>
  </div>

  <?php wp_footer(); ?>
</body>
</html>"""

# --- 3. JavaScript Assets ---

# 3a. Generic (UPDATED: Added dynamic header padding logic)
generic_js = r"""
// --- GLOBAL DATA STORAGE ---
window.todos = JSON.parse(localStorage.getItem('todos')) || [];
window.worktimes = JSON.parse(localStorage.getItem('worktimes')) || [];
window.diaryEntries = JSON.parse(localStorage.getItem('diaryEntries')) || [];

// --- GLOBAL DOM ELEMENTS ---
window.todoBtn = document.getElementById("btnTodoMode");
window.worktimeBtn = document.getElementById("btnWorktimeMode");
window.diaryBtn = document.getElementById("btnDiaryMode");
window.todoContainer = document.getElementById("todoModeWrap");
window.worktimeContainer = document.getElementById("worktimeModeWrap");
window.diaryContainer = document.getElementById("diaryModeWrap");

// --- DATA NORMALIZATION ---
window.todos = window.todos.map(todo => {
    if (todo.deadline) todo.deadline = new Date(todo.deadline);
    if (!('timeAdded' in todo) || !todo.timeAdded) {
        const idNum = Number(todo.id);
        todo.timeAdded = (!Number.isNaN(idNum) && idNum > 0) ? new Date(idNum).toISOString().split('.')[0] : "unknown";
    }
    if (!('timeDone' in todo)) todo.timeDone = todo.done ? new Date().toISOString().split('.')[0] : "";
    return todo;
});

window.worktimes = window.worktimes.map(worktime => ({
    ...worktime,
    start: new Date(worktime.start),
    end: new Date(worktime.end)
}));

// --- HELPERS ---
window.refreshAppUI = function() {
    if (typeof drawTodos === 'function') drawTodos();
    if (typeof drawWorktimes === 'function') {
        const pf = document.getElementById('projectFilter');
        drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
    }
    if (typeof drawDiary === 'function') drawDiary();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
};

function hexToRgb(hex) {
    let bigint = parseInt(hex.slice(1), 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return [r, g, b];
}

function formatDateToDateTimeLocal(date) {
    let parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return "";
    return parsedDate.toISOString().split('.')[0];
}

function formatDateTimeForDisplay(isoString) {
    if (!isoString) return "";
    const dateObj = new Date(isoString);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return dateObj.toLocaleString(undefined, options);
}

function isToday(date) {
    let parsedDate;
    if (!date) return false;
    if (typeof date === 'string') parsedDate = new Date(date);
    else if (date instanceof Date) parsedDate = date;
    else return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate.getTime() === today.getTime();
}

function handleBackup() {
    const dataToExport = {
        todos: window.todos,
        worktimes: window.worktimes,
        diaryEntries: window.diaryEntries
    };
    const dataStr = JSON.stringify(dataToExport);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'full_app_backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleRestore() {
    const existingInput = document.getElementById('uploadInput');
    if (existingInput) existingInput.remove();
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.id = 'uploadInput';
    uploadInput.style.display = 'none';
    document.body.appendChild(uploadInput);
    uploadInput.addEventListener('change', handleFileUpload);
    uploadInput.click();
}

function handleFileUpload(e) {
    let file = e.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let json = JSON.parse(e.target.result);
            if (json.todos && json.worktimes && json.diaryEntries) {
                window.todos = json.todos.map(t => { if(t.deadline) t.deadline = new Date(t.deadline); return t; });
                window.worktimes = json.worktimes.map(w => ({...w, start: new Date(w.start), end: new Date(w.end)}));
                window.diaryEntries = json.diaryEntries;
                localStorage.setItem('todos', JSON.stringify(window.todos));
                localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
                localStorage.setItem('diaryEntries', JSON.stringify(window.diaryEntries));
                window.refreshAppUI();
                alert("Data restored!");
            }
        } catch (error) { alert("Restore failed: " + error); }
    };
    reader.readAsText(file);
}

window.updateHeaderStats = function() {
    const el = document.getElementById('todo-stats');
    if (!el) return;
    const isVisible = (node) => {
        if (!node) return false;
        const cs = window.getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
        return (node.offsetWidth + node.offsetHeight) > 0;
    };
    if (isVisible(window.worktimeContainer)) {
        const n = window.worktimes ? window.worktimes.length : 0;
        el.textContent = `total of ${n} worktimes recorded`;
        return;
    }
    if (isVisible(window.diaryContainer)) {
        const n = window.diaryEntries ? window.diaryEntries.length : 0;
        el.textContent = `${n} diary entries written`;
        return;
    }
    const total = window.todos ? window.todos.length : 0;
    const completed = window.todos ? window.todos.filter(t => t && t.done).length : 0;
    el.textContent = `${Math.max(0, total - completed)} todos to do, ${completed} todos completed`;
}

// --- DYNAMIC HEADER SPACING (Layout Fix) ---
function setHeaderPadding() {
    const header = document.getElementById('myHeader');
    if (!header) return;
    const h = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', h + 'px');
    // Fallback for CSS not using the var
    document.body.style.paddingTop = h + 'px';
}

function setupStatsObservers() {
    window.addEventListener('storage', window.updateHeaderStats);
    window.updateHeaderStats();
    if(document.getElementById('mainTitle')) {
        document.getElementById('mainTitle').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
}

// Init
window.addEventListener('load', () => {
    setupStatsObservers();
    setHeaderPadding();
});
window.addEventListener('resize', setHeaderPadding);
document.addEventListener('DOMContentLoaded', setHeaderPadding);
// Re-run after delay to account for font loading/rendering
setTimeout(setHeaderPadding, 100);
setTimeout(setHeaderPadding, 500);
"""

# 3b. Sync Logic
sync_js = r"""
(function() {
    const statusEl = document.getElementById('syncStatus');
    const isLoggedIn = (typeof wpAppData !== 'undefined') ? wpAppData.is_logged_in : false; 

    function showStatus(msg) {
        if(statusEl) statusEl.textContent = msg;
        console.log('[Sync] ' + msg);
    }

    // --- SETUP STATUS BUTTON UI ---
    if(statusEl) {
        statusEl.title = "If you don't have an account data, data is saved to your browsers local storage. Create an account by clicking here if you want cloud sync";
        statusEl.style.cursor = 'pointer';
        statusEl.addEventListener('click', () => {
            if(typeof wpAppData !== 'undefined' && wpAppData.login_url) {
                window.location.href = wpAppData.login_url;
            } else {
                alert("Login URL not found. Please refresh.");
            }
        });

        if (!isLoggedIn) {
            statusEl.textContent = "Saved Locally (Not logged in)";
            statusEl.style.backgroundColor = "rgba(255, 230, 230, 0.9)";
            statusEl.style.color = "#333";
        }
    }

    // 1. PULL Data
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

            if(window.todos) window.todos.forEach(t => { if(t.deadline) t.deadline = new Date(t.deadline); });
            if(window.worktimes) window.worktimes.forEach(w => { w.start = new Date(w.start); w.end = new Date(w.end); });

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

    // 2. PUSH Data
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const pushData = debounce(() => {
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
"""

# 3c. Todo JS
todo_js = r"""
function rgbToHex(rgbStr) {
    if(typeof rgbStr !== 'string') return "#FFFFFF";
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgbStr);
    return result ? "#" + (1 << 24 | result[1] << 16 | result[2] << 8 | result[3]).toString(16).slice(1).toUpperCase() : rgbStr;
}

window.filteredTodos = window.todos;

function updateLocalStorage() { 
    localStorage.setItem('todos', JSON.stringify(window.todos)); 
}

let bgColors = ["#F0F8FF", "#F0FFF0", "#FFF5EE", "#F5F5F5", "#FFFACD", "#FFDAB9", "#FFE4E1", "#FFF0F5", "#FAF0E6", "#FDF5E6"];
let selectedColor;
let notificationToggle = document.getElementById('notificationToggle');

const form = document.getElementById('todoForm');
const input = document.getElementById('todoInput');
const list = document.getElementById('todoList');
const clearButton = document.querySelector('.clear-input');

if(input) input.addEventListener('input', () => { clearButton.style.display = input.value ? 'block' : 'none'; });
if(clearButton) clearButton.addEventListener('click', () => { input.value = ''; clearButton.style.display = 'none'; input.focus(); drawTodos(); });

if(form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const trimmedInput = input.value.trim();
    if (!trimmedInput) { alert("Please enter a task!"); return; }

    const topPriorityCheck = document.getElementById('topPriorityCheck');
    const midPriorityCheck = document.getElementById('midPriorityCheck');
    const deadlineInput = document.getElementById('deadlineInput');
    const categoryValue = document.getElementById('categorySelect').value;
    const detailsTextarea = document.querySelector('.detailsTextarea');

    let maxVotes = window.todos.length ? Math.max(...window.todos.map(t => t.votes)) : 0;
    let sumVotes = window.todos.reduce((acc, t) => acc + t.votes, 0);
    let averageVotes = window.todos.length ? Math.round(sumVotes / window.todos.length) : 1; 

    let newTodo = {
        id: Date.now(),
        text: trimmedInput,
        votes: topPriorityCheck.checked ? maxVotes + 1 : midPriorityCheck.checked ? averageVotes : 0,
        deadline: deadlineInput.value ? new Date(deadlineInput.value) : null,
        done: false,
        bgColor: selectedColor,
        details: detailsTextarea ? detailsTextarea.value : null,
        category: categoryValue,
        timeAdded: new Date().toISOString(),
        timeDone: ""
    }

    window.todos.push(newTodo);
    updateLocalStorage();
    if(typeof applyPreferredSorting === 'function') applyPreferredSorting();

    input.value = '';
    deadlineInput.value = '';
    topPriorityCheck.checked = false;
    midPriorityCheck.checked = false;

    drawTodos();
    if(document.getElementById('detailsContainer')) document.getElementById('detailsContainer').innerHTML = '';

    let wavebutton = document.querySelector('.submitTodo');
    if(wavebutton) {
        let wave = document.createElement('div');
        wave.classList.add('wave', 'animate');
        wavebutton.textContent = 'Added!';
        wavebutton.appendChild(wave);
        wave.addEventListener('animationend', function() { wave.remove(); wavebutton.textContent = 'Add'; });
    }
});

function showToast(message) {
    const toast = document.getElementById("toast");
    if(!toast) return;
    toast.innerHTML = message;
    toast.className = "toast show";
    setTimeout(function() { toast.className = toast.className.replace("show", ""); }, 3000);
}

window.drawTodos = function() {
    let list = document.querySelector('#todoList');
    if(!list) return;
    list.innerHTML = '';

    let categoryDrodown = document.getElementById('categorySelect');
    filterTodosByCategory(categoryDrodown ? categoryDrodown.value : 'none');
    
    window.filteredTodos.forEach(todo => {
        let listItem = document.createElement('li');
        let timeAddedValue = (todo.timeAdded && todo.timeAdded !== 'unknown') ? new Date(todo.timeAdded).toISOString().split('.')[0] : todo.id;
        
        listItem.setAttribute('data-timeAdded', timeAddedValue);
        if (todo.timeDone) listItem.setAttribute('data-timeDone', new Date(todo.timeDone).toLocaleString());
        listItem.id = todo.id;
        if (todo.details) listItem.setAttribute('data-details', todo.details);

        let todoText = document.createElement('span');
        todoText.classList.add("toDoText");
        todoText.textContent = todo.text;

        let voteDisplay = document.createElement('span');
        voteDisplay.classList.add('votes');
        voteDisplay.textContent = `Votes: ${todo.votes}`;
        voteDisplay.dataset.id = todo.id;
        voteDisplay.addEventListener('dblclick', function() { editVotes(todo.id); });

        let infoBtn = document.createElement('button');
        infoBtn.classList.add("info-button");
        infoBtn.innerHTML = '<span>i</span>';
        infoBtn.addEventListener('click', (e) => {
            resetModal();
            let listItem = e.target.closest('li'); 
            let details = listItem.getAttribute('data-details');
            showDetails(todo.id, generateDetailsHTML(todo, details));
        });

        let upvoteBtn = document.createElement('button'); upvoteBtn.classList.add("button-30"); upvoteBtn.textContent = 'Upvote'; upvoteBtn.addEventListener('click', () => upvote(todo.id));
        let downvoteBtn = document.createElement('button'); downvoteBtn.classList.add("button-30"); downvoteBtn.textContent = 'Downvote'; downvoteBtn.addEventListener('click', () => downvote(todo.id));
        let doneBtn = document.createElement('button'); doneBtn.classList.add("button-30"); doneBtn.textContent = 'Done'; doneBtn.addEventListener('click', () => doneTodo(todo.id));
        let deleteBtn = document.createElement('button'); deleteBtn.classList.add("button-30"); deleteBtn.textContent = 'Delete'; deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        let deadlineDisplay = document.createElement('span');
        deadlineDisplay.classList.add('deadline');
        if (todo.deadline) {
            if (!(todo.deadline instanceof Date)) todo.deadline = new Date(todo.deadline);
            if (!isNaN(todo.deadline.getTime())) deadlineDisplay.textContent = `Deadline: ${todo.deadline.toDateString()}`;
        }

        listItem.appendChild(todoText);
        listItem.appendChild(deadlineDisplay);
        listItem.appendChild(voteDisplay);
        listItem.appendChild(infoBtn);
        listItem.appendChild(upvoteBtn);
        listItem.appendChild(downvoteBtn);
        listItem.appendChild(deleteBtn);
        listItem.appendChild(doneBtn);

        listItem.setAttribute('draggable', 'true');
        listItem.style.backgroundColor = todo.bgColor ? todo.bgColor : '#fff';

        listItem.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', todo.id); });
        todoText.addEventListener('dblclick', function(e) { e.preventDefault(); editTodo(todo.id); });
        if (todo.done) listItem.classList.add('done');
        listItem.classList.add('listItem');
        list.appendChild(listItem);
    }); 
    if(window.updateHeaderStats) window.updateHeaderStats();
}

function generateDetailsHTML(todo, details) {
    return `
    <table class="detailsTable"><tbody>
      <tr class="detailsMainText"><th>Text</th><td><span class="value">${todo.text}</span></td></tr>
      <tr class="detailsCategory"><th>Category</th><td><span class="value">${todo.category ? todo.category : "None"}</span></td></tr>
      <tr class="detailsVotes"><th>Votes</th><td><span class="value">${todo.votes}</span></td></tr>
      <tr class="detailsDate"><th>Time Added</th><td><span class="value">${formatDateTimeForDisplay(todo.timeAdded)}</span></td></tr>
      <tr class="detailsDeadline"><th>Deadline</th><td data-iso="${todo.deadline}"><span class="value">${formatDateTimeForDisplay(todo.deadline)}</span></td></tr>
      <tr class="detailsBgColor"><th>Color</th><td><span class="value"><code class="color-hex">${todo.bgColor || ''}</code></span></td></tr>
      <tr class="detailsDetails"><th>Details</th><td><span class="value">${details || "None"}</span></td></tr>
    </tbody></table>`;
}

function doneTodo(id) {
    let todo = window.todos.find(t => t.id === id);
    const listItem = document.getElementById(id);
    listItem.classList.add('slide-out');
    listItem.addEventListener('animationend', () => {
        todo.done = !todo.done;
        todo.timeDone = todo.done ? new Date().toISOString() : null;
        applyPreferredSorting(); updateLocalStorage(); drawTodos();
    });
}

function deleteTodo(id) {
    let todo = window.todos.find(t => t.id === id);
    if (window.confirm(`Delete: "${todo.text}"?`)) {
        const listItem = document.getElementById(id);
        listItem.classList.add('scale-out');
        listItem.addEventListener('animationend', () => {
            window.todos = window.todos.filter(todo => todo.id !== id);
            applyPreferredSorting(); updateLocalStorage(); drawTodos();
        });
    }
}

function upvote(id) { let t = window.todos.find(t => t.id === id); t.votes++; applyPreferredSorting(); drawTodos(); updateLocalStorage(); }
function downvote(id) { let t = window.todos.find(t => t.id === id); t.votes--; applyPreferredSorting(); drawTodos(); updateLocalStorage(); }

if(list) {
    list.addEventListener('dragover', (e) => { e.preventDefault(); });
    list.addEventListener('drop', (e) => {
        e.preventDefault();
        let id = parseInt(e.dataTransfer.getData('text/plain'));
        let index = window.todos.findIndex(t => t.id === id);
        let [todo] = window.todos.splice(index, 1);
        let dropTargetId = parseInt(e.target.closest('li').dataset.id);
        let dropTargetIndex = window.todos.findIndex(t => t.id === dropTargetId);
        window.todos.splice(dropTargetIndex, 0, todo);
        updateLocalStorage(); drawTodos();
    });
}

function editTodo(id) {
    const todo = window.todos.find(todo => todo.id === id);
    const listItem = document.getElementById(id);
    const input = document.createElement('input');
    input.value = todo.text;
    input.addEventListener('blur', (e) => { todo.text = e.target.value; drawTodos(); updateLocalStorage(); });
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
    listItem.textContent = ''; listItem.appendChild(input); input.focus();
}

function editVotes(id) {
    const todo = window.todos.find(todo => todo.id === id);
    const voteDisplay = document.querySelector(`.votes[data-id='${id}']`);
    const input = document.createElement('input');
    input.type = 'number'; input.value = todo.votes;
    input.addEventListener('blur', (e) => { todo.votes = parseInt(e.target.value); applyPreferredSorting(); updateLocalStorage(); drawTodos(); });
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
    voteDisplay.textContent = ''; voteDisplay.appendChild(input); input.focus();
}

let modal = document.getElementById('detailsModal');
let closeModal = document.querySelector('.modal-close');
let detailsTextElem = document.getElementById('detailsText');
let saveDetailsBtn = document.getElementById('saveDetailsBtn');
let isEditing = false;

function showDetails(todoId, detailsHTML) {
    detailsTextElem.innerHTML = detailsHTML;
    modal.setAttribute('data-todo-id', todoId);
    modal.style.display = 'block';
}

closeModal.onclick = function() { modal.style.display = 'none'; isEditing = false; updateLocalStorage(); drawTodos(); saveDetailsBtn.textContent = "Edit Details"; }
window.onclick = function(event) { if (event.target === modal) { isEditing = false; saveDetailsBtn.textContent = "Edit Details"; modal.style.display = 'none'; try { drawTodos(); } catch (e) {} } }
function resetModal() { isEditing = false; updateLocalStorage(); drawTodos(); saveDetailsBtn.textContent = "Edit Details"; }

saveDetailsBtn.addEventListener('click', () => {
    const valueSpans = detailsTextElem.querySelectorAll('.value');
    const todoId = modal.getAttribute('data-todo-id');
    let todoToUpdate = window.todos.find(todo => todo.id === Number(todoId));
    
    if (isEditing) {
        valueSpans.forEach(span => {
            const input = span.querySelector('input');
            const textarea = span.querySelector('textarea');
            const select = span.querySelector('select');
            let val = input ? input.value : (textarea ? textarea.value : (select ? select.value : ''));
            const row = span.closest('tr');
            if(row.classList.contains('detailsMainText')) todoToUpdate.text = val;
            if(row.classList.contains('detailsCategory')) todoToUpdate.category = (val === 'none') ? null : val;
            if(row.classList.contains('detailsVotes')) todoToUpdate.votes = Number(val);
            if(row.classList.contains('detailsDetails')) todoToUpdate.details = val;
            if(row.classList.contains('detailsBgColor') && input && input.type === 'color') todoToUpdate.bgColor = val.toUpperCase();
        });
        updateLocalStorage(); drawTodos();
        saveDetailsBtn.textContent = "Edit Details";
    } else {
        valueSpans.forEach(span => {
            const row = span.closest('tr');
            let current = span.textContent;
            if(row.classList.contains('detailsCategory')) {
                span.innerHTML = `<select><option value="none">None</option><option value="personal">Personal</option><option value="work">Work</option><option value="school">School</option><option value="groceries">Groceries</option><option value="household">Household</option><option value="software">Software</option><option value="entertainment">Entertainment</option><option value="children">Children</option><option value="fitness">Fitness</option></select>`; 
            } else if(row.classList.contains('detailsMainText') || row.classList.contains('detailsDetails')) {
                 span.innerHTML = `<textarea>${current}</textarea>`;
            } else if(row.classList.contains('detailsBgColor')) {
                 let hex = row.querySelector('.color-hex')?.textContent || '#FFFFFF';
                 span.innerHTML = `<input type="color" value="${hex}">`;
            } else if(row.classList.contains('detailsVotes')) {
                 span.innerHTML = `<input type="number" value="${current}">`;
            } else {
                 span.innerHTML = `<input type="text" value="${current}">`;
            }
        });
        saveDetailsBtn.textContent = "Save Changes";
    }
    isEditing = !isEditing;
});

let dropdown = document.getElementById("dropdown");
let dropbtn = document.getElementById("dropbtn");
let colorOptions = Array.from(document.getElementsByClassName("color-option"));

dropbtn.addEventListener('click', function () { dropdown.style.display = dropdown.style.display === "block" ? "none" : "block"; });
colorOptions.forEach(option => {
    option.addEventListener('click', function () {
        selectedColor = this.style.backgroundColor;
        dropbtn.style.backgroundColor = selectedColor;
        dropdown.style.display = "none";
    });
});

function filterTodosByCategory(category) {
    const filterNotice = document.getElementById("categoryFilteringNotice");
    if (category === 'none') {
        window.filteredTodos = window.todos;
        if (filterNotice) filterNotice.innerHTML = "Showing all todos:";
    } else {
        window.filteredTodos = window.todos.filter(todo => todo.category === category);
        if (filterNotice) filterNotice.innerHTML = "<span class='close'>&#215;</span> Showing: " + category;
    }
}
document.getElementById('categorySelect').addEventListener('change', function() { filterTodosByCategory(this.value); drawTodos(); });
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('close')) {
        document.querySelector('#categorySelect').value = 'none';
        filterTodosByCategory('none');
        drawTodos();
    }
});

document.querySelector('.collapsible-btn').addEventListener('click', function() {
    const content = document.querySelector('.collapsible-content');
    content.style.display = (content.style.display === 'none' || content.style.display === '') ? 'grid' : 'none';
});

document.querySelector('.addDetails').addEventListener('click', () => {
    if (!document.querySelector('.detailsTextarea')){ 
        let textarea = document.createElement('textarea');
        textarea.name = "todoDetails"; 
        textarea.placeholder = "Enter additional details...";
        textarea.classList.add('detailsTextarea');
        document.getElementById('detailsContainer').appendChild(textarea); 
    }
});

function recalculatePoints() {
    let voteCounter = window.todos.length;
    window.todos.forEach(todo => { todo.votes = voteCounter; voteCounter--; });
    drawTodos();
}

function createTodoMenu() {
    const menu = document.querySelector('.menu');
    const loginLink = (typeof wpAppData !== 'undefined') ? wpAppData.login_url : '#';
    menu.innerHTML = `
        <li><a href="#" id="sortPointsBtn">Sort by Points</a></li>
        <li><a href="#" id="sortAlphaBtn">Sort Alphabetically</a></li>
        <li><a href="#" id="sortColorBtn">Sort by Color</a></li>
        <li><a href="#" id="sortDeadlineBtn">Sort by Deadline</a></li>
        <li><a href="#" id="sortTimeAddedBtn">Sort by Time Added</a></li>
        <li><a href="#" id="sortTimeDoneBtn">Sort by Time Done</a></li>
        <li><a href="#" id="recalculatePointsBtn">Recalculate Points</a></li>
        <li><a href="#" id="clearLocalStorageBtn">Delete all to do items</a></li>
        <li><a href="#" id="backupBtn">Backup App</a></li>
        <li><a href="#" id="restoreBtn">Restore</a></li>
        <li><input type="file" id="uploadInput" style="display: none" /></li>
        <li style="border-top:1px solid #ccc; background:#f9f9f9; color:#333;">
            <a href="${loginLink}" style="color:#0070f3; font-weight:bold;">Login / Register</a> 
            <span class="note" style="margin-left:5px; font-size:0.8em; opacity:0.8; color:#333;">(if you want cloud sync)</span>
        </li>
    `;
    
    setTimeout(() => {
        document.getElementById('sortPointsBtn').addEventListener('click', () => { sortByPoints(); highlightActiveSortingOption(); });
        document.getElementById('sortAlphaBtn').addEventListener('click', () => { sortAlphabetically(); highlightActiveSortingOption(); });
        document.getElementById('sortColorBtn').addEventListener('click', () => { sortByColor(); highlightActiveSortingOption(); });
        document.getElementById('sortDeadlineBtn').addEventListener('click', () => { sortByDeadline(); highlightActiveSortingOption(); });
        document.getElementById('sortTimeAddedBtn').addEventListener('click', () => { sortByTimeAdded(); highlightActiveSortingOption(); });
        document.getElementById('sortTimeDoneBtn').addEventListener('click', () => { sortByTimeDone(); highlightActiveSortingOption(); });
        document.getElementById('recalculatePointsBtn').addEventListener('click', recalculatePoints);
        document.getElementById('backupBtn').addEventListener('click', handleBackup);
        document.getElementById('restoreBtn').addEventListener('click', handleRestore);
        
        document.getElementById("clearLocalStorageBtn").addEventListener("click", function(event) {
            event.preventDefault();
            if (window.confirm("Are you sure you want to clear selected items from LocalStorage?")) {
                localStorage.removeItem('todos');
                localStorage.removeItem('preferredSorting');
                window.todos = [];
                drawTodos();
            }
        });
    }, 500);
}

function highlightActiveSortingOption() {
    const sortingMethod = localStorage.getItem('preferredSorting');
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    const map = {
        'points': 'sortPointsBtn',
        'alphabet': 'sortAlphaBtn',
        'color': 'sortColorBtn',
        'deadline': 'sortDeadlineBtn',
        'timeAdded': 'sortTimeAddedBtn',
        'timeDone': 'sortTimeDoneBtn'
    };
    const id = map[sortingMethod];
    if (id && document.getElementById(id)) {
        document.getElementById(id).closest('li').classList.add('active');
    }
}

createTodoMenu();
applyPreferredSorting();

if(window.todoBtn) {
    window.todoBtn.addEventListener("click", function () {
        window.worktimeContainer.style.display = "none";
        window.diaryContainer.style.display = "none";
        window.todoContainer.style.display = "block";
        window.worktimeBtn.classList.add('inactive');
        window.todoBtn.classList.remove('inactive');
        window.diaryBtn.classList.add('inactive');
        document.getElementById('mainTitle').textContent = 'To Do List';
        if (typeof updateHeaderStats === 'function') updateHeaderStats();
        drawTodos();
        createTodoMenu();
    });
}
"""

# 3d. Worktime JS
worktime_js = r"""
function getProjectsFromLastTwoYears() {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const projects = ['All projects', ...new Set(window.worktimes
        .filter(entry => new Date(entry.start) >= twoYearsAgo)
        .map(entry => entry.project)
        .filter(Boolean))];
    return projects;
}

function filterWorktimesByPeriod(period, selectedProject = 'All projects') {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return window.worktimes.filter(entry => {
        const entryDate = new Date(entry.start);
        const matchesPeriod = period === 'all' ? true : 
            period === 'thisMonth' ? (entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth) :
            period === 'lastMonth' ? (entryDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear) && entryDate.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1)) :
            period === 'thisYear' ? (entryDate.getFullYear() === currentYear) :
            period === 'lastYear' ? (entryDate.getFullYear() === currentYear - 1) : true;
        const matchesProject = selectedProject === 'All projects' ? true : entry.project === selectedProject;
        return matchesPeriod && matchesProject;
    });
}

window.drawWorktimes = function(period = 'all', selectedProject = 'All projects') {
    const listEl = document.getElementById('worktimeList');
    const table = document.createElement('div');
    table.className = 'worktime-table';
    
    // Header
    table.innerHTML = `
        <div class="worktime-header">Date</div>
        <div class="worktime-header">Start</div>
        <div class="worktime-header">Duration</div>
        <div class="worktime-header">Description</div>
        <div class="worktime-header">Project</div>
        <div class="worktime-header">End</div>
        <div class="worktime-header">Edit</div>
        <div class="worktime-header">Delete</div>
    `;

    let totalMinutes = 0;
    const filtered = filterWorktimesByPeriod(period, selectedProject);
    filtered.sort((a, b) => new Date(b.start) - new Date(a.start)); // Default sort

    filtered.forEach((entry) => {
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        const duration = Math.round((endDate - startDate) / 60000) || 0;
        totalMinutes += duration;
        
        table.innerHTML += `
          <div class="worktime-cell">${startDate.toLocaleDateString('fi-FI')}</div>
          <div class="worktime-cell">${startDate.toLocaleTimeString('fi-FI', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
          <div class="worktime-cell">${duration} min ${duration > 59 ? `(${Math.floor(duration/60)}h${duration%60 === 0 ? '' : ` ${duration%60}min`})` : ''}</div>
          <div class="worktime-cell">${entry.description || ''}</div>
          <div class="worktime-cell">${entry.project || 'No project'}</div>
          <div class="worktime-cell">${endDate.toLocaleTimeString('fi-FI', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
          <div class="worktime-cell"><button onclick="editWorktime(${entry.id})" class="btn-edit">Edit</button></div>
          <div class="worktime-cell"><button onclick="deleteWorktime(${entry.id})" class="btn-delete">Delete</button></div>
        `;
    });

    // Total Row
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const top = document.getElementById('worktimeTotalsTop'); 
    if(top) top.innerHTML = `<span>Total:</span> <span>${totalMinutes} min</span> <span class=\"muted\">(${hours}h${remainingMinutes? ' ' + remainingMinutes + 'min' : ''})</span>`;

    table.innerHTML += `
        <div class="worktime-cell total">Total:</div><div class="worktime-cell total"></div>
        <div class="worktime-cell total">${totalMinutes} min</div>
        <div class="worktime-cell total"></div><div class="worktime-cell total"></div><div class="worktime-cell total"></div><div class="worktime-cell total"></div><div class="worktime-cell total"></div>
    `;

    listEl.innerHTML = '';
    listEl.appendChild(table);
}

function updateProjectList() {
    const existingContainer = document.querySelector('.project-input-container');
    if (existingContainer) existingContainer.remove();
    
    const container = document.createElement('div');
    container.className = 'project-input-container';
    
    const select = document.createElement('select');
    select.id = 'projectSelect';
    select.className = 'button-30';
    
    const projects = getProjectsFromLastTwoYears().filter(p => p !== 'All projects');
    
    select.innerHTML = `<option value="">Select Project</option>${projects.map(project => `<option value="${project}">${project}</option>`).join('')}<option value="custom">+ Add New Project</option>`;
    
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.id = 'projectInput';
    customInput.className = 'button-30';
    customInput.style.display = 'none';
    
    select.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            select.style.display = 'none';
            customInput.style.display = 'block';
            customInput.focus();
        } else {
            customInput.value = e.target.value;
        }
    });

    customInput.addEventListener('blur', () => {
        if (customInput.value.trim() === '') {
            select.value = '';
            select.style.display = 'block';
            customInput.style.display = 'none';
        }
    });
    
    container.appendChild(select);
    container.appendChild(customInput);
    
    const workDescription = document.getElementById('workDescription');
    if(workDescription) workDescription.parentNode.insertBefore(container, workDescription.nextSibling);
    
    const existingDatalist = document.getElementById('projectList');
    if (existingDatalist) existingDatalist.remove();
}

let editingId = null;
window.editWorktime = function(id) {
    const entry = window.worktimes.find(item => item.id === id);
    if (entry) {
        const startDate = new Date(entry.start);
        const endDate = new Date(entry.end);
        const startOffset = startDate.getTimezoneOffset() * 60000;
        const endOffset = endDate.getTimezoneOffset() * 60000;
        
        document.getElementById('workDescription').value = entry.description;
        document.getElementById('projectInput').value = entry.project || '';
        document.getElementById('workStart').value = (new Date(startDate - startOffset)).toISOString().slice(0, 16);
        document.getElementById('workEnd').value = (new Date(endDate - endOffset)).toISOString().slice(0, 16);
        document.getElementById('workDuration').value = '';
        
        const submitButton = document.getElementById('worktimeForm').querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Worktime';
        editingId = id;
    }
}

window.deleteWorktime = function(id) {
    window.worktimes = window.worktimes.filter(t => t.id !== id);
    localStorage.setItem("worktimes", JSON.stringify(window.worktimes));
    const pf = document.getElementById('projectFilter');
    drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
}

const worktimeForm = document.getElementById("worktimeForm");
if(worktimeForm) {
    worktimeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const description = document.getElementById('workDescription').value;
        const projectInput = document.getElementById('projectInput');
        const projectSelect = document.getElementById('projectSelect');
        const project = projectInput.value || projectSelect.value;
        const start = new Date(document.getElementById('workStart').value);
        let end;
        const workDuration = document.getElementById('workDuration');
        const workEnd = document.getElementById('workEnd');

        if (workDuration.value) {
            end = new Date(start.getTime() + workDuration.value * 60000);
        } else if (workEnd.value) {
            end = new Date(workEnd.value);
        } else {
            alert('Please provide either duration or end time');
            return;
        }

        const entry = {
            id: editingId || Date.now(),
            description,
            project,
            start: start.toISOString(),
            end: end.toISOString()
        };

        if (editingId) {
            const index = window.worktimes.findIndex(item => item.id === editingId);
            window.worktimes[index] = entry;
            editingId = null;
            worktimeForm.querySelector('button[type="submit"]').textContent = 'Add Worktime';
        } else {
            window.worktimes.push(entry);
        }

        localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
        
        updateProjectList();
        const pf = document.getElementById('projectFilter');
        if(pf) {
            pf.innerHTML = getProjectsFromLastTwoYears().map(p => `<option value="${p}">${p}</option>`).join('');
        }
        drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
        
        this.reset();
        projectSelect.style.display = 'block';
        projectSelect.value = '';
        projectInput.style.display = 'none';
    });
}

function addWorktimeFilterButtons() {
    if (document.querySelector('.worktime-filters')) return;
    const filterContainer = document.createElement('div');
    filterContainer.className = 'worktime-filters';
    const projects = getProjectsFromLastTwoYears();
    
    filterContainer.innerHTML = `
        <select class="button-30" id="projectFilter">
            ${projects.map(project => `<option value="${project}">${project}</option>`).join('')}
        </select>
        <button class="button-30" data-period="all">All times</button>
        <button class="button-30 active" data-period="thisMonth">This Month</button>
        <button class="button-30" data-period="lastMonth">Last Month</button>
        <button class="button-30" data-period="thisYear">This Year</button>
        <button class="button-30" data-period="lastYear">Last Year</button>
    `;

    const listEl = document.getElementById('worktimeList');
    if (listEl && listEl.parentNode) listEl.parentNode.insertBefore(filterContainer, listEl);

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            filterContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            drawWorktimes(e.target.dataset.period, document.getElementById('projectFilter')?.value || 'All projects');
        }
    });

    const pfSel = filterContainer.querySelector('#projectFilter');
    if (pfSel) {
      pfSel.addEventListener('change', (e) => {
          const activePeriod = filterContainer.querySelector('button.active')?.dataset.period || 'thisMonth';
          drawWorktimes(activePeriod, e.target.value);
      });
    }
}

function initializeWorktime() {
    addWorktimeFilterButtons();
    const pf=document.getElementById('projectFilter');
    drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
    updateProjectList();
}

function createWorktimeMenu() {
    const menu = document.querySelector('.menu');
    const loginLink = (typeof wpAppData !== 'undefined') ? wpAppData.login_url : '#';
    menu.innerHTML = `
        <li><a href="#" id="exportWorktimeCsvBtn">Export CSV</a></li>
        <li><a href="#" id="exportWorktimeTextBtn">Export Text</a></li>
        <li><a href="#" id="exportWorktimeSystemBtn">Export for Worktime System</a></li>
        <li><a href="#" id="clearWorktimeBtn">Delete all worktime items</a></li>
        <li><a href="#" id="backupBtn">Backup App</a></li>
        <li><a href="#" id="restoreBtn">Restore</a></li>
        <li><input type="file" id="uploadWorktimeInput" style="display: none" /></li>
        <li style="border-top:1px solid #ccc; background:#f9f9f9; color:#333;">
            <a href="${loginLink}" style="color:#0070f3; font-weight:bold;">Login / Register</a> 
            <span class="note" style="margin-left:5px; font-size:0.8em; opacity:0.8; color:#333;">(if you want cloud sync)</span>
        </li>
    `;
    setTimeout(() => {
        document.getElementById('exportWorktimeCsvBtn').addEventListener('click', exportWorktimeCsv);
        document.getElementById('exportWorktimeTextBtn').addEventListener('click', exportWorktimeText);
        document.getElementById('clearWorktimeBtn').addEventListener('click', clearWorktimeData);
        document.getElementById('backupBtn').addEventListener('click', handleBackup);
        document.getElementById('restoreBtn').addEventListener('click', handleRestore);
        document.getElementById('exportWorktimeSystemBtn').addEventListener('click', exportWorktimeForSystem);
    }, 500);
}

function exportWorktimeCsv() {
    const csvContent = window.worktimes.map(entry => {
        const start = new Date(entry.start);
        const end = new Date(entry.end);
        const duration = Math.round((end - start) / 60000);
        return `${start.toLocaleDateString()},${start.toLocaleTimeString()},${duration},${entry.description},${entry.project},${end.toLocaleTimeString()}`;
    }).join('\n');
    const header = 'Date,Start Time,Duration (min),Description,Project,End Time\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'worktime_export.csv'; a.click();
}

function exportWorktimeText() {
    const textContent = window.worktimes.map(entry => {
        const start = new Date(entry.start);
        const end = new Date(entry.end);
        const duration = Math.round((end - start) / 60000);
        return `Date: ${start.toLocaleDateString()}\nStart: ${start.toLocaleTimeString()}\nDuration: ${duration} min\nDescription: ${entry.description}\nProject: ${entry.project}\nEnd: ${end.toLocaleTimeString()}\n---------------`;
    }).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'worktime_export.txt'; a.click();
}

function clearWorktimeData() {
    if (confirm('Are you sure you want to delete all worktime entries?')) {
        window.worktimes = [];
        localStorage.setItem('worktimes', JSON.stringify(window.worktimes));
        const pf=document.getElementById('projectFilter');
        drawWorktimes('thisMonth', pf ? pf.value : 'All projects');
    }
}

if(window.worktimeBtn) {
    window.worktimeBtn.addEventListener("click", function () {
        window.worktimeBtn.classList.remove('inactive');
        window.todoBtn.classList.add('inactive');
        window.diaryBtn.classList.add('inactive');
        window.worktimeContainer.style.display = "block";
        window.diaryContainer.style.display = "none";
        window.todoContainer.style.display = "none";
        document.getElementById('mainTitle').textContent = 'Worktimes';
        if (typeof updateHeaderStats === 'function') updateHeaderStats();
        
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        document.getElementById('workStart').value = (new Date(now - offset)).toISOString().slice(0, 16);
        
        createWorktimeMenu();
        initializeWorktime();
    });
}
"""

# 3e. Diary JS
diary_js = r"""
// Refactored diary.js

// Sorting State
let diarySort = { key: 'date', dir: 'desc' };

function getSortedDiaryEntries(list) {
    const arr = Array.from(list || window.diaryEntries);
    const { key, dir } = diarySort;
    const mult = dir === 'desc' ? -1 : 1;
    return arr.sort((a,b) => {
        let va, vb;
        if (key === 'date') { va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); }
        else if (key === 'category') { va = (a.category||'').toLowerCase(); vb = (b.category||'').toLowerCase(); }
        else { 
            const sa = (a.description||'').replace(/<br\s*\/?>/gi,'\n').toLowerCase();
            const sb = (b.description||'').replace(/<br\s*\/?>/gi,'\n').toLowerCase();
            va = sa; vb = sb;
        }
        if (va < vb) return -1*mult; if (va > vb) return 1*mult; return 0;
    });
}

function updateDiaryStorage() { localStorage.setItem('diaryEntries', JSON.stringify(window.diaryEntries)); }

function addDiaryEntry(description, date, category) {
    const entry = {
        id: Date.now(),
        description: description.replace(/\n/g, '<br>'),
        date: new Date(date).toISOString(),
        category: category
    };
    window.diaryEntries.push(entry);
    updateDiaryStorage();
    drawDiary();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
}

window.drawDiary = function(entries = window.diaryEntries) {
    const sorted = getSortedDiaryEntries(entries);
    const diaryList = document.getElementById('diaryList');
    diaryList.innerHTML = '';
    
    const table = document.createElement('div');
    table.className = 'diary-table';
    table.innerHTML = `
        <div class="diary-header" data-key="date">Date</div>
        <div class="diary-header" data-key="category">Category</div>
        <div class="diary-header" data-key="description">Description</div>
        <div class="diary-header">Edit</div>
        <div class="diary-header">Delete</div>
    `;

    sorted.forEach(entry => {
        const date = new Date(entry.date);
        table.innerHTML += `
            <div class="diary-cell">${date.toLocaleDateString('fi-FI')}</div>
            <div class="diary-cell">${entry.category}</div>
            <div class="diary-cell">${entry.description}</div>
            <div class="diary-cell"><button onclick="editDiaryEntry(${entry.id})" class="btn-edit">Edit</button></div>
            <div class="diary-cell"><button onclick="deleteDiaryEntry(${entry.id})" class="btn-delete">Delete</button></div>
        `;
    });
    diaryList.appendChild(table);
    
    table.querySelectorAll('.diary-header[data-key]').forEach(h => {
        h.style.cursor = 'pointer';
        h.addEventListener('click', () => { 
             const key = h.getAttribute('data-key');
             if (diarySort.key === key) diarySort.dir = (diarySort.dir === 'asc' ? 'desc' : 'asc');
             else { diarySort.key = key; diarySort.dir = (key === 'date' ? 'desc' : 'asc'); }
             drawDiary();
        });
    });
}

let editingDiaryId = null;
window.editDiaryEntry = function(id) {
    const entry = window.diaryEntries.find(item => item.id === id);
    if (entry) {
        document.getElementById('diaryInput').value = entry.description.replace(/<br>/g, '\n');
        document.getElementById('diaryDate').value = new Date(entry.date).toISOString().split('T')[0];
        document.getElementById('diaryCategory').value = entry.category;
        
        const submitButton = document.getElementById('diaryForm').querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Entry';
        editingDiaryId = id;
    }
}

window.deleteDiaryEntry = function(id) {
    window.diaryEntries = window.diaryEntries.filter(item => item.id !== id);
    updateDiaryStorage();
    drawDiary();
}

function addCategoryFilter() {
    const existingFilter = document.querySelector('.diary-filter');
    if (existingFilter) existingFilter.remove();

    const defaultCategories = ["Life Event", "Purchase", "Item placement", "Data location change"];
    const usedCategories = [...new Set(getSortedDiaryEntries(window.diaryEntries).map(entry => entry.category))];
    const allCategories = [...new Set([...defaultCategories, ...usedCategories])].filter(category => category);
        
    const filterContainer = document.createElement('div');
    filterContainer.className = 'diary-filter';
    filterContainer.innerHTML = `
        <label for="categoryFilter">Display:</label>
        <select id="categoryFilter"><option value="all">All Categories</option>${allCategories.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    `;
    
    document.getElementById('diaryList').before(filterContainer);
    document.getElementById('categoryFilter').addEventListener('change', applyDiaryFilters);
}

function addSearchFilter() {
    const existingSearch = document.querySelector('.diary-search');
    if (existingSearch) existingSearch.remove();
    const searchContainer = document.createElement('div');
    searchContainer.className = 'diary-search';
    searchContainer.innerHTML = `<input type="text" id="diarySearch" placeholder="Search diary entries..."><button class="clear-search">×</button>`;
    document.getElementById('diaryList').before(searchContainer);
    
    document.getElementById('diarySearch').addEventListener('input', applyDiaryFilters);
    document.querySelector('.clear-search').addEventListener('click', function() {
        document.getElementById('diarySearch').value = '';
        applyDiaryFilters();
    });
}

function applyDiaryFilters() {
    const searchTerm = document.getElementById('diarySearch')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';
    
    const filteredEntries = window.diaryEntries.filter(entry => {
        const matchesSearch = entry.description.toLowerCase().includes(searchTerm) ||
            new Date(entry.date).toLocaleDateString().includes(searchTerm) ||
            entry.category.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });
    drawDiary(filteredEntries);
}

function createDiaryMenu() {
    const menu = document.querySelector('.menu');
    const loginLink = (typeof wpAppData !== 'undefined') ? wpAppData.login_url : '#';
    menu.innerHTML = `
        <li><a href="#" id="exportDiaryBtn">Export as TXT</a></li>
        <li><a href="#" id="clearDiaryBtn">Delete all diary entries</a></li>
        <li><a href="#" id="copyLifeEventsBtn">Copy Life Events to Clipboard</a></li>
        <li><a href="#" id="copyPurchasesBtn">Copy Purchases to Clipboard</a></li>
        <li><a href="#" id="copyItemPlacementsBtn">Copy Item Placements to Clipboard</a></li>
        <li><a href="#" id="copyDataLocationsBtn">Copy Data Locations to Clipboard</a></li>
        <li><a href="#" id="backupBtn">Backup App</a></li>
        <li><a href="#" id="restoreBtn">Restore</a></li>
        <li><input type="file" id="uploadDiaryInput" style="display: none" /></li>
        <li style="border-top:1px solid #ccc; background:#f9f9f9; color:#333;">
            <a href="${loginLink}" style="color:#0070f3; font-weight:bold;">Login / Register</a> 
            <span class="note" style="margin-left:5px; font-size:0.8em; opacity:0.8; color:#333;">(if you want cloud sync)</span>
        </li>
    `;

    setTimeout(() => {
        document.getElementById('exportDiaryBtn').addEventListener('click', exportDiaryText);
        document.getElementById('clearDiaryBtn').addEventListener('click', clearDiaryData);
        document.getElementById('backupBtn').addEventListener('click', handleBackup);
        document.getElementById('restoreBtn').addEventListener('click', handleRestore);
        document.getElementById('copyLifeEventsBtn').addEventListener('click', () => copyEntriesByCategory('Life Event'));
        document.getElementById('copyPurchasesBtn').addEventListener('click', () => copyEntriesByCategory('Purchase'));
        document.getElementById('copyItemPlacementsBtn').addEventListener('click', () => copyEntriesByCategory('Item placement'));
        document.getElementById('copyDataLocationsBtn').addEventListener('click', () => copyEntriesByCategory('Data location change'));
    }, 500);
}

function copyEntriesByCategory(category) {
    const entries = getSortedDiaryEntries(window.diaryEntries)
        .filter(entry => entry.category === category)
        .map(entry => {
            const date = new Date(entry.date);
            return `${date.toLocaleDateString()}: ${entry.description}`;
        })
        .join('\n');
        
    navigator.clipboard.writeText(entries).then(() => { alert(`${category} entries copied!`); });
}

function exportDiaryText() {
    const textContent = getSortedDiaryEntries(window.diaryEntries).map(entry => {
        const date = new Date(entry.date);
        return `Date: ${date.toLocaleDateString()}\nCategory: ${entry.category}\nEntry: ${entry.description}\n---------------`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'diary_export.txt'; a.click();
}

function clearDiaryData() {
    if (confirm('Are you sure you want to delete all diary entries?')) {
        window.diaryEntries = [];
        updateDiaryStorage();
        drawDiary();
    }
}

const dForm = document.getElementById('diaryForm');
if(dForm) {
    dForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const textarea = document.getElementById('diaryInput');
      const description = textarea.value.trim();
      const date = document.getElementById('diaryDate').value;
      const category = document.getElementById('diaryCategory').value;
      if (description !== '') {
          if(editingDiaryId) {
             let idx = window.diaryEntries.findIndex(e => e.id === editingDiaryId);
             if(idx > -1) {
                 window.diaryEntries[idx].description = description.replace(/\n/g, '<br>');
                 window.diaryEntries[idx].date = new Date(date).toISOString();
                 window.diaryEntries[idx].category = category;
             }
             editingDiaryId = null;
             dForm.querySelector('button[type="submit"]').textContent = 'Add Entry';
             updateDiaryStorage();
             drawDiary();
          } else {
             addDiaryEntry(description, date, category);
          }
          textarea.value = '';
      }
    });
}

if(window.diaryBtn) {
    window.diaryBtn.addEventListener("click", function () {
        window.diaryBtn.classList.remove('inactive');
        window.todoBtn.classList.add('inactive');
        window.worktimeBtn.classList.add('inactive');
        window.diaryContainer.style.display = "block";
        window.todoContainer.style.display = "none";
        window.worktimeContainer.style.display = "none";
        document.getElementById('mainTitle').textContent = 'Diary';
        if (typeof updateHeaderStats === 'function') updateHeaderStats();
        
        createDiaryMenu();
        addCategoryFilter();
        addSearchFilter();
        drawDiary();
    });
}
"""

# 3f. Sorting & Styles
todo_sorting_js = r"""
function applyPreferredSorting() {
    const sortingMethod = localStorage.getItem('preferredSorting') || 'points';
    switch(sortingMethod) {
        case 'points': sortByPoints(); break;
        case 'alphabet': sortAlphabetically(); break;
        case 'color': sortByColor(); break;
        case 'deadline': sortByDeadline(); break;
        case 'timeAdded': sortByTimeAdded(); break;
        case 'timeDone': sortByTimeDone(); break;
        default: sortByPoints(); break;
    }
}
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
"""

# 3g. Original Full CSS (With Fixes)
style_css = r"""
html {
width: 100%;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: gainsboro;
    width: 100%;
}


#myHeader {
  padding: 0 0.5rem;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;  
  z-index: 100;
  background-color: gainsboro;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}



#mainTitle{
  display: inline-block;
  cursor: pointer;
    font-size: 5rem;
    text-align: center;
    font-weight: 800;
    color: transparent;
    font-size:6rem;
    background: url("img/universe-7325913_1920.jpg");
    background-position: 40% 50%;
    -webkit-background-clip: text;
    position:relative;
    text-align:center;
    letter-spacing: -4px;
    padding: 0 0.5vw; 
    margin: 1rem;
    margin-bottom: 0;
    color: transparent;
  text-shadow: 2px 2px 3px rgba(255,255,255,0.5);
  -webkit-background-clip: text;
     -moz-background-clip: text;
          background-clip: text;
}

p#todo-stats {
  margin: 0;
  margin-top: -0.5rem;
  color: #948e8e;
  font-size: 0.8rem;
}

@keyframes animateBackground {
    from {background-position: 0 0;}
    to {background-position: 100% 100%;}
  }
  
  #mainTitle {
    background-image: url('img/universe-7325913_1920.jpg');
    animation: animateBackground 200s linear infinite;
  }

.listItem{
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 2fr 1fr 0.5fr 1fr 1fr 1fr 1fr;
    align-items: center;
    padding: 1rem;
}

#menuRow{
    display: grid;
/*     grid-template-columns: 8fr 1fr; */
    align-items: center;
}

#todoForm {
  display: grid;
  /* grid-template-columns: 5.5fr 2fr 1fr 1fr 1fr; */
  align-items: center;
  justify-items: center;
  position: relative;

}

.collapsible-content {
  display: none;
  /* any other styling you want for the content */
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  background: #e2e2ff;
  padding: 1rem;
  width: 100%;
}

.collapsible-btn {
  display: block; /* Ensures the button takes up full width of its container */
  width: 100%; 
  height: 40px; /* You can adjust this */
  background-color: #e2e2ff; /* Gray background */
  border: none;
  outline: none;
  cursor: pointer;
  position: relative; /* Sets a context for the triangle */
  text-align: center; /* Centers any text or content in the button */
  font-weight: bold;
  color: #333;
  margin: 0;
}

.collapsible-btn:after {
  content: ''; /* This creates a triangle using borders */
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #333; /* This creates the triangle */
  position: absolute; /* Absolute positioning relative to the button */
  top: 50%;
  right: 20px; /* This positions the triangle to the right with 20px margin */
  transform: translateY(-50%); /* Centers the triangle vertically */
}

.collapsible-btn.active:after {
  border-top: none;
  border-bottom: 8px solid #333; /* Changes the triangle to point upwards when active */
}

 button.btn.inactive {
  background-color: #eee;
  color: gray;
}



/* this puts the main add button to the left side of the second row */
#todoForm > :nth-child(n+6):nth-child(-n+10) {
  justify-self: start;
}

#todoInput, .submitTodo {
    font-size: 1.3rem;
}

button.submitTodo.button-30 {
  margin: 1rem;
  min-width: 6rem;
}

#todoInput{
  width:100%;
  min-height: 40px;
  padding: 0.5rem;
}

.input-wrapper {
  position: relative;
  display: grid;
  grid-column: 1 / -1;
}

.clear-input,
.diary-clear-input {
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  z-index: 100;
  display: none;
}

#todoList input{
    font-size: 1.3rem;
    width: 100%;
}

#topPriorityInput{
  font-size: 1.3rem;
  width: 1.3rem;
}

#deadlineInput{
    opacity: 0.8;

}

.done {
    opacity: 0.3;
}

.toDoText {
  font-size: 1rem;
  color: #000000;
  grid-column: span 3;
}

.votes{
    color: #0070f3;
}

ul#todoList {
    list-style-type: none;
    padding: 0;
    border: 1px #9f9f9f solid;
    min-height: 50vh;
}

#backUpAndRestoreButtonsContainer{
  text-align: right;
}

li {
    /* No background color when not hovered */
    border: none;
  }
  
  li:hover {
    /* Background color when hovered */
   border: 1px rgba(0, 0, 0, 0.1) solid; /* This is just an example color, you can replace it with your preferred color */
  }

  div#detailsContainer {
    width: 100%;
    text-align: center;
}
  textarea.detailsTextarea {
    width: 100%;
    min-height: 5rem;
}

/* 1) Make sure both fields use the same font/line-height/padding */
input[type="text"],
textarea {
  font-family: inherit;
  /* or your preferred font */
  font-size: 1rem;
  /* same size on both */
  line-height: 1.5;
  /* consistent line-height */
  padding: 0.5rem;
  /* same padding */
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  color: #333;
  /* same text color */
  background-color: white;
}

/* 2) Force textarea to vertically center its text if you want it exactly like input */
textarea {
  resize: vertical;
  /* or whatever you choose */
  /* If you want the placeholder to sit in the vertical center of the textarea (not top): */
  display: flex;
  align-items: center;
  /* vertical centering of placeholder/text */
}

/* 3) Style the placeholder text the same way */
input::placeholder,
textarea::placeholder {
  color: #999;
  /* choose the same shade */
  opacity: 1;
  /* some browsers default to opacity: .5 for textarea */
  font-style: italic;
  /* or normal—just match them */
  font-size: 1rem;
}

/* 4) Vendor prefixes for broader support */
input::-webkit-input-placeholder,
textarea::-webkit-input-placeholder {
  color: #999;
}

input::-moz-placeholder,
textarea::-moz-placeholder {
  color: #999;
}

input:-ms-input-placeholder,
textarea:-ms-input-placeholder {
  color: #999;
}

#categoryFilteringNotice{
  display: inline-block;
  margin-top: 1rem;
}

  /* CUSTOM MODAL */

  .modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 1000;
}

.modal-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #fff;
    padding: 20px;
    border-radius: 5px;
    width: 80%; /* Adjust this if you want */
    max-width: 500px; /* Adjust this if you want */
}

.modal-close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
}

.colorBox {
  height: 1rem;
  width: 1rem;
}

div#notificationWrap {
  margin: 1rem;
} 

/* TOAST NOTIFICATIONS FOR SUBMIT ETC */
.toast {
  visibility: hidden;
  max-width: 50%;
  margin: auto;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 2px;
  padding: 16px;
  position: fixed;
  z-index: 1;
  left: 50%;
  bottom: 30px;
  font-size: 17px;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.5s, visibility 0.5s;
}

.toast.show {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.5s;
}



/* BUTTONS */
.button-30 {
  align-items: center;
  appearance: none;
  background-color: #FCFCFD;
  border-radius: 4px;
  border-width: 0;
  box-shadow: rgba(45, 35, 66, 0.4) 0 2px 4px,rgba(45, 35, 66, 0.3) 0 7px 13px -3px,#D6D6E7 0 -3px 0 inset;
  box-sizing: border-box;
  color: #36395A;
  cursor: pointer;
  display: inline-flex;
  height: 48px;
  justify-content: center;
  line-height: 1;
  list-style: none;
  overflow: hidden;
  padding-left: 16px;
  padding-right: 16px;
  position: relative;
  text-align: left;
  text-decoration: none;
  transition: box-shadow .15s,transform .15s;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  white-space: nowrap;
  will-change: box-shadow,transform;
  font-size: 18px;
}

.button-30:focus {
  box-shadow: #D6D6E7 0 0 0 1.5px inset, rgba(45, 35, 66, 0.4) 0 2px 4px, rgba(45, 35, 66, 0.3) 0 7px 13px -3px, #D6D6E7 0 -3px 0 inset;
}

.button-30:hover {
  box-shadow: rgba(45, 35, 66, 0.4) 0 4px 8px, rgba(45, 35, 66, 0.3) 0 7px 13px -3px, #D6D6E7 0 -3px 0 inset;
  transform: translateY(-2px);
}

.button-30:active {
  box-shadow: #D6D6E7 0 3px 7px inset;
  transform: translateY(2px);
}

/* CUSTOM CHECKBOX */

.large-checkbox {
  transform: scale(1.5);
  /* Adjust this value to change the size of the checkbox */
}

#priorityCheckWrap {
  align-items: center;
  text-align: center;
  margin-top: 1rem;
}

#priorityCheckWrap label {
  white-space: nowrap;
  margin: 0.5rem;
}


/* CUSTOM COLOR DROPDOWN */
.dropdown {
  position: relative;
  display: inline-block;
  text-align: center;
  margin: 1rem;

}

.dropdown,
.deadLineWrap {
  display: inline-flex; /* Use flexbox for alignment */
  align-items: center; /* Vertically align items inside */
  margin-right: 10px; /* Add spacing between groups */
}

label,
span,
input,
select {
  vertical-align: middle; /* Ensure consistent vertical alignment */
}

.close {
  margin-left: 5px; /* Adjust spacing around the "x" */
  color: red;
  cursor: pointer;
  font-size: 16px; /* Ensure it visually aligns */
}




.dropdown-content {
  display: none;
  position: absolute;
  min-width: 160px;
  z-index: 1;
}

.dropdown-content div {
  color: black;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  cursor: pointer;

}

.dropdown-content div:hover {
  background-color: #f1f1f1;
}

div#extraInfoButtonContainer {

    display: flex;
    align-items: center;
    margin: 1rem;
}

.color-option {
  height: 20px;
}

.dropbtn {
  background-color: #4CAF50;
  color: rgb(0, 0, 0);
  padding: 16px;
  font-size: 16px;
  border: none;
  cursor: pointer;
  opacity: 0.8;
}

.dropbtn:hover,
.dropbtn:focus {
  background-color: #3e8e41;
}

/* little x to close stuff */
span.close {
font-size: 2rem;
vertical-align: middle;
color: red;
cursor: pointer;
}

/* HAMBURGER MENU */

#hamburgerMenuButton {
  position: absolute;
  top: 10px;
  left: 10px;
}

#hamburgerMenu {
  position: absolute;
  top: 0;
  left: -100%;
  width: 200px;
  height: 100vh;
  background: #f4f4f4;
  padding: 20px;
  transition: left 0.3s ease;
}

#hamburgerMenu.hamburgerMenuVisible {
  left: 0;
}

.menu a {
  display: block;
  text-decoration: none;
}

.menu a:hover {

  text-decoration: underline;
}

#closeMenuButton {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.5em;
}

/* Styles for the checkmark */
.menu .checkmark {
  display: none; /* Hide by default */
  margin-right: 5px; /* Space between the checkmark and the text */
}

.menu .active .checkmark {
  display: inline; /* Show checkmark for active items */
}



/* MENU 2 */




* {

  box-sizing: border-box;
}

.top-nav {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: #00BAF0;
  background: linear-gradient(to left, #f46b45, #eea849);
  /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
  color: #FFF;
  height: 50px;
  padding: 1em;
}

.menuWrap {
  display: flex;
  align-items: center;
  left: 0;
}

#menu-toggle:checked ~ .menu {
  top: 50px; /* Same value to ensure alignment */
  transition: top 0.3s ease; /* Optional: add a smooth transition for visual effect */
}

.menu>li {
  display: flex;
  align-items: center;
  margin: 0 1rem;
  overflow: hidden;
  padding: 0.5em 0;
  width: 100%;
  color: white;
  background-color: #4268f2;
 
}

.menu li a {
  color: #f1f1f1;
}

.menu-button-container {

  display: flex;
  height: 50px;
  cursor: pointer;
  flex-direction: column;
  z-index: 100;
  justify-content: center;
  position: absolute;
  left: 1vw;
}

#menu-toggle {
  display: none;
}

.menu-button,
.menu-button::before,
.menu-button::after {
  display: block;
  background-color: #9fa9f1;
  position: absolute;
  height: 10px;
  width: 50px;
  transition: transform 400ms cubic-bezier(0.23, 1, 0.32, 1);
  border-radius: 3px;
}

.menu-button::before {
  content: '';
  margin-top: -13px;
}

.menu-button::after {
  content: '';
  margin-top: 13px;
}

#menu-toggle:checked+.menu-button-container .menu-button::before {
  margin-top: 0px;
  transform: rotate(405deg);
}

#menu-toggle:checked+.menu-button-container .menu-button {
  background: rgba(255, 255, 255, 0);
}

#menu-toggle:checked+.menu-button-container .menu-button::after {
  margin-top: 0px;
  transform: rotate(-405deg);
}

.menu {
  position: absolute;
  top: 50px; /* Aligning below the hamburger button */
  left: 0;
  min-width: 30vw; /* Ensure a minimum width to fit all elements comfortably */
  max-width: 90vw; /* Optional: ensure the menu doesn't take over the entire screen */
  flex-direction: column;
  padding: 1rem; /* Add padding to make the elements inside the menu look better */
  z-index: 11;
}


 #menu-toggle~.menu li {
   height: 0;
   margin: 0;
   padding: 0;
   border: 0;
   transition: height 400ms cubic-bezier(0.23, 1, 0.32, 1);
 }

 #menu-toggle:checked~.menu li {
   border: 1px solid #333;
   height: 3.5em;
   padding: 0.5em;
   transition: height 400ms cubic-bezier(0.23, 1, 0.32, 1);
 }

 

 .menu>li:not(:last-child) {
   border-bottom: 1px solid #444;
 }

 .note  {
      margin-left: 1rem;
      opacity: 0.5;
    }
 


.info-button {
      border-radius: 50%;        /* Make the button round */
      width: 40px;               /* Set a fixed width */
      height: 40px;              /* Set a fixed height */
      text-align: center;        /* Center the "i" horizontally */
      line-height: 30px;         /* Center the "i" vertically */
      border: none;              /* Remove default borders */
      background-color: #eee;   /* A light background color */
      cursor: pointer;           /* Change cursor to hand pointer on hover */
      margin: 0.5rem;
      font-size: 1.2rem;
  }
  

/* NEW FANCY BUTTON */

.btn{
display: inline-block;
margin-bottom: 0.5rem;
margin-top: 0.5rem;
outline: 0;
cursor: pointer;
border: none;
padding: 0 56px;
height: 45px;
line-height: 45px;
border-radius: 7px;
background-color: #0070f3;
color: white;
font-weight: 400;
font-size: 16px;
box-shadow: 0 4px 14px 0 rgb(0 118 255 / 39%);
transition: background 0.2s ease,color 0.2s ease,box-shadow 0.2s ease;
white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.btn:hover{
    background: rgba(0,118,255,0.9);
    box-shadow: 0 6px 20px rgb(0 118 255 / 23%);
}

.btn.addDetails{
  background-color: lightslategray;
  padding: 0 20px;
  opacity: 0.8;
}

.dropbtn{
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
  display: inline-block;
  outline: 0;
  cursor: pointer;
  border: none;
  padding: 0 20px;
  height: 45px;
  line-height: 45px;
  border-radius: 7px;
  color: white;
  font-weight: 400;
  font-size: 16px;
  box-shadow: 0 4px 14px 0 rgb(0 118 255 / 39%);
  transition: background 0.2s ease,color 0.2s ease,box-shadow 0.2s ease;
  white-space: nowrap;
    text-overflow: ellipsis;
  }

  .chooseColor{
    color: black;
  }

/* Radiate waves/ripples on success */

.wave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  border: 10px solid rgba(146, 126, 255, 0.87); /* Adjust border color and width */
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none;
  z-index: 0;
}

.wave.animate {
  animation: waveAnimation 1.5s ease-out; /* 'infinite' for looping, remove for one-off */
}

@keyframes waveAnimation {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(4); /* Adjust scale as needed */
    opacity: 0;
  }
}

ul#diaryList {
  padding: 0;
  margin: 0;
}


#diaryForm {
position: relative;
}

.diaryItem {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin: 0.5rem 0;
  border-radius: 8px;
}

.diary-date {
  font-weight: bold;
  min-width: 100px;
}

.diary-description {
  flex-grow: 1;
}

.diary-category {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  margin-right: 10px;
}

#diaryCategory {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-right: 10px;
}

.diaryEntryButtons {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.diary-search {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Adjust spacing between input and button */
  margin: 0.5rem 0;
}

#diarySearch {
  flex: 1;
  /* Input takes remaining space */
  width: 100%;
  /* Ensure it fills its flex container */
}

#modeSelect {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  padding-top: 1rem;
}

/* Prevent closed hamburger menu from blocking clicks below it */
#menu-toggle:not(:checked) ~ .menu {
  pointer-events: none;     /* ignore clicks when closed */
  padding-top: 0;
  padding-bottom: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
}

#menu-toggle:checked ~ .menu {
  pointer-events: auto;     /* clickable only when open */
  opacity: 1;
}

#todoModeWrap {
  padding: 1vw;
}

ul#worktimeList {
  padding: 0;
  margin: 0;
}


.worktime-table {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));  
  gap: 10px;
  /* padding: 10px; */
  width: 100%;
}
.worktime-header {
  font-weight: bold;
  background-color: #f5f5f5;
  padding: 0.5vw;
  word-break: break-word;
}

.worktime-row {
  display: contents;
}

.worktime-cell {
  padding: 0.5vw;
  border-bottom: 1px solid #ddd;
  min-width: 0;
    /* allow these grid items to shrink below their content’s “intrinsic” size */
    word-wrap: break-word;
    /* break long text rather than forcing the column wider */
}

.worktime-cell button {
  /* Let the button fill at most the cell’s width, not exceed it */
  max-width: 100%;

  /* If you’d rather have them fill the cell, you could also do:
     width: 100%;
     box-sizing: border-box;
  */

  /* Optional: reduce default padding so they’re less “wide” */
  padding: 4px 8px;

  /* Optional: slightly smaller font so “Delete” / “Edit” never wrap */
  font-size: 0.9rem;

  /* Ensure the button text doesn’t create its own overflow */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.worktime-cell.total {
  font-weight: bold;
  background-color: #f5f5f5;
  border-top: 2px solid #ddd;
}
.worktime-filters {
  margin-bottom: 20px;
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.worktime-filters button {
  padding: 5px 15px;
}

.worktime-filters button.active {
  background-color: #4CAF50;
  color: white;
}

.worktime-filters select.button-30 {
  padding: 5px 15px;
  cursor: pointer;
}


#worktimeForm input {
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  margin-bottom: 10px;
}

#worktimeForm input[type="datetime-local"] {
  min-height: 40px;
  line-height: 40px;
}

form#worktimeForm {
display: flex;
justify-content: center;
align-items: baseline;
gap: 0.5rem;
background-color: #e2e2ff;
padding: 0.5rem;
}

.diary-table {
  display: grid;
  grid-template-columns: auto auto auto auto auto;
  gap: 10px;
 /*  padding: 10px; */
  width: 100%;
  margin-top: 1rem;
}

.diary-header {
  font-weight: bold;
  background-color: #f5f5f5;
  padding: 0.5vw;
  word-break: break-word;
}

.diary-cell {
  padding: 0.5vw;
    border-bottom: 1px solid #ddd;
    min-width: 0;
    /* allow these grid items to shrink below their content’s “intrinsic” size */
    word-wrap: break-word;
    /* break long text rather than forcing the column wider */
}

.diary-cell button {
  /* Let the button fill at most the cell’s width, not exceed it */
  max-width: 100%;

  /* If you’d rather have them fill the cell, you could also do:
     width: 100%;
     box-sizing: border-box;
  */

  /* Optional: reduce default padding so they’re less “wide” */
  padding: 4px 8px;

  /* Optional: slightly smaller font so “Delete” / “Edit” never wrap */
  font-size: 0.9rem;

  /* Ensure the button text doesn’t create its own overflow */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes slideOut {
  from {
      transform: translateX(0);
      opacity: 1;
  }
  to {
      transform: translateX(100%);
      opacity: 0;
  }
}

.slide-out {
  animation: slideOut 0.5s ease-out forwards;
}

@keyframes scaleOut {
  from {
      transform: scaleX(1);
      opacity: 1;
  }
  to {
      transform: scaleX(0);
      opacity: 0;
  }
}

.scale-out {
  animation: scaleOut 0.4s ease-in forwards;
}

.listItem {
  transition: transform 0.3s ease-out;
}

.reorder-animation {
  position: relative;
  z-index: 1;
}





/* MOBILE */



@media only screen and (max-width: 1100px) {
    /* CSS rules for screens less than 1100px wide go here */

    body{
        padding: 0;
        margin: 0;
    }

    h1#mainTitle {
      font-size: 3.5rem;
      letter-spacing: 0.05rem;
  }

    #menuRow{
      grid-template-columns: 1fr;
    }

    .menu {
      width: 95vw;
    }
    .listItem{
         
            row-gap: 2rem;
            grid-auto-flow: row dense;
            /* padding-left: 0.2rem; */

        }
    
        .listItem > :nth-child(n+5) {
            grid-column: span 2;
            grid-row: 2;
        }

        /* individual spans for the button to take correct amount of space */
        /* 5th element of the list */
.listItem > :nth-child(5) {
  grid-column: 1 / span 2;  /* spanning the first two columns */
  grid-row: 2;
}

/* 6th element of the list */
.listItem > :nth-child(6) {
  grid-column: 3 / span 2;  /* spanning the next two columns */
  grid-row: 2;
}

/* 7th element of the list */
.listItem > :nth-child(7) {
  grid-column: 5 / span 3;  /* spanning the next three columns */
  grid-row: 2;
}

/* 8th element of the list */
.listItem > :nth-child(8) {
  grid-column: 8 / span 3;  /* spanning the next three columns */
  grid-row: 2;
}

        .button-30{
            margin-bottom: 2rem;
        }

        #todoForm {
          grid-template-columns: 1fr;
          align-items: center;
          justify-items: center;
          padding: 0;
 
      }

      .toDoText{
        grid-column: span 7;
      }

      #todoList input{
        grid-column: span 7;
      }

      #todoInput{
        grid-column: span 2;
        padding: 0.5rem;
      }

      .clear-input {
    
        right: 1rem;
        top: 1rem;
   
      }

    

      #deadlineInput{
        opacity: 1;
        grid-column: span 2;

    }


 

    .button-30{
      font-size: 14px;
    }

    .btn {
      padding: 0 0.5rem;
      font-size: 1rem;
    }

   
    span.votes {
      text-align: center;
  }

    #todoForm > :nth-child(n+6):nth-child(-n+10) {
      justify-self: center;
  }

  .collapsible-content {
    display: none;
    /* any other styling you want for the content */
    grid-template-columns: 1fr;
    grid-column: span 2;

      width: 100%;
      margin: 0;
      padding-top: 0;
  }


  div#extraInfoButtonContainer {
    text-align: center;
    margin-top: 0;
      display: flex;
      align-items: center;
  
  }

  .deadLineWrap{
    margin: 1rem;
    text-align: center;
  }

  #priorityCheckWrap {
    text-align: left;
    margin: 0.5rem;
  }

  ul#diaryList {
    margin: 0;
    padding: 0;
    font-size: 0.7rem;
  }
  
  .diary-table {
    display: grid;
    grid-template-columns: auto auto auto auto auto;
    gap: 1px;
    padding: 2px;
    width: 100%;
  }

  ul#worktimeList {
    margin: 0;
    padding: 0;
    font-size: 0.7rem;
  }

  .worktime-table {
    display: grid;
    grid-template-columns: auto auto auto auto auto auto auto auto;
    gap: 1px;
    padding: 2px;
    width: 100%;
  }

  .worktime-filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.worktime-filters button, .worktime-filters select {
  margin: 0.1rem;
}

.worktime-filters select {
    grid-column: 1 / -1;  /* Makes the dropdown take full width */
}

span.deadline {
  padding: 0 0.5rem;
  align-self: flex-start;
}

span.votes {
  align-self: flex-start;

}

/* Mobile larger than 500 for worktimeform */
form#worktimeForm {
  display: block;

}

input#workDescription {
  min-width: 100%;
}

}

@media screen and (max-width: 500px){
  h1#mainTitle{
    font-size: 3rem;
    letter-spacing: -0.2rem;
  }

  .diaryEntryButtons {
    display: flex;
    justify-content: center;
    gap: 0.2rem;
    flex-direction: column;
    align-items: center;
  }
  
  form#worktimeForm {
    display: block;
    justify-content: center;
    align-items: baseline;
    gap: 0.2rem;
    flex-direction: column;
    align-items: center;
    background-color: #e2e2ff;
    padding: 0.5rem;
  }

  #worktimeForm input {
    width: 100%;
  }

  h1#mainTitle {
    margin-left: 3rem;
  }

}
  /* End mobile */



/* Diary sort indicator style */
.diary-header[aria-sort] { font-weight: 600; }


/* Ensure modal edit textareas auto-grow visibly */
#detailsModal textarea {
  overflow-y: hidden;
  resize: none;
  height: auto;
  width: 100%;
  box-sizing: border-box;
  min-height: 3rem;
}


/* Strong override for modal edit fields: cancel global flex/text-area hacks */
#detailsModal textarea {
  display: block !important;
  align-items: initial !important;
  justify-content: initial !important;
  line-height: 1.5;
  width: 100%;
  min-height: 4.5rem;
  height: auto;
  overflow-y: hidden;
  resize: none;
  box-sizing: border-box;
}
#detailsModal .value { display: block; }
#detailsModal p { margin-bottom: 0.75rem; }


/* Tiny stats under the main heading */
.todo-stats { font-size: 0.9em; color: #666;    margin: 2px 0 6px 0; }


/* Header title + stats layout */
.titleBlock { display: flex; flex-direction: column; align-items: center; }
#myHeader .menuWrap { position: absolute; left: 0.5rem; }

/* Modal details label/value grid */
.detailsGrid {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 1rem;
  row-gap: 0.5rem;
  margin: 0.5rem 0 0;
}
.detailsGrid dt {
  font-weight: 600;
  color: #555;
}
.detailsGrid dd {
  margin: 0;
  color: #111;
  word-break: break-word;
}
.detailsGrid code.color-hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9em;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  background: #f1f1f1;
}
.color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.1);
  vertical-align: -2px;
  margin-right: 6px;
}

/* Modal details two-column table */
.detailsTable {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.detailsTable th {
  text-align: left;
  vertical-align: top;
  padding: 4px 12px 4px 0;
  color: #555;
  white-space: nowrap;
  width: 35%;
}
.detailsTable td {
  padding: 4px 0;
  color: #111;
  word-wrap: break-word;
}
.detailsTable code.color-hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9em;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  background: #f1f1f1;
}
.color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.1);
  vertical-align: -2px;
  margin-right: 6px;
}


/* Modal details alignment fixes */
#detailsText { text-align: left; }
.detailsTable td .value { display: inline-block; }

/* Editing styles inside details modal */
.detailsTable input[type="text"],
.detailsTable input[type="datetime-local"],
.detailsTable input[type="color"],
.detailsTable textarea,
.detailsTable select {
  width: 100%;
  box-sizing: border-box;
}


/* Push content below the fixed header safely */
body { padding-top: var(--header-height, 80px); }
"""

# --- Dictionary mapping filenames to content ---
files = {
    f"{plugin_name}/{plugin_name}.php": php_content,
    f"{plugin_name}/templates/app-template.php": html_content,
    f"{plugin_name}/assets/style.css": style_css,
    f"{plugin_name}/assets/sync.js": sync_js,
    f"{plugin_name}/assets/generic.js": generic_js,
    f"{plugin_name}/assets/todo.js": todo_js,
    f"{plugin_name}/assets/worktime.js": worktime_js,
    f"{plugin_name}/assets/diary.js": diary_js,
    f"{plugin_name}/assets/todoSorting.js": todo_sorting_js,
    f"{plugin_name}/assets/exportWorktimeToSystem.js": export_worktime_js,
}

# --- Create Zip ---
zip_filename = f"{plugin_name}-plugin.zip"
with zipfile.ZipFile(zip_filename, 'w') as zipf:
    for file_path, content in files.items():
        zipf.writestr(file_path, content)

print(f"Successfully created {zip_filename}. Upload this to WordPress.")