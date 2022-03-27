const hre = require("hardhat"); 


async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying contracts with the account:', deployer.address);
    const myBridge = await ethers.getContractFactory("Bridge");
    const bridge = await myBridge.deploy();
    console.log(`Contract deployed to address: ${bridge.address}`);
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});