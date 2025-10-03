const express = require("express");
const { getProfile } = require("../middleware/getProfile");
const {
  getContractById,
  getAllContractsForProfile,
} = require("../controllers/contractController");

const router = express.Router();

router.get("/:id", getProfile, getContractById);
router.get("/", getProfile, getAllContractsForProfile);

module.exports = router;
