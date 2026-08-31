/*
    الإنتاج والمعروض
    =================

    سجل بسيط للكميات التي تُجهَّز وتُعرض
    للبيع كل يوم (بدون ربط تلقائي معقد
    بالمخزون أو المبيعات - سجل معلوماتي
    يساعدك على المتابعة والمقارنة مع
    الرجيع لاحقًا).
*/


let editingProductionId = null;


/*
    تهيئة صفحة الإنتاج
*/

async function initializeProduction() {

    try {

        setProductionDateToToday();

        await loadProductionProductOptions();

        await loadProductionLog();

    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء تجهيز صفحة الإنتاج."
        );

    }

}


/*
    تعيين تاريخ اليوم
*/

function setProductionDateToToday() {

    const input =
        document.getElementById(
            "productionDate"
        );


    if (
        input &&
        !input.value
    ) {

        input.value =
            getLocalDateString();

    }

}


/*
    تحميل قائمة المنتجات النشطة
*/

async function loadProductionProductOptions() {

    const select =
        document.getElementById(
            "productionProduct"
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
                        Number(product.active) === 1
                )
                .sort(
                    (a, b) =>
                        String(a.name).localeCompare(
                            String(b.name),
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


                option.dataset.unit =
                    product.unit;


                select.appendChild(
                    option
                );

            }
        );


        if (
            currentValue &&
            activeProducts.some(
                p => String(p.id) === currentValue
            )
        ) {

            select.value =
                currentValue;

        }


    } catch (error) {

        console.error(error);

    }

}


/*
    عند اختيار منتج، تعبئة الوحدة تلقائيًا
*/

function productionProductChanged() {

    const select =
        document.getElementById(
            "productionProduct"
        );


    const unitInput =
        document.getElementById(
            "productionUnit"
        );


    const selectedOption =
        select?.options[select.selectedIndex];


    if (
        unitInput &&
        selectedOption
    ) {

        unitInput.value =
            selectedOption.dataset.unit ||
            "";

    }

}


/*
    حفظ سجل إنتاج (جديد أو تعديل)
*/

async function saveProduction(
    event
) {

    event.preventDefault();


    try {

        const date =
            document.getElementById(
                "productionDate"
            ).value;


        const productId =
            Number(
                document.getElementById(
                    "productionProduct"
                ).value
            );


        const quantity =
            Number(
                document.getElementById(
                    "productionQuantity"
                ).value
            );


        const notes =
            document.getElementById(
                "productionNotes"
            ).value.trim();


        if (
            !date ||
            !productId
        ) {

            showToast(
                "اختر التاريخ والمنتج."
            );

            return;

        }


        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {

            showToast(
                "أدخل كمية صحيحة أكبر من صفر."
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


        const now =
            new Date().toISOString();


        if (editingProductionId) {

            const existing =
                await dbGet(
                    STORES.PRODUCTION_LOG,
                    editingProductionId
                );


            if (!existing) {

                showToast(
                    "السجل غير موجود."
                );

                return;

            }


            await dbPut(
                STORES.PRODUCTION_LOG,
                {

                    ...existing,

                    date,

                    productId,

                    productName:
                        product.name,

                    unit:
                        product.unit,

                    quantity,

                    notes,

                    updatedAt:
                        now

                }
            );


            showToast(
                "تم تعديل السجل."
            );


        } else {

            await dbAdd(
                STORES.PRODUCTION_LOG,
                {

                    date,

                    productId,

                    productName:
                        product.name,

                    unit:
                        product.unit,

                    quantity,

                    notes,

                    createdAt:
                        now,

                    updatedAt:
                        now

                }
            );


            showToast(
                "تم تسجيل الكمية المعروضة."
            );

        }


        resetProductionForm();

        await loadProductionLog();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء الحفظ."
        );

    }

}


/*
    تحميل وعرض سجل الإنتاج
*/

async function loadProductionLog() {

    const tbody =
        document.getElementById(
            "productionTableBody"
        );


    const emptyState =
        document.getElementById(
            "productionEmptyState"
        );


    if (!tbody) {
        return;
    }


    try {

        const entries =
            await dbGetAll(
                STORES.PRODUCTION_LOG
            );


        entries.sort(
            function (a, b) {

                if (
                    a.date === b.date
                ) {

                    return (
                        Number(b.id) -
                        Number(a.id)
                    );

                }


                return String(
                    b.date
                ).localeCompare(
                    String(a.date)
                );

            }
        );


        tbody.innerHTML = "";


        if (
            entries.length === 0
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


        entries.forEach(
            function (entry) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${formatDateArabic(entry.date)}
                    </td>

                    <td>
                        ${escapeHtml(entry.productName)}
                    </td>

                    <td>
                        ${formatQuantity(entry.quantity)}
                        ${escapeHtml(entry.unit)}
                    </td>

                    <td>
                        ${escapeHtml(entry.notes || "")}
                    </td>

                    <td>

                        <div class="actions">

                            <button
                                class="action-button edit-button"
                                type="button"
                                onclick="editProduction(${entry.id})"
                            >
                                تعديل
                            </button>

                            <button
                                class="action-button delete-button"
                                type="button"
                                onclick="deleteProduction(${entry.id})"
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
        );


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تحميل سجل الإنتاج."
        );

    }

}


/*
    تعديل سجل إنتاج
*/

async function editProduction(
    id
) {

    try {

        const entry =
            await dbGet(
                STORES.PRODUCTION_LOG,
                id
            );


        if (!entry) {

            showToast(
                "السجل غير موجود."
            );

            return;

        }


        editingProductionId =
            id;


        document.getElementById(
            "productionFormTitle"
        ).textContent =
            "تعديل كمية معروضة";


        document.getElementById(
            "productionDate"
        ).value =
            entry.date;


        document.getElementById(
            "productionProduct"
        ).value =
            String(entry.productId);


        document.getElementById(
            "productionUnit"
        ).value =
            entry.unit;


        document.getElementById(
            "productionQuantity"
        ).value =
            entry.quantity;


        document.getElementById(
            "productionNotes"
        ).value =
            entry.notes || "";


        const cancelButton =
            document.getElementById(
                "cancelProductionEditButton"
            );


        if (cancelButton) {

            cancelButton.style.display =
                "block";

        }


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء تعديل السجل."
        );

    }

}


/*
    حذف سجل إنتاج
*/

async function deleteProduction(
    id
) {

    try {

        const confirmed =
            confirm(
                "هل أنت متأكد من حذف هذا السجل؟"
            );


        if (!confirmed) {
            return;
        }


        await dbDelete(
            STORES.PRODUCTION_LOG,
            id
        );


        showToast(
            "تم حذف السجل."
        );


        if (
            editingProductionId === id
        ) {

            resetProductionForm();

        }


        await loadProductionLog();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء حذف السجل."
        );

    }

}


/*
    إعادة تعيين نموذج الإنتاج
*/

function resetProductionForm() {

    editingProductionId =
        null;


    const form =
        document.getElementById(
            "productionForm"
        );


    if (form) {

        form.reset();

    }


    document.getElementById(
        "productionFormTitle"
    ).textContent =
        "تسجيل كمية معروضة";


    document.getElementById(
        "productionUnit"
    ).value = "";


    const cancelButton =
        document.getElementById(
            "cancelProductionEditButton"
        );


    if (cancelButton) {

        cancelButton.style.display =
            "none";

    }


    setProductionDateToToday();

}
