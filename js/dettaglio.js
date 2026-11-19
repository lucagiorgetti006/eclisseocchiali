// dettaglio.js – il JavaScript della pagina dettaglio.html.
// La pagina è una sola per tutti gli occhiali: legge dall'indirizzo quale modello mostrare
// (es. dettaglio.html?modello=giuli), lo carica nel visore e scrive le sue informazioni.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { modelli } from './modelli.js';


/* ===== menu mobile (lo stesso di index.html) ===== */

const btnMenu = document.querySelector('.btn-menu');
const btnClose = document.querySelector('.btn-close');
const mobileNavWrapper = document.querySelector('.mobile-nav-wrapper');
const navLinks = document.querySelectorAll('.mobile-nav-wrapper .nav-link');

btnMenu.addEventListener('click', function() {
    mobileNavWrapper.style.display = 'flex';
    setTimeout(() => {
        mobileNavWrapper.classList.add('show');
    }, 10);
});

function closeMenu() {
    mobileNavWrapper.classList.remove('show');
    setTimeout(() => {
        if (!mobileNavWrapper.classList.contains('show')) {
            mobileNavWrapper.style.display = 'none';
        }
    }, 300);
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


/* ===== quale modello? lo leggo dall'indirizzo ===== */

// "dettaglio.html?modello=giuli" -> "giuli"
const idScelto = new URLSearchParams(window.location.search).get('modello');
const posizione = modelli.findIndex(function(m) { return m.id === idScelto; });
const modello = modelli[posizione];

// scorciatoia per scrivere un testo dentro un elemento della pagina
function scrivi(id, testo) {
    document.getElementById(id).textContent = testo;
}

// unisce i nomi come in italiano: "A", "A e B", "A, B e C"
function elencoNomi(nomi) {
    if (nomi.length === 1) {
        return nomi[0];
    }
    return nomi.slice(0, -1).join(', ') + ' e ' + nomi[nomi.length - 1];
}

if (modello === undefined) {
    // indirizzo sbagliato o senza ?modello=...
    scrivi('titolo-modello', 'Modello non trovato');
    scrivi('stato-caricamento', 'Torna alla galleria e scegli un paio di occhiali.');
    document.querySelector('.pannello').style.display = 'none';
} else {
    mostraModello();
}


/* ===== la pagina del modello ===== */

function mostraModello() {
    // titolo della pagina, intestazione e autori
    document.title = 'Triennale Milano – Occhiali di ' + elencoNomi(modello.autori);
    scrivi('numero-modello', (posizione + 1) + ' di ' + modelli.length);
    scrivi('titolo-modello', 'Gli occhiali di ' + elencoNomi(modello.autori));

    const listaAutori = document.getElementById('info-autori');
    modello.autori.forEach(function(nome) {
        const voce = document.createElement('li');
        voce.textContent = nome;
        listaAutori.appendChild(voce);
    });

    scrivi('info-file', modello.file.split('/').pop());

    // precedente / successivo: si gira in tondo (dopo l'ultimo viene il primo)
    const precedente = modelli[(posizione - 1 + modelli.length) % modelli.length];
    const successivo = modelli[(posizione + 1) % modelli.length];
    document.getElementById('link-precedente').href = 'dettaglio.html?modello=' + precedente.id;
    document.getElementById('link-successivo').href = 'dettaglio.html?modello=' + successivo.id;

    preparaVisore();
}


/* ===== il visore 3D grande ===== */

function preparaVisore() {
    const visore = document.getElementById('visore-dettaglio');

    const scena = new THREE.Scene();   // lo sfondo è il grigio del CSS: il canvas è trasparente

    const camera = new THREE.PerspectiveCamera(40, visore.clientWidth / visore.clientHeight, 0.1, 100);
    camera.position.set(3, 2, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(visore.clientWidth, visore.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    visore.appendChild(renderer.domElement);

    // luci: le stesse del visore di index.html, in versione ridotta
    scena.add(new THREE.HemisphereLight('#ffffff', '#bdbdbd', 0.5));
    const lucePrincipale = new THREE.DirectionalLight('#ffffff', 1.3);
    lucePrincipale.position.set(3, 6, 2);
    lucePrincipale.castShadow = true;
    lucePrincipale.shadow.mapSize.set(2048, 2048);
    lucePrincipale.shadow.bias = -0.0005;
    lucePrincipale.shadow.normalBias = 0.02;
    scena.add(lucePrincipale);
    const luceContorno = new THREE.DirectionalLight('#ffffff', 0.6);
    luceContorno.position.set(-2, 3, -6);
    scena.add(luceContorno);
    scena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    scena.environmentIntensity = 0.4;

    // pavimento invisibile che mostra solo l'ombra
    const pavimento = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.18 }));
    pavimento.rotation.x = -Math.PI / 2;
    pavimento.receiveShadow = true;
    scena.add(pavimento);

    const controlli = new OrbitControls(camera, renderer.domElement);
    controlli.enableDamping = true;
    controlli.autoRotate = true;            // gira piano da solo...
    controlli.autoRotateSpeed = 1;
    controlli.addEventListener('start', function() {
        controlli.autoRotate = false;       // ...finché non lo tocchi tu
    });

    // carico il modello; mentre arriva, scrivo a che punto è
    let pesoFile = 0;
    new GLTFLoader().load(modello.file, function(gltf) {
        const occhiali = gltf.scene;

        // pezzi da togliere e rotazione, se il modello li prevede (vedi modelli.js)
        (modello.nascondi || []).forEach(function(nome) {
            const pezzo = occhiali.getObjectByName(nome);
            if (pezzo) {
                pezzo.removeFromParent();
            }
        });
        occhiali.rotation.z = THREE.MathUtils.degToRad(modello.ruotaZ || 0);
        occhiali.updateMatrixWorld(true);

        // le informazioni le leggo dal modello prima di ingrandirlo (così le misure sono quelle vere)
        scriviInformazioni(occhiali, pesoFile);

        // lo adatto al visore: grande circa 2.6, centrato, appoggiato poco sopra l'ombra
        const scatola = new THREE.Box3().setFromObject(occhiali);
        const misure = scatola.getSize(new THREE.Vector3());
        const centro = scatola.getCenter(new THREE.Vector3());
        const scala = 2.6 / Math.max(misure.x, misure.y, misure.z);
        occhiali.scale.setScalar(scala);
        occhiali.position.set(-centro.x * scala, -centro.y * scala, -centro.z * scala);
        pavimento.position.y = -misure.y * scala / 2 - 0.6;

        occhiali.traverse(function(parte) {
            if (parte.isMesh) {
                parte.castShadow = true;
                parte.receiveShadow = true;
            }
        });

        scena.add(occhiali);
        document.getElementById('stato-caricamento').remove();

        // la scelta "Da soli / Indossati da un cavallo"
        preparaIndossati(scena, camera, controlli, pavimento, occhiali, scala, centro, misure);

        // la prova sul viso con la telecamera
        preparaProva(occhiali);
    }, function(avanzamento) {
        if (avanzamento.total) {
            pesoFile = avanzamento.total;
            scrivi('stato-caricamento', 'Caricamento del modello… ' + Math.round(avanzamento.loaded / avanzamento.total * 100) + '%');
        }
    }, function() {
        scrivi('stato-caricamento', 'Non è stato possibile caricare il modello.');
    });

    window.addEventListener('resize', function() {
        camera.aspect = visore.clientWidth / visore.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(visore.clientWidth, visore.clientHeight);
    });

    const cavalli = preparaCavalli(scena, camera);
    const orologio = new THREE.Clock();

    renderer.setAnimationLoop(function() {
        const secondi = Math.min(orologio.getDelta(), 0.05);   // dopo una pausa niente salti
        cavalli.muovi(secondi);
        controlli.update();
        renderer.render(scena, camera);
    });
}


/* ===== provali tu: gli occhiali sul tuo viso, con la telecamera ===== */

// Per trovare il viso nel video uso MediaPipe Face Landmarker (una libreria gratuita di Google):
// a ogni fotogramma restituisce 478 punti del viso e la rotazione della testa.
// Tutto avviene nel browser: il video non viene inviato a nessuno.
// La libreria e il "modello" che riconosce i visi (qualche MB) si scaricano solo quando accendi la telecamera
const indirizzoMediaPipe = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const indirizzoModelloViso = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// dove arrivano le foto scattate durante la prova (vedi inviaFoto).
// Dopo la prima attivazione, FormSubmit manda un codice da mettere qui al posto dell'indirizzo,
// così l'email non si legge nel codice della pagina
const destinatarioFoto = 'lucagiorgetti006@gmail.com';

// il numero WhatsApp a cui mandare le foto: prefisso italiano (39) + numero, senza spazi né "+"
const numeroWhatsApp = '393668954554';

// alcuni dei 478 punti del viso di MediaPipe
const PUNTO_TRA_GLI_OCCHI = 168;       // la radice del naso, dove appoggia il ponte degli occhiali
const PUNTO_TEMPIA_DESTRA = 127;       // i due lati del viso all'altezza degli occhi:
const PUNTO_TEMPIA_SINISTRA = 356;     // la loro distanza è circa la larghezza degli occhiali

function preparaProva(occhiali) {
    const contenitore = document.getElementById('prova-telecamera');
    const video = document.getElementById('video-telecamera');
    const bottone = document.getElementById('bottone-telecamera');

    let accesa = false;
    let flusso = null;               // il flusso video della telecamera
    let riconoscitore = null;        // il Face Landmarker di MediaPipe
    let rendererProva = null;
    let ultimoTempoVideo = -1;

    function messaggio(testo) {
        document.getElementById('prova-messaggio').textContent = testo;
    }

    // --- la scena 3D sopra il video: camera ortografica che misura in pixel come il riquadro ---
    const scenaProva = new THREE.Scene();
    const cameraProva = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
    scenaProva.add(new THREE.HemisphereLight('#ffffff', '#888888', 1.0));
    const luceProva = new THREE.DirectionalLight('#ffffff', 1.5);
    luceProva.position.set(0, 1, 2);
    scenaProva.add(luceProva);

    // "testa" = il gruppo che segue il viso. Al suo interno l'unità di misura è la larghezza degli occhiali:
    // gli occhiali sono larghi 1, e il gruppo intero viene ingrandito alla larghezza del viso in pixel
    const testa = new THREE.Group();
    testa.visible = false;
    scenaProva.add(testa);

    // il modello che stai provando: all'inizio quello della pagina, poi lo cambi con le frecce
    let posizioneProva = posizione;
    let modelloProva = modello;
    let copia = null;                         // gli occhiali sul viso
    let coloreProva = null;                   // il colore scelto per la montatura (null = quello originale)

    // mette sul viso un paio di occhiali: li riporta alle misure originali, li fa larghi 1
    // e mette la parte davanti della montatura nel punto (0, 0, 0), cioè sulla radice del naso
    function montaOcchiali(nuovi) {
        if (copia !== null) {
            testa.remove(copia);
        }
        copia = nuovi;
        copia.scale.setScalar(1);
        copia.position.set(0, 0, 0);
        copia.updateMatrixWorld(true);
        const scatola = new THREE.Box3().setFromObject(copia);
        const misure = scatola.getSize(new THREE.Vector3());
        const centro = scatola.getCenter(new THREE.Vector3());
        const s = 1 / misure.x;
        copia.scale.setScalar(s);
        copia.position.set(-centro.x * s, -centro.y * s, -scatola.max.z * s);

        // ogni parte riceve una copia del suo materiale (così cambiare colore qui non cambia il visore della pagina)
        // e mi segno il suo colore originale, per il bottone "Originale"
        copia.traverse(function(parte) {
            if (parte.isMesh) {
                parte.material = parte.material.clone();
                parte.userData.coloreOriginale = parte.material.color.clone();
                parte.userData.opacitaOriginale = parte.material.opacity;
                parte.userData.trasparenteOriginale = parte.material.transparent;
                parte.userData.lente = eUnaLente(parte);
            }
        });
        testa.add(copia);
        applicaColore();                      // il colore scelto resta anche cambiando modello
    }

    // le lenti non le coloro: le riconosco dal nome ("lente", "lenti", "lens", "vetro", "glass")
    // oppure perché sono già trasparenti nel file
    function eUnaLente(parte) {
        let oggetto = parte;
        while (oggetto) {
            if (/lent|lens|vetr|glass/i.test(oggetto.name)) {
                return true;
            }
            oggetto = oggetto.parent;
        }
        const m = parte.material;
        return m.transparent || m.opacity < 1 || m.transmission > 0;
    }

    // colora la montatura con il colore scelto, oppure la riporta ai colori originali
    function applicaColore() {
        copia.traverse(function(parte) {
            if (!parte.isMesh || parte.userData.lente) {
                return;
            }
            const m = parte.material;
            if (coloreProva === null) {
                m.color.copy(parte.userData.coloreOriginale);
                m.opacity = parte.userData.opacitaOriginale;
                m.transparent = parte.userData.trasparenteOriginale;
            } else {
                m.color.set(coloreProva.colore);
                m.opacity = coloreProva.opacita;
                m.transparent = coloreProva.opacita < 1;
            }
            m.needsUpdate = true;
        });
    }

    // all'inizio: una copia degli occhiali della pagina
    montaOcchiali(occhiali.clone());

    // --- sulla destra: cambia modello (‹ ›) ---
    const caricatoreProva = new GLTFLoader();
    let caricamentoInCorso = 0;               // per ignorare un modello arrivato tardi, se nel frattempo ne hai scelto un altro

    function scriviNomeModello() {
        scrivi('prova-nome-modello', elencoNomi(modelloProva.autori));
        scrivi('prova-numero-modello', (posizioneProva + 1) + ' / ' + modelli.length);
    }
    scriviNomeModello();

    function cambiaModello(passo) {
        posizioneProva = (posizioneProva + passo + modelli.length) % modelli.length;
        modelloProva = modelli[posizioneProva];
        scriviNomeModello();
        statoFoto('Carico gli occhiali…');

        const questo = ++caricamentoInCorso;
        caricatoreProva.load(modelloProva.file, function(gltf) {
            if (questo !== caricamentoInCorso) {
                return;                       // nel frattempo hai già scelto un altro modello
            }
            const nuovi = gltf.scene;
            (modelloProva.nascondi || []).forEach(function(nome) {
                const pezzo = nuovi.getObjectByName(nome);
                if (pezzo) {
                    pezzo.removeFromParent();
                }
            });
            nuovi.rotation.z = THREE.MathUtils.degToRad(modelloProva.ruotaZ || 0);
            montaOcchiali(nuovi);
            statoFoto('');
        }, undefined, function() {
            statoFoto('Non è stato possibile caricare questi occhiali.');
        });
    }

    document.getElementById('prova-precedente').addEventListener('click', function() { cambiaModello(-1); });
    document.getElementById('prova-successivo').addEventListener('click', function() { cambiaModello(1); });

    // --- sulla destra: cambia colore della montatura ---
    const campioniProva = document.querySelectorAll('.prova-colori .campione, .prova-colori .campione-originale');
    campioniProva.forEach(function(campione) {
        campione.addEventListener('click', function() {
            if (campione.dataset.color) {
                coloreProva = {
                    colore: campione.dataset.color,
                    opacita: campione.dataset.opacita ? Number(campione.dataset.opacita) : 1
                };
            } else {
                coloreProva = null;           // "Originale"
            }
            applicaColore();

            campioniProva.forEach(function(altro) {
                altro.classList.remove('selected');
            });
            campione.classList.add('selected');
            scrivi('prova-nome-colore', campione.dataset.nome);
        });
    });

    /* --- sulla destra: i cavalli giganti che corrono DIETRO di te --- */

    // Per metterli dietro alla persona separo la persona dallo sfondo con MediaPipe Image Segmenter
    // (modello "selfie"): a ogni fotogramma dice, pixel per pixel, quanto è "persona".
    // Gli strati, dal basso: video (lo sfondo) → cavalli → la persona ritagliata → occhiali
    const indirizzoModelloSelfie = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
    let cavalliAccesi = false;
    let segmentatore = null;

    // strato 2: i cavalli (WebGL, trasparente dove non ci sono cavalli)
    const rendererCavalli = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    rendererCavalli.setPixelRatio(window.devicePixelRatio);
    const telaCavalli = rendererCavalli.domElement;
    telaCavalli.hidden = true;
    contenitore.insertBefore(telaCavalli, video.nextSibling);

    // strato 3: la persona ritagliata (un canvas 2D grande come il video)
    const telaPersona = document.createElement('canvas');
    telaPersona.hidden = true;
    contenitore.insertBefore(telaPersona, telaCavalli.nextSibling);
    const ctxPersona = telaPersona.getContext('2d');

    // la "maschera": un'immagine nera che è opaca dove c'è la persona e trasparente sullo sfondo
    const telaMaschera = document.createElement('canvas');
    const ctxMaschera = telaMaschera.getContext('2d');
    let pixelMaschera = null;

    // la scena dei cavalli: camera in prospettiva, cavalli enormi e lontani che attraversano lo schermo
    const scenaCavalli = new THREE.Scene();
    const cameraCavalli = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    scenaCavalli.add(new THREE.HemisphereLight('#ffffff', '#887766', 1.2));
    const soleCavalli = new THREE.DirectionalLight('#ffffff', 1.5);
    soleCavalli.position.set(3, 5, 4);
    scenaCavalli.add(soleCavalli);
    const corsieProva = [
        { y: -6, profondita: 12, lunghezza: 12, velocita: 8 },
        { y: -4, profondita: 18, lunghezza: 12, velocita: 6.5 },
        { y: -1.5, profondita: 25, lunghezza: 12, velocita: 5 }
    ];
    const cavalliProva = [];
    let cavalliCaricati = false;

    function caricaCavalliProva() {
        cavalliCaricati = true;
        new GLTFLoader().load('models/cavallo.glb', function(gltf) {
            const galoppo = gltf.animations[0];
            gltf.scene.traverse(function(parte) {
                if (!parte.name) {
                    parte.name = parte.uuid;      // l'animazione cerca il cavallo per nome: gliene do uno fisso
                }
            });
            const lunghezzaFile = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).z;
            corsieProva.forEach(function(corsia) {
                const cavallo = gltf.scene.clone();
                cavallo.scale.setScalar(corsia.lunghezza / lunghezzaFile);
                cavallo.rotation.y = Math.PI / 2;
                cavallo.position.set((Math.random() - 0.5) * 30, corsia.y, -corsia.profondita);
                scenaCavalli.add(cavallo);
                const mixer = new THREE.AnimationMixer(cavallo);
                const azione = mixer.clipAction(galoppo);
                azione.time = Math.random() * galoppo.duration;
                azione.timeScale = 1.3;
                azione.play();
                cavalliProva.push({ cavallo: cavallo, mixer: mixer, corsia: corsia });
            });
        });
    }

    async function accendiCavalli() {
        cavalliAccesi = true;
        if (!cavalliCaricati) {
            caricaCavalliProva();
        }
        if (segmentatore === null) {
            statoFoto('Preparo i cavalli…');
            try {
                const vision = await import(indirizzoMediaPipe + '/vision_bundle.mjs');
                const file = await vision.FilesetResolver.forVisionTasks(indirizzoMediaPipe + '/wasm');
                segmentatore = await vision.ImageSegmenter.createFromOptions(file, {
                    baseOptions: { modelAssetPath: indirizzoModelloSelfie, delegate: 'GPU' },
                    runningMode: 'VIDEO',
                    outputConfidenceMasks: true,
                    outputCategoryMask: false
                });
                statoFoto('');
            } catch (errore) {
                statoFoto('Non è stato possibile preparare i cavalli.');
                spegniCavalli();
                return;
            }
        }
        if (cavalliAccesi) {
            telaCavalli.hidden = false;
            telaPersona.hidden = false;
        }
    }

    function spegniCavalli() {
        cavalliAccesi = false;
        telaCavalli.hidden = true;
        telaPersona.hidden = true;
        scegliCavalli('no');
    }

    // i due bottoncini Sì / No nel pannello a destra
    const bottoniCavalliProva = document.querySelectorAll('.prova-scelta-cavalli button');
    function scegliCavalli(valore) {
        bottoniCavalliProva.forEach(function(b) {
            b.classList.toggle('selected', b.dataset.cavalli === valore);
        });
        scrivi('prova-valore-cavalli', valore === 'si' ? 'Sì' : 'No');
    }
    bottoniCavalliProva.forEach(function(b) {
        b.addEventListener('click', function() {
            if (b.dataset.cavalli === 'si') {
                scegliCavalli('si');
                accendiCavalli();
            } else {
                spegniCavalli();
            }
        });
    });

    const orologioCavalli = new THREE.Clock();

    // a ogni fotogramma (chiamata da fotogramma()): ritaglio la persona e muovo i cavalli
    function aggiornaCavalli(larghezza, altezza, nuovoFotogramma) {
        const secondi = Math.min(orologioCavalli.getDelta(), 0.05);
        if (!cavalliAccesi || segmentatore === null) {
            return;
        }

        // 1. la persona: chiedo la maschera a MediaPipe e la uso per ritagliare il fotogramma
        if (nuovoFotogramma) {
            const larghezzaVideo = video.videoWidth;
            const altezzaVideo = video.videoHeight;
            if (telaPersona.width !== larghezzaVideo || telaPersona.height !== altezzaVideo) {
                telaPersona.width = telaMaschera.width = larghezzaVideo;
                telaPersona.height = telaMaschera.height = altezzaVideo;
                pixelMaschera = ctxMaschera.createImageData(larghezzaVideo, altezzaVideo);   // tutto nero e trasparente
            }

            const risultato = segmentatore.segmentForVideo(video, performance.now());
            const maschera = risultato.confidenceMasks[0].getAsFloat32Array();   // da 0 (sfondo) a 1 (persona)
            const dati = pixelMaschera.data;
            for (let i = 0; i < maschera.length; i++) {
                dati[i * 4 + 3] = maschera[i] * 255;      // cambio solo la trasparenza
            }
            risultato.close();                             // libero la memoria della maschera
            ctxMaschera.putImageData(pixelMaschera, 0, 0);

            // disegno il fotogramma e tengo solo la parte coperta dalla maschera (sfumata ai bordi)
            ctxPersona.globalCompositeOperation = 'source-over';
            ctxPersona.clearRect(0, 0, larghezzaVideo, altezzaVideo);
            ctxPersona.drawImage(video, 0, 0);
            ctxPersona.globalCompositeOperation = 'destination-in';
            ctxPersona.filter = 'blur(2px)';
            ctxPersona.drawImage(telaMaschera, 0, 0);
            ctxPersona.filter = 'none';
            ctxPersona.globalCompositeOperation = 'source-over';
        }

        // 2. i cavalli: galoppano e, usciti da un lato, rientrano dall'altro
        rendererCavalli.setSize(larghezza, altezza);
        cameraCavalli.aspect = larghezza / altezza;
        cameraCavalli.updateProjectionMatrix();
        cavalliProva.forEach(function(c) {
            c.mixer.update(secondi);
            c.cavallo.position.x += c.corsia.velocita * secondi;
            const bordo = c.corsia.profondita * Math.tan(THREE.MathUtils.degToRad(cameraCavalli.fov / 2)) * cameraCavalli.aspect
                        + c.corsia.lunghezza;
            if (c.cavallo.position.x > bordo) {
                c.cavallo.position.x = -bordo;
            }
        });
        rendererCavalli.render(scenaCavalli, cameraCavalli);
    }

    // una testa invisibile dietro gli occhiali: non si vede, ma nasconde le stanghette
    // quando passano "dietro" al viso (come farebbe la testa vera)
    const nascondiStanghette = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 24),
        new THREE.MeshBasicMaterial({ colorWrite: false })   // scrive solo la profondità, non il colore
    );
    nascondiStanghette.scale.set(0.46, 0.62, 0.55);
    nascondiStanghette.position.set(0, -0.1, -0.58);
    nascondiStanghette.renderOrder = -1;                     // va disegnata prima degli occhiali
    testa.add(nascondiStanghette);

    // la dimensione scelta col cursore (1 = 100%)
    let dimensioneScelta = 1;
    const cursoreDimensione = document.getElementById('cursore-dimensione');
    cursoreDimensione.addEventListener('input', function() {
        dimensioneScelta = Number(cursoreDimensione.value) / 100;
        scrivi('valore-dimensione', cursoreDimensione.value + '%');
    });

    // la foto: unisco il fotogramma del video e gli occhiali 3D in un'unica immagine e la invio per email
    const bottoneFoto = document.getElementById('bottone-foto');
    bottoneFoto.addEventListener('click', scattaFoto);

    // in alto a sinistra: "Indietro" spegne la telecamera e torna alla pagina
    document.getElementById('bottone-indietro').addEventListener('click', spegni);

    function statoFoto(testo) {
        document.getElementById('stato-foto').textContent = testo;
    }

    // il riquadro invisibile che riceve la risposta di FormSubmit dopo l'invio della foto.
    // Lo creo subito (e non al momento dell'invio), così il suo primo caricamento "vuoto"
    // non viene scambiato per la risposta
    const riquadro = document.createElement('iframe');
    riquadro.name = 'riquadro-invio';
    riquadro.hidden = true;
    document.body.appendChild(riquadro);

    function scattaFoto() {
        if (!rendererProva || video.readyState < 2) {
            return;
        }
        const tela3D = rendererProva.domElement;
        const foto = document.createElement('canvas');
        foto.width = tela3D.width;                  // stessa risoluzione del riquadro (già moltiplicata per i pixel dello schermo)
        foto.height = tela3D.height;
        const ctx = foto.getContext('2d');

        // nella pagina video e occhiali sono specchiati: lo faccio anche nella foto
        ctx.translate(foto.width, 0);
        ctx.scale(-1, 1);

        // il video, tagliato come nel riquadro (object-fit: cover)
        const ingrandimento = Math.max(foto.width / video.videoWidth, foto.height / video.videoHeight);
        const larghezzaTaglio = foto.width / ingrandimento;
        const altezzaTaglio = foto.height / ingrandimento;
        const tagliaX = (video.videoWidth - larghezzaTaglio) / 2;
        const tagliaY = (video.videoHeight - altezzaTaglio) / 2;
        ctx.drawImage(video, tagliaX, tagliaY, larghezzaTaglio, altezzaTaglio, 0, 0, foto.width, foto.height);

        // se ci sono i cavalli: sopra lo sfondo i cavalli, e sopra i cavalli la persona ritagliata
        // (la persona ha le stesse misure del video, quindi la taglio nello stesso modo)
        if (cavalliAccesi) {
            ctx.drawImage(telaCavalli, 0, 0, foto.width, foto.height);
            ctx.drawImage(telaPersona, tagliaX, tagliaY, larghezzaTaglio, altezzaTaglio, 0, 0, foto.width, foto.height);
        }

        // sopra tutto, gli occhiali 3D
        ctx.drawImage(tela3D, 0, 0, foto.width, foto.height);

        // la trasformo in un file JPEG (molto più leggero di un PNG: il limite per l'email è 10 MB)
        // e mostro l'anteprima con la scelta: email, WhatsApp, salva o annulla
        tela = foto;
        foto.toBlob(function(file) {
            fotoScattata = file;
            const anteprima = document.getElementById('anteprima-foto');
            if (anteprima.src) {
                URL.revokeObjectURL(anteprima.src);       // libero la memoria della foto precedente
            }
            anteprima.src = URL.createObjectURL(file);
            document.getElementById('link-whatsapp').hidden = true;
            document.getElementById('nota-invio').textContent = '';
            document.getElementById('scelta-invio').hidden = false;
        }, 'image/jpeg', 0.9);

        // il lampo bianco, come una macchina fotografica
        contenitore.classList.remove('lampo-foto');
        void contenitore.offsetWidth;               // trucco per far ripartire l'animazione CSS
        contenitore.classList.add('lampo-foto');
    }

    // l'ultima foto scattata: il file JPEG e la tela da cui è nata (serve per farne un PNG da copiare)
    let fotoScattata = null;
    let tela = null;

    function chiudiScelta() {
        document.getElementById('scelta-invio').hidden = true;
    }

    function notaInvio(testo) {
        document.getElementById('nota-invio').textContent = testo;
    }

    // --- i quattro bottoni dopo lo scatto ---

    document.getElementById('invia-email').addEventListener('click', function() {
        chiudiScelta();
        inviaFoto(fotoScattata);
    });

    document.getElementById('invia-whatsapp').addEventListener('click', inviaWhatsApp);

    document.getElementById('salva-foto').addEventListener('click', function() {
        salvaFoto(fotoScattata);
        chiudiScelta();
        statoFoto('Foto salvata');
        setTimeout(function() { statoFoto(''); }, 2500);
    });

    document.getElementById('annulla-foto').addEventListener('click', chiudiScelta);

    // scarica la foto sul computer (es. "occhiali-giuli.jpg")
    function salvaFoto(file) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = 'occhiali-' + modelloProva.id + '.jpg';
        link.click();
        setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
    }

    // WhatsApp. Nessun sito può mandare da solo una foto a un numero WhatsApp:
    // si può solo aprire la chat con quel numero, e la foto la allega chi usa il sito.
    //  - sul telefono uso la condivisione del sistema (navigator.share): si sceglie WhatsApp e il contatto;
    //  - sul computer copio la foto (così basta incollarla con Ctrl+V) e mostro il bottone che apre la chat
    async function inviaWhatsApp() {
        const testo = 'Ecco la mia foto con gli occhiali di ' + elencoNomi(modelloProva.autori) + '!';
        const file = new File([fotoScattata], 'occhiali-' + modelloProva.id + '.jpg', { type: 'image/jpeg' });

        const telefono = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (telefono && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], text: testo });
                chiudiScelta();
                return;
            } catch (errore) {
                // condivisione annullata o non riuscita: provo nell'altro modo
            }
        }

        // il link alla chat: wa.me/<prefisso + numero>?text=<messaggio già scritto>
        const link = document.getElementById('link-whatsapp');
        link.href = 'https://wa.me/' + numeroWhatsApp + '?text=' + encodeURIComponent(testo);
        link.hidden = false;

        // copio la foto negli appunti (gli appunti accettano solo PNG, quindi la riconverto)
        try {
            const png = await new Promise(function(fatto) { tela.toBlob(fatto, 'image/png'); });
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
            notaInvio('Foto copiata! Apri la chat e incollala con Ctrl+V (Cmd+V sul Mac), poi premi Invia.');
        } catch (errore) {
            // se il browser non permette di copiare immagini, la scarico: poi si allega dalla chat
            salvaFoto(fotoScattata);
            notaInvio('La foto è stata salvata sul computer: apri la chat e allegala con la graffetta, poi premi Invia.');
        }
    }

    // L'invio per email. Un sito senza server non può spedire email da solo: uso FormSubmit (formsubmit.co),
    // un servizio gratuito che riceve un modulo e lo inoltra all'indirizzo scritto nell'indirizzo del modulo.
    // Creo un modulo nascosto con la foto allegata e lo invio dentro un riquadro (iframe) invisibile,
    // così la pagina non cambia e la prova continua
    function inviaFoto(file) {
        bottoneFoto.disabled = true;
        statoFoto('Invio della foto…');

        const modulo = document.createElement('form');
        modulo.action = 'https://formsubmit.co/' + destinatarioFoto;
        modulo.method = 'POST';
        modulo.enctype = 'multipart/form-data';   // necessario per gli allegati
        modulo.target = 'riquadro-invio';
        modulo.hidden = true;

        // i campi del modulo: diventano il testo dell'email
        function campo(nome, valore) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = nome;
            input.value = valore;
            modulo.appendChild(input);
        }
        campo('_subject', 'Nuova foto di prova: occhiali di ' + elencoNomi(modelloProva.autori));
        campo('_captcha', 'false');       // niente "non sono un robot": il modulo è invisibile
        campo('_template', 'table');      // l'email arriva come una tabella ordinata
        campo('Modello', 'Occhiali di ' + elencoNomi(modelloProva.autori));
        campo('Dimensione scelta', Math.round(dimensioneScelta * 100) + '%');
        campo('Data', new Date().toLocaleString('it-IT'));

        // la foto come allegato: un campo "file" riempito da JavaScript
        const allegato = document.createElement('input');
        allegato.type = 'file';
        allegato.name = 'attachment';
        const contenuto = new DataTransfer();
        contenuto.items.add(new File([file], 'occhiali-' + modelloProva.id + '.jpg', { type: 'image/jpeg' }));
        allegato.files = contenuto.files;
        modulo.appendChild(allegato);

        // quando FormSubmit risponde, il riquadro si carica: l'invio è fatto
        riquadro.onload = function() {
            statoFoto('Foto inviata!');
            bottoneFoto.disabled = false;
            modulo.remove();
            setTimeout(function() { statoFoto(''); }, 2500);
        };

        document.body.appendChild(modulo);
        modulo.submit();
    }

    // valori "ammorbiditi": a ogni fotogramma mi avvicino a quelli nuovi, così gli occhiali non tremano
    const posizioneMorbida = new THREE.Vector3();
    const rotazioneMorbida = new THREE.Quaternion();
    let larghezzaMorbida = 0;
    let primoViso = true;

    async function accendi() {
        accesa = true;
        bottone.textContent = 'Spegni la telecamera';
        bottone.classList.add('selected');
        scrivi('valore-prova', 'Telecamera accesa');
        contenitore.hidden = false;
        messaggio('Accendo la telecamera…');

        // schermo intero vero (senza le barre del browser), se il browser lo permette;
        // se no il riquadro copre comunque tutta la finestra (position: fixed nel CSS)
        if (contenitore.requestFullscreen) {
            contenitore.requestFullscreen().catch(function() {});
        }

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('non supportata');
            }
            flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 }, audio: false });
            video.srcObject = flusso;
            await video.play();

            if (riconoscitore === null) {
                messaggio('Preparo il riconoscimento del viso…');
                const vision = await import(indirizzoMediaPipe + '/vision_bundle.mjs');
                const file = await vision.FilesetResolver.forVisionTasks(indirizzoMediaPipe + '/wasm');
                riconoscitore = await vision.FaceLandmarker.createFromOptions(file, {
                    baseOptions: { modelAssetPath: indirizzoModelloViso, delegate: 'GPU' },
                    runningMode: 'VIDEO',
                    numFaces: 1,
                    outputFacialTransformationMatrixes: true   // la rotazione della testa
                });
            }

            if (rendererProva === null) {
                // preserveDrawingBuffer: tiene l'ultimo disegno, così la foto può copiarlo
                rendererProva = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
                rendererProva.setPixelRatio(window.devicePixelRatio);
                contenitore.insertBefore(rendererProva.domElement, telaPersona.nextSibling);   // sopra video, cavalli e persona; sotto i bottoni
            }
            if (!accesa) {
                return;   // nel frattempo è stata spenta
            }
            messaggio('Cerco il tuo viso…');
            primoViso = true;
            rendererProva.setAnimationLoop(fotogramma);
        } catch (errore) {
            if (errore.name === 'NotAllowedError') {
                messaggio('Non hai dato il permesso di usare la telecamera.');
            } else if (errore.name === 'NotFoundError') {
                messaggio('Non ho trovato nessuna telecamera.');
            } else if (errore.message === 'non supportata') {
                messaggio('Questo browser non può usare la telecamera (serve aprire la pagina da localhost o https).');
            } else {
                messaggio('Non è stato possibile avviare la prova.');
            }
            spegniFlusso();
        }
    }

    function spegniFlusso() {
        if (flusso) {
            flusso.getTracks().forEach(function(traccia) { traccia.stop(); });   // la lucina della telecamera si spegne
            flusso = null;
        }
        video.srcObject = null;
        if (rendererProva) {
            rendererProva.setAnimationLoop(null);
        }
    }

    function spegni() {
        accesa = false;
        spegniFlusso();
        contenitore.hidden = true;
        testa.visible = false;
        messaggio('');
        statoFoto('');
        chiudiScelta();
        spegniCavalli();
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(function() {});   // esco dallo schermo intero
        }
        bottone.textContent = 'Accendi la telecamera';
        bottone.classList.remove('selected');
        scrivi('valore-prova', 'Telecamera spenta');
    }

    bottone.addEventListener('click', function() {
        if (accesa) {
            spegni();
        } else {
            accendi();
        }
    });

    // a ogni fotogramma: trovo il viso e ci metto sopra gli occhiali
    function fotogramma() {
        const larghezza = contenitore.clientWidth;
        const altezza = contenitore.clientHeight;
        rendererProva.setSize(larghezza, altezza);

        // camera ortografica in pixel: (0, 0) al centro del riquadro, y verso l'alto
        cameraProva.left = -larghezza / 2;
        cameraProva.right = larghezza / 2;
        cameraProva.top = altezza / 2;
        cameraProva.bottom = -altezza / 2;
        cameraProva.updateProjectionMatrix();

        const nuovoFotogramma = video.readyState >= 2 && video.currentTime !== ultimoTempoVideo;
        if (nuovoFotogramma) {
            ultimoTempoVideo = video.currentTime;
            const risultato = riconoscitore.detectForVideo(video, performance.now());

            if (risultato.faceLandmarks.length === 0) {
                testa.visible = false;
                messaggio('Cerco il tuo viso…');
            } else {
                messaggio('');
                mettiSulViso(risultato.faceLandmarks[0], risultato.facialTransformationMatrixes[0], larghezza, altezza);
            }
        }

        // i cavalli dietro di te (se accesi): ritaglio la persona e muovo i cavalli
        aggiornaCavalli(larghezza, altezza, nuovoFotogramma);

        rendererProva.render(scenaProva, cameraProva);
    }

    function mettiSulViso(punti, matrice, larghezza, altezza) {
        // il video è mostrato con object-fit: cover (riempie il riquadro e viene tagliato ai bordi):
        // calcolo quanto è ingrandito e spostato, per portare i punti del viso dal video al riquadro
        const ingrandimento = Math.max(larghezza / video.videoWidth, altezza / video.videoHeight);
        const larghezzaVideo = video.videoWidth * ingrandimento;
        const altezzaVideo = video.videoHeight * ingrandimento;
        const margineX = (larghezza - larghezzaVideo) / 2;
        const margineY = (altezza - altezzaVideo) / 2;

        // da punto di MediaPipe (valori da 0 a 1) a pixel nella scena 3D (centro = 0, y verso l'alto)
        function inPixel(p) {
            return new THREE.Vector3(
                margineX + p.x * larghezzaVideo - larghezza / 2,
                altezza / 2 - (margineY + p.y * altezzaVideo),
                -p.z * larghezzaVideo
            );
        }

        const radiceNaso = inPixel(punti[PUNTO_TRA_GLI_OCCHI]);
        const larghezzaViso = inPixel(punti[PUNTO_TEMPIA_DESTRA]).distanceTo(inPixel(punti[PUNTO_TEMPIA_SINISTRA]));

        // la rotazione della testa, dalla matrice di MediaPipe
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
        testa.scale.setScalar(larghezzaMorbida * 1.05 * dimensioneScelta);   // poco più larghi del viso, per la dimensione scelta
        testa.visible = true;
    }
}


/* ===== gli occhiali indossati da un cavallo ===== */

// Misure prese dal file models/cavallo.glb (in unità del file, il cavallo guarda verso +z):
// la testa è larga circa 22, gli occhi sono all'altezza 158 e il muso finisce a z = 137
const testaCavallo = { y: 158, z: 118, fronte: 137, larghezza: 22 };
const scalaCavalloIndossato = 6 / 322;   // il cavallo, lungo 322 nel file, diventa lungo 6

function preparaIndossati(scena, camera, controlli, pavimento, occhiali, scala, centro, misure) {
    // com'erano gli occhiali "da soli", per poterli rimettere così
    const scalaDaSoli = scala;
    const posizioneDaSoli = occhiali.position.clone();
    const pavimentoDaSoli = pavimento.position.y;

    // il cavallo è sistemato in modo che la sua testa (all'altezza degli occhi) sia al centro della scena
    const k = scalaCavalloIndossato;
    const cavallo = new THREE.Group();
    cavallo.visible = false;
    cavallo.position.set(0, -testaCavallo.y * k, -testaCavallo.z * k);
    scena.add(cavallo);
    let caricato = false;

    function caricaCavallo() {
        caricato = true;
        new GLTFLoader().load('models/cavallo.glb', function(gltf) {
            // senza animazione: il cavallo sta fermo nella sua posa, così gli occhiali restano sul muso
            gltf.scene.scale.setScalar(k);
            gltf.scene.traverse(function(parte) {
                if (parte.isMesh) {
                    parte.castShadow = true;
                    parte.receiveShadow = true;
                }
            });
            cavallo.add(gltf.scene);
        });
    }

    function mostraDaSoli() {
        cavallo.visible = false;
        occhiali.scale.setScalar(scalaDaSoli);
        occhiali.position.copy(posizioneDaSoli);
        pavimento.position.y = pavimentoDaSoli;
        camera.position.set(3, 2, 4.5);
        controlli.target.set(0, 0, 0);
    }

    function mostraIndossati() {
        if (!caricato) {
            caricaCavallo();
        }
        cavallo.visible = true;

        // gli occhiali diventano larghi un po' più della testa del cavallo (la montatura deve stare fuori dal muso)
        const nuovaScala = (testaCavallo.larghezza * 1.35 * k) / misure.x;
        occhiali.scale.setScalar(nuovaScala);

        // centrati sugli occhi, con la montatura appena davanti al muso
        const fronteMuso = (testaCavallo.fronte - testaCavallo.z) * k;   // dove finisce il muso, rispetto al centro della scena
        occhiali.position.set(
            -centro.x * nuovaScala,
            -centro.y * nuovaScala,
            fronteMuso + 0.05 - (centro.z + misure.z / 2) * nuovaScala
        );

        // il pavimento scende sotto gli zoccoli; la camera si allontana per vedere tutto il cavallo
        pavimento.position.y = -testaCavallo.y * k;
        camera.position.set(6, 1.5, 5);
        controlli.target.set(0, -1.2, -2.4);
    }

    const bottoni = document.querySelectorAll('.scelta-vista');
    bottoni.forEach(function(bottone) {
        bottone.addEventListener('click', function() {
            if (bottone.dataset.vista === 'indossati') {
                mostraIndossati();
            } else {
                mostraDaSoli();
            }
            bottoni.forEach(function(altro) {
                altro.classList.remove('selected');
            });
            bottone.classList.add('selected');
            scrivi('valore-vista', bottone.dataset.nome);
        });
    });
}


/* ===== i cavalli giganti sullo sfondo (si accendono con "Sì") ===== */

// Come nella galleria, i cavalli sono attaccati alla camera e lontani dietro gli occhiali:
// così restano sempre sullo sfondo anche mentre la vista gira. Qui sono enormi:
// il più vicino è lungo 9 unità, quasi tre volte gli occhiali
function preparaCavalli(scena, camera) {
    scena.add(camera);                       // serve perché quello che è attaccato alla camera si veda

    const gruppo = new THREE.Group();        // tutti i cavalli: lo accendo e spengo con un solo .visible
    gruppo.visible = false;
    camera.add(gruppo);

    const corsie = [
        { y: -4.5, profondita: 13, lunghezza: 9, velocita: 6 },   // il più vicino e veloce (zoccoli sul bordo in basso)
        { y: -3.0, profondita: 18, lunghezza: 9, velocita: 5 },
        { y: -0.5, profondita: 23, lunghezza: 9, velocita: 4 }    // il più lontano e lento
    ];
    const cavalli = [];
    let caricati = false;

    function carica() {
        caricati = true;
        new GLTFLoader().load('models/cavallo.glb', function(gltf) {
            const galoppo = gltf.animations[0];

            // il cavallo nel file non ha nome e l'animazione lo cerca per nome: gliene do uno fisso
            gltf.scene.traverse(function(parte) {
                if (!parte.name) {
                    parte.name = parte.uuid;
                }
            });
            const lunghezzaFile = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).z;

            corsie.forEach(function(corsia) {
                const cavallo = gltf.scene.clone();
                cavallo.scale.setScalar(corsia.lunghezza / lunghezzaFile);
                cavallo.rotation.y = Math.PI / 2;    // nel file guarda verso +z: lo giro perché corra verso destra
                cavallo.position.set((Math.random() - 0.5) * 20, corsia.y, -corsia.profondita);
                gruppo.add(cavallo);

                const mixer = new THREE.AnimationMixer(cavallo);
                const azione = mixer.clipAction(galoppo);
                azione.time = Math.random() * galoppo.duration;
                azione.timeScale = 1.2;
                azione.play();

                cavalli.push({ cavallo: cavallo, mixer: mixer, corsia: corsia });
            });
        });
    }

    // i bottoni Sì / No
    const bottoni = document.querySelectorAll('.scelta-cavalli');
    bottoni.forEach(function(bottone) {
        bottone.addEventListener('click', function() {
            const accesi = bottone.dataset.cavalli === 'si';
            if (accesi && !caricati) {
                carica();                        // il file del cavallo si scarica solo la prima volta
            }
            gruppo.visible = accesi;

            bottoni.forEach(function(altro) {
                altro.classList.remove('selected');
            });
            bottone.classList.add('selected');
            scrivi('valore-cavalli', bottone.dataset.nome);
        });
    });

    // a ogni fotogramma: galoppano e, usciti a destra, rientrano da sinistra
    function muovi(secondi) {
        if (!gruppo.visible) {
            return;
        }
        cavalli.forEach(function(c) {
            c.mixer.update(secondi);
            c.cavallo.position.x += c.corsia.velocita * secondi;

            // metà della larghezza visibile a quella distanza, più la lunghezza del cavallo
            const bordo = c.corsia.profondita * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect
                        + c.corsia.lunghezza;
            if (c.cavallo.position.x > bordo) {
                c.cavallo.position.x = -bordo;
            }
        });
    }

    return { muovi: muovi };
}


/* ===== le informazioni, lette dal file ===== */

function scriviInformazioni(occhiali, pesoFile) {
    let parti = 0;
    let vertici = 0;
    let triangoli = 0;

    occhiali.traverse(function(oggetto) {
        if (oggetto.isMesh) {
            parti++;
            const geometria = oggetto.geometry;
            vertici += geometria.attributes.position.count;
            triangoli += geometria.index ? geometria.index.count / 3 : geometria.attributes.position.count / 3;
        }
    });

    const numero = new Intl.NumberFormat('it-IT');
    scrivi('info-parti', numero.format(parti));
    scrivi('info-vertici', numero.format(vertici));
    scrivi('info-triangoli', numero.format(Math.round(triangoli)));
    scrivi('info-peso', pesoFile ? (pesoFile / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB' : '–');

    // misure: nel formato glTF l'unità è il metro, qui le scrivo in centimetri
    const misure = new THREE.Box3().setFromObject(occhiali).getSize(new THREE.Vector3());
    const cm = function(metri) { return (metri * 100).toFixed(1).replace('.', ',') + ' cm'; };
    scrivi('info-larghezza', cm(misure.x));
    scrivi('info-altezza', cm(misure.y));
    scrivi('info-profondita', cm(misure.z));
}
