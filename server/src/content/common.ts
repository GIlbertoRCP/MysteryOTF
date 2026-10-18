import { Lang, TraitDim } from '../types.js';

/** A piece of text in both languages. Placeholders look like {name}. */
export interface T {
  en: string;
  es: string;
}

export const t = (en: string, es: string): T => ({ en, es });

export function fill(text: T, lang: Lang, params: Record<string, string | T> = {}): string {
  let out = text[lang].replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = params[key];
    if (v === undefined) return `{${key}}`;
    return typeof v === 'string' ? v : v[lang];
  });
  if (lang === 'es') {
    out = out.replace(/\bde el\b/g, 'del').replace(/\ba el\b/g, 'al').replace(/\bDe el\b/g, 'Del').replace(/\bA el\b/g, 'Al');
  }
  return capitalizeSentences(out);
}

function capitalizeSentences(s: string): string {
  return s.replace(/(^|[.!?]\s+|¿|¡)([a-záéíóúñ])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

export const LANGS: Lang[] = ['en', 'es'];

// ─── Physical traits used for deduction ──────────────────────────────────────

export interface TraitValue {
  key: string;
  /** Shown on the suspect profile, e.g. "Tall" */
  label: T;
  /** Inserted into clue sentences, e.g. "a {value} figure" */
  clue: T;
}

export const TRAITS: Record<TraitDim, TraitValue[]> = {
  height: [
    { key: 'tall', label: t('Tall', 'Alta'), clue: t('tall', 'alta') },
    { key: 'average', label: t('Average', 'Media'), clue: t('medium-height', 'de estatura media') },
    { key: 'short', label: t('Short', 'Baja'), clue: t('short', 'baja') },
  ],
  coat: [
    { key: 'black', label: t('Black coat', 'Abrigo negro'), clue: t('black', 'negro') },
    { key: 'grey', label: t('Grey coat', 'Abrigo gris'), clue: t('grey', 'gris') },
    { key: 'green', label: t('Green coat', 'Abrigo verde'), clue: t('green', 'verde') },
    { key: 'burgundy', label: t('Burgundy coat', 'Abrigo burdeos'), clue: t('burgundy', 'burdeos') },
    { key: 'camel', label: t('Camel coat', 'Abrigo color camel'), clue: t('camel', 'color camel') },
  ],
  voice: [
    { key: 'deep', label: t('Deep voice', 'Voz grave'), clue: t('deep', 'grave') },
    { key: 'soft', label: t('Soft voice', 'Voz suave'), clue: t('soft, almost whispering', 'suave, casi un susurro') },
    { key: 'hoarse', label: t('Hoarse voice', 'Voz ronca'), clue: t('hoarse', 'ronca') },
    { key: 'accented', label: t('Foreign accent', 'Acento extranjero'), clue: t('foreign-accented', 'con acento extranjero') },
  ],
  hand: [
    { key: 'left', label: t('Left', 'Izquierda'), clue: t('left', 'izquierda') },
    { key: 'right', label: t('Right', 'Derecha'), clue: t('right', 'derecha') },
  ],
  footwear: [
    { key: 'boots', label: t('Riding boots', 'Botas de montar'), clue: t('riding boots', 'botas de montar') },
    { key: 'heels', label: t('Heeled shoes', 'Zapatos de tacón'), clue: t('heeled shoes', 'zapatos de tacón') },
    { key: 'oxfords', label: t('Polished oxfords', 'Zapatos de vestir'), clue: t('polished oxfords', 'zapatos de vestir') },
    { key: 'rubber', label: t('Rubber-soled shoes', 'Suela de goma'), clue: t('rubber-soled shoes', 'zapatos de suela de goma') },
  ],
  habit: [
    { key: 'cigar', label: t('Smokes cigars', 'Fuma puros'), clue: t('flakes of cigar ash', 'restos de ceniza de puro') },
    { key: 'lavender', label: t('Wears lavender perfume', 'Usa perfume de lavanda'), clue: t('a strong scent of lavender', 'un fuerte olor a lavanda') },
    { key: 'ink', label: t('Ink-stained fingers', 'Dedos manchados de tinta'), clue: t('smudges of blue ink', 'manchas de tinta azul') },
    { key: 'cat', label: t('Owns a long-haired cat', 'Tiene un gato de pelo largo'), clue: t('long white cat hairs', 'pelos largos de gato blanco') },
    { key: 'mint', label: t('Always chewing peppermints', 'Siempre masca mentas'), clue: t('a crumpled peppermint wrapper', 'un envoltorio de menta arrugado') },
  ],
  blood: [
    { key: 'A', label: t('Type A', 'Tipo A'), clue: t('type A', 'tipo A') },
    { key: 'B', label: t('Type B', 'Tipo B'), clue: t('type B', 'tipo B') },
    { key: 'AB', label: t('Type AB', 'Tipo AB'), clue: t('type AB', 'tipo AB') },
    { key: 'O', label: t('Type O', 'Tipo O'), clue: t('type O', 'tipo O') },
  ],
};

export const TRAIT_DIM_LABELS: Record<TraitDim, T> = {
  height: t('Height', 'Estatura'),
  coat: t('Coat', 'Abrigo'),
  voice: t('Voice', 'Voz'),
  blood: t('Blood type', 'Grupo sanguíneo'),
  hand: t('Dominant hand', 'Mano dominante'),
  footwear: t('Footwear', 'Calzado'),
  habit: t('Habit', 'Hábito'),
};

// Which player can discover which trait
export const LEAD_DIMS: TraitDim[] = ['height', 'coat', 'voice'];
export const ANALYST_DIMS: TraitDim[] = ['hand', 'footwear', 'habit', 'blood'];

// ─── Motives (every suspect gets one, so motive alone never solves the case) ─

export interface Motive {
  key: string;
  label: T;
  docTitle: T;
  docSummary: T;
  doc: T;
  deflect: T;
}

export const MOTIVES: Motive[] = [
  {
    key: 'will',
    label: t('Cut out of the will', 'Excluido del testamento'),
    docTitle: t('Draft will naming {name}', 'Borrador de testamento que nombra a {name}'),
    docSummary: t('A new will, dated last week.', 'Un testamento nuevo, fechado la semana pasada.'),
    doc: t(
      "A draft of {victim}'s new will, dated last week, removes {name} as a beneficiary entirely. A note in the margin reads: \"They will be furious, but it is done.\"",
      'Un borrador del nuevo testamento de {victim}, fechado la semana pasada, excluye por completo a {name} de la herencia. Una nota al margen dice: "Le sentará fatal, pero ya está hecho."'
    ),
    deflect: t(
      'We argued about family money from time to time. Every family does.',
      'De vez en cuando discutíamos por dinero de la familia. Como en todas las familias.'
    ),
  },
  {
    key: 'debt',
    label: t('Unpayable debt', 'Una deuda impagable'),
    docTitle: t('IOU signed by {name}', 'Pagaré firmado por {name}'),
    docSummary: t('A promissory note for a staggering sum.', 'Un pagaré por una suma desorbitada.'),
    doc: t(
      'A promissory note signed by {name} for a sum they could never hope to repay. {victim} had underlined the due date twice: this Friday.',
      'Un pagaré firmado por {name} por una cantidad que jamás podría devolver. {victim} había subrayado dos veces la fecha de vencimiento: este viernes.'
    ),
    deflect: t(
      'We had a small financial arrangement. Perfectly friendly, I assure you.',
      'Teníamos un pequeño acuerdo económico. Totalmente amistoso, se lo aseguro.'
    ),
  },
  {
    key: 'blackmail',
    label: t('Being blackmailed', 'Víctima de chantaje'),
    docTitle: t("Blackmail ledger: {name}'s payments", 'Libro de chantajes: pagos de {name}'),
    docSummary: t('A hidden ledger of monthly "contributions".', 'Un libro oculto de "aportaciones" mensuales.'),
    doc: t(
      "Hidden in {victim}'s safe: compromising photographs of {name} and a ledger of monthly \"contributions\" going back three years. The latest entry demands double.",
      'Escondido en la caja fuerte de {victim}: fotografías comprometedoras de {name} y un registro de "aportaciones" mensuales de los últimos tres años. La última entrada exige el doble.'
    ),
    deflect: t(
      'I paid {victim} a visit now and then. Social calls. Nothing more.',
      'Visitaba a {victim} de vez en cuando. Visitas sociales, nada más.'
    ),
  },
  {
    key: 'affair',
    label: t('A bitter love affair', 'Un amorío que acabó mal'),
    docTitle: t('Love letters signed by {name}', 'Cartas de amor firmadas por {name}'),
    docSummary: t('A bundle of letters tied with ribbon.', 'Un fajo de cartas atadas con una cinta.'),
    doc: t(
      'A bundle of love letters from {name} to {victim}. The last one is angry and unsigned save for an initial: "You will regret ending this."',
      'Un fajo de cartas de amor de {name} a {victim}. La última está escrita con rabia y firmada solo con una inicial: "Te arrepentirás de haber terminado esto."'
    ),
    deflect: t(
      'We were close once. That was a long time ago.',
      'Una vez fuimos muy cercanos. Hace mucho tiempo de eso.'
    ),
  },
  {
    key: 'credit',
    label: t('Stolen life’s work', 'El trabajo de su vida, robado'),
    docTitle: t("{name}'s original notebooks", 'Cuadernos originales de {name}'),
    docSummary: t('Notebooks with the same ideas, written years earlier.', 'Cuadernos con las mismas ideas, escritos años antes.'),
    doc: t(
      "Notebooks in {name}'s handwriting, dated years earlier, contain the very work {victim} presented to the world as their own. {name} had circled the newspaper article praising {victim}.",
      'Cuadernos con la letra de {name}, fechados años antes, contienen el mismo trabajo que {victim} presentó al mundo como propio. {name} había marcado con un círculo el artículo de prensa que elogiaba a {victim}.'
    ),
    deflect: t(
      'I admired {victim}’s work. Everyone did.',
      'Yo admiraba el trabajo de {victim}. Todo el mundo lo hacía.'
    ),
  },
  {
    key: 'dismissal',
    label: t('About to be ruined', 'A punto de ser arruinado'),
    docTitle: t('Signed dismissal letter for {name}', 'Carta de despido firmada para {name}'),
    docSummary: t('To be delivered tomorrow morning.', 'Iba a entregarse mañana por la mañana.'),
    doc: t(
      'A dismissal letter for {name}, signed by {victim} and sealed for delivery tomorrow morning. Attached: a list of "irregularities" that would end their career for good.',
      'Una carta de despido para {name}, firmada por {victim} y sellada para entregarse mañana por la mañana. Adjunta: una lista de "irregularidades" que acabarían con su carrera para siempre.'
    ),
    deflect: t(
      'My position was secure. {victim} relied on me completely.',
      'Mi puesto estaba asegurado. {victim} confiaba en mí por completo.'
    ),
  },
  {
    key: 'revenge',
    label: t('An old family grudge', 'Un viejo rencor familiar'),
    docTitle: t('Old newspaper clipping about {name}', 'Recorte de periódico antiguo sobre {name}'),
    docSummary: t('A yellowed clipping from twenty years ago.', 'Un recorte amarillento de hace veinte años.'),
    doc: t(
      "A yellowed newspaper clipping: {victim}'s testimony sent {name}'s father to prison twenty years ago. He died there. Someone has written \"Never forget\" across the top.",
      'Un recorte de periódico amarillento: el testimonio de {victim} mandó a prisión al padre de {name} hace veinte años. Murió allí. Alguien escribió "Nunca olvides" en la parte superior.'
    ),
    deflect: t(
      'The past is the past. I have no quarrel with anyone.',
      'El pasado, pasado está. No tengo problemas con nadie.'
    ),
  },
  {
    key: 'fraud',
    label: t('About to be exposed as a fraud', 'A punto de ser desenmascarado'),
    docTitle: t("{victim}'s private notes on {name}", 'Notas privadas de {victim} sobre {name}'),
    docSummary: t('Notes for a speech planned for tomorrow.', 'Notas para un discurso previsto para mañana.'),
    doc: t(
      "{victim}'s private notes: \"{name} is not who they claim to be. The credentials are forged. I will say so publicly tomorrow.\"",
      'Notas privadas de {victim}: "{name} no es quien dice ser. Sus credenciales son falsas. Lo diré públicamente mañana."'
    ),
    deflect: t(
      '{victim} and I respected each other. Ask anyone.',
      '{victim} y yo nos respetábamos. Pregúntele a cualquiera.'
    ),
  },
];

// ─── Causes of death ─────────────────────────────────────────────────────────

export type Cause = 'blunt' | 'sharp' | 'poison' | 'strangle';

export const CAUSES: Record<Cause, { autopsy: T; slipNoun: T }> = {
  blunt: {
    autopsy: t(
      'Cause of death: a single heavy blow to the back of the head. The wound contained {trace}.',
      'Causa de la muerte: un único golpe fuerte en la nuca. La herida contenía {trace}.'
    ),
    slipNoun: t('the blow to the head', 'el golpe en la cabeza'),
  },
  sharp: {
    autopsy: t(
      'Cause of death: a deep puncture wound below the ribs. The wound edges carried {trace}.',
      'Causa de la muerte: una herida punzante profunda bajo las costillas. Los bordes de la herida tenían {trace}.'
    ),
    slipNoun: t('the stabbing', 'la puñalada'),
  },
  poison: {
    autopsy: t(
      'Cause of death: poisoning. The stomach contents contained {trace}. Onset was quick; the victim would have collapsed within minutes.',
      'Causa de la muerte: envenenamiento. El contenido del estómago tenía {trace}. El efecto fue rápido: la víctima se habría desplomado en minutos.'
    ),
    slipNoun: t('the poison', 'el veneno'),
  },
  strangle: {
    autopsy: t(
      'Cause of death: strangulation with a ligature. The furrow around the neck contained {trace}.',
      'Causa de la muerte: estrangulamiento con una ligadura. El surco alrededor del cuello contenía {trace}.'
    ),
    slipNoun: t('the strangling', 'el estrangulamiento'),
  },
};

// ─── Evidence & interview templates ──────────────────────────────────────────

export const TEXT = {
  alibiStatement: t('Claims to have been in {place} between {window}.', 'Afirma haber estado en {place} entre {window}.'),
  bio: t('{role}. {line}.', '{role}. {line}.'),

  witnessTitle: t('Witness statement: {witness}', 'Declaración de testigo: {witness}'),
  witnessSummary: t('Saw someone leaving {scene}.', 'Vio a alguien salir de {scene}.'),
  witnessDetails: t(
    '{witness} reports seeing a {value} figure hurrying out of {scene} at about {time}. The light was poor and they could not make out a face.',
    '{witness} declara haber visto una figura {value} saliendo deprisa de {scene} hacia las {time}. Había poca luz y no pudo distinguir la cara.'
  ),

  cameraSummary: t('Someone near {scene} at {time}.', 'Alguien cerca de {scene} a las {time}.'),
  cameraDetails: t(
    '{source} shows someone in a {value} coat passing near {scene} at {time}. The face is turned away from the lens.',
    '{source} muestra a alguien con un abrigo {value} pasando cerca de {scene} a las {time}. La cara está girada, lejos del objetivo.'
  ),

  recordTitle: t('Alibi check: {place}', 'Verificación de coartada: {place}'),
  recordSummary: t('Who was really in {place}?', '¿Quién estuvo realmente en {place}?'),
  recordWithNames: t(
    'Staff and guests in {place} between {window} confirm the presence of: {names}. Nobody else could be confirmed there.',
    'El personal y los invitados en {place} entre {window} confirman la presencia de: {names}. No se pudo confirmar a nadie más.'
  ),
  recordEmpty: t(
    'Nobody in {place} between {window} can confirm seeing any of the suspects there.',
    'Nadie en {place} entre {window} puede confirmar haber visto allí a ninguno de los sospechosos.'
  ),

  recordVouch: t(
    ' {accomplice} and {killer} swear they were together there the whole time.',
    ' {accomplice} y {killer} juran que estuvieron juntos allí todo el tiempo.'
  ),
  receiptTitle: t('Signed receipt: {place}', 'Recibo firmado: {place}'),
  receiptSummary: t('Signed at {time}.', 'Firmado a las {time}.'),
  receiptDetails: t(
    'A receipt from {place}, signed by {name} at {time}. The staff there remember {name} clearly.',
    'Un recibo de {place}, firmado por {name} a las {time}. El personal de allí recuerda a {name} con claridad.'
  ),
  aWhereTogether: t(
    'In {place}, with {other}. We never left each other’s side. Ask them.',
    'En {place}, con {other}. No nos separamos en ningún momento. Pregúnteselo.'
  ),

  diaryTitle: t("{victim}'s appointment book", 'Agenda de {victim}'),
  diarySummary: t('The last entry, written today.', 'La última entrada, escrita hoy.'),
  diaryDetails: t(
    'The final entry, in a hurried hand: "{start}, {scene}. Meeting I cannot postpone. It ends tonight." The name of the person has been scratched out.',
    'La última entrada, con letra apresurada: "{start}, {scene}. Una reunión que no puedo aplazar. Esta noche se acaba." El nombre de la persona está tachado.'
  ),

  autopsyTitle: t('Autopsy report: {victim}', 'Informe de autopsia: {victim}'),
  autopsySummary: t('Official cause and time of death.', 'Causa y hora oficiales de la muerte.'),
  autopsyDetails: t(
    "Time of death: between {window}. The victim's watch broke in the fall and stopped at {tod}. {cause}",
    'Hora de la muerte: entre {window}. El reloj de la víctima se rompió en la caída y se paró a las {tod}. {cause}'
  ),

  sightingTitle: t('Statement: {witness} saw {name}', 'Declaración: {witness} vio a {name}'),
  sightingSummary: t('{name} in {place} at {time}.', '{name} en {place} a las {time}.'),
  sightingDetails: t(
    '{witness} spoke with {name} in {place} at {time} and remembers glancing at the clock. Check the floor plan for how far that is from {scene}.',
    '{witness} habló con {name} en {place} a las {time} y recuerda haber mirado el reloj. Consulten en el plano a qué distancia está de {scene}.'
  ),

  smudgeTitle: t("Partial prints on the victim's lapel", 'Huellas parciales en la solapa de la víctima'),
  smudgeSummary: t('Someone grabbed the victim.', 'Alguien agarró a la víctima.'),
  smudgeDetails: t(
    "Faint prints on the victim's lapel show the culprit grabbed them with their {value} hand: the thumb on one side, four fingers on the other. The killer was close enough to touch.",
    'Unas huellas tenues en la solapa de la víctima muestran que quien lo hizo la agarró con la mano {value}: el pulgar a un lado y cuatro dedos al otro. El asesino estuvo lo bastante cerca como para tocarla.'
  ),

  shoeprintTitle: t('Shoeprint cast', 'Molde de pisada'),
  shoeprintSummary: t('A clear print near the body.', 'Una pisada clara junto al cuerpo.'),
  shoeprintDetails: t(
    'A clear print in {floor} next to the body. The tread and heel shape match {value}.',
    'Una pisada clara en {floor} junto al cuerpo. El dibujo de la suela y la forma del tacón coinciden con {value}.'
  ),

  traceTitle: t('Trace evidence on the body', 'Rastros en el cuerpo'),
  traceSummary: t("Something left on the victim's clothes.", 'Algo quedó en la ropa de la víctima.'),
  traceDetails: t(
    "The lab recovered {value} from the victim's collar and sleeve. The victim had no such habit.",
    'El laboratorio encontró {value} en el cuello y la manga de la víctima. La víctima no tenía ese hábito.'
  ),

  phoneSummary: t('A call from near {scene} at {time}.', 'Una llamada desde cerca de {scene} a las {time}.'),
  phoneDetails: t(
    '{source}: at {time} someone placed a short call from near {scene} and hung up without giving a name. The operator remembers a {value} voice.',
    '{source}: a las {time} alguien hizo una llamada breve desde cerca de {scene} y colgó sin dar su nombre. La operadora recuerda una voz {value}.'
  ),

  scrapingsTitle: t("Scrapings from under the victim's nails", 'Raspados de las uñas de la víctima'),
  scrapingsSummary: t('The victim fought back.', 'La víctima se defendió.'),
  scrapingsDetails: t(
    "The victim fought back. Skin and blood recovered from under the fingernails are not the victim's own: the blood is {value}.",
    'La víctima se defendió. La piel y la sangre encontradas bajo sus uñas no son suyas: la sangre es {value}.'
  ),

  weaponTitle: t('Recovered item: {weapon}', 'Objeto recuperado: {weapon}'),
  weaponSummary: t('Found in {place}.', 'Lugar del hallazgo: {place}.'),
  weaponDetails: t('Found in {place}. {desc}', 'Lugar del hallazgo: {place}. {desc}'),

  // Interview
  qWhere: t('Where were you between {window}?', '¿Dónde estaba entre {window}?'),
  aWhere: t('In {place}, the whole time. Ask anyone who was there.', 'En {place}, todo el tiempo. Pregúntele a cualquiera que estuviera allí.'),
  qRelation: t('What was your relationship with {victim}?', '¿Qué relación tenía con {victim}?'),
  qHeard: t('How did you hear about the death?', '¿Cómo se enteró de la muerte?'),
  aHeardInnocent: t(
    'When the alarm went up, like everyone else. Nobody has told us how it happened.',
    'Cuando sonó la alarma, como todos. Nadie nos ha dicho cómo ocurrió.'
  ),
  aHeardSlip: t(
    'When the alarm went up. When I heard about {cause}, I could barely stand. Who would do such a thing?',
    'Cuando sonó la alarma. Cuando supe lo de {cause}, casi me desmayo. ¿Quién haría algo así?'
  ),
  qNoticed: t('Did you notice anything unusual tonight?', '¿Notó algo extraño esta noche?'),
  aNoticedFrame: t(
    'Now that you mention it, I saw {other} near {scene} earlier. They looked nervous.',
    'Ahora que lo menciona, vi a {other} cerca de {scene} antes. Iba con prisa y no quiso hablar.'
  ),
  aNoticedTrue: t(
    'I noticed {value} in the hallway near {scene}. It struck me as odd.',
    'Noté {value} en el pasillo cerca de {scene}. Me pareció raro.'
  ),
  aNoticedNothing: t(
    'Nothing. I kept to myself all evening.',
    'Nada. Estuve a lo mío toda la noche.'
  ),

  hintAlibi: t('The alibi checks clear {names}. Cross them off.', 'Las verificaciones de coartada descartan a {names}. Táchenlos.'),
  hintAlibiNone: t('No alibi check clears anyone this time. Rely on the physical clues.', 'Esta vez ninguna coartada descarta a nadie. Confíen en las pistas físicas.'),
  hintWeapon: t('Compare the autopsy with the recovered items. It was not {names}.', 'Comparen la autopsia con los objetos recuperados. No fue {names}.'),
  hintClue: t('“{title}” rules out {names}.', '«{title}» descarta a {names}.'),
  hintSlip: t('Ask the remaining suspects how they heard about the death. Listen for details nobody should know yet.', 'Pregunten a los sospechosos restantes cómo se enteraron de la muerte. Atentos a detalles que nadie debería conocer aún.'),
  hintMotive: t('Once you know who did it, look for the document that names them. That is the motive.', 'Cuando sepan quién fue, busquen el documento que lo nombra. Ese es el móvil.'),

  explanationAccomplice: t(
    ' {accomplice} lied to give them an alibi, but a receipt put {accomplice} in {receiptPlace} at the time.',
    ' {accomplice} mintió para darle una coartada, pero un recibo situaba a {accomplice} en {receiptPlace} a esa hora.'
  ),

  explanation: t(
    '{killer} killed {victim} with {weapon}. Motive: {motive}. They claimed to be in {place}, but nobody there could vouch for them.',
    '{killer} mató a {victim} con {weapon}. Móvil: {motive}. Dijo estar en {place}, pero nadie allí pudo confirmarlo.'
  ),
};

export const NOTICED_TRUE_DIMS: TraitDim[] = ['habit'];
