import { apiClient } from './apiClient';

const normalizeCard = (card) => ({
  id: card.id,
  userId: card.userId || card.user_id,
  nickname: card.nickname,
  holderName: card.holderName || card.holder_name,
  brand: card.brand,
  last4: card.last4 || card.last_four,
  expiry: card.expiry,
  theme: card.theme || 'indigo',
  createdAt: card.createdAt || card.created_at || null,
});

export const cardStore = {
  async addCard(userId, payload) {
    const response = await apiClient.post('/api/cards', {
      nickname: payload.nickname.trim(),
      holder_name: payload.holderName.trim(),
      brand: payload.brand,
      last4: payload.last4,
      expiry: payload.expiry,
      theme: payload.theme,
    });

    return normalizeCard(response.card);
  },
  async deleteCard(userId, cardId) {
    await apiClient.delete(`/api/cards/${cardId}`);
    return this.getCardsForUser(userId);
  },
  async getCardsForUser() {
    const response = await apiClient.get('/api/cards');
    return response.cards.map((card) => normalizeCard(card));
  },
};
