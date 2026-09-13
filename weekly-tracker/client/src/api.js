const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getState: () => request('/state'),
  addCard: (payload) => request('/cards', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  updateCard: (id, patch) => request(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  toggleCard: (id) => request(`/cards/${id}/toggle`, { method: 'PATCH' }),
  addSubtask: (cardId, label) =>
    request(`/cards/${cardId}/subtasks`, { method: 'POST', body: JSON.stringify({ label }) }),
  toggleSubtask: (id) => request(`/subtasks/${id}/toggle`, { method: 'PATCH' }),
  updateSubtask: (id, label) =>
    request(`/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify({ label }) }),
  deleteSubtask: (id) => request(`/subtasks/${id}`, { method: 'DELETE' }),
  bumpHabit: (key, delta) =>
    request(`/habits/${key}`, { method: 'PATCH', body: JSON.stringify({ delta }) }),
  parseQuickAdd: (text) =>
    request('/quickadd/parse', { method: 'POST', body: JSON.stringify({ text }) }),
  confirmQuickAdd: (items) =>
    request('/quickadd/confirm', { method: 'POST', body: JSON.stringify({ items }) }),
  closeWeek: (notes) =>
    request('/review/close', { method: 'POST', body: JSON.stringify({ notes }) }),
};
