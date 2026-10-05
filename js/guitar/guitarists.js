/* Présentations de guitaristes : vie, matériel, technique. */
(function () {
  'use strict';
  const { h } = App;

  const GUITARISTS = [
    {
      id: 'hendrix', name: 'Jimi Hendrix', years: '1942 – 1970', origin: 'Seattle, États-Unis', bands: ['The Jimi Hendrix Experience', 'Band of Gypsys'], styles: 'Rock, blues, psychédélique', tone: 'hendrix',
      life: [
        'Né à Seattle en 1942, il commence ado sur une guitare acoustique, puis une première électrique. Gaucher, il joue des guitares de droitier retournées.',
        'Après un passage dans l’armée, il devient guitariste d’accompagnement pour des stars de la soul et du rock’n’roll (les Isley Brothers, Little Richard).',
        'En 1966, Chas Chandler (bassiste des Animals) le repère à New York et l’emmène à Londres : il y forme The Jimi Hendrix Experience avec Noel Redding et Mitch Mitchell.',
        'En quatre ans, il révolutionne la guitare : Are You Experienced (1967), Axis: Bold as Love, Electric Ladyland (1968), la guitare enflammée de Monterey (1967), l’hymne américain à Woodstock (1969). Il meurt à Londres en 1970, à 27 ans.'
      ],
      gear: {
        guitars: 'Fender Stratocaster (de droitier, retournée et recordée pour gaucher).',
        amps: 'Marshall Super Lead 100 W, joués très fort.',
        pedals: 'Fuzz Face (fuzz), wah Vox, Uni-Vibe (effet tournant), Octavia (fuzz + octave aiguë).',
        notes: 'Accordage souvent un demi-ton plus bas (Mi♭).'
      },
      technique: [
        'Le pouce passe par-dessus le manche pour jouer les basses : il accompagne et fait la mélodie en même temps.',
        'Des accords « enjolivés » de petites notes (hammer-on, pull-off) dans le style soul/R&B : écoute Little Wing.',
        'L’accord « Hendrix » 7(♯9), le larsen contrôlé et le vibrato de la guitare pour faire hurler les notes.',
        'Racines blues (gamme pentatonique) mélangées à des sons jamais entendus pour l’époque.'
      ],
      listen: ['Purple Haze', 'Little Wing', 'Voodoo Child (Slight Return)', 'All Along the Watchtower', 'Hey Joe']
    },
    {
      id: 'clapton', name: 'Eric Clapton', years: 'né en 1945', origin: 'Ripley, Angleterre', bands: ['The Yardbirds', 'John Mayall & the Bluesbreakers', 'Cream', 'Blind Faith', 'Derek and the Dominos', 'carrière solo'], styles: 'Blues, rock', tone: 'sunshine',
      life: [
        'Il reçoit sa première guitare vers 13 ans et se passionne pour les bluesmen américains (Robert Johnson, B.B. King).',
        'Il se fait connaître dans les Yardbirds, puis chez John Mayall, où son jeu fait écrire sur les murs de Londres « Clapton is God ».',
        'En 1966, il forme Cream, l’un des premiers « power trios », avec Jack Bruce et Ginger Baker. Suivent Blind Faith, puis Derek and the Dominos et la chanson Layla (1970).',
        'Il mène ensuite une longue carrière solo, avec des succès comme Wonderful Tonight ou Tears in Heaven (1992).'
      ],
      gear: {
        guitars: 'Gibson Les Paul (période Mayall), Gibson SG peinte « The Fool » (Cream), puis surtout la Stratocaster (« Blackie », puis ses modèles signature Fender).',
        amps: 'Marshall à l’époque Cream, puis des amplis Fender (Twin, Tweed).',
        pedals: 'Très peu : une wah à l’époque Cream, sinon guitare dans l’ampli.',
        notes: 'Le « woman tone » : micro manche + bouton de tonalité presque fermé + ampli saturé.'
      },
      technique: [
        'Un blues très chanté : peu de notes, bien placées, souvent dans la gamme pentatonique.',
        'Un vibrato régulier et expressif, des bends très justes.',
        'Sur Strat, un son clair et rond avec le micro manche ou les positions intermédiaires.'
      ],
      listen: ['Sunshine of Your Love (Cream)', 'Crossroads (Cream)', 'Layla', 'Wonderful Tonight', 'Old Love']
    },
    {
      id: 'gilmour', name: 'David Gilmour', years: 'né en 1946', origin: 'Cambridge, Angleterre', bands: ['Pink Floyd', 'carrière solo'], styles: 'Rock progressif, blues', tone: 'gilmour',
      life: [
        'Il grandit à Cambridge, où il connaît Syd Barrett, futur fondateur de Pink Floyd.',
        'En 1968, il rejoint Pink Floyd pour remplacer Barrett, qui ne peut plus assurer.',
        'Il devient la voix et la guitare du groupe sur The Dark Side of the Moon (1973), Wish You Were Here (1975) et The Wall (1979), parmi les albums les plus vendus de l’histoire.',
        'Après Pink Floyd, il poursuit en solo (On an Island, Rattle That Lock).'
      ],
      gear: {
        guitars: 'Fender Stratocaster, surtout sa « Black Strat » ; parfois une lap steel.',
        amps: 'Hiwatt (son clair, puissant et propre), parfois avec un Leslie (haut-parleur rotatif).',
        pedals: 'Fuzz (Big Muff, Fuzz Face), compresseur, delays (Binson Echorec puis numériques), chorus/flanger.',
        notes: 'Le secret : un ampli très clair et propre, toute la couleur vient des pédales.'
      },
      technique: [
        'Des bends lents et parfaitement justes, souvent d’un ton ou plus.',
        'Il joue « peu mais bien » : chaque note est choisie, il laisse de l’espace.',
        'Le delay fait partie du jeu : il joue avec les répétitions (Run Like Hell).'
      ],
      listen: ['Comfortably Numb', 'Shine On You Crazy Diamond', 'Time', 'Wish You Were Here', 'Money']
    },
    {
      id: 'page', name: 'Jimmy Page', years: 'né en 1944', origin: 'Heston (Londres), Angleterre', bands: ['The Yardbirds', 'Led Zeppelin', 'The Firm'], styles: 'Hard rock, blues, folk', tone: 'whole-lotta-love',
      life: [
        'Adolescent, il apprend seul en écoutant des disques de rock’n’roll et de blues.',
        'Au début des années 60, il devient l’un des musiciens de studio les plus demandés de Londres.',
        'Il rejoint les Yardbirds en 1966, puis fonde en 1968 Led Zeppelin avec Robert Plant, John Paul Jones et John Bonham. Il en est aussi le producteur.',
        'Led Zeppelin devient l’un des plus grands groupes de rock : Whole Lotta Love, Stairway to Heaven (1971), Kashmir…'
      ],
      gear: {
        guitars: 'Gibson Les Paul Standard, Fender Telecaster (débuts, solo de Stairway), Gibson double manche EDS-1275 sur scène.',
        amps: 'Marshall sur scène ; petits amplis en studio.',
        pedals: 'Wah, fuzz, et des curiosités : archet de violon sur la guitare, theremin.',
        notes: 'Utilise beaucoup d’accordages ouverts (DADGAD sur Kashmir).'
      },
      technique: [
        'Le roi du riff : des motifs simples, puissants et mémorisables.',
        'Mélange de guitares acoustiques et électriques, influences folk et orientales.',
        'Des solos spontanés, pleins d’énergie, plus « feeling » que précision.'
      ],
      listen: ['Whole Lotta Love', 'Stairway to Heaven', 'Kashmir', 'Black Dog', 'Since I’ve Been Loving You']
    },
    {
      id: 'angus', name: 'Angus Young', years: 'né en 1955', origin: 'Glasgow, Écosse (grandit en Australie)', bands: ['AC/DC'], styles: 'Hard rock', tone: 'back-in-black',
      life: [
        'Né en Écosse, il part avec sa famille en Australie en 1963.',
        'En 1973, il fonde AC/DC avec son frère Malcolm (guitare rythmique). Il adopte son célèbre uniform d’écolier sur scène.',
        'Après la mort du chanteur Bon Scott en 1980, le groupe sort Back in Black avec Brian Johnson : un des albums les plus vendus au monde.'
      ],
      gear: {
        guitars: 'Gibson SG, presque exclusivement.',
        amps: 'Marshall poussés (JTM45, Super Lead).',
        pedals: 'Quasiment aucune : guitare dans l’ampli, avec un émetteur sans fil.',
        notes: 'Le gain est plus bas qu’on ne croit : c’est l’attaque qui fait mordre le son.'
      },
      technique: [
        'Riffs à base d’accords ouverts, très carrés, avec son frère à la rythmique.',
        'Solos en pentatonique blues, vibrato rapide et nerveux.',
        'Énormément d’énergie sur scène (le « duckwalk »).'
      ],
      listen: ['Back in Black', 'Highway to Hell', 'Thunderstruck', 'T.N.T.', 'Let There Be Rock']
    },
    {
      id: 'slash', name: 'Slash', years: 'né en 1965', origin: 'Londres (grandit à Los Angeles)', bands: ['Guns N’ Roses', 'Slash’s Snakepit', 'Velvet Revolver', 'Slash ft. Myles Kennedy'], styles: 'Hard rock', tone: 'sweet-child',
      life: [
        'De son vrai nom Saul Hudson, il naît à Londres et grandit à Los Angeles.',
        'Il commence la guitare à l’adolescence, après avoir d’abord voulu jouer de la basse.',
        'En 1985, il rejoint Guns N’ Roses. Appetite for Destruction (1987) devient le premier album (album de début) le plus vendu de l’histoire aux États-Unis.',
        'Après Guns N’ Roses, il forme Velvet Revolver, puis un groupe avec le chanteur Myles Kennedy, avant de revenir dans Guns N’ Roses en 2016.'
      ],
      gear: {
        guitars: 'Gibson Les Paul (une copie de Les Paul sur Appetite for Destruction).',
        amps: 'Marshall (JCM800, Silver Jubilee, modèles signature).',
        pedals: 'Wah Dunlop Cry Baby, un peu de delay, talk box sur certains morceaux.',
        notes: 'Souvent accordé un demi-ton plus bas.'
      },
      technique: [
        'Des solos très mélodiques qu’on peut chanter, mélange de pentatonique et de gamme mineure.',
        'Micro manche pour les solos chantants, micro chevalet pour les riffs.',
        'Gros vibrato, wah très utilisée en solo.'
      ],
      listen: ['Sweet Child O’ Mine', 'November Rain', 'Paradise City', 'Welcome to the Jungle', 'Anastasia']
    },
    {
      id: 'srv', name: 'Stevie Ray Vaughan', years: '1954 – 1990', origin: 'Dallas, Texas', bands: ['Double Trouble'], styles: 'Blues texan, blues rock', tone: 'srv',
      life: [
        'Il apprend la guitare enfant en regardant son grand frère Jimmie Vaughan, lui aussi guitariste.',
        'Il joue dans les clubs d’Austin et forme le trio Double Trouble.',
        'En 1983, il joue la guitare de Let’s Dance de David Bowie et sort son premier album, Texas Flood.',
        'Il meurt en 1990 dans un accident d’hélicoptère, au sommet de sa carrière.'
      ],
      gear: {
        guitars: 'Fender Stratocaster très usée, surnommée « Number One », avec des cordes très épaisses.',
        amps: 'Fender (Vibroverb, Super Reverb) et Dumble, joués très fort.',
        pedals: 'Ibanez Tube Screamer, wah Vox, Uni-Vibe/rotary.',
        notes: 'Accordé un demi-ton plus bas (Mi♭).'
      },
      technique: [
        'Une attaque extrêmement forte et des cordes épaisses : un son énorme et dynamique.',
        'Le shuffle texan (croches ternaires) et les « rakes » (raclements sur les cordes étouffées avant la note).',
        'Très influencé par Hendrix et Albert King : bends larges, vibrato puissant.'
      ],
      listen: ['Pride and Joy', 'Texas Flood', 'Lenny', 'Scuttle Buttin’', 'Little Wing (instrumental)']
    },
    {
      id: 'evh', name: 'Eddie Van Halen', years: '1955 – 2020', origin: 'Amsterdam, Pays-Bas (grandit en Californie)', bands: ['Van Halen'], styles: 'Hard rock', tone: 'eruption',
      life: [
        'Né aux Pays-Bas, il arrive en Californie en 1962. Il apprend d’abord le piano classique.',
        'Il commence par la batterie, puis échange avec son frère Alex, qui prend la batterie pendant que lui passe à la guitare.',
        'En 1972, ils fondent le groupe qui deviendra Van Halen. Le premier album (1978) et l’instrumental Eruption changent la guitare rock : tout le monde veut apprendre le tapping.',
        'Il est aussi un inventeur : il bricole ses guitares et dépose des brevets.'
      ],
      gear: {
        guitars: 'La « Frankenstrat », une guitare qu’il a assemblée lui-même (corps de Strat, humbucker au chevalet).',
        amps: 'Marshall Super Lead « Plexi », puis Peavey 5150 et sa marque EVH.',
        pedals: 'MXR Phase 90, flanger MXR, Echoplex (delay à bande).',
        notes: 'Le « brown sound » : saturation chaude d’un ampli poussé.'
      },
      technique: [
        'Le tapping à deux mains (la main droite frappe des notes sur le manche).',
        'Les « dive bombs » au vibrato et les harmoniques.',
        'Une rythmique très groovy, aussi importante que ses solos.'
      ],
      listen: ['Eruption', 'Ain’t Talkin’ ’Bout Love', 'Panama', 'Jump', 'Hot for Teacher']
    },
    {
      id: 'knopfler', name: 'Mark Knopfler', years: 'né en 1949', origin: 'Glasgow, Écosse (grandit à Newcastle)', bands: ['Dire Straits', 'carrière solo'], styles: 'Rock, folk, country', tone: 'sultans',
      life: [
        'Il grandit près de Newcastle. Avant la musique, il est journaliste puis professeur.',
        'En 1977, il fonde Dire Straits avec son frère David. Sultans of Swing (1978) les révèle.',
        'Brothers in Arms (1985) et Money for Nothing en font l’un des plus grands groupes des années 80.',
        'Il compose aussi des musiques de films (Local Hero) et poursuit une carrière solo.'
      ],
      gear: {
        guitars: 'Fender Stratocaster rouge, Gibson Les Paul (Money for Nothing), guitare résonateur National (Romeo and Juliet).',
        amps: 'Fender et Music Man, sons clairs.',
        pedals: 'Peu : compresseur, un peu de delay ; wah bloquée à mi-course sur Money for Nothing.',
        notes: 'Positions intermédiaires de la Strat pour un son « creux ».'
      },
      technique: [
        'Il joue aux doigts, sans médiator (pouce, index, majeur) : attaque claquante et nuancée.',
        'Phrases mélodiques inspirées du folk et de la country, beaucoup de double-stops.',
        'Un son clair, précis, presque sans saturation.'
      ],
      listen: ['Sultans of Swing', 'Money for Nothing', 'Brothers in Arms', 'Romeo and Juliet', 'Telegraph Road']
    },
    {
      id: 'frusciante', name: 'John Frusciante', years: 'né en 1970', origin: 'New York, États-Unis', bands: ['Red Hot Chili Peppers', 'carrière solo'], styles: 'Funk rock, rock alternatif', tone: 'frusciante-funk',
      life: [
        'Fan des Red Hot Chili Peppers, il les rejoint en 1988, à 18 ans, après la mort de leur guitariste Hillel Slovak.',
        'Il joue sur Mother’s Milk et Blood Sugar Sex Magik (1991), puis quitte le groupe en 1992.',
        'Il revient en 1998 pour Californication, puis By the Way et Stadium Arcadium, repart en 2009 et revient encore en 2019.',
        'Il enregistre aussi de nombreux albums solo, souvent expérimentaux.'
      ],
      gear: {
        guitars: 'Fender Stratocaster des années 60 (et parfois Telecaster, Gretsch).',
        amps: 'Marshall (Major, Silver Jubilee).',
        pedals: 'Boss DS-2 (distorsion), Big Muff, wah, delays et modulation pour les ambiances.',
        notes: 'Son clair très présent, saturation surtout pour les refrains.'
      },
      technique: [
        'Des rythmiques funk avec beaucoup de coups étouffés.',
        'Des accords enrichis de petites notes, dans l’esprit de Hendrix (Under the Bridge).',
        'Le minimalisme : jouer moins pour servir la chanson.'
      ],
      listen: ['Under the Bridge', 'Californication', 'Scar Tissue', 'Can’t Stop', 'Dani California']
    },
    {
      id: 'cobain', name: 'Kurt Cobain', years: '1967 – 1994', origin: 'Aberdeen, État de Washington', bands: ['Nirvana'], styles: 'Grunge', tone: 'teen-spirit',
      life: [
        'Il grandit à Aberdeen, près de Seattle, et reçoit une guitare à 14 ans.',
        'En 1987, il fonde Nirvana avec le bassiste Krist Novoselic ; Dave Grohl les rejoint à la batterie en 1990.',
        'Nevermind (1991) et Smells Like Teen Spirit propulsent le grunge dans le monde entier. Suivent In Utero (1993) et le concert MTV Unplugged.',
        'Il meurt en 1994, à 27 ans.'
      ],
      gear: {
        guitars: 'Fender Mustang, Jaguar, puis la Jag-Stang qu’il a dessinée. Gaucher.',
        amps: 'Mesa/Boogie, Fender.',
        pedals: 'Boss DS-1 et DS-2 (distorsion), Electro-Harmonix Small Clone (chorus).',
        notes: 'Chorus sur les couplets clairs, distorsion sur les refrains.'
      },
      technique: [
        'Des power chords simples et très efficaces.',
        'Le contraste couplet calme / refrain explosif.',
        'Peu de solos techniques : il reprend souvent la mélodie du chant à la guitare.'
      ],
      listen: ['Smells Like Teen Spirit', 'Come as You Are', 'Lithium', 'Heart-Shaped Box', 'In Bloom']
    },
    {
      id: 'bbking', name: 'B.B. King', years: '1925 – 2015', origin: 'Mississippi, États-Unis', bands: ['carrière solo'], styles: 'Blues', tone: 'thrill-is-gone',
      life: [
        'Il grandit dans le Mississippi en travaillant dans les champs de coton et chante le gospel.',
        'À Memphis, il devient animateur radio, surnommé « Beale Street Blues Boy », raccourci en B.B.',
        'Il enchaîne des milliers de concerts pendant plus de 60 ans. The Thrill Is Gone (1969) est son plus grand succès.',
        'Il est surnommé « le roi du blues ».'
      ],
      gear: {
        guitars: 'Gibson ES-355 demi-caisse, qu’il appelle « Lucille ».',
        amps: 'Lab Series L5 (transistor) et Fender.',
        pedals: 'Aucune.',
        notes: 'Son clair, chaud, sans saturation.'
      },
      technique: [
        'Le vibrato « papillon » : la main gauche tremble rapidement sur la corde.',
        'Très peu de notes, chacune pleine de sens. Il ne joue presque jamais d’accords en chantant.',
        'Questions-réponses entre sa voix et sa guitare.'
      ],
      listen: ['The Thrill Is Gone', 'Every Day I Have the Blues', 'Sweet Little Angel', 'How Blue Can You Get']
    },
    {
      id: 'santana', name: 'Carlos Santana', years: 'né en 1947', origin: 'Autlán, Mexique (grandit à San Francisco)', bands: ['Santana'], styles: 'Rock latino, blues', tone: 'europa',
      life: [
        'Fils de violoniste mariachi, il commence par le violon puis passe à la guitare.',
        'Installé à San Francisco, il forme le groupe Santana, révélé au festival de Woodstock en 1969.',
        'Abraxas (1970) avec Black Magic Woman et Oye Como Va est un énorme succès.',
        'En 1999, l’album Supernatural (avec Smooth) le ramène au sommet des ventes.'
      ],
      gear: {
        guitars: 'Gibson SG au début, puis Yamaha, et surtout des PRS signature.',
        amps: 'Mesa/Boogie (c’est lui qui a inspiré le nom de la marque), Dumble.',
        pedals: 'Wah, un peu de delay et de reverb.',
        notes: 'Un son très soutenu et chantant, micro manche.'
      },
      technique: [
        'Des notes tenues longtemps, avec un vibrato chantant.',
        'Gammes mineures et dorienne sur des rythmes latins (percussions, montunos).',
        'Il joue souvent fort, proche de l’ampli, pour garder le sustain.'
      ],
      listen: ['Europa', 'Samba Pa Ti', 'Black Magic Woman', 'Oye Como Va', 'Smooth']
    },
    {
      id: 'may', name: 'Brian May', years: 'né en 1947', origin: 'Hampton, Angleterre', bands: ['Queen'], styles: 'Rock', tone: 'brian-may',
      life: [
        'Adolescent, il construit avec son père sa propre guitare, la « Red Special », en partie avec le bois d’une vieille cheminée.',
        'Étudiant en astrophysique, il fonde Queen en 1970 avec Freddie Mercury, Roger Taylor et John Deacon.',
        'Il compose de grands tubes du groupe, dont We Will Rock You. Bohemian Rhapsody (1975) devient légendaire.',
        'Il termine son doctorat en astrophysique en 2007.'
      ],
      gear: {
        guitars: 'La « Red Special », faite maison, avec trois micros et des interrupteurs.',
        amps: 'Plusieurs Vox AC30 joués en même temps.',
        pedals: 'Un treble booster (pousse les aigus et la saturation), delays pour les canons.',
        notes: 'Il utilise une pièce de six pence à la place d’un médiator.'
      },
      technique: [
        'Les « orchestres de guitares » : plusieurs pistes de guitare en harmonie, comme des violons.',
        'Le delay en canon (il joue avec ses propres répétitions, Brighton Rock).',
        'Des solos très mélodiques, presque chantés.'
      ],
      listen: ['Bohemian Rhapsody (solo)', 'Killer Queen', 'Brighton Rock', 'We Will Rock You', 'Bicycle Race']
    },
    {
      id: 'morello', name: 'Tom Morello', years: 'né en 1964', origin: 'New York (grandit dans l’Illinois)', bands: ['Rage Against the Machine', 'Audioslave', 'Prophets of Rage'], styles: 'Rap metal, rock', tone: 'killing-in-the-name',
      life: [
        'Il grandit dans l’Illinois et commence la guitare assez tard, à 17 ans, en travaillant énormément.',
        'Diplômé de sciences politiques à Harvard, il part à Los Angeles.',
        'En 1991, il fonde Rage Against the Machine avec Zack de la Rocha : rap, metal et textes engagés.',
        'Il joue ensuite dans Audioslave avec Chris Cornell, puis Prophets of Rage.'
      ],
      gear: {
        guitars: 'Sa guitare bricolée « Arm the Homeless », et une Telecaster.',
        amps: 'Marshall JCM800 50 W, avec les mêmes réglages depuis les débuts.',
        pedals: 'DigiTech Whammy, wah Cry Baby, Boss DD (delay).',
        notes: 'Souvent en Drop D.'
      },
      technique: [
        'Il fait sonner sa guitare comme une platine de DJ : scratch en frottant les cordes, sélecteur de micro utilisé comme interrupteur (killswitch).',
        'Riffs simples et très groovy.',
        'Utilise la Whammy pour des sons de sirène et d’octave.'
      ],
      listen: ['Killing in the Name', 'Bulls on Parade', 'Sleep Now in the Fire', 'Like a Stone (Audioslave)', 'Cochise (Audioslave)']
    },
    {
      id: 'edge', name: 'The Edge', years: 'né en 1961', origin: 'Barking, Angleterre (grandit à Dublin)', bands: ['U2'], styles: 'Rock', tone: 'the-edge',
      life: [
        'De son vrai nom David Evans, il grandit en Irlande.',
        'En 1976, il fonde U2 au lycée avec Bono, Adam Clayton et Larry Mullen Jr.',
        'The Joshua Tree (1987) en fait un des plus grands groupes du monde.'
      ],
      gear: {
        guitars: 'Gibson Explorer, Fender Stratocaster.',
        amps: 'Vox AC30.',
        pedals: 'Beaucoup de delays (dont l’Electro-Harmonix Memory Man), plus tard des racks d’effets.',
        notes: 'Le delay est réglé en croche pointée, calé sur le tempo.'
      },
      technique: [
        'Peu de notes, répétées et multipliées par le delay : un son « carillon ».',
        'Des cordes à vide qui résonnent en continu pendant que les autres notes bougent.',
        'Il pense en « texture » plutôt qu’en solo.'
      ],
      listen: ['Where the Streets Have No Name', 'With or Without You', 'Sunday Bloody Sunday', 'Pride', 'I Will Follow']
    },
    {
      id: 'django', name: 'Django Reinhardt', years: '1910 – 1953', origin: 'Liberchies, Belgique', bands: ['Quintette du Hot Club de France'], styles: 'Jazz manouche', tone: null,
      life: [
        'Né dans une famille manouche, il grandit dans les roulottes près de Paris et joue du banjo très jeune.',
        'En 1928, un incendie dans sa caravane le blesse gravement : deux doigts de sa main gauche restent paralysés.',
        'Il réinvente sa technique avec deux doigts et fonde en 1934 le Quintette du Hot Club de France avec le violoniste Stéphane Grappelli.',
        'Il crée le jazz manouche, qui porte encore son nom aujourd’hui.'
      ],
      gear: {
        guitars: 'Guitare acoustique Selmer-Maccaferri, à petite bouche ovale.',
        amps: 'Aucun au début (acoustique), un peu de guitare électrique à la fin de sa vie.',
        pedals: 'Aucune.',
        notes: 'Cordes métal assez fines et médiator épais.'
      },
      technique: [
        'Il joue ses solos avec seulement deux doigts de la main gauche : arpèges très rapides et glissés.',
        'La « pompe » : rythmique où l’accord est joué court et sec sur chaque temps.',
        'Phrases chromatiques, trémolos et accords de 6 et de 9.'
      ],
      listen: ['Minor Swing', 'Nuages', 'Djangology', 'Les Yeux noirs', 'Swing 42']
    }
  ];

  /* ------------------------------------------------------------------ */
  /* Exposé automatique depuis Wikipédia (pour n'importe quel guitariste) */
  /* ------------------------------------------------------------------ */
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  async function api(lang, params) {
    const qs = Object.entries(Object.assign({ format: 'json', origin: '*' }, params)).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
    const r = await fetch(`https://${lang}.wikipedia.org/w/api.php?${qs}`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  async function wikiSearch(lang, q) {
    const d = await api(lang, { action: 'query', list: 'search', srsearch: q, srlimit: 6 });
    return ((d.query && d.query.search) || []).map((x) => x.title);
  }
  async function wikiPage(lang, title) {
    const d = await api(lang, { action: 'query', prop: 'extracts|pageimages|langlinks', explaintext: 1, exsectionformat: 'wiki', piprop: 'thumbnail', pithumbsize: 260, lllang: 'en', redirects: 1, titles: title });
    const pages = (d.query && d.query.pages) || {};
    const p = Object.values(pages)[0];
    if (!p || p.missing !== undefined) return null;
    return { title: p.title, text: p.extract || '', thumb: p.thumbnail && p.thumbnail.source, en: p.langlinks && p.langlinks[0] && p.langlinks[0]['*'] };
  }

  function parseSections(text) {
    const lines = text.split('\n');
    const out = [{ title: '', level: 1, text: '' }];
    lines.forEach((l) => {
      const m = /^(={2,})\s*(.+?)\s*=+\s*$/.exec(l.trim());
      if (m) out.push({ title: m[2], level: m[1].length, text: '' });
      else out[out.length - 1].text += l + '\n';
    });
    return out;
  }
  /** Texte d'une famille de sections (titre qui correspond + ses sous-sections). */
  function pickSections(secs, re, exclude) {
    const parts = [];
    for (let i = 0; i < secs.length; i++) {
      const s = secs[i];
      if (!s.title || !re.test(s.title) || (exclude && exclude.test(s.title))) continue;
      const group = [s];
      for (let j = i + 1; j < secs.length && secs[j].level > s.level; j++) group.push(secs[j]);
      group.forEach((g) => { if (g.text.trim()) parts.push({ title: g.title, text: g.text }); });
      i += group.length - 1;
    }
    return parts;
  }
  function sentences(text) {
    return text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý«"(0-9])/).map((s) => s.trim()).filter((s) => s.length > 25 && !/^\{|\}$/.test(s));
  }
  /** Résumé : quelques phrases de chaque sous-partie, dans l'ordre. */
  function summarize(parts, perPart, max) {
    const out = [];
    parts.forEach((p) => sentences(p.text).slice(0, perPart).forEach((s) => { if (out.length < max) out.push(s); }));
    return out;
  }

  const RE_LIFE = /biograph|jeunesse|enfance|d[ée]buts|carri[èe]re|parcours|vie |^vie$|formation|ann[ée]es|groupe/i;
  const RE_GEAR = /mat[ée]riel|[ée]quipement|instrument|guitare|amplificat|p[ée]dale|matos|son$/i;
  const RE_TECH = /style|technique|(^|\s)jeu(\s|$)|influence|musicalit[ée]|approche/i;
  const RE_SKIP = /discograph|r[ée]f[ée]rence|notes|liens|bibliograph|filmograph|voir aussi|distinction|r[ée]compense/i;
  const EN_GEAR = /equipment|gear|guitars|instruments|amplifiers|signature/i;
  const EN_TECH = /style|technique|playing|influence/i;

  async function wikiExposeTitle(title) { return wikiExpose(title, title); }
  async function wikiExpose(query, forced) {
    let titles = await wikiSearch('fr', query + ' guitariste');
    if (!titles.length) titles = await wikiSearch('fr', query);
    if (!titles.length) return { error: 'Aucun article trouvé sur Wikipédia pour « ' + query + ' ».' };
    // privilégie un titre qui contient le nom tapé
    const q = norm(query);
    const best = forced || titles.find((t) => norm(t).indexOf(q) >= 0) || titles[0];
    const page = await wikiPage('fr', best);
    if (!page || !page.text) return { error: 'Article introuvable.' };
    const secs = parseSections(page.text);
    const lead = sentences(secs[0].text);
    const lifeParts = pickSections(secs, RE_LIFE, RE_SKIP);
    let gearParts = pickSections(secs, RE_GEAR, RE_SKIP);
    let techParts = pickSections(secs, RE_TECH, RE_SKIP).filter((p) => !RE_GEAR.test(p.title) && !/jeunesse|enfance/i.test(p.title));
    let gearLang = 'fr', techLang = 'fr', enTitle = null;
    if ((!gearParts.length || !techParts.length) && page.en) {
      try {
        const en = await wikiPage('en', page.en);
        if (en && en.text) {
          const esecs = parseSections(en.text);
          enTitle = en.title;
          if (!gearParts.length) { gearParts = pickSections(esecs, EN_GEAR, RE_SKIP); gearLang = 'en'; }
          if (!techParts.length) { techParts = pickSections(esecs, EN_TECH, /discography|references|notes|external/i); techLang = 'en'; }
        }
      } catch (e) { /* pas grave */ }
    }
    return {
      title: page.title, thumb: page.thumb, alternatives: titles.filter((t) => t !== best),
      isGuitarist: /guitar/i.test(page.text),
      intro: lead.slice(0, 3),
      life: lifeParts.length ? summarize(lifeParts, 2, 9) : lead.slice(3, 8),
      gear: summarize(gearParts, 3, 8), gearLang,
      tech: summarize(techParts, 3, 7), techLang,
      url: 'https://fr.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')),
      enUrl: enTitle ? 'https://en.wikipedia.org/wiki/' + encodeURIComponent(enTitle.replace(/ /g, '_')) : null
    };
  }

  /* ------------------------------------------------------------------ */
  /* Liste partagée (Supabase) : les guitaristes ajoutés par tout le monde */
  /* ------------------------------------------------------------------ */
  const Shared = {
    get on() { const c = window.SITE_CONFIG || {}; return !!(c.supabaseUrl && c.supabaseAnonKey); },
    headers() {
      const k = window.SITE_CONFIG.supabaseAnonKey;
      return { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' };
    },
    url(q) { return window.SITE_CONFIG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/guitarists_shared' + q; },
    async list() {
      const r = await fetch(this.url('?select=title&order=created_at.desc&limit=500'), { headers: this.headers() });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return (await r.json()).map((x) => x.title);
    },
    async add(title) {
      const r = await fetch(this.url('?on_conflict=title'), {
        method: 'POST', headers: Object.assign(this.headers(), { Prefer: 'resolution=ignore-duplicates,return=minimal' }), body: JSON.stringify({ title })
      });
      if (!r.ok && r.status !== 409) throw new Error('HTTP ' + r.status);
    }
  };

  function render(el) {
    let current = App.store('guitarist', 'hendrix');
    /* --- Recherche libre --- */
    const freeInput = h('input', { type: 'text', placeholder: 'Nom d’un guitariste (ex. Jeff Beck, Mark Tremonti, Matthieu Chedid…)' });
    const freeBtn = h('button', { class: 'btn primary', text: 'Faire l’exposé' });
    const freeOut = h('div');
    const savedBox = h('div');
    let sharedList = null;
    const go = async (q) => {
      q = (q || freeInput.value).trim();
      if (!q) return;
      const local = GUITARISTS.find((g) => norm(g.name).indexOf(norm(q)) >= 0 || norm(q).indexOf(norm(g.name)) >= 0);
      if (local) { freeOut.innerHTML = ''; current = local.id; App.save('guitarist', current); drawList(); drawDetail(); detail.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      freeOut.innerHTML = '';
      freeOut.appendChild(h('div', { class: 'feedback info', text: 'Recherche sur Wikipédia…' }));
      try {
        const r = await wikiExpose(q);
        drawWiki(r);
      } catch (e) {
        freeOut.innerHTML = '';
        freeOut.appendChild(h('div', { class: 'notice warn', text: 'Impossible de joindre Wikipédia : vérifie ta connexion internet.' }));
      }
    };
    freeBtn.addEventListener('click', () => go());
    freeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    el.appendChild(h('div', { class: 'panel' }, [
      h('h2', { style: 'margin-top:0', text: '🔎 N’importe quel guitariste' }),
      h('p', { class: 'hint', text: 'Tape un nom : si le guitariste a une fiche ci-dessous, elle s’affiche ; sinon l’exposé est fait automatiquement à partir de Wikipédia (il faut une connexion internet).' }),
      h('div', { class: 'free-search' }, [freeInput, freeBtn]), savedBox, freeOut
    ]));
    drawSaved();

    async function loadShared() {
      if (!Shared.on) return;
      try { sharedList = await Shared.list(); } catch (e) { sharedList = null; }
      drawSaved();
    }
    loadShared();

    function drawSaved() {
      savedBox.innerHTML = '';
      if (Shared.on && sharedList) {
        if (!sharedList.length) { savedBox.appendChild(h('p', { class: 'hint', text: 'Aucun guitariste ajouté pour l’instant : le premier que tu cherches apparaîtra ici pour tout le monde.' })); return; }
        savedBox.appendChild(h('div', { class: 'family', text: 'Ajoutés par tout le monde (' + sharedList.length + ')' }));
        const chips = h('div', { class: 'gtr-list' });
        sharedList.forEach((t) => {
          const b = h('button', { class: 'tone-chip' }, [h('b', { text: t }), h('small', { text: 'exposé Wikipédia' })]);
          b.addEventListener('click', () => openTitle(t));
          chips.appendChild(b);
        });
        savedBox.appendChild(chips);
        return;
      }
      const saved = App.store('savedGuitarists', []);
      if (!saved.length) return;
      savedBox.appendChild(h('div', { class: 'family', text: 'Déjà ajoutés' }));
      const chips = h('div', { class: 'gtr-list' });
      saved.forEach((t) => {
        const b = h('button', { class: 'tone-chip' }, [h('b', { text: t }), h('small', { text: 'exposé Wikipédia' })]);
        b.addEventListener('click', () => openTitle(t));
        const x = h('button', { class: 'chip-x', title: 'Retirer', text: '×' });
        x.addEventListener('click', () => { App.save('savedGuitarists', App.store('savedGuitarists', []).filter((y) => y !== t)); drawSaved(); });
        chips.appendChild(h('span', { class: 'saved-chip' }, [b, x]));
      });
      savedBox.appendChild(chips);
    }
    function remember(title) {
      if (Shared.on) {
        if (sharedList && sharedList.indexOf(title) < 0) { sharedList.unshift(title); drawSaved(); }
        Shared.add(title).then(loadShared).catch(() => {});
      }
      const saved = App.store('savedGuitarists', []).filter((t) => t !== title);
      saved.unshift(title);
      App.save('savedGuitarists', saved.slice(0, 60));
      drawSaved();
    }
    async function openTitle(t) {
      freeOut.innerHTML = '';
      freeOut.appendChild(h('div', { class: 'feedback info', text: 'Chargement…' }));
      try { drawWiki(await wikiExposeTitle(t)); } catch (e) { freeOut.innerHTML = ''; freeOut.appendChild(h('div', { class: 'notice warn', text: 'Impossible de joindre Wikipédia.' })); }
    }

    function drawWiki(r) {
      freeOut.innerHTML = '';
      if (r.error) { freeOut.appendChild(h('div', { class: 'notice warn', text: r.error })); return; }
      const card = h('article', { class: 'gtr-card wiki-card' });
      const head = h('div', { class: 'wiki-head' }, [
        r.thumb ? h('img', { src: r.thumb, alt: r.title, class: 'wiki-photo' }) : null,
        h('div', {}, [h('h2', { class: 'gtr-name', text: r.title }), h('div', { class: 'muted', text: 'Exposé généré automatiquement à partir de Wikipédia' })])
      ]);
      card.appendChild(head);
      if (!r.isGuitarist) card.appendChild(h('div', { class: 'notice warn', text: 'Attention : cet article ne semble pas parler d’un guitariste. Essaie un des autres résultats ci-dessous.' }));
      r.intro.forEach((s) => card.appendChild(h('p', { class: 'lead', style: 'max-width:none', text: s })));
      const section = (title, list, lang, emptyMsg) => {
        card.appendChild(h('h3', { class: 'gtr-section', text: title }));
        if (!list.length) { card.appendChild(h('p', { class: 'muted', text: emptyMsg })); return; }
        if (lang === 'en') card.appendChild(h('p', { class: 'hint', text: 'Wikipédia en français n’en parle pas : extrait de la version anglaise.' }));
        card.appendChild(h('ul', {}, list.map((s) => h('li', { text: s }))));
      };
      section('1. Sa vie et sa carrière', r.life, 'fr', 'Wikipédia ne détaille pas sa biographie.');
      section('2. Son matériel', r.gear, r.gearLang, 'Wikipédia ne détaille pas son matériel (guitares, amplis, pédales) pour ce guitariste.');
      section('3. Sa technique et son style', r.tech, r.techLang, 'Wikipédia ne détaille pas sa technique ou son style.');
      const src = h('p', { class: 'hint' }, [document.createTextNode('Source : '), h('a', { href: r.url, target: '_blank', rel: 'noopener', text: 'Wikipédia (fr)' })]);
      if (r.enUrl) { src.appendChild(document.createTextNode(' · ')); src.appendChild(h('a', { href: r.enUrl, target: '_blank', rel: 'noopener', text: 'Wikipédia (en)' })); }
      src.appendChild(document.createTextNode(' — textes sous licence CC BY-SA, résumés automatiquement : ils peuvent être incomplets. Pour une fiche rédigée comme les autres, demande-la-moi.'));
      card.appendChild(src);
      if (r.alternatives.length) {
        card.appendChild(h('p', { class: 'hint', text: 'Ce n’est pas la bonne personne ? Autres résultats :' }));
        const alts = h('div', { class: 'chips' });
        r.alternatives.forEach((t) => {
          const b = h('button', { class: 'btn small', text: t });
          b.addEventListener('click', async () => {
            freeOut.innerHTML = '';
            freeOut.appendChild(h('div', { class: 'feedback info', text: 'Chargement…' }));
            try { drawWiki(await wikiExposeTitle(t)); } catch (e) { freeOut.innerHTML = ''; freeOut.appendChild(h('div', { class: 'notice warn', text: 'Impossible de joindre Wikipédia.' })); }
          });
          alts.appendChild(b);
        });
        card.appendChild(alts);
      }
      freeOut.appendChild(card);
      if (r.isGuitarist) remember(r.title);
    }

    const search = h('input', { type: 'text', placeholder: 'Filtrer les fiches : guitariste, groupe, style…' });
    const list = h('div', { class: 'gtr-list' });
    const detail = h('div');
    el.appendChild(h('div', { class: 'panel' }, [h('h2', { style: 'margin-top:0', text: '⭐ Fiches détaillées' }), search, list,
      h('p', { class: 'hint', text: 'Ton guitariste n’est pas dans la liste ? Demande-moi de l’ajouter : je rédige sa présentation.' })]));
    el.appendChild(detail);
    search.addEventListener('input', drawList);

    function drawList() {
      const q = search.value.trim().toLowerCase();
      list.innerHTML = '';
      GUITARISTS.filter((g) => !q || (g.name + ' ' + g.bands.join(' ') + ' ' + g.styles).toLowerCase().indexOf(q) >= 0).forEach((g) => {
        const b = h('button', { class: 'tone-chip' + (g.id === current ? ' on' : '') }, [h('b', { text: g.name }), h('small', { text: g.bands[0] + ' · ' + g.styles })]);
        b.addEventListener('click', () => { current = g.id; App.save('guitarist', current); drawList(); drawDetail(); detail.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        list.appendChild(b);
      });
      if (!list.children.length) list.appendChild(h('p', { class: 'muted', text: 'Pas encore dans la liste.' }));
    }

    function drawDetail() {
      const g = GUITARISTS.find((x) => x.id === current) || GUITARISTS[0];
      detail.innerHTML = '';
      const card = h('article', { class: 'panel gtr-card' });
      card.appendChild(h('h2', { class: 'gtr-name', text: g.name }));
      card.appendChild(h('div', { class: 'gtr-meta' }, [
        h('span', { text: '📅 ' + g.years }), h('span', { text: '📍 ' + g.origin }), h('span', { text: '🎵 ' + g.styles })
      ]));
      card.appendChild(h('div', { class: 'chips', style: 'margin:.4rem 0 1rem' }, g.bands.map((b) => h('span', { class: 'gtr-band', text: b }))));

      card.appendChild(h('h3', { class: 'gtr-section', text: '1. Sa vie et sa carrière' }));
      g.life.forEach((p) => card.appendChild(h('p', { text: p })));

      card.appendChild(h('h3', { class: 'gtr-section', text: '2. Son matériel' }));
      const gearGrid = h('div', { class: 'gtr-gear' });
      [['🎸', 'Guitares', g.gear.guitars], ['🔊', 'Amplis', g.gear.amps], ['🎛', 'Pédales / effets', g.gear.pedals], ['💡', 'À savoir', g.gear.notes]].forEach(([ic, t, v]) => {
        if (v) gearGrid.appendChild(h('div', { class: 'gtr-gear-item' }, [h('div', { class: 'gtr-gear-title', text: ic + ' ' + t }), h('p', { text: v })]));
      });
      card.appendChild(gearGrid);
      if (g.tone && window.TONE_REFS && window.TONE_REFS.some((r) => r.id === g.tone)) {
        const a = h('a', { class: 'btn', href: '#/guitare/son', text: '🎛 Obtenir ce son avec mon matériel →' });
        a.addEventListener('click', () => App.save('toneRef', g.tone));
        card.appendChild(h('div', { style: 'margin:.6rem 0' }, [a]));
      }

      card.appendChild(h('h3', { class: 'gtr-section', text: '3. Sa technique et son style' }));
      card.appendChild(h('ul', {}, g.technique.map((t) => h('li', { text: t }))));

      card.appendChild(h('h3', { class: 'gtr-section', text: '🎧 À écouter' }));
      card.appendChild(h('div', { class: 'chips' }, g.listen.map((s) => h('span', { class: 'gtr-band', text: s }))));
      detail.appendChild(card);
    }

    drawList();
    drawDetail();
  }

  App.register('/guitare/guitaristes', {
    title: 'Les guitaristes',
    subtitle: 'Choisis un guitariste : sa vie, son matériel (guitares, amplis, pédales) et ce qui caractérise sa façon de jouer.',
    render
  });

  window.Guitarists = GUITARISTS;
})();
