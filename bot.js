export class QuartettBot {
  constructor(allCards, categories, difficulty = 'hard') {
    this.allCards = allCards;
    this.categories = categories;
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
  }

  chooseCategory(botCard) {
    if (this.difficulty === 'easy') {
      const randomIdx = Math.floor(Math.random() * this.categories.length);
      return this.categories[randomIdx].key;
    }

    // Berechne für jede Kategorie die Gewinnwahrscheinlichkeit (0.0 bis 1.0)
    const scoredCategories = this.categories.map(cat => {
      const val = botCard[cat.key];
      const beatenCount = this.allCards.filter(other => {
        if (other.id === botCard.id) return false;
        return cat.rule === 'larger_wins'
          ? val > other[cat.key]
          : val < other[cat.key];
      }).length;

      return {
        key: cat.key,
        winRate: beatenCount / (this.allCards.length - 1)
      };
    });

    // Sortiere nach bester Gewinnchance
    scoredCategories.sort((a, b) => b.winRate - a.winRate);

    if (this.difficulty === 'medium') {
      // Wählt zufällig eine der Top-3-Kategorien
      const topThree = scoredCategories.slice(0, 3);
      return topThree[Math.floor(Math.random() * topThree.length)].key;
    }

    // 'hard': Wählt immer den statistisch stärksten Wert
    return scoredCategories[0].key;
  }
}
