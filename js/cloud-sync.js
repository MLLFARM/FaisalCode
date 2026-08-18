/*
    المزامنة السحابية (Firebase)
    =============================

    فكرة العمل:
    - بعد كل حفظ محلي لقاعدة البيانات، تُرفع
      نسخة كاملة منها تلقائيًا إلى Cloud
      Firestore (بعد تأخير بسيط لتجميع عدة
      عمليات حفظ متتالية في رفعة واحدة).

    - عند فتح التطبيق (وبعد جاهزية قاعدة
      البيانات المحلية)، يتحقق التطبيق من
      وجود نسخة أحدث في السحابة، ويستبدل بها
      النسخة المحلية عند الحاجة (مفيد عند
      التنقل بين أكثر من جهاز).

    ⚠️ حدود مهمة يجب معرفتها:
    - هذه مزامنة "نسخة كاملة"، وليست مزامنة
      لحظية لكل عملية على حدة. إن عدّلت
      البيانات على جهازين في نفس الوقت وأنتما
      غير متصلين بالإنترنت، فآخر جهاز يرفع
      نسخته هو من سيُحتفظ بتعديلاته، وقد
      تُفقد تعديلات الجهاز الآخر.
    - الحل: تجنّب العمل على جهازين معًا بدون
      مزامنة بينهما (افتح التطبيق مرة واحدة
      على كل جهاز بالتناوب، مع اتصال إنترنت).
    - Firestore يحدّد حجم أي مستند بحد أقصى
      1 ميجابايت تقريبًا. طالما البيانات نصية
      (منتجات ومبيعات بدون صور) فهذا يكفي
      لسنوات طويلة من الاستخدام العادي.
*/


let cloudSyncEnabled =
    typeof isFirebaseConfigured !==
    "undefined" &&
    isFirebaseConfigured;


let cloudCurrentUser =
    null;


let cloudUploadTimer =
    null;


/*
    تهيئة المزامنة السحابية
    (ربط الأزرار وحالة تسجيل الدخول)
*/

function initializeCloudSync() {

    if (!cloudSyncEnabled) {

        showCloudState(
            "notConfigured"
        );

        return;

    }


    firebase.auth().onAuthStateChanged(
        function (user) {

            cloudCurrentUser =
                user;


            if (user) {

                showCloudState(
                    "loggedIn",
                    user
                );

            } else {

                showCloudState(
                    "loggedOut"
                );

            }

        }
    );


    const loginButton =
        document.getElementById(
            "cloudLoginButton"
        );


    if (loginButton) {

        loginButton.addEventListener(
            "click",
            handleCloudLogin
        );

    }


    const logoutButton =
        document.getElementById(
            "cloudLogoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                firebase.auth().signOut();

            }
        );

    }


    const syncNowButton =
        document.getElementById(
            "cloudSyncNowButton"
        );


    if (syncNowButton) {

        syncNowButton.addEventListener(
            "click",
            async function () {

                syncNowButton.disabled =
                    true;


                await uploadBackupToCloud(
                    true
                );


                syncNowButton.disabled =
                    false;

            }
        );

    }

}


/*
    عرض حالة قسم الحساب السحابي
    في صفحة الإعدادات
*/

function showCloudState(
    state,
    user
) {

    const notConfigured =
        document.getElementById(
            "cloudNotConfiguredState"
        );


    const loggedOut =
        document.getElementById(
            "cloudLoggedOutState"
        );


    const loggedIn =
        document.getElementById(
            "cloudLoggedInState"
        );


    if (notConfigured) {

        notConfigured.style.display =
            state === "notConfigured"
                ? "block"
                : "none";

    }


    if (loggedOut) {

        loggedOut.style.display =
            state === "loggedOut"
                ? "block"
                : "none";

    }


    if (loggedIn) {

        loggedIn.style.display =
            state === "loggedIn"
                ? "block"
                : "none";

    }


    if (
        state === "loggedIn" &&
        user
    ) {

        const emailElement =
            document.getElementById(
                "cloudAccountEmail"
            );


        if (emailElement) {

            emailElement.textContent =
                user.email || "";

        }


        updateCloudSyncStatusText();

    }

}


/*
    تسجيل الدخول
*/

async function handleCloudLogin() {

    const email =
        document.getElementById(
            "cloudEmail"
        )?.value.trim();


    const password =
        document.getElementById(
            "cloudPassword"
        )?.value;


    if (
        !email ||
        !password
    ) {

        showToast(
            "أدخل البريد الإلكتروني وكلمة المرور."
        );

        return;

    }


    try {

        await firebase.auth()
            .signInWithEmailAndPassword(
                email,
                password
            );


        document.getElementById(
            "cloudPassword"
        ).value = "";


        showToast(
            "تم تسجيل الدخول."
        );


    } catch (error) {

        console.error(error);


        showToast(
            "تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور."
        );

    }

}


/*
    جدولة رفع نسخة سحابية
    (تُستدعى تلقائيًا بعد كل حفظ محلي،
    مع تجميع الحفظات المتقاربة في رفعة
    واحدة بدل رفع متكرر)
*/

function scheduleCloudUpload() {

    if (
        !cloudSyncEnabled ||
        !cloudCurrentUser
    ) {

        return;

    }


    if (cloudUploadTimer) {

        clearTimeout(
            cloudUploadTimer
        );

    }


    cloudUploadTimer =
        setTimeout(
            function () {

                uploadBackupToCloud();

            },
            3000
        );

}


/*
    رفع نسخة قاعدة البيانات الحالية
    إلى Cloud Firestore
    (مستند واحد يحوي كل قاعدة البيانات
    كحقل ثنائي Bytes)
*/

async function uploadBackupToCloud(
    manual = false
) {

    if (
        !cloudSyncEnabled ||
        !cloudCurrentUser ||
        !sqliteDatabase
    ) {

        return;

    }


    try {

        const data =
            sqliteDatabase.export();


        /*
            حد Firestore لأي مستند تقريبًا
            1 ميجابايت. نتحقق مبكرًا لإعطاء
            رسالة واضحة بدل فشل صامت.
        */

        if (
            data.length >
            900000
        ) {

            if (manual) {

                showToast(
                    "حجم قاعدة البيانات كبير جدًا على المزامنة السحابية الحالية (Firestore)."
                );

            }


            console.error(
                "تعذر رفع نسخة سحابية: الحجم يتجاوز حد Firestore.",
                data.length
            );


            return;

        }


        const now =
            new Date().toISOString();


        const docRef =
            firebase.firestore()
                .collection(
                    "backups"
                )
                .doc(
                    cloudCurrentUser.uid
                );


        await docRef.set(
            {

                data:
                    firebase.firestore.Blob.fromUint8Array(
                        data
                    ),

                updatedAt:
                    now,

                size:
                    data.length

            }
        );


        localStorage.setItem(
            "cloudLastSyncTime",
            now
        );


        updateCloudSyncStatusText();


        if (manual) {

            showToast(
                "تمت المزامنة مع السحابة."
            );

        }


    } catch (error) {

        console.error(error);


        if (manual) {

            showToast(
                "تعذرت المزامنة مع السحابة."
            );

        }

    }

}


/*
    التحقق عند بدء التشغيل من وجود
    نسخة سحابية أحدث من النسخة المحلية
*/

async function checkCloudSyncOnStartup() {

    if (!cloudSyncEnabled) {

        return;

    }


    try {

        const user =
            await waitForCloudAuthState();


        if (!user) {

            return;

        }


        const pulled =
            await pullLatestBackupIfNewer();


        if (pulled) {

            await reloadAppDataAfterDatabaseChange();


            showToast(
                "تم تحديث البيانات من آخر نسخة سحابية."
            );

        }


    } catch (error) {

        console.error(error);

    }

}


/*
    انتظار معرفة حالة تسجيل الدخول
    (تُستخدم مرة واحدة عند بدء التشغيل)
*/

function waitForCloudAuthState() {

    return new Promise(
        function (resolve) {

            const unsubscribe =
                firebase.auth()
                    .onAuthStateChanged(
                        function (user) {

                            unsubscribe();

                            resolve(user);

                        }
                    );

        }
    );

}


/*
    تنزيل النسخة السحابية من Firestore
    واستبدال النسخة المحلية بها، فقط إن
    كانت النسخة السحابية أحدث مما نعرفه
    محليًا.

    تُرجع true إذا تم الاستبدال فعلًا.
*/

async function pullLatestBackupIfNewer() {

    if (
        !cloudSyncEnabled ||
        !cloudCurrentUser
    ) {

        return false;

    }


    try {

        const docRef =
            firebase.firestore()
                .collection(
                    "backups"
                )
                .doc(
                    cloudCurrentUser.uid
                );


        const snapshot =
            await docRef.get();


        if (
            !snapshot.exists
        ) {

            /*
                لا توجد نسخة سحابية بعد
                (أول استخدام)
            */

            return false;

        }


        const remoteData =
            snapshot.data();


        if (
            !remoteData?.data ||
            !remoteData?.updatedAt
        ) {

            return false;

        }


        const knownSyncTime =
            localStorage.getItem(
                "cloudLastSyncTime"
            );


        if (
            knownSyncTime &&
            new Date(knownSyncTime).getTime() >=
            new Date(remoteData.updatedAt).getTime()
        ) {

            /*
                النسخة المحلية محدثة
                بالفعل، لا حاجة للاستبدال.
            */

            return false;

        }


        const bytes =
            remoteData.data.toUint8Array();


        if (
            typeof initSqlJs !==
            "function"
        ) {

            return false;

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


        sqliteDatabase =
            new SQL.Database(
                bytes
            );


        sqliteReady = true;


        createDatabaseSchema();


        await saveDatabase();


        localStorage.setItem(
            "cloudLastSyncTime",
            remoteData.updatedAt
        );


        updateCloudSyncStatusText();


        return true;


    } catch (error) {

        console.error(error);

        return false;

    }

}


/*
    عرض وقت آخر مزامنة
*/

function updateCloudSyncStatusText() {

    const element =
        document.getElementById(
            "cloudSyncStatusText"
        );


    if (!element) {
        return;
    }


    const knownSyncTime =
        localStorage.getItem(
            "cloudLastSyncTime"
        );


    if (!knownSyncTime) {

        element.textContent =
            "لم تتم أي مزامنة بعد.";

        return;

    }


    try {

        const date =
            new Date(
                knownSyncTime
            );


        element.textContent =
            `آخر مزامنة: ${date.toLocaleString("ar-SA")}`;


    } catch (error) {

        element.textContent =
            "لم تتم أي مزامنة بعد.";

    }

}
