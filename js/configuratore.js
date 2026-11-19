// configuratore.js – tutto il JavaScript della pagina
// È caricato come modulo (type="module"): parte quando l'HTML è già pronto,
// quindi non serve aspettare DOMContentLoaded.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';


/* ===== menu mobile ===== */

const btnMenu = document.querySelector('.btn-menu');
const btnClose = document.querySelector('.btn-close');
const mobileNavWrapper = document.querySelector('.mobile-nav-wrapper');
const navLinks = document.querySelectorAll('.mobile-nav-wrapper .nav-link');

// Assicurati che il display sia flex prima di aggiungere show
btnMenu.addEventListener('click', function() {
    mobileNavWrapper.style.display = 'flex';
    // Piccolo delay per permettere al display di attivarsi
    setTimeout(() => {
        mobileNavWrapper.classList.add('show');
    }, 10);
});

// Chiude il menu mobile
function closeMenu() {
    mobileNavWrapper.classList.remove('show');
    // Rimuovi display dopo l'animazione
    setTimeout(() => {
        if (!mobileNavWrapper.classList.contains('show')) {
            mobileNavWrapper.style.display = 'none';
        }
    }, 300); // Stesso tempo della transizione CSS
}

btnClose.addEventListener('click', closeMenu);

mobileNavWrapper.addEventListener('click', function(e) {
    let isLink = false;
    navLinks.forEach(function(link) {
        if (link.contains(e.target)) {
            isLink = true;
        }
    });

    if (!isLink) {
        closeMenu();
    }
});


/* ===== Three.js: il modello dentro il visore ===== */

const visore = document.getElementById('visore');

// la scena, con lo stesso sfondo del visore
const scena = new THREE.Scene();
// la scena non ha uno sfondo suo: è trasparente e si vede il grigio del #visore (nel CSS)

// la camera, che guarda il modello da un po' di distanza
const camera = new THREE.PerspectiveCamera(45, visore.clientWidth / visore.clientHeight, 0.1, 100);
camera.position.set(3, 2.5, 4);

// il renderer disegna la scena in un <canvas>, che mettiamo nel visore
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });   // alpha = canvas trasparente
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(visore.clientWidth, visore.clientHeight);
visore.querySelector('.visore-segnaposto').remove(); // tolgo la scritta "Qui arriverà il modello 3D"
visore.appendChild(renderer.domElement);

// accendo le ombre nel renderer (PCFSoft = ombre con i bordi morbidi)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;


/* ----- le luci -----
   Tutte bianche neutre e non troppo forti: così i colori della lampada
   si vedono come sono davvero (il crema resta crema e non diventa bianco) */

// 1. luce d'ambiente: schiarisce le parti in ombra, così non diventano completamente nere
const luceAmbiente = new THREE.HemisphereLight('#ffffff', '#bdbdbd', 0.5);
scena.add(luceAmbiente);

// 2. luce principale: arriva dall'alto a destra, come il sole, e proietta le ombre
const lucePrincipale = new THREE.DirectionalLight('#ffffff', 1.3);
lucePrincipale.position.set(3, 6, 2);
lucePrincipale.castShadow = true;
lucePrincipale.shadow.mapSize.set(2048, 2048);   // più è alta, più l'ombra è definita
lucePrincipale.shadow.camera.left = -4;          // la zona in cui la luce calcola le ombre
lucePrincipale.shadow.camera.right = 4;
lucePrincipale.shadow.camera.top = 4;
lucePrincipale.shadow.camera.bottom = -4;
lucePrincipale.shadow.camera.near = 1;
lucePrincipale.shadow.camera.far = 20;
lucePrincipale.shadow.bias = -0.0005;            // evita le righe sporche sulle superfici
lucePrincipale.shadow.normalBias = 0.02;
lucePrincipale.shadow.radius = 4;                // morbidezza del bordo dell'ombra
scena.add(lucePrincipale);

// 3. luce che segue lo sguardo: è attaccata alla camera, quindi quando giri attorno
//    all'oggetto la parte illuminata e quella in ombra cambiano con il punto di vista
const luceCamera = new THREE.PointLight('#ffffff', 4);
luceCamera.position.set(-1.5, 1, 0);             // un po' a sinistra e sopra la camera
camera.add(luceCamera);
scena.add(camera);                               // serve perché la luce dentro la camera si accenda

// 4. lo "studio fotografico": una stanza virtuale con pannelli luminosi.
//    Non si vede, ma l'oggetto la riflette: dà riflessi morbidi alle superfici
const pmrem = new THREE.PMREMGenerator(renderer);
scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scena.environmentIntensity = 0.3;

// 5. qualche luce puntiforme debole attorno all'oggetto: aggiunge piccoli riflessi
//    senza sbiancare i colori
const luciAttorno = [
    { x:  4, y: 3,   z:  3, intensita: 6 },   // davanti a destra, in alto
    { x: -4, y: 2.5, z:  3, intensita: 5 },   // davanti a sinistra
    { x:  4, y: 1.5, z: -4, intensita: 5 },   // dietro a destra
    { x: -4, y: 3.5, z: -3, intensita: 5 }    // dietro a sinistra
];

luciAttorno.forEach(function(dati) {
    const luce = new THREE.PointLight('#ffffff', dati.intensita);
    luce.position.set(dati.x, dati.y, dati.z);
    scena.add(luce);
});

// 6. luce di contorno: arriva da dietro e disegna un filo di luce sul bordo dell'oggetto,
//    che così si stacca dallo sfondo
const luceContorno = new THREE.DirectionalLight('#ffffff', 0.6);
luceContorno.position.set(-2, 3, -6);
scena.add(luceContorno);

// il pavimento: invisibile, mostra solo l'ombra che l'oggetto ci proietta sopra
const pavimento = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.18 })
);
pavimento.rotation.x = -Math.PI / 2;             // da verticale a orizzontale
pavimento.position.y = -1.6;                     // un po' sotto la lampada
pavimento.receiveShadow = true;
scena.add(pavimento);

// il modello è un "contenitore" (Group): dentro ci vanno gli occhiali caricati dal file
const modello = new THREE.Group();
scena.add(modello);

// qui mi segno le superfici di ogni parte degli occhiali, per nome
// (es. parti['lenti'] = l'elenco delle superfici che formano le lenti).
// Tengo l'elenco e non il pezzo intero perché, quando gli occhiali esplodono,
// le superfici volano via staccate e devono poter cambiare colore lo stesso
const parti = {};

// nel file convertito da Rhino le parti non hanno un nome: le riconosco dall'ordine
// in cui sono nel file (il primo pezzo è il numero 0, il secondo il numero 1, ...).
// I pezzi 0 e 1 sono due punti di costruzione rimasti dal disegno: non si vedono
const nomiPerPosizione = {
    2: 'naselli',
    3: 'montatura',
    4: 'ponte',
    5: 'lenti',
    6: 'asta_sinistra',
    7: 'asta_destra'
};


/* ----- il modello 3D: gli occhiali, caricati dal file models/occhiali.glb
   (convertito da "Occhiali finiti.3dm" con Rhino) ----- */

const gltfLoader = new GLTFLoader();

gltfLoader.load('models/occhiali.glb', function(gltf) {
    const occhiali = gltf.scene;

    // do un nome a ogni parte e me la segno in "parti"
    occhiali.children.forEach(function(pezzo, posizione) {
        const nome = nomiPerPosizione[posizione];
        if (nome !== undefined) {
            pezzo.name = nome;
            parti[nome] = [];
            pezzo.traverse(function(superficie) {
                if (superficie.isMesh) {
                    parti[nome].push(superficie);
                }
            });
        }
    });

    occhiali.traverse(function(pezzo) {
        if (pezzo.isMesh) {
            // ogni pezzo riceve una copia tutta sua del materiale,
            // così colorandone uno gli altri non cambiano
            pezzo.material = pezzo.material.clone();
            pezzo.material.side = THREE.DoubleSide;   // parti sottili: colorate da tutti e due i lati

            // tutte le parti proiettano e ricevono ombre
            pezzo.castShadow = true;
            pezzo.receiveShadow = true;
        }
    });

    // il file ha le sue misure: lo ingrandisco perché sia grande circa 2.6
    // e lo metto al centro della scena
    const scatola = new THREE.Box3().setFromObject(occhiali);
    const misure = scatola.getSize(new THREE.Vector3());
    const centro = scatola.getCenter(new THREE.Vector3());
    const scala = 2.6 / Math.max(misure.x, misure.y, misure.z);
    occhiali.scale.setScalar(scala);
    occhiali.position.set(-centro.x * scala, -centro.y * scala, -centro.z * scala);

    modello.add(occhiali);

    // mi segno dove sta ogni pezzetto, per l'esplosione e per rimetterlo a posto
    preparaFrammenti(occhiali);

    // se hai scelto dei colori mentre gli occhiali si stavano ancora caricando, li applico adesso
    document.querySelectorAll('.campione.selected').forEach(function(campione) {
        campione.click();
    });
});


/* ----- l'animazione del proiettile che fa esplodere gli occhiali ----- */

// stato dell'animazione: 'intero' (occhiali a posto), 'volo' (il proiettile arriva), 'esploso'
let stato = 'intero';

const gravita = -9.8;                               // quanto i pezzi cadono verso il basso
const altezzaPavimento = -1.6;                      // lo stesso pavimento invisibile delle ombre
const partenzaProiettile = new THREE.Vector3(7, 0.4, 2.5);   // da dove parte: a destra, un po' davanti
const bersaglio = new THREE.Vector3(0, 0, 0);       // il centro degli occhiali
const velocitaProiettile = 14;                      // unità al secondo

// tutti i pezzetti degli occhiali che voleranno via (ogni superficie è un pezzetto)
const frammenti = [];

// il proiettile: un cilindro color rame con la punta a cono, lungo l'asse z
const proiettile = new THREE.Group();
const materialeProiettile = new THREE.MeshStandardMaterial({ color: '#b87333', metalness: 1, roughness: 0.3 });
const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 24), materialeProiettile);
corpo.rotation.x = Math.PI / 2;                     // il cilindro nasce in verticale: lo sdraio lungo z
const punta = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 24), materialeProiettile);
punta.rotation.x = Math.PI / 2;
punta.position.z = 0.23;                            // la punta davanti al corpo
proiettile.add(corpo, punta);
proiettile.visible = false;
scena.add(proiettile);

// il lampo dell'esplosione: una luce arancione che si accende e si spegne subito
const lampo = new THREE.PointLight('#ffb050', 0, 12);
scena.add(lampo);

// le scintille: tanti puntini arancioni che schizzano via e svaniscono
const numeroScintille = 200;
const geometriaScintille = new THREE.BufferGeometry();
geometriaScintille.setAttribute('position', new THREE.BufferAttribute(new Float32Array(numeroScintille * 3), 3));
const materialeScintille = new THREE.PointsMaterial({ color: '#ffaa33', size: 0.06, transparent: true, opacity: 0 });
const scintille = new THREE.Points(geometriaScintille, materialeScintille);
scintille.visible = false;
scena.add(scintille);
const velocitaScintille = [];
let vitaScintille = 0;                              // da 1 (appena nate) a 0 (sparite)

// chiamata quando gli occhiali sono caricati: mi segno dove sta ogni pezzetto,
// per poterlo rimettere a posto con "Ricomponi"
function preparaFrammenti(occhiali) {
    occhiali.traverse(function(superficie) {
        if (superficie.isMesh) {
            frammenti.push({
                superficie: superficie,
                genitore: superficie.parent,
                posizione: superficie.position.clone(),
                rotazione: superficie.quaternion.clone(),
                scala: superficie.scale.clone(),
                contenitore: null,                  // il Group con cui vola (creato all'esplosione)
                velocita: new THREE.Vector3(),
                rotazioneVelocita: new THREE.Vector3()
            });
        }
    });
}

// spara: il proiettile parte verso gli occhiali
function spara() {
    if (stato !== 'intero') {
        ricomponi();
    }
    stato = 'volo';
    proiettile.position.copy(partenzaProiettile);
    proiettile.lookAt(bersaglio);                   // la punta guarda gli occhiali
    proiettile.visible = true;
}

// l'impatto: ogni pezzetto vola via dal punto colpito, girando su se stesso
function esplodi() {
    stato = 'esploso';
    proiettile.visible = false;

    // direzione da cui arriva il proiettile: i pezzi vengono spinti soprattutto in quel verso
    const spinta = bersaglio.clone().sub(partenzaProiettile).normalize();

    frammenti.forEach(function(f) {
        // ogni pezzetto va in un contenitore messo al suo centro, così gira attorno a se stesso
        // (le superfici del file hanno l'origine lontana dal pezzo: girerebbero attorno a un punto sbagliato)
        const centro = new THREE.Box3().setFromObject(f.superficie).getCenter(new THREE.Vector3());
        const contenitore = new THREE.Group();
        contenitore.position.copy(centro);
        scena.add(contenitore);
        contenitore.attach(f.superficie);           // attach = cambia genitore senza spostarlo
        f.contenitore = contenitore;

        // velocità: lontano dal centro dell'impatto + nel verso del proiettile + un po' verso l'alto + caso
        const lontano = centro.clone().sub(bersaglio).normalize();
        f.velocita.copy(lontano).multiplyScalar(2 + Math.random() * 3)
            .addScaledVector(spinta, 3 + Math.random() * 3)
            .add(new THREE.Vector3((Math.random() - 0.5) * 2, 2 + Math.random() * 3, (Math.random() - 0.5) * 2));
        f.rotazioneVelocita.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
    });

    // il lampo
    lampo.position.copy(bersaglio);
    lampo.intensity = 60;
    materialeScintille.color.set('#ffaa33');        // scintille arancioni (il carro armato usa lo stesso sistema per la polvere)

    // le scintille partono tutte dal centro in direzioni a caso
    const posizioni = geometriaScintille.attributes.position.array;
    for (let i = 0; i < numeroScintille; i++) {
        posizioni[i * 3] = bersaglio.x;
        posizioni[i * 3 + 1] = bersaglio.y;
        posizioni[i * 3 + 2] = bersaglio.z;
        const direzione = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize();
        velocitaScintille[i] = direzione.multiplyScalar(3 + Math.random() * 6);
    }
    geometriaScintille.attributes.position.needsUpdate = true;
    vitaScintille = 1;
    scintille.visible = true;
}

// rimette ogni pezzetto esattamente dov'era
function ricomponi() {
    frammenti.forEach(function(f) {
        if (f.contenitore !== null) {
            f.genitore.add(f.superficie);
            f.superficie.position.copy(f.posizione);
            f.superficie.quaternion.copy(f.rotazione);
            f.superficie.scale.copy(f.scala);
            scena.remove(f.contenitore);
            f.contenitore = null;
        }
    });
    proiettile.visible = false;
    scintille.visible = false;
    vitaScintille = 0;
    lampo.intensity = 0;
    carro.visible = false;                          // se c'era il carro armato, sparisce
    modello.position.y = 0;                         // gli occhiali tornano a mezz'aria
    stato = 'intero';
}

// chiamata a ogni fotogramma dal ciclo anima()
function aggiornaEsplosione(secondi) {
    secondi = Math.min(secondi, 0.05);              // se la pagina era in pausa, evito salti enormi

    // il proiettile avanza verso il bersaglio; quando lo raggiunge, esplode tutto
    if (stato === 'volo') {
        const mancano = bersaglio.distanceTo(proiettile.position);
        const passo = velocitaProiettile * secondi;
        if (passo >= mancano) {
            esplodi();
        } else {
            proiettile.position.add(bersaglio.clone().sub(proiettile.position).normalize().multiplyScalar(passo));
        }
    }

    if (stato !== 'esploso') {
        return;
    }

    // i pezzetti: si muovono, cadono per la gravità, girano e rimbalzano sul pavimento
    frammenti.forEach(function(f) {
        const c = f.contenitore;
        f.velocita.y += gravita * secondi;
        c.position.addScaledVector(f.velocita, secondi);
        c.rotation.x += f.rotazioneVelocita.x * secondi;
        c.rotation.y += f.rotazioneVelocita.y * secondi;
        c.rotation.z += f.rotazioneVelocita.z * secondi;

        if (c.position.y < altezzaPavimento) {
            c.position.y = altezzaPavimento;
            f.velocita.y *= -0.35;                  // rimbalza, ma sempre meno
            f.velocita.x *= 0.7;                    // e striscia rallentando
            f.velocita.z *= 0.7;
            f.rotazioneVelocita.multiplyScalar(0.6);
        }
    });

    // il lampo si spegne in fretta
    lampo.intensity *= Math.pow(0.02, secondi);

    // le scintille volano, cadono un po' e svaniscono in circa un secondo
    if (vitaScintille > 0) {
        vitaScintille = Math.max(vitaScintille - secondi, 0);
        const posizioni = geometriaScintille.attributes.position.array;
        for (let i = 0; i < numeroScintille; i++) {
            velocitaScintille[i].y += gravita * 0.3 * secondi;
            posizioni[i * 3] += velocitaScintille[i].x * secondi;
            posizioni[i * 3 + 1] += velocitaScintille[i].y * secondi;
            posizioni[i * 3 + 2] += velocitaScintille[i].z * secondi;
        }
        geometriaScintille.attributes.position.needsUpdate = true;
        materialeScintille.opacity = vitaScintille;
        scintille.visible = vitaScintille > 0;
    }
}

/* ----- il carro armato che passa sopra gli occhiali ----- */

// Il carro è fatto con forme semplici: scafo, torretta, cannone e due cingoli con le ruote.
// Va nel verso +x (il cannone punta dove va). Il fondo dei cingoli tocca il pavimento
const carro = new THREE.Group();
carro.visible = false;
scena.add(carro);

const verdeMilitare = new THREE.MeshStandardMaterial({ color: '#4b5320', roughness: 0.8, metalness: 0.2 });
const grigioCingolo = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.9, metalness: 0.4 });
const grigioRuote = new THREE.MeshStandardMaterial({ color: '#3d3d3d', roughness: 0.6, metalness: 0.6 });

const lunghezzaCarro = 6.4;
const fondoCarro = -1.6;                    // lo stesso pavimento delle ombre

// scafo: il "corpo" del carro, tra i due cingoli e sopra
const scafo = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.9, 3.0), verdeMilitare);
scafo.position.set(0, fondoCarro + 1.15, 0);

// la parte davanti inclinata dello scafo
const muso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 3.0), verdeMilitare);
muso.position.set(3.0, fondoCarro + 1.0, 0);
muso.rotation.z = -0.5;

// torretta e cannone
const torretta = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.65, 32), verdeMilitare);
torretta.position.set(-0.4, fondoCarro + 1.92, 0);
const cannone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.6, 16), verdeMilitare);
cannone.rotation.z = -Math.PI / 2;          // il cilindro nasce in verticale: lo sdraio lungo x
cannone.position.set(1.9, fondoCarro + 1.95, 0);

carro.add(scafo, muso, torretta, cannone);

// i due cingoli, uno per lato (z = -1.55 e z = +1.55)
const ruote = [];                           // le ruote girano mentre il carro avanza
const maglie = [];                          // le maglie del cingolo scorrono: { mesh, base, sopra }
const passoMaglie = 0.4;                    // distanza tra una maglia e l'altra

[-1.55, 1.55].forEach(function(zCingolo) {
    const latoEsterno = zCingolo > 0 ? 1 : -1;

    // la "fascia" del cingolo
    const cingolo = new THREE.Mesh(new THREE.BoxGeometry(lunghezzaCarro, 1.1, 0.9), grigioCingolo);
    cingolo.position.set(0, fondoCarro + 0.55, zCingolo);
    carro.add(cingolo);

    // 7 ruote sul lato esterno: la prima e l'ultima più grandi (le ruote dentate)
    for (let i = 0; i < 7; i++) {
        const grande = i === 0 || i === 6;
        const raggio = grande ? 0.5 : 0.38;
        const ruota = new THREE.Mesh(new THREE.CylinderGeometry(raggio, raggio, 0.14, 20), grigioRuote);
        ruota.rotation.x = Math.PI / 2;     // l'asse della ruota va lungo z
        ruota.position.set(-2.8 + i * (5.6 / 6), fondoCarro + (grande ? 0.6 : 0.45), zCingolo + latoEsterno * 0.5);
        // un raggio più chiaro sulla ruota, così si vede che gira
        const razza = new THREE.Mesh(new THREE.BoxGeometry(raggio * 1.6, 0.08, 0.16), verdeMilitare);
        ruota.add(razza);
        carro.add(ruota);
        ruote.push({ mesh: ruota, raggio: raggio });
    }

    // le maglie del cingolo: sopra scorrono in avanti, sotto stanno ferme a terra (scorrono indietro rispetto al carro)
    const numero = Math.floor(lunghezzaCarro / passoMaglie);
    for (let i = 0; i < numero; i++) {
        [true, false].forEach(function(sopra) {
            const maglia = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.95), grigioRuote);
            const base = -lunghezzaCarro / 2 + i * passoMaglie;
            maglia.position.set(base, sopra ? fondoCarro + 1.12 : fondoCarro + 0.02, zCingolo);
            carro.add(maglia);
            maglie.push({ mesh: maglia, base: base, sopra: sopra });
        });
    }
});

carro.traverse(function(parte) {
    if (parte.isMesh) {
        parte.castShadow = true;
        parte.receiveShadow = true;
    }
});

const velocitaCarro = 3.5;                  // unità al secondo
const partenzaCarro = -12;                  // entra da sinistra...
const arrivoCarro = 12;                     // ...ed esce a destra
let quotaCaduta = 0;                        // dove devono arrivare gli occhiali appoggiati a terra
let velocitaCaduta = 0;
let polvereFatta = false;

// avvia la scena: gli occhiali cadono a terra e il carro armato arriva
function avviaCarro() {
    if (stato !== 'intero') {
        ricomponi();
    }
    stato = 'caduta';

    // quanto devono scendere perché il loro punto più basso tocchi il pavimento
    const scatola = new THREE.Box3().setFromObject(modello);
    quotaCaduta = modello.position.y + (fondoCarro - scatola.min.y);
    velocitaCaduta = 0;
    polvereFatta = false;

    carro.position.set(partenzaCarro, 0, 0);
    carro.visible = true;
}

// quando il carro sta per toccarli, ogni pezzetto va in un contenitore al suo centro
// (come per l'esplosione), così può essere schiacciato restando al suo posto
function preparaSchiacciamento() {
    frammenti.forEach(function(f) {
        const centro = new THREE.Box3().setFromObject(f.superficie).getCenter(new THREE.Vector3());
        const contenitore = new THREE.Group();
        contenitore.position.copy(centro);
        scena.add(contenitore);
        contenitore.attach(f.superficie);
        f.contenitore = contenitore;
        f.schiacciato = false;
    });
}

// una nuvola di polvere marrone dove passa il cingolo (riusa le scintille dell'esplosione)
function alzaPolvere(punto) {
    const posizioni = geometriaScintille.attributes.position.array;
    for (let i = 0; i < numeroScintille; i++) {
        posizioni[i * 3] = punto.x + (Math.random() - 0.5) * 1.5;
        posizioni[i * 3 + 1] = fondoCarro + 0.05;
        posizioni[i * 3 + 2] = punto.z + (Math.random() - 0.5) * 3;
        velocitaScintille[i] = new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 2);
    }
    geometriaScintille.attributes.position.needsUpdate = true;
    materialeScintille.color.set('#8a7a66');
    vitaScintille = 1;
    scintille.visible = true;
}

// chiamata a ogni fotogramma dal ciclo anima()
function aggiornaCarro(secondi) {
    secondi = Math.min(secondi, 0.05);
    if (stato !== 'caduta' && stato !== 'carro') {
        return;
    }

    // 1. gli occhiali cadono a terra con la gravità
    if (modello.position.y > quotaCaduta) {
        velocitaCaduta += gravita * secondi;
        modello.position.y = Math.max(modello.position.y + velocitaCaduta * secondi, quotaCaduta);
    }

    // 2. il carro avanza; le ruote girano e le maglie del cingolo scorrono
    carro.position.x += velocitaCarro * secondi;
    const percorso = carro.position.x - partenzaCarro;
    ruote.forEach(function(r) {
        r.mesh.rotation.y = -percorso / r.raggio;   // (dopo la rotazione x, l'asse y della ruota punta lungo z)
    });
    const scorrimento = percorso % passoMaglie;
    maglie.forEach(function(m) {
        // sotto: ferme rispetto al terreno, quindi scorrono indietro; sopra: scorrono in avanti
        let x = m.sopra ? m.base + scorrimento : m.base - scorrimento;
        if (x > lunghezzaCarro / 2) x -= lunghezzaCarro;
        if (x < -lunghezzaCarro / 2) x += lunghezzaCarro;
        m.mesh.position.x = x;
    });

    // 3. il muso del carro raggiunge gli occhiali: comincia lo schiacciamento
    const fronte = carro.position.x + lunghezzaCarro / 2;
    if (stato === 'caduta') {
        const scatola = new THREE.Box3().setFromObject(modello);
        if (fronte >= scatola.min.x) {
            modello.position.y = quotaCaduta;       // se non erano ancora a terra, ci arrivano adesso
            modello.updateMatrixWorld(true);
            preparaSchiacciamento();
            stato = 'carro';
        }
    }

    // 4. ogni pezzetto sotto il cingolo viene schiacciato: diventa piatto, si allarga un po' e si storce
    if (stato === 'carro') {
        frammenti.forEach(function(f) {
            if (!f.schiacciato && fronte >= f.contenitore.position.x) {
                f.schiacciato = true;
                const c = f.contenitore;
                c.scale.set(1.2, 0.1, 1.2);
                c.position.y = fondoCarro + 0.02;
                c.position.x += (Math.random() - 0.5) * 0.3;
                c.position.z += (Math.random() - 0.5) * 0.3;
                c.rotation.y = (Math.random() - 0.5) * 0.6;
                if (!polvereFatta) {
                    alzaPolvere(c.position);
                    polvereFatta = true;
                }
            }
        });
    }

    // 5. la polvere sale, rallenta e svanisce
    if (vitaScintille > 0) {
        vitaScintille = Math.max(vitaScintille - secondi * 0.6, 0);
        const posizioni = geometriaScintille.attributes.position.array;
        for (let i = 0; i < numeroScintille; i++) {
            velocitaScintille[i].multiplyScalar(1 - 1.5 * secondi);
            posizioni[i * 3] += velocitaScintille[i].x * secondi;
            posizioni[i * 3 + 1] += velocitaScintille[i].y * secondi;
            posizioni[i * 3 + 2] += velocitaScintille[i].z * secondi;
        }
        geometriaScintille.attributes.position.needsUpdate = true;
        materialeScintille.opacity = vitaScintille;
        scintille.visible = vitaScintille > 0;
    }

    // 6. il carro è uscito dall'altra parte: sparisce, gli occhiali restano schiacciati a terra
    if (carro.position.x >= arrivoCarro) {
        carro.visible = false;
        stato = 'schiacciato';
    }
}


// i bottoni Spara / Carro armato / Ricomponi
document.querySelectorAll('.animazione').forEach(function(bottone) {
    bottone.addEventListener('click', function() {
        if (frammenti.length === 0) {
            return;   // gli occhiali non sono ancora caricati
        }
        const valore = bottone.closest('.opzione').querySelector('.opzione-valore');

        if (bottone.dataset.azione === 'spara') {
            spara();
            valore.textContent = 'Colpiti';
        } else if (bottone.dataset.azione === 'carro') {
            avviaCarro();
            valore.textContent = 'Schiacciati';
        } else {
            ricomponi();
            valore.textContent = 'Interi';
        }
    });
});

/* ----- il pannello: una sezione per ogni parte degli occhiali ----- */

// colora un pezzo e tutto quello che c'è dentro
// (una parte può essere fatta da più superfici, tutte da colorare).
// opacita: 1 = pieno, meno di 1 = semi-trasparente (es. 0.35 per il colore "Trasparente")
function coloraParte(nome, colore, opacita) {
    const superfici = parti[nome];
    if (superfici === undefined) {
        return;   // gli occhiali non sono ancora caricati
    }
    const trasparente = opacita < 1;

    superfici.forEach(function(superficie) {
        const materiale = superficie.material;
        materiale.color.set(colore);
        materiale.opacity = opacita;

        // se cambia da pieno a trasparente (o viceversa) Three.js deve ricostruire il materiale
        if (materiale.transparent !== trasparente) {
            materiale.transparent = trasparente;
            materiale.depthWrite = !trasparente;   // evita che le parti trasparenti nascondano quelle dietro
            materiale.needsUpdate = true;
        }
    });
}

// ogni sezione (.opzione) ha data-parti con il nome della parte che colora
const campioni = document.querySelectorAll('.campione');

campioni.forEach(function(campione) {
    campione.addEventListener('click', function() {
        const sezione = campione.closest('.opzione');
        const nomiParti = sezione.dataset.parti.split(' ');   // "a b" -> ['a', 'b']

        // 1. le parti di questa sezione prendono il colore cliccato
        //    (data-opacita c'è solo sul campione trasparente: se manca, il colore è pieno)
        const opacita = campione.dataset.opacita ? Number(campione.dataset.opacita) : 1;
        nomiParti.forEach(function(nome) {
            coloraParte(nome, campione.dataset.color, opacita);
        });

        // 2. il cerchio si sposta sul colore cliccato, solo dentro questa sezione
        sezione.querySelectorAll('.campione').forEach(function(altro) {
            altro.classList.remove('selected');
        });
        campione.classList.add('selected');

        // 3. accanto al titolo della sezione si legge il nome del colore
        sezione.querySelector('.opzione-valore').textContent = campione.dataset.nome;
    });
});


// trascina per girare, rotella per avvicinarti
const controlli = new OrbitControls(camera, renderer.domElement);
controlli.enableDamping = true;

// se la finestra cambia misura, il visore si adatta
window.addEventListener('resize', function() {
    camera.aspect = visore.clientWidth / visore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visore.clientWidth, visore.clientHeight);
});

/* ===== la galleria: un modello 3D per ogni persona ===== */

// I browser permettono solo pochi canvas 3D per pagina (circa 16), e le caselle sono 23.
// Allora uso UN SOLO canvas, grande come la finestra e appoggiato sopra la pagina:
// a ogni fotogramma guardo dove sta ogni casella e disegno il suo modello solo in quel rettangolo
// (setViewport + setScissor). È la tecnica dell'esempio "multiple elements" di Three.js
const rendererGalleria = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rendererGalleria.setPixelRatio(window.devicePixelRatio);
rendererGalleria.domElement.classList.add('galleria-canvas');
document.body.appendChild(rendererGalleria.domElement);

// lo stesso "studio fotografico" del visore, per dare riflessi morbidi ai modelli
const ambienteGalleria = new THREE.PMREMGenerator(rendererGalleria).fromScene(new RoomEnvironment(), 0.04).texture;
const caricatoreGalleria = new GLTFLoader();
const caselle = [];

document.querySelectorAll('.galleria-vista').forEach(function(elemento) {
    // ogni casella ha la sua scena, la sua camera e i suoi controlli
    const scenaCasella = new THREE.Scene();
    scenaCasella.background = new THREE.Color('#9a948a');
    scenaCasella.environment = ambienteGalleria;
    scenaCasella.environmentIntensity = 0.5;
    scenaCasella.add(new THREE.HemisphereLight('#ffffff', '#bdbdbd', 0.6));
    const luceCasella = new THREE.DirectionalLight('#ffffff', 1.4);
    luceCasella.position.set(3, 5, 4);
    scenaCasella.add(luceCasella);

    const cameraCasella = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    cameraCasella.position.set(3, 2, 4);
    scenaCasella.add(cameraCasella);   // serve perché i cavalli, attaccati alla camera, vengano disegnati

    // trascinando nella casella giri il modello; da solo ruota piano.
    // Niente zoom con la rotella, se no non si riuscirebbe più a scorrere la pagina
    const controlliCasella = new OrbitControls(cameraCasella, elemento);
    controlliCasella.enableDamping = true;
    controlliCasella.enableZoom = false;
    controlliCasella.enablePan = false;
    controlliCasella.autoRotate = true;
    controlliCasella.autoRotateSpeed = 1.5;

    caselle.push({ elemento: elemento, scena: scenaCasella, camera: cameraCasella, controlli: controlliCasella, caricata: false, cavalli: [] });
});


/* ----- cliccando un modello si apre la sua pagina (dettaglio.html) ----- */

// Nella casella trascinare serve a girare gli occhiali: quindi apro la pagina solo
// se è stato un clic vero, cioè se il mouse (o il dito) si è spostato pochissimo
caselle.forEach(function(casella) {
    const elemento = casella.elemento;
    let inizioX = 0;
    let inizioY = 0;

    elemento.addEventListener('pointerdown', function(e) {
        inizioX = e.clientX;
        inizioY = e.clientY;
    });

    elemento.addEventListener('click', function(e) {
        const spostamento = Math.hypot(e.clientX - inizioX, e.clientY - inizioY);
        if (spostamento > 5) {
            return;   // era un trascinamento, non un clic
        }
        // "models/galleria/giuli.glb" -> "giuli"
        const id = elemento.dataset.file.split('/').pop().replace('.glb', '');
        window.location.href = 'dettaglio.html?modello=' + id;
    });
});


/* ----- i cavalli che corrono dietro gli occhiali ----- */

// Il cavallo è quello degli esempi di Three.js (models/cavallo.glb): ha già l'animazione del galoppo.
// I cavalli sono "attaccati" alla camera di ogni casella, lontani dietro gli occhiali:
// così, anche mentre la vista gira, restano sempre sullo sfondo e corrono da sinistra a destra
const corsie = [
    { y: -2.3, profondita: -7.5, velocita: 2.4 },   // in basso, più vicino
    { y: -1.0, profondita: -9.0, velocita: 1.9 },   // in mezzo
    { y:  0.4, profondita: -10.5, velocita: 1.5 }   // in alto, più lontano (più lento: effetto profondità)
];

caricatoreGalleria.load('models/cavallo.glb', function(gltf) {
    const galoppo = gltf.animations[0];

    // l'animazione cerca il cavallo per nome: nel file non ha nome, quindi gliene do uno fisso,
    // così funziona anche sulle copie
    gltf.scene.traverse(function(parte) {
        if (!parte.name) {
            parte.name = parte.uuid;
        }
    });

    // il cavallo nel file è lungo più di 300 unità e guarda verso +z: lo riduco a circa 1.9
    const scatola = new THREE.Box3().setFromObject(gltf.scene);
    const scala = 1.9 / scatola.getSize(new THREE.Vector3()).z;

    caselle.forEach(function(casella) {
        corsie.forEach(function(corsia) {
            const cavallo = gltf.scene.clone();
            cavallo.scale.setScalar(scala);
            cavallo.rotation.y = Math.PI / 2;            // da "guarda verso +z" a "corre verso destra"
            cavallo.position.set((Math.random() - 0.5) * 8, corsia.y, corsia.profondita);
            casella.camera.add(cavallo);

            // ogni cavallo ha il suo "mixer" che fa andare l'animazione, partendo da un punto a caso
            const mixer = new THREE.AnimationMixer(cavallo);
            const azione = mixer.clipAction(galoppo);
            azione.time = Math.random() * galoppo.duration;
            azione.timeScale = corsia.velocita / 2;      // zampe più veloci se il cavallo va più veloce
            azione.play();

            casella.cavalli.push({ cavallo: cavallo, mixer: mixer, velocita: corsia.velocita, profondita: -corsia.profondita });
        });
    });
});

// muove i cavalli di una casella: galoppano e, quando escono a destra, rientrano da sinistra
function muoviCavalli(casella, secondi) {
    casella.cavalli.forEach(function(c) {
        c.mixer.update(secondi);
        c.cavallo.position.x += c.velocita * secondi;

        // metà della larghezza visibile a quella distanza, più un margine per il corpo del cavallo
        const bordo = c.profondita * Math.tan(THREE.MathUtils.degToRad(casella.camera.fov / 2)) * casella.camera.aspect + 1.5;
        if (c.cavallo.position.x > bordo) {
            c.cavallo.position.x = -bordo;
        }
    });
}

// carica il modello di una casella e lo adatta: grande circa 2.4 e al centro
function caricaCasella(casella) {
    casella.caricata = true;
    caricatoreGalleria.load(casella.elemento.dataset.file, function(gltf) {
        const modelloCasella = gltf.scene;

        // data-nascondi: i pezzi del file da togliere, per nome (es. la faccia di prova attorno agli occhiali)
        const daTogliere = (casella.elemento.dataset.nascondi || '').split(' ').filter(Boolean);
        daTogliere.forEach(function(nome) {
            const pezzo = modelloCasella.getObjectByName(nome);
            if (pezzo) {
                pezzo.removeFromParent();
            }
        });

        // data-ruota-z: gradi di rotazione attorno all'asse z (es. 180 per raddrizzare un modello capovolto)
        const gradi = Number(casella.elemento.dataset.ruotaZ || 0);
        modelloCasella.rotation.z = THREE.MathUtils.degToRad(gradi);
        modelloCasella.updateMatrixWorld(true);

        const scatola = new THREE.Box3().setFromObject(modelloCasella);
        const misure = scatola.getSize(new THREE.Vector3());
        const centro = scatola.getCenter(new THREE.Vector3());
        const scala = 2.4 / Math.max(misure.x, misure.y, misure.z);
        modelloCasella.scale.setScalar(scala);
        modelloCasella.position.set(-centro.x * scala, -centro.y * scala, -centro.z * scala);
        casella.scena.add(modelloCasella);
    }, undefined, function() {
        casella.elemento.textContent = 'Modello non disponibile';
        casella.elemento.classList.add('galleria-errore');
    });
}

// i modelli si caricano solo quando la casella sta per comparire sullo schermo
// (sono più di 80 MB in tutto: caricarli tutti subito rallenterebbe la pagina)
const osservatoreGalleria = new IntersectionObserver(function(voci) {
    voci.forEach(function(voce) {
        if (voce.isIntersecting) {
            const casella = caselle.find(function(c) { return c.elemento === voce.target; });
            if (casella && !casella.caricata) {
                caricaCasella(casella);
            }
            osservatoreGalleria.unobserve(voce.target);
        }
    });
}, { rootMargin: '400px' });   // comincia a caricare 400px prima che la casella si veda

caselle.forEach(function(c) {
    osservatoreGalleria.observe(c.elemento);
});

// chiamata a ogni fotogramma dal ciclo anima()
function disegnaGalleria(secondi) {
    const canvasGalleria = rendererGalleria.domElement;
    const larghezza = canvasGalleria.clientWidth;
    const altezza = canvasGalleria.clientHeight;

    // se la finestra ha cambiato misura, adatto il canvas
    const pr = rendererGalleria.getPixelRatio();
    if (canvasGalleria.width !== Math.floor(larghezza * pr) || canvasGalleria.height !== Math.floor(altezza * pr)) {
        rendererGalleria.setSize(larghezza, altezza, false);
    }

    // pulisco tutto il canvas (trasparente: sotto si vede la pagina)
    rendererGalleria.setScissorTest(false);
    rendererGalleria.setClearColor(0x000000, 0);
    rendererGalleria.clear();
    rendererGalleria.setScissorTest(true);

    caselle.forEach(function(c) {
        const r = c.elemento.getBoundingClientRect();

        // la casella non si vede: non la disegno
        if (r.bottom < 0 || r.top > altezza || r.right < 0 || r.left > larghezza) {
            return;
        }

        // Three.js conta i pixel dal basso, il browser dall'alto
        const basso = altezza - r.bottom;
        rendererGalleria.setViewport(r.left, basso, r.width, r.height);
        rendererGalleria.setScissor(r.left, basso, r.width, r.height);

        c.camera.aspect = r.width / r.height;
        c.camera.updateProjectionMatrix();
        c.controlli.update();
        muoviCavalli(c, secondi);
        rendererGalleria.render(c.scena, c.camera);
    });
}


// il ciclo che ridisegna la scena a ogni fotogramma
const orologio = new THREE.Clock();   // misura il tempo passato tra un fotogramma e l'altro

function anima() {
    const secondi = orologio.getDelta();
    aggiornaEsplosione(secondi);
    aggiornaCarro(secondi);
    controlli.update();
    renderer.render(scena, camera);
    disegnaGalleria(Math.min(secondi, 0.05));   // al massimo 0.05 s: dopo una pausa i cavalli non "saltano"
}
renderer.setAnimationLoop(anima);

