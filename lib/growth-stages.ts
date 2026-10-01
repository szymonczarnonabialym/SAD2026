// Short labels based on the stone-fruit BBCH key (includes Prunus avium / cerasus).
export const growthStageSource='https://www.inhort.pl/files/sor/programy_ochrony/Program_ochrony_czeresni.pdf';
const detailedStages=[
 {value:'00',label:'Spoczynek zimowy'},
 {value:'01',label:'Początek nabrzmiewania pąków liściowych'},
 {value:'03',label:'Koniec nabrzmiewania pąków liściowych'},
 {value:'09',label:'Zielone końce liści'},
 {value:'10',label:'Pękanie pąków liściowych'},
 {value:'11',label:'Pierwszy rozwinięty liść'},
 {value:'19',label:'Wykształcone pierwsze liście'},
 {value:'31',label:'Początek wzrostu pędów'},
 {value:'51',label:'Nabrzmiewanie pąków kwiatowych'},
 {value:'53',label:'Pękanie pąków kwiatowych'},
 {value:'54',label:'Kwiatostan pod zielonymi łuskami'},
 {value:'55',label:'Zielony pąk'},
 {value:'56',label:'Wydłużanie płatków, rozdzielanie kwiatów'},
 {value:'57',label:'Początek białego pąka'},
 {value:'59',label:'Pąki tuż przed otwarciem kwiatów'},
 {value:'60',label:'Pierwsze otwarte kwiaty'},
 {value:'61',label:'Początek kwitnienia — ok. 10% kwiatów'},
 {value:'65',label:'Pełnia kwitnienia — co najmniej 50% kwiatów'},
 {value:'67',label:'Opadanie większości płatków'},
 {value:'69',label:'Koniec kwitnienia'},
 {value:'71',label:'Wzrost zawiązków po kwitnieniu'},
 {value:'75',label:'Owoce około połowy docelowej wielkości'},
 {value:'79',label:'Owoce bliskie docelowej wielkości'},
 {value:'81',label:'Początek wybarwiania owoców'},
 {value:'85',label:'Zaawansowane wybarwienie owoców'},
 {value:'87',label:'Dojrzałość do zbioru'},
 {value:'89',label:'Dojrzałość konsumpcyjna'},
 {value:'91',label:'Koniec wzrostu pędów'},
 {value:'92',label:'Jesienne przebarwianie liści'},
 {value:'93',label:'Początek opadania liści'},
 {value:'95',label:'Około połowy liści przebarwionych lub opadłych'},
 {value:'97',label:'Drzewo bez liści'},
 {value:'99',label:'Po zbiorach, spoczynek'}
];
// Principal BBCH stages present in the stone-fruit key, plus a practical post-harvest tag.
export const growthStages=[
 {value:'buds',label:'Rozwój pąków',bbch:'00–09'},
 {value:'leaves',label:'Rozwój liści',bbch:'10–19'},
 {value:'shoots',label:'Rozwój pędów',bbch:'31–39'},
 {value:'inflorescence',label:'Rozwój kwiatostanów',bbch:'51–59'},
 {value:'flowering',label:'Kwitnienie',bbch:'60–69'},
 {value:'fruit-growth',label:'Rozwój owoców',bbch:'71–79'},
 {value:'ripening',label:'Dojrzewanie i zbiór',bbch:'81–89'},
 {value:'dormancy',label:'Zamieranie i początek spoczynku',bbch:'91–99'},
 {value:'post-harvest',label:'Po zbiorach',bbch:''}
];
export const flowerBudStages=[{value:'green-bud',label:'Zielony pąk',bbch:'55'},{value:'white-bud',label:'Biały pąk',bbch:'57–59'}];
export function stageLabel(stage?:string|null){const grouped=[...growthStages,...flowerBudStages].find(s=>s.value===stage);if(grouped)return grouped.label+(grouped.bbch?` · BBCH ${grouped.bbch}`:'');const old=detailedStages.find(s=>s.value===stage);return old?`${old.label} · BBCH ${old.value}`:stage||'Faza niepodana'}
