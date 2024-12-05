const { Sequelize, DataTypes } = require("sequelize");

// Step 1: Passing a connection URI
const sequelize = new Sequelize(
  "postgres://postgres:postgres@localhost:5432/dev_plasgos",
  { logging: false }
);
// Step 2: Test connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:");
  }
})();

module.exports = {
  sequelize,
};
