export default function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className={`bg-panel-card border border-panel-border rounded-t-2xl sm:rounded-xl w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 z-10 bg-panel-card flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-panel-border">
          <h3 className="font-semibold text-base sm:text-lg min-w-0">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="shrink-0 text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
