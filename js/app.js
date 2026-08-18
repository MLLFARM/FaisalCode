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

        initializeReportsEvents();

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


    const product =
        document.getElementById(
            "saleItemProduct"
        );


    if (product) {

        product.addEventListener(
            "change",
            saleItemProductChanged
        );

    }


    const addItemButton =
        document.getElementById(
            "addSaleItemButton"
        );


    if (addItemButton) {

        addItemButton.addEventListener(
            "click",
            addSaleItemToCart
        );

    }


    /*
        الضغط على Enter داخل حقول
        إضافة الصنف يضيفه للفاتورة
        بدل إرسال النموذج بالكامل
        قبل الأوان.
    */

    [
        "saleItemQuantity",
        "saleItemUnitPrice",
        "saleItemDiscount"
    ].forEach(
        function (fieldId) {

            const field =
                document.getElementById(
                    fieldId
                );


            if (!field) {
                return;
            }


            field.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        addSaleItemToCart();

                    }

                }
            );

        }
    );


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


        const businessName =
            document.getElementById(
                "settingBusinessName"
            );


        const currency =
            document.getElementById(
                "settingCurrency"
            );


        const language =
            document.getElementById(
                "settingLanguage"
            );


        const notes =
            document.getElementById(
                "settingNotes"
            );


        if (businessName) {

            businessName.value =
                settings.businessName ||
                "إدارة الاستراحة";

        }


        if (currency) {

            currency.value =
                settings.currency ||
                "ريال";

        }


        if (language) {

            language.value =
                settings.language ||
                "ar";

        }


        if (notes) {

            notes.value =
                settings.notes ||
                "";

        }


        updateApplicationTitle(
            settings.businessName
        );


    } catch (error) {

        console.error(error);

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
            businessName
        );


        await setSetting(
            "currency",
            currency
        );


        await setSetting(
            "language",
            language
        );


        await setSetting(
            "notes",
            notes
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
