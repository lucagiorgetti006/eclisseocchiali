// modelli.js – l'elenco degli occhiali della galleria, usato dalla pagina dettaglio.html.
// Ogni modello ha:
//   id      -> il nome usato nell'indirizzo: dettaglio.html?modello=<id>
//   file    -> il file .glb da caricare
//   autori  -> chi ha consegnato quel modello (più persone se hanno consegnato lo stesso file)
//   nascondi (facoltativo) -> pezzi del file da togliere, per nome
//   ruotaZ   (facoltativo) -> gradi di rotazione attorno all'asse z, per raddrizzare il modello
// Per aggiungere un modello basta aggiungere una riga qui (e la sua casella in index.html)

export const modelli = [
    { id: 'giuli', file: 'models/galleria/giuli.glb',
      autori: ['Adele De Marini', 'Francesca Galli', 'Giuli', 'Giulia Camasso'] },
    { id: 'alessandromorri', file: 'models/galleria/alessandromorri.glb',
      autori: ['Alessandro Morri', 'Linda Garnaroli', 'Valentina Vicinanza'] },
    { id: 'annaporcellini', file: 'models/galleria/annaporcellini.glb',
      autori: ['Anna Porcellini', 'Takwa Guezguez'] },
    { id: 'camilasaraviaruiz', file: 'models/galleria/camilasaraviaruiz.glb',
      autori: ['Camila Saravia Ruiz', 'Federica Cancello'],
      nascondi: ['testa_sx', 'testa_dx'] },
    { id: 'davidesebastianelli', file: 'models/galleria/davidesebastianelli.glb',
      autori: ['Davide Sebastianelli', 'Luigi Boccarossa'] },
    { id: 'eleonoranobili', file: 'models/galleria/eleonoranobili.glb',
      autori: ['Eleonora Nobili', 'Sofia Bezzicheri'] },
    { id: 'giacomocerioni', file: 'models/galleria/giacomocerioni.glb',
      autori: ['Giacomo Cerioni', 'Gianmarco Tito', 'Jacopo Del Bianco'] },
    { id: 'lucagiorgetti', file: 'models/galleria/lucagiorgetti.glb',
      autori: ['Luca Giorgetti', 'Viola Mongiusti'] },
    { id: 'martinacarnevali', file: 'models/galleria/martinacarnevali.glb',
      autori: ['Edoardo Fabbri', 'Martina Carnevali'],
      ruotaZ: 180 },
    { id: 'niccolocasanova', file: 'models/galleria/niccolocasanova.glb',
      autori: ['Niccolò Casanova'] }
];
