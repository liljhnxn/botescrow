import { ethers } from "hardhat";

async function main() {
  const address = "0x8db360CD0D94B557a587Eb023AD75444A9573b14";
  const escrow = await ethers.getContractAt("BotEscrow", address);
  const count = await escrow.getJobCount();
  console.log("Current jobCounter:", count.toString());
  if (count > 0n) {
    for (let i = 1; i <= Number(count); i++) {
      const job = await escrow.getJob(i);
      console.log(`Job #${i}:`, {
        title: job.title,
        client: job.client,
        freelancer: job.freelancer,
        totalAmount: ethers.formatEther(job.totalAmount),
        status: job.status,
      });
    }
  }
}

main().catch(console.error);
