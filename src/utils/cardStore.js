const CARD_STORAGE_KEY = 'finance-flow-cards';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readCards = () => {
  if (!canUseStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(CARD_STORAGE_KEY);

  if (!rawValue) {
    window.localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
};

const writeCards = (cards) => {
  if (canUseStorage()) {
    window.localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(cards));
  }

  return cards;
};

const sanitizeCard = (card) => ({
  id: card.id,
  userId: card.userId,
  nickname: card.nickname,
  holderName: card.holderName,
  brand: card.brand,
  last4: card.last4,
  expiry: card.expiry,
  theme: card.theme || 'indigo',
  createdAt: card.createdAt || new Date().toISOString(),
});

export const cardStore = {
  getCardsForUser(userId) {
    return readCards()
      .filter((card) => card.userId === userId)
      .map((card) => sanitizeCard(card));
  },
  addCard(userId, payload) {
    const cards = readCards();
    const nextCard = sanitizeCard({
      id: `card-${Date.now()}`,
      userId,
      nickname: payload.nickname.trim(),
      holderName: payload.holderName.trim(),
      brand: payload.brand,
      last4: payload.last4,
      expiry: payload.expiry,
      theme: payload.theme,
      createdAt: new Date().toISOString(),
    });

    writeCards([nextCard, ...cards]);
    return nextCard;
  },
  deleteCard(userId, cardId) {
    const nextCards = readCards().filter((card) => !(card.userId === userId && card.id === cardId));
    writeCards(nextCards);
    return nextCards
      .filter((card) => card.userId === userId)
      .map((card) => sanitizeCard(card));
  },
};
