function calculateDaysBetweenDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const difference = end.getTime() - start.getTime();
  return Math.ceil(difference / (1000 * 3600 * 24));
}

function calculateCouponsCount(
  purchaseDate,
  maturityDate,
  nextCouponDate,
  paymentFrequency
) {
  const purchase = new Date(purchaseDate);
  const maturity = new Date(maturityDate);
  const nextCoupon = new Date(nextCouponDate);

  // Проверяем, что даты корректны
  if (purchase >= maturity) return 0;
  if (nextCoupon <= purchase) return 0;

  let couponsCount = 0;
  let currentCouponDate = new Date(nextCoupon);

  // Считаем купоны от ближайшей даты до погашения
  while (currentCouponDate <= maturity) {
    couponsCount++;
    currentCouponDate = new Date(currentCouponDate);
    currentCouponDate.setDate(
      currentCouponDate.getDate() + parseInt(paymentFrequency)
    );
  }

  return couponsCount;
}

function updatePricePercentage() {
  const nominal = parseFloat(document.getElementById("nominal").value);
  const price = parseFloat(document.getElementById("price").value);

  if (nominal > 0 && price > 0) {
    const percentage = (price / nominal) * 100;
    document.getElementById(
      "pricePercentage"
    ).textContent = `💰 Цена: ${percentage.toFixed(2)}% от номинала`;
    document.getElementById("pricePercentage").style.display = "block";
  } else {
    document.getElementById("pricePercentage").style.display = "none";
  }
}

function updateCalculations() {
  const purchaseDate = document.getElementById("purchaseDate").value;
  const maturityDate = document.getElementById("maturityDate").value;
  const nextCouponDate = document.getElementById("nextCouponDate").value;
  const paymentFrequency = document.getElementById("paymentFrequency").value;

  updatePricePercentage();

  if (purchaseDate && maturityDate && nextCouponDate && paymentFrequency) {
    // Рассчитываем дни до погашения
    const days = calculateDaysBetweenDates(purchaseDate, maturityDate);
    document.getElementById("daysCount").textContent = days;
    document.getElementById("daysDisplay").style.display = "block";

    // Рассчитываем количество купонов
    const couponsCount = calculateCouponsCount(
      purchaseDate,
      maturityDate,
      nextCouponDate,
      paymentFrequency
    );
    document.getElementById("couponsCount").textContent = couponsCount;
    document.getElementById("couponsDisplay").style.display = "block";

    // Цветовая индикация
    const daysDisplay = document.getElementById("daysDisplay");
    const couponsDisplay = document.getElementById("couponsDisplay");

    if (days < 0) {
      daysDisplay.style.background = "#fdeaea";
      daysDisplay.style.borderColor = "#e74c3c";
      daysDisplay.style.color = "#c0392b";
    } else {
      daysDisplay.style.background = "#e8f6f3";
      daysDisplay.style.borderColor = "#27ae60";
      daysDisplay.style.color = "#27ae60";
    }

    if (couponsCount <= 0) {
      couponsDisplay.style.background = "#fdeaea";
      couponsDisplay.style.borderColor = "#e74c3c";
      couponsDisplay.style.color = "#c0392b";
    } else {
      couponsDisplay.style.background = "#e8f4fd";
      couponsDisplay.style.borderColor = "#3498db";
      couponsDisplay.style.color = "#2c3e50";
    }
  }
}

function calculateYTM() {
  // Получаем значения из формы
  const nominal = parseFloat(document.getElementById("nominal").value);
  const price = parseFloat(document.getElementById("price").value);
  const coupon = parseFloat(document.getElementById("coupon").value);
  const purchaseDate = document.getElementById("purchaseDate").value;
  const maturityDate = document.getElementById("maturityDate").value;
  const nextCouponDate = document.getElementById("nextCouponDate").value;
  const paymentFrequency = parseInt(
    document.getElementById("paymentFrequency").value
  );
  const quantity = parseInt(document.getElementById("quantity").value);
  const nkd = parseFloat(document.getElementById("nkd").value);
  const commission = parseFloat(document.getElementById("commission").value);
  const taxRate = parseFloat(document.getElementById("taxRate").value);

  // Рассчитываем проценты от номинала
  const pricePercentage = (price / nominal) * 100;

  // Рассчитываем дни до погашения и количество купонов
  const days = calculateDaysBetweenDates(purchaseDate, maturityDate);
  const couponsCount = calculateCouponsCount(
    purchaseDate,
    maturityDate,
    nextCouponDate,
    paymentFrequency
  );

  if (days <= 0) {
    alert("Ошибка: Дата погашения должна быть позже даты покупки");
    return;
  }

  if (couponsCount <= 0) {
    alert("Ошибка: Не удалось рассчитать количество купонов. Проверьте даты.");
    return;
  }

  // Выполняем расчёт
  const result = calculatePeriodYieldWithTax(
    nominal,
    pricePercentage,
    coupon,
    couponsCount,
    days,
    quantity,
    nkd,
    commission,
    taxRate
  );

  // Показываем результаты
  document.getElementById("results").style.display = "block";

  // Обновляем значения
  document.getElementById("periodYield").textContent =
    result.periodYield.toFixed(2) + "%";
  document.getElementById("annualYield").textContent =
    result.annualYield.toFixed(2) + "%";
  document.getElementById("daysResult").textContent = days + " дней";
  document.getElementById("couponsResult").textContent = couponsCount;
  document.getElementById(
    "priceResult"
  ).textContent = `${price} руб (${pricePercentage.toFixed(2)}%)`;
  document.getElementById("netProfit").textContent =
    result.periodProfit.toFixed(2) + " руб";
  document.getElementById("totalInvestment").textContent =
    result.investment.total.toFixed(2) + " руб";
  document.getElementById("totalReturn").textContent =
    (result.investment.total + result.periodProfit).toFixed(2) + " руб";
  document.getElementById("totalTax").textContent =
    result.taxes.total.toFixed(2) + " руб";
  document.getElementById("couponIncome").textContent =
    result.income.coupons.toFixed(2) + " руб";
  document.getElementById("capitalGain").textContent =
    result.income.capitalGain.toFixed(2) + " руб";
  document.getElementById("couponTax").textContent =
    result.taxes.couponTax.toFixed(2) + " руб";
  document.getElementById("capitalGainTax").textContent =
    result.taxes.capitalGainTax.toFixed(2) + " руб";

  // Прокручиваем к результатам
  document.getElementById("results").scrollIntoView({ behavior: "smooth" });
}

function calculatePeriodYieldWithTax(
  nominal,
  currentPricePercent,
  couponValue,
  couponsCount,
  daysToMaturity,
  quantity = 1,
  nkdTotal = 0,
  commission = 0,
  taxRate = 0.13
) {
  // --- 1. РАСЧЕТ СУММЫ ИНВЕСТИЦИЙ (что мы платим сейчас) ---
  const pricePerBond = (currentPricePercent / 100) * nominal;
  const priceAbsolute = pricePerBond * quantity;
  // При покупке мы платим: Цена + НКД + Комиссия
  const totalInvestment = priceAbsolute + nkdTotal + commission;

  // --- 2. РАСЧЕТ ДОХОДОВ (что мы получаем за весь период) ---
  // Доход от всех купонов (исключая тот, который уже в НКД)
  const totalCouponsIncome = couponValue * couponsCount * quantity;

  // Доход от погашения (номинал - цена покупки)
  const capitalGainIncome = (nominal - pricePerBond) * quantity;

  // --- 3. РАСЧЕТ РАСХОДОВ (налоги) ---
  // Налог на купоны: со ВСЕХ полученных купонов
  const couponTax = totalCouponsIncome * taxRate;

  // Налог на прибыль при погашении: (Номинал - Цена Покупки - Комиссия)
  // Комиссия УМЕНЬШАЕТ налоговую базу, так как это наш расход.
  const capitalGainTaxableBase = Math.max(0, capitalGainIncome);
  const capitalGainTax = capitalGainTaxableBase * taxRate;

  const totalTax = couponTax + capitalGainTax;

  // --- 4. РАСЧЕТ ЧИСТОГО ДЕНЕЖНОГО ПОТОКА ---
  // Чистая прибыль = (Все доходы) - (Все расходы, включая налоги) - (Начальные инвестиции)

  // Всего мы получим на руки:
  // - При погашении: Номинал * Количество
  // - Все купоны: totalCouponsIncome
  // Итого приток: (nominal * quantity) + totalCouponsIncome
  const totalCashInflow = nominal * quantity + totalCouponsIncome;

  // Всего мы заплатим:
  // - При покупке: totalInvestment (цена + нкд + комиссия)
  // - Налоги: totalTax
  const totalCashOutflow = totalInvestment + totalTax;

  // Чистая прибыль за период
  const netProfit = totalCashInflow - totalCashOutflow;

  // --- 5. РАСЧЕТ ДОХОДНОСТИ ---
  // Доходность за период = (Чистая прибыль / Начальные инвестиции) * 100%
  const periodYield = (netProfit / totalInvestment) * 100;

  // Приведение к годовой доходности (простая капитализация)
  const annualYield = periodYield * (365 / daysToMaturity);

  return {
    periodYield: periodYield,
    periodProfit: netProfit, // Это ключевое исправление - используем netProfit из денежного потока
    annualYield: annualYield,
    investment: {
      total: totalInvestment,
      priceAbsolute: priceAbsolute,
      nkd: nkdTotal,
      commission: commission,
    },
    income: {
      coupons: totalCouponsIncome,
      capitalGain: capitalGainIncome,
      totalCashInflow: totalCashInflow, // Добавим для ясности
    },
    taxes: {
      total: totalTax,
      couponTax: couponTax,
      capitalGainTax: capitalGainTax,
    },
    cashFlow: {
      inflow: totalCashInflow,
      outflow: totalCashOutflow,
    },
  };
}

// Обработчики событий для автоматического обновления
document
  .getElementById("nominal")
  .addEventListener("input", updatePricePercentage);
document
  .getElementById("price")
  .addEventListener("input", updatePricePercentage);
document
  .getElementById("purchaseDate")
  .addEventListener("change", updateCalculations);
document
  .getElementById("maturityDate")
  .addEventListener("change", updateCalculations);
document
  .getElementById("nextCouponDate")
  .addEventListener("change", updateCalculations);
document
  .getElementById("paymentFrequency")
  .addEventListener("change", updateCalculations);

// Автоматический расчёт при загрузке
window.onload = function () {
  // Устанавливаем сегодняшнюю дату как дату покупки по умолчанию
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("purchaseDate").value = today;

  updateCalculations();
  setTimeout(calculateYTM, 500);
};
