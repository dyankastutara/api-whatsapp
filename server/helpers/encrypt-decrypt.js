"use strict";

const crypto = require("crypto");
require("dotenv").config();

const encryption_key = process.env.ENCRYPTION_KEY;
const encryption_key_32 = process.env.ENCRYPTION_KEY_32;
const iv_length = Number(process.env.IV_LENGTH);
const algorithm = process.env.ALGORITHM;

function encrypt32(text) {
  let iv = crypto.randomBytes(iv_length);
  let cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(encryption_key_32),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}
function decrypt32(text) {
  let textParts = text.split(":");
  let iv = Buffer.from(textParts.shift(), "hex");
  let encryptedText = Buffer.from(textParts.join(":"), "hex");
  let decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(encryption_key_32),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function encrypt(text) {
  let iv = crypto.randomBytes(iv_length);
  let cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(encryption_key),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  let textParts = text.split(":");
  let iv = Buffer.from(textParts.shift(), "hex");
  let encryptedText = Buffer.from(textParts.join(":"), "hex");
  let decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(encryption_key),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

module.exports = { decrypt, encrypt, encrypt32, decrypt32 };
