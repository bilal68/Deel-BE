const { Job, Contract, Profile, sequelize } = require("../model");
const { Op } = require("sequelize");

/**
 * Retrieves all unpaid jobs for the requesting profile.
 *
 * @param {Object} req - The request object containing profile information.
 * @param {Object} res - The response object used to send the result or error.
 * @returns {Promise<void>} - Sends the list of unpaid jobs as JSON or an error response.
 */
exports.getUnpaidJobs = async (req, res) => {
  const profileId = req.profile.id;

  try {
    const jobs = await Job.findAll({
      where: {
        paid: { [Op.not]: true },
      },
      include: {
        model: Contract,
        where: {
          status: "in_progress",
          [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
        },
      },
    });

    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Processes payment for a specific job if the client has sufficient balance.
 *
 * @param {Object} req - The request object containing job ID and profile information.
 * @param {Object} res - The response object used to send the result or error.
 * @returns {Promise<void>} - Sends a success response or an error response.
 */
exports.payForJob = async (req, res) => {
  const { job_id } = req.params;
  const { id: profileId, type } = req.profile;

  if (type !== "client") {
    return res
      .status(403)
      .json({ message: "Only clients are allowed to pay for jobs." });
  }
  const transaction = await sequelize.transaction();
  try {
    const job = await Job.findOne({
      where: { id: job_id, paid: null },
      include: {
        model: Contract,
        where: { ClientId: profileId },
      },
      transaction,
    });

    if (!job) {
      await transaction.rollback();
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.paid) {
      await transaction.rollback();
      return res.status(400).json({ error: "Job is already paid" });
    }

    const client = await Profile.findByPk(profileId, { transaction });
    const contractor = await Profile.findByPk(job.Contract.ContractorId, {
      transaction,
    });

    if (client.balance < job.price) {
      await transaction.rollback();
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Transfer balance
    client.balance -= job.price;
    contractor.balance += job.price;

    job.paid = true;
    job.paymentDate = new Date();

    await client.save({ transaction });
    await contractor.save({ transaction });
    await job.save({ transaction });

    await transaction.commit();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    res.status(500).json({ error: "Payment failed" });
  }
};
