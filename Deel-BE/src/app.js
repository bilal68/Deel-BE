const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const { Op } = require("sequelize");
const { getProfile } = require("./middleware/getProfile");
const app = express();
app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

const contractRoutes = require("./routes/contracts");
const jobsRoutes = require("./routes/jobs");
const balancesRoutes = require("./routes/balances");
const adminRoutes = require("./routes/admin");

app.use("/contracts", contractRoutes);
app.use("/jobs", jobsRoutes);
app.use("/balances", balancesRoutes);
app.use("/admin", adminRoutes);

module.exports = app;
