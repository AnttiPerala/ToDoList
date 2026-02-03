/* exportWorktimeToSystem.js
   Drop-in exporter for your Worktime tab.

   Features:
   - Uses current UI filters (period + project)
   - Groups to ONE block per day per project (summed minutes + descriptions listed)
   - Converts minutes → decimal hours (75 → 1.25, 90 → 1.5)
   - Never allocates on weekends (shifts within SAME MONTH)
   - Enforces max 8h/day TOTAL (across all projects), redistributes to nearest weekdays IN SAME MONTH
   - Adds "Monthly Totals" per project + grand total
   - Adds a detailed Adjustment Report / Edit Log

   Requires (already in your app):
   - filterWorktimesByPeriod(period, selectedProject)
   - global worktimes array (used by the filter)
*/

function exportWorktimeForSystem() {
  const fc = document.querySelector(".worktime-filters");
  const period = fc?.querySelector("button.active")?.dataset.period || "thisMonth";
  const selectedProject = document.getElementById("projectFilter")?.value || "All projects";

  if (typeof filterWorktimesByPeriod !== "function") {
    alert("Export error: filterWorktimesByPeriod(period, project) was not found.");
    return;
  }

  // Pull filtered raw entries
  const raw = filterWorktimesByPeriod(period, selectedProject)
    .map((e) => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      const minutes = Math.max(0, Math.round((end - start) / 60000));
      return {
        id: e.id,
        project: (e.project || "No project").toString(),
        description: (e.description || "").toString(),
        start,
        end,
        minutes,
      };
    })
    .filter((e) => e.minutes > 0)
    .sort((a, b) => a.start - b.start);

  if (!raw.length) {
    alert("No worktimes to export for the current filter.");
    return;
  }

  const DAY_CAP = 480; // 8 hours
  const dayUsage = new Map(); // ymd -> total minutes used (all projects)
  const dayProject = new Map(); // ymd|project -> { minutes, descriptions:Set }
  const audit = []; // edit log

  function getDayUsed(dayKey) {
    return dayUsage.get(dayKey) || 0;
  }
  function addDayUsage(dayKey, mins) {
    dayUsage.set(dayKey, getDayUsed(dayKey) + mins);
  }
  function addDayProject(dayKey, project, mins, desc) {
    const key = dayKey + "|" + project;
    let entry = dayProject.get(key);
    if (!entry) {
      entry = { minutes: 0, descriptions: new Set() };
      dayProject.set(key, entry);
    }
    entry.minutes += mins;
    if (desc && desc.trim()) entry.descriptions.add(desc.trim());
  }

  // -------- Month-safe allocation helpers --------
  function startOfMonth(d) {
    const dt = new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), 1);
  }
  function endOfMonth(d) {
    const dt = new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
  }
  function isWeekend(d) {
    const day = new Date(d).getDay();
    return day === 0 || day === 6;
  }
  function ymd(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }
  function fmtDMY(ymdStr) {
    const [y, m, d] = ymdStr.split("-").map(Number);
    return `${d}.${m}.${y}`;
  }
  function minsToHours(mins) {
    const h = mins / 60;
    const s = h.toFixed(2);
    return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  // Keep weekend adjustment inside same month:
  // Sat: try Fri, else Mon
  // Sun: try Mon, else Fri
  function adjustWeekendInMonth(d, mStart, mEnd) {
    const base = new Date(d);
    const day = base.getDay(); // 0=Sun, 6=Sat
    if (day === 6) {
      const fri = new Date(base);
      fri.setDate(fri.getDate() - 1);
      if (fri >= mStart && fri <= mEnd) return fri;
      const mon = new Date(base);
      mon.setDate(mon.getDate() + 2);
      if (mon >= mStart && mon <= mEnd) return mon;
    } else if (day === 0) {
      const mon = new Date(base);
      mon.setDate(mon.getDate() + 1);
      if (mon >= mStart && mon <= mEnd) return mon;
      const fri = new Date(base);
      fri.setDate(fri.getDate() - 2);
      if (fri >= mStart && fri <= mEnd) return fri;
    }
    return base;
  }

  function stepDayWithinMonth(d, dir, mStart, mEnd) {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + dir);
    if (nd < mStart || nd > mEnd) return null;
    return nd;
  }

  function nextWeekdayWithinMonth(d, dir, mStart, mEnd) {
    let cur = new Date(d);
    for (let i = 0; i < 40; i++) {
      cur = stepDayWithinMonth(cur, dir, mStart, mEnd);
      if (!cur) return null;
      if (!isWeekend(cur)) return cur;
    }
    return null;
  }

  // Find nearest day with space: forward first, then backward, staying inside month
  function findNextDayWithSpaceWithinMonth(fromDate, mStart, mEnd) {
    // forward
    {
      let cur = new Date(fromDate);
      for (let i = 0; i < 60; i++) {
        const nwd = nextWeekdayWithinMonth(cur, +1, mStart, mEnd);
        if (!nwd) break;
        const free = Math.max(0, DAY_CAP - getDayUsed(ymd(nwd)));
        if (free > 0) return nwd;
        cur = nwd;
      }
    }
    // backward
    {
      let cur = new Date(fromDate);
      for (let i = 0; i < 60; i++) {
        const pwd = nextWeekdayWithinMonth(cur, -1, mStart, mEnd);
        if (!pwd) break;
        const free = Math.max(0, DAY_CAP - getDayUsed(ymd(pwd)));
        if (free > 0) return pwd;
        cur = pwd;
      }
    }
    return null;
  }

  // -------- Primary allocation (never exceeds cap during placement) --------
  raw.forEach((it) => {
    const mStart = startOfMonth(it.start);
    const mEnd = endOfMonth(it.start);

    const originalDayKey = ymd(it.start);

    // weekend jam within same month
    let target = new Date(it.start);
    if (isWeekend(target)) {
      const moved = adjustWeekendInMonth(target, mStart, mEnd);
      audit.push(`• #${it.id} ${it.project} ${minsToHours(it.minutes)}h: weekend ${fmtDMY(originalDayKey)} → ${fmtDMY(ymd(moved))}`);
      target = moved;
    }

    // Ensure weekday
    if (isWeekend(target)) target = adjustWeekendInMonth(target, mStart, mEnd);

    let remaining = it.minutes;
    let current = new Date(target);
    let placedAny = false;

    while (remaining > 0) {
      const dayKey = ymd(current);
      const free = Math.max(0, DAY_CAP - getDayUsed(dayKey));

      if (free > 0) {
        const take = Math.min(remaining, free);
        addDayUsage(dayKey, take);
        addDayProject(dayKey, it.project, take, it.description);
        placedAny = true;

        if (take < remaining) {
          audit.push(`  - split: ${minsToHours(take)}h to ${fmtDMY(dayKey)} (day full, ${minsToHours(DAY_CAP)}h cap)`);
        } else if (dayKey !== originalDayKey) {
          audit.push(`  - placed: ${minsToHours(take)}h to ${fmtDMY(dayKey)}`);
        }

        remaining -= take;
      }

      if (remaining > 0) {
        const next = findNextDayWithSpaceWithinMonth(current, mStart, mEnd);
        if (!next) {
          // Month has no free space — do NOT exceed cap; abort export
          alert(
            `Export aborted: Month is saturated (no weekday capacity left) while placing entry #${it.id}.\n` +
              `Remaining: ${minsToHours(remaining)}h for ${it.project}.\n` +
              `Month: ${it.start.getMonth() + 1}.${it.start.getFullYear()}`
          );
          throw new Error("Month saturated; cannot allocate without breaking 8h/day cap.");
        }
        audit.push(`  - overflow: searching next weekday → ${fmtDMY(ymd(next))}`);
        current = next;
      }
    }

    if (!placedAny) {
      // should never happen (minutes > 0), but log anyway
      audit.push(`• #${it.id} ${it.project}: nothing placed (unexpected)`);
    }
  });

  // -------- Final guard / rebalance (should be unnecessary, but protects against bugs/duplicates) --------
  const rebalanceResult = redistributeOverCapWithinMonth(dayUsage, dayProject, DAY_CAP, audit);
  if (!rebalanceResult.ok) {
    alert(
      "Export aborted: cannot rebalance to keep all weekdays ≤ 8 hours within the month. " +
        `Problem day: ${fmtDMY(rebalanceResult.problemDay)}.`
    );
    return;
  }

  // -------- Build output: day → project blocks --------
  const uniqueDays = Array.from(new Set(Array.from(dayProject.keys()).map((k) => k.split("|")[0])))
    .sort((a, b) => new Date(a) - new Date(b));

  let out = "";

  uniqueDays.forEach((d) => {
    out += `${fmtDMY(d)}\n`;

    const projectsOnDay = Array.from(dayProject.keys())
      .filter((k) => k.startsWith(d + "|"))
      .map((k) => ({ project: k.split("|")[1], data: dayProject.get(k) }))
      .sort((a, b) => a.project.localeCompare(b.project));

    projectsOnDay.forEach(({ project, data }) => {
      out += `${project}:\n`;
      out += `${minsToHours(data.minutes)} hours (in total)\n`;
      data.descriptions.forEach((desc) => {
        out += `-${desc}\n`;
      });
      out += `\n`;
    });
  });

  // -------- Monthly totals (per project + grand total) --------
  const projectTotals = new Map(); // project -> minutes
  for (const [key, data] of dayProject.entries()) {
    const project = key.split("|")[1];
    projectTotals.set(project, (projectTotals.get(project) || 0) + data.minutes);
  }

  out += `\n=== Monthly Totals ===\n`;
  Array.from(projectTotals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([project, minutes]) => {
      out += `${project}: ${minsToHours(minutes)} hours\n`;
    });

  const grandMinutes = Array.from(projectTotals.values()).reduce((a, b) => a + b, 0);
  out += `\nGrand total: ${minsToHours(grandMinutes)} hours\n`;

  // -------- Adjustment / edit log --------
  out += `\n=== Adjustment report ===\n`;
  out += audit.join("\n") + "\n";

  // Download .txt
  const blob = new Blob([out], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `worktime_export_system_${period}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Rebalance pass: ensure no day ends > 8h (should not happen, but safety) ---------- */

function redistributeOverCapWithinMonth(dayUsage, dayProject, DAY_CAP, audit) {
  function ymdToDate(ymdStr) {
    const [y, m, d] = ymdStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function monthBoundsFromYMD(ymdStr) {
    const [y, m] = ymdStr.split("-").map(Number);
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
  }
  function isWeekend(d) {
    const day = new Date(d).getDay();
    return day === 0 || day === 6;
  }
  function ymd(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }
  function fmtDMY(ymdStr) {
    const [y, m, d] = ymdStr.split("-").map(Number);
    return `${d}.${m}.${y}`;
  }
  function minsToHours(mins) {
    const h = mins / 60;
    const s = h.toFixed(2);
    return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  function stepDayWithinMonth(d, dir, mStart, mEnd) {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + dir);
    if (nd < mStart || nd > mEnd) return null;
    return nd;
  }

  function nthWeekdayWithinMonth(origin, dir, steps, mStart, mEnd) {
    let cur = new Date(origin);
    let count = 0;
    while (count < steps) {
      cur = stepDayWithinMonth(cur, dir, mStart, mEnd);
      if (!cur) return null;
      if (!isWeekend(cur)) count++;
    }
    return cur;
  }

  const dayKeys = Array.from(dayUsage.keys()).sort((a, b) => new Date(a) - new Date(b));

  for (const day of dayKeys) {
    let used = dayUsage.get(day) || 0;
    if (used <= DAY_CAP) continue;

    let overflow = used - DAY_CAP;
    const { start: mStart, end: mEnd } = monthBoundsFromYMD(day);
    const origin = ymdToDate(day);

    // project buckets on this day (largest first)
    let buckets = Array.from(dayProject.keys())
      .filter((k) => k.startsWith(day + "|"))
      .map((k) => ({ project: k.split("|")[1], data: dayProject.get(k) }))
      .sort((a, b) => b.data.minutes - a.data.minutes);

    let radius = 1;

    while (overflow > 0) {
      let placedSomething = false;

      for (const dir of [+1, -1]) {
        const target = nthWeekdayWithinMonth(origin, dir, radius, mStart, mEnd);
        if (!target) continue;

        const tKey = ymd(target);
        const free = Math.max(0, DAY_CAP - (dayUsage.get(tKey) || 0));
        if (free <= 0) continue;

        buckets.sort((a, b) => b.data.minutes - a.data.minutes);
        if (!buckets.length || buckets[0].data.minutes <= 0) break;

        const move = Math.min(overflow, free, buckets[0].data.minutes);

        // remove from source
        buckets[0].data.minutes -= move;
        dayUsage.set(day, (dayUsage.get(day) || 0) - move);

        // add to target day total
        dayUsage.set(tKey, (dayUsage.get(tKey) || 0) + move);

        // add to target day project bucket
        const targetProjKey = tKey + "|" + buckets[0].project;
        let tgt = dayProject.get(targetProjKey);
        if (!tgt) {
          tgt = { minutes: 0, descriptions: new Set() };
          dayProject.set(targetProjKey, tgt);
        }
        tgt.minutes += move;
        buckets[0].data.descriptions.forEach((s) => tgt.descriptions.add(s));

        audit.push(`Rebalanced: moved ${minsToHours(move)}h of ${buckets[0].project} from ${fmtDMY(day)} → ${fmtDMY(tKey)} to honor 8h/day cap`);

        overflow -= move;
        placedSomething = true;

        if (buckets[0].data.minutes <= 0) buckets.shift();
        if (overflow <= 0) break;
      }

      if (!placedSomething) {
        radius += 1;
        if (radius > 40) break;
      }
    }

    if ((dayUsage.get(day) || 0) > DAY_CAP) {
      return { ok: false, problemDay: day };
    }
  }

  const bad = Array.from(dayUsage.entries()).find(([, v]) => v > DAY_CAP);
  if (bad) return { ok: false, problemDay: bad[0] };

  return { ok: true };
}
