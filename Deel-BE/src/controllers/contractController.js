const { Op } = require("sequelize");
const { Contract } = require("../model");

/**
 * Retrieves a contract by its ID if it belongs to the requesting profile.
 *
 * @param {Object} req - The request object containing parameters and profile information.
 * @param {Object} res - The response object used to send the result or error.
 * @returns {Promise<void>} - Sends the contract as JSON or an error response.
 */
exports.getContractById = async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  try {
    const contract = await Contract.findOne({
      where: {
        id,
        [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
      },
    });

    if (!contract) return res.status(404).end();
    res.status(200).json(contract);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Retrieves all non-terminated contracts associated with the requesting profile.
 *
 * @param {Object} req - The request object containing profile information.
 * @param {Object} res - The response object used to send the result or error.
 * @returns {Promise<void>} - Sends the list of contracts as JSON or an error response.
 */
exports.getAllContractsForProfile = async (req, res) => {
  const profileId = req.profile.id;

  try {
    const contracts = await Contract.findAll({
      where: {
        status: { [Op.ne]: "terminated" },
        [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
      },
    });

    res.status(200).json(contracts);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
