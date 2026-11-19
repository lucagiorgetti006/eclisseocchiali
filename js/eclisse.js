// eclisse.js – la pagina index1.html: gli occhiali "Eclisse" di Luca Giorgetti.
// In alto un'animazione continua su sfondo nero; in fondo le foto di varie viste,
// create "fotografando" lo stesso modello 3D da diversi punti di vista.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';


/* ===== il marmo: le lastre disegnate dal codice ===== */

// Non uso foto: disegno il marmo su un canvas con del "rumore" (nuvole morbide) e delle venature
// (onde deformate dal rumore, rese sottili). Ne creo due: un Carrara bianco con venature grigie
// e un filo d'oro, e un Nero Marquina con venature chiare e dorate. Il CSS le usa come sfondi
// attraverso le variabili --marmo-bianco e --marmo-nero.

// rumore "a valori": numeri a caso su una griglia, sfumati tra un punto e l'altro
function creaRumore(seme) {
    const lato = 256;
    const valori = new Float32Array(lato * lato);
    let s = seme;
    for (let i = 0; i < valori.length; i++) {
        s = (s * 16807) % 2147483647;          // numeri casuali ripetibili (lo stesso marmo ogni volta)
        valori[i] = s / 2147483647;
    }
    function liscio(t) {
        return t * t * (3 - 2 * t);
    }
    function valore(x, y) {
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const fx = liscio(x - x0), fy = liscio(y - y0);
        const a = valori[((y0 & 255) * lato) + (x0 & 255)];
        const b = valori[((y0 & 255) * lato) + ((x0 + 1) & 255)];
        const c = valori[(((y0 + 1) & 255) * lato) + (x0 & 255)];
        const d = valori[(((y0 + 1) & 255) * lato) + ((x0 + 1) & 255)];
        return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    // più strati di rumore, ognuno più fine e più leggero: è quello che dà l'aspetto "naturale"
    return function(x, y) {
        let somma = 0, ampiezza = 0.5, frequenza = 1;
        for (let o = 0; o < 6; o++) {
            somma += valore(x * frequenza, y * frequenza) * ampiezza;
            frequenza *= 2;
            ampiezza *= 0.5;
        }
        return somma;                               // circa da 0 a 1
    };
}

function creaMarmo(colori, seme) {
    const lato = 640;                               // abbastanza per uno sfondo, e si disegna in fretta
    const tela = document.createElement('canvas');
    tela.width = tela.height = lato;
    const ctx = tela.getContext('2d');
    const immagine = ctx.createImageData(lato, lato);
    const pixel = immagine.data;
    const rumore = creaRumore(seme);
    const rumore2 = creaRumore(seme * 7 + 3);

    for (let y = 0; y < lato; y++) {
        for (let x = 0; x < lato; x++) {
            const nx = x / 100, ny = y / 100;
            const nuvola = rumore(nx * 0.6, ny * 0.6);

            // le venature: onde in diagonale, piegate dal rumore; dove l'onda passa per lo zero c'è una vena sottile
            const onda1 = Math.sin((nx * 0.9 + ny * 0.55 + rumore(nx, ny) * 4.2) * Math.PI);
            const vena1 = Math.pow(1 - Math.abs(onda1), 18);
            const onda2 = Math.sin((nx * -0.5 + ny * 1.1 + rumore2(nx * 1.3, ny * 1.3) * 3.4) * Math.PI * 1.6);
            const vena2 = Math.pow(1 - Math.abs(onda2), 40) * 0.8;
            const onda3 = Math.sin((nx * 0.3 + ny * 0.2 + rumore2(nx * 0.7, ny * 0.7) * 6) * Math.PI * 0.7);
            const venaOro = Math.pow(1 - Math.abs(onda3), 60);

            const i = (y * lato + x) * 4;
            for (let k = 0; k < 3; k++) {
                // base con nuvole leggere
                let c = colori.base[k] + (nuvola - 0.5) * colori.nuvole;
                // vene (si mischiano al colore della vena)
                c += (colori.vena[k] - c) * Math.min(1, vena1 * colori.forzaVena + vena2 * colori.forzaVena * 0.6);
                c += (colori.oro[k] - c) * venaOro * colori.forzaOro;
                pixel[i + k] = c;
            }
            pixel[i + 3] = 255;
        }
    }
    ctx.putImageData(immagine, 0, 0);
    return tela.toDataURL('image/jpeg', 0.86);
}

const radice = document.documentElement.style;
radice.setProperty('--marmo-bianco', 'url(' + creaMarmo({
    base: [244, 240, 234], nuvole: 18, vena: [150, 144, 137], forzaVena: 0.55, oro: [201, 163, 91], forzaOro: 0.45
}, 1234) + ')');
radice.setProperty('--marmo-nero', 'url(' + creaMarmo({
    base: [20, 18, 17], nuvole: 22, vena: [226, 220, 210], forzaVena: 0.7, oro: [212, 172, 98], forzaOro: 0.85
}, 987) + ')');


/* ===== il carrello ===== */

// Ogni clic su "Aggiungi al carrello" aggiunge un paio di occhiali e il numero nel tondino sale.
// L'icona in alto a destra c'è sempre: cliccandola si apre il riquadro del carrello.
// Il numero è ricordato dal browser (localStorage), così resta anche ricaricando la pagina
const prezzoUnitario = 149.99;
const carrello = document.getElementById('carrello');
const numeroCarrello = document.getElementById('carrello-numero');
const bottoneCarrello = document.getElementById('aggiungi-carrello');
const pannelloCarrello = document.getElementById('pannello-carrello');

// 149.99 -> "149,99 €" (come si scrive in Italia)
const formatoEuro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

function leggiCarrello() {
    try {
        return Number(localStorage.getItem('eclisse-carrello')) || 0;
    } catch (errore) {
        return 0;   // se il browser non permette di salvare (es. navigazione privata), si riparte da 0
    }
}

function salvaCarrello(numero) {
    try {
        localStorage.setItem('eclisse-carrello', String(numero));
    } catch (errore) {
        // niente da fare: il carrello funziona lo stesso finché la pagina resta aperta
    }
}

let pezziNelCarrello = leggiCarrello();

// aggiorna tutto quello che dipende dal numero: tondino, testo per gli screen reader e riquadro
function mostraCarrello() {
    const vuoto = pezziNelCarrello === 0;

    numeroCarrello.hidden = vuoto;                 // il tondino solo se c'è qualcosa
    numeroCarrello.textContent = pezziNelCarrello;
    document.getElementById('carrello-testo').textContent = vuoto
        ? 'Carrello vuoto'
        : 'Nel carrello: ' + pezziNelCarrello + (pezziNelCarrello === 1 ? ' paio' : ' paia') + ' di occhiali';

    // nel riquadro: il messaggio "vuoto" oppure l'articolo con quantità e totale
    document.getElementById('carrello-vuoto').hidden = !vuoto;
    document.getElementById('carrello-pieno').hidden = vuoto;
    document.getElementById('quantita-carrello').textContent = pezziNelCarrello;
    document.getElementById('totale-carrello').textContent = formatoEuro.format(prezzoUnitario * pezziNelCarrello);
}
mostraCarrello();

// cambia il numero di occhiali nel carrello (mai sotto zero) e fa saltare il tondino
function cambiaCarrello(nuovoNumero) {
    const aumentato = nuovoNumero > pezziNelCarrello;
    pezziNelCarrello = Math.max(0, nuovoNumero);
    salvaCarrello(pezziNelCarrello);
    mostraCarrello();
    if (aumentato) {
        numeroCarrello.classList.remove('salta');
        void numeroCarrello.offsetWidth;           // tolgo e rimetto la classe per far ripartire l'animazione
        numeroCarrello.classList.add('salta');
    }
}

// --- aprire e chiudere il riquadro ---
function apriCarrello() {
    pannelloCarrello.hidden = false;
    carrello.setAttribute('aria-expanded', 'true');
}

function chiudiCarrello() {
    pannelloCarrello.hidden = true;
    carrello.setAttribute('aria-expanded', 'false');
}

carrello.addEventListener('click', function() {
    if (pannelloCarrello.hidden) {
        apriCarrello();
    } else {
        chiudiCarrello();
    }
});
document.getElementById('chiudi-carrello').addEventListener('click', chiudiCarrello);

// si chiude anche cliccando fuori o premendo Esc
document.addEventListener('click', function(e) {
    if (!pannelloCarrello.hidden && !e.target.closest('.eclisse-zona-carrello') && e.target !== bottoneCarrello) {
        chiudiCarrello();
    }
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        chiudiCarrello();
    }
});

// --- i bottoni dentro il riquadro ---
document.getElementById('aggiungi-uno').addEventListener('click', function() {
    cambiaCarrello(pezziNelCarrello + 1);
});
document.getElementById('togli-uno').addEventListener('click', function() {
    cambiaCarrello(pezziNelCarrello - 1);         // arrivati a zero compare "Il carrello è vuoto"
});
document.getElementById('svuota-carrello').addEventListener('click', function() {
    cambiaCarrello(0);
});

// il checkout: apre il modulo d'ordine (vedi "il modulo d'ordine" più in basso)
document.getElementById('checkout').addEventListener('click', function(e) {
    e.preventDefault();
    chiudiCarrello();
    apriOrdine();
});

bottoneCarrello.addEventListener('click', function() {
    cambiaCarrello(pezziNelCarrello + 1);

    // per un attimo il bottone dice "Aggiunto"
    bottoneCarrello.textContent = 'Aggiunto ✓';
    bottoneCarrello.classList.add('aggiunto');
    clearTimeout(bottoneCarrello.timer);
    bottoneCarrello.timer = setTimeout(function() {
        bottoneCarrello.textContent = 'Aggiungi al carrello';
        bottoneCarrello.classList.remove('aggiunto');
    }, 1400);
});


/* ===== la scena dell'animazione ===== */

const contenitore = document.getElementById('eclisse-scena');

const scena = new THREE.Scene();
scena.background = new THREE.Color('#000000');

const camera = new THREE.PerspectiveCamera(35, contenitore.clientWidth / contenitore.clientHeight, 0.1, 200);
camera.position.set(0, 0.6, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(contenitore.clientWidth, contenitore.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;    // luci forti senza "bruciare" i bianchi
contenitore.appendChild(renderer.domElement);

// riflessi morbidi (uno studio fotografico invisibile), bassi: lo sfondo deve restare nero
scena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scena.environmentIntensity = 0.35;

// luci da palcoscenico: una luce dall'alto e due luci di contorno colorate, fredda a sinistra e calda a destra
const luceAlto = new THREE.SpotLight('#ffffff', 60, 30, Math.PI / 6, 0.6);
luceAlto.position.set(0, 8, 4);
scena.add(luceAlto);
const contornoFreddo = new THREE.DirectionalLight('#7fb2ff', 2.0);
contornoFreddo.position.set(-6, 2, -3);
scena.add(contornoFreddo);
const contornoCaldo = new THREE.DirectionalLight('#ffb070', 2.0);
contornoCaldo.position.set(6, 1, -3);
scena.add(contornoCaldo);
scena.add(new THREE.AmbientLight('#ffffff', 0.15));


/* ----- la "corona" dell'eclisse: un anello di luce che pulsa dietro gli occhiali ----- */

// la disegno su un canvas 2D (un anello sfumato) e la uso come immagine su un quadrato
function creaCorona() {
    const tela = document.createElement('canvas');
    tela.width = tela.height = 512;
    const ctx = tela.getContext('2d');
    const sfumatura = ctx.createRadialGradient(256, 256, 120, 256, 256, 256);
    sfumatura.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
    sfumatura.addColorStop(0.18, 'rgba(255, 245, 230, 0.95)');   // il bordo luminoso
    sfumatura.addColorStop(0.35, 'rgba(255, 190, 120, 0.35)');
    sfumatura.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sfumatura;
    ctx.fillRect(0, 0, 512, 512);

    const materiale = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(tela),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending         // la luce si somma al nero: brilla
    });
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), materiale);
    corona.position.set(0, 0, -6);
    return corona;
}
const corona = creaCorona();
scena.add(corona);

// tante piccole stelle lontane, appena visibili
const stelle = new THREE.BufferGeometry();
const posizioniStelle = [];
for (let i = 0; i < 600; i++) {
    posizioniStelle.push((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50, -20 - Math.random() * 40);
}
stelle.setAttribute('position', new THREE.Float32BufferAttribute(posizioniStelle, 3));
scena.add(new THREE.Points(stelle, new THREE.PointsMaterial({ color: '#ffffff', size: 0.08, transparent: true, opacity: 0.6 })));


/* ===== gli occhiali ===== */

// "giro" è il gruppo che l'animazione muove e fa ruotare; dentro ci sono gli occhiali, centrati e grandi 2.6
const giro = new THREE.Group();
scena.add(giro);

// nel file (convertito da Rhino) le parti non hanno nome: le riconosco dall'ordine (vedi configuratore.js)
const nomiPerPosizione = { 2: 'naselli', 3: 'montatura', 4: 'ponte', 5: 'lenti', 6: 'asta_sinistra', 7: 'asta_destra' };

// i materiali di Eclisse: nel file ci sono solo i colori di lavoro di Rhino (blu, rosso, verde...),
// qui do a ogni parte una finitura vera
const finiture = {
    montatura: new THREE.MeshPhysicalMaterial({ color: '#0d0d0d', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),   // acetato nero lucido
    asta_sinistra: null,   // uguale alla montatura (assegnato sotto)
    asta_destra: null,
    lenti: new THREE.MeshPhysicalMaterial({ color: '#2a3440', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55 }),   // lenti scure
    ponte: new THREE.MeshStandardMaterial({ color: '#c9a35b', metalness: 1, roughness: 0.3 }),   // metallo dorato
    naselli: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, transparent: true, opacity: 0.6 })   // silicone trasparente
};
finiture.asta_sinistra = finiture.montatura;
finiture.asta_destra = finiture.montatura;

const parti = {};          // parte per nome
const cerniere = [];       // le due stanghette, ciascuna dentro un perno sulla sua cerniera
const pezziEsplosi = [];   // { oggetto, base, spostamento } per la vista "esplosa"

new GLTFLoader().load('models/galleria/lucagiorgetti.glb', function(gltf) {
    const occhiali = gltf.scene;

    occhiali.children.slice().forEach(function(pezzo, posizione) {
        const nome = nomiPerPosizione[posizione];
        if (nome === undefined) {
            pezzo.visible = false;               // i due punti di costruzione rimasti dal disegno
            return;
        }
        pezzo.name = nome;
        parti[nome] = pezzo;
        pezzo.traverse(function(superficie) {
            if (superficie.isMesh) {
                superficie.material = finiture[nome];
                superficie.material.side = THREE.DoubleSide;
            }
        });
    });

    preparaCerniere(occhiali);
    preparaEsploso(occhiali);

    // grandezza e posizione: larghi 2.6 e al centro
    const scatola = new THREE.Box3().setFromObject(occhiali);
    const misure = scatola.getSize(new THREE.Vector3());
    const centro = scatola.getCenter(new THREE.Vector3());
    const scala = 2.6 / misure.x;
    occhiali.scale.setScalar(scala);
    occhiali.position.set(-centro.x * scala, -centro.y * scala, -centro.z * scala);
    giro.add(occhiali);

    document.getElementById('eclisse-caricamento').remove();

    // prima le foto (con gli occhiali fermi), poi parte l'animazione
    scattaFotoViste();
    renderer.setAnimationLoop(anima);
});


/* ----- le stanghette: ognuna gira attorno alla sua cerniera ----- */

// (stesso metodo usato in configuratore.js) la cerniera è all'estremità della stanghetta
// attaccata alla montatura: metto la stanghetta dentro un "perno" posizionato lì e faccio girare il perno
function preparaCerniere(occhiali) {
    const centroOcchiali = new THREE.Box3().setFromObject(occhiali).getCenter(new THREE.Vector3());

    ['asta_sinistra', 'asta_destra'].forEach(function(nome, i) {
        const asta = parti[nome];
        const scatola = new THREE.Box3().setFromObject(asta);
        const centro = scatola.getCenter(new THREE.Vector3());
        const cerniera = new THREE.Vector3(centro.x, centro.y, scatola.max.z);

        const perno = new THREE.Group();
        perno.position.copy(cerniera);
        occhiali.add(perno);
        asta.position.sub(cerniera);
        perno.add(asta);

        cerniere.push({
            perno: perno,
            verso: centro.x > centroOcchiali.x ? 1 : -1,               // si piegano verso il centro
            angolo: THREE.MathUtils.degToRad(i === 0 ? 86 : 80)        // una sopra l'altra
        });
        parti[nome + '_perno'] = perno;
    });
}

// apertura delle stanghette: 0 = aperte, 1 = chiuse
function chiudiStanghette(quanto) {
    cerniere.forEach(function(c) {
        c.perno.rotation.y = c.verso * c.angolo * quanto;
    });
}


/* ----- la vista "esplosa": le parti si allontanano e poi tornano al loro posto ----- */

// spostamenti nelle unità del file (gli occhiali sono larghi circa 0.24)
function preparaEsploso(occhiali) {
    const spostamenti = [
        ['lenti', new THREE.Vector3(0, 0, 0.07)],              // le lenti escono in avanti
        ['ponte', new THREE.Vector3(0, 0.06, 0.04)],           // il ponte sale
        ['naselli', new THREE.Vector3(0, -0.05, 0.02)],        // i naselli scendono
        ['montatura', new THREE.Vector3(0, 0, -0.02)],         // la montatura arretra appena
        ['asta_sinistra_perno', null],                         // le stanghette si allargano ai lati
        ['asta_destra_perno', null]
    ];
    const centroOcchiali = new THREE.Box3().setFromObject(occhiali).getCenter(new THREE.Vector3());

    spostamenti.forEach(function(voce) {
        const oggetto = parti[voce[0]];
        let spostamento = voce[1];
        if (spostamento === null) {
            const lato = oggetto.position.x > centroOcchiali.x ? 1 : -1;
            spostamento = new THREE.Vector3(lato * 0.09, 0, -0.05);
        }
        pezziEsplosi.push({ oggetto: oggetto, base: oggetto.position.clone(), spostamento: spostamento });
    });
}

// esplosione: 0 = occhiali montati, 1 = parti tutte staccate
function esplodi(quanto) {
    pezziEsplosi.forEach(function(p) {
        p.oggetto.position.copy(p.base).addScaledVector(p.spostamento, quanto);
    });
}


/* ===== l'animazione: una sequenza di 26 secondi che si ripete ===== */

// movimento morbido tra 0 e 1: parte piano, accelera, rallenta
function morbido(x) {
    x = Math.min(Math.max(x, 0), 1);
    return x * x * (3 - 2 * x);
}

// quanto è avanti la fase che va dal secondo "da" al secondo "a" (0 prima, 1 dopo)
function fase(t, da, a) {
    return morbido((t - da) / (a - da));
}

const durata = 26;
const orologio = new THREE.Clock();

function posa(t) {
    // valori di partenza: occhiali al centro, fermi, montati, stanghette aperte
    let x = 0, y = 0, z = 0;
    let girY = 0, girX = 0, girZ = 0;
    let chiusura = 0, esplosione = 0;

    // 0–3 s · ingresso: arrivano da lontano girando su se stessi
    const ingresso = fase(t, 0, 3);
    z = -40 * (1 - ingresso);
    girY = -Math.PI * 4 * (1 - ingresso);

    // 3–9 s · un giro completo lento, galleggiando
    girY += Math.PI * 2 * fase(t, 3, 9);
    y += Math.sin(t * 1.4) * 0.12;
    girZ = Math.sin(t * 0.9) * 0.06;

    // 9–12 s · si girano di tre quarti e chiudono le stanghette; 12–14 s · le riaprono
    girY += -0.7 * fase(t, 9, 10) + 0.7 * fase(t, 14, 15);
    chiusura = fase(t, 10, 12) - fase(t, 12.5, 14);

    // 15–18 s · vista esplosa, 18–20 s · le parti tornano al loro posto
    esplosione = fase(t, 15, 17) - fase(t, 18, 20);
    girY += 0.5 * Math.sin(Math.PI * fase(t, 15, 20));   // un leggero movimento mentre sono staccate

    // 20–23 s · salto mortale: salgono, fanno una capriola e atterrano
    const salto = fase(t, 20, 23);
    y += Math.sin(Math.PI * salto) * 1.2;
    girX = Math.PI * 2 * salto;

    // 23–26 s · uscita: girano veloci e si allontanano nel buio (poi la sequenza ricomincia)
    const uscita = fase(t, 23, 26);
    z += -40 * uscita;
    girY += Math.PI * 4 * uscita;

    giro.position.set(x, y, z);
    giro.rotation.set(girX, girY, girZ);
    chiudiStanghette(chiusura);
    esplodi(esplosione);

    // la corona pulsa piano e si accende di più quando gli occhiali sono al centro
    const presenza = ingresso * (1 - uscita);
    corona.material.opacity = (0.55 + 0.15 * Math.sin(t * 2)) * presenza;
    corona.scale.setScalar(1 + 0.04 * Math.sin(t * 1.3));
}

function anima() {
    posa(orologio.getElapsedTime() % durata);
    renderer.render(scena, camera);
}

window.addEventListener('resize', function() {
    camera.aspect = contenitore.clientWidth / contenitore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(contenitore.clientWidth, contenitore.clientHeight);
});


/* ===== le foto delle viste ===== */

// Uso un secondo renderer, che non si vede, per "fotografare" gli occhiali da sei punti di vista
// su sfondo chiaro, e metto ogni foto nel suo <img>
function scattaFotoViste() {
    const fotografo = new THREE.WebGLRenderer({ antialias: true });
    fotografo.toneMapping = THREE.ACESFilmicToneMapping;
    fotografo.shadowMap.enabled = true;
    fotografo.shadowMap.type = THREE.PCFSoftShadowMap;

    // lo studio: lo stesso avorio caldo delle cornici della pagina, luce morbida e calda
    const studio = new THREE.Scene();
    studio.background = new THREE.Color('#ece6dc');
    studio.environment = new THREE.PMREMGenerator(fotografo).fromScene(new RoomEnvironment(), 0.04).texture;
    studio.environmentIntensity = 0.9;
    studio.add(new THREE.HemisphereLight('#fffaf2', '#d8cfc2', 0.7));
    const luceStudio = new THREE.DirectionalLight('#fff4e6', 1.6);
    luceStudio.position.set(2, 6, 3);
    luceStudio.castShadow = true;
    luceStudio.shadow.mapSize.set(2048, 2048);
    luceStudio.shadow.radius = 8;                 // ombra molto sfumata
    luceStudio.shadow.bias = -0.0005;
    studio.add(luceStudio);

    // un piano invisibile sotto gli occhiali che mostra solo la loro ombra, leggera
    const piano = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.12 }));
    piano.rotation.x = -Math.PI / 2;
    piano.receiveShadow = true;
    studio.add(piano);

    // sposto per un momento gli occhiali nello studio, fermi, montati e con le stanghette aperte
    studio.add(giro);
    giro.position.set(0, 0, 0);
    giro.rotation.set(0, 0, 0);
    esplodi(0);
    chiudiStanghette(0);
    giro.traverse(function(parte) {
        if (parte.isMesh) {
            parte.castShadow = true;
        }
    });
    giro.updateMatrixWorld(true);
    piano.position.y = new THREE.Box3().setFromObject(giro).min.y - 0.02;   // appena sotto il punto più basso

    // ogni vista: da dove guarda la camera (le foto verticali da più lontano, perché sono più strette)
    const viste = {
        'frontale':   [0, 0.25, 8],
        'tre-quarti': [6.4, 2.6, 7.4],
        'laterale':   [10.2, 0.6, -0.8],
        'alto':       [0, 10.2, 0.01],
        'posteriore': [-6.4, 2.6, -7.4]
    };
    const obiettivo = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    document.querySelectorAll('.eclisse-figura img').forEach(function(img) {
        // le proporzioni della foto: "16:10" per quella grande, "4:5" per le verticali
        const formato = (img.dataset.formato || '4:5').split(':').map(Number);
        const larghezza = 1600;
        const altezza = Math.round(larghezza * formato[1] / formato[0]);
        fotografo.setSize(larghezza, altezza, false);
        obiettivo.aspect = larghezza / altezza;
        obiettivo.updateProjectionMatrix();

        obiettivo.position.fromArray(viste[img.dataset.vista]);
        // dall'alto la camera guarda in giù: le dico che "su" è verso il retro, così il davanti sta in basso nella foto
        if (img.dataset.vista === 'alto') {
            obiettivo.up.set(0, 0, -1);
        } else {
            obiettivo.up.set(0, 1, 0);
        }
        obiettivo.lookAt(0, 0, 0);

        fotografo.render(studio, obiettivo);
        img.src = fotografo.domElement.toDataURL('image/jpeg', 0.92);
    });

    // la foto piccola nel carrello: la vista di tre quarti, quadrata
    fotografo.setSize(400, 400, false);
    obiettivo.aspect = 1;
    obiettivo.updateProjectionMatrix();
    obiettivo.up.set(0, 1, 0);
    obiettivo.position.set(5.2, 2.2, 6);
    obiettivo.lookAt(0, 0, 0);
    fotografo.render(studio, obiettivo);
    document.getElementById('articolo-foto').src = fotografo.domElement.toDataURL('image/jpeg', 0.9);

    // rimetto gli occhiali nella scena dell'animazione e libero il fotografo
    scena.add(giro);
    fotografo.dispose();
}


/* ===== provali: gli occhiali sul tuo viso, con la telecamera ===== */

// Come nella pagina dettaglio.html: MediaPipe Face Landmarker (gratuito, di Google) trova il viso
// nel video e ne segue posizione e rotazione. Tutto avviene nel browser: il video non esce dal computer.
// La libreria e il modello del viso si scaricano solo la prima volta che accendi la telecamera
const indirizzoMediaPipe = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const indirizzoModelloViso = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const PUNTO_TRA_GLI_OCCHI = 168;     // la radice del naso, dove appoggia il ponte
const PUNTO_TEMPIA_DESTRA = 127;     // i lati del viso all'altezza degli occhi:
const PUNTO_TEMPIA_SINISTRA = 356;   // la loro distanza dà la larghezza degli occhiali

const schermoProva = document.getElementById('schermo-prova');
const videoProva = document.getElementById('video-prova');
const anteprimaProva = document.getElementById('anteprima-prova');

let provaAccesa = false;
let flussoProva = null;
let riconoscitore = null;
let rendererProva = null;
let ultimoTempo = -1;

function messaggioProva(testo) {
    document.getElementById('messaggio-prova').textContent = testo;
}

// la scena sopra il video: camera ortografica che misura in pixel come lo schermo
const scenaProva = new THREE.Scene();
const cameraProva = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
scenaProva.add(new THREE.HemisphereLight('#ffffff', '#887766', 1.2));
const luceProva = new THREE.DirectionalLight('#fff4e6', 1.6);
luceProva.position.set(0, 1, 2);
scenaProva.add(luceProva);

// "testa" segue il viso; dentro, gli occhiali sono larghi 1 con la montatura davanti in z = 0
const testa = new THREE.Group();
testa.visible = false;
scenaProva.add(testa);

// una testa invisibile dietro gli occhiali: nasconde le stanghette quando passano dietro al viso
const nascondiStanghette = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshBasicMaterial({ colorWrite: false }));
nascondiStanghette.scale.set(0.46, 0.62, 0.55);
nascondiStanghette.position.set(0, -0.1, -0.58);
nascondiStanghette.renderOrder = -1;
testa.add(nascondiStanghette);

let occhialiSulViso = null;

// prendo una copia degli occhiali dell'animazione, aperti e montati, e la sistemo sul viso
function preparaOcchialiSulViso() {
    if (occhialiSulViso !== null || giro.children.length === 0) {
        return;
    }
    chiudiStanghette(0);
    esplodi(0);
    const copia = giro.children[0].clone();
    copia.scale.setScalar(1);
    copia.position.set(0, 0, 0);
    copia.updateMatrixWorld(true);
    const scatola = new THREE.Box3().setFromObject(copia);
    const misure = scatola.getSize(new THREE.Vector3());
    const centro = scatola.getCenter(new THREE.Vector3());
    const s = 1 / misure.x;
    copia.scale.setScalar(s);
    copia.position.set(-centro.x * s, -centro.y * s, -scatola.max.z * s);
    testa.add(copia);
    occhialiSulViso = copia;
}

async function apriProva() {
    preparaOcchialiSulViso();
    provaAccesa = true;
    schermoProva.hidden = false;
    anteprimaProva.hidden = true;
    messaggioProva('Accendo la telecamera…');
    renderer.setAnimationLoop(null);              // fermo l'animazione in alto: non si vede e consumerebbe

    // schermo intero vero, se il browser lo permette (altrimenti copre comunque tutta la finestra)
    if (schermoProva.requestFullscreen) {
        schermoProva.requestFullscreen().catch(function() {});
    }

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('non supportata');
        }
        flussoProva = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 }, audio: false });
        videoProva.srcObject = flussoProva;
        await videoProva.play();

        if (riconoscitore === null) {
            messaggioProva('Preparo il riconoscimento del viso…');
            const vision = await import(indirizzoMediaPipe + '/vision_bundle.mjs');
            const file = await vision.FilesetResolver.forVisionTasks(indirizzoMediaPipe + '/wasm');
            riconoscitore = await vision.FaceLandmarker.createFromOptions(file, {
                baseOptions: { modelAssetPath: indirizzoModelloViso, delegate: 'GPU' },
                runningMode: 'VIDEO',
                numFaces: 1,
                outputFacialTransformationMatrixes: true
            });
        }
        if (rendererProva === null) {
            // preserveDrawingBuffer: tiene l'ultimo disegno, così la foto può copiarlo
            rendererProva = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
            rendererProva.setPixelRatio(window.devicePixelRatio);
            rendererProva.toneMapping = THREE.ACESFilmicToneMapping;
            rendererProva.domElement.style.pointerEvents = 'none';
            schermoProva.insertBefore(rendererProva.domElement, videoProva.nextSibling);
        }
        if (!provaAccesa) {
            return;                                   // nel frattempo sei uscito
        }
        messaggioProva('Cerco il tuo viso…');
        rendererProva.setAnimationLoop(fotogrammaProva);
    } catch (errore) {
        if (errore.name === 'NotAllowedError') {
            messaggioProva('Non hai dato il permesso di usare la telecamera.');
        } else if (errore.name === 'NotFoundError') {
            messaggioProva('Non ho trovato nessuna telecamera.');
        } else if (errore.message === 'non supportata') {
            messaggioProva('Per usare la telecamera apri la pagina da localhost o https.');
        } else {
            messaggioProva('Non è stato possibile avviare la prova.');
        }
        fermaTelecamera();
    }
}

function fermaTelecamera() {
    if (flussoProva) {
        flussoProva.getTracks().forEach(function(traccia) { traccia.stop(); });   // la lucina si spegne
        flussoProva = null;
    }
    videoProva.srcObject = null;
    if (rendererProva) {
        rendererProva.setAnimationLoop(null);
    }
}

function esciProva() {
    provaAccesa = false;
    fermaTelecamera();
    schermoProva.hidden = true;
    anteprimaProva.hidden = true;
    testa.visible = false;
    messaggioProva('');
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(function() {});
    }
    renderer.setAnimationLoop(anima);             // riparte l'animazione in alto
}

document.getElementById('apri-prova').addEventListener('click', apriProva);
document.getElementById('esci-prova').addEventListener('click', esciProva);
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && provaAccesa) {
        esciProva();
    }
});

// la dimensione scelta col cursore in alto a destra (1 = 100%, da 70% a 140%):
// cambia mentre lo trascini, gli occhiali crescono o si rimpiccioliscono man mano
let dimensioneProva = 1;
const cursoreDimensioneProva = document.getElementById('dimensione-prova');
cursoreDimensioneProva.addEventListener('input', function() {
    dimensioneProva = Number(cursoreDimensioneProva.value) / 100;
    document.getElementById('valore-dimensione-prova').textContent = cursoreDimensioneProva.value + '%';
});

// valori "ammorbiditi", così gli occhiali non tremano
const posizioneMorbida = new THREE.Vector3();
const rotazioneMorbida = new THREE.Quaternion();
let larghezzaMorbida = 0;
let primoViso = true;

function fotogrammaProva() {
    const larghezza = schermoProva.clientWidth;
    const altezza = schermoProva.clientHeight;
    rendererProva.setSize(larghezza, altezza);
    cameraProva.left = -larghezza / 2;
    cameraProva.right = larghezza / 2;
    cameraProva.top = altezza / 2;
    cameraProva.bottom = -altezza / 2;
    cameraProva.updateProjectionMatrix();

    if (videoProva.readyState >= 2 && videoProva.currentTime !== ultimoTempo) {
        ultimoTempo = videoProva.currentTime;
        const risultato = riconoscitore.detectForVideo(videoProva, performance.now());
        if (risultato.faceLandmarks.length === 0) {
            testa.visible = false;
            primoViso = true;
            messaggioProva('Cerco il tuo viso…');
        } else {
            messaggioProva('');
            mettiSulViso(risultato.faceLandmarks[0], risultato.facialTransformationMatrixes[0], larghezza, altezza);
        }
    }
    rendererProva.render(scenaProva, cameraProva);
}

function mettiSulViso(punti, matrice, larghezza, altezza) {
    // il video è mostrato con object-fit: cover: calcolo ingrandimento e margini per portare i punti sullo schermo
    const ingrandimento = Math.max(larghezza / videoProva.videoWidth, altezza / videoProva.videoHeight);
    const larghezzaVideo = videoProva.videoWidth * ingrandimento;
    const altezzaVideo = videoProva.videoHeight * ingrandimento;
    const margineX = (larghezza - larghezzaVideo) / 2;
    const margineY = (altezza - altezzaVideo) / 2;
    function inPixel(p) {
        return new THREE.Vector3(
            margineX + p.x * larghezzaVideo - larghezza / 2,
            altezza / 2 - (margineY + p.y * altezzaVideo),
            -p.z * larghezzaVideo
        );
    }

    const radiceNaso = inPixel(punti[PUNTO_TRA_GLI_OCCHI]);
    const larghezzaViso = inPixel(punti[PUNTO_TEMPIA_DESTRA]).distanceTo(inPixel(punti[PUNTO_TEMPIA_SINISTRA]));
    const rotazione = new THREE.Quaternion();
    new THREE.Matrix4().fromArray(matrice.data).decompose(new THREE.Vector3(), rotazione, new THREE.Vector3());

    if (primoViso) {
        posizioneMorbida.copy(radiceNaso);
        rotazioneMorbida.copy(rotazione);
        larghezzaMorbida = larghezzaViso;
        primoViso = false;
    } else {
        posizioneMorbida.lerp(radiceNaso, 0.5);
        rotazioneMorbida.slerp(rotazione, 0.5);
        larghezzaMorbida += (larghezzaViso - larghezzaMorbida) * 0.5;
    }
    testa.position.copy(posizioneMorbida);
    testa.quaternion.copy(rotazioneMorbida);
    testa.scale.setScalar(larghezzaMorbida * 1.05 * dimensioneProva);   // poco più larghi del viso, per la dimensione scelta
    testa.visible = true;
}


/* ----- la foto: scatta, guarda l'anteprima, salvala se vuoi ----- */

let fotoProva = null;   // l'ultima foto (file JPEG)

document.getElementById('scatta-prova').addEventListener('click', function() {
    if (!rendererProva || videoProva.readyState < 2) {
        return;
    }
    const tela3D = rendererProva.domElement;
    const foto = document.createElement('canvas');
    foto.width = tela3D.width;
    foto.height = tela3D.height;
    const ctx = foto.getContext('2d');

    // specchiata come la vedi sullo schermo
    ctx.translate(foto.width, 0);
    ctx.scale(-1, 1);
    const ingrandimento = Math.max(foto.width / videoProva.videoWidth, foto.height / videoProva.videoHeight);
    const larghezzaTaglio = foto.width / ingrandimento;
    const altezzaTaglio = foto.height / ingrandimento;
    ctx.drawImage(videoProva,
        (videoProva.videoWidth - larghezzaTaglio) / 2, (videoProva.videoHeight - altezzaTaglio) / 2, larghezzaTaglio, altezzaTaglio,
        0, 0, foto.width, foto.height);
    ctx.drawImage(tela3D, 0, 0, foto.width, foto.height);

    foto.toBlob(function(file) {
        fotoProva = file;
        const img = document.getElementById('foto-prova');
        if (img.src) {
            URL.revokeObjectURL(img.src);
        }
        img.src = URL.createObjectURL(file);
        anteprimaProva.hidden = false;
    }, 'image/jpeg', 0.92);

    // un lampo bianco, come una macchina fotografica: un velo bianco sopra tutto che svanisce
    const lampo = document.createElement('div');
    lampo.style.cssText = 'position:absolute; inset:0; background:#ffffff; z-index:5; pointer-events:none;';
    schermoProva.appendChild(lampo);
    lampo.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 400, easing: 'ease-out' }).onfinish = function() {
        lampo.remove();
    };
});

// salva la foto sul computer
document.getElementById('salva-prova').addEventListener('click', function() {
    if (fotoProva === null) {
        return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(fotoProva);
    link.download = 'eclisse-luca-giorgetti.jpg';
    link.click();
    setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
    anteprimaProva.hidden = true;
    messaggioProva('Foto salvata');
    setTimeout(function() { messaggioProva(''); }, 2000);
});

// chiude l'anteprima e torna alla prova
document.getElementById('riprova').addEventListener('click', function() {
    anteprimaProva.hidden = true;
});

/* ===== il modulo d'ordine ===== */

// Due passi: 1) chi ordina e dove spedire, 2) la carta. Con "Acquista" parte un'email al negozio
// con nome, cognome, email e indirizzo di chi ha ordinato, più l'ordine (quanti paia e il totale).
// I dati della carta vengono solo controllati qui nella pagina: NON vengono inviati né salvati
// (un numero di carta non va mai spedito per email). È un negozio dimostrativo: nessun addebito.
//
// L'email la spedisce FormSubmit (formsubmit.co), un servizio gratuito: la prima volta manda
// all'indirizzo qui sotto un'email di attivazione da confermare; dopo, arrivano tutti gli ordini
const emailNegozio = 'lucagiorgetti006@gmail.com';

const ordine = document.getElementById('ordine');
const moduloOrdine = document.getElementById('modulo-ordine');
const passo1 = document.getElementById('passo-1');
const passo2 = document.getElementById('passo-2');
const confermaOrdine = document.getElementById('conferma-ordine');

function mostraPasso(numero) {
    passo1.hidden = numero !== 1;
    passo2.hidden = numero !== 2;
    confermaOrdine.hidden = numero !== 3;
    document.getElementById('segno-passo-1').classList.toggle('attivo', numero === 1);
    document.getElementById('segno-passo-2').classList.toggle('attivo', numero === 2);
    document.querySelector('.eclisse-passi').hidden = numero === 3;
}

function apriOrdine() {
    if (pezziNelCarrello === 0) {
        return;
    }
    document.getElementById('riepilogo-1').textContent =
        pezziNelCarrello + (pezziNelCarrello === 1 ? ' paio' : ' paia') + ' · ' + formatoEuro.format(prezzoUnitario * pezziNelCarrello);
    document.getElementById('errore-ordine').textContent = '';
    mostraPasso(1);
    ordine.hidden = false;
    moduloOrdine.elements['nome'].focus();
}

function chiudiOrdine() {
    ordine.hidden = true;
}

document.getElementById('chiudi-ordine').addEventListener('click', chiudiOrdine);
ordine.addEventListener('click', function(e) {
    if (e.target === ordine && confermaOrdine.hidden) {
        chiudiOrdine();                          // clic sul velo scuro, fuori dalla finestra (non dopo l'acquisto)
    }
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !ordine.hidden && confermaOrdine.hidden) {
        chiudiOrdine();
    }
});

// dopo l'acquisto: conto alla rovescia e poi si torna alla home del sito (index.html)
function tornaAllaHome(secondi) {
    const testo = document.getElementById('conferma-ritorno');
    function scrivi() {
        testo.textContent = 'Tra ' + secondi + (secondi === 1 ? ' secondo' : ' secondi') + ' torni alla home…';
    }
    scrivi();
    const timer = setInterval(function() {
        secondi--;
        if (secondi <= 0) {
            clearInterval(timer);
            window.location.href = 'index.html';
        } else {
            scrivi();
        }
    }, 1000);
}

// controlla i campi di un passo: segna in rosso quelli sbagliati e porta il cursore sul primo
function campiValidi(passo) {
    let primoSbagliato = null;
    passo.querySelectorAll('input').forEach(function(campo) {
        campo.value = campo.value.trim() === '' ? '' : campo.value;
        let valido = campo.checkValidity();
        if (valido && campo.name === 'numero-carta') {
            valido = numeroCartaValido(campo.value);
        }
        if (valido && campo.name === 'scadenza') {
            valido = scadenzaValida(campo.value);
        }
        campo.classList.toggle('sbagliato', !valido);
        if (!valido && primoSbagliato === null) {
            primoSbagliato = campo;
        }
    });
    if (primoSbagliato !== null) {
        primoSbagliato.focus();
        return false;
    }
    return true;
}

// il numero della carta: il controllo di Luhn, lo stesso che usano i negozi veri per scoprire gli errori di battitura
function numeroCartaValido(testo) {
    const cifre = testo.replace(/\s/g, '');
    if (!/^[0-9]{13,19}$/.test(cifre)) {
        return false;
    }
    let somma = 0;
    for (let i = 0; i < cifre.length; i++) {
        let cifra = Number(cifre[cifre.length - 1 - i]);
        if (i % 2 === 1) {
            cifra *= 2;
            if (cifra > 9) {
                cifra -= 9;
            }
        }
        somma += cifra;
    }
    return somma % 10 === 0;
}

// la scadenza: MM/AA e non già passata
function scadenzaValida(testo) {
    const parti = testo.split('/');
    if (parti.length !== 2) {
        return false;
    }
    const mese = Number(parti[0]);
    const anno = 2000 + Number(parti[1]);
    const oggi = new Date();
    return anno > oggi.getFullYear() || (anno === oggi.getFullYear() && mese >= oggi.getMonth() + 1);
}

// mentre scrivi: il numero della carta a gruppi di 4 cifre, la scadenza con la "/" automatica
moduloOrdine.elements['numero-carta'].addEventListener('input', function(e) {
    const cifre = e.target.value.replace(/\D/g, '').slice(0, 19);
    e.target.value = cifre.replace(/(.{4})/g, '$1 ').trim();
});
moduloOrdine.elements['scadenza'].addEventListener('input', function(e) {
    const cifre = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = cifre.length > 2 ? cifre.slice(0, 2) + '/' + cifre.slice(2) : cifre;
});
moduloOrdine.elements['cvv'].addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});
// quando correggi un campo, il rosso sparisce
moduloOrdine.addEventListener('input', function(e) {
    e.target.classList.remove('sbagliato');
});

document.getElementById('vai-pagamento').addEventListener('click', function() {
    if (campiValidi(passo1)) {
        mostraPasso(2);
        moduloOrdine.elements['intestatario'].focus();
    }
});
document.getElementById('torna-spedizione').addEventListener('click', function() {
    mostraPasso(1);
});

// "Acquista"
moduloOrdine.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!campiValidi(passo2)) {
        return;
    }

    const dati = moduloOrdine.elements;
    const nome = dati['nome'].value.trim();
    const cognome = dati['cognome'].value.trim();
    const totale = formatoEuro.format(prezzoUnitario * pezziNelCarrello);
    const paia = pezziNelCarrello + (pezziNelCarrello === 1 ? ' paio' : ' paia');

    const bottone = document.getElementById('acquista');
    bottone.disabled = true;
    document.getElementById('testo-acquista').textContent = 'Invio dell\'ordine…';
    document.getElementById('errore-ordine').textContent = '';

    // l'email al negozio: SOLO chi ordina, dove spedire e l'ordine (niente dati della carta)
    const email = {
        '_subject': 'Nuovo ordine Eclisse: ' + nome + ' ' + cognome,
        '_template': 'table',                    // l'email arriva come una tabella ordinata
        '_replyto': dati['email'].value.trim(),  // rispondendo all'email si scrive a chi ha ordinato
        '_captcha': 'false',
        'Nome': nome,
        'Cognome': cognome,
        'Email': dati['email'].value.trim(),
        'Indirizzo': dati['indirizzo'].value.trim(),
        'CAP': dati['cap'].value.trim(),
        'Città': dati['citta'].value.trim(),
        'Stato': dati['stato'].value.trim(),
        'Ordine': 'Eclisse (Luca Giorgetti) × ' + paia,
        'Totale': totale
    };

    try {
        const risposta = await fetch('https://formsubmit.co/ajax/' + emailNegozio, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(email)
        });
        const esito = await risposta.json().catch(function() { return {}; });
        if (!risposta.ok || String(esito.success) === 'false') {
            throw new Error(esito.message || 'invio non riuscito');
        }

        // fatto: conferma, carrello vuoto, e i dati della carta cancellati dal modulo
        document.getElementById('conferma-testo').textContent =
            nome + ', abbiamo ricevuto il tuo ordine di ' + paia + ' di Eclisse (' + totale + '). ' +
            'Li spediremo a ' + dati['indirizzo'].value.trim() + ', ' + dati['cap'].value.trim() + ' ' +
            dati['citta'].value.trim() + ' (' + dati['stato'].value.trim() + ').';
        ['intestatario', 'numero-carta', 'scadenza', 'cvv'].forEach(function(nomeCampo) {
            dati[nomeCampo].value = '';
        });
        cambiaCarrello(0);
        mostraPasso(3);
        tornaAllaHome(5);
    } catch (errore) {
        // la prima volta FormSubmit risponde che l'indirizzo va ancora attivato (e manda l'email di attivazione)
        if (/activat/i.test(errore.message)) {
            document.getElementById('errore-ordine').textContent =
                'La ricezione degli ordini non è ancora attiva: è stata inviata un\'email di attivazione a ' +
                emailNegozio + '. Dopo averla confermata, riprova.';
        } else {
            document.getElementById('errore-ordine').textContent =
                'Non è stato possibile inviare l\'ordine. Controlla la connessione e riprova.';
        }
    } finally {
        bottone.disabled = false;
        document.getElementById('testo-acquista').textContent = 'Acquista';
    }
});