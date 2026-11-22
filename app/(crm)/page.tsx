import Link from 'next/link';
import { ETAPAS, ETAPAS_ACTIVAS, TEMPERATURAS, colaLlamadas, nombreEtapa, tablero, temperatura } from '@/lib/crm';
import { NombreLead, PillTemp, Vacio } from '@/app/componentes';
import { hace } from '@/lib/formato';
import { contexto, leadsDe } from '@/lib/repo';

export default async function Tablero() {
  const { negocio } = await contexto();
  const leads = await leadsDe(negocio.id);
  const ahora = Date.now();
  const t = tablero(leads, ahora);
  const reales = leads.filter((l) => !l.esPrueba);
  const activos = ETAPAS.filter((e) => ETAPAS_ACTIVAS.includes(e.id));
  const maxEtapa = Math.max(1, ...activos.map((e) => t.porEtapa[e.id]));
  const maxMotivo = Math.max(1, ...t.motivos.map((m) => m.cantidad));
  const quieren = reales.filter((l) => l.etapa === 'quiere_comprar').sort((a, b) => a.creado - b.creado);
  const nuevos = reales.filter((l) => l.etapa === 'nuevo' && !l.visto).sort((a, b) => a.creado - b.creado);
  const llamar = colaLlamadas(reales, ahora);

  return (
    <>
      <header className="cabecera"><div><h1>Tablero</h1><p>Cómo va la venta de {negocio.nombre} hoy.</p></div></header>

      <section className="kpis">
        <Link href="/hoy" className="kpi"><small>Ingresaron hoy</small><b>{t.ingresaronHoy}</b></Link>
        <Link href="/atender" className="kpi acento"><small>Por atender</small><b>{t.porAtender}</b></Link>
        <Link href="/llamadas" className="kpi"><small>Por llamar ahora</small><b>{t.porLlamar}</b></Link>
        <Link href="/leads?etapa=quiere_comprar" className="kpi"><small>Quieren comprar</small><b>{t.porEtapa.quiere_comprar}</b></Link>
        <Link href="/leads?etapa=cliente" className="kpi menta"><small>{nombreEtapa('cliente', negocio.nombresEtapas)}</small><b>{t.porEtapa.cliente}</b></Link>
      </section>

      <section className="rejilla dos">
        <div className="tarjeta">
          <h2>Etapas</h2>
          <p className="ayuda">Cada lead está en una sola etapa. El bot las mueve solo; tú las cambias desde la ficha.</p>
          <div className="barras">
            {activos.map((e) => (
              <Link key={e.id} href={`/leads?etapa=${e.id}`} className="barra" title={e.ayuda}>
                <span>{e.orden}. {nombreEtapa(e.id, negocio.nombresEtapas)}</span>
                <div><i style={{ width: `${(t.porEtapa[e.id] / maxEtapa) * 100}%`, background: e.color }} /></div>
                <b>{t.porEtapa[e.id]}</b>
              </Link>
            ))}
          </div>
          <div className="aparte">
            <Link href="/leads?etapa=proximo">{nombreEtapa('proximo', negocio.nombresEtapas)} <b>{t.porEtapa.proximo}</b></Link>
            <Link href="/leads?etapa=cerrado">{nombreEtapa('cerrado', negocio.nombresEtapas)} <b>{t.porEtapa.cerrado}</b></Link>
          </div>
        </div>

        <div className="tarjeta">
          <h2>Temperatura de los activos</h2>
          <p className="ayuda">Sale de lo que el bot entiende en cada conversación.</p>
          <div className="temps">
            {(Object.keys(TEMPERATURAS) as (keyof typeof TEMPERATURAS)[]).map((k) => (
              <Link key={k} href={`/leads?temp=${k}`} className="temp" style={{ ['--c' as string]: TEMPERATURAS[k].color }}>
                <b>{t.porTemperatura[k]}</b><span>{TEMPERATURAS[k].nombre}</span>
              </Link>
            ))}
          </div>
          <h2 className="sep">Embudo</h2>
          <div className="embudo">
            {t.embudo.map((p, i) => (
              <div key={p.paso} className="paso">
                <span>{p.paso}</span>
                <div><i style={{ width: `${t.embudo[0]!.cantidad ? (p.cantidad / t.embudo[0]!.cantidad) * 100 : 0}%`, opacity: 1 - i * 0.14 }} /></div>
                <b>{p.cantidad}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <h2 className="titulo-seccion">Qué hacer hoy</h2>
      <section className="rejilla tres">
        {[
          { t: 'Por llamar', href: '/llamadas', lista: llamar, vacio: 'No hay llamadas pendientes.' },
          { t: 'Quieren comprar', href: '/leads?etapa=quiere_comprar', lista: quieren, vacio: 'Nadie esperando para comprar.' },
          { t: 'Nuevos sin abrir', href: '/leads?ver=nuevos', lista: nuevos, vacio: 'Todos los nuevos ya fueron abiertos.' },
        ].map((b) => (
          <div key={b.t} className="tarjeta lista-corta">
            <div className="fila-titulo"><h3>{b.t}</h3><Link href={b.href} className="enlace">Ver {b.lista.length} →</Link></div>
            {b.lista.length ? b.lista.slice(0, 5).map((l) => (
              <div key={l.id} className="item">
                <NombreLead lead={l} extra={<> · {hace(l.creado, ahora)}</>} />
                {temperatura(l) && <PillTemp lead={l} />}
              </div>
            )) : <Vacio>{b.vacio}</Vacio>}
          </div>
        ))}
      </section>

      <section className="tarjeta">
        <h2>¿Por qué no les interesa?</h2>
        <p className="ayuda">Lo que dijeron los leads cerrados. Sirve para ajustar la oferta y la Ficha del bot.</p>
        {t.motivos.length ? (
          <div className="barras">
            {t.motivos.map((m) => (
              <div key={m.motivo} className="barra"><span>{m.motivo}</span><div><i style={{ width: `${(m.cantidad / maxMotivo) * 100}%`, background: '#E04420' }} /></div><b>{m.cantidad}</b></div>
            ))}
          </div>
        ) : <Vacio>Todavía no hay leads cerrados.</Vacio>}
      </section>
    </>
  );
}
