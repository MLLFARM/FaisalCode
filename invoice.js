/*
    الفاتورة الاحترافية
    ====================

    تعرض فاتورة عملية بيع في نافذة مستقلة
    مصممة للطباعة أو الحفظ كـ PDF مباشرة
    من نافذة الطباعة في المتصفح (نص حقيقي،
    وليس صورة).
*/


const PAYMENT_METHOD_LABELS = {

    cash: "نقدي",

    card: "بطاقة",

    transfer: "تحويل بنكي",

    other: "أخرى"

};


const PAYMENT_STATUS_LABELS = {

    paid: "مدفوعة",

    unpaid: "غير مدفوعة",

    partial: "مدفوعة جزئيًا"

};


/*
    فتح نافذة عرض/طباعة الفاتورة
*/

async function openInvoiceView(
    saleId
) {

    try {

        const sale =
            await dbGet(
                STORES.SALES,
                saleId
            );


        if (!sale) {

            showToast(
                "الفاتورة غير موجودة."
            );

            return;

        }


        const items =
            await dbGetSaleItems(
                saleId
            );


        if (
            items.length === 0
        ) {

            showToast(
                "تفاصيل الفاتورة غير موجودة."
            );

            return;

        }


        const settings =
            await getAllSettings();


        const invoiceWindow =
            window.open(
                "",
                "_blank"
            );


        if (!invoiceWindow) {

            showToast(
                "يرجى السماح بفتح النوافذ المنبثقة لعرض الفاتورة."
            );

            return;

        }


        const html =
            buildInvoiceHtml(
                sale,
                items,
                settings
            );


        invoiceWindow.document.write(
            html
        );


        invoiceWindow.document.close();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء فتح الفاتورة."
        );

    }

}


/*
    بناء صفحة HTML كاملة للفاتورة
*/

function buildInvoiceHtml(
    sale,
    items,
    settings
) {

    const currency =
        settings.currency ||
        "ريال";


    const businessName =
        settings.businessName ||
        "إدارة الاستراحة";


    const logo =
        settings.businessLogo ||
        "";


    const phone =
        settings.businessPhone ||
        "";


    const address =
        settings.businessAddress ||
        "";


    const taxNumber =
        settings.taxNumber ||
        "";


    const thankYouMessage =
        settings.invoiceThankYouMessage ||
        "شكرًا لتعاملكم معنا";


    const invoiceNumber =
        sale.invoiceNumber ||
        sale.saleNumber;


    const invoiceDate =
        formatDateArabic(
            sale.saleDate
        );


    const invoiceTime =
        formatInvoiceTime(
            sale.createdAt
        );


    const paymentMethodLabel =
        PAYMENT_METHOD_LABELS[
            sale.paymentMethod
        ] || "نقدي";


    const paymentStatusLabel =
        PAYMENT_STATUS_LABELS[
            sale.paymentStatus
        ] || "مدفوعة";


    const isFree =
        sale.saleType === "free";


    const isCancelled =
        Number(sale.cancelled) === 1;


    const subtotal =
        Number(
            sale.subtotal ??
            items.reduce(
                (sum, item) =>
                    sum +
                    (Number(item.quantity) || 0) *
                    (Number(item.unitPrice) || 0),
                0
            )
        );


    const totalDiscount =
        items.reduce(
            (sum, item) =>
                sum +
                (Number(item.discount) || 0),
            0
        );


    const taxRate =
        Number(
            sale.taxRate
        ) || 0;


    const taxAmount =
        Number(
            sale.taxAmount
        ) || 0;


    const grandTotal =
        Number(
            sale.total
        ) || 0;


    const itemsRows =
        items
            .map(
                function (item, index) {

                    return `

                        <tr>
                            <td>${index + 1}</td>
                            <td class="cell-name">${escapeHtml(item.productName)}</td>
                            <td>${formatQuantity(item.quantity)}</td>
                            <td>${escapeHtml(item.unit)}</td>
                            <td>${formatMoney(item.unitPrice)}</td>
                            <td>${formatMoney(item.discount)}</td>
                            <td class="cell-total">${formatMoney(item.total)}</td>
                        </tr>

                    `;

                }
            )
            .join(
                ""
            );


    const customerBlock =
        sale.customerName ||
        sale.customerPhone
            ? `

                <div class="info-box">

                    <h3>بيانات العميل</h3>

                    ${sale.customerName ? `<p><span>الاسم:</span> ${escapeHtml(sale.customerName)}</p>` : ""}

                    ${sale.customerPhone ? `<p><span>الجوال:</span> ${escapeHtml(sale.customerPhone)}</p>` : ""}

                </div>

            `
            : "";


    const notesBlock =
        sale.notes
            ? `

                <div class="notes-box">

                    <h3>ملاحظات</h3>

                    <p>${escapeHtml(sale.notes)}</p>

                </div>

            `
            : "";


    const logoBlock =
        logo
            ? `<img src="${logo}" class="logo" alt="الشعار">`
            : "";


    const taxRowBlock =
        !isFree && taxRate > 0
            ? `

                <div class="total-line">
                    <span>الضريبة (${formatQuantity(taxRate)}%)</span>
                    <span>${formatMoney(taxAmount)} ${escapeHtml(currency)}</span>
                </div>

            `
            : "";


    const discountRowBlock =
        totalDiscount > 0
            ? `

                <div class="total-line">
                    <span>إجمالي الخصم</span>
                    <span>${formatMoney(totalDiscount)} ${escapeHtml(currency)}</span>
                </div>

            `
            : "";


    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>فاتورة ${escapeHtml(invoiceNumber)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
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

    .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 3px solid #1f7a4d;
        padding-bottom: 16px;
        margin-bottom: 20px;
    }

    .business-info {
        display: flex;
        gap: 14px;
        align-items: center;
    }

    .logo {
        width: 64px;
        height: 64px;
        object-fit: contain;
        border-radius: 8px;
    }

    .business-info h1 {
        font-size: 20px;
        margin: 0 0 4px 0;
        color: #1f7a4d;
    }

    .business-info p {
        margin: 2px 0;
        font-size: 12px;
        color: #6b7280;
    }

    .invoice-title-box {
        text-align: left;
    }

    .invoice-title-box h2 {
        margin: 0 0 6px 0;
        font-size: 22px;
        color: #1f7a4d;
    }

    .invoice-title-box p {
        margin: 2px 0;
        font-size: 13px;
        color: #374151;
    }

    .invoice-title-box strong {
        color: #1f2933;
    }

    .badge {
        display: inline-block;
        margin-top: 6px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
    }

    .badge.paid { background: #e6f4ea; color: #1f7a4d; }
    .badge.unpaid { background: #fdecec; color: #c0392b; }
    .badge.partial { background: #fff6df; color: #b7791f; }

    .info-row {
        display: flex;
        gap: 16px;
        margin-bottom: 18px;
        flex-wrap: wrap;
    }

    .info-box {
        flex: 1;
        min-width: 200px;
        background: #f5f8f6;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px 16px;
    }

    .info-box h3 {
        margin: 0 0 8px 0;
        font-size: 13px;
        color: #1f7a4d;
    }

    .info-box p {
        margin: 3px 0;
        font-size: 13px;
    }

    .info-box p span {
        color: #6b7280;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 13px;
    }

    thead th {
        background: #1f7a4d;
        color: white;
        padding: 10px 8px;
        text-align: center;
        font-size: 12px;
    }

    tbody td {
        padding: 9px 8px;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:nth-child(even) {
        background: #f9fafb;
    }

    .cell-name {
        text-align: right;
    }

    .cell-total {
        font-weight: 700;
    }

    .totals-box {
        margin-right: auto;
        width: 280px;
    }

    .total-line {
        display: flex;
        justify-content: space-between;
        padding: 8px 4px;
        font-size: 13px;
        border-bottom: 1px solid #e5e7eb;
    }

    .total-line.grand {
        background: #1f7a4d;
        color: white;
        border-radius: 8px;
        padding: 14px 12px;
        font-size: 17px;
        font-weight: 800;
        margin-top: 8px;
        border-bottom: none;
    }

    .notes-box {
        margin-top: 20px;
        padding: 12px 16px;
        background: #fff9e6;
        border: 1px solid #f5e6b8;
        border-radius: 8px;
        font-size: 13px;
    }

    .notes-box h3 {
        margin: 0 0 6px 0;
        font-size: 13px;
        color: #92730c;
    }

    .thank-you {
        text-align: center;
        margin-top: 30px;
        padding-top: 16px;
        border-top: 1px dashed #cce7d8;
        color: #1f7a4d;
        font-size: 15px;
        font-weight: 700;
    }

    @media print {

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

    }

</style>
</head>
<body>

    <div class="toolbar">
        <button class="print-btn" onclick="window.print()">طباعة / حفظ PDF</button>
        <button class="close-btn" onclick="window.close()">إغلاق</button>
    </div>

    <div class="page">

        <div class="invoice-header">

            <div class="business-info">

                ${logoBlock}

                <div>
                    <h1>${escapeHtml(businessName)}</h1>
                    ${phone ? `<p>هاتف: ${escapeHtml(phone)}</p>` : ""}
                    ${address ? `<p>${escapeHtml(address)}</p>` : ""}
                    ${taxNumber ? `<p>الرقم الضريبي: ${escapeHtml(taxNumber)}</p>` : ""}
                </div>

            </div>

            <div class="invoice-title-box">
                <h2>فاتورة ${isFree ? "(مجانية)" : ""}</h2>
                <p><strong>${escapeHtml(invoiceNumber)}</strong></p>
                <p>التاريخ: ${invoiceDate}</p>
                <p>الوقت: ${invoiceTime}</p>
                <span class="badge ${escapeHtml(sale.paymentStatus || "paid")}">${paymentStatusLabel}</span>
                ${isCancelled ? `<span class="badge unpaid">ملغاة</span>` : ""}
            </div>

        </div>

        ${isCancelled ? `
            <div class="notes-box" style="background:#fdecec;border-color:#f5c6c3;">
                <h3 style="color:#c0392b;">سبب الإلغاء</h3>
                <p>${escapeHtml(sale.cancelReason || "")}</p>
            </div>
        ` : ""}

        <div class="info-row">

            <div class="info-box">
                <h3>تفاصيل الدفع</h3>
                <p><span>طريقة الدفع:</span> ${paymentMethodLabel}</p>
                <p><span>حالة الدفع:</span> ${paymentStatusLabel}</p>
            </div>

            ${customerBlock}

        </div>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>الوحدة</th>
                    <th>سعر الوحدة</th>
                    <th>الخصم</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>

        <div class="totals-box">

            <div class="total-line">
                <span>المجموع الفرعي</span>
                <span>${formatMoney(subtotal)} ${escapeHtml(currency)}</span>
            </div>

            ${discountRowBlock}

            ${taxRowBlock}

            <div class="total-line grand">
                <span>الإجمالي النهائي</span>
                <span>${formatMoney(grandTotal)} ${escapeHtml(currency)}</span>
            </div>

        </div>

        ${notesBlock}

        <div class="thank-you">
            ${escapeHtml(thankYouMessage)}
        </div>

    </div>

</body>
</html>
    `;

}


/*
    تنسيق وقت الفاتورة من createdAt
*/

function formatInvoiceTime(
    isoString
) {

    if (!isoString) {
        return "";
    }


    try {

        const date =
            new Date(
                isoString
            );


        return date.toLocaleTimeString(
            "ar-SA",
            {

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );


    } catch (error) {

        return "";

    }

}
