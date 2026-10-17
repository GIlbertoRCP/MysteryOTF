import { ThemeKey } from '../types.js';
import { T, t, Cause } from './common.js';

export interface Place {
  /** With article, lowercase: "the library" / "la biblioteca" */
  name: T;
  /** Title form: "Library" / "Biblioteca" */
  label: T;
}

export interface SuspectSeed {
  name: string;
  role: T;
}

export interface Weapon {
  key: string;
  name: T;
  label: T;
  cause: Cause;
  trace: T;
  desc: T;
}

export interface Theme {
  titles: T[];
  victims: { name: string; occupation: T }[];
  scenes: Place[];
  alibiPlaces: Place[];
  witnesses: Place[];
  cameras: T[];
  floor: T;
  /** Who logged the anonymous call */
  phone: T;
  suspects: SuspectSeed[];
  bioLines: T[];
  weapons: Weapon[];
  synopsis: T;
}

const p = (enName: string, esName: string, enLabel: string, esLabel: string): Place => ({
  name: t(enName, esName),
  label: t(enLabel, esLabel),
});

export const THEMES: Record<ThemeKey, Theme> = {
  // ─── Gothic manor, 1920s England ──────────────────────────────────────────
  gothic: {
    titles: [
      t('Death at Blackwood Manor', 'Muerte en la mansión Blackwood'),
      t('The Silence of Thorne Hall', 'El silencio de Thorne Hall'),
      t('A Storm over Ravenscourt', 'Tormenta sobre Ravenscourt'),
    ],
    victims: [
      { name: 'Lord Arthur Pendleton', occupation: t('shipping magnate', 'magnate naviero') },
      { name: 'Lady Eleanor Vance', occupation: t('art collector', 'coleccionista de arte') },
      { name: 'Baron Hector Thorne', occupation: t('retired judge', 'juez retirado') },
      { name: 'Margaret Ashby', occupation: t('bestselling novelist', 'novelista de éxito') },
    ],
    scenes: [
      p('the library', 'la biblioteca', 'Library', 'Biblioteca'),
      p('the conservatory', 'el invernadero', 'Conservatory', 'Invernadero'),
      p('the wine cellar', 'la bodega', 'Wine Cellar', 'Bodega'),
      p('the study', 'el despacho', 'Study', 'Despacho'),
    ],
    alibiPlaces: [
      p('the billiard room', 'la sala de billar', 'Billiard Room', 'Sala de billar'),
      p('the drawing room', 'el salón', 'Drawing Room', 'Salón'),
      p('the kitchen', 'la cocina', 'Kitchen', 'Cocina'),
      p('the chapel', 'la capilla', 'Chapel', 'Capilla'),
      p('the music room', 'la sala de música', 'Music Room', 'Sala de música'),
    ],
    witnesses: [
      p('the gardener', 'el jardinero', 'The Gardener', 'El jardinero'),
      p('the scullery maid', 'la ayudante de cocina', 'The Scullery Maid', 'La ayudante de cocina'),
      p('the chauffeur', 'el chófer', 'The Chauffeur', 'El chófer'),
    ],
    cameras: [
      t("A guest's flash photograph", 'Una fotografía con flash de un invitado'),
      t("The society photographer's plate", 'Una placa del fotógrafo de sociedad'),
    ],
    floor: t('the dust on the parquet floor', 'el polvo del parqué'),
    phone: t('The village telephone exchange', 'La centralita telefónica del pueblo'),
    suspects: [
      { name: 'Dr. Evelyn Reed', role: t('Family physician', 'Médica de la familia') },
      { name: 'Julian Thorne', role: t('Disinherited nephew', 'Sobrino desheredado') },
      { name: 'Clara Bell', role: t('Private secretary', 'Secretaria personal') },
      { name: 'Marcus Vance', role: t('Business rival', 'Rival de negocios') },
      { name: 'Genevieve Noir', role: t('Paid companion', 'Dama de compañía') },
      { name: 'Colonel Garrison Ford', role: t('Old army friend', 'Viejo amigo del ejército') },
      { name: 'Agatha Crane', role: t('Housekeeper', 'Ama de llaves') },
      { name: 'Rupert Hale', role: t('Family solicitor', 'Abogado de la familia') },
    ],
    bioLines: [
      t('Has spent every summer at the manor for twenty years', 'Ha pasado todos los veranos en la mansión durante veinte años'),
      t('Was overheard arguing with {victim} three days ago', 'Se le oyó discutir con {victim} hace tres días'),
      t("Knows every servants' passage in the house", 'Conoce todos los pasillos del servicio de la casa'),
      t('Arrived unexpectedly the night before', 'Llegó de improviso la noche anterior'),
      t('Is rumoured to have money troubles', 'Se rumorea que tiene problemas de dinero'),
    ],
    weapons: [
      {
        key: 'candlestick', cause: 'blunt',
        name: t('the brass candlestick', 'el candelabro de latón'),
        label: t('Brass candlestick', 'Candelabro de latón'),
        trace: t('tiny flecks of brass', 'diminutas partículas de latón'),
        desc: t('Heavy, solid brass. The base has been wiped, but not well.', 'Pesado, de latón macizo. Alguien limpió la base, aunque no muy bien.'),
      },
      {
        key: 'poker', cause: 'blunt',
        name: t('the fireplace poker', 'el atizador'),
        label: t('Fireplace poker', 'Atizador'),
        trace: t('flakes of rust and soot', 'escamas de óxido y hollín'),
        desc: t('Wrought iron, flaked with rust and soot from years of use.', 'De hierro forjado, con óxido y hollín de años de uso.'),
      },
      {
        key: 'letter_opener', cause: 'sharp',
        name: t('the silver letter opener', 'el abrecartas de plata'),
        label: t('Silver letter opener', 'Abrecartas de plata'),
        trace: t('traces of tarnished silver', 'restos de plata ennegrecida'),
        desc: t('Sterling silver, slightly tarnished. Its tip is unusually sharp.', 'De plata de ley, algo ennegrecida. Su punta es inusualmente afilada.'),
      },
      {
        key: 'sherry', cause: 'poison',
        name: t('the decanter of sherry', 'la licorera de jerez'),
        label: t('Decanter of sherry', 'Licorera de jerez'),
        trace: t('arsenic', 'arsénico'),
        desc: t('Half empty. The remaining sherry tests positive for arsenic.', 'Medio vacía. El jerez restante da positivo en arsénico.'),
      },
      {
        key: 'rat_poison', cause: 'poison',
        name: t('the tin of rat poison', 'la lata de raticida'),
        label: t('Tin of rat poison', 'Lata de raticida'),
        trace: t('strychnine', 'estricnina'),
        desc: t("From the gardener's shed and nearly empty. The active ingredient is strychnine.", 'Del cobertizo del jardinero y casi vacía. El principio activo es estricnina.'),
      },
      {
        key: 'cord', cause: 'strangle',
        name: t('the velvet curtain cord', 'el cordón de terciopelo'),
        label: t('Velvet curtain cord', 'Cordón de terciopelo'),
        trace: t('crimson velvet fibres', 'fibras de terciopelo carmesí'),
        desc: t('Cut from a set of curtains. Crimson velvet, frayed at both ends.', 'Cortado de unas cortinas. Terciopelo carmesí, deshilachado en ambos extremos.'),
      },
    ],
    synopsis: t(
      'Rain lashes the manor. Shortly after the storm cut the power, {victim} ({occupation}) was found dead in {scene}. The doctor puts the death between {window}. The roads are flooded and nobody has left. {count} people inside the house had a reason to want {victim} gone, and one of them acted on it.',
      'La lluvia azota la mansión. Poco después de que la tormenta cortara la luz, el cuerpo de {victim} ({occupation}) apareció en {scene}. El médico sitúa la muerte entre {window}. Los caminos están inundados y nadie se ha ido. {count} personas de la casa tenían motivos para quitar de en medio a {victim}, y una de ellas pasó a la acción.'
    ),
  },

  // ─── Cyberpunk megatower, 2089 ────────────────────────────────────────────
  cyber: {
    titles: [
      t('Flatline at Helix Tower', 'Línea plana en la Torre Helix'),
      t('The Ghost in Sector 7', 'El fantasma del Sector 7'),
      t('Neon Requiem', 'Réquiem de neón'),
    ],
    victims: [
      { name: 'Dr. Kaelen Voss', occupation: t('chief neural engineer', 'ingeniera neural jefa') },
      { name: 'Seraphina Lin', occupation: t('quantum data broker', 'bróker de datos cuánticos') },
      { name: 'Marcus Kane', occupation: t('CEO of Helix Biotech', 'CEO de Helix Biotech') },
      { name: 'Ozymandias Reyes', occupation: t('AI ethics auditor', 'auditor de ética de IA') },
    ],
    scenes: [
      p('the server vault', 'la bóveda de servidores', 'Server Vault', 'Bóveda de servidores'),
      p('the penthouse holo-suite', 'la suite holográfica del ático', 'Holo-Suite', 'Suite holográfica'),
      p('the cryo lab', 'el laboratorio criogénico', 'Cryo Lab', 'Laboratorio criogénico'),
      p('the sky garden', 'el jardín de altura', 'Sky Garden', 'Jardín de altura'),
    ],
    alibiPlaces: [
      p('the VR lounge', 'la sala de realidad virtual', 'VR Lounge', 'Sala de realidad virtual'),
      p('the noodle bar on level 40', 'el bar de fideos de la planta 40', 'Level 40 Noodle Bar', 'Bar de fideos (planta 40)'),
      p('the security hub', 'el centro de seguridad', 'Security Hub', 'Centro de seguridad'),
      p('the gym', 'el gimnasio', 'Gym', 'Gimnasio'),
      p('the rooftop hangar', 'el hangar de la azotea', 'Rooftop Hangar', 'Hangar de la azotea'),
    ],
    witnesses: [
      p('a maintenance drone operator', 'un operador de drones de mantenimiento', 'Drone Operator', 'Operador de drones'),
      p('the night janitor', 'la conserje de noche', 'Night Janitor', 'La conserje de noche'),
      p('a delivery courier', 'un repartidor', 'Delivery Courier', 'Repartidor'),
    ],
    cameras: [
      t('Corridor camera 7', 'La cámara del pasillo 7'),
      t("A patrol drone's footage", 'La grabación de un dron de patrulla'),
    ],
    floor: t('the anti-static floor coating', 'el recubrimiento antiestático del suelo'),
    phone: t('The tower comm-net log', 'El registro de comunicaciones de la torre'),
    suspects: [
      { name: 'Nova Sato', role: t('Rogue AI researcher', 'Investigadora de IA renegada') },
      { name: 'Dex Harlan', role: t('Head of corporate security', 'Jefe de seguridad corporativa') },
      { name: 'Mira Okafor', role: t('Cybernetic surgeon', 'Cirujana cibernética') },
      { name: 'Viktor Kade', role: t('Hostile-takeover lawyer', 'Abogado de adquisiciones hostiles') },
      { name: 'Juno Park', role: t('Netrunner on retainer', 'Hacker a sueldo') },
      { name: 'Silas Wren', role: t('Disgraced co-founder', 'Cofundador caído en desgracia') },
      { name: 'Lena Marsh', role: t('Android technician', 'Técnica de androides') },
      { name: 'Rafe Moreau', role: t('Venture capitalist', 'Inversor de capital riesgo') },
    ],
    bioLines: [
      t('Holds level-5 clearance to every floor of the tower', 'Tiene acreditación de nivel 5 para todas las plantas de la torre'),
      t("Was the last person to access {victim}'s encrypted drive", 'Fue la última persona en acceder al disco cifrado de {victim}'),
      t('Has a neural implant that the tower AI cannot track', 'Lleva un implante neural que la IA de la torre no puede rastrear'),
      t('Filed a formal complaint against {victim} last month', 'Presentó una queja formal contra {victim} el mes pasado'),
      t('Is rumoured to sell secrets to rival corporations', 'Se rumorea que vende secretos a corporaciones rivales'),
    ],
    weapons: [
      {
        key: 'rail', cause: 'blunt',
        name: t('the titanium rack rail', 'el riel de titanio'),
        label: t('Titanium rack rail', 'Riel de titanio'),
        trace: t('fine titanium dust', 'polvo fino de titanio'),
        desc: t('A loose rail from a server rack. Dense titanium, dented at one end.', 'Un riel suelto de un rack de servidores. Titanio denso, abollado en un extremo.'),
      },
      {
        key: 'trophy', cause: 'blunt',
        name: t('the chrome innovation award', 'el premio a la innovación'),
        label: t('Chrome innovation award', 'Premio a la innovación'),
        trace: t('chips of chrome plating', 'esquirlas de cromado'),
        desc: t('A heavy chrome-plated trophy. The plating is chipped on one corner.', 'Un trofeo pesado y cromado. El cromado está desconchado en una esquina.'),
      },
      {
        key: 'scalpel', cause: 'sharp',
        name: t('the ceramic scalpel', 'el bisturí de cerámica'),
        label: t('Ceramic scalpel', 'Bisturí de cerámica'),
        trace: t('ceramic micro-shards', 'microfragmentos de cerámica'),
        desc: t('Surgical grade and invisible to metal detectors. The blade is slightly chipped.', 'De grado quirúrgico e invisible a los detectores de metal. La hoja está algo mellada.'),
      },
      {
        key: 'injector', cause: 'poison',
        name: t('the auto-injector', 'el autoinyector'),
        label: t('Auto-injector', 'Autoinyector'),
        trace: t('synthetic tetrodotoxin', 'tetrodotoxina sintética'),
        desc: t('The cartridge is empty. Residue analysis: synthetic tetrodotoxin.', 'El cartucho está vacío. Análisis de residuos: tetrodotoxina sintética.'),
      },
      {
        key: 'energy_drink', cause: 'poison',
        name: t('the energy drink can', 'la lata de bebida energética'),
        label: t('Energy drink can', 'Lata de bebida energética'),
        trace: t('a lethal dose of digoxin', 'una dosis letal de digoxina'),
        desc: t('Found half-finished. The lab detects a heavy dose of digoxin.', 'Encontrada a medio beber. El laboratorio detecta una dosis alta de digoxina.'),
      },
      {
        key: 'cable', cause: 'strangle',
        name: t('the fibre-optic cable', 'el cable de fibra óptica'),
        label: t('Fibre-optic cable', 'Cable de fibra óptica'),
        trace: t('glass micro-fibres', 'microfibras de vidrio'),
        desc: t('A metre of armoured fibre-optic cable, its sheath scuffed.', 'Un metro de cable de fibra óptica blindado, con la funda raspada.'),
      },
    ],
    synopsis: t(
      "Between {window}, Helix Tower's medical net registered a flatline. {victim} ({occupation}) was found in {scene}. Seconds later the tower sealed itself: no one in, no one out. {count} people with clearance are still inside, and one of them has already wiped their tracks once.",
      'Entre {window}, la red médica de la Torre Helix registró una línea plana. El cuerpo de {victim} ({occupation}) apareció en {scene}. Segundos después, la torre se selló: nadie entra, nadie sale. {count} personas con acceso siguen dentro, y una de ellas ya ha borrado su rastro una vez.'
    ),
  },

  // ─── Opera house, 1890s ───────────────────────────────────────────────────
  opera: {
    titles: [
      t('The Final Aria', 'El aria final'),
      t('Death at the Velvet Opera', 'Muerte en la Ópera de Terciopelo'),
      t('Curtain Call for a Corpse', 'Telón para un cadáver'),
    ],
    victims: [
      { name: 'Maestro Julian Mercer', occupation: t('conductor', 'director de orquesta') },
      { name: 'Vivian Montgomery', occupation: t('prima donna', 'prima donna') },
      { name: 'Clara Bellini', occupation: t('wealthy patron', 'mecenas adinerada') },
      { name: 'Lorenzo Vitti', occupation: t('impresario', 'empresario teatral') },
    ],
    scenes: [
      p("the star's dressing room", 'el camerino principal', "Star's Dressing Room", 'Camerino principal'),
      p('the royal box', 'el palco real', 'Royal Box', 'Palco real'),
      p('the orchestra pit', 'el foso de la orquesta', 'Orchestra Pit', 'Foso de la orquesta'),
      p('the fly gallery', 'la galería de tramoya', 'Fly Gallery', 'Galería de tramoya'),
    ],
    alibiPlaces: [
      p('the green room', 'la sala de descanso', 'Green Room', 'Sala de descanso'),
      p('the costume workshop', 'el taller de vestuario', 'Costume Workshop', 'Taller de vestuario'),
      p('the grand foyer', 'el gran vestíbulo', 'Grand Foyer', 'Gran vestíbulo'),
      p('the rehearsal hall', 'la sala de ensayo', 'Rehearsal Hall', 'Sala de ensayo'),
      p('the café across the street', 'el café de enfrente', 'Café Across the Street', 'Café de enfrente'),
    ],
    witnesses: [
      p('a stagehand', 'un tramoyista', 'Stagehand', 'Tramoyista'),
      p('the prompter', 'la apuntadora', 'The Prompter', 'La apuntadora'),
      p('an usher', 'un acomodador', 'Usher', 'Acomodador'),
    ],
    cameras: [
      t("A press photographer's plate", 'Una placa del fotógrafo de prensa'),
      t("A chorus singer's sketchbook", 'El cuaderno de bocetos de una corista'),
    ],
    floor: t('the rosin dust on the stage boards', 'el polvo de resina sobre las tablas'),
    phone: t('The backstage telephone log', 'El registro del teléfono de bastidores'),
    suspects: [
      { name: 'Isadora Fenn', role: t('Understudy', 'Suplente') },
      { name: 'Rocco Malvezzi', role: t('Jealous baritone', 'Barítono celoso') },
      { name: 'Henrietta Pryce', role: t('Head of costumes', 'Jefa de vestuario') },
      { name: 'Felix Marchetti', role: t('Composer', 'Compositor') },
      { name: 'Odile Laurent', role: t('Ballet mistress', 'Maestra de ballet') },
      { name: 'Bertrand Achebe', role: t('Theatre critic', 'Crítico teatral') },
      { name: 'Rosa Calvi', role: t('Theatre owner', 'Dueña del teatro') },
      { name: 'Teodor Brandt', role: t('Stage manager', 'Regidor de escena') },
    ],
    bioLines: [
      t('Has worked in this theatre since childhood', 'Trabaja en este teatro desde la infancia'),
      t('Was heard shouting at {victim} after the dress rehearsal', 'Se le oyó gritarle a {victim} después del ensayo general'),
      t('Has a key to every door backstage', 'Tiene la llave de todas las puertas entre bastidores'),
      t('Lost the lead role to someone {victim} favoured', 'Perdió el papel protagonista frente a alguien a quien {victim} favorecía'),
      t('Is said to have staggering gambling debts', 'Se dice que tiene enormes deudas de juego'),
    ],
    weapons: [
      {
        key: 'counterweight', cause: 'blunt',
        name: t('the stage counterweight', 'el contrapeso del escenario'),
        label: t('Stage counterweight', 'Contrapeso del escenario'),
        trace: t('hemp fibres and grains of sand', 'fibras de cáñamo y granos de arena'),
        desc: t('A sandbag counterweight from the fly system, its hemp rope cut.', 'Un saco de arena del sistema de tramoya, con la cuerda de cáñamo cortada.'),
      },
      {
        key: 'bust', cause: 'blunt',
        name: t('the bronze bust of Verdi', 'el busto de bronce de Verdi'),
        label: t('Bronze bust of Verdi', 'Busto de bronce de Verdi'),
        trace: t('green flecks of bronze patina', 'partículas verdes de pátina de bronce'),
        desc: t('A heavy bronze bust from the foyer. Some of its green patina has rubbed off.', 'Un pesado busto de bronce del vestíbulo. Parte de su pátina verde se ha desprendido.'),
      },
      {
        key: 'rapier', cause: 'sharp',
        name: t('the prop rapier', 'el estoque de utilería'),
        label: t('Prop rapier', 'Estoque de utilería'),
        trace: t('fresh steel filings', 'limaduras de acero recientes'),
        desc: t('A prop rapier that someone has secretly sharpened. Fresh filings cling to the blade.', 'Un estoque de utilería que alguien afiló en secreto. Hay limaduras recientes en la hoja.'),
      },
      {
        key: 'hatpin', cause: 'sharp',
        name: t('the jewelled hatpin', 'el alfiler de sombrero'),
        label: t('Jewelled hatpin', 'Alfiler de sombrero'),
        trace: t('flecks of gilt', 'partículas de dorado'),
        desc: t('Eight inches long with a gilt head, the gilt worn thin.', 'De veinte centímetros, con cabeza dorada y el dorado desgastado.'),
      },
      {
        key: 'throat_spray', cause: 'poison',
        name: t('the throat spray', 'el espray para la garganta'),
        label: t('Throat spray', 'Espray para la garganta'),
        trace: t('belladonna', 'belladona'),
        desc: t("A singer's throat spray. The lab finds belladonna mixed into the glycerine.", 'Un espray de cantante. El laboratorio encuentra belladona mezclada con la glicerina.'),
      },
      {
        key: 'scarf', cause: 'strangle',
        name: t('the silk scarf', 'el pañuelo de seda'),
        label: t('Silk scarf', 'Pañuelo de seda'),
        trace: t('ivory silk fibres', 'fibras de seda color marfil'),
        desc: t('Ivory silk, stretched and torn at the middle.', 'Seda color marfil, estirada y rasgada por el centro.'),
      },
    ],
    synopsis: t(
      'The final curtain fell to thunderous applause, but {victim} ({occupation}) never took a bow. The body was discovered in {scene}, and the house doctor puts the death between {window}. The police have sealed the theatre. {count} members of the company are under suspicion, and every one of them knows how to act.',
      'El último telón cayó entre aplausos atronadores, pero {victim} ({occupation}) nunca salió a saludar. El cuerpo apareció en {scene} y el médico del teatro sitúa la muerte entre {window}. La policía ha precintado el teatro. {count} miembros de la compañía están bajo sospecha, y todos saben actuar.'
    ),
  },

  // ─── Casino, 1950s Las Vegas ──────────────────────────────────────────────
  casino: {
    titles: [
      t('Last Hand at Casino Noir', 'La última mano en el Casino Noir'),
      t('Snake Eyes', 'Ojos de serpiente'),
      t('The House Always Wins', 'La banca siempre gana'),
    ],
    victims: [
      { name: 'Vincent "Lucky" Sterling', occupation: t('casino owner', 'dueño del casino') },
      { name: 'Cassandra Dupont', occupation: t('high roller', 'gran apostadora') },
      { name: 'Dominic Vance', occupation: t('mob accountant', 'contable de la mafia') },
      { name: 'Rosalind Cho', occupation: t('floor boss', 'jefa de sala') },
    ],
    scenes: [
      p('the high-limit room', 'la sala de apuestas altas', 'High-Limit Room', 'Sala de apuestas altas'),
      p('the counting room', 'la sala de recuento', 'Counting Room', 'Sala de recuento'),
      p('the penthouse suite', 'la suite del ático', 'Penthouse Suite', 'Suite del ático'),
      p('the rooftop lounge', 'la terraza del ático', 'Rooftop Lounge', 'Terraza del ático'),
    ],
    alibiPlaces: [
      p('the blackjack pit', 'la zona de blackjack', 'Blackjack Pit', 'Zona de blackjack'),
      p('the showroom', 'la sala de espectáculos', 'Showroom', 'Sala de espectáculos'),
      p('the steakhouse', 'el asador', 'Steakhouse', 'Asador'),
      p('the barber shop', 'la barbería', 'Barber Shop', 'Barbería'),
      p('the parking garage', 'el aparcamiento', 'Parking Garage', 'Aparcamiento'),
    ],
    witnesses: [
      p('a cocktail waitress', 'una camarera de cócteles', 'Cocktail Waitress', 'Camarera de cócteles'),
      p('the valet', 'el aparcacoches', 'The Valet', 'El aparcacoches'),
      p('a croupier', 'un crupier', 'Croupier', 'Crupier'),
    ],
    cameras: [
      t('The eye-in-the-sky camera over table 11', 'La cámara del techo sobre la mesa 11'),
      t("A tourist's souvenir photo", 'Una foto de recuerdo de un turista'),
    ],
    floor: t('the spilled champagne on the marble', 'el champán derramado sobre el mármol'),
    phone: t('The casino switchboard', 'La centralita del casino'),
    suspects: [
      { name: 'Frankie DeLuca', role: t('Pit boss', 'Jefe de mesas') },
      { name: 'Ruby Valentine', role: t('Lounge singer', 'Cantante del salón') },
      { name: 'Sal Moretti', role: t('Loan shark', 'Prestamista') },
      { name: 'Delilah Shaw', role: t('Card counter', 'Contadora de cartas') },
      { name: 'Eddie Kwan', role: t('Security guard', 'Guardia de seguridad') },
      { name: 'Gloria Ashford', role: t('Showgirl', 'Corista') },
      { name: 'Nicky Bloom', role: t('Stage magician', 'Mago de escenario') },
      { name: 'Ivy Lockhart', role: t('Bookkeeper', 'Contable') },
    ],
    bioLines: [
      t('Knows where every camera in the building points', 'Sabe hacia dónde apunta cada cámara del edificio'),
      t('Was seen in a heated whisper with {victim} at the bar', 'Se le vio discutir en voz baja con {victim} en la barra'),
      t('Has lost more at these tables than they will admit', 'Ha perdido en estas mesas más de lo que admite'),
      t('Has a master keycard nobody remembers issuing', 'Tiene una tarjeta maestra que nadie recuerda haber emitido'),
      t('Is said to work for the Chicago outfit', 'Se dice que trabaja para la mafia de Chicago'),
    ],
    weapons: [
      {
        key: 'ashtray', cause: 'blunt',
        name: t('the crystal ashtray', 'el cenicero de cristal'),
        label: t('Crystal ashtray', 'Cenicero de cristal'),
        trace: t('slivers of lead crystal', 'esquirlas de cristal tallado'),
        desc: t('Heavy lead crystal, with a sliver chipped from the rim.', 'De pesado cristal tallado, con una esquirla rota en el borde.'),
      },
      {
        key: 'slot_handle', cause: 'blunt',
        name: t('the slot-machine handle', 'la palanca de la tragaperras'),
        label: t('Slot-machine handle', 'Palanca de tragaperras'),
        trace: t('tiny flecks of brass', 'diminutas partículas de latón'),
        desc: t('Wrenched off a broken slot machine. Solid brass.', 'Arrancada de una tragaperras averiada. Latón macizo.'),
      },
      {
        key: 'ice_pick', cause: 'sharp',
        name: t("the bar's ice pick", 'el picahielo del bar'),
        label: t('Ice pick', 'Picahielo'),
        trace: t('specks of stainless steel', 'motas de acero inoxidable'),
        desc: t('From the main bar. Stainless steel, rinsed under a tap.', 'De la barra principal. Acero inoxidable, enjuagado bajo un grifo.'),
      },
      {
        key: 'martini', cause: 'poison',
        name: t('the martini glass', 'la copa de martini'),
        label: t('Martini glass', 'Copa de martini'),
        trace: t('cyanide', 'cianuro'),
        desc: t('The olive is still in it. The dregs test positive for cyanide.', 'Aún tiene la aceituna. Los restos dan positivo en cianuro.'),
      },
      {
        key: 'whisky', cause: 'poison',
        name: t('the whisky tumbler', 'el vaso de whisky'),
        label: t('Whisky tumbler', 'Vaso de whisky'),
        trace: t('a massive dose of barbiturates', 'una dosis masiva de barbitúricos'),
        desc: t('A chalky residue at the bottom: crushed barbiturates.', 'Un residuo blanquecino en el fondo: barbitúricos triturados.'),
      },
      {
        key: 'piano_wire', cause: 'strangle',
        name: t('the length of piano wire', 'el trozo de cuerda de piano'),
        label: t('Piano wire', 'Cuerda de piano'),
        trace: t('steel wire burrs', 'rebabas de alambre de acero'),
        desc: t('Cut from the lounge piano. Steel, with burrs along one end.', 'Cortada del piano del salón. Acero, con rebabas en un extremo.'),
      },
    ],
    synopsis: t(
      'The dice were still rolling downstairs when security found {victim} ({occupation}) dead in {scene}. The house doctor puts the death between {window}. The casino never closes, but tonight the doors are locked. {count} people had access, debts and secrets. Follow the money before it disappears into the vault.',
      'Los dados seguían rodando en la planta baja cuando seguridad encontró el cuerpo de {victim} ({occupation}) en {scene}. El médico de la casa sitúa la muerte entre {window}. El casino nunca cierra, pero esta noche las puertas están cerradas. {count} personas tenían acceso, deudas y secretos. Sigan el dinero antes de que desaparezca en la cámara acorazada.'
    ),
  },

  // ─── Orient Express, 1934 ─────────────────────────────────────────────────
  express: {
    titles: [
      t('Murder in the Snow', 'Asesinato en la nieve'),
      t('The Midnight Express', 'El expreso de medianoche'),
      t('Last Stop: Belgrade', 'Última parada: Belgrado'),
    ],
    victims: [
      { name: 'Ambassador Montgomery Bell', occupation: t('diplomat', 'diplomático') },
      { name: 'Duchess Helene Vane', occupation: t('exiled aristocrat', 'aristócrata exiliada') },
      { name: 'Captain Sterling Thorne', occupation: t('retired officer', 'oficial retirado') },
      { name: 'Irina Volkova', occupation: t('jewel dealer', 'comerciante de joyas') },
    ],
    scenes: [
      p('compartment 7', 'el compartimento 7', 'Compartment 7', 'Compartimento 7'),
      p('the observation car', 'el vagón mirador', 'Observation Car', 'Vagón mirador'),
      p('the luggage van', 'el furgón de equipajes', 'Luggage Van', 'Furgón de equipajes'),
      p('the sleeping-car corridor', 'el pasillo del coche cama', 'Sleeping-Car Corridor', 'Pasillo del coche cama'),
    ],
    alibiPlaces: [
      p('the dining car', 'el vagón restaurante', 'Dining Car', 'Vagón restaurante'),
      p('the bar car', 'el vagón bar', 'Bar Car', 'Vagón bar'),
      p('the smoking salon', 'el salón de fumadores', 'Smoking Salon', 'Salón de fumadores'),
      p('the third-class carriage', 'el vagón de tercera', 'Third-Class Carriage', 'Vagón de tercera'),
      p('the library car', 'el vagón biblioteca', 'Library Car', 'Vagón biblioteca'),
    ],
    witnesses: [
      p('the conductor', 'el revisor', 'The Conductor', 'El revisor'),
      p('a nanny', 'una niñera', 'Nanny', 'Niñera'),
      p('the cook', 'el cocinero', 'The Cook', 'El cocinero'),
    ],
    cameras: [
      t("A passenger's Leica photograph", 'Una foto de la Leica de un pasajero'),
      t("A honeymooning couple's photograph", 'Una foto de una pareja de recién casados'),
    ],
    floor: t('the snowmelt on the corridor carpet', 'la nieve derretida sobre la alfombra del pasillo'),
    phone: t('The radio cabin log', 'El registro de la cabina de radio'),
    suspects: [
      { name: 'Count Andrei Petrov', role: t('Penniless nobleman', 'Noble arruinado') },
      { name: 'Daisy Fairweather', role: t('American heiress', 'Heredera estadounidense') },
      { name: 'Professor Hugo Lindqvist', role: t('Archaeologist', 'Arqueólogo') },
      { name: 'Sister Agnes Moreau', role: t('Travelling nun', 'Monja viajera') },
      { name: 'Cyrus Blackwood', role: t('Arms dealer', 'Traficante de armas') },
      { name: 'Lucia Ferraro', role: t("Lady's maid", 'Doncella') },
      { name: 'Dr. Omar Haddad', role: t('Train physician', 'Médico del tren') },
      { name: 'Beatrix Holloway', role: t('Mystery novelist', 'Novelista de misterio') },
    ],
    bioLines: [
      t('Boarded at the last minute without a reservation', 'Subió al tren en el último momento y sin reserva'),
      t('Shares a connecting door with {victim}', 'Comparte una puerta comunicante con {victim}'),
      t('Has travelled under at least two different names', 'Ha viajado con al menos dos nombres distintos'),
      t('Was seen slipping a note under {victim}’s door', 'Se le vio deslizar una nota bajo la puerta de {victim}'),
      t('Carries a locked case that never leaves their side', 'Lleva un maletín cerrado con llave que nunca suelta'),
    ],
    weapons: [
      {
        key: 'cane', cause: 'blunt',
        name: t('the lead-weighted walking cane', 'el bastón lastrado con plomo'),
        label: t('Weighted walking cane', 'Bastón lastrado'),
        trace: t('grey flecks of lead', 'partículas grises de plomo'),
        desc: t('Ebony, with a lead core hidden in the handle.', 'De ébano, con un núcleo de plomo oculto en la empuñadura.'),
      },
      {
        key: 'shovel', cause: 'blunt',
        name: t('the coal shovel', 'la pala de carbón'),
        label: t('Coal shovel', 'Pala de carbón'),
        trace: t('black coal dust', 'polvo negro de carbón'),
        desc: t('From the locomotive tender, black with coal dust.', 'Del ténder de la locomotora, negra de polvo de carbón.'),
      },
      {
        key: 'carving_knife', cause: 'sharp',
        name: t('the carving knife', 'el cuchillo trinchador'),
        label: t('Carving knife', 'Cuchillo trinchador'),
        trace: t('traces of silver plate', 'restos de baño de plata'),
        desc: t('Silver-plated, missing from the dining car since dinner.', 'Bañado en plata, desaparecido del vagón restaurante desde la cena.'),
      },
      {
        key: 'sleeping_draught', cause: 'poison',
        name: t('the sleeping draught', 'el somnífero'),
        label: t('Sleeping draught', 'Somnífero'),
        trace: t('chloral hydrate', 'hidrato de cloral'),
        desc: t('A bottle labelled "Chloral hydrate. Ten drops only." It is empty.', 'Un frasco con la etiqueta "Hidrato de cloral. Solo diez gotas". Está vacío.'),
      },
      {
        key: 'tea', cause: 'poison',
        name: t('the cup of tea', 'la taza de té'),
        label: t('Cup of tea', 'Taza de té'),
        trace: t('digitalis from foxglove', 'digital de dedalera'),
        desc: t('Cold tea in a porcelain cup. The lab finds digitalis.', 'Té frío en una taza de porcelana. El laboratorio encuentra digital.'),
      },
      {
        key: 'strap', cause: 'strangle',
        name: t('the leather luggage strap', 'la correa de cuero'),
        label: t('Leather luggage strap', 'Correa de cuero'),
        trace: t('brown leather fibres', 'fibras de cuero marrón'),
        desc: t('A brown leather strap with a brass buckle, stretched out of shape.', 'Una correa de cuero marrón con hebilla de latón, deformada de tanto tirar.'),
      },
    ],
    synopsis: t(
      'Snowbound in a mountain pass, the express has stopped dead in the night. So has {victim} ({occupation}), found in {scene}. The train physician puts the death between {window}. No one could have left the train. {count} passengers had access, and one of them is still on board, waiting for the thaw.',
      'Atrapado por la nieve en un paso de montaña, el expreso se ha detenido en plena noche. El cuerpo de {victim} ({occupation}) apareció en {scene}. El médico del tren sitúa la muerte entre {window}. Nadie pudo bajar del tren. {count} pasajeros tenían acceso, y uno de ellos sigue a bordo, esperando el deshielo.'
    ),
  },

  // ─── Hacienda on the Day of the Dead, 1940s Oaxaca ────────────────────────
  hacienda: {
    titles: [
      t('Night of the Dead at Los Cipreses', 'Noche de muertos en Los Cipreses'),
      t('The Marigold Path', 'El camino de cempasúchil'),
      t('An Altar for the Patrón', 'Un altar para el patrón'),
    ],
    victims: [
      { name: 'Don Alejandro Cienfuegos', occupation: t('mezcal baron', 'barón del mezcal') },
      { name: 'Doña Inés Villaseñor', occupation: t('matriarch of the hacienda', 'matriarca de la hacienda') },
      { name: 'General Rafael Montaño', occupation: t('retired general', 'general retirado') },
      { name: 'Lucía Arreola', occupation: t('celebrated muralist', 'muralista célebre') },
    ],
    scenes: [
      p('the family chapel', 'la capilla familiar', 'Family Chapel', 'Capilla familiar'),
      p('the agave distillery', 'la destilería de agave', 'Agave Distillery', 'Destilería de agave'),
      p('the ofrenda room', 'la sala de la ofrenda', 'Ofrenda Room', 'Sala de la ofrenda'),
      p('the courtyard fountain', 'la fuente del patio', 'Courtyard Fountain', 'Fuente del patio'),
    ],
    alibiPlaces: [
      p('the cemetery', 'el panteón', 'Cemetery', 'Panteón'),
      p('the kitchen', 'la cocina', 'Kitchen', 'Cocina'),
      p('the stables', 'las caballerizas', 'Stables', 'Caballerizas'),
      p('the plaza', 'la plaza', 'Plaza', 'Plaza'),
      p('the mezcal cellar', 'la bodega de mezcal', 'Mezcal Cellar', 'Bodega de mezcal'),
    ],
    witnesses: [
      p('the stable boy', 'el mozo de cuadra', 'The Stable Boy', 'El mozo de cuadra'),
      p('the cook', 'la cocinera', 'The Cook', 'La cocinera'),
      p('a mariachi violinist', 'un violinista del mariachi', 'Mariachi Violinist', 'Violinista del mariachi'),
    ],
    cameras: [
      t("The plaza photographer's portrait", 'Un retrato del fotógrafo de la plaza'),
      t("A guest's home movie", 'La película casera de un invitado'),
    ],
    floor: t('the marigold petals scattered on the floor', 'los pétalos de cempasúchil esparcidos por el suelo'),
    phone: t('The party-line operator in town', 'La operadora de la línea compartida del pueblo'),
    suspects: [
      { name: 'Mateo Cienfuegos', role: t('Younger brother', 'Hermano menor') },
      { name: 'Soledad Ruiz', role: t('Housekeeper', 'Ama de llaves') },
      { name: 'Padre Ignacio Luna', role: t('Village priest', 'Párroco del pueblo') },
      { name: 'Carmen Echeverría', role: t('Rival landowner', 'Hacendada rival') },
      { name: 'Diego Salazar', role: t('Ranch foreman', 'Capataz') },
      { name: 'Valeria Montes', role: t('Goddaughter', 'Ahijada') },
      { name: 'Dr. Julián Ortega', role: t('Family doctor', 'Médico de la familia') },
      { name: 'Rosario "Chayo" Pineda', role: t('Village healer', 'Curandera') },
    ],
    bioLines: [
      t('Has lived on the hacienda since before the revolution', 'Vive en la hacienda desde antes de la revolución'),
      t('Was heard arguing with {victim} beside the ofrenda', 'Se le oyó discutir con {victim} junto a la ofrenda'),
      t('Knows the old tunnels under the distillery', 'Conoce los viejos túneles bajo la destilería'),
      t('Came back from the capital for the first time in years', 'Volvió de la capital por primera vez en años'),
      t('Is said to owe money to half the valley', 'Se dice que le debe dinero a medio valle'),
    ],
    weapons: [
      {
        key: 'machete', cause: 'sharp',
        name: t('the machete', 'el machete'),
        label: t('Machete', 'Machete'),
        trace: t('flecks of carbon steel', 'partículas de acero al carbono'),
        desc: t('A field machete, its edge recently honed.', 'Un machete de campo, con el filo recién afilado.'),
      },
      {
        key: 'obsidian', cause: 'sharp',
        name: t('the obsidian knife from the altar', 'el cuchillo de obsidiana del altar'),
        label: t('Obsidian knife', 'Cuchillo de obsidiana'),
        trace: t('black obsidian splinters', 'astillas de obsidiana negra'),
        desc: t('A ceremonial blade of black volcanic glass. A splinter is missing from the edge.', 'Una hoja ceremonial de vidrio volcánico negro. Le falta una astilla en el filo.'),
      },
      {
        key: 'metate', cause: 'blunt',
        name: t('the grinding stone', 'la mano del metate'),
        label: t('Grinding stone', 'Mano del metate'),
        trace: t('grains of volcanic basalt', 'granos de basalto volcánico'),
        desc: t('The grinding stone from the kitchen, heavy grey basalt.', 'La piedra de moler de la cocina, de pesado basalto gris.'),
      },
      {
        key: 'branding_iron', cause: 'blunt',
        name: t('the branding iron', 'el hierro de marcar'),
        label: t('Branding iron', 'Hierro de marcar'),
        trace: t('rust and charcoal', 'óxido y carbón'),
        desc: t("The ranch's branding iron, crusted with rust and charcoal.", 'El hierro de marcar del rancho, cubierto de óxido y carbón.'),
      },
      {
        key: 'chocolate', cause: 'poison',
        name: t('the cup of hot chocolate', 'la taza de chocolate'),
        label: t('Cup of hot chocolate', 'Taza de chocolate'),
        trace: t('crushed oleander leaves', 'hojas de adelfa machacadas'),
        desc: t('Spiced chocolate from the ofrenda. The lab finds crushed oleander leaves.', 'Chocolate especiado de la ofrenda. El laboratorio encuentra hojas de adelfa machacadas.'),
      },
      {
        key: 'lariat', cause: 'strangle',
        name: t('the braided lariat', 'la reata trenzada'),
        label: t('Braided lariat', 'Reata trenzada'),
        trace: t('coarse sisal fibres', 'fibras ásperas de henequén'),
        desc: t('A sisal rope from the stables, tied in a slipknot.', 'Una cuerda de henequén de las caballerizas, con un nudo corredizo.'),
      },
    ],
    synopsis: t(
      'Candles burn on every altar for the Day of the Dead, but at Hacienda Los Cipreses one more soul joined the departed tonight. {victim} ({occupation}) was found in {scene}, and the doctor puts the death between {window}. The fiesta has stopped. {count} guests and family members had reason and opportunity. The marigold path leads somewhere.',
      'Las velas arden en todos los altares por el Día de Muertos, pero esta noche, en la Hacienda Los Cipreses, un alma más se unió a los difuntos. El cuerpo de {victim} ({occupation}) apareció en {scene}, y el médico sitúa la muerte entre {window}. La fiesta se ha detenido. {count} invitados y familiares tenían motivo y oportunidad. El camino de cempasúchil lleva a alguna parte.'
    ),
  },
};

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
