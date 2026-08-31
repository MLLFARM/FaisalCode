/*
    تشغيل التطبيق
    ==============
*/


document.addEventListener(
    "DOMContentLoaded",
    async function () {

        initializeNavigation();

        initializeProductEvents();

        initializeSalesEvents();

        initializeSettingsEvents();

        initializeLogoUploadEvents();

        initializeReportsEvents();

        initializeExpenseEvents();

        initializeProductionEvents();

        initializeWasteEvents();

        initializeCloudSync();

        updateTodayText();


        try {

            await openDatabase();

            /*
                فحص تشخيصي آمن
                لا يعدل أو يحذف أي بيانات.
            */

            await diagnoseDatabaseStorage();


            await loadProducts();

            await loadSettings();

            await initializeSales();

            await initializeExpenses();

            await initializeProduction();

            await initializeWaste();

            await updateDashboardWaste();

            updateDatabaseStatus(
                "قاعدة البيانات جاهزة"
            );


            /*
                بعد جاهزية القاعدة المحلية،
                نتحقق إن وُجدت نسخة سحابية
                أحدث (Firebase) ونستبدل بها
                عند الحاجة.
            */

            await checkCloudSyncOnStartup();


        } catch (error) {

            console.error(error);

            updateDatabaseStatus(
                "حدث خطأ في قاعدة البيانات"
            );


            showToast(
                "تعذر تشغيل قاعدة البيانات المحلية."
            );

        }

    }
);


/*
    ============================
    تشخيص تخزين قاعدة البيانات
    ============================

    هذا الفحص للقراءة فقط.

    لا يقوم بـ:
    - حذف البيانات
    - تعديل البيانات
    - إنشاء منتجات
    - إعادة تهيئة قاعدة البيانات

    ملاحظة: قاعدة البيانات تُحفظ حاليًا
    داخل IndexedDB (وليست LocalStorage
    كما في الإصدارات السابقة).
*/


async function diagnoseDatabaseStorage() {

    try {

        const savedBlob =
            await idbGetDatabaseBlob();


        console.log(
            "========== فحص تخزين قاعدة البيانات =========="
        );


        console.log(
            "مكان التخزين الحالي: IndexedDB"
        );


        console.log(
            "توجد نسخة محفوظة في IndexedDB:",
            Boolean(savedBlob)
        );


        console.log(
            "حجم قاعدة البيانات (بايت):",
            savedBlob
                ? savedBlob.length
                : 0
        );


        let legacyRemnant =
            null;


        try {

            legacyRemnant =
                localStorage.getItem(
                    SQLITE_STORAGE_KEY
                );

        } catch (error) {

            legacyRemnant =
                null;

        }


        if (legacyRemnant) {

            console.warn(
                "توجد نسخة قديمة متبقية في LocalStorage لم يتم ترحيلها بعد."
            );

        }


        if (savedBlob) {

            showToast(
                "تشخيص: قاعدة البيانات محفوظة في IndexedDB بنجاح."
            );

        } else {

            showToast(
                "تشخيص: لا توجد نسخة محفوظة بعد."
            );

        }


    } catch (error) {

        console.error(
            "خطأ أثناء فحص تخزين قاعدة البيانات:",
            error
        );


        showToast(
            "حدث خطأ أثناء فحص التخزين."
        );

    }

}


/*
    ============================
    التنقل
    ============================
*/

function initializeNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const page =
                        button.dataset.page;


                    showPage(
                        page
                    );


                    document
                        .getElementById(
                            "sidebar"
                        )
                        ?.classList.remove(
                            "open"
                        );

                }
            );

        }
    );


    const menuButton =
        document.getElementById(
            "menuButton"
        );


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function () {

                document
                    .getElementById(
                        "sidebar"
                    )
                    ?.classList.toggle(
                        "open"
                    );

            }
        );

    }


    const productsButton =
        document.getElementById(
            "goProductsButton"
        );


    if (productsButton) {

        productsButton.addEventListener(
            "click",
            function () {

                showPage(
                    "products"
                );

            }
        );

    }


    const salesButton =
        document.getElementById(
            "goSalesButton"
        );


    if (salesButton) {

        salesButton.addEventListener(
            "click",
            function () {

                showPage(
                    "sales"
                );

            }
        );

    }

}


/*
    عرض الصفحة
*/

function showPage(
    pageName
) {

    const pages =
        document.querySelectorAll(
            ".page"
        );


    pages.forEach(
        function (page) {

            page.classList.remove(
                "active-page"
            );

        }
    );


    const selectedPage =
        document.getElementById(
            `${pageName}Page`
        );


    if (selectedPage) {

        selectedPage.classList.add(
            "active-page"
        );

    }


    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        function (item) {

            item.classList.remove(
                "active"
            );


            if (
                item.dataset.page ===
                pageName
            ) {

                item.classList.add(
                    "active"
                );

            }

        }
    );


    if (
        pageName ===
        "products"
    ) {

        loadProducts();

    }


    if (
        pageName ===
        "sales"
    ) {

        loadSaleProducts();

        loadSales();

    }


    if (
        pageName ===
        "settings"
    ) {

        loadSettings();

    }


    if (
        pageName ===
        "reports"
    ) {

        populateReportYearOptions();

    }


    if (
        pageName ===
        "expenses"
    ) {

        loadExpenses();

    }


    if (
        pageName ===
        "production"
    ) {

        loadProductionProductOptions();

        loadProductionLog();

    }


    if (
        pageName ===
        "returns"
    ) {

        loadWasteProductOptions();

        loadWasteLog();

    }

}


/*
    ============================
    أحداث المبيعات
    ============================
*/

function initializeSalesEvents() {

    const saleForm =
        document.getElementById(
            "saleForm"
        );


    if (!saleForm) {
        return;
    }


    /*
        قائمة اختيار المنتجات
        (بحث + استماع للتغييرات)
    */

    const productSearch =
        document.getElementById(
            "saleProductSearch"
        );


    if (productSearch) {

        productSearch.addEventListener(
            "input",
            filterSaleProductPicker
        );


        /*
            منع إرسال النموذج بالكامل
            قبل الأوان عند الضغط على
            Enter أثناء البحث.
        */

        productSearch.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                }

            }
        );

    }


    document
        .querySelectorAll(
            'input[name="saleType"]'
        )
        .forEach(
            function (radio) {

                radio.addEventListener(
                    "change",
                    saleTypeChanged
                );

            }
        );


    const taxRateField =
        document.getElementById(
            "saleTaxRate"
        );


    if (taxRateField) {

        taxRateField.addEventListener(
            "input",
            renderSaleCart
        );

    }


    saleForm.addEventListener(
        "submit",
        saveSale
    );


    const cancelButton =
        document.getElementById(
            "cancelSaleEditButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            resetSaleForm
        );

    }


    /*
        نموذج البحث/التصفية في
        سجل المبيعات
    */

    const filterForm =
        document.getElementById(
            "salesFilterForm"
        );


    if (filterForm) {

        filterForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                applySalesFilters();

            }
        );


        /*
            بحث فوري أثناء الكتابة
            (بدون انتظار الضغط على
            زر "بحث")
        */

        filterForm
            .querySelectorAll(
                "input, select"
            )
            .forEach(
                function (field) {

                    field.addEventListener(
                        "input",
                        applySalesFilters
                    );


                    field.addEventListener(
                        "change",
                        applySalesFilters
                    );

                }
            );

    }


    const filterResetButton =
        document.getElementById(
            "salesFilterResetButton"
        );


    if (filterResetButton) {

        filterResetButton.addEventListener(
            "click",
            resetSalesFilters
        );

    }

}


/*
    ============================
    الإعدادات
    ============================
*/

function initializeSettingsEvents() {

    const form =
        document.getElementById(
            "settingsForm"
        );


    if (form) {

        form.addEventListener(
            "submit",
            saveSettings
        );

    }


    const exportButton =
        document.getElementById(
            "exportBackupButton"
        );


    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportDatabaseBackup
        );

    }


    const restoreButton =
        document.getElementById(
            "restoreBackupButton"
        );


    const restoreInput =
        document.getElementById(
            "restoreBackupInput"
        );


    if (
        restoreButton &&
        restoreInput
    ) {

        restoreButton.addEventListener(
            "click",
            function () {

                restoreInput.click();

            }
        );


        restoreInput.addEventListener(
            "change",
            function () {

                const file =
                    restoreInput.files?.[0];


                restoreDatabaseBackup(
                    file
                );


                restoreInput.value =
                    "";

            }
        );

    }

}


/*
    رفع/إزالة شعار المنشأة
*/

function initializeLogoUploadEvents() {

    const logoUploadButton =
        document.getElementById(
            "settingLogoUploadButton"
        );


    const logoInput =
        document.getElementById(
            "settingLogoInput"
        );


    const logoRemoveButton =
        document.getElementById(
            "settingLogoRemoveButton"
        );


    if (
        logoUploadButton &&
        logoInput
    ) {

        logoUploadButton.addEventListener(
            "click",
            function () {

                logoInput.click();

            }
        );


        logoInput.addEventListener(
            "change",
            function () {

                const file =
                    logoInput.files?.[0];


                handleLogoUpload(
                    file
                );


                logoInput.value =
                    "";

            }
        );

    }


    if (logoRemoveButton) {

        logoRemoveButton.addEventListener(
            "click",
            async function () {

                await setSetting(
                    "businessLogo",
                    ""
                );


                updateLogoPreview(
                    ""
                );


                showToast(
                    "تم حذف الشعار."
                );

            }
        );

    }

}


/*
    ============================
    المصاريف
    ============================
*/

function initializeExpenseEvents() {

    const form =
        document.getElementById(
            "expenseForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        saveExpense
    );


    const cancelButton =
        document.getElementById(
            "cancelExpenseEditButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            resetExpenseForm
        );

    }

}


/*
    ============================
    الإنتاج والمعروض
    ============================
*/

function initializeProductionEvents() {

    const form =
        document.getElementById(
            "productionForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        saveProduction
    );


    const productSelect =
        document.getElementById(
            "productionProduct"
        );


    if (productSelect) {

        productSelect.addEventListener(
            "change",
            productionProductChanged
        );

    }


    const cancelButton =
        document.getElementById(
            "cancelProductionEditButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            resetProductionForm
        );

    }

}


/*
    ============================
    الرجيع والتالف
    ============================
*/

function initializeWasteEvents() {

    const form =
        document.getElementById(
            "wasteForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        saveWaste
    );


    const productSelect =
        document.getElementById(
            "wasteProduct"
        );


    if (productSelect) {

        productSelect.addEventListener(
            "change",
            wasteProductChanged
        );

    }


    const quantityInput =
        document.getElementById(
            "wasteQuantity"
        );


    if (quantityInput) {

        quantityInput.addEventListener(
            "input",
            calculateWasteTotal
        );

    }


    const unitValueInput =
        document.getElementById(
            "wasteUnitValue"
        );


    if (unitValueInput) {

        unitValueInput.addEventListener(
            "input",
            calculateWasteTotal
        );

    }


    const cancelButton =
        document.getElementById(
            "cancelWasteEditButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            resetWasteForm
        );

    }

}


/*
    رفع شعار المنشأة (يُصغَّر تلقائيًا
    ويُحفظ كصورة داخل الإعدادات)
*/

function handleLogoUpload(
    file
) {

    if (!file) {
        return;
    }


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        showToast(
            "اختر ملف صورة صالح."
        );

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
        function (event) {

            const image =
                new Image();


            image.onload =
                async function () {

                    const maxSize =
                        300;


                    let width =
                        image.width;


                    let height =
                        image.height;


                    if (
                        width > maxSize ||
                        height > maxSize
                    ) {

                        const scale =
                            maxSize /
                            Math.max(
                                width,
                                height
                            );


                        width =
                            Math.round(
                                width * scale
                            );


                        height =
                            Math.round(
                                height * scale
                            );

                    }


                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        width;


                    canvas.height =
                        height;


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    context.drawImage(
                        image,
                        0,
                        0,
                        width,
                        height
                    );


                    const dataUrl =
                        canvas.toDataURL(
                            "image/png"
                        );


                    await setSetting(
                        "businessLogo",
                        dataUrl
                    );


                    updateLogoPreview(
                        dataUrl
                    );


                    showToast(
                        "تم رفع الشعار."
                    );

                };


            image.src =
                event.target.result;

        };


    reader.readAsDataURL(
        file
    );

}


/*
    تنزيل نسخة احتياطية من قاعدة البيانات
*/

function exportDatabaseBackup() {

    try {

        if (!sqliteDatabase) {

            showToast(
                "قاعدة البيانات غير جاهزة."
            );

            return;

        }


        const data =
            sqliteDatabase.export();


        const blob =
            new Blob(
                [data],
                {

                    type:
                        "application/octet-stream"

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


        const today =
            getLocalDateString();


        link.href =
            url;


        link.download =
            `نسخة-احتياطية-${today}.sqlite`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        showToast(
            "تم تنزيل النسخة الاحتياطية."
        );


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر إنشاء النسخة الاحتياطية."
        );

    }

}


/*
    استعادة نسخة احتياطية
    (تستبدل جميع البيانات الحالية)
*/

async function restoreDatabaseBackup(
    file
) {

    if (!file) {
        return;
    }


    const confirmed =
        confirm(
            "سيتم استبدال جميع البيانات الحالية بالكامل بمحتوى النسخة الاحتياطية المختارة، ولا يمكن التراجع عن ذلك. هل أنت متأكد؟"
        );


    if (!confirmed) {
        return;
    }


    try {

        const arrayBuffer =
            await file.arrayBuffer();


        const bytes =
            new Uint8Array(
                arrayBuffer
            );


        if (
            typeof initSqlJs !==
            "function"
        ) {

            showToast(
                "تعذر تحميل أداة قاعدة البيانات."
            );

            return;

        }


        const SQL =
            await initSqlJs({

                locateFile:
                    function (file) {

                        return (
                            "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/" +
                            file
                        );

                    }

            });


        const restoredDatabase =
            new SQL.Database(
                bytes
            );


        sqliteDatabase =
            restoredDatabase;


        sqliteReady = true;


        /*
            نتأكد من وجود كل الجداول
            والإعدادات الافتراضية، تحسبًا
            لاستعادة نسخة من إصدار أقدم
            من التطبيق.
        */

        createDatabaseSchema();


        await saveDatabase();


        showToast(
            "تم استعادة النسخة الاحتياطية بنجاح."
        );


        await reloadAppDataAfterDatabaseChange();


    } catch (error) {

        console.error(error);

        showToast(
            "الملف المحدد غير صالح كنسخة احتياطية."
        );

    }

}


/*
    إعادة تحميل كل بيانات الواجهة
    بعد أي تغيير جذري لقاعدة البيانات
    (استعادة نسخة محلية أو سحابية)
*/

async function reloadAppDataAfterDatabaseChange() {

    await loadSettings();

    await loadProducts();

    await loadSaleProducts();

    await loadSales();

    renderSaleCart();

    await updateDashboardSales();

    await loadExpenses();

    await loadProductionProductOptions();

    await loadProductionLog();

    await loadWasteProductOptions();

    await loadWasteLog();

    await updateDashboardWaste();

    updateDatabaseStatus(
        "متصلة"
    );

}


/*
    تحميل الإعدادات
*/

async function loadSettings() {

    try {

        const settings =
            await getAllSettings();


        const fieldMap = {

            settingBusinessName:
                settings.businessName ||
                "إدارة الاستراحة",

            settingCurrency:
                settings.currency ||
                "ريال",

            settingLanguage:
                settings.language ||
                "ar",

            settingNotes:
                settings.notes ||
                "",

            settingBusinessPhone:
                settings.businessPhone ||
                "",

            settingBusinessAddress:
                settings.businessAddress ||
                "",

            settingTaxNumber:
                settings.taxNumber ||
                "",

            settingDefaultTaxRate:
                settings.defaultTaxRate ||
                "0",

            settingInvoiceThankYou:
                settings.invoiceThankYouMessage ||
                "شكرًا لتعاملكم معنا"

        };


        Object.entries(
            fieldMap
        ).forEach(
            function ([id, value]) {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.value =
                        value;

                }

            }
        );


        updateLogoPreview(
            settings.businessLogo ||
            ""
        );


        updateApplicationTitle(
            settings.businessName
        );


    } catch (error) {

        console.error(error);

    }

}


/*
    تحديث معاينة الشعار
*/

function updateLogoPreview(
    logoDataUrl
) {

    const preview =
        document.getElementById(
            "settingLogoPreview"
        );


    const placeholder =
        document.getElementById(
            "settingLogoPlaceholder"
        );


    const removeButton =
        document.getElementById(
            "settingLogoRemoveButton"
        );


    if (logoDataUrl) {

        if (preview) {

            preview.src =
                logoDataUrl;

            preview.style.display =
                "block";

        }


        if (placeholder) {

            placeholder.style.display =
                "none";

        }


        if (removeButton) {

            removeButton.style.display =
                "inline-block";

        }

    } else {

        if (preview) {

            preview.style.display =
                "none";

        }


        if (placeholder) {

            placeholder.style.display =
                "flex";

        }


        if (removeButton) {

            removeButton.style.display =
                "none";

        }

    }

}


/*
    حفظ الإعدادات
*/

async function saveSettings(
    event
) {

    event.preventDefault();


    try {

        const businessName =
            document.getElementById(
                "settingBusinessName"
            ).value.trim();


        const currency =
            document.getElementById(
                "settingCurrency"
            ).value.trim();


        const language =
            document.getElementById(
                "settingLanguage"
            ).value;


        const notes =
            document.getElementById(
                "settingNotes"
            ).value.trim();


        const businessPhone =
            document.getElementById(
                "settingBusinessPhone"
            ).value.trim();


        const businessAddress =
            document.getElementById(
                "settingBusinessAddress"
            ).value.trim();


        const taxNumber =
            document.getElementById(
                "settingTaxNumber"
            ).value.trim();


        const defaultTaxRate =
            document.getElementById(
                "settingDefaultTaxRate"
            ).value.trim();


        const invoiceThankYouMessage =
            document.getElementById(
                "settingInvoiceThankYou"
            ).value.trim();


        if (!businessName) {

            showToast(
                "أدخل اسم المنشأة."
            );

            return;

        }


        if (!currency) {

            showToast(
                "أدخل العملة."
            );

            return;

        }


        await setSetting(
            "businessName",
            businessName,
            { skipSave: true }
        );


        await setSetting(
            "currency",
            currency,
            { skipSave: true }
        );


        await setSetting(
            "language",
            language,
            { skipSave: true }
        );


        await setSetting(
            "notes",
            notes,
            { skipSave: true }
        );


        await setSetting(
            "businessPhone",
            businessPhone,
            { skipSave: true }
        );


        await setSetting(
            "businessAddress",
            businessAddress,
            { skipSave: true }
        );


        await setSetting(
            "taxNumber",
            taxNumber,
            { skipSave: true }
        );


        await setSetting(
            "defaultTaxRate",
            defaultTaxRate || "0",
            { skipSave: true }
        );


        await setSetting(
            "invoiceThankYouMessage",
            invoiceThankYouMessage ||
            "شكرًا لتعاملكم معنا"
        );


        updateApplicationTitle(
            businessName
        );


        showToast(
            "تم حفظ الإعدادات."
        );


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر حفظ الإعدادات."
        );

    }

}


/*
    تحديث اسم التطبيق
*/

function updateApplicationTitle(
    businessName
) {

    if (!businessName) {
        return;
    }


    const title =
        document.querySelector(
            ".topbar h1"
        );


    if (title) {

        title.textContent =
            businessName;

    }


    document.title =
        businessName;

}


/*
    حالة قاعدة البيانات
*/

function updateDatabaseStatus(
    message
) {

    const element =
        document.getElementById(
            "databaseStatusText"
        );


    if (element) {

        element.textContent =
            message;

    }

}


/*
    التاريخ
*/

function updateTodayText() {

    const element =
        document.getElementById(
            "todayText"
        );


    if (!element) {
        return;
    }


    const today =
        new Date();


    element.textContent =
        today.toLocaleDateString(
            "ar-SA",
            {
                weekday:
                    "long",

                year:
                    "numeric",

                month:
                    "long",

                day:
                    "numeric"
            }
        );

}


/*
    ============================
    الإشعارات
    ============================
*/

let toastTimer = null;


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}
