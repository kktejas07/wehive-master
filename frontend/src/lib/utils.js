import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

let _currency = 'INR';
let _locale = 'en-IN';

export function setCurrency(code) {
  _currency = code || 'INR';
  _locale = code === 'USD' ? 'en-US' : code === 'EUR' ? 'de-DE' : code === 'GBP' ? 'en-GB' : 'en-IN';
}

export function getCurrency() {
  return _currency;
}

export function inr(n) {
  try {
    return new Intl.NumberFormat(_locale, { style: 'currency', currency: _currency, maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    const sym = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[_currency] || _currency;
    return `${sym}${n || 0}`;
  }
}

export const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export function statusColor(s) {
  return STATUS_COLORS[s] || 'bg-slate-100 text-slate-700';
}

export function countryFlag(code) {
  if (!code || typeof code !== 'string') return '';
  const c = code.toUpperCase();
  if (c.length !== 2) return '';
  const OFFSET = 0x1F1E6 - 65;
  return String.fromCodePoint(c.charCodeAt(0) + OFFSET, c.charCodeAt(1) + OFFSET);
}

const UNI_DOMAIN_MAP = {
  mit: 'mit.edu', harvard: 'harvard.edu', stanford: 'stanford.edu',
  oxford: 'ox.ac.uk', cambridge: 'cam.ac.uk', imperial: 'imperial.ac.uk',
  ucl: 'ucl.ac.uk', lse: 'lse.ac.uk', kcl: 'kcl.ac.uk',
  edinburgh: 'ed.ac.uk', manchester: 'manchester.ac.uk', bristol: 'bristol.ac.uk',
  warwick: 'warwick.ac.uk', cardiff: 'cardiff.ac.uk', aston: 'aston.ac.uk',
  cranfield: 'cranfield.ac.uk', durham: 'durham.ac.uk', lancaster: 'lancaster.ac.uk',
  leeds: 'leeds.ac.uk', leicester: 'le.ac.uk', liverpool: 'liverpool.ac.uk',
  nottingham: 'nottingham.ac.uk', reading: 'reading.ac.uk', sheffield: 'sheffield.ac.uk',
  southampton: 'southampton.ac.uk', surrey: 'surrey.ac.uk', sussex: 'sussex.ac.uk',
  york: 'york.ac.uk', birmingham: 'bham.ac.uk', glasgow: 'gla.ac.uk',
  newcastle: 'ncl.ac.uk', aberdeen: 'abdn.ac.uk', dundee: 'dundee.ac.uk',
  st-andrews: 'st-andrews.ac.uk', strathclyde: 'strath.ac.uk', bath: 'bath.ac.uk',
  exeter: 'exeter.ac.uk', essex: 'essex.ac.uk', kent: 'kent.ac.uk',
  heriot-watt: 'hw.ac.uk', brunel: 'brunel.ac.uk', city: 'city.ac.uk',
  coventry: 'coventry.ac.uk', kingston: 'kingston.ac.uk', middlesex: 'mdx.ac.uk',
  ulster: 'ulster.ac.uk', swansea: 'swansea.ac.uk', bangor: 'bangor.ac.uk',
  aberystwyth: 'aber.ac.uk', royal-holloway: 'rhul.ac.uk', soas: 'soas.ac.uk',
  birkbeck: 'bbk.ac.uk', goldsmiths: 'gold.ac.uk', queen-mary: 'qmul.ac.uk',
  bournemouth: 'bournemouth.ac.uk', brighton: 'brighton.ac.uk', portsmouth: 'port.ac.uk',
  plymouth: 'plymouth.ac.uk', salford: 'salford.ac.uk', huddersfield: 'hud.ac.uk',
  lincoln: 'lincoln.ac.uk', derby: 'derby.ac.uk', staffordshire: 'staffs.ac.uk',
  teesside: 'tees.ac.uk', northumbria: 'northumbria.ac.uk', sunderland: 'sunderland.ac.uk',
  bedfordshire: 'beds.ac.uk', bolton: 'bolton.ac.uk', buckingham: 'buckingham.ac.uk',
  chester: 'chester.ac.uk', cumbria: 'cumbria.ac.uk', greenwich: 'gre.ac.uk',
  westminster: 'westminster.ac.uk', west-london: 'uwl.ac.uk', east-london: 'uel.ac.uk',
  south-bank: 'lsbu.ac.uk', london-met: 'londonmet.ac.uk', roehampton: 'roehampton.ac.uk',
  hertfordshire: 'herts.ac.uk', anglia-ruskin: 'aru.ac.uk', oxford-brookes: 'brookes.ac.uk',
  manchester-met: 'mmu.ac.uk', nottingham-trent: 'ntu.ac.uk', sheffield-hallam: 'shu.ac.uk',
  leeds-beckett: 'leedsbeckett.ac.uk', liverpool-john-moores: 'ljmu.ac.uk',
  glasgow-caledonian: 'gcu.ac.uk', edinburgh-napier: 'napier.ac.uk',
  robert-gordon: 'rgu.ac.uk', abertay: 'abertay.ac.uk', uws: 'uws.ac.uk',
  highlands: 'uhi.ac.uk', queen-margaret: 'qmu.ac.uk', stirling: 'stir.ac.uk',
  birmingham-city: 'bcu.ac.uk', worcester: 'worc.ac.uk', gloucestershire: 'glos.ac.uk',
  bath-spa: 'bathspa.ac.uk', uwe: 'uwe.ac.uk', falmouth: 'falmouth.ac.uk',
  winchester: 'winchester.ac.uk', canterbury: 'canterbury.ac.uk', chichester: 'chi.ac.uk',
  northampton: 'northampton.ac.uk', bishop-grosseteste: 'bishopg.ac.uk',
  newman: 'newman.ac.uk', st-marys: 'stmarys.ac.uk', st-marks: 'stmarks.ac.uk',
  edge-hill: 'edgehill.ac.uk', liverpool-hope: 'hope.ac.uk', leeds-trinity: 'leedstrinity.ac.uk',
  york-st-john: 'yorksj.ac.uk',
  polimi: 'polimi.it', unibo: 'unibo.it', bocconi: 'unibocconi.it',
  sapienza: 'uniroma1.it', padova: 'unipd.it', torino: 'unito.it',
  firenze: 'unifi.it', pisa: 'unipi.it', milano: 'unimi.it',
  napoli: 'unina.it', bari: 'uniba.it', palermo: 'unipa.it',
  genova: 'unige.it', pavese: 'unipv.it', verona: 'univr.it',
  trento: 'unitn.it', trieste: 'units.it', udine: 'uniud.it',
  venezia: 'unive.it', siena: 'unisi.it', parma: 'unipr.it',
  modena: 'unimore.it', ferrara: 'unife.it', urbino: 'uniurb.it',
  macerata: 'unimc.it', camerino: 'unicam.it', perugia: 'unipg.it',
  salerno: 'unisa.it', calabria: 'unical.it', catania: 'unict.it',
  messina: 'unime.it', cagliari: 'unica.it', sassari: 'uniss.it',
  chieti: 'unich.it', laquila: 'univaq.it', molise: 'unimol.it',
  foggia: 'unifg.it', basilicata: 'unibas.it', reggio-calabria: 'unirc.it',
  insubria: 'uninsubria.it', bergamo: 'unibg.it', brescia: 'unibs.it',
  roma-tre: 'uniroma3.it', tor-vergata: 'uniroma2.it', luis: 'luiss.it',
  iulm: 'iulm.it', cattolica: 'unicatt.it', san-raffaele: 'unisr.it',
  eth: 'ethz.ch', epfl: 'epfl.ch', geneva: 'unige.ch', zurich: 'uzh.ch',
  bern: 'unibe.ch', basel: 'unibas.ch', lausanne: 'unil.ch',
  fribourg: 'unifr.ch', neuchatel: 'unine.ch', lugano: 'usi.ch',
  tUM: 'tum.de', lmu: 'lmu.de', heidelberg: 'uni-heidelberg.de',
  humboldt: 'hu-berlin.de', freie-berlin: 'fu-berlin.de', bonn: 'uni-bonn.de',
  goettingen: 'uni-goettingen.de', freiburg: 'uni-freiburg.de', hamburg: 'uni-hamburg.de',
  koeln: 'uni-koeln.de', mannheim: 'uni-mannheim.de', muenster: 'uni-muenster.de',
  stuttgart: 'uni-stuttgart.de', karlsruhe: 'kit.edu', aachen: 'rwth-aachen.de',
  darmstadt: 'tu-darmstadt.de', dresden: 'tu-dresden.de', hannover: 'uni-hannover.de',
  bremen: 'uni-bremen.de', bielefeld: 'uni-bielefeld.de', konstanz: 'uni-konstanz.de',
  ulm: 'uni-ulm.de', wuerzburg: 'uni-wuerzburg.de', erlangen: 'fau.de',
  regensburg: 'uni-regensburg.de', mainz: 'uni-mainz.de', trier: 'uni-trier.de',
  marburg: 'uni-marburg.de', giessen: 'uni-giessen.de', kiel: 'uni-kiel.de',
  rostock: 'uni-rostock.de', greifswald: 'uni-greifswald.de', potsdam: 'uni-potsdam.de',
  jena: 'uni-jena.de', leipzig: 'uni-leipzig.de', halle: 'uni-halle.de',
  magdeburg: 'ovgu.de', oldenburg: 'uni-oldenburg.de', osnabrueck: 'uni-osnabrueck.de',
  paderborn: 'uni-paderborn.de', siegen: 'uni-siegen.de', wuppertal: 'uni-wuppertal.de',
  duisburg-essen: 'uni-due.de', ruhr-bochum: 'ruhr-uni-bochum.de', dortmund: 'tu-dortmund.de',
  hohenheim: 'uni-hohenheim.de', bayreuth: 'uni-bayreuth.de', passau: 'uni-passau.de',
  lueneburg: 'leuphana.de', flensburg: 'uni-flensburg.de', kaiserslautern: 'uni-kl.de',
  saarland: 'uni-saarland.de', frankfurt: 'uni-frankfurt.de', duesseldorf: 'hhu.de',
  tugraz: 'tugraz.at', tuwien: 'tuwien.ac.at', uniwien: 'univie.ac.at',
  innsbruck: 'uibk.ac.at', salzburg: 'plus.ac.at', linz: 'jku.at',
  klagenfurt: 'aau.at', leoben: 'unileoben.ac.at', bodenkultur: 'boku.ac.at',
  delft: 'tudelft.nl', utwente: 'utwente.nl', wur: 'wur.nl',
  vuamsterdam: 'vu.nl', maastricht: 'maastrichtuniversity.nl', tilburg: 'tilburguniversity.edu',
  radboud: 'ru.nl', rug: 'rug.nl', leiden: 'leidenuniv.nl',
  uu: 'uu.nl', erasmus: 'eur.nl', eindhoven: 'tue.nl',
  toronto: 'utoronto.ca', mcgill: 'mcgill.ca', ubc: 'ubc.ca',
  alberta: 'ualberta.ca', mcmaster: 'mcmaster.ca', waterloo: 'uwaterloo.ca',
  western: 'uwo.ca', queensu: 'queensu.ca', ottawa: 'uottawa.ca',
  calgary: 'ucalgary.ca', montreal: 'umontreal.ca', laval: 'ulaval.ca',
  sfu: 'sfu.ca', yorku: 'yorku.ca', dalhousie: 'dal.ca',
  sydney: 'sydney.edu.au', unimelb: 'unimelb.edu.au', anu: 'anu.edu.au',
  unsw: 'unsw.edu.au', uq: 'uq.edu.au', monash: 'monash.edu.au',
  adelaide: 'adelaide.edu.au', uwa: 'uwa.edu.au', rmit: 'rmit.edu.au',
  qut: 'qut.edu.au', deakin: 'deakin.edu.au', curtin: 'curtin.edu.au',
  auckland: 'auckland.ac.nz', otago: 'otago.ac.nz', vic: 'vuw.ac.nz',
  canterbury: 'canterbury.ac.nz', massey: 'massey.ac.nz', aut: 'aut.ac.nz',
  waikato: 'waikato.ac.nz', nus: 'nus.edu.sg', ntu: 'ntu.edu.sg',
  smu: 'smu.edu.sg', tokyo: 'u-tokyo.ac.jp', kyoto: 'kyoto-u.ac.jp',
  osaka: 'osaka-u.ac.jp', tohoku: 'tohoku.ac.jp', nagoya: 'nagoya-u.ac.jp',
  hokkaido: 'hokudai.ac.jp', kyushu: 'kyushu-u.ac.jp', waseda: 'waseda.jp',
  keio: 'keio.ac.jp', snu: 'snu.ac.kr', kaist: 'kaist.ac.kr',
  yonsei: 'yonsei.ac.kr', korea: 'korea.ac.kr', postech: 'postech.ac.kr',
  tsinghua: 'tsinghua.edu.cn', pku: 'pku.edu.cn', fudan: 'fudan.edu.cn',
  sjtu: 'sjtu.edu.cn', zju: 'zju.edu.cn', nju: 'nju.edu.cn',
  iitb: 'iitb.ac.in', iitd: 'iitd.ac.in', iitm: 'iitm.ac.in',
  iitk: 'iitk.ac.in', iitkgp: 'iitkgp.ac.in', iisc: 'iisc.ac.in',
  kuleuven: 'kuleuven.be', ugent: 'ugent.be', ulb: 'ulb.be',
  vub: 'vub.be', uantwerpen: 'uantwerpen.be', uliege: 'uliege.be',
  uclouvain: 'uclouvain.be',
  poliba: 'poliba.it', polito: 'polito.it',
  'ie-trinity-college-dublin': 'tcd.ie', 'ie-university-college-dublin': 'ucd.ie',
  'ie-university-college-cork': 'ucc.ie', 'ie-national-university-of-ireland-galway': 'nuigalway.ie',
  'jp-university-of-tokyo': 'u-tokyo.ac.jp', 'jp-kyoto-university': 'kyoto-u.ac.jp',
  'jp-osaka-university': 'osaka-u.ac.jp', 'jp-tokyo-institute-of-technology': 'titech.ac.jp',
  'kr-seoul-national-university': 'snu.ac.kr', 'kr-korea-advanced-institute-of-science-and-technology': 'kaist.ac.kr',
  'kr-korea-university': 'korea.ac.kr', 'kr-yonsei-university': 'yonsei.ac.kr',
  'nl-university-of-amsterdam': 'uva.nl', 'nl-delft-university-of-technology': 'tudelft.nl',
  'nl-wageningen-university': 'wur.nl', 'nl-utrecht-university': 'uu.nl',
  'nl-leiden-university': 'universiteitleiden.nl',
  'nz-university-of-auckland': 'auckland.ac.nz', 'nz-university-of-otago': 'otago.ac.nz',
  'nz-victoria-university-of-wellington': 'vuw.ac.nz',
  'sg-national-university-of-singapore': 'nus.edu.sg', 'sg-nanyang-technological-university': 'ntu.edu.sg',
  'sg-singapore-management-university': 'smu.edu.sg',
  'se-lund-university': 'lu.se', 'se-kth-royal-institute-of-technology': 'kth.se',
  'se-uppsala-university': 'uu.se', 'se-stockholm-university': 'su.se',
  'fr-universit-psl': 'psl.eu', 'fr-cole-polytechnique': 'polytechnique.edu',
  'fr-sorbonne-university': 'sorbonne-universite.fr', 'fr-hec-paris': 'hec.edu',
  'fr-sciences-po': 'sciencespo.fr',
  nova: 'unl.pt', lisboa: 'ulisboa.pt', porto: 'up.pt',
  coimbra: 'uc.pt', minho: 'uminho.pt', aveiro: 'ua.pt',
  algarve: 'ualg.pt', evora: 'uevora.pt', catolica: 'ucp.pt',
  iscte: 'iscte-iul.pt', madeira: 'uma.pt', acores: 'uac.pt',
  jagiellonian: 'uj.edu.pl', unide: 'uw.edu.pl', poznan: 'amu.edu.pl',
  gdansk: 'ug.edu.pl', wroclaw: 'uwr.edu.pl', lodz: 'uni.lodz.pl',
  torun: 'umk.pl', lublin: 'umcs.pl', katowice: 'us.edu.pl',
  szczecin: 'usz.edu.pl', bialystok: 'uwb.edu.pl', opole: 'uni.opole.pl',
  rzeszow: 'ur.edu.pl', kielce: 'ujk.edu.pl', zielona-gora: 'uz.zgora.pl',
  warsaw-tech: 'pw.edu.pl', agh: 'agh.edu.pl', sgh: 'sgh.waw.pl',
  aa: 'metu.edu.tr', itu: 'itu.edu.tr', bogazici: 'boun.edu.tr',
  bilkent: 'bilkent.edu.tr', koc: 'ku.edu.tr', sabanci: 'sabanciuniv.edu',
};

const COUNTRY_DOMAINS = {
  us: '.edu', uk: '.ac.uk', de: '.de', it: '.it', fr: '.fr',
  es: '.es', pt: '.pt', pl: '.pl', ie: '.ie', nl: '.nl',
  be: '.be', at: '.ac.at', ch: '.ch', se: '.se', dk: '.dk',
  no: '.no', fi: '.fi', ca: '.ca', au: '.edu.au', nz: '.ac.nz',
  jp: '.ac.jp', kr: '.ac.kr', sg: '.edu.sg', cn: '.edu.cn',
  in: '.ac.in', gr: '.gr', hr: '.hr',
};

export function universityLogo(universityId, shortName, country) {
  if (!universityId) return '';
  const id = universityId.toLowerCase().replace(/\s+/g, '-');
  
  let domain = UNI_DOMAIN_MAP[id] || UNI_DOMAIN_MAP[shortName?.toLowerCase()];
  
  if (!domain && country) {
    const suffix = COUNTRY_DOMAINS[country];
    if (suffix) {
      domain = id + suffix;
    }
  }
  
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(shortName || id)}&background=1a2a5e&color=fff&size=96&bold=true`;
}
