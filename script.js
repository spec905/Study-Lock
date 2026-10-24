// ===== navigation =====
const navBtns = document.querySelectorAll('nav button[data-view]');
const homeView = document.getElementById('home');
const scheduleView = document.getElementById('schedule');
const focusView = document.getElementById('focus');
const historyView = document.getElementById('history');

[scheduleView, focusView, historyView].forEach(v => {
  if (v) v.style.display = 'none';
});

navBtns.forEach(button => {
  button.addEventListener('click', () => {
    const page = button.getAttribute('data-view');
    [homeView, scheduleView, focusView, historyView].forEach(v => {
      if (v) v.style.display = 'none';
    });
    if (page === 'home' && homeView) homeView.style.display = 'block';
    else if (page === 'schedule' && scheduleView) scheduleView.style.display = 'block';
    else if (page === 'focus' && focusView) focusView.style.display = 'block';
    else if (page === 'history' && historyView) historyView.style.display = 'block';
    navBtns.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
  });
});
//
function dateKey(d) {
  const date = new Date(d);
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0');
}

// topics 
const topicInput = document.getElementById('topictostudy-input');
const addTopicBtn = document.getElementById('add-topic-btn');
const topicsList = document.getElementById('topics-list');
let topics = [];

function renderTopics() {
  if (!topicsList) return;
  if (topics.length === 0) {
    topicsList.innerHTML = '';
    return;
  }
  topicsList.innerHTML = topics.map((topic, index) => `
    <span class="tag">
      ${topic}
      <button type="button" data-index="${index}" class="remove-topic">×</button>
    </span>
  `).join('');
}

if (addTopicBtn && topicInput) {
  addTopicBtn.addEventListener('click', () => {
    const text = topicInput.value.trim();
    if (!text) return;
    topics.push(text);
    topicInput.value = '';
    renderTopics();
  });
  topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTopicBtn.click();
    }
  });
}

if (topicsList) {
  topicsList.addEventListener('click', (e) => {
    if (!e.target.classList.contains('remove-topic')) return;
    const index = Number(e.target.dataset.index);
    topics.splice(index, 1);
    renderTopics();
  });
}

//exams / schedule 
const examNameInput = document.getElementById('exam-name');
const examDateInput = document.getElementById('exam-date');
const nextBody = document.getElementById('nextBody');
const generatebtn = document.getElementById('generate-btn');
const resetbtn = document.getElementById('reset-btn');
const daysPerWeekSelect = document.getElementById('days-per-week');
const examsListEl = document.getElementById('exams-list');
const planEl = document.getElementById('plan');
const scheduleTitle = document.getElementById('schedule-title');
const focusExamSelect = document.getElementById('focus-exam');
const historyListEl = document.getElementById('history-list');
const historyTotalsEl = document.getElementById('history-totals');

let exams = JSON.parse(localStorage.getItem('exams') || '[]');
let currentExamId = localStorage.getItem('currentExamId') || null;
let examName = '';
let examDate = '';
let schedule = [];

function saveExams() {
  localStorage.setItem('exams', JSON.stringify(exams));
  if (currentExamId) localStorage.setItem('currentExamId', currentExamId);
  else localStorage.removeItem('currentExamId');
}

function generateSchedule() {
  if (!examDate) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate + 'T00:00:00');
  const totalDays = Math.max(1, Math.ceil((exam - today) / 86400000));

  const allDays = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    allDays.push(d);
  }

  const reviewCount = totalDays >= 4 ? 2 : (totalDays >= 2 ? 1 : 0);
  const available = allDays.slice(0, totalDays - reviewCount);
  const reviewDays = allDays.slice(totalDays - reviewCount);

  const daysPerWeek = Number(daysPerWeekSelect && daysPerWeekSelect.value) || 5;

  // prefer weekdays,space sessions out
  let studyPool = available.filter(d => {
    const day = d.getDay();
    if (daysPerWeek >= 7) return true;
    if (daysPerWeek === 6) return day !== 0;
    return day >= 1 && day <= 5;
  });
  if (studyPool.length === 0) studyPool = available.slice();

  const sessionCount = Math.max(topics.length, 1);
  const density = Math.ceil((studyPool.length / 7) * daysPerWeek) || sessionCount;
  const count = Math.min(studyPool.length, Math.max(sessionCount, Math.min(density, studyPool.length)));

  let studyDays = [];
  if (studyPool.length <= count) {
    studyDays = studyPool.slice();
  } else {
    for (let i = 0; i < count; i++) {
      const idx = Math.round(i * (studyPool.length - 1) / Math.max(count - 1, 1));
      studyDays.push(studyPool[idx]);
    }
    const seen = {};
    studyDays = studyDays.filter(d => {
      const k = d.toDateString();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  schedule = studyDays.map(d => ({ date: d, tasks: [] }));

  if (topics.length === 0) {
    schedule.forEach((day, i) => {
      day.tasks.push({ label: 'Study session ' + (i + 1), done: false });
    });
  } else {
    topics.forEach((topic, i) => {
      const idx = i % schedule.length;
      schedule[idx].tasks.push({ label: topic, done: false });
    });
  }

  reviewDays.forEach((d, i) => {
    const isLast = i === reviewDays.length - 1;
    schedule.push({
      date: d,
      tasks: [{
        label: isLast ? 'Final review + practice test' : 'Review all topics',
        done: false
      }]
    });
  });

  schedule.sort((a, b) => a.date - b.date);
}

function taskHtml(task, dayIndex, taskIndex) {
  return `<label class="task">
    <input type="checkbox" class="task-check" data-day="${dayIndex}" data-task="${taskIndex}" ${task.done ? 'checked' : ''}>
    <span class="${task.done ? 'done' : ''}">${task.label}</span>
  </label>`;
}

function renderSchedule() {
  if (!planEl) return;
  if (schedule.length === 0) {
    planEl.innerHTML = '<p>No schedule yet. Save an exam first.</p>';
    if (scheduleTitle) scheduleTitle.textContent = 'Full schedule';
    return;
  }
  if (scheduleTitle) {
    scheduleTitle.textContent = examName ? `Schedule — ${examName}` : 'Full schedule';
  }
  planEl.innerHTML = schedule.map((day, i) => `
    <div class="day-card">
      <strong>${formatDate(day.date)}</strong>
      <ul>${day.tasks.map((task, j) => `<li>${taskHtml(task, i, j)}</li>`).join('')}</ul>
    </div>
  `).join('');
}

function renderToday() {
  if (!nextBody) return;
  if (!examDate) {
    nextBody.textContent = 'Add an exam to get a plan';
    return;
  }
  const today = new Date();
  const dayIndex = schedule.findIndex(d => d.date.toDateString() === today.toDateString());
  if (dayIndex === -1 || schedule[dayIndex].tasks.length === 0) {
    nextBody.textContent = 'Nothing scheduled today.';
    return;
  }
  const tasks = schedule[dayIndex].tasks;
  const doneCount = tasks.filter(t => t.done).length;
  nextBody.innerHTML =
    `<div class="progress-today">${doneCount}/${tasks.length} done today</div>` +
    tasks.map((task, j) => taskHtml(task, dayIndex, j)).join('');
}


function persistCurrentExam() {
  if (!currentExamId || !examDate) return;
  const idx = exams.findIndex(e => e.id === currentExamId);
  if (idx < 0) return;
  exams[idx] = {
    ...exams[idx],
    name: examName || exams[idx].name,
    date: examDate,
    daysPerWeek: Number(daysPerWeekSelect && daysPerWeekSelect.value) || 5,
    topics: topics.slice(),
    schedule: schedule.map(d => ({
      date: dateKey(d.date),
      tasks: d.tasks
    }))
  };
  saveExams();
}

document.addEventListener('change', (e) => {
  if (!e.target.classList.contains('task-check')) return;
  const dayIndex = Number(e.target.dataset.day);
  const taskIndex = Number(e.target.dataset.task);
  if (!schedule[dayIndex] || !schedule[dayIndex].tasks[taskIndex]) return;
  schedule[dayIndex].tasks[taskIndex].done = e.target.checked;
  renderToday();
  renderSchedule();
  persistCurrentExam();
});

function saveCurrentExam() {
  examName = examNameInput ? examNameInput.value.trim() : '';
  examDate = examDateInput ? examDateInput.value : '';
  if (!examDate) {
    alert('Set the exam date first');
    return;
  }

  generateSchedule();

  const data = {
    id: currentExamId || uid(),
    name: examName || 'Untitled exam',
    date: examDate,
    daysPerWeek: Number(daysPerWeekSelect && daysPerWeekSelect.value) || 5,
    topics: topics.slice(),
    schedule: schedule.map(d => ({
      date: dateKey(d.date),
      tasks: d.tasks
    }))
  };

  const idx = exams.findIndex(e => e.id === data.id);
  if (idx >= 0) exams[idx] = data;
  else exams.push(data);

  currentExamId = data.id;
  examName = data.name;
  saveExams();
  renderExamsList();
  renderFocusExamSelect();
  renderSchedule();
  renderToday();
  
}

function loadExam(id) {
  const ex = exams.find(e => e.id === id);
  if (!ex) return;

  currentExamId = ex.id;
  examName = ex.name || '';
  examDate = ex.date || '';
  topics = Array.isArray(ex.topics) ? ex.topics.slice() : [];
  schedule = Array.isArray(ex.schedule)
    ? ex.schedule.map(d => ({
        date: new Date(d.date + 'T00:00:00'),
        tasks: d.tasks || []
      }))
    : [];

  if (examNameInput) examNameInput.value = examName;
  if (examDateInput) examDateInput.value = examDate;
  if (daysPerWeekSelect && ex.daysPerWeek) {
    daysPerWeekSelect.value = String(ex.daysPerWeek);
  }

  saveExams();
  renderTopics();
  renderSchedule();
  renderToday();
  renderExamsList();
  renderFocusExamSelect();
}

function deleteExam(id) {
  exams = exams.filter(e => e.id !== id);
  if (currentExamId === id) {
    currentExamId = null;
    examName = '';
    examDate = '';
    topics = [];
    schedule = [];
    if (examNameInput) examNameInput.value = '';
    if (examDateInput) examDateInput.value = '';
    renderTopics();
    renderSchedule();
    renderToday();
  }
  saveExams();
  renderExamsList();
  renderFocusExamSelect();
}

function renderExamsList() {
  if (!examsListEl) return;
  if (exams.length === 0) {
    examsListEl.innerHTML = '<p>No exams saved yet.</p>';
    return;
  }
  examsListEl.innerHTML = exams.map(ex => `
    <div class="exam-row ${ex.id === currentExamId ? 'active-exam' : ''}">
      <div>
        <strong>${ex.name}</strong>
        <div class="exam-meta">${ex.date}</div>
      </div>
      <div class="exam-actions">
        <button type="button" data-open="${ex.id}">Open</button>
        <button type="button" data-del="${ex.id}">Delete</button>
      </div>
    </div>
  `).join('');
}

if (examsListEl) {
  examsListEl.addEventListener('click', (e) => {
    const openId = e.target.getAttribute('data-open');
    const delId = e.target.getAttribute('data-del');
    if (openId) loadExam(openId);
    if (delId && confirm('Delete this exam?')) deleteExam(delId);
  });
}

function renderFocusExamSelect() {
  if (!focusExamSelect) return;
  if (exams.length === 0) {
    focusExamSelect.innerHTML = '<option value="">No exams yet</option>';
    return;
  }
  focusExamSelect.innerHTML = exams.map(ex =>
    `<option value="${ex.id}" ${ex.id === currentExamId ? 'selected' : ''}>${ex.name}</option>`
  ).join('');
}

if (generatebtn) generatebtn.addEventListener('click', saveCurrentExam);

if (resetbtn) {
  resetbtn.addEventListener('click', () => {
    currentExamId = null;
    examName = '';
    examDate = '';
    topics = [];
    schedule = [];
    if (examNameInput) examNameInput.value = '';
    if (examDateInput) examDateInput.value = '';
    renderTopics();
    renderSchedule();
    renderToday();
    localStorage.removeItem('currentExamId');
    renderExamsList();
  });
}

// focus
const durationbtns = document.querySelectorAll('.duration-options button');
const startbtn = document.getElementById('start-study-btn');
const lockedoverlay = document.getElementById('locked-overlay');
const timer = document.getElementById('timer');
const stopbtn = document.getElementById('stop-btn');
const lockExamName = document.getElementById('lock-examName');
const challengeModal = document.getElementById('challenge');
const challengQuestion = document.getElementById('cha-ques');
const challengInput = document.getElementById('cha-input');
const challengerror = document.getElementById('cha-err');
const challengSubmit = document.getElementById('cha-submit');
const challengCancel = document.getElementById('cha-cancel');
const musica = document.getElementById('musica');
const yesMusic = document.getElementById('yes-music');
const noMusic = document.getElementById('no-music');
const musicLinkr = document.getElementById('music-linkr');
const musicLinkInput = document.getElementById('music-link-input');
const changeMusic = document.getElementById('change-music');
const starti = document.getElementById('starti');

let selectedDuration = 30 * 60;
let elapsed = 0;
let countdownRemaining = 0;
let timerInterval = null;
let lastTick = 0;
let challenge = { a: 0, b: 0, answer: 0 };
let waitingForStart = false;
let changingMusic = false;
let activeSessionExamName = '';
let activeSessionExamId = null;

durationbtns.forEach(btn => {
  btn.addEventListener('click', () => {
    durationbtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedDuration = Number(btn.dataset.mins) * 60;
  });
});

function updateTimerDisplay() {
  if (!timer) return;
  const value = selectedDuration > 0 ? countdownRemaining : elapsed;
  timer.textContent = formatTime(value);
}

function preventUnload(e) {
  e.preventDefault();
  e.returnValue = '';
}

function prepareLockScreen() {
  displayRandomQuote();
  elapsed = 0;
  countdownRemaining = selectedDuration;
  updateTimerDisplay();
  if (lockExamName) {
    lockExamName.textContent = activeSessionExamName
      ? `Exam: ${activeSessionExamName}`
      : 'Focus mode';
  }
  if (lockedoverlay) lockedoverlay.classList.remove('hidden');
  if (starti) starti.classList.remove('hidden');
  waitingForStart = true;
}

function reallyStartTimer() {
  waitingForStart = false;
  if (starti) starti.classList.add('hidden');
  try {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (e) {}
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch (e) {}
  window.addEventListener('beforeunload', preventUnload);
  beginTicking();
}

function pickFocusExam() {
  if (!focusExamSelect || !focusExamSelect.value) {
    alert('Save an exam first, then choose it in “what are you studying for?”');
    return false;
  }
  const ex = exams.find(e => e.id === focusExamSelect.value);
  if (!ex) {
    alert('Exam not found. Save an exam first.');
    return false;
  }
  activeSessionExamId = ex.id;
  activeSessionExamName = ex.name;
  loadExam(ex.id);
  return true;
}

if (startbtn) {
  startbtn.addEventListener('click', () => {
    if (!pickFocusExam()) return;
    if (musica) {
      changingMusic = false;
      if (musicLinkr) musicLinkr.classList.add('hidden');
      if (changeMusic) {
        if (localStorage.getItem('music_link')) changeMusic.classList.remove('hidden');
        else changeMusic.classList.add('hidden');
      }
      musica.classList.remove('hidden');
    } else {
      prepareLockScreen();
      reallyStartTimer();
    }
  });
}

if (yesMusic) {
  yesMusic.addEventListener('click', () => {
    const saved = localStorage.getItem('music_link');
    if (saved && !changingMusic) {
      window.open(saved, '_blank', 'noopener');
      if (musica) musica.classList.add('hidden');
      prepareLockScreen();
    } else if (musicLinkr && musicLinkr.classList.contains('hidden')) {
      musicLinkr.classList.remove('hidden');
      if (musicLinkInput) musicLinkInput.focus();
    } else {
      const link = musicLinkInput ? musicLinkInput.value.trim() : '';
      if (!link) return;
      localStorage.setItem('music_link', link);
      changingMusic = false;
      window.open(link, '_blank', 'noopener');
      if (musica) musica.classList.add('hidden');
      prepareLockScreen();
    }
  });
}

if (changeMusic) {
  changeMusic.addEventListener('click', () => {
    changingMusic = true;
    changeMusic.classList.add('hidden');
    if (musicLinkr) musicLinkr.classList.remove('hidden');
    if (musicLinkInput) {
      musicLinkInput.value = localStorage.getItem('music_link') || '';
      musicLinkInput.focus();
      musicLinkInput.select();
    }
  });
}

if (noMusic) {
  noMusic.addEventListener('click', () => {
    if (musica) musica.classList.add('hidden');
    prepareLockScreen();
    reallyStartTimer();
  });
}

if (starti) {
  starti.addEventListener('click', reallyStartTimer);
}

function tick() {
  const delta = Math.floor((Date.now() - lastTick) / 1000);
  if (delta < 1) return;
  lastTick += delta * 1000;
  elapsed += delta;
  if (selectedDuration > 0) {
    countdownRemaining -= delta;
    if (countdownRemaining <= 0) {
      countdownRemaining = 0;
      updateTimerDisplay();
      finishLock(true);
      return;
    }
  }
  updateTimerDisplay();
}

function beginTicking() {
  clearInterval(timerInterval);
  lastTick = Date.now();
  timerInterval = setInterval(tick, 500);
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
  } catch (e) {}
}

function notifyDone() {
  playBeep();
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Study Lock', { body: 'Time is up, great work!' });
    }
  } catch (e) {}
}

function finishLock(natural) {
  clearInterval(timerInterval);
  window.removeEventListener('beforeunload', preventUnload);
  try {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  } catch (e) {}
  if (lockedoverlay) lockedoverlay.classList.add('hidden');
  if (challengeModal) challengeModal.classList.add('hidden');
  if (natural) notifyDone();
  if (elapsed >= 60) saveSession(elapsed);
  const mins = Math.max(1, Math.round(elapsed / 60));
  alert(natural
    ? `Congratulations! You completed ${mins} minutes of focused study.`
    : `You stopped the session after ${mins} minutes.`);
}

if (stopbtn) {
  stopbtn.addEventListener('click', () => {
    if (waitingForStart) {
      waitingForStart = false;
      if (starti) starti.classList.add('hidden');
      if (lockedoverlay) lockedoverlay.classList.add('hidden');
      return;
    }
    clearInterval(timerInterval);
    challenge.a = Math.floor(Math.random() * 50) + 10;
    challenge.b = Math.floor(Math.random() * 50) + 10;
    challenge.answer = challenge.a + challenge.b;
    if (challengQuestion) challengQuestion.textContent = `${challenge.a} + ${challenge.b} = ?`;
    if (challengInput) challengInput.value = '';
    if (challengerror) challengerror.textContent = '';
    if (challengeModal) challengeModal.classList.remove('hidden');
  });
}

function submitChallenge() {
  const val = Number(challengInput ? challengInput.value : NaN);
  if (val === challenge.answer) {
    if (challengeModal) challengeModal.classList.add('hidden');
    finishLock(false);
  } else {
    if (challengerror) challengerror.textContent = 'Incorrect answer. Please try again.';
    challenge.a = Math.floor(Math.random() * 50) + 10;
    challenge.b = Math.floor(Math.random() * 50) + 10;
    challenge.answer = challenge.a + challenge.b;
    if (challengQuestion) challengQuestion.textContent = `${challenge.a} + ${challenge.b} = ?`;
    if (challengInput) challengInput.value = '';
  }
}

if (challengCancel) {
  challengCancel.addEventListener('click', () => {
    if (challengeModal) challengeModal.classList.add('hidden');
    beginTicking();
  });
}
if (challengSubmit) challengSubmit.addEventListener('click', submitChallenge);
if (challengInput) {
  challengInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitChallenge();
    }
  });
}

// history / streak / goal 
let studyHistory = JSON.parse(localStorage.getItem('studyHistory') || '[]');

function saveSession(sec) {
  studyHistory.push({
    date: new Date().toISOString(),
    duration: sec,
    examId: activeSessionExamId,
    examName: activeSessionExamName || examName || 'Focus session'
  });
  localStorage.setItem('studyHistory', JSON.stringify(studyHistory));
  updateStreakDisplay();
  renderHistory();
}

function renderHistory() {
  if (historyListEl) {
    if (studyHistory.length === 0) {
      historyListEl.innerHTML = '<p>No sessions yet.</p>';
    } else {
      historyListEl.innerHTML = studyHistory.slice().reverse().map(h => {
        const mins = Math.max(1, Math.round((h.duration || 0) / 60));
        return `<div class="history-item">
          <div>
            <strong>${h.examName || 'Session'}</strong>
            <div class="exam-meta">${formatDateTime(h.date)}</div>
          </div>
          <div class="history-dur">${mins} min</div>
        </div>`;
      }).join('');
    }
  }

  if (historyTotalsEl) {
    const totals = {};
    studyHistory.forEach(h => {
      const key = h.examName || 'Other';
      totals[key] = (totals[key] || 0) + (h.duration || 0);
    });
    const keys = Object.keys(totals);
    historyTotalsEl.innerHTML = keys.length === 0
      ? '<p>No time tracked yet.</p>'
      : keys.map(name => {
          const mins = Math.round(totals[name] / 60);
          return `<div class="history-item">
            <strong>${name}</strong>
            <span class="history-dur">${mins} min</span>
          </div>`;
        }).join('');
  }
}

function streakcount() {
  if (studyHistory.length === 0) return 0;
  const daySet = {};
  studyHistory.forEach(h => { daySet[dateKey(h.date)] = true; });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const hasToday = daySet[dateKey(today)];
  const hasYesterday = daySet[dateKey(yesterday)];
  if (!hasToday && !hasYesterday) return 0;
  let cursor = hasToday ? new Date(today) : new Date(yesterday);
  let count = 0;
  while (daySet[dateKey(cursor)]) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

const msgs = [
  { days: 30, msg: '30 days!!! DAMNNNN you are unstoppable!' },
  { days: 14, msg: 'Two weeks in a row! Keep it up!' },
  { days: 7, msg: 'A full week .You don’t play.' },
  { days: 3, msg: 'Nice start, keep going!' }
];

function streakMessage(n) {
  if (n === 0) return 'Study at least 1 minute to start your streak';
  const reached = msgs.find(m => n >= m.days);
  if (reached) return reached.msg;
  return `${3 - n} more day${3 - n === 1 ? '' : 's'} to your first badge`;
}

function updateStreakDisplay() {
  const streakCount1 = document.getElementById('streak-count');
  const streakLabel1 = document.getElementById('streak');
  const streakMsg = document.getElementById('streak-msg');
  const j = streakcount();
  if (streakCount1) streakCount1.textContent = j;
  if (streakLabel1) streakLabel1.textContent = j === 1 ? '' : 's';
  if (streakMsg) streakMsg.textContent = streakMessage(j);
  updateGoalDisplay();
}

const quotes = [
  'Study while others are sleeping. Work while others are loafing. Prepare while others are playing.',
  'You don’t have to be perfect, just consistent.',
  'You don’t have to be great to start, but you have to start to be great.',
  'Success is the sum of small efforts, repeated day in and day out.',
  'Don’t watch the clock; do what it does. Keep going.',
  'One more session — that’s all you need to do right now.',
  'The hardest part is starting.',
  'Your exam is closer than you think. Don’t feel guilty later.'
];
const quoteElement = document.getElementById('quote');
function displayRandomQuote() {
  if (!quoteElement) return;
  quoteElement.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

const goalInput = document.getElementById('goal-input');
const goalText = document.getElementById('goal-text');
const goalFill = document.getElementById('goal-fill');
let dailyGoal = Number(localStorage.getItem('dailyGoal') || '120');
if (goalInput) goalInput.value = dailyGoal;

function todayMinutes() {
  const key = dateKey(new Date());
  let sec = 0;
  studyHistory.forEach(h => {
    if (dateKey(h.date) === key) sec += h.duration || 0;
  });
  return Math.floor(sec / 60);
}

function updateGoalDisplay() {
  const done = todayMinutes();
  const pct = Math.min(100, Math.round((done / dailyGoal) * 100));
  if (goalText) goalText.textContent = `${done}/${dailyGoal} min`;
  if (goalFill) goalFill.style.width = pct + '%';
}

if (goalInput) {
  goalInput.addEventListener('change', () => {
    const val = Number(goalInput.value);
    if (!val || val < 10) {
      goalInput.value = dailyGoal;
      return;
    }
    dailyGoal = val;
    localStorage.setItem('dailyGoal', dailyGoal);
    updateGoalDisplay();
  });
}

// init
if (currentExamId) loadExam(currentExamId);
else {
  renderExamsList();
  renderFocusExamSelect();
  renderSchedule();
  renderToday();
}
renderHistory();
updateStreakDisplay();