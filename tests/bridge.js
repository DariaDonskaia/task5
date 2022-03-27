const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = require("ethers/lib/utils");

const TOKEN = "TESTTOKEN";
const BALANCE = parseEther('100');
const SEND_BALANCE = parseEther('10');
const NONCE = 1;
const CHAINTFROM = 4;
const CHAINTO = 97;
const FALSECHAIN = 10;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("Bridge", function () {
  beforeEach(async () => {
    [owner, addr1, addr2, privateKey_] = await ethers.getSigners();
    privateKey = privateKey_.address;
    MYERC20 = await ethers.getContractFactory("ITokenERC20");
    BRIDGE = await ethers.getContractFactory("Bridge");
    primaryTotalSupply = parseEther("10000");
    erc20From = await MYERC20.connect(owner).deploy(primaryTotalSupply, "erc20From", TOKEN);
    erc20To = await MYERC20.connect(owner).deploy(primaryTotalSupply, "erc20To", TOKEN);
    bridgeFrom = await BRIDGE.connect(owner).deploy();
    bridgeTo = await BRIDGE.connect(owner).deploy();
    await bridgeFrom.connect(owner).updateChainById(CHAINTO, true);
    await bridgeTo.connect(owner).updateChainById(CHAINTFROM, true);
    await bridgeFrom.connect(owner).includeToken(TOKEN, erc20From.address);
    await bridgeTo.connect(owner).includeToken(TOKEN, erc20To.address);
  })

  it("Swap() test. Check require:", async function () {
    await erc20From.connect(owner).transfer(addr1.address, BALANCE);
    await expect(bridgeFrom.connect(addr1).swap(ZERO_ADDRESS, SEND_BALANCE, CHAINTO, NONCE, TOKEN)).to.be.revertedWith("Bridge: Recipient shouldn't be null address");
    await expect(bridgeFrom.connect(addr1).swap(addr2.address, 0, CHAINTO, NONCE, TOKEN)).to.be.revertedWith("Bridge: Amount should begreater than null");
    await expect(bridgeFrom.connect(addr1).swap(addr2.address, SEND_BALANCE, CHAINTFROM, NONCE, TOKEN)).to.be.revertedWith("Bridge: Destination chain is not active"); 
    await bridgeFrom.connect(addr1).swap(addr2.address, SEND_BALANCE, CHAINTO, NONCE, TOKEN);
  });

  it("Redeem() test. Check require:", async function () {
    await erc20From.connect(owner).transfer(addr1.address, BALANCE);
    await bridgeFrom.connect(addr1).swap(addr2.address,  BALANCE, CHAINTO, NONCE, TOKEN);
    const message = hre.web3.utils.soliditySha3(addr2.address,  BALANCE, CHAINTO, NONCE, TOKEN);
    const signature = await hre.web3.eth.sign(message, privateKey);
    await expect(bridgeTo.connect(addr2).redeem(ZERO_ADDRESS,  BALANCE, CHAINTFROM, NONCE, TOKEN, signature)).to.be.revertedWith("Bridge: Recipient shouldn't be null address");
    await expect(bridgeTo.connect(addr2).redeem(addr2.address, 0, CHAINTFROM, NONCE, TOKEN, signature)).to.be.revertedWith("Bridge: Amount should begreater than null");
    await expect(bridgeTo.connect(addr2).redeem(addr2.address, BALANCE, FALSECHAIN, NONCE, TOKEN, signature)).to.be.revertedWith("Bridge: Initial chain is not active");
    await bridgeTo.connect(addr2).redeem(addr2.address,  BALANCE, CHAINTFROM, NONCE, TOKEN, signature);
    await expect(bridgeTo.connect(addr2).redeem(addr2.address,  BALANCE, CHAINTFROM, NONCE, TOKEN, signature)).to.be.revertedWith("Bridge: Redeem with given params already exists");
  });


  it("Main execution:", async function () {
    await erc20From.connect(owner).transfer(addr1.address, BALANCE);
    await bridgeFrom.connect(addr1).swap(addr2.address,  BALANCE, CHAINTO, NONCE, TOKEN);
    expect(await erc20From.balanceOf(addr2.address)).to.equal(0);
    const message = hre.web3.utils.soliditySha3(addr2.address,  BALANCE, CHAINTO, NONCE, TOKEN);
    const signature = await hre.web3.eth.sign(message, privateKey);
    await bridgeTo.connect(addr2).redeem(addr2.address,  BALANCE, CHAINTFROM, NONCE, TOKEN, signature);
    expect(await erc20To.balanceOf(addr2.address)).to.equal(BALANCE);
    await bridgeFrom.connect(owner).excludeToken(TOKEN)
  });
});