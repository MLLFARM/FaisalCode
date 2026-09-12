/*
    تصدير Excel احترافي
    ====================

    يبني ملف Excel حقيقي (قابل للتعديل، وليس
    صورة) بعدة أوراق: لوحة تحكم، مبيعات،
    منتجات، مبيعات يومية، مبيعات شهرية.

    يعتمد على مكتبة ExcelJS للتنسيق الكامل
    (ألوان، تجميد صفوف، Auto Filter، تنسيق
    عملة وتواريخ)، وعلى Chart.js لرسم رسوم
    بيانية تُدرج كصور داخل ورقة لوحة التحكم.

    ⚠️ ملاحظة صادقة: صيغة xlsx لا تدعم دمج
    "رسم بياني حي" قابل للتعديل داخل Excel
    عبر مكتبات المتصفح المجانية. لذلك الرسوم
    تُدرج كصور ثابتة (عالية الجودة)، بينما
    بقية الملف (الأرقام والجداول) قابل للتعديل
    بالكامل في Excel كالمعتاد.
*/


const EXCEL_PRIMARY_ARGB =
    "FF1F7A4D";

const EXCEL_PRIMARY_DARK_ARGB =
    "FF155C39";

const EXCEL_LIGHT_FILL_ARGB =
    "FFE9F5EE";

const EXCEL_STRIPE_ARGB =
    "FFF5F8F6";

/*
    لوحة ألوان مناسبة لطبيعة العمل
    الزراعي، تُستخدم لتمييز فئات
    الإحصائيات المختلفة في التقرير
    (مبيعات: أخضر، كمية/منتج: ذهبي،
    مصاريف: طيني، تالف: مرجاني،
    ربح: أزرق مخضر، معلومات: أزرق)
*/

const EXCEL_GOLD_ARGB =
    "FFD4A017";

const EXCEL_GOLD_LIGHT_ARGB =
    "FFFDF3DC";

const EXCEL_TERRACOTTA_ARGB =
    "FFC1622D";

const EXCEL_TERRACOTTA_LIGHT_ARGB =
    "FFFBE9DD";

const EXCEL_CORAL_ARGB =
    "FFD9534F";

const EXCEL_CORAL_LIGHT_ARGB =
    "FFFBE6E3";

const EXCEL_TEAL_ARGB =
    "FF0F766E";

const EXCEL_TEAL_LIGHT_ARGB =
    "FFE2F3F1";

const EXCEL_BLUE_ARGB =
    "FF2F6FB0";

const EXCEL_BLUE_LIGHT_ARGB =
    "FFE6F0FA";

const EXCEL_CURRENCY_FORMAT =
    '#,##0.00 "ريال"';

const EXCEL_QUANTITY_FORMAT =
    "#,##0.###";

const EXCEL_PERCENT_FORMAT =
    '0.00"%"';


/*
    تصدير التقرير الحالي كملف Excel
*/

async function exportReportToExcel() {

    if (
        !currentReportContext ||
        currentReportContext.rows.length === 0
    ) {

        showToast(
            "أنشئ التقرير أولًا قبل التصدير."
        );

        return;

    }


    if (
        typeof ExcelJS === "undefined" ||
        typeof Chart === "undefined"
    ) {

        showToast(
            "تعذر تحميل أداة تصدير Excel. تأكد من اتصال الإنترنت."
        );

        return;

    }


    const excelButton =
        document.getElementById(
            "excelExportButton"
        );


    const originalText =
        excelButton
            ? excelButton.textContent
            : "";


    try {

        if (excelButton) {

            excelButton.disabled =
                true;


            excelButton.textContent =
                "جارٍ التجهيز...";

        }


        const context =
            currentReportContext;


        const workbook =
            new ExcelJS.Workbook();


        workbook.creator =
            context.businessName;


        workbook.created =
            new Date();


        await buildDashboardSheet(
            workbook,
            context
        );


        buildSalesSheet(
            workbook,
            context
        );


        buildProductsSheet(
            workbook,
            context
        );


        buildDailySheet(
            workbook,
            context
        );


        await buildMonthlySheet(
            workbook,
            context
        );


        await buildExpensesSheet(
            workbook,
            context
        );


        await buildWasteSheet(
            workbook,
            context
        );


        const buffer =
            await workbook.xlsx.writeBuffer();


        const blob =
            new Blob(
                [buffer],
                {

                    type:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        const fileName =
            context.type === "month"
                ? `تقرير-${context.year}-${String(context.month).padStart(2, "0")}.xlsx`
                : context.type === "custom"
                    ? `تقرير-${context.year}-اشهر-مختارة.xlsx`
                    : `تقرير-${context.year}.xlsx`;


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
            "تم تصدير ملف Excel بنجاح."
        );


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تصدير ملف Excel."
        );

    } finally {

        if (excelButton) {

            excelButton.disabled =
                false;


            excelButton.textContent =
                originalText ||
                "تصدير Excel";

        }

    }

}


/*
    تنسيق صف العناوين
*/

function styleHeaderRow(
    row
) {

    row.eachCell(
        function (cell) {

            cell.font = {

                bold: true,

                color: {

                    argb:
                        "FFFFFFFF"

                }

            };


            cell.fill = {

                type:
                    "pattern",

                pattern:
                    "solid",

                fgColor: {

                    argb:
                        EXCEL_PRIMARY_ARGB

                }

            };


            cell.alignment = {

                horizontal:
                    "center",

                vertical:
                    "middle"

            };


            cell.border = {

                top: {

                    style:
                        "thin",

                    color: {

                        argb:
                            EXCEL_PRIMARY_DARK_ARGB

                    }

                },

                bottom: {

                    style:
                        "thin",

                    color: {

                        argb:
                            EXCEL_PRIMARY_DARK_ARGB

                    }

                }

            };

        }
    );


    row.height = 22;

}


/*
    تلوين الصفوف بالتناوب
*/

function zebraStripe(
    sheet
) {

    sheet.eachRow(
        function (row, rowNumber) {

            if (rowNumber === 1) {
                return;
            }


            row.alignment = {

                horizontal:
                    "center"

            };


            if (
                rowNumber % 2 === 0
            ) {

                row.eachCell(
                    function (cell) {

                        cell.fill = {

                            type:
                                "pattern",

                            pattern:
                                "solid",

                            fgColor: {

                                argb:
                                    EXCEL_STRIPE_ARGB

                            }

                        };

                    }
                );

            }

        }
    );

}


/*
    رسم مخطط Chart.js على قماشة مخفية
    وتحويله إلى صورة PNG (لا يُعرض على
    الشاشة، فقط يُستخدم للتصدير)
*/

function renderChartToImage(
    config,
    width,
    height
) {

    return new Promise(
        function (resolve) {

            const canvas =
                document.createElement(
                    "canvas"
                );


            canvas.width =
                width;


            canvas.height =
                height;


            const chart =
                new Chart(
                    canvas,
                    {

                        type:
                            config.type,

                        data:
                            config.data,

                        options:
                            Object.assign(
                                {

                                    responsive: false,

                                    animation: false

                                },
                                config.options ||
                                {}
                            )

                    }
                );


            requestAnimationFrame(
                function () {

                    requestAnimationFrame(
                        function () {

                            const dataUrl =
                                canvas.toDataURL(
                                    "image/png"
                                );


                            chart.destroy();


                            resolve(
                                dataUrl
                            );

                        }
                    );

                }
            );

        }
    );

}


/*
    ورقة "لوحة التحكم"
*/

async function buildDashboardSheet(
    workbook,
    context
) {

    const sheet =
        workbook.addWorksheet(
            "لوحة التحكم"
        );


    sheet.columns = [

        { width: 4 },
        { width: 28 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        { width: 20 }

    ];


    sheet.mergeCells(
        "B2:F2"
    );


    const titleCell =
        sheet.getCell(
            "B2"
        );


    titleCell.value =
        context.businessName;


    titleCell.font = {

        size: 18,

        bold: true,

        color: {

            argb:
                EXCEL_PRIMARY_ARGB

        }

    };


    titleCell.alignment = {

        horizontal:
            "center"

    };


    sheet.mergeCells(
        "B3:F3"
    );


    const periodTitle =
        context.type === "month"
            ? `تقرير المبيعات — ${ARABIC_MONTHS[context.month - 1]} ${context.year}`
            : `التقرير السنوي للمبيعات — ${context.year}`;


    const subCell =
        sheet.getCell(
            "B3"
        );


    subCell.value =
        periodTitle;


    subCell.font = {

        size: 13,

        color: {

            argb:
                "FF6B7280"

        }

    };


    subCell.alignment = {

        horizontal:
            "center"

    };


    const kpis = [

        [
            "إجمالي المبيعات",
            `${formatMoney(context.summary.totalSales)} ريال`,
            EXCEL_PRIMARY_ARGB,
            EXCEL_LIGHT_FILL_ARGB
        ],

        [
            "عدد الفواتير",
            context.summary.count,
            EXCEL_BLUE_ARGB,
            EXCEL_BLUE_LIGHT_ARGB
        ],

        [
            "متوسط قيمة الفاتورة",
            `${formatMoney(context.averageSaleValue)} ريال`,
            EXCEL_PRIMARY_ARGB,
            EXCEL_LIGHT_FILL_ARGB
        ],

        [
            "إجمالي الكميات المباعة",
            formatQuantity(context.summary.totalQuantity),
            EXCEL_GOLD_ARGB,
            EXCEL_GOLD_LIGHT_ARGB
        ],

        [
            "أكثر منتج مبيعًا",
            context.topProduct
                ? context.topProduct.name
                : "—",
            EXCEL_GOLD_ARGB,
            EXCEL_GOLD_LIGHT_ARGB
        ],

        [
            "أفضل يوم مبيعات",
            context.bestDay
                ? formatDateArabic(context.bestDay.date)
                : "—",
            EXCEL_BLUE_ARGB,
            EXCEL_BLUE_LIGHT_ARGB
        ],

        [
            "إجمالي الخصومات",
            `${formatMoney(context.totalDiscount)} ريال`,
            EXCEL_TERRACOTTA_ARGB,
            EXCEL_TERRACOTTA_LIGHT_ARGB
        ],

        [
            "عمليات مجانية",
            context.summary.freeCount,
            EXCEL_BLUE_ARGB,
            EXCEL_BLUE_LIGHT_ARGB
        ],

        [
            "إجمالي المصاريف",
            `${formatMoney(context.totalExpenses)} ريال`,
            EXCEL_TERRACOTTA_ARGB,
            EXCEL_TERRACOTTA_LIGHT_ARGB
        ],

        [
            "قيمة التالف",
            `${formatMoney(context.totalWasteValue)} ريال`,
            EXCEL_CORAL_ARGB,
            EXCEL_CORAL_LIGHT_ARGB
        ],

        [
            "عدد عمليات التالف",
            context.wasteEntryCount,
            EXCEL_CORAL_ARGB,
            EXCEL_CORAL_LIGHT_ARGB
        ],

        [
            "صافي الربح",
            `${formatMoney(context.netProfit)} ريال`,
            EXCEL_TEAL_ARGB,
            EXCEL_TEAL_LIGHT_ARGB
        ]

    ];


    let row = 5;


    kpis.forEach(
        function ([label, value, accentColor, lightColor]) {

            const labelCell =
                sheet.getCell(
                    `B${row}`
                );


            labelCell.value =
                label;


            labelCell.font = {

                bold: true,

                color: {

                    argb:
                        "FFFFFFFF"

                }

            };


            labelCell.fill = {

                type:
                    "pattern",

                pattern:
                    "solid",

                fgColor: {

                    argb:
                        accentColor

                }

            };


            labelCell.alignment = {

                horizontal:
                    "right",

                vertical:
                    "middle",

                indent: 1

            };


            sheet.mergeCells(
                `C${row}:D${row}`
            );


            const valueCell =
                sheet.getCell(
                    `C${row}`
                );


            valueCell.value =
                value;


            valueCell.font = {

                bold: true,

                color: {

                    argb:
                        accentColor

                }

            };


            valueCell.fill = {

                type:
                    "pattern",

                pattern:
                    "solid",

                fgColor: {

                    argb:
                        lightColor

                }

            };


            valueCell.alignment = {

                horizontal:
                    "center",

                vertical:
                    "middle"

            };


            row += 1;

        }
    );


    row += 1;


    sheet.getCell(
        `B${row}`
    ).value =
        "المبيعات حسب طريقة الدفع";


    sheet.getCell(
        `B${row}`
    ).font = {

        bold: true,

        size: 13,

        color: {

            argb:
                EXCEL_PRIMARY_ARGB

        }

    };


    row += 1;


    [
        "طريقة الدفع",
        "عدد الفواتير",
        "الإجمالي"
    ].forEach(
        function (label, index) {

            const cell =
                sheet.getCell(
                    row,
                    2 + index
                );


            cell.value =
                label;


            cell.font = {

                bold: true,

                color: {

                    argb:
                        "FFFFFFFF"

                }

            };


            cell.fill = {

                type:
                    "pattern",

                pattern:
                    "solid",

                fgColor: {

                    argb:
                        EXCEL_PRIMARY_ARGB

                }

            };


            cell.alignment = {

                horizontal:
                    "center"

            };

        }
    );


    row += 1;


    Array.from(
        context.paymentMethodMap.entries()
    )
        .sort(
            (a, b) =>
                b[1].total - a[1].total
        )
        .forEach(
            function ([method, data]) {

                sheet.getCell(
                    row,
                    2
                ).value =
                    PAYMENT_METHOD_LABELS[method] ||
                    method;


                sheet.getCell(
                    row,
                    3
                ).value =
                    data.count;


                const totalCell =
                    sheet.getCell(
                        row,
                        4
                    );


                totalCell.value =
                    data.total;


                totalCell.numFmt =
                    EXCEL_CURRENCY_FORMAT;


                row += 1;

            }
        );


    row += 2;


    try {

        const trendLabels =
            context.type === "year"
                ? ARABIC_MONTHS
                : Array.from(
                    context.dailyMap.keys()
                ).sort();


        const trendValues =
            context.type === "year"
                ? Array.from(
                    { length: 12 },
                    (_, i) =>
                        context.monthlyMap?.get(i + 1)?.total ||
                        0
                )
                : trendLabels.map(
                    date =>
                        context.dailyMap.get(date)?.total ||
                        0
                );


        const trendLabelsDisplay =
            context.type === "year"
                ? trendLabels
                : trendLabels.map(
                    date =>
                        formatDateArabic(date)
                );


        const trendImage =
            await renderChartToImage(
                {

                    type:
                        context.type === "year"
                            ? "bar"
                            : "line",

                    data: {

                        labels:
                            trendLabelsDisplay,

                        datasets: [
                            {

                                label:
                                    "الإجمالي",

                                data:
                                    trendValues,

                                backgroundColor:
                                    "#1f7a4d",

                                borderColor:
                                    "#1f7a4d",

                                fill:
                                    context.type !== "year"

                            }
                        ]

                    },

                    options: {

                        plugins: {

                            legend: {

                                display: false

                            }

                        }

                    }

                },
                700,
                320
            );


        const trendImageId =
            workbook.addImage(
                {

                    base64:
                        trendImage.split(",")[1],

                    extension:
                        "png"

                }
            );


        sheet.addImage(
            trendImageId,
            {

                tl: {

                    col: 1,

                    row: row - 1

                },

                ext: {

                    width: 500,

                    height: 230

                }

            }
        );


        row += 14;


        const topProducts =
            Array.from(
                context.productMap.entries()
            )
                .sort(
                    (a, b) =>
                        b[1].total - a[1].total
                )
                .slice(
                    0,
                    6
                );


        const productImage =
            await renderChartToImage(
                {

                    type:
                        "pie",

                    data: {

                        labels:
                            topProducts.map(
                                ([name]) => name
                            ),

                        datasets: [
                            {

                                data:
                                    topProducts.map(
                                        ([, d]) => d.total
                                    ),

                                backgroundColor: [

                                    "#1f7a4d",
                                    "#2f9e63",
                                    "#5fb887",
                                    "#8ccba7",
                                    "#155c39",
                                    "#3fae74"

                                ]

                            }
                        ]

                    },

                    options: {

                        plugins: {

                            legend: {

                                position:
                                    "bottom"

                            }

                        }

                    }

                },
                500,
                320
            );


        const productImageId =
            workbook.addImage(
                {

                    base64:
                        productImage.split(",")[1],

                    extension:
                        "png"

                }
            );


        sheet.addImage(
            productImageId,
            {

                tl: {

                    col: 1,

                    row: row - 1

                },

                ext: {

                    width: 380,

                    height: 230

                }

            }
        );


    } catch (error) {

        console.error(
            "تعذر رسم الرسوم البيانية داخل Excel.",
            error
        );

    }


    sheet.views = [

        {

            rightToLeft: true,

            state:
                "frozen",

            ySplit: 4

        }

    ];

}


/*
    ورقة "المبيعات"
    (صف واحد لكل صنف ضمن كل فاتورة)
*/

function buildSalesSheet(
    workbook,
    context
) {

    const sheet =
        workbook.addWorksheet(
            "المبيعات",
            {

                views: [

                    {

                        rightToLeft: true,

                        state:
                            "frozen",

                        ySplit: 1

                    }

                ]

            }
        );


    sheet.columns = [

        { header: "رقم الفاتورة", key: "invoiceNumber", width: 16 },
        { header: "التاريخ", key: "date", width: 12 },
        { header: "الوقت", key: "time", width: 10 },
        { header: "العميل", key: "customer", width: 18 },
        { header: "جوال العميل", key: "customerPhone", width: 14 },
        { header: "المنتج", key: "product", width: 22 },
        { header: "الوحدة", key: "unit", width: 10 },
        { header: "الكمية", key: "quantity", width: 10 },
        { header: "سعر الوحدة", key: "unitPrice", width: 12 },
        { header: "الخصم", key: "discount", width: 10 },
        { header: "إجمالي الصنف", key: "itemTotal", width: 14 },
        { header: "نسبة الضريبة %", key: "taxRate", width: 12 },
        { header: "الضريبة", key: "tax", width: 12 },
        { header: "إجمالي الفاتورة", key: "invoiceTotal", width: 14 },
        { header: "طريقة الدفع", key: "paymentMethod", width: 12 },
        { header: "حالة الدفع", key: "paymentStatus", width: 14 },
        { header: "نوع العملية", key: "saleType", width: 12 }

    ];


    styleHeaderRow(
        sheet.getRow(1)
    );


    context.rows.forEach(
        function (entry) {

            const { sale, item } =
                entry;


            sheet.addRow(
                {

                    invoiceNumber:
                        sale.invoiceNumber ||
                        sale.saleNumber,

                    date:
                        sale.saleDate,

                    time:
                        formatInvoiceTime(sale.createdAt),

                    customer:
                        sale.customerName ||
                        "",

                    customerPhone:
                        sale.customerPhone ||
                        "",

                    product:
                        item.productName,

                    unit:
                        item.unit,

                    quantity:
                        Number(item.quantity) ||
                        0,

                    unitPrice:
                        Number(item.unitPrice) ||
                        0,

                    discount:
                        Number(item.discount) ||
                        0,

                    itemTotal:
                        Number(item.total) ||
                        0,

                    taxRate:
                        Number(sale.taxRate) ||
                        0,

                    tax:
                        Number(sale.taxAmount) ||
                        0,

                    invoiceTotal:
                        Number(sale.total) ||
                        0,

                    paymentMethod:
                        PAYMENT_METHOD_LABELS[sale.paymentMethod] ||
                        sale.paymentMethod,

                    paymentStatus:
                        PAYMENT_STATUS_LABELS[sale.paymentStatus] ||
                        sale.paymentStatus,

                    saleType:
                        sale.saleType === "free"
                            ? "مجاني"
                            : "بيع"

                }
            );

        }
    );


    [
        "unitPrice",
        "discount",
        "itemTotal",
        "tax",
        "invoiceTotal"
    ].forEach(
        function (key) {

            sheet.getColumn(key).numFmt =
                EXCEL_CURRENCY_FORMAT;

        }
    );


    sheet.getColumn(
        "quantity"
    ).numFmt =
        EXCEL_QUANTITY_FORMAT;


    sheet.getColumn(
        "taxRate"
    ).numFmt =
        EXCEL_PERCENT_FORMAT;


    sheet.autoFilter = {

        from: "A1",

        to: {

            row: 1,

            column: 17

        }

    };


    zebraStripe(
        sheet
    );

}


/*
    ورقة "المنتجات"
*/

function buildProductsSheet(
    workbook,
    context
) {

    const sheet =
        workbook.addWorksheet(
            "المنتجات",
            {

                views: [

                    {

                        rightToLeft: true,

                        state:
                            "frozen",

                        ySplit: 1

                    }

                ]

            }
        );


    sheet.columns = [

        { header: "اسم المنتج", key: "name", width: 26 },
        { header: "إجمالي الكمية المباعة", key: "quantity", width: 18 },
        { header: "عدد الفواتير", key: "count", width: 14 },
        { header: "إجمالي الإيرادات", key: "total", width: 18 },
        { header: "متوسط السعر", key: "avgPrice", width: 14 },
        { header: "نسبة المساهمة %", key: "share", width: 16 }

    ];


    styleHeaderRow(
        sheet.getRow(1)
    );


    Array.from(
        context.productMap.entries()
    )
        .sort(
            (a, b) =>
                b[1].total - a[1].total
        )
        .forEach(
            function ([name, data]) {

                const avgPrice =
                    data.quantity > 0
                        ? data.total / data.quantity
                        : 0;


                const share =
                    context.summary.totalSales > 0
                        ? (data.total / context.summary.totalSales) * 100
                        : 0;


                sheet.addRow(
                    {

                        name,

                        quantity:
                            data.quantity,

                        count:
                            data.count,

                        total:
                            data.total,

                        avgPrice,

                        share

                    }
                );

            }
        );


    sheet.getColumn(
        "total"
    ).numFmt =
        EXCEL_CURRENCY_FORMAT;


    sheet.getColumn(
        "avgPrice"
    ).numFmt =
        EXCEL_CURRENCY_FORMAT;


    sheet.getColumn(
        "share"
    ).numFmt =
        EXCEL_PERCENT_FORMAT;


    sheet.getColumn(
        "quantity"
    ).numFmt =
        EXCEL_QUANTITY_FORMAT;


    sheet.autoFilter = {

        from: "A1",

        to: {

            row: 1,

            column: 6

        }

    };


    zebraStripe(
        sheet
    );

}


/*
    ورقة "المبيعات اليومية"
*/

function buildDailySheet(
    workbook,
    context
) {

    const sheet =
        workbook.addWorksheet(
            "المبيعات اليومية",
            {

                views: [

                    {

                        rightToLeft: true,

                        state:
                            "frozen",

                        ySplit: 1

                    }

                ]

            }
        );


    sheet.columns = [

        { header: "التاريخ", key: "date", width: 14 },
        { header: "عدد الفواتير", key: "count", width: 14 },
        { header: "الكمية", key: "quantity", width: 12 },
        { header: "الإجمالي", key: "total", width: 16 }

    ];


    styleHeaderRow(
        sheet.getRow(1)
    );


    Array.from(
        context.dailyMap.entries()
    )
        .sort(
            (a, b) =>
                a[0].localeCompare(b[0])
        )
        .forEach(
            function ([date, data]) {

                sheet.addRow(
                    {

                        date,

                        count:
                            data.count,

                        quantity:
                            data.quantity,

                        total:
                            data.total

                    }
                );

            }
        );


    sheet.getColumn(
        "total"
    ).numFmt =
        EXCEL_CURRENCY_FORMAT;


    sheet.getColumn(
        "quantity"
    ).numFmt =
        EXCEL_QUANTITY_FORMAT;


    sheet.autoFilter = {

        from: "A1",

        to: {

            row: 1,

            column: 4

        }

    };


    zebraStripe(
        sheet
    );

}


/*
    ورقة "المبيعات الشهرية"

    تُبنى دائمًا لكامل سنة التقرير (حتى
    لو كان التقرير المعروض شهريًا)، حتى
    يبقى ملف Excel متسقًا وشاملًا كما هو
    متوقع من قالب تصدير احترافي.
*/

async function buildMonthlySheet(
    workbook,
    context
) {

    const sheet =
        workbook.addWorksheet(
            "المبيعات الشهرية",
            {

                views: [

                    {

                        rightToLeft: true,

                        state:
                            "frozen",

                        ySplit: 1

                    }

                ]

            }
        );


    sheet.columns = [

        { header: "الشهر", key: "month", width: 16 },
        { header: "عدد الفواتير", key: "count", width: 14 },
        { header: "الكمية", key: "quantity", width: 12 },
        { header: "الإجمالي", key: "total", width: 16 }

    ];


    styleHeaderRow(
        sheet.getRow(1)
    );


    let monthlyMap =
        context.monthlyMap;


    if (!monthlyMap) {

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


        const sales =
            await dbGetAll(
                STORES.SALES
            );


        const itemsBySale =
            await loadSaleItemsGroupedBySale();


        sales
            .filter(
                sale =>
                    Number(
                        String(sale.saleDate).split("-")[0]
                    ) === context.year &&
                    Number(sale.cancelled) !== 1
            )
            .forEach(
                function (sale) {

                    const monthNumber =
                        Number(
                            String(sale.saleDate).split("-")[1]
                        );


                    const data =
                        monthlyMap.get(
                            monthNumber
                        );


                    if (!data) {
                        return;
                    }


                    data.count += 1;


                    data.total +=
                        Number(sale.total) ||
                        0;


                    const items =
                        itemsBySale.get(
                            Number(sale.id)
                        ) || [];


                    items.forEach(
                        function (item) {

                            data.quantity +=
                                Number(item.quantity) ||
                                0;

                        }
                    );

                }
            );

    }


    Array.from(
        monthlyMap.entries()
    )
        .sort(
            (a, b) => a[0] - b[0]
        )
        .forEach(
            function ([monthNumber, data]) {

                sheet.addRow(
                    {

                        month:
                            ARABIC_MONTHS[monthNumber - 1],

                        count:
                            data.count,

                        quantity:
                            data.quantity,

                        total:
                            data.total

                    }
                );

            }
        );


    sheet.getColumn(
        "total"
    ).numFmt =
        EXCEL_CURRENCY_FORMAT;


    sheet.getColumn(
        "quantity"
    ).numFmt =
        EXCEL_QUANTITY_FORMAT;


    sheet.autoFilter = {

        from: "A1",

        to: {

            row: 1,

            column: 4

        }

    };


    zebraStripe(
        sheet
    );

}


/*
    ورقة "المصاريف"
    (سجلات المصاريف ضمن فترة التقرير)
*/

async function buildExpensesSheet(
    workbook,
    context
) {

    const sheet =
        workbook.addWorksheet(
            "المصاريف",
            {

                views: [

                    {

                        rightToLeft: true,

                        state:
                            "frozen",

                        ySplit: 1

                    }

                ]

            }
        );


    sheet.columns = [

        { header: "التاريخ", key: "date", width: 14 },
        { header: "التصنيف", key: "category", width: 20 },
        { header: "المبلغ", key: "amount", width: 16 },
        { header: "ملاحظات", key: "notes", width: 30 }

    ];


    styleHeaderRow(
        sheet.getRow(1)
    );


    const allExpenses =
        await dbGetAll(
            STORES.EXPENSES
        );


    const periodExpenses =
        allExpenses
            .filter(
                function (expense) {

                    const parts =
                        String(expense.date).split("-");


                    if (
                        Number(parts[0]) !== context.year
                    ) {

                        return false;

                    }


                    if (
                        context.type === "month" &&
                        Number(parts[1]) !== context.month
                    ) {

                        return false;

                    }


                    if (
                        context.type === "custom" &&
                        !(context.selectedMonths || []).includes(
                            Number(parts[1])
                        )
                    ) {

                        return false;

                    }



                    return true;

                }
            )
            .sort(
                (a, b) =>
                    String(a.date).localeCompare(String(b.date))
            );


    periodExpenses.forEach(
        function (expense) {

            sheet.addRow(
                {

                    date:
                        expense.date,

                    category:
                        expense.category,

                    amount:
                        Number(expense.amount) || 0,

                    notes:
                        expense.notes || ""

                }
            );

        }
    );


    sheet.getColumn(
        "amount"
    ).numFmt =
        EXCEL_CURRENCY_FORMAT;


    sheet.autoFilter = {

        from: "A1",

        to: {

            row: 1,

            column: 4

        }

    };


    zebraStripe(
        sheet
    );

}


/*
    ورقة "الرجيع والتالف"
    (سجلات الرجيع/التالف ضمن فترة التقرير)
*/

async function buildWasteSheet(
    workbook,
    context
) {

    const sheet =
        workbook.addWorksheet(
            "الرجيع والتالف",
            {

                views: [

                    {

                        rightToLeft: true,

                        state:
                            "frozen",

                        ySplit: 1

                    }

                ]

            }
        );


    sheet.columns = [

        { header: "التاريخ", key: "date", width: 14 },
        { header: "المنتج", key: "product", width: 22 },
        { header: "الكمية", key: "quantity", width: 12 },
        { header: "النوع", key: "type", width: 20 },
        { header: "قيمة الوحدة", key: "unitValue", width: 14 },
        { header: "القيمة الإجمالية", key: "totalValue", width: 16 },
        { header: "ملاحظات", key: "notes", width: 30 }

    ];


    styleHeaderRow(
        sheet.getRow(1)
    );


    const allWaste =
        await dbGetAll(
            STORES.WASTE_LOG
        );


    const periodWaste =
        allWaste
            .filter(
                function (entry) {

                    const parts =
                        String(entry.date).split("-");


                    if (
                        Number(parts[0]) !== context.year
                    ) {

                        return false;

                    }


                    if (
                        context.type === "month" &&
                        Number(parts[1]) !== context.month
                    ) {

                        return false;

                    }


                    if (
                        context.type === "custom" &&
                        !(context.selectedMonths || []).includes(
                            Number(parts[1])
                        )
                    ) {

                        return false;

                    }



                    return true;

                }
            )
            .sort(
                (a, b) =>
                    String(a.date).localeCompare(String(b.date))
            );


    periodWaste.forEach(
        function (entry) {

            sheet.addRow(
                {

                    date:
                        entry.date,

                    product:
                        entry.productName,

                    quantity:
                        Number(entry.quantity) || 0,

                    type:
                        WASTE_TYPE_LABELS[entry.wasteType] ||
                        entry.wasteType,

                    unitValue:
                        Number(entry.unitValue) || 0,

                    totalValue:
                        Number(entry.totalValue) || 0,

                    notes:
                        entry.notes || ""

                }
            );

        }
    );


    sheet.getColumn(
        "unitValue"
    ).numFmt =
        EXCEL_CURRENCY_FORMAT;


    sheet.getColumn(
        "totalValue"
    ).numFmt =
        EXCEL_CURRENCY_FORMAT;


    sheet.getColumn(
        "quantity"
    ).numFmt =
        EXCEL_QUANTITY_FORMAT;


    sheet.autoFilter = {

        from: "A1",

        to: {

            row: 1,

            column: 7

        }

    };


    zebraStripe(
        sheet
    );

}
