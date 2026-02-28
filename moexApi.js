// Более простой способ получить данные облигации
async function searchByISIN() {
  const SECID = document
    .getElementById("isinSearch")
    .value.trim()
    .toUpperCase();

  if (!SECID) {
    showStatus("⚠️ Введите SECID код облигации", "error");
    return;
  }

  console.log("🔍 Поиск облигации:", SECID);
  showStatus("🔍 Поиск облигации...", "loading");

  fillBondForm({});

  const boards = [
    "TQOB", // Основной режим - здесь большинство рублевых облигаций
    "TQCB", // С центральным контрагентом - тоже очень популярно
    "TQRD", // Рублевые с ЦК
    "TQBE", // Еврооблигации
    "TQTD", // Т+ Облигации
    "TQOD", // Другие облигации
    "TQNL", // Небиржевые
    "TQBR", // Акционный режим (на всякий случай)
  ];
  for (const board of boards) {
    try {
      const url = `https://iss.moex.com/iss/engines/stock/markets/bonds/boards/${board}/securities/${SECID}.json`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.securities || !data.securities.data[0]) {
        showStatus("❌ Облигация не найдена", "error");
        continue;
      }

      const bondInfo = data.securities.data[0];
      const columns = data.securities.columns;

      // Функция для безопасного получения данных
      const getValue = (fieldName) => {
        const index = columns.indexOf(fieldName);
        return index !== -1 ? bondInfo[index] : null;
      };

      // Получаем данные
      const bondName = getValue("SECNAME");
      const nominal = getValue("FACEVALUE");
      const couponValue = getValue("COUPONVALUE");
      const nextCoupon = getValue("NEXTCOUPON");
      const accruedInt = getValue("ACCRUEDINT");
      const matDate = getValue("MATDATE");
      const couponPeriod = getValue("COUPONPERIOD");
      const prevPrice = getValue("PREVPRICE");

      const remainingCoupons = await getRemainingCoupons(SECID, board);

      console.log("✅ Данные облигации получены:");
      console.log("🏷️ Название облигации:", bondName);
      console.log("🎫 Оставшихся купонных выплат:", remainingCoupons);
      console.log("💰 Номинал:", nominal + " ₽");
      console.log("💵 Размер купона:", couponValue + " ₽");
      console.log("📅 Ближайшая выплата:", nextCoupon);
      console.log("🧮 НКД:", accruedInt + " ₽");
      console.log("📅 Погашение:", matDate);
      console.log("📆 Период купона:", couponPeriod + " дней");
      console.log("📊 Цена предыдущего закрытия:", prevPrice + " %");

      fillBondForm({
        bondName,
        remainingCoupons,
        nominal,
        couponValue,
        nextCoupon,
        accruedInt,
        matDate,
        couponPeriod,
        prevPrice,
      });

      showStatus("✅ Данные облигации загружены!", "success");

      break;
    } catch (error) {
      console.log("❌ Ошибка:", error);
      showStatus("❌ Ошибка при загрузке данных", "error");
    }
  }
}

// Вспомогательные функции
function showStatus(message, type) {
  const statusElement = document.getElementById("searchStatus");
  statusElement.textContent = message;
  statusElement.style.display = "block";
  statusElement.className = `search-status ${type}`;

  // Автоматически скрываем успешные сообщения через 3 секунды
  if (type === "success") {
    setTimeout(() => {
      statusElement.style.display = "none";
    }, 3000);
  }
}

function formatDate(dateString) {
  if (!dateString) return "";
  return dateString.split(" ")[0]; // На случай, если приходит с временем
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

async function getRemainingCoupons(secid) {
  try {
    const couponsUrl = `https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization/${secid}.json?limit=100`;
    const response = await fetch(couponsUrl);
    const data = await response.json();

    if (!data.coupons || !data.coupons.data) {
      console.log("❌ Не удалось получить данные о купонах");
      return null;
    }

    const coupons = data.coupons.data;
    const couponColumns = data.coupons.columns;

    // Находим индексы нужных колонок
    const couponDateIndex = couponColumns.indexOf("coupondate");

    if (couponDateIndex === -1) {
      console.log("❌ Не найдена колонка с датами купонов");
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Фильтруем будущие купоны (дата выплаты >= сегодня)
    const futureCoupons = coupons.filter((coupon) => {
      const couponDate = new Date(coupon[couponDateIndex]);
      couponDate.setHours(0, 0, 0, 0);
      return couponDate >= today;
    });

    return futureCoupons.length;
  } catch (error) {
    console.log("❌ Ошибка при получении данных о купонах:", error);
    return null;
  }
}

function fillBondForm(bondData) {
  const {
    bondName,
    nominal,
    couponValue,
    remainingCoupons,
    matDate,
    prevPrice,
    accruedInt,
  } = bondData;

  // Заполняем название облигации
  if (bondName) {
    document.getElementById("bondName").textContent = bondName;
  } else {
    document.getElementById("bondName").textContent = "";
  }

  // Заполняем номинал
  if (nominal) {
    document.getElementById("nominal").value = nominal;
  } else {
    document.getElementById("nominal").value = "";
  }

  // Заполняем купон
  if (couponValue) {
    document.getElementById("coupon").value = couponValue;
  } else {
    document.getElementById("coupon").value = "";
  }

  // Заполняем количество оставшихся купонов
  if (remainingCoupons) {
    document.getElementById("couponCount").value = remainingCoupons;
  } else {
    document.getElementById("couponCount").value = "";
  }

  // Заполняем дату погашения
  if (matDate) {
    document.getElementById("maturityDate").value = formatDate(matDate);
  } else {
    document.getElementById("maturityDate").value = "";
  }

  // Устанавливаем текущую дату как дату покупки
  document.getElementById("purchaseDate").value = getTodayDate();

  // Заполняем цену (преобразуем проценты в абсолютное значение)
  if (prevPrice !== undefined && prevPrice !== null) {
    const priceInRubles = (prevPrice / 100) * (nominal || 1000);
    document.getElementById("price").value = priceInRubles.toFixed(2);
  } else {
    document.getElementById("price").value = "";
  }

  // Заполняем НКД
  if (accruedInt >= 0) {
    document.getElementById("nkd").value = accruedInt;
  } else {
    document.getElementById("nkd").value = "";
  }
}
