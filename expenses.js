/*
    إدارة المصاريف
    ================

    - تسجيل مصروف (تاريخ، تصنيف، مبلغ، ملاحظات)
    - عرض سجل المصاريف
    - تعديل/حذف مصروف
    - إجمالي مصاريف الشهر الحالي وصافي الربح
*/


let editingExpenseId = null;


/*
    تهيئة صفحة المصاريف
*/

async function initializeExpenses() {

    try {

        setExpenseDateToToday();

        await loadExpenses();

    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء تجهيز المصاريف."
        );

    }

}


/*
    تعيين تاريخ اليوم لحقل التاريخ
*/

function setExpenseDateToToday() {

    const input =
        document.getElementById(
            "expenseDate"
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
    حفظ مصروف (جديد أو تعديل)
*/

async function saveExpense(
    event
) {

    event.preventDefault();


    try {

        const date =
            document.getElementById(
                "expenseDate"
            ).value;


        const category =
            document.getElementById(
                "expenseCategory"
            ).value;


        const amount =
            Number(
                document.getElementById(
                    "expenseAmount"
                ).value
            );


        const notes =
            document.getElementById(
                "expenseNotes"
            ).value.trim();


        if (!date) {

            showToast(
                "اختر تاريخ المصروف."
            );

            return;

        }


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            showToast(
                "أدخل مبلغًا صحيحًا أكبر من صفر."
            );

            return;

        }


        const now =
            new Date().toISOString();


        if (editingExpenseId) {

            const existing =
                await dbGet(
                    STORES.EXPENSES,
                    editingExpenseId
                );


            if (!existing) {

                showToast(
                    "المصروف غير موجود."
                );

                return;

            }


            await dbPut(
                STORES.EXPENSES,
                {

                    ...existing,

                    date,

                    category,

                    amount,

                    notes,

                    updatedAt:
                        now

                }
            );


            showToast(
                "تم تعديل المصروف."
            );


        } else {

            await dbAdd(
                STORES.EXPENSES,
                {

                    date,

                    category,

                    amount,

                    notes,

                    createdAt:
                        now,

                    updatedAt:
                        now

                }
            );


            showToast(
                "تم تسجيل المصروف."
            );

        }


        resetExpenseForm();

        await loadExpenses();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء حفظ المصروف."
        );

    }

}


/*
    تحميل وعرض سجل المصاريف
*/

async function loadExpenses() {

    const tbody =
        document.getElementById(
            "expensesTableBody"
        );


    const emptyState =
        document.getElementById(
            "expensesEmptyState"
        );


    if (!tbody) {
        return;
    }


    try {

        const expenses =
            await dbGetAll(
                STORES.EXPENSES
            );


        expenses.sort(
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
            expenses.length === 0
        ) {

            if (emptyState) {

                emptyState.style.display =
                    "block";

            }


            updateExpenseMonthSummary(
                []
            );

            return;

        }


        if (emptyState) {

            emptyState.style.display =
                "none";

        }


        expenses.forEach(
            function (expense) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${formatDateArabic(expense.date)}
                    </td>

                    <td>
                        ${escapeHtml(expense.category)}
                    </td>

                    <td>
                        <strong>
                            ${formatMoney(expense.amount)}
                            ريال
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(expense.notes || "")}
                    </td>

                    <td>

                        <div class="actions">

                            <button
                                class="action-button edit-button"
                                type="button"
                                onclick="editExpense(${expense.id})"
                            >
                                تعديل
                            </button>

                            <button
                                class="action-button delete-button"
                                type="button"
                                onclick="deleteExpense(${expense.id})"
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


        updateExpenseMonthSummary(
            expenses
        );


    } catch (error) {

        console.error(error);

        showToast(
            "تعذر تحميل سجل المصاريف."
        );

    }

}


/*
    ملخص مصاريف الشهر الحالي
    وصافي الربح (مبيعات - مصاريف - تالف)
*/

async function updateExpenseMonthSummary(
    expenses
) {

    const now =
        new Date();


    const currentYear =
        now.getFullYear();


    const currentMonth =
        now.getMonth() + 1;


    const monthExpenses =
        expenses.filter(
            function (expense) {

                const parts =
                    String(
                        expense.date
                    ).split("-");


                return (
                    Number(parts[0]) === currentYear &&
                    Number(parts[1]) === currentMonth
                );

            }
        );


    const totalExpenses =
        monthExpenses.reduce(
            (sum, expense) =>
                sum +
                (Number(expense.amount) || 0),
            0
        );


    const monthElement =
        document.getElementById(
            "expenseMonthTotal"
        );


    if (monthElement) {

        monthElement.textContent =
            `${formatMoney(totalExpenses)} ريال`;

    }


    /*
        صافي الربح = المبيعات - المصاريف
        - قيمة التالف (وليس المرتجع القابل
        للبيع) لهذا الشهر
    */

    try {

        const sales =
            await dbGetAll(
                STORES.SALES
            );


        const monthSales =
            sales.filter(
                function (sale) {

                    const parts =
                        String(
                            sale.saleDate
                        ).split("-");


                    return (
                        Number(parts[0]) === currentYear &&
                        Number(parts[1]) === currentMonth &&
                        Number(sale.cancelled) !== 1
                    );

                }
            );


        const totalSales =
            monthSales.reduce(
                (sum, sale) =>
                    sum +
                    (Number(sale.total) || 0),
                0
            );


        const wasteEntries =
            await dbGetAll(
                STORES.WASTE_LOG
            );


        const monthWaste =
            wasteEntries.filter(
                function (entry) {

                    const parts =
                        String(
                            entry.date
                        ).split("-");


                    return (
                        Number(parts[0]) === currentYear &&
                        Number(parts[1]) === currentMonth &&
                        entry.wasteType === "spoiled"
                    );

                }
            );


        const totalWasteValue =
            monthWaste.reduce(
                (sum, entry) =>
                    sum +
                    (Number(entry.totalValue) || 0),
                0
            );


        const netProfit =
            totalSales -
            totalExpenses -
            totalWasteValue;


        const netProfitElement =
            document.getElementById(
                "netProfitMonthTotal"
            );


        if (netProfitElement) {

            netProfitElement.textContent =
                `${formatMoney(netProfit)} ريال`;

        }


    } catch (error) {

        console.error(error);

    }

}


/*
    تعديل مصروف
*/

async function editExpense(
    id
) {

    try {

        const expense =
            await dbGet(
                STORES.EXPENSES,
                id
            );


        if (!expense) {

            showToast(
                "المصروف غير موجود."
            );

            return;

        }


        editingExpenseId =
            id;


        document.getElementById(
            "expenseFormTitle"
        ).textContent =
            "تعديل مصروف";


        document.getElementById(
            "expenseDate"
        ).value =
            expense.date;


        document.getElementById(
            "expenseCategory"
        ).value =
            expense.category;


        document.getElementById(
            "expenseAmount"
        ).value =
            expense.amount;


        document.getElementById(
            "expenseNotes"
        ).value =
            expense.notes || "";


        const cancelButton =
            document.getElementById(
                "cancelExpenseEditButton"
            );


        if (cancelButton) {

            cancelButton.style.display =
                "block";

        }


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء تعديل المصروف."
        );

    }

}


/*
    حذف مصروف
*/

async function deleteExpense(
    id
) {

    try {

        const confirmed =
            confirm(
                "هل أنت متأكد من حذف هذا المصروف؟"
            );


        if (!confirmed) {
            return;
        }


        await dbDelete(
            STORES.EXPENSES,
            id
        );


        showToast(
            "تم حذف المصروف."
        );


        if (
            editingExpenseId === id
        ) {

            resetExpenseForm();

        }


        await loadExpenses();


    } catch (error) {

        console.error(error);

        showToast(
            "حدث خطأ أثناء حذف المصروف."
        );

    }

}


/*
    إعادة تعيين نموذج المصروف
*/

function resetExpenseForm() {

    editingExpenseId = null;


    const form =
        document.getElementById(
            "expenseForm"
        );


    if (form) {

        form.reset();

    }


    document.getElementById(
        "expenseFormTitle"
    ).textContent =
        "تسجيل مصروف";


    const cancelButton =
        document.getElementById(
            "cancelExpenseEditButton"
        );


    if (cancelButton) {

        cancelButton.style.display =
            "none";

    }


    setExpenseDateToToday();

}
