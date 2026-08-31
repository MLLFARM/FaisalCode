/*
    إدارة المنتجات
    ==============

    المرحلة الأولى:
    - إضافة المنتج
    - تعديل المنتج
    - تفعيل / إيقاف المنتج
    - حذف المنتج
    - الوحدة
    - السعر
    - الملاحظات
*/


let editingProductId = null;


/*
    تحميل المنتجات
*/

async function loadProducts() {

    const tbody =
        document.getElementById(
            "productsTableBody"
        );


    const emptyState =
        document.getElementById(
            "productsEmptyState"
        );


    if (!tbody) {
        return;
    }


    try {

        const products =
            await dbGetAll(
                STORES.PRODUCTS
            );


        products.sort(
            function (a, b) {

                return String(
                    a.name || ""
                ).localeCompare(
                    String(
                        b.name || ""
                    ),
                    "ar"
                );

            }
        );


        tbody.innerHTML = "";


        const counter =
            document.getElementById(
                "productCounter"
            );


        const dashboardCount =
            document.getElementById(
                "productCount"
            );


        if (counter) {

            counter.textContent =
                `${products.length} منتج`;

        }


        if (dashboardCount) {

            dashboardCount.textContent =
                products.length;

        }


        if (
            products.length === 0
        ) {

            emptyState.style.display =
                "block";

            return;

        }


        emptyState.style.display =
            "none";


        products.forEach(
            function (product) {

                const row =
                    document.createElement(
                        "tr"
                    );


                const statusClass =
                    Number(product.active) === 1
                        ? "active"
                        : "inactive";


                const statusText =
                    Number(product.active) === 1
                        ? "نشط"
                        : "متوقف";


                row.innerHTML = `

                    <td>
                        <span class="product-name">
                            ${escapeHtml(
                                product.name
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(
                            product.unit
                        )}
                    </td>

                    <td>
                        <span class="price">
                            ${formatMoney(
                                product.price
                            )}
                            ريال
                        </span>
                    </td>

                    <td>

                        <span class="status ${statusClass}">
                            ${statusText}
                        </span>

                    </td>

                    <td>

                        <div class="actions">

                            <button
                                class="action-button edit-button"
                                type="button"
                                onclick="editProduct(${product.id})"
                            >
                                تعديل
                            </button>

                            <button
                                class="action-button toggle-button"
                                type="button"
                                onclick="toggleProduct(${product.id})"
                            >
                                ${
                                    Number(product.active) === 1
                                        ? "إيقاف"
                                        : "تفعيل"
                                }
                            </button>

                            <button
                                class="action-button delete-button"
                                type="button"
                                onclick="deleteProduct(${product.id})"
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
            "تعذر تحميل المنتجات."
        );

    }

}


/*
    فتح نافذة إضافة منتج
*/

function openAddProductModal() {

    editingProductId = null;


    document.getElementById(
        "productModalTitle"
    ).textContent =
        "إضافة منتج";


    document.getElementById(
        "productForm"
    ).reset();


    document.getElementById(
        "productActive"
    ).checked = true;


    document.getElementById(
        "productId"
    ).value = "";


    openProductModal();

}


/*
    فتح النافذة
*/

function openProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        function () {

            document
                .getElementById(
                    "productName"
                )
                ?.focus();

        },
        50
    );

}


/*
    إغلاق النافذة
*/

function closeProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    editingProductId = null;

}


/*
    حفظ المنتج
*/

async function saveProduct(
    event
) {

    event.preventDefault();


    try {

        const name =
            document.getElementById(
                "productName"
            ).value.trim();


        const unit =
            document.getElementById(
                "productUnit"
            ).value.trim();


        const price =
            Number(
                document.getElementById(
                    "productPrice"
                ).value
            );


        const active =
            document.getElementById(
                "productActive"
            ).checked;


        const notes =
            document.getElementById(
                "productNotes"
            ).value.trim();


        if (!name) {

            showToast(
                "أدخل اسم المنتج."
            );

            return;

        }


        if (!unit) {

            showToast(
                "أدخل وحدة البيع."
            );

            return;

        }


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            showToast(
                "أدخل سعرًا صحيحًا."
            );

            return;

        }


        const now =
            new Date().toISOString();


        if (editingProductId) {

            const existing =
                await dbGet(
                    STORES.PRODUCTS,
                    editingProductId
                );


            if (!existing) {

                showToast(
                    "المنتج غير موجود."
                );

                return;

            }


            await dbPut(
                STORES.PRODUCTS,
                {

                    ...existing,

                    name,

                    unit,

                    price,

                    active:
                        active ? 1 : 0,

                    notes,

                    updatedAt:
                        now

                }
            );


            showToast(
                "تم تعديل المنتج."
            );


        } else {

            await dbAdd(
                STORES.PRODUCTS,
                {

                    name,

                    unit,

                    price,

                    active:
                        active ? 1 : 0,

                    notes,

                    createdAt:
                        now,

                    updatedAt:
                        now

                }
            );


            showToast(
                "تم إضافة المنتج."
            );

        }


        closeProductModal();

        await loadProducts();

        await loadSaleProducts();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء حفظ المنتج."
        );

    }

}


/*
    تعديل منتج
*/

async function editProduct(
    id
) {

    try {

        const product =
            await dbGet(
                STORES.PRODUCTS,
                id
            );


        if (!product) {

            showToast(
                "المنتج غير موجود."
            );

            return;

        }


        editingProductId =
            id;


        document.getElementById(
            "productModalTitle"
        ).textContent =
            "تعديل المنتج";


        document.getElementById(
            "productId"
        ).value =
            product.id;


        document.getElementById(
            "productName"
        ).value =
            product.name || "";


        document.getElementById(
            "productUnit"
        ).value =
            product.unit || "";


        document.getElementById(
            "productPrice"
        ).value =
            product.price ?? 0;


        document.getElementById(
            "productActive"
        ).checked =
            Number(product.active) === 1;


        document.getElementById(
            "productNotes"
        ).value =
            product.notes || "";


        openProductModal();


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر فتح المنتج."
        );

    }

}


/*
    تفعيل / إيقاف المنتج
*/

async function toggleProduct(
    id
) {

    try {

        const product =
            await dbGet(
                STORES.PRODUCTS,
                id
            );


        if (!product) {

            showToast(
                "المنتج غير موجود."
            );

            return;

        }


        const newState =
            Number(product.active) === 1
                ? 0
                : 1;


        const now =
            new Date().toISOString();


        await dbPut(
            STORES.PRODUCTS,
            {

                ...product,

                active:
                    newState,

                updatedAt:
                    now

            }
        );


        showToast(
            newState === 1
                ? "تم تفعيل المنتج."
                : "تم إيقاف المنتج."
        );


        await loadProducts();

        await loadSaleProducts();


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تغيير حالة المنتج."
        );

    }

}


/*
    حذف المنتج
*/

async function deleteProduct(
    id
) {

    try {

        const product =
            await dbGet(
                STORES.PRODUCTS,
                id
            );


        if (!product) {

            showToast(
                "المنتج غير موجود."
            );

            return;

        }


        /*
            لا نحذف المنتج إذا كان
            مستخدمًا في عمليات بيع.
        */

        const saleItems =
            await dbGetAll(
                STORES.SALE_ITEMS
            );


        const used =
            saleItems.some(
                function (item) {

                    return Number(
                        item.productId
                    ) === Number(id);

                }
            );


        if (used) {

            showToast(
                "لا يمكن حذف منتج مستخدم في المبيعات. يمكنك إيقافه بدلًا من حذفه."
            );

            return;

        }


        const confirmed =
            confirm(
                `هل أنت متأكد من حذف المنتج "${product.name}"؟`
            );


        if (!confirmed) {
            return;
        }


        await dbDelete(
            STORES.PRODUCTS,
            id
        );


        showToast(
            "تم حذف المنتج."
        );


        await loadProducts();

        await loadSaleProducts();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء حذف المنتج."
        );

    }

}


/*
    تهيئة أحداث المنتجات
*/

function initializeProductEvents() {

    const addButton =
        document.getElementById(
            "addProductButton"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            openAddProductModal
        );

    }


    const closeButton =
        document.getElementById(
            "closeProductModal"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeProductModal
        );

    }


    const cancelButton =
        document.getElementById(
            "cancelProductButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeProductModal
        );

    }


    const form =
        document.getElementById(
            "productForm"
        );


    if (form) {

        form.addEventListener(
            "submit",
            saveProduct
        );

    }


    const modal =
        document.getElementById(
            "productModal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeProductModal();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Escape"
            ) {

                closeProductModal();

            }

        }
    );

}


/*
    حماية النصوص قبل وضعها داخل HTML
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