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


    if (rows.length === 0) {

        if (printArea) {

            printArea.style.display =
                "none";

        }


        if (downloadButton) {

            downloadButton.style.display =
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
                    ${escapeHtml(sale.saleNumber)}
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
    تنزيل التقرير كملف PDF

    نعتمد على html2canvas لالتقاط صورة
    من عنصر التقرير كما يظهر في الصفحة
    (بنفس التنسيق العربي RTL الصحيح)، ثم
    ندرج الصورة داخل ملف PDF عبر jsPDF،
    مع تقسيمها على عدة صفحات إذا لزم الأمر.
*/

async function downloadReportPdf() {

    if (
        !currentReportContext ||
        currentReportContext.rows.length === 0
    ) {

        showToast(
            "أنشئ التقرير أولًا قبل التنزيل."
        );

        return;

    }


    const printArea =
        document.getElementById(
            "reportPrintArea"
        );


    if (!printArea) {
        return;
    }


    if (
        typeof html2canvas !== "function" ||
        !window.jspdf
    ) {

        showToast(
            "تعذر تحميل أداة تصدير PDF. تأكد من اتصال الإنترنت."
        );

        return;

    }


    const downloadButton =
        document.getElementById(
            "downloadReportButton"
        );


    const originalButtonText =
        downloadButton
            ? downloadButton.textContent
            : "";


    try {

        if (downloadButton) {

            downloadButton.disabled =
                true;


            downloadButton.textContent =
                "جارٍ التجهيز...";

        }


        const canvas =
            await html2canvas(
                printArea,
                {

                    scale: 2,

                    backgroundColor:
                        "#ffffff",

                    useCORS: true

                }
            );


        const { jsPDF } =
            window.jspdf;


        const pdf =
            new jsPDF({

                orientation:
                    "portrait",

                unit: "mm",

                format: "a4"

            });


        const pageWidth =
            pdf.internal
                .pageSize
                .getWidth();


        const pageHeight =
            pdf.internal
                .pageSize
                .getHeight();


        const imageWidth =
            pageWidth;


        const imageHeight =
            (canvas.height * imageWidth) /
            canvas.width;


        const imageData =
            canvas.toDataURL(
                "image/png"
            );


        let heightLeft =
            imageHeight;


        let position = 0;


        pdf.addImage(
            imageData,
            "PNG",
            0,
            position,
            imageWidth,
            imageHeight
        );


        heightLeft -=
            pageHeight;


        while (heightLeft > 0) {

            position =
                heightLeft - imageHeight;


            pdf.addPage();


            pdf.addImage(
                imageData,
                "PNG",
                0,
                position,
                imageWidth,
                imageHeight
            );


            heightLeft -=
                pageHeight;

        }


        const {
            type,
            year,
            month
        } = currentReportContext;


        const fileName =
            type === "month"
                ? `تقرير-${year}-${String(month).padStart(2, "0")}.pdf`
                : `تقرير-${year}.pdf`;


        pdf.save(fileName);


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر إنشاء ملف PDF."
        );

    } finally {

        if (downloadButton) {

            downloadButton.disabled =
                false;


            downloadButton.textContent =
                originalButtonText ||
                "تنزيل PDF";

        }

    }

}
