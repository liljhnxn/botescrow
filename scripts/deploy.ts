import { ethers, network } from "hardhat";

async function main() {
  console.log("==========================================");
  console.log(`Starting BotEscrow deployment on network: ${network.name}`);
  console.log("==========================================");

  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("ERROR: No deployer accounts configured for this network.");
    console.error("Please add your PRIVATE_KEY to .env to deploy to Botchain Testnet.");
    process.exit(1);
  }

  const deployer = signers[0];
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} BOT`);

  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`Chain ID: ${chainId}`);

  // Configuration from env or fallback to deployer for local testing
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const arbitratorAddress = process.env.ARBITRATOR_ADDRESS || deployer.address;
  const feeBps = 250; // 2.50%

  console.log(`Configuring Treasury: ${treasuryAddress}`);
  console.log(`Configuring Arbitrator: ${arbitratorAddress}`);
  console.log(`Configuring Initial Protocol Fee: ${feeBps} bps (${feeBps / 100}%)`);

  // Deploy MockArbitrator if on local network and no arbitrator specified
  let finalArbitrator = arbitratorAddress;
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("Deploying MockArbitrator for local development...");
    const MockArbitratorFactory = await ethers.getContractFactory("MockArbitrator");
    const mockArbitrator = await MockArbitratorFactory.deploy();
    await mockArbitrator.waitForDeployment();
    finalArbitrator = await mockArbitrator.getAddress();
    console.log(`MockArbitrator deployed at: ${finalArbitrator}`);
  }

  // Deploy BotEscrow
  console.log("Deploying BotEscrow contract...");
  const BotEscrowFactory = await ethers.getContractFactory("BotEscrow");
  const botEscrow = await BotEscrowFactory.deploy(
    deployer.address, // Admin
    finalArbitrator,
    treasuryAddress,
    feeBps
  );

  await botEscrow.waitForDeployment();

  const contractAddress = await botEscrow.getAddress();
  const deployTx = botEscrow.deploymentTransaction();
  const txHash = deployTx ? deployTx.hash : "N/A";

  const explorerBaseUrl =
    chainId === 968n ? "https://scan.bohr.life" : "https://scan.bohr.life";
  const explorerUrl = `${explorerBaseUrl}/address/${contractAddress}`;
  const txExplorerUrl = `${explorerBaseUrl}/tx/${txHash}`;

  console.log("\n==========================================");
  console.log("DEPLOYMENT SUCCESSFUL!");
  console.log("==========================================");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployment Tx Hash: ${txHash}`);
  console.log(`Contract Explorer URL: ${explorerUrl}`);
  console.log(`Tx Explorer URL: ${txExplorerUrl}`);
  console.log("==========================================\n");

  // Automatically update .env and frontend config with deployed address
  try {
    const fs = require("fs");
    const path = require("path");

    // Update .env
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");
      if (envContent.includes("NEXT_PUBLIC_BOTESCROW_ADDRESS=")) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_BOTESCROW_ADDRESS=.*/,
          `NEXT_PUBLIC_BOTESCROW_ADDRESS=${contractAddress}`
        );
      } else {
        envContent += `\nNEXT_PUBLIC_BOTESCROW_ADDRESS=${contractAddress}\n`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log(`Updated .env with NEXT_PUBLIC_BOTESCROW_ADDRESS=${contractAddress}`);
    }

    // Update frontend/lib/contracts.ts
    const contractsLibPath = path.resolve(__dirname, "../frontend/lib/contracts.ts");
    if (fs.existsSync(contractsLibPath)) {
      let libContent = fs.readFileSync(contractsLibPath, "utf8");
      libContent = libContent.replace(
        /export const BOTESCROW_ADDRESS = .*/,
        `export const BOTESCROW_ADDRESS = (process.env.NEXT_PUBLIC_BOTESCROW_ADDRESS || "${contractAddress}") as \`0x\${string}\`;`
      );
      fs.writeFileSync(contractsLibPath, libContent);
      console.log(`Updated frontend/lib/contracts.ts default address to ${contractAddress}`);
    }
  } catch (updateErr) {
    console.warn("Could not automatically update config files:", updateErr);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
