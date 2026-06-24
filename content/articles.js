/**
 * articles.js — Starter educational content.
 * -------------------------------------------------------------
 * Each article is a plain object with a tiny subset of Markdown in `body`
 * (headings #/##, **bold**, *italic*, - lists, > quotes, paragraphs).
 * Adding an article = appending an object here. To move to .md files
 * later, swap content.js's loader; the UI doesn't care.
 *
 * Tone: Gen-Z / millennial, neutral LATAM Spanish, honest, no hype.
 */

export const ARTICLES = [
  {
    slug: 'pension-ivm-no-alcanza',
    title: 'Por qué tu pensión del IVM probablemente no te va a alcanzar (y qué hacer)',
    excerpt:
      'El IVM es una base, no un plan completo. Te explicamos por qué y qué podés hacer hoy.',
    minutes: 4,
    tag: 'Pensiones',
    body: `
# Por qué tu pensión del IVM probablemente no te va a alcanzar

El **IVM** (Invalidez, Vejez y Muerte) de la CCSS es la pensión pública de Costa Rica. Es importante y es una base real. Pero "base" es la palabra clave: para la mayoría de la gente **no fue diseñado para reemplazar todo tu salario**.

## El problema en una frase

Vivimos más años, hay menos personas trabajando por cada pensionado, y el monto que recibís se calcula sobre tus salarios reportados. El resultado típico: tu pensión va a ser **una fracción** de lo que ganabas trabajando.

> Si hoy gastás $1.000 al mes, una pensión que te dé $400–$600 te obliga a recortar tu vida justo cuando querés disfrutarla.

## Por qué pasa esto

- **Demografía:** cada vez hay más adultos mayores y menos jóvenes cotizando.
- **Tu historial:** si trabajaste informal o reportaste salarios bajos, tu pensión baja.
- **Inflación:** lo que hoy parece suficiente, en 30 años compra mucho menos.

## Qué podés hacer (sin volverte experto)

1. **No dependás de una sola pata.** El IVM + tu propio ahorro invertido es mucho más sólido que el IVM solo.
2. **Empezá temprano, aunque sea poquito.** El tiempo hace casi todo el trabajo (mirá el artículo de interés compuesto).
3. **Automatizá.** Lo que no ves, no lo gastás.

El objetivo no es asustarte. Es que llegués a los 65 con **opciones**, no con sustos.

*Esto es información educativa, no asesoría financiera.*
`.trim(),
  },

  {
    slug: 'que-es-el-sp500',
    title: 'Qué es el S&P 500 y por qué invertir en él es más simple de lo que crees',
    excerpt:
      'No tenés que escoger acciones ganadoras. Te explicamos la idea del "índice" en palabras normales.',
    minutes: 4,
    tag: 'Inversión',
    body: `
# Qué es el S&P 500

Imaginate una canasta con las **500 empresas más grandes de Estados Unidos**: Apple, Microsoft, Coca-Cola, Visa, y muchísimas más. El **S&P 500** es básicamente esa canasta, medida como un solo número.

## ¿Por qué importa?

Cuando comprás un fondo que **sigue al S&P 500** (un ETF índice), no estás apostando a una sola empresa. Estás comprando un pedacito de las 500 a la vez. Si a una le va mal pero a la canasta en general le va bien, vos seguís bien.

> Es la diferencia entre apostarle a un caballo... y ser dueño de un pedacito del hipódromo.

## Lo que lo hace simple

- **No tenés que adivinar** cuál empresa va a explotar.
- **Es diversificado por diseño:** 500 empresas, varios sectores.
- **Es barato:** los ETFs de índice cobran comisiones muy bajas.

## Lo honesto

El S&P 500 **sube y baja**. Ha tenido años de caídas fuertes. Lo que la historia muestra es que, en plazos largos (10, 20, 30 años), ha tendido a crecer. Pero **rendimientos pasados no garantizan resultados futuros**. Por eso se invierte pensando en años, no en semanas.

*Esto es información educativa, no asesoría financiera.*
`.trim(),
  },

  {
    slug: 'empezar-con-10-dolares',
    title: 'Cómo empezar a invertir con $10 desde Costa Rica',
    excerpt:
      'El monto no es la barrera. La claridad sí. Acá está el mapa para dar el primer paso.',
    minutes: 5,
    tag: 'Primeros pasos',
    body: `
# Cómo empezar a invertir con $10 desde Costa Rica

Mucha gente cree que invertir es solo para quien tiene plata de sobra. Mentira. **El hábito vale más que el monto.** $10 al mes invertidos con constancia le ganan a $0 toda la vida.

## El mapa, paso a paso

1. **Definí tu meta y tu plazo.** ¿Retiro? ¿20–40 años? Eso define cuánto riesgo tiene sentido.
2. **Apartá un monto fijo mensual.** Que no duela. $10, $25, $50 — lo que puedas sostener.
3. **Elegí un vehículo simple.** Un ETF que siga al S&P 500 es el clásico para empezar.
4. **Usá un puesto de bolsa regulado.** En Costa Rica, regulado por la **SUGEVAL**. (Mirá el artículo sobre qué significa eso.)
5. **Automatizá y olvidate.** Revisar todos los días no ayuda; a veces estorba.

## Errores comunes al arrancar

- **Esperar a "tener más plata".** El mejor momento fue ayer; el segundo mejor es hoy.
- **Querer adivinar el mejor día para entrar.** Casi nadie le atina. Aportar constante (todos los meses) le gana al estrés.
- **Sacar la plata al primer susto.** La caída solo se vuelve pérdida real cuando vendés.

## Lo que Norte sí y no hace

Norte te ayuda a **ver tu futuro y entender el camino**. No ejecutamos inversiones ni manejamos tu plata. Cuando estés listo para abrir cuenta, lo hacés con un puesto de bolsa regulado.

*Esto es información educativa, no asesoría financiera.*
`.trim(),
  },

  {
    slug: 'interes-compuesto',
    title: 'Interés compuesto: el truco aburrido que te puede cambiar la vida',
    excerpt:
      'Tu plata genera plata, y esa plata genera más plata. Suena lento. No te imaginás cuánto suma.',
    minutes: 4,
    tag: 'Conceptos',
    body: `
# Interés compuesto: el truco aburrido que te puede cambiar la vida

El interés compuesto es simple de decir y difícil de creer: **lo que ganás también empieza a ganar.** Tu plata hace plata, y esa plata nueva también hace plata. Y así, año tras año.

## Por qué se siente mágico

Al principio parece que no pasa nada. Los primeros años son lentos y aburridos. Pero la curva **se dispara hacia el final**, porque cada año arranca sobre una base más grande.

> No es que ahorrar más tarde sea malo. Es que ahorrar **temprano** vale muchísimo más, porque le das más años para componer.

## El factor que más manda: el tiempo

Dos personas invierten lo mismo al mes. Una empieza a los 25, la otra a los 35. Esos **10 años de ventaja** muchas veces valen más que duplicar el aporte mensual. El tiempo es el ingrediente que no se compra.

## Cómo aprovecharlo

- **Empezá ya**, aunque sea con poco.
- **No interrumpás** la bola de nieve sacando plata sin necesidad.
- **Reinvertí** lo que genera, en vez de gastarlo.

Probá distintos números en la calculadora de Norte y mirá cómo cambia el resultado solo con empezar unos años antes. Ahí se ve el truco.

*Esto es información educativa, no asesoría financiera.*
`.trim(),
  },

  {
    slug: 'sugeval-regulado-seguro',
    title: '¿Es legal y seguro? Lo que significa que un puesto de bolsa esté regulado por SUGEVAL',
    excerpt:
      '"Regulado" no es solo una palabra bonita. Te explicamos qué te protege y qué no.',
    minutes: 4,
    tag: 'Seguridad',
    body: `
# ¿Es legal y seguro? Qué significa "regulado por SUGEVAL"

La **SUGEVAL** (Superintendencia General de Valores) es la entidad que **supervisa el mercado de valores en Costa Rica**. Cuando un puesto de bolsa está regulado por SUGEVAL, opera bajo reglas, controles y reportes obligatorios.

## Qué te da estar con alguien regulado

- **Reglas claras:** el puesto tiene que cumplir requisitos de capital, transparencia y conducta.
- **Supervisión:** hay un ente vigilando, no es tierra de nadie.
- **Tus valores son tuyos:** en general, las inversiones se mantienen separadas del puesto de bolsa, a tu nombre.

## Qué NO significa

Estar regulado **no elimina el riesgo de mercado.** Si el S&P 500 baja, tu inversión baja — eso es normal y ningún regulador lo evita. La regulación te protege del **mal manejo y el fraude**, no de que los precios suban o bajen.

> Regulado = juego limpio y vigilado. No = ganancia garantizada.

## La señal de alerta más útil

Si alguien te promete **rendimientos fijos y altos sin riesgo**, desconfiá. Eso no existe en inversiones reales. Lo legítimo es transparente sobre el riesgo — justo como tratamos de serlo acá.

Podés conocer más en el sitio oficial de la SUGEVAL.

*Esto es información educativa, no asesoría financiera.*
`.trim(),
  },
];
