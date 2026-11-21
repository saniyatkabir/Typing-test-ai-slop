(() => {
  'use strict';

  const WORD_BANK = [
    'the','of','and','to','in','a','is','that','for','it','as','was','with','be','by','on','not','he',
    'this','are','or','his','from','at','which','but','have','an','had','they','you','were','their',
    'one','all','we','can','her','has','there','been','if','more','when','will','would','who','so',
    'no','out','up','into','over','think','also','back','after','use','two','how','our','work','first',
    'well','way','even','new','want','because','any','these','give','day','most','us','life','world',
    'hand','part','child','eye','woman','place','week','case','point','company','number','group',
    'problem','fact','system','program','question','government','night','area','money','story',
    'issue','side','kind','head','house','service','friend','father','power','hour','game','line',
    'end','member','law','car','city','community','name','president','team','minute','idea','body',
    'information','back','parent','face','others','level','office','door','health','person','art',
    'war','history','party','result','change','morning','reason','research','girl','guy','moment',
    'air','teacher','force','education','foot','boy','age','policy','process','music','market',
    'sense','nation','plan','college','interest','death','experience','effect','value','space',
    'letter','table','south','staff','order','environment','court','role','model','writer',
    'consider','appear','buy','wait','serve','die','send','build','stay','fall','cut','reach',
    'kill','remain','suggest','raise','pass','sell','require','report','decide','pull','speak',
    'read','allow','add','spend','grow','open','walk','win','offer','remember','love','consider',
    'appear','wonder','watch','learn','begin','seem','help','talk','turn','start','show','hear',
    'play','run','move','like','live','believe','bring','happen','write','provide','sit','stand',
    'lose','pay','meet','include','continue','set','follow','stop','create','speak','allow','study',
    'quick','brown','fox','jumps','lazy','dog','light','bright','dark','simple','quiet','strong',
    'gentle','steady','calm','clear','sharp','smooth','bold','fresh','warm','cold','soft','clean',
    'ocean','mountain','forest','river','desert','island','valley','garden','bridge','harbor',
    'window','mirror','pencil','coffee','journey','silence','wonder','pattern','shadow','signal',
    'engine','castle','ribbon','planet','copper','marble','velvet','canvas','ladder','compass'
  ];

  const PARAGRAPHS = [
    'By the time the rain stopped, the street had gone quiet. Water ran along the edge of the pavement, carrying leaves and small scraps of paper toward the drain. A shopkeeper pulled a chair outside, wiped the seat with a cloth, and sat down to watch the clouds. Across the road, someone opened a window. The afternoon was cooler now, and the smell of wet earth drifted in. People stepped out slowly, taking the longer route around puddles, and the street began to sound like itself again.',
    'The old library opened at nine, but the reading room stayed empty for another hour. Sunlight reached the first row of tables, leaving the rest of the room in shade. A librarian pushed a cart past the shelves and stopped to straighten a stack of books. Near the window, a student unfolded a map and traced the coastline with a finger. The margins were crowded with notes, some written in pencil and others in blue ink. She found the town she was looking for, copied its name into her notebook, and turned to the next page.',
    'Two friends boarded the ferry just before it left the pier. They stood near the railing and watched the city fall behind them. One pointed to a small boat crossing the river, while the other tried to take a photograph without getting the railing in the frame. When the wind picked up, they moved inside and shared a cup of tea. They had planned the trip weeks earlier, but neither had decided what to do after landing. At the next stop, they followed the crowd ashore and chose the first street that looked interesting.',
    'On Saturday morning, the market filled before the sun cleared the rooftops. Vendors arranged oranges in neat rows and weighed handfuls of rice on metal scales. A customer asked whether the bread was still warm. The baker cut a small piece, wrapped it in paper, and handed it across the counter. The customer tasted it, smiled, and bought a whole loaf. At the far end of the market, a bicycle bell rang twice. People stepped aside, then returned to their conversations as the rider disappeared into the next lane.'
  ];
  const MODE_LABELS = { words: 'Words', paragraphs: 'Paragraphs', custom: 'Custom Text' };
  const STORAGE_KEY = 'typetest-practice-v1';
  const GOAL = { wpm: 30, accuracy: 95 };
  const SAMPLE_SECONDS = 5;
  const BATCH_SIZE = 60;
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter() : null;
  const byId = (id) => document.getElementById(id);
  const input = byId('typingInput');
  const viewport = byId('wordsViewport');
  const track = byId('wordsTrack');
  const caret = byId('caret');
  const customDialog = byId('customDialog');
  const historyDialog = byId('historyDialog');
  const resultsDialog = byId('resultsDialog');
  const modeButtons = document.querySelectorAll('[data-mode]');
  const timeButtons = document.querySelectorAll('[data-time]');
  const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

  let mode = 'words';
  let duration = 30;
  let customText = '';
  let previousParagraph = -1;
  let run;

  function loadHistory() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return {
        recent: Array.isArray(data?.recent) ? data.recent : [],
        best: data?.best && typeof data.best === 'object' ? data.best : {}
      };
    } catch {
      return { recent: [], best: {} };
    }
  }

  let history = loadHistory();

  function characters(text) {
    return segmenter ? Array.from(segmenter.segment(text), ({ segment }) => segment) : Array.from(text);
  }

  function normalizeText(text) {
    return text.normalize('NFC').trim().replace(/\s+/gu, ' ');
  }

  function randomWords() {
    return Array.from({ length: BATCH_SIZE }, () => WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }

  function nextParagraph() {
    const offset = 1 + Math.floor(Math.random() * (PARAGRAPHS.length - 1));
    previousParagraph = (previousParagraph + offset) % PARAGRAPHS.length;
    return PARAGRAPHS[previousParagraph];
  }

  function letter(text) {
    const span = document.createElement('span');
    span.className = 'letter';
    span.textContent = text;
    return span;
  }

  function appendWords(words) {
    const fragment = document.createDocumentFragment();
    for (const text of words) {
      if (run.words.length > 0) fragment.append(' ');
      const letters = characters(text);
      const spans = letters.map(letter);
      const element = document.createElement('span');
      element.className = 'word';
      element.append(...spans);
      fragment.append(element);
      run.words.push({ text, letters, spans, element });
    }
    track.append(fragment);
  }

  function positionCaret() {
    const word = run.words[run.index];
    if (!word) return;
    const children = word.element.children;
    const next = children[run.typed.length];
    const anchor = next || children[children.length - 1];
    const rect = anchor.getBoundingClientRect();
    const frame = viewport.getBoundingClientRect();
    const top = rect.top - frame.top + viewport.scrollTop;
    const lineHeight = parseFloat(getComputedStyle(viewport).lineHeight);
    viewport.scrollTop = Math.max(0, top - (lineHeight - rect.height) / 2);
    const rtl = getComputedStyle(anchor).direction === 'rtl';
    const edge = Boolean(next) !== rtl ? rect.left : rect.right;
    caret.style.left = `${Math.max(0, edge - frame.left)}px`;
    caret.style.top = `${top}px`;
    caret.style.height = `${rect.height}px`;
  }

  function updateSettings() {
    for (const button of modeButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
    for (const button of timeButtons) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.time) === duration));
    }
    byId('editCustomBtn').hidden = mode !== 'custom';
    byId('typingHint').textContent = mode === 'words'
      ? 'Select the typing area and start typing to begin.'
      : 'Start typing to begin. The test ends when you finish the passage or time runs out.';
  }

  function resetTest(focus = false) {
    clearInterval(run?.timer);
    run = {
      words: [], index: 0, typed: [], committedCorrect: 0, committedErrors: 0,
      correctAttempts: 0, typos: 0, skipped: 0, completed: 0,
      startedAt: null, finished: false, resultsPending: false,
      timer: null, samples: [], sampleCorrect: 0
    };
    track.replaceChildren();
    input.value = '';
    input.readOnly = false;
    viewport.scrollTop = 0;

    const words = mode === 'words' ? randomWords()
      : (mode === 'paragraphs' ? nextParagraph() : customText).split(' ');
    appendWords(words);
    track.firstElementChild.classList.add('is-current');
    byId('typingPrompt').textContent = words.join(' ');
    updateSettings();
    updateStats(0);
    positionCaret();
    if (focus) input.focus();
  }

  function currentCorrect() {
    const word = run.words[run.index];
    return run.typed.reduce((count, char, index) => count + Number(char === word.letters[index]), 0);
  }

  function correctCharacters() {
    return run.committedCorrect + currentCorrect();
  }

  function accuracy() {
    const attempts = run.correctAttempts + run.typos + run.skipped;
    return attempts ? Math.round(100 * run.correctAttempts / attempts) : 100;
  }

  function wpm(elapsed) {
    return Math.round(correctCharacters() * 12 / Math.max(elapsed, 1));
  }

  function elapsedSeconds() {
    return run.startedAt === null ? 0 : (performance.now() - run.startedAt) / 1000;
  }

  function updateStats(elapsed) {
    byId('statTime').textContent = `${Math.max(0, Math.ceil(duration - elapsed))}s`;
    byId('statWpm').textContent = wpm(elapsed);
    byId('statAccuracy').textContent = `${accuracy()}%`;
    byId('progressFill').style.width = `${Math.min(100, elapsed / duration * 100)}%`;
  }

  function recordPace(elapsed) {
    const intervals = Math.floor(elapsed / SAMPLE_SECONDS);
    // A suspended browser can miss checkpoints. Only score intervals with an observed boundary.
    if (intervals > run.samples.length + 1) {
      run.paceUnavailable = true;
    }
    if (!run.paceUnavailable && intervals > run.samples.length) {
      const correct = correctCharacters();
      run.samples.push(Math.max(0, correct - run.sampleCorrect));
      run.sampleCorrect = correct;
    }
  }

  function tick() {
    const elapsed = Math.min(duration, elapsedSeconds());
    recordPace(elapsed);
    if (elapsed >= duration) {
      finishTest(duration);
      return;
    }
    updateStats(elapsed);
  }

  function startTest() {
    run.startedAt = performance.now();
    run.timer = setInterval(tick, 200);
  }

  function drawActiveWord() {
    const { letters, spans, element } = run.words[run.index];
    while (element.children.length > spans.length) element.lastElementChild.remove();
    spans.forEach((span, index) => {
      span.classList.toggle('is-correct', run.typed[index] === letters[index]);
      span.classList.toggle('is-incorrect', index < run.typed.length && run.typed[index] !== letters[index]);
    });
    for (const char of run.typed.slice(letters.length)) {
      const span = letter(char);
      span.classList.add('is-extra');
      element.append(span);
    }
  }

  function submitWord() {
    const word = run.words[run.index];
    const correct = currentCorrect();
    const skipped = Math.max(0, word.letters.length - run.typed.length);
    const complete = correct === word.letters.length && run.typed.length === word.letters.length;

    run.committedCorrect += correct;
    run.committedErrors += run.typed.length - correct + skipped;
    run.skipped += skipped;
    run.completed += Number(complete);
    word.spans.slice(run.typed.length).forEach((span) => span.classList.add('is-skipped'));
    word.element.classList.remove('is-current');
    run.typed = [];

    const lastWord = run.index === run.words.length - 1;
    if (lastWord && mode !== 'words') {
      finishTest(Math.min(duration, elapsedSeconds()));
      return;
    }

    // Count the separator as correct only when it follows the full expected word.
    if (complete) {
      run.committedCorrect += 1;
      run.correctAttempts += 1;
    }
    if (lastWord) {
      const words = randomWords();
      appendWords(words);
      byId('typingPrompt').textContent = words.join(' ');
    }
    run.index += 1;
    run.words[run.index].element.classList.add('is-current');
  }

  function processInput() {
    if (run.finished) return;
    const incoming = characters(input.value.normalize('NFC'));
    if (run.startedAt !== null && elapsedSeconds() >= duration) {
      input.value = run.typed.join('');
      tick();
      return;
    }

    // The native textarea supports physical keyboards, mobile keyboards, and IME.
    // It holds the current word so native backspace and undo can edit that word.
    let prefix = 0;
    while (prefix < run.typed.length && run.typed[prefix] === incoming[prefix]) prefix += 1;
    run.typed.length = prefix;

    for (const char of incoming.slice(prefix)) {
      if (/^\s+$/u.test(char)) {
        if (run.typed.length > 0) {
          drawActiveWord();
          submitWord();
        }
      } else {
        if (run.startedAt === null) startTest();
        const word = run.words[run.index];
        if (run.typed.length >= word.letters.length + 32) break;
        if (char === word.letters[run.typed.length]) run.correctAttempts += 1;
        else run.typos += 1;
        run.typed.push(char);
      }
      if (run.finished) break;
    }

    if (!run.finished) {
      const word = run.words[run.index];
      drawActiveWord();
      if (mode !== 'words' && run.index === run.words.length - 1 && run.typed.join('') === word.text) {
        submitWord();
      } else {
        positionCaret();
        updateStats(elapsedSeconds());
      }
    }

    const current = run.typed.join('');
    if (input.value !== current) input.value = current;
  }

  function consistency() {
    if (run.samples.length < 2 || run.paceUnavailable) return '—';
    const mean = run.samples.reduce((total, value) => total + value, 0) / run.samples.length;
    if (mean === 0) return '—';
    const variance = run.samples.reduce((total, value) => total + (value - mean) ** 2, 0) / run.samples.length;
    return `${Math.max(0, Math.round(100 * (1 - Math.sqrt(variance) / mean)))}%`;
  }

  function recordResult(result) {
    // Merge with newer sessions from other tabs before saving.
    try {
      if (localStorage.getItem(STORAGE_KEY)) history = loadHistory();
    } catch {
      // Keep this session's results available even when storage is blocked.
    }
    const key = `${mode}-${duration}`;
    const best = history.best[key];
    const personalBest = !best || result.wpm > best.wpm ||
      (result.wpm === best.wpm && result.accuracy > best.accuracy);
    if (personalBest) history.best[key] = result;
    const otherGroups = history.recent.filter((entry) => entry.mode !== mode || entry.duration !== duration);
    const group = history.recent.filter((entry) => entry.mode === mode && entry.duration === duration);
    history.recent = [result, ...group.slice(0, 9), ...otherGroups];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // The in-memory history still works until the page closes.
    }
    return personalBest;
  }

  function showPendingResults() {
    if (run.resultsPending && !customDialog.open && !historyDialog.open) {
      run.resultsPending = false;
      resultsDialog.showModal();
    }
  }

  function finishTest(elapsed) {
    clearInterval(run.timer);
    recordPace(elapsed);
    run.finished = true;
    input.readOnly = true;
    updateStats(elapsed);

    const result = { mode, duration, wpm: wpm(elapsed), accuracy: accuracy(), date: Date.now() };
    const personalBest = recordResult(result);
    const activeCorrect = currentCorrect();
    const lastWord = run.words[run.index];
    const activeComplete = run.typed.join('') === lastWord.text;
    byId('resultsContext').textContent = `${MODE_LABELS[mode]} · ${duration}s${personalBest ? ' · Personal best' : ''}`;
    byId('resultWpm').textContent = result.wpm;
    byId('resultAccuracy').textContent = `${result.accuracy}%`;
    byId('resultConsistency').textContent = consistency();
    byId('resultCorrect').textContent = run.committedCorrect + activeCorrect;
    byId('resultTypos').textContent = run.typos;
    byId('resultErrors').textContent = run.committedErrors + run.typed.length - activeCorrect;
    byId('resultWords').textContent = run.completed + Number(activeComplete);
    const speedGap = Math.max(0, GOAL.wpm - result.wpm);
    const accuracyGap = Math.max(0, GOAL.accuracy - result.accuracy);
    const remaining = [
      speedGap ? `${speedGap} more WPM` : '',
      accuracyGap ? `${accuracyGap} more accuracy ${accuracyGap === 1 ? 'point' : 'points'}` : ''
    ].filter(Boolean).join(' and ');
    const goal = `${GOAL.wpm} WPM at ${GOAL.accuracy}% accuracy`;
    byId('goalStatus').textContent = remaining ? `Goal · ${goal}. You need ${remaining}.` : `Goal reached · ${goal}.`;
    run.resultsPending = true;
    showPendingResults();
  }

  function showHistory() {
    const recent = history.recent.filter((entry) => entry.mode === mode && entry.duration === duration);
    const best = history.best[`${mode}-${duration}`];
    byId('historyContext').textContent = `${MODE_LABELS[mode]} · ${duration}s · This device`;
    byId('historyBest').textContent = best ? `Personal best · ${best.wpm} WPM at ${best.accuracy}% accuracy` : '';
    byId('historyEmpty').hidden = recent.length > 0;
    byId('historyTable').hidden = recent.length === 0;
    const rows = recent.map((entry) => {
      const row = document.createElement('tr');
      for (const value of [dateFormat.format(entry.date), entry.wpm, `${entry.accuracy}%`]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    });
    byId('historyRows').replaceChildren(...rows);
    historyDialog.showModal();
  }

  function editCustomText() {
    byId('customText').value = customText;
    byId('customError').hidden = true;
    customDialog.showModal();
  }

  for (const button of timeButtons) {
    button.addEventListener('click', () => {
      const nextDuration = Number(button.dataset.time);
      if (duration === nextDuration) return;
      duration = nextDuration;
      resetTest();
    });
  }

  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      const nextMode = button.dataset.mode;
      if (nextMode === 'custom' && !customText) {
        editCustomText();
      } else if (mode !== nextMode) {
        mode = nextMode;
        resetTest();
      }
    });
  }

  input.addEventListener('input', (event) => {
    if (!event.isComposing) processInput();
  });
  input.addEventListener('compositionend', processInput);
  input.addEventListener('paste', (event) => event.preventDefault());
  input.addEventListener('drop', (event) => event.preventDefault());
  input.addEventListener('beforeinput', (event) => {
    if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') event.preventDefault();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.isComposing || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    resetTest(true);
  });

  byId('restartBtn').addEventListener('click', () => resetTest(true));
  byId('tryAgainBtn').addEventListener('click', () => {
    resultsDialog.close();
    resetTest(true);
  });
  byId('closeResultsBtn').addEventListener('click', () => resultsDialog.close());
  byId('historyBtn').addEventListener('click', showHistory);
  byId('closeHistoryBtn').addEventListener('click', () => historyDialog.close());
  byId('editCustomBtn').addEventListener('click', editCustomText);
  byId('cancelCustomBtn').addEventListener('click', () => customDialog.close());
  resultsDialog.addEventListener('close', () => {
    if (run.finished) byId('restartBtn').focus();
  });
  historyDialog.addEventListener('close', showPendingResults);
  customDialog.addEventListener('close', showPendingResults);
  byId('customForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = normalizeText(byId('customText').value);
    if (!value) {
      byId('customError').hidden = false;
      byId('customText').focus();
      return;
    }
    customText = value;
    mode = 'custom';
    customDialog.close();
    resetTest(true);
  });

  window.addEventListener('resize', positionCaret);
  resetTest();
})();
