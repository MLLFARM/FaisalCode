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

async function loadSaleProducts() {

    const select =
        document.getElementById(
            "saleItemProduct"
        );


    if (!select) {
        return;
    }


    try {

        const products =
            await dbGetAll(
                STORES.PRODUCTS
            );


        const activeProducts =
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


        const currentValue =
            select.value;


        select.innerHTML = `

            <option value="">
                اختر المنتج
            </option>

        `;


        activeProducts.forEach(
            function (product) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    product.id;


                option.textContent =
                    `${product.name} — ${product.unit}`;


                option.dataset.price =
                    product.price;


                option.dataset.unit =
                    product.unit;


                option.dataset.name =
                    product.name;


                select.appendChild(
                    option
                );

            }
        );


        if (
            currentValue &&
            activeProducts.some(
                product =>
                    String(
                        product.id
                    ) ===
                    String(
                        currentValue
                    )
            )
        ) {

            select.value =
                currentValue;

        }


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تحميل المنتجات للمبيعات."
        );

    }

}


/*
    إضافة خيار مؤقت لمنتج غير نشط
    (يظهر فقط عند تعديل صنف في السلة
    كان قد سُجّل قبل إيقاف منتجه)
*/

function ensureProductOptionInAddSelect(
    productId,
    name,
    unit,
    price
) {

    const select =
        document.getElementById(
            "saleItemProduct"
        );


    if (
        !select ||
        !productId
    ) {

        return;

    }


    const alreadyExists =
        Array.from(
            select.options
        ).some(
            option =>
                String(
                    option.value
                ) ===
                String(
                    productId
                )
        );


    if (alreadyExists) {
        return;
    }


    const option =
        document.createElement(
            "option"
        );


    option.value =
        productId;


    option.textContent =
        `${name || "منتج متوقف"} — ${unit || ""} (متوقف)`;


    option.dataset.price =
        price ?? 0;


    option.dataset.unit =
        unit || "";


    option.dataset.name =
        name || "";


    select.appendChild(
        option
    );

}


/*
    عند اختيار منتج لإضافته للفاتورة
*/

function saleItemProductChanged() {

    const select =
        document.getElementById(
            "saleItemProduct"
        );


    const selectedOption =
        select?.options[
            select.selectedIndex
        ];


    const priceInput =
        document.getElementById(
            "saleItemUnitPrice"
        );


    const unitInput =
        document.getElementById(
            "saleItemUnit"
        );


    if (
        !selectedOption ||
        !selectedOption.value
    ) {

        if (priceInput) {
            priceInput.value = "";
        }

        if (unitInput) {
            unitInput.value = "";
        }

        return;

    }


    if (priceInput) {

        priceInput.value =
            selectedOption.dataset.price ||
            0;

    }


    if (unitInput) {

        unitInput.value =
            selectedOption.dataset.unit ||
            "";

    }

}


/*
    إضافة الصنف الحالي إلى سلة الفاتورة
*/

async function addSaleItemToCart() {

    const select =
        document.getElementById(
            "saleItemProduct"
        );


    const productId =
        Number(
            select?.value
        );


    if (!productId) {

        showToast(
            "اختر المنتج أولًا."
        );

        return;

    }


    const quantity =
        Number(
            document.getElementById(
                "saleItemQuantity"
            )?.value
        );


    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {

        showToast(
            "أدخل كمية صحيحة أكبر من صفر."
        );

        return;

    }


    const unitPrice =
        Number(
            document.getElementById(
                "saleItemUnitPrice"
            )?.value
        );


    if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
    ) {

        showToast(
            "أدخل سعرًا صحيحًا."
        );

        return;

    }


    const discount =
        Number(
            document.getElementById(
                "saleItemDiscount"
            )?.value
        ) || 0;


    if (
        !Number.isFinite(discount) ||
        discount < 0
    ) {

        showToast(
            "أدخل خصمًا صحيحًا."
        );

        return;

    }


    const product =
        await dbGet(
            STORES.PRODUCTS,
            productId
        );


    if (!product) {

        showToast(
            "المنتج غير موجود."
        );

        return;

    }


    if (
        Number(product.active) !== 1
    ) {

        showToast(
            "هذا المنتج متوقف حاليًا."
        );

        return;

    }


    const existingIndex =
        saleCartItems.findIndex(
            item =>
                Number(item.productId) ===
                productId
        );


    const newItem = {

        productId,

        productName:
            product.name,

        unit:
            product.unit,

        quantity,

        unitPrice,

        discount

    };


    if (existingIndex >= 0) {

        /*
            نفس المنتج مضاف مسبقًا،
            نستبدل بياناته بدل التكرار.
        */

        saleCartItems[existingIndex] =
            newItem;

    } else {

        saleCartItems.push(
            newItem
        );

    }


    /*
        إعادة تهيئة نموذج إضافة الصنف
        لإدخال صنف جديد
    */

    select.value = "";

    document.getElementById(
        "saleItemUnit"
    ).value = "";


    document.getElementById(
        "saleItemQuantity"
    ).value = "";


    document.getElementById(
        "saleItemUnitPrice"
    ).value = "";


    document.getElementById(
        "saleItemDiscount"
    ).value = "0";


    select.focus();


    renderSaleCart();

}


/*
    نقل صنف من السلة إلى نموذج
    الإضافة لتعديله
*/

function editSaleCartItem(
    index
) {

    const item =
        saleCartItems[index];


    if (!item) {
        return;
    }


    saleCartItems.splice(
        index,
        1
    );


    renderSaleCart();


    ensureProductOptionInAddSelect(
        item.productId,
        item.productName,
        item.unit,
        item.unitPrice
    );


    document.getElementById(
        "saleItemProduct"
    ).value =
        String(
            item.productId
        );


    document.getElementById(
        "saleItemUnit"
    ).value =
        item.unit;


    document.getElementById(
        "saleItemQuantity"
    ).value =
        item.quantity;


    document.getElementById(
        "saleItemUnitPrice"
    ).value =
        item.unitPrice;


    document.getElementById(
        "saleItemDiscount"
    ).value =
        item.discount;

}


/*
    حذف صنف من السلة
*/

function removeSaleCartItem(
    index
) {

    saleCartItems.splice(
        index,
        1
    );


    renderSaleCart();

}


/*
    حساب إجمالي صنف واحد حسب
    نوع العملية الحالي
*/

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
                    ${formatMoney(item.unitPrice)}
                    ريال
                </td>

                <td>
                    ${formatMoney(item.discount)}
                    ريال
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
                        class="cart-edit-button"
                        onclick="editSaleCartItem(${index})"
                    >
                        تعديل
                    </button>

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

        totalElement.textContent =
            `${formatMoney(invoiceTotal)} ريال`;

    }

}


/*
    تغيير نوع العملية
    (يعيد حساب إجماليات السلة)
*/

function saleTypeChanged() {

    const type =
        getSelectedSaleType();


    const discountGroup =
        document.getElementById(
            "saleItemDiscountGroup"
        );


    const discountInput =
        document.getElementById(
            "saleItemDiscount"
        );


    if (type === "free") {

        if (discountGroup) {

            discountGroup.style.display =
                "none";

        }


        if (discountInput) {

            discountInput.value =
                "0";

        }


    } else {

        if (discountGroup) {

            discountGroup.style.display =
                "block";

        }

    }


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

                total:
                    invoiceTotal,

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


            const saleId =
                await dbAdd(
                    STORES.SALES,
                    {

                        saleNumber,

                        saleDate:
                            date,

                        saleType,

                        total:
                            invoiceTotal,

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
                `تم حفظ الفاتورة ${saleNumber}`
            );

        }


        resetSaleForm();

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


        tbody.innerHTML = "";


        if (
            sales.length === 0
        ) {

            emptyState.style.display =
                "block";

            updateSalesSummary([]);

            return;

        }


        emptyState.style.display =
            "none";


        const rows = [];


        const itemsBySale =
            await loadSaleItemsGroupedBySale();


        for (
            const sale of sales
        ) {

            const items =
                itemsBySale.get(
                    Number(sale.id)
                ) || [];


            if (
                items.length === 0
            ) {

                continue;

            }


            rows.push({

                sale,

                items

            });


            const row =
                document.createElement(
                    "tr"
                );


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


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            sale.saleNumber
                        )}
                    </strong>
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

                        <button
                            class="action-button edit-button"
                            type="button"
                            onclick="editSale(${sale.id})"
                        >
                            تعديل
                        </button>

                        <button
                            class="action-button delete-button"
                            type="button"
                            onclick="deleteSale(${sale.id})"
                        >
                            حذف
                        </button>

                    </div>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }


        updateSalesSummary(
            rows
        );


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تحميل سجل المبيعات."
        );

    }

}


/*
    ملخص المبيعات
*/

function updateSalesSummary(
    rows
) {

    let totalSales = 0;

    let totalQuantity = 0;


    rows.forEach(
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
            rows.length;

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
            sale.saleNumber;


        document.getElementById(
            "saleDate"
        ).value =
            sale.saleDate;


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


        const select =
            document.getElementById(
                "saleItemProduct"
            );


        if (select) {

            select.value = "";

        }


        document.getElementById(
            "saleItemUnit"
        ).value = "";


        document.getElementById(
            "saleItemQuantity"
        ).value = "";


        document.getElementById(
            "saleItemUnitPrice"
        ).value = "";


        document.getElementById(
            "saleItemDiscount"
        ).value = "0";


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
                `هل أنت متأكد من حذف الفاتورة ${sale.saleNumber}؟`
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
            "تم حذف الفاتورة."
        );


        if (
            editingSaleId === id
        ) {

            resetSaleForm();

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
    إعادة النموذج
*/

function resetSaleForm() {

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


    document.getElementById(
        "saleItemUnit"
    ).value = "";


    document.getElementById(
        "saleItemUnitPrice"
    ).value = "";


    document.getElementById(
        "saleItemDiscount"
    ).value = "0";


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
                sale.saleDate ===
                today
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
