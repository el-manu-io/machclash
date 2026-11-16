import { QuartettEngine } from './gameEngine.js';
import { QuartettBot } from './bot.js';
import { Display } from './display.js';

new Display(document.querySelector('.arena'), document.querySelector('.slots'));

const response = await fetch('./static/deck.json');
const deckData = await response.json();

const engine = new QuartettEngine(deckData);
const bot = new QuartettBot(deckData.cards, deckData.categories, 'hard');

const playerContainer = document.getElementById('player-card-container');
const opponentContainer = document.getElementById('opponent-card-container');
const statusMsg = document.getElementById('status-msg');
const vsBanner = document.getElementById('vs-banner');
const nextRoundBtn = document.getElementById('next-round-btn');
const gameOverlay = document.getElementById('game-overlay');
const gameOverlayMsg = document.getElementById('game-overlay-msg');
const tryAgainBtn = document.getElementById('try-again-btn');

let isRevealed = false;

const showGameOverlay = (winner) => {
  gameOverlayMsg.textContent = winner === 'player'
    ? 'You won!'
    : 'You lost!';
  gameOverlay.classList.add('is-open');
}

const hideGameOverlay = () => {
  gameOverlay.classList.remove('is-open');
}

const formatValue = (key, val) => {
  if (key === 'erstflug') return val;
  if (key === 'reisegeschwindigkeit_mach') return `Mach ${val.toFixed(2)}`;
  if (typeof val === 'number') return val.toLocaleString('de-DE');
  return val;
}

const setTopCard = (side) => {
  playerContainer.classList.toggle('card-on-top', side === 'player');
  opponentContainer.classList.toggle('card-on-top', side === 'opponent');
}

const toggleTopCard = () => {
  const playerOnTop = playerContainer.classList.contains('card-on-top');
  setTopCard(playerOnTop ? 'opponent' : 'player');
}

const renderCard = (card, container, clickable = false, highlight = null) => {
  if (!card) {
    container.innerHTML = '<p>No cards left</p>';
    return;
  }

  const rowsHtml = deckData.categories.map(cat => {
    const arrow = cat.rule === 'larger_wins' ? '▲' : '▼';
    let stateClass = '';
    if (highlight && highlight.key === cat.key) {
      stateClass = highlight.won ? 'active-win' : 'active-lose';
    }

    return `
      <li class="stat-row ${stateClass}" data-key="${cat.key}">
        <span class="stat-label">
          <span class="rule-badge">${arrow}</span> ${cat.label}
        </span>
        <span class="stat-value">
          ${formatValue(cat.key, card[cat.key])} <small>${cat.unit !== 'Year' && cat.unit !== 'Mach' ? cat.unit : ''}</small>
        </span>
      </li>
    `;
  }).join('');

  container.innerHTML = `
    <article class="quartett-card">
      <header class="card-header">
        <span class="card-id">${card.id}</span>
        <div class="card-title-wrap">
          <div class="card-group">${card.group}</div>
          <div class="card-name" title="${card.name}">${card.name}</div>
        </div>
      </header>
      <div class="card-image">
        <img src="static/images/deck/card${card.id}.jpg" alt="${card.name}" loading="lazy" decoding="async" />
      </div>
      <ul class="card-stats">${rowsHtml}</ul>
    </article>
  `;

  const article = container.querySelector('.quartett-card');
  if (article) {
    article.addEventListener('click', (e) => {
      if (clickable && e.target.closest('.stat-row')) return;
      toggleTopCard();
    });
  }

  if (clickable) {
    container.querySelectorAll('.stat-row').forEach(row => {
      row.addEventListener('click', () => onCategoryClick(row.dataset.key));
    });
  }
}

const updateBoard = () => {
  isRevealed = false;
  nextRoundBtn.blur();
  nextRoundBtn.hidden = true;
  if (vsBanner) vsBanner.hidden = true;
  opponentContainer.classList.add('card-hidden');
  setTopCard('player');

  const state = engine.getTopCards();
  document.getElementById('player-count').textContent = state.counts.player;
  document.getElementById('opponent-count').textContent = state.counts.opponent;
  document.getElementById('pot-count').textContent = state.counts.pot;

  if (state.winner) {
    showGameOverlay(state.winner);
    renderCard(state.playerCard, playerContainer, false);
    return;
  }

  const isPlayerTurn = state.turn === 'player';
  statusMsg.textContent = isPlayerTurn
    ? 'Your turn – pick a category!'
    : 'CPU is thinking...';

  renderCard(state.playerCard, playerContainer, isPlayerTurn);
  renderCard(state.opponentCard, opponentContainer, false);

  if (!isPlayerTurn) {
    setTimeout(() => {
      const botChoice = bot.chooseCategory(state.opponentCard);
      resolveRound(botChoice);
    }, 1100);
  }
}

const onCategoryClick = (categoryKey) => {
  if (isRevealed || engine.turn !== 'player') return;
  resolveRound(categoryKey);
}

const resolveRound = (categoryKey) => {
  isRevealed = true;
  const wasOpponentTurn = engine.turn === 'opponent';
  const res = engine.playRound(categoryKey);

  // Reveal desktop CPU card & highlight winning/losing stat row
  opponentContainer.classList.remove('card-hidden');
  setTopCard(res.roundWinner === 'opponent' ? 'opponent' : 'player');
  renderCard(res.pCard, playerContainer, false, {
    key: categoryKey,
    won: res.roundWinner === 'player'
  });
  renderCard(res.oCard, opponentContainer, false, {
    key: categoryKey,
    won: res.roundWinner === 'opponent'
  });

  // Update mobile VS banner
  if (vsBanner) {
    const unit = res.category.unit !== 'Year' && res.category.unit !== 'Mach' ? ` ${res.category.unit}` : '';
    vsBanner.hidden = false;
    vsBanner.className = `vs-banner ${res.roundWinner}`;
    vsBanner.innerHTML = `
      <span class="vs-plane">CPU: <strong>${res.oCard.name}</strong> (${res.oCard.id})</span>
      <span class="vs-stat">${res.category.label}: <strong>${formatValue(categoryKey, res.oVal)}${unit}</strong></span>
    `;
  }

  if (res.roundWinner === 'player') {
    statusMsg.textContent = `✅ You take the trick! (${res.category.label})`;
  } else if (res.roundWinner === 'opponent') {
    statusMsg.textContent = `❌ CPU wins with ${res.category.label}!`;
  } else {
    statusMsg.textContent = `⚖️ Tie! ${res.potSize} cards in the pot.`;
  }

  if (res.gameWinner) {
    nextRoundBtn.hidden = true;
    showGameOverlay(res.gameWinner);
    return;
  }

  nextRoundBtn.hidden = false;
  nextRoundBtn.focus();
  // Opponent turn: focus the button. Player turn: only answer-click continues.
  if (wasOpponentTurn) {
    nextRoundBtn.focus();
  }

  // Clicking an answer row after reveal continues like "Next round"
  for (const row of document.querySelectorAll('.stat-row')) {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      nextRoundBtn.click();
    });
  }
}

nextRoundBtn.addEventListener('click', updateBoard);
tryAgainBtn.addEventListener('click', () => {
  hideGameOverlay();
  engine.resetGame();
  updateBoard();
});
document.getElementById('stats-btn').addEventListener('click', () => {
  console.table(engine.stats.categoryWins);
  console.table(engine.stats.cardWins);
});

updateBoard();
