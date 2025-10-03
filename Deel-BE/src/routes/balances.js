const express = require("express");
const { depositBalance } = require("../controllers/balancesController");
const { getProfile } = require("../middleware/getProfile");

const router = express.Router();
router.post("/deposit/:userId", getProfile, depositBalance);
module.exports = router;
