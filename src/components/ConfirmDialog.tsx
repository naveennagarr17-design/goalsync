import Modal from './Modal';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  extra?: { label: string; onClick: () => void };
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, danger, busy, extra, onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="modal-text">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onCancel} data-autofocus disabled={busy}>Cancel</button>
        {extra && <button className="btn btn-secondary btn-danger-text" onClick={extra.onClick} disabled={busy}>{extra.label}</button>}
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
