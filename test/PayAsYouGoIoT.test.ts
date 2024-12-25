import { expect } from "chai";
import { ethers } from "hardhat";

describe("PayAsYouGoIoT Contract", function () {
  async function deployContract() {
    const [owner, user] = await ethers.getSigners();
    const PayAsYouGoIoT = await ethers.getContractFactory("PayAsYouGoIoT");
    const contract = await PayAsYouGoIoT.deploy(
      ethers.utils.parseEther("0.01")
    );
    return { contract, owner, user };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { contract, owner } = await deployContract();
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should set the correct price per usage", async function () {
      const { contract } = await deployContract();
      const price = await contract.pricePerUsage();
      expect(price).to.equal(ethers.utils.parseEther("0.01"));
    });
  });

  describe("Top-Up Balance", function () {
    it("Should allow users to top up their balance", async function () {
      const { contract, user } = await deployContract();
      const amount = ethers.utils.parseEther("1");

      await contract.connect(user).topUpBalance({ value: amount });

      const balance = await contract.userBalances(user.address);
      expect(balance).to.equal(amount);
    });

    it("Should emit BalanceToppedUp event", async function () {
      const { contract, user } = await deployContract();
      const amount = ethers.utils.parseEther("1");

      await expect(contract.connect(user).topUpBalance({ value: amount }))
        .to.emit(contract, "BalanceToppedUp")
        .withArgs(user.address, amount);
    });
  });

  describe("Record Usage", function () {
    it("Should deduct the correct amount for usage", async function () {
      const { contract, user } = await deployContract();
      const topUpAmount = ethers.utils.parseEther("1");
      const usageUnits = 10; // 10 units of usage
      const cost = ethers.utils.parseEther("0.1"); // 10 * 0.01

      await contract.connect(user).topUpBalance({ value: topUpAmount });
      await contract.connect(user).recordUsage(usageUnits);

      const remainingBalance = await contract.userBalances(user.address);
      expect(remainingBalance).to.equal(topUpAmount.sub(cost));
    });

    it("Should emit UsageRecorded event", async function () {
      const { contract, user } = await deployContract();
      const topUpAmount = ethers.utils.parseEther("1");
      const usageUnits = 5; // 5 units of usage
      const cost = ethers.utils.parseEther("0.05"); // 5 * 0.01

      await contract.connect(user).topUpBalance({ value: topUpAmount });

      await expect(contract.connect(user).recordUsage(usageUnits))
        .to.emit(contract, "UsageRecorded")
        .withArgs(user.address, usageUnits, cost);
    });

    it("Should revert if user has insufficient balance", async function () {
      const { contract, user } = await deployContract();
      const usageUnits = 100; // 100 units of usage, cost exceeds balance

      await expect(
        contract.connect(user).recordUsage(usageUnits)
      ).to.be.revertedWith("Insufficient balance. Top up to proceed.");
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to update the price per usage", async function () {
      const { contract, owner } = await deployContract();
      const newPrice = ethers.utils.parseEther("0.02");

      await contract.connect(owner).updatePrice(newPrice);

      const updatedPrice = await contract.pricePerUsage();
      expect(updatedPrice).to.equal(newPrice);
    });

    it("Should emit PriceUpdated event", async function () {
      const { contract, owner } = await deployContract();
      const newPrice = ethers.utils.parseEther("0.02");

      await expect(contract.connect(owner).updatePrice(newPrice))
        .to.emit(contract, "PriceUpdated")
        .withArgs(newPrice);
    });

    it("Should revert if non-owner tries to update the price", async function () {
      const { contract, user } = await deployContract();
      const newPrice = ethers.utils.parseEther("0.02");

      await expect(
        contract.connect(user).updatePrice(newPrice)
      ).to.be.revertedWith("Only the owner can perform this action.");
    });
  });

  describe("Withdraw Funds", function () {
    it("Should allow owner to withdraw funds", async function () {
      const { contract, owner, user } = await deployContract();
      const topUpAmount = ethers.utils.parseEther("1");

      await contract.connect(user).topUpBalance({ value: topUpAmount });

      const ownerInitialBalance = await owner.getBalance();

      const tx = await contract.connect(owner).withdrawFunds();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(tx.gasPrice || 0);

      const ownerFinalBalance = await owner.getBalance();

      expect(ownerFinalBalance).to.equal(
        ownerInitialBalance.add(topUpAmount).sub(gasUsed)
      );
    });

    it("Should revert if non-owner tries to withdraw funds", async function () {
      const { contract, user } = await deployContract();

      await expect(contract.connect(user).withdrawFunds()).to.be.revertedWith(
        "Only the owner can perform this action."
      );
    });
  });
});
