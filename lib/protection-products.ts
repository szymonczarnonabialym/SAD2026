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
