const { getUnpaidJobs, payForJob } = require("../controllers/jobController");

jest.mock("../model", () => {
  return {
    Job: { findAll: jest.fn(), findOne: jest.fn() },
    Contract: {},
    Profile: { findByPk: jest.fn() },
    sequelize: {
      transaction: jest.fn(),
      Op: require("sequelize").Op,
    },
  };
});

const { Job, Profile, sequelize } = require("../model");

describe("Job Controller - getUnpaidJobs", () => {
  let req, res, transactionMock;

  beforeEach(() => {
    req = {
      profile: { id: 1, type: "client" },
      params: { job_id: "1" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    transactionMock = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    sequelize.transaction.mockResolvedValue(transactionMock);
  });


  describe("getUnpaidJobs", () => {
    it("should return unpaid jobs", async () => {
      const mockJobs = [{ id: 1, description: "Unpaid job" }];
      Job.findAll.mockResolvedValue(mockJobs);

      await getUnpaidJobs(req, res);

      expect(Job.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockJobs);
    });

    it("should return 500 on error", async () => {
      Job.findAll.mockRejectedValue(new Error("DB error"));

      await getUnpaidJobs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    });
  });


  describe("payForJob", () => {
    it("should return 403 if user is not a client", async () => {
      req.profile.type = "contractor";

      await payForJob(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Only clients are allowed to pay for jobs.",
      });
    });

    it("should return 404 if job not found", async () => {
      Job.findOne.mockResolvedValue(null);

      await payForJob(req, res);

      expect(transactionMock.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Job not found" });
    });

    it("should return 400 if job is already paid", async () => {
      Job.findOne.mockResolvedValue({
        id: 1,
        paid: true,
        Contract: {},
      });

      await payForJob(req, res);

      expect(transactionMock.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Job is already paid" });
    });

    it("should return 400 if client has insufficient balance", async () => {
      Job.findOne.mockResolvedValue({
        id: 1,
        paid: null,
        price: 300,
        Contract: { ContractorId: 2 },
      });

      Profile.findByPk.mockResolvedValueOnce({ balance: 100 }); // client
      Profile.findByPk.mockResolvedValueOnce({ balance: 0 }); // contractor

      await payForJob(req, res);

      expect(transactionMock.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Insufficient balance" });
    });

    it("should successfully pay for job", async () => {
      const client = { balance: 500, save: jest.fn() };
      const contractor = { balance: 100, save: jest.fn() };
      const job = {
        price: 200,
        paid: null,
        Contract: { ContractorId: 2 },
        save: jest.fn(),
      };

      Job.findOne.mockResolvedValue(job);
      Profile.findByPk
        .mockResolvedValueOnce(client) // client
        .mockResolvedValueOnce(contractor); // contractor

      await payForJob(req, res);

      expect(client.balance).toBe(300);
      expect(contractor.balance).toBe(300);

      expect(client.save).toHaveBeenCalled();
      expect(contractor.save).toHaveBeenCalled();
      expect(job.save).toHaveBeenCalled();
      expect(transactionMock.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("should return 500 on unknown error", async () => {
      Job.findOne.mockRejectedValue(new Error("Unexpected DB issue"));

      await payForJob(req, res);

      expect(transactionMock.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Payment failed" });
    });
  });
});
