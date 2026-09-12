/*
    التقارير
    ========

    - إنشاء تقرير شهري أو سنوي للمبيعات
    - عرض ملخص وأداء المنتجات وتفاصيل العمليات
    - تصدير التقرير كملف PDF
*/


const ARABIC_MONTHS = [

    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر"

];


let currentReportContext =
    null;


/*
    بناء عنوان الفترة (شهر/سنة/أشهر
    محددة) لاستخدامه في المعاينة
    والطباعة والتصدير
*/

function buildPeriodTitle(
    type,
    year,
    month,
    selectedMonths
) {

    if (type === "month") {

        return `تقرير شهر ${ARABIC_MONTHS[month - 1]} ${year}`;

    }


    if (type === "custom") {

        const monthNames =
            (selectedMonths || [])
                .slice()
                .sort(
                    (a, b) => a - b
                )
                .map(
                    m => ARABIC_MONTHS[m - 1]
                )
                .join(
                    "، "
                );


        return `تقرير أشهر مختارة: ${monthNames} ${year}`;

    }


    return `تقرير سنة ${year}`;

}


/*
    تهيئة أحداث التقارير
*/

function initializeReportsEvents() {

    const form =
        document.getElementById(
            "reportFilterForm"
        );


    if (!form) {
        return;
    }


    populateReportMonthOptions();

    populateReportYearOptions();

    populateReportCustomMonthsGrid();


    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            generateReport();

        }
    );


    document
        .querySelectorAll(
            'input[name="reportType"]'
        )
        .forEach(
            function (radio) {

                radio.addEventListener(
                    "change",
                    reportTypeChanged
                );

            }
        );


    const downloadButton =
        document.getElementById(
            "downloadReportButton"
        );


    if (downloadButton) {

        downloadButton.addEventListener(
            "click",
            downloadReportPdf
        );

    }


    const excelButton =
        document.getElementById(
            "excelExportButton"
        );


    if (
        excelButton &&
        typeof exportReportToExcel ===
        "function"
    ) {

        excelButton.addEventListener(
            "click",
            exportReportToExcel
        );

    }


    const shareImageButton =
        document.getElementById(
            "shareImageButton"
        );


    if (shareImageButton) {

        shareImageButton.addEventListener(
            "click",
            exportReportAsImage
        );

    }


    reportTypeChanged();

}


/*
    تعبئة قائمة الأشهر
*/

function populateReportMonthOptions() {

    const select =
        document.getElementById(
            "reportMonth"
        );


    if (!select) {
        return;
    }


    select.innerHTML = "";


    ARABIC_MONTHS.forEach(
        function (name, index) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(index + 1);


            option.textContent =
                name;


            select.appendChild(
                option
            );

        }
    );


    const currentMonth =
        new Date().getMonth() + 1;


    select.value =
        String(currentMonth);

}


/*
    تعبئة قائمة السنوات بناءً على
    سنوات عمليات البيع الموجودة فعليًا
*/

async function populateReportYearOptions() {

    const select =
        document.getElementById(
            "reportYear"
        );


    if (!select) {
        return;
    }


    let years =
        new Set();


    try {

        const sales =
            await dbGetAll(
                STORES.SALES
            );


        sales.forEach(
            function (sale) {

                const year =
                    Number(
                        String(
                            sale.saleDate
                        ).split("-")[0]
                    );


                if (
                    Number.isFinite(year) &&
                    year > 0
                ) {

                    years.add(year);

                }

            }
        );


    } catch (error) {

        console.error(error);

    }


    const currentYear =
        new Date().getFullYear();


    years.add(currentYear);


    const sortedYears =
        Array.from(years).sort(
            function (a, b) {

                return b - a;

            }
        );


    const previousValue =
        select.value;


    select.innerHTML = "";


    sortedYears.forEach(
        function (year) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(year);


            option.textContent =
                String(year);


            select.appendChild(
                option
            );

        }
    );


    if (
        previousValue &&
        sortedYears.some(
            year =>
                String(year) ===
                previousValue
        )
    ) {

        select.value =
            previousValue;

    } else {

        select.value =
            String(currentYear);

    }

}


/*
    تغيير نوع التقرير
    (شهري / سنوي)
*/

function reportTypeChanged() {

    const type =
        document.querySelector(
            'input[name="reportType"]:checked'
        )?.value || "month";


    const monthGroup =
        document.getElementById(
            "reportMonthGroup"
        );


    if (monthGroup) {

        monthGroup.style.display =
            type === "month"
                ? "block"
                : "none";

    }


    const customMonthsGroup =
        document.getElementById(
            "reportCustomMonthsGroup"
        );


    if (customMonthsGroup) {

        customMonthsGroup.style.display =
            type === "custom"
                ? "block"
                : "none";

    }

}


/*
    تعبئة شبكة اختيار الأشهر المتعددة
*/

function populateReportCustomMonthsGrid() {

    const grid =
        document.getElementById(
            "reportCustomMonthsGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML =
        ARABIC_MONTHS
            .map(
                function (name, index) {

                    const monthNumber =
                        index + 1;


                    return `

                        <label class="month-checkbox-option">

                            <input
                                type="checkbox"
                                value="${monthNumber}"
                            >

                            <span>${name}</span>

                        </label>

                    `;

                }
            )
            .join(
                ""
            );


    grid
        .querySelectorAll(
            'input[type="checkbox"]'
        )
        .forEach(
            function (checkbox) {

                checkbox.addEventListener(
                    "change",
                    function () {

                        const label =
                            checkbox.closest(
                                ".month-checkbox-option"
                            );


                        if (label) {

                            label.classList.toggle(
                                "checked",
                                checkbox.checked
                            );

                        }

                    }
                );

            }
        );

}


/*
    إنشاء التقرير
*/

async function generateReport() {

    try {

        const type =
            document.querySelector(
                'input[name="reportType"]:checked'
            )?.value || "month";


        const year =
            Number(
                document.getElementById(
                    "reportYear"
                ).value
            );


        const month =
            type === "month"
                ? Number(
                    document.getElementById(
                        "reportMonth"
                    ).value
                )
                : null;


        const selectedMonths =
            type === "custom"
                ? Array.from(
                    document.querySelectorAll(
                        '#reportCustomMonthsGrid input[type="checkbox"]:checked'
                    )
                ).map(
                    input => Number(input.value)
                )
                : [];


        if (
            !Number.isFinite(year)
        ) {

            showToast(
                "اختر سنة صحيحة."
            );

            return;

        }


        if (
            type === "custom" &&
            selectedMonths.length === 0
        ) {

            showToast(
                "اختر شهرًا واحدًا على الأقل."
            );

            return;

        }


        const sales =
            await dbGetAll(
                STORES.SALES
            );


        const itemsBySale =
            await loadSaleItemsGroupedBySale();


        const filteredSales =
            sales.filter(
                function (sale) {

                    const parts =
                        String(
                            sale.saleDate
                        ).split("-");


                    const saleYear =
                        Number(parts[0]);


                    const saleMonth =
                        Number(parts[1]);


                    if (
                        saleYear !== year
                    ) {

                        return false;

                    }


                    if (
                        type === "month" &&
                        saleMonth !== month
                    ) {

                        return false;

                    }


                    if (
                        type === "custom" &&
                        !selectedMonths.includes(saleMonth)
                    ) {

                        return false;

                    }


                    if (
                        Number(sale.cancelled) === 1
                    ) {

                        /*
                            الفواتير الملغاة لا تُحتسب
                            ضمن التقارير الإدارية.
                        */

                        return false;

                    }


                    return true;

                }
            );


        /*
            صف واحد لكل صنف ضمن كل فاتورة
            (فاتورة واحدة قد تحوي عدة أصناف)
        */

        const rows = [];


        filteredSales.forEach(
            function (sale) {

                const items =
                    itemsBySale.get(
                        Number(sale.id)
                    ) || [];


                items.forEach(
                    function (item) {

                        rows.push({

                            sale,

                            item

                        });

                    }
                );

            }
        );


        rows.sort(
            function (a, b) {

                if (
                    a.sale.saleDate ===
                    b.sale.saleDate
                ) {

                    return (
                        Number(a.sale.id) -
                        Number(b.sale.id)
                    );

                }


                return String(
                    a.sale.saleDate
                ).localeCompare(
                    String(
                        b.sale.saleDate
                    )
                );

            }
        );


        /*
            إجماليات الملخص تُحسب على
            مستوى الفاتورة (وليس لكل صنف)
            حتى لا يتكرر احتساب إجمالي
            الفاتورة لكل منتج بداخلها.
        */

        const summary = {

            totalSales: 0,

            totalQuantity: 0,

            count:
                filteredSales.length,

            freeCount: 0

        };


        filteredSales.forEach(
            function (sale) {

                summary.totalSales +=
                    Number(sale.total) ||
                    0;


                if (
                    sale.saleType ===
                    "free"
                ) {

                    summary.freeCount += 1;

                }

            }
        );


        const productMap =
            new Map();


        rows.forEach(
            function (entry) {

                const { item } =
                    entry;


                summary.totalQuantity +=
                    Number(item.quantity) ||
                    0;


                const key =
                    item.productName ||
                    "غير معروف";


                if (
                    !productMap.has(key)
                ) {

                    productMap.set(
                        key,
                        {

                            quantity: 0,

                            count: 0,

                            total: 0

                        }
                    );

                }


                const productSummary =
                    productMap.get(key);


                productSummary.quantity +=
                    Number(item.quantity) ||
                    0;


                productSummary.count += 1;


                productSummary.total +=
                    Number(item.total) ||
                    0;

            }
        );


        /*
            ملخص يومي وملخص طرق الدفع
            (على مستوى الفاتورة، وليس
            الصنف، حتى لا تتكرر الفاتورة
            نفسها أكثر من مرة)
        */

        const dailyMap =
            new Map();


        const paymentMethodMap =
            new Map();


        let totalDiscount = 0;


        filteredSales.forEach(
            function (sale) {

                if (
                    !dailyMap.has(
                        sale.saleDate
                    )
                ) {

                    dailyMap.set(
                        sale.saleDate,
                        {

                            count: 0,

                            quantity: 0,

                            total: 0

                        }
                    );

                }


                const dayData =
                    dailyMap.get(
                        sale.saleDate
                    );


                dayData.count += 1;


                dayData.total +=
                    Number(sale.total) ||
                    0;


                const saleItems =
                    itemsBySale.get(
                        Number(sale.id)
                    ) || [];


                saleItems.forEach(
                    function (item) {

                        dayData.quantity +=
                            Number(item.quantity) ||
                            0;


                        totalDiscount +=
                            Number(item.discount) ||
                            0;

                    }
                );


                const method =
                    sale.paymentMethod ||
                    "cash";


                if (
                    !paymentMethodMap.has(
                        method
                    )
                ) {

                    paymentMethodMap.set(
                        method,
                        {

                            count: 0,

                            total: 0

                        }
                    );

                }


                const methodData =
                    paymentMethodMap.get(
                        method
                    );


                methodData.count += 1;


                methodData.total +=
                    Number(sale.total) ||
                    0;

            }
        );


        let bestDay =
            null;


        dailyMap.forEach(
            function (data, date) {

                if (
                    !bestDay ||
                    data.total > bestDay.total
                ) {

                    bestDay = {

                        date,

                        ...data

                    };

                }

            }
        );


        let topProduct =
            null;


        productMap.forEach(
            function (data, name) {

                if (
                    !topProduct ||
                    data.total > topProduct.total
                ) {

                    topProduct = {

                        name,

                        ...data

                    };

                }

            }
        );


        const averageSaleValue =
            summary.count > 0
                ? summary.totalSales /
                  summary.count
                : 0;


        /*
            المصاريف وقيمة التالف ضمن
            نفس الفترة، لحساب صافي الربح
            (المبيعات - المصاريف - التالف)
        */

        const isDateInPeriod =
            function (dateString) {

                const parts =
                    String(dateString).split("-");


                const entryYear =
                    Number(parts[0]);


                const entryMonth =
                    Number(parts[1]);


                if (
                    entryYear !== year
                ) {

                    return false;

                }


                if (
                    type === "month" &&
                    entryMonth !== month
                ) {

                    return false;

                }


                if (
                    type === "custom" &&
                    !selectedMonths.includes(entryMonth)
                ) {

                    return false;

                }


                return true;

            };


        const allExpenses =
            await dbGetAll(
                STORES.EXPENSES
            );


        const allWaste =
            await dbGetAll(
                STORES.WASTE_LOG
            );


        const periodExpenses =
            allExpenses.filter(
                expense =>
                    isDateInPeriod(expense.date)
            );


        const totalExpenses =
            periodExpenses.reduce(
                (sum, expense) =>
                    sum +
                    (Number(expense.amount) || 0),
                0
            );


        const periodWaste =
            allWaste.filter(
                entry =>
                    isDateInPeriod(entry.date) &&
                    entry.wasteType === "spoiled"
            );


        const totalWasteValue =
            periodWaste.reduce(
                (sum, entry) =>
                    sum +
                    (Number(entry.totalValue) || 0),
                0
            );


        const wasteEntryCount =
            periodWaste.length;


        /*
            التالف مفصّل حسب المنتج
            (لا يمكن جمع الكميات بين
            منتجات مختلفة الوحدات في رقم
            واحد، لذلك نعرضها كجدول)
        */

        const wasteByProductMap =
            new Map();


        periodWaste.forEach(
            function (entry) {

                const key =
                    entry.productName ||
                    "غير معروف";


                if (
                    !wasteByProductMap.has(key)
                ) {

                    wasteByProductMap.set(
                        key,
                        {

                            quantity: 0,

                            unit:
                                entry.unit ||
                                "",

                            count: 0,

                            value: 0

                        }
                    );

                }


                const productWaste =
                    wasteByProductMap.get(key);


                productWaste.quantity +=
                    Number(entry.quantity) ||
                    0;


                productWaste.count += 1;


                productWaste.value +=
                    Number(entry.totalValue) ||
                    0;

            }
        );


        const netProfit =
            summary.totalSales -
            totalExpenses -
            totalWasteValue;


        /*
            حسابات خاصة بالتقرير السنوي:
            توزيع شهري، أفضل/أسوأ شهر،
            ومقارنة بالعام السابق.
        */

        let monthlyMap =
            null;


        let bestMonth =
            null;


        let worstMonth =
            null;


        let bestProfitMonth =
            null;


        let worstProfitMonth =
            null;


        let yearComparison =
            null;


        if (
            type === "year" ||
            type === "custom"
        ) {

            monthlyMap =
                new Map();


            const monthsToInclude =
                type === "custom"
                    ? selectedMonths
                    : Array.from(
                        { length: 12 },
                        (_, i) => i + 1
                    );


            monthsToInclude.forEach(
                function (m) {

                    monthlyMap.set(
                        m,
                        {

                            count: 0,

                            quantity: 0,

                            total: 0

                        }
                    );

                }
            );


            filteredSales.forEach(
                function (sale) {

                    const saleMonth =
                        Number(
                            String(
                                sale.saleDate
                            ).split("-")[1]
                        );


                    const data =
                        monthlyMap.get(
                            saleMonth
                        );


                    if (!data) {
                        return;
                    }


                    data.count += 1;


                    data.total +=
                        Number(sale.total) ||
                        0;


                    const saleItems =
                        itemsBySale.get(
                            Number(sale.id)
                        ) || [];


                    saleItems.forEach(
                        function (item) {

                            data.quantity +=
                                Number(item.quantity) ||
                                0;

                        }
                    );

                }
            );


            /*
                خرائط شهرية للمصاريف
                وقيمة التالف (للربط مع
                monthlyMap عند حساب أفضل/
                أسوأ شهر من حيث الربح)
            */

            const monthlyExpenseMap =
                new Map();


            const monthlyWasteMap =
                new Map();


            for (
                let m = 1;
                m <= 12;
                m++
            ) {

                monthlyExpenseMap.set(
                    m,
                    0
                );


                monthlyWasteMap.set(
                    m,
                    0
                );

            }


            allExpenses.forEach(
                function (expense) {

                    const parts =
                        String(expense.date).split("-");


                    if (
                        Number(parts[0]) !== year
                    ) {

                        return;

                    }


                    const m =
                        Number(parts[1]);


                    monthlyExpenseMap.set(
                        m,
                        (monthlyExpenseMap.get(m) || 0) +
                        (Number(expense.amount) || 0)
                    );

                }
            );


            allWaste.forEach(
                function (entry) {

                    if (
                        entry.wasteType !== "spoiled"
                    ) {

                        return;

                    }


                    const parts =
                        String(entry.date).split("-");


                    if (
                        Number(parts[0]) !== year
                    ) {

                        return;

                    }


                    const m =
                        Number(parts[1]);


                    monthlyWasteMap.set(
                        m,
                        (monthlyWasteMap.get(m) || 0) +
                        (Number(entry.totalValue) || 0)
                    );

                }
            );


            monthlyMap.forEach(
                function (data, monthNumber) {

                    if (
                        !bestMonth ||
                        data.total > bestMonth.total
                    ) {

                        bestMonth = {

                            month:
                                monthNumber,

                            ...data

                        };

                    }


                    if (
                        !worstMonth ||
                        data.total < worstMonth.total
                    ) {

                        worstMonth = {

                            month:
                                monthNumber,

                            ...data

                        };

                    }


                    const monthProfit =
                        data.total -
                        (monthlyExpenseMap.get(monthNumber) || 0) -
                        (monthlyWasteMap.get(monthNumber) || 0);


                    if (
                        !bestProfitMonth ||
                        monthProfit > bestProfitMonth.profit
                    ) {

                        bestProfitMonth = {

                            month:
                                monthNumber,

                            profit:
                                monthProfit

                        };

                    }


                    if (
                        !worstProfitMonth ||
                        monthProfit < worstProfitMonth.profit
                    ) {

                        worstProfitMonth = {

                            month:
                                monthNumber,

                            profit:
                                monthProfit

                        };

                    }

                }
            );


            const previousYearSales =
                type === "year"
                    ? sales.filter(
                        function (sale) {

                            return (
                                Number(
                                    String(
                                        sale.saleDate
                                    ).split("-")[0]
                                ) ===
                                year - 1 &&
                                Number(sale.cancelled) !== 1
                            );

                        }
                    )
                    : [];


            const previousYearTotal =
                previousYearSales.reduce(
                    (sum, sale) =>
                        sum +
                        (Number(sale.total) || 0),
                    0
                );


            if (
                type === "year" &&
                previousYearSales.length > 0 &&
                previousYearTotal > 0
            ) {

                const percentChange =
                    ((summary.totalSales -
                        previousYearTotal) /
                        previousYearTotal) *
                    100;


                yearComparison = {

                    previousYear:
                        year - 1,

                    previousYearTotal,

                    percentChange

                };

            }

        }


        const businessName =
            await getSetting(
                "businessName",
                "إدارة الاستراحة"
            );


        currentReportContext = {

            type,

            year,

            month,

            selectedMonths,

            rows,

            summary,

            productMap,

            dailyMap,

            paymentMethodMap,

            monthlyMap,

            bestDay,

            bestMonth,

            worstMonth,

            bestProfitMonth,

            worstProfitMonth,

            yearComparison,

            topProduct,

            averageSaleValue,

            totalDiscount,

            totalExpenses,

            totalWasteValue,

            wasteEntryCount,

            wasteByProductMap,

            netProfit,

            businessName

        };


        renderReportPreview(
            currentReportContext
        );


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء إنشاء التقرير."
        );

    }

}


/*
    تجميع صفوف التفاصيل حسب الفاتورة
    وبناء صفوف HTML لها (رقم الفاتورة/
    التاريخ/النوع تظهر مرة واحدة فقط
    لكل فاتورة عبر rowspan، ثم أصنافها
    تحتها)

    ملاحظة مهمة: هذا التجميع خاص بالعرض
    فقط، ولا يُستخدم في حساب أي إحصائية
    (الإجماليات، أكثر منتج مبيعًا، التوزيع
    اليومي...) — تلك كلها تبقى محسوبة من
    "rows" الأصلية دون أي تغيير.
*/

function buildGroupedDetailRowsHtml(
    rows
) {

    const groups = [];

    const groupsBySaleId =
        new Map();


    rows.forEach(
        function (entry) {

            const saleId =
                Number(entry.sale.id);


            if (
                !groupsBySaleId.has(saleId)
            ) {

                const group = {

                    sale:
                        entry.sale,

                    items: []

                };


                groupsBySaleId.set(
                    saleId,
                    group
                );


                groups.push(
                    group
                );

            }


            groupsBySaleId
                .get(saleId)
                .items.push(
                    entry.item
                );

        }
    );


    return groups
        .map(
            function (group) {

                const { sale, items } =
                    group;


                const typeText =
                    sale.saleType === "free"
                        ? "مجاني"
                        : "بيع";


                const rowCount =
                    items.length;


                return items
                    .map(
                        function (item, index) {

                            const invoiceCells =
                                index === 0
                                    ? `
                                        <td rowspan="${rowCount}" class="invoice-group-cell">
                                            <strong>${escapeHtml(sale.invoiceNumber || sale.saleNumber)}</strong>
                                        </td>
                                        <td rowspan="${rowCount}" class="invoice-group-cell">
                                            ${formatDateArabic(sale.saleDate)}
                                        </td>
                                    `
                                    : "";


                            const typeCell =
                                index === 0
                                    ? `
                                        <td rowspan="${rowCount}" class="invoice-group-cell">
                                            ${typeText}
                                        </td>
                                    `
                                    : "";


                            return `

                                <tr class="${index === 0 ? "invoice-group-start" : ""}">
                                    ${invoiceCells}
                                    <td class="cell-name">${escapeHtml(item.productName)}</td>
                                    <td>${formatQuantity(item.quantity)} ${escapeHtml(item.unit)}</td>
                                    <td>${formatMoney(item.unitPrice)} ريال</td>
                                    <td>${formatMoney(item.discount)} ريال</td>
                                    <td>${formatMoney(item.total)} ريال</td>
                                    ${typeCell}
                                </tr>

                            `;

                        }
                    )
                    .join(
                        ""
                    );

            }
        )
        .join(
            ""
        );

}


/*
    عرض التقرير
*/

/*
    عرض جدول "التالف حسب المنتج"
    (يُستخدم في المعاينة داخل التطبيق)
*/

function renderWasteBreakdownTable(
    wasteByProductMap
) {

    const card =
        document.getElementById(
            "reportWasteCard"
        );


    const tbody =
        document.getElementById(
            "reportWasteTableBody"
        );


    const emptyState =
        document.getElementById(
            "reportWasteEmptyState"
        );


    if (
        !card ||
        !tbody
    ) {

        return;

    }


    card.style.display =
        "block";


    tbody.innerHTML = "";


    if (
        !wasteByProductMap ||
        wasteByProductMap.size === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    Array.from(
        wasteByProductMap.entries()
    )
        .sort(
            (a, b) =>
                b[1].value - a[1].value
        )
        .forEach(
            function ([name, data]) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHtml(name)}
                    </td>

                    <td>
                        ${formatQuantity(data.quantity)}
                        ${escapeHtml(data.unit)}
                    </td>

                    <td>
                        ${data.count}
                    </td>

                    <td>
                        ${formatMoney(data.value)}
                        ريال
                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );

}


/*
    عرض التقرير
*/

function renderReportPreview(
    context
) {

    const {
        type,
        year,
        month,
        selectedMonths,
        rows,
        summary,
        productMap,
        dailyMap,
        paymentMethodMap,
        monthlyMap,
        bestDay,
        bestMonth,
        worstMonth,
        bestProfitMonth,
        worstProfitMonth,
        yearComparison,
        topProduct,
        averageSaleValue,
        totalDiscount,
        totalExpenses,
        totalWasteValue,
        wasteEntryCount,
        wasteByProductMap,
        netProfit,
        businessName
    } = context;


    const printArea =
        document.getElementById(
            "reportPrintArea"
        );


    const emptyCard =
        document.getElementById(
            "reportEmptyCard"
        );


    const downloadButton =
        document.getElementById(
            "downloadReportButton"
        );


    const excelButton =
        document.getElementById(
            "excelExportButton"
        );


    const shareImageButton =
        document.getElementById(
            "shareImageButton"
        );


    if (rows.length === 0) {

        if (printArea) {

            printArea.style.display =
                "none";

        }


        if (downloadButton) {

            downloadButton.style.display =
                "none";

        }


        if (excelButton) {

            excelButton.style.display =
                "none";

        }


        if (shareImageButton) {

            shareImageButton.style.display =
                "none";

        }


        if (emptyCard) {

            emptyCard.style.display =
                "block";


            const emptyState =
                document.getElementById(
                    "reportEmptyState"
                );


            if (emptyState) {

                const heading =
                    emptyState.querySelector(
                        "h3"
                    );


                const paragraph =
                    emptyState.querySelector(
                        "p"
                    );


                if (heading) {

                    heading.textContent =
                        "لا توجد عمليات في هذه الفترة";

                }


                if (paragraph) {

                    paragraph.textContent =
                        "جرّب اختيار فترة أخرى.";

                }

            }

        }


        return;

    }


    if (emptyCard) {

        emptyCard.style.display =
            "none";

    }


    if (printArea) {

        printArea.style.display =
            "block";

    }


    if (downloadButton) {

        downloadButton.style.display =
            "block";

    }


    if (excelButton) {

        excelButton.style.display =
            "block";

    }


    if (shareImageButton) {

        shareImageButton.style.display =
            "block";

    }


    const periodTitle =
        buildPeriodTitle(
            type,
            year,
            month,
            selectedMonths
        );


    document.getElementById(
        "reportBusinessName"
    ).textContent =
        businessName;


    document.getElementById(
        "reportPeriodTitle"
    ).textContent =
        periodTitle;


    document.getElementById(
        "reportTotalSales"
    ).textContent =
        `${formatMoney(summary.totalSales)} ريال`;


    document.getElementById(
        "reportTotalQuantity"
    ).textContent =
        formatQuantity(
            summary.totalQuantity
        );


    document.getElementById(
        "reportTotalCount"
    ).textContent =
        summary.count;


    document.getElementById(
        "reportFreeCount"
    ).textContent =
        summary.freeCount;


    document.getElementById(
        "reportAverageSale"
    ).textContent =
        `${formatMoney(averageSaleValue)} ريال`;


    document.getElementById(
        "reportTopProduct"
    ).textContent =
        topProduct
            ? `${topProduct.name} (${formatQuantity(topProduct.quantity)})`
            : "—";


    document.getElementById(
        "reportBestDay"
    ).textContent =
        bestDay
            ? `${formatDateArabic(bestDay.date)} (${formatMoney(bestDay.total)} ريال)`
            : "—";


    document.getElementById(
        "reportTotalDiscount"
    ).textContent =
        `${formatMoney(totalDiscount)} ريال`;


    document.getElementById(
        "reportTotalExpenses"
    ).textContent =
        `${formatMoney(totalExpenses)} ريال`;


    document.getElementById(
        "reportTotalWaste"
    ).textContent =
        `${formatMoney(totalWasteValue)} ريال`;


    document.getElementById(
        "reportWasteCount"
    ).textContent =
        wasteEntryCount;


    renderWasteBreakdownTable(
        wasteByProductMap
    );


    document.getElementById(
        "reportNetProfit"
    ).textContent =
        `${formatMoney(netProfit)} ريال`;


    const yearOnlyStats =
        document.querySelectorAll(
            ".year-only-stat"
        );


    yearOnlyStats.forEach(
        function (element) {

            element.style.display =
                type === "year"
                    ? "flex"
                    : "none";

        }
    );


    if (type === "year") {

        document.getElementById(
            "reportBestMonth"
        ).textContent =
            bestMonth &&
            bestMonth.total > 0
                ? `${ARABIC_MONTHS[bestMonth.month - 1]} (${formatMoney(bestMonth.total)} ريال)`
                : "—";


        document.getElementById(
            "reportWorstMonth"
        ).textContent =
            worstMonth
                ? `${ARABIC_MONTHS[worstMonth.month - 1]} (${formatMoney(worstMonth.total)} ريال)`
                : "—";


        document.getElementById(
            "reportBestProfitMonth"
        ).textContent =
            bestProfitMonth
                ? `${ARABIC_MONTHS[bestProfitMonth.month - 1]} (${formatMoney(bestProfitMonth.profit)} ريال)`
                : "—";


        document.getElementById(
            "reportWorstProfitMonth"
        ).textContent =
            worstProfitMonth
                ? `${ARABIC_MONTHS[worstProfitMonth.month - 1]} (${formatMoney(worstProfitMonth.profit)} ريال)`
                : "—";


        document.getElementById(
            "reportYearComparison"
        ).textContent =
            yearComparison
                ? `${yearComparison.percentChange >= 0 ? "+" : ""}${formatQuantity(yearComparison.percentChange)}% عن ${yearComparison.previousYear}`
                : "لا توجد بيانات للمقارنة";

    }


    const productsBody =
        document.getElementById(
            "reportProductsTableBody"
        );


    productsBody.innerHTML = "";


    Array.from(
        productMap.entries()
    )
        .sort(
            function (a, b) {

                return b[1].total - a[1].total;

            }
        )
        .forEach(
            function ([name, data]) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHtml(name)}
                    </td>

                    <td>
                        ${formatQuantity(data.quantity)}
                    </td>

                    <td>
                        ${data.count}
                    </td>

                    <td>
                        ${formatMoney(data.total)}
                        ريال
                    </td>

                `;


                productsBody.appendChild(
                    row
                );

            }
        );


    const dailyBody =
        document.getElementById(
            "reportDailyTableBody"
        );


    const dailyTitle =
        document.getElementById(
            "reportDailyTitle"
        );


    const dailyHeader =
        document.getElementById(
            "reportDailyTableHeader"
        );


    dailyBody.innerHTML = "";


    if (type === "year") {

        if (dailyTitle) {

            dailyTitle.textContent =
                "المبيعات الشهرية (مقارنة الأشهر)";

        }


        if (dailyHeader) {

            dailyHeader.innerHTML = `

                <th>الشهر</th>
                <th>عدد الفواتير</th>
                <th>الكمية</th>
                <th>الإجمالي</th>

            `;

        }


        Array.from(
            monthlyMap.entries()
        )
            .sort(
                (a, b) => a[0] - b[0]
            )
            .forEach(
                function ([monthNumber, data]) {

                    const row =
                        document.createElement(
                            "tr"
                        );


                    row.innerHTML = `

                        <td>
                            ${ARABIC_MONTHS[monthNumber - 1]}
                        </td>

                        <td>
                            ${data.count}
                        </td>

                        <td>
                            ${formatQuantity(data.quantity)}
                        </td>

                        <td>
                            ${formatMoney(data.total)}
                            ريال
                        </td>

                    `;


                    dailyBody.appendChild(
                        row
                    );

                }
            );


    } else {

        if (dailyTitle) {

            dailyTitle.textContent =
                "ملخص المبيعات اليومية";

        }


        if (dailyHeader) {

            dailyHeader.innerHTML = `

                <th>التاريخ</th>
                <th>عدد الفواتير</th>
                <th>الكمية</th>
                <th>الإجمالي</th>

            `;

        }


        Array.from(
            dailyMap.entries()
        )
            .sort(
                function (a, b) {

                    return a[0].localeCompare(
                        b[0]
                    );

                }
            )
            .forEach(
                function ([date, data]) {

                    const row =
                        document.createElement(
                            "tr"
                        );


                    row.innerHTML = `

                        <td>
                            ${formatDateArabic(date)}
                        </td>

                        <td>
                            ${data.count}
                        </td>

                        <td>
                            ${formatQuantity(data.quantity)}
                        </td>

                        <td>
                            ${formatMoney(data.total)}
                            ريال
                        </td>

                    `;


                dailyBody.appendChild(
                    row
                );

            }
        );

    }


    const paymentBody =
        document.getElementById(
            "reportPaymentTableBody"
        );


    paymentBody.innerHTML = "";


    Array.from(
        paymentMethodMap.entries()
    )
        .sort(
            function (a, b) {

                return b[1].total - a[1].total;

            }
        )
        .forEach(
            function ([method, data]) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHtml(PAYMENT_METHOD_LABELS[method] || method)}
                    </td>

                    <td>
                        ${data.count}
                    </td>

                    <td>
                        ${formatMoney(data.total)}
                        ريال
                    </td>

                `;


                paymentBody.appendChild(
                    row
                );

            }
        );


    const detailsBody =
        document.getElementById(
            "reportDetailsTableBody"
        );


    detailsBody.innerHTML =
        buildGroupedDetailRowsHtml(
            rows
        );

}


/*
    فتح نافذة طباعة/حفظ التقرير كـ PDF

    نبني صفحة HTML كاملة (نص عربي حقيقي،
    وليس صورة) بنفس أسلوب فاتورة البيع،
    وتُفتح في نافذة مستقلة بها زر طباعة
    يستخدمه المستخدم لحفظها PDF فعليًا
    عبر نافذة الطباعة في المتصفح.
*/

function downloadReportPdf() {

    if (
        !currentReportContext ||
        currentReportContext.rows.length === 0
    ) {

        showToast(
            "أنشئ التقرير أولًا قبل الطباعة."
        );

        return;

    }


    const reportWindow =
        window.open(
            "",
            "_blank"
        );


    if (!reportWindow) {

        showToast(
            "يرجى السماح بفتح النوافذ المنبثقة لعرض التقرير."
        );

        return;

    }


    const html =
        buildReportPrintHtml(
            currentReportContext
        );


    reportWindow.document.write(
        html
    );


    reportWindow.document.close();

}


/*
    تصدير ملخص التقرير كصورة قابلة
    للمشاركة (واتساب وغيره)

    نرسم مباشرة على Canvas 2D بدل تصوير
    الصفحة، لأن رسم النصوص عبر Canvas
    يعتمد على محرك عرض النصوص في المتصفح
    نفسه (Arabic shaping صحيح تلقائيًا)،
    بخلاف مكتبات PDF المباشرة.
*/

async function exportReportAsImage() {

    if (
        !currentReportContext ||
        currentReportContext.rows.length === 0
    ) {

        showToast(
            "أنشئ التقرير أولًا قبل المشاركة."
        );

        return;

    }


    const shareButton =
        document.getElementById(
            "shareImageButton"
        );


    const originalText =
        shareButton
            ? shareButton.textContent
            : "";


    try {

        if (shareButton) {

            shareButton.disabled =
                true;


            shareButton.textContent =
                "جارٍ التجهيز...";

        }


        const context =
            currentReportContext;


        const canvas =
            document.createElement(
                "canvas"
            );


        const width = 1080;


        canvas.width =
            width;


        const ctx =
            canvas.getContext(
                "2d"
            );


        ctx.direction =
            "rtl";


        /*
            تجهيز بيانات البطاقات قبل
            الرسم لمعرفة الارتفاع الكلي
            المطلوب للصورة
        */

        const periodTitle =
            buildPeriodTitle(
                context.type,
                context.year,
                context.month,
                context.selectedMonths
            );


        const isProfitNegative =
            context.netProfit < 0;


        const topProductsForDonut =
            Array.from(
                (context.productMap ||
                    new Map()).entries()
            )
                .sort(
                    (a, b) =>
                        b[1].total - a[1].total
                )
                .slice(
                    0,
                    4
                );


        const donutTotal =
            Array.from(
                (context.productMap ||
                    new Map()).values()
            ).reduce(
                (sum, p) => sum + p.total,
                0
            );


        const donutSegments =
            topProductsForDonut.map(
                function ([name, data], index) {

                    const colors = [

                        "#1f7a4d",
                        "#d4a017",
                        "#2f6fb0",
                        "#d9534f"

                    ];


                    return {

                        label: name,

                        value: data.total,

                        color: colors[index] || "#9aa5a1"

                    };

                }
            );


        const donutOthersValue =
            donutTotal -
            donutSegments.reduce(
                (sum, s) => sum + s.value,
                0
            );


        if (donutOthersValue > 0.01) {

            donutSegments.push(
                {

                    label: "أخرى",

                    value: donutOthersValue,

                    color: "#c9cfc9"

                }
            );

        }


        const topProductsForRanking =
            Array.from(
                (context.productMap ||
                    new Map()).entries()
            )
                .sort(
                    (a, b) =>
                        b[1].total - a[1].total
                )
                .slice(
                    0,
                    4
                )
                .map(
                    function ([name, data]) {

                        return {

                            label: name,

                            value: data.total

                        };

                    }
                );


        /*
            حساب الأبعاد الكلية للصورة
        */

        const headerHeight = 100;

        const outerMargin = 36;

        const cardGap = 18;

        const cardWidth =
            (width - outerMargin * 2 - cardGap) / 2;

        const metricCardHeight = 168;

        const chartCardHeight = 330;

        const gridTop =
            headerHeight + 26;

        const row1Top = gridTop;

        const row2Top =
            row1Top + metricCardHeight + cardGap;

        const row3Top =
            row2Top + metricCardHeight + cardGap;

        const row4Top =
            row3Top + metricCardHeight + cardGap;

        const footerHeight = 50;

        const height =
            row4Top + chartCardHeight + footerHeight;


        canvas.height =
            height;


        /*
            الخلفية العامة (فاتحة، محايدة
            تناسب طابع العمل الزراعي)
        */

        ctx.fillStyle =
            "#f2f0e9";


        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        /*
            شريط الرأس العلوي
        */

        const headerGradient =
            ctx.createLinearGradient(
                0,
                0,
                width,
                0
            );


        headerGradient.addColorStop(0, "#155c39");

        headerGradient.addColorStop(1, "#2f9e63");


        ctx.fillStyle =
            headerGradient;


        ctx.fillRect(
            0,
            0,
            width,
            headerHeight
        );


        ctx.textAlign =
            "center";


        ctx.fillStyle =
            "#ffffff";


        ctx.font =
            "bold 30px Cairo, Tahoma, Arial";


        ctx.fillText(
            context.businessName,
            width / 2,
            42
        );


        ctx.font =
            context.type === "custom" &&
            (context.selectedMonths || []).length > 3
                ? "18px Cairo, Tahoma, Arial"
                : "20px Cairo, Tahoma, Arial";


        ctx.fillStyle =
            "rgba(255,255,255,0.9)";


        ctx.fillText(
            periodTitle,
            width / 2,
            72
        );


        /*
            بطاقة رقمية (أيقونة + رقم كبير)
        */

        function drawMetricCard(
            x,
            y,
            w,
            h,
            icon,
            label,
            value,
            accentColor,
            lightColor
        ) {

            ctx.save();

            ctx.shadowColor =
                "rgba(31,41,25,0.10)";

            ctx.shadowBlur = 14;

            ctx.shadowOffsetY = 5;

            ctx.fillStyle =
                "#ffffff";

            drawRoundedRect(
                ctx,
                x,
                y,
                w,
                h,
                18
            );

            ctx.fill();

            ctx.restore();


            const badgeRadius = 28;

            const badgeCx =
                x + w - badgeRadius - 20;

            const badgeCy =
                y + badgeRadius + 20;


            ctx.fillStyle =
                lightColor;

            ctx.beginPath();

            ctx.arc(
                badgeCx,
                badgeCy,
                badgeRadius,
                0,
                Math.PI * 2
            );

            ctx.fill();


            ctx.textAlign =
                "center";

            ctx.font =
                "26px Cairo, Tahoma, Arial";

            ctx.fillText(
                icon,
                badgeCx,
                badgeCy + 9
            );


            ctx.textAlign =
                "right";

            ctx.fillStyle =
                "#6b7280";

            ctx.font =
                "18px Cairo, Tahoma, Arial";

            ctx.fillText(
                label,
                x + w - 20,
                y + h - 62
            );


            const valueFontSize =
                String(value).length > 14
                    ? 22
                    : String(value).length > 9
                        ? 26
                        : 30;


            ctx.fillStyle =
                accentColor;

            ctx.font =
                `bold ${valueFontSize}px Cairo, Tahoma, Arial`;

            ctx.fillText(
                String(value),
                x + w - 20,
                y + h - 26
            );

        }


        drawMetricCard(
            outerMargin,
            row1Top,
            cardWidth,
            metricCardHeight,
            "💰",
            "إجمالي المبيعات",
            `${formatMoney(context.summary.totalSales)} ريال`,
            "#1f7a4d",
            "#eaf5ee"
        );


        drawMetricCard(
            outerMargin + cardWidth + cardGap,
            row1Top,
            cardWidth,
            metricCardHeight,
            "💵",
            "صافي الربح للفترة",
            `${formatMoney(context.netProfit)} ريال`,
            isProfitNegative ? "#c1622d" : "#0f766e",
            isProfitNegative ? "#fbe9dd" : "#e2f3f1"
        );


        drawMetricCard(
            outerMargin,
            row2Top,
            cardWidth,
            metricCardHeight,
            "🧾",
            "عدد الفواتير",
            String(context.summary.count),
            "#2f6fb0",
            "#e6f0fa"
        );


        drawMetricCard(
            outerMargin + cardWidth + cardGap,
            row2Top,
            cardWidth,
            metricCardHeight,
            "📦",
            "إجمالي الكميات المباعة",
            formatQuantity(context.summary.totalQuantity),
            "#8a5a00",
            "#fdf3dc"
        );


        drawMetricCard(
            outerMargin,
            row3Top,
            cardWidth,
            metricCardHeight,
            "🗑️",
            `التالف (${context.wasteEntryCount} عملية)`,
            `${formatMoney(context.totalWasteValue)} ريال`,
            "#8a2e26",
            "#fbe6e3"
        );


        drawMetricCard(
            outerMargin + cardWidth + cardGap,
            row3Top,
            cardWidth,
            metricCardHeight,
            "📊",
            "متوسط قيمة الفاتورة",
            `${formatMoney(context.averageSaleValue)} ريال`,
            "#1f7a4d",
            "#eaf5ee"
        );


        /*
            بطاقة الرسم الدائري (توزيع
            المبيعات حسب المنتج)
        */

        function drawCardShell(
            x,
            y,
            w,
            h,
            title
        ) {

            ctx.save();

            ctx.shadowColor =
                "rgba(31,41,25,0.10)";

            ctx.shadowBlur = 14;

            ctx.shadowOffsetY = 5;

            ctx.fillStyle =
                "#ffffff";

            drawRoundedRect(
                ctx,
                x,
                y,
                w,
                h,
                18
            );

            ctx.fill();

            ctx.restore();


            ctx.textAlign =
                "right";

            ctx.fillStyle =
                "#26311f";

            ctx.font =
                "bold 19px Cairo, Tahoma, Arial";

            ctx.fillText(
                title,
                x + w - 20,
                y + 34
            );

        }


        const donutCardX =
            outerMargin;


        drawCardShell(
            donutCardX,
            row4Top,
            cardWidth,
            chartCardHeight,
            "🌿 المبيعات حسب المنتج"
        );


        if (donutSegments.length > 0) {

            const donutCx =
                donutCardX + cardWidth / 2;


            const donutCy =
                row4Top + 150;


            const donutRadius = 78;


            let startAngle =
                -Math.PI / 2;


            donutSegments.forEach(
                function (segment) {

                    const sliceAngle =
                        (segment.value / donutTotal) *
                        Math.PI * 2;


                    ctx.beginPath();

                    ctx.moveTo(
                        donutCx,
                        donutCy
                    );

                    ctx.arc(
                        donutCx,
                        donutCy,
                        donutRadius,
                        startAngle,
                        startAngle + sliceAngle
                    );

                    ctx.closePath();

                    ctx.fillStyle =
                        segment.color;

                    ctx.fill();


                    startAngle +=
                        sliceAngle;

                }
            );


            ctx.fillStyle =
                "#ffffff";

            ctx.beginPath();

            ctx.arc(
                donutCx,
                donutCy,
                donutRadius * 0.55,
                0,
                Math.PI * 2
            );

            ctx.fill();


            ctx.textAlign =
                "center";

            ctx.fillStyle =
                "#155c39";

            ctx.font =
                "bold 16px Cairo, Tahoma, Arial";

            ctx.fillText(
                "الأصناف",
                donutCx,
                donutCy + 6
            );


            let legendY =
                row4Top + 255;


            donutSegments.slice(0, 3).forEach(
                function (segment) {

                    ctx.fillStyle =
                        segment.color;

                    drawRoundedRect(
                        ctx,
                        donutCardX + cardWidth - 34,
                        legendY - 12,
                        14,
                        14,
                        4
                    );

                    ctx.fill();


                    ctx.textAlign =
                        "right";

                    ctx.fillStyle =
                        "#4b5563";

                    ctx.font =
                        "14px Cairo, Tahoma, Arial";


                    const shortLabel =
                        segment.label.length > 16
                            ? segment.label.slice(0, 15) + "…"
                            : segment.label;


                    ctx.fillText(
                        shortLabel,
                        donutCardX + cardWidth - 46,
                        legendY
                    );


                    legendY += 24;

                }
            );

        } else {

            ctx.textAlign =
                "center";

            ctx.fillStyle =
                "#9aa5a1";

            ctx.font =
                "16px Cairo, Tahoma, Arial";

            ctx.fillText(
                "لا توجد بيانات كافية",
                donutCardX + cardWidth / 2,
                row4Top + 170
            );

        }


        /*
            بطاقة ترتيب أفضل المنتجات
        */

        const rankingCardX =
            outerMargin + cardWidth + cardGap;


        drawCardShell(
            rankingCardX,
            row4Top,
            cardWidth,
            chartCardHeight,
            "🏆 أفضل المنتجات مبيعًا"
        );


        if (topProductsForRanking.length > 0) {

            const maxValue =
                Math.max(
                    ...topProductsForRanking.map(
                        item => item.value
                    )
                );


            const barColors = [

                "#1f7a4d",
                "#2f9e63",
                "#5fb887",
                "#8ccba7"

            ];


            const barAreaX =
                rankingCardX + 20;


            const barAreaWidth =
                cardWidth - 40;


            let barY =
                row4Top + 65;


            topProductsForRanking.forEach(
                function (item, index) {

                    const shortLabel =
                        item.label.length > 18
                            ? item.label.slice(0, 17) + "…"
                            : item.label;


                    ctx.textAlign =
                        "right";

                    ctx.fillStyle =
                        "#374151";

                    ctx.font =
                        "15px Cairo, Tahoma, Arial";

                    ctx.fillText(
                        shortLabel,
                        barAreaX + barAreaWidth,
                        barY
                    );


                    const barMaxWidth =
                        barAreaWidth - 130;


                    const barWidth =
                        maxValue > 0
                            ? Math.max(
                                6,
                                (item.value / maxValue) * barMaxWidth
                            )
                            : 6;


                    const barTrackY =
                        barY + 10;


                    ctx.fillStyle =
                        "#f1f0e8";

                    drawRoundedRect(
                        ctx,
                        barAreaX,
                        barTrackY,
                        barMaxWidth,
                        16,
                        8
                    );

                    ctx.fill();


                    ctx.fillStyle =
                        barColors[index] || "#8ccba7";

                    drawRoundedRect(
                        ctx,
                        barAreaX + (barMaxWidth - barWidth),
                        barTrackY,
                        barWidth,
                        16,
                        8
                    );

                    ctx.fill();


                    ctx.textAlign =
                        "left";

                    ctx.fillStyle =
                        "#155c39";

                    ctx.font =
                        "bold 14px Cairo, Tahoma, Arial";

                    ctx.fillText(
                        formatMoney(item.value),
                        barAreaX,
                        barY
                    );


                    barY += 62;

                }
            );

        } else {

            ctx.textAlign =
                "center";

            ctx.fillStyle =
                "#9aa5a1";

            ctx.font =
                "16px Cairo, Tahoma, Arial";

            ctx.fillText(
                "لا توجد بيانات كافية",
                rankingCardX + cardWidth / 2,
                row4Top + 170
            );

        }


        /*
            التذييل
        */

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#8a8f7d";

        ctx.font =
            "16px Cairo, Tahoma, Arial";

        ctx.fillText(
            `تم الإنشاء بتاريخ ${new Date().toLocaleDateString("ar-SA")}`,
            width / 2,
            height - 20
        );


        const fileName =
            context.type === "month"
                ? `ملخص-${context.year}-${String(context.month).padStart(2, "0")}.png`
                : context.type === "custom"
                    ? `ملخص-${context.year}-اشهر-مختارة.png`
                    : `ملخص-${context.year}.png`;


        canvas.toBlob(
            async function (blob) {

                if (!blob) {

                    showToast(
                        "تعذر إنشاء الصورة."
                    );

                    return;

                }


                const file =
                    new File(
                        [blob],
                        fileName,
                        {

                            type:
                                "image/png"

                        }
                    );


                if (
                    navigator.canShare &&
                    navigator.canShare({

                        files: [file]

                    })
                ) {

                    try {

                        await navigator.share(
                            {

                                files: [file],

                                title:
                                    periodTitle,

                                text:
                                    periodTitle

                            }
                        );


                        return;


                    } catch (error) {

                        /*
                            المستخدم أغلق قائمة
                            المشاركة، ننتقل للتنزيل
                            المباشر كبديل.
                        */

                    }

                }


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                link.href =
                    url;


                link.download =
                    fileName;


                document.body.appendChild(
                    link
                );


                link.click();


                link.remove();


                URL.revokeObjectURL(
                    url
                );


                showToast(
                    "تم تنزيل صورة الملخص."
                );

            },
            "image/png"
        );


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر إنشاء صورة الملخص."
        );

    } finally {

        if (shareButton) {

            shareButton.disabled =
                false;


            shareButton.textContent =
                originalText ||
                "مشاركة كصورة";

        }

    }

}


/*
    رسم مستطيل بزوايا دائرية
*/

function drawRoundedRect(
    ctx,
    x,
    y,
    width,
    height,
    radius
) {

    ctx.beginPath();


    ctx.moveTo(
        x + radius,
        y
    );


    ctx.arcTo(
        x + width,
        y,
        x + width,
        y + height,
        radius
    );


    ctx.arcTo(
        x + width,
        y + height,
        x,
        y + height,
        radius
    );


    ctx.arcTo(
        x,
        y + height,
        x,
        y,
        radius
    );


    ctx.arcTo(
        x,
        y,
        x + width,
        y,
        radius
    );


    ctx.closePath();

}


/*
    بناء صفحة HTML كاملة للتقرير
*/

function buildReportPrintHtml(
    context
) {

    const {
        type,
        year,
        month,
        selectedMonths,
        rows,
        summary,
        productMap,
        dailyMap,
        paymentMethodMap,
        monthlyMap,
        bestDay,
        bestMonth,
        worstMonth,
        bestProfitMonth,
        worstProfitMonth,
        yearComparison,
        topProduct,
        averageSaleValue,
        totalDiscount,
        totalExpenses,
        totalWasteValue,
        wasteEntryCount,
        wasteByProductMap,
        netProfit,
        businessName
    } = context;


    const periodTitle =
        buildPeriodTitle(
            type,
            year,
            month,
            selectedMonths
        );


    const fileTitle =
        type === "month"
            ? `تقرير-${year}-${String(month).padStart(2, "0")}`
            : type === "custom"
                ? `تقرير-${year}-اشهر-مختارة`
                : `تقرير-${year}`;


    const productRows =
        Array.from(
            productMap.entries()
        )
            .sort(
                (a, b) =>
                    b[1].total - a[1].total
            )
            .map(
                function ([name, data], index) {

                    const share =
                        summary.totalSales > 0
                            ? (data.total / summary.totalSales) * 100
                            : 0;


                    return `

                        <tr>
                            <td>${index + 1}</td>
                            <td class="cell-name">${escapeHtml(name)}</td>
                            <td>${formatQuantity(data.quantity)}</td>
                            <td>${data.count}</td>
                            <td>${formatMoney(data.total)}</td>
                            <td>${formatQuantity(share)}%</td>
                        </tr>

                    `;

                }
            )
            .join(
                ""
            );


    const dailySectionTitle =
        type === "year"
            ? "المبيعات الشهرية (مقارنة الأشهر)"
            : "ملخص المبيعات اليومية";


    const dailyTableHeader =
        type === "year"
            ? `
                <th>الشهر</th>
                <th>عدد الفواتير</th>
                <th>الكمية</th>
                <th>الإجمالي</th>
            `
            : `
                <th>التاريخ</th>
                <th>عدد الفواتير</th>
                <th>الكمية</th>
                <th>الإجمالي</th>
            `;


    const dailyRows =
        type === "year"
            ? Array.from(
                monthlyMap.entries()
            )
                .sort(
                    (a, b) => a[0] - b[0]
                )
                .map(
                    function ([monthNumber, data]) {

                        return `

                            <tr>
                                <td>${ARABIC_MONTHS[monthNumber - 1]}</td>
                                <td>${data.count}</td>
                                <td>${formatQuantity(data.quantity)}</td>
                                <td>${formatMoney(data.total)}</td>
                            </tr>

                        `;

                    }
                )
                .join(
                    ""
                )
            : Array.from(
                dailyMap.entries()
            )
                .sort(
                    (a, b) =>
                        a[0].localeCompare(b[0])
                )
                .map(
                    function ([date, data]) {

                        return `

                            <tr>
                                <td>${formatDateArabic(date)}</td>
                                <td>${data.count}</td>
                                <td>${formatQuantity(data.quantity)}</td>
                                <td>${formatMoney(data.total)}</td>
                            </tr>

                        `;

                    }
                )
                .join(
                    ""
                );


    /*
        بيانات الرسوم البيانية (Chart.js)
    */

    const trendLabels =
        type === "year"
            ? ARABIC_MONTHS
            : Array.from(
                dailyMap.keys()
            ).sort();


    const trendValues =
        type === "year"
            ? Array.from(
                { length: 12 },
                (_, i) =>
                    monthlyMap.get(i + 1)?.total || 0
            )
            : trendLabels.map(
                date =>
                    dailyMap.get(date)?.total || 0
            );


    const trendLabelsForChart =
        type === "year"
            ? trendLabels
            : trendLabels.map(
                date =>
                    formatDateArabic(date)
            );


    const topProductEntries =
        Array.from(
            productMap.entries()
        )
            .sort(
                (a, b) =>
                    b[1].total - a[1].total
            )
            .slice(
                0,
                6
            );


    const productChartLabels =
        topProductEntries.map(
            ([name]) => name
        );


    const productChartValues =
        topProductEntries.map(
            ([, data]) => data.total
        );


    const paymentChartLabels =
        Array.from(
            paymentMethodMap.keys()
        ).map(
            method =>
                PAYMENT_METHOD_LABELS[method] ||
                method
        );


    const paymentChartValues =
        Array.from(
            paymentMethodMap.values()
        ).map(
            data => data.total
        );


    const extraYearStatsBlock =
        type === "year"
            ? `

                <div class="stat-box blue">
                    <span>📈 أفضل شهر (مبيعات)</span>
                    <strong>${bestMonth && bestMonth.total > 0 ? ARABIC_MONTHS[bestMonth.month - 1] : "—"}</strong>
                </div>

                <div class="stat-box blue">
                    <span>📉 أسوأ شهر (مبيعات)</span>
                    <strong>${worstMonth ? ARABIC_MONTHS[worstMonth.month - 1] : "—"}</strong>
                </div>

                <div class="stat-box profit-box">
                    <span>🏆 أفضل شهر (ربح)</span>
                    <strong>${bestProfitMonth ? `${ARABIC_MONTHS[bestProfitMonth.month - 1]} (${formatMoney(bestProfitMonth.profit)} ريال)` : "—"}</strong>
                </div>

                <div class="stat-box profit-box">
                    <span>⚠️ أسوأ شهر (ربح)</span>
                    <strong>${worstProfitMonth ? `${ARABIC_MONTHS[worstProfitMonth.month - 1]} (${formatMoney(worstProfitMonth.profit)} ريال)` : "—"}</strong>
                </div>

                <div class="stat-box gold">
                    <span>⚖️ مقارنة بالعام السابق</span>
                    <strong>${yearComparison ? `${yearComparison.percentChange >= 0 ? "+" : ""}${formatQuantity(yearComparison.percentChange)}%` : "لا يوجد"}</strong>
                </div>

            `
            : "";


    const paymentRows =
        Array.from(
            paymentMethodMap.entries()
        )
            .sort(
                (a, b) =>
                    b[1].total - a[1].total
            )
            .map(
                function ([method, data]) {

                    return `

                        <tr>
                            <td>${escapeHtml(PAYMENT_METHOD_LABELS[method] || method)}</td>
                            <td>${data.count}</td>
                            <td>${formatMoney(data.total)}</td>
                        </tr>

                    `;

                }
            )
            .join(
                ""
            );


    const wasteRows =
        wasteByProductMap &&
        wasteByProductMap.size > 0
            ? Array.from(
                wasteByProductMap.entries()
            )
                .sort(
                    (a, b) =>
                        b[1].value - a[1].value
                )
                .map(
                    function ([name, data]) {

                        return `

                            <tr>
                                <td class="cell-name">${escapeHtml(name)}</td>
                                <td>${formatQuantity(data.quantity)} ${escapeHtml(data.unit)}</td>
                                <td>${data.count}</td>
                                <td>${formatMoney(data.value)} ريال</td>
                            </tr>

                        `;

                    }
                )
                .join(
                    ""
                )
            : `
                <tr>
                    <td colspan="4">لا يوجد تالف في هذه الفترة</td>
                </tr>
            `;


    const detailRows =
        buildGroupedDetailRowsHtml(
            rows
        );


    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(periodTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.1/chart.umd.min.js"></script>
<style>

    @page {
        size: A4 portrait;
        margin: 12mm;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: 'Cairo', Tahoma, sans-serif;
        color: #26311f;
        margin: 0;
        padding: 0;
        background: #eef1e8;
    }

    .toolbar {
        position: sticky;
        top: 0;
        background: #1f7a4d;
        padding: 12px 20px;
        display: flex;
        justify-content: center;
        gap: 10px;
        z-index: 10;
    }

    .toolbar button {
        border: 0;
        border-radius: 8px;
        padding: 10px 22px;
        font-family: 'Cairo', Tahoma, sans-serif;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
    }

    .toolbar .print-btn {
        background: white;
        color: #1f7a4d;
    }

    .toolbar .close-btn {
        background: #155c39;
        color: white;
    }

    .page {
        max-width: 210mm;
        margin: 20px auto;
        background: #fdfbf6;
        padding: 14mm;
        border-radius: 10px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.10);
    }

    .report-header {
        background: linear-gradient(135deg, #1f7a4d 0%, #2f9e63 55%, #3fae74 100%);
        border-radius: 14px;
        padding: 22px 20px;
        margin-bottom: 18px;
        text-align: center;
        color: white;
    }

    .report-header h1 {
        margin: 0 0 6px 0;
        font-size: 23px;
        font-weight: 800;
    }

    .report-header p {
        margin: 0;
        font-size: 13.5px;
        color: rgba(255,255,255,0.92);
        font-weight: 600;
    }

    .hero-profit-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(120deg, #0f766e 0%, #147d7d 100%);
        color: white;
        border-radius: 14px;
        padding: 16px 22px;
        margin-bottom: 18px;
    }

    .hero-profit-banner.negative {
        background: linear-gradient(120deg, #b5651d 0%, #c1622d 100%);
    }

    .hero-profit-banner .hero-label {
        font-size: 13px;
        font-weight: 700;
        opacity: 0.9;
    }

    .hero-profit-banner .hero-value {
        font-size: 28px;
        font-weight: 800;
    }

    .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14.5px;
        font-weight: 800;
        color: #1f7a4d;
        margin: 24px 0 10px 0;
        padding: 8px 12px;
        background: #eaf5ee;
        border-radius: 8px;
        border-right: 5px solid #1f7a4d;
    }

    .section-title.gold {
        color: #8a5a00;
        background: #fdf3dc;
        border-right-color: #d4a017;
    }

    .section-title.terracotta {
        color: #7a3c14;
        background: #fbe9dd;
        border-right-color: #c1622d;
    }

    .section-title.coral {
        color: #8a2e26;
        background: #fbe6e3;
        border-right-color: #d9534f;
    }

    .section-title.blue {
        color: #1c4b78;
        background: #e6f0fa;
        border-right-color: #2f6fb0;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 10px;
    }

    .stat-box {
        background: #eaf5ee;
        border: 1px solid #cfe8da;
        border-top: 3px solid #1f7a4d;
        border-radius: 10px;
        padding: 11px 8px;
        text-align: center;
    }

    .stat-box span {
        display: block;
        font-size: 10.5px;
        color: #5a6b5c;
        margin-bottom: 4px;
        font-weight: 600;
    }

    .stat-box strong {
        font-size: 14.5px;
        color: #155c39;
        font-weight: 800;
    }

    .stat-box.gold {
        background: #fdf3dc;
        border-color: #f3e0ab;
        border-top-color: #d4a017;
    }

    .stat-box.gold strong {
        color: #8a5a00;
    }

    .stat-box.terracotta {
        background: #fbe9dd;
        border-color: #f0cfb4;
        border-top-color: #c1622d;
    }

    .stat-box.terracotta strong {
        color: #7a3c14;
    }

    .stat-box.coral {
        background: #fbe6e3;
        border-color: #f2c9c4;
        border-top-color: #d9534f;
    }

    .stat-box.coral strong {
        color: #8a2e26;
    }

    .stat-box.profit-box {
        background: #e2f3f1;
        border-color: #b9e0da;
        border-top-color: #0f766e;
    }

    .stat-box.profit-box strong {
        color: #0f766e;
        font-weight: 800;
    }

    .stat-box.blue {
        background: #e6f0fa;
        border-color: #c3dbf0;
        border-top-color: #2f6fb0;
    }

    .stat-box.blue strong {
        color: #1c4b78;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
        font-size: 12px;
        border-radius: 8px;
        overflow: hidden;
    }

    thead th {
        background: #1f7a4d;
        color: white;
        padding: 9px 6px;
        text-align: center;
        font-size: 11px;
        font-weight: 700;
    }

    tbody td {
        padding: 7px 6px;
        text-align: center;
        border-bottom: 1px solid #e8e4d8;
    }

    tbody tr:nth-child(even) {
        background: #f7f5ee;
    }

    .cell-name {
        text-align: right;
        font-weight: 600;
    }

    .invoice-group-start td {
        border-top: 2px solid #1f7a4d;
    }

    .invoice-group-cell {
        background: #eaf5ee;
        font-weight: 700;
        vertical-align: top;
    }

    .grand-total-box {
        background: linear-gradient(120deg, #1f7a4d 0%, #155c39 100%);
        color: white;
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        font-size: 17px;
        font-weight: 800;
    }

    .chart-box {
        background: white;
        border: 1px solid #e8e4d8;
        border-radius: 10px;
        padding: 12px;
        margin: 16px 0;
        max-height: 320px;
    }

    .charts-row {
        display: flex;
        gap: 12px;
        margin: 16px 0;
    }

    .chart-box.half {
        flex: 1;
        margin: 0;
        max-height: 260px;
    }

    @media print {

        .chart-box {
            break-inside: avoid;
        }

        .charts-row {
            break-inside: avoid;
        }

        .toolbar {
            display: none;
        }

        body {
            background: white;
        }

        .page {
            box-shadow: none;
            margin: 0;
            padding: 0;
            max-width: none;
        }

        .section-title {
            break-after: avoid;
        }

        table {
            break-inside: auto;
        }

        tr {
            break-inside: avoid;
        }

    }

</style>
</head>
<body>

    <div class="toolbar">
        <button class="print-btn" onclick="window.print()">طباعة / حفظ PDF</button>
        <button class="close-btn" onclick="window.close()">إغلاق</button>
    </div>

    <div class="page">

        <div class="report-header">
            <h1>${escapeHtml(businessName)}</h1>
            <p>${escapeHtml(periodTitle)}</p>
        </div>

        <div class="hero-profit-banner${netProfit < 0 ? " negative" : ""}">
            <span class="hero-label">💵 صافي الربح للفترة</span>
            <span class="hero-value">${formatMoney(netProfit)} ريال</span>
        </div>

        <div class="stats-grid">

            <div class="stat-box">
                <span>💰 إجمالي المبيعات</span>
                <strong>${formatMoney(summary.totalSales)} ريال</strong>
            </div>

            <div class="stat-box blue">
                <span>🧾 عدد الفواتير</span>
                <strong>${summary.count}</strong>
            </div>

            <div class="stat-box">
                <span>📊 متوسط قيمة الفاتورة</span>
                <strong>${formatMoney(averageSaleValue)} ريال</strong>
            </div>

            <div class="stat-box gold">
                <span>📦 إجمالي الكميات المباعة</span>
                <strong>${formatQuantity(summary.totalQuantity)}</strong>
            </div>

            <div class="stat-box gold">
                <span>🏆 أكثر منتج مبيعًا</span>
                <strong>${topProduct ? escapeHtml(topProduct.name) : "—"}</strong>
            </div>

            <div class="stat-box blue">
                <span>📅 أفضل يوم مبيعات</span>
                <strong>${bestDay ? formatDateArabic(bestDay.date) : "—"}</strong>
            </div>

            <div class="stat-box terracotta">
                <span>🏷️ إجمالي الخصومات</span>
                <strong>${formatMoney(totalDiscount)} ريال</strong>
            </div>

            <div class="stat-box blue">
                <span>🎁 عمليات مجانية</span>
                <strong>${summary.freeCount}</strong>
            </div>

            <div class="stat-box terracotta">
                <span>🧾 إجمالي المصاريف</span>
                <strong>${formatMoney(totalExpenses)} ريال</strong>
            </div>

            <div class="stat-box coral">
                <span>🗑️ قيمة التالف</span>
                <strong>${formatMoney(totalWasteValue)} ريال</strong>
            </div>

            <div class="stat-box coral">
                <span>📋 عدد عمليات التالف</span>
                <strong>${wasteEntryCount}</strong>
            </div>

            ${extraYearStatsBlock}

        </div>

        <div class="chart-box">
            <canvas id="trendChart"></canvas>
        </div>

        <div class="section-title blue">📅 ${dailySectionTitle}</div>
        <table>
            <thead>
                <tr>
                    ${dailyTableHeader}
                </tr>
            </thead>
            <tbody>
                ${dailyRows}
            </tbody>
        </table>

        <div class="charts-row">
            <div class="chart-box half">
                <canvas id="productChart"></canvas>
            </div>
            <div class="chart-box half">
                <canvas id="paymentChart"></canvas>
            </div>
        </div>

        <div class="section-title gold">🌿 المبيعات حسب المنتج</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>عدد الفواتير</th>
                    <th>الإجمالي</th>
                    <th>نسبة المساهمة</th>
                </tr>
            </thead>
            <tbody>
                ${productRows}
            </tbody>
        </table>

        <div class="section-title blue">💳 المبيعات حسب طريقة الدفع</div>
        <table>
            <thead>
                <tr>
                    <th>طريقة الدفع</th>
                    <th>عدد الفواتير</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${paymentRows}
            </tbody>
        </table>

        <div class="section-title coral">🗑️ التالف حسب المنتج</div>
        <table>
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>الكمية التالفة</th>
                    <th>عدد العمليات</th>
                    <th>القيمة</th>
                </tr>
            </thead>
            <tbody>
                ${wasteRows}
            </tbody>
        </table>

        <div class="section-title">🧾 سجل جميع عمليات البيع</div>
        <table>
            <thead>
                <tr>
                    <th>رقم الفاتورة</th>
                    <th>التاريخ</th>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الخصم</th>
                    <th>الإجمالي</th>
                    <th>النوع</th>
                </tr>
            </thead>
            <tbody>
                ${detailRows}
            </tbody>
        </table>

        <div class="grand-total-box">
            <span>💰 إجمالي المبيعات للفترة</span>
            <span>${formatMoney(summary.totalSales)} ريال</span>
        </div>

    </div>

    <script>

        window.addEventListener("load", function () {

            if (typeof Chart === "undefined") {
                return;
            }

            const greenShades = [
                "#1f7a4d", "#2f9e63", "#5fb887",
                "#8ccba7", "#155c39", "#3fae74",
                "#7fc79c"
            ];

            new Chart(
                document.getElementById("trendChart"),
                {
                    type: ${type === "year" ? '"bar"' : '"line"'},
                    data: {
                        labels: ${JSON.stringify(trendLabelsForChart)},
                        datasets: [{
                            label: "الإجمالي",
                            data: ${JSON.stringify(trendValues)},
                            backgroundColor: "#1f7a4d",
                            borderColor: "#1f7a4d",
                            tension: 0.3,
                            fill: ${type === "year" ? "false" : "true"},
                            backgroundColor: ${type === "year" ? '"#1f7a4d"' : '"rgba(31,122,77,0.15)"'}
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: ${type === "year" ? '"مقارنة المبيعات بين الأشهر"' : '"اتجاه المبيعات اليومية"'},
                                font: { family: "Cairo", size: 13 }
                            }
                        },
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                }
            );

            new Chart(
                document.getElementById("productChart"),
                {
                    type: "pie",
                    data: {
                        labels: ${JSON.stringify(productChartLabels)},
                        datasets: [{
                            data: ${JSON.stringify(productChartValues)},
                            backgroundColor: greenShades
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: "bottom", labels: { font: { family: "Cairo", size: 10 } } },
                            title: {
                                display: true,
                                text: "أكثر المنتجات مبيعًا",
                                font: { family: "Cairo", size: 13 }
                            }
                        }
                    }
                }
            );

            new Chart(
                document.getElementById("paymentChart"),
                {
                    type: "doughnut",
                    data: {
                        labels: ${JSON.stringify(paymentChartLabels)},
                        datasets: [{
                            data: ${JSON.stringify(paymentChartValues)},
                            backgroundColor: greenShades
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: "bottom", labels: { font: { family: "Cairo", size: 10 } } },
                            title: {
                                display: true,
                                text: "طرق الدفع",
                                font: { family: "Cairo", size: 13 }
                            }
                        }
                    }
                }
            );

        });

    </script>

</body>
</html>
    `;

}
