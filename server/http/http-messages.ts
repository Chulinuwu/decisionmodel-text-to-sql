export const httpMessages = {
  hostNotAllowed: 'Host not allowed',
  foreignOrigin: 'Foreign origin rejected',
  jsonRequired: 'JSON required',
  invalidBody: 'รูปแบบคำขอไม่ถูกต้องหรือใหญ่เกินกำหนดค่ะ',
  invalidQuestion: 'กรุณาส่งคำถามระหว่าง 3 ถึง 600 ตัวอักษรค่ะ',
  invalidExecute: 'ข้อมูลการเลือกการตีความไม่ถูกต้องค่ะ',
  busy: 'กำลังประมวลผลคำถามอื่น กรุณารอสักครู่ค่ะ',
  databaseNotReady: 'Database is not ready. Run npm run setup.',
  invalidPlan: 'ใช้การตีความนี้กับคำถามไม่ได้ค่ะ กรุณาถามใหม่',
  offerMissing: 'ตัวเลือกนี้หมดอายุหรือไม่มีอยู่แล้วค่ะ กรุณาถามคำถามใหม่',
  timeout: 'ใช้เวลานานเกินกำหนดค่ะ กรุณาลองใหม่ หรือถามให้แคบลง',
  canceled: 'ยกเลิกคำขอแล้วค่ะ',
  failed: 'ประมวลผลไม่สำเร็จค่ะ กรุณาลองใหม่ หรือดูสถานะฐานข้อมูล',
};

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'",
};

export const requestBodyLimit = '4kb';
// Provider/transport failures whose messages are safe and useful to show verbatim.
export const providerErrorPattern = /Decisions|OPENROUTER|decision provider|context budget|schema\/context budget|answer-space|Decision call budget|Invalid decision answer|Unknown decision choice/;
// PostgreSQL query_canceled, raised when statement_timeout fires.
export const statementTimeoutCode = '57014';
// Nonstandard "client closed request"; the socket is usually gone so this rarely reaches anyone.
export const clientClosedStatus = 499;
