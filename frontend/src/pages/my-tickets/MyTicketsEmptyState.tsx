import type { TFunction } from 'i18next';

type MyTicketsEmptyStateProps = {
  activeTab: 'pending' | 'active' | 'history';
  onBrowseEvents: () => void;
  t: TFunction;
};

export function MyTicketsEmptyState({ activeTab, onBrowseEvents, t }: MyTicketsEmptyStateProps) {
  const emptyStates = {
    pending: {
      icon: 'schedule',
      title: t('myTickets.empty.pending.title', 'No pending payments'),
      subtitle: t('myTickets.empty.pending.subtitle', "You don't have any pending ticket orders"),
      showAction: false,
    },
    active: {
      icon: 'confirmation_number',
      title: t('myTickets.empty.active.title', 'No active tickets'),
      subtitle: t('myTickets.empty.active.subtitle', 'Book a ticket to see it here'),
      showAction: true,
    },
    history: {
      icon: 'history',
      title: t('myTickets.empty.history.title', 'No ticket history yet'),
      subtitle: t('myTickets.empty.history.subtitle', 'Your past tickets will appear here'),
      showAction: false,
    },
  };

  const current = emptyStates[activeTab];

  return (
    <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-4xl text-gray-400">{current.icon}</span>
      </div>
      <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">{current.title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{current.subtitle}</p>

      {current.showAction && (
        <button
          onClick={onBrowseEvents}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">event</span>
          {t('myTickets.actions.browseEvents', 'Browse Events')}
        </button>
      )}
    </div>
  );
}
