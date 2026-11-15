import { QuartettEngine } from './gameEngine.js';
import { QuartettBot } from './bot.js';

const response = await fetch('./deck.json');
const deckData = await response.json();

const engine = new QuartettEngine(deckData);
const bot = new QuartettBot(deckData.cards, deckData.categories, 'hard');

const playerContainer = document.getElementById('player-card-container');
const opponentContainer = document.getElementById('opponent-card-container');
const statusMsg = document.getElementById('status-msg');
const vsBanner = document.getElementById('vs-banner');
const nextRoundBtn = document.getElementById('next-round-btn');

let isRevealed = false;

function formatValue(key, val) {
  if (key === 'erstflug') return val;
  if (key === 'reisegeschwindigkeit_mach') return `Mach ${val.toFixed(2)}`;
  if (typeof val === 'number') return val.toLocaleString('de-DE');
  return val;
}

function renderCard(card, container, clickable = false, highlight = null) {
  if (!card) {
    container.innerHTML = '<p>Keine Karten mehr</p>';
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
          ${formatValue(cat.key, card[cat.key])} <small>${cat.unit !== 'Jahr' && cat.unit !== 'Mach' ? cat.unit : ''}</small>
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
        <span>✈️</span>
        <small>${card.name}</small>
      </div>
      <ul class="card-stats">${rowsHtml}</ul>
    </article>
  `;

  if (clickable) {
    container.querySelectorAll('.stat-row').forEach(row => {
      row.addEventListener('click', () => onCategoryClick(row.dataset.key));
    });
  }
}

function updateBoard() {
  isRevealed = false;
  nextRoundBtn.hidden = true;
  if (vsBanner) vsBanner.hidden = true;
  opponentContainer.classList.add('card-hidden');

  const state = engine.getTopCards();
  document.getElementById('player-count').textContent = state.counts.player;
  document.getElementById('opponent-count').textContent = state.counts.opponent;
  document.getElementById('pot-count').textContent = state.counts.pot;

  if (state.winner) {
    statusMsg.textContent = state.winner === 'player'
      ? '🏆 Glückwunsch! Du hast alle 32 Karten gewonnen!'
      : '💥 Die CPU hat alle Karten abgeräumt!';
    renderCard(state.playerCard, playerContainer, false);
    return;
  }

  const isPlayerTurn = state.turn === 'player';
  statusMsg.textContent = isPlayerTurn
    ? 'Du bist am Zug – klicke auf eine Kategorie!'
    : 'CPU überlegt...';

  renderCard(state.playerCard, playerContainer, isPlayerTurn);
  renderCard(state.opponentCard, opponentContainer, false);

  if (!isPlayerTurn) {
    setTimeout(() => {
      const botChoice = bot.chooseCategory(state.opponentCard);
      resolveRound(botChoice);
    }, 1100);
  }
}

function onCategoryClick(categoryKey) {
  if (isRevealed || engine.turn !== 'player') return;
  resolveRound(categoryKey);
}

function resolveRound(categoryKey) {
  isRevealed = true;
  const res = engine.playRound(categoryKey);

  // Reveal desktop CPU card & highlight winning/losing stat row
  opponentContainer.classList.remove('card-hidden');
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
    const unit = res.category.unit !== 'Jahr' && res.category.unit !== 'Mach' ? ` ${res.category.unit}` : '';
    vsBanner.hidden = false;
    vsBanner.className = `vs-banner ${res.roundWinner}`;
    vsBanner.innerHTML = `
      <span class="vs-plane">CPU: <strong>${res.oCard.name}</strong> (${res.oCard.id})</span>
      <span class="vs-stat">${res.category.label}: <strong>${formatValue(categoryKey, res.oVal)}${unit}</strong></span>
    `;
  }

  if (res.roundWinner === 'player') {
    statusMsg.textContent = `✅ Stich für dich! (${res.category.label})`;
  } else if (res.roundWinner === 'opponent') {
    statusMsg.textContent = `❌ CPU sticht mit ${res.category.label}!`;
  } else {
    statusMsg.textContent = `⚖️ Unentschieden! ${res.potSize} Karten im Pot.`;
  }

  nextRoundBtn.hidden = false;
}

nextRoundBtn.addEventListener('click', updateBoard);
document.getElementById('stats-btn').addEventListener('click', () => {
  console.table(engine.stats.categoryWins);
  console.table(engine.stats.cardWins);
});

updateBoard();
