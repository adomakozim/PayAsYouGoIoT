// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PayAsYouGoIoT {
    address public owner; // Owner of the IoT system
    uint256 public pricePerUsage; // Price per unit of usage

    mapping(address => uint256) public userBalances; // Prepaid balances for users

    event UsageRecorded(address indexed user, uint256 usageUnits, uint256 amountPaid);
    event BalanceToppedUp(address indexed user, uint256 amount);
    event PriceUpdated(uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action.");
        _;
    }

    constructor(uint256 _pricePerUsage) {
        owner = msg.sender;
        pricePerUsage = _pricePerUsage;
    }

    // Top up user balance
    function topUpBalance() external payable {
        require(msg.value > 0, "You must send Ether to top up.");
        userBalances[msg.sender] += msg.value;
        emit BalanceToppedUp(msg.sender, msg.value);
    }

    // Record IoT usage and deduct payment
    function recordUsage(uint256 usageUnits) external {
        uint256 cost = usageUnits * pricePerUsage;
        require(userBalances[msg.sender] >= cost, "Insufficient balance. Top up to proceed.");

        userBalances[msg.sender] -= cost;

        // Transfer payment to owner
        (bool success, ) = owner.call{value: cost}("");
        require(success, "Payment transfer failed.");

        emit UsageRecorded(msg.sender, usageUnits, cost);
    }

    // Update the price per usage unit
    function updatePrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than zero.");
        pricePerUsage = newPrice;
        emit PriceUpdated(newPrice);
    }

    // Withdraw excess Ether from the contract
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds available to withdraw.");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed.");
    }

    // View the contract's Ether balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
