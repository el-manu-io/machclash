export class QuartettEngine {
  constructor(deckData) {
    this.categories = deckData.categories;
    this.allCards = [...deckData.cards];
    this.stats = {
      roundsPlayed: 0,
      categoryWins: Object.fromEntries(deckData.categories.map(c => [c.key, 0])),
      cardWins: {}
    };
    this.resetGame();
  }

  resetGame() {
    const shuffled = this.#shuffle([...this.allCards]);
    const half = Math.floor(shuffled.length / 2);

    this.playerDeck = shuffled.slice(0, half);
    this.opponentDeck = shuffled.slice(half);
    this.pot = []; // Karten bei Unentschieden
    this.turn = 'player'; // 'player' oder 'opponent'
    this.winner = null;
  }

  #shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getTopCards() {
    return {
      playerCard: this.playerDeck[0] || null,
      opponentCard: this.opponentDeck[0] || null,
      counts: {
        player: this.playerDeck.length,
        opponent: this.opponentDeck.length,
        pot: this.pot.length
      },
      turn: this.turn,
      winner: this.winner
    };
  }

  playRound(categoryKey) {
    if (this.winner) return null;

    const category = this.categories.find(c => c.key === categoryKey);
    if (!category) throw new Error(`Unbekannte Kategorie: ${categoryKey}`);

    const pCard = this.playerDeck.shift();
    const oCard = this.opponentDeck.shift();

    const pVal = pCard[categoryKey];
    const oVal = oCard[categoryKey];

    let roundWinner = 'draw';
    if (pVal !== oVal) {
      const playerWins = category.rule === 'larger_wins' ? pVal > oVal : pVal < oVal;
      roundWinner = playerWins ? 'player' : 'opponent';
    }

    // Karten verteilen
    const wonCards = [pCard, oCard, ...this.pot];
    if (roundWinner === 'player') {
      this.playerDeck.push(...wonCards);
      this.pot = [];
      this.turn = 'player';
      this.#trackWin(categoryKey, pCard.name);
    } else if (roundWinner === 'opponent') {
      this.opponentDeck.push(...wonCards);
      this.pot = [];
      this.turn = 'opponent';
      this.#trackWin(categoryKey, oCard.name);
    } else {
      // Gleichstand: Karten wandern in den Pot, Zugrecht bleibt gleich
      this.pot = wonCards;
    }

    this.stats.roundsPlayed++;
    this.#checkGameOver();

    return {
      category,
      pCard,
      oCard,
      pVal,
      oVal,
      roundWinner,
      potSize: this.pot.length,
      nextTurn: this.turn,
      gameWinner: this.winner
    };
  }

  #trackWin(categoryKey, cardName) {
    this.stats.categoryWins[categoryKey]++;
    this.stats.cardWins[cardName] = (this.stats.cardWins[cardName] || 0) + 1;
  }

  #checkGameOver() {
    if (this.playerDeck.length === 0) this.winner = 'opponent';
    if (this.opponentDeck.length === 0) this.winner = 'player';
  }
}
