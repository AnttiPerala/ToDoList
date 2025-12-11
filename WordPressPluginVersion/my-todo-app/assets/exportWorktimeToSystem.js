
// --- Month boundary helpers ---
function startOfMonth(d){
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), 1);
}

function endOfMonth(d){
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
}

function exportWorktimeForSystem() {
  const fc = document.querySelector('.worktime-filters');
  const period = fc?.querySelector('button.active')?.dataset.period || 'thisMonth';
  const selectedProject = document.getElementById('projectFilter')?.value || 'All projects';

  function stepDayWithinMonth(d, dir, mStart, mEnd){
    const nd = new Date(d);
    nd.setDate(nd.getDate() + dir);
    if (nd < mStart || nd > mEnd) return null;
    return nd;
  }
  function isWeekend(d){
    const day = new Date(d).getDay(); // 0=Sun, 6=Sat
    return day === 0 || day === 6;
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
    const h = (mins / 60);
    const s = h.toFixed(2);
    return s.replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
  }

  // Simplified version of your helper logic for brevity in the plugin
  // Assuming window.worktimes contains the data
  const items = filterWorktimesByPeriod(period, selectedProject)
    .map(e => ({
      id: e.id,
      project: e.project || 'No project',
      description: e.description || '',
      start: new Date(e.start),
      end: new Date(e.end),
      minutes: Math.max(0, Math.round((new Date(e.end) - new Date(e.start)) / 60000))
    }))
    .filter(e => e.minutes > 0)
    .sort((a,b) => a.start - b.start);

  let out = `Export for ${period} - ${selectedProject}\n\n`;
  items.forEach(it => {
      out += `${fmtDMY(ymd(it.start))} | ${it.project} | ${minsToHours(it.minutes)}h | ${it.description}\n`;
  });

  const blob = new Blob([out], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `worktime_export_system_${period}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
