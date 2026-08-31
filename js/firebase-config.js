/*
    إعدادات Firebase
    ================

    خطوات الإعداد (مرة واحدة فقط):

    1. اذهب إلى console.firebase.google.com
       وأنشئ مشروعًا جديدًا (مجاني - خطة Spark).

    2. من القائمة الجانبية: Build → Authentication
       → Get started → Sign-in method
       → فعّل "Email/Password".

       ثم من تبويب Users → Add user
       وأنشئ مستخدمًا (بريدك وكلمة مرور تختارها)
       لتسجيل الدخول من التطبيق.

    3. من القائمة الجانبية: Build → Firestore
       Database → Create database → اختر أقرب
       موقع خادم → ابدأ في "وضع الإنتاج"
       (production mode).

       ثم من تبويب Rules استبدل القواعد بما يلي
       (تسمح فقط لصاحب الحساب بالوصول لنسخته):

       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           match /backups/{uid} {
             allow read, write:
                 if request.auth != null &&
                 request.auth.uid == uid;
           }
         }
       }

    4. من ⚙ إعدادات المشروع → عام → مرر لأسفل
       إلى "تطبيقاتك" → أضف تطبيق ويب (</>) 
       → سجّل التطبيق (بدون تفعيل Firebase Hosting).

       سيظهر لك كائن باسم firebaseConfig،
       انسخ قيمه والصقها بدل القيم أدناه.
*/


const firebaseConfig = {

    apiKey:
        "AIzaSyBumH8DMHLp-7Xgy89xpEWWac9H8MXlG9g",

    authDomain:
        "mllfarm.firebaseapp.com",

    projectId:
        "mllfarm",

    storageBucket:
        "mllfarm.firebasestorage.app",

    messagingSenderId:
        "278699667577",

    appId:
        "1:278699667577:web:6c94862f86505fed7324a8"

};


/*
    يتحقق التطبيق تلقائيًا مما إذا كانت
    القيم أعلاه قد استُبدلت فعلًا، ويعطّل
    ميزة المزامنة السحابية بأمان إن لم تكن
    معدّة بعد (بقية التطبيق يستمر بالعمل
    محليًا كالمعتاد).
*/

const isFirebaseConfigured =
    Boolean(
        firebaseConfig.apiKey &&
        firebaseConfig.apiKey !== "ضع-قيمتك-هنا" &&
        typeof firebase !== "undefined"
    );


if (isFirebaseConfigured) {

    try {

        firebase.initializeApp(
            firebaseConfig
        );

    } catch (error) {

        console.error(
            "تعذر تهيئة Firebase.",
            error
        );

    }

}
