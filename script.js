// ===== navigation =====
const navBtns = document.querySelectorAll('nav button[data-view]');
const homeView = document.getElementById('home');
const scheduleView = document.getElementById('schedule');
const focusView = document.getElementById('focus');

if (scheduleView) scheduleView.style.display = 'none';
if (focusView) focusView.style.display = 'none';

navBtns.forEach(button => {
  button.addEventListener('click', () => {
    const page = button.getAttribute('data-view');

    if (homeView) homeView.style.display = 'none';
    if (scheduleView) scheduleView.style.display = 'none';
    if (focusView) focusView.style.display = 'none';

    if (page === 'home' && homeView) {
      homeView.style.display = 'block';
    } else if (page === 'schedule' && scheduleView) {
      scheduleView.style.display = 'block';
    } else if (page === 'focus' && focusView) {
      focusView.style.display = 'block';
    }

    navBtns.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
  });
});

// ===== topics =====
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
    if (text === '') return;
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
    if (e.target.classList.contains('remove-topic')) {
      const index = Number(e.target.dataset.index);
      topics.splice(index, 1);
      renderTopics();
    }
  });
}

// ===== schedule =====
const examNameInput = document.getElementById('exam-name');
const examDateInput = document.getElementById('exam-date');
const nextBody = document.getElementById('nextBody');
const countDisplay = document.getElementById('count');
const generatebtn = document.getElementById('generate-btn');
const scheduleList = document.getElementById('schedule-list');
const resetbtn = document.getElementById('reset-btn');

let examName = '';
let examDate = '';
let schedule = [];

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function generateSchedule() {
  if (!examDate) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate + 'T00:00:00');
  const totaldays = Math.max(1, Math.ceil((exam - today) / 86400000));

  const days = [];
  for (let i = 0; i < totaldays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  // keep the last day(s) for review
  const review = totaldays >= 4 ? 2 : (totaldays >= 2 ? 1 : 0);
  const studyDays = days.slice(0, totaldays - review);
  const reviewdays = days.slice(totaldays - review);

  // same shape for every entry: { date, tasks }
  schedule = studyDays.map(d => ({ date: d, tasks: [] }));

  if (topics.length === 0) {
    schedule.forEach((day, i) => {
      day.tasks.push({ label: 'study session ' + (i + 1), done: false });
    });
  } else {
    topics.forEach((topic, i) => {
      const idx = i % schedule.length;
      schedule[idx].tasks.push({ label: topic, done: false });
    });
  }

  reviewdays.forEach((d, i) => {
    const tlast = i === reviewdays.length - 1;
    schedule.push({
      date: d,
      tasks: [{
        label: tlast ? 'it is time to practice a test' : 'review all topics',
        done: false
      }]
    });
  });
}

function taskHtml(task, dayIndex, taskIndex) {
  return `<label class="task">
    <input type="checkbox" class="task-check" data-day="${dayIndex}" data-task="${taskIndex}" ${task.done ? 'checked' : ''}>
    <span class="${task.done ? 'done' : ''}">${task.label}</span>
  </label>`;
}

if (generatebtn) {
  generatebtn.addEventListener('click', () => {
    examName = examNameInput ? examNameInput.value.trim() : '';
    examDate = examDateInput ? examDateInput.value : '';

    if (!examDate) {
      alert('set your exam date first please!');
      return;
    }

    generateSchedule();
    renderSchedule();
    renderToday();
  });
}

if (resetbtn) {
  resetbtn.addEventListener('click', () => {
    examName = '';
    examDate = '';
    topics = [];
    schedule = [];
    if (examNameInput) examNameInput.value = '';
    if (examDateInput) examDateInput.value = '';
    renderTopics();
    renderSchedule();
    renderToday();
  });
}

// ===== focus lock =====
const durationbtns = document.querySelectorAll('.duration-options button');
const startbtn = document.getElementById('start-study-btn');
const lockedoverlay = document.getElementById('locked-overlay');
const timer = document.getElementById('timer');
const stopbtn = document.getElementById('stop-btn');
const lockExamName = document.getElementById('lock-examName');

// challenge section
const challengeModal = document.getElementById('challenge');
const challengQuestion = document.getElementById('cha-ques');
const challengInput = document.getElementById('cha-input');
const challengerror = document.getElementById('cha-err');
const challengSubmit = document.getElementById('cha-submit');
const challengCancel = document.getElementById('cha-cancel');

let selectedDuration = 25 * 60; // default
let elapsed = 0;
let countdownRemaining = 0;
let timerInterval = null;
let lastTick = 0;
let challenge = { a: 0, b: 0, answer: 0 };

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0');
}

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

function startLock() {
  elapsed = 0;
  countdownRemaining = selectedDuration;
  updateTimerDisplay();

  if (lockExamName) {
    lockExamName.textContent = examName ? `Exam: ${examName}` : 'in focus mode';
  }

  if (lockedoverlay) lockedoverlay.classList.remove('hidden');

  try {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (e) {}

  window.addEventListener('beforeunload', preventUnload);
  beginTicking();
}
const musica = document.getElementById('musica');
const yesMusic = document.getElementById('yes-music');
const noMusic = document.getElementById('no-music');
const musicLinkr = document.getElementById('music-linkr');
const musicLinkInput = document.getElementById('music-link-input');
const starti = document.getElementById('starti');

let waitingForStart = false; // true when music is open and we wait for user

function prepareLockScreen() {
  // Show the overlay but DO NOT start the timer yet
  displayRandomQuote();
  elapsed = 0;
  countdownRemaining = selectedDuration;
  updateTimerDisplay();

  if (lockExamName) {
    lockExamName.textContent = examName ? `Exam: ${examName}` : 'Focus mode';
  }

  if (lockedoverlay) lockedoverlay.classList.remove('hidden');

  // Show the Start now button
  if (starti) {
    starti.classList.remove('hidden');
  }

  waitingForStart = true;
}

function reallyStartTimer() {
  waitingForStart = false;

  if (starti) {
    starti.classList.add('hidden');
  }

  // fullscreen
  try {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (e) {}

  window.addEventListener('beforeunload', preventUnload);
  beginTicking();
}


if (startbtn) {
  startbtn.addEventListener('click', () => {
    if (musica) {
      if (musicLinkr) musicLinkr.classList.add('hidden');
      musica.classList.remove('hidden');
    } else {
  
      prepareLockScreen();
      reallyStartTimer();
    }
  });
}

// Yes  open music then wait for user to choose a song and come back tothe page
if (yesMusic) {
  yesMusic.addEventListener('click', () => {
    const saved = localStorage.getItem('music_link');

    if (saved) {
      window.open(saved, '_blank', 'noopener');
      if (musica) musica.classList.add('hidden');
      prepareLockScreen();      
    } 
    else if (musicLinkr && musicLinkr.classList.contains('hidden')) {
      // first time → show the input
      musicLinkr.classList.remove('hidden');
      if (musicLinkInput) musicLinkInput.focus();
    } 
    else {
      // paste a link
      const link = musicLinkInput ? musicLinkInput.value.trim() : '';
      if (link === '') return;

      localStorage.setItem('music_link', link);
      window.open(link, '_blank', 'noopener');
      if (musica) musica.classList.add('hidden');
      prepareLockScreen();        
    }
  });
}

// No music → start immediately
if (noMusic) {
  noMusic.addEventListener('click', () => {
    if (musica) musica.classList.add('hidden');
    prepareLockScreen();
    reallyStartTimer();
  });
}

if (starti) {
  starti.addEventListener('click', () => {
    reallyStartTimer();
  });
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

function finishLock(natural) {
  clearInterval(timerInterval);
  window.removeEventListener('beforeunload', preventUnload);

  try {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  } catch (e) {}

  if (lockedoverlay) lockedoverlay.classList.add('hidden');
  if(challengeModal)challengeModal.classList.add('hidden');
//save session and update streak
if (elapsed >= 60) saveSession(elapsed);
  const mins = Math.max(1, Math.round(elapsed / 60));
  alert(natural
    ? `congratulations! you have completed ${mins} minutes of focused study.`
    : `you have stopped the session after ${mins} minutes.`);
}

//opening the challenge when the user wants to stop
if(stopbtn){
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
    if(challengQuestion)challengQuestion.textContent = `${challenge.a} + ${challenge.b} = ?`;
    if(challengInput)challengInput.value = '';
    if(challengerror)challengerror.textContent = '';
    if(challengeModal)challengeModal.classList.remove('hidden');
  });
}
if(challengCancel){
  challengCancel.addEventListener('click', () => {
    if(challengeModal)challengeModal.classList.add('hidden');
    beginTicking();
  });
}
if(challengSubmit){
  challengSubmit.addEventListener('click', submitChallenge);
}
if(challengInput){
  challengInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      submitChallenge();}
  });}
  function submitChallenge(){
    const val=Number(challengInput?challengInput.value:NaN);
    if(val===challenge.answer){
      if(challengeModal)challengeModal.classList.add('hidden');
    finishLock(false);
    }else{
      if(challengerror)challengerror.textContent='Incorrect answer. Please try again.';
        challenge.a = Math.floor(Math.random() * 50) + 10;
        challenge.b = Math.floor(Math.random() * 50) + 10;
        challenge.answer = challenge.a + challenge.b;
        if (challengQuestion) challengQuestion.textContent = `${challenge.a} + ${challenge.b} = ?`;
        if (challengInput) challengInput.value = '';
    }}
//streak

let studyHistory = JSON.parse(localStorage.getItem('studyHistory') || '[]');

function dateKey(d) {
  const date = new Date(d);
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function streakcount() {
  if (studyHistory.length === 0) return 0;

  const daySet = {};
  studyHistory.forEach(h => {
    daySet[dateKey(h.date)] = true;
  });

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

function saveSession(sec) {
  studyHistory.push({ date: new Date(), duration: sec });
  localStorage.setItem('studyHistory', JSON.stringify(studyHistory));
  updateStreakDisplay();
}

//quotes
const quotes = [
  'study while others are sleeping. work while others are loafing. prepare while others are playing. dream while others are wishing.',
  'you don’t have to be perfect,just consistent',
  'you don’t have to be great to start, but you have to start to be great.',
  'success is the sum of small efforts, repeated day in and day out.',
  'don’t watch the clock; do what it does. keep going.',
  'one more session,that’s all you need to do right now and you will be closer to your goal.',
  'the hardest part is starting. once you get that out of the way, you’ll find the rest of the journey much easier.',
  'your exam is closer than you think. don’t feel guilty later.',
];
const quoteElement = document.getElementById('quote');
function displayRandomQuote() {
  if (!quoteElement) return;
  quoteElement.textContent = quotes[Math.floor(Math.random() * quotes.length)];}

  //streak part 2
  const msgs=[
  {days:30,msg:'30 days!!! DAMN you are unstoppable!'},
  {days:14,msg:'two weeks in a row! keep it up!'},
  {days:7,msg:'a full week,i see it now ,you dont play'},
  {days:3,msg:'nice start keep going!'},
];
function streakMessage(n){
  if(n===0) return 'study at least 1 minute to start your streak';
  const reached =msgs.find(m=>n>=m.days);
  if(reached) return reached.msg;
  return `${3-n} more day${3-n===1?'':'s'} to your first badge`;
};
//daily goal
const goalInput = document.getElementById('goal-input');
const goalText = document.getElementById('goal-text');
const goalFill = document.getElementById('goal-fill');
let dailyGoal = Number(localStorage.getItem('dailyGoal') || '120');
if(goalInput) goalInput.value=dailyGoal;

function todayMinutes() {
  const key = dateKey(new Date());
  let sec = 0;
  studyHistory.forEach(h => {
    if (dateKey(h.date) === key) sec += h.duration;
  });
  return Math.floor(sec / 60);
}
function updateGoalDisplay() {
  const done=todayMinutes();
  const ca=Math.min(100,Math.round((done/dailyGoal)*100));
  if(goalText) goalText.textContent=`${done}/${dailyGoal} min`;
  if(goalFill) goalFill.style.width=ca+'%';
}
if (goalInput){
  goalInput.addEventListener('change', () => {
    const val = Number(goalInput.value);
    if(!val||val<10){
      goalInput.value=dailyGoal;
      return;
    }
    dailyGoal=val;
    localStorage.setItem('dailyGoal', dailyGoal);
    updateStreakDisplay();
});}

updateStreakDisplay();