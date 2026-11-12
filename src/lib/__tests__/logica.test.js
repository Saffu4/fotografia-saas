import { describe, it, expect } from 'vitest'
import { categoriaDe, nombreCanonico, opcionesCategoria, categoriasPara, fechaLocalInput, horaLocalInput } from '../constantes'
import { limpiarBusqueda, telefonoWhatsApp, enlaceWhatsApp, aCSV, pesos } from '../utilidades'

describe('categorías', () => {
  it('reconoce nombres escritos a mano', () => {
    expect(categoriaDe('judith').nombre).toBe('Yudith')
    expect(categoriaDe(' graduandos ').nombre).toBe('Graduandos')
    expect(categoriaDe('MARQUETERIA').nombre).toBe('Marquetería')
    expect(categoriaDe('otra cosa').nombre).toBe('')
  })
  it('Marquetería solo en pedidos y Sonido solo en agenda', () => {
    const pedidos = categoriasPara('pedidos').map((c) => c.nombre)
    const agenda = categoriasPara('agenda').map((c) => c.nombre)
    expect(pedidos).toContain('Marquetería')
    expect(pedidos).not.toContain('Sonido')
    expect(agenda).toContain('Sonido')
    expect(agenda).not.toContain('Marquetería')
  })
  it('no pierde un valor viejo al editar', () => {
    expect(nombreCanonico('judith')).toBe('Yudith')
    expect(opcionesCategoria('Bodas', 'pedidos')).toContain('Bodas')
  })
})

describe('fechas locales', () => {
  it('usa la hora local, no UTC', () => {
    const d = new Date(2026, 10, 11, 21, 5) // 9:05 p. m. local
    expect(fechaLocalInput(d)).toBe('2026-11-11')
    expect(horaLocalInput(d)).toBe('21:05')
  })
})

describe('búsqueda', () => {
  it('quita caracteres que rompen el filtro', () => {
    expect(limpiarBusqueda('Pérez, Ana (mamá)')).toBe('Pérez Ana mamá')
    expect(limpiarBusqueda('  50%*  ')).toBe('50')
  })
})

describe('WhatsApp', () => {
  it('formatea celulares colombianos', () => {
    expect(telefonoWhatsApp('300 111 2233')).toBe('573001112233')
    expect(telefonoWhatsApp('+57 300-111-2233')).toBe('573001112233')
    expect(telefonoWhatsApp('6012345')).toBeNull()
  })
  it('arma el enlace con el mensaje', () => {
    expect(enlaceWhatsApp('3001112233', 'Hola Ana')).toBe('https://wa.me/573001112233?text=Hola%20Ana')
    expect(enlaceWhatsApp('', 'Hola')).toBe('https://wa.me/?text=Hola')
  })
})

describe('CSV y dinero', () => {
  it('escapa comas y comillas', () => {
    expect(aCSV([{ a: 'x,y', b: 'di "hola"' }])).toBe('a,b\n"x,y","di ""hola"""')
  })
  it('formatea pesos', () => {
    expect(pesos(1234567)).toMatch(/^\$1.234.567$/)
  })
})
