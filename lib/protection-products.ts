// Name picker only. No product-to-stage/dose recommendations or claims of current authorization.
export const protectionCatalogSources={
 sour:'https://www.inhort.pl/files/sor/programy_ochrony/Program_ochrony_wisni.pdf',
 sweet:'https://www.inhort.pl/files/sor/programy_ochrony/Program_ochrony_czeresni.pdf',
 labels:'https://www.gov.pl/web/rolnictwo/etykiety-srodkow-ochrony-roslin'
};
export const protectionProducts:[string,'kg'|'l'][]=[
 ['Miedzian 50 WP','kg'],['Miedzian Extra 350 SC','l'],
 ['Signum 33 WG','kg'],['Switch 62,5 WG','kg'],
 ['Luna Experience 400 SC','l'],['Score 250 EC','l'],
 ['Syllit 544 SC','l'],['Efuzin 544 SC','l'],
 ['Serenade ASO','l'],['Rhapsody','l'],
 ['Mospilan 20 SP','kg'],['Mospilan Classic','kg'],
 ['Decis Mega 50 EW','l'],['Matrix 2,5 EC','l'],
 ['Sercadis','l'],['Neerion','l'],
 ['Revyona','l'],['Scala','l']
].sort((a,b)=>a[0].localeCompare(b[0],'pl')) as [string,'kg'|'l'][];

// Pre-harvest intervals (okres karencji, days) from current MRiRW labels or decisions, cross-checked with the
// Instytut Ogrodnictwa 2026 protection programmes. Checked 2026-11-02; labels change, so stock entries keep an editable copy.
export const preHarvestCheckedAt='2026-11-02';
const label=(id:string)=>'https://www.gov.pl/attachment/'+id;
export const preHarvestCatalog:Record<string,{sour:number,sweet:number,note?:string,source:string}>={
 'Miedzian 50 WP':{sour:14,sweet:14,source:label('d82940b2-1c3f-4405-8ac1-5acdaf797189')},
 'Miedzian Extra 350 SC':{sour:14,sweet:14,source:label('006ae3a3-5f82-49f5-8ba9-a1db917aa28b')},
 'Signum 33 WG':{sour:7,sweet:7,source:label('61343845-c7c0-42d6-a006-d14b6b3e661d')},
 'Switch 62,5 WG':{sour:7,sweet:7,source:label('569b20dc-56c8-4f3d-882e-2842d6e4d75f')},
 'Luna Experience 400 SC':{sour:7,sweet:7,source:label('3f990382-109e-4d8a-9efe-7c85d9b5f59b')},
 'Score 250 EC':{sour:14,sweet:14,source:label('4aacf27b-6795-41cf-81bb-7e310234c7bb')},
 'Syllit 544 SC':{sour:14,sweet:14,source:label('58c1c00b-9e83-4eae-8db6-c4a5c30f07cf')},
 'Efuzin 544 SC':{sour:14,sweet:14,source:label('0897b459-ed10-4a35-be5d-c3aa8bc1c319')},
 'Serenade ASO':{sour:0,sweet:0,note:'Nie stosować w dniu zbioru.',source:label('809ee565-cdd4-4b59-9b54-137e875a8df2')},
 'Rhapsody':{sour:0,sweet:0,note:'Nie stosować w dniu zbioru.',source:label('79a62c18-ce55-48dd-b893-5cc0c3a375fe')},
 'Mospilan 20 SP':{sour:14,sweet:14,note:'7 dni przy zwalczaniu zwójek i gąsienic (zastosowanie małoobszarowe).',source:label('ba42088b-a67c-4bcc-865e-e3dd9c78f80a')},
 'Mospilan Classic':{sour:14,sweet:14,note:'7 dni przy zwalczaniu zwójek (zastosowanie małoobszarowe).',source:label('64ef50ab-5880-4c72-8509-3ee01ae9eb64')},
 'Decis Mega 50 EW':{sour:7,sweet:7,source:label('d5f428a9-fcb2-4ed5-b3cb-3ff122443747')},
 'Matrix 2,5 EC':{sour:45,sweet:45,source:label('e5b04ede-90c2-4a12-aa81-14cc52eb764f')},
 'Sercadis':{sour:3,sweet:3,source:label('9bd3c164-8c19-4751-b053-2fa917b9d07a')},
 'Neerion':{sour:3,sweet:3,source:label('f39f5db7-73cd-41aa-80c5-7d7afff8944e')},
 'Revyona':{sour:3,sweet:3,source:label('dc7e31fb-b4b9-4680-a5d0-c118ebc69441')},
 'Scala':{sour:3,sweet:3,source:label('43bd7119-1f2b-43a2-9b0b-caa386a5bfef')},
};
export const catalogPreHarvest=(name:string)=>preHarvestCatalog[Object.keys(preHarvestCatalog).find(k=>k.toLocaleLowerCase('pl')===name.trim().toLocaleLowerCase('pl'))??'']??null;
