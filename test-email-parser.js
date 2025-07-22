const { parseMimeContent, decodeContent } = require('./backend/routes/email.js');

// Test with your email content
const testEmail = `MIME-Version: 1.0
Date: Sun, 29 Jun 2025 12:48:43 +0000
From: ahmed.saadany@3masegypt.com
To: Support <support@ofis-soft.com>, Nabil <nabil@ofis-soft.com>
Cc: It <it@bubblesegypt.com>, It Ahmed <it.ahmed@3masegypt.com>
Subject: =?UTF-8?Q?=D8=AA=D8=B9=D8=AF=D9=8A=D9=84_=D9=81=D9=8A_=D8=B4?= =?UTF-8?Q?=D8=A7=D8=B4=D8=A9_=D8=A8=D9=8A=D8=A7=D9=86_=D8=A7=D9=84=D8=AE?= =?UTF-8?Q?=D8=A7=D9=85=D8=A7=D8=AA_=D8=A7=D9=84=D9=85=D8=B3=D8=AA=D8=AE?= =?UTF-8?Q?=D8=AF=D9=85=D8=A9?=
Message-ID: <67b576a220ba0fcf58d71e78ee397cd8@3masegypt.com>
X-Sender: ahmed.saadany@3masegypt.com
Content-Type: multipart/mixed; boundary="=_cc2b3df1c4ac7ecd4d4f27e7293facc1"

--=_cc2b3df1c4ac7ecd4d4f27e7293facc1
Content-Type: multipart/alternative; boundary="=_28048a8a0b8d3c4722b8a883c3321ed8"

--=_28048a8a0b8d3c4722b8a883c3321ed8
Content-Transfer-Encoding: 8bit
Content-Type: text/plain; charset=UTF-8; format=flowed

السلام عليكم السادة شركة ofis soft

في شاشات بيان الخامات المستخدمة في الانتاج عند اضافة منتج تام تظهر كمية الاضافة في التقرير قبل سحب الاذون من قبل المخازن وهذا يجعل التقرير غير مكتمل . مرفق الشاشة.

يرجي تعديل كما في شاشة التكلفة المقارنة كمية وقيمة . مرفق الشاشة.

في صفحة بيان الخامات يرجي اظهار حالة امر الشغل (مغلق - تحت التنفيذ)

best regards
Ahmed El-Saadany
it-support
+201120713405
ahmed.saadany@3masegypt.com

--=_28048a8a0b8d3c4722b8a883c3321ed8
Content-Transfer-Encoding: quoted-printable
Content-Type: text/html; charset=UTF-8

<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head><body style='font-size: 10pt; font-family: Verdana,Geneva,sans-serif'>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; text-align: right;"><span style="color: inherit; font-size: 14pt; font-family: inherit; font-weight: bolder;">السلام عليكم</span></div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; text-align: right;"><span style="color: inherit; font-size: 14pt; font-family: inherit; font-weight: bolder;">السادة شركة ofis soft</span></div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; text-align: center;"><span style="color: inherit; font-size: 14pt; font-family: inherit; font-weight: bolder;">في شاشات بيان الخامات المستخدمة في الانتاج عند اضافة منتج تام تظهر كمية الاضافة في التقرير قبل سحب الاذون من قبل المخازن وهذا يجعل التقرير غير مكتمل . مرفق الشاشة.</span></div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; text-align: center;"><span style="color: inherit; font-size: 14pt; font-family: inherit; font-weight: bolder;">يرجي تعديل كما في شاشة التكلفة المقارنة كمية وقيمة . مرفق الشاشة.</span></div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; text-align: center;"><span style="color: inherit; font-size: 14pt; font-family: inherit; font-weight: bolder;">في صفحة بيان الخامات يرجي اظهار حالة امر الشغل (مغلق - تحت التنفيذ)</span></div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; font-weight: inherit;">best regards</div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; font-weight: inherit;">Ahmed El-Saadany</div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; font-weight: inherit;">it-support</div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; font-weight: inherit;">+201120713405</div>
<div style="color: #000000; font-size: 12pt; font-family: Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif; font-weight: inherit;">ahmed.saadany@3masegypt.com</div>
</body></html>

--=_28048a8a0b8d3c4722b8a883c3321ed8--
--=_cc2b3df1c4ac7ecd4d4f27e7293facc1
Content-Transfer-Encoding: base64
Content-Type: image/jpeg; name="WhatsApp Image 2025-06-29 at 15.33.35_0fc1ca58.jpg"
Content-Disposition: attachment; filename="WhatsApp Image 2025-06-29 at 15.33.35_0fc1ca58.jpg"; size=181229

/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMD
--=_cc2b3df1c4ac7ecd4d4f27e7293facc1--`;

// Parse the test email
const headers = {
  'content-type': ['multipart/mixed; boundary="=_cc2b3df1c4ac7ecd4d4f27e7293facc1"']
};

const result = parseMimeContent(testEmail, headers);
console.log('Parsed Result:', JSON.stringify(result, null, 2)); 