<!DOCTYPE html>
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
</html>