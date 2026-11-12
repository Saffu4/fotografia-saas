import { aPesosNumero, pesos } from '../lib/utilidades'

// Campo de dinero en pesos: acepta "50.000", "50000" o "$50.000" y se va
// mostrando con puntos de miles. Antes era un campo numérico y "50.000" se
// guardaba como 50.
export default function CampoDinero({ value, onChange, placeholder = '$0', className = '', mostrarAyuda = false, ...resto }) {
  const numero = aPesosNumero(value)
  const texto = value === '' || value === null || value === undefined ? '' : numero.toLocaleString('es-CO')

  return (
    <div className="min-w-0 flex-1">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
        <input
          {...resto}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder.replace(/^\$/, '')}
          value={texto}
          onChange={(e) => {
            const limpio = e.target.value.replace(/\D/g, '')
            onChange(limpio === '' ? '' : Number(limpio))
          }}
          className={`w-full pl-7 ${className}`}
        />
      </div>
      {mostrarAyuda && numero > 0 && (
        <div className="mt-1 text-xs text-slate-400">Se registrarán {pesos(numero)}</div>
      )}
    </div>
  )
}
