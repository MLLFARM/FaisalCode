/*
    تشغيل التطبيق
    ==============
*/


document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeTheme();

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

        initializeWorkspaceSelector();

        updateTodayText();

    }
);


/*
    ============================
    الأقسام (مساحات العمل)
    ============================

    كل قسم (النعناع والخضروات /
    المشتل) له قاعدة بيانات SQLite
    منفصلة تمامًا، فتصبح كل الحسابات
    والفواتير والتقارير مستقلة بالكامل
    عن القسم الآخر، دون أي تغيير في
    منطق بقية التطبيق.
*/

const WORKSPACES = {

    mint: {

        id: "mint",

        name: "النعناع والخضروات",

        icon: "🌿"

    },

    nursery: {

        id: "nursery",

        name: "المشتل",

        icon: "🌱"

    }

};


/*
    تهيئة شاشة اختيار القسم
*/

function initializeWorkspaceSelector() {

    document
        .querySelectorAll(
            ".workspace-card"
        )
        .forEach(
            function (card) {

                card.addEventListener(
                    "click",
                    function () {

                        const workspaceId =
                            card.dataset.workspace;


                        selectWorkspace(
                            workspaceId
                        );

                    }
                );

            }
        );


    const switchButton =
        document.getElementById(
            "switchWorkspaceButton"
        );


    if (switchButton) {

        switchButton.addEventListener(
            "click",
            returnToWorkspaceLanding
        );

    }

}


/*
    اختيار قسم والدخول إليه
*/

async function selectWorkspace(
    workspaceId
) {

    const workspace =
        WORKSPACES[workspaceId];


    if (!workspace) {
        return;
    }


    setActiveWorkspace(
        workspaceId
    );


    const landingPage =
        document.getElementById(
            "workspaceLandingPage"
        );


    const appShell =
        document.getElementById(
            "appShell"
        );


    if (landingPage) {

        landingPage.style.display =
            "none";

    }


    if (appShell) {

        appShell.style.display =
            "block";

    }


    const workspaceLabel =
        document.getElementById(
            "activeWorkspaceLabel"
        );


    if (workspaceLabel) {

        workspaceLabel.textContent =
            `${workspace.icon} ${workspace.name}`;

    }


    showPage(
        "dashboard"
    );


    await initializeWorkspaceData();

}


/*
    الرجوع لشاشة اختيار القسم
*/

function returnToWorkspaceLanding() {

    const landingPage =
        document.getElementById(
            "workspaceLandingPage"
        );


    const appShell =
        document.getElementById(
            "appShell"
        );


    if (appShell) {

        appShell.style.display =
            "none";

    }


    if (landingPage) {

        landingPage.style.display =
            "flex";

    }


    document
        .getElementById(
            "sidebar"
        )
        ?.classList.remove(
            "open"
        );


    resetWorkspaceDatabaseState();

}


/*
    تحميل بيانات القسم النشط بالكامل
    (تُستدعى مرة واحدة عند اختيار
    القسم، وتُعاد عند كل تبديل)
*/

async function initializeWorkspaceData() {

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
    الوضع الليلي
    ============================
*/

let dashboardChartInstance =
    null;


/*
    رسم بياني حي في لوحة التحكم:
    اتجاه المبيعات وصافي الربح
    لآخر ٣٠ يومًا
*/

async function renderDashboardChart() {

    const canvas =
        document.getElementById(
            "dashboardTrendChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    if (
        typeof sqliteReady === "undefined" ||
        !sqliteReady
    ) {

        return;

    }


    try {

        const sales =
            await dbGetAll(
                STORES.SALES
            );


        const expenses =
            await dbGetAll(
                STORES.EXPENSES
            );


        const waste =
            await dbGetAll(
                STORES.WASTE_LOG
            );


        const days = [];

        const today =
            new Date();


        for (
            let i = 29;
            i >= 0;
            i--
        ) {

            const d =
                new Date(
                    today
                );


            d.setDate(
                d.getDate() - i
            );


            const dateStr =
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;


            days.push(
                dateStr
            );

        }


        const salesByDay =
            new Map(
                days.map(d => [d, 0])
            );


        const expensesByDay =
            new Map(
                days.map(d => [d, 0])
            );


        const wasteByDay =
            new Map(
                days.map(d => [d, 0])
            );


        sales.forEach(
            function (sale) {

                if (
                    Number(sale.cancelled) === 1
                ) {

                    return;

                }


                if (
                    salesByDay.has(sale.saleDate)
                ) {

                    salesByDay.set(
                        sale.saleDate,
                        salesByDay.get(sale.saleDate) +
                        (Number(sale.total) || 0)
                    );

                }

            }
        );


        expenses.forEach(
            function (expense) {

                if (
                    expensesByDay.has(expense.date)
                ) {

                    expensesByDay.set(
                        expense.date,
                        expensesByDay.get(expense.date) +
                        (Number(expense.amount) || 0)
                    );

                }

            }
        );


        waste.forEach(
            function (entry) {

                if (
                    entry.wasteType !== "spoiled"
                ) {

                    return;

                }


                if (
                    wasteByDay.has(entry.date)
                ) {

                    wasteByDay.set(
                        entry.date,
                        wasteByDay.get(entry.date) +
                        (Number(entry.totalValue) || 0)
                    );

                }

            }
        );


        const totalSalesInRange =
            Array.from(
                salesByDay.values()
            ).reduce(
                (sum, value) => sum + value,
                0
            );


        const chartContainer =
            canvas.closest(
                ".chart-container"
            );


        const emptyState =
            document.getElementById(
                "dashboardChartEmptyState"
            );


        if (totalSalesInRange === 0) {

            if (chartContainer) {

                chartContainer.style.display =
                    "none";

            }


            if (emptyState) {

                emptyState.style.display =
                    "block";

            }


            return;

        }


        if (chartContainer) {

            chartContainer.style.display =
                "block";

        }


        if (emptyState) {

            emptyState.style.display =
                "none";

        }


        const salesData =
            days.map(
                d => salesByDay.get(d)
            );


        const profitData =
            days.map(
                d =>
                    salesByDay.get(d) -
                    expensesByDay.get(d) -
                    wasteByDay.get(d)
            );


        const labels =
            days.map(
                d => formatDateArabic(d)
            );


        const bodyStyles =
            getComputedStyle(
                document.body
            );


        const primaryColor =
            bodyStyles.getPropertyValue(
                "--primary"
            ).trim() ||
            "#1f7a4d";


        const textColor =
            bodyStyles.getPropertyValue(
                "--text"
            ).trim() ||
            "#1f2933";


        const borderColor =
            bodyStyles.getPropertyValue(
                "--border"
            ).trim() ||
            "#e5e7eb";


        if (dashboardChartInstance) {

            dashboardChartInstance.destroy();

        }


        dashboardChartInstance =
            new Chart(
                canvas,
                {

                    type:
                        "line",

                    data: {

                        labels,

                        datasets: [

                            {

                                label:
                                    "المبيعات",

                                data:
                                    salesData,

                                borderColor:
                                    primaryColor,

                                backgroundColor:
                                    `${primaryColor}33`,

                                fill: true,

                                tension: 0.3,

                                pointRadius: 0

                            },

                            {

                                label:
                                    "صافي الربح",

                                data:
                                    profitData,

                                borderColor:
                                    "#d4a418",

                                backgroundColor:
                                    "transparent",

                                borderDash: [5, 4],

                                fill: false,

                                tension: 0.3,

                                pointRadius: 0

                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        interaction: {

                            mode: "index",

                            intersect: false

                        },

                        plugins: {

                            legend: {

                                display: true,

                                labels: {

                                    color:
                                        textColor,

                                    font: {

                                        size: 11

                                    }

                                }

                            }

                        },

                        scales: {

                            x: {

                                ticks: {

                                    color:
                                        textColor,

                                    maxTicksLimit: 6,

                                    font: {

                                        size: 10

                                    }

                                },

                                grid: {

                                    color:
                                        borderColor

                                }

                            },

                            y: {

                                ticks: {

                                    color:
                                        textColor,

                                    font: {

                                        size: 10

                                    }

                                },

                                grid: {

                                    color:
                                        borderColor

                                }

                            }

                        }

                    }

                }
            );


    } catch (error) {

        console.error(error);

    }

}


const THEME_STORAGE_KEY =
    "appTheme";


function initializeTheme() {

    const savedTheme =
        localStorage.getItem(
            THEME_STORAGE_KEY
        );


    const prefersDark =
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;


    const shouldUseDark =
        savedTheme
            ? savedTheme === "dark"
            : prefersDark;


    applyTheme(
        shouldUseDark
            ? "dark"
            : "light"
    );


    const toggleButton =
        document.getElementById(
            "themeToggleButton"
        );


    if (toggleButton) {

        toggleButton.addEventListener(
            "click",
            toggleTheme
        );

    }

}


/*
    تبديل الوضع الليلي/النهاري
*/

function toggleTheme() {

    const isDark =
        document.body.classList.contains(
            "dark-theme"
        );


    const nextTheme =
        isDark
            ? "light"
            : "dark";


    applyTheme(
        nextTheme
    );


    localStorage.setItem(
        THEME_STORAGE_KEY,
        nextTheme
    );

}


/*
    تطبيق الوضع (فاتح/داكن)
*/

function applyTheme(
    theme
) {

    const isDark =
        theme === "dark";


    document.body.classList.toggle(
        "dark-theme",
        isDark
    );


    const toggleButton =
        document.getElementById(
            "themeToggleButton"
        );


    if (toggleButton) {

        toggleButton.textContent =
            isDark
                ? "☀️"
                : "🌙";


        toggleButton.setAttribute(
            "aria-label",
            isDark
                ? "التبديل إلى الوضع النهاري"
                : "التبديل إلى الوضع الليلي"
        );

    }


    const themeColorMeta =
        document.querySelector(
            'meta[name="theme-color"]'
        );


    if (themeColorMeta) {

        themeColorMeta.setAttribute(
            "content",
            isDark
                ? "#14181a"
                : "#1f7a4d"
        );

    }


    /*
        إعادة رسم الرسم البياني في
        لوحة التحكم إن كان موجودًا،
        لتحديث ألوانه مع تبديل الوضع.
    */

    if (
        typeof renderDashboardChart ===
        "function"
    ) {

        renderDashboardChart();

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


    const quickSaleFab =
        document.getElementById(
            "quickSaleFab"
        );


    if (quickSaleFab) {

        quickSaleFab.addEventListener(
            "click",
            function () {

                showPage(
                    "sales"
                );


                document
                    .getElementById(
                        "sidebar"
                    )
                    ?.classList.remove(
                        "open"
                    );


                const searchInput =
                    document.getElementById(
                        "saleProductSearch"
                    );


                if (searchInput) {

                    setTimeout(
                        function () {

                            searchInput.focus();

                        },
                        300
                    );

                }

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
            `نسخة-احتياطية-${WORKSPACES[currentWorkspace]?.name || currentWorkspace}-${today}.sqlite`;


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
            `سيتم استبدال جميع بيانات قسم "${WORKSPACES[currentWorkspace]?.name || currentWorkspace}" الحالية بالكامل بمحتوى النسخة الاحتياطية المختارة، ولا يمكن التراجع عن ذلك. هل أنت متأكد؟`
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
