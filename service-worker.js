/*
    Service Worker
    ==============

    يتيح فتح التطبيق وتشغيله بدون اتصال
    بالإنترنت بعد أول تحميل ناجح، عبر
    تخزين ملفات التطبيق ومكتباته في ذاكرة
    تخزين مؤقت محلية (Cache Storage).

    ملاحظة: قاعدة البيانات نفسها (SQLite)
    محفوظة بشكل منفصل داخل IndexedDB،
    وليست جزءًا من هذا التخزين المؤقت.
*/


const CACHE_VERSION = "v2";

const CACHE_NAME =
    `resthouse-app-${CACHE_VERSION}`;


/*
    ملفات التطبيق الأساسية
*/

const APP_SHELL = [

    "./",
    "./index.html",
    "./manifest.json",

    "./css/style.css",

    "./js/firebase-config.js",
    "./js/db.js",
    "./js/products.js",
    "./js/sales.js",
    "./js/reports.js",
    "./js/cloud-sync.js",
    "./js/app.js",

    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/apple-touch-icon.png"

];


/*
    مكتبات خارجية (CDN) يحتاجها
    التطبيق للعمل بدون إنترنت

    ملاحظة: تخزين ملفات Firebase هنا
    يسمح بفتح التطبيق بدون إنترنت، لكن
    ميزات تسجيل الدخول والمزامنة السحابية
    نفسها تبقى بحاجة فعلية للإنترنت.
*/

const EXTERNAL_ASSETS = [

    "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.js",
    "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.wasm",

    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",

    "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore-compat.js"

];


/*
    التثبيت: تخزين ملفات التطبيق مسبقًا
*/

self.addEventListener(
    "install",
    function (event) {

        event.waitUntil(

            caches.open(
                CACHE_NAME
            ).then(
                function (cache) {

                    return cache.addAll(
                        APP_SHELL
                    ).then(
                        function () {

                            /*
                                نحاول تخزين المكتبات الخارجية،
                                لكن فشل إحداها (مثلًا بسبب
                                عدم توفر إنترنت الآن) لا يجب
                                أن يمنع تثبيت التطبيق نفسه.
                            */

                            return Promise.allSettled(
                                EXTERNAL_ASSETS.map(
                                    function (url) {

                                        return cache.add(
                                            url
                                        );

                                    }
                                )
                            );

                        }
                    );

                }
            )

        );


        self.skipWaiting();

    }
);


/*
    التفعيل: حذف أي نسخ تخزين قديمة
*/

self.addEventListener(
    "activate",
    function (event) {

        event.waitUntil(

            caches.keys().then(
                function (keys) {

                    return Promise.all(
                        keys
                            .filter(
                                key =>
                                    key !== CACHE_NAME
                            )
                            .map(
                                key =>
                                    caches.delete(key)
                            )
                    );

                }
            )

        );


        self.clients.claim();

    }
);


/*
    الجلب: نعطي الأولوية للنسخة المخزنة
    محليًا، ثم نلجأ للشبكة، ثم نخزّن أي
    استجابة ناجحة جديدة لاستخدامها لاحقًا
    بدون إنترنت.
*/

self.addEventListener(
    "fetch",
    function (event) {

        if (
            event.request.method !== "GET"
        ) {

            return;

        }


        event.respondWith(

            caches.match(
                event.request
            ).then(
                function (cachedResponse) {

                    if (cachedResponse) {

                        return cachedResponse;

                    }


                    return fetch(
                        event.request
                    ).then(
                        function (networkResponse) {

                            if (
                                networkResponse &&
                                networkResponse.ok
                            ) {

                                const responseClone =
                                    networkResponse.clone();


                                caches.open(
                                    CACHE_NAME
                                ).then(
                                    function (cache) {

                                        cache.put(
                                            event.request,
                                            responseClone
                                        );

                                    }
                                );

                            }


                            return networkResponse;

                        }
                    ).catch(
                        function () {

                            /*
                                لا يوجد إنترنت ولا نسخة مخزنة:
                                إذا كان الطلب لصفحة (تنقل)،
                                نعرض الصفحة الرئيسية المخزنة
                                كحل بديل.
                            */

                            if (
                                event.request.mode ===
                                "navigate"
                            ) {

                                return caches.match(
                                    "./index.html"
                                );

                            }


                            return undefined;

                        }
                    );

                }
            )

        );

    }
);
