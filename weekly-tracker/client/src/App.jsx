import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import HabitsStrip from './components/HabitsStrip.jsx';
import Board from './components/Board.jsx';
import QuickAddBox from './components/QuickAddBox.jsx';
import QuickAddPreviewModal from './components/QuickAddPreviewModal.jsx';
import ReviewModal from './components/ReviewModal.jsx';

export default function App() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [previewItems, setPreviewItems] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getState();
      setState(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const withRefresh = (fn) => async (...args) => {
    try {
      const data = await fn(...args);
      setState(data);
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  const addCard = withRefresh(api.addCard);
  const deleteCard = withRefresh(api.deleteCard);
  const updateCard = withRefresh(api.updateCard);
  const toggleCard = withRefresh(api.toggleCard);
  const addSubtask = withRefresh(api.addSubtask);
  const toggleSubtask = withRefresh(api.toggleSubtask);
  const updateSubtask = withRefresh(api.updateSubtask);
  const deleteSubtask = withRefresh(api.deleteSubtask);
  const bumpHabit = withRefresh(api.bumpHabit);
  const confirmQuickAdd = withRefresh(api.confirmQuickAdd);
  const closeWeek = withRefresh(api.closeWeek);

  const handleQuickAddSubmit = async (text) => {
    const { items } = await api.parseQuickAdd(text);
    setPreviewItems(items);
  };

  const handleQuickAddConfirm = async (items) => {
    await confirmQuickAdd(items);
    setPreviewItems(null);
  };

  const handleStartNewWeek = async (notes) => {
    await closeWeek(notes);
    setReviewOpen(false);
  };

  if (error && !state) {
    return (
      <div className="app-shell app-shell--error">
        <p>Couldn't reach the server: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="app-shell app-shell--loading">
        <p>Loading your week…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Week {state.week.number}</p>
          <h1>Weekly Tracker</h1>
        </div>
        <button className="btn btn--primary" onClick={() => setReviewOpen(true)}>
          Thursday review
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <HabitsStrip habits={state.habits} onBump={bumpHabit} />

      <QuickAddBox onSubmit={handleQuickAddSubmit} />

      <Board
        domains={state.domains}
        onAddCard={addCard}
        onDeleteCard={deleteCard}
        onUpdateCard={updateCard}
        onToggleCard={toggleCard}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
        onUpdateSubtask={updateSubtask}
        onDeleteSubtask={deleteSubtask}
      />

      {previewItems && (
        <QuickAddPreviewModal
          items={previewItems}
          domains={state.domains}
          onCancel={() => setPreviewItems(null)}
          onConfirm={handleQuickAddConfirm}
        />
      )}

      {reviewOpen && (
        <ReviewModal
          completion={state.completion}
          history={state.history}
          onClose={() => setReviewOpen(false)}
          onStartNewWeek={handleStartNewWeek}
        />
      )}
    </div>
  );
}
