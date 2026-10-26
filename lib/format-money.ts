const moneyFormat=new Intl.NumberFormat('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2});
// Round only the presentation. Inventory costs keep the original unit-price precision.
export const formatMoney=(value:number)=>moneyFormat.format(value);
