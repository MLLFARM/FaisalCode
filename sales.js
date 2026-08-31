/*
    إدارة المبيعات
    ==============

    المرحلة الحالية:
    - تسجيل فاتورة بيع تحوي عدة منتجات
      بنفس التاريخ (سلة أصناف قبل الحفظ)
    - البيع المجاني
    - الخصم لكل صنف
    - حساب الإجمالي
    - رقم الفاتورة
    - تعديل الفاتورة
    - حذف الفاتورة
    - عرض سجل المبيعات
*/


let editingSaleId = null;


/*
    أصناف الفاتورة الحالية قبل الحفظ
    (لا تُحفظ في قاعدة البيانات إلا بعد
    الضغط على "حفظ الفاتورة")
*/

let saleCartItems = [];


/*
    نسخة مخزّنة من كل عمليات البيع
    (بعد آخر تحميل من قاعدة البيانات)
    تُستخدم للتصفية والبحث الفوري
    بدون إعادة الاستعلام من القاعدة
    في كل مرة يبحث فيها المستخدم.
*/

let allSalesCache = [];


/*
    تجميع عناصر كل عمليات البيع دفعة واحدة
    بدل استعلام منفصل لكل عملية (تحسين أداء
    مهم عند تراكم عدد كبير من العمليات).

    تُرجع Map حيث المفتاح هو saleId والقيمة
    مصفوفة عناصر تلك العملية.
*/

async function loadSaleItemsGroupedBySale() {

    const items =
        await dbGetAll(
            STORES.SALE_ITEMS
        );


    const grouped =
        new Map();


    items.forEach(
        function (item) {

            const key =
                Number(
                    item.saleId
                );


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    []
                );

            }


            grouped.get(key).push(
                item
            );

        }
    );


    return grouped;

}


/*
    تهيئة شاشة المبيعات
*/

async function initializeSales() {

    try {

        setSaleDateToToday();

        await loadSaleProducts();

        await loadSales();

        renderSaleCart();

        await updateDashboardSales();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء تجهيز المبيعات."
        );

    }

}


/*
    تعيين تاريخ اليوم
*/

function setSaleDateToToday() {

    const input =
        document.getElementById(
            "saleDate"
        );


    if (!input) {
        return;
    }


    const today =
        getLocalDateString();


    if (!input.value) {

        input.value =
            today;

    }

}


/*
    تاريخ محلي
*/

function getLocalDateString() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/*
    تحميل المنتجات النشطة
    (لإضافتها كأصناف جديدة للفاتورة)
*/

/*
    ذاكرة مؤقتة للمنتجات النشطة
    (تُستخدم لبناء قائمة الاختيار
    وحساب الأسعار الافتراضية)
*/

let saleActiveProductsCache = [];


/*
    تحميل المنتجات النشطة وبناء
    قائمة الاختيار (منتج + زر -/+)
*/

async function loadSaleProducts() {

    const container =
        document.getElementById(
            "saleProductPickerList"
        );


    if (!container) {
        return;
    }


    try {

        const products =
            await dbGetAll(
                STORES.PRODUCTS
            );


        saleActiveProductsCache =
            products
                .filter(
                    product =>
                        Number(
                            product.active
                        ) === 1
                )
                .sort(
                    (a, b) =>
                        String(
                            a.name
                        ).localeCompare(
                            String(
                                b.name
                            ),
                            "ar"
                        )
                );


        renderSaleProductPicker();


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تحميل المنتجات للمبيعات."
        );

    }

}


/*
    عرض قائمة اختيار المنتجات
    (تُبنى من جديد بعد أي بحث أو
    تغيير في السلة)
*/

function renderSaleProductPicker() {

    const container =
        document.getElementById(
            "saleProductPickerList"
        );


    const emptyState =
        document.getElementById(
            "saleProductPickerEmpty"
        );


    if (!container) {
        return;
    }


    const searchQuery =
        document.getElementById(
            "saleProductSearch"
        )?.value.trim().toLowerCase() ||
        "";


    const visibleProducts =
        searchQuery
            ? saleActiveProductsCache.filter(
                product =>
                    String(product.name)
                        .toLowerCase()
                        .includes(searchQuery)
            )
            : saleActiveProductsCache;


    if (
        visibleProducts.length === 0
    ) {

        container.innerHTML = "";


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


    container.innerHTML =
        visibleProducts
            .map(
                function (product) {

                    const cartItem =
                        saleCartItems.find(
                            item =>
                                Number(item.productId) ===
                                Number(product.id)
                        );


                    const quantity =
                        cartItem
                            ? cartItem.quantity
                            : 0;


                    const rowClass =
                        quantity > 0
                            ? "product-pick-row has-quantity"
                            : "product-pick-row";


                    return `

                        <div class="${rowClass}">

                            <div class="product-pick-info">

                                <span class="product-pick-name">
                                    ${escapeHtml(product.name)}
                                </span>

                                <span class="product-pick-meta">
                                    ${formatMoney(product.price)} ريال / ${escapeHtml(product.unit)}
                                </span>

                            </div>

                            <div class="product-pick-stepper">

                                <button
                                    type="button"
                                    class="stepper-btn minus"
                                    onclick="adjustProductQuantity(${product.id}, -1)"
                                >
                                    −
                                </button>

                                <input
                                    type="number"
                                    class="stepper-value"
                                    min="0"
                                    step="0.001"
                                    value="${quantity}"
                                    onchange="setProductQuantityDirect(${product.id}, this.value)"
                                    onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                                >

                                <button
                                    type="button"
                                    class="stepper-btn plus"
                                    onclick="adjustProductQuantity(${product.id}, 1)"
                                >
                                    +
                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join(
                ""
            );

}


/*
    البحث داخل قائمة المنتجات
*/

function filterSaleProductPicker() {

    renderSaleProductPicker();

}


/*
    زيادة/إنقاص كمية منتج بمقدار
    ثابت (من زري -/+)
*/

function adjustProductQuantity(
    productId,
    delta
) {

    const product =
        saleActiveProductsCache.find(
            item =>
                Number(item.id) ===
                Number(productId)
        );


    if (!product) {
        return;
    }


    const existingIndex =
        saleCartItems.findIndex(
            item =>
                Number(item.productId) ===
                Number(productId)
        );


    const currentQuantity =
        existingIndex >= 0
            ? Number(
                saleCartItems[existingIndex].quantity
            )
            : 0;


    const newQuantity =
        Math.max(
            0,
            Math.round(
                (currentQuantity + delta) *
                1000
            ) / 1000
        );


    applyProductQuantity(
        product,
        existingIndex,
        newQuantity
    );

}


/*
    تحديد كمية منتج مباشرة (من حقل
    الإدخال الرقمي بين زري -/+)
*/

function setProductQuantityDirect(
    productId,
    value
) {

    const product =
        saleActiveProductsCache.find(
            item =>
                Number(item.id) ===
                Number(productId)
        );


    if (!product) {
        return;
    }


    const existingIndex =
        saleCartItems.findIndex(
            item =>
                Number(item.productId) ===
                Number(productId)
        );


    const newQuantity =
        Math.max(
            0,
            Number(value) || 0
        );


    applyProductQuantity(
        product,
        existingIndex,
        newQuantity
    );

}


/*
    تطبيق كمية جديدة على سلة الفاتورة
    (إضافة/تعديل/حذف حسب القيمة)
*/

function applyProductQuantity(
    product,
    existingIndex,
    newQuantity
) {

    if (newQuantity <= 0) {

        if (existingIndex >= 0) {

            saleCartItems.splice(
                existingIndex,
                1
            );

        }

    } else if (
        existingIndex >= 0
    ) {

        saleCartItems[existingIndex].quantity =
            newQuantity;

    } else {

        saleCartItems.push(
            {

                productId:
                    product.id,

                productName:
                    product.name,

                unit:
                    product.unit,

                quantity:
                    newQuantity,

                unitPrice:
                    Number(product.price) ||
                    0,

                discount: 0

            }
        );

    }


    renderSaleProductPicker();

    renderSaleCart();

}


/*
    تعديل سعر الوحدة أو الخصم لصنف
    داخل سلة الفاتورة مباشرة (من
    جدول السلة أسفل قائمة الاختيار)
*/

function updateCartItemField(
    index,
    field,
    value
) {

    const item =
        saleCartItems[index];


    if (!item) {
        return;
    }


    item[field] =
        Math.max(
            0,
            Number(value) || 0
        );


    renderSaleCart();

}


/*
    حذف صنف من السلة
    (ويعيد الكمية في قائمة الاختيار
    إلى صفر)
*/

function removeSaleCartItem(
    index
) {

    saleCartItems.splice(
        index,
        1
    );


    renderSaleProductPicker();

    renderSaleCart();

}



function calculateCartItemTotal(
    item,
    saleType
) {

    if (saleType === "free") {

        return 0;

    }


    let total =
        (Number(item.quantity) || 0) *
        (Number(item.unitPrice) || 0) -
        (Number(item.discount) || 0);


    if (total < 0) {

        total = 0;

    }


    return total;

}


/*
    عرض سلة الفاتورة الحالية
    وحساب الإجمالي
*/

function renderSaleCart() {

    const tbody =
        document.getElementById(
            "saleCartTableBody"
        );


    const emptyState =
        document.getElementById(
            "saleCartEmptyState"
        );


    const totalElement =
        document.getElementById(
            "saleTotal"
        );


    const subtotalElement =
        document.getElementById(
            "saleSubtotal"
        );


    const taxAmountElement =
        document.getElementById(
            "saleTaxAmount"
        );


    const taxRowElement =
        document.getElementById(
            "saleTaxRow"
        );


    if (!tbody) {
        return;
    }


    const saleType =
        getSelectedSaleType();


    tbody.innerHTML = "";


    if (
        saleCartItems.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }

    } else {

        if (emptyState) {

            emptyState.style.display =
                "none";

        }

    }


    let invoiceTotal = 0;


    saleCartItems.forEach(
        function (item, index) {

            const itemTotal =
                calculateCartItemTotal(
                    item,
                    saleType
                );


            invoiceTotal +=
                itemTotal;


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHtml(item.productName)}
                </td>

                <td>
                    ${formatQuantity(item.quantity)}
                    ${escapeHtml(item.unit)}
                </td>

                <td>
                    <input
                        type="number"
                        class="cart-inline-input"
                        min="0"
                        step="0.01"
                        value="${item.unitPrice}"
                        onchange="updateCartItemField(${index}, 'unitPrice', this.value)"
                        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        class="cart-inline-input"
                        min="0"
                        step="0.01"
                        value="${item.discount}"
                        ${saleType === "free" ? "disabled" : ""}
                        onchange="updateCartItemField(${index}, 'discount', this.value)"
                        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                    >
                </td>

                <td>
                    <strong>
                        ${formatMoney(itemTotal)}
                        ريال
                    </strong>
                </td>

                <td>

                    <button
                        type="button"
                        class="cart-remove-button"
                        onclick="removeSaleCartItem(${index})"
                    >
                        حذف
                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );


    if (totalElement) {

        const taxRate =
            Number(
                document.getElementById(
                    "saleTaxRate"
                )?.value
            ) || 0;


        const taxAmount =
            saleType === "free"
                ? 0
                : invoiceTotal *
                  (taxRate / 100);


        const grandTotal =
            invoiceTotal +
            taxAmount;


        if (subtotalElement) {

            subtotalElement.textContent =
                `${formatMoney(invoiceTotal)} ريال`;

        }


        if (taxAmountElement) {

            taxAmountElement.textContent =
                `${formatMoney(taxAmount)} ريال`;

        }


        if (taxRowElement) {

            taxRowElement.style.display =
                taxRate > 0 &&
                saleType !== "free"
                    ? "flex"
                    : "none";

        }


        totalElement.textContent =
            `${formatMoney(grandTotal)} ريال`;

    }

}


/*
    تغيير نوع العملية
    (يعيد حساب إجماليات السلة)
*/

function saleTypeChanged() {

    renderSaleCart();

}


/*
    الحصول على نوع العملية
*/

function getSelectedSaleType() {

    return document.querySelector(
        'input[name="saleType"]:checked'
    )?.value || "sale";

}


/*
    إنشاء رقم فاتورة
*/

async function generateSaleNumber(
    dateString
) {

    const sales =
        await dbGetAll(
            STORES.SALES
        );


    const prefix =
        dateString.replaceAll(
            "-",
            ""
        );


    let maxNumber = 0;


    sales.forEach(
        function (sale) {

            if (
                sale.saleNumber &&
                sale.saleNumber.startsWith(
                    `SAL-${prefix}-`
                )
            ) {

                const parts =
                    sale.saleNumber.split(
                        "-"
                    );


                const number =
                    Number(
                        parts[2]
                    );


                if (
                    !Number.isNaN(number) &&
                    number > maxNumber
                ) {

                    maxNumber =
                        number;

                }

            }

        }
    );


    const nextNumber =
        String(
            maxNumber + 1
        ).padStart(
            4,
            "0"
        );


    return `SAL-${prefix}-${nextNumber}`;

}


/*
    إنشاء رقم فاتورة تسلسلي غير قابل
    للتكرار (يعتمد على عدّاد محفوظ في
    الإعدادات، وليس على ترتيب السجلات،
    حتى لا يتكرر رقم بعد حذف فاتورة)
*/

async function generateInvoiceNumber() {

    const current =
        await getSetting(
            "nextInvoiceNumber",
            "1"
        );


    const number =
        Number(current) || 1;


    const formatted =
        `INV-${String(number).padStart(6, "0")}`;


    await setSetting(
        "nextInvoiceNumber",
        String(number + 1),
        { skipSave: true }
    );


    return formatted;

}


/*
    حفظ الفاتورة (بجميع أصنافها)
*/

async function saveSale(
    event
) {

    event.preventDefault();


    try {

        const date =
            document.getElementById(
                "saleDate"
            ).value;


        const notes =
            document.getElementById(
                "saleNotes"
            ).value.trim();


        const customerName =
            document.getElementById(
                "saleCustomerName"
            ).value.trim();


        const customerPhone =
            document.getElementById(
                "saleCustomerPhone"
            ).value.trim();


        const paymentMethod =
            document.getElementById(
                "salePaymentMethod"
            ).value;


        const paymentStatus =
            document.getElementById(
                "salePaymentStatus"
            ).value;


        const taxRate =
            Number(
                document.getElementById(
                    "saleTaxRate"
                ).value
            ) || 0;


        const saleType =
            getSelectedSaleType();


        if (!date) {

            showToast(
                "اختر تاريخ البيع."
            );

            return;

        }


        if (
            saleCartItems.length === 0
        ) {

            showToast(
                "أضف صنفًا واحدًا على الأقل إلى الفاتورة."
            );

            return;

        }


        const now =
            new Date().toISOString();


        const preparedItems =
            saleCartItems.map(
                function (item) {

                    const effectiveDiscount =
                        saleType === "free"
                            ? (Number(item.quantity) || 0) *
                              (Number(item.unitPrice) || 0)
                            : (Number(item.discount) || 0);


                    const total =
                        calculateCartItemTotal(
                            item,
                            saleType
                        );


                    return {

                        productId:
                            item.productId,

                        productName:
                            item.productName,

                        unit:
                            item.unit,

                        quantity:
                            item.quantity,

                        unitPrice:
                            item.unitPrice,

                        discount:
                            effectiveDiscount,

                        total

                    };

                }
            );


        const invoiceTotal =
            preparedItems.reduce(
                (sum, item) =>
                    sum + item.total,
                0
            );


        const taxAmount =
            saleType === "free"
                ? 0
                : invoiceTotal *
                  (taxRate / 100);


        const grandTotal =
            invoiceTotal +
            taxAmount;


        /*
            تعديل فاتورة موجودة
        */

        if (editingSaleId) {

            const existingSale =
                await dbGet(
                    STORES.SALES,
                    editingSaleId
                );


            if (!existingSale) {

                showToast(
                    "الفاتورة غير موجودة."
                );

                return;

            }


            const updatedSale = {

                ...existingSale,

                saleDate:
                    date,

                saleType,

                customerName,

                customerPhone,

                paymentMethod,

                paymentStatus,

                subtotal:
                    invoiceTotal,

                taxRate,

                taxAmount,

                total:
                    grandTotal,

                notes,

                updatedAt:
                    now

            };


            await dbPut(
                STORES.SALES,
                updatedSale,
                { skipSave: true }
            );


            await dbDeleteSaleItems(
                editingSaleId,
                { skipSave: true }
            );


            for (
                const item of preparedItems
            ) {

                await dbAdd(
                    STORES.SALE_ITEMS,
                    {

                        saleId:
                            editingSaleId,

                        saleNumber:
                            existingSale.saleNumber,

                        saleDate:
                            date,

                        productId:
                            item.productId,

                        productName:
                            item.productName,

                        unit:
                            item.unit,

                        quantity:
                            item.quantity,

                        unitPrice:
                            item.unitPrice,

                        discount:
                            item.discount,

                        total:
                            item.total,

                        saleType,

                        notes,

                        createdAt:
                            now,

                        updatedAt:
                            now

                    },
                    { skipSave: true }
                );

            }


            await saveDatabase();


            showToast(
                "تم تعديل الفاتورة."
            );


        } else {

            /*
                فاتورة جديدة
            */

            const saleNumber =
                await generateSaleNumber(
                    date
                );


            const invoiceNumber =
                await generateInvoiceNumber();


            const saleId =
                await dbAdd(
                    STORES.SALES,
                    {

                        saleNumber,

                        invoiceNumber,

                        saleDate:
                            date,

                        saleType,

                        customerName,

                        customerPhone,

                        paymentMethod,

                        paymentStatus,

                        subtotal:
                            invoiceTotal,

                        taxRate,

                        taxAmount,

                        total:
                            grandTotal,

                        notes,

                        createdAt:
                            now,

                        updatedAt:
                            now

                    },
                    { skipSave: true }
                );


            for (
                const item of preparedItems
            ) {

                await dbAdd(
                    STORES.SALE_ITEMS,
                    {

                        saleId,

                        saleNumber,

                        saleDate:
                            date,

                        productId:
                            item.productId,

                        productName:
                            item.productName,

                        unit:
                            item.unit,

                        quantity:
                            item.quantity,

                        unitPrice:
                            item.unitPrice,

                        discount:
                            item.discount,

                        total:
                            item.total,

                        saleType,

                        notes,

                        createdAt:
                            now,

                        updatedAt:
                            now

                    },
                    { skipSave: true }
                );

            }


            await saveDatabase();


            showToast(
                `تم حفظ الفاتورة ${invoiceNumber}`
            );

        }


        await resetSaleForm();

        await loadSales();

        await loadSaleProducts();

        await updateDashboardSales();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء حفظ الفاتورة."
        );

    }

}


/*
    تحميل سجل المبيعات
*/

async function loadSales() {

    const tbody =
        document.getElementById(
            "salesTableBody"
        );


    const emptyState =
        document.getElementById(
            "salesEmptyState"
        );


    if (!tbody) {
        return;
    }


    try {

        const sales =
            await dbGetAll(
                STORES.SALES
            );


        sales.sort(
            function (a, b) {

                if (
                    a.saleDate ===
                    b.saleDate
                ) {

                    return (
                        Number(b.id) -
                        Number(a.id)
                    );

                }


                return (
                    String(
                        b.saleDate
                    ).localeCompare(
                        String(
                            a.saleDate
                        )
                    )
                );

            }
        );


        const itemsBySale =
            await loadSaleItemsGroupedBySale();


        allSalesCache = [];


        sales.forEach(
            function (sale) {

                const items =
                    itemsBySale.get(
                        Number(sale.id)
                    ) || [];


                if (
                    items.length === 0
                ) {

                    return;

                }


                allSalesCache.push(
                    {

                        sale,

                        items

                    }
                );

            }
        );


        applySalesFilters();


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تحميل سجل المبيعات."
        );

    }

}


/*
    قراءة قيم نموذج البحث/التصفية
    وتطبيقها على النسخة المخزّنة محليًا
    (بدون إعادة الاستعلام من القاعدة)
*/

function applySalesFilters() {

    const invoiceQuery =
        document.getElementById(
            "salesFilterInvoice"
        )?.value.trim().toLowerCase() ||
        "";


    const dateFrom =
        document.getElementById(
            "salesFilterDateFrom"
        )?.value ||
        "";


    const dateTo =
        document.getElementById(
            "salesFilterDateTo"
        )?.value ||
        "";


    const productQuery =
        document.getElementById(
            "salesFilterProduct"
        )?.value.trim().toLowerCase() ||
        "";


    const customerQuery =
        document.getElementById(
            "salesFilterCustomer"
        )?.value.trim().toLowerCase() ||
        "";


    const paymentMethod =
        document.getElementById(
            "salesFilterPaymentMethod"
        )?.value ||
        "";


    const amountMin =
        document.getElementById(
            "salesFilterAmountMin"
        )?.value;


    const amountMax =
        document.getElementById(
            "salesFilterAmountMax"
        )?.value;


    const filtered =
        allSalesCache.filter(
            function (entry) {

                const { sale, items } =
                    entry;


                if (
                    invoiceQuery &&
                    !String(
                        sale.invoiceNumber ||
                        sale.saleNumber ||
                        ""
                    )
                        .toLowerCase()
                        .includes(invoiceQuery)
                ) {

                    return false;

                }


                if (
                    dateFrom &&
                    sale.saleDate < dateFrom
                ) {

                    return false;

                }


                if (
                    dateTo &&
                    sale.saleDate > dateTo
                ) {

                    return false;

                }


                if (
                    productQuery &&
                    !items.some(
                        item =>
                            String(item.productName || "")
                                .toLowerCase()
                                .includes(productQuery)
                    )
                ) {

                    return false;

                }


                if (
                    customerQuery &&
                    !String(
                        sale.customerName ||
                        ""
                    )
                        .toLowerCase()
                        .includes(customerQuery)
                ) {

                    return false;

                }


                if (
                    paymentMethod &&
                    (sale.paymentMethod || "cash") !==
                    paymentMethod
                ) {

                    return false;

                }


                if (
                    amountMin &&
                    Number(sale.total) <
                    Number(amountMin)
                ) {

                    return false;

                }


                if (
                    amountMax &&
                    Number(sale.total) >
                    Number(amountMax)
                ) {

                    return false;

                }


                return true;

            }
        );


    renderSalesTable(
        filtered
    );

}


/*
    إعادة تعيين نموذج البحث/التصفية
*/

function resetSalesFilters() {

    const filterForm =
        document.getElementById(
            "salesFilterForm"
        );


    if (filterForm) {

        filterForm.reset();

    }


    applySalesFilters();

}


/*
    عرض سجل المبيعات (بعد التصفية)
*/

function renderSalesTable(
    rows
) {

    const tbody =
        document.getElementById(
            "salesTableBody"
        );


    const emptyState =
        document.getElementById(
            "salesEmptyState"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (
        rows.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }


        updateSalesSummary(
            []
        );

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    rows.forEach(
        function (entry) {

            const { sale, items } =
                entry;


            const row =
                document.createElement(
                    "tr"
                );


            const isCancelled =
                Number(sale.cancelled) === 1;


            if (isCancelled) {

                row.classList.add(
                    "cancelled-row"
                );

            }


            const typeText =
                sale.saleType === "free"
                    ? "مجاني"
                    : "بيع";


            const typeClass =
                sale.saleType === "free"
                    ? "free"
                    : "normal";


            const productsText =
                items
                    .map(
                        item =>
                            `${item.productName} × ${formatQuantity(item.quantity)}`
                    )
                    .join(
                        "، "
                    );


            const totalQuantity =
                items.reduce(
                    (sum, item) =>
                        sum +
                        (Number(item.quantity) || 0),
                    0
                );


            const cancelledBadge =
                isCancelled
                    ? `<span class="sale-type cancelled">ملغاة</span>`
                    : "";


            const actionButtons =
                isCancelled
                    ? `
                        <button
                            class="action-button edit-button"
                            type="button"
                            onclick="openInvoiceView(${sale.id})"
                        >
                            الفاتورة
                        </button>

                        <button
                            class="action-button edit-button"
                            type="button"
                            onclick="restoreSale(${sale.id})"
                        >
                            استعادة
                        </button>

                        <button
                            class="action-button delete-button"
                            type="button"
                            onclick="deleteSale(${sale.id})"
                        >
                            حذف نهائي
                        </button>
                    `
                    : `
                        <button
                            class="action-button edit-button"
                            type="button"
                            onclick="openInvoiceView(${sale.id})"
                        >
                            الفاتورة
                        </button>

                        <button
                            class="action-button edit-button"
                            type="button"
                            onclick="editSale(${sale.id})"
                        >
                            تعديل
                        </button>

                        <button
                            class="action-button warning-button"
                            type="button"
                            onclick="cancelSale(${sale.id})"
                        >
                            إلغاء
                        </button>

                        <button
                            class="action-button delete-button"
                            type="button"
                            onclick="deleteSale(${sale.id})"
                        >
                            حذف
                        </button>
                    `;


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            sale.invoiceNumber ||
                            sale.saleNumber
                        )}
                    </strong>
                    ${cancelledBadge}
                </td>

                <td>
                    ${formatDateArabic(
                        sale.saleDate
                    )}
                </td>

                <td>
                    <span class="product-name">
                        ${escapeHtml(
                            productsText
                        )}
                    </span>
                </td>

                <td>
                    ${formatQuantity(
                        totalQuantity
                    )}
                </td>

                <td>
                    <strong>
                        ${formatMoney(
                            sale.total
                        )}
                        ريال
                    </strong>
                </td>

                <td>
                    <span class="sale-type ${typeClass}">
                        ${typeText}
                    </span>
                </td>

                <td>

                    <div class="actions">

                        ${actionButtons}

                    </div>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );


    updateSalesSummary(
        rows
    );

}


/*
    ملخص المبيعات
*/

function updateSalesSummary(
    rows
) {

    let totalSales = 0;

    let totalQuantity = 0;


    /*
        الفواتير الملغاة تبقى ظاهرة في
        السجل للأرشفة، لكنها لا تُحتسب
        ضمن الإجماليات.
    */

    const activeRows =
        rows.filter(
            entry =>
                Number(entry.sale.cancelled) !== 1
        );


    activeRows.forEach(
        function (entry) {

            totalSales +=
                Number(
                    entry.sale.total
                ) || 0;


            entry.items.forEach(
                function (item) {

                    totalQuantity +=
                        Number(
                            item.quantity
                        ) || 0;

                }
            );

        }
    );


    const totalElement =
        document.getElementById(
            "salesTotalSummary"
        );


    const quantityElement =
        document.getElementById(
            "salesQuantitySummary"
        );


    const countElement =
        document.getElementById(
            "salesCountSummary"
        );


    if (totalElement) {

        totalElement.textContent =
            `${formatMoney(totalSales)} ريال`;

    }


    if (quantityElement) {

        quantityElement.textContent =
            formatQuantity(
                totalQuantity
            );

    }


    if (countElement) {

        countElement.textContent =
            activeRows.length;

    }

}


/*
    تعديل فاتورة
*/

async function editSale(
    id
) {

    try {

        const sale =
            await dbGet(
                STORES.SALES,
                id
            );


        if (!sale) {

            showToast(
                "الفاتورة غير موجودة."
            );

            return;

        }


        const items =
            await dbGetSaleItems(
                id
            );


        if (
            items.length === 0
        ) {

            showToast(
                "تفاصيل الفاتورة غير موجودة."
            );

            return;

        }


        editingSaleId =
            id;


        document.getElementById(
            "saleFormTitle"
        ).textContent =
            "تعديل الفاتورة";


        document.getElementById(
            "saleNumberDisplay"
        ).textContent =
            sale.invoiceNumber ||
            sale.saleNumber;


        document.getElementById(
            "saleDate"
        ).value =
            sale.saleDate;


        document.getElementById(
            "saleCustomerName"
        ).value =
            sale.customerName || "";


        document.getElementById(
            "saleCustomerPhone"
        ).value =
            sale.customerPhone || "";


        document.getElementById(
            "salePaymentMethod"
        ).value =
            sale.paymentMethod || "cash";


        document.getElementById(
            "salePaymentStatus"
        ).value =
            sale.paymentStatus || "paid";


        document.getElementById(
            "saleTaxRate"
        ).value =
            sale.taxRate || 0;


        const typeRadio =
            document.querySelector(
                `input[name="saleType"][value="${sale.saleType}"]`
            );


        if (typeRadio) {

            typeRadio.checked =
                true;

        } else {

            document.querySelector(
                'input[name="saleType"][value="sale"]'
            ).checked =
                true;

        }


        saleTypeChanged();


        /*
            تحميل جميع أصناف الفاتورة
            إلى السلة مباشرة من بياناتها
            المحفوظة (حتى لو كان أحد
            المنتجات قد أوقف لاحقًا)
        */

        saleCartItems =
            items.map(
                function (item) {

                    return {

                        productId:
                            item.productId,

                        productName:
                            item.productName,

                        unit:
                            item.unit,

                        quantity:
                            Number(
                                item.quantity
                            ),

                        unitPrice:
                            Number(
                                item.unitPrice
                            ),

                        discount:
                            sale.saleType === "free"
                                ? 0
                                : Number(
                                    item.discount
                                )

                    };

                }
            );


        renderSaleCart();


        const searchInput =
            document.getElementById(
                "saleProductSearch"
            );


        if (searchInput) {

            searchInput.value =
                "";

        }


        renderSaleProductPicker();


        document.getElementById(
            "saleNotes"
        ).value =
            sale.notes || "";


        const cancelButton =
            document.getElementById(
                "cancelSaleEditButton"
            );


        if (cancelButton) {

            cancelButton.style.display =
                "block";

        }


        document
            .getElementById(
                "salesFormCard"
            )
            .scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "start"

            });


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء تعديل الفاتورة."
        );

    }

}


/*
    حذف فاتورة
*/

async function deleteSale(
    id
) {

    try {

        const sale =
            await dbGet(
                STORES.SALES,
                id
            );


        if (!sale) {

            showToast(
                "الفاتورة غير موجودة."
            );

            return;

        }


        const confirmed =
            confirm(
                `سيتم حذف الفاتورة ${sale.invoiceNumber || sale.saleNumber} نهائيًا ولا يمكن التراجع عن ذلك.\n\nإن كنت تريد الاحتفاظ بسجلها مع توثيق السبب، استخدم "إلغاء" بدلًا من الحذف.\n\nهل تريد المتابعة؟`
            );


        if (!confirmed) {
            return;
        }


        await dbDeleteSaleItems(
            id,
            { skipSave: true }
        );


        await dbDelete(
            STORES.SALES,
            id
        );


        showToast(
            "تم حذف الفاتورة نهائيًا."
        );


        if (
            editingSaleId === id
        ) {

            await resetSaleForm();

        }


        await loadSales();

        await updateDashboardSales();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء حذف الفاتورة."
        );

    }

}


/*
    إلغاء فاتورة (بدون حذف بياناتها)

    يبقي الفاتورة ظاهرة في السجل للأرشفة
    والتدقيق، لكنه يستبعدها من كل
    الإجماليات (لوحة التحكم، سجل المبيعات،
    التقارير)، ويُلزم بتسجيل سبب الإلغاء.
*/

async function cancelSale(
    id
) {

    try {

        const sale =
            await dbGet(
                STORES.SALES,
                id
            );


        if (!sale) {

            showToast(
                "الفاتورة غير موجودة."
            );

            return;

        }


        if (
            Number(sale.cancelled) === 1
        ) {

            showToast(
                "الفاتورة ملغاة مسبقًا."
            );

            return;

        }


        const reason =
            prompt(
                `سبب إلغاء الفاتورة ${sale.invoiceNumber || sale.saleNumber}:`
            );


        if (
            reason === null
        ) {

            /*
                المستخدم ضغط "إلغاء"
                في مربع الإدخال نفسه
            */

            return;

        }


        if (
            !reason.trim()
        ) {

            showToast(
                "يجب إدخال سبب الإلغاء."
            );

            return;

        }


        const updatedSale = {

            ...sale,

            cancelled: 1,

            cancelReason:
                reason.trim(),

            updatedAt:
                new Date().toISOString()

        };


        await dbPut(
            STORES.SALES,
            updatedSale
        );


        showToast(
            "تم إلغاء الفاتورة."
        );


        await loadSales();

        await updateDashboardSales();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء إلغاء الفاتورة."
        );

    }

}


/*
    استعادة فاتورة ملغاة
*/

async function restoreSale(
    id
) {

    try {

        const sale =
            await dbGet(
                STORES.SALES,
                id
            );


        if (!sale) {

            showToast(
                "الفاتورة غير موجودة."
            );

            return;

        }


        const confirmed =
            confirm(
                `هل تريد استعادة الفاتورة ${sale.invoiceNumber || sale.saleNumber} وإرجاعها إلى الإجماليات؟`
            );


        if (!confirmed) {
            return;
        }


        const updatedSale = {

            ...sale,

            cancelled: 0,

            cancelReason:
                "",

            updatedAt:
                new Date().toISOString()

        };


        await dbPut(
            STORES.SALES,
            updatedSale
        );


        showToast(
            "تم استعادة الفاتورة."
        );


        await loadSales();

        await updateDashboardSales();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء استعادة الفاتورة."
        );

    }

}


/*
    إعادة النموذج
*/

async function resetSaleForm() {

    editingSaleId = null;

    saleCartItems = [];


    const form =
        document.getElementById(
            "saleForm"
        );


    if (form) {

        form.reset();

    }


    document.getElementById(
        "saleFormTitle"
    ).textContent =
        "تسجيل عملية بيع";


    document.getElementById(
        "saleNumberDisplay"
    ).textContent =
        "سيتم إنشاؤه تلقائيًا";


    const defaultTaxRate =
        await getSetting(
            "defaultTaxRate",
            "0"
        );


    document.getElementById(
        "saleTaxRate"
    ).value =
        defaultTaxRate || "0";


    const saleRadio =
        document.querySelector(
            'input[name="saleType"][value="sale"]'
        );


    if (saleRadio) {

        saleRadio.checked =
            true;

    }


    const cancelButton =
        document.getElementById(
            "cancelSaleEditButton"
        );


    if (cancelButton) {

        cancelButton.style.display =
            "none";

    }


    saleTypeChanged();

    renderSaleProductPicker();

    setSaleDateToToday();

}


/*
    لوحة التحكم - مبيعات اليوم
*/

async function updateDashboardSales() {

    const sales =
        await dbGetAll(
            STORES.SALES
        );


    const today =
        getLocalDateString();


    let total = 0;

    let quantity = 0;


    const todaySales =
        sales.filter(
            sale =>
                sale.saleDate === today &&
                Number(sale.cancelled) !== 1
        );


    const itemsBySale =
        await loadSaleItemsGroupedBySale();


    todaySales.forEach(
        function (sale) {

            total +=
                Number(
                    sale.total
                ) || 0;


            const items =
                itemsBySale.get(
                    Number(sale.id)
                ) || [];


            items.forEach(
                function (item) {

                    quantity +=
                        Number(
                            item.quantity
                        ) || 0;

                }
            );

        }
    );


    const totalElement =
        document.getElementById(
            "dashboardTodaySales"
        );


    const quantityElement =
        document.getElementById(
            "dashboardTodayQuantity"
        );


    if (totalElement) {

        totalElement.textContent =
            `${formatMoney(total)} ريال`;

    }


    if (quantityElement) {

        quantityElement.textContent =
            formatQuantity(
                quantity
            );

    }

}


/*
    تنسيق الكمية
*/

function formatQuantity(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "ar-SA",
        {
            maximumFractionDigits: 3
        }
    );

}


/*
    تنسيق التاريخ
*/

function formatDateArabic(
    dateString
) {

    if (!dateString) {
        return "";
    }


    const parts =
        String(
            dateString
        ).split("-");


    if (
        parts.length !== 3
    ) {

        return dateString;

    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


/*
    حماية HTML
*/

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/*
    تنسيق المال
*/

function formatMoney(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "ar-SA",
        {
            minimumFractionDigits: 2,

            maximumFractionDigits: 2
        }
    );

}
