const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/postgresql/config");

var User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gender: {
    type: DataTypes.STRING,
  },
  date_of_birth: {
    type: DataTypes.DATE,
  },
  avatar_img: {
    type: DataTypes.STRING,
  },
  phone_number: {
    type: DataTypes.STRING,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    validate: {
      len: {
        args: [6, 128],
        message: "Panjang karakter email minimal 6 sampai 128 karakter",
      },
      isEmail: {
        message: "Alamat email harus benar",
      },
    },
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
  },
  phone_number_verified: {
    type: DataTypes.BOOLEAN,
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
  },
});

(async () => {
  try {
    await sequelize.sync({ alter: false });
    console.log("Database synced successfully.");
  } catch (error) {
    console.error("Error syncing database:", error);
  }
})();

module.exports = User;
