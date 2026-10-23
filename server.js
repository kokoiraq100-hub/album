const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// السماح بقراءة مجلد العرسان
app.use('/clients', express.static(path.join(__dirname, 'clients')));

// عرض لوحة التحكم المطورة المباشرة
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>لوحة تحكم Jawla360 - الألبومات التفاعلية</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    </head>
    <body class="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700">
            <div class="text-center mb-6">
                <h1 class="text-2xl font-bold text-red-500">Jawla360 AR System</h1>
                <p class="text-gray-400 text-sm mt-1">لوحة تحكم إضافة ألبومات الزفاف التفاعلية</p>
            </div>
            <form id="arForm" class="space-y-4" onsubmit="generateSystem(event)">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">اسم العرسان (مثلاً: Ahmed_Fatima)</label>
                    <input type="text" id="clientName" required class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500 text-white" placeholder="اكتب اسم العرسان بالإنجليزية بدون مسافات">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">ملف بصمة الألبوم (.mind)</label>
                    <input type="file" id="targetMindFile" accept=".mind" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">فيديو الكواليس (MP4)</label>
                    <input type="file" id="videoFile" accept="video/mp4" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600">
                </div>
                <button type="submit" class="w-full py-3 bg-red-500 hover:bg-red-600 rounded-lg font-bold text-white transition duration-200 shadow-lg">
                    إنشاء وتوليد نظام الـ AR للزبون
                </button>
            </form>
            <div id="resultSection" class="hidden mt-6 p-4 bg-gray-700 rounded-xl border border-gray-600 text-center space-y-4">
                <h3 class="text-lg font-semibold text-green-400">تم تجهيز النظام بنجاح!</h3>
                <div>
                    <p class="text-xs text-gray-300 mb-1">رابط العرض المباشر للزبون:</p>
                    <input type="text" id="resultLink" readonly class="w-full px-3 py-2 bg-gray-800 text-green-300 rounded border border-gray-600 text-center text-sm select-all">
                </div>
                <div class="flex justify-center">
                    <div id="qrcode" class="p-2 bg-white rounded-lg"></div>
                </div>
                <p class="text-xs text-gray-400">امسح الـ QR أو اعطه للزبون لطباعته على الألبوم.</p>
            </div>
        </div>
        <script>
            async function generateSystem(e) {
                e.preventDefault();
                const clientName = document.getElementById('clientName').value.trim();
                const targetMindFile = document.getElementById('targetMindFile').files[0];
                const videoFile = document.getElementById('videoFile').files[0];
                const formData = new FormData();
                formData.append('clientName', clientName);
                formData.append('targetMindFile', targetMindFile);
                formData.append('videoFile', videoFile);
                try {
                    const response = await fetch('/api/create-wedding', { method: 'POST', body: formData });
                    const data = await response.json();
                    if (data.success) {
                        const generatedUrl = data.clientUrl;
                        document.getElementById('resultLink').value = generatedUrl;
                        document.getElementById('resultSection').classList.remove('hidden');
                        document.getElementById('qrcode').innerHTML = "";
                        new QRCode(document.getElementById("qrcode"), {
                            text: generatedUrl, width: 128, height: 128, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H
                        });
                    } else {
                        alert('خطأ: ' + data.message);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('حدث خطأ في الاتصال بالسيرفر.');
                }
            }
        </script>
    </body>
    </html>
    `);
});

// مسار استقبال ورفع ملفات الزبون
app.post('/api/create-wedding', (req, res) => {
    if (!req.files || !req.body.clientName) {
        return res.status(400).json({ success: false, message: 'الرجاء إدخال البيانات.' });
    }

    const clientName = req.body.clientName.trim().toLowerCase().replace(/\s+/g, '_');
    const targetMindFile = req.files.targetMindFile;
    const videoFile = req.files.videoFile;

    const clientDir = path.join(__dirname, 'clients', clientName);
    if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
    }

    videoFile.mv(path.join(clientDir, 'video.mp4'), (err) => {
        if (err) return res.status(500).json({ success: false, message: 'فشل حفظ الفيديو.' });
    });

    targetMindFile.mv(path.join(clientDir, 'targets.mind'), (err) => {
        if (err) return res.status(500).json({ success: false, message: 'فشل حفظ ملف البصمة.' });
    });

    // قالب صفحة الـ AR الخاصة بالزبون
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ألبوم ذكريات - ${clientName}</title>
        <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-aframe.prod.js"></script>
        <style>
          body { margin: 0; overflow: hidden; }
          #start-btn {
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            padding: 15px 35px; font-size: 20px; background: #ff4757; color: white;
            border: none; border-radius: 30px; z-index: 99999; cursor: pointer; font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4); font-family: Tahoma, sans-serif;
          }
        </style>
      </head>
      <body>
        <button id="start-btn" onclick="startAR()">اضغط هنا لتفعيل العرض</button>
        <a-scene mindar-image="imageTargetSrc: ./targets.mind; uiScanning: yes;" color-space="sRGB" renderer="colorManagement: true" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
          <a-assets>
            <video id="vid" src="./video.mp4" preload="auto" response-type="arraybuffer" loop crossorigin="anonymous" playsinline webkit-playsinline></video>
          </a-assets>
          <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
          <a-entity mindar-image-target="targetIndex: 0" id="target">
            <a-video src="#vid" position="0 0 0" height="1.77" width="1"></a-video>
          </a-entity>
        </a-scene>
        <script>
          const video = document.querySelector("#vid");
          const button = document.querySelector("#start-btn");
          const target = document.querySelector("#target");
          function startAR() {
            video.play().then(() => {
              video.pause();
              video.currentTime = 0;
              button.style.display = "none";
            });
          }
          target.addEventListener("targetFound", () => video.play());
          target.addEventListener("targetLost", () => video.pause());
        </script>
      </body>
    </html>
    `;

    fs.writeFileSync(path.join(clientDir, 'index.html'), htmlTemplate);

    res.json({
        success: true,
        clientUrl: `http://localhost:${PORT}/clients/${clientName}/index.html`
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});