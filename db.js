/*
    قاعدة البيانات
    ==============

    SQLite داخل المتصفح باستخدام sql.js.

    هذه الطبقة هي المسؤولة عن:
    - إنشاء قاعدة البيانات
    - إنشاء الجداول
    - الحفظ
    - القراءة
    - التعديل
    - الحذف
    - حفظ نسخة SQLite داخل IndexedDB
*/


let sqliteDatabase = null;

let sqliteReady = false;

/*
    مفتاح تخزين قديم كان يُستخدم مع
    LocalStorage. أبقيناه فقط للترحيل
    التلقائي لمستخدمي النسخة السابقة.
*/

const SQLITE_STORAGE_KEY =
    "resthouse_sqlite_database_v1";


/*
    إعدادات تخزين IndexedDB
    ------------------------
    IndexedDB أكبر سعة بكثير من LocalStorage
    ولا يحتاج ترميز Base64 (توفير ~33% من الحجم)،
    وهو الأنسب لتخزين قاعدة بيانات تكبر مع الوقت.
*/

const INDEXED_DB_NAME =
    "resthouse_app_storage";

const INDEXED_DB_VERSION = 1;

const INDEXED_DB_STORE =
    "sqlite_files";

const INDEXED_DB_KEY =
    "database";


/*
    أسماء الجداول
*/

const STORES = {

    PRODUCTS: "products",

    SALES: "sales",

    SALE_ITEMS: "sale_items",

    SETTINGS: "settings"

};


/*
    فتح اتصال IndexedDB
*/

function openIndexedDb() {

    return new Promise(
        function (resolve, reject) {

            if (
                typeof indexedDB ===
                "undefined"
            ) {

                reject(
                    new Error(
                        "IndexedDB غير متاحة في هذا المتصفح."
                    )
                );

                return;

            }


            const request =
                indexedDB.open(
                    INDEXED_DB_NAME,
                    INDEXED_DB_VERSION
                );


            request.onupgradeneeded =
                function (event) {

                    const db =
                        event.target.result;


                    if (
                        !db.objectStoreNames.contains(
                            INDEXED_DB_STORE
                        )
                    ) {

                        db.createObjectStore(
                            INDEXED_DB_STORE
                        );

                    }

                };


            request.onsuccess =
                function () {

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                function () {

                    reject(
                        request.error
                    );

                };

        }
    );

}


/*
    قراءة نسخة قاعدة البيانات المحفوظة
    من IndexedDB
*/

async function idbGetDatabaseBlob() {

    try {

        const db =
            await openIndexedDb();


        return await new Promise(
            function (resolve, reject) {

                const transaction =
                    db.transaction(
                        INDEXED_DB_STORE,
                        "readonly"
                    );


                const store =
                    transaction.objectStore(
                        INDEXED_DB_STORE
                    );


                const request =
                    store.get(
                        INDEXED_DB_KEY
                    );


                request.onsuccess =
                    function () {

                        resolve(
                            request.result ||
                            null
                        );

                    };


                request.onerror =
                    function () {

                        reject(
                            request.error
                        );

                    };

            }
        );


    } catch (error) {

        console.error(
            "تعذر قراءة قاعدة البيانات من IndexedDB.",
            error
        );


        return null;

    }

}


/*
    حفظ نسخة قاعدة البيانات
    داخل IndexedDB
*/

async function idbSetDatabaseBlob(
    bytes
) {

    try {

        const db =
            await openIndexedDb();


        return await new Promise(
            function (resolve, reject) {

                const transaction =
                    db.transaction(
                        INDEXED_DB_STORE,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        INDEXED_DB_STORE
                    );


                const request =
                    store.put(
                        bytes,
                        INDEXED_DB_KEY
                    );


                request.onsuccess =
                    function () {

                        resolve(true);

                    };


                request.onerror =
                    function () {

                        reject(
                            request.error
                        );

                    };

            }
        );


    } catch (error) {

        console.error(
            "تعذر حفظ قاعدة البيانات في IndexedDB.",
            error
        );


        return false;

    }

}


/*
    فتح قاعدة البيانات
*/

async function openDatabase() {

    if (
        sqliteReady && sqliteDatabase
    ) {

        return sqliteDatabase;

    }


    if (
        typeof initSqlJs !==
        "function"
    ) {

        throw new Error(
            "مكتبة SQLite غير متاحة."
        );

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


    /*
        أولًا: نحاول القراءة من IndexedDB
        (مكان التخزين الحالي).
    */

    let binary =
        await idbGetDatabaseBlob();


    let migratedFromLegacyStorage =
        false;


    /*
        ترحيل تلقائي لمرة واحدة:
        إن لم توجد نسخة في IndexedDB،
        نتحقق من وجود نسخة قديمة محفوظة
        في LocalStorage (من إصدار سابق
        من التطبيق) ونستخدمها كنقطة بداية.
    */

    if (!binary) {

        try {

            const legacyBase64 =
                localStorage.getItem(
                    SQLITE_STORAGE_KEY
                );


            if (legacyBase64) {

                binary =
                    base64ToUint8Array(
                        legacyBase64
                    );


                migratedFromLegacyStorage =
                    true;

            }


        } catch (error) {

            console.error(
                "تعذر قراءة النسخة القديمة من LocalStorage.",
                error
            );

        }

    }


    if (binary) {

        try {

            sqliteDatabase =
                new SQL.Database(
                    binary
                );

        } catch (error) {

            console.error(
                "تعذر تحميل قاعدة البيانات المحفوظة.",
                error
            );


            sqliteDatabase =
                new SQL.Database();

        }

    } else {

        sqliteDatabase =
            new SQL.Database();

    }


    createDatabaseSchema();

    sqliteReady = true;

    await saveDatabase();


    /*
        بعد نجاح الحفظ في IndexedDB،
        نحذف النسخة القديمة من
        LocalStorage حتى لا تبقى مكررة.
    */

    if (migratedFromLegacyStorage) {

        try {

            localStorage.removeItem(
                SQLITE_STORAGE_KEY
            );

        } catch (error) {

            console.error(
                "تعذر حذف النسخة القديمة من LocalStorage.",
                error
            );

        }

    }


    return sqliteDatabase;

}


/*
    إنشاء الجداول
*/

function createDatabaseSchema() {

    if (!sqliteDatabase) {

        throw new Error(
            "قاعدة البيانات غير مفتوحة."
        );

    }


    sqliteDatabase.run(`

        CREATE TABLE IF NOT EXISTS products (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            unit TEXT NOT NULL,

            price REAL NOT NULL DEFAULT 0,

            active INTEGER NOT NULL DEFAULT 1,

            notes TEXT DEFAULT '',

            createdAt TEXT NOT NULL,

            updatedAt TEXT NOT NULL

        );

    `);


    sqliteDatabase.run(`

        CREATE TABLE IF NOT EXISTS sales (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            saleNumber TEXT NOT NULL UNIQUE,

            saleDate TEXT NOT NULL,

            saleType TEXT NOT NULL DEFAULT 'sale',

            total REAL NOT NULL DEFAULT 0,

            notes TEXT DEFAULT '',

            createdAt TEXT NOT NULL,

            updatedAt TEXT NOT NULL

        );

    `);


    sqliteDatabase.run(`

        CREATE TABLE IF NOT EXISTS sale_items (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            saleId INTEGER NOT NULL,

            saleNumber TEXT NOT NULL,

            saleDate TEXT NOT NULL,

            productId INTEGER NOT NULL,

            productName TEXT NOT NULL,

            unit TEXT NOT NULL,

            quantity REAL NOT NULL DEFAULT 0,

            unitPrice REAL NOT NULL DEFAULT 0,

            discount REAL NOT NULL DEFAULT 0,

            total REAL NOT NULL DEFAULT 0,

            saleType TEXT NOT NULL DEFAULT 'sale',

            notes TEXT DEFAULT '',

            createdAt TEXT NOT NULL,

            updatedAt TEXT NOT NULL,

            FOREIGN KEY (saleId)
                REFERENCES sales(id)
                ON DELETE CASCADE

        );

    `);


    sqliteDatabase.run(`

        CREATE INDEX IF NOT EXISTS
        idx_sale_items_sale_id
        ON sale_items(saleId);

    `);


    sqliteDatabase.run(`

        CREATE INDEX IF NOT EXISTS
        idx_sales_date
        ON sales(saleDate);

    `);


    sqliteDatabase.run(`

        CREATE TABLE IF NOT EXISTS settings (

            key TEXT PRIMARY KEY,

            value TEXT NOT NULL DEFAULT '',

            updatedAt TEXT NOT NULL

        );

    `);


    /*
        الإعدادات الافتراضية
    */

    const defaults = {

        businessName:
            "إدارة الاستراحة",

        currency:
            "ريال",

        language:
            "ar",

        notes:
            ""

    };


    Object.entries(
        defaults
    ).forEach(
        function ([key, value]) {

            const existing =
                sqliteDatabase.exec(
                    `
                    SELECT key
                    FROM settings
                    WHERE key = ?
                    `,
                    [key]
                );


            if (
                existing.length === 0 ||
                existing[0].values.length === 0
            ) {

                sqliteDatabase.run(
                    `
                    INSERT INTO settings
                    (
                        key,
                        value,
                        updatedAt
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        key,
                        String(value),
                        new Date().toISOString()
                    ]
                );

            }

        }
    );

}


/*
    حفظ SQLite داخل IndexedDB
*/

async function saveDatabase() {

    if (!sqliteDatabase) {
        return;
    }


    const data =
        sqliteDatabase.export();


    await idbSetDatabaseBlob(
        data
    );


    /*
        إن كانت المزامنة السحابية مفعّلة
        (js/cloud-sync.js)، نجدول رفع نسخة
        سحابية دون التأثير على سرعة الحفظ
        المحلي.
    */

    if (
        typeof scheduleCloudUpload ===
        "function"
    ) {

        scheduleCloudUpload();

    }

}


/*
    تحويل Base64 إلى Uint8Array
    (يُستخدم فقط لترحيل النسخة القديمة
    المحفوظة سابقًا في LocalStorage)
*/

function base64ToUint8Array(
    base64
) {

    const binary =
        atob(base64);


    const bytes =
        new Uint8Array(
            binary.length
        );


    for (
        let i = 0;
        i < binary.length;
        i++
    ) {

        bytes[i] =
            binary.charCodeAt(i);

    }


    return bytes;

}


/*
    تحويل صف SQLite إلى Object
*/

function rowToObject(
    columns,
    values
) {

    const object = {};


    columns.forEach(
        function (column, index) {

            object[column] =
                values[index];

        }
    );


    return object;

}


/*
    الحصول على جميع السجلات
*/

async function dbGetAll(
    tableName
) {

    ensureDatabase();


    const result =
        sqliteDatabase.exec(
            `SELECT * FROM ${safeTableName(tableName)}`
        );


    if (
        !result.length
    ) {

        return [];

    }


    const columns =
        result[0].columns;


    return result[0].values.map(
        function (values) {

            return rowToObject(
                columns,
                values
            );

        }
    );

}


/*
    الحصول على سجل واحد
*/

async function dbGet(
    tableName,
    id
) {

    ensureDatabase();


    const result =
        sqliteDatabase.exec(
            `
            SELECT *
            FROM ${safeTableName(tableName)}
            WHERE id = ?
            `,
            [Number(id)]
        );


    if (
        !result.length ||
        !result[0].values.length
    ) {

        return null;

    }


    return rowToObject(
        result[0].columns,
        result[0].values[0]
    );

}


/*
    إضافة سجل

    options.skipSave: إذا كانت true، لا يتم
    حفظ قاعدة البيانات فورًا (يُستخدم عند
    تنفيذ عدة عمليات كتابة متتالية ضمن
    عملية واحدة، حيث يكفي حفظ واحد في النهاية).
*/

async function dbAdd(
    tableName,
    data,
    options = {}
) {

    ensureDatabase();


    const table =
        safeTableName(
            tableName
        );


    const keys =
        Object.keys(data);


    const columns =
        keys.join(",");


    const placeholders =
        keys.map(
            () => "?"
        ).join(",");


    sqliteDatabase.run(
        `
        INSERT INTO ${table}
        (${columns})
        VALUES (${placeholders})
        `,
        keys.map(
            key =>
                normalizeDatabaseValue(
                    data[key]
                )
        )
    );


    const result =
        sqliteDatabase.exec(
            "SELECT last_insert_rowid() AS id"
        );


    if (!options.skipSave) {

        await saveDatabase();

    }


    return result[0].values[0][0];

}


/*
    تعديل سجل
*/

async function dbPut(
    tableName,
    data,
    options = {}
) {

    ensureDatabase();


    if (
        data.id === undefined ||
        data.id === null
    ) {

        throw new Error(
            "لا يمكن تعديل سجل بدون id."
        );

    }


    const table =
        safeTableName(
            tableName
        );


    const keys =
        Object.keys(data)
            .filter(
                key => key !== "id"
            );


    const assignments =
        keys.map(
            key =>
                `${key} = ?`
        ).join(",");


    const values =
        keys.map(
            key =>
                normalizeDatabaseValue(
                    data[key]
                )
        );


    values.push(
        Number(data.id)
    );


    sqliteDatabase.run(
        `
        UPDATE ${table}
        SET ${assignments}
        WHERE id = ?
        `,
        values
    );


    if (!options.skipSave) {

        await saveDatabase();

    }


    return data.id;

}


/*
    حذف سجل
*/

async function dbDelete(
    tableName,
    id,
    options = {}
) {

    ensureDatabase();


    sqliteDatabase.run(
        `
        DELETE FROM ${safeTableName(tableName)}
        WHERE id = ?
        `,
        [Number(id)]
    );


    if (!options.skipSave) {

        await saveDatabase();

    }

}


/*
    الحصول على عناصر عملية بيع
*/

async function dbGetSaleItems(
    saleId
) {

    ensureDatabase();


    const result =
        sqliteDatabase.exec(
            `
            SELECT *
            FROM sale_items
            WHERE saleId = ?
            ORDER BY id ASC
            `,
            [Number(saleId)]
        );


    if (
        !result.length
    ) {

        return [];

    }


    return result[0].values.map(
        function (values) {

            return rowToObject(
                result[0].columns,
                values
            );

        }
    );

}


/*
    حذف تفاصيل عملية بيع
*/

async function dbDeleteSaleItems(
    saleId,
    options = {}
) {

    ensureDatabase();


    sqliteDatabase.run(
        `
        DELETE FROM sale_items
        WHERE saleId = ?
        `,
        [Number(saleId)]
    );


    if (!options.skipSave) {

        await saveDatabase();

    }

}


/*
    التحقق من قاعدة البيانات
*/

function ensureDatabase() {

    if (
        !sqliteDatabase ||
        !sqliteReady
    ) {

        throw new Error(
            "قاعدة البيانات غير جاهزة."
        );

    }

}


/*
    منع أسماء جداول غير معروفة
*/

function safeTableName(
    tableName
) {

    const allowed = [

        STORES.PRODUCTS,

        STORES.SALES,

        STORES.SALE_ITEMS,

        STORES.SETTINGS

    ];


    if (
        !allowed.includes(
            tableName
        )
    ) {

        throw new Error(
            "اسم جدول غير مسموح."
        );

    }


    return tableName;

}


/*
    تحويل القيم إلى قيم مناسبة لـ SQLite
*/

function normalizeDatabaseValue(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }


    if (
        typeof value === "boolean"
    ) {

        return value ? 1 : 0;

    }


    return value;

}


/*
    قراءة إعداد
*/

async function getSetting(
    key,
    defaultValue = ""
) {

    ensureDatabase();


    const result =
        sqliteDatabase.exec(
            `
            SELECT value
            FROM settings
            WHERE key = ?
            `,
            [key]
        );


    if (
        !result.length ||
        !result[0].values.length
    ) {

        return defaultValue;

    }


    return result[0].values[0][0];

}


/*
    حفظ إعداد
*/

async function setSetting(
    key,
    value
) {

    ensureDatabase();


    const now =
        new Date().toISOString();


    sqliteDatabase.run(
        `
        INSERT INTO settings
        (
            key,
            value,
            updatedAt
        )
        VALUES (?, ?, ?)

        ON CONFLICT(key)
        DO UPDATE SET

            value =
                excluded.value,

            updatedAt =
                excluded.updatedAt
        `,
        [
            key,
            String(value ?? ""),
            now
        ]
    );


    await saveDatabase();

}


/*
    الحصول على جميع الإعدادات
*/

async function getAllSettings() {

    ensureDatabase();


    const result =
        sqliteDatabase.exec(
            `
            SELECT key, value
            FROM settings
            ORDER BY key
            `
        );


    const settings = {};


    if (
        !result.length
    ) {

        return settings;

    }


    result[0].values.forEach(
        function (row) {

            settings[row[0]] =
                row[1];

        }
    );


    return settings;

}


/*
    تنفيذ SQL عند الحاجة مستقبلًا
*/

function dbQuery(
    sql,
    params = []
) {

    ensureDatabase();


    const result =
        sqliteDatabase.exec(
            sql,
            params
        );


    if (
        !result.length
    ) {

        return [];

    }


    return result[0].values.map(
        function (values) {

            return rowToObject(
                result[0].columns,
                values
            );

        }
    );

}
