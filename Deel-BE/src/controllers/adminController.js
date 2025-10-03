const { Job, Profile, Contract } = require("../model");
const { Op, fn, col, literal } = require("sequelize");

/**
 * Retrieves the profession that earned the most money within a specified time range.
 *
 * @param {Object} req - The request object containing the start and end date as query parameters.
 * @param {Object} res - The response object used to send the result or error.
 * @returns {Promise<void>} - Sends the best profession or "No data" if no results are found.
 */

exports.bestProfession = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res
        .status(400)
        .json({ error: "Start and end dates are required" });
    }
    const result = await Job.findAll({
      attributes: [[fn("sum", col("price")), "totalEarned"]],
      include: [
        {
          model: Contract,
          include: [
            { model: Profile, as: "Contractor", attributes: ["profession"] },
          ],
        },
      ],
      where: {
        paid: true,
        paymentDate: { [Op.between]: [start, end] },
      },
      group: ["Contract.Contractor.profession"],
      order: [[literal("totalEarned"), "DESC"]],
      limit: 1,
    });

    res
      .status(200)
      .json(result[0]?.Contract?.Contractor?.profession || "No data");
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Retrieves the best clients who paid the most within a specified time range.
 *
 * @param {Object} req - The request object containing the start and end date as query parameters, and an optional limit.
 * @param {Object} res - The response object used to send the result or error.
 * @returns {Promise<void>} - Sends a list of the best clients with their total paid amount.
 */
exports.bestClients = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res
        .status(400)
        .json({ error: "Start and end dates are required" });
    }

    const results = await Job.findAll({
      attributes: [[fn("sum", col("price")), "paid"]],
      include: [
        {
          model: Contract,
          include: [{ model: Profile, as: "Client" }],
        },
      ],
      where: {
        paid: true,
        paymentDate: { [Op.between]: [start, end] },
      },
      group: ["Contract.Client.id"],
      order: [[literal("paid"), "DESC"]],
      limit: 2,
    });

    const formattedResult = results.map((r) => {
      const jobData = typeof r.get === "function" ? r.get() : r;
      const client = jobData.Contract.Client;
      return {
        id: client.id,
        fullName: `${client.firstName} ${client.lastName}`,
        paid: jobData.paid,
      };
    });

    res.status(200).json(formattedResult);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
