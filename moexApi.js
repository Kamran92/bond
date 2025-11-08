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
      // Прямой запрос к endpointу с основной информацией
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

      // Заполняем форму данными
      if (bondName) document.getElementById("bondName").textContent = bondName;
      if (nominal) document.getElementById("nominal").value = nominal;
      if (couponValue) document.getElementById("coupon").value = couponValue;
      // if (couponPeriod)
      //   document.getElementById("paymentFrequency").value = couponPeriod;
      // if (nextCoupon)
      //   document.getElementById("nextCouponDate").value =
      //     formatDate(nextCoupon);
      if (remainingCoupons)
        document.getElementById("couponCount").value = remainingCoupons;

      if (matDate)
        document.getElementById("maturityDate").value = formatDate(matDate);

      // Устанавливаем текущую дату как дату покупки
      document.getElementById("purchaseDate").value = getTodayDate();

      // Заполняем цену (преобразуем проценты в абсолютное значение)
      if (prevPrice) {
        const priceInRubles = (prevPrice / 100) * (nominal || 1000);
        document.getElementById("price").value = priceInRubles.toFixed(2);
        // updatePricePercentage();
      }

      if (accruedInt >= 0) {
        document.getElementById("nkd").value = accruedInt;
      }

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
  // Преобразуем из формата YYYY-MM-DD в тот же формат для input type="date"
  return dateString.split(" ")[0]; // На случай, если приходит с временем
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// function updatePricePercentage() {
//   const price = parseFloat(document.getElementById("price").value) || 0;
//   const nominal = parseFloat(document.getElementById("nominal").value) || 1000;
//   const percentage = (price / nominal) * 100;
//   document.getElementById(
//     "pricePercentage"
//   ).textContent = `💰 Цена: ${percentage.toFixed(1)}% от номинала`;
// }

async function getRemainingCoupons(secid) {
  try {
    // Запрос к API для получения календаря купонов
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

    // console.log(
    //   `📅 Всего купонов: ${coupons.length}, будущих: ${futureCoupons.length}`
    // );

    // Выводим информацию о ближайших купонах для отладки
    // futureCoupons.slice(0, 5).forEach((coupon, index) => {
    //   console.log(`📅 Купон ${index + 1}: ${coupon[couponDateIndex]}`);
    // });

    return futureCoupons.length;
  } catch (error) {
    console.log("❌ Ошибка при получении данных о купонах:", error);
    return null;
  }
}
