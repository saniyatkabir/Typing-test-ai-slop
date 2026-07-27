/* ==========================================================================
   Typing Test — Application Logic
   Vanilla JS. No dependencies. Organized into small, reusable functions.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     Word bank — common English words, shuffled and sampled per test.
  --------------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------------
     DOM references
  --------------------------------------------------------------------- */
  const el = {
    timeOptions: document.querySelectorAll('.time-option'),
    statTime: document.getElementById('statTime'),
    statWpm: document.getElementById('statWpm'),
    statAccuracy: document.getElementById('statAccuracy'),
    statMistakes: document.getElementById('statMistakes'),

    typeCard: document.getElementById('typeCard'),
    wordsViewport: document.getElementById('wordsViewport'),
    wordsTrack: document.getElementById('wordsTrack'),
    caret: document.getElementById('caret'),
    focusOverlay: document.getElementById('focusOverlay'),
    progressFill: document.getElementById('progressFill'),

    restartBtn: document.getElementById('restartBtn'),

    gridChars: document.getElementById('gridChars'),
    gridCorrect: document.getElementById('gridCorrect'),
    gridIncorrect: document.getElementById('gridIncorrect'),
    gridWords: document.getElementById('gridWords'),
    gridTime: document.getElementById('gridTime'),

    resultsOverlay: document.getElementById('resultsOverlay'),
    resultsMessage: document.getElementById('resultsMessage'),
    resultWpm: document.getElementById('resultWpm'),
    resultAccuracy: document.getElementById('resultAccuracy'),
    resultConsistency: document.getElementById('resultConsistency'),
    resultCorrectChars: document.getElementById('resultCorrectChars'),
    resultIncorrectChars: document.getElementById('resultIncorrectChars'),
    resultMistakes: document.getElementById('resultMistakes'),
    resultWords: document.getElementById('resultWords'),
    tryAgainBtn: document.getElementById('tryAgainBtn'),
  };

  const WORDS_PER_TEST = 60;

  /* ---------------------------------------------------------------------
     State
  --------------------------------------------------------------------- */
  const state = {
    duration: 30,          // selected test length in seconds
    timeLeft: 30,
    words: [],              // array of word strings
    wordEls: [],             // array of arrays of letter <span> elements per word
    currentWordIndex: 0,
    currentLetterIndex: 0,
    typedWords: [],           // what the user actually typed per word (for extra chars)
    correctChars: 0,
    incorrectChars: 0,
    extraChars: 0,
    mistakes: 0,
    isRunning: false,
    isFinished: false,
    timerId: null,
    startTime: null,
    wpmSamples: [],           // wpm snapshots taken every second, for consistency
  };

  /* ---------------------------------------------------------------------
     Word generation
  --------------------------------------------------------------------- */
  function generateWords(count) {
    const result = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * WORD_BANK.length);
      result.push(WORD_BANK[randomIndex]);
    }
    return result;
  }

  /* ---------------------------------------------------------------------
     Rendering
  --------------------------------------------------------------------- */
  function renderWords() {
    el.wordsTrack.innerHTML = '';
    state.wordEls = [];

    state.words.forEach((word) => {
      const wordEl = document.createElement('span');
      wordEl.className = 'word';

      const letterEls = [];
      for (const char of word) {
        const letterEl = document.createElement('span');
        letterEl.className = 'letter';
        letterEl.textContent = char;
        wordEl.appendChild(letterEl);
        letterEls.push(letterEl);
      }

      state.wordEls.push(letterEls);
      el.wordsTrack.appendChild(wordEl);
    });

    positionCaret();
  }

  // Move the caret to sit right before the current letter (or after the word, if finished it)
  function positionCaret() {
    const currentWordEl = el.wordsTrack.children[state.currentWordIndex];
    if (!currentWordEl) return;

    const letters = state.wordEls[state.currentWordIndex];
    let targetRect;
    const viewportRect = el.wordsViewport.getBoundingClientRect();

    if (state.currentLetterIndex < letters.length) {
      targetRect = letters[state.currentLetterIndex].getBoundingClientRect();
    } else {
      // caret goes right after the last letter of the word
      const lastLetter = letters[letters.length - 1];
      targetRect = lastLetter ? lastLetter.getBoundingClientRect() : currentWordEl.getBoundingClientRect();
      targetRect = { left: targetRect.right, top: targetRect.top, height: targetRect.height };
    }

    const left = targetRect.left - viewportRect.left + el.wordsViewport.scrollLeft;
    const top = targetRect.top - viewportRect.top + el.wordsViewport.scrollTop;

    el.caret.style.left = `${left}px`;
    el.caret.style.top = `${top + 2}px`;
    el.caret.style.height = `${targetRect.height - 6}px`;

    autoScroll();
  }

  // Scroll the words track upward once the caret passes the first line
  function autoScroll() {
    const currentWordEl = el.wordsTrack.children[state.currentWordIndex];
    if (!currentWordEl) return;

    const viewportRect = el.wordsViewport.getBoundingClientRect();
    const wordRect = currentWordEl.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(el.wordsTrack).lineHeight);

    // Keep the active line roughly in the top third of the viewport
    const offset = wordRect.top - viewportRect.top;
    if (offset > lineHeight * 1.4) {
      const shift = Math.floor(offset / lineHeight) * lineHeight;
      el.wordsTrack.style.transform = `translateY(-${
        (parseFloat(el.wordsTrack.dataset.shifted || 0)) + shift
      }px)`;
      el.wordsTrack.dataset.shifted =
        (parseFloat(el.wordsTrack.dataset.shifted || 0)) + shift;
    }
  }

  /* ---------------------------------------------------------------------
     Test lifecycle
  --------------------------------------------------------------------- */
  function initTest() {
    stopTimer();

    state.timeLeft = state.duration;
    state.words = generateWords(WORDS_PER_TEST);
    state.currentWordIndex = 0;
    state.currentLetterIndex = 0;
    state.typedWords = [''];
    state.correctChars = 0;
    state.incorrectChars = 0;
    state.extraChars = 0;
    state.mistakes = 0;
    state.isRunning = false;
    state.isFinished = false;
    state.startTime = null;
    state.wpmSamples = [];

    el.wordsTrack.style.transform = 'translateY(0px)';
    el.wordsTrack.dataset.shifted = 0;
    el.wordsTrack.classList.remove('is-blurred');
    el.wordsViewport.classList.remove('is-active');
    el.focusOverlay.classList.remove('is-visible');
    el.resultsOverlay.classList.remove('is-visible');
    el.progressFill.style.width = '0%';

    renderWords();
    updateLiveStats();
    updateTimeDisplays(state.timeLeft);
  }

  function startTest() {
    if (state.isRunning || state.isFinished) return;
    state.isRunning = true;
    state.startTime = Date.now();

    state.timerId = setInterval(() => {
      state.timeLeft -= 1;
      recordWpmSample();
      updateTimeDisplays(state.timeLeft);
      updateProgress();
      updateLiveStats();

      if (state.timeLeft <= 0) {
        finishTest();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function finishTest() {
    stopTimer();
    state.isRunning = false;
    state.isFinished = true;
    el.wordsViewport.classList.remove('is-active');
    el.wordsTrack.classList.add('is-blurred');
    showResults();
  }

  function restartTest() {
    initTest();
    el.wordsViewport.focus();
  }

  /* ---------------------------------------------------------------------
     Typing input handling
  --------------------------------------------------------------------- */
  function handleKeydown(e) {
    if (state.isFinished) return;

    // Global shortcuts
    if (e.key === 'Tab') {
      e.preventDefault();
      restartTest();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      restartTest();
      return;
    }

    // Ignore modifier combos (copy/paste/select-all etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const key = e.key;

    if (key === 'Backspace') {
      e.preventDefault();
      handleBackspace(e.ctrlKey);
      return;
    }

    if (key === ' ') {
      e.preventDefault();
      handleSpace();
      return;
    }

    // Only accept single printable characters
    if (key.length === 1) {
      e.preventDefault();
      handleCharacter(key);
    }
  }

  function handleCharacter(char) {
    if (!state.isRunning) startTest();

    el.wordsViewport.classList.add('is-active');
    el.focusOverlay.classList.remove('is-visible');

    const wordIndex = state.currentWordIndex;
    const letterIndex = state.currentLetterIndex;
    const letters = state.wordEls[wordIndex];
    const word = state.words[wordIndex];

    state.typedWords[wordIndex] = (state.typedWords[wordIndex] || '') + char;

    if (letterIndex < word.length) {
      const letterEl = letters[letterIndex];
      const isCorrect = char === word[letterIndex];
      letterEl.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
      letterEl.classList.remove('is-current');

      if (isCorrect) {
        state.correctChars += 1;
      } else {
        state.incorrectChars += 1;
        state.mistakes += 1;
        triggerShake();
      }
    } else {
      // Extra character beyond the word's length
      const extraEl = document.createElement('span');
      extraEl.className = 'letter is-extra';
      extraEl.textContent = char;
      el.wordsTrack.children[wordIndex].appendChild(extraEl);
      letters.push(extraEl);
      state.extraChars += 1;
      state.incorrectChars += 1;
      state.mistakes += 1;
      triggerShake();
    }

    state.currentLetterIndex += 1;
    markCurrentLetter();
    positionCaret();
    updateLiveStats();
  }

  function handleBackspace(isCtrl) {
    const wordIndex = state.currentWordIndex;
    const letters = state.wordEls[wordIndex];

    if (state.currentLetterIndex === 0) {
      return; // can't go back into a completed word (Monkeytype-style: locked)
    }

    const deleteCount = isCtrl ? state.currentLetterIndex : 1;

    for (let i = 0; i < deleteCount; i++) {
      if (state.currentLetterIndex === 0) break;
      state.currentLetterIndex -= 1;
      const idx = state.currentLetterIndex;
      const letterEl = letters[idx];
      const word = state.words[wordIndex];

      if (idx >= word.length) {
        // remove extra letter entirely
        letterEl.remove();
        letters.pop();
        state.extraChars = Math.max(0, state.extraChars - 1);
        state.incorrectChars = Math.max(0, state.incorrectChars - 1);
      } else {
        if (letterEl.classList.contains('is-correct')) {
          state.correctChars = Math.max(0, state.correctChars - 1);
        } else if (letterEl.classList.contains('is-incorrect')) {
          state.incorrectChars = Math.max(0, state.incorrectChars - 1);
        }
        letterEl.classList.remove('is-correct', 'is-incorrect', 'is-current');
      }
    }

    state.typedWords[wordIndex] = state.typedWords[wordIndex].slice(0, state.currentLetterIndex);
    markCurrentLetter();
    positionCaret();
    updateLiveStats();
  }

  function handleSpace() {
    if (!state.isRunning) return;

    const wordIndex = state.currentWordIndex;
    const word = state.words[wordIndex];
    const typed = state.typedWords[wordIndex] || '';

    // Don't allow moving forward on an empty word
    if (typed.length === 0) return;

    const wordEl = el.wordsTrack.children[wordIndex];
    if (typed !== word) {
      wordEl.classList.add('is-wrong-word');
    }

    // Any unfilled letters in a short word left incomplete count toward accuracy neutrally
    if (state.currentWordIndex < state.words.length - 1) {
      state.currentWordIndex += 1;
      state.currentLetterIndex = 0;
      state.typedWords[state.currentWordIndex] = '';
      markCurrentLetter();
      positionCaret();
      updateLiveStats();
    } else {
      // Ran out of words before time — regenerate more so the test can continue
      const more = generateWords(WORDS_PER_TEST);
      state.words = state.words.concat(more);
      more.forEach((word) => {
        const wordEl = document.createElement('span');
        wordEl.className = 'word';
        const letterEls = [];
        for (const char of word) {
          const letterEl = document.createElement('span');
          letterEl.className = 'letter';
          letterEl.textContent = char;
          wordEl.appendChild(letterEl);
          letterEls.push(letterEl);
        }
        state.wordEls.push(letterEls);
        el.wordsTrack.appendChild(wordEl);
      });
      state.currentWordIndex += 1;
      state.currentLetterIndex = 0;
      state.typedWords[state.currentWordIndex] = '';
      markCurrentLetter();
      positionCaret();
      updateLiveStats();
    }
  }

  function markCurrentLetter() {
    // clear previous "current" markers on the active word
    const letters = state.wordEls[state.currentWordIndex];
    letters.forEach((l) => l.classList.remove('is-current'));

    document.querySelectorAll('.word.is-current').forEach((w) => w.classList.remove('is-current'));
    const currentWordEl = el.wordsTrack.children[state.currentWordIndex];
    if (currentWordEl) currentWordEl.classList.add('is-current');

    if (state.currentLetterIndex < letters.length) {
      letters[state.currentLetterIndex].classList.add('is-current');
    }
  }

  function triggerShake() {
    el.typeCard.classList.add('is-shaking');
    window.setTimeout(() => el.typeCard.classList.remove('is-shaking'), 400);
  }

  /* ---------------------------------------------------------------------
     Stats & scoring
  --------------------------------------------------------------------- */
  function elapsedMinutes() {
    const elapsedSeconds = state.duration - state.timeLeft;
    return Math.max(elapsedSeconds, 1) / 60;
  }

  function calcWpm() {
    // Standard: (correct characters / 5) / minutes elapsed
    const grossWords = state.correctChars / 5;
    return Math.max(0, Math.round(grossWords / elapsedMinutes()));
  }

  function calcAccuracy() {
    const total = state.correctChars + state.incorrectChars;
    if (total === 0) return 100;
    return Math.round((state.correctChars / total) * 100);
  }

  function wordsCompletedCount() {
    return state.currentWordIndex;
  }

  function recordWpmSample() {
    state.wpmSamples.push(calcWpm());
  }

  function calcConsistency() {
    if (state.wpmSamples.length < 2) return 100;
    const mean = state.wpmSamples.reduce((a, b) => a + b, 0) / state.wpmSamples.length;
    if (mean === 0) return 100;
    const variance =
      state.wpmSamples.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / state.wpmSamples.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    // Convert to a 0-100 "consistency" score — lower variation = higher consistency
    const consistency = Math.max(0, Math.min(100, Math.round(100 - coefficientOfVariation * 100)));
    return consistency;
  }

  function updateLiveStats() {
    const wpm = calcWpm();
    const accuracy = calcAccuracy();
    const totalChars = state.correctChars + state.incorrectChars;

    el.statWpm.textContent = wpm;
    el.statAccuracy.textContent = `${accuracy}%`;
    el.statMistakes.textContent = state.mistakes;

    el.gridChars.textContent = totalChars;
    el.gridCorrect.textContent = state.correctChars;
    el.gridIncorrect.textContent = state.incorrectChars;
    el.gridWords.textContent = wordsCompletedCount();
  }

  function updateTimeDisplays(seconds) {
    el.statTime.textContent = seconds;
    el.gridTime.textContent = `${seconds}s`;
  }

  function updateProgress() {
    const elapsed = state.duration - state.timeLeft;
    const pct = Math.min(100, (elapsed / state.duration) * 100);
    el.progressFill.style.width = `${pct}%`;
  }

  /* ---------------------------------------------------------------------
     Results screen
  --------------------------------------------------------------------- */
  function performanceMessage(wpm, accuracy) {
    if (wpm >= 80 && accuracy >= 95) return 'Excellent';
    if (wpm >= 55 && accuracy >= 90) return 'Great';
    if (wpm >= 30 && accuracy >= 80) return 'Good';
    return 'Needs Practice';
  }

  function showResults() {
    const wpm = calcWpm();
    const accuracy = calcAccuracy();
    const consistency = calcConsistency();
    const message = performanceMessage(wpm, accuracy);

    el.resultWpm.textContent = wpm;
    el.resultAccuracy.textContent = `${accuracy}%`;
    el.resultConsistency.textContent = `${consistency}%`;
    el.resultCorrectChars.textContent = state.correctChars;
    el.resultIncorrectChars.textContent = state.incorrectChars;
    el.resultMistakes.textContent = state.mistakes;
    el.resultWords.textContent = wordsCompletedCount();
    el.resultsMessage.textContent = messageCopy(message);

    el.resultsOverlay.classList.add('is-visible');
  }

  function messageCopy(tier) {
    switch (tier) {
      case 'Excellent': return 'Excellent — you\u2019re typing at a professional pace.';
      case 'Great': return 'Great work — fast and accurate.';
      case 'Good': return 'Good run — keep practicing to build speed.';
      default: return 'Needs Practice — try again to build momentum.';
    }
  }

  /* ---------------------------------------------------------------------
     Duration selection
  --------------------------------------------------------------------- */
  function selectDuration(seconds) {
    state.duration = seconds;
    el.timeOptions.forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.time) === seconds);
    });
    initTest();
  }

  /* ---------------------------------------------------------------------
     Event wiring
  --------------------------------------------------------------------- */
  function attachEvents() {
    el.timeOptions.forEach((btn) => {
      btn.addEventListener('click', () => selectDuration(Number(btn.dataset.time)));
    });

    el.wordsViewport.addEventListener('keydown', handleKeydown);

    // Also allow typing to begin from anywhere on the page for convenience
    document.addEventListener('keydown', (e) => {
      if (document.activeElement !== el.wordsViewport && !state.isFinished) {
        // Redirect focus, then let the viewport's own listener process the next key
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ' || e.key === 'Tab' || e.key === 'Escape') {
          el.wordsViewport.focus();
        }
      }
    });

    el.wordsViewport.addEventListener('focus', () => {
      el.focusOverlay.classList.remove('is-visible');
    });

    el.wordsViewport.addEventListener('blur', () => {
      if (!state.isFinished && !state.isRunning) {
        el.focusOverlay.classList.add('is-visible');
      } else if (!state.isFinished && state.isRunning) {
        el.focusOverlay.classList.add('is-visible');
      }
    });

    el.focusOverlay.addEventListener('click', () => el.wordsViewport.focus());

    // Prevent copy / cut / paste inside the typing area
    ['copy', 'cut', 'paste'].forEach((evt) => {
      el.wordsViewport.addEventListener(evt, (e) => e.preventDefault());
    });

    // Prevent right-click only inside the typing card
    el.typeCard.addEventListener('contextmenu', (e) => e.preventDefault());

    // Restart button with ripple
    el.restartBtn.addEventListener('click', (e) => {
      spawnRipple(el.restartBtn, e);
      restartTest();
    });

    el.tryAgainBtn.addEventListener('click', () => restartTest());

    window.addEventListener('resize', () => {
      positionCaret();
    });
  }

  function spawnRipple(button, event) {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${(event.clientX || rect.left + rect.width / 2) - rect.left - size / 2}px`;
    ripple.style.top = `${(event.clientY || rect.top + rect.height / 2) - rect.top - size / 2}px`;
    button.style.position = 'relative';
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  }

  /* ---------------------------------------------------------------------
     Init
  --------------------------------------------------------------------- */
  function init() {
    attachEvents();
    initTest();
    // Auto-focus the typing area on load
    window.setTimeout(() => el.wordsViewport.focus(), 300);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
