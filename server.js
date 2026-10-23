const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// مجلد لتخزين بيانات العرسان
const CLIENTS_DIR = path.join(__dirname, 'clients');
if (!fs.existsSync(CLIENTS_DIR)) {
    fs.mkdirSync(CLIENTS_DIR);
}

// السماح بقراءة الملفات الثابتة
app.use('/clients', express.static(CLIENTS_DIR));
app.use(express.static(__dirname));

// 1. مسار جلب قائمة العرسان السابقين (إدارة العرسان)
app.get('/api/clients', (req, res) => {
    fs.readdir(CLIENTS_DIR, { withFileTypes: true }, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'تعذر قراءة مجلد العرسان' });
        }
        const clients = files
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const clientName = dirent.name;
                return {
                    name: clientName,
                    url: `${req.protocol}://${req.get('host')}/clients/${clientName}/index.html`
                };
            });
        res.json(clients);
    });
});

// 2. مسار رفع وعمل ألبوم جديد للعروسين
app.post('/create-client', async (req, res) => {
    try {
        const { clientName } = req.body;
        if (!clientName || !req.files || !req.files.targetFile || !req.files.videoFile) {
            return res.status(400).send('يرجى إدخال اسم العرسان ورفع ملف الـ Mind والفيديو.');
        }

        const safeName = clientName.replace(/[^a-zA-Z0-9_أ-ي]/g, '_');
        const clientFolder = path.join(CLIENTS_DIR, safeName);
        
        if (!fs.existsSync(clientFolder)) {
            fs.mkdirSync(clientFolder, { recursive: true });
        }

        const targetFile = req.files.targetFile;
        const videoFile = req.files.videoFile;

        const targetPath = path.join(clientFolder, 'targets.mind');
        const videoPath = path.join(clientFolder, 'video.mp4');

        await targetFile.mv(targetPath);
        await videoFile.mv(videoPath);

        // إنشاء صفحة HTML تفاعلية نظيفة وصافية للـ AR (تظهر الفيديو فقط عند توجيه الكاميرا)
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jawla360 - ${clientName}</title>
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
    <style>
        body { margin: 0; overflow: hidden; background: #000; }
        #loading {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: #fff; font-family: sans-serif; font-size: 18px; text-align: center; z-index: 999;
            background: rgba(0,0,0,0.8); padding: 20px 30px; border-radius: 10px;
        }
    </style>
</head>
<body>
    <div id="loading">جاري تهيئة ألبوم Jawla360 التفاعلي...<br><small>يرجى توجيه الكاميرا نحو صورة الألبوم</small></div>

    <a-scene mindar-image="imageTargetSrc: ./targets.mind;" color-space="sRGB" renderer="colorManagement: true, physicallyCorrectLights: true" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
        <a-assets>
            <video id="weddingVideo" src="./video.mp4" preload="auto" response-type="arraybuffer" webkit-playsinline playsinline controls muted></video>
        </a-assets>

        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

        <a-entity mindar-image-target="targetIndex: 0" id="targetEntity">
            <a-video src="#weddingVideo" position="0 0 0" width="1" height="0.5625" rotation="0 0 0"></a-video>
        </a-entity>
    </a-scene>

    <script>
        const sceneEl = document.querySelector('a-scene');
        sceneEl.addEventListener('arReady', () => {
            document.getElementById('loading').style.display = 'none';
        });

        const targetEntity = document.querySelector('#targetEntity');
        const video = document.querySelector('#weddingVideo');

        targetEntity.addEventListener('targetFound', () => {
            video.play();
        });

        targetEntity.addEventListener('targetLost', () => {
            video.pause();
        });
    </script>
</body>
</html>
        `;

        fs.writeFileSync(path.join(clientFolder, 'index.html'), htmlContent);

        const clientUrl = `${req.protocol}://${req.get('host')}/clients/${safeName}/index.html`;
        const qrCodeDataUrl = await QRCode.toDataURL(clientUrl);

        res.send(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تم تجهيز الألبوم بنجاح</title>
                <style>
                    body { font-family: Tahoma, sans-serif; background: #111827; color: #fff; text-align: center; padding: 40px; }
                    .card { background: #1f2937; max-width: 500px; margin: auto; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                    a { color: #38bdf8; text-decoration: none; word-break: break-all; }
                    .btn { display: inline-block; margin-top: 20px; background: #ef4444; color: white; padding: 10px 20px; border-radius: 6px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>🎉 تم تجهيز النظام بنجاح!</h2>
                    <p>رابط العرض المباشر للزبون:</p>
                    <p><a href="${clientUrl}" target="_blank">${clientUrl}</a></p>
                    <br>
                    <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 200px; border-radius: 8px; background: #fff; padding: 10px;">
                    <br><br>
                    <a href="/" class="btn">إرجاع للوحة التحكم</a>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error(error);
        res.status(500).send('حدث خطأ أثناء معالجة الطلب.');
    }
});

app.listen(PORT, () => {
    console.log(\`🚀 Server running at http://localhost:\${PORT}\`);
});