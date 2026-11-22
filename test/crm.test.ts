import { describe, expect, it } from 'vitest';
import {
  colaAtencion, colaLlamadas, enCola, etapaTrasBot, grupoLlamada, inicioDelDia, nombreEtapa, porQueAtender,
  tablero, temperatura, trasLlamada, type LeadCrm,
} from '../lib/crm';

const AHORA = Date.UTC(2026, 10, 22, 17, 0);   // 22 nov, 12:00 en Lima
const H = 3_600_000, D = 24 * H;
const lead = (o: Partial<LeadCrm> = {}): LeadCrm => ({
  id: 'x', nombre: 'Ana', telefono: '51911111111', etapa: 'conversando', nivel: 'evaluando', visto: true,
  esPrueba: false, pidePersona: false, resumen: '', motivoNoInteres: '', origen: 'whatsapp', proximaAccion: '',
  proximoSeguimiento: null, ultimaAtencion: null, ultimaLlamada: null, llamadas: 0, ultimoIngreso: null,
  creado: AHORA - 5 * D, ...o,
});

describe('etapas y temperatura', () => {
  it('usa el nombre propio del negocio si lo tiene', () => {
    expect(nombreEtapa('en_cierre')).toBe('En cierre');
    expect(nombreEtapa('en_cierre', { en_cierre: 'Inscrito a la entrevista' })).toBe('Inscrito a la entrevista');
  });
  it('la temperatura sale del nivel que pone el bot', () => {
    expect(temperatura(lead({ nivel: 'superinteresado' }))).toBe('super');
    expect(temperatura(lead({ nivel: 'interesado' }))).toBe('caliente');
    expect(temperatura(lead({ nivel: 'sin_calificar' }))).toBe('frio');
    expect(temperatura(lead({ etapa: 'cliente', nivel: 'interesado' }))).toBe('');
  });
  it('el bot solo hace avanzar la etapa y no toca lo que puso una persona', () => {
    expect(etapaTrasBot('nuevo', 'evaluando')).toBe('conversando');
    expect(etapaTrasBot('por_llamar', 'interesado')).toBe('conversando');
    expect(etapaTrasBot('conversando', 'superinteresado')).toBe('quiere_comprar');
    expect(etapaTrasBot('quiere_comprar', 'interesado')).toBe('quiere_comprar');
    expect(etapaTrasBot('en_cierre', 'no_interes')).toBe('en_cierre');
    expect(etapaTrasBot('conversando', 'no_interes')).toBe('cerrado');
  });
  it('el día empieza a medianoche de Lima', () => {
    expect(new Date(inicioDelDia(AHORA)).toISOString()).toBe('2026-11-22T05:00:00.000Z');
  });
});

describe('Por atender', () => {
  it('entra el nuevo sin abrir, el que pidió persona y el seguimiento vencido; no el pospuesto ni la prueba', () => {
    expect(enCola(lead({ visto: false, nivel: 'sin_calificar' }), AHORA)).toBe(true);
    expect(enCola(lead({ pidePersona: true, nivel: 'sin_calificar' }), AHORA)).toBe(true);
    expect(enCola(lead({ nivel: 'sin_calificar', proximoSeguimiento: AHORA - H }), AHORA)).toBe(true);
    expect(enCola(lead({ nivel: 'interesado', proximoSeguimiento: AHORA + H }), AHORA)).toBe(false);
    expect(enCola(lead({ visto: false, esPrueba: true }), AHORA)).toBe(false);
    expect(enCola(lead({ etapa: 'cerrado', visto: false }), AHORA)).toBe(false);
  });
  it('vuelve a la cola quien se registró de nuevo, aunque estuviera cerrado', () => {
    const l = lead({ etapa: 'cerrado', ultimoIngreso: AHORA - H, ultimaAtencion: AHORA - 3 * D });
    expect(enCola(l, AHORA)).toBe(true);
    expect(porQueAtender(l, AHORA)).toContain('Volvió');
  });
  it('ordena por interés y luego por quién llegó antes', () => {
    const cola = colaAtencion([
      lead({ id: 'tibio', nivel: 'evaluando', creado: AHORA - 9 * D }),
      lead({ id: 'super-nuevo', nivel: 'superinteresado', creado: AHORA - D }),
      lead({ id: 'super-antiguo', nivel: 'superinteresado', creado: AHORA - 3 * D }),
      lead({ id: 'cierre', etapa: 'en_cierre', nivel: 'pre_inscrito' }),
    ], AHORA);
    expect(cola.map((l) => l.id)).toEqual(['cierre', 'super-antiguo', 'super-nuevo', 'tibio']);
  });
});

describe('Llamadas', () => {
  it('agrupa por prioridad de llamada', () => {
    expect(grupoLlamada(lead({ nivel: 'superinteresado' }), AHORA)).toBe(1);
    expect(grupoLlamada(lead({ nivel: 'interesado' }), AHORA)).toBe(2);
    expect(grupoLlamada(lead({ etapa: 'por_llamar', nivel: 'sin_calificar' }), AHORA)).toBe(3);
    expect(grupoLlamada(lead({ etapa: 'nuevo', nivel: 'sin_calificar' }), AHORA)).toBe(4);
    expect(grupoLlamada(lead({ telefono: '' , nivel: 'superinteresado' }), AHORA)).toBe(0);
    expect(grupoLlamada(lead({ etapa: 'cliente' }), AHORA)).toBe(0);
  });
  it('quien ya fue llamado sale de la cola hasta su próxima fecha', () => {
    const l = lead({ nivel: 'interesado' });
    expect(colaLlamadas([l], AHORA)).toHaveLength(1);
    const c = trasLlamada(l, 'no_contesto', AHORA);
    expect(c.etapa).toBe('conversando');
    expect(colaLlamadas([{ ...l, ...c, ultimaLlamada: AHORA, llamadas: 1, motivoNoInteres: '' }], AHORA)).toHaveLength(0);
    expect(colaLlamadas([{ ...l, ...c, ultimaLlamada: AHORA, llamadas: 1, motivoNoInteres: '' }], AHORA + 2 * D)).toHaveLength(1);
  });
  it('número errado cierra el lead con su motivo', () => {
    expect(trasLlamada(lead(), 'numero_errado', AHORA)).toMatchObject({ etapa: 'cerrado', motivoNoInteres: 'Número errado', proximoSeguimiento: null });
  });
});

describe('Tablero', () => {
  it('cuenta etapas, ingresos de hoy y motivos sin contar las pruebas', () => {
    const t = tablero([
      lead({ etapa: 'nuevo', creado: AHORA - H, visto: false }),
      lead({ etapa: 'cerrado', motivoNoInteres: 'Precio' }),
      lead({ etapa: 'cerrado', motivoNoInteres: 'Precio' }),
      lead({ etapa: 'cerrado', motivoNoInteres: 'Tiempo' }),
      lead({ etapa: 'cliente' }),
      lead({ etapa: 'nuevo', esPrueba: true, creado: AHORA }),
    ], AHORA);
    expect(t.porEtapa.nuevo).toBe(1);
    expect(t.ingresaronHoy).toBe(1);
    expect(t.motivos[0]).toEqual({ motivo: 'Precio', cantidad: 2 });
    expect(t.embudo.at(-1)).toEqual({ paso: 'Clientes', cantidad: 1 });
  });
});
