const start = async ({
  bondType = 9,
  collateral = 0,
  secType = ["stock_ofz_bond", "stock_subfederal_bond", "stock_municipal_bond"],
} = {}) => {
  const params = {
    lang: "ru",
    "iss.meta": false,
    sort_order: "asc",
    sort_column: "SECID",
    start: 0,
    limit: 100,
    amortization: 0,
    coupon_frequency: [1, 2, 3, 4, 12],
    listname: 1,
    sec_type: secType,
    currencyid: "rub",
    faceunit: "rub",
    bond_type: bondType, // 9 Фикс с известным купоном, 3 флоатеры
    collateral, // 3 Полное (100%) обеспечение
  };

  const queryString = new URLSearchParams(params).toString();

  const data = await fetch(
    `https://iss.moex.com/iss/apps/infogrid/emission/rates.json?${queryString}`,
  );
  const dataJson = await data.json();

  const getValueFromBond = (fieldName, bond) => {
    const index = dataJson.rates.columns.indexOf(fieldName);
    return index !== -1 ? bond[index] : null;
  };

  const formattedBonds = [];

  for (const bond of dataJson.rates.data) {
    try {
      // Получаем данные
      const SECID = getValueFromBond("SECID", bond);

      // if (SECID !== "SU26231RMFS9") continue;

      const bondName = getValueFromBond("NAME", bond);
      const nominal = getValueFromBond("FACEVALUE", bond);
      const days = getValueFromBond("DAYSTOREDEMPTION", bond);
      const couponPeriod = getValueFromBond("COUPONFREQUENCY", bond);
      const primaryBoardId = getValueFromBond("PRIMARY_BOARDID", bond);
      const bondType = getValueFromBond("BOND_TYPE", bond);
      const matDate = getValueFromBond("MATDATE", bond);

      const coupons = await getCoupons(SECID);
      const { nkd, price } = await getNKDAndPrice(primaryBoardId, SECID);

      if (
        !bondName ||
        !nominal ||
        !days ||
        !couponPeriod ||
        !primaryBoardId ||
        !bondType ||
        !matDate ||
        !nkd ||
        !price
      ) {
        console.error("нехватает данных", SECID);
        continue;
      }

      formattedBonds.push({
        SECID,
        bondName,
        nominal,
        days,
        couponPeriod,
        coupons,
        nkd,
        bondType,
        price,
        maturityDate: matDate,
      });
      // console.log("✅ Данные облигации получены:");
      // console.log("🏷️ Название облигации:", bondName);
      // console.log("💰 Номинал:", nominal + " ₽");
      // console.log("📅 Погашение:", days, "дней");
      // console.log("📆 Период купона:", couponPeriod + " раза");
      // console.log("📊 Цена предыдущего закрытия:", priceRub + " ₽");
      // console.log("📊 Цена предыдущего закрытия:", pricePer + " %");
      // console.log("🎫 Оставшихся купонных выплат в ₽:", coupons);
      // console.log("🧮 НКД:", nkd + " ₽");
    } catch (error) {
      console.log("❌ Ошибка:", error);
    }
  }

  return formattedBonds;
};

async function getCoupons(secid) {
  try {
    const couponsUrl = `https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization/${secid}.json?limit=100`;
    const response = await fetch(couponsUrl);
    const data = await response.json();

    const coupons = data.coupons.data;
    const couponColumns = data.coupons.columns;

    const couponDateIndex = couponColumns.indexOf("coupondate");
    const valueRubIndex = couponColumns.indexOf("value_rub");

    if (couponDateIndex === -1 || couponDateIndex === -1) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureCoupons = coupons
      .filter((coupon) => {
        const couponDate = new Date(coupon[couponDateIndex]);
        couponDate.setHours(0, 0, 0, 0);
        return couponDate >= today;
      })
      .map((coupon) => coupon[valueRubIndex]);

    return futureCoupons;
  } catch (error) {
    console.error(error);
  }
}

async function getNKDAndPrice(boardId, secid) {
  try {
    const couponsUrl = `https://iss.moex.com/iss/engines/stock/markets/bonds/boards/${boardId}/securities/${secid}.json`;
    const response = await fetch(couponsUrl);
    const data = await response.json();

    const securities = data.securities.data;
    const securitiesColumns = data.securities.columns;

    const accruedIntIndex = securitiesColumns.indexOf("ACCRUEDINT");
    const prevPriceIndex = securitiesColumns.indexOf("PREVPRICE");

    return {
      nkd: securities[0][accruedIntIndex],
      price: securities[0][prevPriceIndex],
    };
  } catch (error) {
    console.error(error);
  }
}

function convertDaysSimple(totalDays) {
  const daysInYear = 365;
  const daysInMonth = 30;

  const years = Math.floor(totalDays / daysInYear);
  const daysAfterYears = totalDays % daysInYear;

  const months = Math.floor(daysAfterYears / daysInMonth);
  const days = daysAfterYears % daysInMonth;

  return `${years} лет, ${months} месяцев, ${days} дней`;
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

const startFixBond = async () => {
  const bonds = await start();

  console.table(
    bonds
      .map((item) => {
        return {
          ...item,
          ...calculate1({
            SECID: item.SECID,
            nominal: item.nominal,
            coupons: item.coupons,
            price: Number(
              ((item.price / 100) * (item.nominal || 1000)).toFixed(2),
            ),
            quantity: 1,
            nkd: item.nkd,
            brokerCommission: 0.5,
            taxRate: 13,
            purchaseDate: getTodayDate(),
            maturityDate: item.maturityDate,
          }),
        };
      })
      .toSorted((a, b) => a.days - b.days)
      .map((item) => ({
        secId: item.SECID,
        "% день": Number(item.dailyProfitPercent.toFixed(2)),
        "% годовых": Number(item.annualProfitPercent.toFixed(2)),
        "% за период": Number(item.calculationOfNetProfitPercent.toFixed(2)),
        "осталось дней": item.days,
        "осталось купонов": item.coupons.length,
        "Период купона": item.couponPeriod,
        осталось: convertDaysSimple(item.days),
        "Вид облигации": item.bondType,
        "цена %": item.price,
        Название: item.bondName,
      })),
  );
};

const startFloatBond = async () => {
  const bonds = await start({ bondType: 3 });

  console.table(
    bonds
      .map((item) => {
        return {
          ...item,
          // ...calculate1({
          //   SECID: item.SECID,
          //   nominal: item.nominal,
          //   coupons: item.coupons,
          //   price: Number(
          //     ((item.price / 100) * (item.nominal || 1000)).toFixed(2),
          //   ),
          //   quantity: 1,
          //   nkd: item.nkd,
          //   brokerCommission: 0.5,
          //   taxRate: 13,
          //   purchaseDate: getTodayDate(),
          //   maturityDate: item.maturityDate,
          // }),
        };
      })
      .toSorted((a, b) => a.days - b.days)
      .map((item) => ({
        secId: item.SECID,
        // "% день": Number(item.dailyProfitPercent.toFixed(2)),
        // "% годовых": Number(item.annualProfitPercent.toFixed(2)),
        // "% за период": Number(item.calculationOfNetProfitPercent.toFixed(2)),
        "осталось дней": item.days,
        купоны: item.coupons.length,
        "Период купона": item.couponPeriod,
        осталось: convertDaysSimple(item.days),
        "Вид облигации": item.bondType,
        "цена %": item.price,
        Название: item.bondName,
      })),
  );
};

const startWidthMoneyBond = async () => {
  const bonds = await start({ bondType: 3, collateral: 3, secType: [] });

  console.table(
    bonds
      .map((item) => {
        return {
          ...item,
          ...calculate1({
            SECID: item.SECID,
            nominal: item.nominal,
            coupons: item.coupons,
            price: Number(
              ((item.price / 100) * (item.nominal || 1000)).toFixed(2),
            ),
            quantity: 1,
            nkd: item.nkd,
            brokerCommission: 0.5,
            taxRate: 13,
            purchaseDate: getTodayDate(),
            maturityDate: item.maturityDate,
          }),
        };
      })
      .toSorted((a, b) => a.days - b.days)
      .map((item) => ({
        secId: item.SECID,
        номинал: item.nominal,
        "% день": Number(item.dailyProfitPercent.toFixed(2)),
        "% годовых": Number(item.annualProfitPercent.toFixed(2)),
        "% за период": Number(item.calculationOfNetProfitPercent.toFixed(2)),
        "осталось дней": item.days,
        купоны: item.coupons,
        "Период купона": item.couponPeriod,
        осталось: convertDaysSimple(item.days),
        "Вид облигации": item.bondType,
        "цена %": item.price,
        Название: item.bondName,
      })),
  );
};

startFixBond();
startFloatBond();
// startWidthMoneyBond();
