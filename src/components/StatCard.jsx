const colorMap = {
  orange: 'bg-panel-orange/15 text-panel-orange',
  blue: 'bg-panel-blue/15 text-panel-blue',
  green: 'bg-panel-green/15 text-panel-green',
}

export default function StatCard({ icon, label, value, color = 'orange' }) {
  return (
    <div className="flex-1 bg-panel-card border border-panel-border rounded-xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
}
