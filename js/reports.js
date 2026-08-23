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


        if (
            !Number.isFinite(year)
        ) {

            showToast(
                "اختر سنة صحيحة."
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


        let yearComparison =
            null;


        if (type === "year") {

            monthlyMap =
                new Map();


            for (
                let m = 1;
                m <= 12;
                m++
            ) {

                monthlyMap.set(
                    m,
                    {

                        count: 0,

                        quantity: 0,

                        total: 0

                    }
                );

            }


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

                }
            );


            const previousYearSales =
                sales.filter(
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
                );


            const previousYearTotal =
                previousYearSales.reduce(
                    (sum, sale) =>
                        sum +
                        (Number(sale.total) || 0),
                    0
                );


            if (
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

            rows,

            summary,

            productMap,

            dailyMap,

            paymentMethodMap,

            monthlyMap,

            bestDay,

            bestMonth,

            worstMonth,

            yearComparison,

            topProduct,

            averageSaleValue,

            totalDiscount,

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
    عرض التقرير
*/

function renderReportPreview(
    context
) {

    const {
        type,
        year,
        month,
        rows,
        summary,
        productMap,
        dailyMap,
        paymentMethodMap,
        monthlyMap,
        bestDay,
        bestMonth,
        worstMonth,
        yearComparison,
        topProduct,
        averageSaleValue,
        totalDiscount,
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
        type === "month"
            ? `تقرير شهر ${ARABIC_MONTHS[month - 1]} ${year}`
            : `تقرير سنة ${year}`;


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


    detailsBody.innerHTML = "";


    rows.forEach(
        function (entry) {

            const { sale, item } =
                entry;


            const typeText =
                sale.saleType === "free"
                    ? "مجاني"
                    : "بيع";


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHtml(sale.invoiceNumber || sale.saleNumber)}
                </td>

                <td>
                    ${formatDateArabic(sale.saleDate)}
                </td>

                <td>
                    ${escapeHtml(item.productName)}
                </td>

                <td>
                    ${formatQuantity(item.quantity)}
                    ${escapeHtml(item.unit)}
                </td>

                <td>
                    ${formatMoney(item.unitPrice)}
                    ريال
                </td>

                <td>
                    ${formatMoney(item.discount)}
                    ريال
                </td>

                <td>
                    ${formatMoney(sale.total)}
                    ريال
                </td>

                <td>
                    ${typeText}
                </td>

            `;


            detailsBody.appendChild(
                row
            );

        }
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


        const width = 1080;

        const height = 1400;


        const canvas =
            document.createElement(
                "canvas"
            );


        canvas.width =
            width;


        canvas.height =
            height;


        const ctx =
            canvas.getContext(
                "2d"
            );


        /*
            الخلفية (تدرج أخضر)
        */

        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                height
            );


        gradient.addColorStop(
            0,
            "#1f7a4d"
        );


        gradient.addColorStop(
            1,
            "#155c39"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        ctx.direction =
            "rtl";


        ctx.textAlign =
            "center";


        /*
            اسم المنشأة والفترة
        */

        ctx.fillStyle =
            "#ffffff";


        ctx.font =
            "bold 46px Cairo, Tahoma, Arial";


        ctx.fillText(
            context.businessName,
            width / 2,
            90
        );


        const periodTitle =
            context.type === "month"
                ? `تقرير ${ARABIC_MONTHS[context.month - 1]} ${context.year}`
                : `التقرير السنوي ${context.year}`;


        ctx.font =
            "30px Cairo, Tahoma, Arial";


        ctx.fillText(
            periodTitle,
            width / 2,
            145
        );


        /*
            البطاقة البيضاء
        */

        const cardMargin =
            50;


        const cardTop =
            190;


        const cardHeight =
            height - cardTop - 70;


        ctx.fillStyle =
            "#ffffff";


        drawRoundedRect(
            ctx,
            cardMargin,
            cardTop,
            width - cardMargin * 2,
            cardHeight,
            28
        );


        ctx.fill();


        /*
            الإحصائيات داخل البطاقة
        */

        const stats = [

            [
                "💰 إجمالي المبيعات",
                `${formatMoney(context.summary.totalSales)} ريال`
            ],

            [
                "🧾 عدد الفواتير",
                String(context.summary.count)
            ],

            [
                "📦 الكميات المباعة",
                formatQuantity(context.summary.totalQuantity)
            ],

            [
                "📊 متوسط قيمة الفاتورة",
                `${formatMoney(context.averageSaleValue)} ريال`
            ],

            [
                "🏆 أكثر منتج مبيعًا",
                context.topProduct
                    ? context.topProduct.name
                    : "—"
            ],

            [
                "📅 أفضل يوم مبيعات",
                context.bestDay
                    ? formatDateArabic(context.bestDay.date)
                    : "—"
            ]

        ];


        let y =
            cardTop + 90;


        const innerMargin =
            cardMargin + 45;


        stats.forEach(
            function ([label, value], index) {

                ctx.textAlign =
                    "right";


                ctx.fillStyle =
                    "#6b7280";


                ctx.font =
                    "27px Cairo, Tahoma, Arial";


                ctx.fillText(
                    label,
                    width - innerMargin,
                    y
                );


                ctx.fillStyle =
                    "#1f7a4d";


                ctx.font =
                    "bold 34px Cairo, Tahoma, Arial";


                ctx.fillText(
                    value,
                    width - innerMargin,
                    y + 46
                );


                if (
                    index <
                    stats.length - 1
                ) {

                    ctx.strokeStyle =
                        "#e5e7eb";


                    ctx.lineWidth = 1;


                    ctx.beginPath();


                    ctx.moveTo(
                        innerMargin,
                        y + 70
                    );


                    ctx.lineTo(
                        width - innerMargin,
                        y + 70
                    );


                    ctx.stroke();

                }


                y += 165;

            }
        );


        /*
            التذييل
        */

        ctx.textAlign =
            "center";


        ctx.fillStyle =
            "rgba(255,255,255,0.85)";


        ctx.font =
            "22px Cairo, Tahoma, Arial";


        ctx.fillText(
            `تم الإنشاء بتاريخ ${new Date().toLocaleDateString("ar-SA")}`,
            width / 2,
            height - 28
        );


        const fileName =
            context.type === "month"
                ? `ملخص-${context.year}-${String(context.month).padStart(2, "0")}.png`
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
        rows,
        summary,
        productMap,
        dailyMap,
        paymentMethodMap,
        monthlyMap,
        bestDay,
        bestMonth,
        worstMonth,
        yearComparison,
        topProduct,
        averageSaleValue,
        totalDiscount,
        businessName
    } = context;


    const periodTitle =
        type === "month"
            ? `تقرير المبيعات — ${ARABIC_MONTHS[month - 1]} ${year}`
            : `التقرير السنوي للمبيعات — ${year}`;


    const fileTitle =
        type === "month"
            ? `تقرير-${year}-${String(month).padStart(2, "0")}`
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

                <div class="stat-box">
                    <span>أفضل شهر</span>
                    <strong>${bestMonth && bestMonth.total > 0 ? ARABIC_MONTHS[bestMonth.month - 1] : "—"}</strong>
                </div>

                <div class="stat-box">
                    <span>أسوأ شهر</span>
                    <strong>${worstMonth ? ARABIC_MONTHS[worstMonth.month - 1] : "—"}</strong>
                </div>

                <div class="stat-box">
                    <span>مقارنة بالعام السابق</span>
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


    const detailRows =
        rows
            .map(
                function (entry) {

                    const { sale, item } =
                        entry;


                    const typeText =
                        sale.saleType === "free"
                            ? "مجاني"
                            : "بيع";


                    return `

                        <tr>
                            <td>${escapeHtml(sale.invoiceNumber || sale.saleNumber)}</td>
                            <td>${formatDateArabic(sale.saleDate)}</td>
                            <td class="cell-name">${escapeHtml(item.productName)}</td>
                            <td>${formatQuantity(item.quantity)}</td>
                            <td>${formatMoney(item.unitPrice)}</td>
                            <td>${formatMoney(item.discount)}</td>
                            <td>${formatMoney(item.total)}</td>
                            <td>${typeText}</td>
                        </tr>

                    `;

                }
            )
            .join(
                ""
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
        margin: 14mm;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: 'Cairo', Tahoma, sans-serif;
        color: #1f2933;
        margin: 0;
        padding: 0;
        background: #f5f7f6;
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
        background: white;
        padding: 16mm;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .report-header {
        border-bottom: 3px solid #1f7a4d;
        padding-bottom: 16px;
        margin-bottom: 22px;
        text-align: center;
    }

    .report-header h1 {
        margin: 0 0 6px 0;
        font-size: 22px;
        color: #1f7a4d;
    }

    .report-header p {
        margin: 0;
        font-size: 13px;
        color: #6b7280;
    }

    .section-title {
        font-size: 15px;
        font-weight: 700;
        color: #1f7a4d;
        margin: 26px 0 10px 0;
        padding-bottom: 6px;
        border-bottom: 1px solid #e5e7eb;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 10px;
    }

    .stat-box {
        background: #f5f8f6;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
    }

    .stat-box span {
        display: block;
        font-size: 10.5px;
        color: #6b7280;
        margin-bottom: 4px;
    }

    .stat-box strong {
        font-size: 14px;
        color: #1f7a4d;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
        font-size: 12px;
    }

    thead th {
        background: #1f7a4d;
        color: white;
        padding: 8px 6px;
        text-align: center;
        font-size: 11px;
    }

    tbody td {
        padding: 7px 6px;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:nth-child(even) {
        background: #f9fafb;
    }

    .cell-name {
        text-align: right;
    }

    .grand-total-box {
        background: #1f7a4d;
        color: white;
        border-radius: 8px;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
        font-size: 16px;
        font-weight: 800;
    }

    .chart-box {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
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

        <div class="stats-grid">

            <div class="stat-box">
                <span>إجمالي المبيعات</span>
                <strong>${formatMoney(summary.totalSales)} ريال</strong>
            </div>

            <div class="stat-box">
                <span>عدد الفواتير</span>
                <strong>${summary.count}</strong>
            </div>

            <div class="stat-box">
                <span>متوسط قيمة الفاتورة</span>
                <strong>${formatMoney(averageSaleValue)} ريال</strong>
            </div>

            <div class="stat-box">
                <span>إجمالي الكميات المباعة</span>
                <strong>${formatQuantity(summary.totalQuantity)}</strong>
            </div>

            <div class="stat-box">
                <span>أكثر منتج مبيعًا</span>
                <strong>${topProduct ? escapeHtml(topProduct.name) : "—"}</strong>
            </div>

            <div class="stat-box">
                <span>أفضل يوم مبيعات</span>
                <strong>${bestDay ? formatDateArabic(bestDay.date) : "—"}</strong>
            </div>

            <div class="stat-box">
                <span>إجمالي الخصومات</span>
                <strong>${formatMoney(totalDiscount)} ريال</strong>
            </div>

            <div class="stat-box">
                <span>عمليات مجانية</span>
                <strong>${summary.freeCount}</strong>
            </div>

            ${extraYearStatsBlock}

        </div>

        <div class="chart-box">
            <canvas id="trendChart"></canvas>
        </div>

        <div class="section-title">${dailySectionTitle}</div>
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

        <div class="section-title">المبيعات حسب المنتج</div>
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

        <div class="section-title">المبيعات حسب طريقة الدفع</div>
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

        <div class="section-title">سجل جميع عمليات البيع</div>
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
            <span>الإجمالي النهائي للفترة</span>
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
