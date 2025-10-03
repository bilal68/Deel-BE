const { Op, fn, col } = require("sequelize");
const {
  bestProfession,
  bestClients,
} = require("../controllers/adminController");

const { sequelize, Job, Contract, Profile } = require("../model");

jest.mock("../model", () => {
  const actual = jest.requireActual("../model");
  return {
    ...actual,
    Job: { findAll: jest.fn() },
    Profile: { findAll: jest.fn() },
    Contract: {},
  };
});

let mockReq, mockRes;

beforeEach(() => {
  mockReq = {
    query: { start: "2023-01-01", end: "2023-12-31", limit: 2 },
  };
  mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };
  jest.clearAllMocks();
});
describe("Admin Controller - bestProfession", () => {
  it("should return the best profession", async () => {
    const mockResult = [
      {
        Contract: { Contractor: { profession: "Engineer" } },
        totalEarned: 5000,
      },
    ];
    Job.findAll.mockResolvedValue(mockResult);

    await bestProfession(mockReq, mockRes);

    expect(Job.findAll).toHaveBeenCalledWith({
      attributes: [
        [sequelize.fn("sum", sequelize.col("price")), "totalEarned"],
      ],
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
        paymentDate: { [Op.between]: [mockReq.query.start, mockReq.query.end] },
      },
      group: ["Contract.Contractor.profession"],
      order: [[sequelize.literal("totalEarned"), "DESC"]], // <--- fixed here
      limit: 1,
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith("Engineer");
  });

  it("should return 'No data' if no results are found", async () => {
    Job.findAll.mockResolvedValue([]);

    await bestProfession(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith("No data");
  });

  it("should return 400 if start or end date is missing", async () => {
    mockReq.query = {}; // Missing start and end

    await bestProfession(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Start and end dates are required",
    });
  });
  it("should return 500 on error", async () => {
    Job.findAll.mockRejectedValue(new Error("DB Failure"));

    await bestProfession(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Internal Server Error",
    });
  });
});

describe("Admin Controller - bestClients", () => {
  it("should return the best clients", async () => {
    const mockResult = [
      {
        Contract: { Client: { id: 1, firstName: "John", lastName: "Doe" } },
        paid: 3000,
      },
      {
        Contract: { Client: { id: 2, firstName: "Jane", lastName: "Smith" } },
        paid: 2000,
      },
    ];
    Job.findAll.mockResolvedValue(mockResult);

    await bestClients(mockReq, mockRes);

    expect(Job.findAll).toHaveBeenCalledWith({
      attributes: [
        [sequelize.fn("sum", sequelize.col("price")), "paid"], // fixed
      ],
      include: [
        {
          model: Contract,
          include: [{ model: Profile, as: "Client" }],
        },
      ],
      where: {
        paid: true,
        paymentDate: { [Op.between]: [mockReq.query.start, mockReq.query.end] },
      },
      group: ["Contract.Client.id"],
      order: [[sequelize.literal("paid"), "DESC"]], // fixed here
      limit: parseInt(mockReq.query.limit),
    });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 1, fullName: "John Doe", paid: 3000 },
      { id: 2, fullName: "Jane Smith", paid: 2000 },
    ]);
  });

  it("should return an empty array if no clients are found", async () => {
    Job.findAll.mockResolvedValue([]);

    await bestClients(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  it("should return 500 on error", async () => {
    Job.findAll.mockRejectedValue(new Error("DB Failure"));

    await bestClients(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Internal Server Error",
    });
  });

  it("should return the best clients", async () => {
    const mockResult = [
      {
        Contract: { Client: { id: 1, firstName: "John", lastName: "Doe" } },
        paid: 3000,
      },
      {
        Contract: { Client: { id: 2, firstName: "Jane", lastName: "Smith" } },
        paid: 2000,
      },
    ];
    Job.findAll.mockResolvedValue(mockResult);

    await bestClients(mockReq, mockRes);

    expect(Job.findAll).toHaveBeenCalledWith({
      attributes: [[sequelize.fn("sum", sequelize.col("price")), "paid"]],
      include: [
        {
          model: Contract,
          include: [{ model: Profile, as: "Client" }],
        },
      ],
      where: {
        paid: true,
        paymentDate: { [Op.between]: [mockReq.query.start, mockReq.query.end] },
      },
      group: ["Contract.Client.id"],
      order: [[sequelize.literal("paid"), "DESC"]],
      limit: parseInt(mockReq.query.limit),
    });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 1, fullName: "John Doe", paid: 3000 },
      { id: 2, fullName: "Jane Smith", paid: 2000 },
    ]);
  });

  it("should return an empty array if no clients are found", async () => {
    Job.findAll.mockResolvedValue([]);

    await bestClients(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  it("should return 400 if start or end date is missing", async () => {
    mockReq.query = { limit: 2 }; // Missing start and end

    await bestClients(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Start and end dates are required",
    });
  });

  it("should return 500 if Job.findAll throws an error", async () => {
    Job.findAll.mockRejectedValue(new Error("DB Failure"));

    await bestClients(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Internal Server Error",
    });
  });

  it("should handle Sequelize instances with get() method", async () => {
    const mockResult = [
      {
        get: jest.fn().mockReturnValue({
          Contract: { Client: { id: 1, firstName: "John", lastName: "Doe" } },
          paid: 3000,
        }),
      },
    ];
    Job.findAll.mockResolvedValue(mockResult);

    await bestClients(mockReq, mockRes);

    expect(mockResult[0].get).toHaveBeenCalled(); // Ensure get() is called
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 1, fullName: "John Doe", paid: 3000 },
    ]);
  });
  it("should handle plain objects without get() method", async () => {
    const mockResult = [
      {
        Contract: { Client: { id: 1, firstName: "John", lastName: "Doe" } },
        paid: 3000,
      },
    ];
    Job.findAll.mockResolvedValue(mockResult);

    await bestClients(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 1, fullName: "John Doe", paid: 3000 },
    ]);
  });
});
