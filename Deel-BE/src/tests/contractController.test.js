const {
  getContractById,
  getAllContractsForProfile,
} = require("../controllers/contractController");
const { Contract } = require("../model");

jest.mock("../model", () => ({
  Contract: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

let mockReq, mockRes;

beforeEach(() => {
  mockReq = {
    params: { id: 1 },
    profile: { id: 10 },
  };

  mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };

  jest.clearAllMocks();
});

describe("Contract Controller - getContractById", () => {
  it("should return 200 and contract if found", async () => {
    const contractData = { id: 1, ClientId: 10 };
    Contract.findOne.mockResolvedValue(contractData);

    await getContractById(mockReq, mockRes);

    expect(Contract.findOne).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(contractData);
  });

  it("should return 404 if contract not found", async () => {
    Contract.findOne.mockResolvedValue(null);

    await getContractById(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it("should return 500 on error", async () => {
    Contract.findOne.mockRejectedValue(new Error("Internal Server Error"));

    await getContractById(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Internal Server Error",
    });
  });
});

describe("Contract Controller - getAllContractsForProfile", () => {
  it("should return 200 and a list of contracts", async () => {
    const contractList = [
      { id: 1, ClientId: 10, status: "in_progress" },
      { id: 2, ContractorId: 10, status: "new" },
    ];
    Contract.findAll.mockResolvedValue(contractList);

    await getAllContractsForProfile(mockReq, mockRes);

    expect(Contract.findAll).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(contractList);
  });

  it("should return 200 with empty array if no contracts are found", async () => {
    Contract.findAll.mockResolvedValue([]);

    await getAllContractsForProfile(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  it("should return 500 on database error", async () => {
    Contract.findAll.mockRejectedValue(new Error("DB Failure"));

    await getAllContractsForProfile(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Internal Server Error",
    });
  });
});
