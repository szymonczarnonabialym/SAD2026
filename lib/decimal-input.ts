/** Accept Polish and dot decimal separators without interpreting thousands separators. */
export function parseDecimalInput(value:string){
 const text=value.trim();
 return /^[0-9]+(?:[.,][0-9]+)?$/.test(text)?Number(text.replace(',','.')):NaN;
}
export function isWholeKilogramInput(value:string){return /^[0-9]+$/.test(value)&&Number(value)>0&&Number(value)<=100000000}
