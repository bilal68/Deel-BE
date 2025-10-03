const express = require("express");
const {
  bestProfession,
  bestClients,
} = require("../controllers/adminController");
const router = express.Router();

router.get("/best-profession", bestProfession);
router.get("/best-clients", bestClients);

module.exports = router;
