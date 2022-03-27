
task("swap", "Send token to another network")
  .addParam("recipient", "The address to receive a token")
  .addParam("amount", "The amount we send")
  .addParam("chainTo", "ID of the network to which we are sending")
  .addParam("nonce", "Any number")
  .addParam("symbol", "Symbol of the token that we are sending")
  .setAction(async (taskArgs, hre) => {
    const MyContract = await ethers.getContractFactory("Bridge");
    hardhatToken = await MyContract.deploy();  
    await hardhatToken.swap(taskArgs.recipient, taskArgs.amount, taskArgs.chainTo, taskArgs.nonce, taskArgs.symbol);
    console.log("You sent ", taskArgs.amount, " to ", taskArgs.chainTo);
  });

  task("redeem", "Accept token sending another network")
  .addParam("recipient", "The address to receive a token")
  .addParam("amount", "The amount we send")
  .addParam("chainTo", "ID of the network to which we are sending")
  .addParam("nonce", "Any number")
  .addParam("symbol", "Symbol of the token that we are sending")
  .addParam("signatur", "Signature for confirmation")
  .setAction(async (taskArgs, hre) => {
    const MyContract = await ethers.getContractFactory("Bridge");
    hardhatToken = await MyContract.deploy();  
    await hardhatToken.redeem(taskArgs.recipient, taskArgs.amount, taskArgs.chainTo, taskArgs.nonce, taskArgs.symbol, taskArgs.signatur);
    console.log("You accept ", taskArgs.amount);
  });