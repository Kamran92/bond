// Основная функция расчета доходности
function calculate() {
  const nominal = Number(document.getElementById("nominal").value);
  const coupon = Number(document.getElementById("coupon").value);
  const couponCount = Number(document.getElementById("couponCount").value);
  const price = Number(document.getElementById("price").value);
  const quantity = Number(document.getElementById("quantity").value);
  const nkd = Number(document.getElementById("nkd").value);
  const brokerCommission = Number(document.getElementById("commission").value);
  const taxRate = Number(document.getElementById("taxRate").value);
  const purchaseDate = document.getElementById("purchaseDate").value;
  const maturityDate = document.getElementById("maturityDate").value;

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
  console.log(totalCalculationNetProfitRub, "rub");

  // Расчет ЧИСТОЙ прибыли в процентах
  const calculationOfNetProfitPercent =
    ((calculationNetProfitRub * quantity) / (totalExpenses * quantity)) * 100;
  console.log(calculationOfNetProfitPercent, "%");

  // Расчет годовой процентной прибыли
  const purchase = new Date(purchaseDate);
  const maturity = new Date(maturityDate);
  const daysBetween = (maturity - purchase) / (1000 * 60 * 60 * 24); // разница в днях
  const yearsBetween = daysBetween / 365; // период в годах

  const annualProfitPercent = calculationOfNetProfitPercent / yearsBetween;
  console.log(annualProfitPercent, "% годовых");

  displayResults({
    totalCalculationNetProfitRub,
    calculationOfNetProfitPercent,
    annualProfitPercent,
    daysBetween,
  });
}

// Функция отображения результатов
function displayResults(results) {
  // Основные показатели доходности
  document.getElementById("periodYield").textContent =
    results.calculationOfNetProfitPercent.toFixed(2) + "%";
  document.getElementById("annualYield").textContent =
    results.annualProfitPercent.toFixed(2) + "%";

  // Детальная информация
  document.getElementById("netProfit").textContent =
    results.totalCalculationNetProfitRub.toFixed(2) + " руб";
  document.getElementById("days").textContent = results.daysBetween;

  // Показываем блок с результатами
  document.getElementById("results").style.display = "block";
}
