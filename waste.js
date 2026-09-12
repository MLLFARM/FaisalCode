/*
    الرجيع والتالف
    ================

    سجل منفصل لما لم يُباع من الكمية
    المعروضة: إما تالف (خسارة تُخصم من
    صافي الربح) أو مرتجع قابل للبيع لاحقًا
    (معلوماتي فقط، لا يُخصم).
*/


let editingWasteId = null;


const WASTE_TYPE_LABELS = {

    spoiled: "تالف",

    returned: "مرتجع قابل للبيع"

};


/*
    تهيئة صفحة الرجيع
*/

async function initializeWaste() {

    try {

        setWasteDateToToday();

        await loadWasteProductOptions();

        await loadWasteLog();

    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء تجهيز صفحة الرجيع."
        );

    }

}


/*
    تعيين تاريخ اليوم
*/

function setWasteDateToToday() {

    const input =
        document.getElementById(
            "wasteDate"
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

async function loadWasteProductOptions() {

    const select =
        document.getElementById(
            "wasteProduct"
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


                option.dataset.price =
                    product.price;


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
    عند اختيار منتج: تعبئة الوحدة
    وقيمة الوحدة الافتراضية (سعر البيع)
*/

function wasteProductChanged() {

    const select =
        document.getElementById(
            "wasteProduct"
        );


    const selectedOption =
        select?.options[select.selectedIndex];


    const unitInput =
        document.getElementById(
            "wasteUnit"
        );


    const unitValueInput =
        document.getElementById(
            "wasteUnitValue"
        );


    if (
        !selectedOption ||
        !selectedOption.value
    ) {

        if (unitInput) unitInput.value = "";

        if (unitValueInput) unitValueInput.value = "";

        return;

    }


    if (unitInput) {

        unitInput.value =
            selectedOption.dataset.unit ||
            "";

    }


    if (unitValueInput) {

        unitValueInput.value =
            selectedOption.dataset.price ||
            0;

    }


    calculateWasteTotal();

}


/*
    حساب القيمة الإجمالية
*/

function calculateWasteTotal() {

    const quantity =
        Number(
            document.getElementById(
                "wasteQuantity"
            )?.value
        ) || 0;


    const unitValue =
        Number(
            document.getElementById(
                "wasteUnitValue"
            )?.value
        ) || 0;


    const totalElement =
        document.getElementById(
            "wasteTotalValue"
        );


    if (totalElement) {

        totalElement.textContent =
            `${formatMoney(quantity * unitValue)} ريال`;

    }

}


/*
    حفظ سجل رجيع/تالف (جديد أو تعديل)
*/

async function saveWaste(
    event
) {

    event.preventDefault();


    try {

        const date =
            document.getElementById(
                "wasteDate"
            ).value;


        const productId =
            Number(
                document.getElementById(
                    "wasteProduct"
                ).value
            );


        const quantity =
            Number(
                document.getElementById(
                    "wasteQuantity"
                ).value
            );


        const wasteType =
            document.querySelector(
                'input[name="wasteType"]:checked'
            )?.value || "spoiled";


        const unitValue =
            Number(
                document.getElementById(
                    "wasteUnitValue"
                ).value
            ) || 0;


        const notes =
            document.getElementById(
                "wasteNotes"
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


        const totalValue =
            quantity * unitValue;


        const now =
            new Date().toISOString();


        if (editingWasteId) {

            const existing =
                await dbGet(
                    STORES.WASTE_LOG,
                    editingWasteId
                );


            if (!existing) {

                showToast(
                    "السجل غير موجود."
                );

                return;

            }


            await dbPut(
                STORES.WASTE_LOG,
                {

                    ...existing,

                    date,

                    productId,

                    productName:
                        product.name,

                    unit:
                        product.unit,

                    quantity,

                    wasteType,

                    unitValue,

                    totalValue,

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
                STORES.WASTE_LOG,
                {

                    date,

                    productId,

                    productName:
                        product.name,

                    unit:
                        product.unit,

                    quantity,

                    wasteType,

                    unitValue,

                    totalValue,

                    notes,

                    createdAt:
                        now,

                    updatedAt:
                        now

                }
            );


            showToast(
                "تم تسجيل الرجيع."
            );

        }


        resetWasteForm();

        await loadWasteLog();

        await updateDashboardWaste();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء الحفظ."
        );

    }

}


/*
    تحميل وعرض سجل الرجيع
*/

async function loadWasteLog() {

    const tbody =
        document.getElementById(
            "wasteTableBody"
        );


    const emptyState =
        document.getElementById(
            "wasteEmptyState"
        );


    if (!tbody) {
        return;
    }


    try {

        const entries =
            await dbGetAll(
                STORES.WASTE_LOG
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


            updateWasteMonthSummary(
                []
            );

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


                const typeClass =
                    entry.wasteType === "spoiled"
                        ? "free"
                        : "normal";


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
                        <span class="sale-type ${typeClass}">
                            ${WASTE_TYPE_LABELS[entry.wasteType] || entry.wasteType}
                        </span>
                    </td>

                    <td>
                        ${formatMoney(entry.totalValue)}
                        ريال
                    </td>

                    <td>
                        ${escapeHtml(entry.notes || "")}
                    </td>

                    <td>

                        <div class="actions">

                            <button
                                class="action-button edit-button"
                                type="button"
                                onclick="editWaste(${entry.id})"
                            >
                                تعديل
                            </button>

                            <button
                                class="action-button delete-button"
                                type="button"
                                onclick="deleteWaste(${entry.id})"
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


        updateWasteMonthSummary(
            entries
        );


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تحميل سجل الرجيع."
        );

    }

}


/*
    ملخص قيمة التالف هذا الشهر
*/

function updateWasteMonthSummary(
    entries
) {

    const now =
        new Date();


    const currentYear =
        now.getFullYear();


    const currentMonth =
        now.getMonth() + 1;


    const monthSpoiled =
        entries.filter(
            function (entry) {

                const parts =
                    String(entry.date).split("-");


                return (
                    Number(parts[0]) === currentYear &&
                    Number(parts[1]) === currentMonth &&
                    entry.wasteType === "spoiled"
                );

            }
        );


    const totalValue =
        monthSpoiled.reduce(
            (sum, entry) =>
                sum + (Number(entry.totalValue) || 0),
            0
        );


    const element =
        document.getElementById(
            "wasteMonthTotal"
        );


    if (element) {

        element.textContent =
            `${formatMoney(totalValue)} ريال`;

    }

}


/*
    تحديث بطاقة "الرجيع اليوم"
    في لوحة التحكم الرئيسية
*/

async function updateDashboardWaste() {

    const element =
        document.getElementById(
            "dashboardTodayWaste"
        );


    if (!element) {
        return;
    }


    try {

        const entries =
            await dbGetAll(
                STORES.WASTE_LOG
            );


        const today =
            getLocalDateString();


        const todayWaste =
            entries.filter(
                entry =>
                    entry.date === today &&
                    entry.wasteType === "spoiled"
            );


        const totalQuantity =
            todayWaste.reduce(
                (sum, entry) =>
                    sum + (Number(entry.quantity) || 0),
                0
            );


        element.textContent =
            formatQuantity(
                totalQuantity
            );


    } catch (error) {

        console.error(error);

    }

}


/*
    تعديل سجل رجيع
*/

async function editWaste(
    id
) {

    try {

        const entry =
            await dbGet(
                STORES.WASTE_LOG,
                id
            );


        if (!entry) {

            showToast(
                "السجل غير موجود."
            );

            return;

        }


        editingWasteId =
            id;


        document.getElementById(
            "wasteFormTitle"
        ).textContent =
            "تعديل رجيع / تالف";


        document.getElementById(
            "wasteDate"
        ).value =
            entry.date;


        document.getElementById(
            "wasteProduct"
        ).value =
            String(entry.productId);


        document.getElementById(
            "wasteUnit"
        ).value =
            entry.unit;


        document.getElementById(
            "wasteQuantity"
        ).value =
            entry.quantity;


        const typeRadio =
            document.querySelector(
                `input[name="wasteType"][value="${entry.wasteType}"]`
            );


        if (typeRadio) {

            typeRadio.checked =
                true;

        }


        document.getElementById(
            "wasteUnitValue"
        ).value =
            entry.unitValue;


        document.getElementById(
            "wasteNotes"
        ).value =
            entry.notes || "";


        calculateWasteTotal();


        const cancelButton =
            document.getElementById(
                "cancelWasteEditButton"
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
    حذف سجل رجيع
*/

async function deleteWaste(
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
            STORES.WASTE_LOG,
            id
        );


        showToast(
            "تم حذف السجل."
        );


        if (
            editingWasteId === id
        ) {

            resetWasteForm();

        }


        await loadWasteLog();

        await updateDashboardWaste();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء حذف السجل."
        );

    }

}


/*
    إعادة تعيين نموذج الرجيع
*/

function resetWasteForm() {

    editingWasteId =
        null;


    const form =
        document.getElementById(
            "wasteForm"
        );


    if (form) {

        form.reset();

    }


    document.getElementById(
        "wasteFormTitle"
    ).textContent =
        "تسجيل رجيع / تالف";


    document.getElementById(
        "wasteUnit"
    ).value = "";


    document.getElementById(
        "wasteUnitValue"
    ).value = "";


    document.getElementById(
        "wasteTotalValue"
    ).textContent =
        "0.00 ريال";


    const cancelButton =
        document.getElementById(
            "cancelWasteEditButton"
        );


    if (cancelButton) {

        cancelButton.style.display =
            "none";

    }


    setWasteDateToToday();

}
