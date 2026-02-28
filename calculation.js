// Основная функция расчета доходности
function calculate({
  nominal,
  coupon,
  couponCount,
  price,
  quantity,
  nkd,
  brokerCommission,
  taxRate,
  purchaseDate,
  maturityDate,
}) {
  if (
    nominal === undefined ||
    coupon=== undefined  ||
    couponCount=== undefined  ||
    price=== undefined  ||
    quantity=== undefined  ||
    nkd=== undefined  ||
    brokerCommission=== undefined  ||
    taxRate=== undefined  ||
    purchaseDate=== undefined  ||
    maturityDate === undefined
  ) {
    console.table({
      nominal,
      coupon,
      couponCount,
      price,
      quantity,
      nkd,
      brokerCommission,
      taxRate,
      purchaseDate,
      maturityDate,
    });
    return;
  }

  // Расчет суммы всех купонов
  const couponTotal = coupon * couponCount;

  // Расчет комиссии брокера от суммы сделки
  const commissionAmount = (price + nkd) * (brokerCommission / 100);

  // Расчет расходов при покупке
  const totalExpenses = price + nkd + commissionAmount;

  // Расчет доходов при погашении
  const totalRevenue = nominal + couponTotal;

  // Расчет прибыли ДО налогов
  const profitBeforeTaxes = totalRevenue - totalExpenses;

  // Налог на купонный доход
  const couponIncomeTax = couponTotal * (taxRate / 100);

  // Налог на разницу цены (если бы была прибыль):
  const priceDifference = nominal - price;
  const priceDifferenceTax =
    priceDifference > 0 ? priceDifference * (taxRate / 100) : 0;

  // Расчет ЧИСТОЙ прибыли в рублях на одну облигацию
  const calculationNetProfitRub =
    profitBeforeTaxes - couponIncomeTax - priceDifferenceTax;

  // Расчет ЧИСТОЙ прибыли в рублях
  const totalCalculationNetProfitRub = calculationNetProfitRub * quantity;
  // console.log(totalCalculationNetProfitRub, "rub");

  // Расчет ЧИСТОЙ прибыли в процентах
  const calculationOfNetProfitPercent =
    ((calculationNetProfitRub * quantity) / (totalExpenses * quantity)) * 100;
  // console.log(calculationOfNetProfitPercent, "%");

  // Расчет годовой процентной прибыли
  const purchase = new Date(purchaseDate);
  const maturity = new Date(maturityDate);
  const daysBetween = (maturity - purchase) / (1000 * 60 * 60 * 24); // разница в днях
  const yearsBetween = daysBetween / 365; // период в годах

  const annualProfitPercent = calculationOfNetProfitPercent / yearsBetween;
  // console.log(annualProfitPercent, "% годовых");

  // Расчет дневной процентной прибыли
  const dailyProfitPercent = calculationOfNetProfitPercent / daysBetween;

  return {
    totalCalculationNetProfitRub,
    calculationOfNetProfitPercent,
    annualProfitPercent,
    dailyProfitPercent, // Добавлено: доходность за один день в процентах
    daysBetween,
  };
}
