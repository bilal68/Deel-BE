const { depositBalance } = require("../controllers/balancesController");
const { Profile, Job, Contract, sequelize } = require("../model");

const commitMock = jest.fn();
const rollbackMock = jest.fn();

const mockTransaction = {
  commit: commitMock,
  rollback: rollbackMock,
};

// Mock sequelize and models
jest.mock("../model", () => {
  const original = jest.requireActual("sequelize");
  return {
    Profile: {
      findOne: jest.fn(),
    },
    Job: {
      findAll: jest.fn(),
    },
    Contract: {},
    sequelize: {
      transaction: jest.fn(() => mockTransaction),
    },
    Op: original.Op,
  };
});

let mockReq, mockRes;

beforeEach(() => {
  mockReq = {
    params: { userId: 1 },
    body: { amount: 50 },
  };

  mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  jest.clearAllMocks();
  commitMock.mockClear();
  rollbackMock.mockClear();
});

describe("Balances Controller - depositBalance", () => {
  it("should deposit balance successfully", async () => {
    const mockProfile = {
      id: 1,
      type: "client",
      balance: 0,
      save: jest.fn(),
    };
    const mockJobs = [{ price: 100 }, { price: 200 }];

    Profile.findOne.mockResolvedValue(mockProfile);
    Job.findAll.mockResolvedValue(mockJobs);

    await depositBalance(mockReq, mockRes);

    expect(Profile.findOne).toHaveBeenCalledWith({
      where: { id: mockReq.params.userId },
      transaction: mockTransaction,
    });

    expect(Job.findAll).toHaveBeenCalledWith({
      where: { paid: null },
      include: [
        {
          model: Contract,
          where: { ClientId: mockReq.params.userId, status: "in_progress" },
        },
      ],
      transaction: mockTransaction,
    });

    expect(mockProfile.save).toHaveBeenCalled();
    expect(commitMock).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      newBalance: 50,
    });
  });

  it("should return 400 if deposit amount is not positive", async () => {
    mockReq.body.amount = -50;

    await depositBalance(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Deposit must be positive",
    });
  });

  it("should return 400 if user is not a client", async () => {
    const mockProfile = { id: 1, type: "contractor" };

    Profile.findOne.mockResolvedValue(mockProfile);

    await depositBalance(mockReq, mockRes);

    expect(Profile.findOne).toHaveBeenCalledWith({
      where: { id: mockReq.params.userId },
      transaction: mockTransaction,
    });
    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Only clients can deposit",
    });
  });

  it("should return 400 if deposit exceeds 25% of unpaid jobs", async () => {
    const mockProfile = {
      id: 1,
      type: "client",
      balance: 200,
      save: jest.fn(),
    };
    const mockJobs = [{ price: 100 }, { price: 200 }];

    Profile.findOne.mockResolvedValue(mockProfile);
    Job.findAll.mockResolvedValue(mockJobs);

    mockReq.body.amount = 100; // Exceeds 25% of total unpaid jobs (75)

    await depositBalance(mockReq, mockRes);

    expect(Profile.findOne).toHaveBeenCalledWith({
      where: { id: mockReq.params.userId },
      transaction: mockTransaction,
    });

    expect(Job.findAll).toHaveBeenCalledWith({
      where: { paid: null },
      include: [
        {
          model: Contract,
          where: { ClientId: mockReq.params.userId, status: "in_progress" },
        },
      ],
      transaction: mockTransaction,
    });

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Cannot deposit more than 25% (75) of total unpaid jobs.",
    });
  });

  it("should return 500 on database error", async () => {
    Profile.findOne.mockRejectedValue(new Error("DB Failure"));

    await depositBalance(mockReq, mockRes);

    expect(Profile.findOne).toHaveBeenCalledWith({
      where: { id: mockReq.params.userId },
      transaction: mockTransaction,
    });

    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Deposit failed",
    });
  });
});
