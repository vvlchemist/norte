/**
 * copy.js — All user-facing strings, in one place, i18n-ready.
 * -------------------------------------------------------------
 * Structure: COPY[locale] = { ...nested keys... }
 * Access strings with t('hero.title'). Templates use {placeholders}
 * filled by passing an object as the 2nd arg: t('calc.progress', {n:1, total:5}).
 *
 * To add a language: copy the `es` object, translate, and set
 * CONFIG.product.locale. Keep keys identical across locales.
 */

import { CONFIG } from './config.js';

export const COPY = {
  es: {
    brand: {
      name: 'Norte',
      tagline: 'Tu futuro financiero, claro.',
    },

    nav: {
      learn: 'Aprender',
      calculate: 'Calcular',
    },

    disclaimer: {
      short: 'Estimación educativa, no asesoría financiera.',
      full:
        'Esto es una estimación educativa, no asesoría financiera. Invertir implica riesgo, incluida la posible pérdida de capital. Los rendimientos pasados no garantizan resultados futuros.',
      risk:
        'Los mercados suben y bajan. En el camino vas a ver años malos; el número de arriba es un promedio de largo plazo, no una promesa.',
    },

    hero: {
      eyebrow: 'Pensión IVM + inversión',
      title: '¿Tu plata te va a alcanzar cuando dejes de trabajar?',
      subtitle:
        'Descubrílo en 1 minuto — y mirá cómo podrías cambiarlo invirtiendo desde $10 al mes.',
      cta: 'Calcular mi futuro',
      note: 'Gratis. Sin cuentas. Sin letra chiquita rara.',
      trust1: 'Toma 1 minuto',
      trust2: '100% gratis',
      trust3: 'Sin asesoría, solo claridad',
    },

    calc: {
      progress: 'Paso {n} de {total}',
      back: 'Atrás',
      next: 'Siguiente',
      seeResults: 'Ver mi futuro',
      // Per-step content
      edad: {
        title: '¿Cuántos años tenés?',
        help: 'Tu edad hoy. Con esto calculamos cuánto tiempo tiene tu plata para crecer.',
        suffix: 'años',
      },
      edadRetiro: {
        title: '¿A qué edad querés retirarte?',
        help: 'La edad en la que te gustaría dejar de trabajar (o trabajar porque querés, no porque tenés que).',
        suffix: 'años',
      },
      aporte: {
        title: '¿Cuánto podrías invertir al mes?',
        help: 'No tiene que ser mucho. Lo importante es la constancia. Movés la barra o escribís el monto.',
        suffix: 'al mes',
      },
      ahorro: {
        title: '¿Cuánto tenés ahorrado hoy?',
        help: 'Opcional. Si ya tenés un colchón, lo sumamos a la proyección. Si no, dejalo en 0.',
        optional: 'Opcional',
        suffix: 'ahorrado',
      },
      rendimiento: {
        title: '¿Qué rendimiento anual asumimos?',
        label: 'Rendimiento anual estimado (histórico, no garantizado)',
        help: 'El S&P 500 ha promediado cerca de 7–10% anual en el largo plazo, pero ningún año es igual. Movélo para ver distintos escenarios.',
        warning: 'Este número es un supuesto, no una promesa. Por eso lo podés mover.',
      },
    },

    results: {
      title: 'Tus dos futuros',
      subtitle:
        'Con los mismos {monthly} al mes, mirá la diferencia entre invertir y dejar la plata quieta.',
      investedLabel: 'Si invertís',
      notInvestedLabel: 'Si solo lo guardás',
      atAge: 'a los {age} años',
      diffLabel: 'Lo que dejás sobre la mesa',
      diffSub: 'Esa es la diferencia entre invertir y no hacer nada con la misma plata.',
      chartTitle: 'Cómo crece tu plata con el tiempo',
      chartInvested: 'Invertido',
      chartNotInvested: 'Solo guardado',
      chartAxisAge: 'Edad',
      planLine:
        'Si invertís {monthly} al mes en un fondo que sigue al S&P 500, en {years} años podrías tener ~{invested}.',
      riskLabel: 'Ojo con el riesgo',
      incomeLabel: 'Ingreso mensual estimado en el retiro',
      incomeValue: '~{income} al mes',
      incomeDisclaimer:
        'Estimación con la "regla del 4%": retirás ~4% al año de tu fondo. Es una referencia, no una garantía.',
      recalc: 'Recalcular',
      ctaPlan: 'Recibir mi plan por correo',
      contributedLabel: 'De eso, vos pusiste',
    },

    invest: {
      title: '¿Y dónde se invierte esto?',
      body:
        'Podés invertir en un ETF que sigue al S&P 500 a través de un puesto de bolsa regulado por la SUGEVAL en Costa Rica. Están surgiendo nuevas opciones reguladas más simples y baratas — te avisamos cuando estén listas.',
      note: 'No tenemos comisiones ni alianzas con ningún puesto de bolsa. Esto es información, no una recomendación.',
      sugevalCta: '¿Qué significa "regulado por SUGEVAL"?',
    },

    form: {
      title: 'Recibí tu plan completo por correo',
      subtitle:
        'Te mandamos tus números y entrás a la lista de acceso anticipado de Norte. Sin spam, prometido.',
      name: 'Tu nombre',
      namePlaceholder: 'Ale',
      email: 'Tu correo',
      emailPlaceholder: 'vos@correo.com',
      consent:
        'Quiero recibir mi plan y novedades de Norte. Entiendo que esto es educativo, no asesoría financiera.',
      submit: 'Enviarme mi plan',
      submitting: 'Enviando…',
      success: '¡Listo!',
      errorRequired: 'Completá este campo.',
      errorEmail: 'Revisá el correo, parece que tiene un error.',
      errorConsent: 'Necesitamos tu okay para enviarte el plan.',
      errorGeneric:
        'No pudimos enviar tu plan ahora mismo. Tus datos no se perdieron — probá de nuevo.',
      retry: 'Reintentar',
      noWebhook:
        'El envío todavía no está configurado (falta el WEBHOOK_URL). Tus números siguen abajo.',
      privacy: 'Usamos tu correo solo para mandarte tu plan y novedades. Podés salirte cuando querás.',
    },

    thanks: {
      title: 'Revisá tu correo 📩',
      body:
        'Te mandamos tu plan con tus números a {email}. Si no lo ves en unos minutos, mirá en spam o promociones.',
      nextTitle: 'Qué sigue',
      next:
        'Estamos construyendo herramientas para que empezar a invertir sea fácil y barato desde Costa Rica. Te vamos avisando — sin fechas inventadas ni promesas vacías.',
      shareTitle: 'Pasá la voz',
      shareBody: 'Si esto te sirvió, capaz le sirve a alguien que conocés.',
      share: 'Compartir',
      shareWhatsapp: 'Compartir por WhatsApp',
      learnCta: 'Mientras tanto, aprendé lo básico',
    },

    content: {
      title: 'Aprendé lo básico',
      subtitle: 'Sin tecnicismos. Lo que de verdad importa para empezar.',
      back: 'Volver',
      backToArticles: 'Ver todos los artículos',
      readingTime: '{min} min de lectura',
      cta: 'Calcular mi futuro',
    },

    footer: {
      disclaimer:
        'Norte es una herramienta educativa. No ejecutamos inversiones, no custodiamos fondos y no damos asesoría financiera personalizada.',
      madeIn: 'Hecho en Costa Rica 🇨🇷',
      privacy: 'Privacidad',
      copyright: '© {year} Norte',
    },

    a11y: {
      skip: 'Saltar al contenido',
      menu: 'Menú',
      close: 'Cerrar',
      chartAlt:
        'Gráfico de líneas comparando el valor de tu dinero invertido contra solo guardado, a lo largo de los años.',
    },

    errors: {
      ageRange: 'Tu edad debe estar entre {min} y {max}.',
      retirementAfter: 'La edad de retiro debe ser mayor a tu edad actual.',
      retirementRange: 'La edad de retiro debe estar entre {min} y {max}.',
      positive: 'Ingresá un monto válido (0 o más).',
    },
  },
};

/**
 * Resolve a dotted key against the active locale, with {placeholder}
 * interpolation. Falls back to the key itself if missing (so a typo is
 * visible in dev rather than silently blank).
 *
 * @param {string} path  e.g. 'hero.title'
 * @param {Object} [vars] values for {placeholders}
 * @param {string} [locale]
 * @returns {string}
 */
export function t(path, vars = {}, locale = CONFIG.product.locale) {
  const dict = COPY[locale] || COPY.es;
  const value = path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), dict);

  if (typeof value !== 'string') {
    // Helpful during development; never throws in production.
    console.warn(`[copy] Missing or non-string key: "${path}"`);
    return path;
  }

  return value.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}
