const colorMap = {
  orange: 'bg-panel-orange/15 text-panel-orange',
  blue: 'bg-panel-blue/15 text-panel-blue',
  green: 'bg-panel-green/15 text-panel-green',
}

export default function StatCard({ icon, label, value, color = 'orange' }) {
  return (
    <div className="min-w-0 bg-panel-card border border-panel-border rounded-xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
      <div className={`w-9 h-9 sm:w-12 sm:h-12 shrink-0 rounded-lg flex items-center justify-center text-base sm:text-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] sm:text-xs text-slate-400 leading-tight">{label}</div>
        <div className="text-xl sm:text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
}
