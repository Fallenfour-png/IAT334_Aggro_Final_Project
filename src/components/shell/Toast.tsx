import { Icon } from '../../lib/icons';
import { useStore } from '../../state/store';

export function Toast() {
  const { toast, undoToast } = useStore();
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <Icon name="check-circle" size={20} />
      <span className="t-body">{toast.label}</span>
      {toast.undo && (
        <button type="button" className="toast-undo t-btn-bold" onClick={undoToast}>
          Undo
        </button>
      )}
    </div>
  );
}
