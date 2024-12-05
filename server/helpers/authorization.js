"use strict";
require("dotenv").config();
const jwt = require("jsonwebtoken");

const User = require("../models/postgresql/user");
const { encrypt, decrypt } = require("./encrypt-decrypt");

module.exports = {
  access: async (req, res, next) => {
    let finalResult = {
      access: false,
      message: "",
    };
    try {
      const { authorization } = req.headers;
      if (
        !(req.headers.hasOwnProperty("authorization") && authorization !== null)
      ) {
        const error = new Error("You must login");
        error.status = 505;
        throw error;
      }
      const decoded = await jwt.verify(
        decrypt(authorization),
        process.env.SECRET_TOKEN
      );
      const user = await User.findOne({
        where: {
          id: decoded.id,
        },
      });
      if (!user) {
        const error = new Error("Akun pengguna tidak ditemukan");
        error.status = 404;
        throw error;
      }
      req.user = user.dataValues;
      req.decoded = decoded;
      next();
    } catch (e) {
      const status = e.status || 500;
      finalResult.message =
        e.message === "jwt expired"
          ? "Sesi Anda telah habis. Untuk melanjutkan, silakan kembali ke halaman sebelumnya."
          : e.message;
      res.status(status).json(finalResult);
    }
  },
};
