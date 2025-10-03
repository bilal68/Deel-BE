const { Profile, Job, Contract, sequelize } = require("../model");
const { Op } = require("sequelize");

/**
 * Allows a client to deposit money into their balance.
 * The deposit amount cannot exceed 25% of the total unpaid jobs for the client.
 *
 * @param {Object} req - The request object containing user ID and deposit amount.
 * @param {Object} res - The response object used to send the result or error.
 * @returns {Promise<void>} - Sends a success response with the new balance or an error response.
 */

exports.depositBalance = async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;

  if (amount <= 0)
    return res.status(400).json({ error: "Deposit must be positive" });

  const transaction = await sequelize.transaction();
  try {
    const profile = await Profile.findOne({
      where: { id: userId },
      transaction,
    });
    if (!profile || profile.type !== "client") {
      await transaction.rollback();
      return res.status(400).json({ error: "Only clients can deposit" });
    }

    const unpaidJobs = await Job.findAll({
      where: { paid: null },
      include: [
        {
          model: Contract,
          where: { ClientId: userId, status: "in_progress" },
        },
      ],
      transaction,
    });

    const totalUnpaid = unpaidJobs.reduce((sum, job) => sum + job.price, 0);
    const maxDeposit = totalUnpaid * 0.25;
    const existingBalance = profile.balance || 0;
    if (amount + existingBalance > maxDeposit) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Cannot deposit more than 25% (${maxDeposit}) of total unpaid jobs.`,
      });
    }

    profile.balance += amount;
    await profile.save({ transaction });

    await transaction.commit();
    res.status(200).json({ success: true, newBalance: profile.balance });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: "Deposit failed" });
  }
};
