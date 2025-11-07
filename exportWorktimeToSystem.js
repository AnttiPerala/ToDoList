// --- Month boundary helpers ---
function startOfMonth(d){
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), 1);
}

function endOfMonth(d){
  const dt = new Date(d);
  // day 0 of next month = last day of current month
  return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
}



function exportWorktimeForSystem() {
  // Use current filters
  const fc = document.querySelector('.worktime-filters');
  const period = fc?.querySelector('button.active')?.dataset.period || 'thisMonth';
  const selectedProject = document.getElementById('projectFilter')?.value || 'All projects';

  // Collect filtered entries (source of truth = your filter function)
  const items = filterWorktimesByPeriod(period, selectedProject)
    .map(e => ({
      id: e.id,
      project: e.project || 'No project',
      description: e.description || '',
      start: new Date(e.start),
      end: new Date(e.end),
      minutes: Math.max(0, Math.round((new Date(e.end) - new Date(e.start)) / 60000))
    }))
    // Ignore zero-length
    .filter(e => e.minutes > 0)
    // Sort stable by start time
    .sort((a,b) => a.start - b.start);

  // Build per-entry “original day” (local date at start)
  items.forEach(it => {
    it.originalDate = ymd(it.start);
    it.targetDate = adjustWeekend(new Date(it.start)); // weekend shift (Sat→Fri, Sun→Mon)
    it.adjustLog = [];
    if (isWeekend(new Date(it.start))) {
      it.adjustLog.push(`${fmtDMY(it.originalDate)} fell on weekend → moved to ${fmtDMY(ymd(it.targetDate))}`);
    }
  });

  // Allocate minutes into weekdays with an 8h (480 min) per-day cap (total across all projects)
  const DAY_CAP = 480;
  const dayUsage = new Map();          // key = ymd string, value = minutes used that day (all projects)
  const dayProject = new Map();        // key = ymd|project, value = {minutes, descriptions:Set}
  const audit = [];                    // human log of adjustments

  function getDayUsed(d){ return dayUsage.get(d) || 0; }
  function addDayUsage(d, m){ dayUsage.set(d, getDayUsed(d) + m); }
  function addDayProject(d, project, minutes, desc){
    const key = d + '|' + project;
    let entry = dayProject.get(key);
    if (!entry) { entry = { minutes: 0, descriptions: new Set() }; dayProject.set(key, entry); }
    entry.minutes += minutes;
    if (desc) entry.descriptions.add(desc);
  }

  // Helper: find the next weekday with free capacity (>=1 min). We go forward in time.
  function findNextDayWithSpace(fromDate) {
    let d = new Date(fromDate);
    for (let i=0; i<365; i++) {
      d = nextDay(d);
      const dd = adjustWeekend(d); // ensure weekday
      const y = ymd(dd);
      const free = Math.max(0, DAY_CAP - getDayUsed(y));
      if (free > 0) return dd;
    }
    // fallback: return fromDate to avoid infinite loop
    return new Date(fromDate);
  }

  // Allocate each original item
items.forEach(it => {
  // Month bounds for THIS ENTRY — all movement must stay inside this month
  const mStart = startOfMonth(it.start);
  const mEnd = endOfMonth(it.start);

  it.originalDate = ymd(it.start);

  // weekend jam inside month
// stay inside the same month
function stepDayWithinMonth(d, dir, mStart, mEnd){
  const nd = new Date(d);
  nd.setDate(nd.getDate() + dir);
  if (nd < mStart || nd > mEnd) return null;
  return nd;
}
function nextWeekdayWithinMonth(d, dir, mStart, mEnd){
  let cur = new Date(d);
  for (let i=0; i<40; i++){
    cur = stepDayWithinMonth(cur, dir, mStart, mEnd);
    if (!cur) return null;
    if (!isWeekend(cur)) return cur;
  }
  return null;
}
function findNextDayWithSpaceWithinMonth(fromDate, mStart, mEnd, getDayUsed, DAY_CAP){
  // forward first
  {
    let cur = new Date(fromDate);
    for (let i=0; i<60; i++){
      const nwd = nextWeekdayWithinMonth(cur, +1, mStart, mEnd);
      if (!nwd) break;
      const free = Math.max(0, DAY_CAP - (getDayUsed(ymd(nwd)) || 0));
      if (free > 0) return { date: nwd, dir: +1 };
      cur = nwd;
    }
  }
  // then backward
  {
    let cur = new Date(fromDate);
    for (let i=0; i<60; i++){
      const pwd = nextWeekdayWithinMonth(cur, -1, mStart, mEnd);
      if (!pwd) break;
      const free = Math.max(0, DAY_CAP - (getDayUsed(ymd(pwd)) || 0));
      if (free > 0) return { date: pwd, dir: -1 };
      cur = pwd;
    }
  }
  return null; // no capacity in this month
}

// weekend jam but keep same month
function adjustWeekendInMonth(d, mStart, mEnd){
  const base = new Date(d);
  const day = base.getDay(); // 0=Sun, 6=Sat
  if (day === 6){            // Saturday
    const fri = new Date(base); fri.setDate(fri.getDate()-1);
    if (fri >= mStart && fri <= mEnd) return fri;
    const mon = new Date(base); mon.setDate(mon.getDate()+2);
    if (mon >= mStart && mon <= mEnd) return mon;
  }else if (day === 0){      // Sunday
    const mon = new Date(base); mon.setDate(mon.getDate()+1);
    if (mon >= mStart && mon <= mEnd) return mon;
    const fri = new Date(base); fri.setDate(fri.getDate()-2);
    if (fri >= mStart && fri <= mEnd) return fri;
  }
  return base; // already weekday or fallback
}


  let remaining = it.minutes;
  let currentDate = it.targetDate;

  // Ensure currentDate is weekday & within month (safety)
  if (isWeekend(currentDate)) {
    currentDate = adjustWeekendInMonth(currentDate, mStart, mEnd);
  }
  if (currentDate < mStart) currentDate = new Date(mStart);
  if (currentDate > mEnd)   currentDate = new Date(mEnd);

  while (remaining > 0) {
    const dayKey = ymd(currentDate);
    const used = getDayUsed(dayKey);
    const free = Math.max(0, DAY_CAP - used);

    if (free > 0) {
      const take = Math.min(remaining, free);
      addDayUsage(dayKey, take);
      addDayProject(dayKey, it.project, take, it.description);
      if (take === remaining) {
        if (dayKey !== it.originalDate) {
          it.adjustLog.push(`${minsToHours(take)}h allocated to ${fmtDMY(dayKey)} (cap ${DAY_CAP/60}h/day)`);
        }
        remaining = 0;
      } else {
        it.adjustLog.push(`Split: ${minsToHours(take)}h to ${fmtDMY(dayKey)} (day full)`);
        remaining -= take;
      }
    }

    if (remaining > 0) {
      // find next free day within this month (forward, then backward)
      const found = findNextDayWithSpaceWithinMonth(currentDate, mStart, mEnd, getDayUsed, DAY_CAP);
      if (!found) {
        // Month is saturated: force remainder onto the original target day (exceeds cap)
        addDayUsage(dayKey, remaining);
        addDayProject(dayKey, it.project, remaining, it.description);
        it.adjustLog.push(`Forced ${minsToHours(remaining)}h into ${fmtDMY(dayKey)} (no free weekdays left in month)`);
        remaining = 0;
      } else {
        const from = fmtDMY(dayKey);
        const to = fmtDMY(ymd(found.date));
        it.adjustLog.push(`Overflow → ${from} → ${to}`);
        currentDate = found.date;
      }
    }
  }

  // write per-entry audit line
  if (it.adjustLog.length) {
    audit.push(`• #${it.id} ${it.project} ${minsToHours(it.minutes)}h from ${fmtDMY(it.originalDate)}:\n  - ` + it.adjustLog.join('\n  - '));
  } else {
    audit.push(`• #${it.id} ${it.project} ${minsToHours(it.minutes)}h kept on ${fmtDMY(it.originalDate)}`);
  }
});


  // Build the final text in the requested structure: day → project blocks
  const days = Array.from(dayProject.keys()).map(k => k.split('|')[0]);
  const uniqueDays = Array.from(new Set(days)).sort((a,b) => new Date(a) - new Date(b));

  // FINAL GUARD: ensure no day exceeds 8h by rebalancing within month
const rebalanceResult = redistributeOverCapWithinMonth(dayUsage, dayProject, DAY_CAP, audit);
if (!rebalanceResult.ok){
  alert(
    'Export aborted: cannot redistribute to keep all weekdays ≤ 8 hours within this month. ' +
    `Problem day: ${fmtDMY(rebalanceResult.problemDay)}. ` +
    'Please reduce total hours or adjust entries.'
  );
  return;
}


  let out = '';
  uniqueDays.forEach(d => {
    out += `${fmtDMY(d)}\n`;
    const projectsOnDay = Array.from(dayProject.keys())
      .filter(k => k.startsWith(d + '|'))
      .map(k => ({ project: k.split('|')[1], data: dayProject.get(k) }))
      .sort((a,b) => a.project.localeCompare(b.project));

    projectsOnDay.forEach(({project, data}) => {
      out += `${project}:\n`;
      out += `${minsToHours(data.minutes)} hours (in total)\n`;
      // Every original description once (order not guaranteed, Set preserves insertion per project/day)
      data.descriptions.forEach(desc => {
        if (desc && desc.trim()) out += `-${desc.trim()}\n`;
      });
      out += `\n`;
    });
  });

    // --- Monthly totals per project ---
  const projectTotals = new Map(); // project → total minutes
  for (const [key, data] of dayProject.entries()) {
    const project = key.split('|')[1];
    projectTotals.set(project, (projectTotals.get(project) || 0) + data.minutes);
  }

  out += `\n=== Monthly Totals ===\n`;
  Array.from(projectTotals.entries())
    .sort((a,b) => a[0].localeCompare(b[0]))
    .forEach(([project, minutes]) => {
      out += `${project}: ${minsToHours(minutes)} hours\n`;
    });

  const grandMinutes = Array.from(projectTotals.values()).reduce((a,b)=>a+b,0);
  out += `\nGrand total: ${minsToHours(grandMinutes)} hours\n`;


  // Add adjustment report
  out += `\n=== Adjustment report ===\n`;
  out += audit.join(`\n`) + `\n`;

  // Download .txt
  const blob = new Blob([out], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Name reflects filter period
  a.download = `worktime_export_system_${period}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- helpers for the export ---------- */

function isWeekend(d){
  const day = new Date(d).getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

function adjustWeekend(d){
  const day = new Date(d).getDay();
  const base = new Date(d);
  if (day === 6) { // Saturday → Friday
    base.setDate(base.getDate() - 1);
  } else if (day === 0) { // Sunday → Monday
    base.setDate(base.getDate() + 1);
  }
  return base;
}

function nextDay(d){
  const nd = new Date(d);
  nd.setDate(nd.getDate() + 1);
  // skip weekends automatically
  return isWeekend(nd) ? adjustWeekend(nd) : nd;
}

function ymd(d){
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function fmtDMY(ymdStr){
  const [y,m,d] = ymdStr.split('-').map(Number);
  return `${d}.${m}.${y}`;
}

function minsToHours(mins){
  // Decimal hours with up to 2 decimals, trimming trailing zeros
  const h = (mins / 60);
  const s = h.toFixed(2);
  return s.replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
}

function monthBoundsFromYMD(ymdStr){
  const [y,m] = ymdStr.split('-').map(Number);
  return {
    start: new Date(y, m-1, 1),
    end:   new Date(y, m,   0),
  };
}

function nthWeekdayWithinMonth(origin, dir, steps, mStart, mEnd){
  let cur = new Date(origin);
  let count = 0;
  while (count < steps){
    cur = stepDayWithinMonth(cur, dir, mStart, mEnd);
    if (!cur) return null;
    if (!isWeekend(cur)) count++;
  }
  return cur;
}

function redistributeOverCapWithinMonth(dayUsage, dayProject, DAY_CAP, audit){
  const dayKeys = Array.from(dayUsage.keys()).sort((a,b) => new Date(a) - new Date(b));

  for (const day of dayKeys){
    let used = dayUsage.get(day) || 0;
    if (used <= DAY_CAP) continue;

    let overflow = used - DAY_CAP;

    // month bounds derived from the day itself
    const { start: mStart, end: mEnd } = monthBoundsFromYMD(day);
    const [Y,M,D] = day.split('-').map(Number);
    const origin = new Date(Y, M-1, D);

    // collect project buckets on this day (largest first)
    let buckets = Array.from(dayProject.keys())
      .filter(k => k.startsWith(day + '|'))
      .map(k => ({ key:k, project:k.split('|')[1], data: dayProject.get(k) }))
      .sort((a,b) => (b.data.minutes - a.data.minutes));

    let radius = 1;
    while (overflow > 0){
      let placedSomething = false;

      for (const dir of [+1, -1]){
        const target = nthWeekdayWithinMonth(origin, dir, radius, mStart, mEnd);
        if (!target) continue;
        const tKey = ymd(target);
        const free = Math.max(0, DAY_CAP - (dayUsage.get(tKey) || 0));
        if (free <= 0) continue;

        // always move from largest remaining bucket
        buckets.sort((a,b) => (b.data.minutes - a.data.minutes));
        if (!buckets.length || buckets[0].data.minutes <= 0) break;

        const move = Math.min(overflow, free, buckets[0].data.minutes);

        // decrement source (day, project)
        buckets[0].data.minutes -= move;
        dayUsage.set(day, dayUsage.get(day) - move);

        // add to target day total
        dayUsage.set(tKey, (dayUsage.get(tKey) || 0) + move);

        // add to target project bucket
        const targetProjKey = tKey + '|' + buckets[0].project;
        let tgt = dayProject.get(targetProjKey);
        if (!tgt) { tgt = { minutes: 0, descriptions: new Set() }; dayProject.set(targetProjKey, tgt); }
        tgt.minutes += move;
        // copy descriptions (keep source descriptions on both days so the reviewer sees them)
        buckets[0].data.descriptions.forEach(s => tgt.descriptions.add(s));

        audit.push(`Rebalanced: moved ${minsToHours(move)}h of ${buckets[0].project} from ${fmtDMY(day)} → ${fmtDMY(tKey)} to honor 8h/day cap`);

        overflow -= move;
        placedSomething = true;

        // drop empty bucket
        if (buckets[0].data.minutes <= 0) buckets.shift();
        if (overflow <= 0) break;
      }

      if (!placedSomething){
        radius += 1;
        // safety stop
        if (radius > 40) break;
      }
    }

    // if still overflow -> month has no capacity left
    if (dayUsage.get(day) > DAY_CAP){
      return { ok:false, problemDay: day };
    }
  }

  // double-check no day exceeds cap
  const bad = Array.from(dayUsage.entries()).find(([k,v]) => v > DAY_CAP);
  if (bad) return { ok:false, problemDay: bad[0] };

  return { ok:true };
}
